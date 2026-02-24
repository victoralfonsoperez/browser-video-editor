import type { ExportOptions, ExportFormat, ExportQuality, ExportResolution } from '../../types/exportOptions';
import {
  FORMAT_LABELS, QUALITY_LABELS, RESOLUTION_LABELS,
} from '../../types/exportOptions';

interface ExportOptionsPanelProps {
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
  /** When true, renders in compact inline mode (no outer card chrome) */
  inline?: boolean;
}

const FORMATS: ExportFormat[] = ['mp4', 'webm', 'mov', 'gif'];
const QUALITIES: ExportQuality[] = ['low', 'medium', 'high'];
const RESOLUTIONS: ExportResolution[] = ['original', '1080p', '720p', '480p'];

function OptionGroup<T extends string>({
  label,
  options,
  value,
  labels,
  onChange,
}: {
  label: string;
  options: T[];
  value: T;
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wider text-[#555]">{label}</span>
      <div className="flex gap-1 flex-wrap">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => onChange(opt)}
            className={[
              'rounded px-2 py-0.5 text-xs transition-colors cursor-pointer border',
              value === opt
                ? 'border-[#c8f55a]/60 bg-[#c8f55a]/10 text-[#c8f55a]'
                : 'border-[#333] bg-[#111] text-[#888] hover:border-[#555] hover:text-[#ccc]',
            ].join(' ')}
          >
            {labels[opt]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExportOptionsPanel({ options, onChange, inline = false }: ExportOptionsPanelProps) {
  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    onChange({ ...options, [key]: value });

  const content = (
    <div className="flex flex-col gap-3">
      <OptionGroup
        label="Format"
        options={FORMATS}
        value={options.format}
        labels={FORMAT_LABELS}
        onChange={(v) => set('format', v)}
      />
      <OptionGroup
        label="Quality"
        options={QUALITIES}
        value={options.quality}
        labels={QUALITY_LABELS}
        onChange={(v) => set('quality', v)}
      />
      <OptionGroup
        label="Resolution"
        options={RESOLUTIONS}
        value={options.resolution}
        labels={RESOLUTION_LABELS}
        onChange={(v) => set('resolution', v)}
      />
      {options.format === 'gif' && (
        <p className="text-[10px] text-[#f5a623] leading-snug">
          ⚠ GIF has no audio. You'll be warned before each GIF export.
        </p>
      )}
    </div>
  );

  if (inline) return content;

  return (
    <div className="rounded-lg border border-[#333] bg-[#1a1a1e] p-3 shadow-xl shadow-black/60">
      <p className="text-[11px] uppercase tracking-wider text-[#888] font-medium mb-3">
        Export Settings
      </p>
      {content}
    </div>
  );
}
