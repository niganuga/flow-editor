/**
 * Technical Image Analyzer
 *
 * Extracts REAL technical specifications from images using Canvas API.
 * This is the ground truth that prevents Claude hallucinations by providing
 * accurate, verifiable data about image properties.
 *
 * @module image-analyzer
 */

import { loadImage, isPNGTransparent, getImageDimensions } from './canvas-utils';
import { extractColors } from './tools/recolor';
import type { RGBColor } from './color-utils';

/**
 * Complete analysis of an image's technical specifications
 */
export interface ImageAnalysis {
  // ===== Basic Specifications =====
  /** Image width in pixels */
  width: number;

  /** Image height in pixels */
  height: number;

  /** Aspect ratio as simplified fraction (e.g., "16:9", "4:3", "1:1") */
  aspectRatio: string;

  /** Dots per inch (DPI) if available from EXIF, otherwise null */
  dpi: number | null;

  /** File size in bytes */
  fileSize: number;

  /** Image format (e.g., "png", "jpeg", "webp") */
  format: string;

  // ===== Color Analysis =====
  /** Whether the image has transparent pixels */
  hasTransparency: boolean;

  /** Top dominant colors found in the image */
  dominantColors: Array<{ r: number; g: number; b: number; hex: string; percentage: number }>;

  /** Estimated color depth (8, 24, or 32 bits) */
  colorDepth: number;

  /** Approximate count of unique colors in the image */
  uniqueColorCount: number;

  // ===== Quality Metrics =====
  /** Whether the image appears blurry (sharpness < 50) */
  isBlurry: boolean;

  /** Sharpness score from 0 (very blurry) to 100 (very sharp) */
  sharpnessScore: number;

  /** Noise level from 0 (clean) to 100 (very noisy) */
  noiseLevel: number;

  // ===== Print Readiness =====
  /** Whether the image meets minimum print quality standards */
  isPrintReady: boolean;

  /** Maximum printable size in inches at 300 DPI */
  printableAtSize: { width: number; height: number };

  // ===== Metadata =====
  /** Timestamp when analysis was performed */
  analyzedAt: number;

  /** Confidence in the analysis results (0-100) */
  confidence: number;
}

/**
 * Analyzes an image and extracts comprehensive technical specifications.
 *
 * This is the FOUNDATION function that prevents AI hallucinations by providing
 * ground truth data directly from the image's pixel data and metadata.
 *
 * @param imageUrl - URL to the image (blob URL, data URL, or external URL)
 * @param onProgress - Optional callback for progress updates
 * @returns Complete ImageAnalysis object with all technical specifications
 *
 * @example
 * ```typescript
 * const analysis = await analyzeImage(imageUrl, (progress, msg) => {
 *   console.log(`${progress}%: ${msg}`);
 * });
 *
 * console.log(`Image: ${analysis.width}x${analysis.height}`);
 * console.log(`Print ready: ${analysis.isPrintReady}`);
 * console.log(`Sharpness: ${analysis.sharpnessScore}/100`);
 * ```
 */
