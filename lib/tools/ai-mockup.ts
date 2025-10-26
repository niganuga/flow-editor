/**
 * AI Mockup Generation Tool
 *
 * Tool implementation for generating product mockups using AI.
 * Creates realistic product mockups for t-shirts, mugs, posters, etc.
 *
 * @module tools/ai-mockup
 */

import { z } from 'zod'

// ============================================================
// TYPES AND SCHEMAS
// ============================================================

/**
 * Product types available for mockup generation
 */
export type MockupProduct = 'tshirt' | 'hoodie' | 'mug' | 'poster' | 'phone-case' | 'tote-bag'

/**
 * Product colors
 */
export type MockupColor = 'white' | 'black' | 'gray' | 'red' | 'blue' | 'green' | 'yellow' | 'custom'

/**
 * Design placement options
 */
export type MockupPlacement = 'center' | 'left-chest' | 'full-front' | 'full-back'

/**
 * Mockup size options
 */
export type MockupSize = 'small' | 'medium' | 'large' | 'xl'

/**
 * AI mockup generation parameters
 */
export const AIMockupSchema = z.object({
  product: z.enum(['tshirt', 'hoodie', 'mug', 'poster', 'phone-case', 'tote-bag']),
  color: z.enum(['white', 'black', 'gray', 'red', 'blue', 'green', 'yellow', 'custom']),
  customColor: z.string().optional(),
  imageUrl: z.string(),
  placement: z.enum(['center', 'left-chest', 'full-front', 'full-back']).optional().default('center'),
  size: z.enum(['small', 'medium', 'large', 'xl']).optional().default('medium'),
  background: z.enum(['studio', 'lifestyle', 'plain', 'transparent']).optional().default('studio'),
  angle: z.enum(['front', 'angle', 'flat']).optional().default('front'),
  style: z.enum(['product-only', 'lifestyle-model']).optional().default('product-only'),
})

export type AIMockupParams = z.infer<typeof AIMockupSchema>

/**
 * Mockup generation result
 */
export interface AIMockupResult {
  success: boolean
  mockupUrl?: string
  predictionId?: string
  product: MockupProduct
  metadata?: {
    color: string
    placement: string
    size: string
    dimensions?: { width: number; height: number }
  }
  error?: string
  executionTime?: number
}

// ============================================================
// MOCKUP TEMPLATES
// ============================================================

/**
 * Product template configurations
 */
