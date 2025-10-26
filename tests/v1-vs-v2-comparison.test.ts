/**
 * V1 vs V2 Implementation Comparison Test Suite
 *
 * Compares performance, quality, and cost between:
 * - Background Removal: v1 (lib/tools/background-remover.ts) vs v2 (lib/ai-tools/background-removal-v2.ts)
 * - Upscaling: v1 (lib/tools/upscaler.ts) vs v2 (lib/ai-tools/upscale-v2.ts)
 *
 * Success Criteria:
 * - V2 completes without errors
 * - V2 quality >= V1 quality (score difference <= 10)
 * - V2 cost <= 2x V1 cost (acceptable if quality better)
 * - No corrupted outputs from V2
 *
 * Test Report: Generated at /tests/comparison-report.md
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { writeFileSync } from 'fs'
import { join } from 'path'

// V1 implementations
import { removeBackground, type BackgroundRemovalSettings } from '@/lib/tools/background-remover'
import { upscaleImage, type UpscaleSettings } from '@/lib/tools/upscaler'

// V2 implementations
import {
  removeBackgroundV2,
  type BackgroundRemovalV2Settings,
  getModelInfoV2 as getBgModelInfo,
} from '@/lib/ai-tools/background-removal-v2'
import {
  upscaleImageV2,
  type UpscaleSettingsV2,
  getModelInfoV2 as getUpscaleModelInfo,
  getCostLogs,
  clearCostLogs,
} from '@/lib/ai-tools/upscale-v2'

// Quality validator
import {
  validateOperationQuality,
  extractImageData,
  type QualityValidationResult,
} from '@/lib/validators/quality-validator'

// Test utilities
import { generateTestImage, generateTestFile } from './utils/test-data-generator'
import {
  saveComparisonSet,
  saveUpscalingComparison,
  createComparisonHTML,
} from './utils/save-test-output'

// Replicate API mock
import * as replicateApi from '@/lib/api/replicate'

/**
 * Comparison metrics for a single test
 */
interface ComparisonMetrics {
  version: 'v1' | 'v2'
  operation: string
  modelName: string
  // Performance
  startTime: number
  endTime: number
  durationMs: number
  // Quality
  qualityResult?: QualityValidationResult
  qualityScore: number
  // Cost
  estimatedCost: number
  // Result
  success: boolean
  error?: string
  outputDataUrl?: string
}

/**
 * Aggregated comparison results
 */
interface ComparisonReport {
  testDate: string
  totalTests: number
  successfulTests: number
  failedTests: number
  backgroundRemoval: {
    v1: ComparisonMetrics[]
    v2: ComparisonMetrics[]
    winner: 'v1' | 'v2' | 'tie'
    summary: string
  }
  upscaling: {
    v1: ComparisonMetrics[]
    v2: ComparisonMetrics[]
    winner: 'v1' | 'v2' | 'tie'
    summary: string
  }
  overallWinner: 'v1' | 'v2' | 'tie'
  recommendations: string[]
}

// Global comparison report
let comparisonReport: ComparisonReport = {
  testDate: new Date().toISOString(),
  totalTests: 0,
  successfulTests: 0,
  failedTests: 0,
  backgroundRemoval: {
    v1: [],
    v2: [],
    winner: 'tie',
    summary: '',
  },
  upscaling: {
    v1: [],
    v2: [],
    winner: 'tie',
    summary: '',
  },
  overallWinner: 'tie',
  recommendations: [],
}

/**
 * Mock Replicate API responses
 */
