import { useState, useRef, useEffect } from 'react';
import VideoPlayer from './components/videoplayer/videoplayer';
import Timeline from './components/timeline/timeline';
import { ClipList } from './components/cliplist/ClipList';
import { useTrimMarkers } from './hooks/useTrimMarkers';
import { useClipThumbnail } from './hooks/useClipThumbnail';
import type { Clip } from './hooks/useTrimMarkers';

function App() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const trim = useTrimMarkers(duration);
  const captureFrame = useClipThumbnail();

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
          {videoFile && (
            <button
              onClick={() => { if (videoURL) URL.revokeObjectURL(videoURL); setVideoFile(null); setVideoURL(undefined); }}
              className="rounded border border-[#444] bg-[#2a2a2e] px-3 py-1.5 text-sm text-[#ccc] hover:bg-[#3a3a3e] transition-colors cursor-pointer"
            >
              Load Different Video
            </button>
          )}
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
              onAddClip={handleAddClip}
              onRemoveClip={trim.removeClip}
              onSeekToClip={handleSeekToClip}
              onUpdateClip={trim.updateClip}
              onReorderClips={trim.reorderClips}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;