/**
 * Replicate API Client
 * Handles communication with Replicate AI models
 */

import { FILE_LIMITS, ERROR_CODES, type ErrorCode } from '@/lib/constants/file-limits';

export interface ReplicatePrediction {
  id: string;
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled';
  output?: string | string[];
  error?: string;
  logs?: string;
}

export interface CreatePredictionOptions {
  version: string;
  input: Record<string, any>;
}

export interface PollOptions {
  predictionId: string;
  onStatus?: (status: string, prediction: ReplicatePrediction) => void;
  maxRetries?: number;
  initialInterval?: number;
}

/**
 * Create a new prediction on Replicate
 */
export async function createPrediction(
  options: CreatePredictionOptions
): Promise<ReplicatePrediction> {
  const response = await fetch('/api/replicate/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(options),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.error || 'Failed to create prediction';
    } catch {
      if (response.status === 413) {
        throw createReplicateError(
          'Image file is too large for processing',
          ERROR_CODES.FILE_TOO_LARGE
        );
      } else if (response.status === 401) {
        throw createReplicateError(
          'Authentication failed. Please check API configuration.',
          ERROR_CODES.API_ERROR
        );
      } else if (response.status === 429) {
        throw createReplicateError(
          'Rate limit exceeded. Please try again later.',
          ERROR_CODES.API_ERROR
        );
      } else {
        errorMessage = `Server error: ${response.status} ${response.statusText}`;
      }
    }

    throw createReplicateError(errorMessage, ERROR_CODES.API_ERROR);
  }

  return response.json();
}

/**
 * Get prediction status
 */
export async function getPredictionStatus(
  predictionId: string
): Promise<ReplicatePrediction> {
  const statusUrl = `/api/replicate/predictions/${encodeURIComponent(predictionId)}`;
  const response = await fetch(statusUrl, {
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw createReplicateError(
      'Failed to check prediction status',
      ERROR_CODES.API_ERROR
    );
  }

  return response.json();
}

/**
 * Poll prediction until completion with adaptive intervals
 */
export async function pollPrediction(
  options: PollOptions
): Promise<ReplicatePrediction> {
  const {
    predictionId,
    onStatus,
    maxRetries = FILE_LIMITS.POLLING.maxRetries,
    initialInterval = FILE_LIMITS.POLLING.initialInterval,
  } = options;

  let retries = 0;
  let currentInterval = initialInterval;

  while (retries < maxRetries) {
    // Wait before polling
    await new Promise((resolve) => setTimeout(resolve, currentInterval));

    // Increase interval with backoff
    currentInterval = Math.min(
      currentInterval * FILE_LIMITS.POLLING.backoffFactor,
      FILE_LIMITS.POLLING.maxInterval
    );

    try {
      const prediction = await getPredictionStatus(predictionId);

      // Update status callback
      if (onStatus) {
        const statusMessage = getStatusMessage(prediction);
        onStatus(statusMessage, prediction);
      }

      // Check for completion
      if (prediction.status === 'succeeded') {
        return prediction;
      }

      if (prediction.status === 'failed') {
        throw createReplicateError(
          `Processing failed: ${prediction.error || 'Unknown error'}`,
          ERROR_CODES.PROCESSING_ERROR
        );
      }

      if (prediction.status === 'canceled') {
        throw createReplicateError('Processing was canceled', ERROR_CODES.PROCESSING_ERROR);
      }

      // Reset interval if we're making progress
      if (prediction.logs) {
        currentInterval = initialInterval;
      }

      retries++;
    } catch (error) {
      console.error('Polling error:', error);
      retries++;

      // Rethrow if it's our custom error
      if (error instanceof ReplicateError) {
        throw error;
      }

      // Continue polling for network errors
      if (retries >= maxRetries) {
        throw createReplicateError('Processing timed out', ERROR_CODES.TIMEOUT);
      }
    }
  }

  throw createReplicateError('Processing timed out', ERROR_CODES.TIMEOUT);
}

/**
 * Download result from output URL
 */
export async function downloadResult(
  outputUrl: string,
  maxRetries = 3
): Promise<string> {
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(outputUrl);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch result: ${response.status} ${response.statusText}`
        );
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Received empty image data');
      }

      return URL.createObjectURL(blob);
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error occurred');
      retryCount++;

      if (retryCount < maxRetries) {
        console.log(`Retry ${retryCount}/${maxRetries} for downloading result...`);
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  throw createReplicateError(
    `Failed to download result after ${maxRetries} attempts: ${lastError?.message}`,
    ERROR_CODES.NETWORK_ERROR
  );
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(prediction: ReplicatePrediction): string {
  switch (prediction.status) {
    case 'starting':
      return 'Preparing processing tools...';
    case 'processing':
      return 'AI is working its magic...';
    case 'succeeded':
      return 'Processing complete!';
    case 'failed':
      return 'Processing failed';
    case 'canceled':
      return 'Processing canceled';
    default:
      return 'Processing...';
  }
}

/**
 * Custom error class for Replicate errors
 */
export class ReplicateError extends Error {
  code: ErrorCode;

  constructor(message: string, code: ErrorCode) {
    super(message);
    this.name = 'ReplicateError';
    this.code = code;
  }
}

/**
 * Create a Replicate error
 */
export function createReplicateError(message: string, code: ErrorCode): ReplicateError {
  return new ReplicateError(message, code);
}
