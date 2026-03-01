import { useReducer, useEffect, useState, useRef } from 'react';
import { SharedStrings, HighlightListStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import type { Highlight } from '../../types/highlights';

interface HighlightRowProps {
  highlight: Highlight;
  onSeek: () => void;
  onRemove: () => void;
  onRename: (label: string) => void;
  onLoadIntoTimeline: () => void;
}

function HighlightRow({ highlight, onSeek, onRemove, onRename, onLoadIntoTimeline }: HighlightRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(highlight.label);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== highlight.label) onRename(trimmed);
    else setEditValue(highlight.label);
    setIsEditing(false);
  };

  const startEdit = () => {
    setEditValue(highlight.label);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const isRange = highlight.endTime !== undefined;

  return (
    <div className="flex items-center gap-2 rounded border border-[#2a2a2e] bg-[#111] px-2 py-2 hover:border-[#444] transition-colors group select-none">
      <div className="w-1.5 h-1.5 rounded-full bg-[#f59e0b] shrink-0" />

      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setEditValue(highlight.label); setIsEditing(false); }
            }}
            className="w-full rounded border border-[#f59e0b]/50 bg-[#1a1a1e] px-1.5 py-0.5 text-sm text-[#ccc] outline-none focus:border-[#f59e0b]"
          />
        ) : (
          <button
            onClick={startEdit}
            className="block w-full text-left text-sm text-[#ccc] truncate hover:text-white transition-colors cursor-text"
            title={HighlightListStrings.titleClickToRename}
          >
            {highlight.label}
          </button>
        )}
      </div>

      <span className="font-mono text-xs text-[#f59e0b] shrink-0">{formatTime(highlight.time)}</span>
      {isRange && (
        <>
          <span className="text-[#555] text-xs shrink-0">→</span>
          <span className="font-mono text-xs text-[#f59e0b]/70 shrink-0">{formatTime(highlight.endTime!)}</span>
          <span className="font-mono text-xs text-[#777] shrink-0">({formatTime(highlight.endTime! - highlight.time)})</span>
        </>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onSeek}
          className="rounded px-1.5 py-0.5 text-xs text-[#888] hover:text-[#ccc] hover:bg-[#2a2a2e] transition-colors cursor-pointer"
          title={HighlightListStrings.titleSeek}
        >
          ▶
        </button>
        {isRange && (
          <button
            onClick={onLoadIntoTimeline}
            className="rounded px-1.5 py-0.5 text-xs text-[#888] hover:text-[#f59e0b] hover:bg-[#2a2a2e] transition-colors cursor-pointer"
            title={HighlightListStrings.titleLoadIntoTimeline}
          >
            ✎
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded px-1.5 py-0.5 text-xs text-[#555] hover:text-[#f55a5a] hover:bg-[#2a2a2e] transition-colors cursor-pointer"
          title={HighlightListStrings.titleRemove}
        >
          {SharedStrings.btnClose}
        </button>
      </div>
    </div>
  );
}

export interface HighlightListProps {
  highlights: Highlight[];
  onSeek: (time: number) => void;
  onRemove: (id: string) => void;
  onRename: (id: string, label: string) => void;
  onLoadIntoTimeline: (highlight: Highlight) => void;
  onExport: () => void;
  onImport: (file: File) => void;
  showOnTimeline: boolean;
  onToggleOnTimeline: () => void;
}

export function HighlightList({ highlights, onSeek, onRemove, onRename, onLoadIntoTimeline, onExport, onImport, showOnTimeline, onToggleOnTimeline }: HighlightListProps) {
  const hasHighlights = highlights.length > 0;
  const [isOpen, dispatchOpen] = useReducer((_state: boolean, next: boolean) => next, hasHighlights);

  useEffect(() => {
    if (hasHighlights) dispatchOpen(true);
  }, [hasHighlights, dispatchOpen]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 rounded-md border border-[#333] bg-[#1a1a1e] p-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => dispatchOpen(!isOpen)}
          className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-[#888] hover:text-[#ccc] transition-colors cursor-pointer"
          title={isOpen ? HighlightListStrings.titleCollapse : HighlightListStrings.titleExpand}
        >
          <span className="text-[10px]">{isOpen ? '▼' : '▶'}</span>
          {HighlightListStrings.sectionHeading}
          {!isOpen && hasHighlights && (
            <span className="text-[#555] normal-case tracking-normal">({highlights.length})</span>
          )}
        </button>

        <div className="flex gap-1.5">
          <button
            onClick={onToggleOnTimeline}
            className={[
              'rounded border px-2 py-0.5 text-[11px] transition-colors cursor-pointer',
              showOnTimeline
                ? 'border-[#f59e0b]/60 bg-[#f59e0b]/10 text-[#f59e0b]'
                : 'border-[#444] bg-[#2a2a2e] text-[#666] hover:bg-[#3a3a3e] hover:text-[#888]',
            ].join(' ')}
            title={showOnTimeline ? HighlightListStrings.titleHideFromTimeline : HighlightListStrings.titleShowOnTimeline}
          >
            {HighlightListStrings.btnTimeline}
          </button>

          <label
            className="rounded border border-[#444] bg-[#2a2a2e] px-2 py-0.5 text-[11px] text-[#888] hover:bg-[#3a3a3e] hover:text-[#ccc] transition-colors cursor-pointer"
            title={HighlightListStrings.titleLoad}
          >
            {HighlightListStrings.btnLoad}
            <input
              type="file"
              accept=".json"
              data-testid="highlight-import-input"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onImport(file);
                e.target.value = '';
              }}
            />
          </label>
          <button
            onClick={onExport}
            disabled={highlights.length === 0}
            className="rounded border border-[#444] bg-[#2a2a2e] px-2 py-0.5 text-[11px] text-[#888] hover:bg-[#3a3a3e] hover:text-[#ccc] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title={HighlightListStrings.titleExport}
          >
            {HighlightListStrings.btnExport}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-3">
          {highlights.length === 0 ? (
            <div className="text-center text-xs text-[#444] py-4">{HighlightListStrings.emptyState}</div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {highlights.map((h) => (
                <HighlightRow
                  key={h.id}
                  highlight={h}
                  onSeek={() => onSeek(h.time)}
                  onRemove={() => onRemove(h.id)}
                  onRename={(label) => onRename(h.id, label)}
                  onLoadIntoTimeline={() => onLoadIntoTimeline(h)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default HighlightList;
