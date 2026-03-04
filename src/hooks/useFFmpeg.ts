import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { coreURL, wasmURL } from './ffmpeg-urls';
import type { Clip } from './useTrimMarkers';
import type { ExportOptions } from '../types/exportOptions';
import { DEFAULT_EXPORT_OPTIONS } from '../types/exportOptions';
import { downloadBlob } from '../utils/downloadBlob';
import { getErrorMessage } from '../utils/getErrorMessage';

export type FFmpegStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface UseFFmpegReturn {
  status: FFmpegStatus;
  progress: number;
  error: string | null;
  exportClip: (videoSource: File | string, clip: Clip, options?: ExportOptions) => Promise<void>;
  exportAllClips: (videoSource: File | string, clips: Clip[], options?: ExportOptions) => Promise<void>;
  exportingClipId: string | null;
}

const RESET_DELAY_MS = 2000;

// ─── helpers ────────────────────────────────────────────────────────────────

function resolutionFilter(resolution: ExportOptions['resolution']): string | null {
  switch (resolution) {
    case '1080p': return 'scale=-2:1080';
    case '720p':  return 'scale=-2:720';
    case '480p':  return 'scale=-2:480';
    default:      return null;
  }
}

/**
 * Returns true when the chosen options require full re-encoding.
 * Returns false when a stream copy (-c copy) is sufficient and much faster.
 * GIF is excluded here — it is always handled by exportGif().
 */
function needsTranscode(options: ExportOptions, inputExt: string): boolean {
  // WebM requires VP9 encoding
  if (options.format === 'webm') return true;
  // A scale filter forces decoding + filtering + re-encoding
  if (options.resolution !== 'original') return true;
  // mp4 and mov share h264/aac codecs and can be stream-copied from mp4-family inputs
  const mp4Family = new Set(['mp4', 'm4v', 'mov']);
  return !mp4Family.has(inputExt.toLowerCase());
}

/**
 * Build the encode flags for a given format + quality.
 * Returns an array of FFmpeg args (no input/output filenames).
 */
function buildEncodeArgs(options: ExportOptions): string[] {
  const { format, quality, resolution } = options;
  const scaleFilter = resolutionFilter(resolution);

  // CRF values per quality tier
  const h264Crf  = quality === 'high' ? '18' : quality === 'medium' ? '23' : '28';
  const vp9Crf   = quality === 'high' ? '20' : quality === 'medium' ? '33' : '45';

  switch (format) {
    case 'mp4':
    case 'mov': {
      const args = ['-c:v', 'libx264', '-crf', h264Crf, '-preset', 'fast', '-c:a', 'aac'];
      if (scaleFilter) args.push('-vf', scaleFilter);
      return args;
    }
    case 'webm': {
      const args = ['-c:v', 'libvpx-vp9', '-crf', vp9Crf, '-b:v', '0', '-c:a', 'libopus'];
      if (scaleFilter) args.push('-vf', scaleFilter);
      return args;
    }
    case 'gif': {
      // GIF uses a two-pass palette approach — caller must use buildGifArgs instead.
      // This branch is a fallback that should not normally be reached.
      return ['-vf', scaleFilter ? `${scaleFilter},palettegen` : 'palettegen'];
    }
  }
}

/**
 * Run a two-pass GIF export for a single trimmed segment.
 * Pass 1: generate a palette PNG.
 * Pass 2: use the palette to encode the GIF.
 */
async function exportGif(
  ffmpeg: FFmpeg,
  inputName: string,
  outputName: string,
  inPoint: number,
  outPoint: number,
  resolution: ExportOptions['resolution'],
): Promise<void> {
  const paletteName = 'palette.png';
  const scaleFilter = resolutionFilter(resolution);
  const baseFilter = scaleFilter ? `${scaleFilter},` : '';

  // Pass 1 — palette
  await ffmpeg.exec([
    '-ss', String(inPoint),
    '-to', String(outPoint),
    '-i', inputName,
    '-vf', `${baseFilter}palettegen=stats_mode=diff`,
    '-y', paletteName,
  ]);

  // Pass 2 — encode GIF
  await ffmpeg.exec([
    '-ss', String(inPoint),
    '-to', String(outPoint),
    '-i', inputName,
    '-i', paletteName,
    '-filter_complex', `${baseFilter}paletteuse=dither=bayer`,
    '-y', outputName,
  ]);

  await ffmpeg.deleteFile(paletteName);
}

function getInputName(source: File | string): string {
  const ext = source instanceof File
    ? (source.name.split('.').pop() ?? 'mp4')
    : 'mp4';
  return `input.${ext}`;
}

function getOutputExt(format: ExportOptions['format']): string {
  if (format === 'mov') return 'mov';
  if (format === 'webm') return 'webm';
  if (format === 'gif') return 'gif';
  return 'mp4';
}

function getMimeType(format: ExportOptions['format']): string {
  if (format === 'webm') return 'video/webm';
  if (format === 'gif') return 'image/gif';
  return 'video/mp4';
}

