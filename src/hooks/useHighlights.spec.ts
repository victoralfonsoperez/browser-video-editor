import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHighlights } from './useHighlights';

// jsdom does not implement URL.createObjectURL / revokeObjectURL
beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:fake'),
    writable: true,
    configurable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });
});

describe('useHighlights', () => {
  it('starts with empty highlights', () => {
    const { result } = renderHook(() => useHighlights());
    expect(result.current.highlights).toEqual([]);
  });

  it('adds a point highlight with an auto-generated label', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10));
    expect(result.current.highlights).toHaveLength(1);
    expect(result.current.highlights[0]).toMatchObject({ label: 'Highlight 1', time: 10 });
    expect(result.current.highlights[0].endTime).toBeUndefined();
  });

  it('adds a range highlight when endTime is provided', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(5, { endTime: 15 }));
    expect(result.current.highlights[0]).toMatchObject({ time: 5, endTime: 15 });
  });

  it('uses the provided label instead of auto-generating one', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10, { label: 'Goal!' }));
    expect(result.current.highlights[0].label).toBe('Goal!');
  });

  it('auto-increments the label counter based on array length', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10));
    act(() => result.current.addHighlight(20));
    expect(result.current.highlights[1].label).toBe('Highlight 2');
  });

  it('removes a highlight by id', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10));
    const id = result.current.highlights[0].id;
    act(() => result.current.removeHighlight(id));
    expect(result.current.highlights).toHaveLength(0);
  });

  it('does not remove unrelated highlights', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10));
    act(() => result.current.addHighlight(20));
    const id = result.current.highlights[0].id;
    act(() => result.current.removeHighlight(id));
    expect(result.current.highlights).toHaveLength(1);
    expect(result.current.highlights[0].time).toBe(20);
  });

  it('updates highlight label and endTime', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10, { label: 'Original' }));
    const id = result.current.highlights[0].id;
    act(() => result.current.updateHighlight(id, { label: 'Updated', endTime: 25 }));
    expect(result.current.highlights[0]).toMatchObject({ label: 'Updated', time: 10, endTime: 25 });
  });

  it('does not mutate other highlights during update', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10, { label: 'A' }));
    act(() => result.current.addHighlight(20, { label: 'B' }));
    const id = result.current.highlights[0].id;
    act(() => result.current.updateHighlight(id, { label: 'A updated' }));
    expect(result.current.highlights[1].label).toBe('B');
  });

  it('clears all highlights', () => {
    const { result } = renderHook(() => useHighlights());
    act(() => result.current.addHighlight(10));
    act(() => result.current.addHighlight(20));
    act(() => result.current.clearHighlights());
    expect(result.current.highlights).toHaveLength(0);
  });

  describe('exportJSON', () => {
    // Intercept only anchor creation so renderHook's internal divs are unaffected.
    let anchor: { href: string; download: string; click: ReturnType<typeof vi.fn> };
    let originalCreateElement: typeof document.createElement;

    beforeEach(() => {
      anchor = { href: '', download: '', click: vi.fn() };
      originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, 'createElement').mockImplementation((tag, options?) => {
        if (tag === 'a') return anchor as unknown as HTMLAnchorElement;
        return originalCreateElement(tag, options as ElementCreationOptions);
      });
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('creates a download with correct filename and JSON content', async () => {
      const { result } = renderHook(() => useHighlights());
      act(() => result.current.addHighlight(10, { label: 'Test', endTime: 15 }));
      act(() => result.current.exportJSON('my-video'));

      expect(anchor.download).toBe('my-video.highlights.json');
      expect(anchor.click).toHaveBeenCalledOnce();

      const blob: Blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls.at(-1)![0];
      const text = await blob.text();
      const parsed = JSON.parse(text);
      expect(parsed.version).toBe(1);
      expect(parsed.highlights[0]).toMatchObject({ label: 'Test', time: 10, endTime: 15 });

      expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    });

    it('defaults filename to "highlights"', () => {
      const { result } = renderHook(() => useHighlights());
      act(() => result.current.exportJSON());
      expect(anchor.download).toBe('highlights.highlights.json');
    });
  });

  describe('importFromFile', () => {
    it('loads highlights from a valid file, replacing existing state', async () => {
      const { result } = renderHook(() => useHighlights());
      act(() => result.current.addHighlight(99, { label: 'Old' }));

      const data = {
        version: 1,
        highlights: [
          { id: 'abc', label: 'Imported', time: 5.0 },
          { id: 'def', label: 'Range', time: 10.0, endTime: 20.0 },
        ],
      };
      const file = new File([JSON.stringify(data)], 'test.highlights.json', {
        type: 'application/json',
      });

      await act(async () => {
        await result.current.importFromFile(file);
      });

      expect(result.current.highlights).toHaveLength(2);
      expect(result.current.highlights[0]).toMatchObject({ id: 'abc', label: 'Imported', time: 5.0 });
      expect(result.current.highlights[1]).toMatchObject({ id: 'def', endTime: 20.0 });
    });

    it('rejects when the file contains invalid JSON', async () => {
      const { result } = renderHook(() => useHighlights());
      const file = new File(['not json at all'], 'bad.json', { type: 'application/json' });

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.importFromFile(file);
        } catch (e) {
          caught = e;
        }
      });

      expect(caught).toBeInstanceOf(Error);
    });

    it('rejects with a version-specific message when the version field is unsupported', async () => {
      const { result } = renderHook(() => useHighlights());
      const file = new File(
        [JSON.stringify({ version: 99, highlights: [] })],
        'future.highlights.json',
        { type: 'application/json' },
      );

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.importFromFile(file);
        } catch (e) {
          caught = e;
        }
      });

      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain('version');
      expect((caught as Error).message).toContain('99');
    });

    it('rejects when the file has an unexpected shape', async () => {
      const { result } = renderHook(() => useHighlights());
      const file = new File([JSON.stringify({ foo: 'bar' })], 'wrong.json', {
        type: 'application/json',
      });

      let caught: unknown;
      await act(async () => {
        try {
          await result.current.importFromFile(file);
        } catch (e) {
          caught = e;
        }
      });

      expect(caught).toBeInstanceOf(Error);
      expect((caught as Error).message).toContain('Invalid highlights file');
    });
  });
});
