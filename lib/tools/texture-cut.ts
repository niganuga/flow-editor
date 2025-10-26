/**
 * Texture Cut Tool
 * Cut textures into images, making parts transparent based on texture darkness
 */

import { applyFeather, loadImage } from '../canvas-utils';
import { canvasToBlob } from '../file-utils';

export interface CutSettings {
  amount: number; // 0-1, cut strength
  featherPx: number; // 0-20px, edge softness
  invert: boolean; // Invert the cut (white cuts instead of black)
}

export interface TransformSettings {
  scale: number; // 0.1-5x
  rotation: number; // 0-360°
  tile: boolean; // Repeat texture
}

export interface TextureCutOptions {
  baseImageUrl: string;
  textureUrl: string;
  cutSettings: CutSettings;
  transformSettings: TransformSettings;
  onProgress?: (progress: number, message: string) => void;
}

/**
 * Cut texture into base image
 * Black areas in texture cut to transparent
 * Black texture over transparency areas stays transparent
 */
export async function textureCut({
  baseImageUrl,
  textureUrl,
  cutSettings,
  transformSettings,
  onProgress,
}: TextureCutOptions): Promise<Blob> {
  onProgress?.(0, 'Loading images...');

  // Load images
  const [baseImage, textureImage] = await Promise.all([
    loadImage(baseImageUrl),
    loadImage(textureUrl),
  ]);

  onProgress?.(20, 'Setting up canvas...');

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = baseImage.width;
  canvas.height = baseImage.height;

  // Draw base image
  ctx.drawImage(baseImage, 0, 0);

  onProgress?.(40, 'Preparing texture...');

  // Calculate transform origin (center of canvas)
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;

  // Get base image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // Create a texture canvas to analyze
  const textureCanvas = document.createElement('canvas');
  const textureCtx = textureCanvas.getContext('2d', { willReadFrequently: true });
  if (!textureCtx) throw new Error('Failed to get texture context');

  textureCanvas.width = canvas.width;
  textureCanvas.height = canvas.height;

  onProgress?.(60, 'Applying transforms...');

  // Draw texture with transforms
  textureCtx.save();
  textureCtx.translate(centerX, centerY);
  textureCtx.rotate((transformSettings.rotation * Math.PI) / 180);
  textureCtx.scale(transformSettings.scale, transformSettings.scale);
  textureCtx.translate(-centerX, -centerY);

  if (transformSettings.tile) {
    const pattern = textureCtx.createPattern(textureImage, 'repeat');
    if (pattern) {
      textureCtx.fillStyle = pattern;
      textureCtx.fillRect(0, 0, textureCanvas.width, textureCanvas.height);
    }
  } else {
    textureCtx.drawImage(textureImage, 0, 0, textureCanvas.width, textureCanvas.height);
  }
  textureCtx.restore();

  const textureData = textureCtx.getImageData(0, 0, textureCanvas.width, textureCanvas.height).data;

  onProgress?.(80, 'Cutting texture...');

  // Cut through to transparency based on texture darkness
  // Black cuts to transparent, white preserves
  for (let i = 0; i < data.length; i += 4) {
    const r = textureData[i];
    const g = textureData[i + 1];
    const b = textureData[i + 2];

    // Calculate luminance (brightness) of texture pixel
    let luminance = (r * 0.299 + g * 0.587 + b * 0.114) / 255;

    // Invert if requested
    if (cutSettings.invert) {
      luminance = 1 - luminance;
    }

    // Apply amount to cut strength
    const cutStrength = 1 - ((1 - luminance) * cutSettings.amount);

    // Only apply to areas where image has content
    // Black texture over transparency stays transparent
    if (data[i + 3] > 0) {
      data[i + 3] = Math.floor(data[i + 3] * cutStrength);
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Apply feathering if needed
  if (cutSettings.featherPx > 0) {
    onProgress?.(90, 'Feathering edges...');
    applyFeather(canvas, cutSettings.featherPx);
  }

  onProgress?.(95, 'Generating result...');
  const blob = await canvasToBlob(canvas, 'image/png', 1.0);

  onProgress?.(100, 'Done!');
  return blob;
}

/**
 * Create a simple pattern/texture programmatically
 */
export function createPatternTexture(
  type: 'dots' | 'lines' | 'grid' | 'noise',
  width: number,
  height: number,
  color: string = '#000000',
  spacing: number = 10
): string {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get canvas context');

  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = 'transparent';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = color;

  switch (type) {
    case 'dots':
      for (let y = 0; y < height; y += spacing) {
        for (let x = 0; x < width; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, spacing / 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;

    case 'lines':
      ctx.lineWidth = 2;
      ctx.strokeStyle = color;
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      break;

    case 'grid':
      ctx.lineWidth = 1;
      ctx.strokeStyle = color;
      for (let y = 0; y < height; y += spacing) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      for (let x = 0; x < width; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      break;

    case 'noise':
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.random() * 255;
        data[i] = gray;
        data[i + 1] = gray;
        data[i + 2] = gray;
        data[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      break;
  }

  return canvas.toDataURL('image/png');
}
