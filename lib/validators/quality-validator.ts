/**
 * Quality Validator for Image Operations
 *
 * Validates that image operations (background removal, upscaling, etc.)
 * produce expected results and don't introduce corruption or unexpected changes.
 *
 * VALIDATION CHECKS:
 * 1. File size didn't explode (>3x original = suspicious)
 * 2. Dimensions changed as expected for operation type
 * 3. Image isn't corrupted (can be loaded)
 * 4. For background removal: transparency actually added
 * 5. For upscaling: resolution actually increased
 * 6. For cropping: dimensions decreased correctly
 * 7. For color operations: image still has valid data
 *
 * USAGE:
 * ```typescript
 * const result = await validateOperationQuality(
 *   beforeImageData,
 *   afterImageData,
 *   'background-removal'
 * );
 *
 * if (!result.passed) {
 *   console.warn('Quality check failed:', result.issues);
 *   // Consider reverting operation
 * }
 * ```
 */

/**
 * Image metadata for quality validation
 */
export interface ImageData {
  /** Image width in pixels */
  width: number;
  /** Image height in pixels */
  height: number;
  /** File size in bytes */
  sizeBytes: number;
  /** Image format (png, jpeg, webp, etc.) */
  format: string;
  /** Data URL or blob URL */
  dataUrl: string;
  /** Whether image has transparency (alpha channel) */
  hasTransparency?: boolean;
  /** Original file object if available */
  file?: File;
}

/**
 * Quality validation result
 */
export interface QualityValidationResult {
  /** Whether validation passed (no critical issues) */
  passed: boolean;
  /** Quality score 0-100 (100 = perfect) */
  score: number;
  /** List of issues found (empty if perfect) */
  issues: string[];
  /** Detailed check results */
  checks: {
    fileSize: { passed: boolean; reason?: string };
    dimensions: { passed: boolean; reason?: string };
    corruption: { passed: boolean; reason?: string };
    operationSpecific: { passed: boolean; reason?: string };
  };
  /** Performance metrics */
  metrics?: {
    sizeBefore: number;
    sizeAfter: number;
    sizeRatio: number;
    dimensionsBefore: string;
    dimensionsAfter: string;
  };
}

/**
 * Supported operation types
 */
export type OperationType =
  | 'background-removal'
  | 'upscaling'
  | 'cropping'
  | 'color-knockout'
  | 'recolor'
  | 'texture-cut'
  | 'general';

/**
 * Quality thresholds and limits
 */
const QUALITY_THRESHOLDS = {
  /** Maximum allowed file size increase (3x) */
  MAX_SIZE_MULTIPLIER: 3.0,
  /** Suspicious if file size increases more than this (warn only) */
  WARN_SIZE_MULTIPLIER: 2.0,
  /** Minimum required resolution increase for upscaling */
  MIN_UPSCALE_INCREASE: 1.1, // At least 10% larger
  /** Maximum allowed resolution change for non-upscale ops */
  MAX_DIMENSION_CHANGE: 0.05, // 5% tolerance
  /** Minimum expected transparency for background removal (% of pixels) */
  MIN_TRANSPARENCY_PERCENT: 5, // At least 5% transparent
  /** File size too small might indicate corruption */
  MIN_FILE_SIZE_BYTES: 100,
} as const;

/**
 * Extract image metadata from data URL
 */
export async function extractImageData(dataUrl: string): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      // Extract format from data URL
      const formatMatch = dataUrl.match(/^data:image\/([^;]+)/);
      const format = formatMatch ? formatMatch[1] : 'unknown';

      // Calculate approximate file size from data URL
      const base64 = dataUrl.split(',')[1] || '';
      const sizeBytes = Math.ceil((base64.length * 3) / 4);

      // Check for transparency (approximate - PNG format check)
      const hasTransparency = format === 'png' || format === 'webp';

      resolve({
        width: img.width,
        height: img.height,
        sizeBytes,
        format,
        dataUrl,
        hasTransparency,
      });
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for metadata extraction'));
    };

    img.src = dataUrl;
  });
}

/**
 * Check if image actually has transparency (pixel-level check)
 */
