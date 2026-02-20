import { useState, useCallback, useRef } from 'react'
import type { Clip } from './useTrimMarkers'

const THUMB_W = 80
const THUMB_H = 45

/** Captures a single JPEG frame at `time` from a video element. */
function captureFrame(video: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const originalTime = video.currentTime
    const canvas = document.createElement('canvas')
    canvas.width = THUMB_W
    canvas.height = THUMB_H
    const ctx = canvas.getContext('2d')!

    const onSeeked = () => {
      try {
        ctx.drawImage(video, 0, 0, THUMB_W, THUMB_H)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
        resolve(dataUrl)
      } catch (err) {
        reject(err)
      } finally {
        video.removeEventListener('seeked', onSeeked)
        video.removeEventListener('error', onError)
        // Restore playhead so we don't visibly jump
        video.currentTime = originalTime
      }
    }

    const onError = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
      reject(new Error('Video seek error while generating thumbnail'))
    }

    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = time
  })
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
