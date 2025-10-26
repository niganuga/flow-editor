/**
 * Color Knockout Tool
 * Remove specific colors from images with tolerance and anti-aliasing
 */

import { applyFeather, loadImage } from '../canvas-utils';
import { colorDistance, type RGBColor } from '../color-utils';
import { canvasToBlob } from '../file-utils';

export interface SelectedColor {
  r: number;
  g: number;
  b: number;
  hex: string;
}

export type ReplaceMode = 'transparency' | 'color' | 'mask';

export interface ColorKnockoutSettings {
  tolerance: number; // 0-100
  replaceMode: ReplaceMode;
  feather: number; // 0-20px
  antiAliasing: boolean;
  edgeSmoothing: number; // 0-1
}

export interface ColorKnockoutOptions {
  imageUrl: string;
  selectedColors: SelectedColor[];
  settings: ColorKnockoutSettings;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Check if pixel matches any selected color
 */
function matchesAnyColor(
  pixel: RGBColor,
  selectedColors: SelectedColor[],
  tolerance: number
): boolean {
  const maxDistance = 441.67; // sqrt(255^2 + 255^2 + 255^2)
  const threshold = (tolerance / 100) * maxDistance;

  return selectedColors.some((color) => {
    const distance = colorDistance(pixel, color);
    return distance <= threshold;
  });
}

/**
 * Calculate edge distance for anti-aliasing
 */
function calculateEdgeDistance(
  data: Uint8ClampedArray,
  x: number,
  y: number,
  width: number,
  height: number,
  selectedColors: SelectedColor[],
  tolerance: number
): number {
  let minDistance = Infinity;

  // Check 3x3 grid around pixel
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx;
      const ny = y + dy;

      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const idx = (ny * width + nx) * 4;
      const neighbor = { r: data[idx], g: data[idx + 1], b: data[idx + 2] };

      if (!matchesAnyColor(neighbor, selectedColors, tolerance)) {
        const distance = Math.sqrt(dx * dx + dy * dy);
        minDistance = Math.min(minDistance, distance);
      }
    }
  }

  return minDistance === Infinity ? 2 : minDistance;
}

/**
 * Process color knockout on canvas
 */
function processColorKnockout(
  canvas: HTMLCanvasElement,
  selectedColors: SelectedColor[],
  settings: ColorKnockoutSettings,
  onProgress?: (progress: number, message: string) => void
): void {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  onProgress?.(10, 'Analyzing image pixels...');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const totalPixels = data.length / 4;

  onProgress?.(30, 'Processing color knockout...');

  for (let i = 0; i < data.length; i += 4) {
    const pixel = { r: data[i], g: data[i + 1], b: data[i + 2] };

    if (matchesAnyColor(pixel, selectedColors, settings.tolerance)) {
      // Calculate edge distance for anti-aliasing
      const x = ((i / 4) % canvas.width) | 0;
      const y = ((i / 4) / canvas.width) | 0;

      const edgeDistance = settings.antiAliasing
        ? calculateEdgeDistance(
            data,
            x,
            y,
            canvas.width,
            canvas.height,
            selectedColors,
            settings.tolerance
          )
        : 2;

      const alphaModifier = edgeDistance < 2 ? edgeDistance / 2 : 1;

      switch (settings.replaceMode) {
        case 'transparency':
          data[i + 3] = Math.floor(255 * (1 - alphaModifier));
          break;
        case 'color':
          // Replace with white
          data[i] = 255;
          data[i + 1] = 255;
          data[i + 2] = 255;
          break;
        case 'mask':
          const maskValue = alphaModifier > 0.5 ? 0 : 255;
          data[i] = data[i + 1] = data[i + 2] = maskValue;
          data[i + 3] = 255;
          break;
      }
    }

    // Progress update every 10%
    if (i % Math.floor(data.length / 10) === 0) {
      const progress = 30 + (i / data.length) * 50;
      onProgress?.(progress, 'Processing pixels...');
    }
  }

  onProgress?.(80, 'Applying changes...');
  ctx.putImageData(imageData, 0, 0);

  // Apply feathering if needed
  if (settings.feather > 0) {
    onProgress?.(85, 'Applying edge feathering...');
    applyFeather(canvas, settings.feather);
  }

  onProgress?.(100, 'Complete!');
}

/**
 * Main color knockout function
 */
export async function performColorKnockout({
  imageUrl,
  selectedColors,
  settings,
  onProgress,
}: ColorKnockoutOptions): Promise<Blob> {
  if (selectedColors.length === 0) {
    throw new Error('No colors selected');
  }

  onProgress?.(0, 'Loading image...');

  // Load image
  const img = await loadImage(imageUrl);

  onProgress?.(5, 'Creating canvas...');

  // Create canvas
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = img.width;
  canvas.height = img.height;

  ctx.drawImage(img, 0, 0);

  // Process knockout
  processColorKnockout(canvas, selectedColors, settings, onProgress);

  // Convert to blob
  onProgress?.(95, 'Generating result...');
  const blob = await canvasToBlob(canvas, 'image/png', 1.0);

  onProgress?.(100, 'Done!');
  return blob;
}

/**
 * Pick color from image at coordinates
 */
export async function pickColorFromImage(
  imageUrl: string,
  x: number,
  y: number
): Promise<SelectedColor> {
  const img = await loadImage(imageUrl);

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(x, y, 1, 1);
  const data = imageData.data;

  const r = data[0];
  const g = data[1];
  const b = data[2];

  const hex =
    '#' +
    [r, g, b]
      .map((val) => val.toString(16).padStart(2, '0'))
      .join('');

  return { r, g, b, hex };
}
