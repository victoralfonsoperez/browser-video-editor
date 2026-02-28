import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useExportQueue } from './useExportQueue';
import type { Clip } from './useTrimMarkers';
import type { UseFFmpegReturn } from './useFFmpeg';

const makeClip = (id: string, name = 'Clip'): Clip => ({
  id,
  name,
  inPoint: 0,
  outPoint: 10,
  thumbnailDataUrl: undefined,
});

const makeFFmpeg = (overrides: Partial<UseFFmpegReturn> = {}): UseFFmpegReturn => ({
  status: 'idle',
  progress: 0,
  error: null,
  exportClip: vi.fn().mockResolvedValue(undefined),
  exportAllClips: vi.fn().mockResolvedValue(undefined),
  exportingClipId: null,
  ...overrides,
});

const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' });

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useExportQueue', () => {
  it('starts with an empty queue and isStarted false', () => {
    const { result } = renderHook(() => useExportQueue(mockFile, makeFFmpeg()));
    expect(result.current.queue).toHaveLength(0);
    expect(result.current.isRunning).toBe(false);
    expect(result.current.isStarted).toBe(false);
  });

  it('enqueue adds an item with pending status', () => {
    const { result } = renderHook(() => useExportQueue(null, makeFFmpeg()));
    act(() => { result.current.enqueue(makeClip('c1')); });
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.queue[0].status).toBe('pending');
    expect(result.current.queue[0].clip.id).toBe('c1');
  });

  it('allows duplicate clips (re-queue)', () => {
    const { result } = renderHook(() => useExportQueue(null, makeFFmpeg()));
    const clip = makeClip('c1');
    act(() => {
      result.current.enqueue(clip);
      result.current.enqueue(clip);
    });
    expect(result.current.queue).toHaveLength(2);
  });

  it('does NOT call exportClip when item is enqueued but start() has not been called', async () => {
    const exportClip = vi.fn().mockResolvedValue(undefined);
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    await act(async () => {
      result.current.enqueue(makeClip('c1'));
    });

    expect(exportClip).not.toHaveBeenCalled();
    expect(result.current.queue[0].status).toBe('pending');
  });

  it('starts processing after start() is called', async () => {
    const exportClip = vi.fn().mockResolvedValue(undefined);
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    act(() => { result.current.enqueue(makeClip('c1')); });

    await act(async () => { result.current.start(); });

    expect(exportClip).toHaveBeenCalledTimes(1);
    expect(result.current.queue[0].status).toBe('done');
  });

  it('pause() stops new items from being picked up', async () => {
    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((res) => { resolveFirst = res; });
    const exportClip = vi.fn().mockImplementation((_f: File, clip: Clip) =>
      clip.id === 'c1' ? firstDone : Promise.resolve(),
    );
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    act(() => {
      result.current.enqueue(makeClip('c1'));
      result.current.enqueue(makeClip('c2'));
    });

    await act(async () => { result.current.start(); });

    // c1 is processing, now pause
    act(() => { result.current.pause(); });
    expect(result.current.isStarted).toBe(false);

    // Resolve c1
    await act(async () => { resolveFirst(); });

    // c2 should still be pending since we paused
    const c2 = result.current.queue.find((i) => i.clip.id === 'c2');
    expect(c2?.status).toBe('pending');
    expect(exportClip).toHaveBeenCalledTimes(1);
  });

  it('remove deletes a pending item', () => {
    const { result } = renderHook(() => useExportQueue(null, makeFFmpeg()));
    act(() => { result.current.enqueue(makeClip('c1')); });
    const queueId = result.current.queue[0].queueId;
    act(() => { result.current.remove(queueId); });
    expect(result.current.queue).toHaveLength(0);
  });

  it('reorder swaps two pending items', () => {
    const { result } = renderHook(() => useExportQueue(null, makeFFmpeg()));
    act(() => {
      result.current.enqueue(makeClip('c1', 'First'));
      result.current.enqueue(makeClip('c2', 'Second'));
    });
    act(() => { result.current.reorder(0, 1); });
    expect(result.current.queue[0].clip.name).toBe('Second');
    expect(result.current.queue[1].clip.name).toBe('First');
  });

  it('clear removes all non-processing items', () => {
    const { result } = renderHook(() => useExportQueue(null, makeFFmpeg()));
    act(() => {
      result.current.enqueue(makeClip('c1'));
      result.current.enqueue(makeClip('c2'));
    });
    act(() => { result.current.clear(); });
    expect(result.current.queue).toHaveLength(0);
  });

  it('clears queue and resets isStarted when videoFile changes', async () => {
    let videoFile: File | null = mockFile;
    // Use a never-resolving exportClip so no async state updates leak out
    // after the act() block — we only care about the queue/isStarted reset here.
    const exportClip = vi.fn().mockReturnValue(new Promise(() => {}));
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result, rerender } = renderHook(() => useExportQueue(videoFile, ffmpeg));

    await act(async () => {
      result.current.enqueue(makeClip('c1'));
      result.current.start();
    });

    expect(result.current.queue).toHaveLength(1);
    expect(result.current.isStarted).toBe(true);

    videoFile = new File(['other'], 'other.mp4', { type: 'video/mp4' });
    await act(async () => { rerender(); });

    expect(result.current.queue).toHaveLength(0);
    expect(result.current.isStarted).toBe(false);
  });

  it('marks item as done after exportClip resolves', async () => {
    const exportClip = vi.fn().mockResolvedValue(undefined);
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    await act(async () => {
      result.current.enqueue(makeClip('c1'));
      result.current.start();
    });

    expect(result.current.queue[0].status).toBe('done');
  });

  it('marks item as error when exportClip rejects', async () => {
    const exportClip = vi.fn().mockRejectedValue(new Error('boom'));
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    await act(async () => {
      result.current.enqueue(makeClip('c1'));
      result.current.start();
    });

    expect(result.current.queue[0].status).toBe('error');
    expect(result.current.queue[0].error).toBe('boom');
  });

  it('retry resets an error item to pending and clears its error field', async () => {
    const exportClip = vi.fn().mockRejectedValue(new Error('boom'));
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    await act(async () => {
      result.current.enqueue(makeClip('c1'));
      result.current.start();
    });

    expect(result.current.queue[0].status).toBe('error');
    expect(result.current.queue[0].error).toBe('boom');

    // Pause so the processor doesn't immediately re-pick the retried item
    act(() => { result.current.pause(); });

    const queueId = result.current.queue[0].queueId;
    act(() => { result.current.retry(queueId); });

    expect(result.current.queue[0].status).toBe('pending');
    expect(result.current.queue[0].error).toBeUndefined();
  });

  it('retry is a no-op on pending items', () => {
    const { result } = renderHook(() => useExportQueue(null, makeFFmpeg()));
    act(() => { result.current.enqueue(makeClip('c1')); });
    const queueId = result.current.queue[0].queueId;
    act(() => { result.current.retry(queueId); });
    expect(result.current.queue[0].status).toBe('pending');
  });

  it('retry is a no-op on done items', async () => {
    const exportClip = vi.fn().mockResolvedValue(undefined);
    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    await act(async () => {
      result.current.enqueue(makeClip('c1'));
      result.current.start();
    });

    expect(result.current.queue[0].status).toBe('done');
    const queueId = result.current.queue[0].queueId;
    act(() => { result.current.retry(queueId); });
    expect(result.current.queue[0].status).toBe('done');
  });

  it('processes items sequentially, not in parallel', async () => {
    let resolveFirst!: () => void;
    const firstDone = new Promise<void>((res) => { resolveFirst = res; });
    const callOrder: string[] = [];
    const exportClip = vi.fn().mockImplementation((_file: File, clip: Clip) => {
      callOrder.push(clip.id);
      if (clip.id === 'c1') return firstDone;
      return Promise.resolve();
    });

    const ffmpeg = makeFFmpeg({ exportClip });
    const { result } = renderHook(() => useExportQueue(mockFile, ffmpeg));

    await act(async () => {
      result.current.enqueue(makeClip('c1'));
      result.current.enqueue(makeClip('c2'));
      result.current.start();
    });

    expect(callOrder).toEqual(['c1']);

    await act(async () => { resolveFirst(); });

    expect(callOrder).toEqual(['c1', 'c2']);
  });
});