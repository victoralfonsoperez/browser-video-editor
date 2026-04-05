import { describe, it, expect } from 'vitest'
import { parseTimecode } from './parseTimecode'

describe('parseTimecode', () => {
  it('parses plain seconds', () => {
    expect(parseTimecode('45')).toBe(45)
    expect(parseTimecode('0')).toBe(0)
  })

  it('parses seconds with decimals', () => {
    expect(parseTimecode('1.5')).toBeCloseTo(1.5)
    expect(parseTimecode('0.25')).toBeCloseTo(0.25)
  })

  it('parses mm:ss', () => {
    expect(parseTimecode('1:30')).toBe(90)
    expect(parseTimecode('0:05')).toBe(5)
  })

  it('parses mm:ss.fff', () => {
    expect(parseTimecode('1:23.4')).toBeCloseTo(83.4)
    expect(parseTimecode('0:00.5')).toBeCloseTo(0.5)
  })

  it('parses hh:mm:ss', () => {
    expect(parseTimecode('1:02:03')).toBe(3723)
  })

  it('parses hh:mm:ss.fff', () => {
    expect(parseTimecode('1:02:03.5')).toBeCloseTo(3723.5)
  })

  it('returns null for empty string', () => {
    expect(parseTimecode('')).toBeNull()
    expect(parseTimecode('   ')).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseTimecode('abc')).toBeNull()
    expect(parseTimecode('1:xx')).toBeNull()
  })

  it('returns null for negative values', () => {
    expect(parseTimecode('-5')).toBeNull()
    expect(parseTimecode('1:-2')).toBeNull()
  })

  it('returns null for too many segments', () => {
    expect(parseTimecode('1:2:3:4')).toBeNull()
  })
})
