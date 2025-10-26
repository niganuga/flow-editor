/**
 * AI Image Edit Tool
 *
 * Tool implementation for AI-driven image editing using Replicate API.
 * This tool allows natural language image editing like "remove background",
 * "make colors brighter", "add a sunset", etc.
 *
 * @module tools/ai-image-edit
 */

import { z } from 'zod'

// ============================================================
// TYPES AND SCHEMAS
// ============================================================

/**
 * AI image edit parameters
 */
export const AIImageEditSchema = z.object({
  prompt: z.string().describe('Natural language editing instruction'),
  imageUrl: z.string(),
  strength: z.number().min(0).max(1).optional().default(0.75),
  model: z.string().optional().default('qwen/qwen-image-edit-plus'),
})

export type AIImageEditParams = z.infer<typeof AIImageEditSchema>

/**
 * Edit result
 */
export interface AIImageEditResult {
  success: boolean
  resultUrl?: string
  predictionId?: string
  error?: string
  executionTime?: number
}

// ============================================================
// MAIN FUNCTION
// ============================================================

/**
 * Edit an image using AI based on natural language prompts
 *
 * @param params - Edit parameters
 * @param onProgress - Progress callback
 * @returns Edit result with URL
 *
 * @example
 * ```typescript
 * const result = await editImageWithAI({
 *   prompt: "remove the background and make it transparent",
 *   imageUrl: blobUrl,
 *   strength: 0.8
 * })
 *
 * if (result.success && result.resultUrl) {
 *   // Apply edited image to canvas
 *   setImage(result.resultUrl)
 * }
 * ```
 */
export async function editImageWithAI(
  params: AIImageEditParams,
  onProgress?: (progress: number, message: string) => void
): Promise<AIImageEditResult> {
  const startTime = Date.now()

  try {
    console.log('[AI Edit] Starting AI-driven image edit:', params.prompt)

    // Validate parameters
    const validated = AIImageEditSchema.parse(params)

    // Report initial progress
    onProgress?.(10, 'Preparing image for AI processing...')

    // Prepare image data
    let imageData = validated.imageUrl
    if (imageData.startsWith('blob:')) {
      console.log('[AI Edit] Converting blob URL to data URL...')
      const response = await fetch(imageData)
      const blob = await response.blob()

      imageData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    }

    onProgress?.(20, 'Sending to AI model...')

    // Call Replicate API endpoint
    const apiResponse = await fetch('/api/replicate/predict', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'edit',
        params: {
          prompt: validated.prompt,
          imageUrl: imageData,
          strength: validated.strength,
          model: validated.model,
        },
      }),
    })

    if (!apiResponse.ok) {
      const error = await apiResponse.json()
      throw new Error(error.error || `API error: ${apiResponse.status}`)
    }

    const { predictionId, status } = await apiResponse.json()

    console.log('[AI Edit] Prediction created:', predictionId)
    onProgress?.(30, 'AI model processing...')

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
      onProgress?.(progressPercent, `Processing: ${prediction.status}`)

      if (prediction.status === 'succeeded') {
        console.log('[AI Edit] Processing completed successfully')

        // Get the output URL
        const outputUrl = Array.isArray(prediction.output)
          ? prediction.output[0]
          : prediction.output

        if (!outputUrl) {
          throw new Error('No output received from AI model')
        }

        onProgress?.(90, 'Finalizing edited image...')

        let resultUrl: string

        // If it's a data URL, use it directly
        if (outputUrl.startsWith('data:')) {
          console.log('[AI Edit] Result is data URL, converting to blob...')
          // Convert data URL to blob for better memory management
          const response = await fetch(outputUrl)
          const blob = await response.blob()
          resultUrl = URL.createObjectURL(blob)
        } else {
          // It's a regular URL, fetch it
          console.log('[AI Edit] Fetching result from URL...')
          const resultResponse = await fetch(outputUrl)
          if (!resultResponse.ok) {
            throw new Error('Failed to fetch result image')
          }

          const resultBlob = await resultResponse.blob()
          resultUrl = URL.createObjectURL(resultBlob)
        }

        onProgress?.(100, 'Edit complete!')

        const executionTime = Date.now() - startTime

        return {
          success: true,
          resultUrl,
          predictionId,
          executionTime,
        }
      }

      if (prediction.status === 'failed') {
        throw new Error(prediction.error || 'AI processing failed')
      }

      if (prediction.status === 'canceled') {
        throw new Error('Processing was canceled')
      }

      // Wait and retry
      await new Promise(resolve => setTimeout(resolve, pollInterval))
      attempts++
    }

    throw new Error('Processing timed out')

  } catch (error) {
    console.error('[AI Edit] Error:', error)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'AI edit failed',
    }
  }
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Parse and enhance edit prompts for better AI results
 */
