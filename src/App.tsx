import { useState, useRef, useEffect } from 'react';
import VideoPlayer from './components/videoplayer/videoplayer';
import Timeline from './components/timeline/timeline';

function App() {
  const [videoFile, setVideoFile] = useState(null);
  const [videoURL, setVideoURL] = useState<string | undefined>(undefined);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    if (!file || !file.type.startsWith('video/')) return;
    
    if (file.size > 500 * 1024 * 1024) {
      alert('File too large (max 500MB)');
      return;
    }

    if (videoURL) URL.revokeObjectURL(videoURL);

    const url = URL.createObjectURL(file);
    setVideoFile(file);
    setVideoURL(url);
  };

  // Handle seek from timeline
  const handleTimelineSeek = (newTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Update current time from video
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  // Update duration when metadata loads
  const handleLoadedMetadata = (value: number) => {
    if (value) {
      setDuration(value);
    }
  };

  useEffect(() => {
    return () => {
      if (videoURL) URL.revokeObjectURL(videoURL);
    };
  }, [videoURL]);

  return (
    <div style={{ padding: '20px' }}>
      <h1 className="text-3xl font-bold underline">Video Editor</h1>
      
      {!videoFile ? (
        <div>
          <input 
            type="file" 
            accept="video/*"
            onChange={handleFileChange}
          />
        </div>
      ) : (
        <>
          {/* Video Player */}
          <VideoPlayer ref={videoRef} videoURL={videoURL} videoFile={videoFile} handleTimeUpdate={handleTimeUpdate} handleLoadMetadata={handleLoadedMetadata} currentTime={currentTime} />

          {/* Timeline */}
          <Timeline
            currentTime={currentTime}
            duration={duration}
            onSeek={handleTimelineSeek}
            videoRef={videoRef}
          />

          {videoURL ? <button 
            onClick={() => {
              URL.revokeObjectURL(videoURL);
              setVideoFile(null);
              setVideoURL(undefined);
            }}
            style={{ marginTop: '20px' }}
          >
            Load Different Video
          </button> : null}
        </>
      )}
    </div>
  );
}

export default App;