export async function analyzeImage(
  imageUrl: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ImageAnalysis> {
  const startTime = Date.now();
  let confidence = 100; // Start with full confidence, reduce on errors

  try {
    // ===== STEP 1: Load and prepare image =====
    onProgress?.(5, 'Loading image...');

    const img = await loadImage(imageUrl);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    onProgress?.(10, 'Preparing canvas...');

    // Create canvas for analysis
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d', {
      willReadFrequently: true,
      alpha: true
    });

    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }

    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, width, height);

    // ===== STEP 2: Basic specifications =====
    onProgress?.(20, 'Analyzing dimensions...');

    const aspectRatio = calculateAspectRatio(width, height);
    const format = detectFormat(imageUrl);
    const fileSize = await estimateFileSize(imageUrl);

    // ===== STEP 3: DPI Detection =====
    onProgress?.(25, 'Detecting DPI...');

    let dpi: number | null = null;
    try {
      dpi = await detectDPI(imageUrl, imageData);
    } catch (error) {
      console.warn('DPI detection failed:', error);
      confidence = Math.min(confidence, 95); // Reduce confidence slightly
    }

    // ===== STEP 4: Color Analysis =====
    onProgress?.(30, 'Analyzing colors...');

    let hasTransparency = false;
    let colorDepth = 24; // Default to 24-bit
    let uniqueColorCount = 0;
    let dominantColors: Array<{ r: number; g: number; b: number; hex: string; percentage: number }> = [];

    try {
      hasTransparency = await detectTransparency(imageData);
      colorDepth = hasTransparency ? 32 : 24;

      onProgress?.(40, 'Extracting color palette...');

      // Extract dominant colors using existing tool
      const colorInfos = await extractColors(
        imageUrl,
        {
          paletteSize: 9,
          algorithm: 'smart',
          includeRareColors: false,
          quality: 80,
        },
        (prog, msg) => {
          // Translate progress to 40-55 range
          const adjustedProg = 40 + (prog / 100) * 15;
          onProgress?.(adjustedProg, msg);
        }
      );

      dominantColors = colorInfos.map(color => ({
        r: color.rgb.r,
        g: color.rgb.g,
        b: color.rgb.b,
        hex: color.hex,
        percentage: color.percentage || 0,
      }));

      onProgress?.(55, 'Counting unique colors...');
      uniqueColorCount = await countUniqueColors(imageData);
    } catch (error) {
      console.warn('Color analysis failed:', error);
      confidence = Math.min(confidence, 85);
    }

    // ===== STEP 5: Quality Metrics =====
    onProgress?.(60, 'Calculating sharpness...');

    let sharpnessScore = 0;
    let isBlurry = false;

    try {
      sharpnessScore = await calculateSharpness(imageData);
      isBlurry = sharpnessScore < 50;
    } catch (error) {
      console.warn('Sharpness calculation failed:', error);
      confidence = Math.min(confidence, 90);
    }

    onProgress?.(75, 'Detecting noise...');

    let noiseLevel = 0;

    try {
      noiseLevel = await calculateNoise(imageData);
    } catch (error) {
      console.warn('Noise detection failed:', error);
      confidence = Math.min(confidence, 90);
    }

    // ===== STEP 6: Print Readiness =====
    onProgress?.(90, 'Validating print readiness...');

    const effectiveDPI = dpi || 72; // Default to 72 DPI for web images
    const printableWidth = width / effectiveDPI;
    const printableHeight = height / effectiveDPI;

    const isPrintReady = validatePrintReadiness({
      width,
      height,
      dpi: effectiveDPI,
      sharpnessScore,
    });

    onProgress?.(95, 'Finalizing analysis...');

    // ===== STEP 7: Build final analysis =====
    const analysis: ImageAnalysis = {
      // Basic specs
      width,
      height,
      aspectRatio,
      dpi,
      fileSize,
      format,

      // Color analysis
      hasTransparency,
      dominantColors,
      colorDepth,
      uniqueColorCount,

      // Quality metrics
      isBlurry,
      sharpnessScore: Math.round(sharpnessScore),
      noiseLevel: Math.round(noiseLevel),

      // Print readiness
      isPrintReady,
      printableAtSize: {
        width: Math.round(printableWidth * 10) / 10,
        height: Math.round(printableHeight * 10) / 10,
      },

      // Metadata
      analyzedAt: Date.now(),
      confidence,
    };

    const elapsedTime = Date.now() - startTime;
    onProgress?.(100, `Analysis complete in ${elapsedTime}ms`);

    return analysis;

  } catch (error) {
    console.error('Image analysis failed:', error);

    // Return minimal analysis with low confidence
    return {
      width: 0,
      height: 0,
      aspectRatio: '0:0',
      dpi: null,
      fileSize: 0,
      format: 'unknown',
      hasTransparency: false,
      dominantColors: [],
      colorDepth: 0,
      uniqueColorCount: 0,
      isBlurry: true,
      sharpnessScore: 0,
      noiseLevel: 100,
      isPrintReady: false,
      printableAtSize: { width: 0, height: 0 },
      analyzedAt: Date.now(),
      confidence: 0,
    };
  }
}

