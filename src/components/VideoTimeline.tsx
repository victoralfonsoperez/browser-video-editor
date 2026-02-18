import { useRef, useState } from 'react'
import type { Thumbnail } from '../hooks/useVideoThumbnails'
import './VideoTimeline.css'

interface Props {
  thumbnails: Thumbnail[]
  isGenerating: boolean
  currentTime: number
  duration: number
  onSeek: (time: number) => void
}

export function VideoTimeline({ thumbnails, isGenerating, currentTime, duration, onSeek }: Props) {
  const [hoveredTime, setHoveredTime] = useState<number | null>(null)

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0

  function getTimeFromEvent(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    return Math.max(0, Math.min(duration, (x / rect.width) * duration))
  }

  function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    onSeek(getTimeFromEvent(e))
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    setHoveredTime(getTimeFromEvent(e))
  }

  function formatTime(s: number) {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="timeline-wrapper">
      <div className="timeline-label">
        {isGenerating ? (
          <span className="timeline-generating">
            <span className="timeline-spinner" /> Generating thumbnails…
          </span>
        ) : (
          <span>{thumbnails.length > 0 ? `${thumbnails.length} thumbnails` : ''}</span>
        )}
        <span className="timeline-time">{formatTime(currentTime)}</span>
      </div>

      <div
        className="timeline-track"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredTime(null)}
      >
        {/* Thumbnail strip */}
        <div className="thumbnail-strip">
          {thumbnails.map((thumb) => (
            <img
              key={thumb.time}
              src={thumb.dataUrl}
              className="thumbnail"
              alt={`t=${thumb.time}s`}
              title={formatTime(thumb.time)}
            />
          ))}
          {thumbnails.length === 0 && !isGenerating && (
            <div className="timeline-empty">Load a video to see the timeline</div>
          )}
        </div>

        {/* Playhead */}
        {duration > 0 && (
          <div
            className="playhead"
            style={{ left: `${playheadPercent}%` }}
          />
        )}

        {/* Hover ghost */}
        {hoveredTime !== null && duration > 0 && (
          <div
            className="hover-marker"
            style={{ left: `${(hoveredTime / duration) * 100}%` }}
          >
            <span className="hover-time">{formatTime(hoveredTime)}</span>
          </div>
        )}
      </div>

      {/* Tick marks */}
      {thumbnails.length > 0 && (
        <div className="tick-row">
          {thumbnails.map((thumb) => (
            <span
              key={thumb.time}
              className="tick"
              style={{ left: `${(thumb.time / duration) * 100}%` }}
            >
              {formatTime(thumb.time)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
