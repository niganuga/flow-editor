/**
 * Test Output Saving Utility
 * Save test images to disk for visual inspection and comparison
 */

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

/**
 * Output directory structure:
 * tests/outputs/
 *   ├── background-removal/
 *   │   ├── input-original.png
 *   │   ├── v1-bria-output.png
 *   │   └── v2-rmbg2-output.png
 *   ├── upscaling/
 *   │   ├── input-original.png
 *   │   ├── v1-real-esrgan-output.png
 *   │   ├── v2-magic-refiner-output.png
 *   │   └── v2-swinir-output.png
 *   └── fixtures/
 *       └── (downloaded test images)
 */

const OUTPUTS_DIR = join(process.cwd(), 'tests', 'outputs')

/**
 * Ensure output directory exists
 */
function ensureOutputDir(subdir?: string): string {
  const dir = subdir ? join(OUTPUTS_DIR, subdir) : OUTPUTS_DIR
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Convert data URL to Buffer
 */
function dataUrlToBuffer(dataUrl: string): Buffer {
  // Extract base64 data from data URL
  const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!matches) {
    throw new Error('Invalid data URL format')
  }

  const base64Data = matches[2]
  return Buffer.from(base64Data, 'base64')
}

/**
 * Get file extension from data URL
 */
function getExtensionFromDataUrl(dataUrl: string): string {
  const matches = dataUrl.match(/^data:image\/([^;]+)/)
  if (matches) {
    const format = matches[1]
    return format === 'jpeg' ? 'jpg' : format
  }
  return 'png'
}

/**
 * Save data URL as image file
 *
 * @param dataUrl - Image data URL
 * @param filename - Output filename (without extension)
 * @param subdir - Subdirectory (e.g., 'background-removal', 'upscaling')
 * @returns Full path to saved file
 *
 * @example
 * ```typescript
 * await saveTestOutput(
 *   resultDataUrl,
 *   'v2-rmbg2-output',
 *   'background-removal'
 * )
 * // Saves to: tests/outputs/background-removal/v2-rmbg2-output.png
 * ```
 */
export function saveTestOutput(
  dataUrl: string,
  filename: string,
  subdir?: string
): string {
  const outputDir = ensureOutputDir(subdir)
  const ext = getExtensionFromDataUrl(dataUrl)
  const fullPath = join(outputDir, `${filename}.${ext}`)

  try {
    const buffer = dataUrlToBuffer(dataUrl)
    writeFileSync(fullPath, buffer)
    console.log(`[Test Output] Saved: ${fullPath.replace(process.cwd(), '.')}`)
    return fullPath
  } catch (error) {
    console.error(`[Test Output] Failed to save ${filename}:`, error)
    throw error
  }
}

/**
 * Save comparison set (before, v1, v2)
 *
 * @example
 * ```typescript
 * saveComparisonSet(
 *   'background-removal',
 *   'bria-rmbg',
 *   originalDataUrl,
 *   v1ResultDataUrl,
 *   v2ResultDataUrl
 * )
 * // Saves:
 * // - tests/outputs/background-removal/input-original.png
 * // - tests/outputs/background-removal/v1-bria-rmbg-output.png
 * // - tests/outputs/background-removal/v2-bria-rmbg-output.png
 * ```
 */
export function saveComparisonSet(
  operation: string,
  modelName: string,
  originalDataUrl: string,
  v1OutputDataUrl: string,
  v2OutputDataUrl: string
): {
  original: string
  v1: string
  v2: string
} {
  const paths = {
    original: saveTestOutput(originalDataUrl, 'input-original', operation),
    v1: saveTestOutput(
      v1OutputDataUrl,
      `v1-${modelName.toLowerCase().replace(/\s+/g, '-')}-output`,
      operation
    ),
    v2: saveTestOutput(
      v2OutputDataUrl,
      `v2-${modelName.toLowerCase().replace(/\s+/g, '-')}-output`,
      operation
    ),
  }

  console.log(`[Test Output] Comparison set saved:`)
  console.log(`  Original: ${paths.original.replace(process.cwd(), '.')}`)
  console.log(`  V1:       ${paths.v1.replace(process.cwd(), '.')}`)
  console.log(`  V2:       ${paths.v2.replace(process.cwd(), '.')}`)

  return paths
}

/**
 * Save upscaling comparison with multiple v2 models
 *
 * @example
 * ```typescript
 * saveUpscalingComparison(
 *   originalDataUrl,
 *   v1OutputDataUrl,
 *   {
 *     'magic-refiner': magicRefinerOutput,
 *     'swinir': swinirOutput,
 *     'real-esrgan': realEsrganOutput,
 *   }
 * )
 * ```
 */
