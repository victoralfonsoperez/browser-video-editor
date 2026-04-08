import { expect, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Web Worker is not available in jsdom — provide a no-op stub so hooks that
// create workers on mount (e.g. useVideoThumbnails) don't throw.
class MockWorker {
  onmessage: ((ev: MessageEvent) => void) | null = null
  postMessage(): void {}
  terminate(): void {}
}

Object.defineProperty(globalThis, 'Worker', {
  writable: true,
  configurable: true,
  value: MockWorker,
})

// ResizeObserver is not available in jsdom — provide a no-op stub.
class MockResizeObserver {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// HTMLCanvasElement.getContext is not implemented in jsdom — stub it with a
// no-op 2D context so canvas-drawing code (WaveformCanvas, useVideoThumbnails)
// doesn't throw during tests.
HTMLCanvasElement.prototype.getContext = (function () {
  return {
    clearRect: () => {},
    fillRect: () => {},
    strokeRect: () => {},
    beginPath: () => {},
    moveTo: () => {},
    lineTo: () => {},
    stroke: () => {},
    fill: () => {},
    arc: () => {},
    save: () => {},
    restore: () => {},
    scale: () => {},
    translate: () => {},
    drawImage: () => {},
    getImageData: () => ({ data: new Uint8ClampedArray(0) }),
    putImageData: () => {},
    createImageData: () => ({ data: new Uint8ClampedArray(0) }),
    setTransform: () => {},
    canvas: document.createElement('canvas'),
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 1,
    font: '',
    textAlign: 'start' as CanvasTextAlign,
    globalAlpha: 1,
  } as unknown as CanvasRenderingContext2D
}) as unknown as typeof HTMLCanvasElement.prototype.getContext