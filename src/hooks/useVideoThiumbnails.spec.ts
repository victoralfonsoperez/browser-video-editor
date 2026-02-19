import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useVideoThumbnails } from './useVideoThumbnails'

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
})