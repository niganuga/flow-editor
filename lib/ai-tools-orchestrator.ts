/**
 * AI Tools Orchestrator
 * Provides function-calling interface for AI Design Partner to use tools
 */

import { performColorKnockout, pickColorFromImage, type SelectedColor } from './tools/color-knockout'
import { extractColors, recolorImage, type ColorInfo, type BlendMode as RecolorBlendMode } from './tools/recolor'
import { textureCut, createPatternTexture } from './tools/texture-cut'
import { removeBackground, type BackgroundRemovalModel } from './tools/background-remover'
import { upscaleImage, type UpscaleModel } from './tools/upscaler'
import { autoCrop } from './ai-tools/auto-crop'
import { cropWithSpacing, parseSpacing } from './ai-tools/crop-with-spacing'
import { rotateFlip, parseTransform } from './ai-tools/rotate-flip'
import { smartResize, parseResize } from './ai-tools/smart-resize'
import { aiImageEditTool } from './tools/ai-image-edit'
import { aiMockupTool } from './tools/ai-mockup'

/**
 * Tool function definitions for AI function calling
 */
export const toolDefinitions = [
  {
    name: 'color_knockout',
    description: 'Remove specific colors from an image with adjustable tolerance and anti-aliasing. Useful for removing backgrounds, creating masks, or isolating specific color ranges.',
    parameters: {
      type: 'object',
      properties: {
        colors: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              hex: { type: 'string', description: 'Hex color code (e.g., #FF0000)' },
              r: { type: 'number', description: 'Red value 0-255' },
              g: { type: 'number', description: 'Green value 0-255' },
              b: { type: 'number', description: 'Blue value 0-255' }
            },
            required: ['hex', 'r', 'g', 'b']
          },
          description: 'Array of colors to remove from the image'
        },
        tolerance: {
          type: 'number',
          description: 'Color matching tolerance 0-100 (higher = more similar colors removed)',
          minimum: 0,
          maximum: 100,
          default: 30
        },
        replaceMode: {
          type: 'string',
          enum: ['transparency', 'color', 'mask'],
          description: 'How to replace matched colors: transparency (make transparent), color (replace with white), mask (create black/white mask)',
          default: 'transparency'
        },
        feather: {
          type: 'number',
          description: 'Edge feathering in pixels (0-20) for smoother edges',
          minimum: 0,
          maximum: 20,
          default: 0
        },
        antiAliasing: {
          type: 'boolean',
          description: 'Enable anti-aliasing for smoother edges',
          default: true
        }
      },
      required: ['colors']
    }
  },
  {
    name: 'extract_color_palette',
    description: 'Extract dominant colors from an image to create a color palette. Useful for color analysis, theme generation, or understanding image composition.',
    parameters: {
      type: 'object',
      properties: {
        paletteSize: {
          type: 'number',
          enum: [9, 36],
          description: 'Number of colors to extract (9 or 36)',
          default: 9
        },
        algorithm: {
          type: 'string',
          enum: ['smart', 'detailed'],
          description: 'Extraction algorithm: smart (faster, broader colors) or detailed (slower, more precise)',
          default: 'smart'
        }
      }
    }
  },
  {
    name: 'recolor_image',
    description: 'Recolor an image by mapping existing colors to new colors. Useful for changing color schemes, creating variations, or matching brand colors.',
    parameters: {
      type: 'object',
      properties: {
        colorMappings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              originalIndex: { type: 'number', description: 'Index of color from extracted palette to replace' },
              newColor: { type: 'string', description: 'New hex color (e.g., #FF0000)' }
            },
            required: ['originalIndex', 'newColor']
          },
          description: 'Array of color mappings (original palette index to new color)'
        },
        blendMode: {
          type: 'string',
          enum: ['replace', 'overlay', 'multiply'],
          description: 'How to blend new colors: replace (direct replacement), overlay (blend), multiply (darken)',
          default: 'replace'
        },
        tolerance: {
          type: 'number',
          description: 'Color matching tolerance 0-100',
          minimum: 0,
          maximum: 100,
          default: 30
        }
      },
      required: ['colorMappings']
    }
  },
  {
    name: 'texture_cut',
    description: 'Cut parts of an image to transparent using a texture or pattern as a mask. Black areas in the texture cut to transparent, white areas preserve the image. Useful for creating masks, stencil effects, or artistic cutouts.',
    parameters: {
      type: 'object',
      properties: {
        textureType: {
          type: 'string',
          enum: ['dots', 'lines', 'grid', 'noise', 'custom'],
          description: 'Type of texture to use as cutting mask: built-in patterns or custom uploaded texture',
          default: 'noise'
        },
        invert: {
          type: 'boolean',
          description: 'Invert the cut (white cuts instead of black)',
          default: false
        },
        amount: {
          type: 'number',
          description: 'Cut strength/intensity 0-1',
          minimum: 0,
          maximum: 1,
          default: 0.5
        },
        scale: {
          type: 'number',
          description: 'Texture scale 0.1-5x',
          minimum: 0.1,
          maximum: 5,
          default: 1
        },
        rotation: {
          type: 'number',
          description: 'Texture rotation in degrees 0-360',
          minimum: 0,
          maximum: 360,
          default: 0
        },
        tile: {
          type: 'boolean',
          description: 'Whether to tile/repeat the texture',
          default: false
        }
      },
      required: ['textureType']
    }
  },
  {
    name: 'background_remover',
    description: 'Remove the background from an image using AI. This is the BEST tool for removing backgrounds - it uses advanced AI models to intelligently detect and remove backgrounds. Use this instead of color_knockout when the user asks to "remove the background", "remove bg", or "make background transparent".',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          enum: ['bria', 'codeplugtech', 'fallback'],
          description: 'AI model to use: bria (best quality, recommended), codeplugtech (fast), fallback (reliable)',
          default: 'bria'
        },
        outputFormat: {
          type: 'string',
          enum: ['png', 'webp'],
          description: 'Output image format',
          default: 'png'
        },
        backgroundColor: {
          type: 'string',
          description: 'Optional: Hex color for solid background instead of transparent (e.g., #FFFFFF for white)',
        }
      }
    }
  },
  {
    name: 'upscaler',
    description: 'Upscale and enhance image quality using AI. Increases resolution while maintaining or improving quality. Use when user asks to "upscale", "make bigger", "enhance quality", or "increase resolution".',
    parameters: {
      type: 'object',
      properties: {
        model: {
          type: 'string',
          enum: ['standard', 'creative', 'anime'],
          description: 'AI model: standard (general photos), creative (artistic enhancement), anime (illustrations)',
          default: 'standard'
        },
        scaleFactor: {
          type: 'number',
          description: 'How much to upscale: 2x (double size), 4x (quadruple), up to 10x',
          minimum: 1,
          maximum: 10,
          default: 2
        },
        faceEnhance: {
          type: 'boolean',
          description: 'Enhance faces in the image (standard and anime models only)',
          default: false
        },
        outputFormat: {
          type: 'string',
          enum: ['png', 'jpg', 'webp'],
          description: 'Output image format',
          default: 'png'
        }
      },
      required: ['scaleFactor']
    }
  },
  {
    name: 'pick_color_at_position',
    description: 'Pick the color at a specific pixel position in the image. Returns RGB and hex values.',
    parameters: {
      type: 'object',
      properties: {
        x: {
          type: 'number',
          description: 'X coordinate in pixels'
        },
        y: {
          type: 'number',
          description: 'Y coordinate in pixels'
        }
      },
      required: ['x', 'y']
    }
  },
  {
    name: 'auto_crop',
    description: 'Automatically crop/trim extra space around the design edges. Can detect and trim white, black, transparent, or any colored backgrounds. Supports color names (orange, red, blue, green, yellow, purple, pink, etc.) and hex colors. Use when user asks to "trim", "crop extra space", "trim orange background", "trim black spaces", "auto-detect background", or "crop to content".',
    parameters: {
      type: 'object',
      properties: {
        tolerance: {
          type: 'number',
          description: 'Color variation tolerance 0-255 for detecting "empty" space (default: 30). Higher tolerance = more aggressive trimming.',
          minimum: 0,
          maximum: 255,
          default: 30
        },
        minPadding: {
          type: 'number',
          description: 'Minimum padding to leave around content in pixels (default: 0)',
          minimum: 0,
          maximum: 100,
          default: 0
        },
        backgroundColor: {
          type: 'string',
          description: 'Background color to trim: "white" (default), "black", "transparent", "auto" (auto-detect from corners), color names like "orange", "red", "blue", "green", "yellow", "purple", "pink", or hex colors like "#FF8C00"',
          default: 'white'
        }
      }
    }
  },
  {
    name: 'crop_with_spacing',
    description: 'Crop image with specific spacing/margin around the design. Supports inches (converted to pixels at 300 DPI) or pixels. Use when user asks to "crop with 1 inch margin", "leave 2 inches of space", or "crop with 50px padding".',
    parameters: {
      type: 'object',
      properties: {
        spacing: {
          type: 'number',
          description: 'Spacing amount (value depends on unit)'
        },
        unit: {
          type: 'string',
          enum: ['px', 'inches'],
          description: 'Unit for spacing: px (pixels) or inches (converted at 300 DPI)',
          default: 'px'
        },
        dpi: {
          type: 'number',
          description: 'DPI for inch conversion (default: 300 for print quality)',
          default: 300
        }
      },
      required: ['spacing']
    }
  },
  {
    name: 'rotate_flip',
    description: 'Rotate (90°, 180°, 270°) or flip (horizontal/vertical) the image. Use when user asks to "rotate clockwise", "rotate 90 degrees", "flip horizontal", or "flip vertical".',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'object',
          description: 'Transform operation to perform',
          oneOf: [
            {
              properties: {
                type: { type: 'string', enum: ['rotate'], const: 'rotate' },
                angle: { type: 'number', enum: [90, 180, 270, -90, -180, -270], description: 'Rotation angle (90 = clockwise, -90 = counter-clockwise)' }
              },
              required: ['type', 'angle']
            },
            {
              properties: {
                type: { type: 'string', enum: ['flip'], const: 'flip' },
                direction: { type: 'string', enum: ['horizontal', 'vertical'], description: 'Flip direction' }
              },
              required: ['type', 'direction']
            }
          ]
        }
      },
      required: ['operation']
    }
  },
  {
    name: 'smart_resize',
    description: 'Intelligently resize image with quality warnings. WARNS when upscaling (quality degrades). Maintains/improves quality when downscaling. Use when user asks to "resize", "make bigger/smaller", or "change dimensions".',
    parameters: {
      type: 'object',
      properties: {
        width: {
          type: 'number',
          description: 'Target width in pixels (optional if height specified)'
        },
        height: {
          type: 'number',
          description: 'Target height in pixels (optional if width specified)'
        },
        unit: {
          type: 'string',
          enum: ['px', 'percent'],
          description: 'Unit: px (pixels) or percent (percentage of original)',
          default: 'px'
        },
        maintainAspectRatio: {
          type: 'boolean',
          description: 'Maintain aspect ratio when resizing',
          default: true
        }
      }
    }
  },
  // AI-powered tools
  aiImageEditTool,
  aiMockupTool
]

