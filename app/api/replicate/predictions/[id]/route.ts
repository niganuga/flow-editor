/**
 * Replicate Prediction Status API Route
 * GET /api/replicate/predictions/[id] - Get prediction status
 * DELETE /api/replicate/predictions/[id] - Cancel prediction (optional)
 *
 * @example
 * ```typescript
 * // Get prediction status
 * const response = await fetch('/api/replicate/predictions/abc-123-def-456');
 * const prediction = await response.json();
 *
 * // Cancel prediction
 * const response = await fetch('/api/replicate/predictions/abc-123-def-456', {
 *   method: 'DELETE'
 * });
 * ```
 */

import { NextRequest, NextResponse } from 'next/server';

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;
const REPLICATE_API_BASE = 'https://api.replicate.com/v1';

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
// GET Handler - Get Prediction Status
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Extract prediction ID from route params
    const { id } = await params;

    // Validate prediction ID format
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn(`[${requestId}] Invalid prediction ID`);
      return createErrorResponse(
        'Prediction ID is required and must be a non-empty string',
        'INVALID_REQUEST',
        400
      );
    }

    const predictionId = id.trim();

    // Validate prediction ID format (UUIDs or similar)
    if (!/^[a-z0-9\-]+$/i.test(predictionId)) {
      console.warn(`[${requestId}] Invalid prediction ID format: ${predictionId}`);
      return createErrorResponse(
        'Invalid prediction ID format',
        'INVALID_REQUEST',
        400
      );
    }

    console.info(`[${requestId}] Getting status for prediction:`, predictionId);

    // Call Replicate API
    const response = await fetch(
      `${REPLICATE_API_BASE}/predictions/${encodeURIComponent(predictionId)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'flow-editor/1.0.0',
        },
      }
    );

    // Handle API response
    if (!response.ok) {
      let errorMessage = 'Failed to get prediction status';
      let errorDetails: Record<string, any> = {};

      try {
        errorDetails = await response.json();
        if (errorDetails.detail) {
          errorMessage = errorDetails.detail;
        } else if (errorDetails.error) {
          errorMessage = errorDetails.error;
        }
      } catch {
        // Response is not JSON
        errorMessage = response.statusText || `HTTP ${response.status}`;
      }

      console.error(
        `[${requestId}] Replicate API error (${response.status}):`,
        errorMessage
      );

      const statusCode =
        response.status === 404 ? 404 : response.status;

      return createErrorResponse(
        errorMessage,
        mapHttpStatusToErrorCode(statusCode),
        statusCode,
        errorDetails
      );
    }

    // Parse successful response
    const data = await response.json();

    console.info(
      `[${requestId}] Prediction status retrieved:`,
      data.status,
      `(${predictionId})`
    );

    // Return prediction with metadata
    return NextResponse.json(
      {
        ...data,
        _requestId: requestId,
        _timestamp: new Date().toISOString(),
      },
      {
        headers: {
          'X-Request-ID': requestId,
          'X-Prediction-ID': data.id,
          'Cache-Control': 'no-store',
          'ETag': `"${data.id}-${data.status}"`, // For conditional requests
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
// DELETE Handler - Cancel Prediction
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
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

    // Extract prediction ID from route params
    const { id } = await params;

    // Validate prediction ID
    if (!id || typeof id !== 'string' || id.trim().length === 0) {
      console.warn(`[${requestId}] Invalid prediction ID`);
      return createErrorResponse(
        'Prediction ID is required',
        'INVALID_REQUEST',
        400
      );
    }

    const predictionId = id.trim();

    console.info(`[${requestId}] Canceling prediction:`, predictionId);

    // Call Replicate API to cancel prediction
    const response = await fetch(
      `${REPLICATE_API_BASE}/predictions/${encodeURIComponent(predictionId)}/cancel`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Token ${REPLICATE_API_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'flow-editor/1.0.0',
        },
      }
    );

    // Handle API response
    if (!response.ok) {
      let errorMessage = 'Failed to cancel prediction';
      let errorDetails: Record<string, any> = {};

      try {
        errorDetails = await response.json();
        if (errorDetails.detail) {
          errorMessage = errorDetails.detail;
        } else if (errorDetails.error) {
          errorMessage = errorDetails.error;
        }
      } catch {
        // Not JSON
      }

      console.error(
        `[${requestId}] Replicate API error (${response.status}):`,
        errorMessage
      );

      return createErrorResponse(
        errorMessage,
        mapHttpStatusToErrorCode(response.status),
        response.status,
        errorDetails
      );
    }

    // Parse successful response
    const data = await response.json();

    console.info(
      `[${requestId}] Prediction canceled:`,
      predictionId,
      `Status: ${data.status}`
    );

    // Return canceled prediction
    return NextResponse.json(
      {
        ...data,
        _requestId: requestId,
        _timestamp: new Date().toISOString(),
      },
      {
        status: 200,
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
