/**
 * Replicate API TypeScript Type Definitions
 * Complete type definitions for all Replicate API operations and models
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * Prediction status enum
 */
export type PredictionStatus =
  | "starting"
  | "processing"
  | "succeeded"
  | "failed"
  | "canceled";

/**
 * Webhook event type
 */
export type WebhookEventType =
  | "start"
  | "output"
  | "logs"
  | "completed";

/**
 * API error code
 */
export enum ErrorCode {
  INVALID_REQUEST = "INVALID_REQUEST",
  AUTHENTICATION_ERROR = "AUTHENTICATION_ERROR",
  RATE_LIMIT_ERROR = "RATE_LIMIT_ERROR",
  FILE_TOO_LARGE = "FILE_TOO_LARGE",
  PROCESSING_ERROR = "PROCESSING_ERROR",
  TIMEOUT = "TIMEOUT",
  NETWORK_ERROR = "NETWORK_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

// ============================================================================
// Prediction Types
// ============================================================================

/**
 * Complete prediction object returned by Replicate API
 */
export interface ReplicatePrediction {
  id: string;
  version: string;
  status: PredictionStatus;
  input: Record<string, any>;
  output: any;
  error: string | null;
  logs: string | null;
  metrics: {
    predict_time?: number; // Seconds
  };
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  urls: {
    cancel: string;
    get: string;
  };
  webhook?: string;
  webhook_events_filter?: WebhookEventType[];
}

/**
 * Prediction request payload
 */
export interface CreatePredictionRequest {
  version: string;
  input: Record<string, any>;
  webhook?: string;
  webhook_events_filter?: WebhookEventType[];
}

/**
 * Prediction response (same as ReplicatePrediction for consistency)
 */
export type CreatePredictionResponse = ReplicatePrediction;

/**
 * Paginated predictions list response
 */
export interface ListPredictionsResponse {
  results: ReplicatePrediction[];
  next?: string;
  previous?: string;
}

/**
 * Prediction list query parameters
 */
export interface ListPredictionsParams {
  limit?: number;
  offset?: number;
}

// ============================================================================
// Model-Specific Input Types
// ============================================================================

/**
 * Qwen Image Edit Plus model input
 * Model: qwen/qwen-image-edit-plus
 */
export interface QwenImageEditInput {
  /**
   * Array of image URLs (1-4 images)
   * For multiple images, first is typically base image
   */
  image: string[];

  /**
   * Editing prompt describing the changes to apply
   */
  prompt: string;

  /**
   * Optional: negative prompt for what to avoid
   */
  negative_prompt?: string;

  /**
   * Optional: number of output variations to generate (1-4)
   * @default 1
   */
  num_outputs?: number;

  /**
   * Optional: guidance scale controlling prompt adherence
   * Higher values = stricter adherence to prompt
   * @min 0.1
   * @max 20
   * @default 7.5
   */
  guidance_scale?: number;

  /**
   * Optional: number of inference steps
   * Higher steps = better quality but slower processing
   * @min 1
   * @max 500
   * @default 50
   */
  num_inference_steps?: number;

  /**
   * Optional: random seed for reproducibility
   */
  seed?: number;
}

/**
 * Qwen Image Edit Plus model output
 */
export interface QwenImageEditOutput {
  /**
   * Array of generated image URLs
   */
  images: string[];

  /**
   * Seed used for generation (if specified in input)
   */
  seed?: number;
}

/**
 * Pose transfer input
 * Transfer pose from reference image to target image
 */
export interface PoseTransferInput extends QwenImageEditInput {
  /**
   * Multiple images for pose transfer
   * Image 1: source pose reference
   * Image 2+: target images for pose transfer
   */
  image: string[];

  /**
   * Prompt describing the pose transfer
   * e.g., "Transfer pose from image 1 to image 2"
   */
  prompt: string;
}

/**
 * Product mockup generation input
 */
export interface MockupGenerationInput extends QwenImageEditInput {
  /**
   * Template/background image URL
   */
  image: string[];

  /**
   * Product description for mockup
   */
  prompt: string;

  /**
   * Style preference (professional, artistic, etc.)
   */
  style?: string;

