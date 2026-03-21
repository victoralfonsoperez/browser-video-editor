import { useReducer, useEffect, useState, useRef } from 'react';
import { SharedStrings, HighlightListStrings } from '../../constants/ui';
import { IconChevronDown, IconChevronRight } from '../shared/Icons';
import { formatTime } from '../../utils/formatTime';
import type { Highlight } from '../../types/highlights';

interface HighlightRowProps {
  highlight: Highlight;
  onSeek: () => void;
  onRemove: () => void;
  onRename: (label: string) => void;
  onLoadIntoTimeline: () => void;
}

/** Full highlight row — visible on tablet+ when expanded */
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
    <div className="flex items-center gap-2 rounded bg-base/50 px-2 py-2 hover:bg-base transition-colors group select-none">
      <div className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />

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
            className="w-full rounded border border-amber/50 bg-raised px-1.5 py-0.5 text-sm text-fg-1 focus:border-amber"
          />
        ) : (
          <button
            onClick={startEdit}
            className="block w-full text-left text-sm text-fg-1 truncate hover:text-white transition-colors cursor-text"
            title={HighlightListStrings.titleClickToRename}
          >
            {highlight.label}
          </button>
        )}
      </div>

      <span className="font-mono text-xs text-amber shrink-0">{formatTime(highlight.time)}</span>
      {isRange && (
        <>
          <span className="text-fg-muted text-xs shrink-0">→</span>
          <span className="font-mono text-xs text-amber/70 shrink-0">{formatTime(highlight.endTime!)}</span>
          <span className="font-mono text-xs text-fg-muted shrink-0">({formatTime(highlight.endTime! - highlight.time)})</span>
        </>
      )}

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onSeek}
          className="rounded px-1.5 py-0.5 text-xs text-fg-2 hover:text-fg-1 hover:bg-control transition-colors cursor-pointer"
          title={HighlightListStrings.titleSeek}
          aria-label={HighlightListStrings.titleSeek}
        >
          ▶
        </button>
        {isRange && (
          <button
            onClick={onLoadIntoTimeline}
            className="rounded px-1.5 py-0.5 text-xs text-fg-2 hover:text-amber hover:bg-control transition-colors cursor-pointer"
            title={HighlightListStrings.titleLoadIntoTimeline}
            aria-label={HighlightListStrings.titleLoadIntoTimeline}
          >
            ✎
          </button>
        )}
        <button
          onClick={onRemove}
          className="rounded px-1.5 py-0.5 text-xs text-fg-muted hover:text-danger hover:bg-control transition-colors cursor-pointer"
          title={HighlightListStrings.titleRemove}
          aria-label={HighlightListStrings.titleRemove}
        >
          {SharedStrings.btnClose}
        </button>
      </div>
    </div>
  );
}

/** Compact highlight row — tappable, used on mobile */
function HighlightRowCompact({ highlight, onSeek, onRemove }: Pick<HighlightRowProps, 'highlight' | 'onSeek' | 'onRemove'>) {
  const isRange = highlight.endTime !== undefined;

  return (
    <div className="flex items-center gap-2 px-1 py-1.5 border-b border-edge-subtle last:border-0">
      <div className="w-1.5 h-1.5 rounded-full bg-amber shrink-0" />
      <button
        onClick={onSeek}
        className="flex-1 min-w-0 text-left text-xs text-fg-1 truncate cursor-pointer active:text-white"
      >
        {highlight.label}
      </button>
      <span className="font-mono text-2xs text-amber shrink-0">{formatTime(highlight.time)}</span>
      {isRange && (
        <span className="font-mono text-2xs text-fg-muted shrink-0">({formatTime(highlight.endTime! - highlight.time)})</span>
      )}
      <button
        onClick={onRemove}
        className="min-h-[44px] min-w-[44px] flex items-center justify-center text-2xs text-fg-muted active:text-danger cursor-pointer shrink-0"
        title={HighlightListStrings.titleRemove}
        aria-label={HighlightListStrings.titleRemove}
      >
        {SharedStrings.btnClose}
      </button>
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
  const [isOpen, dispatchOpen] = useReducer((_state: boolean, next: boolean) => next, false);

  useEffect(() => {
    if (hasHighlights) dispatchOpen(true);
  }, [hasHighlights, dispatchOpen]);

  return (
    <div className="w-full max-w-4xl mx-auto mt-3 rounded-md border border-control bg-panel p-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => dispatchOpen(!isOpen)}
          className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-fg-2 hover:text-fg-1 transition-colors cursor-pointer"
          title={isOpen ? HighlightListStrings.titleCollapse : HighlightListStrings.titleExpand}
          aria-expanded={isOpen}
        >
          {isOpen ? <IconChevronDown className="w-3 h-3 shrink-0" /> : <IconChevronRight className="w-3 h-3 shrink-0" />}
          {HighlightListStrings.sectionHeading}
          {!isOpen && hasHighlights && (
            <span className="text-fg-muted normal-case tracking-normal">({highlights.length})</span>
          )}
        </button>

        <div className="hidden tablet:flex gap-1.5">
          <button
            onClick={onToggleOnTimeline}
            className={[
              'rounded border px-2 py-0.5 text-xs transition-colors cursor-pointer',
              showOnTimeline
                ? 'border-amber/60 bg-amber/10 text-amber'
                : 'border-edge-strong bg-control text-fg-muted hover:bg-control-hover hover:text-fg-2',
            ].join(' ')}
            title={showOnTimeline ? HighlightListStrings.titleHideFromTimeline : HighlightListStrings.titleShowOnTimeline}
            aria-pressed={showOnTimeline}
          >
            {HighlightListStrings.btnTimeline}
          </button>

          <label
            className="rounded border border-edge-strong bg-control px-2 py-0.5 text-xs text-fg-2 hover:bg-control-hover hover:text-fg-1 transition-colors cursor-pointer"
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
            className="rounded border border-edge-strong bg-control px-2 py-0.5 text-xs text-fg-2 hover:bg-control-hover hover:text-fg-1 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title={HighlightListStrings.titleExport}
          >
            {HighlightListStrings.btnExport}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="mt-2 tablet:mt-3">
          {highlights.length === 0 ? (
            <div className="text-center text-xs text-fg-muted py-4">{HighlightListStrings.emptyState}</div>
          ) : (
            <>
              {/* Compact list — mobile */}
              <div className="tablet:hidden">
                {highlights.map((h) => (
                  <HighlightRowCompact
                    key={h.id}
                    highlight={h}
                    onSeek={() => onSeek(h.time)}
                    onRemove={() => onRemove(h.id)}
                  />
                ))}
              </div>
              {/* Full list — tablet+ */}
              <div className="hidden tablet:flex flex-col gap-1.5" data-testid="highlight-list-full">
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default HighlightList;
