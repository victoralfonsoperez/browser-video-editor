import { useState, useCallback } from 'react';
import type { Highlight, HighlightsFile } from '../types/highlights';

function isHighlightsFile(value: unknown): value is HighlightsFile {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return v['version'] === 1 && Array.isArray(v['highlights']);
}

export function useHighlights() {
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  /** Add a highlight at `time`. Pass `options.endTime` to make it a range,
   *  and `options.label` to override the auto-generated label. */
  const addHighlight = useCallback(
    (time: number, options?: { endTime?: number; label?: string }) => {
      setHighlights((prev) => {
        const label = options?.label ?? `Highlight ${prev.length + 1}`;
        const highlight: Highlight = {
          id: crypto.randomUUID(),
          label,
          time,
          ...(options?.endTime !== undefined ? { endTime: options.endTime } : {}),
        };
        return [...prev, highlight];
      });
    },
    [],
  );

  const removeHighlight = useCallback((id: string) => {
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  }, []);

  const updateHighlight = useCallback(
    (id: string, patch: Partial<Pick<Highlight, 'label' | 'time' | 'endTime'>>) => {
      setHighlights((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
    },
    [],
  );

  const clearHighlights = useCallback(() => {
    setHighlights([]);
  }, []);

  /** Download the current highlights as a `.highlights.json` file.
   *  @param filename - Base name without extension (defaults to "highlights"). */
  const exportJSON = useCallback(
    (filename = 'highlights') => {
      const file: HighlightsFile = { version: 1, highlights };
      const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.highlights.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [highlights],
  );

  /** Parse a `.highlights.json` file and replace the current highlights.
   *  Rejects with an Error if the file is not valid JSON or has an unexpected shape. */
  const importFromFile = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed: unknown = JSON.parse(e.target?.result as string);
          if (!isHighlightsFile(parsed)) {
            throw new Error('Invalid highlights file: expected { version: 1, highlights: [] }');
          }
          setHighlights(parsed.highlights);
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }, []);

  return {
    highlights,
    addHighlight,
    removeHighlight,
    updateHighlight,
    clearHighlights,
    exportJSON,
    importFromFile,
  };
}
