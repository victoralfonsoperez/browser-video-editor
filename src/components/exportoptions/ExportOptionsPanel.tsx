import type { ExportOptions, ExportFormat, ExportQuality, ExportResolution } from '../../types/exportOptions';
import { ExportOptionsStrings } from '../../constants/ui';
import {
  FORMAT_LABELS,
  QUALITY_LABELS,
  RESOLUTION_LABELS,
  FORMATS,
  QUALITIES,
  RESOLUTIONS,
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
  choices: readonly T[];
  labels: Record<T, string>;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="mb-1 text-[10px] uppercase tracking-wider text-fg-muted">{label}</p>
      <div className="flex gap-1">
        {choices.map((choice) => (
          <button
            key={choice}
            onClick={() => onChange(choice)}
            className={[
              'rounded border px-2 py-1 text-[11px] transition-colors cursor-pointer',
              value === choice
                ? 'border-accent/60 bg-accent/10 text-accent'
                : 'border-control bg-base text-fg-muted hover:border-edge-strong hover:text-fg-2',
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
  const formats = FORMATS;
  const qualities = QUALITIES;
  const resolutions = RESOLUTIONS;

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
        <p className="rounded border border-warn/30 bg-warn/5 px-2 py-1.5 text-[10px] text-warn">
          {ExportOptionsStrings.gifWarningBodyPanel}
        </p>
      )}
    </div>
  );
}