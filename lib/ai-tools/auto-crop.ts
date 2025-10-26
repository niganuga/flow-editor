/**
 * Auto-Crop Tool
 * Automatically trim extra space around design edges
 */

export interface AutoCropOptions {
  imageUrl: string;
  tolerance?: number; // 0-255, how much color variation to tolerate (default: 30)
  minPadding?: number; // Minimum padding to leave in pixels (default: 0)
  backgroundColor?: string | 'auto' | 'white' | 'black' | 'transparent'; // Color to trim (hex, 'auto', 'white', 'black', or 'transparent')
}

export interface AutoCropResult {
  croppedImageUrl: string;
  originalDimensions: { width: number; height: number };
  croppedDimensions: { width: number; height: number };
  trimmed: { top: number; right: number; bottom: number; left: number };
}

/**
 * Common color names to hex mapping
 */
const COLOR_NAMES: Record<string, string> = {
  orange: '#FF8C00',
  red: '#FF0000',
  blue: '#0000FF',
  green: '#00FF00',
  yellow: '#FFFF00',
  purple: '#800080',
  pink: '#FFC0CB',
  cyan: '#00FFFF',
  magenta: '#FF00FF',
  brown: '#A52A2A',
  gray: '#808080',
  grey: '#808080',
  silver: '#C0C0C0',
  gold: '#FFD700',
  navy: '#000080',
  teal: '#008080',
  maroon: '#800000',
  lime: '#00FF00',
  olive: '#808000',
  aqua: '#00FFFF',
};

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`);
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert color name or hex to RGB
 */
function parseColor(color: string): { r: number; g: number; b: number } {
  // Check if it's a color name
  const colorLower = color.toLowerCase();
  if (COLOR_NAMES[colorLower]) {
    return hexToRgb(COLOR_NAMES[colorLower]);
  }

  // Try to parse as hex
  return hexToRgb(color);
}

/**
 * Auto-detect background color by sampling corner pixels
 */
function detectBackgroundColor(imageData: ImageData): { r: number; g: number; b: number } {
  const { width, height, data } = imageData;

  // Sample 4 corner pixels and average them
  const corners = [
    { x: 0, y: 0 }, // Top-left
    { x: width - 1, y: 0 }, // Top-right
    { x: 0, y: height - 1 }, // Bottom-left
    { x: width - 1, y: height - 1 }, // Bottom-right
  ];

  let totalR = 0, totalG = 0, totalB = 0;

  for (const corner of corners) {
    const i = (corner.y * width + corner.x) * 4;
    totalR += data[i];
    totalG += data[i + 1];
    totalB += data[i + 2];
  }

  return {
    r: Math.round(totalR / corners.length),
    g: Math.round(totalG / corners.length),
    b: Math.round(totalB / corners.length),
  };
}

/**
 * Detect content bounds by finding pixels that don't match the background
 */
function detectContentBounds(
  imageData: ImageData,
  tolerance: number,
  targetColor?: { r: number; g: number; b: number } | 'transparent'
): { top: number; right: number; bottom: number; left: number } {
  const { width, height, data } = imageData;

  let top = height;
  let left = width;
  let right = 0;
  let bottom = 0;

  // Helper to check if pixel matches the background/empty color
  const isEmpty = (r: number, g: number, b: number, a: number): boolean => {
    // Check for transparency
    if (targetColor === 'transparent') {
      return a < tolerance;
    }

    // Check for transparency OR target color
    if (targetColor) {
      const matchesAlpha = a < tolerance;
      const matchesColor =
        Math.abs(r - targetColor.r) <= tolerance &&
        Math.abs(g - targetColor.g) <= tolerance &&
        Math.abs(b - targetColor.b) <= tolerance;
      return matchesAlpha || matchesColor;
    }

    // Default: check for transparency or white
    if (a < tolerance) return true;
    const isWhite = r > 255 - tolerance && g > 255 - tolerance && b > 255 - tolerance;
    return isWhite;
  };

  // Scan all pixels to find content bounds
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      if (!isEmpty(r, g, b, a)) {
        // Found content pixel
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }

  // If no content found, return full image bounds
  if (top >= height || left >= width) {
    return { top: 0, left: 0, right: width - 1, bottom: height - 1 };
  }

  return { top, left, right, bottom };
}

/**
 * Auto-crop image by trimming extra space around design
 */
export async function autoCrop(options: AutoCropOptions): Promise<AutoCropResult> {
  const { imageUrl, tolerance = 30, minPadding = 0, backgroundColor = 'white' } = options;

  // Load image
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  const originalWidth = img.width;
  const originalHeight = img.height;

  // Create canvas and get image data
  const canvas = document.createElement('canvas');
  canvas.width = originalWidth;
  canvas.height = originalHeight;
  const ctx = canvas.getContext('2d')!;

  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, originalWidth, originalHeight);

  // Determine target color to trim
  let targetColor: { r: number; g: number; b: number } | 'transparent' | undefined;

  if (backgroundColor === 'auto') {
    // Auto-detect background color from corners
    targetColor = detectBackgroundColor(imageData);
    console.log('[AutoCrop] Auto-detected background color:', targetColor);
  } else if (backgroundColor === 'transparent') {
    targetColor = 'transparent';
  } else if (backgroundColor === 'white') {
    targetColor = { r: 255, g: 255, b: 255 };
  } else if (backgroundColor === 'black') {
    targetColor = { r: 0, g: 0, b: 0 };
  } else {
    // Try to parse as color name or hex color
    try {
      targetColor = parseColor(backgroundColor);
      console.log(`[AutoCrop] Parsed "${backgroundColor}" to RGB:`, targetColor);
    } catch (error) {
      console.warn(`[AutoCrop] Failed to parse color "${backgroundColor}", defaulting to white`);
      targetColor = { r: 255, g: 255, b: 255 };
    }
  }

  // Detect content bounds
  const bounds = detectContentBounds(imageData, tolerance, targetColor);

  // Calculate crop dimensions with minimum padding
  const cropLeft = Math.max(0, bounds.left - minPadding);
  const cropTop = Math.max(0, bounds.top - minPadding);
  const cropRight = Math.min(originalWidth - 1, bounds.right + minPadding);
  const cropBottom = Math.min(originalHeight - 1, bounds.bottom + minPadding);

  const cropWidth = cropRight - cropLeft + 1;
  const cropHeight = cropBottom - cropTop + 1;

  // Create cropped canvas
  const croppedCanvas = document.createElement('canvas');
  croppedCanvas.width = cropWidth;
  croppedCanvas.height = cropHeight;
  const croppedCtx = croppedCanvas.getContext('2d')!;

  // Draw cropped region
  croppedCtx.drawImage(
    img,
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight
  );

  // Convert to data URL
  const croppedImageUrl = croppedCanvas.toDataURL('image/png');

  return {
    croppedImageUrl,
    originalDimensions: { width: originalWidth, height: originalHeight },
    croppedDimensions: { width: cropWidth, height: cropHeight },
    trimmed: {
      top: cropTop,
      right: originalWidth - cropRight - 1,
      bottom: originalHeight - cropBottom - 1,
      left: cropLeft,
    },
  };
}
