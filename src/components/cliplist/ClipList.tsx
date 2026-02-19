import { useState } from 'react';
import type { Clip } from '../../hooks/useTrimMarkers';

interface ClipListProps {
  clips: Clip[];
  inPoint: number | null;
  outPoint: number | null;
  onAddClip: (name: string) => void;
  onRemoveClip: (id: string) => void;
  onSeekToClip: (clip: Clip) => void;
}

export function ClipList({ clips, inPoint, outPoint, onAddClip, onRemoveClip, onSeekToClip }: ClipListProps) {
  const [clipName, setClipName] = useState('');

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const duration = (inPoint !== null && outPoint !== null) ? outPoint - inPoint : null;
  const canAdd = inPoint !== null && outPoint !== null;

  const handleAdd = () => {
    const name = clipName.trim() || `Clip ${clips.length + 1}`;
    onAddClip(name);
    setClipName('');
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
            <div
              key={clip.id}
              className="flex items-center gap-3 rounded border border-[#2a2a2e] bg-[#111] px-3 py-2 hover:border-[#444] transition-colors group"
            >
              <span className="text-[10px] text-[#555] font-mono w-4">{i + 1}</span>
              <span className="flex-1 text-sm text-[#ccc] truncate">{clip.name}</span>
              <span className="font-mono text-xs text-[#c8f55a]">{formatTime(clip.inPoint)}</span>
              <span className="text-[#555] text-xs">→</span>
              <span className="font-mono text-xs text-[#f55a5a]">{formatTime(clip.outPoint)}</span>
              <span className="font-mono text-xs text-[#555]">{formatTime(clip.outPoint - clip.inPoint)}</span>
              <button
                onClick={() => onSeekToClip(clip)}
                className="text-xs text-[#888] hover:text-[#ccc] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                title="Seek to in-point"
              >
                ▶
              </button>
              <button
                onClick={() => onRemoveClip(clip.id)}
                className="text-xs text-[#555] hover:text-[#f55a5a] transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
                title="Remove clip"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-[10px] text-[#444]">
        Keyboard: <kbd className="rounded bg-[#222] px-1 py-px text-[#666]">I</kbd> set in · <kbd className="rounded bg-[#222] px-1 py-px text-[#666]">O</kbd> set out
      </p>
    </div>
  );
}

export default ClipList;