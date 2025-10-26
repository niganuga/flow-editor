import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  fileToDataUrl,
  dataUrlToBlob,
  blobToFile,
  canvasToBlob,
  canvasToFile,
} from '@/lib/file-utils'

describe('File Utilities', () => {
  describe('fileToDataUrl', () => {
    it('should convert File to data URL', async () => {
      const mockFile = new File(['test content'], 'test.txt', { type: 'text/plain' })
      const dataUrl = await fileToDataUrl(mockFile)

      expect(dataUrl).toContain('data:')
    })

    it('should handle image files', async () => {
      const mockFile = new File(['image data'], 'test.png', { type: 'image/png' })
      const dataUrl = await fileToDataUrl(mockFile)

      expect(dataUrl).toContain('data:')
    })
  })

  describe('dataUrlToBlob', () => {
    it('should convert data URL to Blob', async () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      const blob = await dataUrlToBlob(dataUrl)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.size).toBeGreaterThan(0)
    })
  })

  describe('blobToFile', () => {
    it('should convert Blob to File', async () => {
      const blob = new Blob(['test'], { type: 'text/plain' })
      const file = await blobToFile(blob, 'test.txt')

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('test.txt')
      expect(file.type).toBe('text/plain')
    })

    it('should use custom type if provided', async () => {
      const blob = new Blob(['test'], { type: 'text/plain' })
      const file = await blobToFile(blob, 'test.png', 'image/png')

      expect(file.type).toBe('image/png')
    })
  })

  describe('canvasToBlob', () => {
    it('should convert canvas to Blob', async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100

      const blob = await canvasToBlob(canvas)

      expect(blob).toBeInstanceOf(Blob)
      expect(blob.type).toBe('image/png')
    })

    it('should respect custom image type', async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100

      const blob = await canvasToBlob(canvas, 'image/jpeg', 0.8)

      expect(blob).toBeInstanceOf(Blob)
    })
  })

  describe('canvasToFile', () => {
    it('should convert canvas to File', async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100

      const file = await canvasToFile(canvas, 'output.png')

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('output.png')
      expect(file.type).toBe('image/png')
    })

    it('should support JPEG output', async () => {
      const canvas = document.createElement('canvas')
      canvas.width = 100
      canvas.height = 100

      const file = await canvasToFile(canvas, 'output.jpg', 'image/jpeg', 0.9)

      expect(file).toBeInstanceOf(File)
      expect(file.name).toBe('output.jpg')
    })
  })
})
