import { useState, useCallback, useRef, useEffect } from 'react'
import { THUMB_WIDTH, THUMB_HEIGHT, seekToTime } from '../utils/thumbnails'

export { THUMB_WIDTH, THUMB_HEIGHT } from '../utils/thumbnails'

export interface Thumbnail {
  time: number
  dataUrl: string
}

interface WorkerResponse {
  id: number
  dataUrl: string | null
}

export function useVideoThumbnails() {
  const [thumbnails, setThumbnails] = useState<Thumbnail[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const workerRef = useRef<Worker | null>(null)
  const pendingRef = useRef<Map<number, (dataUrl: string | null) => void>>(new Map())
  const generationIdRef = useRef(0)
  const nextFrameIdRef = useRef(0)

  useEffect(() => {
    const worker = new Worker(
      new URL('../workers/thumbnailEncoder.worker.ts', import.meta.url),
      { type: 'module' },
    )
    worker.onmessage = (ev: MessageEvent<WorkerResponse>) => {
      const { id, dataUrl } = ev.data
      const resolve = pendingRef.current.get(id)
      if (resolve) {
        pendingRef.current.delete(id)
        resolve(dataUrl)
      }
    }
    workerRef.current = worker
    return () => {
      worker.terminate()
      workerRef.current = null
    }
  }, [])

  const generateThumbnails = useCallback(
    async (video: HTMLVideoElement, count: number) => {
      if (count < 1) return

      const duration = video.duration
      if (!Number.isFinite(duration) || duration <= 0) return

      const myGenId = ++generationIdRef.current
      setIsGenerating(true)
      setThumbnails([])

      const canvas = document.createElement('canvas')
      canvas.width = THUMB_WIDTH
      canvas.height = THUMB_HEIGHT
      const ctx = canvas.getContext('2d')!
      const times: number[] = Array.from(
        { length: count },
        (_, i) => (i / count) * duration,
      )

      function encodeFrame(id: number, buffer: ArrayBuffer): Promise<string | null> {
        return new Promise((resolve) => {
          const worker = workerRef.current
          if (!worker) {
            resolve(null)
            return
          }
          pendingRef.current.set(id, resolve)
          worker.postMessage({ id, buffer, width: THUMB_WIDTH, height: THUMB_HEIGHT }, [buffer])
        })
      }

      try {
        for (const time of times) {
          if (generationIdRef.current !== myGenId) break

          try {
            await seekToTime(video, time, 3000)
            ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
            const imageData = ctx.getImageData(0, 0, THUMB_WIDTH, THUMB_HEIGHT)
            const frameId = nextFrameIdRef.current++
            void encodeFrame(frameId, imageData.data.buffer).then((dataUrl) => {
              if (generationIdRef.current === myGenId && dataUrl) {
                setThumbnails((prev) => [...prev, { time, dataUrl }])
              }
            })
          } catch {
            // skip frame (seek timed out)
          }
        }
      } finally {
        if (generationIdRef.current === myGenId) {
          video.currentTime = 0
          setIsGenerating(false)
        }
      }
    },
    [],
  )

  return { thumbnails, isGenerating, generateThumbnails }
}
