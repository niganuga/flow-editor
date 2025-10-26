/**
 * Recolor Tool
 * Extract color palette and recolor images using client-side processing
 */

import { loadImage } from '../canvas-utils';
import {
  quantizeColor,
  rgbToHex,
  hexToRgb,
  rgbToHsl,
  getColorName,
  getColorCategory,
  rgbToLab,
  deltaE2000,
  type ColorInfo,
  type RGBColor,
  type LABColor,
} from '../color-utils';
import { canvasToBlob } from '../file-utils';

export type PaletteAlgorithm = 'smart' | 'detailed';
export type BlendMode = 'replace' | 'overlay' | 'multiply';

export interface ColorRegion {
  /** Array of pixel coordinates belonging to this region */
  pixels: Array<{ x: number; y: number }>;
  /** Bounding box of the region */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  /** Average RGB color of all pixels in the region */
  averageColor: RGBColor;
  /** LAB representation of the average color */
  labColor: LABColor;
  /** Total number of pixels in the region */
  pixelCount: number;
  /** Percentage of total image covered by this region (0-100) */
  coverage: number;
  /** Color uniformity score - how consistent colors are within region (0-100) */
  confidence: number;
}

export interface PaletteExtractionSettings {
  paletteSize: 9 | 36;
  algorithm: PaletteAlgorithm;
  includeRareColors: boolean;
  quality: number; // 0-100
}

export interface RecolorSettings {
  colorMappings: Map<number, string>; // colorIndex → newHexColor
  blendMode: BlendMode;
  tolerance: number; // 0-100
  preserveTransparency: boolean;
}

/**
 * Extract color palette from image
 */
export async function extractColors(
  imageUrl: string,
  settings: PaletteExtractionSettings,
  onProgress?: (progress: number, message: string) => void
): Promise<ColorInfo[]> {
  onProgress?.(0, 'Loading image...');

  const img = await loadImage(imageUrl);

  onProgress?.(10, 'Analyzing colors...');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  // Resize for performance
  const maxSize = settings.algorithm === 'detailed' ? 500 : 300;
  const scale = maxSize / Math.max(img.width, img.height);

  canvas.width = Math.floor(img.width * scale);
  canvas.height = Math.floor(img.height * scale);

  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  onProgress?.(30, 'Sampling pixels...');

  // Sample pixels
  const step = settings.algorithm === 'detailed' ? 4 : 8;
  const quantization = settings.algorithm === 'detailed' ? 8 : 16;

  const colorMap = new Map<string, number>();

  for (let i = 0; i < data.length; i += step * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip transparent, very light, or very dark pixels
    if (a < 200) continue;
    if (r > 250 && g > 250 && b > 250) continue;
    if (r < 5 && g < 5 && b < 5) continue;

    // Quantize color to group similar ones
    const quantized = quantizeColor({ r, g, b }, quantization);
    const hex = rgbToHex(quantized);

    colorMap.set(hex, (colorMap.get(hex) || 0) + 1);

    // Progress update
    if (i % Math.floor(data.length / 5) === 0) {
      const progress = 30 + (i / data.length) * 40;
      onProgress?.(progress, 'Analyzing colors...');
    }
  }

  onProgress?.(70, 'Sorting colors...');

  // Sort by frequency and take top N
  const sortedColors = Array.from(colorMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, settings.paletteSize);

  onProgress?.(90, 'Creating palette...');

  // Create ColorInfo objects with full metadata
  const totalPixels = sortedColors.reduce((sum, [, count]) => sum + count, 0);

  const palette = sortedColors.map(([hex, count]) => {
    const rgb = hexToRgb(hex);
    const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);

    const colorInfo: ColorInfo = {
      hex,
      rgb,
      hsl,
      percentage: (count / totalPixels) * 100,
      name: getColorName(hsl),
      category: getColorCategory(hsl.l),
      prominence: count / totalPixels,
      pixelCount: count,
    };

    return colorInfo;
  });

  onProgress?.(100, 'Complete!');

  return palette;
}

