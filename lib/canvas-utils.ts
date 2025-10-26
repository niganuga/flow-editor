/**
 * Canvas Utilities for Image Processing
 * High-quality canvas operations with best practices
 */

// Server-side canvas support
let Canvas: any, Image: any;
if (typeof window === 'undefined') {
  // Server-side: use node-canvas
  try {
    const nodeCanvas = require('canvas');
    Canvas = nodeCanvas.Canvas;
    Image = nodeCanvas.Image;
  } catch (e) {
    console.warn('[canvas-utils] canvas package not installed for server-side rendering');
  }
} else {
  // Client-side: use browser APIs
  Canvas = HTMLCanvasElement;
  Image = window.Image;
}

export interface CanvasContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

/**
 * Create canvas element (works on both client and server)
 */
export function createCanvas(width: number, height: number): any {
  if (typeof window === 'undefined') {
    // Server-side
    if (!Canvas) {
      throw new Error('canvas package not available for server-side canvas creation');
    }
    return new Canvas(width, height);
  } else {
    // Client-side
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
}

/**
 * Create a high-quality canvas with DPR scaling (client-side only)
 */
export function createHighQualityCanvas(
  width: number,
  height: number
): CanvasContext {
  if (typeof window === 'undefined') {
    // Server-side: no DPR scaling
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d', { alpha: true })!;
    ctx.imageSmoothingEnabled = true;
    return { canvas, ctx };
  }

  const canvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;

  const ctx = canvas.getContext('2d', { alpha: true, willReadFrequently: true })!;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  return { canvas, ctx };
}

/**
 * Check if a PNG has transparent pixels
 */
export async function isPNGTransparent(file: File): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      // Check alpha channel (every 4th byte)
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          URL.revokeObjectURL(img.src);
          resolve(true);
          return;
        }
      }

      URL.revokeObjectURL(img.src);
      resolve(false);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Convert RGBA image to RGB (removes alpha channel)
 */
export async function convertToRGB(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: false });

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Fill with white background first (for transparent areas)
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }

        const newFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), {
          type: 'image/jpeg',
          lastModified: file.lastModified,
        });

        URL.revokeObjectURL(img.src);
        resolve(newFile);
      }, 'image/jpeg', 0.95);
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Add white background to transparent images
 */
export async function addWhiteBackgroundToImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      canvas.width = img.width;
      canvas.height = img.height;

      // Fill with white background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to convert canvas to blob'));
          return;
        }

        const newFile = new File([blob], file.name, {
          type: 'image/png',
          lastModified: file.lastModified,
        });

        URL.revokeObjectURL(img.src);
        resolve(newFile);
      }, 'image/png');
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Compress image for API submission
 */
export async function compressImage(
  file: File,
  maxSizeMB = 2,
  maxDimension = 1500,
  quality = 0.8
): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { alpha: true });

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      // Calculate dimensions maintaining aspect ratio
      let { width, height } = img;
      if (width > height && width > maxDimension) {
        height = Math.floor((height * maxDimension) / width);
        width = maxDimension;
      } else if (height > maxDimension) {
        width = Math.floor((width * maxDimension) / height);
        height = maxDimension;
      }

      canvas.width = width;
      canvas.height = height;

      // For PNGs, fill with white background
      if (file.type === 'image/png') {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, width, height);
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG for RGB consistency
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to compress image'));
            return;
          }

          const newFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });

          URL.revokeObjectURL(img.src);
          resolve(newFile);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for compression'));
    };

    img.src = URL.createObjectURL(file);
  });
}

/**
 * Load image from URL (works on both client and server)
 */
export async function loadImage(url: string): Promise<any> {
  if (typeof window === 'undefined') {
    // Server-side: use node-canvas
    if (!Image) {
      throw new Error('canvas package not available for server-side image loading');
    }

    return new Promise(async (resolve, reject) => {
      try {
        const img = new Image();

        // For server-side, we need to load the image from URL/data
        if (url.startsWith('data:')) {
          // Data URL
          const base64Data = url.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          img.src = buffer;
          resolve(img);
        } else if (url.startsWith('http://') || url.startsWith('https://')) {
          // HTTP URL - fetch and load
          const https = require('https');
          const http = require('http');
          const client = url.startsWith('https://') ? https : http;

          client.get(url, (res: any) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk: Buffer) => chunks.push(chunk));
            res.on('end', () => {
              const buffer = Buffer.concat(chunks);
              img.src = buffer;
              resolve(img);
            });
          }).on('error', reject);
        } else {
          reject(new Error(`Unsupported URL format for server-side: ${url.substring(0, 50)}`));
        }
      } catch (error) {
        reject(error);
      }
    });
  } else {
    // Client-side: use browser Image API
    return new Promise((resolve, reject) => {
      const img = new Image();
      // Only set crossOrigin for external URLs, not data URLs or blob URLs
      if (!url.startsWith('data:') && !url.startsWith('blob:')) {
        img.crossOrigin = "anonymous";
      }
      img.onload = () => resolve(img);
      img.onerror = (error) => {
        console.error('Image load error for URL:', url, error);
        reject(new Error(`Failed to load image from ${url.substring(0, 50)}...`));
      };
      img.src = url;
    });
  }
}

