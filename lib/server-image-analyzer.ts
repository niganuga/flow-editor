/**
 * Server-Side Image Analyzer - October 2025 Best Practices
 *
 * Uses modern stack for production-ready server-side image analysis:
 * - sharp: Fast metadata extraction (dimensions, format, DPI)
 * - @napi-rs/canvas: Native Canvas API for pixel-level analysis
 *
 * Works in:
 * - Node.js development
 * - Vercel serverless functions
 * - Docker containers
 * - All major deployment platforms
 *
 * @module server-image-analyzer
 */

import sharp from 'sharp';
import { createCanvas, loadImage, Image } from '@napi-rs/canvas';
import type { ImageAnalysis } from './image-analyzer';

/**
 * Analyzes image server-side using sharp + @napi-rs/canvas.
 *
 * This is the October 2025 recommended approach for server-side image analysis.
 *
 * @param imageUrl - URL or Buffer containing image data
 * @param onProgress - Optional progress callback
 * @returns Complete ImageAnalysis with all metrics
 *
 * @example
 * ```typescript
 * // From URL
 * const analysis = await analyzeImageServerSide(imageUrl);
 *
 * // From Buffer
 * const buffer = await fetch(imageUrl).then(r => r.arrayBuffer());
 * const analysis = await analyzeImageServerSide(Buffer.from(buffer));
 * ```
 */