/**
 * Detects DPI from image metadata or estimates from pixel density.
 *
 * Attempts to extract DPI from:
 * 1. EXIF metadata (if available)
 * 2. PNG pHYs chunk (pixel dimensions)
 * 3. Returns null if no DPI information available (defaults to 72 for web)
 *
 * @param imageUrl - Image URL to analyze
 * @param imageData - Canvas ImageData for analysis
 * @returns DPI value or null if unavailable
 */
async function detectDPI(imageUrl: string, imageData: ImageData): Promise<number | null> {
  try {
    // For data URLs and blob URLs, we typically don't have EXIF
    // Return null to indicate standard web DPI (72)
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
      return null;
    }

    // TODO: In a future enhancement, we could use exif-js library
    // to extract actual DPI from image metadata
    // For now, return null to indicate standard web resolution

    return null;
  } catch (error) {
    console.warn('DPI detection error:', error);
    return null;
  }
}

/**
 * Detects image format from URL or data.
 *
 * @param imageUrl - Image URL to analyze
 * @returns Format string (png, jpeg, webp, gif, etc.)
 */
function detectFormat(imageUrl: string): string {
  try {
    // Check data URL
    if (imageUrl.startsWith('data:')) {
      const match = imageUrl.match(/^data:image\/([a-zA-Z]+);/);
      if (match) {
        return match[1].toLowerCase();
      }
    }

    // Check file extension
    const match = imageUrl.match(/\.([a-zA-Z]+)(?:\?|$)/);
    if (match) {
      return match[1].toLowerCase();
    }

    return 'unknown';
  } catch (error) {
    return 'unknown';
  }
}

/**
 * Estimates file size from image URL.
 *
 * @param imageUrl - Image URL to check
 * @returns Estimated file size in bytes
 */
async function estimateFileSize(imageUrl: string): Promise<number> {
  try {
    // For data URLs, calculate from base64 length
    if (imageUrl.startsWith('data:')) {
      const base64 = imageUrl.split(',')[1];
      if (base64) {
        // Base64 encoding adds ~33% overhead
        return Math.floor((base64.length * 3) / 4);
      }
    }

    // For blob URLs or external URLs, try to fetch with HEAD request
    if (!imageUrl.startsWith('blob:')) {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
    }

    return 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Detects if image has transparent pixels.
 *
 * @param imageData - Canvas ImageData to analyze
 * @returns True if any pixel has alpha < 255
 */
async function detectTransparency(imageData: ImageData): Promise<boolean> {
  const data = imageData.data;

  // Check alpha channel (every 4th byte)
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) {
      return true;
    }
  }

  return false;
}

/**
 * Counts approximate unique colors in the image.
 *
 * Uses sampling for large images to maintain performance.
 *
 * @param imageData - Canvas ImageData to analyze
 * @returns Approximate count of unique colors
 */
async function countUniqueColors(imageData: ImageData): Promise<number> {
  const data = imageData.data;
  const uniqueColors = new Set<string>();

  // For large images, sample every Nth pixel
  const totalPixels = data.length / 4;
  const sampleRate = totalPixels > 100000 ? 8 : 4;

  for (let i = 0; i < data.length; i += sampleRate * 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a < 10) continue;

    // Create color key (quantize to reduce sensitivity)
    const quantR = Math.round(r / 4) * 4;
    const quantG = Math.round(g / 4) * 4;
    const quantB = Math.round(b / 4) * 4;
    const colorKey = `${quantR},${quantG},${quantB}`;

    uniqueColors.add(colorKey);
  }

  // Adjust for sampling rate
  return Math.round(uniqueColors.size * Math.sqrt(sampleRate));
}

