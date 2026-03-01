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