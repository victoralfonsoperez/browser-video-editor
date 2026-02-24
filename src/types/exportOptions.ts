// ---------------------------------------------------------------------------
// Export option types & constants
// ---------------------------------------------------------------------------

export type ExportFormat = 'mp4' | 'webm' | 'mov' | 'gif';
export type QualityPreset = 'low' | 'medium' | 'high';
export type Resolution = 'original' | '1080p' | '720p' | '480p';

export interface ExportOptions {
  format: ExportFormat;
  quality: QualityPreset;
  resolution: Resolution;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'mp4',
  quality: 'high',
  resolution: 'original',
};

// Human-readable labels
export const FORMAT_LABELS: Record<ExportFormat, string> = {
  mp4: 'MP4 (H.264)',
  webm: 'WebM (VP8)',
  mov: 'MOV (H.264)',
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

// ---------------------------------------------------------------------------
// FFmpeg command builder
// ---------------------------------------------------------------------------

/** CRF values for libx264 / libvpx. Lower = better quality / larger file. */
const H264_CRF: Record<QualityPreset, number> = { high: 18, medium: 23, low: 32 };
const WEBM_CRF: Record<QualityPreset, number> = { high: 10, medium: 24, low: 40 };

/** GIF palette size per quality preset */
const GIF_COLORS: Record<QualityPreset, number> = { high: 256, medium: 128, low: 64 };

/** Target height in pixels for each resolution (null = keep source) */
const RESOLUTION_HEIGHT: Record<Resolution, number | null> = {
  original: null,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
};

/**
 * Returns the FFmpeg -vf scale filter string, or null if no scaling needed.
 * Keeps aspect ratio with -2 (rounds to even width required by most codecs).
 */
function scaleFilter(resolution: Resolution): string | null {
  const h = RESOLUTION_HEIGHT[resolution];
  return h ? `scale=-2:${h}` : null;
}

/**
 * Builds the FFmpeg argument array for a single clip trim + encode.
 *
 * For GIF, returns TWO exec calls: first generates a palette, second renders.
 * The caller must detect the array-of-arrays shape and run both.
 */
export type FFmpegArgs = string[];
export type FFmpegCommand =
  | { kind: 'single'; args: FFmpegArgs }
  | { kind: 'gif'; paletteArgs: FFmpegArgs; renderArgs: FFmpegArgs };

export function buildExportCommand(
  inputName: string,
  outputName: string,
  inPoint: number,
  outPoint: number,
  options: ExportOptions,
): FFmpegCommand {
  const scale = scaleFilter(options.resolution);
  const timingFlags = ['-ss', String(inPoint), '-to', String(outPoint)];

  if (options.format === 'gif') {
    // Two-pass GIF: generate palette → render with palette
    const paletteFile = '__palette.png';
    const colors = GIF_COLORS[options.quality];
    const scaleAndPalette = scale
      ? `${scale},palettegen=max_colors=${colors}`
      : `palettegen=max_colors=${colors}`;
    const scaleAndUse = scale
      ? `${scale} [x]; [x][1:v] paletteuse`
      : '[0:v][1:v] paletteuse';

    return {
      kind: 'gif',
      paletteArgs: [
        ...timingFlags,
        '-i', inputName,
        '-vf', scaleAndPalette,
        '-frames:v', '1',
        paletteFile,
      ],
      renderArgs: [
        ...timingFlags,
        '-i', inputName,
        '-i', paletteFile,
        '-filter_complex', scaleAndUse,
        '-loop', '0',
        outputName,
      ],
    };
  }

  // MP4 / MOV — libx264
  if (options.format === 'mp4' || options.format === 'mov') {
    const crf = H264_CRF[options.quality];
    const vf = scale ? ['-vf', scale] : [];
    return {
      kind: 'single',
      args: [
        ...timingFlags,
        '-i', inputName,
        '-c:v', 'libx264',
        '-crf', String(crf),
        '-preset', 'ultrafast',
        '-c:a', 'aac',
        '-avoid_negative_ts', 'make_zero',
        ...vf,
        outputName,
      ],
    };
  }

  // WebM — libvpx
  const crf = WEBM_CRF[options.quality];
  const vf = scale ? ['-vf', scale] : [];
  return {
    kind: 'single',
    args: [
      ...timingFlags,
      '-i', inputName,
      '-c:v', 'libvpx',
      '-crf', String(crf),
      '-b:v', '0',
      '-c:a', 'libvorbis',
      '-avoid_negative_ts', 'make_zero',
      ...vf,
      outputName,
    ],
  };
}