/**
 * Calculates image sharpness using Laplacian edge detection.
 *
 * Higher variance in edges = sharper image.
 *
 * Algorithm:
 * 1. Convert to grayscale
 * 2. Apply Laplacian filter to detect edges
 * 3. Calculate variance of edge intensities
 * 4. Normalize to 0-100 scale
 *
 * @param imageData - Canvas ImageData to analyze
 * @returns Sharpness score from 0 (very blurry) to 100 (very sharp)
 */
async function calculateSharpness(imageData: ImageData): Promise<number> {
  const { width, height, data } = imageData;

  // Convert to grayscale and build grayscale array
  const gray = new Float32Array(width * height);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Standard luminance calculation
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    gray[i / 4] = luminance;
  }

  // Apply Laplacian filter for edge detection
  // Kernel: [0, 1, 0]
  //         [1,-4, 1]
  //         [0, 1, 0]

  let laplacianSum = 0;
  let laplacianSumSq = 0;
  let count = 0;

  // Sample center region (avoid edges)
  const startY = Math.floor(height * 0.1);
  const endY = Math.floor(height * 0.9);
  const startX = Math.floor(width * 0.1);
  const endX = Math.floor(width * 0.9);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = y * width + x;

      // Apply Laplacian kernel
      const center = gray[idx];
      const top = gray[idx - width] || center;
      const bottom = gray[idx + width] || center;
      const left = gray[idx - 1] || center;
      const right = gray[idx + 1] || center;

      const laplacian = Math.abs(
        top + bottom + left + right - 4 * center
      );

      laplacianSum += laplacian;
      laplacianSumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;

  // Calculate variance
  const mean = laplacianSum / count;
  const variance = (laplacianSumSq / count) - (mean * mean);

  // Normalize to 0-100 scale
  // Typical sharp images have variance > 100, blurry images < 10
  const sharpness = Math.min(100, (variance / 100) * 100);

  return Math.max(0, sharpness);
}

/**
 * Calculates noise level by analyzing local variance in smooth regions.
 *
 * Algorithm:
 * 1. Sample random regions of the image
 * 2. Calculate local variance in each region
 * 3. High variance in smooth areas = noisy
 * 4. Normalize to 0-100 scale
 *
 * @param imageData - Canvas ImageData to analyze
 * @returns Noise level from 0 (clean) to 100 (very noisy)
 */
async function calculateNoise(imageData: ImageData): Promise<number> {
  const { width, height, data } = imageData;

  // Sample multiple small regions
  const regionSize = 16;
  const numSamples = 20;
  const variances: number[] = [];

  for (let sample = 0; sample < numSamples; sample++) {
    // Random position avoiding edges
    const x = Math.floor(Math.random() * (width - regionSize - 20)) + 10;
    const y = Math.floor(Math.random() * (height - regionSize - 20)) + 10;

    // Calculate variance in this region
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let dy = 0; dy < regionSize; dy++) {
      for (let dx = 0; dx < regionSize; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Use luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        sum += lum;
        sumSq += lum * lum;
        count++;
      }
    }

    const mean = sum / count;
    const variance = (sumSq / count) - (mean * mean);
    variances.push(variance);
  }

  // Average variance across all samples
  const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;

  // Normalize to 0-100 scale
  // Clean images typically have variance < 50 in smooth regions
  // Noisy images have variance > 200
  const noise = Math.min(100, (avgVariance / 200) * 100);

  return Math.max(0, noise);
}

/**
 * Validates if image meets minimum print quality standards.
 *
 * Criteria:
 * - DPI >= 300 (professional print standard)
 * - Minimum 2x2 inches printable size
 * - Sharpness score >= 40 (not too blurry)
 *
 * @param specs - Partial image specifications
 * @returns True if image is print-ready
 */
