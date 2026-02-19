import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { Timeline } from './timeline'
import type { useTrimMarkers } from '../../hooks/useTrimMarkers'

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

describe('Timeline Component', () => {
  it('renders with default props', () => {
    render(
      <Timeline
        duration={100}
        currentTime={0}
        onSeek={() => {}}
        trim={mockTrim}
        videoRef={{ current: null }}
      />
    )

    expect(screen.getByText('◀ Frame')).toBeInTheDocument()
  })
})
