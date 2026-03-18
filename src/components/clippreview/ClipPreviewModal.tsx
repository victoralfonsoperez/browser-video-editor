import { useCallback, useEffect, useRef, useState } from 'react';
import { SharedStrings, ClipPreviewStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import type { Clip } from '../../hooks/useTrimMarkers';
import { FocusTrap } from '../common/FocusTrap';

interface ClipPreviewModalProps {
  clip: Clip;
  videoURL: string;
  onClose: () => void;
}

export function ClipPreviewModal({ clip, videoURL, onClose }: ClipPreviewModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(clip.inPoint);
  const [loop, setLoop] = useState(false);
  const clipDuration = clip.outPoint - clip.inPoint;

  // Seek to inPoint when modal opens
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.readyState >= 1) {
      video.currentTime = clip.inPoint;
    } else {
      video.addEventListener('loadedmetadata', () => {
        video.currentTime = clip.inPoint;
      }, { once: true });
    }
  }, [clip.inPoint]);

  // Stop (or loop) at outPoint
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.currentTime >= clip.outPoint) {
        if (loop) {
          video.currentTime = clip.inPoint;
          video.play();
        } else {
          video.pause();
          video.currentTime = clip.inPoint;
          setIsPlaying(false);
        }
      }
    };
    video.addEventListener('timeupdate', onTimeUpdate);
    return () => video.removeEventListener('timeupdate', onTimeUpdate);
  }, [clip.inPoint, clip.outPoint, loop]);

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying) {
      video.pause();
    } else {
      if (video.currentTime >= clip.outPoint) {
        video.currentTime = clip.inPoint;
      }
      video.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, clip.inPoint, clip.outPoint]);

  // Keyboard shortcuts (Space to play/pause)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, togglePlay]);

  const progress = clipDuration > 0
    ? Math.min(1, Math.max(0, (currentTime - clip.inPoint) / clipDuration))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <FocusTrap onEscape={onClose}>
      <div className="relative w-full max-w-2xl mx-4 rounded-lg border border-edge-mid bg-base shadow-2xl overflow-hidden animate-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-control">
          <div className="flex items-center gap-3">
            {clip.thumbnailDataUrl && (
              <img
                src={clip.thumbnailDataUrl}
                alt=""
                className="w-10 h-[22px] rounded object-cover border border-edge-mid"
              />
            )}
            <div>
              <div className="text-sm font-medium text-fg-1">{clip.name}</div>
              <div className="text-2xs font-mono text-fg-muted">
                {formatTime(clip.inPoint)} → {formatTime(clip.outPoint)}
                <span className="ml-2 text-fg-muted">({formatTime(clipDuration)})</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-fg-muted hover:text-fg-1 transition-colors text-lg leading-none cursor-pointer"
            title={ClipPreviewStrings.titleClose}
            aria-label={ClipPreviewStrings.titleClose}
          >
            {SharedStrings.btnClose}
          </button>
        </div>

        {/* Video */}
        <div className="bg-black">
          <video
            ref={videoRef}
            src={videoURL}
            className="w-full block max-h-[60vh] object-contain"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
        </div>

        {/* Progress bar — clip-relative */}
        <div className="h-1 bg-kbd">
          <div
            className="h-full bg-accent transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-3 bg-raised">
          <button
            onClick={togglePlay}
            className="min-h-[44px] rounded border border-edge-strong bg-control px-4 py-1.5 text-sm text-fg-1 hover:bg-control-hover transition-colors cursor-pointer min-w-[80px]"
          >
            {isPlaying ? SharedStrings.btnPause : SharedStrings.btnPlay}
          </button>

          <span className="font-mono text-xs text-fg-muted">
            {formatTime(currentTime - clip.inPoint)} / {formatTime(clipDuration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-fg-muted cursor-pointer select-none">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="accent-accent cursor-pointer"
              />
              {ClipPreviewStrings.labelLoop}
            </label>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="px-4 pb-3 text-2xs text-fg-muted">
          <kbd className="rounded bg-kbd px-1 py-px text-fg-muted">{ClipPreviewStrings.keySpace}</kbd> {ClipPreviewStrings.hintPlayPause}{' '}
          <kbd className="rounded bg-kbd px-1 py-px text-fg-muted">{ClipPreviewStrings.keyEsc}</kbd> {ClipPreviewStrings.hintClose}
        </div>
      </div>
      </FocusTrap>
    </div>
  );
}