function setupReplicateMocks() {
  const mockPredictionId = 'mock-prediction-123'

  // Mock createPrediction
  vi.spyOn(replicateApi, 'createPrediction').mockResolvedValue({
    id: mockPredictionId,
    status: 'starting',
    urls: {
      get: `https://api.replicate.com/v1/predictions/${mockPredictionId}`,
      cancel: `https://api.replicate.com/v1/predictions/${mockPredictionId}/cancel`,
    },
    created_at: new Date().toISOString(),
    version: 'mock-version',
    input: {},
    output: null,
    error: null,
    logs: '',
    metrics: {},
  })

  // Mock pollPrediction
  vi.spyOn(replicateApi, 'pollPrediction').mockImplementation(async ({ onStatus }) => {
    // Simulate progression
    const statuses: Array<'starting' | 'processing' | 'succeeded'> = [
      'starting',
      'processing',
      'succeeded',
    ]

    for (const status of statuses) {
      const prediction: replicateApi.ReplicatePrediction = {
        id: mockPredictionId,
        status,
        urls: {
          get: `https://api.replicate.com/v1/predictions/${mockPredictionId}`,
          cancel: `https://api.replicate.com/v1/predictions/${mockPredictionId}/cancel`,
        },
        created_at: new Date().toISOString(),
        version: 'mock-version',
        input: {},
        output: status === 'succeeded' ? 'data:image/png;base64,mock-output' : null,
        error: null,
        logs: '',
        metrics: {},
      }

      if (onStatus) {
        onStatus(status, prediction)
      }

      // Small delay to simulate processing
      await new Promise((resolve) => setTimeout(resolve, 10))
    }

    return {
      id: mockPredictionId,
      status: 'succeeded',
      urls: {
        get: `https://api.replicate.com/v1/predictions/${mockPredictionId}`,
        cancel: `https://api.replicate.com/v1/predictions/${mockPredictionId}/cancel`,
      },
      created_at: new Date().toISOString(),
      version: 'mock-version',
      input: {},
      output: 'data:image/png;base64,mock-output',
      error: null,
      logs: '',
      metrics: {},
    }
  })

  // Mock downloadResult
  vi.spyOn(replicateApi, 'downloadResult').mockResolvedValue(
    'data:image/png;base64,mock-downloaded-image'
  )
}

/**
 * Generate test images for comparison
 */
async function generateTestImages() {
  return {
    // Background removal test image (with solid background)
    bgRemovalImage: await generateTestImage(800, 600, {
      backgroundColor: '#ffffff',
      format: 'png',
    }),
    // Upscaling test image (small image to upscale)
    upscaleImage: await generateTestImage(400, 300, {
      backgroundColor: '#ff6b6b',
      gradient: true,
      format: 'png',
    }),
    // Transparent image for special cases
    transparentImage: await generateTestImage(800, 600, {
      includeTransparency: true,
      format: 'png',
    }),
  }
}

/**
 * Run a comparison test
 */
