/**
 * File Limits and Constraints
 * Standard limits across all image processing tools
 */

export const FILE_LIMITS = {
  // Maximum file sizes
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB absolute max
  MAX_DATA_URL_SIZE: 4 * 1024 * 1024, // 4MB for direct data URL

  // Compression thresholds
  COMPRESS_THRESHOLD: 2 * 1024 * 1024, // Compress files > 2MB

  // Dimension limits
  MAX_DIMENSION: 8192, // 8K max dimension
  COMPRESS_MAX_DIMENSION: 2048, // Max after compression

  // Supported formats
  SUPPORTED_IMAGE_TYPES: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ] as const,

  // Accepted MIME types for file input
  ACCEPT_IMAGE_TYPES: 'image/jpeg,image/jpg,image/png,image/webp',

  // Compression settings
  COMPRESSION: {
    quality: 0.85, // JPEG quality
    maxDimension: 2048, // Max dimension after compression
    aggressive: {
      quality: 0.7,
      maxDimension: 1500,
    },
  },

  // API polling
  POLLING: {
    maxRetries: 120, // 120 retries
    interval: 3000, // 3 seconds
    initialInterval: 1000, // 1 second initial
    backoffFactor: 1.5, // Increase by 1.5x
    maxInterval: 10000, // Cap at 10 seconds
  },
} as const;

// Error codes for consistent error handling
export const ERROR_CODES = {
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  INVALID_FILE_TYPE: 'INVALID_FILE_TYPE',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  API_ERROR: 'API_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// Validation helpers
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (!FILE_LIMITS.SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please use JPG, PNG, or WEBP',
    };
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function shouldCompressFile(file: File): boolean {
  return file.size > FILE_LIMITS.COMPRESS_THRESHOLD;
}
