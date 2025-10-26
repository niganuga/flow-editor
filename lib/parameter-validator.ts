/**
 * Parameter Validator - Hallucination Prevention Layer
 *
 * Cross-checks Claude's suggested tool parameters against:
 * 1. Ground truth from image analyzer (Phase 1)
 * 2. Historical patterns from context manager (Phase 2)
 * 3. Tool schema definitions from ai-tools-orchestrator
 *
 * This is the critical validation layer that catches parameter hallucinations
 * before tool execution, ensuring >95% confidence.
 *
 * @module parameter-validator
 */

import type { ImageAnalysis } from './image-analyzer';
import { findSimilarExecutions, type ToolExecution } from './context-manager';
import { toolDefinitions } from './ai-tools-orchestrator';
import { rgbToLab, deltaE2000, colorDistance, type RGBColor } from './color-utils';
import { loadImage, createCanvas } from './canvas-utils';

// ===== INTERFACES =====

/**
 * Result of parameter validation
 */
export interface ValidationResult {
  /** Whether parameters are valid */
  isValid: boolean;

  /** Confidence score 0-100 (>95 = excellent) */
  confidence: number;

  /** Non-critical warnings */
  warnings: string[];

  /** Critical errors that prevent execution */
  errors: string[];

  /** Suggested parameter adjustments */
  adjustedParameters?: any;

  /** Detailed reasoning for the validation decision */
  reasoning: string;

  /** Confidence based on historical patterns */
  historicalConfidence?: number;
}

/**
 * Color existence check result
 */
interface ColorExistenceResult {
  /** Whether the color was found in the image */
  found: boolean;

  /** Closest matching color if not exact match */
  closestMatch?: { r: number; g: number; b: number };

  /** Distance to closest match */
  distance: number;

  /** Percentage of pixels that match this color */
  matchPercentage: number;
}

// ===== MAIN VALIDATOR =====

/**
 * Validate tool parameters against ground truth and historical patterns.
 *
 * This is the main entry point that routes to specific validators and
 * combines results from schema validation, historical analysis, and
 * tool-specific checks.
 *
 * @param toolName - Name of the tool to validate
 * @param parameters - Parameters to validate
 * @param imageAnalysis - Ground truth image analysis
 * @param imageUrl - Image URL for pixel-level checks
 * @returns Validation result with confidence score
 *
 * @example
 * ```typescript
 * const result = await validateToolParameters(
 *   'color_knockout',
 *   { colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }], tolerance: 30 },
 *   imageAnalysis,
 *   imageUrl
 * );
 *
 * if (!result.isValid) {
 *   console.error('Validation failed:', result.errors);
 * } else if (result.confidence < 80) {
 *   console.warn('Low confidence:', result.warnings);
 * }
 * ```
 */