async function runComparisonTest(
  testName: string,
  v1Func: () => Promise<string>,
  v2Func: () => Promise<string>,
  operation: 'background-removal' | 'upscaling',
  originalDataUrl: string,
  v1ModelName: string,
  v2ModelName: string,
  v1Cost: number,
  v2Cost: number
): Promise<{ v1: ComparisonMetrics; v2: ComparisonMetrics }> {
  console.log(`\n[Comparison Test] ${testName}`)

  // Run V1
  const v1Metrics: ComparisonMetrics = {
    version: 'v1',
    operation: testName,
    modelName: v1ModelName,
    startTime: Date.now(),
    endTime: 0,
    durationMs: 0,
    qualityScore: 0,
    estimatedCost: v1Cost,
    success: false,
  }

  try {
    const v1Result = await v1Func()
    v1Metrics.endTime = Date.now()
    v1Metrics.durationMs = v1Metrics.endTime - v1Metrics.startTime
    v1Metrics.outputDataUrl = v1Result
    v1Metrics.success = true

    // Validate quality
    const beforeData = await extractImageData(originalDataUrl)
    const afterData = await extractImageData(v1Result)
    const qualityResult = await validateOperationQuality(beforeData, afterData, operation)
    v1Metrics.qualityResult = qualityResult
    v1Metrics.qualityScore = qualityResult.score

    console.log(`  [V1] Success: ${v1Metrics.durationMs}ms, Quality: ${v1Metrics.qualityScore}/100`)
  } catch (error) {
    v1Metrics.endTime = Date.now()
    v1Metrics.durationMs = v1Metrics.endTime - v1Metrics.startTime
    v1Metrics.error = error instanceof Error ? error.message : 'Unknown error'
    console.error(`  [V1] Error:`, v1Metrics.error)
  }

  // Run V2
  const v2Metrics: ComparisonMetrics = {
    version: 'v2',
    operation: testName,
    modelName: v2ModelName,
    startTime: Date.now(),
    endTime: 0,
    durationMs: 0,
    qualityScore: 0,
    estimatedCost: v2Cost,
    success: false,
  }

  try {
    const v2Result = await v2Func()
    v2Metrics.endTime = Date.now()
    v2Metrics.durationMs = v2Metrics.endTime - v2Metrics.startTime
    v2Metrics.outputDataUrl = v2Result
    v2Metrics.success = true

    // Validate quality
    const beforeData = await extractImageData(originalDataUrl)
    const afterData = await extractImageData(v2Result)
    const qualityResult = await validateOperationQuality(beforeData, afterData, operation)
    v2Metrics.qualityResult = qualityResult
    v2Metrics.qualityScore = qualityResult.score

    console.log(`  [V2] Success: ${v2Metrics.durationMs}ms, Quality: ${v2Metrics.qualityScore}/100`)
  } catch (error) {
    v2Metrics.endTime = Date.now()
    v2Metrics.durationMs = v2Metrics.endTime - v2Metrics.startTime
    v2Metrics.error = error instanceof Error ? error.message : 'Unknown error'
    console.error(`  [V2] Error:`, v2Metrics.error)
  }

  // Compare
  console.log(`  [Comparison] V1: ${v1Metrics.qualityScore}/100 (${v1Metrics.durationMs}ms, $${v1Cost.toFixed(4)})`)
  console.log(`  [Comparison] V2: ${v2Metrics.qualityScore}/100 (${v2Metrics.durationMs}ms, $${v2Cost.toFixed(4)})`)

  // Save comparison outputs to disk
  if (v1Metrics.success && v2Metrics.success && v1Metrics.outputDataUrl && v2Metrics.outputDataUrl) {
    try {
      const modelSlug = v2ModelName.toLowerCase().replace(/\s+/g, '-')
      const paths = saveComparisonSet(
        operation,
        modelSlug,
        originalDataUrl,
        v1Metrics.outputDataUrl,
        v2Metrics.outputDataUrl
      )
      // Create HTML comparison viewer
      createComparisonHTML(operation, paths)
    } catch (error) {
      console.warn('  [Warning] Failed to save output images:', error)
    }
  }

  return { v1: v1Metrics, v2: v2Metrics }
}

/**
 * Generate markdown comparison report
 */
