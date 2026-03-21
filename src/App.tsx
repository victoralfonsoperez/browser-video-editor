import { useState, useRef, useEffect, useCallback, type ChangeEvent } from 'react';
import { useTour, TOUR_KEY } from './hooks/useTour';
import { TourOverlay } from './components/onboarding/TourOverlay';
import { AppStrings, HighlightListStrings, MAX_FILE_SIZE_BYTES } from './constants/ui';
import { extractGoogleDriveFileId, buildProxiedGoogleDriveUrl } from './utils/googleDrive';
import VideoPlayer from './components/videoplayer/videoplayer';
import Timeline from './components/timeline/timeline';
import { ClipList } from './components/cliplist/ClipList';
import { HighlightList } from './components/highlightlist/HighlightList';
import { useTrimMarkers } from './hooks/useTrimMarkers';
import { useHighlights } from './hooks/useHighlights';
import { useClipThumbnail } from './hooks/useClipThumbnail';
import { useFFmpeg } from './hooks/useFFmpeg';
import { useExportQueue } from './hooks/useExportQueue';
import { usePreferences } from './hooks/usePreferences';
import { ClipPreviewModal } from './components/clippreview/ClipPreviewModal';
import { ExportQueueOverlay } from './components/exportqueue/ExportQueueOverlay';
import { ExportOptionsPanel } from './components/exportoptions/ExportOptionsPanel';
import { ToastContainer } from './components/toasts/ToastContainer';
import { useToast } from './context/ToastContext';
import { FORMAT_LABELS, QUALITY_LABELS } from './types/exportOptions';
import { IconSettings } from './components/shared/Icons';
import { getErrorMessage } from './utils/getErrorMessage';
import type { Clip } from './hooks/useTrimMarkers';
import type { Highlight } from './types/highlights';