export const MOCKUP_TEMPLATES: Record<MockupProduct, {
  name: string
  colors: MockupColor[]
  placements: MockupPlacement[]
  sizes: MockupSize[]
  defaultPlacement: MockupPlacement
  aspectRatio: number
}> = {
  tshirt: {
    name: 'T-Shirt',
    colors: ['white', 'black', 'gray', 'red', 'blue', 'green'],
    placements: ['center', 'left-chest', 'full-front'],
    sizes: ['small', 'medium', 'large', 'xl'],
    defaultPlacement: 'center',
    aspectRatio: 1.0,
  },
  hoodie: {
    name: 'Hoodie',
    colors: ['white', 'black', 'gray', 'red', 'blue'],
    placements: ['center', 'left-chest', 'full-front'],
    sizes: ['small', 'medium', 'large', 'xl'],
    defaultPlacement: 'center',
    aspectRatio: 1.0,
  },
  mug: {
    name: 'Coffee Mug',
    colors: ['white', 'black', 'red', 'blue'],
    placements: ['center'],
    sizes: ['medium'],
    defaultPlacement: 'center',
    aspectRatio: 0.8,
  },
  poster: {
    name: 'Poster',
    colors: ['white'],
    placements: ['center'],
    sizes: ['small', 'medium', 'large'],
    defaultPlacement: 'center',
    aspectRatio: 0.7,
  },
  'phone-case': {
    name: 'Phone Case',
    colors: ['black', 'white', 'custom'],
    placements: ['center', 'full-back'],
    sizes: ['medium'],
    defaultPlacement: 'center',
    aspectRatio: 0.5,
  },
  'tote-bag': {
    name: 'Tote Bag',
    colors: ['white', 'black', 'custom'],
    placements: ['center'],
    sizes: ['medium', 'large'],
    defaultPlacement: 'center',
    aspectRatio: 1.0,
  },
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Generate a product mockup using AI
 *
 * @param params - Mockup parameters
 * @param onProgress - Progress callback
 * @returns Mockup result with URL
 *
 * @example
 * ```typescript
 * const result = await generateMockupWithAI({
 *   product: 'tshirt',
 *   color: 'white',
 *   imageUrl: designUrl,
 *   placement: 'center',
 *   size: 'medium'
 * })
 *
 * if (result.success && result.mockupUrl) {
 *   // Display mockup in UI
 *   showMockup(result.mockupUrl)
 * }
 * ```
 */
export async function generateMockupWithAI(
  params: AIMockupParams,
  onProgress?: (progress: number, message: string) => void
): Promise<AIMockupResult> {
  const startTime = Date.now()

  try {
    console.log('[AI Mockup] Starting mockup generation:', params.product)

    // Validate parameters
    const validated = AIMockupSchema.parse(params)

    // Get template configuration
    const template = MOCKUP_TEMPLATES[validated.product]
    if (!template) {
      throw new Error(`Unknown product type: ${validated.product}`)
    }

    // Validate placement for product
    if (!template.placements.includes(validated.placement)) {
      validated.placement = template.defaultPlacement
      console.warn(`[AI Mockup] Invalid placement for ${validated.product}, using default: ${validated.placement}`)
    }

    // Report initial progress
    onProgress?.(10, `Preparing ${template.name} mockup...`)

    // Prepare image data
    let imageData = validated.imageUrl
    if (imageData.startsWith('blob:')) {
      console.log('[AI Mockup] Converting blob URL to data URL...')
      const response = await fetch(imageData)
      const blob = await response.blob()

      imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }

    onProgress?.(20, 'Sending to mockup generator...')

    // Determine actual color
    const actualColor = validated.color === 'custom'
      ? (validated.customColor || '#FFFFFF')
      : validated.color

    // Call Replicate API endpoint
    const apiResponse = await fetch('/api/replicate/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'mockup',
        params: {
          product: validated.product,
          color: actualColor,
          imageUrl: imageData,
          placement: validated.placement,
          size: validated.size,
          background: validated.background,
          angle: validated.angle,
          style: validated.style,
        },
      }),
    })

    if (!apiResponse.ok) {
      const error = await apiResponse.json()
      throw new Error(error.error || `API error: ${apiResponse.status}`)
    }

    const { predictionId, status } = await apiResponse.json()

    console.log('[AI Mockup] Prediction created:', predictionId)
    onProgress?.(30, 'Generating mockup...')

    // Poll for results
    let attempts = 0
    const maxAttempts = 60 // 2 minutes max
    const pollInterval = 2000 // 2 seconds

    while (attempts < maxAttempts) {
      const statusResponse = await fetch(`/api/replicate/predict?predictionId=${predictionId}`)

      if (!statusResponse.ok) {
        throw new Error('Failed to check prediction status')
      }

      const statusData = await statusResponse.json()
      const prediction = statusData.prediction

      // Update progress based on status
      const progressPercent = 30 + (attempts / maxAttempts) * 60
      onProgress?.(progressPercent, `Rendering ${template.name}...`)

      if (prediction.status === 'succeeded') {
        console.log('[AI Mockup] Mockup generated successfully')

        // For demo purposes, create a simulated mockup
        // In production, this would be the actual Replicate output URL
        let mockupUrl: string

        if (prediction.output === 'MOCKUP_GENERATED' || !prediction.output) {
          // Demo mode: create simulated mockup
          mockupUrl = await createSimulatedMockup(validated, imageData)
        } else {
          // Production mode: use actual Replicate output
          mockupUrl = Array.isArray(prediction.output)
            ? prediction.output[0]
            : prediction.output
        }

        onProgress?.(90, 'Finalizing mockup...')
        onProgress?.(100, 'Mockup complete!')

        const executionTime = Date.now() - startTime

        return {
          success: true,
          mockupUrl,
          predictionId,
          product: validated.product,
          metadata: {
            color: actualColor,
            placement: validated.placement,
            size: validated.size,
            dimensions: {
              width: 1000,
              height: Math.round(1000 / template.aspectRatio),
            },
          },
          executionTime,
        }
      }

      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'Mockup generation failed')
      }

      if (prediction.status === 'canceled') {
        throw new Error('Generation was canceled')
      }

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      attempts++
    }

    throw new Error('Mockup generation timed out')

  } catch (error) {
    console.error('[AI Mockup] Error:', error)

    return {
      success: false,
      product: params.product,
      error: error instanceof Error ? error.message : 'Mockup generation failed',
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Create a simulated mockup for demonstration
 * In production, this would be replaced with actual AI generation
 */
async function createSimulatedMockup(
  params: AIMockupParams,
  imageData: string
): Promise<string> {
  // Create a canvas for the mockup
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Failed to create canvas context')

  const template = MOCKUP_TEMPLATES[params.product]
  canvas.width = 1000
  canvas.height = Math.round(1000 / template.aspectRatio)

  // Fill background
  ctx.fillStyle = params.background === 'transparent' ? 'transparent' : '#F5F5F5'
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  // Draw product shape (simplified)
  ctx.fillStyle = params.color === 'custom' ? (params.customColor || '#FFFFFF') : params.color

  switch (params.product) {
    case 'tshirt':
    case 'hoodie':
      // Draw simplified shirt shape
      ctx.fillRect(200, 150, 600, 700)
      break
    case 'mug':
      // Draw simplified mug shape
      ctx.fillRect(350, 200, 300, 400)
      break
    case 'poster':
      // Draw poster frame
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 10
      ctx.strokeRect(100, 100, 800, 1100)
      break
    default:
      ctx.fillRect(200, 200, 600, 600)
  }

  // Load and place the design image
  const img = new Image()
  img.src = imageData

  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  // Calculate placement position
  let x = 0, y = 0, width = 0, height = 0

  switch (params.placement) {
    case 'center':
      width = canvas.width * 0.4
      height = (img.height / img.width) * width
      x = (canvas.width - width) / 2
      y = (canvas.height - height) / 2
      break
    case 'left-chest':
      width = canvas.width * 0.15
      height = (img.height / img.width) * width
      x = canvas.width * 0.3
      y = canvas.height * 0.25
      break
    case 'full-front':
      width = canvas.width * 0.6
      height = (img.height / img.width) * width
      x = (canvas.width - width) / 2
      y = (canvas.height - height) / 2
      break
    case 'full-back':
      width = canvas.width * 0.8
      height = (img.height / img.width) * width
      x = (canvas.width - width) / 2
      y = (canvas.height - height) / 2
      break
  }

  // Draw the design on the product
  ctx.drawImage(img, x, y, width, height)

  // Add some text overlay
  ctx.fillStyle = '#666'
  ctx.font = '14px sans-serif'
  ctx.fillText(`${template.name} Mockup - ${params.size.toUpperCase()}`, 20, canvas.height - 20)

  // Convert to blob URL
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(URL.createObjectURL(blob))
      } else {
        reject(new Error('Failed to create mockup blob'))
      }
    }, 'image/png')
  })
}

