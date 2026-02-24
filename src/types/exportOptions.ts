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

/** GIF does not support audio — callers should warn the user before proceeding. */
export function isGif(options: ExportOptions): boolean {
  return options.format === 'gif';
}