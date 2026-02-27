import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportOptionsPanel } from './ExportOptionsPanel';
import { DEFAULT_EXPORT_OPTIONS } from '../../types/exportOptions';
import type { ExportOptions } from '../../types/exportOptions';

const baseProps = {
  options: DEFAULT_EXPORT_OPTIONS,
  onChange: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ExportOptionsPanel — rendering', () => {
  it('renders format, quality and resolution group labels', () => {
    render(<ExportOptionsPanel {...baseProps} />);
    expect(screen.getByText(/^format$/i)).toBeInTheDocument();
    expect(screen.getByText(/^quality$/i)).toBeInTheDocument();
    expect(screen.getByText(/^resolution$/i)).toBeInTheDocument();
  });

  it('renders all four format buttons', () => {
    render(<ExportOptionsPanel {...baseProps} />);
    expect(screen.getByRole('button', { name: 'MP4' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'WebM' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'MOV' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'GIF' })).toBeInTheDocument();
  });

  it('renders all three quality buttons', () => {
    render(<ExportOptionsPanel {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Low' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Medium' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'High' })).toBeInTheDocument();
  });

  it('renders all four resolution buttons', () => {
    render(<ExportOptionsPanel {...baseProps} />);
    expect(screen.getByRole('button', { name: 'Original' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '1080p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '720p' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '480p' })).toBeInTheDocument();
  });

  it('does not show GIF warning when format is not gif', () => {
    render(<ExportOptionsPanel {...baseProps} />);
    expect(screen.queryByText(/gif has no audio/i)).not.toBeInTheDocument();
  });

  it('shows GIF warning message when format is gif', () => {
    const options: ExportOptions = { ...DEFAULT_EXPORT_OPTIONS, format: 'gif' };
    render(<ExportOptionsPanel {...baseProps} options={options} />);
    expect(screen.getByText(/gif has no audio/i)).toBeInTheDocument();
  });
});

// ─── Format changes ───────────────────────────────────────────────────────────

describe('ExportOptionsPanel — format selection', () => {
  it('calls onChange with webm format when WebM is clicked', async () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel {...baseProps} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'WebM' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_EXPORT_OPTIONS, format: 'webm' });
  });

  it('calls onChange with gif format when GIF is clicked', async () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel {...baseProps} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'GIF' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_EXPORT_OPTIONS, format: 'gif' });
  });
});

// ─── Quality changes ──────────────────────────────────────────────────────────

describe('ExportOptionsPanel — quality selection', () => {
  it('calls onChange with low quality when Low is clicked', async () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel {...baseProps} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Low' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_EXPORT_OPTIONS, quality: 'low' });
  });

  it('calls onChange with medium quality when Medium is clicked', async () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel {...baseProps} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Medium' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_EXPORT_OPTIONS, quality: 'medium' });
  });
});

// ─── Resolution changes ───────────────────────────────────────────────────────

describe('ExportOptionsPanel — resolution selection', () => {
  it('calls onChange with 720p resolution when 720p is clicked', async () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel {...baseProps} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '720p' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_EXPORT_OPTIONS, resolution: '720p' });
  });

  it('calls onChange with 1080p resolution when 1080p is clicked', async () => {
    const onChange = vi.fn();
    render(<ExportOptionsPanel {...baseProps} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: '1080p' }));
    expect(onChange).toHaveBeenCalledWith({ ...DEFAULT_EXPORT_OPTIONS, resolution: '1080p' });
  });
});
