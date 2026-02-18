import { useState, useCallback } from 'react'

export interface Thumbnail {
  time: number
  dataUrl: string
}

const THUMB_WIDTH = 80
const THUMB_HEIGHT = 45

export function useVideoThumbnails() {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateThumbnails = useCallback(
    async (video: HTMLVideoElement, intervalSeconds = 2) => {
      setIsGenerating(true)
      setThumbnails([])

      const canvas = document.createElement('canvas')
      canvas.width = THUMB_WIDTH
      canvas.height = THUMB_HEIGHT
      const ctx = canvas.getContext('2d')!

      const duration = video.duration
      const times: number[] = []
      for (let t = 0; t < duration; t += intervalSeconds) {
        times.push(t)
      }

      const results: Thumbnail[] = []

      for (const time of times) {
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
            results.push({ time, dataUrl: canvas.toDataURL('image/jpeg', 0.6) })
            video.removeEventListener('seeked', onSeeked)
            resolve()
          }
          video.addEventListener('seeked', onSeeked)
          video.currentTime = time
        })
      }

      setThumbnails(results)
      setIsGenerating(false)
    },
    []
  )

  return { thumbnails, isGenerating, generateThumbnails }
}
