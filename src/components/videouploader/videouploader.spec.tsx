import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VideoUpload from './videouploader';

beforeEach(() => vi.clearAllMocks());

// ─── Rendering ────────────────────────────────────────────────────────────────

describe('VideoUpload — rendering', () => {
  it('renders a file input', () => {
    render(<VideoUpload onVideoLoaded={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();
  });

  it('accepts video/* file types', () => {
    render(<VideoUpload onVideoLoaded={vi.fn()} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input.accept).toBe('video/*');
  });
});

// ─── File handling ────────────────────────────────────────────────────────────

describe('VideoUpload — file handling', () => {
  const getInput = () => document.querySelector('input[type="file"]') as HTMLInputElement;

  it('calls onVideoLoaded with a valid video file', () => {
    const onVideoLoaded = vi.fn();
    render(<VideoUpload onVideoLoaded={onVideoLoaded} />);
    const file = new File(['video content'], 'clip.mp4', { type: 'video/mp4' });
    Object.defineProperty(getInput(), 'files', { value: [file], configurable: true });
    fireEvent.change(getInput());
    expect(onVideoLoaded).toHaveBeenCalledWith(file);
  });

  it('does not call onVideoLoaded for a non-video file', () => {
    const onVideoLoaded = vi.fn();
    render(<VideoUpload onVideoLoaded={onVideoLoaded} />);
    const file = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' });
    Object.defineProperty(getInput(), 'files', { value: [file], configurable: true });
    fireEvent.change(getInput());
    expect(onVideoLoaded).not.toHaveBeenCalled();
  });

  it('shows an alert and does not call onVideoLoaded when a video file exceeds 500 MB', () => {
    const onVideoLoaded = vi.fn();
    const alertMock = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<VideoUpload onVideoLoaded={onVideoLoaded} />);
    const file = new File(['x'], 'big.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 501 * 1024 * 1024, configurable: true });
    Object.defineProperty(getInput(), 'files', { value: [file], configurable: true });
    fireEvent.change(getInput());
    expect(alertMock).toHaveBeenCalledTimes(1);
    expect(onVideoLoaded).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  it('accepts video files right at the 500 MB limit', () => {
    const onVideoLoaded = vi.fn();
    render(<VideoUpload onVideoLoaded={onVideoLoaded} />);
    const file = new File(['x'], 'max.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: 500 * 1024 * 1024, configurable: true });
    Object.defineProperty(getInput(), 'files', { value: [file], configurable: true });
    fireEvent.change(getInput());
    expect(onVideoLoaded).toHaveBeenCalledWith(file);
  });
});