/**
 * Get recommended products for a design type
 */
export function getRecommendedProducts(designType: 'logo' | 'photo' | 'pattern' | 'text'): MockupProduct[] {
  const recommendations: Record<typeof designType, MockupProduct[]> = {
    logo: ['tshirt', 'hoodie', 'mug', 'tote-bag'],
    photo: ['poster', 'phone-case', 'tshirt'],
    pattern: ['tote-bag', 'phone-case', 'tshirt'],
    text: ['tshirt', 'poster', 'mug'],
  }

  return recommendations[designType] || ['tshirt', 'mug', 'poster']
}

/**
 * Get size dimensions for product and size
 */
export function getProductDimensions(product: MockupProduct, size: MockupSize): {
  width: number
  height: number
  printArea: { width: number; height: number }
} {
  const dimensions: Record<MockupProduct, Record<MockupSize, any>> = {
    tshirt: {
      small: { width: 18, height: 28, printArea: { width: 12, height: 16 } },
      medium: { width: 20, height: 29, printArea: { width: 14, height: 18 } },
      large: { width: 22, height: 30, printArea: { width: 14, height: 18 } },
      xl: { width: 24, height: 31, printArea: { width: 16, height: 20 } },
    },
    hoodie: {
      small: { width: 20, height: 27, printArea: { width: 12, height: 16 } },
      medium: { width: 22, height: 28, printArea: { width: 14, height: 18 } },
      large: { width: 24, height: 29, printArea: { width: 14, height: 18 } },
      xl: { width: 26, height: 30, printArea: { width: 16, height: 20 } },
    },
    mug: {
      small: { width: 11, height: 11, printArea: { width: 8, height: 3.5 } },
      medium: { width: 11, height: 11, printArea: { width: 8, height: 3.5 } },
      large: { width: 11, height: 11, printArea: { width: 8, height: 3.5 } },
      xl: { width: 11, height: 11, printArea: { width: 8, height: 3.5 } },
    },
    poster: {
      small: { width: 11, height: 17, printArea: { width: 11, height: 17 } },
      medium: { width: 18, height: 24, printArea: { width: 18, height: 24 } },
      large: { width: 24, height: 36, printArea: { width: 24, height: 36 } },
      xl: { width: 24, height: 36, printArea: { width: 24, height: 36 } },
    },
    'phone-case': {
      small: { width: 2.5, height: 5, printArea: { width: 2.5, height: 5 } },
      medium: { width: 2.5, height: 5, printArea: { width: 2.5, height: 5 } },
      large: { width: 2.5, height: 5, printArea: { width: 2.5, height: 5 } },
      xl: { width: 2.5, height: 5, printArea: { width: 2.5, height: 5 } },
    },
    'tote-bag': {
      small: { width: 15, height: 16, printArea: { width: 12, height: 12 } },
      medium: { width: 15, height: 16, printArea: { width: 12, height: 12 } },
      large: { width: 18, height: 18, printArea: { width: 14, height: 14 } },
      xl: { width: 18, height: 18, printArea: { width: 14, height: 14 } },
    },
  }

  return dimensions[product]?.[size] || dimensions.tshirt.medium
}

