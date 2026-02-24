import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { coreURL, wasmURL } from './ffmpeg-urls';
import { buildExportCommand, DEFAULT_EXPORT_OPTIONS } from '../types/exportOptions';
import type { ExportOptions } from '../types/exportOptions';
import type { Clip } from './useTrimMarkers';

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

  const runCommand = useCallback(async (
    ffmpeg: FFmpeg,
    inputName: string,
    outputName: string,
    clip: Clip,
    options: ExportOptions,
  ): Promise<void> => {
    const cmd = buildExportCommand(inputName, outputName, clip.inPoint, clip.outPoint, options);
    if (cmd.kind === 'gif') {
      await ffmpeg.exec(cmd.paletteArgs);
      await ffmpeg.exec(cmd.renderArgs);
      try { await ffmpeg.deleteFile('__palette.png'); } catch { /* ignore */ }
    } else {
      await ffmpeg.exec(cmd.args);
    }
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
      const ext = options.format;
      const inputExt = videoFile.name.split('.').pop() ?? 'mp4';
      const inputName = `input.${inputExt}`;
      const outputName = `${clip.name.replace(/[^a-z0-9_-]/gi, '_')}.${ext}`;
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      await runCommand(ffmpeg, inputName, outputName, clip, options);
      const mimeType = ext === 'gif' ? 'image/gif' : ext === 'webm' ? 'video/webm' : 'video/mp4';
      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      a.click();
      URL.revokeObjectURL(url);
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
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
  }, [status, loadFFmpeg, runCommand, scheduleReset]);

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
      const inputExt = videoFile.name.split('.').pop() ?? 'mp4';
      const inputName = `input.${inputExt}`;
      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));
      const ext = options.format;
      const segmentNames: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const segName = `segment_${i}.${ext}`;
        segmentNames.push(segName);
        setProgress(i / clips.length);
        await runCommand(ffmpeg, inputName, segName, clip, options);
      }
      if (ext === 'gif') {
        for (let i = 0; i < segmentNames.length; i++) {
          const data = await ffmpeg.readFile(segmentNames[i]);
          const blob = new Blob([data as BlobPart], { type: 'image/gif' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = segmentNames[i];
          a.click();
          URL.revokeObjectURL(url);
          await ffmpeg.deleteFile(segmentNames[i]);
        }
      } else {
        const concatList = segmentNames.map((n) => `file '${n}'`).join('\n');
        await ffmpeg.writeFile('concat_list.txt', new TextEncoder().encode(concatList));
        const outputName = `output.${ext}`;
        await ffmpeg.exec(['-f', 'concat', '-safe', '0', '-i', 'concat_list.txt', '-c', 'copy', outputName]);
        const mimeType = ext === 'webm' ? 'video/webm' : 'video/mp4';
        const data = await ffmpeg.readFile(outputName);
        const blob = new Blob([data as BlobPart], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = outputName;
        a.click();
        URL.revokeObjectURL(url);
        await ffmpeg.deleteFile('concat_list.txt');
        await ffmpeg.deleteFile(outputName);
        for (const seg of segmentNames) await ffmpeg.deleteFile(seg);
      }
      await ffmpeg.deleteFile(inputName);
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
  }, [status, loadFFmpeg, runCommand, scheduleReset]);

  return { status, progress, error, exportClip, exportAllClips, exportingClipId };
}