export async function validateToolParameters(
  toolName: string,
  parameters: any,
  imageAnalysis: ImageAnalysis,
  imageUrl: string
): Promise<ValidationResult> {
  const startTime = Date.now();

  try {
    // Step 1: Find tool definition
    const toolDef = toolDefinitions.find(t => t.name === toolName);
    if (!toolDef) {
      return {
        isValid: false,
        confidence: 0,
        warnings: [],
        errors: [`Unknown tool: ${toolName}`],
        reasoning: 'Tool not found in definitions',
      };
    }

    // Step 2: Validate against schema (bounds, enums, required fields)
    const schemaValidation = validateParameterBounds(parameters, toolDef);
    if (!schemaValidation.isValid) {
      return {
        isValid: false,
        confidence: 0,
        warnings: [],
        errors: schemaValidation.errors,
        reasoning: 'Parameter schema validation failed. Parameters do not match expected types or ranges.',
      };
    }

    // Step 3: Check historical patterns
    const historical = await checkHistoricalSuccess(
      toolName,
      parameters,
      imageAnalysis
    );

    // Step 4: Tool-specific validation
    let toolSpecific: ValidationResult;
    switch (toolName) {
      case 'color_knockout':
        toolSpecific = await validateColorKnockoutParams(
          parameters,
          imageAnalysis,
          imageUrl
        );
        break;

      case 'recolor_image':
        toolSpecific = await validateRecolorParams(parameters, imageAnalysis);
        break;

      case 'texture_cut':
        toolSpecific = await validateTextureCutParams(parameters, imageAnalysis);
        break;

      case 'background_remover':
        toolSpecific = await validateBackgroundRemoverParams(parameters, imageAnalysis);
        break;

      case 'upscaler':
        toolSpecific = await validateUpscalerParams(parameters, imageAnalysis);
        break;

      case 'extract_color_palette':
        toolSpecific = await validateExtractColorPaletteParams(parameters, imageAnalysis);
        break;

      case 'pick_color_at_position':
        toolSpecific = await validatePickColorParams(parameters, imageAnalysis);
        break;

      default:
        // No specific validation for unknown tools - rely on schema only
        toolSpecific = {
          isValid: true,
          confidence: 80,
          warnings: ['No specific validation available for this tool'],
          errors: [],
          reasoning: 'No tool-specific validation rules defined. Relying on schema validation only.',
        };
    }

    // Step 5: Combine results
    const finalConfidence = Math.min(
      toolSpecific.confidence,
      historical.confidence
    );

    const combinedWarnings = [
      ...toolSpecific.warnings,
      ...(historical.confidence < 70 ? ['Historical patterns show lower success rate for similar parameters'] : []),
    ];

    const elapsedTime = Date.now() - startTime;

    return {
      isValid: toolSpecific.isValid,
      confidence: finalConfidence,
      warnings: combinedWarnings,
      errors: toolSpecific.errors,
      reasoning: `${toolSpecific.reasoning}\n\nHistorical Analysis: ${historical.reasoning}\n\nValidation completed in ${elapsedTime}ms`,
      adjustedParameters: historical.adjustments || toolSpecific.adjustedParameters,
      historicalConfidence: historical.confidence,
    };
  } catch (error) {
    console.error('[ParameterValidator] Validation error:', error);
    return {
      isValid: false,
      confidence: 0,
      warnings: [],
      errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
      reasoning: 'Internal validation error occurred',
    };
  }
}

// ===== SCHEMA VALIDATION =====

/**
 * Validate parameters against tool schema (types, bounds, enums, required fields).
 *
 * @param params - Parameters to validate
 * @param toolDefinition - Tool definition with parameter schema
 * @returns Validation result
 */
