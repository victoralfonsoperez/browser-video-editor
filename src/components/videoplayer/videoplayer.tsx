import { useState, useEffect, type SyntheticEvent, forwardRef, type RefObject, useCallback } from 'react';
import { SharedStrings, VideoPlayerStrings } from '../../constants/ui';

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

const VideoPlayer = forwardRef<HTMLVideoElement, { videoURL: string | undefined, videoFile: File | null, handleTimeUpdate: () => void, handleLoadMetadata: (value: number) => void, currentTime: number }>(({ videoURL, videoFile, currentTime, handleTimeUpdate, handleLoadMetadata }, forwardedRef) => {
  const ref = forwardedRef as RefObject<HTMLVideoElement>;
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);

  const togglePlay = useCallback(() => {
    if (ref.current) {
      if (isPlaying) { ref.current.pause(); } else { ref.current.play(); }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying, ref]);

  const handleVideoMetadata = (event: SyntheticEvent<HTMLVideoElement>) => {
    const video = event.currentTarget;
    handleLoadMetadata(video.duration);
    setVideoMetadata({
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    });
  };

  const handleVolumeChange = (event: SyntheticEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.currentTarget.value);
    if (ref.current) {
      ref.current.volume = newVolume;
      setVolume(newVolume);
      setIsMuted(newVolume === 0);
    }
  };

  const toggleMute = useCallback(() => {
    if (ref.current) {
      ref.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  }, [isMuted, ref]);

  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (!ref.current) return;
      switch (event.code) {
        case 'Space': event.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': event.preventDefault(); ref.current.currentTime = Math.max(0, currentTime - 5); break;
        case 'ArrowRight': event.preventDefault(); ref.current.currentTime = Math.min(videoMetadata?.duration || 0, currentTime + 5); break;
        case 'KeyM': toggleMute(); break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, currentTime, videoMetadata?.duration, isMuted, toggleMute, ref, togglePlay]);

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* File info */}
      <div className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[#aaa]">
        <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelFile}</strong> {videoFile?.name}</span>
        <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelSize}</strong> {(videoFile?.size ? (videoFile.size / 1024 / 1024).toFixed(1) : '0.0')} MB</span>
        <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelType}</strong> {videoFile?.type}</span>
        {videoMetadata && (
          <>
            <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelDuration}</strong> {videoMetadata.duration.toFixed(2)}s</span>
            <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelResolution}</strong> {videoMetadata.width}x{videoMetadata.height}</span>
          </>
        )}
      </div>

      {/* Video element */}
      <video
        ref={ref}
        src={videoURL}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleVideoMetadata}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        className="w-full max-w-4xl bg-black block"
      />

      {/* Controls bar */}
      <div className="mt-2 flex items-center gap-3 rounded bg-[#2a2a2e] px-3 py-2">
        <button
          onClick={togglePlay}
          className="rounded border border-[#444] bg-[#1a1a1e] px-3 py-1 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
        >
          {isPlaying ? SharedStrings.btnPause : SharedStrings.btnPlay}
        </button>

        <span className="font-mono text-sm text-[#aaa]">
          {formatTime(currentTime)} / {formatTime(videoMetadata?.duration ?? 0)}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="text-lg leading-none cursor-pointer"
            title={isMuted ? VideoPlayerStrings.titleUnmute : VideoPlayerStrings.titleMute}
          >
            {isMuted ? '🔇' : '🔊'}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 cursor-pointer accent-[#c8f55a]"
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-1.5 rounded bg-[#1a1a1e] px-3 py-1.5 text-xs text-[#666]">
        <strong className="text-[#555]">Shortcuts:</strong> {VideoPlayerStrings.shortcutsHint}
      </div>
    </div>
  );
});

export default VideoPlayer;
