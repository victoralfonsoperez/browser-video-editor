/**
 * Centralised UI string constants.
 *
 * Grouped by feature area. Dynamic values are expressed as small factory
 * functions so call-sites stay readable while still benefiting from a single
 * source-of-truth.
 */

// ---------------------------------------------------------------------------
// Shared — strings that appear in more than one component
// ---------------------------------------------------------------------------
export const SharedStrings = {
  btnPlay: '▶ Play',
  btnPause: '⏸ Pause',
  btnCancel: 'Cancel',
  btnClose: '✕',
  btnClear: 'Clear',
  separator: '→',
} as const;

// ---------------------------------------------------------------------------
// App shell
// ---------------------------------------------------------------------------
export const AppStrings = {
  title: 'Video Editor',
  titleGlobalSettings: 'Global export settings',
  headingDefaultSettings: 'Default Export Settings',
  helpDefaultSettings:
    'Applied to new clips and Export All. Individual clips can override these.',
  btnLoadDifferentVideo: 'Load Different Video',
  emptyStatePrompt: 'Open a video file to get started',
  btnChooseFile: 'Choose File',
  alertFileTooLarge: 'File too large (max 500MB)',
  alertNotVideoFile: 'Please select a video file',
  tabLocalFile: 'Local File',
  tabGoogleDrive: 'Google Drive',
  driveUrlPlaceholder: 'Paste Google Drive sharing URL…',
  btnLoadFromDrive: 'Load',
  errorInvalidDriveUrl: 'Not a valid Google Drive sharing URL',
  driveLabelSource: 'Google Drive',
} as const;

// ---------------------------------------------------------------------------
// Video player
// ---------------------------------------------------------------------------
export const VideoPlayerStrings = {
  labelFile: 'File:',
  labelSize: 'Size:',
  labelType: 'Type:',
  labelDuration: 'Duration:',
  labelResolution: 'Resolution:',
  titleMute: 'Mute',
  titleUnmute: 'Unmute',
  shortcutsHint: 'Space/K = Play/Pause | ←/→ = ±5s | J/L = ±10s | ,/. = Frame | Home/End | M = Mute',
  errorVideoLoad: 'Video failed to load — the format or codec may not be supported by your browser.',
  errorVideoNetwork: 'Network error — could not fetch the video. Check the URL or try again.',
  loadingVideo: 'Loading...',
} as const;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
export const TimelineStrings = {
  generatingThumbnails: 'Generating thumbnails...',
  emptyState: 'Load a video to see the timeline',
  btnFrameBack: '◀ Frame',
  btnFrameForward: 'Frame ▶',
  btnSetIn: 'Set In',
  btnSetOut: 'Set Out',
  titleSetIn: 'Set in-point (I)',
  titleSetOut: 'Set out-point (O)',
  titleInMarker: 'In point (drag or press I)',
  titleOutMarker: 'Out point (drag or press O)',
  inPointPrefix: 'In:',
  outPointPrefix: 'Out:',
  thumbnailCount: (n: number) => `${n} thumbnails`,
  thumbnailAlt: (time: number) => `t=${time}s`,
} as const;

// ---------------------------------------------------------------------------
// Clip list
// ---------------------------------------------------------------------------
export const ClipListStrings = {
  sectionHeading: 'Clip Definition',
  labelInPoint: 'In Point',
  labelOutPoint: 'Out Point',
  labelDuration: 'Duration',
  btnAddClip: 'Add Clip',
  emptyState: "Set in/out points and add clips — they'll appear here",
  titleDragToReorder: 'Drag to reorder',
  titlePreviewClip: 'Preview clip',
  titleSeekToInPoint: 'Seek to in-point',
  titleClickToRename: 'Click to rename',
  titleEditPoints: 'Load in/out points into timeline for editing',
  titlePerClipSettings: 'Per-clip export settings',
  headingClipSettings: 'Clip Export Settings',
  btnReset: 'Reset',
  titleReset: 'Reset to global defaults',
  titleExportInstant: 'Export this clip instantly',
  titleAddToQueue: 'Add to export queue',
  titleRemoveClip: 'Remove clip',
  loadingFfmpeg: 'Loading…',
  loadingFfmpegFirst: 'Loading FFmpeg (first export only)…',
  loadingFfmpegAll: 'Loading FFmpeg…',
  exportDone: '✓ Done',
  gifWarningHeading: 'Export as GIF?',
  gifWarningBody:
    'GIF format does not support audio. The audio track will be dropped. This also uses a slower two-pass encode.',
  btnExportAnyway: 'Export anyway',
  keyboardHintHeading: 'Keyboard:',
  clipNamePlaceholder: (n: number) => `Clip ${n}`,
  exportProgress: (pct: number) => `${pct}%`,
  exportAllProgress: (pct: number) => `Exporting… ${pct}%`,
  exportAllLabel: (count: number, format: string) =>
    `⬇ Export All (${count} clip${count === 1 ? '' : 's'}) · ${format}`,
  exportError: (msg: string) => `Export error: ${msg}`,
  clipThumbnailAlt: (name: string) => `Thumbnail for ${name}`,
  addingClip: 'Capturing...',
} as const;

// ---------------------------------------------------------------------------
// Clip preview modal
// ---------------------------------------------------------------------------
export const ClipPreviewStrings = {
  titleClose: 'Close (Esc)',
  labelLoop: 'Loop',
  keySpace: 'Space',
  hintPlayPause: 'play/pause ·',
  keyEsc: 'Esc',
  hintClose: 'close',
} as const;

// ---------------------------------------------------------------------------
// Export options — shared by ExportOptionsPanel and ExportOptionsModal
// ---------------------------------------------------------------------------
export const ExportOptionsStrings = {
  labelFormat: 'Format',
  labelQuality: 'Quality',
  labelResolution: 'Resolution',
  gifWarningHeading: 'GIF exports have no audio',
  gifWarningBodyModal:
    'GIF format does not support audio. The audio track will be dropped. Export also requires a two-pass encode and may be slower.',
  gifWarningBodyPanel:
    "GIF has no audio and uses a two-pass encode. You'll be asked to confirm before exporting.",
  btnGifAcknowledge: 'Got it, continue',
  gifAcknowledged: 'Acknowledged ✓',
  qualityHighDesc: 'Best visual quality, larger file size.',
  qualityMediumDesc: 'Balanced quality and file size.',
  qualityLowDesc: 'Smallest file size, reduced quality.',
  resolutionScaleNote:
    'Aspect ratio will be preserved. Upscaling is avoided — if the source is smaller, the original size is kept.',
  modalHeading: 'Export Options',
  btnAddToQueue: 'Add to Queue',
} as const;

// ---------------------------------------------------------------------------
// Export queue overlay
// ---------------------------------------------------------------------------
export const ExportQueueStrings = {
  heading: 'Export Queue',
  btnPause: 'Pause',
  titlePause: 'Pause after current item finishes',
  btnStart: 'Start',
  btnResume: 'Resume',
  titleStart: 'Start processing the queue',
  titleClear: 'Clear finished items',
  titleExpand: 'Expand',
  titleCollapse: 'Collapse',
  titleRemove: 'Remove from queue',
  labelOverall: 'Overall',
  statusAllDone: 'All done',
  statusIdle: 'Idle',
  collapsedProgress: (pct: number, done: number, total: number) =>
    `${pct}% · ${done}/${total} done`,
  collapsedPending: (n: number, started: boolean) =>
    `${n} pending · ${started ? 'started' : 'not started'}`,
  btnRetry: 'Retry',
  titleRetry: 'Re-add this item to the queue',
} as const;
