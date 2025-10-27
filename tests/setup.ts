import '@testing-library/jest-dom'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock HTMLCanvasElement
HTMLCanvasElement.prototype.getContext = vi.fn((contextType) => {
  if (contextType === '2d') {
    return {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      fillRect: vi.fn(),
      clearRect: vi.fn(),
      strokeRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(() => ({
        data: new Uint8ClampedArray(100 * 100 * 4),
        width: 100,
        height: 100,
      })),
      putImageData: vi.fn(),
      createImageData: vi.fn(),
      setTransform: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      rotate: vi.fn(),
      translate: vi.fn(),
      transform: vi.fn(),
      beginPath: vi.fn(),
      closePath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      clip: vi.fn(),
      filter: 'none',
      globalAlpha: 1,
      globalCompositeOperation: 'source-over',
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
      canvas: {} as HTMLCanvasElement,
      createLinearGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createRadialGradient: vi.fn(() => ({
        addColorStop: vi.fn(),
      })),
      createPattern: vi.fn(() => null),
    } as unknown as CanvasRenderingContext2D
  }
  return null
}) as any

// Mock HTMLCanvasElement.toBlob
HTMLCanvasElement.prototype.toBlob = vi.fn(function (callback) {
  const blob = new Blob(['test'], { type: 'image/png' })
  setTimeout(() => callback(blob), 0)
}) as any

// Mock HTMLCanvasElement.toDataURL
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,test')

// Mock Image
class MockImage {
  onload: ((this: GlobalEventHandlers, ev: Event) => any) | null = null
  onerror: ((this: GlobalEventHandlers, ev: Event | string) => any) | null = null
  src = ''
  width = 100
  height = 100
  naturalWidth = 100
  naturalHeight = 100
  crossOrigin: string | null = null

  constructor() {
    setTimeout(() => {
      if (this.onload) {
        this.onload.call(this as unknown as GlobalEventHandlers, new Event('load'))
      }
    }, 0)
  }
}

global.Image = MockImage as any

// Mock URL.createObjectURL and revokeObjectURL
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url-' + Math.random())
global.URL.revokeObjectURL = vi.fn()

// Mock FileReader
class MockFileReader {
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  onloadend: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
  result: string | ArrayBuffer | null = null
  readyState = 0

  readAsDataURL(blob: Blob) {
    setTimeout(() => {
      this.result = 'data:image/png;base64,mock-data'
      this.readyState = 2
      const target = this as unknown as FileReader
      if (this.onloadend) {
        const event = Object.assign(new ProgressEvent('loadend'), { target })
        this.onloadend.call(target, event as ProgressEvent<FileReader>)
      }
      if (this.onload) {
        const event = Object.assign(new ProgressEvent('load'), { target })
        this.onload.call(target, event as ProgressEvent<FileReader>)
      }
    }, 0)
  }

  readAsArrayBuffer(blob: Blob) {
    setTimeout(() => {
      this.result = new ArrayBuffer(8)
      this.readyState = 2
      const target = this as unknown as FileReader
      if (this.onloadend) {
        const event = Object.assign(new ProgressEvent('loadend'), { target })
        this.onloadend.call(target, event as ProgressEvent<FileReader>)
      }
    }, 0)
  }
}

global.FileReader = MockFileReader as any

// Mock fetch
global.fetch = vi.fn()

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  writable: true,
  configurable: true,
  value: 1,
})

// Suppress console errors in tests (optional)
// global.console.error = vi.fn()
// global.console.warn = vi.fn()