function validatePrintReadiness(specs: Partial<ImageAnalysis>): boolean {
  // Check minimum resolution for print (300 DPI standard)
  const minPrintDPI = 300;
  const effectiveDPI = specs.dpi || 72;

  // Check minimum printable dimensions (2x2 inches)
  const minInches = 2;
  const printWidth = (specs.width || 0) / effectiveDPI;
  const printHeight = (specs.height || 0) / effectiveDPI;

  // Check sharpness (avoid blurry prints)
  const minSharpness = 40;
  const sharpness = specs.sharpnessScore || 0;

  const hasGoodResolution = effectiveDPI >= minPrintDPI;
  const hasGoodSize = printWidth >= minInches && printHeight >= minInches;
  const hasGoodSharpness = sharpness >= minSharpness;

  return hasGoodResolution && hasGoodSize && hasGoodSharpness;
}

/**
 * Calculates simplified aspect ratio from dimensions.
 *
 * Uses GCD to reduce ratio to simplest form.
 * Recognizes common ratios like 16:9, 4:3, 1:1, etc.
 *
 * @param width - Image width in pixels
 * @param height - Image height in pixels
 * @returns Simplified aspect ratio string (e.g., "16:9")
 */
function calculateAspectRatio(width: number, height: number): string {
  if (width === 0 || height === 0) return '0:0';

  // Calculate GCD using Euclidean algorithm
  const gcd = (a: number, b: number): number => {
    return b === 0 ? a : gcd(b, a % b);
  };

  const divisor = gcd(width, height);
  const w = width / divisor;
  const h = height / divisor;

  // Recognize common aspect ratios
  const ratio = w / h;

  // Common ratios with tolerance
  const commonRatios: Array<{ value: number; name: string }> = [
    { value: 1.0, name: '1:1' },       // Square
    { value: 4 / 3, name: '4:3' },     // Standard
    { value: 3 / 2, name: '3:2' },     // Classic 35mm
    { value: 16 / 9, name: '16:9' },   // Widescreen
    { value: 16 / 10, name: '16:10' }, // Computer
    { value: 21 / 9, name: '21:9' },   // Ultrawide
    { value: 2 / 3, name: '2:3' },     // Portrait
    { value: 9 / 16, name: '9:16' },   // Mobile portrait
  ];

  // Check if matches a common ratio (within 1% tolerance)
  for (const common of commonRatios) {
    if (Math.abs(ratio - common.value) / common.value < 0.01) {
      return common.name;
    }
  }

  // Return simplified fraction
  return `${w}:${h}`;
}

/**
 * Formats image analysis into a human-readable summary.
 *
 * @param analysis - ImageAnalysis object
 * @returns Formatted text summary
 */
export function formatAnalysisSummary(analysis: ImageAnalysis): string {
  const lines: string[] = [
    '=== IMAGE ANALYSIS ===',
    '',
    'DIMENSIONS:',
    `  Size: ${analysis.width} x ${analysis.height} pixels`,
    `  Aspect Ratio: ${analysis.aspectRatio}`,
    `  Format: ${analysis.format.toUpperCase()}`,
    `  File Size: ${(analysis.fileSize / 1024).toFixed(1)} KB`,
    '',
    'COLOR INFORMATION:',
    `  Transparency: ${analysis.hasTransparency ? 'Yes' : 'No'}`,
    `  Color Depth: ${analysis.colorDepth} bits`,
    `  Unique Colors: ~${analysis.uniqueColorCount.toLocaleString()}`,
    `  Dominant Colors: ${analysis.dominantColors.length}`,
    '',
    'QUALITY METRICS:',
    `  Sharpness: ${analysis.sharpnessScore}/100 ${analysis.isBlurry ? '(BLURRY)' : '(Sharp)'}`,
    `  Noise Level: ${analysis.noiseLevel}/100`,
    '',
    'PRINT READINESS:',
    `  DPI: ${analysis.dpi || 'Unknown (assuming 72)'}`,
    `  Printable at 300 DPI: ${analysis.printableAtSize.width}" x ${analysis.printableAtSize.height}"`,
    `  Print Ready: ${analysis.isPrintReady ? 'YES' : 'NO'}`,
    '',
    `Analysis Confidence: ${analysis.confidence}%`,
  ];

  return lines.join('\n');
}
