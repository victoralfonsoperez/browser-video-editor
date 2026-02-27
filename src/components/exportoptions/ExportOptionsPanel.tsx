import type { ExportOptions, ExportFormat, ExportQuality, ExportResolution } from '../../types/exportOptions';
import { ExportOptionsStrings } from '../../constants/ui';
import {
  FORMAT_LABELS,
  QUALITY_LABELS,
  RESOLUTION_LABELS,
} from '../../types/exportOptions';

interface ExportOptionsPanelProps {
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
}

function OptionGroup<T extends string>({
  label,
  value,
  choices,
  labels,
  onChange,
}: {
  label: string;
  value: T;
  choices: T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-[#555]">{label}</p>
      <div className="flex gap-1">
        {choices.map((choice) => (
          <button
            key={choice}
            onClick={() => onChange(choice)}
            className={[
              'rounded border px-2 py-1 text-[11px] transition-colors cursor-pointer',
              value === choice
                ? 'border-[#c8f55a]/60 bg-[#c8f55a]/10 text-[#c8f55a]'
                : 'border-[#2a2a2e] bg-[#111] text-[#666] hover:border-[#444] hover:text-[#aaa]',
            ].join(' ')}
          >
            {labels[choice]}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ExportOptionsPanel({ options, onChange }: ExportOptionsPanelProps) {
  const formats: ExportFormat[] = ['mp4', 'webm', 'mov', 'gif'];
  const qualities: ExportQuality[] = ['low', 'medium', 'high'];
  const resolutions: ExportResolution[] = ['original', '1080p', '720p', '480p'];

  return (
    <div className="flex flex-col gap-3">
      <OptionGroup<ExportFormat>
        label={ExportOptionsStrings.labelFormat}
        value={options.format}
        choices={formats}
        labels={FORMAT_LABELS}
        onChange={(format) => onChange({ ...options, format })}
      />
      <OptionGroup<ExportQuality>
        label={ExportOptionsStrings.labelQuality}
        value={options.quality}
        choices={qualities}
        labels={QUALITY_LABELS}
        onChange={(quality) => onChange({ ...options, quality })}
      />
      <OptionGroup<ExportResolution>
        label={ExportOptionsStrings.labelResolution}
        value={options.resolution}
        choices={resolutions}
        labels={RESOLUTION_LABELS}
        onChange={(resolution) => onChange({ ...options, resolution })}
      />
      {options.format === 'gif' && (
        <p className="rounded border border-[#f5a623]/30 bg-[#f5a623]/5 px-2 py-1.5 text-[10px] text-[#f5a623]">
          {ExportOptionsStrings.gifWarningBodyPanel}
        </p>
      )}
    </div>
  );
}