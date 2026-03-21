import { useState, useRef, useEffect, useCallback } from 'react';
import { SharedStrings, TimelineStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import { isInputFocused } from '../../utils/isInputFocused';
import { THUMB_WIDTH } from '../../utils/thumbnails';
import { useVideoThumbnails } from '../../hooks/useVideoThumbnails';
import type { useTrimMarkers } from '../../hooks/useTrimMarkers';
import type { Highlight } from '../../types/highlights';

type TrimMarkers = ReturnType<typeof useTrimMarkers>;

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onMark: () => void;
  trim: TrimMarkers;
  highlights?: Highlight[];
}

export function Timeline({ videoRef, currentTime, duration, onSeek, onMark, trim, highlights = [] }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingMarker, setDraggingMarker] = useState<'in' | 'out' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null);
  const { thumbnails, isGenerating, generateThumbnails } = useVideoThumbnails();

  const generate = useCallback(() => {
    if (!videoRef?.current || !Number.isFinite(duration) || duration <= 0 || isGenerating) return;
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
  }, [duration, generate, thumbnails.length, isGenerating]);

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
  }, [currentTime, trim.bindKeyboard, trim]);

  // H key — mark highlight
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputFocused(e)) return;
      if (e.key === 'h' || e.key === 'H') onMark();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onMark]);

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

  const handleMarkerTouchStart = (e: React.TouchEvent, marker: 'in' | 'out') => {
    e.stopPropagation();
    setDraggingMarker(marker);
  };

  useEffect(() => {
    if (!isDragging && !draggingMarker) return;

    const onMouseMove = (e: MouseEvent) => {
      const t = getTimeFromPosition(e.clientX);
      if (isDragging) onSeek(t);
      if (draggingMarker === 'in') trim.setIn(t);
      if (draggingMarker === 'out') trim.setOut(t);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (draggingMarker) e.preventDefault();
      const t = getTimeFromPosition(e.touches[0].clientX);
      if (isDragging) onSeek(t);
      if (draggingMarker === 'in') trim.setIn(t);
      if (draggingMarker === 'out') trim.setOut(t);
    };
    const onUp = () => {
      setIsDragging(false);
      setDraggingMarker(null);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [isDragging, draggingMarker, duration, getTimeFromPosition, onSeek, trim]);

  const handleFrameSeek = (direction: 'forward' | 'backward') => {
    const frameDuration = 1 / 30;
    const newTime = direction === 'forward' ? currentTime + frameDuration : currentTime - frameDuration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  const pct = (t: number) => duration > 0 ? `${(t / duration) * 100}%` : '0%';
  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const inPct = trim.inPoint !== null ? trim.inPoint / duration : null;
  const outPct = trim.outPoint !== null ? trim.outPoint / duration : null;
  const showRegion = inPct !== null && outPct !== null;

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 tablet:mt-6 select-none" data-tour="timeline">
      <div className="pb-1">

        {/* Header — only rendered when there is something to show */}
        {(isGenerating || trim.inPoint !== null || trim.outPoint !== null) && (
          <div className="flex items-center py-1.5 text-2xs text-fg-muted">
            {isGenerating ? (
              <span className="flex items-center gap-1.5 text-accent">
                <span className="inline-block w-2.5 h-2.5 border-2 border-accent/25 border-t-accent rounded-full animate-spin" />
                <span className="hidden mobile-landscape:inline">{TimelineStrings.generatingThumbnails}</span>
                <span className="mobile-landscape:hidden">Loading...</span>
              </span>
            ) : (
              <span className="normal-case">
                {trim.inPoint !== null && `${TimelineStrings.inPointPrefix} ${formatTime(trim.inPoint)}`}
                {trim.inPoint !== null && trim.outPoint !== null && ` ${SharedStrings.separator} `}
                {trim.outPoint !== null && `${TimelineStrings.outPointPrefix} ${formatTime(trim.outPoint)}`}
              </span>
            )}
          </div>
        )}

        {/* Track */}
        <div
          ref={timelineRef}
          className="relative h-[56px] tablet:h-[72px] w-full cursor-crosshair overflow-hidden focus:outline focus:outline-2 focus:outline-accent/60 focus:outline-offset-[-2px] rounded"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          tabIndex={0}
          role="slider"
          aria-label="Timeline scrubber"
          aria-valuenow={Math.round(currentTime * 10) / 10}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration * 10) / 10}
          aria-valuetext={formatTime(currentTime)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
              e.preventDefault();
              e.stopPropagation();
              const step = e.shiftKey ? 5 : 1;
              const delta = e.key === 'ArrowLeft' ? -step : step;
              onSeek(Math.max(0, Math.min(duration, currentTime + delta)));
            }
          }}
        >
          <div className="flex h-full gap-px bg-base">
            {thumbnails.map((thumb) => (
              <img
                key={thumb.time}
                src={thumb.dataUrl}
                className="h-full shrink-0 object-cover opacity-85 hover:opacity-100 transition-opacity duration-150"
                style={{ width: THUMB_WIDTH }}
                alt={TimelineStrings.thumbnailAlt(thumb.time)}
                title={formatTime(thumb.time)}
              />
            ))}
            {thumbnails.length === 0 && !isGenerating && (
              <div className="flex w-full items-center justify-center bg-base text-xs text-fg-muted">
                {TimelineStrings.emptyState}
              </div>
            )}
          </div>

          {/* Progress fill */}
          <div
            className="pointer-events-none absolute top-0 left-0 h-full bg-fg-faint/15 transition-[width] duration-100 ease-out"
            style={{ width: `${playheadPct}%` }}
          />

          {/* Trim region highlight */}
          {showRegion && (
            <div
              className="pointer-events-none absolute top-0 h-full bg-accent/20 border-x border-accent/60"
              style={{
                left: pct(trim.inPoint!),
                width: pct(trim.outPoint! - trim.inPoint!),
              }}
            />
          )}

          {/* Highlight range bands */}
          {highlights
            .filter((h): h is Highlight & { endTime: number } => h.endTime !== undefined && duration > 0)
            .map((h) => (
              <div
                key={`band-${h.id}`}
                className="pointer-events-none absolute top-0 z-[5] h-full bg-amber/15 border-x border-amber/40"
                style={{ left: pct(h.time), width: pct(h.endTime - h.time) }}
              />
            ))}

          {/* In-point marker */}
          {trim.inPoint !== null && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 z-20 w-5 tablet:w-1 bg-accent/40 tablet:bg-accent cursor-ew-resize group touch-none focus:outline focus:outline-2 focus:outline-white/80 focus:outline-offset-1 rounded-sm"
              style={{ left: pct(trim.inPoint), transform: 'translateX(-50%)' }}
              onMouseDown={(e) => handleMarkerMouseDown(e, 'in')}
              onTouchStart={(e) => handleMarkerTouchStart(e, 'in')}
              title={TimelineStrings.titleInMarker}
              aria-label={TimelineStrings.titleInMarker}
              tabIndex={0}
              role="slider"
              aria-valuenow={Math.round(trim.inPoint * 10) / 10}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration * 10) / 10}
              aria-valuetext={`Start: ${formatTime(trim.inPoint)}`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  e.stopPropagation();
                  const step = e.shiftKey ? 0.1 : 1;
                  const delta = e.key === 'ArrowLeft' ? -step : step;
                  trim.setIn(Math.max(0, Math.min(duration, trim.inPoint! + delta)));
                }
              }}
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-5 tablet:w-3 tablet:h-3 bg-accent rounded-sm flex items-center justify-center">
                <span className="text-[8px] text-black font-bold leading-none">I</span>
              </div>
            </div>
          )}

          {/* Out-point marker */}
          {trim.outPoint !== null && duration > 0 && (
            <div
              className="absolute top-0 bottom-0 z-20 w-5 tablet:w-1 bg-danger/40 tablet:bg-danger cursor-ew-resize group touch-none focus:outline focus:outline-2 focus:outline-white/80 focus:outline-offset-1 rounded-sm"
              style={{ left: pct(trim.outPoint), transform: 'translateX(-50%)' }}
              onMouseDown={(e) => handleMarkerMouseDown(e, 'out')}
              onTouchStart={(e) => handleMarkerTouchStart(e, 'out')}
              title={TimelineStrings.titleOutMarker}
              aria-label={TimelineStrings.titleOutMarker}
              tabIndex={0}
              role="slider"
              aria-valuenow={Math.round(trim.outPoint * 10) / 10}
              aria-valuemin={0}
              aria-valuemax={Math.round(duration * 10) / 10}
              aria-valuetext={`End: ${formatTime(trim.outPoint)}`}
              onKeyDown={(e) => {
                if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                  e.preventDefault();
                  e.stopPropagation();
                  const step = e.shiftKey ? 0.1 : 1;
                  const delta = e.key === 'ArrowLeft' ? -step : step;
                  trim.setOut(Math.max(0, Math.min(duration, trim.outPoint! + delta)));
                }
              }}
            >
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-5 tablet:w-3 tablet:h-3 bg-danger rounded-sm flex items-center justify-center">
                <span className="text-[8px] text-black font-bold leading-none">O</span>
              </div>
            </div>
          )}

          {/* Highlight markers */}
          {duration > 0 && highlights.map((h) => (
            <div
              key={h.id}
              className="absolute top-0 z-[15] -translate-x-1/2 cursor-pointer select-none"
              style={{ left: pct(h.time) }}
              role="button"
              aria-label={h.label}
              onMouseDown={(e) => e.stopPropagation()}
              onMouseEnter={() => setHoveredHighlightId(h.id)}
              onMouseLeave={() => setHoveredHighlightId(null)}
              onClick={(e) => { e.stopPropagation(); onSeek(h.time); }}
            >
              <div className="w-0 h-0 border-x-[5px] border-x-transparent border-t-[7px] border-t-amber" />
              {hoveredHighlightId === h.id && (
                <span className="pointer-events-none absolute left-1 top-2 z-[20] whitespace-nowrap rounded bg-black/70 px-1 py-px text-2xs text-white">
                  {h.label}
                </span>
              )}
            </div>
          ))}

          {/* Playhead */}
          {duration > 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 -translate-x-1/2 bg-accent"
              style={{ left: `${playheadPct}%` }}
            >
              <div className="absolute -top-px left-1/2 -translate-x-1/2 border-x-[5px] border-x-transparent border-t-[6px] border-t-accent" />
            </div>
          )}

          {/* Hover ghost */}
          {hoverTime !== null && !isDragging && !draggingMarker && hoveredHighlightId === null && duration > 0 && (
            <div
              className="pointer-events-none absolute top-0 bottom-0 z-[9] w-px -translate-x-1/2 bg-white/35"
              style={{ left: `${(hoverTime / duration) * 100}%` }}
            >
              <span className="absolute top-0.5 left-1 whitespace-nowrap rounded bg-black/70 px-1 py-px text-2xs text-white">
                {formatTime(hoverTime)}
              </span>
            </div>
          )}
        </div>

        {/* Tick marks */}
        {thumbnails.length > 0 && (
          <div className="relative h-[18px] mt-0.5 hidden mobile-landscape:block">
            {thumbnails.map((thumb) => (
              <span
                key={thumb.time}
                className="absolute -translate-x-1/2 text-2xs text-fg-muted whitespace-nowrap"
                style={{ left: `${(thumb.time / duration) * 100}%` }}
              >
                {formatTime(thumb.time)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Frame controls + time labels */}
      <div className="mt-2 flex flex-col tablet:flex-row items-stretch tablet:items-center justify-between gap-2">
        <div className="flex gap-1 tablet:gap-2 flex-wrap">
          <button
            onClick={() => handleFrameSeek('backward')}
            className="min-h-[44px] tablet:min-h-0 rounded border border-edge-strong bg-control px-3 tablet:px-3 py-1 text-xs tablet:text-sm text-fg-1 hover:bg-control-hover transition-colors cursor-pointer"
            aria-label={TimelineStrings.ariaFrameBack}
          >
            <span className="hidden tablet:inline">{TimelineStrings.btnFrameBack}</span>
            <span className="tablet:hidden">‹‹</span>
          </button>
          <button
            onClick={() => handleFrameSeek('forward')}
            className="min-h-[44px] tablet:min-h-0 rounded border border-edge-strong bg-control px-3 tablet:px-3 py-1 text-xs tablet:text-sm text-fg-1 hover:bg-control-hover transition-colors cursor-pointer"
            aria-label={TimelineStrings.ariaFrameForward}
          >
            <span className="hidden tablet:inline">{TimelineStrings.btnFrameForward}</span>
            <span className="tablet:hidden">››</span>
          </button>
          <button
            onClick={() => trim.setIn(currentTime)}
            className="min-h-[44px] tablet:min-h-0 rounded border border-accent/40 bg-control px-3 tablet:px-3 py-1 text-xs tablet:text-sm text-accent hover:bg-accent/10 transition-colors cursor-pointer"
            title={TimelineStrings.titleSetIn}
          >
            {TimelineStrings.btnSetIn}
          </button>
          <button
            onClick={() => trim.setOut(currentTime)}
            className="min-h-[44px] tablet:min-h-0 rounded border border-danger/40 bg-control px-3 tablet:px-3 py-1 text-xs tablet:text-sm text-danger hover:bg-danger/10 transition-colors cursor-pointer"
            title={TimelineStrings.titleSetOut}
          >
            {TimelineStrings.btnSetOut}
          </button>
          <button
            onClick={onMark}
            className="min-h-[44px] tablet:min-h-0 rounded border border-amber/40 bg-control px-3 tablet:px-3 py-1 text-xs tablet:text-sm text-amber hover:bg-amber/10 transition-colors cursor-pointer hidden tablet:inline-block"
            title={TimelineStrings.titleMark}
          >
            {TimelineStrings.btnMark}
          </button>
          {(trim.inPoint !== null || trim.outPoint !== null) && (
            <button
              onClick={trim.clearMarkers}
              className="min-h-[44px] tablet:min-h-0 rounded border border-edge-strong bg-control px-3 tablet:px-3 py-1 text-xs tablet:text-sm text-fg-2 hover:bg-control-hover transition-colors cursor-pointer"
              title={TimelineStrings.titleClearMarkers}
            >
              {SharedStrings.btnClear}
            </button>
          )}
        </div>
        <div className="flex gap-4 font-mono text-xs tablet:text-sm text-fg-muted justify-end">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export default Timeline;