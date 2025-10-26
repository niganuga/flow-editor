/**
 * Replicate API Client
 *
 * Handles communication with Replicate API for AI-driven image editing
 * and mockup generation using models like qwen/qwen-image-edit-plus.
 *
 * @module replicate-client
 */

import { z } from 'zod'

// ============================================================
// TYPES AND SCHEMAS
// ============================================================

/**
 * Replicate prediction status
 */
export type PredictionStatus =
  | 'starting'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'

/**
 * Replicate prediction response
 */
export interface ReplicatePrediction {
  id: string
  status: PredictionStatus
  input: Record<string, any>
  output?: string | string[] | null
  error?: string | null
  logs?: string
  metrics?: {
    predict_time?: number
  }
  created_at: string
  started_at?: string
  completed_at?: string
  version: string
  urls?: {
    get: string
    cancel?: string
  }
}

/**
 * Edit image parameters
 */
export const EditImageSchema = z.object({
  prompt: z.string().describe('Editing instruction (e.g., "remove background", "make colors brighter")'),
  imageUrl: z.string().url().or(z.string().startsWith('data:')),
  model: z.enum(['qwen/qwen-image-edit-plus', 'stability-ai/stable-diffusion']).optional().default('qwen/qwen-image-edit-plus'),
  strength: z.number().min(0).max(1).optional().default(0.75),
  guidance_scale: z.number().min(1).max(20).optional().default(7.5),
  negative_prompt: z.string().optional(),
})

export type EditImageParams = z.infer<typeof EditImageSchema>

/**
 * Mockup generation parameters
 */
export const GenerateMockupSchema = z.object({
  product: z.enum(['tshirt', 'hoodie', 'mug', 'poster', 'phone-case', 'tote-bag']),
  color: z.enum(['white', 'black', 'gray', 'red', 'blue', 'green', 'yellow', 'custom']),
  customColor: z.string().optional(), // Hex color for custom
  imageUrl: z.string().url().or(z.string().startsWith('data:')),
  placement: z.enum(['center', 'left-chest', 'full-front', 'full-back']).optional().default('center'),
  size: z.enum(['small', 'medium', 'large', 'xl']).optional().default('medium'),
})

export type GenerateMockupParams = z.infer<typeof GenerateMockupSchema>

/**
 * Replicate API error
 */
export class ReplicateError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public prediction?: ReplicatePrediction
  ) {
    super(message)
    this.name = 'ReplicateError'
  }
}

// ============================================================
// CLIENT CLASS
// ============================================================

/**
 * Replicate API client for AI image operations
 */
export class ReplicateClient {
  private apiKey: string
  private baseUrl = 'https://api.replicate.com/v1'
  private maxPollAttempts = 60 // 60 attempts = ~2 minutes max
  private pollInterval = 2000 // 2 seconds between polls

  constructor(apiKey?: string) {
    const key = apiKey || process.env.REPLICATE_API_KEY
    if (!key) {
      throw new Error('REPLICATE_API_KEY is required')
    }
    this.apiKey = key
  }

