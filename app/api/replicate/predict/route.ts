/**
 * Replicate API Prediction Route
 *
 * Handles creating and polling Replicate predictions for AI image editing
 * and mockup generation.
 *
 * @module api/replicate/predict
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getReplicateClient, ReplicateError, type PredictionStatus } from '@/lib/replicate-client'
import Replicate from 'replicate'

// In-memory storage for demo purposes (replace with Redis/DB in production)
const predictionStorage = new Map<string, {
  status: PredictionStatus
  output: string | null
  imageData: string
  type: 'edit' | 'mockup' | 'custom'
  params: any
}>()

// ============================================================
// REQUEST SCHEMAS
// ============================================================

/**
 * Create prediction request schema
 */
const CreatePredictionSchema = z.object({
  type: z.enum(['edit', 'mockup', 'custom']),
  params: z.record(z.any()),
})

/**
 * Get prediction status request schema
 */
const GetPredictionSchema = z.object({
  predictionId: z.string(),
})

// ============================================================
// ROUTE HANDLERS
// ============================================================

/**
 * POST /api/replicate/predict
 * Create a new prediction
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[API] Creating Replicate prediction')

    // Parse request body
    const body = await request.json()
    const { type, params } = CreatePredictionSchema.parse(body)

    // Get Replicate client
    const client = getReplicateClient()

    // Handle different prediction types
    let predictionId: string
    let resultUrl: string | null = null

    switch (type) {
      case 'edit': {
        predictionId = `pred_${Date.now()}_${Math.random().toString(36).substring(7)}`

        console.log('[API] Processing image edit request')
        console.log('[API] REPLICATE_API_KEY exists:', !!process.env.REPLICATE_API_KEY)
        console.log('[API] REPLICATE_API_KEY prefix:', process.env.REPLICATE_API_KEY?.substring(0, 3))

        // Check if we have a real API key
        const hasApiKey = process.env.REPLICATE_API_KEY && process.env.REPLICATE_API_KEY.startsWith('r8_')
        console.log('[API] Using real Replicate API:', hasApiKey)

        if (hasApiKey) {
          // Production mode: Use actual Replicate API
          console.log('[API] Using real Replicate API for editing')

          // Store as processing initially
          predictionStorage.set(predictionId, {
            status: 'processing',
            output: null,
            imageData: params.imageUrl,
            type: 'edit',
            params
          })

          // Call Replicate API asynchronously
          ;(async () => {
            try {
              const replicate = new Replicate({
                auth: process.env.REPLICATE_API_KEY!
              })

              console.log('[API] Calling Replicate model qwen/qwen-image-edit-plus')

              const output = await replicate.run(
                "qwen/qwen-image-edit-plus",
                {
                  input: {
                    image: [params.imageUrl],  // Model expects array format
                    prompt: params.prompt,
                    aspect_ratio: 'match_input_image',
                    output_format: 'webp',
                    output_quality: 95,
                    go_fast: true
                  }
                }
              )

              console.log('[API] Replicate output received:', output)
              console.log('[API] Output type:', typeof output)
              console.log('[API] Output is array:', Array.isArray(output))

              // Handle the output - Replicate can return URLs or ReadableStreams
              let resultUrl: string

              // Get the first item if array
              const outputItem = Array.isArray(output) ? output[0] : output

              // If it's a ReadableStream, we need to convert it to a data URL
              if (outputItem && typeof outputItem === 'object' && 'getReader' in outputItem) {
                console.log('[API] Output is a ReadableStream, converting to data URL...')

                const reader = outputItem.getReader()
                const chunks: Uint8Array[] = []

                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  chunks.push(value)
                }

                // Combine chunks into a single buffer
                const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
                const buffer = new Uint8Array(totalLength)
                let offset = 0
                for (const chunk of chunks) {
                  buffer.set(chunk, offset)
                  offset += chunk.length
                }

                // Convert to base64 data URL
                const base64 = Buffer.from(buffer).toString('base64')
                resultUrl = `data:image/webp;base64,${base64}`
                console.log('[API] Converted stream to data URL, size:', base64.length, 'bytes')
              } else if (typeof outputItem === 'string') {
                // It's already a URL string
                resultUrl = outputItem
                console.log('[API] Output is URL string:', resultUrl)
              } else {
                throw new Error('Unexpected output format from Replicate')
              }

              // Update storage with result
              const storedPred = predictionStorage.get(predictionId)
              if (storedPred) {
                storedPred.status = 'succeeded'
                storedPred.output = resultUrl
                predictionStorage.set(predictionId, storedPred)
                console.log('[API] Real Replicate edit completed:', predictionId)
              }
            } catch (error) {
              console.error('[API] Replicate error:', error)
              const storedPred = predictionStorage.get(predictionId)
              if (storedPred) {
                storedPred.status = 'failed'
                predictionStorage.set(predictionId, storedPred)
              }
            }
          })()
        } else {
          // Demo mode: return original image
          console.log('[API Demo] Using demo mode (no API key)')
          predictionStorage.set(predictionId, {
            status: 'succeeded',
            output: params.imageUrl,
            imageData: params.imageUrl,
            type: 'edit',
            params
          })
        }

        break
      }

      case 'mockup': {
        console.log('[API] Processing mockup generation request')

        // Check if we have a real API key
        const hasApiKey = process.env.REPLICATE_API_KEY && process.env.REPLICATE_API_KEY.startsWith('r8_')
        console.log('[API] Using real Replicate API for mockup:', hasApiKey)

        predictionId = `pred_${Date.now()}_${Math.random().toString(36).substring(7)}`

        if (hasApiKey) {
          // Production mode: Use qwen-image-edit-plus with single image
          console.log('[API] Using qwen-image-edit-plus for mockup generation')

          // Store as processing initially
          predictionStorage.set(predictionId, {
            status: 'processing',
            output: null,
            imageData: params.imageUrl,
            type: 'mockup',
            params
          })

          // Call Replicate API asynchronously
          ;(async () => {
            try {
              const replicate = new Replicate({
                auth: process.env.REPLICATE_API_KEY!
              })

              // Build the prompt for mockup generation using single image
              const mockupPrompt = buildMockupPrompt(params.product, params.color, params.placement, params.style)

              // Determine aspect ratio based on style
              const aspectRatio = params.style === 'lifestyle-model' ? '3:4' : '1:1'

              console.log('[API] Calling qwen for mockup with prompt:', mockupPrompt)
              console.log('[API] Style:', params.style, 'Aspect ratio:', aspectRatio)

              const output = await replicate.run(
                "qwen/qwen-image-edit-plus",
                {
                  input: {
                    image: [params.imageUrl], // Single image input
                    prompt: mockupPrompt,
                    aspect_ratio: aspectRatio, // Portrait for lifestyle, square for product
                    output_format: 'webp',
                    output_quality: 95,
                    go_fast: true
                  }
                }
              )

              console.log('[API] Mockup output received:', output)
              console.log('[API] Output type:', typeof output)
              console.log('[API] Output is array:', Array.isArray(output))

              // Handle the output - Replicate can return URLs or ReadableStreams
              let resultUrl: string

              // Get the first item if array
              const outputItem = Array.isArray(output) ? output[0] : output

              // If it's a ReadableStream, we need to convert it to a data URL
              if (outputItem && typeof outputItem === 'object' && 'getReader' in outputItem) {
                console.log('[API] Mockup output is a ReadableStream, converting to data URL...')

                const reader = outputItem.getReader()
                const chunks: Uint8Array[] = []

                while (true) {
                  const { done, value } = await reader.read()
                  if (done) break
                  chunks.push(value)
                }

                // Combine chunks into a single buffer
                const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
                const buffer = new Uint8Array(totalLength)
                let offset = 0
                for (const chunk of chunks) {
                  buffer.set(chunk, offset)
                  offset += chunk.length
                }

                // Convert to base64 data URL
                const base64 = Buffer.from(buffer).toString('base64')
                resultUrl = `data:image/webp;base64,${base64}`
                console.log('[API] Converted mockup stream to data URL, size:', base64.length, 'bytes')
              } else if (typeof outputItem === 'string') {
                // It's already a URL string
                resultUrl = outputItem
                console.log('[API] Mockup output is URL string:', resultUrl)
              } else {
                throw new Error('Unexpected output format from Replicate')
              }

              // Update storage with result
              const storedPred = predictionStorage.get(predictionId)
              if (storedPred) {
                storedPred.status = 'succeeded'
                storedPred.output = resultUrl
                predictionStorage.set(predictionId, storedPred)
                console.log('[API] Real Replicate mockup completed:', predictionId)
              }
            } catch (error) {
              console.error('[API] Mockup error:', error)
              const storedPred = predictionStorage.get(predictionId)
              if (storedPred) {
                storedPred.status = 'failed'
                predictionStorage.set(predictionId, storedPred)
              }
            }
          })()
        } else {
          // Demo mode: return signal for simulated mockup
          console.log('[API Demo] Using demo mode (no API key)')
          predictionStorage.set(predictionId, {
            status: 'succeeded',
            output: 'MOCKUP_GENERATED', // Signal to create mockup in ai-mockup.ts
            imageData: params.imageUrl,
            type: 'mockup',
            params
          })
        }

        break
      }

      case 'custom': {
        console.log('[API Demo] Processing custom model request')

        const { version, input } = params
        if (!version || !input) {
          throw new Error('Custom predictions require version and input')
        }

        // For demonstration, we'll simulate the API call
        predictionId = `pred_${Date.now()}_${Math.random().toString(36).substring(7)}`

        // Store prediction data for demo - immediately return as succeeded
        predictionStorage.set(predictionId, {
          status: 'succeeded',
          output: input.image,
          imageData: input.image || '',
          type: 'custom',
          params
        })

        console.log('[API Demo] Custom model completed immediately:', predictionId)

        break
      }

      default:
        throw new Error(`Unknown prediction type: ${type}`)
    }

    // Return prediction ID for polling
    return NextResponse.json({
      success: true,
      predictionId,
      status: 'starting' as PredictionStatus,
      message: 'Prediction created, processing...',
    })

  } catch (error) {
    console.error('[API] Prediction creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        },
        { status: 400 }
      )
    }

    if (error instanceof ReplicateError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          statusCode: error.statusCode,
        },
        { status: error.statusCode || 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/replicate/predict?predictionId=xxx
 * Get prediction status
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Getting prediction status')

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const predictionId = searchParams.get('predictionId')

    if (!predictionId) {
      throw new Error('predictionId is required')
    }

    // For demonstration, get from in-memory storage
    // In production, you'd use: const prediction = await client.getPrediction(predictionId)
    const storedPrediction = predictionStorage.get(predictionId)

    if (!storedPrediction) {
      // If not in storage, return starting status (for race conditions)
      return NextResponse.json({
        success: true,
        prediction: {
          id: predictionId,
          status: 'starting' as PredictionStatus,
          output: null,
          metrics: {
            predict_time: 0,
          },
        },
      })
    }

    return NextResponse.json({
      success: true,
      prediction: {
        id: predictionId,
        status: storedPrediction.status,
        output: storedPrediction.output,
        metrics: {
          predict_time: Math.random() * 10,
        },
      },
    })

  } catch (error) {
    console.error('[API] Get prediction error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get prediction',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/replicate/predict?predictionId=xxx
 * Cancel a prediction
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('[API] Canceling prediction')

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams
    const predictionId = searchParams.get('predictionId')

    if (!predictionId) {
      throw new Error('predictionId is required')
    }

    // Get Replicate client
    const client = getReplicateClient()

    // In production: await client.cancelPrediction(predictionId)
    console.log('[API] Would cancel prediction:', predictionId)

    return NextResponse.json({
      success: true,
      message: 'Prediction canceled',
    })

  } catch (error) {
    console.error('[API] Cancel prediction error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel prediction',
      },
      { status: 500 }
    )
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Build mockup prompt for single-image generation
 *
 * @param product - Product type (tshirt, hoodie, etc.)
 * @param color - Product color (white, black, etc.)
 * @param placement - Design placement (center, left-chest, etc.)
 * @param style - Mockup style (product-only or lifestyle-model)
 * @returns Prompt string for qwen model
 */
