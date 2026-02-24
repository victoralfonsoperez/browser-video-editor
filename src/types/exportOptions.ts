export type OutputFormat = 'mp4' | 'webm' | 'mov' | 'gif';
export type QualityPreset = 'low' | 'medium' | 'high';
export type Resolution = 'original' | '1080p' | '720p' | '480p';

export interface ExportOptions {
  format: OutputFormat;
  quality: QualityPreset;
  resolution: Resolution;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'mp4',
  quality: 'high',
  resolution: 'original',
};

export const FORMAT_LABELS: Record<OutputFormat, string> = {
  mp4: 'MP4',
  webm: 'WebM',
  mov: 'MOV',
  gif: 'GIF',
};

export const QUALITY_LABELS: Record<QualityPreset, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const RESOLUTION_LABELS: Record<Resolution, string> = {
  original: 'Original',
  '1080p': '1080p',
  '720p': '720p',
  '480p': '480p',
};

/** Height in pixels for each resolution cap. */
export const RESOLUTION_HEIGHT: Record<Resolution, number | null> = {
  original: null,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
};

/**
 * CRF (Constant Rate Factor) values per quality preset for H.264 / VP9.
 * Lower = better quality / larger file.
 */
export const H264_CRF: Record<QualityPreset, number> = { low: 35, medium: 23, high: 18 };
export const VP9_CRF: Record<QualityPreset, number> = { low: 45, medium: 33, high: 24 };

/** GIF fps per quality preset. */
export const GIF_FPS: Record<QualityPreset, number> = { low: 10, medium: 15, high: 24 };
