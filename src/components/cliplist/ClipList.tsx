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
import { IconDownload, IconGrip, IconSettings } from '../shared/Icons';

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
    <span className="text-2xs text-fg-muted shrink-0">
      {FORMAT_LABELS[options.format]} · {QUALITY_LABELS[options.quality]}
      {options.resolution !== 'original' ? ` · ${RESOLUTION_LABELS[options.resolution]}` : ''}
    </span>
  );
}

/** Simple confirmation dialog for GIF exports */
function GifWarningDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-fade-in">
      <FocusTrap onEscape={onCancel}>
        <div className="w-72 rounded-lg border border-edge-mid bg-raised p-4 shadow-xl animate-scale-in">
          <p className="mb-1 text-sm font-semibold text-fg-1">{ClipListStrings.gifWarningHeading}</p>
          <p className="mb-4 text-xs text-fg-2">
            {ClipListStrings.gifWarningBody}
          </p>
          <div className="flex justify-end gap-2">
            <button
              onClick={onCancel}
              className="rounded border border-edge-mid bg-base px-3 py-1.5 text-xs text-fg-2 hover:text-fg-1 transition-colors cursor-pointer"
            >
              {SharedStrings.btnCancel}
            </button>
            <button
              onClick={onConfirm}
              className="rounded border border-warn/40 bg-warn/10 px-3 py-1.5 text-xs text-warn hover:bg-warn/20 transition-colors cursor-pointer"
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
  onRemove, onSeek, onPreview, onRename, onEnqueue, onInstantExport,
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
          <div className="absolute inset-0 flex items-center justify-end px-4 bg-danger/20 rounded">
            <span className={`text-xs font-medium ${swipeOffset < -100 ? 'text-danger' : 'text-fg-muted'}`}>
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
          'relative flex flex-col rounded border px-2 py-2 transition-colors group select-none',
          isDragOver ? 'border-accent/60 bg-accent/5' : 'border-transparent hover:bg-base',
          isTouchDragging ? 'opacity-50 scale-95' : '',
        ].join(' ')}
        style={swipeOffset !== 0 ? { transform: `translateX(${swipeOffset}px)`, transition: 'none' } : undefined}
      >
        {isDragOver && dragOverSide === 'top' && (
          <div className="pointer-events-none absolute -top-px left-0 right-0 h-0.5 rounded-full bg-accent" />
        )}
        {isDragOver && dragOverSide === 'bottom' && (
          <div className="pointer-events-none absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-accent" />
        )}

        <div className="flex gap-1.5 tablet:gap-2 items-start">
          <span
            className="cursor-grab text-fg-muted hover:text-fg-2 transition-colors text-sm tablet:text-base leading-none active:cursor-grabbing shrink-0 min-w-[44px] min-h-[44px] tablet:min-w-0 tablet:min-h-0 flex items-center justify-center touch-none pt-0.5"
            title={ClipListStrings.titleDragToReorder}
            onTouchStart={(e) => { e.stopPropagation(); onTouchDragStart(index, e.touches[0].clientY); }}
            aria-roledescription="sortable"
          ><IconGrip /></span>
          <span className="hidden tablet:flex flex-col shrink-0 opacity-0 focus-within:opacity-100 group-hover:opacity-100 transition-opacity pt-1">
            {onMoveUp && (
              <button onClick={onMoveUp} className="rounded px-0.5 text-2xs text-fg-muted hover:text-fg-1 hover:bg-control transition-colors cursor-pointer leading-tight" title="Move up" aria-label="Move clip up">▲</button>
            )}
            {onMoveDown && (
              <button onClick={onMoveDown} className="rounded px-0.5 text-2xs text-fg-muted hover:text-fg-1 hover:bg-control transition-colors cursor-pointer leading-tight" title="Move down" aria-label="Move clip down">▼</button>
            )}
          </span>

          <div className="flex-1 min-w-0 flex flex-col gap-1">
            {/* Row 1: clip identity */}
            <div className="flex items-center gap-1.5 tablet:gap-2">
              <span className="text-2xs text-fg-faint tabular-nums w-3 tablet:w-4 shrink-0">{index + 1}</span>
              <div
                className="shrink-0 w-[48px] tablet:w-[56px] h-[28px] tablet:h-[32px] rounded overflow-hidden bg-kbd border border-edge-mid cursor-pointer hover:border-accent/60 transition-colors"
                onClick={onPreview}
                title={ClipListStrings.titlePreviewClip}
              >
                {clip.thumbnailDataUrl ? (
                  <img src={clip.thumbnailDataUrl} alt={ClipListStrings.clipThumbnailAlt(clip.name)} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-fg-muted text-2xs">▶</div>
                )}
              </div>
              <div className="flex-1 min-w-0">
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
                    className="w-full rounded border border-accent/50 bg-raised px-1.5 py-0.5 text-xs tablet:text-sm text-fg-1 focus:border-accent"
                  />
                ) : (
                  <button onClick={startEdit} className="block w-full text-left text-xs tablet:text-sm text-fg-1 truncate hover:text-white transition-colors cursor-text" title={ClipListStrings.titleClickToRename}>
                    {clip.name}
                  </button>
                )}
              </div>
              <span className="font-mono text-2xs tablet:text-xs text-fg-1 shrink-0">{formatTime(clipDuration)}</span>
            </div>

            {/* Row 2: timecodes + actions */}
            <div className="flex items-center gap-1.5 tablet:gap-2">
              <span className="font-mono text-2xs text-accent/70 shrink-0 hidden mobile-landscape:inline">{formatTime(clip.inPoint)}</span>
              <span className="text-fg-faint text-2xs shrink-0 hidden mobile-landscape:inline">→</span>
              <span className="font-mono text-2xs text-danger/70 shrink-0 hidden mobile-landscape:inline">{formatTime(clip.outPoint)}</span>
              <OptionsBadge options={clipOptions} />

              <div className="flex items-center gap-0.5 tablet:gap-1 ml-auto shrink-0">
                <button onClick={onSeek} className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-2xs tablet:text-xs text-fg-2 hover:text-fg-1 hover:bg-control transition-colors cursor-pointer" title={ClipListStrings.titleSeekToInPoint} aria-label={ClipListStrings.titleSeekToInPoint}>▶</button>

                {/* ⚙ per-clip settings */}
                <div className="relative hidden tablet:block" ref={settingsRef}>
                  <button
                    onClick={() => setShowSettings((s) => !s)}
                    className={[
                      'rounded px-1.5 py-0.5 text-xs hover:bg-control transition-colors cursor-pointer',
                      showSettings ? 'text-accent' : 'text-fg-2 hover:text-accent',
                    ].join(' ')}
                    title={ClipListStrings.titlePerClipSettings}
                    aria-expanded={showSettings}
                    aria-label={ClipListStrings.titlePerClipSettings}
                  >
                    <IconSettings className="w-3.5 h-3.5" />
                  </button>

                  {showSettings && (
                    <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-lg bg-panel p-3 shadow-xl shadow-black/40 animate-scale-in origin-top-right">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-2xs uppercase tracking-wider text-fg-2">{ClipListStrings.headingClipSettings}</p>
                        <button
                          onClick={() => setClipOptions(globalOptions)}
                          className="text-2xs text-fg-muted hover:text-accent transition-colors cursor-pointer"
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
                  className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center gap-1 rounded px-2 py-0.5 text-2xs tablet:text-xs text-fg-2 hover:text-accent hover:bg-control transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title={ClipListStrings.titleExportInstant}
                  aria-label={ClipListStrings.titleExportInstant}
                >
                  {isThisExporting
                    ? ffmpeg.status === 'loading'
                      ? ClipListStrings.loadingFfmpeg
                      : ClipListStrings.exportProgress(Math.round(ffmpeg.progress * 100))
                    : <><IconDownload className="hidden tablet:block" /><span>Export</span></>}
                </button>
                <button
                  onClick={handleEnqueueClick}
                  disabled={!videoSource}
                  className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-2 py-0.5 text-2xs tablet:text-xs text-fg-2 hover:text-mark hover:bg-control transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                  title={ClipListStrings.titleAddToQueue}
                  aria-label={ClipListStrings.titleAddToQueue}
                >
                  Queue
                </button>
                <button onClick={onRemove} className="min-h-[44px] min-w-[44px] tablet:min-h-0 tablet:min-w-0 flex items-center justify-center rounded px-1 tablet:px-1.5 py-0.5 text-2xs tablet:text-xs text-fg-muted hover:text-danger hover:bg-control transition-colors cursor-pointer" title={ClipListStrings.titleRemoveClip} aria-label={ClipListStrings.titleRemoveClip}>{SharedStrings.btnClose}</button>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar + loading message for active per-clip export */}
        {isThisExporting && (
          <div className="mt-1.5 flex items-center gap-2">
            {ffmpeg.status === 'loading' ? (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-fg-muted border-t-transparent rounded-full animate-spin shrink-0" role="status" aria-label="Loading FFmpeg" />
                <p className="text-2xs text-fg-2">{ClipListStrings.loadingFfmpegFirst}</p>
              </div>
            ) : (
              <ProgressBar progress={ffmpeg.progress} className="flex-1" />
            )}
          </div>
        )}

        {/* Per-clip error */}
        {ffmpeg.exportingClipId === null && ffmpeg.status === 'error' && ffmpeg.error && (
          <p className="mt-1 text-2xs text-danger">{ClipListStrings.exportError(ffmpeg.error!)}</p>
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

      <div className="w-full max-w-4xl mx-auto mt-3 tablet:mt-4 rounded-md border border-edge-mid bg-raised p-2 tablet:p-3" data-tour="clip-list">
        <div className="text-xs tablet:text-sm font-semibold text-fg-1 mb-2 tablet:mb-3">{ClipListStrings.sectionHeading}</div>

        <div className="flex items-center gap-2 tablet:gap-3 mb-3 text-xs tablet:text-sm">
          <span className="flex items-center gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-fg-faint">{ClipListStrings.labelInPoint}</span>
            <span className={`font-mono ${inPoint !== null ? 'text-accent' : 'text-fg-faint'}`}>{inPoint !== null ? formatTime(inPoint) : '—'}</span>
          </span>
          <span className="text-edge-strong">→</span>
          <span className="flex items-center gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-fg-faint">{ClipListStrings.labelOutPoint}</span>
            <span className={`font-mono ${outPoint !== null ? 'text-danger' : 'text-fg-faint'}`}>{outPoint !== null ? formatTime(outPoint) : '—'}</span>
          </span>
          <span className="text-edge-strong">·</span>
          <span className="flex items-center gap-1.5">
            <span className="text-2xs uppercase tracking-wider text-fg-faint">{ClipListStrings.labelDuration}</span>
            <span className={`font-mono ${duration !== null ? 'text-fg-1' : 'text-fg-faint'}`}>{duration !== null ? formatTime(duration) : '—'}</span>
          </span>
        </div>

        <div className="flex flex-col mobile-landscape:flex-row gap-2 mb-4" data-tour="add-clip">
          <input
            type="text"
            placeholder={ClipListStrings.clipNamePlaceholder(clips.length + 1)}
            value={clipName}
            onChange={(e) => setClipName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && canAdd && handleAdd()}
            className="flex-1 rounded border border-edge-mid bg-base px-3 py-1.5 text-sm text-fg-1 placeholder-edge-strong focus:border-accent/60"
            disabled={!canAdd}
          />
          <button
            onClick={handleAdd}
            disabled={!canAdd || isAddingClip}
            className="min-h-[44px] tablet:min-h-0 rounded border border-accent/40 bg-control px-4 tablet:px-4 py-1.5 text-xs tablet:text-sm text-accent hover:bg-accent/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isAddingClip ? ClipListStrings.addingClip : ClipListStrings.btnAddClip}
          </button>
        </div>

        {clips.length === 0 ? (
          <div className="text-center text-xs text-fg-muted py-4">
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
              className="w-full rounded border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/15 hover:border-accent/60 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
              <div className="h-0.5 w-full rounded-full bg-control overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent transition-[width] duration-500 ease-out"
                  style={{ width: `${Math.round(ffmpeg.progress * 100)}%` }}
                />
              </div>
            )}

            {isExportingAll && ffmpeg.status === 'loading' && (
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 border border-fg-muted border-t-transparent rounded-full animate-spin shrink-0" role="status" aria-label="Loading FFmpeg" />
                <p className="text-2xs text-fg-2">{ClipListStrings.loadingFfmpegFirst}</p>
              </div>
            )}

            {!isAnyExporting && ffmpeg.status === 'error' && ffmpeg.error && ffmpeg.exportingClipId === null && (
              <p className="text-2xs text-danger">{ClipListStrings.exportError(ffmpeg.error!)}</p>
            )}
          </div>
        )}

        <p className="mt-3 text-2xs text-fg-muted hidden mobile-landscape:block">
          {ClipListStrings.keyboardHintHeading}{' '}
          <kbd className="rounded bg-kbd px-1 py-px text-fg-muted">I</kbd> set in ·{' '}
          <kbd className="rounded bg-kbd px-1 py-px text-fg-muted">O</kbd> set out · drag{' '}
          <span className="text-fg-muted inline-flex align-middle"><IconGrip /></span> to reorder · click name to rename ·{' '}
          <span className="text-fg-muted">▶</span> load into timeline ·{' '}
          <span className="text-fg-muted inline-flex align-middle"><IconDownload /></span> export ·{' '}
          <span className="text-fg-muted">+</span> add to queue · click thumbnail to preview
        </p>
      </div>
    </>
  );
}

export default ClipList;