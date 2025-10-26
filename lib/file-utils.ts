/**
 * File Utilities for Image Processing
 * File conversion and manipulation helpers
 */

/**
 * Convert File to Data URL
 */
export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Convert Data URL to Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return response.blob();
}

/**
 * Convert Blob to File
 */
export async function blobToFile(
  blob: Blob,
  filename: string,
  type?: string
): Promise<File> {
  return new File([blob], filename, {
    type: type || blob.type,
    lastModified: Date.now(),
  });
}

/**
 * Download blob as file
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Convert canvas to Blob
 */
export async function canvasToBlob(
  canvas: HTMLCanvasElement,
  type = 'image/png',
  quality = 1.0
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to convert canvas to blob'));
        }
      },
      type,
      quality
    );
  });
}

/**
 * Convert canvas to File
 */
export async function canvasToFile(
  canvas: HTMLCanvasElement,
  filename: string,
  type = 'image/png',
  quality = 1.0
): Promise<File> {
  const blob = await canvasToBlob(canvas, type, quality);
  return blobToFile(blob, filename, type);
}
