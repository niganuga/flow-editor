/**
 * Rotate and Flip Tool
 * Rotate (90°, 180°, 270°) or flip (horizontal/vertical) images
 */

export type RotateAngle = 90 | 180 | 270 | -90 | -180 | -270;
export type FlipDirection = 'horizontal' | 'vertical';
export type TransformOperation =
  | { type: 'rotate'; angle: RotateAngle }
  | { type: 'flip'; direction: FlipDirection };

export interface RotateFlipOptions {
  imageUrl: string;
  operation: TransformOperation;
}

export interface RotateFlipResult {
  transformedImageUrl: string;
  originalDimensions: { width: number; height: number };
  newDimensions: { width: number; height: number };
  operation: TransformOperation;
}

/**
 * Normalize angle to 0-360 range
 */
function normalizeAngle(angle: number): number {
  let normalized = angle % 360;
  if (normalized < 0) normalized += 360;
  return normalized;
}

/**
 * Rotate image by specified angle
 */
async function rotateImage(
  imageUrl: string,
  angle: RotateAngle
): Promise<RotateFlipResult> {
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

  // Normalize angle
  const normalizedAngle = normalizeAngle(angle);

  // Calculate new dimensions after rotation
  let newWidth: number;
  let newHeight: number;

  if (normalizedAngle === 90 || normalizedAngle === 270) {
    // 90° or 270° rotation swaps width and height
    newWidth = originalHeight;
    newHeight = originalWidth;
  } else {
    // 0° or 180° rotation keeps dimensions
    newWidth = originalWidth;
    newHeight = originalHeight;
  }

  // Create canvas with new dimensions
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d')!;

  // Move to center of canvas
  ctx.translate(newWidth / 2, newHeight / 2);

  // Rotate
  ctx.rotate((normalizedAngle * Math.PI) / 180);

  // Draw image centered
  ctx.drawImage(img, -originalWidth / 2, -originalHeight / 2);

  // Convert to data URL
  const transformedImageUrl = canvas.toDataURL('image/png');

  return {
    transformedImageUrl,
    originalDimensions: { width: originalWidth, height: originalHeight },
    newDimensions: { width: newWidth, height: newHeight },
    operation: { type: 'rotate', angle },
  };
}

/**
 * Flip image horizontally or vertically
 */
async function flipImage(
  imageUrl: string,
  direction: FlipDirection
): Promise<RotateFlipResult> {
  // Load image
  const img = new Image();
  img.crossOrigin = 'anonymous';

  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  const width = img.width;
  const height = img.height;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Apply flip transformation
  if (direction === 'horizontal') {
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
  } else {
    ctx.translate(0, height);
    ctx.scale(1, -1);
  }

  // Draw flipped image
  ctx.drawImage(img, 0, 0);

  // Convert to data URL
  const transformedImageUrl = canvas.toDataURL('image/png');

  return {
    transformedImageUrl,
    originalDimensions: { width, height },
    newDimensions: { width, height },
    operation: { type: 'flip', direction },
  };
}

/**
 * Transform image with rotate or flip operation
 */
export async function rotateFlip(options: RotateFlipOptions): Promise<RotateFlipResult> {
  const { imageUrl, operation } = options;

  if (operation.type === 'rotate') {
    return rotateImage(imageUrl, operation.angle);
  } else {
    return flipImage(imageUrl, operation.direction);
  }
}

/**
 * Helper: Parse rotation/flip from natural language
 * Examples: "rotate 90 degrees", "rotate clockwise", "flip horizontal", "flip vertically"
 */
export function parseTransform(input: string): TransformOperation {
  const normalized = input.toLowerCase().trim();

  // Rotate patterns
  if (normalized.includes('rotate')) {
    // Clockwise/counterclockwise
    if (normalized.includes('clockwise') && !normalized.includes('counter')) {
      return { type: 'rotate', angle: 90 };
    }
    if (normalized.includes('counterclockwise') || normalized.includes('counter')) {
      return { type: 'rotate', angle: -90 };
    }

    // Specific angles
    if (normalized.includes('90')) return { type: 'rotate', angle: 90 };
    if (normalized.includes('180')) return { type: 'rotate', angle: 180 };
    if (normalized.includes('270')) return { type: 'rotate', angle: 270 };

    // Default to 90 degrees clockwise
    return { type: 'rotate', angle: 90 };
  }

  // Flip patterns
  if (normalized.includes('flip')) {
    if (normalized.includes('horizontal') || normalized.includes('horiz')) {
      return { type: 'flip', direction: 'horizontal' };
    }
    if (normalized.includes('vertical') || normalized.includes('vert')) {
      return { type: 'flip', direction: 'vertical' };
    }

    // Default to horizontal
    return { type: 'flip', direction: 'horizontal' };
  }

  throw new Error(`Could not parse transform operation: "${input}"`);
}
