import { useRef, useState, useCallback } from 'react'
import { VideoTimeline } from './components/VideoTimeline'
import { useVideoThumbnails } from './hooks/useVideoThumbnails'
import './App.css'

function App() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoSrc, setVideoSrc] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const { thumbnails, isGenerating, generateThumbnails } = useVideoThumbnails()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setVideoSrc(url)
    setCurrentTime(0)
    setDuration(0)
  }

  function handleLoadedMetadata() {
    const video = videoRef.current
    if (!video) return
    setDuration(video.duration)
    generateThumbnails(video, 2)
  }

  function handleTimeUpdate() {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime)
  }

  const handleSeek = useCallback((time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time
      setCurrentTime(time)
    }
  }, [])

  return (
    <div className="editor-layout">
      <header className="editor-header">
        <span className="editor-title">Browser Video Editor</span>
        <label className="open-btn">
          Open Video
          <input
            type="file"
            accept="video/*"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </label>
      </header>

      <main className="editor-main">
        {videoSrc ? (
          <video
            ref={videoRef}
            src={videoSrc}
            className="editor-video"
            controls
            onLoadedMetadata={handleLoadedMetadata}
            onTimeUpdate={handleTimeUpdate}
          />
        ) : (
          <div className="editor-placeholder">
            <p>Open a video file to get started</p>
            <label className="open-btn">
              Choose File
              <input
                type="file"
                accept="video/*"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </label>
          </div>
        )}
      </main>

      <footer className="editor-footer">
        <VideoTimeline
          thumbnails={thumbnails}
          isGenerating={isGenerating}
          currentTime={currentTime}
          duration={duration}
          onSeek={handleSeek}
        />
      </footer>
    </div>
  )
}

export default App