/**
 * Execute a tool function
 */
export async function executeToolFunction(
  toolName: string,
  parameters: any,
  imageUrl: string,
  onProgress?: (progress: number, message: string) => void
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    switch (toolName) {
      case 'color_knockout': {
        const { colors, tolerance = 30, replaceMode = 'transparency', feather = 0, antiAliasing = true } = parameters

        const selectedColors: SelectedColor[] = colors.map((c: any) => ({
          r: c.r,
          g: c.g,
          b: c.b,
          hex: c.hex
        }))

        const blob = await performColorKnockout({
          imageUrl,
          selectedColors,
          settings: {
            tolerance,
            replaceMode,
            feather,
            antiAliasing,
            edgeSmoothing: 0.5
          },
          onProgress
        })

        const resultUrl = URL.createObjectURL(blob)
        return { success: true, result: { imageUrl: resultUrl, message: 'Color knockout applied successfully' } }
      }

      case 'extract_color_palette': {
        const { paletteSize = 9, algorithm = 'smart' } = parameters

        const palette = await extractColors(
          imageUrl,
          {
            paletteSize,
            algorithm,
            includeRareColors: false,
            quality: 80
          },
          onProgress
        )

        return {
          success: true,
          result: {
            palette: palette.map(c => ({
              hex: c.hex,
              rgb: c.rgb,
              name: c.name,
              percentage: c.percentage?.toFixed(1)
            })),
            message: `Extracted ${palette.length} colors`
          }
        }
      }

      case 'recolor_image': {
        const { colorMappings, blendMode = 'replace', tolerance = 30 } = parameters

        // First extract palette if not already done
        const palette = await extractColors(
          imageUrl,
          {
            paletteSize: 9,
            algorithm: 'smart',
            includeRareColors: false,
            quality: 80
          }
        )

        // Create color mappings Map
        const mappings = new Map<number, string>()
        colorMappings.forEach((mapping: any) => {
          mappings.set(mapping.originalIndex, mapping.newColor)
        })

        const blob = await recolorImage(
          imageUrl,
          palette,
          {
            colorMappings: mappings,
            blendMode: blendMode as RecolorBlendMode,
            tolerance,
            preserveTransparency: true
          },
          onProgress
        )

        const resultUrl = URL.createObjectURL(blob)
        return { success: true, result: { imageUrl: resultUrl, message: 'Image recolored successfully' } }
      }

      case 'texture_cut': {
        const { textureType, invert = false, amount = 0.5, scale = 1, rotation = 0, tile = false } = parameters

        // Create texture based on type
        let textureUrl: string
        if (textureType === 'custom') {
          return { success: false, error: 'Custom textures require user upload - use built-in patterns instead' }
        } else {
          textureUrl = createPatternTexture(textureType, 200, 200, '#000000', 10)
        }

        const blob = await textureCut({
          baseImageUrl: imageUrl,
          textureUrl,
          cutSettings: {
            amount,
            featherPx: 0,
            invert
          },
          transformSettings: {
            scale,
            rotation,
            tile
          },
          onProgress
        })

        const resultUrl = URL.createObjectURL(blob)
        return { success: true, result: { imageUrl: resultUrl, message: `${textureType} texture cut applied successfully` } }
      }

      case 'background_remover': {
        const { model = 'bria', outputFormat = 'png', backgroundColor } = parameters

        // Convert imageUrl to File
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const file = new File([blob], 'image.png', { type: blob.type })

        const resultUrl = await removeBackground({
          image: file,
          settings: {
            model: model as BackgroundRemovalModel,
            outputFormat,
            backgroundColor
          },
          onProgress
        })

        return { success: true, result: { imageUrl: resultUrl, message: 'Background removed successfully using AI' } }
      }

      case 'upscaler': {
        const { model = 'standard', scaleFactor = 2, faceEnhance = false, outputFormat = 'png' } = parameters

        // Convert imageUrl to File
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        const file = new File([blob], 'image.png', { type: blob.type })

        const resultUrl = await upscaleImage({
          image: file,
          settings: {
            model: model as UpscaleModel,
            scaleFactor,
            faceEnhance,
            outputFormat
          },
          onProgress
        })

        return { success: true, result: { imageUrl: resultUrl, message: `Image upscaled ${scaleFactor}x using AI` } }
      }

      case 'pick_color_at_position': {
        const { x, y } = parameters

        const color = await pickColorFromImage(imageUrl, x, y)

        return {
          success: true,
          result: {
            color: {
              hex: color.hex,
              r: color.r,
              g: color.g,
              b: color.b
            },
            message: `Color at (${x}, ${y}): ${color.hex}`
          }
        }
      }

      case 'auto_crop': {
        const { tolerance = 30, minPadding = 0, backgroundColor = 'white' } = parameters

        const result = await autoCrop({
          imageUrl,
          tolerance,
          minPadding,
          backgroundColor
        })

        return {
          success: true,
          result: {
            imageUrl: result.croppedImageUrl,
            originalDimensions: result.originalDimensions,
            newDimensions: result.croppedDimensions,
            trimmed: result.trimmed,
            message: `Cropped from ${result.originalDimensions.width}x${result.originalDimensions.height} to ${result.croppedDimensions.width}x${result.croppedDimensions.height} (trimmed ${result.trimmed.top + result.trimmed.bottom + result.trimmed.left + result.trimmed.right}px total)`
          }
        }
      }

      case 'crop_with_spacing': {
        const { spacing, unit = 'px', dpi = 300 } = parameters

        const result = await cropWithSpacing({
          imageUrl,
          spacing,
          unit,
          dpi
        })

        const spacingDesc = unit === 'inches'
          ? `${spacing} inches (${result.spacingPx}px at ${dpi} DPI)`
          : `${spacing}px (${result.spacingInches?.toFixed(2)} inches at ${dpi} DPI)`

        return {
          success: true,
          result: {
            imageUrl: result.croppedImageUrl,
            originalDimensions: result.originalDimensions,
            newDimensions: result.croppedDimensions,
            spacing: spacingDesc,
            message: `Cropped with ${spacingDesc} spacing around design`
          }
        }
      }

      case 'rotate_flip': {
        const { operation } = parameters

        const result = await rotateFlip({
          imageUrl,
          operation
        })

        const opDesc = operation.type === 'rotate'
          ? `rotated ${operation.angle > 0 ? `${operation.angle}° clockwise` : `${Math.abs(operation.angle)}° counter-clockwise`}`
          : `flipped ${operation.direction}`

        return {
          success: true,
          result: {
            imageUrl: result.transformedImageUrl,
            originalDimensions: result.originalDimensions,
            newDimensions: result.newDimensions,
            operation: result.operation,
            message: `Image ${opDesc}`
          }
        }
      }

      case 'smart_resize': {
        const { width, height, unit = 'px', maintainAspectRatio = true } = parameters

        const result = await smartResize({
          imageUrl,
          width,
          height,
          unit,
          maintainAspectRatio
        })

        let message = `Resized from ${result.originalDimensions.width}x${result.originalDimensions.height} to ${result.newDimensions.width}x${result.newDimensions.height}`

        // Add quality warning if upscaling
        if (result.isUpscaling && result.qualityWarning) {
          message += `. ⚠️ ${result.qualityWarning}`
        } else if (!result.isUpscaling) {
          message += `. Quality maintained/improved by downscaling.`
        }

        return {
          success: true,
          result: {
            imageUrl: result.resizedImageUrl,
            originalDimensions: result.originalDimensions,
            newDimensions: result.newDimensions,
            scaleFactor: result.scaleFactor,
            isUpscaling: result.isUpscaling,
            qualityWarning: result.qualityWarning,
            qualityImpact: result.qualityImpact,
            message
          }
        }
      }

      case 'edit_image': {
        // AI-powered image editing is handled by the tool's execute function
        const result = await aiImageEditTool.execute(parameters, imageUrl)
        return {
          success: result.success,
          result: result.success ? {
            imageUrl: result.resultUrl,
            message: 'AI edit completed successfully'
          } : undefined,
          error: result.error
        }
      }

      case 'generate_mockup': {
        // Mockup generation is handled by the tool's execute function
        const result = await aiMockupTool.execute(parameters, imageUrl)
        return {
          success: result.success,
          result: result.success ? {
            mockupUrl: result.mockupUrl,
            metadata: result.metadata,
            message: 'Mockup generated successfully'
          } : undefined,
          error: result.error
        }
      }

      default:
        return { success: false, error: `Unknown tool: ${toolName}` }
    }
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Tool execution failed'
    }
  }
}

/**
 * Get list of available tools for AI
 */
export function getAvailableTools(): string[] {
  return toolDefinitions.map(t => t.name)
}

/**
 * Get tool definition by name
 */
export function getToolDefinition(toolName: string) {
  return toolDefinitions.find(t => t.name === toolName)
}
