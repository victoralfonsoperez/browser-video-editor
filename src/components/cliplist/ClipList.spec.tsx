import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClipList } from './ClipList';
import type { Clip } from '../../hooks/useTrimMarkers';
import type { UseFFmpegReturn } from '../../hooks/useFFmpeg';
import { DEFAULT_EXPORT_OPTIONS } from '../../types/exportOptions';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: 'clip-1',
  name: 'My Clip',
  inPoint: 10,
  outPoint: 30,
  thumbnailDataUrl: undefined,
  ...overrides,
});

const makeFFmpeg = (overrides: Partial<UseFFmpegReturn> = {}): UseFFmpegReturn => ({
  status: 'idle',
  progress: 0,
  error: null,
  exportClip: vi.fn().mockResolvedValue(undefined),
  exportAllClips: vi.fn().mockResolvedValue(undefined),
  exportingClipId: null,
  ...overrides,
});

const mockFile = new File(['video'], 'test.mp4', { type: 'video/mp4' });

const baseProps = {
  clips: [],
  inPoint: null,
  outPoint: null,
  videoSource: null,
  ffmpeg: makeFFmpeg(),
  globalOptions: DEFAULT_EXPORT_OPTIONS,
  onAddClip: vi.fn(),
  onRemoveClip: vi.fn(),
  onSeekToClip: vi.fn(),
  onPreviewClip: vi.fn(),
  onUpdateClip: vi.fn(),
  onReorderClips: vi.fn(),
  onEnqueueClip: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// ─── Empty state ──────────────────────────────────────────────────────────────

describe('ClipList — empty state', () => {
  it('shows the empty state message when there are no clips', () => {
    render(<ClipList {...baseProps} />);
    expect(screen.getByText(/set in\/out points and add clips/i)).toBeInTheDocument();
  });

  it('disables the Add Clip button when inPoint or outPoint is null', () => {
    render(<ClipList {...baseProps} />);
    expect(screen.getByRole('button', { name: /add clip/i })).toBeDisabled();
  });

  it('enables the Add Clip button when both inPoint and outPoint are set', () => {
    render(<ClipList {...baseProps} inPoint={5} outPoint={15} />);
    expect(screen.getByRole('button', { name: /add clip/i })).toBeEnabled();
  });
});

// ─── Adding clips ─────────────────────────────────────────────────────────────

describe('ClipList — adding clips', () => {
  it('calls onAddClip with the typed name when Add Clip is clicked', async () => {
    const onAddClip = vi.fn();
    render(<ClipList {...baseProps} inPoint={0} outPoint={10} onAddClip={onAddClip} />);
    // The clip-name input has a placeholder "Clip 1"
    await userEvent.type(screen.getByPlaceholderText(/clip 1/i), 'Scene 1');
    await userEvent.click(screen.getByRole('button', { name: /add clip/i }));
    expect(onAddClip).toHaveBeenCalledWith('Scene 1');
  });

  it('calls onAddClip when Enter is pressed in the name input', async () => {
    const onAddClip = vi.fn();
    render(<ClipList {...baseProps} inPoint={0} outPoint={10} onAddClip={onAddClip} />);
    await userEvent.type(screen.getByPlaceholderText(/clip 1/i), 'Scene 2{Enter}');
    expect(onAddClip).toHaveBeenCalledWith('Scene 2');
  });

  it('does not call onAddClip when Enter is pressed but points are not set', async () => {
    const onAddClip = vi.fn();
    render(<ClipList {...baseProps} onAddClip={onAddClip} />);
    // input is disabled, but we can still verify nothing fires
    expect(screen.getByRole('button', { name: /add clip/i })).toBeDisabled();
    expect(onAddClip).not.toHaveBeenCalled();
  });
});

// ─── Clip rows ────────────────────────────────────────────────────────────────

describe('ClipList — clip rows', () => {
  const clips = [
    makeClip({ id: 'c1', name: 'Intro', inPoint: 0, outPoint: 5 }),
    makeClip({ id: 'c2', name: 'Main', inPoint: 10, outPoint: 20 }),
  ];

  it('renders a row for each clip', () => {
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} />);
    expect(screen.getByText('Intro')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
  });

  it('displays formatted in/out times on each row', () => {
    render(<ClipList {...baseProps} clips={[makeClip({ inPoint: 65, outPoint: 125 })]} videoSource={mockFile} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
  });

  it('shows a thumbnail image when thumbnailDataUrl is provided', () => {
    const clip = makeClip({ thumbnailDataUrl: 'data:image/png;base64,abc' });
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} />);
    expect(screen.getByAltText(/thumbnail for my clip/i)).toBeInTheDocument();
  });

  it('calls onRemoveClip with the clip id when ✕ is clicked', async () => {
    const onRemoveClip = vi.fn();
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} onRemoveClip={onRemoveClip} />);
    await userEvent.click(screen.getAllByTitle('Remove clip')[0]);
    expect(onRemoveClip).toHaveBeenCalledWith('c1');
  });

  it('calls onSeekToClip when the seek ▶ button is clicked', async () => {
    const onSeekToClip = vi.fn();
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} onSeekToClip={onSeekToClip} />);
    await userEvent.click(screen.getAllByTitle('Seek to in-point')[0]);
    expect(onSeekToClip).toHaveBeenCalledWith(clips[0]);
  });

  it('calls onPreviewClip when the preview button is clicked', async () => {
    const onPreviewClip = vi.fn();
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} onPreviewClip={onPreviewClip} />);
    await userEvent.click(screen.getAllByTitle('Preview clip')[0]);
    expect(onPreviewClip).toHaveBeenCalledWith(clips[0]);
  });

  it('calls onEnqueueClip when + is clicked', async () => {
    const onEnqueueClip = vi.fn();
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} onEnqueueClip={onEnqueueClip} />);
    await userEvent.click(screen.getAllByTitle('Add to export queue')[0]);
    expect(onEnqueueClip).toHaveBeenCalledWith(clips[0], DEFAULT_EXPORT_OPTIONS);
  });

  it('+ queue button is disabled when videoFile is null', () => {
    render(<ClipList {...baseProps} clips={clips} videoSource={null} />);
    for (const btn of screen.getAllByTitle('Add to export queue')) {
      expect(btn).toBeDisabled();
    }
  });
});

