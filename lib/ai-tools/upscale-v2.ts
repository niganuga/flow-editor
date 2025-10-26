/**
 * AI Upscaler Tool V2
 * Enhanced image upscaling with Magic Image Refiner and SwinIR
 *
 * DIFFERENCES FROM V1:
 * - Adds Magic Image Refiner (SDXL-based, better quality)
 * - Adds SwinIR (better texture and detail than Real-ESRGAN)
 * - Cost tracking for each model
 * - Enhanced parameter controls (creativity, resemblance, mask support)
 * - Automatic fallback to v1 models if v2 models fail
 *
 * WHEN TO USE V2:
 * - Need highest quality upscaling (marketing, print materials)
 * - Complex textures and fine details
 * - Creative enhancement with artistic control
 * - When cost is less of a concern
 *
 * WHEN TO USE V1:
 * - Budget-sensitive operations
 * - Simple upscaling needs
 * - Fast processing priority
 * - Standard Real-ESRGAN quality is sufficient
 */

import { fileToDataUrl } from '@/lib/file-utils';
import {
  compressImage,
  isPNGTransparent,
  addWhiteBackgroundToImage,
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
import { upscaleImage } from '@/lib/tools/upscaler';

/**
 * V2 model types
 * - magic-refiner: SDXL-based, highest quality, creative enhancement
 * - swinir: Better texture/detail than Real-ESRGAN, slower
 * - real-esrgan: Fast standard upscaling (from v1)
 */
export type UpscaleModelV2 = 'magic-refiner' | 'swinir' | 'real-esrgan';

/**
 * V2-specific settings extending base upscale options
 *
 * @property model - Model to use (magic-refiner, swinir, real-esrgan)
 * @property scaleFactor - Upscale multiplier (1-4x for most models)
 * @property creativity - Magic Refiner only: 0-1 (default: 0.25)
 *   - 0: Conservative, stay close to original
 *   - 0.5: Balanced creative enhancement
 *   - 1: Maximum creative interpretation
 * @property resemblance - Magic Refiner only: 0-1 (default: 0.75)
 *   - 0: Allow more changes
 *   - 0.75: Good balance
 *   - 1: Stay very close to original
 * @property prompt - Magic Refiner only: Text description for guidance
 * @property mask - Magic Refiner only: Focus enhancement on specific areas
 * @property resolution - Magic Refiner only: Target resolution (original, 1024, 2048)
 * @property noise_level - SwinIR only: Denoise level (0, 15, 25, 50)
 * @property jpeg_quality - SwinIR only: JPEG artifact removal level
 * @property fallback_to_v1 - Auto-fallback to v1 on failure (default: true)
 * @property track_cost - Log cost information (default: true)
 */
export interface UpscaleSettingsV2 {
  model: UpscaleModelV2;
  scaleFactor?: number; // 1-4x typically
  // Magic Refiner specific
  creativity?: number; // 0-1
  resemblance?: number; // 0-1
  prompt?: string;
  mask?: string; // Data URL or URI
  resolution?: 'original' | '1024' | '2048';
  guidance_scale?: number; // 1-20
  steps?: number; // 10-50
  hdr?: number; // 0-1
  // SwinIR specific
  noise_level?: 0 | 15 | 25 | 50;
  jpeg_quality?: number; // For JPEG artifact removal
  // Common options
  outputFormat?: 'png' | 'jpg' | 'webp';
  fallback_to_v1?: boolean;
  track_cost?: boolean;
}

export interface UpscaleOptionsV2 {
  image: File;
  settings: UpscaleSettingsV2;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Model configurations with cost tracking
 *
 * Magic Image Refiner:
 * - Model: batouresearch/magic-image-refiner
 * - Cost: ~$0.006/image (estimated, $0.000975/sec)
 * - Quality: Highest, SDXL-based
 * - Speed: ~6 seconds average
 *
 * SwinIR:
 * - Model: jingyunliang/swinir
 * - Cost: ~$0.004/image (estimated)
 * - Quality: Better texture/detail than Real-ESRGAN
 * - Speed: ~4 seconds
 *
 * Real-ESRGAN:
 * - Model: nightmareai/real-esrgan (from v1)
 * - Cost: ~$0.002/image (estimated)
 * - Quality: Good, fast standard
 * - Speed: ~1.4 seconds
 */
const MODEL_CONFIGS_V2 = {
  'magic-refiner': {
    id: 'batouresearch/magic-image-refiner',
    version: '8d32b32695f13cb06745dca3e37e0f80cb0bc9f2eeeb7e1435e2cd5ea4aa59f1',
    name: 'Magic Image Refiner',
    description: 'SDXL-based, highest quality with creative enhancement',
    cost_per_image: 0.006, // ~$0.000975/second * 6 seconds average
    avg_duration_seconds: 6,
    max_scale: 4,
  },
  swinir: {
    id: 'jingyunliang/swinir',
    version: '660d922d33153019e8c594a7e43eea0e2c2e3d7b858e0fe7a5c4fe5d3a8e4e87',
    name: 'SwinIR',
    description: 'Better texture and detail quality than Real-ESRGAN',
    cost_per_image: 0.004, // Estimated
    avg_duration_seconds: 4,
    max_scale: 4,
  },
  'real-esrgan': {
    id: 'nightmareai/real-esrgan',
    version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
    name: 'Real-ESRGAN',
    description: 'Fast standard upscaling (from v1)',
    cost_per_image: 0.002, // Estimated
    avg_duration_seconds: 1.4,
    max_scale: 10,
  },
} as const;

/**
 * Cost tracking state
 * In production, this should be saved to database/analytics
 */
interface CostLog {
  model: UpscaleModelV2;
  cost: number;
  duration_seconds: number;
  timestamp: number;
  image_size_kb: number;
  scale_factor: number;
}

let costLogs: CostLog[] = [];

/**
 * Log cost for analytics
 */
function logCost(log: CostLog): void {
  costLogs.push(log);
  console.log(`[Upscale V2 Cost] ${log.model}: $${log.cost.toFixed(4)} (${log.duration_seconds.toFixed(1)}s)`);

  // In production: Send to analytics endpoint
  // await fetch('/api/analytics/costs', { method: 'POST', body: JSON.stringify(log) });
}

/**
 * Get cost logs (for debugging/analytics)
 */
export function getCostLogs(): CostLog[] {
  return [...costLogs];
}

/**
 * Get total cost spent
 */
export function getTotalCost(): number {
  return costLogs.reduce((sum, log) => sum + log.cost, 0);
}

/**
 * Clear cost logs
 */
export function clearCostLogs(): void {
  costLogs = [];
}

/**
 * Prepare image for v2 API submission
 */
async function prepareImageV2(
  image: File,
  model: UpscaleModelV2,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  onProgress?.(10, 'Preparing image for upscaling...');

  let processedImage = image;

  // Handle transparent PNGs (add white background for non-Magic models)
  if (image.type === 'image/png' && model !== 'magic-refiner') {
    const isTransparent = await isPNGTransparent(image);
    if (isTransparent) {
      onProgress?.(15, 'Adding white background to transparent image...');
      processedImage = await addWhiteBackgroundToImage(image);
      console.log('[Upscale V2] Added white background to transparent PNG');
    }
  }

  // Compress if needed
  if (shouldCompressFile(processedImage)) {
    onProgress?.(20, 'Optimizing image for processing...');
    processedImage = await compressImage(
      processedImage,
      FILE_LIMITS.COMPRESSION.quality,
      FILE_LIMITS.COMPRESSION.maxDimension
    );
    console.log(
      `[Upscale V2] Compressed from ${(image.size / (1024 * 1024)).toFixed(2)}MB to ${(processedImage.size / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  // Convert to data URL
  onProgress?.(30, 'Converting image format...');
  const dataUrl = await fileToDataUrl(processedImage);

  return dataUrl;
}

/**
 * Build input parameters for Magic Image Refiner
 */
function buildMagicRefinerInput(
  imageUrl: string,
  settings: UpscaleSettingsV2
): Record<string, any> {
  const input: Record<string, any> = {
    image: imageUrl,
    prompt: settings.prompt || 'masterpiece, best quality, highres, detailed',
    steps: settings.steps || 20,
    creativity: settings.creativity ?? 0.25,
    resemblance: settings.resemblance ?? 0.75,
    guidance_scale: settings.guidance_scale ?? 7,
    resolution: settings.resolution || 'original',
    hdr: settings.hdr ?? 0,
    output_format: settings.outputFormat || 'png',
  };

  // Add mask if provided
  if (settings.mask) {
    input.mask = settings.mask;
  }

  return input;
}

/**
 * Build input parameters for SwinIR
 */
function buildSwinIRInput(
  imageUrl: string,
  settings: UpscaleSettingsV2
): Record<string, any> {
  return {
    image: imageUrl,
    task: 'real_sr', // Real-world super-resolution
    scale: settings.scaleFactor || 2,
    noise: settings.noise_level || 0,
    jpeg: settings.jpeg_quality || 40,
  };
}

/**
 * Build input parameters for Real-ESRGAN
 */
function buildRealESRGANInput(
  imageUrl: string,
  settings: UpscaleSettingsV2
): Record<string, any> {
  return {
    image: imageUrl,
    scale: Math.min(Math.max(settings.scaleFactor || 2, 1), 10),
    face_enhance: false, // V2 doesn't use face enhance by default
  };
}

/**
 * Build input based on selected model
 */
function buildModelInput(
  imageUrl: string,
  model: UpscaleModelV2,
  settings: UpscaleSettingsV2
): Record<string, any> {
  switch (model) {
    case 'magic-refiner':
      return buildMagicRefinerInput(imageUrl, settings);
    case 'swinir':
      return buildSwinIRInput(imageUrl, settings);
    case 'real-esrgan':
      return buildRealESRGANInput(imageUrl, settings);
    default:
      throw new Error(`Unknown model: ${model}`);
  }
}

/**
 * Upscale image using V2 models (Magic Refiner, SwinIR, or Real-ESRGAN)
 *
 * @param options - Image, settings, and progress callback
 * @returns Promise<string> - Data URL of upscaled result
 *
 * @throws Error if file validation fails or API request fails (when fallback disabled)
 *
 * @example
 * ```typescript
 * // High-quality creative upscaling
 * const result = await upscaleImageV2({
 *   image: myImageFile,
 *   settings: {
 *     model: 'magic-refiner',
 *     creativity: 0.3,
 *     resemblance: 0.8,
 *     prompt: 'professional photography, sharp details',
 *     resolution: '2048',
 *   },
 *   onProgress: (progress, msg) => console.log(`${progress}%: ${msg}`),
 * });
 *
 * // Fast standard upscaling
 * const result = await upscaleImageV2({
 *   image: myImageFile,
 *   settings: {
 *     model: 'real-esrgan',
 *     scaleFactor: 2,
 *   },
 *   onProgress: (progress, msg) => console.log(`${progress}%: ${msg}`),
 * });
 * ```
 *
 * COST COMPARISON:
 * - magic-refiner: ~$0.006/image (highest quality)
 * - swinir: ~$0.004/image (good quality, slower)
 * - real-esrgan: ~$0.002/image (fast, standard quality)
 */
export async function upscaleImageV2(
  options: UpscaleOptionsV2
): Promise<string> {
  const { image, settings, onProgress } = options;
  const startTime = Date.now();

  try {
    // Validate file
    const validation = validateImageFile(image);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const model = settings.model;
    const modelConfig = MODEL_CONFIGS_V2[model];

    onProgress?.(0, `Starting ${modelConfig.name} upscale...`);
    console.log(`[Upscale V2] Using ${modelConfig.name} (estimated cost: $${modelConfig.cost_per_image.toFixed(4)}/image)`);

    // Prepare image (model-specific preprocessing)
    const imageUrl = await prepareImageV2(image, model, onProgress);

    onProgress?.(40, `Initializing ${modelConfig.name}...`);

    // Build input based on model
    const input = buildModelInput(imageUrl, model, settings);
    console.log('[Upscale V2] Model input:', {
      ...input,
      image: `[data URL ${imageUrl.length} chars]`,
      mask: input.mask ? `[mask ${input.mask.length} chars]` : undefined,
    });

    // Create prediction
    onProgress?.(50, 'Sending to AI processing...');
    let prediction: ReplicatePrediction;

    try {
      prediction = await createPrediction({
        version: modelConfig.version,
        input,
      });
      console.log('[Upscale V2] Prediction created:', prediction.id);
    } catch (error) {
      console.error(`[Upscale V2] ${modelConfig.name} failed:`, error);

      // Fallback to v1 if enabled
      if (settings.fallback_to_v1 !== false) {
        console.log('[Upscale V2] Falling back to v1 upscaleImage()...');
        onProgress?.(50, 'Using standard upscaling...');

        return await upscaleImage({
          image,
          settings: {
            model: 'standard',
            scaleFactor: settings.scaleFactor || 2,
            outputFormat: settings.outputFormat,
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
        onProgress?.(progress, `${modelConfig.name}: ${status}`);
      },
    });

    // Extract output URL
    const outputUrl = Array.isArray(completed.output)
      ? completed.output[0]
      : completed.output;

    if (!outputUrl) {
      throw new Error(`No output URL in ${modelConfig.name} response`);
    }

    // Download result
    onProgress?.(95, 'Downloading enhanced image...');
    const resultUrl = await downloadResult(outputUrl);

    // Calculate actual duration and cost
    const duration = (Date.now() - startTime) / 1000;
    const actualCost = modelConfig.cost_per_image; // In production, get from API response

    // Track cost
    if (settings.track_cost !== false) {
      logCost({
        model,
        cost: actualCost,
        duration_seconds: duration,
        timestamp: Date.now(),
        image_size_kb: image.size / 1024,
        scale_factor: settings.scaleFactor || 2,
      });
    }

    onProgress?.(100, `${modelConfig.name} complete!`);
    console.log(`[Upscale V2] Success! Duration: ${duration.toFixed(1)}s, Cost: $${actualCost.toFixed(4)}`);

    return resultUrl;
  } catch (error) {
    console.error('[Upscale V2] Error:', error);

    // Last resort: try v1 fallback if not already tried
    if (settings.fallback_to_v1 !== false && error instanceof Error) {
      console.log('[Upscale V2] Final fallback to v1 due to error...');
      onProgress?.(50, 'Using fallback upscaling...');

      try {
        return await upscaleImage({
          image,
          settings: {
            model: 'standard',
            scaleFactor: settings.scaleFactor || 2,
            outputFormat: settings.outputFormat,
          },
          onProgress,
        });
      } catch (fallbackError) {
        console.error('[Upscale V2] Fallback also failed:', fallbackError);
        throw error; // Throw original error
      }
    }

    throw error;
  }
}

/**
 * Get model info for a specific model
 */
export function getModelInfoV2(model: UpscaleModelV2) {
  return MODEL_CONFIGS_V2[model];
}

/**
 * Get all available V2 models
 */
export function getAvailableModelsV2() {
  return Object.entries(MODEL_CONFIGS_V2).map(([key, config]) => ({
    id: key as UpscaleModelV2,
    ...config,
  }));
}

/**
 * Compare costs across models
 */
export function getCostComparison() {
  return {
    v2_magic_refiner: {
      name: MODEL_CONFIGS_V2['magic-refiner'].name,
      cost: MODEL_CONFIGS_V2['magic-refiner'].cost_per_image,
      duration: MODEL_CONFIGS_V2['magic-refiner'].avg_duration_seconds,
      quality: 'Highest',
    },
    v2_swinir: {
      name: MODEL_CONFIGS_V2.swinir.name,
      cost: MODEL_CONFIGS_V2.swinir.cost_per_image,
      duration: MODEL_CONFIGS_V2.swinir.avg_duration_seconds,
      quality: 'High',
    },
    v2_real_esrgan: {
      name: MODEL_CONFIGS_V2['real-esrgan'].name,
      cost: MODEL_CONFIGS_V2['real-esrgan'].cost_per_image,
      duration: MODEL_CONFIGS_V2['real-esrgan'].avg_duration_seconds,
      quality: 'Good',
    },
    cost_difference: {
      magic_vs_esrgan: `${(MODEL_CONFIGS_V2['magic-refiner'].cost_per_image / MODEL_CONFIGS_V2['real-esrgan'].cost_per_image).toFixed(1)}x`,
      swinir_vs_esrgan: `${(MODEL_CONFIGS_V2.swinir.cost_per_image / MODEL_CONFIGS_V2['real-esrgan'].cost_per_image).toFixed(1)}x`,
    },
  };
}

/**
 * Recommend model based on requirements
 */
export function recommendModel(requirements: {
  priority: 'quality' | 'speed' | 'cost';
  hasTransparency?: boolean;
  needsCreativeEnhancement?: boolean;
}): UpscaleModelV2 {
  const { priority, hasTransparency, needsCreativeEnhancement } = requirements;

  if (needsCreativeEnhancement) {
    return 'magic-refiner';
  }

  if (priority === 'quality') {
    return hasTransparency ? 'magic-refiner' : 'swinir';
  }

  if (priority === 'speed' || priority === 'cost') {
    return 'real-esrgan';
  }

  // Default: balanced quality/speed
  return 'swinir';
}
