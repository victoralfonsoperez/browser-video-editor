import { useCallback, useEffect, useRef, useState } from 'react';
import { SharedStrings, ClipPreviewStrings } from '../../constants/ui';
import type { Clip } from '../../hooks/useTrimMarkers';

interface ClipPreviewModalProps {
  clip: Clip;
  videoURL: string;
  onClose: () => void;
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isPlaying, onClose, togglePlay]);

  const progress = clipDuration > 0
    ? Math.min(1, Math.max(0, (currentTime - clip.inPoint) / clipDuration))
    : 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-2xl mx-4 rounded-lg border border-[#333] bg-[#111114] shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2e]">
          <div className="flex items-center gap-3">
            {clip.thumbnailDataUrl && (
              <img
                src={clip.thumbnailDataUrl}
                alt=""
                className="w-10 h-[22px] rounded object-cover border border-[#333]"
              />
            )}
            <div>
              <div className="text-sm font-medium text-[#ccc]">{clip.name}</div>
              <div className="text-[10px] font-mono text-[#555]">
                {formatTime(clip.inPoint)} → {formatTime(clip.outPoint)}
                <span className="ml-2 text-[#444]">({formatTime(clipDuration)})</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#555] hover:text-[#ccc] transition-colors text-lg leading-none cursor-pointer"
            title={ClipPreviewStrings.titleClose}
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
        <div className="h-1 bg-[#222]">
          <div
            className="h-full bg-[#c8f55a] transition-none"
            style={{ width: `${progress * 100}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3 px-4 py-3 bg-[#1a1a1e]">
          <button
            onClick={togglePlay}
            className="rounded border border-[#444] bg-[#2a2a2e] px-4 py-1.5 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer min-w-[80px]"
          >
            {isPlaying ? SharedStrings.btnPause : SharedStrings.btnPlay}
          </button>

          <span className="font-mono text-xs text-[#666]">
            {formatTime(currentTime - clip.inPoint)} / {formatTime(clipDuration)}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-[#666] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="accent-[#c8f55a] cursor-pointer"
              />
              {ClipPreviewStrings.labelLoop}
            </label>
          </div>
        </div>

        {/* Keyboard hint */}
        <div className="px-4 pb-3 text-[10px] text-[#444]">
          <kbd className="rounded bg-[#222] px-1 py-px text-[#555]">{ClipPreviewStrings.keySpace}</kbd> {ClipPreviewStrings.hintPlayPause}{' '}
          <kbd className="rounded bg-[#222] px-1 py-px text-[#555]">{ClipPreviewStrings.keyEsc}</kbd> {ClipPreviewStrings.hintClose}
        </div>
      </div>
    </div>
  );
}