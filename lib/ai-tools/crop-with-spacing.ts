/**
 * Crop with Spacing Tool
 * Crop image with specific spacing around the design (supports inches → px conversion)
 */

import { autoCrop, type AutoCropResult } from './auto-crop';

export interface CropWithSpacingOptions {
  imageUrl: string;
  spacing: number; // Spacing in pixels or inches
  unit?: 'px' | 'inches'; // Default: 'px'
  dpi?: number; // DPI for inch conversion (default: 300 for print quality)
}

export interface CropWithSpacingResult extends AutoCropResult {
  spacingPx: number;
  spacingInches?: number;
  dpi: number;
}

/**
 * Convert inches to pixels based on DPI
 */
function inchesToPixels(inches: number, dpi: number): number {
  return Math.round(inches * dpi);
}

/**
 * Convert pixels to inches based on DPI
 */
function pixelsToInches(pixels: number, dpi: number): number {
  return pixels / dpi;
}

/**
 * Crop image with specific spacing around the design
 */
export async function cropWithSpacing(
  options: CropWithSpacingOptions
): Promise<CropWithSpacingResult> {
  const { imageUrl, spacing, unit = 'px', dpi = 300 } = options;

  // Convert spacing to pixels if needed
  const spacingPx = unit === 'inches' ? inchesToPixels(spacing, dpi) : spacing;

  // First, auto-crop to find content bounds with the specified spacing
  const result = await autoCrop({
    imageUrl,
    tolerance: 10,
    minPadding: spacingPx,
  });

  return {
    ...result,
    spacingPx,
    spacingInches: unit === 'px' ? pixelsToInches(spacingPx, dpi) : spacing,
    dpi,
  };
}

/**
 * Helper: Parse spacing from natural language
 * Examples: "1 inch", "2 inches", "50px", "0.5 inch"
 */
export function parseSpacing(input: string): { spacing: number; unit: 'px' | 'inches' } {
  const normalized = input.toLowerCase().trim();

  // Match patterns like "1 inch", "2 inches", "50px", "0.5 inch"
  const inchMatch = normalized.match(/(\d+\.?\d*)\s*(inch|inches|in|")/);
  const pxMatch = normalized.match(/(\d+\.?\d*)\s*(px|pixel|pixels)?/);

  if (inchMatch) {
    return {
      spacing: parseFloat(inchMatch[1]),
      unit: 'inches',
    };
  }

  if (pxMatch) {
    return {
      spacing: parseFloat(pxMatch[1]),
      unit: 'px',
    };
  }

  // Default to pixels if no unit specified
  const numMatch = normalized.match(/(\d+\.?\d*)/);
  if (numMatch) {
    return {
      spacing: parseFloat(numMatch[1]),
      unit: 'px',
    };
  }

  throw new Error(`Could not parse spacing: "${input}"`);
}
