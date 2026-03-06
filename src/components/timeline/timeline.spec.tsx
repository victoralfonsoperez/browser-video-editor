import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Timeline } from './timeline'
import type { useTrimMarkers } from '../../hooks/useTrimMarkers'
import type { Highlight } from '../../types/highlights'

const mockTrim: ReturnType<typeof useTrimMarkers> = {
  inPoint: null,
  outPoint: null,
  clips: [],
  setIn: vi.fn(),
  setOut: vi.fn(),
  clearMarkers: vi.fn(),
  addClip: vi.fn(),
  removeClip: vi.fn(),
  updateClip: vi.fn(),
  reorderClips: vi.fn(),
  bindKeyboard: vi.fn(() => vi.fn()),
}

const sampleHighlights: Highlight[] = [
  { id: 'h1', label: 'Intro', time: 10 },
  { id: 'h2', label: 'Action Scene', time: 30, endTime: 50 },
]

const baseProps = {
  duration: 100,
  currentTime: 0,
  onSeek: vi.fn(),
  onMark: vi.fn(),
  trim: mockTrim,
  videoRef: { current: null } as React.RefObject<HTMLVideoElement | null>,
}

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('Timeline — rendering', () => {
  it('renders frame controls', () => {
    render(<Timeline {...baseProps} />)
    expect(screen.getByText('◀ Frame')).toBeInTheDocument()
  })

  it('renders the Mark button', () => {
    render(<Timeline {...baseProps} />)
    expect(screen.getByRole('button', { name: /mark/i })).toBeInTheDocument()
  })

  it('renders without highlights prop without errors', () => {
    render(<Timeline {...baseProps} />)
    expect(screen.queryByRole('button', { name: 'Intro' })).not.toBeInTheDocument()
  })
})

// ─── Highlight markers ────────────────────────────────────────────────────────