export async function hasActualTransparency(dataUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(false);
        return;
      }

      ctx.drawImage(img, 0, 0);

      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;

        // Check alpha channel (every 4th byte)
        let transparentPixels = 0;
        const totalPixels = canvas.width * canvas.height;

        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] < 255) {
            transparentPixels++;
          }
        }

        const transparencyPercent = (transparentPixels / totalPixels) * 100;
        resolve(transparencyPercent >= QUALITY_THRESHOLDS.MIN_TRANSPARENCY_PERCENT);
      } catch (error) {
        // Might fail due to CORS, assume no transparency
        console.warn('[Quality Validator] Could not check transparency:', error);
        resolve(false);
      }
    };

    img.onerror = () => resolve(false);
    img.src = dataUrl;
  });
}

/**
 * Validate file size change
 */
function validateFileSize(
  before: ImageData,
  after: ImageData
): { passed: boolean; reason?: string; ratio: number } {
  const ratio = after.sizeBytes / before.sizeBytes;

  // Critical: File size exploded
  if (ratio > QUALITY_THRESHOLDS.MAX_SIZE_MULTIPLIER) {
    return {
      passed: false,
      reason: `File size increased ${ratio.toFixed(1)}x (${(before.sizeBytes / 1024).toFixed(0)}KB → ${(after.sizeBytes / 1024).toFixed(0)}KB). Max allowed: ${QUALITY_THRESHOLDS.MAX_SIZE_MULTIPLIER}x`,
      ratio,
    };
  }

  // Warning: File size increased significantly
  if (ratio > QUALITY_THRESHOLDS.WARN_SIZE_MULTIPLIER) {
    return {
      passed: true,
      reason: `File size increased ${ratio.toFixed(1)}x (may impact performance)`,
      ratio,
    };
  }

  // Check for suspiciously small file (corruption?)
  if (after.sizeBytes < QUALITY_THRESHOLDS.MIN_FILE_SIZE_BYTES) {
    return {
      passed: false,
      reason: `Result file too small (${after.sizeBytes} bytes), possible corruption`,
      ratio,
    };
  }

  return { passed: true, ratio };
}

/**
 * Validate dimensions changed as expected
 */
function validateDimensions(
  before: ImageData,
  after: ImageData,
  operation: OperationType
): { passed: boolean; reason?: string } {
  const widthRatio = after.width / before.width;
  const heightRatio = after.height / before.height;

  switch (operation) {
    case 'upscaling': {
      // Upscaling should increase resolution
      if (
        widthRatio < QUALITY_THRESHOLDS.MIN_UPSCALE_INCREASE ||
        heightRatio < QUALITY_THRESHOLDS.MIN_UPSCALE_INCREASE
      ) {
        return {
          passed: false,
          reason: `Upscaling did not increase resolution (${before.width}x${before.height} → ${after.width}x${after.height})`,
        };
      }
      break;
    }

    case 'cropping': {
      // Cropping should decrease dimensions
      if (after.width > before.width || after.height > before.height) {
        return {
          passed: false,
          reason: `Cropping increased dimensions (${before.width}x${before.height} → ${after.width}x${after.height})`,
        };
      }
      break;
    }

    case 'background-removal':
    case 'color-knockout':
    case 'recolor':
    case 'texture-cut':
    case 'general': {
      // These operations should not change dimensions (small tolerance)
      const widthChange = Math.abs(1 - widthRatio);
      const heightChange = Math.abs(1 - heightRatio);

      if (
        widthChange > QUALITY_THRESHOLDS.MAX_DIMENSION_CHANGE ||
        heightChange > QUALITY_THRESHOLDS.MAX_DIMENSION_CHANGE
      ) {
        return {
          passed: false,
          reason: `Dimensions changed unexpectedly (${before.width}x${before.height} → ${after.width}x${after.height})`,
        };
      }
      break;
    }
  }

  return { passed: true };
}

/**
 * Validate image is not corrupted
 */