function generateMarkdownReport(report: ComparisonReport): string {
  const markdown: string[] = []

  markdown.push('# V1 vs V2 Implementation Comparison Report')
  markdown.push('')
  markdown.push(`**Generated:** ${new Date(report.testDate).toLocaleString()}`)
  markdown.push('')
  markdown.push('---')
  markdown.push('')

  // Executive Summary
  markdown.push('## Executive Summary')
  markdown.push('')
  markdown.push(`- **Total Tests:** ${report.totalTests}`)
  markdown.push(`- **Successful:** ${report.successfulTests}`)
  markdown.push(`- **Failed:** ${report.failedTests}`)
  markdown.push(`- **Overall Winner:** ${report.overallWinner.toUpperCase()}`)
  markdown.push('')

  // Background Removal Comparison
  markdown.push('## Background Removal Comparison')
  markdown.push('')
  markdown.push('### V1 Results')
  markdown.push('')
  markdown.push('| Model | Duration | Quality | Cost | Status |')
  markdown.push('|-------|----------|---------|------|--------|')
  report.backgroundRemoval.v1.forEach((m) => {
    markdown.push(
      `| ${m.modelName} | ${m.durationMs}ms | ${m.qualityScore}/100 | $${m.estimatedCost.toFixed(4)} | ${m.success ? '✅' : '❌'} |`
    )
  })
  markdown.push('')

  markdown.push('### V2 Results')
  markdown.push('')
  markdown.push('| Model | Duration | Quality | Cost | Status |')
  markdown.push('|-------|----------|---------|------|--------|')
  report.backgroundRemoval.v2.forEach((m) => {
    markdown.push(
      `| ${m.modelName} | ${m.durationMs}ms | ${m.qualityScore}/100 | $${m.estimatedCost.toFixed(4)} | ${m.success ? '✅' : '❌'} |`
    )
  })
  markdown.push('')

  markdown.push(`**Winner:** ${report.backgroundRemoval.winner.toUpperCase()}`)
  markdown.push('')
  markdown.push(`**Summary:** ${report.backgroundRemoval.summary}`)
  markdown.push('')

  // Upscaling Comparison
  markdown.push('## Upscaling Comparison')
  markdown.push('')
  markdown.push('### V1 Results')
  markdown.push('')
  markdown.push('| Model | Duration | Quality | Cost | Status |')
  markdown.push('|-------|----------|---------|------|--------|')
  report.upscaling.v1.forEach((m) => {
    markdown.push(
      `| ${m.modelName} | ${m.durationMs}ms | ${m.qualityScore}/100 | $${m.estimatedCost.toFixed(4)} | ${m.success ? '✅' : '❌'} |`
    )
  })
  markdown.push('')

  markdown.push('### V2 Results')
  markdown.push('')
  markdown.push('| Model | Duration | Quality | Cost | Status |')
  markdown.push('|-------|----------|---------|------|--------|')
  report.upscaling.v2.forEach((m) => {
    markdown.push(
      `| ${m.modelName} | ${m.durationMs}ms | ${m.qualityScore}/100 | $${m.estimatedCost.toFixed(4)} | ${m.success ? '✅' : '❌'} |`
    )
  })
  markdown.push('')

  markdown.push(`**Winner:** ${report.upscaling.winner.toUpperCase()}`)
  markdown.push('')
  markdown.push(`**Summary:** ${report.upscaling.summary}`)
  markdown.push('')

  // Recommendations
  markdown.push('## Recommendations')
  markdown.push('')
  report.recommendations.forEach((rec) => {
    markdown.push(`- ${rec}`)
  })
  markdown.push('')

  // Success Criteria
  markdown.push('## Success Criteria Validation')
  markdown.push('')
  markdown.push('### Criteria 1: V2 completes without errors')
  const v2NoErrors = [...report.backgroundRemoval.v2, ...report.upscaling.v2].every((m) => m.success)
  markdown.push(`**Status:** ${v2NoErrors ? '✅ PASSED' : '❌ FAILED'}`)
  markdown.push('')

  markdown.push('### Criteria 2: V2 quality >= V1 quality')
  const bgQualityDiff =
    (report.backgroundRemoval.v2[0]?.qualityScore || 0) -
    (report.backgroundRemoval.v1[0]?.qualityScore || 0)
  const upQualityDiff =
    (report.upscaling.v2[0]?.qualityScore || 0) - (report.upscaling.v1[0]?.qualityScore || 0)
  markdown.push(
    `**Background Removal:** ${bgQualityDiff >= -10 ? '✅ PASSED' : '❌ FAILED'} (diff: ${bgQualityDiff.toFixed(1)})`
  )
  markdown.push(
    `**Upscaling:** ${upQualityDiff >= -10 ? '✅ PASSED' : '❌ FAILED'} (diff: ${upQualityDiff.toFixed(1)})`
  )
  markdown.push('')

  markdown.push('### Criteria 3: V2 cost <= 2x V1 cost')
  const bgCostRatio =
    (report.backgroundRemoval.v2[0]?.estimatedCost || 0) /
    (report.backgroundRemoval.v1[0]?.estimatedCost || 1)
  const upCostRatio =
    (report.upscaling.v2[0]?.estimatedCost || 0) / (report.upscaling.v1[0]?.estimatedCost || 1)
  markdown.push(
    `**Background Removal:** ${bgCostRatio <= 2 ? '✅ PASSED' : '⚠️ WARNING'} (${bgCostRatio.toFixed(1)}x)`
  )
  markdown.push(
    `**Upscaling:** ${upCostRatio <= 2 ? '✅ PASSED' : '⚠️ WARNING'} (${upCostRatio.toFixed(1)}x)`
  )
  markdown.push('')

  markdown.push('### Criteria 4: No corrupted outputs')
  const noCorruption = [...report.backgroundRemoval.v2, ...report.upscaling.v2].every(
    (m) => !m.qualityResult || m.qualityResult.checks.corruption.passed
  )
  markdown.push(`**Status:** ${noCorruption ? '✅ PASSED' : '❌ FAILED'}`)
  markdown.push('')

  return markdown.join('\n')
}

