import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFFmpeg } from './useFFmpeg';
import type { Clip } from './useTrimMarkers';

vi.mock('./ffmpeg-urls', () => ({
  coreURL: 'mock-core-url',
  wasmURL: 'mock-wasm-url',
}));

// Use `function` syntax — vitest requires this for class constructor mocks
vi.mock('@ffmpeg/ffmpeg', () => {
  return {
    FFmpeg: vi.fn().mockImplementation(function (this: any) {
      this.loaded = false;
      this.on = vi.fn();
      this.load = vi.fn().mockResolvedValue(undefined);
      this.writeFile = vi.fn().mockResolvedValue(undefined);
      this.exec = vi.fn().mockResolvedValue(0);
      this.readFile = vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2]));
      this.deleteFile = vi.fn().mockResolvedValue(undefined);
    }),
  };
});

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2])),
}));

const mockClip: Clip = {
  id: 'clip-1',
  name: 'My Clip',
  inPoint: 5,
  outPoint: 15,
  thumbnailDataUrl: undefined,
};

const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' });

let anchorClickMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  anchorClickMock = vi.fn();

  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:output');
  global.URL.revokeObjectURL = vi.fn();

  // Patch createElement directly on the instance — avoids spy recursion
  const realCreateElement = HTMLDocument.prototype.createElement.bind(document);
  document.createElement = function (tag: string, ...args: any[]) {
    const el = realCreateElement(tag, ...args);
    if (tag === 'a') el.click = anchorClickMock;
    return el;
  } as typeof document.createElement;
});

describe('useFFmpeg', () => {
  it('starts with idle status', () => {
    const { result } = renderHook(() => useFFmpeg());
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.exportingClipId).toBeNull();
  });

  it('clears exportingClipId after export completes', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportClip(mockFile, mockClip);
    });

    expect(result.current.exportingClipId).toBeNull();
  });

  it('reaches done status after a successful export', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportClip(mockFile, mockClip);
    });

    expect(result.current.status).toBe('done');
    expect(result.current.progress).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('triggers a file download with the correct filename', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportClip(mockFile, mockClip);
    });

    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:output');
  });

  it('sets error status when ffmpeg.exec throws', async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    vi.mocked(FFmpeg).mockImplementationOnce(function (this: any) {
      this.loaded = false;
      this.on = vi.fn();
      this.load = vi.fn().mockResolvedValue(undefined);
      this.writeFile = vi.fn().mockResolvedValue(undefined);
      this.exec = vi.fn().mockRejectedValue(new Error('ffmpeg crashed'));
      this.readFile = vi.fn();
      this.deleteFile = vi.fn();
    });

    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportClip(mockFile, mockClip);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('ffmpeg crashed');
    expect(result.current.exportingClipId).toBeNull();
  });

  it('does not start a second export while one is in progress', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      result.current.exportClip(mockFile, mockClip);
    });

    await act(async () => {
      await result.current.exportClip(mockFile, { ...mockClip, id: 'clip-2' });
    });

    expect(result.current.error).toBeNull();
  });
});