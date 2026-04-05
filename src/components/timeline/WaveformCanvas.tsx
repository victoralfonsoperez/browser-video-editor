import { useEffect, useRef } from 'react'

interface WaveformCanvasProps {
  waveformData: Float32Array | null
  /** Fraction of the full video at the left edge of the viewport (0–1). Default 0. */
  viewStartFrac?: number
  /** Fraction of the full video at the right edge of the viewport (0–1). Default 1. */
  viewEndFrac?: number
}

export function WaveformCanvas({ waveformData, viewStartFrac = 0, viewEndFrac = 1 }: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      if (!waveformData || waveformData.length === 0) return

      // Slice to the visible view window
      const startIdx = Math.floor(viewStartFrac * waveformData.length)
      const endIdx = Math.ceil(viewEndFrac * waveformData.length)
      const slice = waveformData.subarray(
        Math.max(0, startIdx),
        Math.min(waveformData.length, endIdx),
      )
      if (slice.length === 0) return

      // Normalize to peak amplitude
      let peak = 0
      for (let i = 0; i < slice.length; i++) {
        if (slice[i] > peak) peak = slice[i]
      }
      if (peak === 0) return

      const midY = height / 2
      const maxBarHalf = midY * 0.85
      const barW = width / slice.length

      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'

      for (let i = 0; i < slice.length; i++) {
        const amplitude = (slice[i] / peak) * maxBarHalf
        const x = (i / slice.length) * width
        const w = Math.max(1, barW - (barW > 1.5 ? 0.5 : 0))
        ctx.fillRect(x, midY - amplitude, w, amplitude * 2)
      }
    }

    const syncAndDraw = (entries?: ResizeObserverEntry[]) => {
      const entry = entries?.[0]
      if (entry) {
        canvas.width = Math.round(entry.contentRect.width)
        canvas.height = Math.round(entry.contentRect.height)
      } else if (canvas.parentElement) {
        canvas.width = canvas.parentElement.clientWidth
        canvas.height = canvas.parentElement.clientHeight
      }
      draw()
    }

    const observer = new ResizeObserver(syncAndDraw)
    observer.observe(canvas.parentElement ?? canvas)
    syncAndDraw()

    return () => observer.disconnect()
  }, [waveformData, viewStartFrac, viewEndFrac])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[1]"
      aria-hidden="true"
    />
  )
}
