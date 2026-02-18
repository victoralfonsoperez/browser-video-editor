import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
// import userEvent from '@testing-library/user-event'
import '@testing-library/jest-dom/vitest'
import { Timeline } from './timeline'

describe('Timeline Component', () => {
  it('renders with default props', () => {
    render(<Timeline duration={100} currentTime={0} onSeek={() => {}} />)
    
    expect(screen.getByText('◀ Frame')).toBeInTheDocument()
  })
})