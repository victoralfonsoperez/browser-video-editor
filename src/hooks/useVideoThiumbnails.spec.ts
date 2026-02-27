import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useVideoThumbnails } from './useVideoThumbnails'

function makeVideoElement(duration: number): HTMLVideoElement {
  return {
    duration,
    currentTime: 0,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLVideoElement
}

describe('useVideoThumbnails', () => {
  it('starts with an empty thumbnails array', () => {
    const { result } = renderHook(() => useVideoThumbnails())
    expect(result.current.thumbnails).toEqual([])
  })

  it('starts with isGenerating as false', () => {
    const { result } = renderHook(() => useVideoThumbnails())
    expect(result.current.isGenerating).toBe(false)
  })

  it('exposes a generateThumbnails function', () => {
    const { result } = renderHook(() => useVideoThumbnails())
    expect(typeof result.current.generateThumbnails).toBe('function')
  })

  describe('generateThumbnails — non-finite duration guard', () => {
    // Regression: .mov files can report Infinity (or NaN) for video.duration
    // before metadata is fully parsed. Setting video.currentTime to a non-finite
    // value throws "Failed to set the 'currentTime' property: non-finite".

    it('does not throw and leaves state unchanged when video.duration is NaN', async () => {
      const { result } = renderHook(() => useVideoThumbnails())
      const video = makeVideoElement(NaN)

      await act(async () => {
        await result.current.generateThumbnails(video, 5)
      })

      expect(result.current.thumbnails).toEqual([])
      expect(result.current.isGenerating).toBe(false)
      // currentTime must never have been assigned
      expect(video.currentTime).toBe(0)
    })

    it('does not throw and leaves state unchanged when video.duration is Infinity', async () => {
      const { result } = renderHook(() => useVideoThumbnails())
      const video = makeVideoElement(Infinity)

      await act(async () => {
        await result.current.generateThumbnails(video, 5)
      })

      expect(result.current.thumbnails).toEqual([])
      expect(result.current.isGenerating).toBe(false)
      expect(video.currentTime).toBe(0)
    })

    it('does not throw and leaves state unchanged when video.duration is 0', async () => {
      const { result } = renderHook(() => useVideoThumbnails())
      const video = makeVideoElement(0)

      await act(async () => {
        await result.current.generateThumbnails(video, 5)
      })

      expect(result.current.thumbnails).toEqual([])
      expect(result.current.isGenerating).toBe(false)
      expect(video.currentTime).toBe(0)
    })
  })
})