async function validateNotCorrupted(
  after: ImageData
): Promise<{ passed: boolean; reason?: string }> {
  try {
    // Try to load the image
    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Image failed to load'));
      img.src = after.dataUrl;
    });

    // Check dimensions are valid
    if (after.width <= 0 || after.height <= 0) {
      return {
        passed: false,
        reason: `Invalid dimensions: ${after.width}x${after.height}`,
      };
    }

    // Check file size is reasonable
    if (after.sizeBytes < QUALITY_THRESHOLDS.MIN_FILE_SIZE_BYTES) {
      return {
        passed: false,
        reason: `File size too small (${after.sizeBytes} bytes)`,
      };
    }

    return { passed: true };
  } catch (error) {
    return {
      passed: false,
      reason: `Image corrupted or cannot be loaded: ${error instanceof Error ? error.message : 'unknown error'}`,
    };
  }
}

/**
 * Operation-specific validation
 */
async function validateOperationSpecific(
  before: ImageData,
  after: ImageData,
  operation: OperationType
): Promise<{ passed: boolean; reason?: string }> {
  switch (operation) {
    case 'background-removal': {
      // Check that transparency was actually added
      const hasTransparency = await hasActualTransparency(after.dataUrl);

      if (!hasTransparency) {
        return {
          passed: false,
          reason: 'Background removal did not add transparency (no transparent pixels detected)',
        };
      }

      return { passed: true };
    }

    case 'upscaling': {
      // Already checked in validateDimensions
      // Additional check: resolution should be higher
      const pixelsBefore = before.width * before.height;
      const pixelsAfter = after.width * after.height;
      const pixelRatio = pixelsAfter / pixelsBefore;

      if (pixelRatio < QUALITY_THRESHOLDS.MIN_UPSCALE_INCREASE) {
        return {
          passed: false,
          reason: `Upscaling did not increase pixel count enough (${pixelRatio.toFixed(2)}x, expected >${QUALITY_THRESHOLDS.MIN_UPSCALE_INCREASE}x)`,
        };
      }

      return { passed: true };
    }

    case 'cropping': {
      // Check that dimensions actually decreased
      if (after.width >= before.width && after.height >= before.height) {
        return {
          passed: false,
          reason: 'Cropping did not reduce image size',
        };
      }

      return { passed: true };
    }

    case 'color-knockout':
    case 'recolor': {
      // For color operations, just verify image is still valid
      // More sophisticated checks could compare histograms
      if (after.sizeBytes < before.sizeBytes * 0.1) {
        return {
          passed: false,
          reason: 'Color operation resulted in suspiciously small file',
        };
      }

      return { passed: true };
    }

    case 'texture-cut':
    case 'general':
    default: {
      // No specific checks for general operations
      return { passed: true };
    }
  }
}

/**
 * Calculate quality score based on checks
 */
function calculateQualityScore(checks: QualityValidationResult['checks']): number {
  let score = 100;

  // File size issues
  if (!checks.fileSize.passed) {
    score -= 40; // Major issue
  } else if (checks.fileSize.reason) {
    score -= 10; // Warning only
  }

  // Dimension issues
  if (!checks.dimensions.passed) {
    score -= 30; // Significant issue
  }

  // Corruption (critical)
  if (!checks.corruption.passed) {
    score -= 50; // Very serious
  }

  // Operation-specific issues
  if (!checks.operationSpecific.passed) {
    score -= 30; // Operation didn't work as expected
  }

  return Math.max(0, score);
}

/**
 * Validate quality of an image operation
 *
 * @param before - Image data before operation
 * @param after - Image data after operation
 * @param operation - Type of operation performed
 * @returns Quality validation result with pass/fail, score, and issues
 *
 * @example
 * ```typescript
 * // Validate background removal
 * const beforeData = await extractImageData(originalDataUrl);
 * const afterData = await extractImageData(resultDataUrl);
 *
 * const result = await validateOperationQuality(
 *   beforeData,
 *   afterData,
 *   'background-removal'
 * );
 *
 * if (!result.passed) {
 *   console.error('Quality check failed:', result.issues);
 *   // Consider reverting or retrying operation
 * } else {
 *   console.log(`Quality score: ${result.score}/100`);
 * }
 * ```
 */