  /**
   * Create headers for API requests
   */
  private getHeaders(): HeadersInit {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Convert image URL to base64 if needed
   */
  private async prepareImageInput(imageUrl: string): Promise<string> {
    // If already a data URL or external URL, return as is
    if (imageUrl.startsWith('data:') || imageUrl.startsWith('http')) {
      return imageUrl
    }

    // If blob URL, fetch and convert to data URL
    if (imageUrl.startsWith('blob:')) {
      const response = await fetch(imageUrl)
      const blob = await response.blob()

      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }

    return imageUrl
  }

  /**
   * Create a prediction
   */
  async createPrediction(
    version: string,
    input: Record<string, any>
  ): Promise<ReplicatePrediction> {
    console.log('[ReplicateClient] Creating prediction with version:', version)

    const response = await fetch(`${this.baseUrl}/predictions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        version,
        input,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ReplicateError(
        `Failed to create prediction: ${error}`,
        response.status
      )
    }

    const prediction = await response.json()
    console.log('[ReplicateClient] Prediction created:', prediction.id)

    return prediction
  }

  /**
   * Get prediction status
   */
  async getPrediction(predictionId: string): Promise<ReplicatePrediction> {
    const response = await fetch(`${this.baseUrl}/predictions/${predictionId}`, {
      headers: this.getHeaders(),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new ReplicateError(
        `Failed to get prediction: ${error}`,
        response.status
      )
    }

    return response.json()
  }

  /**
   * Cancel a prediction
   */
  async cancelPrediction(predictionId: string): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/predictions/${predictionId}/cancel`,
      {
        method: 'POST',
        headers: this.getHeaders(),
      }
    )

    if (!response.ok) {
      const error = await response.text()
      throw new ReplicateError(
        `Failed to cancel prediction: ${error}`,
        response.status
      )
    }
  }

  /**
   * Poll for prediction completion
   */
  async pollPrediction(
    predictionId: string,
    onProgress?: (status: PredictionStatus, logs?: string) => void
  ): Promise<ReplicatePrediction> {
    console.log('[ReplicateClient] Polling prediction:', predictionId)

    let attempts = 0

    while (attempts < this.maxPollAttempts) {
      const prediction = await this.getPrediction(predictionId)

      if (onProgress) {
        onProgress(prediction.status, prediction.logs)
      }

      // Check terminal states
      if (prediction.status === 'succeeded') {
        console.log('[ReplicateClient] Prediction succeeded')
        return prediction
      }

      if (prediction.status === 'failed') {
        throw new ReplicateError(
          prediction.error || 'Prediction failed',
          undefined,
          prediction
        )
      }

      if (prediction.status === 'canceled') {
        throw new ReplicateError(
          'Prediction was canceled',
          undefined,
          prediction
        )
      }

      // Still processing, wait and retry
      await new Promise(resolve => setTimeout(resolve, this.pollInterval))
      attempts++
    }

    throw new ReplicateError(
      `Prediction timed out after ${this.maxPollAttempts * this.pollInterval / 1000} seconds`
    )
  }

  // ============================================================
  // HIGH-LEVEL METHODS
  // ============================================================

  /**
   * Edit an image using AI
   */
  async editImage(
    params: EditImageParams,
    onProgress?: (status: PredictionStatus, logs?: string) => void
  ): Promise<string> {
    console.log('[ReplicateClient] Editing image with prompt:', params.prompt)

    // Validate parameters
    const validated = EditImageSchema.parse(params)

    // Prepare image input
    const imageInput = await this.prepareImageInput(validated.imageUrl)

    // Model version IDs (you'll need to get these from Replicate)
    const modelVersions: Record<string, string> = {
      'qwen/qwen-image-edit-plus': 'YOUR_MODEL_VERSION_ID', // Replace with actual version
      'stability-ai/stable-diffusion': 'YOUR_SD_VERSION_ID', // Replace with actual version
    }

    const versionId = modelVersions[validated.model]
    if (!versionId) {
      throw new ReplicateError(`Unknown model: ${validated.model}`)
    }

    // Create prediction
    const prediction = await this.createPrediction(versionId, {
      image: imageInput,
      prompt: validated.prompt,
      strength: validated.strength,
      guidance_scale: validated.guidance_scale,
      negative_prompt: validated.negative_prompt,
    })

    // Poll for completion
    const completed = await this.pollPrediction(prediction.id, onProgress)

    // Extract output URL
    const output = completed.output
    if (!output) {
      throw new ReplicateError('No output from prediction')
    }

    // Output can be string or array of strings
    const outputUrl = Array.isArray(output) ? output[0] : output

    if (!outputUrl) {
      throw new ReplicateError('Invalid output format from prediction')
    }

    console.log('[ReplicateClient] Edit complete, output URL:', outputUrl)
    return outputUrl
  }

  /**
   * Generate a product mockup
   */
  async generateMockup(
    params: GenerateMockupParams,
    onProgress?: (status: PredictionStatus, logs?: string) => void
  ): Promise<string> {
    console.log('[ReplicateClient] Generating mockup for:', params.product)

    // Validate parameters
    const validated = GenerateMockupSchema.parse(params)

    // Prepare image input
    const imageInput = await this.prepareImageInput(validated.imageUrl)

    // For mockup generation, we might use a different model
    // This is a placeholder - replace with actual mockup generation model
    const mockupModelVersion = 'YOUR_MOCKUP_MODEL_VERSION_ID'

    // Determine actual color
    const actualColor = validated.color === 'custom'
      ? validated.customColor || '#FFFFFF'
      : validated.color

    // Create prediction for mockup
    const prediction = await this.createPrediction(mockupModelVersion, {
      image: imageInput,
      product_type: validated.product,
      product_color: actualColor,
      placement: validated.placement,
      size: validated.size,
      // Additional parameters as needed by the mockup model
    })

    // Poll for completion
    const completed = await this.pollPrediction(prediction.id, onProgress)

    // Extract output URL
    const output = completed.output
    if (!output) {
      throw new ReplicateError('No output from mockup generation')
    }

    const outputUrl = Array.isArray(output) ? output[0] : output

    if (!outputUrl) {
      throw new ReplicateError('Invalid mockup output format')
    }

    console.log('[ReplicateClient] Mockup complete, output URL:', outputUrl)
    return outputUrl
  }

  /**
   * Run a custom Replicate model
   */
  async runModel(
    version: string,
    input: Record<string, any>,
    onProgress?: (status: PredictionStatus, logs?: string) => void
  ): Promise<any> {
    console.log('[ReplicateClient] Running custom model:', version)

    const prediction = await this.createPrediction(version, input)
    const completed = await this.pollPrediction(prediction.id, onProgress)

    return completed.output
  }
}

// ============================================================
// SINGLETON INSTANCE
// ============================================================

let clientInstance: ReplicateClient | null = null

/**
 * Get or create Replicate client instance
 */
export function getReplicateClient(apiKey?: string): ReplicateClient {
  if (!clientInstance) {
    clientInstance = new ReplicateClient(apiKey)
  }
  return clientInstance
}

/**
 * Reset client instance (for testing)
 */
export function resetReplicateClient(): void {
  clientInstance = null
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Check if Replicate is configured
 */
export function isReplicateConfigured(): boolean {
  return !!process.env.REPLICATE_API_KEY
}

/**
 * Get mockup template configurations
 */
export function getMockupTemplates() {
  return {
    tshirt: {
      name: 'T-Shirt',
      colors: ['white', 'black', 'gray', 'red', 'blue', 'green'],
      placements: ['center', 'left-chest', 'full-front'],
      sizes: ['small', 'medium', 'large', 'xl'],
    },
    hoodie: {
      name: 'Hoodie',
      colors: ['white', 'black', 'gray', 'navy', 'maroon'],
      placements: ['center', 'left-chest', 'full-front'],
      sizes: ['small', 'medium', 'large', 'xl'],
    },
    mug: {
      name: 'Coffee Mug',
      colors: ['white', 'black', 'red', 'blue'],
      placements: ['center'],
      sizes: ['medium'],
    },
    poster: {
      name: 'Poster',
      colors: ['white'],
      placements: ['center'],
      sizes: ['small', 'medium', 'large'],
    },
    'phone-case': {
      name: 'Phone Case',
      colors: ['clear', 'black', 'white'],
      placements: ['center', 'full-back'],
      sizes: ['medium'],
    },
    'tote-bag': {
      name: 'Tote Bag',
      colors: ['natural', 'black', 'white'],
      placements: ['center'],
      sizes: ['medium', 'large'],
    },
  }
}