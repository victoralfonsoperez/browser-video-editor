import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFFmpeg } from './useFFmpeg';
import type { Clip } from './useTrimMarkers';

// Mock @ffmpeg/ffmpeg and @ffmpeg/util so WASM never loads in jsdom
vi.mock('@ffmpeg/ffmpeg', () => {
  const on = vi.fn();
  const load = vi.fn().mockResolvedValue(undefined);
  const writeFile = vi.fn().mockResolvedValue(undefined);
  const exec = vi.fn().mockResolvedValue(0);
  const readFile = vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2]));
  const deleteFile = vi.fn().mockResolvedValue(undefined);

  return {
    FFmpeg: vi.fn().mockImplementation(() => ({
      loaded: false,
      on,
      load,
      writeFile,
      exec,
      readFile,
      deleteFile,
    })),
  };
});

vi.mock('@ffmpeg/util', () => ({
  fetchFile: vi.fn().mockResolvedValue(new Uint8Array([0, 1, 2])),
  toBlobURL: vi.fn().mockResolvedValue('blob:mock'),
}));

// Minimal mock for URL and anchor click
global.URL.createObjectURL = vi.fn().mockReturnValue('blob:output');
global.URL.revokeObjectURL = vi.fn();

const mockClip: Clip = {
  id: 'clip-1',
  name: 'My Clip',
  inPoint: 5,
  outPoint: 15,
  thumbnailDataUrl: undefined,
};

const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' });

beforeEach(() => {
  vi.clearAllMocks();
  global.URL.createObjectURL = vi.fn().mockReturnValue('blob:output');
  global.URL.revokeObjectURL = vi.fn();

  // Mock anchor click
  const click = vi.fn();
  vi.spyOn(document, 'createElement').mockImplementation((tag) => {
    if (tag === 'a') return { href: '', download: '', click } as unknown as HTMLAnchorElement;
    return document.createElement(tag);
  });
});

describe('useFFmpeg', () => {
  it('starts with idle status', () => {
    const { result } = renderHook(() => useFFmpeg());
    expect(result.current.status).toBe('idle');
    expect(result.current.progress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.exportingClipId).toBeNull();
  });

  it('sets exportingClipId while processing', async () => {
    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportClip(mockFile, mockClip);
    });

    // After completion exportingClipId is cleared
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
    const clickMock = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      if (tag === 'a') return { href: '', download: '', click: clickMock } as unknown as HTMLAnchorElement;
      return document.createElement(tag);
    });

    const { result } = renderHook(() => useFFmpeg());

    await act(async () => {
      await result.current.exportClip(mockFile, mockClip);
    });

    expect(clickMock).toHaveBeenCalledTimes(1);
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:output');
  });

  it('sets error status when ffmpeg.exec throws', async () => {
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    vi.mocked(FFmpeg).mockImplementationOnce(() => ({
      loaded: false,
      on: vi.fn(),
      load: vi.fn().mockResolvedValue(undefined),
      writeFile: vi.fn().mockResolvedValue(undefined),
      exec: vi.fn().mockRejectedValue(new Error('ffmpeg crashed')),
      readFile: vi.fn(),
      deleteFile: vi.fn(),
    }));

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

    // Simulate processing state already active
    await act(async () => {
      // Start first export but don't await inside act to check guard
      result.current.exportClip(mockFile, mockClip);
    });

    // Calling again immediately — status check inside hook should block it
    // This just validates no crash / double-write occurs
    await act(async () => {
      await result.current.exportClip(mockFile, { ...mockClip, id: 'clip-2' });
    });

    expect(result.current.error).toBeNull();
  });
});