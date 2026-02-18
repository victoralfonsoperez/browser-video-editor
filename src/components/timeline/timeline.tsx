import { useState, useRef, useEffect } from 'react';
import { useVideoThumbnails } from '../../hooks/useVideoThumbnails';

export function Timeline({ videoRef, currentTime, duration, onSeek }: any) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const { thumbnails, isGenerating, generateThumbnails } = useVideoThumbnails();

  useEffect(() => {
    if (videoRef?.current && duration > 0 && thumbnails.length === 0 && !isGenerating) {
      generateThumbnails(videoRef.current, 2);
    }
  }, [duration]);

  const getTimeFromPosition = (clientX: number) => {
    if (!timelineRef.current) return 0;
    const rect = timelineRef.current.getBoundingClientRect();
    return Math.max(0, Math.min(1, (clientX - rect.left) / rect.width)) * duration;
  };

  const handleClick = (e: any) => onSeek(getTimeFromPosition(e.clientX));
  const handleMouseDown = (e: any) => { setIsDragging(true); onSeek(getTimeFromPosition(e.clientX)); };
  const handleMouseMove = (e: any) => { if (isDragging) onSeek(getTimeFromPosition(e.clientX)); setHoverTime(getTimeFromPosition(e.clientX)); };
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseLeave = () => setHoverTime(null);
  const handleTouchStart = (e: any) => { setIsDragging(true); onSeek(getTimeFromPosition(e.touches[0].clientX)); };
  const handleTouchMove = (e: any) => { if (isDragging) onSeek(getTimeFromPosition(e.touches[0].clientX)); };
  const handleTouchEnd = () => setIsDragging(false);

  const handleFrameSeek = (direction: any) => {
    if (!videoRef.current) return;
    const frameDuration = 1 / 30;
    const newTime = direction === 'forward' ? currentTime + frameDuration : currentTime - frameDuration;
    onSeek(Math.max(0, Math.min(duration, newTime)));
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, duration]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const playheadPct = duration > 0 ? (currentTime / duration) * 100 : 0;

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
            <span>{thumbnails.length > 0 ? `${thumbnails.length} thumbnails` : ''}</span>
          )}
          <span className="text-[#c8f55a] tabular-nums text-xs font-semibold">{formatTime(currentTime)}</span>
        </div>

        {/* Track */}
        <div
          ref={timelineRef}
          className="relative h-[54px] w-full cursor-crosshair overflow-hidden"
          onClick={handleClick}
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
                className="h-full w-20 shrink-0 object-cover opacity-85 hover:opacity-100 transition-opacity duration-150"
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
          {hoverTime !== null && !isDragging && duration > 0 && (
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
