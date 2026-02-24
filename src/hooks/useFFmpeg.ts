import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { coreURL, wasmURL } from './ffmpeg-urls';
import { buildFFmpegArgs } from '../utils/buildFFmpegArgs';
import { DEFAULT_EXPORT_OPTIONS } from '../types/exportOptions';
import type { Clip } from './useTrimMarkers';
import type { ExportOptions } from '../types/exportOptions';

export type FFmpegStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface UseFFmpegReturn {
  status: FFmpegStatus;
  progress: number;
  error: string | null;
  exportClip: (videoFile: File, clip: Clip, options?: ExportOptions) => Promise<void>;
  exportAllClips: (videoFile: File, clips: Clip[], options?: ExportOptions) => Promise<void>;
  exportingClipId: string | null;
}

const RESET_DELAY_MS = 2000;

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
    videoFile: File,
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

      const sourceExt = videoFile.name.split('.').pop() ?? 'mp4';
      const argSet = buildFFmpegArgs(clip.name, clip.inPoint, clip.outPoint, sourceExt, options);

      await ffmpeg.writeFile(argSet.inputName, await fetchFile(videoFile));

      // GIF: two-pass
      if (argSet.paletteArgs && argSet.paletteName) {
        await ffmpeg.exec(argSet.paletteArgs);
      }
      await ffmpeg.exec(argSet.encodeArgs);

      const mimeType = options.format === 'gif'
        ? 'image/gif'
        : options.format === 'webm'
          ? 'video/webm'
          : 'video/mp4';

      const data = await ffmpeg.readFile(argSet.outputName);
      const blob = new Blob([data as BlobPart], { type: mimeType });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = argSet.outputName;
      a.click();
      URL.revokeObjectURL(url);

      await ffmpeg.deleteFile(argSet.inputName);
      await ffmpeg.deleteFile(argSet.outputName);
      if (argSet.paletteName) await ffmpeg.deleteFile(argSet.paletteName);

      setStatus('done');
      setProgress(1);
      scheduleReset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      setStatus('error');
    } finally {
      setExportingClipId(null);
    }
  }, [status, loadFFmpeg, scheduleReset]);

  const exportAllClips = useCallback(async (
    videoFile: File,
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

      const sourceExt = videoFile.name.split('.').pop() ?? 'mp4';

      await ffmpeg.writeFile(`input.${sourceExt}`, await fetchFile(videoFile));

      const segmentNames: string[] = [];

      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        setProgress(i / clips.length);

        const argSet = buildFFmpegArgs(clip.name, clip.inPoint, clip.outPoint, sourceExt, options);

        // GIF: two-pass per segment
        if (argSet.paletteArgs && argSet.paletteName) {
          await ffmpeg.exec(argSet.paletteArgs);
        }
        await ffmpeg.exec(argSet.encodeArgs);

        segmentNames.push(argSet.outputName);
        if (argSet.paletteName) await ffmpeg.deleteFile(argSet.paletteName);
      }

      // Concatenation — GIFs can't be concat'd via ffmpeg concat demuxer, so skip for GIF
      if (options.format === 'gif') {
        // Download each GIF individually (no audio concat for GIF)
        for (const seg of segmentNames) {
          const data = await ffmpeg.readFile(seg);
          const blob = new Blob([data as BlobPart], { type: 'image/gif' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = seg;
          a.click();
          URL.revokeObjectURL(url);
          await ffmpeg.deleteFile(seg);
        }
      } else {
        const concatList = segmentNames.map((n) => `file '${n}'`).join('\n');
        await ffmpeg.writeFile('concat_list.txt', new TextEncoder().encode(concatList));

        const outputName = `output.${options.format}`;
        await ffmpeg.exec([
          '-f', 'concat',
          '-safe', '0',
          '-i', 'concat_list.txt',
          '-c', 'copy',
          outputName,
        ]);

        const mimeType = options.format === 'webm' ? 'video/webm' : 'video/mp4';
        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data as BlobPart], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName;
        a.click();
        URL.revokeObjectURL(url);

        await ffmpeg.deleteFile('concat_list.txt');
        for (const seg of segmentNames) await ffmpeg.deleteFile(seg);
        await ffmpeg.deleteFile(outputName);
      }

      await ffmpeg.deleteFile(`input.${sourceExt}`);

      setStatus('done');
      setProgress(1);
      scheduleReset();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      setStatus('error');
    } finally {
      setExportingClipId(null);
    }
  }, [status, loadFFmpeg, scheduleReset]);

  return { status, progress, error, exportClip, exportAllClips, exportingClipId };
}
