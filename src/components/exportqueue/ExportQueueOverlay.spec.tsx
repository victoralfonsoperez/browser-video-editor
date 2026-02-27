import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExportQueueOverlay } from './ExportQueueOverlay';
import type { QueueItem } from '../../hooks/useExportQueue';
import { DEFAULT_EXPORT_OPTIONS } from '../../types/exportOptions';
import type { Clip } from '../../hooks/useTrimMarkers';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const makeClip = (overrides: Partial<Clip> = {}): Clip => ({
  id: 'clip-1',
  name: 'My Clip',
  inPoint: 0,
  outPoint: 10,
  thumbnailDataUrl: undefined,
  ...overrides,
});

const makeItem = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  queueId: 'q1',
  clip: makeClip(),
  options: DEFAULT_EXPORT_OPTIONS,
  status: 'pending',
  ...overrides,
});

const baseProps = {
  queue: [],
  isRunning: false,
  isStarted: false,
  ffmpegProgress: 0,
  onStart: vi.fn(),
  onPause: vi.fn(),
  onRemove: vi.fn(),
  onReorder: vi.fn(),
  onClear: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

// ─── Empty queue ──────────────────────────────────────────────────────────────

describe('ExportQueueOverlay — empty queue', () => {
  it('renders nothing when the queue is empty', () => {
    const { container } = render(<ExportQueueOverlay {...baseProps} />);
    expect(container).toBeEmptyDOMElement();
  });
});

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('ExportQueueOverlay — rendering', () => {
  const pendingItem = makeItem({ queueId: 'q1', clip: makeClip({ name: 'Intro' }) });

  it('shows the Export Queue heading', () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} />);
    expect(screen.getByText(/export queue/i)).toBeInTheDocument();
  });

  it('shows the done/total counter', () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} />);
    expect(screen.getByText('0/1')).toBeInTheDocument();
  });

  it('renders the clip name for a pending item', () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} />);
    expect(screen.getByText('Intro')).toBeInTheDocument();
  });

  it('shows formatted in/out times for pending items', () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} />);
    // inPoint=0 → 0:00, outPoint=10 → 0:10
    expect(screen.getByText(/0:00.*0:10/)).toBeInTheDocument();
  });

  it('shows the options badge with format and quality', () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} />);
    // DEFAULT_EXPORT_OPTIONS: mp4 / high → "MP4 · High"
    expect(screen.getByText(/MP4 · High/)).toBeInTheDocument();
  });
});

// ─── Header controls ──────────────────────────────────────────────────────────

describe('ExportQueueOverlay — header controls', () => {
  const pendingItem = makeItem();

  it('shows the Start button when not started and there are pending items', () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} isStarted={false} />);
    expect(screen.getByTitle(/start processing/i)).toBeInTheDocument();
  });

  it('calls onStart when the Start button is clicked', async () => {
    const onStart = vi.fn();
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} onStart={onStart} />);
    await userEvent.click(screen.getByTitle(/start processing/i));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('shows the Pause button when isStarted is true', () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} isStarted />);
    expect(screen.getByTitle(/pause/i)).toBeInTheDocument();
  });

  it('calls onPause when the Pause button is clicked', async () => {
    const onPause = vi.fn();
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} isStarted onPause={onPause} />);
    await userEvent.click(screen.getByTitle(/pause/i));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('shows the Clear button when there are done items and not running', () => {
    const doneItem = makeItem({ queueId: 'q2', status: 'done' });
    render(<ExportQueueOverlay {...baseProps} queue={[doneItem]} isRunning={false} />);
    expect(screen.getByTitle(/clear/i)).toBeInTheDocument();
  });

  it('calls onClear when the Clear button is clicked', async () => {
    const onClear = vi.fn();
    const doneItem = makeItem({ queueId: 'q2', status: 'done' });
    render(<ExportQueueOverlay {...baseProps} queue={[doneItem]} onClear={onClear} />);
    await userEvent.click(screen.getByTitle(/clear/i));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('toggles to collapsed state when the collapse button is clicked', async () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} />);
    const collapseBtn = screen.getByTitle(/collapse/i);
    await userEvent.click(collapseBtn);
    expect(screen.getByTitle(/expand/i)).toBeInTheDocument();
  });

  it('toggles back to expanded state on a second click', async () => {
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} />);
    await userEvent.click(screen.getByTitle(/collapse/i));
    await userEvent.click(screen.getByTitle(/expand/i));
    expect(screen.getByTitle(/collapse/i)).toBeInTheDocument();
  });
});

// ─── Item statuses ────────────────────────────────────────────────────────────

describe('ExportQueueOverlay — item statuses', () => {
  it('shows ✓ icon for a done item', () => {
    const doneItem = makeItem({ status: 'done' });
    render(<ExportQueueOverlay {...baseProps} queue={[doneItem]} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('shows ✕ icon for an error item', () => {
    const errorItem = makeItem({ status: 'error' });
    render(<ExportQueueOverlay {...baseProps} queue={[errorItem]} />);
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('appends the error message to the clip name for error items', () => {
    const errorItem = makeItem({ status: 'error', error: 'encode failed' });
    render(<ExportQueueOverlay {...baseProps} queue={[errorItem]} />);
    expect(screen.getByText(/encode failed/i)).toBeInTheDocument();
  });

  it('shows the processing percentage while processing', () => {
    const processingItem = makeItem({ status: 'processing' });
    // isRunning=false so the overall progress bar is hidden, avoiding duplicate text
    render(<ExportQueueOverlay {...baseProps} queue={[processingItem]} isRunning={false} ffmpegProgress={0.6} />);
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('calls onRemove with the queueId when the remove button is clicked', async () => {
    const onRemove = vi.fn();
    const pendingItem = makeItem({ queueId: 'q-remove' });
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} onRemove={onRemove} />);
    await userEvent.click(screen.getByTitle(/remove from queue/i));
    expect(onRemove).toHaveBeenCalledWith('q-remove');
  });
});

// ─── Overall progress ─────────────────────────────────────────────────────────

describe('ExportQueueOverlay — overall progress', () => {
  it('shows the overall progress section when running', () => {
    const processingItem = makeItem({ status: 'processing' });
    render(<ExportQueueOverlay {...baseProps} queue={[processingItem]} isRunning ffmpegProgress={0.5} />);
    expect(screen.getByText(/^overall$/i)).toBeInTheDocument();
  });

  it('does not show the overall progress section when not running', () => {
    const pendingItem = makeItem();
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} isRunning={false} />);
    expect(screen.queryByText(/^overall$/i)).not.toBeInTheDocument();
  });
});

// ─── Collapsed summary ────────────────────────────────────────────────────────

describe('ExportQueueOverlay — collapsed summary', () => {
  it('shows pending count in collapsed summary when not started', async () => {
    const pendingItem = makeItem();
    render(<ExportQueueOverlay {...baseProps} queue={[pendingItem]} isStarted={false} />);
    await userEvent.click(screen.getByTitle(/collapse/i));
    expect(screen.getByText(/1 pending/i)).toBeInTheDocument();
  });

  it('shows All done in collapsed summary when all items are finished', async () => {
    const doneItem = makeItem({ status: 'done' });
    render(<ExportQueueOverlay {...baseProps} queue={[doneItem]} />);
    await userEvent.click(screen.getByTitle(/collapse/i));
    expect(screen.getByText(/all done/i)).toBeInTheDocument();
  });
});
