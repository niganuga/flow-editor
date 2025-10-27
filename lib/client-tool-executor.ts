/**
 * Client-Side Tool Executor
 *
 * Executes AI tools directly in the browser where Canvas API is native.
 * This avoids server-side canvas package issues and provides better performance.
 *
 * @module client-tool-executor
 */

import { performColorKnockout, pickColorFromImage } from './tools/color-knockout'
import { extractColors, recolorImage } from './tools/recolor'
import { textureCut, createPatternTexture } from './tools/texture-cut'
import { autoCrop } from './ai-tools/auto-crop'
import { cropWithSpacing } from './ai-tools/crop-with-spacing'
import { rotateFlip } from './ai-tools/rotate-flip'
import { smartResize } from './ai-tools/smart-resize'
import { editImageWithAI } from './tools/ai-image-edit'
import { generateMockupWithAI } from './tools/ai-mockup'

/**
 * Tool execution result
 */
export interface ClientToolResult {
  success: boolean
  resultUrl?: string
  data?: any
  error?: string
}

/**
 * Execute tool client-side in browser
 *
 * @param toolName - Name of the tool to execute
 * @param parameters - Tool parameters from Claude
 * @param imageUrl - Image URL (blob or data URL)
 * @returns Result URL or data
 */
export async function executeToolClientSide(
  toolName: string,
  parameters: any,
  imageUrl: string
): Promise<ClientToolResult> {
  console.log(`[ClientExecutor] Executing ${toolName} client-side...`)

  try {
    switch (toolName) {
      case 'color_knockout': {
        console.log('[ClientExecutor] Color knockout with params:', parameters)

        const blob = await performColorKnockout({
          imageUrl,
          selectedColors: parameters.colors || [],
          settings: {
            tolerance: parameters.tolerance || 30,
            replaceMode: parameters.replaceMode || 'transparency',
            feather: parameters.feather || 0,
            antiAliasing: parameters.antiAliasing !== false,
            edgeSmoothing: 0.5,
          },
          onProgress: (progress, msg) => {
            console.log(`[ClientExecutor:color_knockout] ${progress}% - ${msg}`)
          }
        })

        const resultUrl = URL.createObjectURL(blob)
        console.log('[ClientExecutor] Color knockout complete:', resultUrl)

        return {
          success: true,
          resultUrl
        }
      }

      case 'recolor_image': {
        console.log('[ClientExecutor] Recolor with params:', parameters)

        // Extract palette first
        const palette = await extractColors(imageUrl, {
          paletteSize: 9,
          algorithm: 'smart',
          includeRareColors: false,
          quality: 80,
        }, (progress, msg) => {
          console.log(`[ClientExecutor:extract] ${progress}% - ${msg}`)
        })

        console.log('[ClientExecutor] Extracted palette:', palette)

        // Create mappings
        const mappings = new Map()
        if (parameters.colorMappings && Array.isArray(parameters.colorMappings)) {
          parameters.colorMappings.forEach((m: any) => {
            mappings.set(m.originalIndex, m.newColor)
          })
        }

        const blob = await recolorImage(imageUrl, palette, {
          colorMappings: mappings,
          blendMode: parameters.blendMode || 'replace',
          tolerance: parameters.tolerance || 30,
          preserveTransparency: true,
        }, (progress, msg) => {
          console.log(`[ClientExecutor:recolor] ${progress}% - ${msg}`)
        })

        const resultUrl = URL.createObjectURL(blob)
        console.log('[ClientExecutor] Recolor complete:', resultUrl)

        return {
          success: true,
          resultUrl
        }
      }

      case 'texture_cut': {
        console.log('[ClientExecutor] Texture cut with params:', parameters)

        let textureUrl: string
        if (parameters.textureType === 'custom') {
          throw new Error('Custom textures not yet supported')
        }

        // Create pattern texture
        textureUrl = createPatternTexture(
          parameters.textureType || 'noise',
          200, 200, '#000000', 10
        )

        const blob = await textureCut({
          baseImageUrl: imageUrl,
          textureUrl,
          cutSettings: {
            amount: parameters.amount || 0.5,
            featherPx: 0,
            invert: parameters.invert || false,
          },
          transformSettings: {
            scale: parameters.scale || 1,
            rotation: parameters.rotation || 0,
            tile: parameters.tile || false,
          },
          onProgress: (progress, msg) => {
            console.log(`[ClientExecutor:texture_cut] ${progress}% - ${msg}`)
          }
        })

        const resultUrl = URL.createObjectURL(blob)
        console.log('[ClientExecutor] Texture cut complete:', resultUrl)

        return {
          success: true,
          resultUrl
        }
      }

      case 'extract_color_palette': {
        console.log('[ClientExecutor] Extracting color palette...')

        const palette = await extractColors(imageUrl, {
          paletteSize: parameters.paletteSize || 9,
          algorithm: parameters.algorithm || 'smart',
          includeRareColors: false,
          quality: 80,
        }, (progress, msg) => {
          console.log(`[ClientExecutor:palette] ${progress}% - ${msg}`)
        })

        console.log('[ClientExecutor] Palette extracted:', palette)

        return {
          success: true,
          data: {
            colors: palette.map((c) => ({
              hex: c.hex,
              rgb: c.rgb,
              name: c.name,
              percentage: c.percentage,
            }))
          }
        }
      }

      case 'pick_color_at_position': {
        console.log('[ClientExecutor] Picking color at position:', parameters)

        const color = await pickColorFromImage(
          imageUrl,
          parameters.x,
          parameters.y
        )

        console.log('[ClientExecutor] Color picked:', color)

        return {
          success: true,
          data: {
            color: {
              hex: color.hex,
              r: color.r,
              g: color.g,
              b: color.b,
            },
            position: { x: parameters.x, y: parameters.y }
          }
        }
      }

      case 'auto_crop': {
        console.log('[ClientExecutor] Auto crop with params:', parameters)

        const result = await autoCrop({
          imageUrl,
          tolerance: parameters.tolerance || 30,
          minPadding: parameters.minPadding || 0,
          backgroundColor: parameters.backgroundColor || 'white',
        })

        console.log('[ClientExecutor] Auto crop complete:', result)

        return {
          success: true,
          resultUrl: result.croppedImageUrl,
          data: {
            originalDimensions: result.originalDimensions,
            croppedDimensions: result.croppedDimensions,
            trimmed: result.trimmed,
          }
        }
      }

      case 'crop_with_spacing': {
        console.log('[ClientExecutor] Crop with spacing params:', parameters)

        const result = await cropWithSpacing({
          imageUrl,
          spacing: parameters.spacing,
          unit: parameters.unit || 'px',
          dpi: parameters.dpi || 300,
        })

        console.log('[ClientExecutor] Crop with spacing complete:', result)

        return {
          success: true,
          resultUrl: result.croppedImageUrl,
          data: {
            originalDimensions: result.originalDimensions,
            croppedDimensions: result.croppedDimensions,
            spacingPx: result.spacingPx,
            spacingInches: result.spacingInches,
            dpi: result.dpi,
          }
        }
      }

      case 'rotate_flip': {
        console.log('[ClientExecutor] Rotate/flip with params:', parameters)

        const result = await rotateFlip({
          imageUrl,
          operation: parameters.operation,
        })

        console.log('[ClientExecutor] Rotate/flip complete:', result)

        return {
          success: true,
          resultUrl: result.transformedImageUrl,
          data: {
            originalDimensions: result.originalDimensions,
            newDimensions: result.newDimensions,
            operation: result.operation,
          }
        }
      }

      case 'smart_resize': {
        console.log('[ClientExecutor] Smart resize with params:', parameters)

        const result = await smartResize({
          imageUrl,
          width: parameters.width,
          height: parameters.height,
          unit: parameters.unit || 'px',
          maintainAspectRatio: parameters.maintainAspectRatio !== false,
          dpi: parameters.dpi || 300,
        })

        console.log('[ClientExecutor] Smart resize complete:', result)

        return {
          success: true,
          resultUrl: result.resizedImageUrl,
          data: {
            originalDimensions: result.originalDimensions,
            newDimensions: result.newDimensions,
            scaleFactor: result.scaleFactor,
            isUpscaling: result.isUpscaling,
            qualityWarning: result.qualityWarning,
            qualityImpact: result.qualityImpact,
          }
        }
      }

      case 'edit_image': {
        console.log('[ClientExecutor] AI image edit with params:', parameters)

        const result = await editImageWithAI({
          prompt: parameters.prompt,
          imageUrl,
          strength: parameters.strength || 0.75,
          model: parameters.model || 'qwen/qwen-image-edit-plus',
        }, (progress, msg) => {
          console.log(`[ClientExecutor:edit_image] ${progress}% - ${msg}`)
        })

        console.log('[ClientExecutor] AI edit result:', result)

        return {
          success: result.success,
          resultUrl: result.resultUrl,
          error: result.error,
        }
      }

      case 'generate_mockup': {
        console.log('[ClientExecutor] Generate mockup with params:', parameters)

        const result = await generateMockupWithAI({
          product: parameters.product,
          color: parameters.color || 'white',
          customColor: parameters.customColor,
          imageUrl,
          placement: parameters.placement || 'center',
          size: parameters.size || 'medium',
          background: parameters.background || 'studio',
          angle: parameters.angle || 'front',
          style: parameters.style || 'product-only',
        }, (progress, msg) => {
          console.log(`[ClientExecutor:generate_mockup] ${progress}% - ${msg}`)
        })

        console.log('[ClientExecutor] Mockup result:', result)

        return {
          success: result.success,
          resultUrl: result.mockupUrl,
          data: result.metadata,
          error: result.error,
        }
      }

      case 'background_remover': {
        console.log('[ClientExecutor] Background removal with params:', parameters)

        try {
          // Convert blob URL to data URL if needed
          let imageData = imageUrl
          if (imageData.startsWith('blob:')) {
            const response = await fetch(imageData)
            const blob = await response.blob()
            imageData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
          }

          // Call background removal API V2 (BRIA RMBG 2.0 with 256-level transparency)
          const apiResponse = await fetch('/api/ai-tools/background-removal-v2', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              imageUrl: imageData,
              settings: {
                preserve_alpha: true, // Enable 256-level transparency (not white background)
                fallback_to_v1: true, // Fallback to v1 if v2 fails
              },
            }),
          })

          if (!apiResponse.ok) {
            const error = await apiResponse.json()
            throw new Error(error.error || 'Background removal failed')
          }

          const result = await apiResponse.json()

          if (!result.success || !result.output) {
            throw new Error('No output from background removal')
          }

          console.log('[ClientExecutor] Background removed successfully')

          return {
            success: true,
            resultUrl: result.output,
          }
        } catch (error) {
          console.error('[ClientExecutor] Background removal error:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Background removal failed',
          }
        }
      }

      case 'upscaler': {
        console.log('[ClientExecutor] AI upscale with params:', parameters)

        try {
          // Import upscaler dynamically
          const { upscaleImage } = await import('@/lib/tools/upscaler')

          // Convert blob URL to File
          const response = await fetch(imageUrl)
          const blob = await response.blob()
          const file = new File([blob], 'image.png', { type: blob.type })

          // Get upscale settings from parameters
          const scaleFactor = parameters.scale || parameters.scaleFactor || 2
          const model = parameters.model || 'standard'

          const resultBlobUrl = await upscaleImage({
            image: file,
            settings: {
              model,
              scaleFactor,
              faceEnhance: parameters.faceEnhance || false,
              outputFormat: 'png',
            },
            onProgress: (progress, msg) => {
              console.log(`[ClientExecutor:upscaler] ${progress}% - ${msg}`)
            },
          })

          console.log('[ClientExecutor] Upscale completed successfully')

          return {
            success: true,
            resultUrl: resultBlobUrl,
          }
        } catch (error) {
          console.error('[ClientExecutor] Upscale error:', error)
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Upscaling failed',
          }
        }
      }

      default:
        console.error(`[ClientExecutor] Unknown tool: ${toolName}`)
        throw new Error(`Unknown tool: ${toolName}`)
    }
  } catch (error) {
    console.error(`[ClientExecutor] Tool execution failed:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    }
  }
}

/**
 * Execute multiple tools in sequence
 *
 * @param toolCalls - Array of tool calls from Claude
 * @param imageUrl - Base image URL
 * @returns Array of execution results
 */
export async function executeToolsClientSide(
  toolCalls: Array<{ toolName: string; parameters: any }>,
  imageUrl: string
): Promise<Array<ClientToolResult & { toolName: string; parameters: any }>> {
  const results = []
  let currentImageUrl = imageUrl

  for (const toolCall of toolCalls) {
    console.log(`[ClientExecutor] Processing tool ${results.length + 1}/${toolCalls.length}: ${toolCall.toolName}`)

    const result = await executeToolClientSide(
      toolCall.toolName,
      toolCall.parameters,
      currentImageUrl
    )

    results.push({
      ...result,
      toolName: toolCall.toolName,
      parameters: toolCall.parameters
    })

    // If successful and has result URL, use it for next tool
    if (result.success && result.resultUrl) {
      currentImageUrl = result.resultUrl
    }
  }

  return results
}

/**
 * Check if a tool can be executed client-side
 *
 * @param toolName - Name of the tool
 * @returns True if tool can run in browser
 */
export function isClientSideTool(toolName: string): boolean {
  const clientSideTools = [
    'color_knockout',
    'recolor_image',
    'texture_cut',
    'extract_color_palette',
    'pick_color_at_position',
    'auto_crop',
    'crop_with_spacing',
    'rotate_flip',
    'smart_resize',
    'edit_image',
    'generate_mockup'
  ]

  return clientSideTools.includes(toolName)
}

/**
 * Check if all tools in a list can be executed client-side
 *
 * @param toolNames - Array of tool names
 * @returns True if all tools can run in browser
 */
export function canExecuteAllClientSide(toolNames: string[]): boolean {
  return toolNames.every(isClientSideTool)
}