function App() {
  const { showToast } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'file' | 'drive'>('file');
  const [driveInputUrl, setDriveInputUrl] = useState('');
  const [isDriveSource, setIsDriveSource] = useState(false);
  const [driveFilename, setDriveFilename] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [isCapturingThumbnail, setIsCapturingThumbnail] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const { globalOptions, setGlobalOptions, showHighlightsOnTimeline, toggleHighlightsOnTimeline } = usePreferences();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trim = useTrimMarkers();
  const { highlights, addHighlight, removeHighlight, updateHighlight, exportJSON, importFromFile, clearHighlights } = useHighlights();
  const captureFrame = useClipThumbnail();
  const ffmpeg = useFFmpeg();

  const isVideoLoaded = videoFile !== null || isDriveSource;
  const videoSource: File | string | null = videoFile ?? videoURL ?? null;

  const [customFilename, setCustomFilename] = useState('');
  const needsFilename = isDriveSource && !driveFilename;
  const effectiveFilenameHint = driveFilename ?? (customFilename.trim() || null);
  const videoName = videoFile?.name ?? effectiveFilenameHint ?? null;

  const exportQueue = useExportQueue(videoSource, ffmpeg, effectiveFilenameHint);
  const { tourState, startTour, nextStep, prevStep, closeTour } = useTour();
  // Declare ref BEFORE the useEffect that reads it (immutability rule)
  const hasAutoTriggeredTourRef = useRef<boolean>(false);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files[0]) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      showToast(AppStrings.alertNotVideoFile, 'warning');
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) { showToast(AppStrings.alertFileTooLarge, 'error'); return; }
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
    setIsDriveSource(false);
    setDriveFilename(null);
    setCustomFilename('');
    trim.clearMarkers();
    clearHighlights();
  };

  const handleDriveLoad = async () => {
    const fileId = extractGoogleDriveFileId(driveInputUrl);
    if (!fileId) { showToast(AppStrings.errorInvalidDriveUrl, 'error'); return; }
    if (videoURL) URL.revokeObjectURL(videoURL);
    const url = buildProxiedGoogleDriveUrl(fileId);
    setVideoFile(null);
    setDriveFilename(null);
    setCustomFilename('');
    setVideoURL(url);
    setIsDriveSource(true);
    trim.clearMarkers();
    clearHighlights();

    try {
      const res = await fetch(url, { method: 'HEAD' });
      const name = res.headers.get('x-drive-filename');
      if (name) setDriveFilename(name);
    } catch {
      // Filename fetch is best-effort; video still loads via the src attribute
    }
  };

  const handleTimelineSeek = (newTime: number) => {
    if (videoRef.current) { videoRef.current.currentTime = newTime; setCurrentTime(newTime); }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = (value: number) => {
    if (value) setDuration(value);
  };

  const handleVideoError = useCallback(() => {
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(null);
    setVideoURL(undefined);
    setIsDriveSource(false);
    setDriveFilename(null);
    setCustomFilename('');
    setDriveInputUrl('');
    clearHighlights();
  }, [videoURL, clearHighlights]);

  const handleSeekToClip = (clip: Clip) => {
    handleTimelineSeek(clip.inPoint);
    trim.setIn(clip.inPoint);
    trim.setOut(clip.outPoint);
  };

  const handleLoadHighlightIntoTimeline = (h: Highlight) => {
    handleTimelineSeek(h.time);
    trim.setIn(h.time);
    if (h.endTime !== undefined) trim.setOut(h.endTime);
  };

  const handleExportHighlights = () => {
    const name = videoFile?.name ?? driveFilename;
    exportJSON(name ? name.replace(/\.[^.]+$/, '') : undefined);
    showToast(HighlightListStrings.toastExportSuccess, 'success');
  };

  const handleImportHighlights = async (file: File) => {
    try {
      await importFromFile(file);
      showToast(HighlightListStrings.toastLoadSuccess, 'success');
    } catch (err) {
      showToast(
        HighlightListStrings.toastLoadError(getErrorMessage(err, String(err))),
        'error',
      );
    }
  };

  const handleMark = () => {
    if (trim.inPoint !== null && trim.outPoint !== null) {
      addHighlight(trim.inPoint, { endTime: trim.outPoint });
      trim.clearMarkers();
    } else {
      addHighlight(currentTime);
    }
  };

  const handleAddClip = async (name: string) => {
    let thumbnailDataUrl: string | undefined;
    if (videoRef.current && trim.inPoint !== null) {
      setIsCapturingThumbnail(true);
      try {
        thumbnailDataUrl = await captureFrame(videoRef.current, trim.inPoint);
      } finally {
        setIsCapturingThumbnail(false);
      }
    }
    trim.addClip(name, thumbnailDataUrl);
  };

  useEffect(() => { return () => { if (videoURL) URL.revokeObjectURL(videoURL); }; }, [videoURL]);

  const preloadFFmpeg = ffmpeg.preload;
  useEffect(() => {
    preloadFFmpeg();
  }, [preloadFFmpeg]);

  const [showReady, setShowReady] = useState(false);
  const ffmpegLoaded = ffmpeg.loaded;
  useEffect(() => {
    if (!ffmpegLoaded) return;
    setShowReady(true);
    const id = setTimeout(() => setShowReady(false), 2000);
    return () => clearTimeout(id);
  }, [ffmpegLoaded]);

  useEffect(() => {
    if (isVideoLoaded && !hasAutoTriggeredTourRef.current && !localStorage.getItem(TOUR_KEY)) {
      hasAutoTriggeredTourRef.current = true;
      startTour();
    }
  }, [isVideoLoaded, startTour]);

  return (
    <div className="min-h-screen bg-base text-fg p-2 mobile-landscape:p-3 tablet:p-5">
      <div className="mx-auto max-w-4xl">
        <div className="mb-3 tablet:mb-5 flex flex-col mobile-landscape:flex-row items-start mobile-landscape:items-center justify-between gap-2 mobile-landscape:gap-0">
          <h1 className="text-xl tablet:text-2xl font-bold uppercase tracking-wider text-fg">{AppStrings.title}</h1>

          <div className="flex items-center gap-2 w-full mobile-landscape:w-auto">
            {/* Global export settings */}
            <div className="relative">
              <button
                onClick={() => setShowGlobalSettings((s) => !s)}
                className={[
                  'flex items-center gap-1.5 rounded border px-2 tablet:px-3 py-1.5 text-xs tablet:text-sm transition-colors cursor-pointer flex-1 mobile-landscape:flex-initial justify-center mobile-landscape:justify-start',
                  showGlobalSettings
                    ? 'border-accent/60 bg-accent/10 text-accent'
                    : 'border-edge-strong bg-control text-fg-1 hover:bg-control-hover',
                ].join(' ')}
                title={AppStrings.titleGlobalSettings}
                aria-expanded={showGlobalSettings}
                aria-label={AppStrings.titleGlobalSettings}
              >
                <IconSettings className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs text-fg-2 hidden mobile-landscape:inline">
                  {FORMAT_LABELS[globalOptions.format]} · {QUALITY_LABELS[globalOptions.quality]}
                </span>
              </button>

              {showGlobalSettings && (
                <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-edge-mid bg-raised p-3 shadow-xl animate-scale-in origin-top-left">
                  <p className="mb-3 text-2xs uppercase tracking-wider text-fg-2">
                    {AppStrings.headingDefaultSettings}
                  </p>
                  <ExportOptionsPanel options={globalOptions} onChange={setGlobalOptions} />
                  <p className="mt-2 text-2xs text-fg-muted">
                    {AppStrings.helpDefaultSettings}
                  </p>

                  <div className="mt-3 border-t border-edge-mid pt-3">
                    <p className="mb-2 text-2xs uppercase tracking-wider text-fg-2">
                      {AppStrings.headingPreferences}
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-fg-1">
                      <input
                        type="checkbox"
                        checked={showHighlightsOnTimeline}
                        onChange={toggleHighlightsOnTimeline}
                        className="accent-accent"
                      />
                      {AppStrings.labelShowHighlightsOnTimeline}
                    </label>
                  </div>
                </div>
              )}
            </div>

            {ffmpeg.status === 'loading' && !ffmpeg.loaded && (
              <span className="flex items-center gap-1.5 text-xs text-fg-muted">
                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-fg-muted border-t-transparent" />
                Loading engine…
              </span>
            )}
            {showReady && (
              <span className="text-xs text-accent">✓ Ready</span>
            )}

            {isVideoLoaded && (
              <button
                onClick={startTour}
                className="rounded border border-edge-strong bg-control px-2 tablet:px-3 py-1.5 text-xs tablet:text-sm text-fg-2 hover:text-fg-1 hover:bg-control-hover transition-colors cursor-pointer"
                aria-label="Replay onboarding tour"
                title="Replay onboarding tour"
              >
                <span className="hidden tablet:inline">Tour</span>
                <span className="tablet:hidden">?</span>
              </button>
            )}

            {isVideoLoaded && (
              <button
                onClick={() => { if (videoURL) URL.revokeObjectURL(videoURL); setVideoFile(null); setVideoURL(undefined); setIsDriveSource(false); setDriveFilename(null); setCustomFilename(''); setDriveInputUrl(''); clearHighlights(); }}
                className="rounded border border-edge-strong bg-control px-2 tablet:px-3 py-1.5 text-xs tablet:text-sm text-fg-1 hover:bg-control-hover transition-colors cursor-pointer flex-1 mobile-landscape:flex-initial"
              >
                <span className="hidden tablet:inline">{AppStrings.btnLoadDifferentVideo}</span>
                <span className="tablet:hidden">Load New</span>
              </button>
            )}
          </div>
        </div>

        {!isVideoLoaded ? (
          <div className="rounded-lg border border-control bg-panel py-10 tablet:py-16 px-4">
            {/* Value proposition */}
            <div className="text-center mb-8 tablet:mb-10">
              <p className="text-sm tablet:text-base text-fg-1 mb-1.5">{AppStrings.emptyStateTagline}</p>
              <p className="text-xs text-fg-faint">{AppStrings.emptyStatePrivacy}</p>
            </div>

            {/* Workflow steps */}
            <div className="flex items-start justify-center gap-3 tablet:gap-6 mb-8 tablet:mb-10 max-w-lg mx-auto">
              {AppStrings.workflowSteps.map((step, i) => (
                <div key={step.label} className="flex flex-col items-center text-center flex-1 min-w-0">
                  <div className={[
                    'w-7 h-7 tablet:w-8 tablet:h-8 rounded-full flex items-center justify-center text-xs tablet:text-sm font-bold mb-1.5',
                    i === 0 ? 'bg-accent text-base' : 'bg-control text-fg-faint',
                  ].join(' ')}>
                    {i + 1}
                  </div>
                  <span className={[
                    'text-2xs tablet:text-xs font-semibold uppercase tracking-wider mb-0.5',
                    i === 0 ? 'text-accent' : 'text-fg-faint',
                  ].join(' ')}>{step.label}</span>
                  <span className="text-2xs text-fg-faint leading-tight hidden mobile-landscape:block">{step.desc}</span>
                </div>
              ))}
            </div>

            {/* Source tabs + input */}
            <div className="flex flex-col items-center gap-4">
              <div className="flex rounded border border-edge-mid overflow-hidden">
                <button
                  onClick={() => setActiveTab('file')}
                  className={[
                    'px-4 py-1.5 text-sm transition-colors cursor-pointer',
                    activeTab === 'file'
                      ? 'bg-accent text-base font-bold'
                      : 'bg-raised text-fg-2 hover:text-fg-1',
                  ].join(' ')}
                >
                  {AppStrings.tabLocalFile}
                </button>
                <button
                  onClick={() => setActiveTab('drive')}
                  className={[
                    'px-4 py-1.5 text-sm transition-colors cursor-pointer',
                    activeTab === 'drive'
                      ? 'bg-accent text-base font-bold'
                      : 'bg-raised text-fg-2 hover:text-fg-1',
                  ].join(' ')}
                >
                  {AppStrings.tabGoogleDrive}
                </button>
              </div>

              {activeTab === 'file' ? (
                <label className="cursor-pointer rounded bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-base hover:bg-accent-bright transition-colors">
                  {AppStrings.btnChooseFile}
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
              ) : (
                <div className="flex flex-col tablet:flex-row w-full max-w-sm gap-2">
                  <input
                    type="text"
                    placeholder={AppStrings.driveUrlPlaceholder}
                    value={driveInputUrl}
                    onChange={(e) => setDriveInputUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleDriveLoad()}
                    className="flex-1 rounded border border-edge-mid bg-base px-3 py-2 text-sm text-fg-1 placeholder-edge-strong focus:border-accent/60"
                  />
                  <button
                    onClick={handleDriveLoad}
                    className="rounded bg-accent px-4 py-2 text-sm font-bold uppercase tracking-wider text-base hover:bg-accent-bright transition-colors cursor-pointer"
                  >
                    {AppStrings.btnLoadFromDrive}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <VideoPlayer
              ref={videoRef}
              videoURL={videoURL}
              videoFile={videoFile}
              videoName={videoName}
              handleTimeUpdate={handleTimeUpdate}
              handleLoadMetadata={handleLoadedMetadata}
              currentTime={currentTime}
              isModalOpen={!!previewClip}
              onVideoError={handleVideoError}
            />
            {needsFilename && (
              <div className="flex items-center gap-2 mt-2 rounded border border-edge-mid bg-raised px-3 py-2">
                <span className="text-xs text-fg-muted shrink-0">{AppStrings.driveFilenameLabel}</span>
                <input
                  type="text"
                  placeholder={AppStrings.driveFilenamePlaceholder}
                  value={customFilename}
                  onChange={(e) => setCustomFilename(e.target.value)}
                  className="flex-1 rounded border border-edge-mid bg-base px-2 py-1 text-sm text-fg-1 placeholder-edge-strong focus:border-accent/60"
                />
              </div>
            )}
            <Timeline
              currentTime={currentTime}
              duration={duration}
              onSeek={handleTimelineSeek}
              onMark={handleMark}
              videoRef={videoRef}
              trim={trim}
              highlights={showHighlightsOnTimeline ? highlights : []}
            />
          </>
        )}

        {isVideoLoaded && (
          <ClipList
            clips={trim.clips}
            inPoint={trim.inPoint}
            outPoint={trim.outPoint}
            videoSource={videoSource}
            ffmpeg={ffmpeg}
            globalOptions={globalOptions}
            isAddingClip={isCapturingThumbnail}
            onAddClip={handleAddClip}
            onRemoveClip={trim.removeClip}
            onSeekToClip={handleSeekToClip}
            onUpdateClip={trim.updateClip}
            onReorderClips={trim.reorderClips}
            onPreviewClip={setPreviewClip}
            onEnqueueClip={exportQueue.enqueue}
            filenameHint={effectiveFilenameHint}
          />
        )}

        <HighlightList
          highlights={highlights}
          onSeek={handleTimelineSeek}
          onRemove={removeHighlight}
          onRename={(id, label) => updateHighlight(id, { label })}
          onLoadIntoTimeline={handleLoadHighlightIntoTimeline}
          onExport={handleExportHighlights}
          onImport={handleImportHighlights}
          showOnTimeline={showHighlightsOnTimeline}
          onToggleOnTimeline={toggleHighlightsOnTimeline}
        />
      </div>

      {/* Footer */}
      <footer className="mx-auto max-w-4xl mt-8 mb-2 flex items-center justify-center gap-2 text-2xs tablet:text-xs text-fg-faint">
        <span>v0.1.0</span>
        <span className="text-edge-strong">·</span>
        <span>Built by <a href="https://github.com/victoralfonsoperez" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-accent transition-colors">Victor Pérez</a></span>
        <span className="text-edge-strong">·</span>
        <a href="https://github.com/victoralfonsoperez/browsercut" target="_blank" rel="noopener noreferrer" className="text-fg-muted hover:text-accent transition-colors">GitHub</a>
      </footer>

      {previewClip && videoURL && (
        <ClipPreviewModal
          clip={previewClip}
          videoURL={videoURL}
          onClose={() => setPreviewClip(null)}
        />
      )}

      <ExportQueueOverlay
        queue={exportQueue.queue}
        isRunning={exportQueue.isRunning}
        isStarted={exportQueue.isStarted}
        ffmpegProgress={ffmpeg.progress}
        onStart={exportQueue.start}
        onPause={exportQueue.pause}
        onRemove={exportQueue.remove}
        onReorder={exportQueue.reorder}
        onClear={exportQueue.clear}
        onRetry={exportQueue.retry}
      />

      {tourState.isOpen && (
        <TourOverlay step={tourState.step} onNext={nextStep} onPrev={prevStep} onClose={closeTour} />
      )}

      <ToastContainer />

      {/* Close global settings when clicking outside */}
      {showGlobalSettings && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowGlobalSettings(false)}
        />
      )}
    </div>
  );
}

export default App;