/**
 * Recolor image using color mappings
 */
export async function recolorImage(
  imageUrl: string,
  originalColors: ColorInfo[],
  settings: RecolorSettings,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {
  onProgress?.(0, 'Loading image...');

  const img = await loadImage(imageUrl);

  onProgress?.(10, 'Preparing canvas...');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  onProgress?.(20, 'Applying color changes...');

  const tolerance = (settings.tolerance / 100) * 255;

  // Apply each color mapping
  let mappingIndex = 0;
  for (const [colorIndex, newHex] of settings.colorMappings.entries()) {
    const originalColor = originalColors[colorIndex];
    const newRgb = hexToRgb(newHex);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Skip transparent pixels if preserving transparency
      if (settings.preserveTransparency && a < 255) continue;

      // Check if pixel matches original color (within tolerance)
      const rDiff = Math.abs(r - originalColor.rgb.r);
      const gDiff = Math.abs(g - originalColor.rgb.g);
      const bDiff = Math.abs(b - originalColor.rgb.b);

      if (rDiff < tolerance && gDiff < tolerance && bDiff < tolerance) {
        // Apply blend mode
        switch (settings.blendMode) {
          case 'replace':
            data[i] = newRgb.r;
            data[i + 1] = newRgb.g;
            data[i + 2] = newRgb.b;
            break;

          case 'overlay':
            data[i] = Math.round((r + newRgb.r) / 2);
            data[i + 1] = Math.round((g + newRgb.g) / 2);
            data[i + 2] = Math.round((b + newRgb.b) / 2);
            break;

          case 'multiply':
            data[i] = Math.round((r * newRgb.r) / 255);
            data[i + 1] = Math.round((g * newRgb.g) / 255);
            data[i + 2] = Math.round((b * newRgb.b) / 255);
            break;
        }
      }
    }

    mappingIndex++;
    const progress =
      20 + (mappingIndex / settings.colorMappings.size) * 70;
    onProgress?.(progress, `Recoloring ${mappingIndex}/${settings.colorMappings.size} colors...`);
  }

  onProgress?.(90, 'Applying changes...');
  ctx.putImageData(imageData, 0, 0);

  onProgress?.(95, 'Generating result...');
  const blob = await canvasToBlob(canvas, 'image/png', 1.0);

  onProgress?.(100, 'Done!');
  return blob;
}

/**
 * Detect a contiguous color region using intelligent flood-fill algorithm
 *
 * Uses LAB color space and deltaE2000 for perceptually accurate color matching.
 * Implements iterative queue-based flood fill (non-recursive) for performance.
 *
 * @param imageData - ImageData from canvas context
 * @param startX - X coordinate of starting pixel (click position)
 * @param startY - Y coordinate of starting pixel (click position)
 * @param toleranceDeltaE - Color similarity tolerance using deltaE2000 (default: 10)
 *                          Lower values = stricter matching, higher values = more lenient
 * @returns ColorRegion with detected pixels and metadata
 *
 * @throws Error if coordinates are out of bounds or imageData is invalid
 *
 * @example
 * ```typescript
 * const ctx = canvas.getContext('2d');
 * const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
 *
 * // Detect region with moderate tolerance (perceptible differences)
 * const region = detectColorRegion(imageData, 100, 100, 10);
 * console.log(`Found ${region.pixelCount} pixels, ${region.confidence}% uniform`);
 * ```
 */
