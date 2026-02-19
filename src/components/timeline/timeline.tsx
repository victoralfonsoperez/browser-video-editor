import { useState, useRef, useEffect, useCallback } from 'react';
import { useVideoThumbnails, THUMB_WIDTH } from '../../hooks/useVideoThumbnails';
import type { useTrimMarkers } from '../../hooks/useTrimMarkers';

type TrimMarkers = ReturnType<typeof useTrimMarkers>;

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  trim: TrimMarkers;
}

export function Timeline({ videoRef, currentTime, duration, onSeek, trim }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingMarker, setDraggingMarker] = useState<'in' | 'out' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const { thumbnails, isGenerating, generateThumbnails } = useVideoThumbnails();

  const generate = useCallback(() => {
    if (!videoRef?.current || duration <= 0 || isGenerating) return;
    const width = timelineRef.current?.getBoundingClientRect().width ?? 0;
    if (width <= 0) return;
    const count = Math.max(1, Math.floor(width / THUMB_WIDTH));
    generateThumbnails(videoRef.current, count);
  }, [videoRef, duration, isGenerating, generateThumbnails]);

  // Generate on first load
  useEffect(() => {
    if (duration > 0 && thumbnails.length === 0 && !isGenerating) {
      generate();
    }
  }, [duration]);

  const getTimeFromPosition = useCallback((clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  }, [duration]);

  // Keyboard bindings - need to re-bind when currentTime changes
  useEffect(() => {
    const handler = trim.bindKeyboard(currentTime);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentTime, trim.bindKeyboard]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    onSeek(getTimeFromPosition(e.clientX));
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) onSeek(getTimeFromPosition(e.clientX));
    setHoverTime(getTimeFromPosition(e.clientX));
  };
  const handleMouseLeave = () => setHoverTime(null);
  const handleTouchStart = (e: React.TouchEvent) => { setIsDragging(true); onSeek(getTimeFromPosition(e.touches[0].clientX)); };
  const handleTouchMove = (e: React.TouchEvent) => { if (isDragging) onSeek(getTimeFromPosition(e.touches[0].clientX)); };
  const handleTouchEnd = () => setIsDragging(false);

  const handleMarkerMouseDown = (e: React.MouseEvent, marker: 'in' | 'out') => {
    e.stopPropagation();
    setDraggingMarker(marker);
  };

  useEffect(() => {
    if (!isDragging && !draggingMarker) return;

    const onMove = (e: MouseEvent) => {
      const t = getTimeFromPosition(e.clientX);
      if (isDragging) onSeek(t);
      if (draggingMarker === 'in') trim.setIn(t);
      if (draggingMarker === 'out') trim.setOut(t);
    };
    const onUp = () => {
      setIsDragging(false);
      setDraggingMarker(null);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, draggingMarker, duration]);

  const handleFrameSeek = (direction: 'forward' | 'backward') => {
    const frameDuration = 1 / 30;
    const newTime = direction === 'forward' ? currentTime + frameDuration : currentTime - frameDuration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const pct = (t: number) => duration > 0 ? `${(t / duration) * 100}%` : '0%';
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const inPct = trim.inPoint !== null ? trim.inPoint / duration : null;
  const outPct = trim.outPoint !== null ? trim.outPoint / duration : null;
  const showRegion = inPct !== null && outPct !== null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-5 select-none">
      <div className="rounded-md border border-[#333] bg-[#1a1a1e] pb-1">

        {/* Header */}
        <div className="flex justify-between items-center px-3 py-1.5 text-[11px] uppercase tracking-wider text-[#888]">
          {isGenerating ? (
            <span className="flex items-center gap-1.5 text-[#c8f55a]">
              <span className="inline-block w-2.5 h-2.5 border-2 border-[#c8f55a44] border-t-[#c8f55a] rounded-full animate-spin" />
              Generating thumbnails...
            </span>
          ) : (
            <span className="flex items-center gap-3">
              {thumbnails.length > 0 ? `${thumbnails.length} thumbnails` : ''}
              {(trim.inPoint !== null || trim.outPoint !== null) && (
                <span className="text-[#c8f55a]/70 normal-case tracking-normal">
                  {trim.inPoint !== null && `In: ${formatTime(trim.inPoint)}`}
                  {trim.inPoint !== null && trim.outPoint !== null && ' → '}
                  {trim.outPoint !== null && `Out: ${formatTime(trim.outPoint)}`}
                </span>
              )}
            </span>
          )}
          <span className="text-[#c8f55a] tabular-nums text-xs font-semibold">{formatTime(currentTime)}</span>
        </div>

        {/* Track */}
        <div
          ref={timelineRef}
          className="relative h-[54px] w-full cursor-crosshair overflow-hidden"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex h-full gap-px bg-[#111]">
            {thumbnails.map((thumb) => (
              <img
                key={thumb.time}
                src={thumb.dataUrl}
                className="h-full shrink-0 object-cover opacity-85 hover:opacity-100 transition-opacity duration-150"
                style={{ width: THUMB_WIDTH }}
                alt={`t=${thumb.time}s`}
                title={formatTime(thumb.time)}
              />
            ))}
            {thumbnails.length === 0 && !isGenerating && (
              <div className="flex w-full items-center justify-center bg-[#111] text-xs text-[#444]">
                Load a video to see the timeline
              </div>
            )}
          </div>

          {/* Progress fill */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-full bg-blue-500/20 transition-[width] duration-100 ease-out"
            style={{ width: `${playheadPct}%` }}
          />

          {/* Trim region highlight */}
          {showRegion && (
            <div
              className="pointer-events-none absolute top-0 h-full bg-[#c8f55a]/20 border-x border-[#c8f55a]/60"
              style={{
                left: pct(trim.inPoint!),
                width: pct(trim.outPoint! - trim.inPoint!),
              }}
            />
          )}

          {/* In-point marker */}
          {trim.inPoint !== null && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 z-20 w-1 bg-[#c8f55a] cursor-ew-resize group"
              style={{ left: pct(trim.inPoint), transform: 'translateX(-50%)' }}
              onMouseDown={(e) => handleMarkerMouseDown(e, 'in')}
              title="In point (drag or press I)"
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#c8f55a] rounded-sm flex items-center justify-center">
                <span className="text-[8px] text-black font-bold leading-none">I</span>
              </div>
            </div>
          )}

          {/* Out-point marker */}
          {trim.outPoint !== null && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 z-20 w-1 bg-[#f55a5a] cursor-ew-resize group"
              style={{ left: pct(trim.outPoint), transform: 'translateX(-50%)' }}
              onMouseDown={(e) => handleMarkerMouseDown(e, 'out')}
              title="Out point (drag or press O)"
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#f55a5a] rounded-sm flex items-center justify-center">
                <span className="text-[8px] text-black font-bold leading-none">O</span>
              </div>
            </div>
          )}

          {/* Playhead */}
          {duration > 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 -translate-x-1/2 bg-[#c8f55a] shadow-[0_0_6px_#c8f55a88]"
              style={{ left: `${playheadPct}%` }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[6px] border-t-[#c8f55a]" />
            </div>
          )}

          {/* Hover ghost */}
          {hoverTime !== null && !isDragging && !draggingMarker && duration > 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-[9] w-px -translate-x-1/2 bg-white/35"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              <span className="absolute top-0.5 left-1 whitespace-nowrap rounded bg-black/70 px-1 py-px text-[10px] text-white">
                {formatTime(hoverTime)}
              </span>
            </div>
          )}
        </div>

        {/* Tick marks */}
        {thumbnails.length > 0 && (
          <div className="relative h-[18px] mt-0.5 px-3">
            {thumbnails.map((thumb) => (
              <span
                key={thumb.time}
                className="absolute -translate-x-1/2 text-[9px] text-[#555] whitespace-nowrap"
                style={{ left: `${(thumb.time / duration) * 100}%` }}
              >
                {formatTime(thumb.time)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Frame controls + time labels */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => handleFrameSeek('backward')}
            className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-1 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
          >
            ◀ Frame
          </button>
          <button
            onClick={() => handleFrameSeek('forward')}
            className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-1 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
          >
            Frame ▶
          </button>
          <button
            onClick={() => trim.setIn(currentTime)}
            className="rounded border border-[#c8f55a]/40 bg-[#2a2a2e] px-3 py-1 text-sm text-[#c8f55a] hover:bg-[#c8f55a]/10 transition-colors cursor-pointer"
            title="Set in-point (I)"
          >
            Set In
          </button>
          <button
            onClick={() => trim.setOut(currentTime)}
            className="rounded border border-[#f55a5a]/40 bg-[#2a2a2e] px-3 py-1 text-sm text-[#f55a5a] hover:bg-[#f55a5a]/10 transition-colors cursor-pointer"
            title="Set out-point (O)"
          >
            Set Out
          </button>
          {(trim.inPoint !== null || trim.outPoint !== null) && (
            <button
              onClick={trim.clearMarkers}
              className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-1 text-sm text-[#888] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex gap-4 font-mono text-sm text-[#666]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export default Timeline;