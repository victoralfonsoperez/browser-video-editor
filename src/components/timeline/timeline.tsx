import { useState, useRef, useEffect } from 'react';

function Timeline({ videoRef, currentTime, duration, onSeek }: any) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);

  // Calculate time from mouse position
  const getTimeFromPosition = (clientX: number) => {
    if (!timelineRef.current) return 0;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * duration;
  };

  // Handle click to seek
  const handleClick = (event: any) => {
    const newTime = getTimeFromPosition(event.clientX);
    onSeek(newTime);
  };

  // Handle drag start
  const handleMouseDown = (event: any) => {
    setIsDragging(true);
    const newTime = getTimeFromPosition(event.clientX);
    onSeek(newTime);
  };

  // Handle dragging
  const handleMouseMove = (event: any) => {
    if (isDragging) {
      const newTime = getTimeFromPosition(event.clientX);
      onSeek(newTime);
    }
    
    // Show hover time preview
    const time = getTimeFromPosition(event.clientX);
    setHoverTime(time);
  };

  // Handle drag end
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Handle mouse leave
  const handleMouseLeave = () => {
    setHoverTime(null);
  };

  // TIMELINE
  const handleFrameSeek = (direction: any) => {
  if (!videoRef.current) return;
  
  // Assuming 30fps video
  const frameDuration = 1 / 30;
  const newTime = direction === 'forward' 
    ? currentTime + frameDuration 
    : currentTime - frameDuration;
  
  onSeek(Math.max(0, Math.min(duration, newTime)));
};

// MOBILE SUPPORT
const handleTouchStart = (event: any) => {
  setIsDragging(true);
  const touch = event.touches[0];
  const newTime = getTimeFromPosition(touch.clientX);
  onSeek(newTime);
};

const handleTouchMove = (event: any) => {
  if (isDragging) {
    const touch = event.touches[0];
    const newTime = getTimeFromPosition(touch.clientX);
    onSeek(newTime);
  }
};

const handleTouchEnd = () => {
  setIsDragging(false);
};

  // Add/remove global mouse event listeners for dragging
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

  // Format time helper
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate playhead position percentage
  const playheadPosition = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={styles.container}>
      {/* Timeline Bar */}
      <div
        ref={timelineRef}
        style={styles.timeline}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Progress Bar */}
        <div 
          style={{
            ...styles.progress,
            width: `${playheadPosition}%`
          }}
        />

        {/* Playhead */}
        <div 
          style={{
            ...styles.playhead,
            left: `${playheadPosition}%`
          }}
        />

        {/* Hover Time Preview */}
        {hoverTime !== null && !isDragging && (
          <div
            style={{
              ...styles.hoverPreview,
              left: `${(hoverTime / duration) * 100}%`
            }}
          >
            {formatTime(hoverTime)}
          </div>
        )}
      </div>
      {/* frame-by-frame buttons */}  
      <div style={styles.frameControls}>
        <button onClick={() => handleFrameSeek('backward')}>◀ Frame</button>
        <button onClick={() => handleFrameSeek('forward')}>Frame ▶</button>
    </div>

      {/* Time Labels */}
      <div style={styles.timeLabels}>
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    width: '100%',
    maxWidth: '800px',
    margin: '20px auto',
  },
  timeline: {
    position: 'relative',
    height: '40px',
    backgroundColor: '#e0e0e0',
    borderRadius: '8px',
    cursor: 'pointer',
    overflow: 'visible',
  },
  progress: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: '100%',
    backgroundColor: '#2196F3',
    borderRadius: '8px',
    pointerEvents: 'none',
    transition: 'width 0.1s ease-out',
  } as React.CSSProperties,
  playhead: {
    position: 'absolute',
    top: '-4px',
    width: '4px',
    height: '48px',
    backgroundColor: '#1976D2',
    borderRadius: '2px',
    transform: 'translateX(-50%)',
    pointerEvents: 'none',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  } as React.CSSProperties,
  hoverPreview: {
    position: 'absolute',
    top: '-30px',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(0,0,0,0.8)',
    color: 'white',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  timeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '8px',
    fontSize: '14px',
    color: '#666',
    fontFamily: 'monospace',
  },
};

export default Timeline;