export function detectColorRegion(
  imageData: ImageData,
  startX: number,
  startY: number,
  toleranceDeltaE: number = 10
): ColorRegion {
  // Input validation
  if (!imageData || !imageData.data || imageData.width <= 0 || imageData.height <= 0) {
    throw new Error('Invalid imageData provided');
  }

  const { width, height, data } = imageData;

  // Validate coordinates
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
    throw new Error(
      `Coordinates (${startX}, ${startY}) are out of bounds for image ${width}x${height}`
    );
  }

  // Safety limits
  const MAX_PIXELS = 1_000_000;
  const totalPixels = width * height;

  // Get starting pixel color
  const startIndex = (startY * width + startX) * 4;
  const startR = data[startIndex];
  const startG = data[startIndex + 1];
  const startB = data[startIndex + 2];
  const startA = data[startIndex + 3];

  // Handle transparent pixels
  if (startA < 10) {
    throw new Error('Cannot detect region starting from transparent pixel');
  }

  const startColor: RGBColor = { r: startR, g: startG, b: startB };
  const startLab = rgbToLab(startColor);

  // Initialize data structures
  const visited = new Set<string>(); // Use string keys for O(1) lookup: "x,y"
  const queue: Array<{ x: number; y: number }> = [{ x: startX, y: startY }];
  const pixels: Array<{ x: number; y: number }> = [];

  // Tracking for average color calculation
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;

  // Tracking for bounds
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  // Tracking for confidence (color variance)
  const colorDistances: number[] = [];

  // 4-connectivity neighbors (up, down, left, right)
  const neighbors = [
    { dx: 0, dy: -1 }, // up
    { dx: 0, dy: 1 },  // down
    { dx: -1, dy: 0 }, // left
    { dx: 1, dy: 0 },  // right
  ];

  // Flood fill using queue-based approach (iterative, not recursive)
  while (queue.length > 0 && pixels.length < MAX_PIXELS) {
    const current = queue.shift()!;
    const key = `${current.x},${current.y}`;

    // Skip if already visited
    if (visited.has(key)) continue;

    // Get current pixel color
    const index = (current.y * width + current.x) * 4;
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const a = data[index + 3];

    // Skip transparent pixels
    if (a < 10) continue;

    // Check color similarity using LAB deltaE2000
    const currentLab = rgbToLab({ r, g, b });
    const distance = deltaE2000(startLab, currentLab);

    // If color is similar enough, add to region
    if (distance <= toleranceDeltaE) {
      visited.add(key);
      pixels.push({ x: current.x, y: current.y });

      // Update color sum for averaging
      sumR += r;
      sumG += g;
      sumB += b;

      // Track color variance for confidence
      colorDistances.push(distance);

      // Update bounds
      if (current.x < minX) minX = current.x;
      if (current.x > maxX) maxX = current.x;
      if (current.y < minY) minY = current.y;
      if (current.y > maxY) maxY = current.y;

      // Add neighbors to queue
      for (const { dx, dy } of neighbors) {
        const nx = current.x + dx;
        const ny = current.y + dy;

        // Check bounds
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const neighborKey = `${nx},${ny}`;
          if (!visited.has(neighborKey)) {
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
  }

  // Handle edge case: no pixels found
  if (pixels.length === 0) {
    throw new Error('No matching pixels found - tolerance may be too strict');
  }

  // Calculate average color
  const pixelCount = pixels.length;
  const averageColor: RGBColor = {
    r: Math.round(sumR / pixelCount),
    g: Math.round(sumG / pixelCount),
    b: Math.round(sumB / pixelCount),
  };

  const labColor = rgbToLab(averageColor);

  // Calculate coverage percentage
  const coverage = (pixelCount / totalPixels) * 100;

  // Calculate confidence based on color variance
  // Lower average distance = higher confidence (more uniform color)
  const avgDistance = colorDistances.reduce((a, b) => a + b, 0) / colorDistances.length;
  const maxVariance = toleranceDeltaE;
  const confidence = Math.max(0, Math.min(100, 100 - (avgDistance / maxVariance) * 100));

  return {
    pixels,
    bounds: { minX, minY, maxX, maxY },
    averageColor,
    labColor,
    pixelCount,
    coverage: Math.round(coverage * 100) / 100, // Round to 2 decimals
    confidence: Math.round(confidence),
  };
}
