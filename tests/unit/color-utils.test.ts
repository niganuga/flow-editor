import { describe, it, expect } from 'vitest'
import {
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  hslToRgb,
  quantizeColor,
  colorDistance,
  getColorCategory,
  getColorName,
  rgbToLab,
  deltaE2000,
  getColorMatchConfidence,
  type RGBColor,
  type HSLColor,
  type LABColor,
} from '@/lib/color-utils'

describe('Color Utilities', () => {
  describe('rgbToHex', () => {
    it('should convert pure red correctly', () => {
      expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000')
    })

    it('should convert pure green correctly', () => {
      expect(rgbToHex({ r: 0, g: 255, b: 0 })).toBe('#00ff00')
    })

    it('should convert pure blue correctly', () => {
      expect(rgbToHex({ r: 0, g: 0, b: 255 })).toBe('#0000ff')
    })

    it('should convert white correctly', () => {
      expect(rgbToHex({ r: 255, g: 255, b: 255 })).toBe('#ffffff')
    })

    it('should convert black correctly', () => {
      expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
    })

    it('should pad single digits with zero', () => {
      expect(rgbToHex({ r: 15, g: 15, b: 15 })).toBe('#0f0f0f')
    })
  })

  describe('hexToRgb', () => {
    it('should convert hex to RGB with hash', () => {
      expect(hexToRgb('#ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('should convert hex to RGB without hash', () => {
      expect(hexToRgb('ff0000')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('should handle uppercase hex', () => {
      expect(hexToRgb('#FF0000')).toEqual({ r: 255, g: 0, b: 0 })
    })

    it('should return black for invalid hex', () => {
      expect(hexToRgb('invalid')).toEqual({ r: 0, g: 0, b: 0 })
    })
  })

  describe('rgbToHsl', () => {
    it('should convert red correctly', () => {
      const hsl = rgbToHsl(255, 0, 0)
      expect(hsl.h).toBeCloseTo(0)
      expect(hsl.s).toBeCloseTo(100)
      expect(hsl.l).toBeCloseTo(50)
    })

    it('should convert white correctly', () => {
      const hsl = rgbToHsl(255, 255, 255)
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(0)
      expect(hsl.l).toBeCloseTo(100)
    })

    it('should convert black correctly', () => {
      const hsl = rgbToHsl(0, 0, 0)
      expect(hsl.h).toBe(0)
      expect(hsl.s).toBe(0)
      expect(hsl.l).toBe(0)
    })

    it('should convert gray correctly', () => {
      const hsl = rgbToHsl(128, 128, 128)
      expect(hsl.s).toBeCloseTo(0)
      expect(hsl.l).toBeCloseTo(50.2, 1)
    })
  })

  describe('hslToRgb', () => {
    it('should convert hsl to rgb correctly', () => {
      const rgb = hslToRgb(0, 100, 50)
      expect(rgb.r).toBe(255)
      expect(rgb.g).toBe(0)
      expect(rgb.b).toBe(0)
    })

    it('should round trip correctly', () => {
      const original = { r: 100, g: 150, b: 200 }
      const hsl = rgbToHsl(original.r, original.g, original.b)
      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l)

      expect(rgb.r).toBeCloseTo(original.r, 0)
      expect(rgb.g).toBeCloseTo(original.g, 0)
      expect(rgb.b).toBeCloseTo(original.b, 0)
    })
  })

  describe('quantizeColor', () => {
    it('should quantize color to specified levels', () => {
      const color: RGBColor = { r: 123, g: 234, b: 56 }
      const quantized = quantizeColor(color, 8)

      // Should round to nearest level
      expect(quantized.r).toBeCloseTo(109, 0)
      expect(quantized.g).toBeCloseTo(218, 0)
      expect(quantized.b).toBeCloseTo(36, 0)
    })

    it('should handle pure colors', () => {
      const red: RGBColor = { r: 255, g: 0, b: 0 }
      const quantized = quantizeColor(red, 16)
      expect(quantized).toEqual({ r: 255, g: 0, b: 0 })
    })
  })

  describe('colorDistance', () => {
    it('should return 0 for identical colors', () => {
      const c1: RGBColor = { r: 100, g: 150, b: 200 }
      const c2: RGBColor = { r: 100, g: 150, b: 200 }
      expect(colorDistance(c1, c2)).toBe(0)
    })

    it('should return positive distance for different colors', () => {
      const c1: RGBColor = { r: 0, g: 0, b: 0 }
      const c2: RGBColor = { r: 255, g: 255, b: 255 }
      expect(colorDistance(c1, c2)).toBeGreaterThan(0)
    })

    it('should be symmetric', () => {
      const c1: RGBColor = { r: 100, g: 150, b: 200 }
      const c2: RGBColor = { r: 50, g: 100, b: 150 }
      expect(colorDistance(c1, c2)).toBe(colorDistance(c2, c1))
    })
  })

  describe('getColorCategory', () => {
    it('should categorize light colors', () => {
      expect(getColorCategory(80)).toBe('light')
    })

    it('should categorize dark colors', () => {
      expect(getColorCategory(20)).toBe('dark')
    })

    it('should categorize mid-tone colors', () => {
      expect(getColorCategory(50)).toBe('mid')
    })

    it('should handle boundary cases', () => {
      expect(getColorCategory(70)).toBe('mid')
      expect(getColorCategory(71)).toBe('light')
      expect(getColorCategory(30)).toBe('mid')
      expect(getColorCategory(29)).toBe('dark')
    })
  })

  describe('getColorName', () => {
    it('should identify red', () => {
      expect(getColorName({ h: 0, s: 100, l: 50 })).toBe('Red')
      expect(getColorName({ h: 350, s: 100, l: 50 })).toBe('Red')
    })

    it('should identify orange', () => {
      expect(getColorName({ h: 30, s: 100, l: 50 })).toBe('Orange')
    })

    it('should identify blue', () => {
      expect(getColorName({ h: 220, s: 100, l: 50 })).toBe('Blue')
    })

    it('should identify grayscale colors', () => {
      expect(getColorName({ h: 0, s: 0, l: 95 })).toBe('White')
      expect(getColorName({ h: 0, s: 0, l: 5 })).toBe('Black')
      expect(getColorName({ h: 0, s: 5, l: 50 })).toBe('Gray')
    })
  })

  describe('rgbToLab', () => {
    it('should convert pure red to LAB', () => {
      const lab = rgbToLab({ r: 255, g: 0, b: 0 })
      expect(lab.l).toBeCloseTo(53.24, 1)
      expect(lab.a).toBeCloseTo(80.09, 1)
      expect(lab.b).toBeCloseTo(67.20, 1)
    })

    it('should convert pure white to LAB', () => {
      const lab = rgbToLab({ r: 255, g: 255, b: 255 })
      expect(lab.l).toBeCloseTo(100, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should convert pure black to LAB', () => {
      const lab = rgbToLab({ r: 0, g: 0, b: 0 })
      expect(lab.l).toBeCloseTo(0, 1)
      expect(lab.a).toBeCloseTo(0, 1)
      expect(lab.b).toBeCloseTo(0, 1)
    })

    it('should convert pure green to LAB', () => {
      const lab = rgbToLab({ r: 0, g: 255, b: 0 })
      expect(lab.l).toBeGreaterThan(80)
      expect(lab.a).toBeLessThan(0) // Green is negative on a-axis
    })

    it('should return bounded LAB values', () => {
      const lab = rgbToLab({ r: 255, g: 255, b: 255 })
      expect(lab.l).toBeGreaterThanOrEqual(0)
      expect(lab.l).toBeLessThanOrEqual(100)
      expect(lab.a).toBeGreaterThanOrEqual(-128)
      expect(lab.a).toBeLessThanOrEqual(127)
      expect(lab.b).toBeGreaterThanOrEqual(-128)
      expect(lab.b).toBeLessThanOrEqual(127)
    })
  })

  describe('deltaE2000', () => {
    it('should return 0 for identical colors', () => {
      const lab1: LABColor = { l: 50, a: 0, b: 0 }
      const lab2: LABColor = { l: 50, a: 0, b: 0 }
      expect(deltaE2000(lab1, lab2)).toBe(0)
    })

    it('should return positive distance for different colors', () => {
      const lab1: LABColor = { l: 50, a: 0, b: 0 }
      const lab2: LABColor = { l: 50, a: 10, b: 0 }
      expect(deltaE2000(lab1, lab2)).toBeGreaterThan(0)
    })

    it('should be symmetric', () => {
      const lab1: LABColor = { l: 50, a: 10, b: 5 }
      const lab2: LABColor = { l: 60, a: -5, b: 10 }
      expect(deltaE2000(lab1, lab2)).toBe(deltaE2000(lab2, lab1))
    })

    it('should increase with larger differences', () => {
      const lab1: LABColor = { l: 50, a: 0, b: 0 }
      const lab2: LABColor = { l: 50, a: 5, b: 0 }
      const lab3: LABColor = { l: 50, a: 10, b: 0 }

      const distance1 = deltaE2000(lab1, lab2)
      const distance2 = deltaE2000(lab1, lab3)

      expect(distance2).toBeGreaterThan(distance1)
    })
  })

  describe('getColorMatchConfidence', () => {
    it('should return high confidence for identical colors', () => {
      const result = getColorMatchConfidence(
        { r: 255, g: 0, b: 0 },
        { r: 255, g: 0, b: 0 }
      )
      expect(result.confidence).toBe(100)
      expect(result.distance).toBeCloseTo(0, 1)
    })

    it('should return high confidence for very similar colors', () => {
      const result = getColorMatchConfidence(
        { r: 255, g: 0, b: 0 },
        { r: 250, g: 5, b: 5 }
      )
      expect(result.confidence).toBeGreaterThanOrEqual(85)
    })

    it('should return low confidence for very different colors', () => {
      const result = getColorMatchConfidence(
        { r: 255, g: 0, b: 0 },
        { r: 0, g: 0, b: 255 }
      )
      expect(result.confidence).toBeLessThan(70)
    })

    it('should return distance and confidence', () => {
      const result = getColorMatchConfidence(
        { r: 100, g: 150, b: 200 },
        { r: 105, g: 155, b: 205 }
      )
      expect(result).toHaveProperty('distance')
      expect(result).toHaveProperty('confidence')
      expect(result.distance).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeGreaterThanOrEqual(0)
      expect(result.confidence).toBeLessThanOrEqual(100)
    })
  })
})
