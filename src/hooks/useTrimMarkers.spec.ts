import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTrimMarkers } from './useTrimMarkers'

describe('useTrimMarkers', () => {
  it('starts with null inPoint, outPoint and empty clips', () => {
    const { result } = renderHook(() => useTrimMarkers())
    expect(result.current.inPoint).toBeNull()
    expect(result.current.outPoint).toBeNull()
    expect(result.current.clips).toEqual([])
  })

  it('sets inPoint', () => {
    const { result } = renderHook(() => useTrimMarkers())
    act(() => result.current.setIn(10))
    expect(result.current.inPoint).toBe(10)
  })

  it('sets outPoint', () => {
    const { result } = renderHook(() => useTrimMarkers())
    act(() => result.current.setOut(50))
    expect(result.current.outPoint).toBe(50)
  })

  it('clears both markers', () => {
    const { result } = renderHook(() => useTrimMarkers())
    act(() => { result.current.setIn(10); result.current.setOut(50) })
    act(() => result.current.clearMarkers())
    expect(result.current.inPoint).toBeNull()
    expect(result.current.outPoint).toBeNull()
  })

  it('adds a clip when both markers are set', () => {
    const { result } = renderHook(() => useTrimMarkers())
    act(() => { result.current.setIn(10); result.current.setOut(50) })
    act(() => result.current.addClip('My Clip'))
    expect(result.current.clips).toHaveLength(1)
    expect(result.current.clips[0]).toMatchObject({ name: 'My Clip', inPoint: 10, outPoint: 50 })
  })

  it('removes a clip by id', () => {
    const { result } = renderHook(() => useTrimMarkers())
    act(() => { result.current.setIn(10); result.current.setOut(50) })
    act(() => result.current.addClip('Clip'))
    const id = result.current.clips[0].id
    act(() => result.current.removeClip(id))
    expect(result.current.clips).toHaveLength(0)
  })

  it('updates a clip', () => {
    const { result } = renderHook(() => useTrimMarkers())
    act(() => { result.current.setIn(10); result.current.setOut(50) })
    act(() => result.current.addClip('Original'))
    const id = result.current.clips[0].id
    act(() => result.current.updateClip(id, { name: 'Updated' }))
    expect(result.current.clips[0].name).toBe('Updated')
  })

  it('reorders clips', () => {
    const { result } = renderHook(() => useTrimMarkers())
    act(() => { result.current.setIn(0); result.current.setOut(10) })
    act(() => result.current.addClip('A'))
    act(() => { result.current.setIn(20); result.current.setOut(30) })
    act(() => result.current.addClip('B'))
    act(() => result.current.reorderClips(0, 1))
    expect(result.current.clips.map(c => c.name)).toEqual(['B', 'A'])
  })

  it('bindKeyboard sets inPoint on "i" and outPoint on "o"', () => {
    const { result } = renderHook(() => useTrimMarkers())

    const handlerIn = result.current.bindKeyboard(25)
    window.addEventListener('keydown', handlerIn)
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i', bubbles: true })))
    window.removeEventListener('keydown', handlerIn)
    expect(result.current.inPoint).toBe(25)

    const handlerOut = result.current.bindKeyboard(75)
    window.addEventListener('keydown', handlerOut)
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'o', bubbles: true })))
    window.removeEventListener('keydown', handlerOut)
    expect(result.current.outPoint).toBe(75)
  })
})