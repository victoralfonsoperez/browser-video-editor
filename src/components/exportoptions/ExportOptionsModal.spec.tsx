import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportOptionsModal } from './ExportOptionsModal';
import { DEFAULT_EXPORT_OPTIONS } from '../../types/exportOptions';
import type { Clip } from '../../hooks/useTrimMarkers';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: 'clip-1',
  name: 'Test Clip',
  inPoint: 10,
  outPoint: 30,
  thumbnailDataUrl: undefined,
  ...overrides,
});

const baseProps = {
  clip: makeClip(),
  defaultOptions: DEFAULT_EXPORT_OPTIONS,
  onConfirm: vi.fn(),
  onCancel: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ExportOptionsModal — rendering', () => {
  it('renders the clip name in the header', () => {
    render(<ExportOptionsModal {...baseProps} />);
    expect(screen.getByText('Test Clip')).toBeInTheDocument();
  });

  it('renders formatted in/out times in the header', () => {
    render(<ExportOptionsModal {...baseProps} />);
    // inPoint=10 → 0:10, outPoint=30 → 0:30
    expect(screen.getByText(/0:10.*0:30/)).toBeInTheDocument();
  });

  it('renders format, quality and resolution buttons', () => {
    render(<ExportOptionsModal {...baseProps} />);
    expect(screen.getByRole('button', { name: 'MP4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
  });

  it('renders Cancel and Add to Queue footer buttons', () => {
    render(<ExportOptionsModal {...baseProps} />);
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add to queue/i })).toBeInTheDocument();
  });

  it('does not show GIF warning initially', () => {
    render(<ExportOptionsModal {...baseProps} />);
    expect(screen.queryByText(/gif exports have no audio/i)).not.toBeInTheDocument();
  });

  it('shows quality description for the initial quality (high)', () => {
    render(<ExportOptionsModal {...baseProps} />);
    expect(screen.getByText(/best visual quality/i)).toBeInTheDocument();
  });

  it('does not show scale note when resolution is original', () => {
    render(<ExportOptionsModal {...baseProps} />);
    expect(screen.queryByText(/aspect ratio/i)).not.toBeInTheDocument();
  });
});

// ─── GIF warning ──────────────────────────────────────────────────────────────

describe('ExportOptionsModal — GIF warning', () => {
  it('shows GIF warning box when GIF format is selected', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    expect(screen.getByText(/gif exports have no audio/i)).toBeInTheDocument();
  });

  it('disables Add to Queue when GIF is selected but warning not acknowledged', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    expect(screen.getByRole('button', { name: /add to queue/i })).toBeDisabled();
  });

  it('shows the acknowledge button when GIF warning is visible', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    expect(screen.getByRole('button', { name: /got it/i })).toBeInTheDocument();
  });

  it('enables Add to Queue after acknowledging the GIF warning', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(screen.getByRole('button', { name: /add to queue/i })).toBeEnabled();
  });

  it('resets acknowledgement when switching back to GIF after choosing another format', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    await userEvent.click(screen.getByRole('button', { name: /got it/i }));
    // Switch away and back to GIF
    await userEvent.click(screen.getByRole('button', { name: 'MP4' }));
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    expect(screen.getByRole('button', { name: /add to queue/i })).toBeDisabled();
  });
});

// ─── Quality descriptions ─────────────────────────────────────────────────────

describe('ExportOptionsModal — quality descriptions', () => {
  it('shows balanced quality description when Medium is selected', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'Medium' }));
    expect(screen.getByText(/balanced quality/i)).toBeInTheDocument();
  });

  it('shows smallest file size description when Low is selected', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: 'Low' }));
    expect(screen.getByText(/smallest file size/i)).toBeInTheDocument();
  });
});

// ─── Resolution scale note ────────────────────────────────────────────────────

describe('ExportOptionsModal — resolution scale note', () => {
  it('shows the scale note when a non-original resolution is selected', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: '720p' }));
    expect(screen.getByText(/aspect ratio/i)).toBeInTheDocument();
  });

  it('hides the scale note after switching back to Original', async () => {
    render(<ExportOptionsModal {...baseProps} />);
    await userEvent.click(screen.getByRole('button', { name: '720p' }));
    await userEvent.click(screen.getByRole('button', { name: 'Original' }));
    expect(screen.queryByText(/aspect ratio/i)).not.toBeInTheDocument();
  });
});

// ─── Confirm / cancel ─────────────────────────────────────────────────────────

describe('ExportOptionsModal — confirm and cancel', () => {
  it('calls onConfirm with clip and default options when Add to Queue is clicked', async () => {
    const onConfirm = vi.fn();
    render(<ExportOptionsModal {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: /add to queue/i }));
    expect(onConfirm).toHaveBeenCalledWith(baseProps.clip, DEFAULT_EXPORT_OPTIONS);
  });

  it('calls onConfirm with updated options after changing format', async () => {
    const onConfirm = vi.fn();
    render(<ExportOptionsModal {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'WebM' }));
    await userEvent.click(screen.getByRole('button', { name: /add to queue/i }));
    expect(onConfirm).toHaveBeenCalledWith(baseProps.clip, { ...DEFAULT_EXPORT_OPTIONS, format: 'webm' });
  });

  it('does not call onConfirm when GIF is selected but not acknowledged', async () => {
    const onConfirm = vi.fn();
    render(<ExportOptionsModal {...baseProps} onConfirm={onConfirm} />);
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    // button is disabled — confirm should not be called
    expect(screen.getByRole('button', { name: /add to queue/i })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn();
    render(<ExportOptionsModal {...baseProps} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when the backdrop is clicked', async () => {
    const onCancel = vi.fn();
    render(<ExportOptionsModal {...baseProps} onCancel={onCancel} />);
    const backdrop = document.querySelector('.fixed.inset-0') as HTMLElement;
    await userEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
