import { useCallback, useEffect, useReducer } from 'react';
import type { Clip } from './useTrimMarkers';
import type { UseFFmpegReturn } from './useFFmpeg';
import type { ExportOptions } from '../types/exportOptions';
import { DEFAULT_EXPORT_OPTIONS } from '../types/exportOptions';

export type QueueItemStatus = 'pending' | 'processing' | 'done' | 'error';

export interface QueueItem {
  /** Unique per queue entry — different from clip.id so duplicates are allowed */
  queueId: string;
  clip: Clip;
  options: ExportOptions;
  status: QueueItemStatus;
  error?: string;
}

export interface UseExportQueueReturn {
  queue: QueueItem[];
  isRunning: boolean;
  isStarted: boolean;
  enqueue: (clip: Clip, options?: ExportOptions) => void;
  remove: (queueId: string) => void;
  reorder: (fromIndex: number, toIndex: number) => void;
  start: () => void;
  pause: () => void;
  clear: () => void;
  retry: (queueId: string) => void;
}

type QueueState = { queue: QueueItem[]; isStarted: boolean; isProcessing: boolean };

type QueueAction =
  | { type: 'RESET' }
  | { type: 'ENQUEUE'; item: QueueItem }
  | { type: 'REMOVE'; queueId: string }
  | { type: 'REORDER'; fromIndex: number; toIndex: number }
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'CLEAR' }
  | { type: 'RETRY'; queueId: string }
  | { type: 'PROCESS_START'; queueId: string }
  | { type: 'PROCESS_DONE'; queueId: string }
  | { type: 'PROCESS_ERROR'; queueId: string; error: string }
  | { type: 'PROCESS_FINISH' };

const initialState: QueueState = { queue: [], isStarted: false, isProcessing: false };

function reducer(state: QueueState, action: QueueAction): QueueState {
  switch (action.type) {
    case 'RESET':
      return initialState;
    case 'ENQUEUE':
      return { ...state, queue: [...state.queue, action.item] };
    case 'REMOVE':
      return {
        ...state,
        queue: state.queue.filter(
          (item) => item.queueId !== action.queueId || item.status === 'processing',
        ),
      };
    case 'REORDER': {
      if (action.fromIndex === action.toIndex) return state;
      const next = [...state.queue];
      const item = next[action.fromIndex];
      if (!item || item.status !== 'pending') return state;
      next.splice(action.fromIndex, 1);
      next.splice(action.toIndex, 0, item);
      return { ...state, queue: next };
    }
    case 'START':
      return { ...state, isStarted: true };
    case 'PAUSE':
      return { ...state, isStarted: false };
    case 'CLEAR':
      return { ...state, queue: state.queue.filter((item) => item.status === 'processing') };
    case 'PROCESS_START':
      return {
        ...state,
        isProcessing: true,
        queue: state.queue.map((item) =>
          item.queueId === action.queueId ? { ...item, status: 'processing' } : item,
        ),
      };
    case 'PROCESS_DONE':
      return {
        ...state,
        queue: state.queue.map((item) =>
          item.queueId === action.queueId ? { ...item, status: 'done' } : item,
        ),
      };
    case 'PROCESS_ERROR':
      return {
        ...state,
        queue: state.queue.map((item) =>
          item.queueId === action.queueId
            ? { ...item, status: 'error', error: action.error }
            : item,
        ),
      };
    case 'RETRY':
      return {
        ...state,
        queue: state.queue.map((item) =>
          item.queueId === action.queueId && item.status === 'error'
            ? { ...item, status: 'pending', error: undefined }
            : item,
        ),
      };
    case 'PROCESS_FINISH':
      return { ...state, isProcessing: false };
    default:
      return state;
  }
}

export function useExportQueue(
  videoSource: File | string | null,
  ffmpeg: UseFFmpegReturn,
): UseExportQueueReturn {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { queue, isStarted, isProcessing } = state;

  const isRunning = queue.some((item) => item.status === 'processing');

  // Clear queue and stop when videoSource changes
  useEffect(() => {
    dispatch({ type: 'RESET' });
  }, [videoSource]);

  const enqueue = useCallback((clip: Clip, options: ExportOptions = DEFAULT_EXPORT_OPTIONS) => {
    dispatch({ type: 'ENQUEUE', item: { queueId: crypto.randomUUID(), clip, options, status: 'pending' } });
  }, []);

  const remove = useCallback((queueId: string) => {
    dispatch({ type: 'REMOVE', queueId });
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    dispatch({ type: 'REORDER', fromIndex, toIndex });
  }, []);

  const start = useCallback(() => dispatch({ type: 'START' }), []);
  const pause = useCallback(() => dispatch({ type: 'PAUSE' }), []);
  const clear = useCallback(() => dispatch({ type: 'CLEAR' }), []);
  const retry = useCallback((queueId: string) => dispatch({ type: 'RETRY', queueId }), []);

  // Sequential processor
  useEffect(() => {
    if (!isStarted) return;
    if (isProcessing) return;
    if (!videoSource) return;

    const nextPending = queue.find((item) => item.status === 'pending');
    if (!nextPending) return;

    if (ffmpeg.status === 'loading' || ffmpeg.status === 'processing') return;

    const { queueId, clip, options } = nextPending;

    dispatch({ type: 'PROCESS_START', queueId });

    ffmpeg.exportClip(videoSource, clip, options)
      .then(() => dispatch({ type: 'PROCESS_DONE', queueId }))
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Export failed';
        dispatch({ type: 'PROCESS_ERROR', queueId, error: message });
      })
      .finally(() => dispatch({ type: 'PROCESS_FINISH' }));
  }, [queue, isStarted, isProcessing, videoSource, ffmpeg]);

  return { queue, isRunning, isStarted, enqueue, remove, reorder, start, pause, clear, retry };
}