describe('Timeline — highlight markers', () => {
  it('renders markers when highlights are provided', () => {
    render(<Timeline {...baseProps} highlights={sampleHighlights} />)
    expect(screen.getByRole('button', { name: 'Intro' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Action Scene' })).toBeInTheDocument()
  })

  it('calls onSeek with the highlight time when a marker is clicked', () => {
    const onSeek = vi.fn()
    render(<Timeline {...baseProps} onSeek={onSeek} highlights={sampleHighlights} />)
    fireEvent.click(screen.getByRole('button', { name: 'Intro' }))
    expect(onSeek).toHaveBeenCalledWith(10)
  })

  it('shows label tooltip when a marker is hovered', () => {
    render(<Timeline {...baseProps} highlights={sampleHighlights} />)
    const marker = screen.getByRole('button', { name: 'Action Scene' })
    expect(screen.queryByText('Action Scene')).not.toBeInTheDocument()
    fireEvent.mouseEnter(marker)
    expect(screen.getByText('Action Scene')).toBeInTheDocument()
    fireEvent.mouseLeave(marker)
    expect(screen.queryByText('Action Scene')).not.toBeInTheDocument()
  })
})

// ─── Touch interactions ──────────────────────────────────────────────────────

describe('Timeline — touch scrubbing', () => {
  it('calls onSeek on touchStart on the track', () => {
    const onSeek = vi.fn()
    render(<Timeline {...baseProps} onSeek={onSeek} />)
    const track = document.querySelector('.cursor-crosshair') as HTMLElement
    fireEvent.touchStart(track, { touches: [{ clientX: 50 }] })
    expect(onSeek).toHaveBeenCalled()
  })

  it('calls onSeek on touchMove while dragging the track', () => {
    const onSeek = vi.fn()
    render(<Timeline {...baseProps} onSeek={onSeek} />)
    const track = document.querySelector('.cursor-crosshair') as HTMLElement
    fireEvent.touchStart(track, { touches: [{ clientX: 50 }] })
    onSeek.mockClear()
    fireEvent.touchMove(track, { touches: [{ clientX: 80 }] })
    expect(onSeek).toHaveBeenCalled()
  })

  it('stops calling onSeek after touchEnd', () => {
    const onSeek = vi.fn()
    render(<Timeline {...baseProps} onSeek={onSeek} />)
    const track = document.querySelector('.cursor-crosshair') as HTMLElement
    fireEvent.touchStart(track, { touches: [{ clientX: 50 }] })
    fireEvent.touchEnd(track)
    onSeek.mockClear()
    fireEvent.touchMove(track, { touches: [{ clientX: 80 }] })
    expect(onSeek).not.toHaveBeenCalled()
  })
})

describe('Timeline — touch trim marker dragging', () => {
  const trimWithMarkers = {
    ...mockTrim,
    inPoint: 25,
    outPoint: 75,
  }

  it('renders in-point marker with touch-none class for touch dragging', () => {
    render(<Timeline {...baseProps} trim={trimWithMarkers} />)
    const inMarker = screen.getByTitle('Drag to adjust in-point')
    expect(inMarker.className).toContain('touch-none')
  })

  it('renders out-point marker with touch-none class for touch dragging', () => {
    render(<Timeline {...baseProps} trim={trimWithMarkers} />)
    const outMarker = screen.getByTitle('Drag to adjust out-point')
    expect(outMarker.className).toContain('touch-none')
  })

  it('calls trim.setIn when in-point marker is touch-dragged', () => {
    const setIn = vi.fn()
    const trim = { ...trimWithMarkers, setIn }
    render(<Timeline {...baseProps} trim={trim} />)
    const inMarker = screen.getByTitle('Drag to adjust in-point')
    fireEvent.touchStart(inMarker, { touches: [{ clientX: 25 }] })
    // After touchStart sets draggingMarker, the effect attaches global listeners
    // Fire touchmove on window to simulate the drag
    fireEvent.touchMove(window, { touches: [{ clientX: 50 }] })
    expect(setIn).toHaveBeenCalled()
  })

  it('calls trim.setOut when out-point marker is touch-dragged', () => {
    const setOut = vi.fn()
    const trim = { ...trimWithMarkers, setOut }
    render(<Timeline {...baseProps} trim={trim} />)
    const outMarker = screen.getByTitle('Drag to adjust out-point')
    fireEvent.touchStart(outMarker, { touches: [{ clientX: 75 }] })
    fireEvent.touchMove(window, { touches: [{ clientX: 60 }] })
    expect(setOut).toHaveBeenCalled()
  })

  it('stops dragging marker after touchEnd', () => {
    const setIn = vi.fn()
    const trim = { ...trimWithMarkers, setIn }
    render(<Timeline {...baseProps} trim={trim} />)
    const inMarker = screen.getByTitle('Drag to adjust in-point')
    fireEvent.touchStart(inMarker, { touches: [{ clientX: 25 }] })
    fireEvent.touchEnd(window)
    setIn.mockClear()
    fireEvent.touchMove(window, { touches: [{ clientX: 50 }] })
    expect(setIn).not.toHaveBeenCalled()
  })
})

// ─── Mark button + H key ──────────────────────────────────────────────────────

describe('Timeline — Mark button and H key', () => {
  it('calls onMark when the Mark button is clicked', () => {
    const onMark = vi.fn()
    render(<Timeline {...baseProps} onMark={onMark} />)
    fireEvent.click(screen.getByRole('button', { name: /mark/i }))
    expect(onMark).toHaveBeenCalledOnce()
  })

  it('calls onMark when H is pressed', () => {
    const onMark = vi.fn()
    render(<Timeline {...baseProps} onMark={onMark} />)
    fireEvent.keyDown(window, { key: 'h' })
    expect(onMark).toHaveBeenCalledOnce()
  })

  it('calls onMark when uppercase H is pressed', () => {
    const onMark = vi.fn()
    render(<Timeline {...baseProps} onMark={onMark} />)
    fireEvent.keyDown(window, { key: 'H' })
    expect(onMark).toHaveBeenCalledOnce()
  })

  it('does not call onMark when H is pressed inside an input', () => {
    const onMark = vi.fn()
    render(
      <>
        <Timeline {...baseProps} onMark={onMark} />
        <input data-testid="text-input" />
      </>
    )
    fireEvent.keyDown(screen.getByTestId('text-input'), { key: 'h' })
    expect(onMark).not.toHaveBeenCalled()
  })

  it('does not call onMark when H is pressed inside a textarea', () => {
    const onMark = vi.fn()
    render(
      <>
        <Timeline {...baseProps} onMark={onMark} />
        <textarea data-testid="text-area" />
      </>
    )
    fireEvent.keyDown(screen.getByTestId('text-area'), { key: 'h' })
    expect(onMark).not.toHaveBeenCalled()
  })
})
