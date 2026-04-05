import { useReducer, useEffect } from 'react'

const SAMPLE_COUNT = 1000

type State = { data: Float32Array | null; isDecoding: boolean }
type Action =
  | { type: 'start' }
  | { type: 'done'; data: Float32Array }
  | { type: 'error' }
  | { type: 'clear' }

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'start': return { data: null, isDecoding: true }
    case 'done': return { data: action.data, isDecoding: false }
    case 'error': return { data: null, isDecoding: false }
    case 'clear': return { data: null, isDecoding: false }
    default: return state
  }
}

/** Decode the audio track of a local video file and return per-chunk RMS amplitudes. */
export function useAudioWaveform(videoFile: File | null) {
  const [state, dispatch] = useReducer(reducer, { data: null, isDecoding: false })

  useEffect(() => {
    if (!videoFile) {
      dispatch({ type: 'clear' })
      return
    }

    let cancelled = false

    const run = async () => {
      dispatch({ type: 'start' })
      try {
        const buffer = await videoFile.arrayBuffer()
        if (cancelled) return

        const audioCtx = new AudioContext()
        let audioBuffer: AudioBuffer
        try {
          audioBuffer = await audioCtx.decodeAudioData(buffer)
        } finally {
          await audioCtx.close()
        }
        if (cancelled) return

        // Mix all channels down to mono
        const numChannels = audioBuffer.numberOfChannels
        const length = audioBuffer.length
        const mono = new Float32Array(length)
        for (let c = 0; c < numChannels; c++) {
          const channelData = audioBuffer.getChannelData(c)
          for (let i = 0; i < length; i++) {
            mono[i] += channelData[i] / numChannels
          }
        }

        // Compute RMS per chunk
        const chunkSize = Math.max(1, Math.floor(length / SAMPLE_COUNT))
        const samples = new Float32Array(SAMPLE_COUNT)
        for (let i = 0; i < SAMPLE_COUNT; i++) {
          const start = i * chunkSize
          const end = Math.min(start + chunkSize, length)
          let sum = 0
          for (let j = start; j < end; j++) {
            sum += mono[j] * mono[j]
          }
          samples[i] = Math.sqrt(sum / (end - start))
        }

        if (!cancelled) dispatch({ type: 'done', data: samples })
      } catch {
        // File has no audio track or decode failed — silently ignore
        if (!cancelled) dispatch({ type: 'error' })
      }
    }

    void run()
    return () => { cancelled = true }
  }, [videoFile])

  return { waveformData: state.data, isDecoding: state.isDecoding }
}
