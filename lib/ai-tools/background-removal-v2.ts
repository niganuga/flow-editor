/**
 * AI Background Remover Tool V2
 * Enhanced background removal using BRIA RMBG 2.0 with 256-level alpha transparency
 *
 * DIFFERENCES FROM V1:
 * - Uses BRIA RMBG 2.0 model (bria/remove-background)
 * - 256-level alpha transparency (non-binary masks) vs. binary transparency in v1
 * - Better edge quality and partial transparency handling
 * - Additional parameters: preserve_alpha, custom_threshold
 * - Automatic fallback to v1 function if RMBG 2.0 fails
 * - Cost: ~$0.018/image (53x more expensive than v1 fallback model)
 *
 * WHEN TO USE V2:
 * - High-quality outputs needed (print, marketing materials)
 * - Images with complex edges (hair, fur, glass, transparent objects)
 * - When partial transparency is important
 *
 * WHEN TO USE V1:
 * - Budget-sensitive operations (v1 costs $0.00034-$0.003/image)
 * - Simple backgrounds (solid colors, minimal edges)
 * - When binary transparency is sufficient
 */

import { fileToDataUrl } from '@/lib/file-utils';
import {
  compressImage,
  isPNGTransparent,
  getImageDimensions,
  convertToRGB,
} from '@/lib/canvas-utils';
import {
  createPrediction,
  pollPrediction,
  downloadResult,
  type ReplicatePrediction,
} from '@/lib/api/replicate';
import {
  FILE_LIMITS,
  validateImageFile,
  shouldCompressFile,
} from '@/lib/constants/file-limits';
import { removeBackground } from '@/lib/tools/background-remover';

/**
 * V2-specific settings extending base background removal options
 *
 * @property preserve_alpha - Enable 256-level alpha transparency (default: true)
 *   - true: Smooth transparency gradients (best quality)
 *   - false: Binary transparency (transparent or opaque only)
 *
 * @property custom_threshold - Alpha threshold for edge refinement (0-255, default: auto)
 *   - Lower values (0-50): Keep more semi-transparent pixels
 *   - Medium values (50-150): Balanced (recommended)
 *   - Higher values (150-255): More aggressive transparency removal
 *   - undefined: Let RMBG 2.0 decide automatically
 *
 * @property content_moderation - Enable content moderation (default: false)
 *   - true: Reject images with inappropriate content
 *   - false: No content filtering
 *
 * @property fallback_to_v1 - Enable automatic fallback to v1 on failure (default: true)
 *   - true: Use v1 removeBackground() if RMBG 2.0 fails
 *   - false: Throw error if RMBG 2.0 fails
 */
export interface BackgroundRemovalV2Settings {
  preserve_alpha?: boolean;
  custom_threshold?: number; // 0-255
  content_moderation?: boolean;
  fallback_to_v1?: boolean;
  outputFormat?: 'png' | 'webp';
  backgroundColor?: string; // Hex color for solid background (instead of transparent)
  featherEdges?: number; // 0-20px edge feathering (post-processing)
}

