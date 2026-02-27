import { useState } from 'react';
import { SharedStrings, ExportOptionsStrings } from '../../constants/ui';
import type { Clip } from '../../hooks/useTrimMarkers';
import {
  FORMAT_LABELS,
  QUALITY_LABELS,
  RESOLUTION_LABELS,
} from '../../types/exportOptions';
import type { ExportFormat, ExportOptions, QualityPreset, Resolution } from '../../types/exportOptions';

interface ExportOptionsModalProps {
  clip: Clip;
  defaultOptions: ExportOptions;
  onConfirm: (clip: Clip, options: ExportOptions) => void;
  onCancel: () => void;
}

const FORMATS: ExportFormat[] = ['mp4', 'webm', 'mov', 'gif'];
const QUALITIES: QualityPreset[] = ['high', 'medium', 'low'];
const RESOLUTIONS: Resolution[] = ['original', '1080p', '720p', '480p'];

function formatTime(seconds: number) {
  if (isNaN(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
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
          ? 'border-[#c8f55a]/70 bg-[#c8f55a]/10 text-[#c8f55a]'
          : 'border-[#333] bg-[#111] text-[#777] hover:border-[#555] hover:text-[#aaa]',
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
      <div className="w-full max-w-sm rounded-lg border border-[#333] bg-[#111] shadow-2xl shadow-black/80 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2e] bg-[#1a1a1e]">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-[#888]">{ExportOptionsStrings.modalHeading}</p>
            <p className="text-sm font-medium text-[#ccc] mt-0.5 truncate max-w-[200px]" title={clip.name}>
              {clip.name}
            </p>
          </div>
          <span className="text-xs text-[#555] font-mono">
            {formatTime(clip.inPoint)} → {formatTime(clip.outPoint)}
          </span>
        </div>

        <div className="px-4 py-4 flex flex-col gap-5">

          {/* Format */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#666] mb-2">{ExportOptionsStrings.labelFormat}</p>
            <div className="flex flex-wrap gap-2">
              {FORMATS.map((f) => (
                <OptionButton key={f} value={f} selected={options.format === f} label={FORMAT_LABELS[f]} onClick={(v) => set('format', v)} />
              ))}
            </div>
          </div>

          {/* GIF warning */}
          {options.format === 'gif' && (
            <div className="rounded border border-[#f5a623]/30 bg-[#f5a623]/5 px-3 py-2.5">
              <p className="text-xs text-[#f5a623] font-medium mb-1">{ExportOptionsStrings.gifWarningHeading}</p>
              <p className="text-[11px] text-[#a87830] leading-relaxed">
                {ExportOptionsStrings.gifWarningBodyModal}
              </p>
              {!gifWarningAcknowledged && (
                <button
                  onClick={() => setGifWarningAcknowledged(true)}
                  className="mt-2 rounded border border-[#f5a623]/40 px-3 py-1 text-xs text-[#f5a623] hover:bg-[#f5a623]/10 transition-colors cursor-pointer"
                >
                  {ExportOptionsStrings.btnGifAcknowledge}
                </button>
              )}
              {gifWarningAcknowledged && (
                <p className="mt-1.5 text-[10px] text-[#888]">{ExportOptionsStrings.gifAcknowledged}</p>
              )}
            </div>
          )}

          {/* Quality */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#666] mb-2">{ExportOptionsStrings.labelQuality}</p>
            <div className="flex gap-2">
              {QUALITIES.map((q) => (
                <OptionButton key={q} value={q} selected={options.quality === q} label={QUALITY_LABELS[q]} onClick={(v) => set('quality', v)} />
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-[#555]">
              {options.quality === 'high' && ExportOptionsStrings.qualityHighDesc}
              {options.quality === 'medium' && ExportOptionsStrings.qualityMediumDesc}
              {options.quality === 'low' && ExportOptionsStrings.qualityLowDesc}
            </p>
          </div>

          {/* Resolution */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-[#666] mb-2">{ExportOptionsStrings.labelResolution}</p>
            <div className="flex flex-wrap gap-2">
              {RESOLUTIONS.map((r) => (
                <OptionButton key={r} value={r} selected={options.resolution === r} label={RESOLUTION_LABELS[r]} onClick={(v) => set('resolution', v)} />
              ))}
            </div>
            {options.resolution !== 'original' && (
              <p className="mt-1.5 text-[10px] text-[#555]">
                {ExportOptionsStrings.resolutionScaleNote}
              </p>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-[#2a2a2e] bg-[#1a1a1e]">
          <button
            onClick={onCancel}
            className="rounded border border-[#333] bg-[#2a2a2e] px-4 py-1.5 text-sm text-[#888] hover:text-[#ccc] hover:border-[#555] transition-colors cursor-pointer"
          >
            {SharedStrings.btnCancel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={showGifWarning}
            className="rounded border border-[#c8f55a]/40 bg-[#c8f55a]/10 px-4 py-1.5 text-sm font-medium text-[#c8f55a] hover:bg-[#c8f55a]/20 hover:border-[#c8f55a]/70 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
          >
            {ExportOptionsStrings.btnAddToQueue}
          </button>
        </div>
      </div>
    </div>
  );
}
