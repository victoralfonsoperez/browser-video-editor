import type { ExportOptions } from '../types/exportOptions';
import { H264_CRF, VP9_CRF, GIF_FPS, RESOLUTION_HEIGHT } from '../types/exportOptions';

/** Returns the output file extension for a given format. */
export function outputExtension(format: ExportOptions['format']): string {
  return format; // 'mp4' | 'webm' | 'mov' | 'gif'
}

/**
 * Builds a vf (video filter) string for resolution scaling.
 * scale=-2 keeps aspect ratio with a width divisible by 2 (required by most codecs).
 * Returns null when resolution is 'original'.
 */
function resolutionFilter(resolution: ExportOptions['resolution']): string | null {
  const h = RESOLUTION_HEIGHT[resolution];
  if (h === null) return null;
  return `scale=-2:min(${h}\\,ih)`;
}

/**
 * Builds the core FFmpeg argument list for a single clip export.
 *
 * The caller is responsible for:
 *  - writing the input file as `inputName` before calling exec
 *  - reading `outputName` after exec completes
 *
 * For GIF a two-pass palette approach is used:
 *   pass 1: generate palette PNG   (paletteArgs)
 *   pass 2: render GIF via palette (encodeArgs)
 */
export interface FFmpegArgSet {
  /** Pass-1 args (palette generation). Only present for GIF format. */
  paletteArgs?: string[];
  /** Main encode args. For GIF this is pass 2. */
  encodeArgs: string[];
  inputName: string;
  outputName: string;
  /** Intermediate palette file — only present for GIF. */
  paletteName?: string;
}

export function buildFFmpegArgs(
  clipName: string,
  inPoint: number,
  outPoint: number,
  sourceExt: string,
  options: ExportOptions,
): FFmpegArgSet {
  const ext = outputExtension(options.format);
  const safeName = clipName.replace(/[^a-z0-9_-]/gi, '_');
  const inputName = `input.${sourceExt}`;
  const outputName = `${safeName}.${ext}`;
  const scaleFilter = resolutionFilter(options.resolution);
  const seek = ['-ss', String(inPoint), '-to', String(outPoint)];

  if (options.format === 'gif') {
    const fps = GIF_FPS[options.quality];
    const paletteName = `${safeName}_palette.png`;
    const baseFilters = scaleFilter ? `fps=${fps},${scaleFilter}` : `fps=${fps}`;
    return {
      paletteArgs: [
        ...seek,
        '-i', inputName,
        '-vf', `${baseFilters},palettegen=stats_mode=diff`,
        '-y', paletteName,
      ],
      encodeArgs: [
        ...seek,
        '-i', inputName,
        '-i', paletteName,
        '-filter_complex', `[0:v]${baseFilters}[x];[x][1:v]paletteuse=dither=bayer`,
        '-an',
        outputName,
      ],
      inputName,
      outputName,
      paletteName,
    };
  }

  if (options.format === 'webm') {
    const crf = VP9_CRF[options.quality];
    const vfArgs: string[] = scaleFilter ? ['-vf', scaleFilter] : [];
    return {
      encodeArgs: [
        ...seek,
        '-i', inputName,
        ...vfArgs,
        '-c:v', 'libvpx-vp9',
        '-crf', String(crf),
        '-b:v', '0',
        '-c:a', 'libopus',
        '-avoid_negative_ts', 'make_zero',
        outputName,
      ],
      inputName,
      outputName,
    };
  }

  // mp4 or mov — both use H.264 + AAC
  const crf = H264_CRF[options.quality];
  const vfArgs: string[] = scaleFilter ? ['-vf', scaleFilter] : [];
  return {
    encodeArgs: [
      ...seek,
      '-i', inputName,
      ...vfArgs,
      '-c:v', 'libx264',
      '-crf', String(crf),
      '-preset', 'fast',
      '-c:a', 'aac',
      '-avoid_negative_ts', 'make_zero',
      outputName,
    ],
    inputName,
    outputName,
  };
}
