import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import { HighlightList } from './HighlightList';
import type { Highlight } from '../../types/highlights';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const pointHighlight: Highlight = { id: 'h1', label: 'Opening Shot', time: 10 };
const rangeHighlight: Highlight = { id: 'h2', label: 'Action Sequence', time: 30, endTime: 50 };

const baseProps = {
  highlights: [] as Highlight[],
  onSeek: vi.fn(),
  onRemove: vi.fn(),
  onRename: vi.fn(),
  onLoadIntoTimeline: vi.fn(),
  onExport: vi.fn(),
  onImport: vi.fn(),
  showOnTimeline: true,
  onToggleOnTimeline: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// ─── Empty state ───────────────────────────────────────────────────────────────

describe('HighlightList — empty state', () => {
  it('shows the empty state message when expanded with no highlights', async () => {
    const user = userEvent.setup();
    render(<HighlightList {...baseProps} />);
    await user.click(screen.getByTitle('Expand'));
    expect(screen.getByText('No highlights yet')).toBeInTheDocument();
  });
});

// ─── Display ──────────────────────────────────────────────────────────────────

describe('HighlightList — display', () => {
  it('renders a point highlight with label and formatted time', () => {
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    expect(screen.getByText('Opening Shot')).toBeInTheDocument();
    expect(screen.getByText('0:10')).toBeInTheDocument();
  });

  it('renders a range highlight with start time, end time, and duration', () => {
    render(<HighlightList {...baseProps} highlights={[rangeHighlight]} />);
    expect(screen.getByText('Action Sequence')).toBeInTheDocument();
    expect(screen.getByText('0:30')).toBeInTheDocument();
    expect(screen.getByText('0:50')).toBeInTheDocument();
    expect(screen.getByText('(0:20)')).toBeInTheDocument();
  });

  it('renders multiple highlights', () => {
    render(<HighlightList {...baseProps} highlights={[pointHighlight, rangeHighlight]} />);
    expect(screen.getByText('Opening Shot')).toBeInTheDocument();
    expect(screen.getByText('Action Sequence')).toBeInTheDocument();
  });
});

// ─── Seek ─────────────────────────────────────────────────────────────────────

describe('HighlightList — seek', () => {
  it('calls onSeek with the highlight time when seek button is clicked', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} onSeek={onSeek} />);
    await user.click(screen.getByTitle('Seek to highlight'));
    expect(onSeek).toHaveBeenCalledWith(10);
  });

  it('calls onSeek with the correct time for each highlight', async () => {
    const user = userEvent.setup();
    const onSeek = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight, rangeHighlight]} onSeek={onSeek} />);
    const seekBtns = screen.getAllByTitle('Seek to highlight');
    await user.click(seekBtns[1]);
    expect(onSeek).toHaveBeenCalledWith(30);
  });
});

// ─── Delete ───────────────────────────────────────────────────────────────────

describe('HighlightList — delete', () => {
  it('calls onRemove with the highlight id when delete button is clicked', async () => {
    const user = userEvent.setup();
    const onRemove = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} onRemove={onRemove} />);
    await user.click(screen.getByTitle('Remove highlight'));
    expect(onRemove).toHaveBeenCalledWith('h1');
  });
});

// ─── Inline rename ────────────────────────────────────────────────────────────

describe('HighlightList — inline rename', () => {
  it('enters edit mode when the label is clicked', async () => {
    const user = userEvent.setup();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    await user.click(screen.getByText('Opening Shot'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('calls onRename with new label on Enter', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} onRename={onRename} />);
    await user.click(screen.getByText('Opening Shot'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New Label');
    await user.keyboard('{Enter}');
    expect(onRename).toHaveBeenCalledWith('h1', 'New Label');
  });

  it('cancels editing on Escape and does not call onRename', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} onRename={onRename} />);
    await user.click(screen.getByText('Opening Shot'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Changed');
    await user.keyboard('{Escape}');
    expect(onRename).not.toHaveBeenCalled();
    expect(screen.getByText('Opening Shot')).toBeInTheDocument();
  });

  it('commits rename on blur', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} onRename={onRename} />);
    await user.click(screen.getByText('Opening Shot'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Blurred Label');
    await user.tab();
    expect(onRename).toHaveBeenCalledWith('h1', 'Blurred Label');
  });

  it('does not call onRename when label is unchanged', async () => {
    const user = userEvent.setup();
    const onRename = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} onRename={onRename} />);
    await user.click(screen.getByText('Opening Shot'));
    await user.keyboard('{Enter}');
    expect(onRename).not.toHaveBeenCalled();
  });
});

// ─── Load into timeline ────────────────────────────────────────────────────────