export function enhanceEditPrompt(prompt: string): string {
  const enhancements: Record<string, string> = {
    'remove background': 'remove the background completely and make it transparent, preserve subject details',
    'remove bg': 'remove the background completely and make it transparent, preserve subject details',
    'make brighter': 'increase brightness and exposure while maintaining natural colors',
    'make darker': 'decrease brightness and add shadows while preserving details',
    'add blur': 'add gaussian blur effect to create depth of field',
    'sharpen': 'enhance sharpness and details, make edges crisper',
    'vintage': 'apply vintage film effect with warm tones and grain',
    'modern': 'apply modern clean look with enhanced contrast and saturation',
  }

  let enhanced = prompt.toLowerCase()

  // Apply enhancements
  for (const [key, value] of Object.entries(enhancements)) {
    if (enhanced.includes(key)) {
      enhanced = enhanced.replace(key, value)
    }
  }

  return enhanced
}

/**
 * Get suggested edit prompts based on image type
 */
export function getSuggestedEditPrompts(imageType?: 'product' | 'portrait' | 'landscape'): string[] {
  const basePrompts = [
    'Remove the background',
    'Make colors more vibrant',
    'Convert to black and white',
    'Add soft lighting',
    'Enhance details and sharpness',
  ]

  const typeSpecificPrompts: Record<string, string[]> = {
    product: [
      'Remove background and shadows',
      'Add white background',
      'Create reflection effect',
      'Enhance product colors',
      'Add professional lighting',
    ],
    portrait: [
      'Smooth skin naturally',
      'Enhance eyes and features',
      'Add bokeh background blur',
      'Adjust skin tone warmth',
      'Remove background distractions',
    ],
    landscape: [
      'Enhance sky and clouds',
      'Add golden hour lighting',
      'Increase color saturation',
      'Add dramatic contrast',
      'Remove unwanted objects',
    ],
  }

  return imageType && typeSpecificPrompts[imageType]
    ? typeSpecificPrompts[imageType]
    : basePrompts
}

/**
 * Validate if prompt is suitable for AI editing
 */
export function validateEditPrompt(prompt: string): {
  isValid: boolean
  warnings: string[]
  suggestions: string[]
} {
  const warnings: string[] = []
  const suggestions: string[] = []

  // Check minimum length
  if (prompt.length < 3) {
    warnings.push('Prompt is too short. Be more specific.')
    suggestions.push('Try: "Remove the background" or "Make colors brighter"')
  }

  // Check for ambiguous terms
  const ambiguousTerms = ['fix', 'improve', 'better', 'nice']
  for (const term of ambiguousTerms) {
    if (prompt.toLowerCase().includes(term)) {
      warnings.push(`"${term}" is ambiguous. Be more specific about what to change.`)
      suggestions.push('Specify exact changes like "increase brightness" or "remove shadows"')
      break
    }
  }

  // Check for conflicting instructions
  const conflicts = [
    ['brighter', 'darker'],
    ['add', 'remove'],
    ['increase', 'decrease'],
  ]

  for (const [term1, term2] of conflicts) {
    if (prompt.includes(term1) && prompt.includes(term2)) {
      warnings.push('Prompt contains conflicting instructions')
      suggestions.push('Use one clear instruction per edit')
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
    suggestions,
  }
}

// ============================================================
// TOOL DEFINITION FOR ORCHESTRATOR
// ============================================================

/**
 * Tool definition for AI orchestrator registration
 */
export const aiImageEditTool = {
  name: 'edit_image',
  description: 'Edit images using AI with natural language instructions. Use for complex edits like "remove background", "change lighting", "add effects", etc.',
  parameters: {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description: 'Natural language editing instruction (e.g., "remove background", "make brighter", "add sunset")',
      },
      strength: {
        type: 'number',
        description: 'Edit strength 0-1 (0.75 default)',
        minimum: 0,
        maximum: 1,
        default: 0.75,
      },
    },
    required: ['prompt'],
  },
  execute: async (params: any, imageUrl: string) => {
    const result = await editImageWithAI({
      ...params,
      imageUrl,
    })

    return {
      success: result.success,
      resultUrl: result.resultUrl,
      error: result.error,
    }
  },
}