function buildMockupPrompt(product: string, color: string = 'white', placement: string = 'center', style: string = 'product-only'): string {
  // Product descriptions
  const productDescriptions: Record<string, string> = {
    'tshirt': 'a clean, professional t-shirt',
    'hoodie': 'a comfortable pullover hoodie',
    'longsleeve': 'a long-sleeve t-shirt',
    'tank': 'a tank top',
    'sweatshirt': 'a crew neck sweatshirt'
  }

  // Placement descriptions
  const placementDescriptions: Record<string, string> = {
    'center': 'centered on the chest area, medium size',
    'left-chest': 'on the left chest area as a small logo placement',
    'full-front': 'covering the full front area from chest to waist',
    'full-back': 'covering the full back area',
    'oversized': 'as a large, oversized print centered on the chest'
  }

  const productDesc = productDescriptions[product] || productDescriptions['tshirt']
  const placementDesc = placementDescriptions[placement] || placementDescriptions['center']

  // LIFESTYLE/MODEL SHOT
  if (style === 'lifestyle-model') {
    return `Create a professional lifestyle photograph showing a model/person wearing ${productDesc} in ${color} color with this design ${placementDesc}.

CRITICAL REQUIREMENTS FOR LIFESTYLE PHOTOGRAPHY:
• Show a real person/model wearing the garment naturally and confidently
• The model should be in a casual, lifestyle setting (urban street, coffee shop, outdoor setting, studio backdrop, etc.)
• Integrate the design naturally into the fabric - it should look genuinely PRINTED on the garment
• Apply realistic fabric integration: subtle transparency (85-95% opacity) so fabric texture shows through the design
• The design should follow the natural folds, wrinkles, and body contours of the worn garment
• Use natural or studio lighting that creates realistic shadows and highlights
• Show the design slightly faded into the fabric, as real screen-printed or DTG designs appear
• Fabric texture grain should be visible through the design areas
• The model should be styled appropriately for the garment type (casual streetwear, athletic wear, etc.)
• Natural poses and expressions - NOT stiff or overly posed
• Professional photography quality with proper depth of field
• Background should complement but not distract from the apparel

The final result should look like professional lifestyle/marketing photography where the design is genuinely printed on the garment being worn by a real person. This is lifestyle imagery for e-commerce or social media marketing.`
  }

  // PRODUCT-ONLY FLAT-LAY
  return `Create a highly realistic product mockup showing this design printed on ${productDesc} in ${color} color. The design should be ${placementDesc}.

CRITICAL REALISM REQUIREMENTS:
• Integrate the design naturally into the fabric - it should look PRINTED, not overlaid
• Apply subtle transparency (85-95% opacity) so the fabric texture shows through the design
• Use a soft blend mode (multiply or overlay) to reveal the underlying fabric weave and texture
• Match the design to the fabric's natural folds, wrinkles, and contours - the design should bend and flow with the garment
• Add natural lighting that creates subtle shadows and highlights on both the design and fabric
• Ensure the design appears slightly faded into the fabric, as real screen-printed or DTG designs do
• Show fabric texture grain visible through the design areas
• Apply environmental lighting that affects both the garment and the printed design equally

The final result should look like a professional product photography shot where the design has been genuinely printed on the fabric, not digitally placed. Show natural fabric draping, realistic product styling, and studio-quality lighting on a clean background.`
}