// ============================================================
// TOOL DEFINITION FOR ORCHESTRATOR
// ============================================================

/**
 * Tool definition for AI orchestrator registration
 */
export const aiMockupTool = {
  name: 'generate_mockup',
  description: 'Generate product mockups with TWO MODES: (1) style="product-only" for flat-lay product photography, (2) style="lifestyle-model" for models/people wearing garments. CRITICAL: When user mentions "model", "person", "wearing", or "lifestyle", you MUST include style="lifestyle-model" parameter. Default is "product-only" if style not specified. Examples: "model wearing hoodie" requires style="lifestyle-model", "mockup on tshirt" uses style="product-only".',
  parameters: {
    type: 'object',
    properties: {
      product: {
        type: 'string',
        enum: ['tshirt', 'hoodie', 'mug', 'poster', 'phone-case', 'tote-bag'],
        description: 'Product type for mockup',
      },
      color: {
        type: 'string',
        enum: ['white', 'black', 'gray', 'red', 'blue', 'green', 'yellow', 'custom'],
        description: 'Product color',
        default: 'white',
      },
      customColor: {
        type: 'string',
        description: 'Custom hex color (if color is "custom")',
      },
      placement: {
        type: 'string',
        enum: ['center', 'left-chest', 'full-front', 'full-back'],
        description: 'Design placement on product',
        default: 'center',
      },
      size: {
        type: 'string',
        enum: ['small', 'medium', 'large', 'xl'],
        description: 'Product size',
        default: 'medium',
      },
      style: {
        type: 'string',
        enum: ['product-only', 'lifestyle-model'],
        description: 'REQUIRED when user mentions model/person/wearing/lifestyle. Use "lifestyle-model" for models wearing garments, "product-only" for flat product shots. MUST be "lifestyle-model" if request contains: model, person, wearing, worn, lifestyle',
        default: 'product-only',
      },
    },
    required: ['product', 'style'],
  },
  execute: async (params: any, imageUrl: string) => {
    const result = await generateMockupWithAI({
      ...params,
      imageUrl,
    })

    return {
      success: result.success,
      mockupUrl: result.mockupUrl,
      metadata: result.metadata,
      error: result.error,
    }
  },
}