import { useState, useRef } from 'react';
import type { Clip } from '../../hooks/useTrimMarkers';

interface ClipListProps {
  clips: Clip[];
  inPoint: number | null;
  outPoint: number | null;
  onAddClip: (name: string) => void;
  onRemoveClip: (id: string) => void;
  onSeekToClip: (clip: Clip) => void;
  onUpdateClip: (id: string, patch: Partial<Pick<Clip, 'name' | 'inPoint' | 'outPoint'>>) => void;
  onReorderClips: (fromIndex: number, toIndex: number) => void;
}

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// ─── Individual clip row ───────────────────────────────────────────────────────

interface ClipRowProps {
  clip: Clip;
  index: number;
  isDragOver: boolean;
  dragOverSide: 'top' | 'bottom' | null;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number, side: 'top' | 'bottom') => void;
  onDragEnd: () => void;
  onDrop: (targetIndex: number) => void;
  onRemove: () => void;
  onSeek: () => void;
  onRename: (name: string) => void;
  onEditPoints: () => void;
}

function ClipRow({
  clip,
  index,
  isDragOver,
  dragOverSide,
  onDragStart,
  onDragEnter,
  onDragEnd,
  onDrop,
  onRemove,
  onSeek,
  onRename,
  onEditPoints,
}: ClipRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(clip.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const commitRename = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== clip.name) onRename(trimmed);
    else setEditValue(clip.name);
    setIsEditing(false);
  };

  const startEdit = () => {
    setEditValue(clip.name);
    setIsEditing(true);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  const clipDuration = clip.outPoint - clip.inPoint;

  return (
    <div
      draggable
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => {
        e.preventDefault();
        const rect = e.currentTarget.getBoundingClientRect();
        const side = e.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
        onDragEnter(index, side);
      }}
      onDragEnd={onDragEnd}
      onDrop={(e) => {
        e.preventDefault();
        onDrop(index);
      }}
      className={[
        'relative flex items-center gap-2 rounded border bg-[#111] px-2 py-2 transition-colors group select-none',
        isDragOver
          ? 'border-[#c8f55a]/60 bg-[#c8f55a]/5'
          : 'border-[#2a2a2e] hover:border-[#444]',
      ].join(' ')}
    >
      {/* Drop indicator line */}
      {isDragOver && dragOverSide === 'top' && (
        <div className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 rounded-full bg-[#c8f55a]" />
      )}
      {isDragOver && dragOverSide === 'bottom' && (
        <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[#c8f55a]" />
      )}

      {/* Drag handle */}
      <span
        className="cursor-grab text-[#444] hover:text-[#888] transition-colors text-base leading-none active:cursor-grabbing shrink-0"
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Index */}
      <span className="text-[10px] text-[#555] font-mono w-4 shrink-0">{index + 1}</span>

      {/* Thumbnail */}
      <div className="shrink-0 w-[56px] h-[32px] rounded overflow-hidden bg-[#222] border border-[#333]">
        {clip.thumbnailDataUrl ? (
          <img
            src={clip.thumbnailDataUrl}
            alt={`Thumbnail for ${clip.name}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#444] text-[10px]">▶</div>
        )}
      </div>

      {/* Name — click to edit */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <input
            ref={inputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setEditValue(clip.name);
                setIsEditing(false);
              }
            }}
            className="w-full rounded border border-[#c8f55a]/50 bg-[#1a1a1e] px-1.5 py-0.5 text-sm text-[#ccc] outline-none focus:border-[#c8f55a]"
          />
        ) : (
          <button
            onClick={startEdit}
            className="block w-full text-left text-sm text-[#ccc] truncate hover:text-white transition-colors cursor-text"
            title="Click to rename"
          >
            {clip.name}
          </button>
        )}
      </div>

      {/* Timecodes */}
      <span className="font-mono text-xs text-[#c8f55a] shrink-0">{formatTime(clip.inPoint)}</span>
      <span className="text-[#555] text-xs shrink-0">→</span>
      <span className="font-mono text-xs text-[#f55a5a] shrink-0">{formatTime(clip.outPoint)}</span>
      <span className="font-mono text-xs text-[#777] shrink-0">
        {formatTime(clipDuration)}
      </span>

      {/* Actions — visible on hover */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={onSeek}
          className="rounded px-1.5 py-0.5 text-xs text-[#888] hover:text-[#ccc] hover:bg-[#2a2a2e] transition-colors cursor-pointer"
          title="Seek to in-point"
        >
          ▶
        </button>
        <button
          onClick={onEditPoints}
          className="rounded px-1.5 py-0.5 text-xs text-[#888] hover:text-[#c8f55a] hover:bg-[#2a2a2e] transition-colors cursor-pointer"
          title="Load in/out points into timeline for editing"
        >
          ✎
        </button>
        <button
          onClick={onRemove}
          className="rounded px-1.5 py-0.5 text-xs text-[#555] hover:text-[#f55a5a] hover:bg-[#2a2a2e] transition-colors cursor-pointer"
          title="Remove clip"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── ClipList container ────────────────────────────────────────────────────────

export function ClipList({
  clips,
  inPoint,
  outPoint,
  onAddClip,
  onRemoveClip,
  onSeekToClip,
  onUpdateClip,
  onReorderClips,
}: ClipListProps) {
  const [clipName, setClipName] = useState('');
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'top' | 'bottom' | null>(null);

  const duration = inPoint !== null && outPoint !== null ? outPoint - inPoint : null;
  const canAdd = inPoint !== null && outPoint !== null;

  const handleAdd = () => {
    const name = clipName.trim() || `Clip ${clips.length + 1}`;
    onAddClip(name);
    setClipName('');
  };

  const handleDrop = (targetIndex: number) => {
    if (dragFromIndex === null) return;
    // Calculate final destination accounting for drop side
    let to = dragOverSide === 'bottom' ? targetIndex + 1 : targetIndex;
    // Adjust for the gap left when the dragged item is removed
    if (to > dragFromIndex) to -= 1;
    onReorderClips(dragFromIndex, to);
    setDragFromIndex(null);
    setDragOverIndex(null);
    setDragOverSide(null);
  };

  const handleDragEnd = () => {
    setDragFromIndex(null);
    setDragOverIndex(null);
    setDragOverSide(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto mt-4 rounded-md border border-[#333] bg-[#1a1a1e] p-3">
      <div className="text-[11px] uppercase tracking-wider text-[#888] mb-3">Clip Definition</div>

      {/* In/Out display */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 rounded border border-[#333] bg-[#111] px-3 py-2">
          <div className="text-[10px] uppercase text-[#555] mb-0.5">In Point</div>
          <div className={`font-mono text-sm ${inPoint !== null ? 'text-[#c8f55a]' : 'text-[#444]'}`}>
            {inPoint !== null ? formatTime(inPoint) : '—'}
          </div>
        </div>
        <div className="flex-1 rounded border border-[#333] bg-[#111] px-3 py-2">
          <div className="text-[10px] uppercase text-[#555] mb-0.5">Out Point</div>
          <div className={`font-mono text-sm ${outPoint !== null ? 'text-[#f55a5a]' : 'text-[#444]'}`}>
            {outPoint !== null ? formatTime(outPoint) : '—'}
          </div>
        </div>
        <div className="flex-1 rounded border border-[#333] bg-[#111] px-3 py-2">
          <div className="text-[10px] uppercase text-[#555] mb-0.5">Duration</div>
          <div className={`font-mono text-sm ${duration !== null ? 'text-[#ccc]' : 'text-[#444]'}`}>
            {duration !== null ? formatTime(duration) : '—'}
          </div>
        </div>
      </div>

      {/* Add clip row */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder={`Clip ${clips.length + 1}`}
          value={clipName}
          onChange={(e) => setClipName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && canAdd && handleAdd()}
          className="flex-1 rounded border border-[#333] bg-[#111] px-3 py-1.5 text-sm text-[#ccc] placeholder-[#444] outline-none focus:border-[#c8f55a]/60"
          disabled={!canAdd}
        />
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="rounded border border-[#c8f55a]/40 bg-[#2a2a2e] px-4 py-1.5 text-sm text-[#c8f55a] hover:bg-[#c8f55a]/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Add Clip
        </button>
      </div>

      {/* Clip list */}
      {clips.length === 0 ? (
        <div className="text-center text-xs text-[#444] py-4">
          Set in/out points and add clips — they'll appear here
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {clips.map((clip, i) => (
            <ClipRow
              key={clip.id}
              clip={clip}
              index={i}
              isDragOver={dragOverIndex === i}
              dragOverSide={dragOverIndex === i ? dragOverSide : null}
              onDragStart={(idx) => setDragFromIndex(idx)}
              onDragEnter={(idx, side) => {
                setDragOverIndex(idx);
                setDragOverSide(side);
              }}
              onDragEnd={handleDragEnd}
              onDrop={handleDrop}
              onRemove={() => onRemoveClip(clip.id)}
              onSeek={() => onSeekToClip(clip)}
              onRename={(name) => onUpdateClip(clip.id, { name })}
              onEditPoints={() => onSeekToClip(clip)}
            />
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[#444]">
        Keyboard:{' '}
        <kbd className="rounded bg-[#222] px-1 py-px text-[#666]">I</kbd> set in ·{' '}
        <kbd className="rounded bg-[#222] px-1 py-px text-[#666]">O</kbd> set out · drag{' '}
        <span className="text-[#666]">⠿</span> to reorder · click name to rename ·{' '}
        <span className="text-[#666]">✎</span> loads clip back into timeline
      </p>
    </div>
  );
}

export default ClipList;