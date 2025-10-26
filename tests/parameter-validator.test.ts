/**
 * Parameter Validator Tests
 *
 * Tests the hallucination prevention layer across all tools.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  validateToolParameters,
  quickValidate,
  type ValidationResult,
} from '../lib/parameter-validator';
import type { ImageAnalysis } from '../lib/image-analyzer';

// ===== MOCK DATA =====

/**
 * Mock image analysis for a typical photo
 */
const mockImageAnalysis: ImageAnalysis = {
  width: 1920,
  height: 1080,
  aspectRatio: '16:9',
  dpi: null,
  fileSize: 524288,
  format: 'png',
  hasTransparency: false,
  dominantColors: [
    { r: 255, g: 0, b: 0, hex: '#ff0000', percentage: 35 }, // Red
    { r: 0, g: 255, b: 0, hex: '#00ff00', percentage: 25 }, // Green
    { r: 0, g: 0, b: 255, hex: '#0000ff', percentage: 20 }, // Blue
    { r: 255, g: 255, b: 255, hex: '#ffffff', percentage: 15 }, // White
    { r: 0, g: 0, b: 0, hex: '#000000', percentage: 5 }, // Black
  ],
  colorDepth: 24,
  uniqueColorCount: 5000,
  isBlurry: false,
  sharpnessScore: 75,
  noiseLevel: 20,
  isPrintReady: true,
  printableAtSize: { width: 6.4, height: 3.6 },
  analyzedAt: Date.now(),
  confidence: 95,
};

/**
 * Mock noisy image analysis
 */
const mockNoisyImageAnalysis: ImageAnalysis = {
  ...mockImageAnalysis,
  noiseLevel: 45,
  sharpnessScore: 40,
  isPrintReady: false,
};

/**
 * Mock simple/flat image analysis
 */
const mockSimpleImageAnalysis: ImageAnalysis = {
  ...mockImageAnalysis,
  uniqueColorCount: 150,
  dominantColors: [
    { r: 255, g: 255, b: 255, hex: '#ffffff', percentage: 60 },
    { r: 0, g: 0, b: 255, hex: '#0000ff', percentage: 40 },
  ],
  noiseLevel: 5,
};

// Mock image URL (1x1 red pixel as data URL)
// Note: This is actually a red pixel (255,0,0)
const mockImageUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5/hPwAIAgL/l2mmZAAAAABJRU5ErkJggg==';

// ===== SCHEMA VALIDATION TESTS =====

describe('Schema Validation', () => {
  it('should reject unknown tool', async () => {
    const result = await validateToolParameters(
      'unknown_tool',
      {},
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.errors[0]).toContain('Unknown tool');
  });

  it('should validate required parameters', async () => {
    const result = quickValidate('color_knockout', {
      // Missing required 'colors' parameter
      tolerance: 30,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Missing required parameter: colors');
  });

  it('should validate parameter types', async () => {
    const result = quickValidate('color_knockout', {
      colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
      tolerance: 'invalid', // Should be number
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('wrong type');
  });

  it('should validate enum values', async () => {
    const result = quickValidate('color_knockout', {
      colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
      replaceMode: 'invalid_mode', // Should be transparency|color|mask
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('invalid value');
  });

  it('should validate number ranges', async () => {
    const result = quickValidate('color_knockout', {
      colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
      tolerance: 150, // Maximum is 100
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('above maximum');
  });
});

// ===== COLOR KNOCKOUT VALIDATION TESTS =====

describe('Color Knockout Validation', () => {
  it('should validate valid color knockout parameters', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 30,
        replaceMode: 'transparency',
        antiAliasing: true,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should warn about high tolerance on clean images', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 50, // Too high for low-noise image
      },
      mockSimpleImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('too loose');
    expect(result.confidence).toBeLessThan(100);
  });

  it('should warn about low tolerance on noisy images', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 15, // Too low for high-noise image
      },
      mockNoisyImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('too strict');
    expect(result.confidence).toBeLessThan(100);
  });

  it('should reject empty colors array', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [],
        tolerance: 30,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('No colors specified');
  });

  it('should warn about transparency mode on non-PNG', async () => {
    const jpegAnalysis = { ...mockImageAnalysis, format: 'jpeg', hasTransparency: false };

    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 30,
        replaceMode: 'transparency',
      },
      jpegAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('may not support transparency'))).toBe(true);
    expect(result.confidence).toBeLessThan(100);
  });
});

// ===== RECOLOR VALIDATION TESTS =====