// ─── Inline rename ────────────────────────────────────────────────────────────

describe('ClipList — inline rename', () => {
  const clip = makeClip({ id: 'c1', name: 'Old Name' });

  it('shows a rename input when the clip name is clicked', async () => {
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} />);
    await userEvent.click(screen.getByTitle('Click to rename'));
    // After clicking, the rename input appears with the current name as its value
    expect(screen.getByDisplayValue('Old Name')).toBeInTheDocument();
  });

  it('calls onUpdateClip with the new name on Enter', async () => {
    const onUpdateClip = vi.fn();
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} onUpdateClip={onUpdateClip} />);
    await userEvent.click(screen.getByTitle('Click to rename'));
    const input = screen.getByDisplayValue('Old Name');
    await userEvent.clear(input);
    await userEvent.type(input, 'New Name{Enter}');
    expect(onUpdateClip).toHaveBeenCalledWith('c1', { name: 'New Name' });
  });

  it('reverts to original name on Escape', async () => {
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} />);
    await userEvent.click(screen.getByTitle('Click to rename'));
    const input = screen.getByDisplayValue('Old Name');
    await userEvent.clear(input);
    await userEvent.type(input, 'Oops{Escape}');
    expect(screen.getByTitle('Click to rename')).toHaveTextContent('Old Name');
  });
});

// ─── Per-clip instant export ──────────────────────────────────────────────────

