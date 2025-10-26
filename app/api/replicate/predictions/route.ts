/**
 * Replicate Predictions API Route
 * POST /api/replicate/predictions - Create a new prediction
 * GET /api/replicate/predictions - List predictions (optional)
 *
 * @example
 * ```typescript
 * // Create a prediction
 * const response = await fetch('/api/replicate/predictions', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     version: 'qwen/qwen-image-edit-plus',
 *     input: {
 *       image: ['https://example.com/image.jpg'],
 *       prompt: 'Remove the background'
 *     }
 *   })
 * });
 * const prediction = await response.json();
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const REPLICATE_API_TOKEN = process.env["REPLICATE_API_TOKEN"] || process.env["REPLICATE_API_KEY"];
const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

// ============================================================================
// Validation Schemas
// ============================================================================

const CreatePredictionRequestSchema = z.object({
  version: z
    .string()
    .min(1)
    .describe('Model version ID (e.g., qwen/qwen-image-edit-plus:latest)'),

  input: z
    .record(z.any())
    .describe('Model-specific input parameters'),

  webhook: z
    .string()
    .url()
    .optional()
    .describe('Optional webhook URL for async updates'),

  webhook_events_filter: z
    .array(z.enum(['start', 'output', 'logs', 'completed']))
    .optional()
    .describe('Events to receive via webhook'),
});

const ListPredictionsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? Math.min(parseInt(val), 100) : 10))
    .describe('Limit (max 100)'),

  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val) : 0))
    .describe('Pagination offset'),
});

// ============================================================================
// Error Handling
// ============================================================================

interface ErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, any>;
  requestId?: string;
  timestamp?: string;
}

function createErrorResponse(
  message: string,
  code: string,
  statusCode: number,
  details?: Record<string, any>
): NextResponse<ErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
      requestId: generateRequestId(),
      timestamp: new Date().toISOString(),
    },
    { status: statusCode }
  );
}

function generateRequestId(): string {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// POST Handler - Create Prediction
// ============================================================================

export async function POST(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    // Validate API token configuration
    if (!REPLICATE_API_TOKEN) {
      console.error(`[${requestId}] Missing REPLICATE_API_TOKEN`);
      return createErrorResponse(
        'Replicate API token not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch (error) {
      console.warn(`[${requestId}] Invalid JSON body`);
      return createErrorResponse(
        'Invalid JSON in request body',
        'INVALID_REQUEST',
        400
      );
    }

    // Validate request payload
    let validatedInput: z.infer<typeof CreatePredictionRequestSchema>;
    try {
      validatedInput = CreatePredictionRequestSchema.parse(body);
    } catch (error) {
      const validationError = error instanceof z.ZodError ? error.issues[0] : null;
      console.warn(`[${requestId}] Validation error:`, validationError);
      return createErrorResponse(
        `Validation error: ${validationError?.message || 'Invalid input'}`,
        'VALIDATION_ERROR',
        400,
        { field: validationError?.path.join('.') }
      );
    }

    // Log validated request (without sensitive data)
    console.info(`[${requestId}] Creating prediction for model:`, validatedInput.version);

    // Prepare Replicate API request
    const replicatePayload = {
      version: validatedInput.version,
      input: validatedInput.input,
      ...(validatedInput.webhook && {
        webhook: validatedInput.webhook,
        webhook_events_filter: validatedInput.webhook_events_filter || ['completed'],
      }),
    };

    // Call Replicate API
    const response = await fetch(`${REPLICATE_API_BASE}/predictions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'User-Agent': 'flow-editor/1.0.0',
      },
      body: JSON.stringify(replicatePayload),
    });

    // Handle API response
    if (!response.ok) {
      let errorDetails: Record<string, any> = {};
      let errorMessage = 'Failed to create prediction';

      try {
        errorDetails = await response.json();
        if (errorDetails.detail) {
          errorMessage = errorDetails.detail;
        } else if (errorDetails.error) {
          errorMessage = errorDetails.error;
        }
      } catch {
        // Response is not JSON, use status text
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }

      console.error(
        `[${requestId}] Replicate API error (${response.status}):`,
        errorMessage,
        errorDetails
      );

      // Map HTTP status codes to specific error codes
      const errorCode = mapHttpStatusToErrorCode(response.status);

      return createErrorResponse(
        errorMessage,
        errorCode,
        response.status,
        errorDetails
      );
    }

    // Parse successful response
    const data = await response.json();

    console.info(`[${requestId}] Prediction created:`, data.id);

    // Return prediction with metadata
    return NextResponse.json(
      {
        ...data,
        _requestId: requestId,
        _timestamp: new Date().toISOString(),
      },
      {
        status: 201,
        headers: {
          'X-Request-ID': requestId,
          'X-Prediction-ID': data.id,
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);

    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500,
      {
        error: error instanceof Error ? error.message : 'Unknown error',
      }
    );
  }
}

// ============================================================================
// GET Handler - List Predictions (Optional)
// ============================================================================

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = generateRequestId();

  try {
    // Validate API token configuration
    if (!REPLICATE_API_TOKEN) {
      console.error(`[${requestId}] Missing REPLICATE_API_TOKEN`);
      return createErrorResponse(
        'Replicate API token not configured',
        'CONFIGURATION_ERROR',
        500
      );
    }

    // Parse and validate query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = ListPredictionsQuerySchema.parse({
      limit: searchParams.get('limit') || undefined,
      offset: searchParams.get('offset') || undefined,
    });

    console.info(
      `[${requestId}] Listing predictions (limit: ${queryParams.limit}, offset: ${queryParams.offset})`
    );

    // Call Replicate API
    const url = new URL(`${REPLICATE_API_BASE}/predictions`);
    url.searchParams.set('limit', queryParams.limit.toString());
    url.searchParams.set('offset', queryParams.offset.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Token ${REPLICATE_API_TOKEN}`,
        'User-Agent': 'flow-editor/1.0.0',
      },
    });

    if (!response.ok) {
      let errorMessage = 'Failed to list predictions';
      try {
        const errorData = await response.json();
        errorMessage = errorData.detail || errorMessage;
      } catch {
        // Not JSON
      }

      console.error(`[${requestId}] Replicate API error (${response.status}):`, errorMessage);

      return createErrorResponse(
        errorMessage,
        mapHttpStatusToErrorCode(response.status),
        response.status
      );
    }

    const data = await response.json();

    return NextResponse.json(
      {
        ...data,
        _requestId: requestId,
        _timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'X-Request-ID': requestId,
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch (error) {
    console.error(`[${requestId}] Unexpected error:`, error);

    return createErrorResponse(
      'Internal server error',
      'INTERNAL_ERROR',
      500
    );
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function mapHttpStatusToErrorCode(status: number): string {
  switch (status) {
    case 400:
      return 'INVALID_REQUEST';
    case 401:
      return 'AUTHENTICATION_ERROR';
    case 403:
      return 'FORBIDDEN';
    case 404:
      return 'NOT_FOUND';
    case 409:
      return 'CONFLICT';
    case 413:
      return 'FILE_TOO_LARGE';
    case 429:
      return 'RATE_LIMIT_ERROR';
    case 500:
      return 'SERVER_ERROR';
    case 502:
      return 'BAD_GATEWAY';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    case 504:
      return 'GATEWAY_TIMEOUT';
    default:
      return 'UNKNOWN_ERROR';
  }
}
