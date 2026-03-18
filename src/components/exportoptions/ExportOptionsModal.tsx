import { useState } from 'react';
import { SharedStrings, ExportOptionsStrings } from '../../constants/ui';
import { formatTime } from '../../utils/formatTime';
import type { Clip } from '../../hooks/useTrimMarkers';
import {
  FORMAT_LABELS,
  QUALITY_LABELS,
  RESOLUTION_LABELS,
  FORMATS,
  QUALITIES,
  RESOLUTIONS,
} from '../../types/exportOptions';
import type { ExportOptions } from '../../types/exportOptions';

interface ExportOptionsModalProps {
  clip: Clip;
  defaultOptions: ExportOptions;
  onConfirm: (clip: Clip, options: ExportOptions) => void;
  onCancel: () => void;
}

function OptionButton<T extends string>({
  value,
  selected,
  label,
  onClick,
}: {
  value: T;
  selected: boolean;
  label: string;
  onClick: (v: T) => void;
}) {
  return (
    <button
      onClick={() => onClick(value)}
      className={[
        'rounded border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
        selected
          ? 'border-accent/70 bg-accent/10 text-accent'
          : 'border-edge-mid bg-base text-fg-muted hover:border-fg-faint hover:text-fg-2',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

export function ExportOptionsModal({
  clip,
  defaultOptions,
  onConfirm,
  onCancel,
}: ExportOptionsModalProps) {
  const [options, setOptions] = useState<ExportOptions>(defaultOptions);
  const [gifWarningAcknowledged, setGifWarningAcknowledged] = useState(false);

  const showGifWarning = options.format === 'gif' && !gifWarningAcknowledged;

  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
    if (key === 'format' && value !== 'gif') setGifWarningAcknowledged(false);
  };

  const handleConfirm = () => {
    if (showGifWarning) return;
    onConfirm(clip, options);
  };

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-lg border border-edge-mid bg-base shadow-2xl shadow-black/80 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-control bg-raised">
          <div>
            <p className="text-xs uppercase tracking-wider text-fg-2">{ExportOptionsStrings.modalHeading}</p>
            <p className="text-sm font-medium text-fg-1 mt-0.5 truncate max-w-[200px]" title={clip.name}>
              {clip.name}
            </p>
          </div>
          <span className="text-xs text-fg-muted font-mono">
            {formatTime(clip.inPoint)} → {formatTime(clip.outPoint)}
          </span>
        </div>

        <div className="px-4 py-4 flex flex-col gap-5">

          {/* Format */}
          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-muted mb-2">{ExportOptionsStrings.labelFormat}</p>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <OptionButton key={f} value={f} selected={options.format === f} label={FORMAT_LABELS[f]} onClick={(v) => set('format', v)} />
              ))}
            </div>
          </div>

          {/* GIF warning */}
          {options.format === 'gif' && (
            <div className="rounded border border-warn/30 bg-warn/5 px-3 py-2.5">
              <p className="text-xs text-warn font-medium mb-1">{ExportOptionsStrings.gifWarningHeading}</p>
              <p className="text-xs text-warn/70 leading-relaxed">
                {ExportOptionsStrings.gifWarningBodyModal}
              </p>
              {!gifWarningAcknowledged && (
                <button
                  onClick={() => setGifWarningAcknowledged(true)}
                  className="mt-2 rounded border border-warn/40 px-3 py-1 text-xs text-warn hover:bg-warn/10 transition-colors cursor-pointer"
                >
                  {ExportOptionsStrings.btnGifAcknowledge}
                </button>
              )}
              {gifWarningAcknowledged && (
                <p className="mt-1.5 text-2xs text-fg-2">{ExportOptionsStrings.gifAcknowledged}</p>
              )}
            </div>
          )}

          {/* Quality */}
          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-muted mb-2">{ExportOptionsStrings.labelQuality}</p>
            <div className="flex gap-2">
              {QUALITIES.map((q) => (
                <OptionButton key={q} value={q} selected={options.quality === q} label={QUALITY_LABELS[q]} onClick={(v) => set('quality', v)} />
              ))}
            </div>
            <p className="mt-1.5 text-2xs text-fg-muted">
              {options.quality === 'high' && ExportOptionsStrings.qualityHighDesc}
              {options.quality === 'medium' && ExportOptionsStrings.qualityMediumDesc}
              {options.quality === 'low' && ExportOptionsStrings.qualityLowDesc}
            </p>
          </div>

          {/* Resolution */}
          <div>
            <p className="text-2xs uppercase tracking-wider text-fg-muted mb-2">{ExportOptionsStrings.labelResolution}</p>
            <div className="flex flex-wrap gap-2">
              {RESOLUTIONS.map((r) => (
                <OptionButton key={r} value={r} selected={options.resolution === r} label={RESOLUTION_LABELS[r]} onClick={(v) => set('resolution', v)} />
              ))}
            </div>
            {options.resolution !== 'original' && (
              <p className="mt-1.5 text-2xs text-fg-muted">
                {ExportOptionsStrings.resolutionScaleNote}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-control bg-raised">
          <button
            onClick={onCancel}
            className="rounded border border-edge-mid bg-control px-4 py-1.5 text-sm text-fg-2 hover:text-fg-1 hover:border-fg-faint transition-colors cursor-pointer"
          >
            {SharedStrings.btnCancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={showGifWarning}
            className="rounded border border-accent/40 bg-accent/10 px-4 py-1.5 text-sm font-medium text-accent hover:bg-accent/20 hover:border-accent/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {ExportOptionsStrings.btnAddToQueue}
          </button>
        </div>
      </div>
    </div>
  );
}
