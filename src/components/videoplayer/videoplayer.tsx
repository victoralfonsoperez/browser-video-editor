import { useState, useEffect, type SyntheticEvent, forwardRef, type RefObject, useCallback } from 'react';
import { SharedStrings, VideoPlayerStrings, AppStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import { useToast } from '../../context/ToastContext';

interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
}

const VideoPlayer = forwardRef<HTMLVideoElement, { videoURL: string | undefined, videoFile: File | null, handleTimeUpdate: () => void, handleLoadMetadata: (value: number) => void, currentTime: number, isModalOpen: boolean }>(({ videoURL, videoFile, currentTime, handleTimeUpdate, handleLoadMetadata, isModalOpen }, forwardedRef) => {
  const ref = forwardedRef as RefObject<HTMLVideoElement>;
  const { showToast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

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
      const tag = (event.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (isModalOpen) return;
      switch (event.code) {
        case 'Space': event.preventDefault(); togglePlay(); break;
        case 'ArrowLeft': event.preventDefault(); ref.current.currentTime = Math.max(0, currentTime - 5); break;
        case 'ArrowRight': event.preventDefault(); ref.current.currentTime = Math.min(videoMetadata?.duration ?? 0, currentTime + 5); break;
        case 'KeyM': toggleMute(); break;
        case 'Home':
          event.preventDefault();
          ref.current.currentTime = 0;
          break;
        case 'End':
          event.preventDefault();
          ref.current.currentTime = videoMetadata?.duration ?? 0;
          break;
        case 'Comma':
          event.preventDefault();
          ref.current.currentTime = Math.max(0, currentTime - 1 / 30);
          break;
        case 'Period':
          event.preventDefault();
          ref.current.currentTime = Math.min(videoMetadata?.duration ?? 0, currentTime + 1 / 30);
          break;
        case 'KeyJ':
          event.preventDefault();
          ref.current.currentTime = Math.max(0, currentTime - 10);
          break;
        case 'KeyK':
          if (isPlaying) ref.current.pause(); else ref.current.play();
          setIsPlaying(!isPlaying);
          break;
        case 'KeyL':
          event.preventDefault();
          ref.current.currentTime = Math.min(videoMetadata?.duration ?? 0, currentTime + 10);
          break;
      }
    };
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isPlaying, currentTime, videoMetadata?.duration, isMuted, toggleMute, ref, togglePlay, isModalOpen]);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* File info */}
      <div className="mb-2 flex flex-wrap gap-x-2 tablet:gap-x-4 gap-y-1 text-xs tablet:text-sm text-[#aaa]">
        <span className="truncate max-w-full mobile-landscape:max-w-none"><strong className="text-[#ccc]">{VideoPlayerStrings.labelFile}</strong> {videoFile?.name ?? AppStrings.driveLabelSource}</span>
        {videoFile && <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelSize}</strong> {(videoFile.size / 1024 / 1024).toFixed(1)} MB</span>}
        {videoFile && <span className="hidden mobile-landscape:inline"><strong className="text-[#ccc]">{VideoPlayerStrings.labelType}</strong> {videoFile.type}</span>}
        {videoMetadata && (
          <>
            <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelDuration}</strong> {videoMetadata.duration.toFixed(2)}s</span>
            <span><strong className="text-[#ccc]">{VideoPlayerStrings.labelResolution}</strong> {videoMetadata.width}x{videoMetadata.height}</span>
          </>
        )}
      </div>

      {/* Video element */}
      <div className="relative aspect-video bg-black">
        <video
          ref={ref}
          src={videoURL}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleVideoMetadata}
          onLoadStart={() => setIsVideoLoading(true)}
          onCanPlay={() => setIsVideoLoading(false)}
          onLoadedData={() => setIsVideoLoading(false)}
          onWaiting={() => setIsVideoLoading(true)}
          onPlaying={() => setIsVideoLoading(false)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={() => setIsPlaying(false)}
          onError={(e) => {
            setIsVideoLoading(false);
            // code 2 = MEDIA_ERR_NETWORK (proxy/fetch failure)
            // code 4 = MEDIA_ERR_SRC_NOT_SUPPORTED (bad format or unreachable URL)
            const code = e.currentTarget.error?.code
            showToast(
              code === 2 ? VideoPlayerStrings.errorVideoNetwork : VideoPlayerStrings.errorVideoLoad,
              'error',
            )
          }}
          className="w-full h-full object-contain bg-black block"
        />
        {isVideoLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-[#c8f55a] border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-[#ccc]">{VideoPlayerStrings.loadingVideo}</span>
            </div>
          </div>
        )}
      </div>

      {/* Controls bar */}
      <div className="mt-2 flex items-center gap-2 tablet:gap-3 rounded bg-[#2a2a2e] px-2 tablet:px-3 py-2">
        <button
          onClick={togglePlay}
          className="rounded border border-[#444] bg-[#1a1a1e] px-2 tablet:px-3 py-1 text-xs tablet:text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
        >
          {isPlaying ? SharedStrings.btnPause : SharedStrings.btnPlay}
        </button>

        <span className="font-mono text-xs tablet:text-sm text-[#aaa]">
          {formatTime(currentTime)} / {formatTime(videoMetadata?.duration ?? 0)}
        </span>

        <div className="ml-auto flex items-center gap-1 tablet:gap-2">
          <button
            onClick={toggleMute}
            className="text-base tablet:text-lg leading-none cursor-pointer"
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
            className="w-12 tablet:w-20 cursor-pointer accent-[#c8f55a]"
          />
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
      <div className="mt-1.5 rounded bg-[#1a1a1e] px-2 tablet:px-3 py-1.5 text-[10px] tablet:text-xs text-[#666] hidden mobile-landscape:block">
        <strong className="text-[#555]">Shortcuts:</strong> {VideoPlayerStrings.shortcutsHint}
      </div>
    </div>
  );
});

export default VideoPlayer;