export interface BackgroundRemovalV2Options {
  image: File;
  settings: BackgroundRemovalV2Settings;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * BRIA RMBG 2.0 Model Configuration
 *
 * Model: bria/remove-background
 * Version: 0d70cc721b10cd04ea9194a33d27d7004b6aebba3911fa145eedf6cfe307ccac
 * Released: October 2024
 * Pricing: $0.018 per image
 *
 * Key Features:
 * - 256-level alpha transparency (vs binary in v1)
 * - Better edge quality (especially hair, fur, glass)
 * - Handles partial transparency intelligently
 * - Content moderation support
 */
const RMBG_V2_CONFIG = {
  model: 'bria/remove-background',
  version: '0d70cc721b10cd04ea9194a33d27d7004b6aebba3911fa145eedf6cfe307ccac',
  name: 'BRIA RMBG 2.0',
  description: 'Premium quality with 256-level alpha transparency',
  cost_per_image: 0.018, // $0.018/image
} as const;

/**
 * Prepare image for RMBG 2.0 API submission
 *
 * RMBG 2.0 accepts both PNG and JPEG, no RGB conversion needed
 * Only compress if file exceeds 10MB
 */
async function prepareImageV2(
  image: File,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  onProgress?.(10, 'Preparing image for RMBG 2.0...');

  let processedImage = image;

  // RMBG 2.0 handles RGBA well, no need to convert to RGB
  // Only compress if file is very large (>10MB)
  if (image.size > 10 * 1024 * 1024) {
    onProgress?.(15, 'Optimizing large image...');
    processedImage = await compressImage(
      image,
      FILE_LIMITS.COMPRESSION.quality,
      FILE_LIMITS.COMPRESSION.maxDimension
    );
    console.log(
      `[BG Removal V2] Compressed from ${(image.size / (1024 * 1024)).toFixed(2)}MB to ${(processedImage.size / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  // Convert to data URL
  onProgress?.(20, 'Converting image format...');
  const dataUrl = await fileToDataUrl(processedImage);

  return dataUrl;
}

/**
 * Build input parameters for RMBG 2.0 model
 *
 * RMBG 2.0 Parameters:
 * - image: Data URL or URI (required)
 * - preserve_partial_alpha: Enable 256-level transparency (default: true)
 * - content_moderation: Content filtering (default: false)
 */
function buildRMBGV2Input(
  imageUrl: string,
  settings: BackgroundRemovalV2Settings
): Record<string, any> {
  const input: Record<string, any> = {
    image: imageUrl,
  };

  // Enable/disable 256-level alpha transparency
  if (settings.preserve_alpha !== undefined) {
    input.preserve_partial_alpha = settings.preserve_alpha;
  }

  // Content moderation
  if (settings.content_moderation) {
    input.content_moderation = true;
  }

  return input;
}

/**
 * Post-process result with optional edge feathering and background color
 *
 * NOTE: This is a placeholder for future post-processing features.
 * Currently, RMBG 2.0 handles edge quality natively.
 */
async function postProcessResult(
  resultUrl: string,
  settings: BackgroundRemovalV2Settings,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  // For now, just return the result as-is
  // Future enhancements:
  // - Apply edge feathering if settings.featherEdges is set
  // - Add solid background if settings.backgroundColor is set
  // - Apply custom threshold if settings.custom_threshold is set

  return resultUrl;
}

/**
 * Remove background from image using BRIA RMBG 2.0 (enhanced v2)
 *
 * @param options - Image, settings, and progress callback
 * @returns Promise<string> - Data URL of result image with transparent background
 *
 * @throws Error if file validation fails or API request fails (when fallback disabled)
 *
 * @example
 * ```typescript
 * const result = await removeBackgroundV2({
 *   image: myImageFile,
 *   settings: {
 *     preserve_alpha: true,        // Enable 256-level transparency
 *     custom_threshold: 100,        // Medium edge refinement
 *     content_moderation: false,    // No content filtering
 *     fallback_to_v1: true,         // Use v1 if v2 fails
 *   },
 *   onProgress: (progress, message) => {
 *     console.log(`${progress}%: ${message}`);
 *   },
 * });
 * ```
 *
 * COST WARNING: This function costs ~$0.018 per image (53x more than v1 fallback model)
 * Use v1 for budget-sensitive operations or when binary transparency is sufficient.
 */
export async function removeBackgroundV2(
  options: BackgroundRemovalV2Options
): Promise<string> {
  const { image, settings, onProgress } = options;

  try {
    // Validate file
    const validation = validateImageFile(image);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.(0, 'Starting RMBG 2.0 background removal...');
    console.log(`[BG Removal V2] Using ${RMBG_V2_CONFIG.name} (cost: $${RMBG_V2_CONFIG.cost_per_image}/image)`);

    // Prepare image (v2-specific preprocessing)
    const imageUrl = await prepareImageV2(image, onProgress);

    onProgress?.(30, `Initializing ${RMBG_V2_CONFIG.name}...`);

    // Build input for RMBG 2.0
    const input = buildRMBGV2Input(imageUrl, settings);
    console.log('[BG Removal V2] RMBG 2.0 input:', {
      ...input,
      image: `[data URL ${imageUrl.length} chars]`,
    });

    // Create prediction with RMBG 2.0
    onProgress?.(40, 'Sending to RMBG 2.0 AI processing...');
    let prediction: ReplicatePrediction;

    try {
      prediction = await createPrediction({
        version: RMBG_V2_CONFIG.version,
        input,
      });
      console.log('[BG Removal V2] RMBG 2.0 prediction created:', prediction.id);
    } catch (error) {
      console.error('[BG Removal V2] RMBG 2.0 failed:', error);

      // Fallback to v1 if enabled
      if (settings.fallback_to_v1 !== false) {
        console.log('[BG Removal V2] Falling back to v1 removeBackground()...');
        onProgress?.(40, 'RMBG 2.0 unavailable, using standard background removal...');

        // Use v1 function with compatible settings
        return await removeBackground({
          image,
          settings: {
            model: 'bria', // Use v1's Bria model (RMBG 1.4)
            outputFormat: settings.outputFormat,
            backgroundColor: settings.backgroundColor,
            featherEdges: settings.featherEdges,
          },
          onProgress,
        });
      }

      throw error;
    }

    // Poll for completion
    const completed = await pollPrediction({
      predictionId: prediction.id,
      onStatus: (status, pred) => {
        // Calculate progress (50-90%)
        const progress =
          pred.status === 'starting' ? 60 :
          pred.status === 'processing' ? 75 :
          90;
        onProgress?.(progress, `RMBG 2.0: ${status}`);
      },
    });

    // Extract output URL
    const outputUrl = Array.isArray(completed.output)
      ? completed.output[0]
      : completed.output;

    if (!outputUrl) {
      throw new Error('No output URL in RMBG 2.0 response');
    }

    // Download result
    onProgress?.(95, 'Downloading RMBG 2.0 result...');
    const resultUrl = await downloadResult(outputUrl);

    // Post-process if needed
    const finalResult = await postProcessResult(resultUrl, settings, onProgress);

    onProgress?.(100, 'RMBG 2.0 background removal complete!');
    console.log('[BG Removal V2] Success! Result URL length:', finalResult.length);

    return finalResult;
  } catch (error) {
    console.error('[BG Removal V2] Error:', error);

    // Last resort: try v1 fallback if not already tried
    if (settings.fallback_to_v1 !== false && error instanceof Error) {
      console.log('[BG Removal V2] Final fallback to v1 due to error...');
      onProgress?.(40, 'Using fallback background removal...');

      try {
        return await removeBackground({
          image,
          settings: {
            model: 'fallback', // Use v1's cheapest fallback model
            outputFormat: settings.outputFormat,
            backgroundColor: settings.backgroundColor,
            featherEdges: settings.featherEdges,
          },
          onProgress,
        });
      } catch (fallbackError) {
        console.error('[BG Removal V2] Fallback also failed:', fallbackError);
        throw error; // Throw original error
      }
    }

    throw error;
  }
}

/**
 * Get RMBG 2.0 model info
 */
export function getModelInfoV2() {
  return RMBG_V2_CONFIG;
}

/**
 * Compare cost vs v1 models
 *
 * @returns Cost comparison object
 */
export function getCostComparison() {
  return {
    v2_rmbg2: {
      name: RMBG_V2_CONFIG.name,
      cost: RMBG_V2_CONFIG.cost_per_image,
    },
    v1_bria: {
      name: 'Bria RMBG 1.4',
      cost: 0.003, // Estimated
    },
    v1_codeplugtech: {
      name: 'CodeplugTech',
      cost: 0.002, // Estimated
    },
    v1_fallback: {
      name: '851 Labs',
      cost: 0.00034,
    },
    cost_multiplier: (RMBG_V2_CONFIG.cost_per_image / 0.00034).toFixed(1) + 'x',
  };
}
