export type ExportFormat = 'mp4' | 'webm' | 'mov' | 'gif';
export type ExportQuality = 'low' | 'medium' | 'high';
export type ExportResolution = 'original' | '1080p' | '720p' | '480p';

export interface ExportOptions {
  format: ExportFormat;
  quality: ExportQuality;
  resolution: ExportResolution;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'mp4',
  quality: 'high',
  resolution: 'original',
};

export const FORMAT_LABELS: Record<ExportFormat, string> = {
  mp4: 'MP4',
  webm: 'WebM',
  mov: 'MOV',
  gif: 'GIF',
};

export const QUALITY_LABELS: Record<ExportQuality, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const RESOLUTION_LABELS: Record<ExportResolution, string> = {
  original: 'Original',
  '1080p': '1080p',
  '720p': '720p',
  '480p': '480p',
};

/** Returns the output file extension for a given format. */
export function formatToExtension(format: ExportFormat): string {
  return format; // all format values are already valid extensions
}

/** CRF value for libx264 quality mapping */
export const H264_CRF: Record<ExportQuality, number> = { low: 32, medium: 23, high: 18 };
/** CRF value for libvpx-vp9 quality mapping */
export const WEBM_CRF: Record<ExportQuality, number> = { low: 40, medium: 33, high: 24 };

/** GIF palette size per quality */
export const GIF_COLORS: Record<ExportQuality, number> = { low: 64, medium: 128, high: 256 };

/** Scale filter for a given resolution (null = keep original) */
export function resolutionToScaleFilter(resolution: ExportResolution): string | null {
  const map: Record<ExportResolution, string | null> = {
    original: null,
    '1080p': 'scale=-2:1080',
    '720p': 'scale=-2:720',
    '480p': 'scale=-2:480',
  };
  return map[resolution];
}
