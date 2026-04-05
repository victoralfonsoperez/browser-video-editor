import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SharedStrings, TimelineStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import { isInputFocused } from '../../utils/isInputFocused';
import { THUMB_WIDTH } from '../../utils/thumbnails';
import { useVideoThumbnails } from '../../hooks/useVideoThumbnails';
import { useTimelineZoom } from '../../hooks/useTimelineZoom';
import { WaveformCanvas } from './WaveformCanvas';
import type { useTrimMarkers } from '../../hooks/useTrimMarkers';
import type { Highlight } from '../../types/highlights';

type TrimMarkers = ReturnType<typeof useTrimMarkers>;

/** Generate this many times more thumbnails than the base count so we have
 *  enough density to fill any zoom level without per-zoom regeneration. */
const POOL_MULTIPLIER = 4;

interface TimelineProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  onMark: () => void;
  trim: TrimMarkers;
  highlights?: Highlight[];
  waveformData?: Float32Array | null;
}

export function Timeline({ videoRef, currentTime, duration, onSeek, onMark, trim, highlights = [], waveformData }: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [draggingMarker, setDraggingMarker] = useState<'in' | 'out' | null>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoveredHighlightId, setHoveredHighlightId] = useState<string | null>(null);
  const { thumbnails, isGenerating, generateThumbnails } = useVideoThumbnails();
  const { zoom, scrollOffset, zoomBy, pan, follow, reset: resetZoom } = useTimelineZoom();

  // ---------------------------------------------------------------------------
  // Zoom-derived view window
  // ---------------------------------------------------------------------------
  const viewDuration = duration > 0 ? duration / zoom : 0;
  const viewStart = duration > 0 ? Math.max(0, Math.min(duration - viewDuration, scrollOffset)) : 0;
  const viewEnd = viewStart + viewDuration;

  // Percentage helpers (viewport-relative)
  // pct(t)       → CSS left/position for a point in time
  // pctWidth(dt) → CSS width for a time interval
  const pct = (t: number) =>
    viewDuration > 0 ? `${((t - viewStart) / viewDuration) * 100}%` : '0%';
  const pctWidth = (dt: number) =>
    viewDuration > 0 ? `${(dt / viewDuration) * 100}%` : '0%';
  const playheadPct = viewDuration > 0 ? ((currentTime - viewStart) / viewDuration) * 100 : 0;

  // ---------------------------------------------------------------------------
  // Ref declarations — must precede the effects that close over them
  // ---------------------------------------------------------------------------
  const prevCurrentTimeRef = useRef(currentTime);
  const prevDurationRef = useRef(duration);

  // ---------------------------------------------------------------------------
  // Thumbnail generation — once per video load, for the full duration
  // ---------------------------------------------------------------------------
  const generate = useCallback(() => {
    if (!videoRef?.current || !Number.isFinite(duration) || duration <= 0 || isGenerating) return;
    const width = timelineRef.current?.getBoundingClientRect().width ?? 0;
    if (width <= 0) return;
    const count = Math.max(1, Math.floor(width / THUMB_WIDTH));
    generateThumbnails(videoRef.current, count * POOL_MULTIPLIER);
  }, [videoRef, duration, isGenerating, generateThumbnails]);

  useEffect(() => {
    if (duration > 0 && thumbnails.length === 0 && !isGenerating) {
      generate();
    }
  }, [duration, generate, thumbnails.length, isGenerating]);

  // ---------------------------------------------------------------------------
  // Wheel handler — zoom (Ctrl+scroll) or pan (scroll)
  // ---------------------------------------------------------------------------
  const handleWheelEvent = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const el = timelineRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();

    if (e.ctrlKey || e.metaKey) {
      // Zoom centred on cursor position
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const centerTime = viewStart + fraction * viewDuration;
      const factor = Math.pow(1.001, -e.deltaY);
      zoomBy(factor, centerTime, duration);
    } else {
      // Pan — prefer horizontal delta (trackpads), fall back to vertical
      const delta = Math.abs(e.deltaX) >= Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      const trackWidth = rect.width;
      if (trackWidth > 0) pan((delta / trackWidth) * viewDuration, duration);
    }
  }, [viewStart, viewDuration, zoomBy, pan, duration]);

  // Attach wheel listener — passive:false so we can preventDefault
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheelEvent, { passive: false });
    return () => el.removeEventListener('wheel', handleWheelEvent);
  }, [handleWheelEvent]);

  // ---------------------------------------------------------------------------
  // Position helpers
  // ---------------------------------------------------------------------------
  const getTimeFromPosition = useCallback((clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    const fraction = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    return viewStart + fraction * viewDuration;
  }, [viewStart, viewDuration]);

  // ---------------------------------------------------------------------------
  // Keyboard bindings
  // ---------------------------------------------------------------------------

  // Trim markers (I / O)
  useEffect(() => {
    const handler = trim.bindKeyboard(currentTime);
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentTime, trim.bindKeyboard, trim]);

  // H key — highlight
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputFocused(e)) return;
      if (e.key === 'h' || e.key === 'H') onMark();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onMark]);

  // + / − keys — zoom (centred on playhead)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (isInputFocused(e)) return;
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomBy(2, currentTime, duration);
      } else if (e.key === '-') {
        e.preventDefault();
        zoomBy(0.5, currentTime, duration);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentTime, duration, zoomBy]);

  // ---------------------------------------------------------------------------
  // Auto-scroll: keep playhead visible while video is playing
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const prev = prevCurrentTimeRef.current;
    prevCurrentTimeRef.current = currentTime;
    if (zoom <= 1 || duration <= 0) return;
    // Only follow when time advances forward (playback, not a backwards seek)
    if (currentTime > prev && currentTime > viewEnd) {
      follow(currentTime, duration);
    }
  }, [currentTime, zoom, viewEnd, follow, duration]);

  // ---------------------------------------------------------------------------
  // Reset zoom when a new video is loaded
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const prev = prevDurationRef.current;
    prevDurationRef.current = duration;
    if (prev > 0 && duration === 0) {
      resetZoom();
    }
  }, [duration, resetZoom]);

  // ---------------------------------------------------------------------------
  // Mouse / touch drag handlers
  // ---------------------------------------------------------------------------
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

  // ---------------------------------------------------------------------------
  // Frame seek
  // ---------------------------------------------------------------------------
  const handleFrameSeek = (direction: 'forward' | 'backward') => {
    const frameDuration = 1 / 30;
    const newTime = direction === 'forward' ? currentTime + frameDuration : currentTime - frameDuration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  // ---------------------------------------------------------------------------
  // Minimap drag
  // ---------------------------------------------------------------------------
  const handleMinimapMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const seek = (ev: MouseEvent | React.MouseEvent) => {
      const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
      const targetCenter = fraction * duration;
      pan(targetCenter - viewDuration / 2 - viewStart, duration);
    };
    seek(e);
    const onMove = (ev: MouseEvent) => seek(ev);
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  // ---------------------------------------------------------------------------
  // Computed display values
  // ---------------------------------------------------------------------------
  const showRegion = trim.inPoint !== null && trim.outPoint !== null;
  const zoomLabel = TimelineStrings.labelZoom(zoom % 1 === 0 ? zoom : parseFloat(zoom.toFixed(1)));

  // Thumbnails visible in the current viewport — subset of the full pool
  const displayedThumbnails = useMemo(() => {
    if (thumbnails.length === 0 || viewDuration <= 0) return [];
    // Include one thumbnail before viewStart and one after viewEnd for edge coverage
    const extended = thumbnails.filter((t) => t.time >= viewStart - viewDuration / thumbnails.length && t.time <= viewEnd + viewDuration / thumbnails.length);
    return extended.length > 0 ? extended : thumbnails;
  }, [thumbnails, viewStart, viewEnd, viewDuration]);

  // Waveform view fractions (0–1) for the visible window
  const waveViewStartFrac = duration > 0 ? viewStart / duration : 0;
  const waveViewEndFrac = duration > 0 ? viewEnd / duration : 1;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full max-w-4xl mx-auto mt-4 tablet:mt-6 select-none" data-tour="timeline">
      <div className="pb-1">

        {/* Header */}
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
          {/* Thumbnail strip — flex row so images fill the view at any zoom
              level without per-zoom regeneration. Pool is generated once. */}
          {thumbnails.length === 0 && !isGenerating && (
            <div className="flex w-full h-full items-center justify-center bg-base text-xs text-fg-muted">
              {TimelineStrings.emptyState}
            </div>
          )}
          {displayedThumbnails.length > 0 && (
            <div className="absolute inset-0 flex">
              {displayedThumbnails.map((thumb) => (
                <img
                  key={thumb.time}
                  src={thumb.dataUrl}
                  className="flex-1 h-full object-cover opacity-85"
                  alt={TimelineStrings.thumbnailAlt(thumb.time)}
                  title={formatTime(thumb.time)}
                />
              ))}
            </div>
          )}

          {/* Audio waveform overlay */}
          <WaveformCanvas
            waveformData={waveformData ?? null}
            viewStartFrac={waveViewStartFrac}
            viewEndFrac={waveViewEndFrac}
          />

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
                width: pctWidth(trim.outPoint! - trim.inPoint!),
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
                style={{ left: pct(h.time), width: pctWidth(h.endTime - h.time) }}
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
              style={{ left: `${((hoverTime - viewStart) / viewDuration) * 100}%` }}
            >
              <span className="absolute top-0.5 left-1 whitespace-nowrap rounded bg-black/70 px-1 py-px text-2xs text-white">
                {formatTime(hoverTime)}
              </span>
            </div>
          )}
        </div>

        {/* Minimap — only shown when zoomed in */}
        {zoom > 1 && duration > 0 && (
          <div
            className="relative h-1.5 mt-1 rounded-full bg-base overflow-hidden cursor-pointer"
            role="scrollbar"
            aria-label={TimelineStrings.ariaMinimapScroll}
            aria-valuenow={Math.round((viewStart / duration) * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            onMouseDown={handleMinimapMouseDown}
          >
            <div
              className="absolute top-0 h-full rounded-full bg-accent/60"
              style={{
                left: `${(viewStart / duration) * 100}%`,
                width: `${(viewDuration / duration) * 100}%`,
              }}
            />
          </div>
        )}

        {/* Tick marks — slot-based positions matching the flex thumbnail row */}
        {displayedThumbnails.length > 0 && (
          <div className="relative h-[18px] mt-0.5 hidden mobile-landscape:block overflow-hidden">
            {displayedThumbnails.map((thumb, i) => (
              <span
                key={thumb.time}
                className="absolute -translate-x-1/2 text-2xs text-fg-muted whitespace-nowrap"
                style={{ left: `${((i + 0.5) / displayedThumbnails.length) * 100}%` }}
              >
                {formatTime(thumb.time)}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Frame controls + zoom + time labels */}
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

          {/* Zoom controls */}
          {duration > 0 && (
            <div className="flex items-center gap-1 ml-1">
              <button
                onClick={() => zoomBy(0.5, currentTime, duration)}
                className="min-h-[44px] tablet:min-h-0 rounded border border-edge-strong bg-control px-2.5 py-1 text-sm text-fg-1 hover:bg-control-hover transition-colors cursor-pointer leading-none"
                title={TimelineStrings.titleZoomOut}
                aria-label={TimelineStrings.ariaZoomOut}
              >
                {TimelineStrings.btnZoomOut}
              </button>
              <span className="text-xs font-mono text-fg-muted min-w-[2.5rem] text-center tabular-nums">
                {zoomLabel}
              </span>
              <button
                onClick={() => zoomBy(2, currentTime, duration)}
                className="min-h-[44px] tablet:min-h-0 rounded border border-edge-strong bg-control px-2.5 py-1 text-sm text-fg-1 hover:bg-control-hover transition-colors cursor-pointer leading-none"
                title={TimelineStrings.titleZoomIn}
                aria-label={TimelineStrings.ariaZoomIn}
              >
                {TimelineStrings.btnZoomIn}
              </button>
              {zoom > 1 && (
                <button
                  onClick={resetZoom}
                  className="min-h-[44px] tablet:min-h-0 rounded border border-edge-strong bg-control px-2 py-1 text-xs text-fg-2 hover:bg-control-hover transition-colors cursor-pointer"
                  title={TimelineStrings.titleZoomReset}
                  aria-label={TimelineStrings.ariaZoomReset}
                >
                  {TimelineStrings.btnZoomReset}
                </button>
              )}
            </div>
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
