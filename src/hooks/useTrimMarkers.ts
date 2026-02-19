import { useState, useCallback } from 'react';

export interface Clip {
  id: string;
  name: string;
  inPoint: number;
  outPoint: number;
}

export function useTrimMarkers(duration: number) {
  const [inPoint, setInPoint] = useState<number | null>(null);
  const [outPoint, setOutPoint] = useState<number | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);

  const setIn = useCallback((time: number) => {
    setInPoint(time);
    // If outPoint is now before inPoint, clear it
    setOutPoint((prev) => (prev !== null && prev <= time ? null : prev));
  }, []);

  const setOut = useCallback((time: number) => {
    setOutPoint(time);
    setInPoint((prev) => (prev !== null && prev >= time ? null : prev));
  }, []);

  const clearMarkers = useCallback(() => {
    setInPoint(null);
    setOutPoint(null);
  }, []);

  const addClip = useCallback(
    (name: string) => {
      if (inPoint === null || outPoint === null) return;
      const clip: Clip = {
        id: crypto.randomUUID(),
        name,
        inPoint,
        outPoint,
      };
      setClips((prev) => [...prev, clip]);
    },
    [inPoint, outPoint],
  );

  const removeClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /** Patch any fields on an existing clip (name, inPoint, outPoint). */
  const updateClip = useCallback(
    (id: string, patch: Partial<Pick<Clip, 'name' | 'inPoint' | 'outPoint'>>) => {
      setClips((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
    },
    [],
  );

  /** Move a clip from fromIndex to toIndex. */
  const reorderClips = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setClips((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }, []);

  // Keyboard shortcuts: I = set in, O = set out
  const bindKeyboard = useCallback(
    (currentTime: number) => {
      const handler = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement).tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key === 'i' || e.key === 'I') setIn(currentTime);
        if (e.key === 'o' || e.key === 'O') setOut(currentTime);
      };
      return handler;
    },
    [setIn, setOut],
  );

  return {
    inPoint,
    outPoint,
    clips,
    setIn,
    setOut,
    clearMarkers,
    addClip,
    removeClip,
    updateClip,
    reorderClips,
    bindKeyboard,
  };
}