/**
 * Save comparison report to markdown file
 */
function saveComparisonReport(report: ComparisonReport) {
  const markdown = generateMarkdownReport(report)
  const reportPath = join(process.cwd(), 'tests', 'comparison-report.md')
  writeFileSync(reportPath, markdown, 'utf-8')
  console.log(`\n[Comparison Report] Saved to ${reportPath}`)
}

// ===== TEST SUITE =====

describe('V1 vs V2 Comparison Test Suite', () => {
  beforeAll(async () => {
    setupReplicateMocks()
    clearCostLogs()
    console.log('\n[Setup] Replicate API mocks configured')
    console.log('[Setup] Starting V1 vs V2 comparison tests...\n')
  })

  afterAll(() => {
    // Analyze results
    const bgV1Avg =
      comparisonReport.backgroundRemoval.v1.reduce((sum, m) => sum + m.qualityScore, 0) /
      comparisonReport.backgroundRemoval.v1.length
    const bgV2Avg =
      comparisonReport.backgroundRemoval.v2.reduce((sum, m) => sum + m.qualityScore, 0) /
      comparisonReport.backgroundRemoval.v2.length

    comparisonReport.backgroundRemoval.winner = bgV2Avg > bgV1Avg ? 'v2' : bgV1Avg > bgV2Avg ? 'v1' : 'tie'
    comparisonReport.backgroundRemoval.summary = `V2 average quality: ${bgV2Avg.toFixed(1)}/100, V1 average: ${bgV1Avg.toFixed(1)}/100`

    const upV1Avg =
      comparisonReport.upscaling.v1.reduce((sum, m) => sum + m.qualityScore, 0) /
      comparisonReport.upscaling.v1.length
    const upV2Avg =
      comparisonReport.upscaling.v2.reduce((sum, m) => sum + m.qualityScore, 0) /
      comparisonReport.upscaling.v2.length

    comparisonReport.upscaling.winner = upV2Avg > upV1Avg ? 'v2' : upV1Avg > upV2Avg ? 'v1' : 'tie'
    comparisonReport.upscaling.summary = `V2 average quality: ${upV2Avg.toFixed(1)}/100, V1 average: ${upV1Avg.toFixed(1)}/100`

    // Overall winner
    const v2Wins =
      (comparisonReport.backgroundRemoval.winner === 'v2' ? 1 : 0) +
      (comparisonReport.upscaling.winner === 'v2' ? 1 : 0)
    const v1Wins =
      (comparisonReport.backgroundRemoval.winner === 'v1' ? 1 : 0) +
      (comparisonReport.upscaling.winner === 'v1' ? 1 : 0)
    comparisonReport.overallWinner = v2Wins > v1Wins ? 'v2' : v1Wins > v2Wins ? 'v1' : 'tie'

    // Recommendations
    if (bgV2Avg > bgV1Avg && bgV2Avg - bgV1Avg >= 10) {
      comparisonReport.recommendations.push(
        'Background removal: V2 shows significant quality improvement. Consider migration.'
      )
    }
    if (upV2Avg > upV1Avg && upV2Avg - upV1Avg >= 10) {
      comparisonReport.recommendations.push(
        'Upscaling: V2 shows significant quality improvement. Consider migration.'
      )
    }

    const bgCostRatio =
      comparisonReport.backgroundRemoval.v2[0]?.estimatedCost /
      comparisonReport.backgroundRemoval.v1[0]?.estimatedCost
    if (bgCostRatio > 2) {
      comparisonReport.recommendations.push(
        `Background removal: V2 costs ${bgCostRatio.toFixed(1)}x more. Use v2 for premium tier only.`
      )
    }

    // Save report
    saveComparisonReport(comparisonReport)

    console.log('\n[Teardown] Comparison tests complete!')
    console.log(`[Teardown] Overall Winner: ${comparisonReport.overallWinner.toUpperCase()}`)
  })

  describe('Background Removal Comparison', () => {
    it('should compare Bria RMBG 1.4 (v1) vs RMBG 2.0 (v2)', async () => {
      comparisonReport.totalTests++

      const testImages = await generateTestImages()
      const testFile = generateTestFile(testImages.bgRemovalImage, 'test-bg.png', 'image/png')

      const { v1, v2 } = await runComparisonTest(
        'Background Removal: Bria RMBG',
        // V1: Bria RMBG 1.4
        () =>
          removeBackground({
            image: testFile,
            settings: { model: 'bria' } as BackgroundRemovalSettings,
          }),
        // V2: RMBG 2.0
        () =>
          removeBackgroundV2({
            image: testFile,
            settings: {
              preserve_alpha: true,
              fallback_to_v1: false,
            } as BackgroundRemovalV2Settings,
          }),
        'background-removal',
        testImages.bgRemovalImage,
        'Bria RMBG 1.4',
        'BRIA RMBG 2.0',
        0.003, // V1 estimated cost
        0.018 // V2 cost from MODEL_AVAILABILITY.md
      )

      comparisonReport.backgroundRemoval.v1.push(v1)
      comparisonReport.backgroundRemoval.v2.push(v2)

      if (v1.success) comparisonReport.successfulTests++
      else comparisonReport.failedTests++

      if (v2.success) comparisonReport.successfulTests++
      else comparisonReport.failedTests++

      // Assertions
      expect(v2.success).toBe(true)
      expect(v2.qualityScore).toBeGreaterThanOrEqual(v1.qualityScore - 10)
      expect(v2.qualityResult?.checks.corruption.passed).toBe(true)
    }, 30000) // 30 second timeout
  })

  describe('Upscaling Comparison', () => {
    it('should compare Real-ESRGAN (v1) vs Magic Refiner (v2)', async () => {
      comparisonReport.totalTests++

      const testImages = await generateTestImages()
      const testFile = generateTestFile(testImages.upscaleImage, 'test-upscale.png', 'image/png')

      const { v1, v2 } = await runComparisonTest(
        'Upscaling: Real-ESRGAN vs Magic Refiner',
        // V1: Real-ESRGAN
        () =>
          upscaleImage({
            image: testFile,
            settings: { model: 'standard', scaleFactor: 2 } as UpscaleSettings,
          }),
        // V2: Magic Refiner
        () =>
          upscaleImageV2({
            image: testFile,
            settings: {
              model: 'magic-refiner',
              scaleFactor: 2,
              creativity: 0.25,
              resemblance: 0.75,
              fallback_to_v1: false,
            } as UpscaleSettingsV2,
          }),
        'upscaling',
        testImages.upscaleImage,
        'Real-ESRGAN',
        'Magic Image Refiner',
        0.002, // V1 estimated cost
        0.006 // V2 cost from upscale-v2.ts
      )

      comparisonReport.upscaling.v1.push(v1)
      comparisonReport.upscaling.v2.push(v2)

      if (v1.success) comparisonReport.successfulTests++
      else comparisonReport.failedTests++

      if (v2.success) comparisonReport.successfulTests++
      else comparisonReport.failedTests++

      // Assertions
      expect(v2.success).toBe(true)
      expect(v2.qualityScore).toBeGreaterThanOrEqual(v1.qualityScore - 10)
      expect(v2.qualityResult?.checks.corruption.passed).toBe(true)
    }, 30000)

    it('should compare Real-ESRGAN (v1) vs SwinIR (v2)', async () => {
      comparisonReport.totalTests++

      const testImages = await generateTestImages()
      const testFile = generateTestFile(testImages.upscaleImage, 'test-upscale.png', 'image/png')

      const { v1, v2 } = await runComparisonTest(
        'Upscaling: Real-ESRGAN vs SwinIR',
        // V1: Real-ESRGAN
        () =>
          upscaleImage({
            image: testFile,
            settings: { model: 'standard', scaleFactor: 2 } as UpscaleSettings,
          }),
        // V2: SwinIR
        () =>
          upscaleImageV2({
            image: testFile,
            settings: {
              model: 'swinir',
              scaleFactor: 2,
              noise_level: 0,
              fallback_to_v1: false,
            } as UpscaleSettingsV2,
          }),
        'upscaling',
        testImages.upscaleImage,
        'Real-ESRGAN',
        'SwinIR',
        0.002, // V1 estimated cost
        0.004 // V2 cost from upscale-v2.ts
      )

      comparisonReport.upscaling.v1.push(v1)
      comparisonReport.upscaling.v2.push(v2)

      if (v1.success) comparisonReport.successfulTests++
      else comparisonReport.failedTests++

      if (v2.success) comparisonReport.successfulTests++
      else comparisonReport.failedTests++

      // Assertions
      expect(v2.success).toBe(true)
      expect(v2.qualityScore).toBeGreaterThanOrEqual(v1.qualityScore - 10)
      expect(v2.qualityResult?.checks.corruption.passed).toBe(true)
    }, 30000)
  })

  describe('Success Criteria Validation', () => {
    it('should validate all V2 implementations complete without errors', () => {
      const allV2Tests = [...comparisonReport.backgroundRemoval.v2, ...comparisonReport.upscaling.v2]
      const allSuccess = allV2Tests.every((m) => m.success)

      expect(allSuccess).toBe(true)
    })

    it('should validate V2 quality >= V1 quality (within 10 points)', () => {
      const bgDiff =
        (comparisonReport.backgroundRemoval.v2[0]?.qualityScore || 0) -
        (comparisonReport.backgroundRemoval.v1[0]?.qualityScore || 0)
      const upDiff =
        (comparisonReport.upscaling.v2[0]?.qualityScore || 0) -
        (comparisonReport.upscaling.v1[0]?.qualityScore || 0)

      expect(bgDiff).toBeGreaterThanOrEqual(-10)
      expect(upDiff).toBeGreaterThanOrEqual(-10)
    })

    it('should validate V2 cost <= 2x V1 cost (or quality justifies it)', () => {
      const bgCostRatio =
        (comparisonReport.backgroundRemoval.v2[0]?.estimatedCost || 0) /
        (comparisonReport.backgroundRemoval.v1[0]?.estimatedCost || 1)
      const upCostRatio =
        (comparisonReport.upscaling.v2[0]?.estimatedCost || 0) /
        (comparisonReport.upscaling.v1[0]?.estimatedCost || 1)

      // Either cost is within 2x OR quality is significantly better (>15 points)
      const bgQualityGain =
        (comparisonReport.backgroundRemoval.v2[0]?.qualityScore || 0) -
        (comparisonReport.backgroundRemoval.v1[0]?.qualityScore || 0)
      const upQualityGain =
        (comparisonReport.upscaling.v2[0]?.qualityScore || 0) -
        (comparisonReport.upscaling.v1[0]?.qualityScore || 0)

      expect(bgCostRatio <= 2 || bgQualityGain >= 15).toBe(true)
      expect(upCostRatio <= 2 || upQualityGain >= 15).toBe(true)
    })

    it('should validate no corrupted outputs from V2', () => {
      const allV2Tests = [...comparisonReport.backgroundRemoval.v2, ...comparisonReport.upscaling.v2]
      const noCorruption = allV2Tests.every(
        (m) => m.qualityResult && m.qualityResult.checks.corruption.passed
      )

      expect(noCorruption).toBe(true)
    })
  })
})
