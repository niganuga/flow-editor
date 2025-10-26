# Replicate API Implementation Guide

Complete implementation examples for integrating Replicate image editing into the Flow Editor.

## Table of Contents

1. [Setup and Configuration](#setup-and-configuration)
2. [Basic Implementation](#basic-implementation)
3. [Advanced Patterns](#advanced-patterns)
4. [Component Integration](#component-integration)
5. [Error Handling](#error-handling)
6. [Testing](#testing)

## Setup and Configuration

### 1. Environment Configuration

Create `.env.local`:

```bash
# Replicate API
REPLICATE_API_TOKEN=r8_xxx...
REPLICATE_WEBHOOK_SECRET=your-secret-key

# Optional: For webhook notifications
REPLICATE_WEBHOOK_URL=https://example.com/api/webhooks/replicate
```

### 2. Type Safety

Import from the types file:

```typescript
import type {
  ReplicatePrediction,
  QwenImageEditInput,
  QwenImageEditOutput,
  ErrorCode,
} from '@/lib/types/replicate-api';
```

## Basic Implementation

### Example 1: Simple Image Editing

```typescript
// lib/replicate-service.ts
import {
  createPrediction,
  pollPrediction,
  downloadResult,
} from '@/lib/api/replicate';
import type { QwenImageEditInput } from '@/lib/types/replicate-api';

export async function editImageSimple(
  imageUrl: string,
  editPrompt: string
): Promise<string> {
  // Create prediction
  const prediction = await createPrediction({
    version: 'qwen/qwen-image-edit-plus',
    input: {
      image: [imageUrl],
      prompt: editPrompt,
    },
  });

  // Poll for completion
  const completed = await pollPrediction({
    predictionId: prediction.id,
    maxRetries: 60,
    initialInterval: 1000,
  });

  // Extract output URL
  if (completed.output?.images?.[0]) {
    return completed.output.images[0];
  }

  throw new Error('No output image generated');
}

// Usage
const editedImageUrl = await editImageSimple(
  'https://example.com/image.jpg',
  'Remove the background'
);
```

### Example 2: With Progress Tracking

```typescript
export async function editImageWithProgress(
  imageUrl: string,
  editPrompt: string,
  onProgress?: (message: string) => void
): Promise<string> {
  onProgress?.('Starting edit request...');

  const prediction = await createPrediction({
    version: 'qwen/qwen-image-edit-plus',
    input: {
      image: [imageUrl],
      prompt: editPrompt,
      guidance_scale: 7.5,
      num_inference_steps: 50,
    },
  });

  onProgress?.(`Processing (ID: ${prediction.id.slice(0, 8)}...)`);

  let lastLogUpdate = 0;
  const completed = await pollPrediction({
    predictionId: prediction.id,
    onStatus: (message, prediction) => {
      onProgress?.(message);

      // Log updates every 5 seconds
      if (prediction.logs && Date.now() - lastLogUpdate > 5000) {
        console.debug('Processing logs:', prediction.logs);
        lastLogUpdate = Date.now();
      }
    },
    maxRetries: 120,
    initialInterval: 2000,
  });

  if (completed.output?.images?.[0]) {
    onProgress?.('Download completed');
    return completed.output.images[0];
  }

  throw new Error(completed.error || 'Processing failed');
}
```

### Example 3: Multiple Output Variations

```typescript
export async function generateImageVariations(
  imageUrl: string,
  editPrompt: string,
  numVariations: number = 3
): Promise<string[]> {
  const prediction = await createPrediction({
    version: 'qwen/qwen-image-edit-plus',
    input: {
      image: [imageUrl],
      prompt: editPrompt,
      num_outputs: Math.min(numVariations, 4), // Max 4
      guidance_scale: 7.5,
      num_inference_steps: 50,
    },
  });

  const completed = await pollPrediction({
    predictionId: prediction.id,
    maxRetries: 120,
  });

  return completed.output?.images || [];
}
```

## Advanced Patterns

### Pattern 1: Reproducible Results with Seed

```typescript
export async function editImageWithSeed(
  imageUrl: string,
  editPrompt: string,
  seed: number
): Promise<string> {
  const prediction = await createPrediction({
    version: 'qwen/qwen-image-edit-plus',
    input: {
      image: [imageUrl],
      prompt: editPrompt,
      seed, // Same seed = reproducible output
      guidance_scale: 7.5,
      num_inference_steps: 50,
    },
  });

  const completed = await pollPrediction({
    predictionId: prediction.id,
  });

  return completed.output?.images?.[0] || '';
}

// Generate deterministic seed from content
export function generateDeterministicSeed(content: string): number {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash) % 1000000;
}
```

### Pattern 2: Pose Transfer (Multi-Image)

```typescript
export async function transferPose(
  referenceImageUrl: string,
  targetImageUrl: string,
  poseDescription: string
): Promise<string> {
  const prediction = await createPrediction({
    version: 'qwen/qwen-image-edit-plus',
    input: {
      image: [referenceImageUrl, targetImageUrl],
      prompt: `Transfer the pose from image 1 to image 2: ${poseDescription}`,
      guidance_scale: 8.0,
      num_inference_steps: 75,
    },
  });

  const completed = await pollPrediction({
    predictionId: prediction.id,
    maxRetries: 120,
  });

  return completed.output?.images?.[0] || '';
}

// Usage
const poseTransferred = await transferPose(
  'https://example.com/reference-pose.jpg',
  'https://example.com/target-person.jpg',
  'The person is in a yoga pose'
);
```

### Pattern 3: Async Processing with Webhooks

```typescript
// /app/api/replicate-webhook-handler/route.ts
import { NextRequest, NextResponse } from 'next/server';
import type { WebhookPayload } from '@/lib/types/replicate-api';

const webhookSecret = process.env.REPLICATE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  // In production, verify webhook signature
  const payload: WebhookPayload = await request.json();

  const { id, status, output, error } = payload;

  // Store in database or trigger downstream action
  if (status === 'succeeded') {
    // Save result
    await saveProcessingResult(id, output);
    // Notify user via websocket
    await notifyUser(id, 'Image processing complete!');
  } else if (status === 'failed') {
    // Log error
    console.error(`Prediction ${id} failed:`, error);
    // Notify user of failure
    await notifyUser(id, `Processing failed: ${error}`);
  }

  return NextResponse.json({ received: true });
}

// Minimal webhook setup helper
export async function editImageAsync(
  imageUrl: string,
  editPrompt: string,
  webhookUrl?: string
): Promise<string> {
  const prediction = await createPrediction({
    version: 'qwen/qwen-image-edit-plus',
    input: {
      image: [imageUrl],
      prompt: editPrompt,
    },
    webhook: webhookUrl,
    webhook_events_filter: ['completed'],
  });

  return prediction.id; // Return prediction ID for status polling
}
```

### Pattern 4: Batch Processing with Queue

```typescript
import PQueue from 'p-queue';

export class ImageEditingQueue {
  private queue: PQueue;

  constructor(concurrency: number = 3) {
    // Limit concurrent requests to stay within rate limits
    this.queue = new PQueue({ concurrency });
  }

  async editBatch(
    images: Array<{ url: string; prompt: string }>,
    onProgress?: (index: number, result: string) => void
  ): Promise<string[]> {
    const results: string[] = [];

    for (let i = 0; i < images.length; i++) {
      const { url, prompt } = images[i];

      await this.queue.add(async () => {
        try {
          const result = await editImageSimple(url, prompt);
          results[i] = result;
          onProgress?.(i, result);
        } catch (error) {
          console.error(`Failed to edit image ${i}:`, error);
          results[i] = ''; // Mark as failed
        }
      });
    }

    // Wait for all items to complete
    await this.queue.onIdle();

    return results.filter((r) => r); // Remove empty results
  }
}

// Usage
const queue = new ImageEditingQueue(3);
const results = await queue.editBatch(
  [
    { url: 'https://...1.jpg', prompt: 'Remove background' },
    { url: 'https://...2.jpg', prompt: 'Increase brightness' },
    { url: 'https://...3.jpg', prompt: 'Change colors to blue' },
  ],
  (index, result) => {
    console.log(`Image ${index} processed: ${result}`);
  }
);
```

## Component Integration

### Component 1: Image Editor Panel

```typescript
// components/image-editor-panel.tsx
'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { editImageWithProgress } from '@/lib/replicate-service';

interface ImageEditorPanelProps {
  imageUrl: string;
  onImageEdited: (url: string) => void;
}

export function ImageEditorPanel({
  imageUrl,
  onImageEdited,
}: ImageEditorPanelProps) {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleEdit = useCallback(async () => {
    if (!prompt.trim()) {
      setError('Please enter an editing prompt');
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProgress('Starting...');

    try {
      const editedUrl = await editImageWithProgress(
        imageUrl,
        prompt,
        setProgress
      );
      onImageEdited(editedUrl);
      setPrompt(''); // Clear prompt after success
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Processing failed';
      setError(message);
      console.error('Edit error:', err);
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  }, [imageUrl, prompt, onImageEdited]);

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">AI Image Editor</h3>

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Describe the edit you want (e.g., 'Remove the background', 'Make it brighter', 'Change to blue tones')"
        className="w-full h-24 p-2 border rounded resize-none"
        disabled={isProcessing}
      />

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isProcessing && progress && (
        <div className="space-y-2">
          <Progress value={50} /> {/* Estimated progress */}
          <p className="text-sm text-gray-600">{progress}</p>
        </div>
      )}

      <Button
        onClick={handleEdit}
        disabled={isProcessing || !prompt.trim()}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Edit Image'}
      </Button>
    </div>
  );
}
```

### Component 2: Preview with Before/After

```typescript
// components/image-comparison.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';

interface ImageComparisonProps {
  before: string;
  after: string;
  title?: string;
}

export function ImageComparison({
  before,
  after,
  title = 'Before / After',
}: ImageComparisonProps) {
  const [position, setPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const newPosition = ((e.clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(Math.max(newPosition, 0), 100));
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-lg cursor-col-resize bg-gray-100"
      onMouseMove={handleMouseMove}
      style={{ aspectRatio: '4/3' }}
    >
      {title && <p className="absolute top-2 left-2 text-sm font-semibold text-white z-10">{title}</p>}

      {/* After image */}
      <div className="absolute inset-0">
        <Image
          src={after}
          alt="After"
          fill
          className="object-cover"
        />
      </div>

      {/* Before image (clipped) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <Image
          src={before}
          alt="Before"
          fill
          className="object-cover"
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 h-full w-1 bg-white cursor-col-resize"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-full p-2">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 10l5-5 5 5M7 10l5 5 5-5" />
          </svg>
        </div>
      </div>
    </div>
  );
}
```

### Component 3: Batch Upload and Edit

```typescript
// components/batch-editor-panel.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ImageEditingQueue } from '@/lib/replicate-service';

interface BatchFile {
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: string;
  error?: string;
}

export function BatchEditorPanel() {
  const [files, setFiles] = useState<BatchFile[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files;
    if (!selected) return;

    const newFiles: BatchFile[] = [];
    for (const file of selected) {
      const preview = URL.createObjectURL(file);
      newFiles.push({
        file,
        preview,
        status: 'pending',
      });
    }

    setFiles((prev) => [...prev, ...newFiles]);
  };

  const handleProcessBatch = async () => {
    if (!prompt.trim() || files.length === 0) return;

    setIsProcessing(true);
    const queue = new ImageEditingQueue(2); // 2 concurrent

    try {
      for (let i = 0; i < files.length; i++) {
        if (files[i].status !== 'pending') continue;

        // Mark as processing
        setFiles((prev) => {
          const updated = [...prev];
          updated[i].status = 'processing';
          return updated;
        });

        try {
          // Upload file to get URL (simplified)
          const url = files[i].preview; // In production, upload to storage

          const result = await queue.editBatch([
            { url, prompt },
            (index) => {
              // Update progress
              setProgress(((i + 1) / files.length) * 100);
            },
          ]);

          setFiles((prev) => {
            const updated = [...prev];
            updated[i].status = 'done';
            updated[i].result = result[0];
            return updated;
          });
        } catch (error) {
          setFiles((prev) => {
            const updated = [...prev];
            updated[i].status = 'error';
            updated[i].error =
              error instanceof Error ? error.message : 'Failed';
            return updated;
          });
        }
      }
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <h3 className="font-semibold">Batch Edit</h3>

      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleFileSelect}
        disabled={isProcessing}
        className="block w-full"
      />

      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Edit prompt for all images"
        className="w-full h-20 p-2 border rounded"
        disabled={isProcessing}
      />

      {isProcessing && (
        <div className="space-y-2">
          <Progress value={progress} />
          <p className="text-sm text-gray-600">{Math.round(progress)}%</p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 max-h-48 overflow-y-auto">
        {files.map((file, index) => (
          <div key={index} className="relative">
            <img
              src={file.preview}
              alt="Preview"
              className="w-full h-24 object-cover rounded"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded">
              {file.status === 'processing' && (
                <div className="animate-spin">Loading</div>
              )}
              {file.status === 'done' && <span className="text-green-400">Done</span>}
              {file.status === 'error' && <span className="text-red-400">Error</span>}
            </div>
          </div>
        ))}
      </div>

      <Button
        onClick={handleProcessBatch}
        disabled={isProcessing || files.length === 0 || !prompt.trim()}
        className="w-full"
      >
        {isProcessing ? 'Processing...' : 'Process All'}
      </Button>
    </div>
  );
}
```

## Error Handling

### Comprehensive Error Handler

```typescript
// lib/replicate-error-handler.ts
import type { ErrorCode, ReplicatePrediction } from '@/lib/types/replicate-api';

export interface ErrorContext {
  userMessage: string;
  technicalMessage: string;
  recoverySteps: string[];
  severity: 'info' | 'warning' | 'error' | 'critical';
}

export function handleReplicateError(
  error: unknown,
  context?: string
): ErrorContext {
  if (error instanceof Error) {
    const message = error.message;

    // Network errors
    if (error instanceof TypeError && message.includes('fetch')) {
      return {
        userMessage: 'Network connection failed',
        technicalMessage: `Network error: ${message}`,
        recoverySteps: [
          'Check your internet connection',
          'Try again in a few moments',
          'Contact support if problem persists',
        ],
        severity: 'error',
      };
    }

    // Replicate API errors
    if (message.includes('rate limit')) {
      return {
        userMessage: 'Too many requests. Please wait before trying again.',
        technicalMessage: message,
        recoverySteps: [
          'Wait at least 1 minute',
          'Try with fewer/smaller images',
          'Upgrade your Replicate plan',
        ],
        severity: 'warning',
      };
    }

    if (message.includes('too large')) {
      return {
        userMessage: 'Image is too large. Maximum size is 10MB.',
        technicalMessage: message,
        recoverySteps: [
          'Resize or compress your image',
          'Try a smaller image',
        ],
        severity: 'warning',
      };
    }

    if (message.includes('authentication') || message.includes('401')) {
      return {
        userMessage: 'Authentication failed',
        technicalMessage: 'API key not configured',
        recoverySteps: [
          'Check REPLICATE_API_TOKEN is set',
          'Verify token is valid',
          'Contact administrator',
        ],
        severity: 'critical',
      };
    }

    if (message.includes('timeout')) {
      return {
        userMessage: 'Processing took too long',
        technicalMessage: message,
        recoverySteps: [
          'Try with a simpler prompt',
          'Reduce inference steps',
          'Try again later',
        ],
        severity: 'warning',
      };
    }
  }

  return {
    userMessage: 'An unexpected error occurred',
    technicalMessage: String(error),
    recoverySteps: ['Try again', 'Reload the page', 'Contact support'],
    severity: 'error',
  };
}
```

## Testing

### Unit Tests

```typescript
// __tests__/replicate-service.test.ts
import { describe, it, expect, vi } from 'vitest';
import { editImageSimple } from '@/lib/replicate-service';

describe('Image Editing Service', () => {
  it('should edit image with prompt', async () => {
    // Mock fetch
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          id: 'test-123',
          status: 'succeeded',
          output: { images: ['https://result.jpg'] },
        }),
      })
    );

    const result = await editImageSimple(
      'https://example.com/image.jpg',
      'Remove background'
    );

    expect(result).toBe('https://result.jpg');
  });

  it('should handle errors', async () => {
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: 'Unauthorized' }),
      })
    );

    expect(
      editImageSimple('https://example.com/image.jpg', 'Remove background')
    ).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// __tests__/replicate-integration.test.ts
import { describe, it, expect } from 'vitest';

describe('Replicate Integration', () => {
  // Skip in CI if no token
  const skipWithoutToken = process.env.REPLICATE_API_TOKEN ? describe : describe.skip;

  skipWithoutToken('Live API Tests', () => {
    it('should create prediction', async () => {
      const response = await fetch('/api/replicate/predictions', {
        method: 'POST',
        body: JSON.stringify({
          version: 'qwen/qwen-image-edit-plus',
          input: {
            image: ['https://example.com/test.jpg'],
            prompt: 'Test edit',
          },
        }),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.id).toBeDefined();
    });
  });
});
```

---

**Implementation Status:** Ready for Production
**Last Updated:** October 20, 2024