describe('HighlightList — load into timeline', () => {
  it('shows load button only for range highlights', () => {
    render(<HighlightList {...baseProps} highlights={[pointHighlight, rangeHighlight]} />);
    expect(screen.getAllByTitle('Load range into timeline')).toHaveLength(1);
  });

  it('does not show load button for point highlights', () => {
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    expect(screen.queryByTitle('Load range into timeline')).not.toBeInTheDocument();
  });

  it('calls onLoadIntoTimeline with the full highlight when load button is clicked', async () => {
    const user = userEvent.setup();
    const onLoadIntoTimeline = vi.fn();
    render(<HighlightList {...baseProps} highlights={[rangeHighlight]} onLoadIntoTimeline={onLoadIntoTimeline} />);
    await user.click(screen.getByTitle('Load range into timeline'));
    expect(onLoadIntoTimeline).toHaveBeenCalledWith(rangeHighlight);
  });
});

// ─── File I/O ─────────────────────────────────────────────────────────────────

describe('HighlightList — file I/O', () => {
  it('renders the Export button', () => {
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
  });

  it('disables Export when there are no highlights', () => {
    render(<HighlightList {...baseProps} highlights={[]} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeDisabled();
  });

  it('enables Export when highlights exist', () => {
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    expect(screen.getByRole('button', { name: /export/i })).toBeEnabled();
  });

  it('calls onExport when Export is clicked', async () => {
    const user = userEvent.setup();
    const onExport = vi.fn();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} onExport={onExport} />);
    await user.click(screen.getByRole('button', { name: /export/i }));
    expect(onExport).toHaveBeenCalledOnce();
  });

  it('renders the Load file input', () => {
    render(<HighlightList {...baseProps} />);
    expect(screen.getByTestId('highlight-import-input')).toBeInTheDocument();
  });

  it('calls onImport with the selected File when a file is chosen', async () => {
    const user = userEvent.setup();
    const onImport = vi.fn();
    render(<HighlightList {...baseProps} onImport={onImport} />);
    const file = new File(['{"version":1,"highlights":[]}'], 'test.highlights.json', {
      type: 'application/json',
    });
    await user.upload(screen.getByTestId('highlight-import-input'), file);
    expect(onImport).toHaveBeenCalledWith(file);
  });
});

// ─── Collapsible ──────────────────────────────────────────────────────────────

describe('HighlightList — collapsible', () => {
  it('is collapsed by default when there are no highlights', () => {
    render(<HighlightList {...baseProps} highlights={[]} />);
    expect(screen.queryByText('No highlights yet')).not.toBeInTheDocument();
  });

  it('is expanded by default when highlights exist', () => {
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    expect(screen.getByText('Opening Shot')).toBeInTheDocument();
  });

  it('collapses when the header toggle is clicked while open', async () => {
    const user = userEvent.setup();
    render(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    await user.click(screen.getByTitle('Collapse'));
    expect(screen.queryByText('Opening Shot')).not.toBeInTheDocument();
  });

  it('expands when the header toggle is clicked while collapsed', async () => {
    const user = userEvent.setup();
    render(<HighlightList {...baseProps} highlights={[]} />);
    await user.click(screen.getByTitle('Expand'));
    expect(screen.getByText('No highlights yet')).toBeInTheDocument();
  });

  it('shows count badge when collapsed with highlights', async () => {
    const user = userEvent.setup();
    render(<HighlightList {...baseProps} highlights={[pointHighlight, rangeHighlight]} />);
    await user.click(screen.getByTitle('Collapse'));
    expect(screen.getByText('(2)')).toBeInTheDocument();
  });

  it('does not show count badge when collapsed with no highlights', () => {
    render(<HighlightList {...baseProps} highlights={[]} />);
    expect(screen.queryByText(/^\(\d+\)$/)).not.toBeInTheDocument();
  });

  it('auto-expands when highlights go from empty to non-empty', () => {
    const { rerender } = render(<HighlightList {...baseProps} highlights={[]} />);
    // collapsed with no highlights
    expect(screen.queryByText('No highlights yet')).not.toBeInTheDocument();
    // add a highlight
    rerender(<HighlightList {...baseProps} highlights={[pointHighlight]} />);
    expect(screen.getByText('Opening Shot')).toBeInTheDocument();
  });
});

// ─── Timeline toggle ──────────────────────────────────────────────────────────

describe('HighlightList — timeline toggle', () => {
  it('renders the Timeline button', () => {
    render(<HighlightList {...baseProps} />);
    expect(screen.getByRole('button', { name: /timeline/i })).toBeInTheDocument();
  });

  it('shows active styling when showOnTimeline is true', () => {
    render(<HighlightList {...baseProps} showOnTimeline={true} />);
    const btn = screen.getByTitle('Hide highlights from timeline');
    expect(btn).toBeInTheDocument();
  });

  it('shows inactive styling when showOnTimeline is false', () => {
    render(<HighlightList {...baseProps} showOnTimeline={false} />);
    const btn = screen.getByTitle('Show highlights on timeline');
    expect(btn).toBeInTheDocument();
  });

  it('calls onToggleOnTimeline when the Timeline button is clicked', async () => {
    const user = userEvent.setup();
    const onToggleOnTimeline = vi.fn();
    render(<HighlightList {...baseProps} onToggleOnTimeline={onToggleOnTimeline} />);
    await user.click(screen.getByRole('button', { name: /timeline/i }));
    expect(onToggleOnTimeline).toHaveBeenCalledOnce();
  });
});
