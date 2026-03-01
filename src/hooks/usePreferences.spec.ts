import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { usePreferences } from './usePreferences';

const STORAGE_KEY = 'editor-preferences';

describe('usePreferences', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns default preferences when localStorage is empty', () => {
    const { result } = renderHook(() => usePreferences());

    expect(result.current.globalOptions).toEqual({
      format: 'mp4',
      quality: 'high',
      resolution: 'original',
    });
    expect(result.current.showHighlightsOnTimeline).toBe(true);
  });

  it('persists globalOptions to localStorage', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.setGlobalOptions({ format: 'webm', quality: 'low', resolution: '720p' });
    });

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.globalOptions).toEqual({ format: 'webm', quality: 'low', resolution: '720p' });
  });

  it('persists showHighlightsOnTimeline toggle to localStorage', () => {
    const { result } = renderHook(() => usePreferences());

    act(() => {
      result.current.toggleHighlightsOnTimeline();
    });

    expect(result.current.showHighlightsOnTimeline).toBe(false);
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(stored.showHighlightsOnTimeline).toBe(false);
  });

  it('loads saved preferences from localStorage', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        globalOptions: { format: 'gif', quality: 'medium', resolution: '480p' },
        showHighlightsOnTimeline: false,
      }),
    );

    const { result } = renderHook(() => usePreferences());

    expect(result.current.globalOptions).toEqual({
      format: 'gif',
      quality: 'medium',
      resolution: '480p',
    });
    expect(result.current.showHighlightsOnTimeline).toBe(false);
  });

  it('falls back to defaults for invalid stored values', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        globalOptions: { format: 'avi', quality: 'ultra', resolution: '4k' },
        showHighlightsOnTimeline: 'yes',
      }),
    );

    const { result } = renderHook(() => usePreferences());

    expect(result.current.globalOptions).toEqual({
      format: 'mp4',
      quality: 'high',
      resolution: 'original',
    });
    expect(result.current.showHighlightsOnTimeline).toBe(true);
  });

  it('handles corrupted localStorage gracefully', () => {
    localStorage.setItem(STORAGE_KEY, 'not-json');

    const { result } = renderHook(() => usePreferences());

    expect(result.current.globalOptions).toEqual({
      format: 'mp4',
      quality: 'high',
      resolution: 'original',
    });
  });
});
