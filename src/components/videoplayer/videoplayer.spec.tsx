import { render, screen, fireEvent } from '@testing-library/react';
import { createRef } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VideoPlayer from './videoplayer';

beforeEach(() => {
  window.HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
  window.HTMLMediaElement.prototype.pause = vi.fn();
});

const defaultProps = {
  videoURL: 'blob:http://localhost/test-video',
  videoFile: new File([''], 'test-video.mp4', { type: 'video/mp4' }),
  currentTime: 0,
  handleTimeUpdate: vi.fn(),
  handleLoadMetadata: vi.fn(),
};

function renderVideoPlayer(props = {}) {
  const ref = createRef<HTMLVideoElement>();
  const result = render(<VideoPlayer {...defaultProps} {...props} ref={ref} />);
  return { ...result, ref };
}

describe('VideoPlayer', () => {
  describe('rendering', () => {
    it('renders the video element with the provided src', () => {
      renderVideoPlayer();
      const video = document.querySelector('video');
      expect(video).toBeInTheDocument();
      expect(video).toHaveAttribute('src', defaultProps.videoURL);
    });

    it('renders file info (name, size, type)', () => {
      renderVideoPlayer();
      expect(screen.getByText(/test-video\.mp4/)).toBeInTheDocument();
      expect(screen.getByText(/video\/mp4/)).toBeInTheDocument();
    });

    it('renders play button initially', () => {
      renderVideoPlayer();
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });

    it('renders mute button', () => {
      renderVideoPlayer();
      expect(screen.getByTitle(/mute/i)).toBeInTheDocument();
    });

    it('renders volume slider', () => {
      renderVideoPlayer();
      const slider = screen.getByRole('slider');
      expect(slider).toBeInTheDocument();
      expect(slider).toHaveAttribute('max', '1');
    });

    it('renders keyboard shortcuts hint', () => {
      renderVideoPlayer();
      expect(screen.getByText(/shortcuts/i)).toBeInTheDocument();
    });

    it('shows 0:00 time display when currentTime is 0', () => {
      renderVideoPlayer();
      expect(screen.getByText(/^0:00/)).toBeInTheDocument();
    });
  });

  describe('play/pause toggle', () => {
    it('calls play() on video element when play button is clicked', () => {
      renderVideoPlayer();
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    });

    it('switches to pause button after play is clicked', () => {
      renderVideoPlayer();
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
      fireEvent.play(document.querySelector('video')!);
      expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
    });

    it('calls pause() on video element when pause button is clicked', () => {
      renderVideoPlayer();
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
      fireEvent.play(document.querySelector('video')!);
      fireEvent.click(screen.getByRole('button', { name: /pause/i }));
      expect(window.HTMLMediaElement.prototype.pause).toHaveBeenCalledTimes(1);
    });

    it('reverts to play button when video ends', () => {
      renderVideoPlayer();
      fireEvent.click(screen.getByRole('button', { name: /play/i }));
      fireEvent.play(document.querySelector('video')!);
      fireEvent.ended(document.querySelector('video')!);
      expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
    });
  });

  describe('mute toggle', () => {
    it('toggles to muted state when mute button is clicked', () => {
      renderVideoPlayer();
      fireEvent.click(screen.getByTitle(/mute/i));
      expect(screen.getByTitle(/unmute/i)).toBeInTheDocument();
    });

    it('toggles back to unmuted on second click', () => {
      renderVideoPlayer();
      fireEvent.click(screen.getByTitle(/mute/i));
      fireEvent.click(screen.getByTitle(/unmute/i));
      expect(screen.getByTitle(/mute/i)).toBeInTheDocument();
    });

    it('sets volume slider to 0 when muted', () => {
      renderVideoPlayer();
      fireEvent.click(screen.getByTitle(/mute/i));
      expect(screen.getByRole('slider')).toHaveValue('0');
    });
  });

  describe('volume slider', () => {
    it('changes volume value when slider is moved', () => {
      renderVideoPlayer();
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '0.5' } });
      expect(slider).toHaveValue('0.5');
    });

    it('mutes when slider is set to 0', () => {
      renderVideoPlayer();
      fireEvent.change(screen.getByRole('slider'), { target: { value: '0' } });
      expect(screen.getByTitle(/unmute/i)).toBeInTheDocument();
    });
  });

  describe('metadata loading', () => {
    it('calls handleLoadMetadata with duration when metadata loads', () => {
      const handleLoadMetadata = vi.fn();
      renderVideoPlayer({ handleLoadMetadata });
      const video = document.querySelector('video')!;
      Object.defineProperty(video, 'duration', { value: 120, configurable: true });
      Object.defineProperty(video, 'videoWidth', { value: 1920, configurable: true });
      Object.defineProperty(video, 'videoHeight', { value: 1080, configurable: true });
      fireEvent.loadedMetadata(video);
      expect(handleLoadMetadata).toHaveBeenCalledWith(120);
    });

    it('displays resolution and duration after metadata loads', () => {
      renderVideoPlayer();
      const video = document.querySelector('video')!;
      Object.defineProperty(video, 'duration', { value: 60, configurable: true });
      Object.defineProperty(video, 'videoWidth', { value: 1280, configurable: true });
      Object.defineProperty(video, 'videoHeight', { value: 720, configurable: true });
      fireEvent.loadedMetadata(video);
      expect(screen.getByText(/1280x720/)).toBeInTheDocument();
      expect(screen.getByText(/60\.00s/)).toBeInTheDocument();
    });
  });

  describe('time display', () => {
    it('formats currentTime correctly', () => {
      renderVideoPlayer({ currentTime: 90 });
      expect(screen.getByText(/1:30/)).toBeInTheDocument();
    });

    it('calls handleTimeUpdate on timeupdate event', () => {
      const handleTimeUpdate = vi.fn();
      renderVideoPlayer({ handleTimeUpdate });
      fireEvent.timeUpdate(document.querySelector('video')!);
      expect(handleTimeUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe('keyboard shortcuts', () => {
    it('triggers play on Space key', () => {
      renderVideoPlayer();
      fireEvent.keyDown(window, { code: 'Space' });
      expect(window.HTMLMediaElement.prototype.play).toHaveBeenCalledTimes(1);
    });

    it('prevents default on Space to avoid page scroll', () => {
      renderVideoPlayer();
      const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true, cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      window.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
    });

    it('seeks backward 5s on ArrowLeft', () => {
      const { ref } = renderVideoPlayer({ currentTime: 10 });
      fireEvent.keyDown(window, { code: 'ArrowLeft' });
      expect(ref.current?.currentTime).toBe(5);
    });

    it('clamps seek to 0 on ArrowLeft when near start', () => {
      const { ref } = renderVideoPlayer({ currentTime: 2 });
      fireEvent.keyDown(window, { code: 'ArrowLeft' });
      expect(ref.current?.currentTime).toBe(0);
    });

    it('toggles mute on M key', () => {
      renderVideoPlayer();
      fireEvent.keyDown(window, { code: 'KeyM' });
      expect(screen.getByTitle(/unmute/i)).toBeInTheDocument();
    });
  });
});