export async function analyzeImageServerSide(
  imageInput: string | Buffer,
  onProgress?: (progress: number, message: string) => void
): Promise<ImageAnalysis> {
  const startTime = Date.now();
  let confidence = 100;

  try {
    // ===== STEP 1: Load image data =====
    onProgress?.(5, 'Loading image data...');

    let imageBuffer: Buffer;

    if (typeof imageInput === 'string') {
      // URL - fetch it
      if (imageInput.startsWith('http://') || imageInput.startsWith('https://')) {
        const response = await fetch(imageInput);
        const arrayBuffer = await response.arrayBuffer();
        imageBuffer = Buffer.from(arrayBuffer);
      } else if (imageInput.startsWith('data:')) {
        // Data URL
        const base64Data = imageInput.split(',')[1];
        imageBuffer = Buffer.from(base64Data, 'base64');
      } else {
        throw new Error('Unsupported URL format (must be http://, https://, or data:)');
      }
    } else {
      imageBuffer = imageInput;
    }

    // ===== STEP 2: Extract metadata with sharp =====
    onProgress?.(15, 'Extracting image metadata...');

    const sharpImage = sharp(imageBuffer);
    const metadata = await sharpImage.metadata();

    const width = metadata.width || 0;
    const height = metadata.height || 0;
    const format = metadata.format || 'unknown';
    const fileSize = imageBuffer.length;

    // DPI extraction (if available in EXIF)
    const dpi = metadata.density || null;

    // Check for alpha channel (transparency)
    const hasAlpha = metadata.hasAlpha || false;

    onProgress?.(30, 'Metadata extracted successfully');

    // ===== STEP 3: Create canvas for pixel-level analysis =====
    onProgress?.(35, 'Preparing canvas for pixel analysis...');

    // Convert image to RGBA buffer for canvas
    const rgbaBuffer = await sharpImage
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Create canvas and load image
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Create ImageData from buffer
    const imageData = ctx.createImageData(width, height);
    imageData.data.set(rgbaBuffer.data);
    ctx.putImageData(imageData, 0, 0);

    // ===== STEP 4: Detect transparency precisely =====
    onProgress?.(45, 'Analyzing transparency...');

    const hasTransparency = await detectTransparencyFromImageData(imageData);

    onProgress?.(55, 'Extracting dominant colors...');

    // ===== STEP 5: Extract dominant colors =====
    const dominantColors = await extractDominantColors(imageData, 9);

    onProgress?.(65, 'Counting unique colors...');

    // ===== STEP 6: Count unique colors =====
    const uniqueColorCount = await countUniqueColors(imageData);

    onProgress?.(75, 'Calculating image sharpness...');

    // ===== STEP 7: Calculate sharpness =====
    const sharpnessScore = await calculateSharpness(imageData, width, height);
    const isBlurry = sharpnessScore < 50;

    onProgress?.(85, 'Detecting noise levels...');

    // ===== STEP 8: Calculate noise =====
    const noiseLevel = await calculateNoise(imageData, width, height);

    onProgress?.(90, 'Calculating print readiness...');

    // ===== STEP 9: Calculate print readiness =====
    const effectiveDPI = dpi || 72;
    const printWidth = width / effectiveDPI;
    const printHeight = height / effectiveDPI;

    const printWidth300 = width / 300;
    const printHeight300 = height / 300;

    const isPrintReady =
      effectiveDPI >= 300 &&
      printWidth300 >= 2 &&
      printHeight300 >= 2 &&
      sharpnessScore >= 40;

    // ===== STEP 10: Calculate aspect ratio =====
    const aspectRatio = calculateAspectRatio(width, height);

    // ===== STEP 11: Build final analysis =====
    onProgress?.(95, 'Finalizing analysis...');

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
      colorDepth: hasAlpha ? 32 : 24,
      uniqueColorCount,

      // Quality metrics
      isBlurry,
      sharpnessScore: Math.round(sharpnessScore),
      noiseLevel: Math.round(noiseLevel),

      // Print readiness
      isPrintReady,
      printableAtSize: {
        width: Math.round(printWidth300 * 10) / 10,
        height: Math.round(printHeight300 * 10) / 10,
      },

      // Metadata
      analyzedAt: Date.now(),
      confidence,
    };

    const elapsedTime = Date.now() - startTime;
    onProgress?.(100, `Server-side analysis complete in ${elapsedTime}ms`);

    console.log('[ServerImageAnalyzer] Analysis complete:', {
      dimensions: `${width}x${height}`,
      transparency: hasTransparency,
      dpi: dpi || 72,
      colors: dominantColors.length,
      sharpness: sharpnessScore,
      printReady: isPrintReady,
      timeMs: elapsedTime,
    });

    return analysis;
  } catch (error) {
    console.error('[ServerImageAnalyzer] Analysis failed:', error);

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
 * Detects transparency by checking alpha channel.
 *
 * @param imageData - ImageData from canvas
 * @returns True if any pixel has alpha < 255
 */
async function detectTransparencyFromImageData(imageData: ImageData): Promise<boolean> {
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
 * Extracts dominant colors using k-means clustering.
 *
 * @param imageData - ImageData from canvas
 * @param count - Number of colors to extract
 * @returns Array of dominant colors with percentages
 */
async function extractDominantColors(
  imageData: ImageData,
  count: number
): Promise<Array<{ r: number; g: number; b: number; hex: string; percentage: number }>> {
  const data = imageData.data;
  const pixels: Array<[number, number, number]> = [];

  // Sample pixels (every 10th pixel for performance)
  for (let i = 0; i < data.length; i += 40) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Skip fully transparent pixels
    if (a < 10) continue;

    pixels.push([r, g, b]);
  }

  if (pixels.length === 0) {
    return [];
  }

  // Simple k-means clustering
  const clusters = kMeansClustering(pixels, Math.min(count, pixels.length));

  // Convert to hex and calculate percentages
  return clusters.map((cluster) => {
    const r = Math.round(cluster.center[0]);
    const g = Math.round(cluster.center[1]);
    const b = Math.round(cluster.center[2]);
    const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    const percentage = (cluster.size / pixels.length) * 100;

    return { r, g, b, hex, percentage };
  });
}

/**
 * Simple k-means clustering for color extraction.
 */
function kMeansClustering(
  pixels: Array<[number, number, number]>,
  k: number
): Array<{ center: [number, number, number]; size: number }> {
  // Initialize centers randomly
  const centers: Array<[number, number, number]> = [];
  for (let i = 0; i < k; i++) {
    const randomPixel = pixels[Math.floor(Math.random() * pixels.length)];
    centers.push([...randomPixel]);
  }

  // Iterate until convergence (max 10 iterations)
  for (let iter = 0; iter < 10; iter++) {
    const clusters: Array<Array<[number, number, number]>> = Array.from({ length: k }, () => []);

    // Assign pixels to nearest center
    for (const pixel of pixels) {
      let minDist = Infinity;
      let bestCluster = 0;

      for (let i = 0; i < k; i++) {
        const dist = colorDistance(pixel, centers[i]);
        if (dist < minDist) {
          minDist = dist;
          bestCluster = i;
        }
      }

      clusters[bestCluster].push(pixel);
    }

    // Update centers
    for (let i = 0; i < k; i++) {
      if (clusters[i].length > 0) {
        const sum = clusters[i].reduce(
          (acc, pixel) => [acc[0] + pixel[0], acc[1] + pixel[1], acc[2] + pixel[2]],
          [0, 0, 0]
        );
        centers[i] = [
          sum[0] / clusters[i].length,
          sum[1] / clusters[i].length,
          sum[2] / clusters[i].length,
        ];
      }
    }
  }

  // Count cluster sizes
  const clusters: Array<Array<[number, number, number]>> = Array.from({ length: k }, () => []);
  for (const pixel of pixels) {
    let minDist = Infinity;
    let bestCluster = 0;

    for (let i = 0; i < k; i++) {
      const dist = colorDistance(pixel, centers[i]);
      if (dist < minDist) {
        minDist = dist;
        bestCluster = i;
      }
    }

    clusters[bestCluster].push(pixel);
  }

  return centers
    .map((center, i) => ({ center, size: clusters[i].length }))
    .filter((c) => c.size > 0)
    .sort((a, b) => b.size - a.size);
}

/**
 * Calculates color distance (Euclidean).
 */
function colorDistance(a: [number, number, number], b: [number, number, number]): number {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
}

/**
 * Counts unique colors (with quantization).
 */
async function countUniqueColors(imageData: ImageData): Promise<number> {
  const data = imageData.data;
  const uniqueColors = new Set<string>();

  // Sample pixels (every 4th for performance)
  for (let i = 0; i < data.length; i += 16) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    if (a < 10) continue;

    // Quantize to reduce sensitivity
    const quantR = Math.round(r / 4) * 4;
    const quantG = Math.round(g / 4) * 4;
    const quantB = Math.round(b / 4) * 4;

    uniqueColors.add(`${quantR},${quantG},${quantB}`);
  }

  // Adjust for sampling rate
  return Math.round(uniqueColors.size * 2);
}