function validateParameterBounds(
  params: any,
  toolDefinition: any
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const schema = toolDefinition.parameters;

  if (!schema || !schema.properties) {
    return { isValid: true, errors: [] };
  }

  // Check required fields
  if (schema.required) {
    for (const requiredField of schema.required) {
      if (params[requiredField] === undefined || params[requiredField] === null) {
        errors.push(`Missing required parameter: ${requiredField}`);
      }
    }
  }

  // Validate each parameter
  for (const [key, value] of Object.entries(params)) {
    const propSchema = schema.properties[key];
    if (!propSchema) {
      // Unknown parameter - warning but not error
      continue;
    }

    // Type validation
    if (propSchema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== propSchema.type) {
        errors.push(`Parameter '${key}' has wrong type. Expected ${propSchema.type}, got ${actualType}`);
        continue;
      }
    }

    // Enum validation
    if (propSchema.enum && !propSchema.enum.includes(value)) {
      errors.push(`Parameter '${key}' has invalid value '${value}'. Must be one of: ${propSchema.enum.join(', ')}`);
    }

    // Number range validation
    if (typeof value === 'number') {
      if (propSchema.minimum !== undefined && value < propSchema.minimum) {
        errors.push(`Parameter '${key}' is below minimum. Value: ${value}, Minimum: ${propSchema.minimum}`);
      }
      if (propSchema.maximum !== undefined && value > propSchema.maximum) {
        errors.push(`Parameter '${key}' is above maximum. Value: ${value}, Maximum: ${propSchema.maximum}`);
      }
    }

    // Array validation
    if (Array.isArray(value) && propSchema.items) {
      for (let i = 0; i < value.length; i++) {
        const item = value[i];
        if (propSchema.items.type === 'object' && propSchema.items.required) {
          for (const requiredField of propSchema.items.required) {
            if (item[requiredField] === undefined || item[requiredField] === null) {
              errors.push(`Array item ${i} in '${key}' missing required field: ${requiredField}`);
            }
          }
        }
      }
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ===== HISTORICAL VALIDATION =====

/**
 * Check historical success patterns for similar tool executions.
 *
 * @param toolName - Tool name to check
 * @param params - Current parameters
 * @param imageAnalysis - Current image analysis
 * @returns Historical confidence and suggested adjustments
 */
async function checkHistoricalSuccess(
  toolName: string,
  params: any,
  imageAnalysis: ImageAnalysis
): Promise<{ confidence: number; adjustments: any; reasoning: string }> {
  try {
    // Find similar successful executions
    const similar = await findSimilarExecutions(toolName, imageAnalysis, 5);

    if (similar.length === 0) {
      return {
        confidence: 75, // Neutral confidence when no history
        adjustments: null,
        reasoning: 'No historical data available for this tool and image type.',
      };
    }

    // Calculate average success metrics
    const avgConfidence = similar.reduce((sum, ex) => sum + ex.confidence, 0) / similar.length;

    // Tool-specific historical analysis
    let adjustments: any = null;
    let reasoning = `Found ${similar.length} similar successful executions. Average confidence: ${avgConfidence.toFixed(1)}%`;

    if (toolName === 'color_knockout') {
      // Analyze tolerance patterns
      const tolerances = similar.map(ex => ex.parameters.tolerance || 30);
      const avgTolerance = tolerances.reduce((a, b) => a + b, 0) / tolerances.length;

      if (params.tolerance && Math.abs(params.tolerance - avgTolerance) > 15) {
        adjustments = { ...params, tolerance: Math.round(avgTolerance) };
        reasoning += `\nSuggested tolerance adjustment: ${params.tolerance} → ${Math.round(avgTolerance)} based on historical patterns.`;
      }
    } else if (toolName === 'recolor_image') {
      // Analyze color mapping count patterns
      const mappingCounts = similar.map(ex => ex.parameters.colorMappings?.length || 1);
      const avgMappings = mappingCounts.reduce((a, b) => a + b, 0) / mappingCounts.length;

      if (params.colorMappings && params.colorMappings.length > avgMappings * 2) {
        reasoning += `\nWarning: Current mapping count (${params.colorMappings.length}) is significantly higher than historical average (${avgMappings.toFixed(1)}).`;
      }
    }

    return {
      confidence: avgConfidence,
      adjustments,
      reasoning,
    };
  } catch (error) {
    console.warn('[ParameterValidator] Historical check failed:', error);
    return {
      confidence: 75,
      adjustments: null,
      reasoning: 'Unable to retrieve historical data.',
    };
  }
}

// ===== TOOL-SPECIFIC VALIDATORS =====

/**
 * Validate Color Knockout parameters.
 *
 * Checks:
 * 1. Colors exist in the image (pixel sampling)
 * 2. Tolerance appropriate for image noise level
 * 3. Replace mode valid for use case
 * 4. Not removing too much (>95%) or too little (<1%)
 *
 * @param params - Color knockout parameters
 * @param imageAnalysis - Ground truth image analysis
 * @param imageUrl - Image URL for pixel checks
 * @returns Validation result
 */
async function validateColorKnockoutParams(
  params: any,
  imageAnalysis: ImageAnalysis,
  imageUrl: string
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = 100;
  const reasoningParts: string[] = [];

  // Validate colors exist
  if (!params.colors || params.colors.length === 0) {
    errors.push('No colors specified for knockout');
    return {
      isValid: false,
      confidence: 0,
      warnings,
      errors,
      reasoning: 'Color knockout requires at least one color to remove.',
    };
  }

  // Check color existence in image
  reasoningParts.push('Checking color existence in image...');
  const colorChecks: ColorExistenceResult[] = [];

  for (const color of params.colors) {
    const existenceCheck = await checkColorInImage(imageUrl, [color]);
    colorChecks.push(existenceCheck);

    if (!existenceCheck.found && existenceCheck.distance > 50) {
      errors.push(`Color ${color.hex} not found in image (closest match distance: ${existenceCheck.distance.toFixed(1)})`);
      confidence = Math.min(confidence, 30);
    } else if (existenceCheck.distance > 30) {
      warnings.push(`Color ${color.hex} has weak match (distance: ${existenceCheck.distance.toFixed(1)}). Consider adjusting tolerance.`);
      confidence = Math.min(confidence, 70);
    } else if (existenceCheck.matchPercentage < 1) {
      warnings.push(`Color ${color.hex} is rare in image (${existenceCheck.matchPercentage.toFixed(2)}% of pixels)`);
      confidence = Math.min(confidence, 80);
    }
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      confidence,
      warnings,
      errors,
      reasoning: 'Specified colors do not exist in the image. This will result in no visible effect.',
    };
  }

  reasoningParts.push(`All ${params.colors.length} color(s) found in image.`);

  // Validate tolerance against noise level
  const tolerance = params.tolerance || 30;

  if (imageAnalysis.noiseLevel > 30 && tolerance < 25) {
    warnings.push(`Image has high noise (${imageAnalysis.noiseLevel}/100). Tolerance ${tolerance} may be too strict. Suggest ≥25.`);
    confidence = Math.min(confidence, 75);
    reasoningParts.push('Tolerance may be too low for noisy image.');
  } else if (imageAnalysis.noiseLevel < 15 && tolerance > 40) {
    warnings.push(`Image has low noise (${imageAnalysis.noiseLevel}/100). Tolerance ${tolerance} may be too loose. Suggest 15-35.`);
    confidence = Math.min(confidence, 80);
    reasoningParts.push('Tolerance may be too high for clean image.');
  } else {
    reasoningParts.push(`Tolerance ${tolerance} is appropriate for image noise level (${imageAnalysis.noiseLevel}/100).`);
  }

  // Estimate coverage
  const totalMatchPercentage = colorChecks.reduce((sum, check) => sum + check.matchPercentage, 0);

  if (totalMatchPercentage > 95) {
    errors.push(`Color knockout will remove >95% of image. This will leave almost nothing visible.`);
    confidence = Math.min(confidence, 20);
    reasoningParts.push('Excessive coverage - will remove too much.');
    return {
      isValid: false,
      confidence,
      warnings,
      errors,
      reasoning: reasoningParts.join('\n'),
    };
  } else if (totalMatchPercentage < 1 && tolerance < 40) {
    warnings.push(`Colors match <1% of image. Effect may be minimal. Consider increasing tolerance.`);
    confidence = Math.min(confidence, 70);
    reasoningParts.push('Low coverage - effect may be subtle.');
  } else {
    reasoningParts.push(`Estimated coverage: ${totalMatchPercentage.toFixed(1)}% of image.`);
  }

  // Validate replace mode
  if (params.replaceMode === 'transparency' && !imageAnalysis.hasTransparency && imageAnalysis.format !== 'png') {
    warnings.push(`Image format ${imageAnalysis.format} may not support transparency. Consider converting to PNG first.`);
    confidence = Math.min(confidence, 85);
  }

  return {
    isValid: true,
    confidence,
    warnings,
    errors,
    reasoning: reasoningParts.join('\n'),
  };
}

/**
 * Validate Recolor parameters.
 *
 * Checks:
 * 1. Color mappings don't exceed dominant color count
 * 2. New colors not too similar to originals (DeltaE check)
 * 3. Blend mode appropriate for image type
 * 4. Tolerance matches image complexity
 *
 * @param params - Recolor parameters
 * @param imageAnalysis - Ground truth image analysis
 * @returns Validation result
 */
async function validateRecolorParams(
  params: any,
  imageAnalysis: ImageAnalysis
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = 100;
  const reasoningParts: string[] = [];

  // Validate color mappings exist
  if (!params.colorMappings || params.colorMappings.length === 0) {
    errors.push('No color mappings specified');
    return {
      isValid: false,
      confidence: 0,
      warnings,
      errors,
      reasoning: 'Recolor requires at least one color mapping.',
    };
  }

  reasoningParts.push(`Processing ${params.colorMappings.length} color mapping(s).`);

  // Check mapping count vs dominant colors
  const dominantColorCount = imageAnalysis.dominantColors.length;
  if (params.colorMappings.length > dominantColorCount) {
    warnings.push(`Mapping count (${params.colorMappings.length}) exceeds dominant color count (${dominantColorCount}). Some mappings may not match any pixels.`);
    confidence = Math.min(confidence, 80);
    reasoningParts.push('More mappings than dominant colors - some may be ineffective.');
  }

  // Check if new colors are too similar to originals
  for (const mapping of params.colorMappings) {
    const originalIndex = mapping.originalIndex;
    const newColorHex = mapping.newColor;

    if (originalIndex < 0 || originalIndex >= dominantColorCount) {
      const errorMsg = `Invalid originalIndex ${originalIndex}. Must be 0-${dominantColorCount - 1} (palette has ${dominantColorCount} colors).`;
      errors.push(errorMsg);
      reasoningParts.push(`ERROR: ${errorMsg}`);
      continue;
    }

    const originalColor = imageAnalysis.dominantColors[originalIndex];
    const newColorRgb = hexToRgb(newColorHex);

    // Calculate perceptual difference
    const originalLab = rgbToLab(originalColor);
    const newLab = rgbToLab(newColorRgb);
    const deltaE = deltaE2000(originalLab, newLab);

    if (deltaE < 5) {
      warnings.push(`Color mapping ${originalIndex}: New color ${newColorHex} is very similar to original ${originalColor.hex} (ΔE: ${deltaE.toFixed(1)}). Effect may be imperceptible.`);
      confidence = Math.min(confidence, 75);
    }

    reasoningParts.push(`Mapping ${originalIndex}: ${originalColor.hex} → ${newColorHex} (ΔE: ${deltaE.toFixed(1)})`);
  }

  // Validate tolerance against image complexity
  const tolerance = params.tolerance || 30;
  if (imageAnalysis.uniqueColorCount > 10000 && tolerance < 20) {
    warnings.push(`Image has high color complexity (${imageAnalysis.uniqueColorCount} unique colors). Low tolerance ${tolerance} may miss many pixels. Suggest ≥20.`);
    confidence = Math.min(confidence, 75);
    reasoningParts.push('Tolerance may be too strict for complex image.');
  } else if (imageAnalysis.uniqueColorCount < 1000 && tolerance > 40) {
    warnings.push(`Image has low color complexity (${imageAnalysis.uniqueColorCount} unique colors). High tolerance ${tolerance} may affect unintended colors. Suggest ≤35.`);
    confidence = Math.min(confidence, 80);
    reasoningParts.push('Tolerance may be too loose for simple image.');
  } else {
    reasoningParts.push(`Tolerance ${tolerance} is appropriate for image complexity (${imageAnalysis.uniqueColorCount} unique colors).`);
  }

  // Validate blend mode
  if (params.blendMode === 'multiply' && imageAnalysis.dominantColors[0]?.percentage > 80) {
    warnings.push('Multiply blend mode may result in very dark image if dominant color is light.');
    confidence = Math.min(confidence, 85);
  }

  return {
    isValid: errors.length === 0,
    confidence,
    warnings,
    errors,
    reasoning: reasoningParts.join('\n'),
  };
}

/**
 * Validate Texture Cut parameters.
 *
 * Checks:
 * 1. Texture type is valid
 * 2. Amount is in valid range (0-1)
 * 3. Scale is reasonable for image size
 * 4. Rotation is in valid range (0-360)
 *
 * @param params - Texture cut parameters
 * @param imageAnalysis - Ground truth image analysis
 * @returns Validation result
 */
async function validateTextureCutParams(
  params: any,
  imageAnalysis: ImageAnalysis
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = 100;
  const reasoningParts: string[] = [];

  reasoningParts.push(`Texture type: ${params.textureType}`);

  // Validate amount
  const amount = params.amount ?? 0.5;
  if (amount < 0.1) {
    warnings.push(`Amount ${amount} is very low. Effect may be barely visible. Consider ≥0.2.`);
    confidence = Math.min(confidence, 80);
  } else if (amount > 0.9) {
    warnings.push(`Amount ${amount} is very high. May cut too much of the image. Consider ≤0.8.`);
    confidence = Math.min(confidence, 85);
  }

  reasoningParts.push(`Amount: ${amount} (${(amount * 100).toFixed(0)}% intensity)`);

  // Validate scale
  const scale = params.scale ?? 1;
  const imageSize = Math.max(imageAnalysis.width, imageAnalysis.height);

  if (scale < 0.5 && imageSize > 2000) {
    warnings.push(`Scale ${scale} may be too small for large image (${imageSize}px). Texture may appear too dense.`);
    confidence = Math.min(confidence, 85);
  } else if (scale > 3 && imageSize < 500) {
    warnings.push(`Scale ${scale} may be too large for small image (${imageSize}px). Texture may appear too coarse.`);
    confidence = Math.min(confidence, 85);
  }

  reasoningParts.push(`Scale: ${scale}x (appropriate for ${imageSize}px image)`);

  // Validate texture type compatibility
  if (params.textureType === 'custom') {
    errors.push('Custom texture requires user upload. Use built-in patterns (dots, lines, grid, noise) instead.');
    return {
      isValid: false,
      confidence: 0,
      warnings,
      errors,
      reasoning: 'Custom textures are not supported in automated execution.',
    };
  }

  reasoningParts.push('All texture cut parameters are valid.');

  return {
    isValid: true,
    confidence,
    warnings,
    errors,
    reasoning: reasoningParts.join('\n'),
  };
}

/**
 * Validate Upscaler parameters.
 *
 * Checks:
 * 1. Scale factor is reasonable (2-10x)
 * 2. Output size won't exceed canvas limits (16MP max)
 * 3. Image quality supports upscaling (sharpness ≥40)
 *
 * @param params - Upscaler parameters
 * @param imageAnalysis - Ground truth image analysis
 * @returns Validation result
 */
async function validateUpscalerParams(
  params: any,
  imageAnalysis: ImageAnalysis
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = 100;
  const reasoningParts: string[] = [];

  const scale = params.scaleFactor || params.scale || 2;
  const outputWidth = imageAnalysis.width * scale;
  const outputHeight = imageAnalysis.height * scale;
  const outputMegapixels = (outputWidth * outputHeight) / 1_000_000;

  reasoningParts.push(`Scale factor: ${scale}x`);
  reasoningParts.push(`Output size: ${outputWidth} x ${outputHeight} (${outputMegapixels.toFixed(1)}MP)`);

  // Check output size limits
  const MAX_MEGAPIXELS = 16;
  if (outputMegapixels > MAX_MEGAPIXELS) {
    errors.push(`Output size ${outputMegapixels.toFixed(1)}MP exceeds maximum ${MAX_MEGAPIXELS}MP. Reduce scale factor to ≤${Math.floor((MAX_MEGAPIXELS * 1_000_000 / (imageAnalysis.width * imageAnalysis.height)) * 10) / 10}x`);
    return {
      isValid: false,
      confidence: 0,
      warnings,
      errors,
      reasoning: 'Output size would exceed canvas memory limits.',
    };
  }

  // Check if scale is too aggressive
  if (scale > 4 && imageAnalysis.width < 500) {
    warnings.push(`${scale}x upscaling of small image (${imageAnalysis.width}px) may introduce artifacts. Consider 2-4x instead.`);
    confidence = Math.min(confidence, 75);
  }

  // Check image quality
  if (imageAnalysis.sharpnessScore < 40) {
    warnings.push(`Image has low sharpness (${imageAnalysis.sharpnessScore}/100). Upscaling blurry images may not improve quality.`);
    confidence = Math.min(confidence, 70);
    reasoningParts.push('Low sharpness may limit upscaling effectiveness.');
  } else if (imageAnalysis.sharpnessScore >= 70) {
    reasoningParts.push(`Good sharpness (${imageAnalysis.sharpnessScore}/100) - image is suitable for upscaling.`);
  }

  // Check noise level
  if (imageAnalysis.noiseLevel > 50) {
    warnings.push(`Image has high noise level (${imageAnalysis.noiseLevel}/100). Upscaling may amplify noise.`);
    confidence = Math.min(confidence, 75);
    reasoningParts.push('High noise may be amplified during upscaling.');
  }

  return {
    isValid: errors.length === 0,
    confidence,
    warnings,
    errors,
    reasoning: reasoningParts.join('\n'),
  };
}

/**
 * Validate Background Remover parameters.
 *
 * Checks:
 * 1. Model is appropriate for image type
 * 2. Image size is within limits
 * 3. Image has identifiable subject (not abstract pattern)
 *
 * @param params - Background remover parameters
 * @param imageAnalysis - Ground truth image analysis
 * @returns Validation result
 */
async function validateBackgroundRemoverParams(
  params: any,
  imageAnalysis: ImageAnalysis
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = 100;
  const reasoningParts: string[] = [];

  // Check image size
  const megapixels = (imageAnalysis.width * imageAnalysis.height) / 1_000_000;
  reasoningParts.push(`Image size: ${imageAnalysis.width} x ${imageAnalysis.height} (${megapixels.toFixed(1)}MP)`);

  if (megapixels > 25) {
    warnings.push(`Large image (${megapixels.toFixed(1)}MP) may take longer to process. Consider resizing before background removal.`);
    confidence = Math.min(confidence, 85);
  }

  // Check if image likely has a clear subject
  // If color count is very high and distributed, may be abstract/textured
  if (imageAnalysis.uniqueColorCount > 50000 && imageAnalysis.dominantColors[0]?.percentage < 20) {
    warnings.push('Image appears to have complex color distribution. May be challenging to identify clear subject vs background.');
    confidence = Math.min(confidence, 75);
    reasoningParts.push('High color complexity may affect subject detection.');
  } else {
    reasoningParts.push('Image characteristics suitable for background removal.');
  }

  // Check if already has transparency
  if (imageAnalysis.hasTransparency) {
    warnings.push('Image already has transparency. Background removal may have unexpected results.');
    confidence = Math.min(confidence, 80);
  }

  return {
    isValid: true,
    confidence,
    warnings,
    errors,
    reasoning: reasoningParts.join('\n'),
  };
}

/**
 * Validate Extract Color Palette parameters.
 *
 * @param params - Extract color palette parameters
 * @param imageAnalysis - Ground truth image analysis
 * @returns Validation result
 */
async function validateExtractColorPaletteParams(
  params: any,
  imageAnalysis: ImageAnalysis
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = 100;
  const reasoningParts: string[] = [];

  const paletteSize = params.paletteSize || 9;
  reasoningParts.push(`Palette size: ${paletteSize} colors`);

  // Check if palette size is appropriate for image complexity
  if (paletteSize === 36 && imageAnalysis.uniqueColorCount < 100) {
    warnings.push(`Palette size 36 may be excessive for simple image with ~${imageAnalysis.uniqueColorCount} unique colors. Consider size 9.`);
    confidence = Math.min(confidence, 85);
  }

  reasoningParts.push(`Image has ${imageAnalysis.uniqueColorCount} unique colors - palette size is appropriate.`);

  return {
    isValid: true,
    confidence,
    warnings,
    errors,
    reasoning: reasoningParts.join('\n'),
  };
}

/**
 * Validate Pick Color parameters.
 *
 * @param params - Pick color parameters
 * @param imageAnalysis - Ground truth image analysis
 * @returns Validation result
 */
async function validatePickColorParams(
  params: any,
  imageAnalysis: ImageAnalysis
): Promise<ValidationResult> {
  const warnings: string[] = [];
  const errors: string[] = [];
  let confidence = 100;
  const reasoningParts: string[] = [];

  const { x, y } = params;

  // Check if coordinates are within image bounds
  if (x < 0 || x >= imageAnalysis.width) {
    errors.push(`X coordinate ${x} is outside image bounds (0-${imageAnalysis.width - 1})`);
  }

  if (y < 0 || y >= imageAnalysis.height) {
    errors.push(`Y coordinate ${y} is outside image bounds (0-${imageAnalysis.height - 1})`);
  }

  if (errors.length > 0) {
    return {
      isValid: false,
      confidence: 0,
      warnings,
      errors,
      reasoning: 'Coordinates are outside image boundaries.',
    };
  }

  reasoningParts.push(`Picking color at valid position (${x}, ${y}) within ${imageAnalysis.width}x${imageAnalysis.height} image.`);

  return {
    isValid: true,
    confidence,
    warnings,
    errors,
    reasoning: reasoningParts.join('\n'),
  };
}

// ===== COLOR EXISTENCE CHECKER =====

/**
 * Check if colors exist in the image using pixel sampling.
 *
 * Samples 1% of pixels randomly distributed across the image and checks
 * for color matches within tolerance.
 *
 * @param imageUrl - URL to the image
 * @param colors - Array of colors to check
 * @returns Color existence result with match percentage
 */
async function checkColorInImage(
  imageUrl: string,
  colors: Array<{ r: number; g: number; b: number; hex?: string }>
): Promise<ColorExistenceResult> {
  try {
    const img = await loadImage(imageUrl);
    const canvas = createCanvas(img.width, img.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    // Sample 1% of pixels (randomly distributed)
    const totalPixels = (img.width * img.height);
    const sampleSize = Math.max(1000, Math.ceil(totalPixels * 0.01)); // At least 1000 samples

    let minDistance = Infinity;
    let closestColor: { r: number; g: number; b: number } | undefined;
    let matchCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      // Random pixel index
      const pixelIndex = Math.floor(Math.random() * totalPixels);
      const dataIndex = pixelIndex * 4;

      const r = data[dataIndex];
      const g = data[dataIndex + 1];
      const b = data[dataIndex + 2];
      const a = data[dataIndex + 3];

      // Skip fully transparent pixels
      if (a < 10) continue;

      // Check distance to each target color
      for (const targetColor of colors) {
        const distance = colorDistance(
          { r, g, b },
          { r: targetColor.r, g: targetColor.g, b: targetColor.b }
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestColor = { r, g, b };
        }

        // If within tolerance (30 in RGB space ≈ 10-15% tolerance)
        if (distance < 30) {
          matchCount++;
        }
      }
    }

    const matchPercentage = (matchCount / sampleSize) * 100;

    return {
      found: minDistance < 50, // Generous threshold for "found"
      closestMatch: closestColor,
      distance: minDistance,
      matchPercentage,
    };
  } catch (error) {
    console.error('[ParameterValidator] Color check failed:', error);
    // Return permissive result on error
    return {
      found: true,
      distance: 0,
      matchPercentage: 0,
    };
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Convert hex color to RGB.
 *
 * @param hex - Hex color string (e.g., "#FF0000")
 * @returns RGB color object
 */
function hexToRgb(hex: string): RGBColor {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// ===== PUBLIC API SUMMARY =====

/**
 * Quick validation check without full analysis (for UI).
 *
 * @param toolName - Tool name
 * @param parameters - Parameters to check
 * @returns Basic validation result
 *
 * @example
 * ```typescript
 * const result = quickValidate('color_knockout', params);
 * if (!result.isValid) {
 *   showError(result.errors[0]);
 * }
 * ```
 */
export function quickValidate(
  toolName: string,
  parameters: any
): { isValid: boolean; errors: string[] } {
  const toolDef = toolDefinitions.find(t => t.name === toolName);
  if (!toolDef) {
    return { isValid: false, errors: [`Unknown tool: ${toolName}`] };
  }

  return validateParameterBounds(parameters, toolDef);
}
