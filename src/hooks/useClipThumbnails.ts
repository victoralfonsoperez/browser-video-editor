import { useState, useCallback, useRef } from 'react'
import type { Clip } from './useTrimMarkers'
import { THUMB_WIDTH, THUMB_HEIGHT, THUMB_JPEG_QUALITY, seekToTime } from '../utils/thumbnails'

/** Captures a single JPEG frame at `time` from a video element. */
async function captureFrame(video: HTMLVideoElement, time: number): Promise<string> {
  const originalTime = video.currentTime
  const canvas = document.createElement('canvas')
  canvas.width = THUMB_WIDTH
  canvas.height = THUMB_HEIGHT
  const ctx = canvas.getContext('2d')!

  try {
    await seekToTime(video, time)
    ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
    return canvas.toDataURL('image/jpeg', THUMB_JPEG_QUALITY)
  } finally {
    // Restore playhead so we don't visibly jump
    video.currentTime = originalTime
  }
}

/**
 * Manages a map of clip-id → thumbnail data-URL.
 * Call `requestThumbnail(clip, videoEl)` whenever a clip is added or its
 * in-point changes — the hook throttles concurrent captures to 1 at a time.
 */
export function useClipThumbnails() {
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({})
  // Track the last in-point we captured for each clip so we re-capture on change
  const capturedAt = useRef<Record<string, number>>({})
  const queue = useRef<Promise<void>>(Promise.resolve())

  const requestThumbnail = useCallback(
    (clip: Clip, video: HTMLVideoElement | null) => {
      if (!video) return
      // Skip if we already have a thumbnail for this exact in-point
      if (capturedAt.current[clip.id] === clip.inPoint) return

      capturedAt.current[clip.id] = clip.inPoint

      // Chain captures so we never seek concurrently
      queue.current = queue.current.then(async () => {
        try {
          const dataUrl = await captureFrame(video, clip.inPoint)
          setThumbnails((prev) => ({ ...prev, [clip.id]: dataUrl }))
        } catch {
          // Silently ignore capture errors (e.g. cross-origin, codec)
        }
      })
    },
    [],
  )

  const removeThumbnail = useCallback((id: string) => {
    setThumbnails((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
    delete capturedAt.current[id]
  }, [])

  return { thumbnails, requestThumbnail, removeThumbnail }
}