describe('Recolor Validation', () => {
  it('should validate valid recolor parameters', async () => {
    const result = await validateToolParameters(
      'recolor_image',
      {
        colorMappings: [
          { originalIndex: 0, newColor: '#00ff00' },
          { originalIndex: 1, newColor: '#0000ff' },
        ],
        tolerance: 30,
        blendMode: 'replace',
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should reject empty color mappings', async () => {
    const result = await validateToolParameters(
      'recolor_image',
      {
        colorMappings: [],
        tolerance: 30,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('No color mappings');
  });

  it('should reject invalid palette index', async () => {
    const result = await validateToolParameters(
      'recolor_image',
      {
        colorMappings: [
          { originalIndex: 99, newColor: '#00ff00' }, // Out of bounds
        ],
        tolerance: 30,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Invalid originalIndex');
  });

  it('should warn about too many mappings', async () => {
    const manyMappings = Array.from({ length: 20 }, (_, i) => ({
      originalIndex: 0,
      newColor: '#00ff00',
    }));

    const result = await validateToolParameters(
      'recolor_image',
      {
        colorMappings: manyMappings,
        tolerance: 30,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('exceeds dominant color count'))).toBe(true);
  });

  it('should warn about similar colors', async () => {
    const result = await validateToolParameters(
      'recolor_image',
      {
        colorMappings: [
          { originalIndex: 0, newColor: '#ff0000' }, // Almost identical to original red
        ],
        tolerance: 30,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('very similar'))).toBe(true);
  });

  it('should warn about low tolerance on complex images', async () => {
    const complexAnalysis = { ...mockImageAnalysis, uniqueColorCount: 15000 };

    const result = await validateToolParameters(
      'recolor_image',
      {
        colorMappings: [{ originalIndex: 0, newColor: '#00ff00' }],
        tolerance: 15, // Too low for complex image
      },
      complexAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('color complexity'))).toBe(true);
  });
});

// ===== TEXTURE CUT VALIDATION TESTS =====

describe('Texture Cut Validation', () => {
  it('should validate valid texture cut parameters', async () => {
    const result = await validateToolParameters(
      'texture_cut',
      {
        textureType: 'noise',
        amount: 0.5,
        scale: 1.0,
        rotation: 0,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should reject custom texture type', async () => {
    const result = await validateToolParameters(
      'texture_cut',
      {
        textureType: 'custom',
        amount: 0.5,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Custom texture requires user upload');
  });

  it('should warn about very low amount', async () => {
    const result = await validateToolParameters(
      'texture_cut',
      {
        textureType: 'dots',
        amount: 0.05, // Very low
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('very low'))).toBe(true);
  });

  it('should warn about very high amount', async () => {
    const result = await validateToolParameters(
      'texture_cut',
      {
        textureType: 'lines',
        amount: 0.95, // Very high
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('very high'))).toBe(true);
  });

  it('should warn about small scale on large images', async () => {
    const largeImageAnalysis = { ...mockImageAnalysis, width: 4000, height: 3000 };

    const result = await validateToolParameters(
      'texture_cut',
      {
        textureType: 'grid',
        amount: 0.5,
        scale: 0.3, // Too small for large image
      },
      largeImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('too small'))).toBe(true);
  });
});

// ===== UPSCALER VALIDATION TESTS =====

describe('Upscaler Validation', () => {
  it('should validate reasonable upscale parameters', async () => {
    const result = await validateToolParameters(
      'upscaler',
      {
        scaleFactor: 2,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should reject excessive output size', async () => {
    const result = await validateToolParameters(
      'upscaler',
      {
        scaleFactor: 10, // Would create 19200x10800 = 207MP image
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('exceeds maximum');
  });

  it('should warn about upscaling blurry images', async () => {
    const blurryAnalysis = { ...mockImageAnalysis, sharpnessScore: 30, isBlurry: true };

    const result = await validateToolParameters(
      'upscaler',
      {
        scaleFactor: 4,
      },
      blurryAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('low sharpness'))).toBe(true);
    expect(result.confidence).toBeLessThan(80);
  });

  it('should warn about upscaling noisy images', async () => {
    const result = await validateToolParameters(
      'upscaler',
      {
        scaleFactor: 4,
      },
      mockNoisyImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('high noise'))).toBe(true);
  });

  it('should warn about aggressive upscaling of small images', async () => {
    const smallImageAnalysis = { ...mockImageAnalysis, width: 400, height: 300 };

    const result = await validateToolParameters(
      'upscaler',
      {
        scaleFactor: 6,
      },
      smallImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('small image'))).toBe(true);
  });
});

// ===== BACKGROUND REMOVER VALIDATION TESTS =====

describe('Background Remover Validation', () => {
  it('should validate background remover on typical image', async () => {
    const result = await validateToolParameters(
      'background_remover',
      {},
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should warn about large images', async () => {
    const largeImageAnalysis = {
      ...mockImageAnalysis,
      width: 6000,
      height: 4000,
    };

    const result = await validateToolParameters(
      'background_remover',
      {},
      largeImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('Large image'))).toBe(true);
  });

  it('should warn about complex color distribution', async () => {
    const complexAnalysis = {
      ...mockImageAnalysis,
      uniqueColorCount: 80000,
      dominantColors: [
        { r: 255, g: 0, b: 0, hex: '#ff0000', percentage: 10 },
        { r: 0, g: 255, b: 0, hex: '#00ff00', percentage: 10 },
        // Many similar colors
      ],
    };

    const result = await validateToolParameters(
      'background_remover',
      {},
      complexAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('complex color distribution'))).toBe(true);
  });

  it('should warn about existing transparency', async () => {
    const transparentAnalysis = { ...mockImageAnalysis, hasTransparency: true };

    const result = await validateToolParameters(
      'background_remover',
      {},
      transparentAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('already has transparency'))).toBe(true);
  });
});

// ===== EXTRACT COLOR PALETTE VALIDATION TESTS =====

describe('Extract Color Palette Validation', () => {
  it('should validate palette extraction', async () => {
    const result = await validateToolParameters(
      'extract_color_palette',
      {
        paletteSize: 9,
        algorithm: 'smart',
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should warn about large palette on simple images', async () => {
    const result = await validateToolParameters(
      'extract_color_palette',
      {
        paletteSize: 36, // Too large for simple image
        algorithm: 'detailed',
      },
      mockSimpleImageAnalysis,
      mockImageUrl
    );

    expect(result.warnings.some(w => w.includes('may be excessive'))).toBe(true);
  });
});

// ===== PICK COLOR VALIDATION TESTS =====

describe('Pick Color Validation', () => {
  it('should validate coordinates within bounds', async () => {
    const result = await validateToolParameters(
      'pick_color_at_position',
      {
        x: 960,
        y: 540,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(true);
    expect(result.confidence).toBeGreaterThan(70);
  });

  it('should reject X coordinate out of bounds', async () => {
    const result = await validateToolParameters(
      'pick_color_at_position',
      {
        x: 2000, // Out of bounds (image is 1920px wide)
        y: 540,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('outside image bounds');
  });

  it('should reject Y coordinate out of bounds', async () => {
    const result = await validateToolParameters(
      'pick_color_at_position',
      {
        x: 960,
        y: 1200, // Out of bounds (image is 1080px tall)
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('outside image bounds');
  });

  it('should reject negative coordinates', async () => {
    const result = await validateToolParameters(
      'pick_color_at_position',
      {
        x: -10,
        y: 540,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('outside image bounds');
  });
});

// ===== QUICK VALIDATE TESTS =====

describe('Quick Validate (UI Helper)', () => {
  it('should perform quick validation without image analysis', () => {
    const result = quickValidate('color_knockout', {
      colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
      tolerance: 30,
    });

    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it('should catch schema errors quickly', () => {
    const result = quickValidate('color_knockout', {
      colors: 'not-an-array', // Wrong type
      tolerance: 30,
    });

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('wrong type');
  });

  it('should handle unknown tools', () => {
    const result = quickValidate('nonexistent_tool', {});

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Unknown tool');
  });
});

// ===== CONFIDENCE SCORING TESTS =====

describe('Confidence Scoring', () => {
  it('should give high confidence to optimal parameters', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 30, // Optimal for this noise level
        replaceMode: 'transparency',
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.confidence).toBeGreaterThanOrEqual(80);
  });

  it('should reduce confidence for suboptimal parameters', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 10, // Too low for this noise level
      },
      mockNoisyImageAnalysis,
      mockImageUrl
    );

    expect(result.confidence).toBeLessThan(80);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should give zero confidence to invalid parameters', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [],
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.confidence).toBe(0);
    expect(result.isValid).toBe(false);
  });
});

// ===== REASONING TESTS =====

describe('Validation Reasoning', () => {
  it('should provide detailed reasoning', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 30,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.reasoning).toBeTruthy();
    expect(result.reasoning.length).toBeGreaterThan(50);
    expect(result.reasoning).toContain('Checking color existence');
  });

  it('should explain why validation failed', async () => {
    const result = await validateToolParameters(
      'recolor_image',
      {
        colorMappings: [{ originalIndex: 99, newColor: '#00ff00' }],
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.reasoning).toContain('Invalid originalIndex');
    expect(result.isValid).toBe(false);
  });

  it('should include historical analysis in reasoning', async () => {
    const result = await validateToolParameters(
      'color_knockout',
      {
        colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
        tolerance: 30,
      },
      mockImageAnalysis,
      mockImageUrl
    );

    expect(result.reasoning).toContain('Historical Analysis');
  });
});
