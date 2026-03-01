import { describe, it, expect } from 'vitest';
import { formatTime } from './formatTime';

describe('formatTime', () => {
  it('formats zero seconds', () => {
    expect(formatTime(0)).toBe('0:00');
  });

  it('formats seconds under a minute', () => {
    expect(formatTime(5)).toBe('0:05');
    expect(formatTime(45)).toBe('0:45');
  });

  it('formats whole minutes', () => {
    expect(formatTime(60)).toBe('1:00');
    expect(formatTime(120)).toBe('2:00');
  });

  it('formats minutes and seconds', () => {
    expect(formatTime(90)).toBe('1:30');
    expect(formatTime(754)).toBe('12:34');
  });

  it('truncates fractional seconds', () => {
    expect(formatTime(61.7)).toBe('1:01');
  });

  it('returns 0:00 for NaN', () => {
    expect(formatTime(NaN)).toBe('0:00');
  });
});
