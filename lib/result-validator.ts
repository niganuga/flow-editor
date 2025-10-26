/**
 * Result Validator - Final verification layer
 *
 * Compares before/after images at pixel level to ensure tools actually worked.
 * This is the final phase that validates tool execution by measuring real changes.
 *
 * Features:
 * - Pixel-level comparison using Canvas API
 * - Tool-specific validation rules
 * - Quality score calculation
 * - Visual difference metrics
 *
 * @module result-validator
 */

import { loadImage } from './canvas-utils';
import { analyzeImage, type ImageAnalysis } from './image-analyzer';

// ===== INTERFACES =====

/**
 * Visual difference metrics between two images
 */
export interface VisualDifference {
  /** Largest pixel difference found (0-510 range for RGBA) */
  maxDelta: number;

  /** Average pixel difference across all changed pixels */
  avgDelta: number;

  /** How much colors shifted (ignoring alpha) */
  colorShiftAmount: number;
}

/**
 * Complete validation result with metrics and analysis
 */
export interface ResultValidation {
  /** Whether the tool execution was successful */
  success: boolean;

  /** Number of pixels that changed */
  pixelsChanged: number;

  /** Percentage of image that changed (0-100) */
  percentageChanged: number;

  /** Quality score based on analysis confidence (0-100) */
  qualityScore: number;

  /** Whether change is significant (>= 1% threshold) */
  significantChange: boolean;

  /** Visual difference metrics */
  visualDifference: VisualDifference;

  /** Warning messages (non-critical issues) */
  warnings: string[];

  /** Human-readable reasoning about the result */
  reasoning: string;
}

/**
 * Expected operation type for tool-specific validation
 */
export type ExpectedOperation =
  | 'color_change'
  | 'transparency_change'
  | 'quality_enhancement'
  | 'structural_change'
  | 'info_only';

// ===== MAIN VALIDATION FUNCTION =====

/**
 * Validate tool execution result by comparing before/after images.
 *
 * This is the FINAL verification step that ensures tools actually worked.
 * It performs pixel-level comparison and tool-specific validation.
 *
 * @param params - Validation parameters
 * @returns Complete validation result with metrics
 *
 * @example
 * ```typescript
 * const validation = await validateToolResult({
 *   toolName: 'color_knockout',
 *   beforeImageUrl: originalUrl,
 *   afterImageUrl: resultUrl,
 *   expectedOperation: 'transparency_change',
 *   onProgress: (progress, msg) => console.log(`${progress}%: ${msg}`)
 * });
 *
 * if (validation.success) {
 *   console.log(`Success! ${validation.percentageChanged}% of pixels changed`);
 *   console.log(`Quality score: ${validation.qualityScore}/100`);
 * }
 * ```
 */
