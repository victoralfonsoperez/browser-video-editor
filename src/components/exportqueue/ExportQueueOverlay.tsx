import { useState } from 'react';
import { SharedStrings, ExportQueueStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import type { QueueItem } from '../../hooks/useExportQueue';
import { FORMAT_LABELS, QUALITY_LABELS } from '../../types/exportOptions';
import { ProgressBar } from '../shared/ProgressBar';
import { IconRefresh } from '../shared/Icons';

interface ExportQueueOverlayProps {
  queue: QueueItem[];
  isRunning: boolean;
  isStarted: boolean;
  ffmpegProgress: number;
  onStart: () => void;
  onPause: () => void;
  onRemove: (queueId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClear: () => void;
  onRetry: (queueId: string) => void;
}

function StatusIcon({ status }: { status: QueueItem['status'] }) {
  if (status === 'processing') return <span className="animate-spin inline-block leading-none"><IconRefresh /></span>;
  if (status === 'done') return <span className="text-accent">✓</span>;
  if (status === 'error') return <span className="text-danger">✕</span>;
  return <span className="text-fg-muted">–</span>;
}

export function ExportQueueOverlay({
  queue,
  isRunning,
  isStarted,
  ffmpegProgress,
  onStart,
  onPause,
  onRemove,
  onReorder,
  onClear,
  onRetry,
}: ExportQueueOverlayProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState<number | null>(null);
  const [dragSide, setDragSide] = useState<'top' | 'bottom' | null>(null);

  const pendingCount = queue.filter((i) => i.status === 'pending').length;
  const doneCount = queue.filter((i) => i.status === 'done' || i.status === 'error').length;
  const totalCount = queue.length;

  if (totalCount === 0) return null;

  const allFinished = doneCount === totalCount;

  const overallProgress = totalCount > 0
    ? (doneCount + (isRunning ? ffmpegProgress : 0)) / totalCount
    : 0;

  const handleDrop = (targetIndex: number) => {
    if (dragFrom === null) return;
    let to = dragSide === 'bottom' ? targetIndex + 1 : targetIndex;
    if (to > dragFrom) to -= 1;
    onReorder(dragFrom, to);
    setDragFrom(null);
    setDragOver(null);
    setDragSide(null);
  };

  return (
    <div className="fixed bottom-2 tablet:bottom-4 right-2 tablet:right-4 left-2 tablet:left-auto z-50 w-auto tablet:w-72 max-w-full tablet:max-w-none rounded-lg border border-edge-mid bg-base shadow-xl shadow-black/60 overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between px-2 tablet:px-3 py-2 bg-raised border-b border-control">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="animate-spin inline-block text-accent text-xs tablet:text-sm leading-none"><IconRefresh /></span>
          )}
          <span className="text-2xs tablet:text-xs uppercase tracking-wider text-fg-2 font-medium">
            {ExportQueueStrings.heading}
          </span>
          <span className="text-2xs text-fg-muted font-mono">
            {doneCount}/{totalCount}
          </span>
        </div>

        <div className="flex items-center gap-0.5 tablet:gap-1">
          {!allFinished && (
            isStarted ? (
              <button
                onClick={onPause}
                disabled={isRunning}
                className="min-h-[44px] tablet:min-h-0 rounded px-2 py-0.5 text-2xs font-medium text-warn border border-warn/30 hover:bg-warn/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title={ExportQueueStrings.titlePause}
              >
                {ExportQueueStrings.btnPause}
              </button>
            ) : (
              <button
                onClick={onStart}
                className="min-h-[44px] tablet:min-h-0 rounded px-2 py-0.5 text-2xs font-medium text-accent border border-accent/30 hover:bg-accent/10 transition-colors cursor-pointer"
                title={ExportQueueStrings.titleStart}
              >
                {pendingCount > 0 ? ExportQueueStrings.btnStart : ExportQueueStrings.btnResume}
              </button>
            )
          )}

          {doneCount > 0 && !isRunning && (
            <button
              onClick={onClear}
              className="min-h-[44px] tablet:min-h-0 rounded px-1.5 py-0.5 text-2xs text-fg-muted hover:text-danger hover:bg-control transition-colors cursor-pointer"
              title={ExportQueueStrings.titleClear}
            >
              {SharedStrings.btnClear}
            </button>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1.5 py-0.5 text-2xs text-fg-muted hover:text-fg-1 hover:bg-control transition-colors cursor-pointer w-5 tablet:w-5"
            title={collapsed ? ExportQueueStrings.titleExpand : ExportQueueStrings.titleCollapse}
            aria-expanded={!collapsed}
            aria-label={collapsed ? ExportQueueStrings.titleExpand : ExportQueueStrings.titleCollapse}
          >
            {collapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Item list */}
      {!collapsed && (
        <div className="max-h-48 tablet:max-h-64 overflow-y-auto">
          {queue.map((item, i) => {
            const isPending = item.status === 'pending';
            const isProcessing = item.status === 'processing';
            const isFinished = item.status === 'done' || item.status === 'error';
            const isDragTarget = dragOver === i;
            const optionsBadge = `${FORMAT_LABELS[item.options.format]} · ${QUALITY_LABELS[item.options.quality]}`;

            if (isFinished) {
              return (
                <div
                  key={item.queueId}
                  className="flex items-center gap-1.5 tablet:gap-2 px-2 tablet:px-3 py-1.5 border-b border-edge-subtle last:border-0"
                >
                  <span className="text-2xs tablet:text-xs w-3 tablet:w-4 text-center shrink-0">
                    <StatusIcon status={item.status} />
                  </span>
                  <span className={`flex-1 text-2xs tablet:text-xs truncate ${item.status === 'error' ? 'text-danger' : 'text-fg-muted'}`}>
                    {item.clip.name}
                    {item.status === 'error' && item.error ? ` — ${item.error}` : ''}
                  </span>
                  <span className="text-2xs text-fg-muted shrink-0 hidden mobile-landscape:inline">{optionsBadge}</span>
                  {item.status === 'error' && (
                    <button
                      onClick={() => onRetry(item.queueId)}
                      title={ExportQueueStrings.titleRetry}
                      className="rounded border border-warn/30 px-1.5 py-0.5 text-2xs text-warn hover:bg-warn/10 transition-colors cursor-pointer shrink-0"
                    >
                      {ExportQueueStrings.btnRetry}
                    </button>
                  )}
                </div>
              );
            }

            return (
              <div
                key={item.queueId}
                draggable={isPending}
                onDragStart={() => isPending && setDragFrom(i)}
                onDragOver={(e) => {
                  if (!isPending) return;
                  e.preventDefault();
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDragOver(i);
                  setDragSide(e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom');
                }}
                onDragEnd={() => { setDragFrom(null); setDragOver(null); setDragSide(null); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(i); }}
                className={[
                  'relative flex flex-col px-3 py-2 border-b border-edge-subtle last:border-0 group transition-colors',
                  isPending ? 'hover:bg-raised cursor-grab active:cursor-grabbing' : '',
                  isDragTarget ? 'bg-accent/5' : '',
                ].join(' ')}
              >
                {isDragTarget && dragSide === 'top' && (
                  <div className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}
                {isDragTarget && dragSide === 'bottom' && (
                  <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-0.5 bg-accent rounded-full" />
                )}

                <div className="flex items-center gap-1.5 tablet:gap-2">
                  <span className="text-2xs tablet:text-xs w-3 tablet:w-4 text-center shrink-0">
                    <StatusIcon status={item.status} />
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-2xs tablet:text-xs text-fg-1 truncate">{item.clip.name}</p>
                    {isPending && (
                      <p className="text-2xs text-fg-muted hidden mobile-landscape:block">
                        {formatTime(item.clip.inPoint)} → {formatTime(item.clip.outPoint)}
                      </p>
                    )}
                    {isProcessing && (
                      <p className="text-2xs text-fg-2 font-mono">
                        {Math.round(ffmpegProgress * 100)}%
                      </p>
                    )}
                  </div>

                  {/* Options badge */}
                  <span className="text-2xs text-fg-muted shrink-0 hidden mobile-landscape:inline">{optionsBadge}</span>

                  {isPending && (
                    <div className="flex items-center gap-0.5 opacity-100 tablet:opacity-0 tablet:group-hover:opacity-100 tablet:focus-within:opacity-100 transition-opacity shrink-0">
                      <span className="hidden tablet:flex flex-col">
                        {i > 0 && queue[i - 1].status === 'pending' && (
                          <button onClick={() => onReorder(i, i - 1)} className="rounded px-0.5 text-2xs text-fg-muted hover:text-fg-1 hover:bg-control transition-colors cursor-pointer leading-tight" title="Move up" aria-label="Move item up">▲</button>
                        )}
                        {i < queue.length - 1 && queue[i + 1]?.status === 'pending' && (
                          <button onClick={() => onReorder(i, i + 1)} className="rounded px-0.5 text-2xs text-fg-muted hover:text-fg-1 hover:bg-control transition-colors cursor-pointer leading-tight" title="Move down" aria-label="Move item down">▼</button>
                        )}
                      </span>
                      <button
                        onClick={() => onRemove(item.queueId)}
                        className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 py-0.5 text-2xs text-fg-muted hover:text-danger hover:bg-control shrink-0 cursor-pointer"
                        title={ExportQueueStrings.titleRemove}
                        aria-label={ExportQueueStrings.titleRemove}
                      >
                        {SharedStrings.btnClose}
                      </button>
                    </div>
                  )}
                </div>

                {isProcessing && (
                  <ProgressBar progress={ffmpegProgress} className="mt-1.5" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Overall progress bar */}
      {isRunning && (
        <div className="px-2 tablet:px-3 py-2 border-t border-control bg-inset">
          <div className="flex items-center justify-between mb-1">
            <span className="text-2xs text-fg-muted">{ExportQueueStrings.labelOverall}</span>
            <span className="text-2xs text-fg-2 font-mono">
              {Math.round(overallProgress * 100)}%
            </span>
          </div>
          <ProgressBar progress={overallProgress} />
        </div>
      )}

      {/* Collapsed summary */}
      {collapsed && (
        <div className="px-2 tablet:px-3 py-1.5 text-2xs text-fg-muted">
          {isRunning
            ? ExportQueueStrings.collapsedProgress(Math.round(overallProgress * 100), doneCount, totalCount)
            : pendingCount > 0
              ? ExportQueueStrings.collapsedPending(pendingCount, isStarted)
              : allFinished
                ? ExportQueueStrings.statusAllDone
                : ExportQueueStrings.statusIdle}
        </div>
      )}
    </div>
  );
}