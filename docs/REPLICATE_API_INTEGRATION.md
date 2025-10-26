# Replicate API Integration Guide

## Overview

This document provides comprehensive documentation for integrating Replicate's image editing and AI API into the Flow Editor application. The Replicate API enables advanced AI-powered image processing, including image editing, pose transfer, and mockup generation.

**API Version:** v1
**Base URL:** `https://api.replicate.com/v1`
**Client SDK:** `replicate` npm package

## Table of Contents

1. [Quick Start](#quick-start)
2. [Authentication](#authentication)
3. [API Operations](#api-operations)
4. [Request/Response Types](#requestresponse-types)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Webhook Integration](#webhook-integration)
8. [Use Cases](#use-cases)
9. [Best Practices](#best-practices)
10. [Cost Optimization](#cost-optimization)
11. [Security Considerations](#security-considerations)

## Quick Start

### Installation

```bash
npm install replicate
# or
pnpm add replicate
```

### Basic Usage

```typescript
import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

// Create a prediction
const prediction = await replicate.predictions.create({
  version: "qwen/qwen-image-edit-plus",
  input: {
    image: ["https://example.com/image.jpg"],
    prompt: "Edit the image according to this prompt",
  },
});

console.log(prediction.id); // Prediction ID for polling
```

### Using the Next.js API Route

```typescript
// Client-side usage
const response = await fetch("/api/replicate/predictions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    version: "qwen/qwen-image-edit-plus",
    input: {
      image: ["https://example.com/image.jpg"],
      prompt: "Your editing prompt",
    },
  }),
});

const prediction = await response.json();
```

## Authentication

### Setup

1. **Get API Token:**
   - Visit [Replicate Dashboard](https://replicate.com/account/api-tokens)
   - Create a new API token
   - Copy the token value

2. **Configure Environment Variables:**

```bash
# .env.local
REPLICATE_API_TOKEN=r8_xxx...
# or
REPLICATE_API_KEY=r8_xxx...
```

3. **Verify Configuration:**

```typescript
const token = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
if (!token) {
  throw new Error("REPLICATE_API_TOKEN not configured");
}
```

### Token Security

- Never commit tokens to version control
- Use environment variables for all credentials
- Rotate tokens regularly
- Use separate tokens for development and production
- Scope tokens to specific models when possible

## API Operations

### 1. Create Prediction

Creates a new AI processing task on Replicate.

**Endpoint:** `POST /api/replicate/predictions`

**Request:**

```typescript
interface CreatePredictionRequest {
  version: string; // Model version ID
  input: Record<string, any>; // Model-specific input parameters
  webhook?: string; // Optional webhook URL for async updates
  webhook_events_filter?: string[]; // Events to receive: 'start', 'output', 'logs', 'completed'
}
```

**Response:**

```typescript
interface CreatePredictionResponse {
  id: string; // Unique prediction ID
  version: string; // Model version ID
  urls: {
    cancel: string; // URL to cancel the prediction
    get: string; // URL to get prediction status
  };
  created_at: string; // ISO 8601 timestamp
  started_at: string | null; // When processing started
  completed_at: string | null; // When processing finished
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  input: Record<string, any>;
  output: any; // Model-specific output (null until completion)
  error: string | null; // Error message if failed
  logs: string | null; // Processing logs
}
```

**Example:**

```typescript
const response = await fetch("/api/replicate/predictions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    version: "qwen/qwen-image-edit-plus",
    input: {
      image: ["https://replicate.delivery/pbxt/abc123/image.png"],
      prompt: "Remove the background",
    },
    webhook: "https://example.com/webhooks/replicate",
    webhook_events_filter: ["start", "completed"],
  }),
});

const prediction = await response.json();
// {
//   id: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
//   status: "starting",
//   input: { image: [...], prompt: "..." },
//   output: null,
//   created_at: "2024-10-20T10:30:00.000Z",
//   ...
// }
```

### 2. Get Prediction Status

Retrieves the current status and results of a prediction.

**Endpoint:** `GET /api/replicate/predictions/[id]`

**Parameters:**

```typescript
interface GetPredictionParams {
  id: string; // Prediction ID from create response
}
```

**Response:** Same as CreatePredictionResponse

**Example:**

```typescript
const response = await fetch("/api/replicate/predictions/abc-123-def-456");
const prediction = await response.json();

if (prediction.status === "succeeded") {
  console.log("Result:", prediction.output);
} else if (prediction.status === "failed") {
  console.error("Error:", prediction.error);
} else {
  console.log("Still processing:", prediction.status);
}
```

### 3. Cancel Prediction

Stops an in-progress prediction.

**Endpoint:** `POST /api/replicate/predictions/[id]/cancel`

**Response:**

```typescript
interface CancelPredictionResponse {
  id: string;
  status: "canceled";
  // ... other fields same as prediction
}
```

**Implementation:** Requires additional route handler at `/app/api/replicate/predictions/[id]/cancel/route.ts`

### 4. List Predictions

Lists all predictions for the authenticated user.

**Endpoint:** `GET /api/replicate/predictions`

**Query Parameters:**

```typescript
interface ListPredictionsParams {
  limit?: number; // Default: 10, Max: 100
  offset?: number; // Pagination offset
}
```

**Response:**

```typescript
interface ListPredictionsResponse {
  results: CreatePredictionResponse[];
  next?: string; // URL to next page
  previous?: string; // URL to previous page
}
```

**Implementation:** Requires additional route handler at `/app/api/replicate/predictions/route.ts` with GET method

## Request/Response Types

### TypeScript Interfaces

#### Core Types

```typescript
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
 * Complete prediction object
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
}

/**
 * API error response
 */
export interface ReplicateError {
  detail: string;
  status?: number;
  type?: string;
}

/**
 * Webhook payload
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
}
```

#### Model-Specific Input Types

##### Qwen Image Edit Plus

```typescript
export interface QwenImageEditInput {
  // Main image to edit (array for multi-image operations)
  image: string[];

  // Editing prompt describing the changes
  prompt: string;

  // Optional: negative prompt for what to avoid
  negative_prompt?: string;

  // Optional: number of output variations (1-4)
  num_outputs?: number;

  // Optional: guidance scale (higher = stricter adherence to prompt)
  guidance_scale?: number;

  // Optional: inference steps (higher = better quality, slower)
  num_inference_steps?: number;

  // Optional: random seed for reproducibility
  seed?: number;
}

/**
 * Qwen Image Edit output
 */
export interface QwenImageEditOutput {
  images: string[]; // URLs to generated images
  seed?: number;
}
```

##### Multi-Image Operations (Pose Transfer)

```typescript
export interface PoseTransferInput {
  // Reference image (1-4 images)
  image: string[];

  // Prompt for pose transfer
  prompt: string;

  // Additional parameters
  negative_prompt?: string;
  guidance_scale?: number;
  num_inference_steps?: number;
  seed?: number;
}
```

### Response Status Codes

```typescript
// Success (2xx)
200 OK - Request successful
201 Created - Prediction created
204 No Content - Resource deleted

// Client Errors (4xx)
400 Bad Request - Invalid parameters
401 Unauthorized - Missing/invalid API token
403 Forbidden - Access denied
404 Not Found - Prediction not found
409 Conflict - Resource conflict
413 Payload Too Large - Image/input too large
429 Too Many Requests - Rate limit exceeded

// Server Errors (5xx)
500 Internal Server Error
502 Bad Gateway
503 Service Unavailable
504 Gateway Timeout
```

## Error Handling

### Error Types

```typescript
/**
 * Replicate-specific error
 */
export class ReplicateError extends Error {
  code: ErrorCode;
  status?: number;
  details?: Record<string, any>;

  constructor(
    message: string,
    code: ErrorCode,
    status?: number,
    details?: Record<string, any>
  ) {
    super(message);
    this.name = "ReplicateError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

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
```

### Error Handling Patterns

#### Pattern 1: Synchronous Error Handling

```typescript
try {
  const prediction = await createPrediction({
    version: "qwen/qwen-image-edit-plus",
    input: { image: ["url"], prompt: "Edit this" },
  });

  // Handle immediate errors
  if (prediction.error) {
    console.error(`Failed: ${prediction.error}`);
    return;
  }
} catch (error) {
  if (error instanceof ReplicateError) {
    console.error(`Replicate Error [${error.code}]: ${error.message}`);

    // Handle specific error codes
    switch (error.code) {
      case ErrorCode.RATE_LIMIT_ERROR:
        console.error("Rate limited - wait before retrying");
        break;
      case ErrorCode.FILE_TOO_LARGE:
        console.error("Image too large - resize and retry");
        break;
      case ErrorCode.AUTHENTICATION_ERROR:
        console.error("Check API token configuration");
        break;
      default:
        console.error("Processing failed - check logs");
    }
  } else {
    console.error("Unexpected error:", error);
  }
}
```

#### Pattern 2: Async Error Handling with Polling

```typescript
async function processImageWithErrorHandling(
  input: QwenImageEditInput,
  onProgress?: (status: string) => void
): Promise<string[]> {
  try {
    // Create prediction
    const prediction = await createPrediction({
      version: "qwen/qwen-image-edit-plus",
      input,
    });

    onProgress?.("Created prediction, waiting for processing...");

    // Poll for completion with timeout
    let currentPrediction = prediction;
    let attempts = 0;
    const maxAttempts = 60; // ~5 minutes with exponential backoff

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempts + 1)));

      currentPrediction = await getPredictionStatus(prediction.id);

      switch (currentPrediction.status) {
        case "succeeded":
          onProgress?.("Processing complete!");
          return currentPrediction.output.images;

        case "failed":
          throw new ReplicateError(
            currentPrediction.error || "Processing failed",
            ErrorCode.PROCESSING_ERROR,
            500
          );

        case "canceled":
          throw new ReplicateError(
            "Processing was canceled",
            ErrorCode.PROCESSING_ERROR,
            400
          );

        case "processing":
          onProgress?.(
            `Processing... (${attempts}/${maxAttempts})`
          );
          break;

        case "starting":
          onProgress?.("Initializing processing...");
          break;
      }

      attempts++;
    }

    throw new ReplicateError(
      "Processing timed out after 5 minutes",
      ErrorCode.TIMEOUT,
      504
    );
  } catch (error) {
    if (error instanceof ReplicateError) {
      throw error;
    }
    throw new ReplicateError(
      error instanceof Error ? error.message : "Unknown error",
      ErrorCode.UNKNOWN_ERROR
    );
  }
}
```

#### Pattern 3: Graceful Degradation

```typescript
async function tryReplicateOrFallback(
  input: QwenImageEditInput,
  fallbackProcessor?: (input: any) => Promise<string[]>
): Promise<string[]> {
  try {
    return await processImageWithErrorHandling(input);
  } catch (error) {
    if (error instanceof ReplicateError) {
      // Log for monitoring
      console.error(`Replicate failed [${error.code}]:`, error.message);

      // Use fallback if available
      if (fallbackProcessor) {
        console.info("Using fallback processor...");
        return fallbackProcessor(input);
      }

      // Or rethrow for UI to handle
      throw error;
    }
    throw error;
  }
}
```

### Error Response Examples

```typescript
// 400 Bad Request
{
  error: "Missing required fields: version and input",
  status: 400
}

// 401 Unauthorized
{
  error: "Replicate API token not configured",
  status: 401
}

// 413 Payload Too Large
{
  error: "Image file is too large for processing",
  status: 413,
  details: {
    max_size: "10MB",
    received_size: "15MB"
  }
}

// 429 Too Many Requests
{
  error: "Rate limit exceeded. Please try again later.",
  status: 429,
  details: {
    retry_after: 60
  }
}

// 500 Server Error
{
  error: "Processing failed: CUDA out of memory",
  status: 500,
  details: {
    detail: "Original Replicate error"
  }
}
```

## Rate Limiting

### Limits

- **Default:** 100 requests per hour per API token
- **Enterprise:** Custom limits available
- **Concurrency:** No strict concurrent request limit, but rate limit applies across requests

### Headers

Replicate returns rate limit information in response headers:

```
RateLimit-Limit: 100
RateLimit-Remaining: 45
RateLimit-Reset: 1729417200
```

### Handling Rate Limits

```typescript
export class RateLimitHandler {
  private requestQueue: (() => Promise<any>)[] = [];
  private isProcessing = false;
  private lastResetTime = 0;
  private requestCount = 0;
  private maxRequests = 100;

  async execute<T>(
    fn: () => Promise<T>,
    priority: "high" | "normal" = "normal"
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const task = { fn, resolve, reject, priority };

      if (priority === "high") {
        this.requestQueue.unshift(task);
      } else {
        this.requestQueue.push(task);
      }

      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      // Check if we need to wait for rate limit reset
      const now = Date.now() / 1000;
      if (now < this.lastResetTime) {
        const waitTime = (this.lastResetTime - now + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      if (this.requestCount >= this.maxRequests) {
        // Wait for next reset period
        const resetTime = this.lastResetTime || now + 3600;
        const waitTime = (resetTime - (Date.now() / 1000) + 1) * 1000;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.requestCount = 0;
      }

      const task = this.requestQueue.shift();
      if (!task) break;

      try {
        const result = await task.fn();
        this.requestCount++;
        task.resolve(result);
      } catch (error) {
        task.reject(error);
      }
    }

    this.isProcessing = false;
  }
}
```

### Best Practices

1. **Queue Requests:** Use a request queue for high-volume scenarios
2. **Batch Operations:** Group multiple predictions when possible
3. **Cache Results:** Store successful prediction outputs
4. **Monitor Usage:** Track request counts and set alerts
5. **Exponential Backoff:** Implement backoff on rate limit errors

```typescript
async function fetchWithExponentialBackoff<T>(
  fn: () => Promise<T>,
  maxRetries = 5
): Promise<T> {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (
        error instanceof ReplicateError &&
        error.code === ErrorCode.RATE_LIMIT_ERROR
      ) {
        // Exponential backoff: 2^attempt seconds
        const delayMs = Math.pow(2, attempt) * 1000;
        console.log(
          `Rate limited. Waiting ${delayMs}ms before retry (attempt ${attempt + 1}/${maxRetries})`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
}
```

## Webhook Integration

### Setup

Webhooks allow asynchronous updates for long-running predictions without polling.

**Configuration:**

```typescript
// When creating a prediction
const prediction = await createPrediction({
  version: "qwen/qwen-image-edit-plus",
  input: { /* ... */ },
  webhook: "https://example.com/api/webhooks/replicate",
  webhook_events_filter: ["start", "logs", "output", "completed"],
});
```

### Event Types

```typescript
export type WebhookEventType =
  | "start"        // Prediction started processing
  | "output"       // Output generated (may fire multiple times)
  | "logs"         // New logs available
  | "completed";   // Prediction finished (succeeded/failed)

export interface WebhookEvent {
  id: string; // Prediction ID
  status: PredictionStatus;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  output?: any;
  error?: string;
  logs?: string;
}
```

### Webhook Handler Implementation

```typescript
// /app/api/webhooks/replicate/route.ts
import { NextRequest, NextResponse } from "next/server";

interface WebhookPayload {
  id: string;
  status: PredictionStatus;
  output?: any;
  error?: string;
  logs?: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const payload: WebhookPayload = await request.json();

    // Verify webhook signature (optional but recommended)
    // const signature = request.headers.get("x-replicate-content-sha256");
    // if (!verifySignature(signature, body)) {
    //   return NextResponse.json(
    //     { error: "Invalid signature" },
    //     { status: 401 }
    //   );
    // }

    const { id, status, output, error, logs } = payload;

    console.log(`Webhook: Prediction ${id} status changed to ${status}`);

    // Handle different events
    switch (status) {
      case "succeeded":
        await handlePredictionSucceeded(id, output);
        break;

      case "failed":
        await handlePredictionFailed(id, error);
        break;

      case "canceled":
        await handlePredictionCanceled(id);
        break;

      case "processing":
        if (logs) {
          await handlePredictionLogs(id, logs);
        }
        break;

      case "starting":
        await handlePredictionStarted(id);
        break;
    }

    // Acknowledge receipt
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handlePredictionSucceeded(
  predictionId: string,
  output: any
): Promise<void> {
  // Update database
  // Send notification to frontend (via websocket/polling)
  // Trigger downstream processing
  console.log(`Prediction ${predictionId} succeeded with output:`, output);
}

async function handlePredictionFailed(
  predictionId: string,
  error: string | undefined
): Promise<void> {
  // Update database with error
  // Notify user
  // Log error
  console.error(`Prediction ${predictionId} failed:`, error);
}

async function handlePredictionCanceled(predictionId: string): Promise<void> {
  console.log(`Prediction ${predictionId} was canceled`);
}

async function handlePredictionLogs(
  predictionId: string,
  logs: string
): Promise<void> {
  // Stream logs to frontend or store them
  console.log(`Logs for ${predictionId}:`, logs);
}

async function handlePredictionStarted(predictionId: string): Promise<void> {
  console.log(`Prediction ${predictionId} started processing`);
}
```

### Webhook Signature Verification

```typescript
import crypto from "crypto";

export function verifyWebhookSignature(
  signature: string | null,
  body: string,
  secret: string
): boolean {
  if (!signature) return false;

  const computed = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computed)
  );
}

// Usage in webhook handler
const body = await request.text();
const signature = request.headers.get("x-replicate-content-sha256");
const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET!;

if (!verifyWebhookSignature(signature, body, webhookSecret)) {
  return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
}
```

### Frontend Webhook Integration

```typescript
// Real-time prediction status updates
export function usePredictionWebhook(predictionId: string) {
  const [status, setStatus] = useState<PredictionStatus>("starting");
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const channel = new BroadcastChannel(`prediction-${predictionId}`);

    channel.onmessage = (event: MessageEvent<WebhookEvent>) => {
      const { status, output, error } = event.data;
      setStatus(status);
      if (output) setOutput(output);
      if (error) setError(error);
    };

    return () => channel.close();
  }, [predictionId]);

  return { status, output, error };
}
```

## Use Cases

### Use Case 1: AI Image Editing

Remove backgrounds, apply filters, or modify image content.

**Implementation:**

```typescript
import { createPrediction, pollPrediction } from "@/lib/api/replicate";

export async function editImageWithAI(
  imageUrl: string,
  editPrompt: string,
  onProgress?: (message: string) => void
): Promise<string> {
  try {
    onProgress?.("Creating edit request...");

    // Create prediction
    const prediction = await createPrediction({
      version: "qwen/qwen-image-edit-plus",
      input: {
        image: [imageUrl],
        prompt: editPrompt,
        guidance_scale: 7.5,
        num_inference_steps: 50,
      },
    });

    onProgress?.("Processing image...");

    // Poll for completion
    const completed = await pollPrediction({
      predictionId: prediction.id,
      onStatus: (message) => onProgress?.(message),
      maxRetries: 60,
      initialInterval: 1000,
    });

    if (completed.status === "succeeded" && completed.output?.images) {
      return completed.output.images[0];
    }

    throw new Error(completed.error || "Processing failed");
  } catch (error) {
    console.error("Image editing failed:", error);
    throw error;
  }
}

// Usage
async function handleRemoveBackground() {
  try {
    setProcessing(true);
    const result = await editImageWithAI(
      currentImageUrl,
      "Remove the background and make it transparent",
      (message) => setStatus(message)
    );
    setEditedImageUrl(result);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Failed to edit image");
  } finally {
    setProcessing(false);
  }
}
```

### Use Case 2: Product Mockup Generation

Generate product mockups with AI-generated products on templates.

**Implementation:**

```typescript
export interface MockupGenerationOptions {
  templateUrl: string; // Template/background image
  productDescription: string;
  style?: string;
  colorScheme?: string;
}

export async function generateProductMockup(
  options: MockupGenerationOptions,
  onProgress?: (message: string) => void
): Promise<string> {
  const {
    templateUrl,
    productDescription,
    style = "professional",
    colorScheme = "default",
  } = options;

  const prompt = `Generate a ${style} product mockup with: ${productDescription}. Color scheme: ${colorScheme}`;

  return editImageWithAI(templateUrl, prompt, onProgress);
}

// Advanced: Multi-image composition
export async function composeMockupWithPoseTransfer(
  referenceImageUrl: string,
  productImageUrl: string,
  poseDescription: string,
  onProgress?: (message: string) => void
): Promise<string> {
  try {
    onProgress?.("Creating pose transfer request...");

    const prediction = await createPrediction({
      version: "qwen/qwen-image-edit-plus",
      input: {
        image: [referenceImageUrl, productImageUrl],
        prompt: `Transfer pose from image 1 to image 2: ${poseDescription}`,
        guidance_scale: 8.0,
        num_inference_steps: 75,
      },
    });

    onProgress?.("Transferring pose...");

    const completed = await pollPrediction({
      predictionId: prediction.id,
      onStatus: (message) => onProgress?.(message),
    });

    if (completed.status === "succeeded" && completed.output?.images) {
      return completed.output.images[0];
    }

    throw new Error(completed.error || "Pose transfer failed");
  } catch (error) {
    console.error("Mockup generation failed:", error);
    throw error;
  }
}
```

### Use Case 3: Batch Image Processing

Process multiple images efficiently.

**Implementation:**

```typescript
interface BatchProcessingJob {
  id: string;
  imageUrl: string;
  prompt: string;
  status: "pending" | "processing" | "succeeded" | "failed";
  predictionId?: string;
  result?: string;
  error?: string;
}

export class BatchImageProcessor {
  private jobs: Map<string, BatchProcessingJob> = new Map();
  private maxConcurrent = 5;
  private activeJobs = 0;

  async addJob(imageUrl: string, prompt: string): Promise<string> {
    const jobId = crypto.randomUUID();
    const job: BatchProcessingJob = {
      id: jobId,
      imageUrl,
      prompt,
      status: "pending",
    };

    this.jobs.set(jobId, job);
    this.processNextJob();
    return jobId;
  }

  private async processNextJob(): Promise<void> {
    if (this.activeJobs >= this.maxConcurrent) {
      return;
    }

    const pendingJob = Array.from(this.jobs.values()).find(
      (job) => job.status === "pending"
    );

    if (!pendingJob) {
      return;
    }

    this.activeJobs++;
    pendingJob.status = "processing";

    try {
      const prediction = await createPrediction({
        version: "qwen/qwen-image-edit-plus",
        input: {
          image: [pendingJob.imageUrl],
          prompt: pendingJob.prompt,
        },
      });

      pendingJob.predictionId = prediction.id;

      // Poll in background
      this.pollJobCompletion(pendingJob.id);
    } catch (error) {
      pendingJob.status = "failed";
      pendingJob.error =
        error instanceof Error ? error.message : "Unknown error";
      this.activeJobs--;
      this.processNextJob();
    }
  }

  private async pollJobCompletion(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job || !job.predictionId) {
      return;
    }

    try {
      const completed = await pollPrediction({
        predictionId: job.predictionId,
        maxRetries: 120,
      });

      if (completed.status === "succeeded") {
        job.status = "succeeded";
        job.result = completed.output?.images?.[0];
      } else if (completed.status === "failed") {
        job.status = "failed";
        job.error = completed.error || "Processing failed";
      }
    } catch (error) {
      job.status = "failed";
      job.error = error instanceof Error ? error.message : "Unknown error";
    } finally {
      this.activeJobs--;
      this.processNextJob();
    }
  }

  getJob(jobId: string): BatchProcessingJob | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): BatchProcessingJob[] {
    return Array.from(this.jobs.values());
  }
}
```

## Best Practices

### 1. Image Optimization

```typescript
import sharp from "sharp";

export async function optimizeImageForProcessing(
  imageInput: Buffer | string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: "jpeg" | "png" | "webp";
  } = {}
): Promise<Buffer> {
  const {
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 80,
    format = "jpeg",
  } = options;

  let processor = sharp(imageInput).resize(maxWidth, maxHeight, {
    fit: "inside",
    withoutEnlargement: true,
  });

  if (format === "jpeg") {
    processor = processor.jpeg({ quality });
  } else if (format === "png") {
    processor = processor.png({ quality });
  } else if (format === "webp") {
    processor = processor.webp({ quality });
  }

  return processor.toBuffer();
}

// Usage
const optimizedImage = await optimizeImageForProcessing(imageBuffer, {
  maxWidth: 1280,
  maxHeight: 1280,
  quality: 85,
  format: "jpeg",
});
```

### 2. Caching Predictions

```typescript
import NodeCache from "node-cache";

export class PredictionCache {
  private cache = new NodeCache({ stdTTL: 3600 }); // 1 hour

  getCacheKey(input: Record<string, any>): string {
    const hash = crypto
      .createHash("md5")
      .update(JSON.stringify(input))
      .digest("hex");
    return `prediction-${hash}`;
  }

  set(input: Record<string, any>, output: any): void {
    const key = this.getCacheKey(input);
    this.cache.set(key, output);
  }

  get(input: Record<string, any>): any | undefined {
    const key = this.getCacheKey(input);
    return this.cache.get(key);
  }

  clear(): void {
    this.cache.flushAll();
  }
}
```

### 3. Monitoring and Logging

```typescript
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport: {
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
    },
  },
});

export interface PredictionMetrics {
  predictionId: string;
  model: string;
  status: PredictionStatus;
  createdAt: Date;
  completedAt?: Date;
  totalTime?: number; // milliseconds
  inputSize?: number;
  outputSize?: number;
  costEstimate?: number;
}

export class PredictionMonitor {
  private metrics: Map<string, PredictionMetrics> = new Map();

  recordPrediction(
    predictionId: string,
    model: string,
    status: PredictionStatus,
    createdAt: Date = new Date()
  ): void {
    this.metrics.set(predictionId, {
      predictionId,
      model,
      status,
      createdAt,
    });

    logger.info(
      {
        predictionId,
        model,
        status,
        timestamp: createdAt.toISOString(),
      },
      "Prediction recorded"
    );
  }

  markCompleted(
    predictionId: string,
    status: PredictionStatus,
    inputSize?: number,
    outputSize?: number
  ): void {
    const metrics = this.metrics.get(predictionId);
    if (!metrics) return;

    const completedAt = new Date();
    metrics.status = status;
    metrics.completedAt = completedAt;
    metrics.totalTime =
      completedAt.getTime() - metrics.createdAt.getTime();
    metrics.inputSize = inputSize;
    metrics.outputSize = outputSize;

    logger.info(
      {
        predictionId,
        model: metrics.model,
        status,
        totalTimeMs: metrics.totalTime,
        inputSizeBytes: inputSize,
        outputSizeBytes: outputSize,
      },
      "Prediction completed"
    );
  }

  getMetrics(predictionId: string): PredictionMetrics | undefined {
    return this.metrics.get(predictionId);
  }

  getAllMetrics(): PredictionMetrics[] {
    return Array.from(this.metrics.values());
  }
}
```

### 4. Retry Strategy

```typescript
export interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: unknown) => boolean;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 30000,
    backoffMultiplier = 2,
    shouldRetry = isRetryableError,
  } = options;

  let lastError: unknown;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      logger.warn(
        {
          attempt,
          maxAttempts,
          delayMs,
          error: error instanceof Error ? error.message : String(error),
        },
        "Retrying operation"
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError;
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof ReplicateError) {
    // Retry on rate limit or timeout
    return (
      error.code === ErrorCode.RATE_LIMIT_ERROR ||
      error.code === ErrorCode.TIMEOUT ||
      error.code === ErrorCode.NETWORK_ERROR
    );
  }
  return error instanceof TypeError; // Network errors
}
```

## Cost Optimization

### Strategies

1. **Image Downsampling:** Reduce resolution before processing
2. **Request Batching:** Group multiple edits when possible
3. **Caching:** Store successful results to avoid reprocessing
4. **Model Selection:** Choose appropriate model versions
5. **Parameters:** Optimize guidance scale and inference steps

### Cost Calculator

```typescript
export interface CostEstimate {
  model: string;
  estimatedCost: number;
  processingTimeSeconds: number;
  explanations: string[];
}

export class ReplicateCostCalculator {
  // Pricing per model (update with current rates from Replicate)
  private modelPricing: Record<string, number> = {
    "qwen/qwen-image-edit-plus": 0.05, // Cost per prediction
  };

  estimateCost(
    model: string,
    inputSize: number,
    inferenceSteps?: number
  ): CostEstimate {
    const basePrice = this.modelPricing[model] || 0.05;
    const baseCost = basePrice;

    // Estimate processing time based on inference steps
    // Typical: 1 second per 10 steps
    const estimatedSteps = inferenceSteps || 50;
    const processingTime = (estimatedSteps / 10) * 2; // Add overhead

    const explanations: string[] = [
      `Base model cost: $${basePrice.toFixed(4)}`,
      `Estimated processing time: ${processingTime.toFixed(1)}s`,
    ];

    // Add size-based overhead for very large images
    let sizeCost = 0;
    if (inputSize > 10 * 1024 * 1024) {
      // > 10MB
      sizeCost = 0.02;
      explanations.push("Large file overhead: $0.02");
    }

    return {
      model,
      estimatedCost: baseCost + sizeCost,
      processingTimeSeconds: processingTime,
      explanations,
    };
  }

  estimateBatchCost(
    predictions: Array<{ model: string; inputSize: number }>
  ): { total: number; perPrediction: number } {
    const costs = predictions.map((p) =>
      this.estimateCost(p.model, p.inputSize)
    );

    const total = costs.reduce((sum, c) => sum + c.estimatedCost, 0);
    const perPrediction = total / predictions.length;

    return { total, perPrediction };
  }
}
```

### Budget Monitoring

```typescript
export class BudgetMonitor {
  private monthlyBudget: number;
  private monthStart: Date;
  private totalSpent: number = 0;

  constructor(monthlyBudget: number) {
    this.monthlyBudget = monthlyBudget;
    this.monthStart = new Date();
    this.monthStart.setDate(1);
  }

  recordSpend(amount: number): void {
    this.totalSpent += amount;

    if (this.totalSpent > this.monthlyBudget * 0.8) {
      logger.warn(
        {
          spent: this.totalSpent,
          budget: this.monthlyBudget,
          percentageUsed: ((this.totalSpent / this.monthlyBudget) * 100).toFixed(1),
        },
        "Approaching budget limit"
      );
    }

    if (this.totalSpent > this.monthlyBudget) {
      logger.error(
        {
          spent: this.totalSpent,
          budget: this.monthlyBudget,
        },
        "Budget exceeded"
      );
    }
  }

  getRemainingBudget(): number {
    return Math.max(0, this.monthlyBudget - this.totalSpent);
  }

  getUsagePercentage(): number {
    return (this.totalSpent / this.monthlyBudget) * 100;
  }

  resetMonth(): void {
    this.totalSpent = 0;
    this.monthStart = new Date();
  }
}
```

## Security Considerations

### API Key Management

```typescript
/**
 * Secure API key management
 */
export class SecureTokenManager {
  /**
   * Get API token from environment
   * Validates existence and format
   */
  static getToken(): string {
    const token = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;

    if (!token) {
      throw new Error(
        "REPLICATE_API_TOKEN environment variable not configured"
      );
    }

    if (!token.startsWith("r8_")) {
      throw new Error("Invalid API token format. Expected to start with 'r8_'");
    }

    return token;
  }

  /**
   * Mask token for logging (show only first and last 4 chars)
   */
  static maskToken(token: string): string {
    if (token.length < 8) {
      return "***";
    }
    return `${token.slice(0, 4)}...${token.slice(-4)}`;
  }

  /**
   * Rotate token if compromised
   * Note: This is a placeholder - actual implementation depends on your secret management
   */
  static async rotateToken(oldToken: string, newToken: string): Promise<void> {
    // Update environment variable or secret store
    process.env.REPLICATE_API_TOKEN = newToken;
    logger.warn(
      {
        oldToken: this.maskToken(oldToken),
        newToken: this.maskToken(newToken),
      },
      "API token rotated"
    );
  }
}

// Usage
const token = SecureTokenManager.getToken();
logger.info({ token: SecureTokenManager.maskToken(token) }, "Token loaded");
```

### Input Validation

```typescript
import { z } from "zod";

export const QwenImageEditInputSchema = z.object({
  image: z
    .array(z.string().url())
    .min(1)
    .max(4)
    .describe("Array of image URLs (1-4 images)"),

  prompt: z
    .string()
    .min(1)
    .max(1000)
    .describe("Editing prompt"),

  negative_prompt: z
    .string()
    .max(1000)
    .optional()
    .describe("What to avoid in the output"),

  guidance_scale: z
    .number()
    .min(0.1)
    .max(20)
    .default(7.5)
    .describe("How closely to follow the prompt"),

  num_inference_steps: z
    .number()
    .min(1)
    .max(500)
    .default(50)
    .describe("Number of inference steps"),

  num_outputs: z
    .number()
    .min(1)
    .max(4)
    .default(1)
    .describe("Number of output variations"),

  seed: z
    .number()
    .optional()
    .describe("Random seed for reproducibility"),
});

export async function validateAndCreatePrediction(
  input: unknown
): Promise<ReplicatePrediction> {
  // Validate input
  const validatedInput = QwenImageEditInputSchema.parse(input);

  // Additional security checks
  for (const imageUrl of validatedInput.image) {
    // Only allow HTTPS URLs to trusted domains
    if (!imageUrl.startsWith("https://")) {
      throw new Error("Only HTTPS image URLs are allowed");
    }

    // Check against whitelist if needed
    const url = new URL(imageUrl);
    const allowedDomains = [
      "replicate.delivery",
      "example.com",
      "cdn.example.com",
    ];

    if (!allowedDomains.some((domain) => url.hostname.endsWith(domain))) {
      throw new Error("Image URL from untrusted domain");
    }
  }

  // Check prompt for injection attacks or malicious content
  if (containsSuspiciousPatterns(validatedInput.prompt)) {
    throw new Error("Prompt contains suspicious patterns");
  }

  // Create prediction with validated input
  return createPrediction({
    version: "qwen/qwen-image-edit-plus",
    input: validatedInput,
  });
}

function containsSuspiciousPatterns(text: string): boolean {
  const suspiciousPatterns = [
    /eval\s*\(/gi,
    /exec\s*\(/gi,
    /system\s*\(/gi,
    /<script/gi,
    /javascript:/gi,
  ];

  return suspiciousPatterns.some((pattern) => pattern.test(text));
}
```

### Rate Limiting by User

```typescript
import Redis from "ioredis";

export class UserRateLimiter {
  private redis: Redis;
  private readonly requestsPerHour = 100;

  constructor(redisUrl: string) {
    this.redis = new Redis(redisUrl);
  }

  async checkLimit(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  }> {
    const key = `rate-limit:${userId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      // First request in this period
      await this.redis.expire(key, 3600); // 1 hour
    }

    const ttl = await this.redis.ttl(key);
    const remaining = Math.max(0, this.requestsPerHour - current);
    const resetTime = new Date(Date.now() + ttl * 1000);

    return {
      allowed: current <= this.requestsPerHour,
      remaining,
      resetTime,
    };
  }

  async resetUser(userId: string): Promise<void> {
    await this.redis.del(`rate-limit:${userId}`);
  }
}

// Middleware for rate limiting
export async function rateLimitMiddleware(
  userId: string,
  limiter: UserRateLimiter
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
}> {
  const { allowed, remaining, resetTime } = await limiter.checkLimit(userId);

  return {
    allowed,
    headers: {
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": resetTime.toISOString(),
    },
  };
}
```

### Data Privacy

```typescript
export class DataPrivacyHandler {
  /**
   * Never log sensitive image URLs in production
   */
  static sanitizeImageUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Keep domain but remove parameters
      return urlObj.origin + urlObj.pathname.split("/").slice(0, 3).join("/");
    } catch {
      return "[invalid-url]";
    }
  }

  /**
   * Encrypt sensitive data at rest
   */
  static encryptData(data: string, key: string): string {
    const cipher = crypto.createCipher("aes-256-cbc", key);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  }

  /**
   * Decrypt sensitive data
   */
  static decryptData(encrypted: string, key: string): string {
    const decipher = crypto.createDecipher("aes-256-cbc", key);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }

  /**
   * GDPR compliance: Allow users to request their data
   */
  static async getUserPredictions(userId: string): Promise<{
    predictions: Array<{ id: string; createdAt: string; status: string }>;
    totalCount: number;
  }> {
    // Implementation: Query database for user's predictions
    // Return only necessary fields
    return {
      predictions: [],
      totalCount: 0,
    };
  }

  /**
   * GDPR compliance: Allow users to delete their data
   */
  static async deletUserPredictions(userId: string): Promise<void> {
    // Implementation: Delete all records associated with user
    logger.info({ userId }, "User data deleted (GDPR request)");
  }
}
```

---

## Quick Reference

### Common Curl Examples

```bash
# Create prediction
curl -X POST https://api.replicate.com/v1/predictions \
  -H "Authorization: Token $REPLICATE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "qwen/qwen-image-edit-plus",
    "input": {
      "image": ["https://example.com/image.jpg"],
      "prompt": "Remove the background"
    }
  }'

# Get prediction status
curl https://api.replicate.com/v1/predictions/<prediction-id> \
  -H "Authorization: Token $REPLICATE_API_TOKEN"

# Cancel prediction
curl -X POST https://api.replicate.com/v1/predictions/<prediction-id>/cancel \
  -H "Authorization: Token $REPLICATE_API_TOKEN"

# List predictions
curl https://api.replicate.com/v1/predictions?limit=10 \
  -H "Authorization: Token $REPLICATE_API_TOKEN"
```

## Support and Resources

- **Replicate Documentation:** https://replicate.com/docs
- **API Reference:** https://replicate.com/docs/api/rest
- **Model Zoo:** https://replicate.com/explore
- **Community Discord:** https://discord.gg/replicate
- **GitHub Issues:** https://github.com/replicate/replicate-python/issues

---

**Last Updated:** October 20, 2024
**Version:** 1.0.0
**Status:** Production Ready
