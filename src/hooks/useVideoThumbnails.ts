import { useState, useCallback, useRef, useEffect } from 'react'

export interface Thumbnail {
  time: number
  dataUrl: string
}

export const THUMB_WIDTH = 80
export const THUMB_HEIGHT = 45

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

          await new Promise<void>((resolve) => {
            const onSeeked = () => {
              video.removeEventListener('seeked', onSeeked)
              try {
                ctx.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT)
                const imageData = ctx.getImageData(0, 0, THUMB_WIDTH, THUMB_HEIGHT)
                const frameId = nextFrameIdRef.current++
                void encodeFrame(frameId, imageData.data.buffer).then((dataUrl) => {
                  if (generationIdRef.current === myGenId && dataUrl) {
                    setThumbnails((prev) => [...prev, { time, dataUrl }])
                  }
                })
              } catch {
                // skip frame
              }
              resolve()
            }
            video.addEventListener('seeked', onSeeked)
            video.currentTime = time
            setTimeout(() => {
              video.removeEventListener('seeked', onSeeked)
              resolve()
            }, 3000)
          })
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