  /**
   * Color scheme preference
   */
  colorScheme?: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Generic API error response
 */
export interface ReplicateErrorResponse {
  detail?: string;
  error?: string;
  status?: number;
  type?: string;
  [key: string]: any;
}

/**
 * Webhook payload received from Replicate
 */
export interface WebhookPayload {
  id: string;
  status: PredictionStatus;
  output?: any;
  error?: string;
  logs?: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  metrics?: {
    predict_time?: number;
  };
}

/**
 * Server request body for creating prediction via Next.js API
 */
export interface CreatePredictionServerRequest {
  version: string;
  input: Record<string, any>;
  webhook?: string;
  webhook_events_filter?: WebhookEventType[];
}

/**
 * Server response for prediction operations
 */
export interface CreatePredictionServerResponse {
  id: string;
  status: PredictionStatus;
  input: Record<string, any>;
  output?: any;
  error?: string;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

// ============================================================================
// Client Options Types
// ============================================================================

/**
 * Options for creating a prediction via SDK
 */
export interface CreatePredictionOptions {
  version: string;
  input: Record<string, any>;
  webhook?: string;
  webhook_events_filter?: WebhookEventType[];
}

/**
 * Options for polling a prediction
 */
export interface PollOptions {
  predictionId: string;
  onStatus?: (status: string, prediction: ReplicatePrediction) => void;
  maxRetries?: number;
  initialInterval?: number;
  backoffMultiplier?: number;
}

/**
 * Options for polling with timeout
 */
export interface PollWithTimeoutOptions extends PollOptions {
  timeoutMs?: number;
}

/**
 * Options for batch processing
 */
export interface BatchProcessingOptions {
  maxConcurrent?: number;
  maxRetries?: number;
  onJobStatusChanged?: (jobId: string, status: string) => void;
}

/**
 * Retry configuration
 */
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

// ============================================================================
// Batch Processing Types
// ============================================================================

/**
 * Batch processing job
 */
export interface BatchJob {
  id: string;
  imageUrl: string;
  prompt: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  predictionId?: string;
  result?: string;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Batch processing results
 */
export interface BatchResults {
  totalJobs: number;
  succeeded: number;
  failed: number;
  pending: number;
  jobs: BatchJob[];
}

// ============================================================================
// Monitoring Types
// ============================================================================

/**
 * Prediction metrics for monitoring
 */
export interface PredictionMetrics {
  predictionId: string;
  model: string;
  status: PredictionStatus;
  createdAt: Date;
  completedAt?: Date;
  totalTime?: number; // milliseconds
  inputSize?: number; // bytes
  outputSize?: number; // bytes
  costEstimate?: number;
  retryCount?: number;
}

/**
 * Cost estimate for a prediction
 */
export interface CostEstimate {
  model: string;
  estimatedCost: number;
  processingTimeSeconds: number;
  explanations: string[];
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  resetUnix: number;
}

/**
 * Usage statistics
 */
export interface UsageStats {
  totalPredictions: number;
  totalCost: number;
  averageCostPerPrediction: number;
  averageProcessingTime: number; // seconds
  successRate: number; // 0-100
  failureRate: number; // 0-100
}

// ============================================================================
// Image Processing Types
// ============================================================================

/**
 * Image optimization options
 */
export interface ImageOptimizationOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "png" | "webp";
}

/**
 * Image metadata
 */
export interface ImageMetadata {
  width: number;
  height: number;
  size: number; // bytes
  format: string;
  hasAlpha: boolean;
}

// ============================================================================
// Security Types
// ============================================================================

/**
 * User rate limit tracking
 */
export interface UserRateLimit {
  userId: string;
  requestsInPeriod: number;
  limit: number;
  resetTime: Date;
  allowed: boolean;
}

/**
 * API key configuration
 */
export interface APIKeyConfig {
  token: string;
  environment: "development" | "staging" | "production";
  rotatedAt?: Date;
  expiresAt?: Date;
}

// ============================================================================
// HTTP Status Codes
// ============================================================================

export enum HTTPStatusCode {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  PAYLOAD_TOO_LARGE = 413,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  BAD_GATEWAY = 502,
  SERVICE_UNAVAILABLE = 503,
  GATEWAY_TIMEOUT = 504,
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Async operation result
 */
export type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Pagination info
 */
export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  hasMore: boolean;
}

/**
 * API response wrapper
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ErrorCode;
    message: string;
    details?: Record<string, any>;
  };
  metadata?: {
    requestId?: string;
    timestamp?: string;
    rateLimit?: RateLimitInfo;
  };
}
