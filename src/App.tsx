import { useState, useRef, useEffect, type ChangeEvent } from 'react';
import { AppStrings, HighlightListStrings } from './constants/ui';
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
import { ClipPreviewModal } from './components/clippreview/ClipPreviewModal';
import { ExportQueueOverlay } from './components/exportqueue/ExportQueueOverlay';
import { ExportOptionsPanel } from './components/exportoptions/ExportOptionsPanel';
import { ToastContainer } from './components/toasts/ToastContainer';
import { useToast } from './context/ToastContext';
import type { ExportOptions } from './types/exportOptions';
import { DEFAULT_EXPORT_OPTIONS, FORMAT_LABELS, QUALITY_LABELS } from './types/exportOptions';
import type { Clip } from './hooks/useTrimMarkers';
import type { Highlight } from './types/highlights';

function App() {
  const { showToast } = useToast();
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'file' | 'drive'>('file');
  const [driveInputUrl, setDriveInputUrl] = useState('');
  const [isDriveSource, setIsDriveSource] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [globalOptions, setGlobalOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [isCapturingThumbnail, setIsCapturingThumbnail] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [showHighlightsOnTimeline, setShowHighlightsOnTimeline] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trim = useTrimMarkers();
  const { highlights, addHighlight, removeHighlight, updateHighlight, exportJSON, importFromFile } = useHighlights();
  const captureFrame = useClipThumbnail();
  const ffmpeg = useFFmpeg();

  const isVideoLoaded = videoFile !== null || isDriveSource;
  const videoSource: File | string | null = videoFile ?? videoURL ?? null;

  const exportQueue = useExportQueue(videoSource, ffmpeg);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !files[0]) return;
    const file = files[0];
    if (!file.type.startsWith('video/')) {
      showToast(AppStrings.alertNotVideoFile, 'warning');
      return;
    }
    if (file.size > 500 * 1024 * 1024) { showToast(AppStrings.alertFileTooLarge, 'error'); return; }
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
    setIsDriveSource(false);
    trim.clearMarkers();
  };

  const handleDriveLoad = () => {
    const fileId = extractGoogleDriveFileId(driveInputUrl);
    if (!fileId) { showToast(AppStrings.errorInvalidDriveUrl, 'error'); return; }
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(null);
    setVideoURL(buildProxiedGoogleDriveUrl(fileId));
    setIsDriveSource(true);
    trim.clearMarkers();
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
    exportJSON();
    showToast(HighlightListStrings.toastExportSuccess, 'success');
  };

  const handleImportHighlights = async (file: File) => {
    try {
      await importFromFile(file);
      showToast(HighlightListStrings.toastLoadSuccess, 'success');
    } catch (err) {
      showToast(
        HighlightListStrings.toastLoadError(err instanceof Error ? err.message : String(err)),
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

  return (
    <div className="min-h-screen bg-[#111114] text-[#e0e0e0] p-5">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold uppercase tracking-widest text-[#ccc]">{AppStrings.title}</h1>

          <div className="flex items-center gap-2">
            {/* Global export settings */}
            <div className="relative">
              <button
                onClick={() => setShowGlobalSettings((s) => !s)}
                className={[
                  'flex items-center gap-1.5 rounded border px-3 py-1.5 text-sm transition-colors cursor-pointer',
                  showGlobalSettings
                    ? 'border-[#c8f55a]/60 bg-[#c8f55a]/10 text-[#c8f55a]'
                    : 'border-[#444] bg-[#2a2a2e] text-[#ccc] hover:bg-[#3a3a3e]',
                ].join(' ')}
                title={AppStrings.titleGlobalSettings}
              >
                <span>⚙</span>
                <span className="text-xs font-mono text-[#888]">
                  {FORMAT_LABELS[globalOptions.format]} · {QUALITY_LABELS[globalOptions.quality]}
                </span>
              </button>

              {showGlobalSettings && (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-[#333] bg-[#1a1a1e] p-3 shadow-xl">
                  <p className="mb-3 text-[10px] uppercase tracking-wider text-[#888]">
                    {AppStrings.headingDefaultSettings}
                  </p>
                  <ExportOptionsPanel options={globalOptions} onChange={setGlobalOptions} />
                  <p className="mt-2 text-[10px] text-[#555]">
                    {AppStrings.helpDefaultSettings}
                  </p>
                </div>
              )}
            </div>

            {isVideoLoaded && (
              <button
                onClick={() => { if (videoURL) URL.revokeObjectURL(videoURL); setVideoFile(null); setVideoURL(undefined); setIsDriveSource(false); setDriveInputUrl(''); }}
                className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
              >
                {AppStrings.btnLoadDifferentVideo}
              </button>
            )}
          </div>
        </div>

        {!isVideoLoaded ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-[#333] bg-[#1a1a1e] py-20 text-[#555]">
            {/* Source tabs */}
            <div className="flex rounded border border-[#333] overflow-hidden">
              <button
                onClick={() => setActiveTab('file')}
                className={[
                  'px-4 py-1.5 text-sm transition-colors cursor-pointer',
                  activeTab === 'file'
                    ? 'bg-[#c8f55a] text-[#111] font-bold'
                    : 'bg-[#1a1a1e] text-[#888] hover:text-[#ccc]',
                ].join(' ')}
              >
                {AppStrings.tabLocalFile}
              </button>
              <button
                onClick={() => setActiveTab('drive')}
                className={[
                  'px-4 py-1.5 text-sm transition-colors cursor-pointer',
                  activeTab === 'drive'
                    ? 'bg-[#c8f55a] text-[#111] font-bold'
                    : 'bg-[#1a1a1e] text-[#888] hover:text-[#ccc]',
                ].join(' ')}
              >
                {AppStrings.tabGoogleDrive}
              </button>
            </div>

            {activeTab === 'file' ? (
              <>
                <p className="text-base">{AppStrings.emptyStatePrompt}</p>
                <label className="cursor-pointer rounded bg-[#c8f55a] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#111] hover:bg-[#d8ff70] transition-colors">
                  {AppStrings.btnChooseFile}
                  <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
                </label>
              </>
            ) : (
              <div className="flex w-full max-w-sm gap-2">
                <input
                  type="text"
                  placeholder={AppStrings.driveUrlPlaceholder}
                  value={driveInputUrl}
                  onChange={(e) => setDriveInputUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDriveLoad()}
                  className="flex-1 rounded border border-[#333] bg-[#111] px-3 py-2 text-sm text-[#ccc] placeholder-[#444] outline-none focus:border-[#c8f55a]/60"
                />
                <button
                  onClick={handleDriveLoad}
                  className="rounded bg-[#c8f55a] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#111] hover:bg-[#d8ff70] transition-colors cursor-pointer"
                >
                  {AppStrings.btnLoadFromDrive}
                </button>
              </div>
            )}
          </div>
        ) : (
          <>
            <VideoPlayer
              ref={videoRef}
              videoURL={videoURL}
              videoFile={videoFile}
              handleTimeUpdate={handleTimeUpdate}
              handleLoadMetadata={handleLoadedMetadata}
              currentTime={currentTime}
              isModalOpen={!!previewClip}
            />
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

        <HighlightList
          highlights={highlights}
          onSeek={handleTimelineSeek}
          onRemove={removeHighlight}
          onRename={(id, label) => updateHighlight(id, { label })}
          onLoadIntoTimeline={handleLoadHighlightIntoTimeline}
          onExport={handleExportHighlights}
          onImport={handleImportHighlights}
          showOnTimeline={showHighlightsOnTimeline}
          onToggleOnTimeline={() => setShowHighlightsOnTimeline((v) => !v)}
        />

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
          />
        )}
      </div>

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