export function saveUpscalingComparison(
  originalDataUrl: string,
  v1OutputDataUrl: string,
  v2Outputs: Record<string, string>
): {
  original: string
  v1: string
  v2: Record<string, string>
} {
  const operation = 'upscaling'

  const paths: any = {
    original: saveTestOutput(originalDataUrl, 'input-original', operation),
    v1: saveTestOutput(v1OutputDataUrl, 'v1-real-esrgan-output', operation),
    v2: {},
  }

  for (const [modelName, dataUrl] of Object.entries(v2Outputs)) {
    paths.v2[modelName] = saveTestOutput(
      dataUrl,
      `v2-${modelName.toLowerCase().replace(/\s+/g, '-')}-output`,
      operation
    )
  }

  console.log(`[Test Output] Upscaling comparison saved:`)
  console.log(`  Original: ${paths.original.replace(process.cwd(), '.')}`)
  console.log(`  V1:       ${paths.v1.replace(process.cwd(), '.')}`)
  for (const [modelName, path] of Object.entries(paths.v2)) {
    console.log(`  V2 (${modelName}): ${(path as string).replace(process.cwd(), '.')}`)
  }

  return paths
}

/**
 * Create index.html for visual comparison
 */
export function createComparisonHTML(
  operation: string,
  paths: {
    original: string
    v1: string
    v2: string | Record<string, string>
  }
): string {
  const relativePaths = {
    original: paths.original.replace(join(OUTPUTS_DIR, operation), '.'),
    v1: paths.v1.replace(join(OUTPUTS_DIR, operation), '.'),
    v2:
      typeof paths.v2 === 'string'
        ? paths.v2.replace(join(OUTPUTS_DIR, operation), '.')
        : Object.fromEntries(
            Object.entries(paths.v2).map(([key, val]) => [
              key,
              val.replace(join(OUTPUTS_DIR, operation), '.'),
            ])
          ),
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${operation} Comparison - V1 vs V2</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    h1 {
      text-align: center;
      margin-bottom: 40px;
      color: #333;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    .comparison {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 40px;
    }
    .image-card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .image-card h2 {
      font-size: 18px;
      margin-bottom: 15px;
      color: #666;
    }
    .image-card img {
      width: 100%;
      height: auto;
      border: 1px solid #ddd;
      border-radius: 4px;
      background-image:
        linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(-45deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    .stats {
      margin-top: 10px;
      font-size: 12px;
      color: #888;
    }
    .tag {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      margin-top: 10px;
    }
    .tag.original { background: #e3f2fd; color: #1976d2; }
    .tag.v1 { background: #fff3e0; color: #f57c00; }
    .tag.v2 { background: #e8f5e9; color: #388e3c; }
  </style>
</head>
<body>
  <div class="container">
    <h1>${operation.replace(/-/g, ' ').toUpperCase()} - V1 vs V2 Comparison</h1>

    <div class="comparison">
      <div class="image-card">
        <h2>Original Input</h2>
        <img src="${relativePaths.original}" alt="Original">
        <span class="tag original">ORIGINAL</span>
      </div>

      <div class="image-card">
        <h2>V1 Output</h2>
        <img src="${relativePaths.v1}" alt="V1 Output">
        <span class="tag v1">V1</span>
      </div>

      ${
        typeof relativePaths.v2 === 'string'
          ? `
      <div class="image-card">
        <h2>V2 Output</h2>
        <img src="${relativePaths.v2}" alt="V2 Output">
        <span class="tag v2">V2</span>
      </div>
      `
          : Object.entries(relativePaths.v2)
              .map(
                ([modelName, path]) => `
      <div class="image-card">
        <h2>V2 Output (${modelName})</h2>
        <img src="${path}" alt="V2 ${modelName}">
        <span class="tag v2">V2 - ${modelName.toUpperCase()}</span>
      </div>
      `
              )
              .join('\n')
      }
    </div>

    <div style="text-align: center; color: #888; font-size: 14px;">
      <p>Generated by Flow Editor V1 vs V2 Comparison Test Suite</p>
      <p style="margin-top: 8px;">Test Date: ${new Date().toLocaleString()}</p>
    </div>
  </div>
</body>
</html>
  `.trim()

  const htmlPath = join(OUTPUTS_DIR, operation, 'index.html')
  writeFileSync(htmlPath, html, 'utf-8')
  console.log(`[Test Output] HTML comparison: ${htmlPath.replace(process.cwd(), '.')}`)

  return htmlPath
}

/**
 * Clean all test outputs
 */
export function cleanTestOutputs(): void {
  const { rmSync } = require('fs')
  if (existsSync(OUTPUTS_DIR)) {
    rmSync(OUTPUTS_DIR, { recursive: true, force: true })
    console.log('[Test Output] Cleaned all test outputs')
  }
}

/**
 * Get outputs directory path
 */
export function getOutputsDir(subdir?: string): string {
  return subdir ? join(OUTPUTS_DIR, subdir) : OUTPUTS_DIR
}
