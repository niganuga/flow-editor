/**
 * Result Validator Tests
 *
 * Comprehensive test suite for result validation functionality.
 * Tests pixel-level comparison, tool-specific validation, and quality scoring.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  validateToolResult,
  getExpectedOperation,
  formatValidationSummary,
  type ResultValidation,
} from '../lib/result-validator';
import type { ImageAnalysis } from '../lib/image-analyzer';

// ===== MOCKS =====

// Mock image analyzer
vi.mock('../lib/image-analyzer', () => ({
  analyzeImage: vi.fn(),
}));

// Mock canvas utils
vi.mock('../lib/canvas-utils', () => ({
  loadImage: vi.fn(),
}));

import { analyzeImage } from '../lib/image-analyzer';
import { loadImage } from '../lib/canvas-utils';

// ===== TEST DATA =====

const mockBeforeAnalysis: ImageAnalysis = {
  width: 1920,
  height: 1080,
  aspectRatio: '16:9',
  dpi: null,
  fileSize: 500000,
  format: 'png',
  hasTransparency: false,
  dominantColors: [
    { r: 255, g: 0, b: 0, hex: '#ff0000', percentage: 30 },
    { r: 0, g: 255, b: 0, hex: '#00ff00', percentage: 25 },
    { r: 0, g: 0, b: 255, hex: '#0000ff', percentage: 20 },
  ],
  colorDepth: 24,
  uniqueColorCount: 5000,
  isBlurry: false,
  sharpnessScore: 75,
  noiseLevel: 15,
  isPrintReady: true,
  printableAtSize: { width: 6.4, height: 3.6 },
  analyzedAt: Date.now(),
  confidence: 95,
};

const mockAfterAnalysisTransparent: ImageAnalysis = {
  ...mockBeforeAnalysis,
  hasTransparency: true,
  colorDepth: 32,
  uniqueColorCount: 4800, // Color removed
  sharpnessScore: 73, // Slight quality loss
  noiseLevel: 16,
};

const mockAfterAnalysisUpscaled: ImageAnalysis = {
  ...mockBeforeAnalysis,
  width: 3840,
  height: 2160,
  fileSize: 2000000,
  sharpnessScore: 77, // Quality improved
};

// ===== HELPER FUNCTIONS =====

let canvasCallCount = 0;

function createMockCanvas(width: number, height: number, fillPattern?: 'solid' | 'changed' | 'mostly_changed') {
  const canvas = {
    width,
    height,
    getContext: vi.fn(() => ({
      drawImage: vi.fn(),
      getImageData: vi.fn(() => {
        const length = width * height * 4;
        const data = new Uint8ClampedArray(length);

        // Alternate data between calls to simulate before/after
        canvasCallCount++;
        const isAfter = canvasCallCount % 2 === 0;

        // Fill with pattern
        if (fillPattern === 'solid') {
          // All red (no change between before/after)
          for (let i = 0; i < length; i += 4) {
            data[i] = 255; // R
            data[i + 1] = 0; // G
            data[i + 2] = 0; // B
            data[i + 3] = 255; // A
          }
        } else if (fillPattern === 'changed') {
          // Half changed (50% different)
          for (let i = 0; i < length; i += 4) {
            const pixelIndex = i / 4;
            const halfPixels = (width * height) / 2;

            if (!isAfter || pixelIndex < halfPixels) {
              // Before: all red, After: first half red
              data[i] = 255; // R
              data[i + 1] = 0; // G
              data[i + 2] = 0; // B
              data[i + 3] = 255; // A
            } else {
              // After: second half blue (CHANGED - differs by >10)
              data[i] = 0; // R
              data[i + 1] = 0; // G
              data[i + 2] = 255; // B (CHANGED)
              data[i + 3] = 255; // A
            }
          }
        } else if (fillPattern === 'mostly_changed') {
          // 96% changed
          for (let i = 0; i < length; i += 4) {
            const pixelIndex = i / 4;
            const totalPixels = width * height;
            const unchangedPixels = Math.floor(totalPixels * 0.04); // 4% unchanged

            if (!isAfter || pixelIndex < unchangedPixels) {
              // Before: all red, After: first 4% red
              data[i] = 255; // R
              data[i + 1] = 0; // G
              data[i + 2] = 0; // B
              data[i + 3] = 255; // A
            } else {
              // After: 96% white (CHANGED)
              data[i] = 255; // R
              data[i + 1] = 255; // G (CHANGED by 255)
              data[i + 2] = 255; // B (CHANGED by 255)
              data[i + 3] = 255; // A
            }
          }
        }

        return { data };
      }),
    })),
  };

  return canvas as unknown as HTMLCanvasElement;
}

function createMockImage(width: number, height: number) {
  return {
    width,
    height,
    naturalWidth: width,
    naturalHeight: height,
  } as HTMLImageElement;
}

// ===== TEST SUITES =====

describe('Result Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvasCallCount = 0; // Reset counter

    // Setup DOM mocks
    global.document = {
      createElement: vi.fn((tag: string) => {
        if (tag === 'canvas') {
          return createMockCanvas(100, 100, 'solid');
        }
        return {};
      }),
    } as any;
  });

  // ===== HELPER FUNCTION TESTS =====

  describe('getExpectedOperation', () => {
    it('should return transparency_change for color_knockout', () => {
      expect(getExpectedOperation('color_knockout')).toBe('transparency_change');
    });

    it('should return transparency_change for background_remover', () => {
      expect(getExpectedOperation('background_remover')).toBe('transparency_change');
    });

    it('should return color_change for recolor_image', () => {
      expect(getExpectedOperation('recolor_image')).toBe('color_change');
    });

    it('should return quality_enhancement for upscaler', () => {
      expect(getExpectedOperation('upscaler')).toBe('quality_enhancement');
    });

    it('should return info_only for extract_color_palette', () => {
      expect(getExpectedOperation('extract_color_palette')).toBe('info_only');
    });

    it('should return color_change for unknown tools', () => {
      expect(getExpectedOperation('unknown_tool')).toBe('color_change');
    });
  });

  describe('formatValidationSummary', () => {
    it('should format validation result into human-readable text', () => {
      const validation: ResultValidation = {
        success: true,
        pixelsChanged: 50000,
        percentageChanged: 2.41,
        qualityScore: 92,
        significantChange: true,
        visualDifference: {
          maxDelta: 255,
          avgDelta: 127.5,
          colorShiftAmount: 85.3,
        },
        warnings: ['Test warning'],
        reasoning: 'Test completed successfully',
      };

      const summary = formatValidationSummary(validation);

      expect(summary).toContain('Success: YES');
      expect(summary).toContain('Quality Score: 92/100');
      expect(summary).toContain('50,000');
      expect(summary).toContain('2.41%');
      expect(summary).toContain('WARNINGS:');
      expect(summary).toContain('Test warning');
    });
  });

  // ===== COLOR KNOCKOUT VALIDATION =====

  describe('validateToolResult - Color Knockout', () => {
    it('should validate successful color knockout with transparency', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockAfterAnalysisTransparent);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'changed')
      ) as any;

      const result = await validateToolResult({
        toolName: 'color_knockout',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.success).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(60);
      expect(result.significantChange).toBe(true);
    });

    it('should fail if transparency not created', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis); // No transparency

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'solid')
      ) as any;

      const result = await validateToolResult({
        toolName: 'color_knockout',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.success).toBe(false);
      expect(result.reasoning).toContain('transparency');
    });

    it('should warn if minimal change detected', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockAfterAnalysisTransparent);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'solid')
      ) as any; // 0% change

      const result = await validateToolResult({
        toolName: 'color_knockout',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ===== RECOLOR VALIDATION =====

  describe('validateToolResult - Recolor Image', () => {
    it('should validate successful recolor', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis); // Same dimensions

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'changed')
      ) as any;

      const result = await validateToolResult({
        toolName: 'recolor_image',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'color_change',
      });

      expect(result.success).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(60);
    });

    it('should warn if too many pixels changed', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'mostly_changed')
      ) as any;

      const result = await validateToolResult({
        toolName: 'recolor_image',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'color_change',
      });

      expect(result.warnings.some(w => w.includes('95%') || w.includes('entire'))).toBe(true);
    });
  });

  // ===== BACKGROUND REMOVER VALIDATION =====

  describe('validateToolResult - Background Remover', () => {
    it('should validate successful background removal', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockAfterAnalysisTransparent);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'changed')
      ) as any;

      const result = await validateToolResult({
        toolName: 'background_remover',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.success).toBe(true);
      expect(result.qualityScore).toBeGreaterThan(50);
    });

    it('should fail if no transparency added', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis); // No transparency

      const result = await validateToolResult({
        toolName: 'background_remover',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.success).toBe(false);
      expect(result.reasoning.toLowerCase()).toContain('transparen');
    });

    it('should warn if minimal change detected', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockAfterAnalysisTransparent);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'solid')
      ) as any; // Minimal change

      const result = await validateToolResult({
        toolName: 'background_remover',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.warnings.some(w => w.includes('10%'))).toBe(true);
    });
  });

  // ===== UPSCALER VALIDATION =====

  describe('validateToolResult - Upscaler', () => {
    it('should validate successful upscaling', async () => {
      const mockImgBefore = createMockImage(100, 100);
      const mockImgAfter = createMockImage(200, 200);

      (loadImage as any)
        .mockResolvedValueOnce(mockImgBefore)
        .mockResolvedValueOnce(mockImgAfter);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockAfterAnalysisUpscaled);

      const result = await validateToolResult({
        toolName: 'upscaler',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'quality_enhancement',
      });

      expect(result.success).toBe(true);
      expect(result.percentageChanged).toBe(100); // Dimensions changed
    });

    it('should fail if dimensions did not change', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis); // Same dimensions

      const result = await validateToolResult({
        toolName: 'upscaler',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'quality_enhancement',
      });

      expect(result.success).toBe(false);
      expect(result.reasoning).toContain('dimensions');
    });

    it('should warn if sharpness decreased', async () => {
      const mockImgBefore = createMockImage(100, 100);
      const mockImgAfter = createMockImage(200, 200);

      (loadImage as any)
        .mockResolvedValueOnce(mockImgBefore)
        .mockResolvedValueOnce(mockImgAfter);

      const degradedAnalysis = {
        ...mockAfterAnalysisUpscaled,
        sharpnessScore: 60, // Decreased from 75
      };

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(degradedAnalysis);

      const result = await validateToolResult({
        toolName: 'upscaler',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'quality_enhancement',
      });

      expect(result.warnings.some(w => w.includes('Sharpness'))).toBe(true);
    });
  });

  // ===== TEXTURE CUT VALIDATION =====

  describe('validateToolResult - Texture Cut', () => {
    it('should validate successful texture application', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'changed')
      ) as any;

      const result = await validateToolResult({
        toolName: 'texture_cut',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.success).toBe(true);
    });

    it('should warn if minimal texture effect', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'solid')
      ) as any; // Minimal change

      const result = await validateToolResult({
        toolName: 'texture_cut',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result.warnings.some(w => w.includes('5%'))).toBe(true);
    });
  });

  // ===== INFO TOOLS =====

  describe('validateToolResult - Info Tools', () => {
    it('should pass for extract_color_palette (no modification expected)', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'solid')
      ) as any;

      const result = await validateToolResult({
        toolName: 'extract_color_palette',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'info_only',
      });

      expect(result.success).toBe(true);
      expect(result.reasoning).toContain('Info tool');
    });

    it('should pass for pick_color_at_position (no modification expected)', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'solid')
      ) as any;

      const result = await validateToolResult({
        toolName: 'pick_color_at_position',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'info_only',
      });

      expect(result.success).toBe(true);
      expect(result.reasoning).toContain('Info tool');
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling', () => {
    it('should handle image load errors gracefully', async () => {
      (loadImage as any).mockRejectedValue(new Error('Load failed'));

      const result = await validateToolResult({
        toolName: 'color_knockout',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.reasoning).toContain('error');
    });

    it('should never throw errors - always return validation object', async () => {
      (loadImage as any).mockImplementation(() => {
        throw new Error('Catastrophic failure');
      });

      const result = await validateToolResult({
        toolName: 'color_knockout',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
      expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    });

    it('should handle corrupted images', async () => {
      const corruptedImg = createMockImage(0, 0);
      (loadImage as any).mockResolvedValue(corruptedImg);

      const corruptedAnalysis = {
        ...mockBeforeAnalysis,
        width: 0,
        height: 0,
        confidence: 0,
      };

      (analyzeImage as any).mockResolvedValue(corruptedAnalysis);

      const result = await validateToolResult({
        toolName: 'color_knockout',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
      });

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();
    });
  });

  // ===== EDGE CASES =====

  describe('Edge Cases', () => {
    it('should handle unknown tool gracefully', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockBeforeAnalysis);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'changed')
      ) as any;

      const result = await validateToolResult({
        toolName: 'unknown_tool',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'color_change',
      });

      expect(result.success).toBe(true); // Defaults to generic validation
    });

    it('should handle progress callbacks', async () => {
      const mockImg = createMockImage(100, 100);
      (loadImage as any).mockResolvedValue(mockImg);

      (analyzeImage as any)
        .mockResolvedValueOnce(mockBeforeAnalysis)
        .mockResolvedValueOnce(mockAfterAnalysisTransparent);

      global.document.createElement = vi.fn(() =>
        createMockCanvas(100, 100, 'changed')
      ) as any;

      const progressCalls: Array<{ progress: number; message: string }> = [];

      const result = await validateToolResult({
        toolName: 'color_knockout',
        beforeImageUrl: 'before.png',
        afterImageUrl: 'after.png',
        expectedOperation: 'transparency_change',
        onProgress: (progress, message) => {
          progressCalls.push({ progress, message });
        },
      });

      expect(result).toBeDefined();
      expect(progressCalls.length).toBeGreaterThan(0);
      expect(progressCalls[progressCalls.length - 1].progress).toBe(100);
    });
  });
});