/**
 * Apply edge feathering (Gaussian blur approximation)
 */
export function applyFeather(canvas: HTMLCanvasElement, radius: number): void {
  if (radius === 0) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const tempCanvas = document.createElement('canvas');
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) return;

  tempCanvas.width = canvas.width;
  tempCanvas.height = canvas.height;

  // Copy current canvas
  tempCtx.drawImage(canvas, 0, 0);

  // Apply blur in multiple passes for better quality
  const passes = 3;
  for (let i = 0; i < passes; i++) {
    ctx.filter = `blur(${radius / passes}px)`;
    ctx.drawImage(tempCanvas, 0, 0);
    tempCtx.drawImage(canvas, 0, 0);
  }

  ctx.filter = 'none';
}

/**
 * Get image dimensions from URL
 */
export async function getImageDimensions(
  imageUrl: string
): Promise<{ width: number; height: number }> {
  const img = await loadImage(imageUrl);
  return {
    width: img.naturalWidth || img.width,
    height: img.naturalHeight || img.height,
  };
}

/**
 * Create modern canvas with OffscreenCanvas if available (2025 API)
 * @param width - Canvas width
 * @param height - Canvas height
 * @returns Canvas instance (OffscreenCanvas or HTMLCanvasElement)
 */
export function createModernCanvas(width: number, height: number): any {
  // Only use OffscreenCanvas in browser context
  if (typeof window !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
    console.log('[Canvas] Using OffscreenCanvas (2025 API) for better performance');
    return new OffscreenCanvas(width, height);
  }

  // Fallback to createCanvas which handles both client and server
  return createCanvas(width, height);
}

/**
 * Get high-precision image data (2025 API)
 * @param ctx - Canvas 2D rendering context
 * @param x - X coordinate
 * @param y - Y coordinate
 * @param w - Width
 * @param h - Height
 * @returns ImageData with highest available precision
 */
export function getHighPrecisionImageData(
  ctx: CanvasRenderingContext2D | any,
  x: number,
  y: number,
  w: number,
  h: number
): ImageData {
  // Only try advanced options in browser context
  if (typeof window !== 'undefined') {
    try {
      // Try newer wide gamut color space for better accuracy
      const options = {
        colorSpace: 'display-p3' as PredefinedColorSpace,
        storageFormat: 'float16' // Higher precision if available
      };

      // TypeScript doesn't know about these new options yet
      return (ctx as any).getImageData(x, y, w, h, options);
    } catch (e) {
      // Fallback to standard format
    }
  }

  // Standard getImageData
  return ctx.getImageData(x, y, w, h);
}

/**
 * Create image bitmap with options (2025 API) - Browser only
 * @param source - Image source (blob, image element, etc.)
 * @param options - Image bitmap options
 * @returns Promise resolving to ImageBitmap
 */
export async function createHighQualityBitmap(
  source: ImageBitmapSource,
  options?: {
    resizeWidth?: number;
    resizeHeight?: number;
    resizeQuality?: 'pixelated' | 'low' | 'medium' | 'high';
  }
): Promise<ImageBitmap> {
  if (typeof window === 'undefined') {
    throw new Error('createImageBitmap is only available in browser context');
  }

  const bitmapOptions: ImageBitmapOptions = {
    premultiplyAlpha: 'none',
    colorSpaceConversion: 'none',
    resizeQuality: options?.resizeQuality || 'high'
  };

  if (options?.resizeWidth) bitmapOptions.resizeWidth = options.resizeWidth;
  if (options?.resizeHeight) bitmapOptions.resizeHeight = options.resizeHeight;

  return createImageBitmap(source, bitmapOptions);
}
