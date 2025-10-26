/**
 * Smart Resize Tool
 * Resize images with quality warnings for upscaling
 */

export interface SmartResizeOptions {
  imageUrl: string;
  width?: number; // Target width in pixels
  height?: number; // Target height in pixels
  unit?: 'px' | 'percent'; // Default: 'px'
  maintainAspectRatio?: boolean; // Default: true
  dpi?: number; // For print calculations (default: 300)
}

export interface SmartResizeResult {
  resizedImageUrl: string;
  originalDimensions: { width: number; height: number };
  newDimensions: { width: number; height: number };
  scaleFactor: number;
  isUpscaling: boolean;
  qualityWarning?: string;
  qualityImpact: 'none' | 'improved' | 'maintained' | 'degraded';
}

/**
 * Calculate quality impact based on scale factor
 */
function assessQualityImpact(scaleFactor: number): {
  qualityImpact: 'none' | 'improved' | 'maintained' | 'degraded';
  qualityWarning?: string;
} {
  if (scaleFactor === 1) {
    return { qualityImpact: 'none' };
  }

  if (scaleFactor < 1) {
    // Downscaling - quality maintained or improved
    return {
      qualityImpact: 'improved',
    };
  }

  // Upscaling - quality degrades
  if (scaleFactor <= 1.25) {
    return {
      qualityImpact: 'maintained',
      qualityWarning:
        'Slight upscaling (25% or less). Quality impact minimal but noticeable on close inspection.',
    };
  }

  if (scaleFactor <= 2) {
    return {
      qualityImpact: 'degraded',
      qualityWarning:
        'Moderate upscaling. Quality will degrade noticeably. Consider using AI upscaling for better results.',
    };
  }

  return {
    qualityImpact: 'degraded',
    qualityWarning:
      'Significant upscaling (2x or more). Quality will severely degrade with pixelation and blurriness. AI upscaling strongly recommended.',
  };
}

/**
 * Smart resize with quality warnings
 */
export async function smartResize(options: SmartResizeOptions): Promise<SmartResizeResult> {
  const { imageUrl, width, height, unit = 'px', maintainAspectRatio = true } = options;

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

  // Calculate target dimensions
  let targetWidth: number;
  let targetHeight: number;

  if (unit === 'percent') {
    // Percentage-based resize
    const widthPercent = width || 100;
    const heightPercent = height || 100;

    targetWidth = Math.round((originalWidth * widthPercent) / 100);
    targetHeight = Math.round((originalHeight * heightPercent) / 100);
  } else {
    // Pixel-based resize
    if (width && height) {
      if (maintainAspectRatio) {
        // Calculate which dimension to constrain
        const widthRatio = width / originalWidth;
        const heightRatio = height / originalHeight;

        if (widthRatio < heightRatio) {
          // Width is the limiting factor
          targetWidth = width;
          targetHeight = Math.round(originalHeight * widthRatio);
        } else {
          // Height is the limiting factor
          targetHeight = height;
          targetWidth = Math.round(originalWidth * heightRatio);
        }
      } else {
        // Stretch to exact dimensions
        targetWidth = width;
        targetHeight = height;
      }
    } else if (width) {
      // Width specified, maintain aspect ratio
      targetWidth = width;
      targetHeight = Math.round((originalHeight * width) / originalWidth);
    } else if (height) {
      // Height specified, maintain aspect ratio
      targetHeight = height;
      targetWidth = Math.round((originalWidth * height) / originalHeight);
    } else {
      throw new Error('Either width or height must be specified');
    }
  }

  // Calculate scale factor (use larger dimension for accuracy)
  const scaleFactorWidth = targetWidth / originalWidth;
  const scaleFactorHeight = targetHeight / originalHeight;
  const scaleFactor = Math.max(scaleFactorWidth, scaleFactorHeight);

  // Assess quality impact
  const { qualityImpact, qualityWarning } = assessQualityImpact(scaleFactor);

  // Create canvas and resize
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d')!;

  // Use better image smoothing for downscaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Draw resized image
  ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

  // Convert to data URL
  const resizedImageUrl = canvas.toDataURL('image/png');

  return {
    resizedImageUrl,
    originalDimensions: { width: originalWidth, height: originalHeight },
    newDimensions: { width: targetWidth, height: targetHeight },
    scaleFactor,
    isUpscaling: scaleFactor > 1,
    qualityWarning,
    qualityImpact,
  };
}

/**
 * Helper: Parse resize dimensions from natural language
 * Examples: "resize to 800x600", "resize to 50%", "resize width to 1000px"
 */
export function parseResize(input: string): {
  width?: number;
  height?: number;
  unit: 'px' | 'percent';
} {
  const normalized = input.toLowerCase().trim();

  // Check for percentage
  if (normalized.includes('%') || normalized.includes('percent')) {
    const percentMatch = normalized.match(/(\d+)\s*%/);
    if (percentMatch) {
      const percent = parseInt(percentMatch[1]);
      return { width: percent, height: percent, unit: 'percent' };
    }
  }

  // Check for dimensions (800x600, 800 x 600)
  const dimensionsMatch = normalized.match(/(\d+)\s*[x×]\s*(\d+)/);
  if (dimensionsMatch) {
    return {
      width: parseInt(dimensionsMatch[1]),
      height: parseInt(dimensionsMatch[2]),
      unit: 'px',
    };
  }

  // Check for single dimension
  const widthMatch = normalized.match(/width\s*(?:to\s*)?(\d+)/);
  const heightMatch = normalized.match(/height\s*(?:to\s*)?(\d+)/);

  if (widthMatch) {
    return { width: parseInt(widthMatch[1]), unit: 'px' };
  }

  if (heightMatch) {
    return { height: parseInt(heightMatch[1]), unit: 'px' };
  }

  // Try to extract any number as width
  const numberMatch = normalized.match(/(\d+)/);
  if (numberMatch) {
    return { width: parseInt(numberMatch[1]), unit: 'px' };
  }

  throw new Error(`Could not parse resize dimensions: "${input}"`);
}
