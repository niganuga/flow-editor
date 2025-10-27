/**
 * AI Upscaler Tool
 * Enhance and upscale images using AI models
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

export type UpscaleModel = 'standard' | 'creative' | 'anime';

export interface UpscaleSettings {
  model: UpscaleModel;
  scaleFactor: number; // 1-10x
  faceEnhance?: boolean; // Standard/Anime only
  // Creative model settings
  creativity?: number; // 0-1
  resemblance?: number; // 0-1
  dynamic?: number; // 1-10
  sharpen?: number; // 0-2
  prompt?: string;
  outputFormat?: 'png' | 'jpg' | 'webp';
}

export interface UpscaleOptions {
  image: File;
  settings: UpscaleSettings;
  onProgress?: (progress: number, message: string) => void;
}

// Model configurations
const MODEL_CONFIGS = {
  standard: {
    version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
    name: 'Standard (Real-ESRGAN)',
    description: 'General purpose upscaling',
  },
  creative: {
    version: 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e',
    name: 'Creative (Clarity Upscaler)',
    description: 'Photographic enhancement with artistic touch',
  },
  anime: {
    version: '1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56',
    name: 'Anime (RealESRGAN Anime)',
    description: 'Specialized for illustrations and anime',
  },
} as const;

// GPU pixel limit for Real-ESRGAN model
const GPU_PIXEL_LIMIT = 2_096_704; // Maximum pixels that fit in GPU memory

/**
 * Check if image dimensions exceed GPU pixel limit
 */
async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.width, height: img.height });
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image dimensions'));
    };

    img.src = url;
  });
}

/**
 * Prepare image for API submission
 * Handles transparent PNGs, file size compression, and GPU pixel limits
 */
async function prepareImage(
  image: File,
  onProgress?: (progress: number, message: string) => void
): Promise<string> {
  onProgress?.(10, 'Preparing image...');

  let processedImage = image;

  // Get image dimensions to check pixel count
  const dimensions = await getImageDimensions(processedImage);
  const totalPixels = dimensions.width * dimensions.height;

  console.log(`[Upscaler] Image dimensions: ${dimensions.width}×${dimensions.height} (${totalPixels.toLocaleString()} pixels)`);

  // Check if image exceeds GPU pixel limit
  if (totalPixels > GPU_PIXEL_LIMIT) {
    const scaleFactor = Math.sqrt(GPU_PIXEL_LIMIT / totalPixels);
    const newWidth = Math.floor(dimensions.width * scaleFactor);
    const newHeight = Math.floor(dimensions.height * scaleFactor);

    onProgress?.(12, `Image too large (${totalPixels.toLocaleString()} pixels). Resizing to ${newWidth}×${newHeight}...`);
    console.log(`[Upscaler] Resizing from ${dimensions.width}×${dimensions.height} to ${newWidth}×${newHeight} to fit GPU limit`);

    processedImage = await compressImage(
      processedImage,
      0.95, // High quality since we're just resizing
      Math.max(newWidth, newHeight)
    );
  }

  // Check for transparent PNG and add white background
  if (processedImage.type === 'image/png') {
    const isTransparent = await isPNGTransparent(processedImage);
    if (isTransparent) {
      onProgress?.(15, 'Adding white background to transparent image...');
      processedImage = await addWhiteBackgroundToImage(processedImage);
      console.log('[Upscaler] Added white background to transparent PNG');
    }
  }

  // Compress if file size is too large
  if (shouldCompressFile(processedImage)) {
    onProgress?.(20, 'Optimizing file size for processing...');
    processedImage = await compressImage(
      processedImage,
      FILE_LIMITS.COMPRESSION.quality,
      FILE_LIMITS.COMPRESSION.maxDimension
    );
    console.log(
      `[Upscaler] Compressed from ${(image.size / (1024 * 1024)).toFixed(2)}MB to ${(processedImage.size / (1024 * 1024)).toFixed(2)}MB`
    );
  }

  // Convert to data URL
  onProgress?.(30, 'Converting image format...');
  const dataUrl = await fileToDataUrl(processedImage);

  return dataUrl;
}

/**
 * Build input parameters for the selected model
 */
function buildModelInput(imageUrl: string, settings: UpscaleSettings): Record<string, any> {
  const { model, scaleFactor, faceEnhance } = settings;

  if (model === 'standard') {
    // nightmareai/real-esrgan
    return {
      image: imageUrl,
      scale: Math.min(Math.max(scaleFactor || 2, 1), 10),
      face_enhance: faceEnhance || false,
    };
  } else if (model === 'creative') {
    // philz1337x/clarity-upscaler
    return {
      image: imageUrl,
      scale_factor: scaleFactor || 2,
      creativity: settings.creativity ?? 0.35,
      resemblance: settings.resemblance ?? 0.6,
      dynamic: settings.dynamic ?? 6,
      prompt: settings.prompt || 'masterpiece, best quality, highres',
      scheduler: 'DPM++ 3M SDE Karras',
      sharpen: settings.sharpen ?? 1,
      output_format: settings.outputFormat || 'png',
      downscaling: false,
    };
  } else {
    // xinntao/realesrgan (anime)
    return {
      img: imageUrl, // Note: anime model uses 'img' not 'image'
      version: 'Anime - anime6B',
      scale: scaleFactor || 2,
      face_enhance: faceEnhance || false,
      tile: 0,
    };
  }
}

/**
 * Upscale image using AI
 */
export async function upscaleImage(options: UpscaleOptions): Promise<string> {
  const { image, settings, onProgress } = options;

  try {
    // Validate file
    const validation = validateImageFile(image);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    onProgress?.(0, 'Starting upscale process...');

    // Prepare image
    const imageUrl = await prepareImage(image, onProgress);

    // Get model config
    const modelConfig = MODEL_CONFIGS[settings.model];
    onProgress?.(40, `Initializing ${modelConfig.name}...`);

    // Build input based on model
    const input = buildModelInput(imageUrl, settings);

    // Create prediction
    onProgress?.(50, 'Sending to AI processing...');
    const prediction = await createPrediction({
      version: modelConfig.version,
      input,
    });

    console.log('Upscale prediction created:', prediction.id);

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
    onProgress?.(95, 'Downloading enhanced image...');
    const resultUrl = await downloadResult(outputUrl);

    onProgress?.(100, 'Upscale complete!');
    return resultUrl;
  } catch (error) {
    console.error('Upscale error:', error);
    throw error;
  }
}

/**
 * Get model info
 */
export function getModelInfo(model: UpscaleModel) {
  return MODEL_CONFIGS[model];
}

/**
 * Get all available models
 */
export function getAvailableModels() {
  return Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
    id: key as UpscaleModel,
    ...config,
  }));
}
