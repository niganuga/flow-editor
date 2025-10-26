/**
 * Test Data Generator
 * Utilities for generating test images and data
 */

export interface TestImageOptions {
  backgroundColor?: string
  includeTransparency?: boolean
  format?: 'png' | 'jpeg' | 'webp'
  gradient?: boolean
}

/**
 * Generate a test image with specified properties
 */
export async function generateTestImage(
  width: number,
  height: number,
  options: TestImageOptions = {}
): Promise<string> {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  if (options.gradient) {
    // Create a gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height)
    gradient.addColorStop(0, '#ff0000')
    gradient.addColorStop(0.5, '#00ff00')
    gradient.addColorStop(1, '#0000ff')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)
  } else if (options.backgroundColor) {
    // Fill with solid color
    ctx.fillStyle = options.backgroundColor
    ctx.fillRect(0, 0, width, height)
  } else {
    // Fill with white by default
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
  }

  // Add transparency if requested
  if (options.includeTransparency) {
    ctx.clearRect(width / 4, height / 4, width / 2, height / 2)
  }

  const format = options.format || 'png'
  return canvas.toDataURL(`image/${format}`)
}

/**
 * Generate a color palette for testing
 */
export function generateColorPalette(size: number) {
  return Array.from({ length: size }, (_, i) => {
    const hue = (360 / size) * i
    return {
      hex: hslToHex(hue, 100, 50),
      rgb: hslToRgb(hue, 100, 50),
      hsl: { h: hue, s: 100, l: 50 },
      percentage: 100 / size,
      name: `Color ${i + 1}`,
      category: 'mid' as const,
    }
  })
}

/**
 * Helper: Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number) {
  h /= 360
  s /= 100
  l /= 100

  let r, g, b

  if (s === 0) {
    r = g = b = l
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q

    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  }
}

/**
 * Helper: Convert HSL to Hex
 */
function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l)
  return (
    '#' +
    [rgb.r, rgb.g, rgb.b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  )
}

/**
 * Create mock ImageData
 */
export function createMockImageData(
  width: number,
  height: number,
  fillColor: string
): ImageData {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = fillColor
  ctx.fillRect(0, 0, width, height)

  return ctx.getImageData(0, 0, width, height)
}

/**
 * Generate a test file
 */
export function generateTestFile(
  content: string,
  filename: string,
  mimeType: string
): File {
  return new File([content], filename, { type: mimeType })
}

/**
 * Generate a large test image for performance testing
 */
export async function generateLargeTestImage(megapixels: number): Promise<string> {
  const dimension = Math.sqrt(megapixels * 1000000)
  return generateTestImage(dimension, dimension, {
    backgroundColor: '#ff0000',
  })
}
