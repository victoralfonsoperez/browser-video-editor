import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClipPreviewModal } from './ClipPreviewModal';
import type { Clip } from '../../hooks/useTrimMarkers';

// ─── Video element mock ───────────────────────────────────────────────────────
// jsdom doesn't implement HTMLMediaElement — stub the bits we need
beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, 'play', {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
  Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
    configurable: true,
    value: vi.fn(),
  });
  // readyState >= 1 so the seek-on-open effect fires immediately
  Object.defineProperty(HTMLMediaElement.prototype, 'readyState', {
    configurable: true,
    get: () => 1,
  });
});

// Helper: get the single <video> element (has no ARIA role in jsdom)
const getVideo = () => document.querySelector('video') as HTMLVideoElement;

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: 'clip-1',
  name: 'My Clip',
  inPoint: 10,
  outPoint: 30,
  thumbnailDataUrl: undefined,
  ...overrides,
});

const VIDEO_URL = 'blob:http://localhost/fake-video';

const baseProps = {
  clip: makeClip(),
  videoURL: VIDEO_URL,
  onClose: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ClipPreviewModal — rendering', () => {
  it('renders the clip name in the header', () => {
    render(<ClipPreviewModal {...baseProps} />);
    expect(screen.getByText('My Clip')).toBeInTheDocument();
  });

  it('renders formatted in/out times', () => {
    render(<ClipPreviewModal {...baseProps} clip={makeClip({ inPoint: 65, outPoint: 125 })} />);
    expect(screen.getByText(/1:05.*2:05/)).toBeInTheDocument();
  });

  it('renders the duration in the header parentheses', () => {
    // inPoint 10, outPoint 30 → duration 0:20, shown as "(0:20)" in header
    render(<ClipPreviewModal {...baseProps} />);
    // Target specifically the span that wraps the parenthesised duration
    const durationSpan = document.querySelector('.ml-2.text-\\[\\#444\\]');
    expect(durationSpan?.textContent).toMatch(/0:20/);
  });

  it('renders the video element with the correct src', () => {
    render(<ClipPreviewModal {...baseProps} />);
    expect(getVideo().src).toBe(VIDEO_URL);
  });

  it('renders a thumbnail image when thumbnailDataUrl is set', () => {
    const clip = makeClip({ thumbnailDataUrl: 'data:image/png;base64,abc' });
    render(<ClipPreviewModal {...baseProps} clip={clip} />);
    // The thumbnail has alt="" (presentation role) — query by src instead
    const img = document.querySelector('img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toBe('data:image/png;base64,abc');
  });

  it('does not render a thumbnail when thumbnailDataUrl is undefined', () => {
    render(<ClipPreviewModal {...baseProps} />);
    expect(document.querySelector('img')).toBeNull();
  });

  it('shows the Play button initially', () => {
    render(<ClipPreviewModal {...baseProps} />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('renders the Loop checkbox', () => {
    render(<ClipPreviewModal {...baseProps} />);
    expect(screen.getByRole('checkbox', { name: /loop/i })).toBeInTheDocument();
  });

  it('renders keyboard hint text', () => {
    render(<ClipPreviewModal {...baseProps} />);
    expect(screen.getByText(/space/i)).toBeInTheDocument();
    expect(screen.getByText(/esc/i)).toBeInTheDocument();
  });
});

// ─── Close behaviour ──────────────────────────────────────────────────────────

describe('ClipPreviewModal — closing', () => {
  it('calls onClose when the ✕ button is clicked', async () => {
    const onClose = vi.fn();
    render(<ClipPreviewModal {...baseProps} onClose={onClose} />);
    await userEvent.click(screen.getByTitle(/close/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked', async () => {
    const onClose = vi.fn();
    render(<ClipPreviewModal {...baseProps} onClose={onClose} />);
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    await userEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<ClipPreviewModal {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onClose when clicking inside the modal panel', async () => {
    const onClose = vi.fn();
    render(<ClipPreviewModal {...baseProps} onClose={onClose} />);
    await userEvent.click(screen.getByText('My Clip'));
    expect(onClose).not.toHaveBeenCalled();
  });
});

// ─── Playback controls ────────────────────────────────────────────────────────

describe('ClipPreviewModal — playback controls', () => {
  it('calls video.play() when Play is clicked', async () => {
    render(<ClipPreviewModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(getVideo().play).toHaveBeenCalled();
  });

  it('shows Pause button after play event fires on the video', () => {
    render(<ClipPreviewModal {...baseProps} />);
    fireEvent.play(getVideo());
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument();
  });

  it('shows Play button after pause event fires on the video', () => {
    render(<ClipPreviewModal {...baseProps} />);
    fireEvent.play(getVideo());
    fireEvent.pause(getVideo());
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('toggles play/pause with Space key', () => {
    render(<ClipPreviewModal {...baseProps} />);
    fireEvent.keyDown(window, { key: ' ', code: 'Space' });
    expect(getVideo().play).toHaveBeenCalled();
  });

  it('loops checkbox is unchecked by default', () => {
    render(<ClipPreviewModal {...baseProps} />);
    expect(screen.getByRole('checkbox', { name: /loop/i })).not.toBeChecked();
  });

  it('toggles the loop checkbox when clicked', async () => {
    render(<ClipPreviewModal {...baseProps} />);
    const checkbox = screen.getByRole('checkbox', { name: /loop/i });
    await userEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });
});

// ─── Progress bar ─────────────────────────────────────────────────────────────

describe('ClipPreviewModal — progress bar', () => {
  it('starts at 0% width', () => {
    render(<ClipPreviewModal {...baseProps} />);
    const bar = document.querySelector('.h-1 > div') as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('updates progress as timeupdate fires', () => {
    render(<ClipPreviewModal {...baseProps} clip={makeClip({ inPoint: 0, outPoint: 100 })} />);
    const video = getVideo();
    act(() => {
      Object.defineProperty(video, 'currentTime', { configurable: true, value: 50 });
      fireEvent.timeUpdate(video);
    });
    const bar = document.querySelector('.h-1 > div') as HTMLElement;
    expect(bar.style.width).toBe('50%');
  });
});

// ─── Seek on open ─────────────────────────────────────────────────────────────

describe('ClipPreviewModal — seek on open', () => {
  it('sets video.currentTime to clip.inPoint on mount when readyState >= 1', () => {
    render(<ClipPreviewModal {...baseProps} clip={makeClip({ inPoint: 15, outPoint: 40 })} />);
    expect(getVideo().currentTime).toBe(15);
  });
});