/**
 * AI Background Remover Tool
 * Remove backgrounds from images using AI models
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

export type BackgroundRemovalModel = 'bria' | 'codeplugtech' | 'fallback';

export interface BackgroundRemovalSettings {
  model?: BackgroundRemovalModel;
  outputFormat?: 'png' | 'webp';
  backgroundColor?: string; // Hex color for solid background (instead of transparent)
  featherEdges?: number; // 0-20px edge feathering
}

export interface BackgroundRemovalOptions {
  image: File;
  settings: BackgroundRemovalSettings;
  onProgress?: (progress: number, message: string) => void;
}

// Model configurations
const MODEL_CONFIGS = {
  bria: {
    model: 'bria/product-cutout',
    name: 'Bria Product Cutout',
    description: 'Professional 256-level transparency for products',
    usesProductCutout: true,
  },
  codeplugtech: {
    version: '37ff2aa89897c0de4a140a3d50969dc62b663ea467e1e2bde18008e3d3731b2b',
    name: 'CodeplugTech',
    description: 'Fast general purpose background removal',
    usesProductCutout: false,
  },
  fallback: {
    version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc',
    name: '851 Labs',
    description: 'Reliable fallback model',
    usesProductCutout: false,
  },
} as const;

/**
 * Prepare image for API submission
 */
async function prepareImage(
  image: File,
  model: BackgroundRemovalModel,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  onProgress?.(10, 'Preparing image...');

  let processedImage = image;

  // CodeplugTech model requires RGB (3-channel) images, not RGBA (4-channel)
  // Convert to RGB to avoid tensor dimension mismatch
  if (model === 'codeplugtech') {
    onProgress?.(15, 'Converting to RGB format...');
    processedImage = await convertToRGB(image);
    console.log('Converted image to RGB for CodeplugTech model');
  } else if (image.size > 10 * 1024 * 1024) {
    // For other models, only compress if file is very large
    onProgress?.(15, 'Optimizing large image...');
    processedImage = await compressImage(
      image,
      FILE_LIMITS.COMPRESSION.quality,
      FILE_LIMITS.COMPRESSION.maxDimension
    );
    console.log(
      `Compressed from ${(image.size / (1024 * 1024)).toFixed(2)}MB to ${(processedImage.size / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  // Convert to data URL
  onProgress?.(20, 'Converting image format...');
  const dataUrl = await fileToDataUrl(processedImage);

  return dataUrl;
}

/**
 * Build input parameters for the selected model
 */
function buildModelInput(
  imageUrl: string,
  settings: BackgroundRemovalSettings,
  model: BackgroundRemovalModel
): Record<string, any> {
  const modelConfig = MODEL_CONFIGS[model];

  if (modelConfig.usesProductCutout) {
    // Bria Product Cutout parameters
    return {
      image: imageUrl,
      force_rmbg: false, // Don't force if image already has alpha
      preserve_alpha: true, // Preserve existing alpha channel
      content_moderation: false, // Disable content moderation for speed
    };
  } else {
    // CodeplugTech and fallback models support additional settings
    return {
      image: imageUrl,
      format: settings.outputFormat || 'png',
      background_type: settings.backgroundColor ? 'color' : 'rgba',
      ...(settings.backgroundColor && { background_color: settings.backgroundColor }),
    };
  }
}

/**
 * Remove background from image using AI
 */
export async function removeBackground(
  options: BackgroundRemovalOptions
): Promise<string> {
  const { image, settings, onProgress } = options;

  try {
    // Validate file
    const validation = validateImageFile(image);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.(0, 'Starting background removal...');

    // Determine which model to use
    const model = settings.model || 'bria'; // Default to Bria (best quality)
    const modelConfig = MODEL_CONFIGS[model];

    // Prepare image (model-specific preprocessing)
    const imageUrl = await prepareImage(image, model, onProgress);

    onProgress?.(30, `Initializing ${modelConfig.name}...`);

    // Build input based on model
    const input = buildModelInput(imageUrl, settings, model);

    // Create prediction
    onProgress?.(40, 'Sending to AI processing...');
    let prediction: ReplicatePrediction;

    try {
      // Product Cutout uses model name, others use version
      const predictionOptions = modelConfig.usesProductCutout
        ? {
            version: modelConfig.model, // For product cutout, use model name as version
            input,
          }
        : {
            version: modelConfig.version,
            input,
          };

      prediction = await createPrediction(predictionOptions);
    } catch (error) {
      // If primary model fails, try fallback
      if (model !== 'fallback') {
        console.warn(`${modelConfig.name} failed, trying fallback model...`);
        onProgress?.(40, 'Trying alternative model...');

        const fallbackConfig = MODEL_CONFIGS.fallback;
        const fallbackInput = buildModelInput(imageUrl, settings, 'fallback');

        prediction = await createPrediction({
          version: fallbackConfig.version,
          input: fallbackInput,
        });
      } else {
        throw error;
      }
    }

    console.log('Background removal prediction created:', prediction.id);

    // Poll for completion
    const completed = await pollPrediction({
      predictionId: prediction.id,
      onStatus: (status, pred) => {
        // Calculate progress (50-90%)
        const progress = pred.status === 'starting' ? 60 : pred.status === 'processing' ? 75 : 90;
        onProgress?.(progress, status);
      },
    });

    // Extract output URL
    const outputUrl = Array.isArray(completed.output)
      ? completed.output[0]
      : completed.output;

    if (!outputUrl) {
      throw new Error('No output URL in response');
    }

    // Download result
    onProgress?.(95, 'Downloading result...');
    const resultUrl = await downloadResult(outputUrl);

    onProgress?.(100, 'Background removal complete!');
    return resultUrl;
  } catch (error) {
    console.error('Background removal error:', error);
    throw error;
  }
}

/**
 * Get model info
 */
export function getModelInfo(model: BackgroundRemovalModel) {
  return MODEL_CONFIGS[model];
}

/**
 * Get all available models
 */
export function getAvailableModels() {
  return Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
    id: key as BackgroundRemovalModel,
    ...config,
  }));
}
