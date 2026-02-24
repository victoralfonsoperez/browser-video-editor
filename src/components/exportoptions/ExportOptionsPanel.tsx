import type {
  OutputFormat,
  QualityPreset,
  Resolution,
  ExportOptions,
} from '../../types/exportOptions';
import {
  FORMAT_LABELS,
  QUALITY_LABELS,
  RESOLUTION_LABELS,
} from '../../types/exportOptions';

interface ExportOptionsPanelProps {
  value: ExportOptions;
  onChange: (next: ExportOptions) => void;
  /** When true, renders compact layout for the per-clip popover. */
  compact?: boolean;
}

const FORMATS: OutputFormat[] = ['mp4', 'webm', 'mov', 'gif'];
const QUALITIES: QualityPreset[] = ['low', 'medium', 'high'];
const RESOLUTIONS: Resolution[] = ['original', '1080p', '720p', '480p'];

function SegmentedControl<T extends string>({
  label,
  options,
  labels,
  value,
  onChange,
}: {
  label: string;
  options: T[];
  labels: Record<T, string>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[#555]">{label}</span>
      <div className="flex rounded border border-[#2a2a2e] overflow-hidden">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={[
              'flex-1 py-1 text-[11px] transition-colors cursor-pointer',
              value === opt
                ? 'bg-[#c8f55a] text-[#111] font-semibold'
                : 'bg-[#1a1a1e] text-[#777] hover:text-[#ccc] hover:bg-[#2a2a2e]',
            ].join(' ')}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExportOptionsPanel({ value, onChange, compact = false }: ExportOptionsPanelProps) {
  const set = <K extends keyof ExportOptions>(key: K, val: ExportOptions[K]) =>
    onChange({ ...value, [key]: val });

  return (
    <div className={`flex flex-col gap-${compact ? '2' : '3'} ${compact ? 'p-2 rounded border border-[#2a2a2e] bg-[#111] w-56' : ''}`}>
      <SegmentedControl
        label="Format"
        options={FORMATS}
        labels={FORMAT_LABELS}
        value={value.format}
        onChange={(v) => set('format', v)}
      />
      <SegmentedControl
        label="Quality"
        options={QUALITIES}
        labels={QUALITY_LABELS}
        value={value.quality}
        onChange={(v) => set('quality', v)}
      />
      <SegmentedControl
        label="Resolution"
        options={RESOLUTIONS}
        labels={RESOLUTION_LABELS}
        value={value.resolution}
        onChange={(v) => set('resolution', v)}
      />
      {value.format === 'gif' && (
        <p className="text-[10px] text-[#f5a623] leading-tight">
          GIF has no audio. You will be asked to confirm before export.
        </p>
      )}
    </div>
  );
}
