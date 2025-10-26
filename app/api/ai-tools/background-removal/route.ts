/**
 * Background Removal V1 API Route
 * Uses Bria Product Cutout (bria/product-cutout)
 */

import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 60;

interface BackgroundRemovalRequest {
  imageUrl: string;
  includeQualityValidation?: boolean;
}

// Bria Product Cutout configuration
const BRIA_CONFIG = {
  model: 'bria/product-cutout',
  name: 'Bria Product Cutout',
  cost: 0.018,
};

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || process.env.REPLICATE_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body: BackgroundRemovalRequest = await request.json();

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

    console.log('[BG Removal] Starting with Bria Product Cutout...');

    // Start timing
    const startTime = Date.now();

    // Create Replicate client
    const replicate = new Replicate({
      auth: REPLICATE_API_TOKEN!
    });

    // Run the model
    console.log('[BG Removal] Calling Replicate model:', BRIA_CONFIG.model);
    const output = await replicate.run(
      BRIA_CONFIG.model,
      {
        input: {
          image: body.imageUrl
        }
      }
    );

    console.log('[BG Removal] Output received:', output);
    console.log('[BG Removal] Output type:', typeof output);

    // Handle the output - could be URL string or ReadableStream
    let resultUrl: string;

    if (typeof output === 'object' && output !== null && 'getReader' in output) {
      // It's a ReadableStream
      console.log('[BG Removal] Output is a ReadableStream, converting to data URL...');

      const reader = (output as any).getReader();
      const chunks: Uint8Array[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }

      // Combine chunks
      const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
      const buffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        buffer.set(chunk, offset);
        offset += chunk.length;
      }

      // Convert to base64 data URL
      const base64 = Buffer.from(buffer).toString('base64');
      resultUrl = `data:image/png;base64,${base64}`;
      console.log('[BG Removal] Converted stream to data URL, size:', base64.length, 'bytes');
    } else if (typeof output === 'string') {
      // It's already a URL string - download and convert to data URL
      console.log('[BG Removal] Output is URL string, downloading...');
      const imageResponse = await fetch(output);
      const imageBlob = await imageResponse.blob();
      const arrayBuffer = await imageBlob.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      resultUrl = `data:${imageBlob.type};base64,${base64}`;
    } else {
      throw new Error('Unexpected output format from Replicate');
    }

    const duration = Date.now() - startTime;
    console.log('[BG Removal] Processing complete in', duration, 'ms');

    return NextResponse.json({
      success: true,
      output: resultUrl,
      model: BRIA_CONFIG.name,
      duration,
      cost: BRIA_CONFIG.cost,
    });
  } catch (error) {
    console.error('[BG Removal] Error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const statusCode = errorMessage.includes('Authentication') ? 401 : 500;

    return NextResponse.json(
      {
        error: errorMessage,
        model: BRIA_CONFIG.name,
      },
      { status: statusCode }
    );
  }
}
