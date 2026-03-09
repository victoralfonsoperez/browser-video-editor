import { useState, useRef, useCallback, useEffect } from 'react';
import { SharedStrings, ClipListStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import type { Clip } from '../../hooks/useTrimMarkers';
import type { UseFFmpegReturn } from '../../hooks/useFFmpeg';
import type { ExportOptions } from '../../types/exportOptions';
import { FORMAT_LABELS, QUALITY_LABELS, RESOLUTION_LABELS, isGif } from '../../types/exportOptions';
import { ExportOptionsPanel } from '../exportoptions/ExportOptionsPanel';
import { ProgressBar } from '../shared/ProgressBar';
import { FocusTrap } from '../common/FocusTrap';

interface ClipListProps {
  clips: Clip[];
  inPoint: number | null;
  outPoint: number | null;
  videoSource: File | string | null;
  ffmpeg: UseFFmpegReturn;
  globalOptions: ExportOptions;
  isAddingClip?: boolean;
  onAddClip: (name: string) => void;
  onRemoveClip: (id: string) => void;
  onSeekToClip: (clip: Clip) => void;
  onPreviewClip: (clip: Clip) => void;
  onUpdateClip: (id: string, patch: Partial<Pick<Clip, 'name' | 'inPoint' | 'outPoint'>>) => void;
  onReorderClips: (fromIndex: number, toIndex: number) => void;
  onEnqueueClip: (clip: Clip, options: ExportOptions) => void;
  filenameHint?: string | null;
}

/** Small inline badge showing format · quality */
function OptionsBadge({ options }: { options: ExportOptions }) {
  return (
    <span className="font-mono text-[9px] text-[#999] shrink-0">
      {FORMAT_LABELS[options.format]} · {QUALITY_LABELS[options.quality]}
      {options.resolution !== 'original' ? ` · ${RESOLUTION_LABELS[options.resolution]}` : ''}
    </span>
  );
}

/** Simple confirmation dialog for GIF exports */
function GifWarningDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <FocusTrap onEscape={onCancel}>
        <div className="w-72 rounded-lg border border-[#333] bg-[#1a1a1e] p-4 shadow-xl">
          <p className="mb-1 text-sm font-semibold text-[#ccc]">{ClipListStrings.gifWarningHeading}</p>
          <p className="mb-4 text-xs text-[#aaa]">
            {ClipListStrings.gifWarningBody}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded border border-[#333] bg-[#111] px-3 py-1.5 text-xs text-[#aaa] hover:text-[#ccc] transition-colors cursor-pointer"
            >
              {SharedStrings.btnCancel}
            </button>
            <button
              onClick={onConfirm}
              className="rounded border border-[#f5a623]/40 bg-[#f5a623]/10 px-3 py-1.5 text-xs text-[#f5a623] hover:bg-[#f5a623]/20 transition-colors cursor-pointer"
            >
              {ClipListStrings.btnExportAnyway}
            </button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );
}

interface ClipRowProps {
  clip: Clip;
  index: number;
  isDragOver: boolean;
  dragOverSide: 'top' | 'bottom' | null;
  videoSource: File | string | null;
  ffmpeg: UseFFmpegReturn;
  globalOptions: ExportOptions;
  isTouchDragging: boolean;
  swipeOffset: number;
  onDragStart: (index: number) => void;
  onDragEnter: (index: number, side: 'top' | 'bottom') => void;
  onDragEnd: () => void;
  onDrop: (targetIndex: number) => void;
  onTouchDragStart: (index: number, y: number) => void;
  onSwipeStart: (index: number, x: number) => void;
  onRemove: () => void;
  onSeek: () => void;
  onPreview: () => void;
  onRename: (name: string) => void;
  onEditPoints: () => void;
  onEnqueue: (options: ExportOptions) => void;
  onInstantExport: (options: ExportOptions) => void;
  onMoveUp: (() => void) | null;
  onMoveDown: (() => void) | null;
}

