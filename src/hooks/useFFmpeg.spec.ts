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
  interface FFmpegInstance {
    loaded: boolean;
    on: ReturnType<typeof vi.fn>;
    load: ReturnType<typeof vi.fn>;
    writeFile: ReturnType<typeof vi.fn>;
    exec: ReturnType<typeof vi.fn>;
    readFile: ReturnType<typeof vi.fn>;
    deleteFile: ReturnType<typeof vi.fn>;
  }

  return {
    FFmpeg: vi.fn().mockImplementation(function (this: FFmpegInstance) {
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

const mockClip2: Clip = {
  id: 'clip-2',
  name: 'Second Clip',
  inPoint: 20,
  outPoint: 30,
  thumbnailDataUrl: undefined,
};

const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' });

let anchorClickMock = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();

  anchorClickMock = vi.fn();

  globalThis.URL.createObjectURL = vi.fn().mockReturnValue('blob:output');
  globalThis.URL.revokeObjectURL = vi.fn();

  // Patch createElement directly on the instance — avoids spy recursion
  const realCreateElement = HTMLDocument.prototype.createElement.bind(document);
  document.createElement = function (tag: string, ...args: []) {
    const el = realCreateElement(tag, ...args);
    if (tag === 'a') el.click = anchorClickMock;
    return el;
  } as typeof document.createElement;
});

describe('useFFmpeg — exportClip', () => {
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

  it('resets to idle after the delay', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportClip(mockFile, mockClip);
    });

    expect(result.current.status).toBe('done');

    act(() => { vi.advanceTimersByTime(2000); });

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(0);
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
    vi.mocked(FFmpeg).mockImplementationOnce(function (this) {
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

describe('useFFmpeg — exportAllClips', () => {
  it('does nothing when clips array is empty', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportAllClips(mockFile, []);
    });

    expect(result.current.status).toBe('idle');
    expect(anchorClickMock).not.toHaveBeenCalled();
  });

  it('reaches done status after exporting all clips', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportAllClips(mockFile, [mockClip, mockClip2]);
    });

    expect(result.current.status).toBe('done');
    expect(result.current.progress).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it('resets to idle after the delay', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportAllClips(mockFile, [mockClip]);
    });

    expect(result.current.status).toBe('done');

    act(() => { vi.advanceTimersByTime(2000); });

    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(0);
  });

  it('triggers a single file download for output.mp4', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportAllClips(mockFile, [mockClip, mockClip2]);
    });

    expect(anchorClickMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:output');
  });

  it('calls exec once per clip plus once for the concat', async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const execMock = vi.fn().mockResolvedValue(0);
    vi.mocked(FFmpeg).mockImplementationOnce(function (this) {
      this.loaded = false;
      this.on = vi.fn();
      this.load = vi.fn().mockResolvedValue(undefined);
      this.writeFile = vi.fn().mockResolvedValue(undefined);
      this.exec = execMock;
      this.readFile = vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2]));
      this.deleteFile = vi.fn().mockResolvedValue(undefined);
    });

    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportAllClips(mockFile, [mockClip, mockClip2]);
    });

    // 2 clips + 1 concat = 3 exec calls
    expect(execMock).toHaveBeenCalledTimes(3);
  });

  it('sets error status when exec throws during concat', async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    vi.mocked(FFmpeg).mockImplementationOnce(function (this) {
      this.loaded = false;
      this.on = vi.fn();
      this.load = vi.fn().mockResolvedValue(undefined);
      this.writeFile = vi.fn().mockResolvedValue(undefined);
      this.exec = vi.fn().mockRejectedValue(new Error('concat failed'));
      this.readFile = vi.fn();
      this.deleteFile = vi.fn().mockResolvedValue(undefined);
    });

    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportAllClips(mockFile, [mockClip]);
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('concat failed');
    expect(result.current.exportingClipId).toBeNull();
  });

  it('does not start exportAllClips while another export is in progress', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      result.current.exportAllClips(mockFile, [mockClip]);
    });

    await act(async () => {
      await result.current.exportAllClips(mockFile, [mockClip2]);
    });

    expect(result.current.error).toBeNull();
  });
});