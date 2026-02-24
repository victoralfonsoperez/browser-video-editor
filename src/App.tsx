import { useState, useRef, useEffect } from 'react';
import VideoPlayer from './components/videoplayer/videoplayer';
import Timeline from './components/timeline/timeline';
import { ClipList } from './components/cliplist/ClipList';
import { useTrimMarkers } from './hooks/useTrimMarkers';
import { useClipThumbnail } from './hooks/useClipThumbnail';
import { useFFmpeg } from './hooks/useFFmpeg';
import { useExportQueue } from './hooks/useExportQueue';
import { ClipPreviewModal } from './components/clippreview/ClipPreviewModal';
import { ExportQueueOverlay } from './components/exportqueue/ExportQueueOverlay';
import { ExportOptionsPanel } from './components/exportoptions/ExportOptionsPanel';
import type { ExportOptions } from './types/exportOptions';
import { DEFAULT_EXPORT_OPTIONS, FORMAT_LABELS, QUALITY_LABELS } from './types/exportOptions';
import type { Clip } from './hooks/useTrimMarkers';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [globalOptions, setGlobalOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trim = useTrimMarkers(duration);
  const captureFrame = useClipThumbnail();
  const ffmpeg = useFFmpeg();
  const exportQueue = useExportQueue(videoFile, ffmpeg);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('video/')) return;
    if (file.size > 500 * 1024 * 1024) { alert('File too large (max 500MB)'); return; }
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(file);
    setVideoURL(URL.createObjectURL(file));
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

  const handleAddClip = async (name: string) => {
    let thumbnailDataUrl: string | undefined;
    if (videoRef.current && trim.inPoint !== null) {
      thumbnailDataUrl = await captureFrame(videoRef.current, trim.inPoint);
    }
    trim.addClip(name, thumbnailDataUrl);
  };

  useEffect(() => { return () => { if (videoURL) URL.revokeObjectURL(videoURL); }; }, [videoURL]);

  return (
    <div className="min-h-screen bg-[#111114] text-[#e0e0e0] p-5">
      <div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between">
          <h1 className="text-xl font-bold uppercase tracking-widest text-[#ccc]">Video Editor</h1>

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
                title="Global export settings"
              >
                <span>⚙</span>
                <span className="text-xs font-mono text-[#888]">
                  {FORMAT_LABELS[globalOptions.format]} · {QUALITY_LABELS[globalOptions.quality]}
                </span>
              </button>

              {showGlobalSettings && (
                <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-[#333] bg-[#1a1a1e] p-3 shadow-xl">
                  <p className="mb-3 text-[10px] uppercase tracking-wider text-[#888]">
                    Default Export Settings
                  </p>
                  <ExportOptionsPanel options={globalOptions} onChange={setGlobalOptions} />
                  <p className="mt-2 text-[10px] text-[#555]">
                    Applied to new clips and Export All. Individual clips can override these.
                  </p>
                </div>
              )}
            </div>

            {videoFile && (
              <button
                onClick={() => { if (videoURL) URL.revokeObjectURL(videoURL); setVideoFile(null); setVideoURL(undefined); }}
                className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
              >
                Load Different Video
              </button>
            )}
          </div>
        </div>

        {!videoFile ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-[#333] bg-[#1a1a1e] py-20 text-[#555]">
            <p className="text-base">Open a video file to get started</p>
            <label className="cursor-pointer rounded bg-[#c8f55a] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#111] hover:bg-[#d8ff70] transition-colors">
              Choose File
              <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </label>
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
            />
            <Timeline
              currentTime={currentTime}
              duration={duration}
              onSeek={handleTimelineSeek}
              videoRef={videoRef}
              trim={trim}
            />
            <ClipList
              clips={trim.clips}
              inPoint={trim.inPoint}
              outPoint={trim.outPoint}
              videoFile={videoFile}
              ffmpeg={ffmpeg}
              globalOptions={globalOptions}
              onAddClip={handleAddClip}
              onRemoveClip={trim.removeClip}
              onSeekToClip={handleSeekToClip}
              onUpdateClip={trim.updateClip}
              onReorderClips={trim.reorderClips}
              onPreviewClip={setPreviewClip}
              onEnqueueClip={exportQueue.enqueue}
            />
          </>
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
      />

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