import { useReducer, useCallback } from 'react'

export const MIN_ZOOM = 1
export const MAX_ZOOM = 64

type State = {
  zoom: number
  scrollOffset: number // seconds from the start of the video
}

type Action =
  | { type: 'zoom'; factor: number; centerTime: number; duration: number }
  | { type: 'pan'; deltaSeconds: number; duration: number }
  | { type: 'follow'; time: number; duration: number }
  | { type: 'reset' }

function clampOffset(offset: number, zoom: number, duration: number): number {
  if (duration <= 0 || zoom <= 1) return 0
  return Math.max(0, Math.min(duration - duration / zoom, offset))
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'zoom': {
      const { factor, centerTime, duration } = action
      if (duration <= 0) return state
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, state.zoom * factor))
      if (newZoom === state.zoom) return state
      // Keep centerTime at the same fraction of the viewport
      const oldViewDuration = duration / state.zoom
      const fraction = (centerTime - state.scrollOffset) / oldViewDuration
      const newViewDuration = duration / newZoom
      const newOffset = clampOffset(centerTime - fraction * newViewDuration, newZoom, duration)
      return { zoom: newZoom, scrollOffset: newOffset }
    }
    case 'pan': {
      const { deltaSeconds, duration } = action
      const newOffset = clampOffset(state.scrollOffset + deltaSeconds, state.zoom, duration)
      return { ...state, scrollOffset: newOffset }
    }
    case 'follow': {
      const { time, duration } = action
      if (duration <= 0 || state.zoom <= 1) return state
      const viewDuration = duration / state.zoom
      const viewEnd = state.scrollOffset + viewDuration
      // Already in view — do nothing
      if (time >= state.scrollOffset && time <= viewEnd) return state
      // Place the time at 15% from the left edge (look-ahead feel)
      const newOffset = clampOffset(time - viewDuration * 0.15, state.zoom, duration)
      return { ...state, scrollOffset: newOffset }
    }
    case 'reset':
      return { zoom: 1, scrollOffset: 0 }
    default:
      return state
  }
}

export function useTimelineZoom() {
  const [state, dispatch] = useReducer(reducer, { zoom: 1, scrollOffset: 0 })

  const zoomBy = useCallback((factor: number, centerTime: number, duration: number) => {
    dispatch({ type: 'zoom', factor, centerTime, duration })
  }, [])

  const pan = useCallback((deltaSeconds: number, duration: number) => {
    dispatch({ type: 'pan', deltaSeconds, duration })
  }, [])

  const follow = useCallback((time: number, duration: number) => {
    dispatch({ type: 'follow', time, duration })
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'reset' })
  }, [])

  return { zoom: state.zoom, scrollOffset: state.scrollOffset, zoomBy, pan, follow, reset }
}
