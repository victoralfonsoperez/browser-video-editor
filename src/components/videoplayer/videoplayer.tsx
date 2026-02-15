import { useState, useEffect, type SyntheticEvent, forwardRef } from 'react';

const VideoPlayer = forwardRef(({ videoURL, videoFile, currentTime, handleTimeUpdate, handleLoadMetadata }: { videoURL: string | undefined, videoFile: File | null, handleTimeUpdate: () => void, handleLoadMetadata: (value: number) => void, currentTime: number }, ref: any) => {
  //const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  // const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<any>(null);

  //console.log({videoRef, videoFile});

  // Play/Pause toggle
  const togglePlay = () => {
    if (ref.current) {
      if (isPlaying) {
        ref.current.pause();
      } else {
        ref.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };


  const handleVideoMetadata = (event: any) => {
      const video = event.target;
      handleLoadMetadata(video.duration);
    setVideoMetadata({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
      aspectRatio: video.videoWidth / video.videoHeight
    });
  };

  // Volume control
  const handleVolumeChange = (event: SyntheticEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.currentTarget.value);
    if (ref.current) {
      ref.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  // Mute toggle
  const toggleMute = () => {
    if (ref.current) {
      ref.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!ref.current) return;

      switch(event.code) {
        case 'Space':
          event.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          ref.current.currentTime = Math.max(0, currentTime - 5);
          break;
        case 'ArrowRight':
          event.preventDefault();
          ref.current.currentTime = Math.min(videoMetadata?.duration || 0, currentTime + 5);
          break;
        case 'KeyM':
          toggleMute();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, currentTime, videoMetadata?.duration, isMuted]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-player">
    <div className="video-info">
        <p><strong>File:</strong> {videoFile?.name}</p>
        <p><strong>Size:</strong> {(videoFile?.size ? (videoFile.size / 1024 / 1024).toFixed(1) : '0.0')} MB</p>
        <p><strong>Type:</strong> {videoFile?.type}</p>
        {videoMetadata && (
            <>
            <p><strong>Duration:</strong> {videoMetadata.duration.toFixed(2)}s</p>
            <p><strong>Resolution:</strong> {videoMetadata.width}x{videoMetadata.height}</p>
            </>
        )}
        </div>
      {/* Video Element */}
      <video
        ref={ref}
        src={videoURL}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleVideoMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        style={{
          width: '100%',
          maxWidth: '800px',
          backgroundColor: '#000',
          display: 'block'
        }}
      />

      {/* Custom Controls */}
      <div className="controls" style={styles.controls}>
        
        {/* Play/Pause Button */}
        <button onClick={togglePlay} style={styles.button}>
          {isPlaying ? '⏸️ Pause' : '▶️ Play'}
        </button>

        {/* Time Display */}
        <span>
          {formatTime(currentTime)} / {formatTime(videoMetadata?.duration)}
        </span>

        {/* Volume Controls */}
        <button onClick={toggleMute} style={styles.button}>
          {isMuted ? '🔇' : '🔊'}
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={isMuted ? 0 : volume}
          onChange={handleVolumeChange}
          style={styles.volumeBar}
        />
      </div>

      {/* Keyboard Shortcuts Help */}
      <div style={styles.help}>
        <strong>Shortcuts:</strong> Space = Play/Pause | ← → = Seek 5s | M = Mute
      </div>
    </div>
  );
});

// Basic inline styles (you can move to CSS file)
const styles = {
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '4px',
    maxWidth: '800px',
    marginTop: '10px'
  },
  button: {
    padding: '8px 16px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '4px',
    backgroundColor: '#fff',
    fontSize: '14px'
  },
  time: {
    fontSize: '14px',
    minWidth: '100px',
    textAlign: 'center'
  },
  seekBar: {
    flex: 1,
    cursor: 'pointer'
  },
  volumeBar: {
    width: '80px',
    cursor: 'pointer'
  },
  help: {
    marginTop: '10px',
    padding: '8px',
    backgroundColor: '#fff9e6',
    borderRadius: '4px',
    maxWidth: '800px',
    color: 'red'
  }
};

export default VideoPlayer;