/**
 * Calculates sharpness using Laplacian edge detection.
 */
async function calculateSharpness(
  imageData: ImageData,
  width: number,
  height: number
): Promise<number> {
  const data = imageData.data;
  const gray = new Float32Array(width * height);

  // Convert to grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    gray[i / 4] = 0.299 * r + 0.587 * g + 0.114 * b;
  }

  // Apply Laplacian
  let sum = 0;
  let sumSq = 0;
  let count = 0;

  const startY = Math.floor(height * 0.1);
  const endY = Math.floor(height * 0.9);
  const startX = Math.floor(width * 0.1);
  const endX = Math.floor(width * 0.9);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const idx = y * width + x;
      const center = gray[idx];
      const top = gray[idx - width] || center;
      const bottom = gray[idx + width] || center;
      const left = gray[idx - 1] || center;
      const right = gray[idx + 1] || center;

      const laplacian = Math.abs(top + bottom + left + right - 4 * center);
      sum += laplacian;
      sumSq += laplacian * laplacian;
      count++;
    }
  }

  if (count === 0) return 0;

  const mean = sum / count;
  const variance = sumSq / count - mean * mean;

  return Math.min(100, (variance / 100) * 100);
}

/**
 * Calculates noise level.
 */
async function calculateNoise(
  imageData: ImageData,
  width: number,
  height: number
): Promise<number> {
  const data = imageData.data;
  const regionSize = 16;
  const numSamples = 20;
  const variances: number[] = [];

  for (let sample = 0; sample < numSamples; sample++) {
    const x = Math.floor(Math.random() * (width - regionSize - 20)) + 10;
    const y = Math.floor(Math.random() * (height - regionSize - 20)) + 10;

    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let dy = 0; dy < regionSize; dy++) {
      for (let dx = 0; dx < regionSize; dx++) {
        const idx = ((y + dy) * width + (x + dx)) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;

        sum += lum;
        sumSq += lum * lum;
        count++;
      }
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;
    variances.push(variance);
  }

  const avgVariance = variances.reduce((a, b) => a + b, 0) / variances.length;
  return Math.min(100, (avgVariance / 200) * 100);
}

/**
 * Calculates aspect ratio.
 */
function calculateAspectRatio(width: number, height: number): string {
  if (width === 0 || height === 0) return '0:0';

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);

  return `${width / divisor}:${height / divisor}`;
}