export async function validateOperationQuality(
  before: ImageData,
  after: ImageData,
  operation: OperationType
): Promise<QualityValidationResult> {
  console.log(`[Quality Validator] Validating ${operation} operation...`);

  const issues: string[] = [];

  // 1. Check file size
  const fileSizeCheck = validateFileSize(before, after);
  if (!fileSizeCheck.passed) {
    issues.push(`File size: ${fileSizeCheck.reason}`);
  } else if (fileSizeCheck.reason) {
    issues.push(`File size warning: ${fileSizeCheck.reason}`);
  }

  // 2. Check dimensions
  const dimensionCheck = validateDimensions(before, after, operation);
  if (!dimensionCheck.passed) {
    issues.push(`Dimensions: ${dimensionCheck.reason}`);
  }

  // 3. Check corruption
  const corruptionCheck = await validateNotCorrupted(after);
  if (!corruptionCheck.passed) {
    issues.push(`Corruption: ${corruptionCheck.reason}`);
  }

  // 4. Operation-specific checks
  const operationCheck = await validateOperationSpecific(before, after, operation);
  if (!operationCheck.passed) {
    issues.push(`Operation: ${operationCheck.reason}`);
  }

  // Build checks object
  const checks = {
    fileSize: { passed: fileSizeCheck.passed, reason: fileSizeCheck.reason },
    dimensions: { passed: dimensionCheck.passed, reason: dimensionCheck.reason },
    corruption: { passed: corruptionCheck.passed, reason: corruptionCheck.reason },
    operationSpecific: {
      passed: operationCheck.passed,
      reason: operationCheck.reason,
    },
  };

  // Calculate score
  const score = calculateQualityScore(checks);

  // Overall pass/fail (must pass all critical checks)
  const passed =
    checks.fileSize.passed &&
    checks.dimensions.passed &&
    checks.corruption.passed &&
    checks.operationSpecific.passed;

  // Build metrics
  const metrics = {
    sizeBefore: before.sizeBytes,
    sizeAfter: after.sizeBytes,
    sizeRatio: fileSizeCheck.ratio,
    dimensionsBefore: `${before.width}x${before.height}`,
    dimensionsAfter: `${after.width}x${after.height}`,
  };

  const result: QualityValidationResult = {
    passed,
    score,
    issues,
    checks,
    metrics,
  };

  console.log(`[Quality Validator] Result:`, {
    passed,
    score,
    issueCount: issues.length,
    metrics,
  });

  return result;
}

/**
 * Quick validation (minimal checks, faster)
 * Skips expensive pixel-level transparency checks
 */
export async function validateOperationQualityQuick(
  before: ImageData,
  after: ImageData,
  operation: OperationType
): Promise<QualityValidationResult> {
  console.log(`[Quality Validator] Quick validation for ${operation}...`);

  const issues: string[] = [];

  // 1. Check file size
  const fileSizeCheck = validateFileSize(before, after);
  if (!fileSizeCheck.passed) {
    issues.push(`File size: ${fileSizeCheck.reason}`);
  }

  // 2. Check dimensions
  const dimensionCheck = validateDimensions(before, after, operation);
  if (!dimensionCheck.passed) {
    issues.push(`Dimensions: ${dimensionCheck.reason}`);
  }

  // 3. Check corruption
  const corruptionCheck = await validateNotCorrupted(after);
  if (!corruptionCheck.passed) {
    issues.push(`Corruption: ${corruptionCheck.reason}`);
  }

  // Skip operation-specific checks for speed
  const checks = {
    fileSize: { passed: fileSizeCheck.passed, reason: fileSizeCheck.reason },
    dimensions: { passed: dimensionCheck.passed, reason: dimensionCheck.reason },
    corruption: { passed: corruptionCheck.passed, reason: corruptionCheck.reason },
    operationSpecific: { passed: true, reason: 'Skipped for quick validation' },
  };

  const score = calculateQualityScore(checks);
  const passed =
    checks.fileSize.passed && checks.dimensions.passed && checks.corruption.passed;

  return {
    passed,
    score,
    issues,
    checks,
    metrics: {
      sizeBefore: before.sizeBytes,
      sizeAfter: after.sizeBytes,
      sizeRatio: fileSizeCheck.ratio,
      dimensionsBefore: `${before.width}x${before.height}`,
      dimensionsAfter: `${after.width}x${after.height}`,
    },
  };
}

/**
 * Get quality thresholds (for debugging/testing)
 */
export function getQualityThresholds() {
  return { ...QUALITY_THRESHOLDS };
}
