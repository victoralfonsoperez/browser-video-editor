import { useState } from 'react';
import type { QueueItem } from '../../hooks/useExportQueue';

interface ExportQueueOverlayProps {
  queue: QueueItem[];
  isRunning: boolean;
  isStarted: boolean;
  onStart: () => void;
  onPause: () => void;
  onRemove: (queueId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onClear: () => void;
}

function StatusIcon({ status }: { status: QueueItem['status'] }) {
  if (status === 'processing') return <span className="animate-spin inline-block leading-none">⟳</span>;
  if (status === 'done') return <span className="text-[#c8f55a]">✓</span>;
  if (status === 'error') return <span className="text-[#f55a5a]">✕</span>;
  return <span className="text-[#555]">–</span>;
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function ExportQueueOverlay({
  queue,
  isRunning,
  isStarted,
  onStart,
  onPause,
  onRemove,
  onReorder,
  onClear,
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
    <div className="fixed bottom-4 right-4 z-50 w-72 rounded-lg border border-[#333] bg-[#111] shadow-xl shadow-black/60 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#1a1a1e] border-b border-[#2a2a2e]">
        <div className="flex items-center gap-2">
          {isRunning && (
            <span className="animate-spin inline-block text-[#c8f55a] text-sm leading-none">⟳</span>
          )}
          <span className="text-[11px] uppercase tracking-wider text-[#888] font-medium">
            Export Queue
          </span>
          <span className="text-[10px] text-[#555] font-mono">
            {doneCount}/{totalCount}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Start / Pause button */}
          {!allFinished && (
            isStarted && !allFinished ? (
              <button
                onClick={onPause}
                disabled={isRunning}
                className="rounded px-2 py-0.5 text-[10px] font-medium text-[#f5a623] border border-[#f5a623]/30 hover:bg-[#f5a623]/10 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                title="Pause after current item finishes"
              >
                Pause
              </button>
            ) : (
              <button
                onClick={onStart}
                className="rounded px-2 py-0.5 text-[10px] font-medium text-[#c8f55a] border border-[#c8f55a]/30 hover:bg-[#c8f55a]/10 transition-colors cursor-pointer"
                title="Start processing the queue"
              >
                {pendingCount > 0 ? 'Start' : 'Resume'}
              </button>
            )
          )}

          {doneCount > 0 && !isRunning && (
            <button
              onClick={onClear}
              className="rounded px-1.5 py-0.5 text-[10px] text-[#555] hover:text-[#f55a5a] hover:bg-[#2a2a2e] transition-colors cursor-pointer"
              title="Clear finished items"
            >
              Clear
            </button>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="rounded px-1.5 py-0.5 text-[10px] text-[#555] hover:text-[#ccc] hover:bg-[#2a2a2e] transition-colors cursor-pointer w-5 text-center"
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Item list */}
      {!collapsed && (
        <div className="max-h-64 overflow-y-auto">
          {queue.map((item, i) => {
            const isPending = item.status === 'pending';
            const isProcessing = item.status === 'processing';
            const isFinished = item.status === 'done' || item.status === 'error';
            const isDragTarget = dragOver === i;

            if (isFinished) {
              return (
                <div
                  key={item.queueId}
                  className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1e1e1e] last:border-0"
                >
                  <span className="text-xs w-4 text-center shrink-0">
                    <StatusIcon status={item.status} />
                  </span>
                  <span className={`flex-1 text-[11px] truncate ${item.status === 'error' ? 'text-[#f55a5a]' : 'text-[#555]'}`}>
                    {item.clip.name}
                    {item.status === 'error' && item.error ? ` — ${item.error}` : ''}
                  </span>
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
                  'relative flex items-center gap-2 px-3 py-2 border-b border-[#1e1e1e] last:border-0 group transition-colors',
                  isPending ? 'hover:bg-[#1a1a1e] cursor-grab active:cursor-grabbing' : '',
                  isDragTarget ? 'bg-[#c8f55a]/5' : '',
                ].join(' ')}
              >
                {isDragTarget && dragSide === 'top' && (
                  <div className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 bg-[#c8f55a] rounded-full" />
                )}
                {isDragTarget && dragSide === 'bottom' && (
                  <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-0.5 bg-[#c8f55a] rounded-full" />
                )}

                <span className="text-xs w-4 text-center shrink-0">
                  <StatusIcon status={item.status} />
                </span>

                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#ccc] truncate">{item.clip.name}</p>
                  {isProcessing && (
                    <p className="text-[10px] text-[#888] animate-pulse">Exporting…</p>
                  )}
                  {isPending && (
                    <p className="text-[10px] text-[#555]">
                      {formatTime(item.clip.inPoint)} → {formatTime(item.clip.outPoint)}
                    </p>
                  )}
                </div>

                {isPending && (
                  <button
                    onClick={() => onRemove(item.queueId)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity rounded px-1 py-0.5 text-[10px] text-[#555] hover:text-[#f55a5a] hover:bg-[#2a2a2e] shrink-0 cursor-pointer"
                    title="Remove from queue"
                  >
                    ✕
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Collapsed summary */}
      {collapsed && (
        <div className="px-3 py-1.5 text-[10px] text-[#555]">
          {pendingCount > 0
            ? `${pendingCount} pending · ${isRunning ? 'running' : isStarted ? 'started' : 'not started'}`
            : allFinished
              ? 'All done'
              : 'Idle'}
        </div>
      )}
    </div>
  );
}