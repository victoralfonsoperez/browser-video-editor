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
import { extractGoogleDriveFileId, buildGoogleDriveDownloadUrl } from './utils/googleDrive';
import type { Clip } from './hooks/useTrimMarkers';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewClip, setPreviewClip] = useState<Clip | null>(null);
  const [driveInput, setDriveInput] = useState('');
  const [driveError, setDriveError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trim = useTrimMarkers(duration);
  const captureFrame = useClipThumbnail();
  const ffmpeg = useFFmpeg();
  const exportQueue = useExportQueue(videoFile, ffmpeg);

  const loadVideo = (file: File | null, url: string) => {
    if (videoURL) URL.revokeObjectURL(videoURL);
    setVideoFile(file);
    setVideoURL(url);
    trim.clearMarkers();
  };

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('video/')) return;
    if (file.size > 500 * 1024 * 1024) { alert('File too large (max 500MB)'); return; }
    loadVideo(file, URL.createObjectURL(file));
  };

  const handleDriveSubmit = () => {
    setDriveError(null);
    const trimmed = driveInput.trim();
    if (!trimmed) return;

    const fileId = extractGoogleDriveFileId(trimmed);
    if (!fileId) {
      setDriveError("Could not find a valid file ID in that URL. Make sure it's a Google Drive share link.");
      return;
    }

    const downloadUrl = buildGoogleDriveDownloadUrl(fileId);
    // Pass null for File — the app will use the URL directly.
    // Full fetching/proxying will be wired up when the proxy layer is added.
    loadVideo(null, downloadUrl);
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
          {(videoFile || videoURL) && (
            <button
              onClick={() => { if (videoURL) URL.revokeObjectURL(videoURL); setVideoFile(null); setVideoURL(undefined); setDriveInput(''); setDriveError(null); }}
              className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
            >
              Load Different Video
            </button>
          )}
        </div>

        {!videoFile && !videoURL ? (
          <div className="flex flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-[#333] bg-[#1a1a1e] py-20 text-[#555]">
            <p className="text-base">Open a video file to get started</p>
            <label className="cursor-pointer rounded bg-[#c8f55a] px-4 py-2 text-sm font-bold uppercase tracking-wider text-[#111] hover:bg-[#d8ff70] transition-colors">
              Choose File
              <input type="file" accept="video/*" className="hidden" onChange={handleFileChange} />
            </label>

            <div className="mt-2 flex w-full max-w-sm flex-col items-center gap-2">
              <div className="flex w-full items-center gap-2 text-xs text-[#444]">
                <div className="h-px flex-1 bg-[#333]" />
                <span>or load from Google Drive</span>
                <div className="h-px flex-1 bg-[#333]" />
              </div>
              <div className="flex w-full gap-2">
                <input
                  type="url"
                  placeholder="Paste Google Drive share link..."
                  value={driveInput}
                  onChange={(e) => { setDriveInput(e.target.value); setDriveError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleDriveSubmit()}
                  className="flex-1 rounded border border-[#333] bg-[#111114] px-3 py-2 text-sm text-[#ccc] placeholder-[#444] outline-none focus:border-[#555] transition-colors"
                />
                <button
                  onClick={handleDriveSubmit}
                  className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-2 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
                >
                  Load
                </button>
              </div>
              {driveError && (
                <p className="w-full text-xs text-red-400">{driveError}</p>
              )}
            </div>
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
    </div>
  );
}

export default App;
