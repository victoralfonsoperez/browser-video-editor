import { useState, useCallback } from 'react'

export interface Thumbnail {
  time: number
  dataUrl: string
}

export const THUMB_WIDTH = 80
export const THUMB_HEIGHT = 45

export function useVideoThumbnails() {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateThumbnails = useCallback(
    async (video: HTMLVideoElement, count: number) => {
      if (count < 1) return

      const duration = video.duration
      if (!Number.isFinite(duration) || duration <= 0) return

      setIsGenerating(true)
      setThumbnails([])

      const canvas = document.createElement('canvas')
      canvas.width = THUMB_WIDTH
      canvas.height = THUMB_HEIGHT
      const ctx = canvas.getContext('2d')!
      const times: number[] = Array.from(
        { length: count },
        (_, i) => (i / count) * duration
      )

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