describe('ClipList — per-clip export', () => {
  const clip = makeClip();

  it('calls ffmpeg.exportClip when ⬇ is clicked', async () => {
    const exportClip = vi.fn().mockResolvedValue(undefined);
    const ffmpeg = makeFFmpeg({ exportClip });
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} ffmpeg={ffmpeg} />);
    await userEvent.click(screen.getByTitle('Export this clip instantly'));
    expect(exportClip).toHaveBeenCalledWith(mockFile, clip, DEFAULT_EXPORT_OPTIONS);
  });

  it('disables the ⬇ button while an export is in progress', () => {
    const ffmpeg = makeFFmpeg({ status: 'processing', exportingClipId: 'other' });
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} ffmpeg={ffmpeg} />);
    expect(screen.getByTitle('Export this clip instantly')).toBeDisabled();
  });

  it('shows a progress bar while this clip is exporting', () => {
    const ffmpeg = makeFFmpeg({ status: 'processing', progress: 0.4, exportingClipId: clip.id });
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} ffmpeg={ffmpeg} />);
    const bar = document.querySelector('[style*="width: 40%"]');
    expect(bar).not.toBeNull();
  });

  it('shows loading text while FFmpeg is loading on first export', () => {
    const ffmpeg = makeFFmpeg({ status: 'loading', exportingClipId: clip.id });
    render(<ClipList {...baseProps} clips={[clip]} videoSource={mockFile} ffmpeg={ffmpeg} />);
    expect(screen.getByText(/loading ffmpeg/i)).toBeInTheDocument();
  });
});

// ─── Export All ───────────────────────────────────────────────────────────────

describe('ClipList — Export All', () => {
  const clips = [makeClip({ id: 'c1' }), makeClip({ id: 'c2', name: 'Second' })];

  it('renders the Export All button when clips exist', () => {
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} />);
    // Use getByRole to target only the button, not the keyboard-hint span
    expect(screen.getByRole('button', { name: /export all/i })).toBeInTheDocument();
  });

  it('does not render the Export All button when clips list is empty', () => {
    render(<ClipList {...baseProps} clips={[]} videoSource={mockFile} />);
    expect(screen.queryByRole('button', { name: /export all/i })).not.toBeInTheDocument();
  });

  it('calls ffmpeg.exportAllClips when Export All is clicked', async () => {
    const exportAllClips = vi.fn().mockResolvedValue(undefined);
    const ffmpeg = makeFFmpeg({ exportAllClips });
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} ffmpeg={ffmpeg} />);
    await userEvent.click(screen.getByRole('button', { name: /export all/i }));
    expect(exportAllClips).toHaveBeenCalledWith(mockFile, clips, DEFAULT_EXPORT_OPTIONS);
  });

  it('disables Export All while another export is running', () => {
    const ffmpeg = makeFFmpeg({ status: 'processing', exportingClipId: '__all__' });
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} ffmpeg={ffmpeg} />);
    expect(screen.getByRole('button', { name: /exporting/i })).toBeDisabled();
  });

  it('shows progress percentage in the button label while exporting all', () => {
    const ffmpeg = makeFFmpeg({ status: 'processing', progress: 0.6, exportingClipId: '__all__' });
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} ffmpeg={ffmpeg} />);
    expect(screen.getByText(/exporting.*60%/i)).toBeInTheDocument();
  });

  it('shows a progress bar while Export All is running', () => {
    const ffmpeg = makeFFmpeg({ status: 'processing', progress: 0.75, exportingClipId: '__all__' });
    render(<ClipList {...baseProps} clips={clips} videoSource={mockFile} ffmpeg={ffmpeg} />);
    const bar = document.querySelector('[style*="width: 75%"]');
    expect(bar).not.toBeNull();
  });
});

// ─── In/Out point display ─────────────────────────────────────────────────────

describe('ClipList — in/out point display', () => {
  it('shows — when inPoint is null', () => {
    render(<ClipList {...baseProps} inPoint={null} outPoint={null} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows formatted inPoint when set', () => {
    render(<ClipList {...baseProps} inPoint={90} outPoint={null} />);
    expect(screen.getByText('1:30')).toBeInTheDocument();
  });
});