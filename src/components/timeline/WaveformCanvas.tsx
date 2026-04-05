import { useEffect, useRef } from 'react'

interface WaveformCanvasProps {
  waveformData: Float32Array | null
}

export function WaveformCanvas({ waveformData }: WaveformCanvasProps) {
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

      // Normalize to peak amplitude
      let peak = 0
      for (let i = 0; i < waveformData.length; i++) {
        if (waveformData[i] > peak) peak = waveformData[i]
      }
      if (peak === 0) return

      const midY = height / 2
      const maxBarHalf = midY * 0.85
      const barW = width / waveformData.length

      ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'

      for (let i = 0; i < waveformData.length; i++) {
        const amplitude = (waveformData[i] / peak) * maxBarHalf
        const x = (i / waveformData.length) * width
        // Draw 1px gap between bars when wide enough
        const w = Math.max(1, barW - (barW > 1.5 ? 0.5 : 0))
        ctx.fillRect(x, midY - amplitude, w, amplitude * 2)
      }
    }

    // Sync canvas pixel size to its CSS layout size and redraw
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
  }, [waveformData])

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-[1]"
      aria-hidden="true"
    />
  )
}
