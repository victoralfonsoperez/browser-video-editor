import { useRef, useState, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { Clip } from './useTrimMarkers';

const FFMPEG_CORE_VERSION = '0.12.6';
const FFMPEG_CORE_BASE = `https://unpkg.com/@ffmpeg/core@${FFMPEG_CORE_VERSION}/dist/esm`;

export type FFmpegStatus = 'idle' | 'loading' | 'processing' | 'done' | 'error';

export interface UseFFmpegReturn {
  status: FFmpegStatus;
  progress: number;
  error: string | null;
  exportClip: (videoFile: File, clip: Clip) => Promise<void>;
  exportingClipId: string | null;
}

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

    setStatus('loading');
    await ffmpeg.load({
      coreURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`, 'application/wasm'),
    });

    return ffmpeg;
  }, []);

  const exportClip = useCallback(async (videoFile: File, clip: Clip): Promise<void> => {
    if (status === 'loading' || status === 'processing') return;

    setError(null);
    setProgress(0);
    setExportingClipId(clip.id);

    try {
      const ffmpeg = await loadFFmpeg();

      ffmpeg.on('progress', ({ progress: p }) => {
        setProgress(Math.max(0, Math.min(1, p)));
      });

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
      const blob = new Blob([data], { type: videoFile.type || 'video/mp4' });
      const url = URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = outputName;
      a.click();
      URL.revokeObjectURL(url);

      // Clean up virtual FS
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

      setStatus('done');
      setProgress(1);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Export failed';
      setError(message);
      setStatus('error');
    } finally {
      setExportingClipId(null);
    }
  }, [status, loadFFmpeg]);

  return { status, progress, error, exportClip, exportingClipId };
}