/**
 * Background Removal V2 API Route
 * Uses BRIA RMBG 2.0 with 256-level alpha transparency
 */

import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 60;

interface BackgroundRemovalV2Request {
  imageUrl: string;
  settings?: {
    preserve_alpha?: boolean;
    custom_threshold?: number;
    fallback_to_v1?: boolean;
  };
  includeQualityValidation?: boolean;
}

// BRIA Product Cutout configuration (high-res support for product images)
const BRIA_V2_CONFIG = {
  model: 'bria/product-cutout',
  version: 'latest', // Using latest version for best quality
  name: 'BRIA Product Cutout',
  cost: 0.018,
  description: 'High-resolution product cutout with 256-level alpha transparency',
};

const REPLICATE_API_TOKEN = process.env["REPLICATE_API_TOKEN"] || process.env["REPLICATE_API_KEY"];

export async function POST(request: NextRequest) {
  try {
    const body: BackgroundRemovalV2Request = await request.json();

    // Validate request
    if (!body.imageUrl) {
      return NextResponse.json(
        { error: 'imageUrl is required' },
        { status: 400 }
      );
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json(
        { error: 'Replicate API token not configured' },
        { status: 500 }
      );
    }

    console.log('[BG Removal V2] Starting with BRIA Product Cutout (high-res support)...');

    // Start timing
    const startTime = Date.now();

    // Build input for RMBG 2.0
    const input: Record<string, any> = {
      image: body.imageUrl,
    };

    // Add optional settings for RMBG 2.0
    if (body.settings?.preserve_alpha !== undefined) {
      input['preserve_partial_alpha'] = body.settings.preserve_alpha; // RMBG 2.0 uses 'preserve_partial_alpha'
    }

    // Create prediction directly with Replicate API
    // Use model name for product-cutout (latest version)
    const createResponse = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
      body: JSON.stringify({
        model: BRIA_V2_CONFIG.model,
        input,
      }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      console.error('[BG Removal V2] Replicate API error:', createResponse.status, errorData);
      throw new Error(errorData.detail || 'Failed to create prediction');
    }

    const prediction = await createResponse.json();
    console.log('[BG Removal V2] Prediction created:', prediction.id);

    // Poll for completion
    let completed = prediction;
    let retries = 0;
    const maxRetries = 60;

    while (
      completed.status !== 'succeeded' &&
      completed.status !== 'failed' &&
      completed.status !== 'canceled' &&
      retries < maxRetries
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${prediction.id}`,
        {
          headers: {
            Authorization: `Token ${REPLICATE_API_TOKEN}`,
          },
        }
      );

      completed = await statusResponse.json();
      retries++;
    }

    if (completed.status === 'failed') {
      throw new Error(completed.error || 'Processing failed');
    }

    if (completed.status === 'canceled') {
      throw new Error('Processing was canceled');
    }

    // Extract output URL
    const outputUrl = Array.isArray(completed.output)
      ? completed.output[0]
      : completed.output;

    if (!outputUrl) {
      throw new Error('No output URL in response');
    }

    console.log('[BG Removal V2] Processing complete');

    // Download result and convert to blob URL
    const imageResponse = await fetch(outputUrl);
    const imageBlob = await imageResponse.blob();

    // Convert blob to data URL for client
    const arrayBuffer = await imageBlob.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    const resultUrl = `data:${imageBlob.type};base64,${base64}`;

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      output: resultUrl,
      model: BRIA_V2_CONFIG.name,
      version: 'v2',
      duration,
      cost: BRIA_V2_CONFIG.cost,
    });
  } catch (error) {
    console.error('[BG Removal V2] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('Authentication') ? 401 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        model: BRIA_V2_CONFIG.name,
        version: 'v2',
      },
      { status: statusCode }
    );
  }
}
