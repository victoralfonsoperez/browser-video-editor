import { useState, useCallback, useEffect, useRef } from 'react';
import type { Clip } from './useTrimMarkers';
import type { UseFFmpegReturn } from './useFFmpeg';

export type QueueItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface QueueItem {
  /** Unique per queue entry — different from clip.id so duplicates are allowed */
  queueId: string;
  clip: Clip;
  status: QueueItemStatus;
  error?: string;
}

export interface UseExportQueueReturn {
  queue: QueueItem[];
  isRunning: boolean;
  isStarted: boolean;
  enqueue: (clip: Clip) => void;
  remove: (queueId: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  start: () => void;
  pause: () => void;
  clear: () => void;
}

export function useExportQueue(
  videoFile: File | null,
  ffmpeg: UseFFmpegReturn,
): UseExportQueueReturn {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const isRunningRef = useRef(false);

  const isRunning = queue.some((item) => item.status === 'processing');

  // Clear queue and stop when videoFile changes
  useEffect(() => {
    setQueue([]);
    setIsStarted(false);
    isRunningRef.current = false;
  }, [videoFile]);

  const enqueue = useCallback((clip: Clip) => {
    const item: QueueItem = {
      queueId: crypto.randomUUID(),
      clip,
      status: 'pending',
    };
    setQueue((prev) => [...prev, item]);
  }, []);

  const remove = useCallback((queueId: string) => {
    setQueue((prev) =>
      prev.filter((item) => {
        if (item.queueId !== queueId) return true;
        // Can't remove an item that's currently processing
        return item.status === 'processing';
      }),
    );
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setQueue((prev) => {
      const next = [...prev];
      const item = next[fromIndex];
      if (!item || item.status !== 'pending') return prev;
      next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const start = useCallback(() => setIsStarted(true), []);
  const pause = useCallback(() => setIsStarted(false), []);

  const clear = useCallback(() => {
    setQueue((prev) => prev.filter((item) => item.status === 'processing'));
  }, []);

  // Sequential processor — only runs when isStarted is true
  useEffect(() => {
    if (!isStarted) return;
    if (isRunningRef.current) return;
    if (!videoFile) return;

    const nextPending = queue.find((item) => item.status === 'pending');
    if (!nextPending) return;

    if (ffmpeg.status === 'loading' || ffmpeg.status === 'processing') return;

    isRunningRef.current = true;

    const { queueId, clip } = nextPending;

    setQueue((prev) =>
      prev.map((item) =>
        item.queueId === queueId ? { ...item, status: 'processing' } : item,
      ),
    );

    ffmpeg.exportClip(videoFile, clip).then(() => {
      setQueue((prev) =>
        prev.map((item) =>
          item.queueId === queueId ? { ...item, status: 'done' } : item,
        ),
      );
    }).catch((err: unknown) => {
      const message = err instanceof Error ? err.message : 'Export failed';
      setQueue((prev) =>
        prev.map((item) =>
          item.queueId === queueId ? { ...item, status: 'error', error: message } : item,
        ),
      );
    }).finally(() => {
      isRunningRef.current = false;
    });
  }, [queue, isStarted, videoFile, ffmpeg]);

  return { queue, isRunning, isStarted, enqueue, remove, reorder, start, pause, clear };
}