function classifyExportError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('no such file') || lower.includes('does not exist'))
    return 'Failed to read video data — the file may be corrupted.';
  if (lower.includes('invalid data') || lower.includes('codec not found') || lower.includes('decoder'))
    return 'Video codec not supported for export.';
  return message;
}

// ─── hook ────────────────────────────────────────────────────────────────────

export function useFFmpeg(): UseFFmpegReturn {
  const ffmpegRef = useRef<FFmpeg | null>(null);
  const [status, setStatus] = useState<FFmpegStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [exportingClipId, setExportingClipId] = useState<string | null>(null);

  const loadFFmpeg = useCallback(async (): Promise<FFmpeg> => {
    if (ffmpegRef.current?.loaded) return ffmpegRef.current;

    const ffmpeg = new FFmpeg();
    ffmpegRef.current = ffmpeg;

    ffmpeg.on('progress', ({ progress: p }) => {
      setProgress(Math.max(0, Math.min(1, p)));
    });

    setStatus('loading');
    await ffmpeg.load({ coreURL, wasmURL });

    return ffmpeg;
  }, []);

  const scheduleReset = useCallback(() => {
    setTimeout(() => {
      setStatus('idle');
      setProgress(0);
      setError(null);
    }, RESET_DELAY_MS);
  }, []);

  const exportClip = useCallback(async (
    videoSource: File | string,
    clip: Clip,
    options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  ): Promise<void> => {
    if (status === 'loading' || status === 'processing') return;

    setError(null);
    setProgress(0);
    setExportingClipId(clip.id);

    try {
      const ffmpeg = await loadFFmpeg();
      setStatus('processing');

      const inputName = getInputName(videoSource);
      const inputExt = inputName.split('.').pop()!;
      const outputExt = getOutputExt(options.format);
      const safeName = clip.name.replace(/[^a-z0-9_-]/gi, '_');
      const outputName = `${safeName}.${outputExt}`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoSource));

      if (options.format === 'gif') {
        await exportGif(ffmpeg, inputName, outputName, clip.inPoint, clip.outPoint, options.resolution);
      } else {
        const encodeArgs = needsTranscode(options, inputExt)
          ? buildEncodeArgs(options)
          : ['-c', 'copy'];
        await ffmpeg.exec([
          '-ss', String(clip.inPoint),
          '-to', String(clip.outPoint),
          '-i', inputName,
          ...encodeArgs,
          '-avoid_negative_ts', 'make_zero',
          outputName,
        ]);
      }

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: getMimeType(options.format) });
      downloadBlob(blob, outputName);

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setStatus('done');
      setProgress(1);
      scheduleReset();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(classifyExportError(msg));
      setStatus('error');
    } finally {
      setExportingClipId(null);
    }
  }, [status, loadFFmpeg, scheduleReset]);

  const exportAllClips = useCallback(async (
    videoSource: File | string,
    clips: Clip[],
    options: ExportOptions = DEFAULT_EXPORT_OPTIONS,
  ): Promise<void> => {
    if (status === 'loading' || status === 'processing') return;
    if (clips.length === 0) return;

    setError(null);
    setProgress(0);
    setExportingClipId('__all__');

    try {
      const ffmpeg = await loadFFmpeg();
      setStatus('processing');

      const inputName = getInputName(videoSource);
      const inputExt = inputName.split('.').pop()!;
      const outputExt = getOutputExt(options.format);

      await ffmpeg.writeFile(inputName, await fetchFile(videoSource));

      const segmentNames: string[] = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const segName = `segment_${i}.${outputExt}`;
        segmentNames.push(segName);
        setProgress(i / clips.length);

        if (options.format === 'gif') {
          await exportGif(ffmpeg, inputName, segName, clip.inPoint, clip.outPoint, options.resolution);
        } else {
          const encodeArgs = needsTranscode(options, inputExt)
            ? buildEncodeArgs(options)
            : ['-c', 'copy'];
          await ffmpeg.exec([
            '-ss', String(clip.inPoint),
            '-to', String(clip.outPoint),
            '-i', inputName,
            ...encodeArgs,
            '-avoid_negative_ts', 'make_zero',
            segName,
          ]);
        }
      }

      // Concat — GIF segments are concatenated with the concat demuxer too
      const concatList = segmentNames.map((n) => `file '${n}'`).join('\n');
      await ffmpeg.writeFile('concat_list.txt', new TextEncoder().encode(concatList));

      const outputName = `output.${outputExt}`;
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c', 'copy',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: getMimeType(options.format) });
      downloadBlob(blob, outputName);

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile('concat_list.txt');
      for (const seg of segmentNames) await ffmpeg.deleteFile(seg);
      await ffmpeg.deleteFile(outputName);

      setStatus('done');
      setProgress(1);
      scheduleReset();
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(classifyExportError(msg));
      setStatus('error');
    } finally {
      setExportingClipId(null);
    }
  }, [status, loadFFmpeg, scheduleReset]);

  return { status, progress, error, exportClip, exportAllClips, exportingClipId };
}