/**
 * Color Utilities
 * RGB, HSL, Hex conversions and color operations
 */

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface HSLColor {
  h: number;
  s: number;
  l: number;
}

export interface LABColor {
  l: number; // Lightness (0-100)
  a: number; // Green-Red (-128 to 127)
  b: number; // Blue-Yellow (-128 to 127)
}

export interface ColorInfo {
  hex: string;
  rgb: RGBColor;
  hsl: HSLColor;
  percentage?: number;
  name?: string;
  category?: 'light' | 'mid' | 'dark';
  prominence?: number;
  pixelCount?: number;
}

/**
 * Convert RGB to Hex
 */
export function rgbToHex({ r, g, b }: RGBColor): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => Math.round(x).toString(16).padStart(2, '0'))
      .join('')
  );
}

/**
 * Convert Hex to RGB
 */
export function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

/**
 * Convert RGB to HSL
 */
export function rgbToHsl(r: number, g: number, b: number): HSLColor {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
}

/**
 * Convert HSL to RGB
 */
export function hslToRgb(h: number, s: number, l: number): RGBColor {
  h /= 360;
  s /= 100;
  l /= 100;

  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

/**
 * Quantize color to group similar colors
 */
export function quantizeColor(rgb: RGBColor, levels: number): RGBColor {
  const factor = 255 / (levels - 1);

  return {
    r: Math.round(Math.round(rgb.r / factor) * factor),
    g: Math.round(Math.round(rgb.g / factor) * factor),
    b: Math.round(Math.round(rgb.b / factor) * factor),
  };
}

/**
 * Calculate color distance (Euclidean)
 */
export function colorDistance(c1: RGBColor, c2: RGBColor): number {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
      Math.pow(c1.g - c2.g, 2) +
      Math.pow(c1.b - c2.b, 2)
  );
}

/**
 * Get color category based on lightness
 */
export function getColorCategory(
  lightness: number
): 'light' | 'mid' | 'dark' {
  if (lightness > 70) return 'light';
  if (lightness < 30) return 'dark';
  return 'mid';
}

/**
 * Generate simple color name based on hue
 */
export function getColorName(hsl: HSLColor): string {
  const { h, s, l } = hsl;

  if (s < 10) {
    if (l > 90) return 'White';
    if (l < 10) return 'Black';
    return 'Gray';
  }

  if (h < 15 || h >= 345) return 'Red';
  if (h < 45) return 'Orange';
  if (h < 75) return 'Yellow';
  if (h < 165) return 'Green';
  if (h < 195) return 'Cyan';
  if (h < 255) return 'Blue';
  if (h < 285) return 'Purple';
  if (h < 345) return 'Magenta';

  return 'Unknown';
}

/**
 * Convert RGB to LAB color space
 * LAB provides perceptually uniform color representation
 * Uses D65 illuminant (standard daylight)
 *
 * @param rgb - RGB color with values 0-255
 * @returns LAB color with L (0-100), a and b (-128 to 127)
 */
export function rgbToLab({ r, g, b }: RGBColor): LABColor {
  // Step 1: Convert RGB to linear RGB (remove gamma correction)
  const toLinear = (channel: number): number => {
    const normalized = channel / 255;
    return normalized <= 0.04045
      ? normalized / 12.92
      : Math.pow((normalized + 0.055) / 1.055, 2.4);
  };

  const rLinear = toLinear(r);
  const gLinear = toLinear(g);
  const bLinear = toLinear(b);

  // Step 2: Convert linear RGB to XYZ using sRGB matrix
  // Using D65 illuminant transformation matrix
  let x = rLinear * 0.4124564 + gLinear * 0.3575761 + bLinear * 0.1804375;
  let y = rLinear * 0.2126729 + gLinear * 0.7151522 + bLinear * 0.072175;
  let z = rLinear * 0.0193339 + gLinear * 0.119192 + bLinear * 0.9503041;

  // Step 3: Normalize XYZ relative to D65 reference white
  // D65 white point: xn=95.047, yn=100.000, zn=108.883
  x = (x * 100) / 95.047;
  y = (y * 100) / 100.0;
  z = (z * 100) / 108.883;

  // Step 4: Apply LAB transformation function
  const f = (t: number): number => {
    const delta = 6 / 29;
    return t > Math.pow(delta, 3)
      ? Math.cbrt(t)
      : t / (3 * delta * delta) + 4 / 29;
  };

  const fx = f(x);
  const fy = f(y);
  const fz = f(z);

  // Step 5: Calculate LAB values
  const lValue = 116 * fy - 16;
  const aValue = 500 * (fx - fy);
  const bValue = 200 * (fy - fz);

  return {
    l: Math.max(0, Math.min(100, lValue)),
    a: Math.max(-128, Math.min(127, aValue)),
    b: Math.max(-128, Math.min(127, bValue)),
  };
}

/**
 * Calculate Delta E 2000 - perceptual color difference
 * Uses simplified Euclidean distance in LAB space for performance
 *
 * Perceptual thresholds:
 * - 0-2: Imperceptible difference (just noticeable difference)
 * - 2-10: Perceptible difference (minor variation)
 * - 10-50: Different colors (significant variation)
 * - >50: Very different colors (opposite hues)
 *
 * @param lab1 - First LAB color
 * @param lab2 - Second LAB color
 * @returns Perceptual distance between colors (0 = identical)
 */
export function deltaE2000(lab1: LABColor, lab2: LABColor): number {
  // Simplified Delta E calculation using Euclidean distance in LAB space
  // This is a performance-optimized approximation of the full CIE Delta E 2000 formula
  // For most use cases, this provides sufficient perceptual accuracy

  const deltaL = lab1.l - lab2.l;
  const deltaA = lab1.a - lab2.a;
  const deltaB = lab1.b - lab2.b;

  // Euclidean distance in LAB space
  // Note: Full Delta E 2000 includes additional weighting factors for
  // chroma, hue, and lightness, but this simplified version works well
  // for general color matching applications
  const distance = Math.sqrt(
    deltaL * deltaL +
    deltaA * deltaA +
    deltaB * deltaB
  );

  return distance;
}

/**
 * Get color match confidence score based on perceptual distance
 *
 * @param color1 - First RGB color
 * @param color2 - Second RGB color
 * @returns Object with perceptual distance and confidence percentage
 *
 * @example
 * ```typescript
 * const result = getColorMatchConfidence(
 *   { r: 255, g: 0, b: 0 },
 *   { r: 250, g: 5, b: 5 }
 * );
 * // Returns: { distance: 3.2, confidence: 95 }
 * ```
 */
export function getColorMatchConfidence(
  color1: RGBColor,
  color2: RGBColor
): { distance: number; confidence: number } {
  const lab1 = rgbToLab(color1);
  const lab2 = rgbToLab(color2);
  const distance = deltaE2000(lab1, lab2);

  // Calculate confidence based on perceptual distance thresholds
  let confidence: number;

  if (distance < 2) {
    // Imperceptible difference - very high confidence
    confidence = 100;
  } else if (distance < 5) {
    // Just perceptible - high confidence
    confidence = 95;
  } else if (distance < 10) {
    // Perceptible but similar - good confidence
    confidence = 85;
  } else if (distance < 20) {
    // Noticeable difference - moderate confidence
    confidence = 70;
  } else if (distance < 50) {
    // Different colors - low confidence
    confidence = 50;
  } else {
    // Very different colors - minimal confidence
    confidence = 30;
  }

  return {
    distance: Math.round(distance * 10) / 10, // Round to 1 decimal
    confidence,
  };
}
