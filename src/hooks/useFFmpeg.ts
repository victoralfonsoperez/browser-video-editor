import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import { coreURL, wasmURL } from './ffmpeg-urls';
import type { Clip } from './useTrimMarkers';

export type FFmpegStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface UseFFmpegReturn {
  status: FFmpegStatus;
  progress: number;
  error: string | null;
  exportClip: (videoFile: File, clip: Clip) => Promise<void>;
  exportAllClips: (videoFile: File, clips: Clip[]) => Promise<void>;
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

  const exportClip = useCallback(async (videoFile: File, clip: Clip): Promise<void> => {
    if (status === 'loading' || status === 'processing') return;

    setError(null);
    setProgress(0);
    setExportingClipId(clip.id);

    try {
      const ffmpeg = await loadFFmpeg();

      setStatus('processing');

      const ext = videoFile.name.split('.').pop() ?? 'mp4';
      const inputName = `input.${ext}`;
      const outputName = `${clip.name.replace(/[^a-z0-9_-]/gi, '_')}.${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      await ffmpeg.exec([
        '-ss', String(clip.inPoint),
        '-to', String(clip.outPoint),
        '-i', inputName,
        '-c', 'copy',
        '-avoid_negative_ts', 'make_zero',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: videoFile.type || 'video/mp4' });
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
  }, [status, loadFFmpeg, scheduleReset]);

  const exportAllClips = useCallback(async (videoFile: File, clips: Clip[]): Promise<void> => {
    if (status === 'loading' || status === 'processing') return;
    if (clips.length === 0) return;

    setError(null);
    setProgress(0);
    setExportingClipId('__all__');

    try {
      const ffmpeg = await loadFFmpeg();

      setStatus('processing');

      const ext = videoFile.name.split('.').pop() ?? 'mp4';
      const inputName = `input.${ext}`;

      await ffmpeg.writeFile(inputName, await fetchFile(videoFile));

      // Trim each clip into a numbered segment
      const segmentNames: string[] = [];
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        const segName = `segment_${i}.${ext}`;
        segmentNames.push(segName);

        // Report rough per-clip progress while FFmpeg's own progress fires
        setProgress(i / clips.length);

        await ffmpeg.exec([
          '-ss', String(clip.inPoint),
          '-to', String(clip.outPoint),
          '-i', inputName,
          '-c', 'copy',
          '-avoid_negative_ts', 'make_zero',
          segName,
        ]);
      }

      // Build concat list file
      const concatList = segmentNames.map((n) => `file '${n}'`).join('\n');
      const encoder = new TextEncoder();
      await ffmpeg.writeFile('concat_list.txt', encoder.encode(concatList));

      const outputName = 'output.mp4';
      await ffmpeg.exec([
        '-f', 'concat',
        '-safe', '0',
        '-i', 'concat_list.txt',
        '-c', 'copy',
        outputName,
      ]);

      const data = await ffmpeg.readFile(outputName);
      const blob = new Blob([data as BlobPart], { type: 'video/mp4' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      a.click();
      URL.revokeObjectURL(url);

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile('concat_list.txt');
      for (const seg of segmentNames) {
        await ffmpeg.deleteFile(seg);
      }
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
  }, [status, loadFFmpeg, scheduleReset]);

  return { status, progress, error, exportClip, exportAllClips, exportingClipId };
}