function ClipRow({
  clip, index, isDragOver, dragOverSide,
  videoSource, ffmpeg,
  globalOptions,
  isTouchDragging, swipeOffset,
  onDragStart, onDragEnter, onDragEnd, onDrop,
  onTouchDragStart, onSwipeStart,
  onRemove, onSeek, onPreview, onRename, onEditPoints, onEnqueue, onInstantExport,
  onMoveUp, onMoveDown,
}: ClipRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(clip.name);
  const [clipOptions, setClipOptions] = useState<ExportOptions>(globalOptions);
  const [showSettings, setShowSettings] = useState(false);
  const [gifPendingAction, setGifPendingAction] = useState<'export' | 'enqueue' | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

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
  const isThisExporting = ffmpeg.exportingClipId === clip.id;
  const isAnyExporting = ffmpeg.status === 'loading' || ffmpeg.status === 'processing';
  const canExport = !!videoSource && !isAnyExporting;

  const handleExportClick = () => {
    if (isGif(clipOptions)) {
      setGifPendingAction('export');
    } else {
      onInstantExport(clipOptions);
    }
  };

  const handleEnqueueClick = () => {
    if (isGif(clipOptions)) {
      setGifPendingAction('enqueue');
    } else {
      onEnqueue(clipOptions);
    }
  };

  const handleGifConfirm = () => {
    if (gifPendingAction === 'export') onInstantExport(clipOptions);
    if (gifPendingAction === 'enqueue') onEnqueue(clipOptions);
    setGifPendingAction(null);
  };

  return (
    <>
      {gifPendingAction && (
        <GifWarningDialog
          onConfirm={handleGifConfirm}
          onCancel={() => setGifPendingAction(null)}
        />
      )}

      <div className="relative overflow-hidden rounded">
        {/* Swipe-to-delete background */}
        {swipeOffset < 0 && (
          <div className="absolute inset-0 flex items-center justify-end px-4 bg-[#f55a5a]/20 rounded">
            <span className={`text-xs font-medium ${swipeOffset < -100 ? 'text-[#f55a5a]' : 'text-[#999]'}`}>
              {swipeOffset < -100 ? 'Release to delete' : 'Swipe to delete'}
            </span>
          </div>
        )}
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
        onDrop={(e) => { e.preventDefault(); onDrop(index); }}
        onTouchStart={(e) => onSwipeStart(index, e.touches[0].clientX)}
        className={[
          'relative flex flex-col rounded border bg-[#111] px-2 py-2 transition-colors group select-none',
          isDragOver ? 'border-[#c8f55a]/60 bg-[#c8f55a]/5' : 'border-[#2a2a2e] hover:border-[#444]',
          isTouchDragging ? 'opacity-50 scale-95' : '',
        ].join(' ')}
        style={swipeOffset !== 0 ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : undefined}
      >
        {isDragOver && dragOverSide === 'top' && (
          <div className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 rounded-full bg-[#c8f55a]" />
        )}
        {isDragOver && dragOverSide === 'bottom' && (
          <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-[#c8f55a]" />
        )}

        <div className="flex items-center gap-1.5 tablet:gap-2">
          <span
            className="cursor-grab text-[#999] hover:text-[#aaa] transition-colors text-sm tablet:text-base leading-none active:cursor-grabbing shrink-0 min-w-[44px] min-h-[44px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center touch-none"
            title={ClipListStrings.titleDragToReorder}
            onTouchStart={(e) => { e.stopPropagation(); onTouchDragStart(index, e.touches[0].clientY); }}
            aria-roledescription="sortable"
          >⠿</span>
          <span className="hidden tablet:flex flex-col shrink-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100 transition-opacity">
            {onMoveUp && (
              <button onClick={onMoveUp} className="rounded px-0.5 text-[10px] text-[#999] hover:text-[#ccc] hover:bg-[#2a2a2e] transition-colors cursor-pointer leading-tight" title="Move up" aria-label="Move clip up">▲</button>
            )}
            {onMoveDown && (
              <button onClick={onMoveDown} className="rounded px-0.5 text-[10px] text-[#999] hover:text-[#ccc] hover:bg-[#2a2a2e] transition-colors cursor-pointer leading-tight" title="Move down" aria-label="Move clip down">▼</button>
            )}
          </span>
          <span className="text-[9px] tablet:text-[10px] text-[#999] font-mono w-3 tablet:w-4 shrink-0">{index + 1}</span>

          <div
            className="shrink-0 w-[48px] tablet:w-[56px] h-[28px] tablet:h-[32px] rounded overflow-hidden bg-[#222] border border-[#333] cursor-pointer hover:border-[#c8f55a]/60 transition-colors"
            onClick={onPreview}
            title={ClipListStrings.titlePreviewClip}
          >
            {clip.thumbnailDataUrl ? (
              <img src={clip.thumbnailDataUrl} alt={ClipListStrings.clipThumbnailAlt(clip.name)} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[#999] text-[10px]">▶</div>
            )}
          </div>

          <div className="flex-1 min-w-0 max-w-[120px] tablet:max-w-none">
            {isEditing ? (
              <input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={commitRename}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitRename();
                  if (e.key === 'Escape') { setEditValue(clip.name); setIsEditing(false); }
                }}
                className="w-full rounded border border-[#c8f55a]/50 bg-[#1a1a1e] px-1.5 py-0.5 text-xs tablet:text-sm text-[#ccc] focus:border-[#c8f55a]"
              />
            ) : (
              <button onClick={startEdit} className="block w-full text-left text-xs tablet:text-sm text-[#ccc] truncate hover:text-white transition-colors cursor-text" title={ClipListStrings.titleClickToRename}>
                {clip.name}
              </button>
            )}
          </div>

          <span className="font-mono text-[10px] tablet:text-xs text-[#c8f55a] shrink-0 hidden mobile-landscape:inline">{formatTime(clip.inPoint)}</span>
          <span className="text-[#999] text-xs shrink-0 hidden mobile-landscape:inline">→</span>
          <span className="font-mono text-[10px] tablet:text-xs text-[#f55a5a] shrink-0 hidden mobile-landscape:inline">{formatTime(clip.outPoint)}</span>
          <span className="font-mono text-[10px] tablet:text-xs text-[#999] shrink-0">{formatTime(clipDuration)}</span>

          <div className="flex items-center gap-0.5 tablet:gap-1 opacity-100 tablet:opacity-0 tablet:group-hover:opacity-100 tablet:focus-within:opacity-100 transition-opacity shrink-0">
            <button onClick={onPreview} className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-[10px] tablet:text-xs text-[#aaa] hover:text-[#c8f55a] hover:bg-[#2a2a2e] transition-colors cursor-pointer hidden tablet:inline-flex" title={ClipListStrings.titlePreviewClip} aria-label={ClipListStrings.titlePreviewClip}>⬛▶</button>
            <button onClick={onSeek} className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-[10px] tablet:text-xs text-[#aaa] hover:text-[#ccc] hover:bg-[#2a2a2e] transition-colors cursor-pointer hidden mobile-landscape:inline-flex" title={ClipListStrings.titleSeekToInPoint} aria-label={ClipListStrings.titleSeekToInPoint}>▶</button>
            <button onClick={onEditPoints} className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-[10px] tablet:text-xs text-[#aaa] hover:text-[#c8f55a] hover:bg-[#2a2a2e] transition-colors cursor-pointer hidden mobile-landscape:inline-flex" title={ClipListStrings.titleEditPoints} aria-label={ClipListStrings.titleEditPoints}>✎</button>

            {/* ⚙ per-clip settings */}
            <div className="relative hidden tablet:block" ref={settingsRef}>
              <button
                onClick={() => setShowSettings((s) => !s)}
                className={[
                  'rounded px-1.5 py-0.5 text-xs hover:bg-[#2a2a2e] transition-colors cursor-pointer',
                  showSettings ? 'text-[#c8f55a]' : 'text-[#aaa] hover:text-[#c8f55a]',
                ].join(' ')}
                title={ClipListStrings.titlePerClipSettings}
                aria-expanded={showSettings}
                aria-label={ClipListStrings.titlePerClipSettings}
              >
                ⚙
              </button>

              {showSettings && (
                <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-lg border border-[#333] bg-[#1a1a1e] p-3 shadow-xl">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-[10px] uppercase tracking-wider text-[#aaa]">{ClipListStrings.headingClipSettings}</p>
                    <button
                      onClick={() => setClipOptions(globalOptions)}
                      className="text-[10px] text-[#999] hover:text-[#c8f55a] transition-colors cursor-pointer"
                      title={ClipListStrings.titleReset}
                    >
                      {ClipListStrings.btnReset}
                    </button>
                  </div>
                  <ExportOptionsPanel options={clipOptions} onChange={setClipOptions} />
                </div>
              )}
            </div>

            <button
              onClick={handleExportClick}
              disabled={!canExport}
              className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-[10px] tablet:text-xs text-[#aaa] hover:text-[#c8f55a] hover:bg-[#2a2a2e] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={ClipListStrings.titleExportInstant}
              aria-label={ClipListStrings.titleExportInstant}
            >
              {isThisExporting
                ? ffmpeg.status === 'loading'
                  ? ClipListStrings.loadingFfmpeg
                  : ClipListStrings.exportProgress(Math.round(ffmpeg.progress * 100))
                : '⬇'}
            </button>
            <button
              onClick={handleEnqueueClick}
              disabled={!videoSource}
              className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-[10px] tablet:text-xs font-bold text-[#aaa] hover:text-[#a0c4ff] hover:bg-[#2a2a2e] transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title={ClipListStrings.titleAddToQueue}
              aria-label={ClipListStrings.titleAddToQueue}
            >
              +
            </button>
            <button onClick={onRemove} className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-[10px] tablet:text-xs text-[#999] hover:text-[#f55a5a] hover:bg-[#2a2a2e] transition-colors cursor-pointer" title={ClipListStrings.titleRemoveClip} aria-label={ClipListStrings.titleRemoveClip}>{SharedStrings.btnClose}</button>
          </div>

          {/* Always-visible options badge */}
          <OptionsBadge options={clipOptions} />
        </div>

        {/* Progress bar + loading message for active per-clip export */}
        {isThisExporting && (
          <div className="mt-1.5 flex items-center gap-2">
            {ffmpeg.status === 'loading' ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-[#888] border-t-transparent rounded-full animate-spin shrink-0" role="status" aria-label="Loading FFmpeg" />
                <p className="text-[10px] text-[#aaa]">{ClipListStrings.loadingFfmpegFirst}</p>
              </div>
            ) : (
              <ProgressBar progress={ffmpeg.progress} className="flex-1" />
            )}
          </div>
        )}

        {/* Per-clip error */}
        {ffmpeg.exportingClipId === null && ffmpeg.status === 'error' && ffmpeg.error && (
          <p className="mt-1 text-[10px] text-[#f55a5a]">{ClipListStrings.exportError(ffmpeg.error!)}</p>
        )}
      </div>
      </div>
    </>
  );
}

export function ClipList({
  clips, inPoint, outPoint,
  videoSource, ffmpeg,
  globalOptions,
  isAddingClip = false,
  onAddClip, onRemoveClip, onSeekToClip, onPreviewClip, onUpdateClip, onReorderClips,
  onEnqueueClip,
  filenameHint,
}: ClipListProps) {
  const [clipName, setClipName] = useState('');
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [dragOverSide, setDragOverSide] = useState<'top' | 'bottom' | null>(null);
  const [gifExportAllPending, setGifExportAllPending] = useState(false);

  // Touch drag reorder state
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null);
  const touchDragStartY = useRef(0);
  const clipListRef = useRef<HTMLDivElement>(null);

  // Swipe-to-delete state
  const [swipeIndex, setSwipeIndex] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartX = useRef(0);
  const swipeDirection = useRef<'horizontal' | 'vertical' | null>(null);

  const handleTouchDragStart = useCallback((index: number, y: number) => {
    setTouchDragIndex(index);
    touchDragStartY.current = y;
  }, []);

  const handleSwipeStart = useCallback((index: number, x: number) => {
    setSwipeIndex(index);
    swipeStartX.current = x;
    swipeDirection.current = null;
  }, []);

  // Touch move/end for reorder and swipe
  useEffect(() => {
    if (touchDragIndex === null && swipeIndex === null) return;

    const onTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];

      // Handle drag reorder (initiated from grip handle)
      if (touchDragIndex !== null) {
        e.preventDefault();
        if (!clipListRef.current) return;
        const children = clipListRef.current.children;
        for (let i = 0; i < children.length; i++) {
          const rect = children[i].getBoundingClientRect();
          if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            const side = touch.clientY < rect.top + rect.height / 2 ? 'top' : 'bottom';
            setDragOverIndex(i);
            setDragOverSide(side);
            break;
          }
        }
        return;
      }

      // Handle swipe-to-delete (initiated from row body)
      if (swipeIndex !== null) {
        const dx = touch.clientX - swipeStartX.current;
        const dy = touch.clientY - touchDragStartY.current;

        // Determine direction on first significant move
        if (swipeDirection.current === null) {
          if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
            swipeDirection.current = Math.abs(dx) > Math.abs(dy) ? 'horizontal' : 'vertical';
          }
          return;
        }

        if (swipeDirection.current === 'horizontal') {
          e.preventDefault();
          // Only allow left swipe (negative)
          setSwipeOffset(Math.min(0, dx));
        }
      }
    };

    const onTouchEnd = () => {
      // Finalize drag reorder
      if (touchDragIndex !== null && dragOverIndex !== null) {
        let to = dragOverSide === 'bottom' ? dragOverIndex + 1 : dragOverIndex;
        if (to > touchDragIndex) to -= 1;
        if (to !== touchDragIndex) onReorderClips(touchDragIndex, to);
      }
      setTouchDragIndex(null);
      setDragOverIndex(null);
      setDragOverSide(null);

      // Finalize swipe-to-delete
      if (swipeIndex !== null) {
        if (swipeOffset < -100) {
          // Threshold reached — delete
          const clipToRemove = clips[swipeIndex];
          if (clipToRemove) onRemoveClip(clipToRemove.id);
        }
        setSwipeOffset(0);
        setSwipeIndex(null);
        swipeDirection.current = null;
      }
    };

    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [touchDragIndex, swipeIndex, swipeOffset, dragOverIndex, dragOverSide, clips, onReorderClips, onRemoveClip]);

  const duration = inPoint !== null && outPoint !== null ? outPoint - inPoint : null;
  const canAdd = inPoint !== null && outPoint !== null;

  const isAnyExporting = ffmpeg.status === 'loading' || ffmpeg.status === 'processing';
  const isExportingAll = isAnyExporting && ffmpeg.exportingClipId === '__all__';
  const canExportAll = !!videoSource && clips.length > 0 && !isAnyExporting;

  const handleAdd = () => {
    const name = clipName.trim() || ClipListStrings.clipNamePlaceholder(clips.length + 1);
    onAddClip(name);
    setClipName('');
  };

  const handleExportAll = () => {
    if (isGif(globalOptions)) {
      setGifExportAllPending(true);
    } else {
      if (videoSource) ffmpeg.exportAllClips(videoSource, clips, globalOptions, filenameHint);
    }
  };

  const handleDrop = (targetIndex: number) => {
    if (dragFromIndex === null) return;
    let to = dragOverSide === 'bottom' ? targetIndex + 1 : targetIndex;
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
    <>
      {gifExportAllPending && (
        <GifWarningDialog
          onConfirm={() => {
            setGifExportAllPending(false);
            if (videoSource) ffmpeg.exportAllClips(videoSource, clips, globalOptions, filenameHint);
          }}
          onCancel={() => setGifExportAllPending(false)}
        />
      )}

      <div className="w-full max-w-4xl mx-auto mt-3 tablet:mt-4 rounded-md border border-[#333] bg-[#1a1a1e] p-2 tablet:p-3" data-tour="clip-list">
        <div className="text-[9px] tablet:text-[11px] uppercase tracking-wider text-[#aaa] mb-2 tablet:mb-3">{ClipListStrings.sectionHeading}</div>

        <div className="flex gap-2 tablet:gap-3 mb-3">
          <div className="flex-1 rounded border border-[#333] bg-[#111] px-2 tablet:px-3 py-1.5 tablet:py-2">
            <div className="text-[9px] tablet:text-[10px] uppercase text-[#999] mb-0.5">{ClipListStrings.labelInPoint}</div>
            <div className={`font-mono text-xs tablet:text-sm ${inPoint !== null ? 'text-[#c8f55a]' : 'text-[#999]'}`}>
              {inPoint !== null ? formatTime(inPoint) : '—'}
            </div>
          </div>
          <div className="flex-1 rounded border border-[#333] bg-[#111] px-2 tablet:px-3 py-1.5 tablet:py-2">
            <div className="text-[9px] tablet:text-[10px] uppercase text-[#999] mb-0.5">{ClipListStrings.labelOutPoint}</div>
            <div className={`font-mono text-xs tablet:text-sm ${outPoint !== null ? 'text-[#f55a5a]' : 'text-[#999]'}`}>
              {outPoint !== null ? formatTime(outPoint) : '—'}
            </div>
          </div>
          <div className="flex-1 rounded border border-[#333] bg-[#111] px-2 tablet:px-3 py-1.5 tablet:py-2">
            <div className="text-[9px] tablet:text-[10px] uppercase text-[#999] mb-0.5">{ClipListStrings.labelDuration}</div>
            <div className={`font-mono text-xs tablet:text-sm ${duration !== null ? 'text-[#ccc]' : 'text-[#999]'}`}>
              {duration !== null ? formatTime(duration) : '—'}
            </div>
          </div>
        </div>

        <div className="flex flex-col mobile-landscape:flex-row gap-2 mb-4" data-tour="add-clip">
          <input
            type="text"
            placeholder={ClipListStrings.clipNamePlaceholder(clips.length + 1)}
            value={clipName}
            onChange={(e) => setClipName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canAdd && handleAdd()}
            className="flex-1 rounded border border-[#333] bg-[#111] px-3 py-1.5 text-sm text-[#ccc] placeholder-[#444] focus:border-[#c8f55a]/60"
            disabled={!canAdd}
          />
          <button
            onClick={handleAdd}
            disabled={!canAdd || isAddingClip}
            className="min-h-[44px] tablet:min-h-0 rounded border border-[#c8f55a]/40 bg-[#2a2a2e] px-4 tablet:px-4 py-1.5 text-xs tablet:text-sm text-[#c8f55a] hover:bg-[#c8f55a]/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isAddingClip ? ClipListStrings.addingClip : ClipListStrings.btnAddClip}
          </button>
        </div>

        {clips.length === 0 ? (
          <div className="text-center text-xs text-[#999] py-4">
            {ClipListStrings.emptyState}
          </div>
        ) : (
          <div ref={clipListRef} className="flex flex-col gap-1.5 tablet:overflow-visible overflow-x-auto -mx-2 tablet:mx-0 px-2 tablet:px-0">
            {clips.map((clip, i) => (
              <ClipRow
                key={clip.id}
                clip={clip}
                index={i}
                isDragOver={dragOverIndex === i}
                dragOverSide={dragOverIndex === i ? dragOverSide : null}
                videoSource={videoSource}
                ffmpeg={ffmpeg}
                globalOptions={globalOptions}
                isTouchDragging={touchDragIndex === i}
                swipeOffset={swipeIndex === i ? swipeOffset : 0}
                onDragStart={(idx) => setDragFromIndex(idx)}
                onDragEnter={(idx, side) => { setDragOverIndex(idx); setDragOverSide(side); }}
                onDragEnd={handleDragEnd}
                onDrop={handleDrop}
                onTouchDragStart={handleTouchDragStart}
                onSwipeStart={handleSwipeStart}
                onRemove={() => onRemoveClip(clip.id)}
                onSeek={() => onSeekToClip(clip)}
                onPreview={() => onPreviewClip(clip)}
                onRename={(name) => onUpdateClip(clip.id, { name })}
                onEditPoints={() => onSeekToClip(clip)}
                onEnqueue={(options) => onEnqueueClip(clip, options)}
                onInstantExport={(options) => { if (videoSource) ffmpeg.exportClip(videoSource, clip, options, filenameHint); }}
                onMoveUp={i > 0 ? () => onReorderClips(i, i - 1) : null}
                onMoveDown={i < clips.length - 1 ? () => onReorderClips(i, i + 1) : null}
              />
            ))}
          </div>
        )}

        {/* Export All */}
        {clips.length > 0 && (
          <div className="mt-3 flex flex-col gap-1.5">
            <button
              onClick={handleExportAll}
              disabled={!canExportAll}
              className="w-full rounded border border-[#c8f55a]/30 bg-[#1e2a0e] px-4 py-2 text-sm font-medium text-[#c8f55a] hover:bg-[#c8f55a]/10 hover:border-[#c8f55a]/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {isExportingAll
                ? ffmpeg.status === 'loading'
                  ? ClipListStrings.loadingFfmpegAll
                  : ClipListStrings.exportAllProgress(Math.round(ffmpeg.progress * 100))
                : ffmpeg.status === 'done' && ffmpeg.exportingClipId === null
                  ? ClipListStrings.exportDone
                  : ClipListStrings.exportAllLabel(clips.length, FORMAT_LABELS[globalOptions.format])}
            </button>

            {isExportingAll && ffmpeg.status === 'processing' && (
              <div className="h-0.5 w-full rounded-full bg-[#2a2a2e] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#c8f55a] transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.round(ffmpeg.progress * 100)}%` }}
                />
              </div>
            )}

            {isExportingAll && ffmpeg.status === 'loading' && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-[#888] border-t-transparent rounded-full animate-spin shrink-0" role="status" aria-label="Loading FFmpeg" />
                <p className="text-[10px] text-[#aaa]">{ClipListStrings.loadingFfmpegFirst}</p>
              </div>
            )}

            {!isAnyExporting && ffmpeg.status === 'error' && ffmpeg.error && ffmpeg.exportingClipId === null && (
              <p className="text-[10px] text-[#f55a5a]">{ClipListStrings.exportError(ffmpeg.error!)}</p>
            )}
          </div>
        )}

        <p className="mt-3 text-[9px] tablet:text-[10px] text-[#999] hidden mobile-landscape:block">
          {ClipListStrings.keyboardHintHeading}{' '}
          <kbd className="rounded bg-[#222] px-1 py-px text-[#999]">I</kbd> set in ·{' '}
          <kbd className="rounded bg-[#222] px-1 py-px text-[#999]">O</kbd> set out · drag{' '}
          <span className="text-[#999]">⠿</span> to reorder · click name to rename ·{' '}
          <span className="text-[#999]">✎</span> loads clip back into timeline ·{' '}
          <span className="text-[#999]">⚙</span> per-clip export settings ·{' '}
          <span className="text-[#999]">⬇</span> instant export ·{' '}
          <span className="text-[#999]">+</span> add to queue
        </p>
      </div>
    </>
  );
}

export default ClipList;