export async function validateToolResult(params: {
  toolName: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  expectedOperation: ExpectedOperation;
  onProgress?: (progress: number, message: string) => void;
}): Promise<ResultValidation> {
  const { toolName, beforeImageUrl, afterImageUrl, expectedOperation, onProgress } = params;

  try {
    onProgress?.(0, 'Starting validation...');

    // ===== STEP 1: Analyze both images =====
    onProgress?.(10, 'Analyzing before image...');

    const beforeAnalysis = await analyzeImage(beforeImageUrl, (progress, msg) => {
      const adjustedProgress = 10 + (progress / 100) * 20;
      onProgress?.(adjustedProgress, `Before: ${msg}`);
    });

    onProgress?.(30, 'Analyzing after image...');

    const afterAnalysis = await analyzeImage(afterImageUrl, (progress, msg) => {
      const adjustedProgress = 30 + (progress / 100) * 20;
      onProgress?.(adjustedProgress, `After: ${msg}`);
    });

    // ===== STEP 2: Compare images at pixel level =====
    onProgress?.(50, 'Comparing images pixel-by-pixel...');

    const comparison = await compareImages(beforeImageUrl, afterImageUrl, (progress) => {
      const adjustedProgress = 50 + (progress / 100) * 30;
      onProgress?.(adjustedProgress, 'Comparing pixels...');
    });

    // ===== STEP 3: Tool-specific validation =====
    onProgress?.(80, 'Running tool-specific validation...');

    const toolValidation = validateToolSpecificResults(
      toolName,
      comparison,
      beforeAnalysis,
      afterAnalysis
    );

    // ===== STEP 4: Calculate quality score =====
    onProgress?.(90, 'Calculating quality score...');

    const qualityScore = calculateQualityScore(
      beforeAnalysis,
      afterAnalysis,
      comparison,
      toolName
    );

    // ===== STEP 5: Build final validation result =====
    onProgress?.(95, 'Finalizing validation...');

    const result: ResultValidation = {
      success: toolValidation.success,
      pixelsChanged: comparison.pixelsChanged,
      percentageChanged: comparison.percentageChanged,
      qualityScore,
      significantChange: comparison.percentageChanged >= 1.0,
      visualDifference: {
        maxDelta: comparison.maxDelta,
        avgDelta: comparison.avgDelta,
        colorShiftAmount: comparison.colorShiftAmount,
      },
      warnings: toolValidation.warnings,
      reasoning: toolValidation.reasoning,
    };

    onProgress?.(100, 'Validation complete');

    return result;
  } catch (error) {
    console.error('[ResultValidator] Validation failed:', error);

    // Return failed validation (never throw)
    return {
      success: false,
      pixelsChanged: 0,
      percentageChanged: 0,
      qualityScore: 0,
      significantChange: false,
      visualDifference: {
        maxDelta: 0,
        avgDelta: 0,
        colorShiftAmount: 0,
      },
      warnings: [],
      reasoning: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// ===== PIXEL COMPARISON =====

/**
 * Internal comparison result with detailed metrics
 */
interface ComparisonResult {
  pixelsChanged: number;
  totalPixels: number;
  percentageChanged: number;
  maxDelta: number;
  avgDelta: number;
  colorShiftAmount: number;
}

/**
 * Compare two images at pixel level using Canvas API.
 *
 * Algorithm:
 * 1. Load both images to canvas
 * 2. Verify dimensions match
 * 3. Extract pixel data (RGBA)
 * 4. Compare each pixel using Euclidean distance
 * 5. Calculate statistics (max, avg, color shift)
 *
 * @param beforeUrl - URL to original image
 * @param afterUrl - URL to result image
 * @param onProgress - Optional progress callback
 * @returns Comparison metrics
 */
async function compareImages(
  beforeUrl: string,
  afterUrl: string,
  onProgress?: (progress: number) => void
): Promise<ComparisonResult> {
  // Load both images
  const beforeImg = await loadImage(beforeUrl);
  const afterImg = await loadImage(afterUrl);

  // Get dimensions
  const beforeWidth = beforeImg.naturalWidth || beforeImg.width;
  const beforeHeight = beforeImg.naturalHeight || beforeImg.height;
  const afterWidth = afterImg.naturalWidth || afterImg.width;
  const afterHeight = afterImg.naturalHeight || afterImg.height;

  // Verify dimensions match (unless upscaling)
  if (beforeWidth !== afterWidth || beforeHeight !== afterHeight) {
    // Dimensions changed - could be upscaler or error
    // Return metrics indicating structural change
    const totalPixels = Math.max(beforeWidth * beforeHeight, afterWidth * afterHeight);
    return {
      pixelsChanged: totalPixels,
      totalPixels,
      percentageChanged: 100,
      maxDelta: 255,
      avgDelta: 128,
      colorShiftAmount: 0,
    };
  }

  // Create canvases for pixel data extraction
  const beforeCanvas = document.createElement('canvas');
  beforeCanvas.width = beforeWidth;
  beforeCanvas.height = beforeHeight;
  const beforeCtx = beforeCanvas.getContext('2d', { willReadFrequently: true });

  const afterCanvas = document.createElement('canvas');
  afterCanvas.width = afterWidth;
  afterCanvas.height = afterHeight;
  const afterCtx = afterCanvas.getContext('2d', { willReadFrequently: true });

  if (!beforeCtx || !afterCtx) {
    throw new Error('Failed to get canvas context');
  }

  // Draw images to canvases
  beforeCtx.drawImage(beforeImg, 0, 0);
  afterCtx.drawImage(afterImg, 0, 0);

  // Get pixel data
  const beforeData = beforeCtx.getImageData(0, 0, beforeWidth, beforeHeight);
  const afterData = afterCtx.getImageData(0, 0, afterWidth, afterHeight);

  // Compare pixels
  let pixelsChanged = 0;
  let totalDelta = 0;
  let maxDelta = 0;
  let totalColorShift = 0;

  const totalPixels = beforeWidth * beforeHeight;
  const data1 = beforeData.data;
  const data2 = afterData.data;

  // Threshold to ignore minor compression artifacts
  const CHANGE_THRESHOLD = 10;

  for (let i = 0; i < data1.length; i += 4) {
    // Extract RGBA values
    const r1 = data1[i];
    const g1 = data1[i + 1];
    const b1 = data1[i + 2];
    const a1 = data1[i + 3];

    const r2 = data2[i];
    const g2 = data2[i + 1];
    const b2 = data2[i + 2];
    const a2 = data2[i + 3];

    // Calculate total delta using Euclidean distance (including alpha)
    const delta = Math.sqrt(
      Math.pow(r2 - r1, 2) +
        Math.pow(g2 - g1, 2) +
        Math.pow(b2 - b1, 2) +
        Math.pow(a2 - a1, 2)
    );

    // Only count pixels that changed significantly
    if (delta > CHANGE_THRESHOLD) {
      pixelsChanged++;
      totalDelta += delta;
      maxDelta = Math.max(maxDelta, delta);

      // Calculate color shift (ignoring alpha channel)
      const colorDelta = Math.sqrt(
        Math.pow(r2 - r1, 2) + Math.pow(g2 - g1, 2) + Math.pow(b2 - b1, 2)
      );
      totalColorShift += colorDelta;
    }

    // Report progress every 10% of pixels
    if (onProgress && i % Math.floor(data1.length / 10) === 0) {
      const progress = (i / data1.length) * 100;
      onProgress(progress);
    }
  }

  // Calculate averages
  const avgDelta = pixelsChanged > 0 ? totalDelta / pixelsChanged : 0;
  const colorShiftAmount = pixelsChanged > 0 ? totalColorShift / pixelsChanged : 0;
  const percentageChanged = (pixelsChanged / totalPixels) * 100;

  onProgress?.(100);

  return {
    pixelsChanged,
    totalPixels,
    percentageChanged,
    maxDelta,
    avgDelta,
    colorShiftAmount,
  };
}

// ===== TOOL-SPECIFIC VALIDATION =====

/**
 * Validate results based on tool-specific expectations.
 *
 * Each tool has different success criteria:
 * - color_knockout: Should create transparency
 * - recolor_image: Should change colors without alpha changes
 * - background_remover: Should create significant transparency
 * - upscaler: Should increase dimensions
 * - texture_cut: Should create partial transparency
 * - Info tools: No image modification expected
 *
 * @param toolName - Name of the tool that was executed
 * @param comparison - Pixel comparison metrics
 * @param beforeAnalysis - Analysis of original image
 * @param afterAnalysis - Analysis of result image
 * @returns Validation result with success status and reasoning
 */
function validateToolSpecificResults(
  toolName: string,
  comparison: ComparisonResult,
  beforeAnalysis: ImageAnalysis,
  afterAnalysis: ImageAnalysis
): {
  success: boolean;
  warnings: string[];
  reasoning: string;
} {
  const warnings: string[] = [];

  switch (toolName) {
    case 'color_knockout': {
      // Expect significant transparency change
      if (!afterAnalysis.hasTransparency) {
        warnings.push('Expected transparency but none was created');
        return {
          success: false,
          warnings,
          reasoning: 'Color knockout failed to create transparency',
        };
      }

      // Expect meaningful change
      if (comparison.percentageChanged < 1) {
        warnings.push('Very few pixels changed (<1%)');
      }

      return {
        success: true,
        warnings,
        reasoning: `Successfully knocked out colors (${comparison.percentageChanged.toFixed(1)}% of pixels affected)`,
      };
    }

    case 'recolor_image': {
      // Expect color shift but similar structure
      if (comparison.colorShiftAmount < 20) {
        warnings.push('Very small color change detected');
      }

      // Check if too many pixels affected (might indicate error)
      if (comparison.percentageChanged > 95) {
        warnings.push('Almost entire image changed - verify result looks correct');
      }

      return {
        success: true,
        warnings,
        reasoning: `Recolored ${comparison.percentageChanged.toFixed(1)}% of pixels (avg color shift: ${comparison.colorShiftAmount.toFixed(0)})`,
      };
    }

    case 'background_remover': {
      // Expect transparency to be created
      if (!afterAnalysis.hasTransparency) {
        return {
          success: false,
          warnings: ['Background removal failed to create transparency'],
          reasoning: 'AI background removal did not produce transparent pixels',
        };
      }

      // Expect significant change (at least 10% of image)
      if (comparison.percentageChanged < 10) {
        warnings.push('Less than 10% of image affected - background may not be fully removed');
      }

      return {
        success: true,
        warnings,
        reasoning: `Successfully removed background (${comparison.percentageChanged.toFixed(1)}% of pixels made transparent)`,
      };
    }

    case 'upscaler': {
      // Expect dimensions to increase
      if (beforeAnalysis.width === afterAnalysis.width) {
        return {
          success: false,
          warnings: ['Image dimensions did not change'],
          reasoning: 'Upscaling failed - dimensions unchanged',
        };
      }

      // Check scale factor
      const scaleFactor = afterAnalysis.width / beforeAnalysis.width;

      // Expect quality improvement or at least maintenance
      if (afterAnalysis.sharpnessScore < beforeAnalysis.sharpnessScore - 10) {
        warnings.push(
          `Sharpness decreased from ${beforeAnalysis.sharpnessScore} to ${afterAnalysis.sharpnessScore}`
        );
      }

      return {
        success: true,
        warnings,
        reasoning: `Upscaled ${scaleFactor.toFixed(1)}x from ${beforeAnalysis.width}x${beforeAnalysis.height} to ${afterAnalysis.width}x${afterAnalysis.height}`,
      };
    }

    case 'texture_cut': {
      // Expect transparency to be created or increased
      if (!afterAnalysis.hasTransparency) {
        warnings.push('Expected transparency from texture cut');
      }

      // Expect moderate change (texture cuts shouldn't affect everything)
      if (comparison.percentageChanged < 5) {
        warnings.push('Very small area affected (<5%)');
      }

      return {
        success: true,
        warnings,
        reasoning: `Applied texture cut (${comparison.percentageChanged.toFixed(1)}% of pixels affected)`,
      };
    }

    case 'extract_color_palette':
    case 'pick_color_at_position': {
      // These don't modify the image
      return {
        success: true,
        warnings: [],
        reasoning: 'Info tool - no image modification expected',
      };
    }

    default: {
      // Generic validation for unknown tools
      if (comparison.percentageChanged < 0.1) {
        warnings.push('Extremely small change detected (<0.1%)');
      }

      return {
        success: comparison.percentageChanged > 0,
        warnings,
        reasoning: `Tool executed, ${comparison.percentageChanged.toFixed(1)}% of pixels changed`,
      };
    }
  }
}

// ===== QUALITY SCORE CALCULATION =====

/**
 * Calculate quality score based on image analysis and comparison.
 *
 * Quality score factors:
 * - Base: After-image analysis confidence
 * - Penalty: Sharpness decrease (unless intentional)
 * - Penalty: Noise increase
 * - Bonus: Print readiness improvement
 * - Penalty: No change detected
 *
 * @param beforeAnalysis - Analysis of original image
 * @param afterAnalysis - Analysis of result image
 * @param comparison - Pixel comparison metrics
 * @param toolName - Name of tool that was executed
 * @returns Quality score 0-100
 */
function calculateQualityScore(
  beforeAnalysis: ImageAnalysis,
  afterAnalysis: ImageAnalysis,
  comparison: ComparisonResult,
  toolName: string
): number {
  // Start with base score from after-analysis confidence
  let score = afterAnalysis.confidence;

  // Penalize if sharpness decreased (unless intentional blur tool)
  if (afterAnalysis.sharpnessScore < beforeAnalysis.sharpnessScore - 10) {
    score -= 15;
  }

  // Penalize if noise increased significantly
  if (afterAnalysis.noiseLevel > beforeAnalysis.noiseLevel + 10) {
    score -= 10;
  }

  // Bonus for print readiness improvement
  if (afterAnalysis.isPrintReady && !beforeAnalysis.isPrintReady) {
    score += 10;
  }

  // Penalize if no change detected (except for info tools)
  if (
    comparison.percentageChanged < 0.1 &&
    toolName !== 'extract_color_palette' &&
    toolName !== 'pick_color_at_position'
  ) {
    score -= 20;
  }

  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

// ===== HELPER FUNCTIONS =====

/**
 * Map tool name to expected operation type.
 *
 * @param toolName - Tool name
 * @returns Expected operation type
 */
export function getExpectedOperation(toolName: string): ExpectedOperation {
  switch (toolName) {
    case 'color_knockout':
    case 'background_remover':
    case 'texture_cut':
      return 'transparency_change';

    case 'recolor_image':
      return 'color_change';

    case 'upscaler':
      return 'quality_enhancement';

    case 'crop':
    case 'resize':
      return 'structural_change';

    case 'extract_color_palette':
    case 'pick_color_at_position':
      return 'info_only';

    default:
      return 'color_change';
  }
}

/**
 * Format validation result into human-readable summary.
 *
 * @param validation - Validation result
 * @returns Formatted text summary
 */
export function formatValidationSummary(validation: ResultValidation): string {
  const lines: string[] = [
    '=== RESULT VALIDATION ===',
    '',
    `Success: ${validation.success ? 'YES' : 'NO'}`,
    `Quality Score: ${validation.qualityScore}/100`,
    '',
    'CHANGE METRICS:',
    `  Pixels Changed: ${validation.pixelsChanged.toLocaleString()} (${validation.percentageChanged.toFixed(2)}%)`,
    `  Significant Change: ${validation.significantChange ? 'Yes' : 'No'}`,
    '',
    'VISUAL DIFFERENCE:',
    `  Max Delta: ${validation.visualDifference.maxDelta.toFixed(1)}`,
    `  Avg Delta: ${validation.visualDifference.avgDelta.toFixed(1)}`,
    `  Color Shift: ${validation.visualDifference.colorShiftAmount.toFixed(1)}`,
    '',
    `Reasoning: ${validation.reasoning}`,
  ];

  if (validation.warnings.length > 0) {
    lines.push('', 'WARNINGS:');
    validation.warnings.forEach((warning) => {
      lines.push(`  - ${warning}`);
    });
  }

  return lines.join('\n');
}
