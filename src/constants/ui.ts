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
/** Maximum allowed video file size in bytes (500 MB). */
export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;

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
  title: 'BrowserCut',
  titleGlobalSettings: 'Global export settings',
  headingDefaultSettings: 'Default Export Settings',
  helpDefaultSettings:
    'Applied to new clips and Export All. Individual clips can override these.',
  headingPreferences: 'Preferences',
  labelShowHighlightsOnTimeline: 'Show highlights on timeline',
  btnLoadDifferentVideo: 'Load Different Video',
  emptyStatePrompt: 'Open a video file to get started',
  emptyStateTagline: 'Trim, clip, and export videos entirely in your browser.',
  emptyStatePrivacy: 'Nothing is uploaded — all processing happens on your device.',
  workflowSteps: [
    { label: 'Load', desc: 'Open a video file or paste a Drive link' },
    { label: 'Trim', desc: 'Set in & out points on the timeline' },
    { label: 'Clip', desc: 'Save named segments from your video' },
    { label: 'Export', desc: 'Download clips as MP4, WebM, or GIF' },
  ] as const,
  btnChooseFile: 'Choose File',
  alertFileTooLarge: 'File too large (max 500MB)',
  alertNotVideoFile: 'Please select a video file',
  tabLocalFile: 'Local File',
  tabGoogleDrive: 'Google Drive',
  driveUrlPlaceholder: 'Paste Google Drive sharing URL…',
  btnLoadFromDrive: 'Load',
  errorInvalidDriveUrl: 'Not a valid Google Drive sharing URL',
  driveLabelSource: 'Google Drive',
  driveFilenamePlaceholder: 'Enter a filename for exports…',
  driveFilenameLabel: 'Filename not detected.',
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
  btnVolume: '♪',
  btnMuted: '♪ ✕',
  ariaVolume: 'Volume',
  shortcutsHint: 'Space/K = Play/Pause | ←/→ = ±5s | J/L = ±10s | ,/. = Frame | Home/End | M = Mute',
  errorVideoAborted: 'Video loading was aborted.',
  errorVideoNetwork: 'Network error — could not fetch the video. Check the URL or try again.',
  errorVideoDecode: 'Video is corrupted or uses an unsupported codec.',
  errorVideoUnsupported: 'Video failed to load — the format or codec may not be supported by your browser.',
  errorVideoUnknown: 'An unknown error occurred while loading the video.',
  errorVideoNoDuration: 'Video has no playable content.',
  errorVideoAudioOnly: 'File appears to be audio-only.',
  loadingVideo: 'Loading...',
} as const;

// ---------------------------------------------------------------------------
// Timeline
// ---------------------------------------------------------------------------
export const TimelineStrings = {
  generatingThumbnails: 'Generating thumbnails...',
  emptyState: 'Load a video to see the timeline',
  btnFrameBack: '← Frame',
  btnFrameForward: 'Frame →',
  ariaFrameBack: 'Step back one frame',
  ariaFrameForward: 'Step forward one frame',
  btnSetIn: 'Set Start',
  btnSetOut: 'Set End',
  btnMark: 'Highlight',
  titleSetIn: 'Set start point (I)',
  titleSetOut: 'Set end point (O)',
  titleMark: 'Add a highlight at the playhead, or from current start/end range (H)',
  titleClearMarkers: 'Clear start/end',
  titleInMarker: 'Start — drag or press I',
  titleOutMarker: 'End — drag or press O',
  inPointPrefix: 'Start:',
  outPointPrefix: 'End:',
  thumbnailCount: (n: number) => `${n} thumbnails`,
  thumbnailAlt: (time: number) => `t=${time}s`,
  btnZoomIn: '+',
  btnZoomOut: '−',
  btnZoomReset: '1×',
  titleZoomIn: 'Zoom in (+)',
  titleZoomOut: 'Zoom out (−)',
  titleZoomReset: 'Reset zoom',
  ariaZoomIn: 'Zoom in',
  ariaZoomOut: 'Zoom out',
  ariaZoomReset: 'Reset zoom to 1×',
  ariaMinimapScroll: 'Timeline overview — click to navigate',
  labelZoom: (z: number) => `${z % 1 === 0 ? z : z.toFixed(1)}×`,
  timecodeTitle: 'Click to seek to a timecode (mm:ss.f)',
  timecodeAriaLabel: (t: string) => `Current time ${t} — click to edit`,
  timecodeInputAriaLabel: 'Seek to timecode',
  timecodePlaceholder: '0:00.0',
} as const;

// ---------------------------------------------------------------------------
// Clip list
// ---------------------------------------------------------------------------
export const ClipListStrings = {
  sectionHeading: 'Clips',
  labelInPoint: 'Start',
  labelOutPoint: 'End',
  labelDuration: 'Duration',
  btnAddClip: 'Add Clip',
  emptyState: "Set start/end and add clips — they'll appear here",
  titleDragToReorder: 'Drag to reorder',
  titlePreviewClip: 'Preview clip',
  titleSeekToInPoint: 'Seek to start',
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
    `Export All (${count} clip${count === 1 ? '' : 's'}) · ${format}`,
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
// Highlight list
// ---------------------------------------------------------------------------
export const HighlightListStrings = {
  sectionHeading: 'Highlights',
  emptyState: 'No highlights yet',
  titleSeek: 'Seek to highlight',
  titleLoadIntoTimeline: 'Load range into timeline',
  titleClickToRename: 'Click to rename',
  titleRemove: 'Remove highlight',
  btnExport: 'Export',
  btnLoad: 'Load',
  titleExport: 'Download highlights as .highlights.json',
  titleLoad: 'Load highlights from a .highlights.json file',
  toastExportSuccess: 'Highlights exported',
  toastLoadSuccess: 'Highlights loaded',
  toastLoadError: (msg: string) => `Could not load highlights: ${msg}`,
  btnTimeline: 'Timeline',
  titleCollapse: 'Collapse',
  titleExpand: 'Expand',
  titleShowOnTimeline: 'Show highlights on timeline',
  titleHideFromTimeline: 'Hide highlights from timeline',
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
