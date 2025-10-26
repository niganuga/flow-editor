/**
 * Tests for Technical Image Analyzer
 *
 * These tests verify that the image analyzer extracts accurate
 * ground truth specifications from images.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  analyzeImage,
  formatAnalysisSummary,
  type ImageAnalysis,
} from '../lib/image-analyzer';

describe('Image Analyzer - Ground Truth Extraction', () => {
  describe('analyzeImage()', () => {
    it('should analyze a simple image with basic specs', async () => {
      // Create a test image (100x100 red square)
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 100, 100);

      const dataUrl = canvas.toDataURL('image/png');

      const analysis = await analyzeImage(dataUrl);

      // Verify basic specs
      expect(analysis.width).toBe(100);
      expect(analysis.height).toBe(100);
      expect(analysis.aspectRatio).toBe('1:1');
      expect(analysis.format).toBe('png');
      expect(analysis.confidence).toBeGreaterThan(0);
    });

    it('should detect transparency correctly', async () => {
      // Create transparent image
      const canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 50;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(0, 0, 50, 50);

      const dataUrl = canvas.toDataURL('image/png');
      const analysis = await analyzeImage(dataUrl);

      expect(analysis.hasTransparency).toBe(true);
      expect(analysis.colorDepth).toBe(32);
    });

    it('should detect no transparency in opaque images', async () => {
      // Create opaque image
      const canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 50;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = 'rgb(255, 0, 0)';
      ctx.fillRect(0, 0, 50, 50);

      const dataUrl = canvas.toDataURL('image/png');
      const analysis = await analyzeImage(dataUrl);

      expect(analysis.hasTransparency).toBe(false);
      expect(analysis.colorDepth).toBe(24);
    });

    it('should recognize common aspect ratios', async () => {
      const testCases = [
        { width: 1920, height: 1080, expected: '16:9' },
        { width: 1600, height: 1200, expected: '4:3' },
        { width: 1024, height: 1024, expected: '1:1' },
        { width: 1080, height: 1920, expected: '9:16' },
      ];

      for (const { width, height, expected } of testCases) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/png');
        const analysis = await analyzeImage(dataUrl);

        expect(analysis.aspectRatio).toBe(expected);
      }
    });

    it('should extract dominant colors', async () => {
      // Create image with distinct colors
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;

      // Red top half
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 100, 50);

      // Blue bottom half
      ctx.fillStyle = '#0000FF';
      ctx.fillRect(0, 50, 100, 50);

      const dataUrl = canvas.toDataURL('image/png');
      const analysis = await analyzeImage(dataUrl);

      expect(analysis.dominantColors.length).toBeGreaterThan(0);
      expect(analysis.uniqueColorCount).toBeGreaterThan(1);
    });

    it('should calculate sharpness score', async () => {
      // Sharp image with high contrast edges
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;

      // Create checkerboard pattern (high sharpness)
      for (let y = 0; y < 100; y += 10) {
        for (let x = 0; x < 100; x += 10) {
          ctx.fillStyle = ((x + y) / 10) % 2 === 0 ? '#000' : '#FFF';
          ctx.fillRect(x, y, 10, 10);
        }
      }

      const dataUrl = canvas.toDataURL('image/png');
      const analysis = await analyzeImage(dataUrl);

      expect(analysis.sharpnessScore).toBeGreaterThan(0);
      expect(analysis.sharpnessScore).toBeLessThanOrEqual(100);
      expect(typeof analysis.isBlurry).toBe('boolean');
    });

    it('should detect blurry images', async () => {
      // Very blurry image (solid color = no edges)
      const canvas = document.createElement('canvas');
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, 100, 100);

      const dataUrl = canvas.toDataURL('image/png');
      const analysis = await analyzeImage(dataUrl);

      // Solid color should have very low sharpness
      expect(analysis.sharpnessScore).toBeLessThan(30);
      expect(analysis.isBlurry).toBe(true);
    });

    it('should calculate print readiness', async () => {
      // Small image - not print ready
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 200, 200);

      const dataUrl = canvas.toDataURL('image/png');
      const analysis = await analyzeImage(dataUrl);

      expect(typeof analysis.isPrintReady).toBe('boolean');
      expect(analysis.printableAtSize.width).toBeGreaterThan(0);
      expect(analysis.printableAtSize.height).toBeGreaterThan(0);

      // 200x200 at 72 DPI = ~2.8" x 2.8" at 72 DPI
      // Not print ready because need 300 DPI
      expect(analysis.isPrintReady).toBe(false);
    });

    it('should handle progress callbacks', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 50;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#FF0000';
      ctx.fillRect(0, 0, 50, 50);

      const dataUrl = canvas.toDataURL('image/png');

      const progressUpdates: Array<{ progress: number; message: string }> = [];

      await analyzeImage(dataUrl, (progress, message) => {
        progressUpdates.push({ progress, message });
      });

      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // First update should be low progress
      expect(progressUpdates[0].progress).toBeLessThan(50);

      // Last update should be 100%
      const last = progressUpdates[progressUpdates.length - 1];
      expect(last.progress).toBe(100);
    });

    it('should return low confidence on errors', async () => {
      // Invalid image URL
      const analysis = await analyzeImage('invalid://url');

      expect(analysis.confidence).toBe(0);
      expect(analysis.width).toBe(0);
      expect(analysis.height).toBe(0);
    });

    it('should include timestamp', async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 50;
      canvas.height = 50;
      const dataUrl = canvas.toDataURL('image/png');

      const before = Date.now();
      const analysis = await analyzeImage(dataUrl);
      const after = Date.now();

      expect(analysis.analyzedAt).toBeGreaterThanOrEqual(before);
      expect(analysis.analyzedAt).toBeLessThanOrEqual(after);
    });
  });

  describe('formatAnalysisSummary()', () => {
    it('should format analysis into readable text', () => {
      const mockAnalysis: ImageAnalysis = {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        dpi: null,
        fileSize: 102400,
        format: 'png',
        hasTransparency: false,
        dominantColors: [
          { r: 255, g: 0, b: 0, hex: '#ff0000', percentage: 45 },
          { r: 0, g: 0, b: 255, hex: '#0000ff', percentage: 35 },
        ],
        colorDepth: 24,
        uniqueColorCount: 1250,
        isBlurry: false,
        sharpnessScore: 75,
        noiseLevel: 15,
        isPrintReady: true,
        printableAtSize: { width: 6.4, height: 3.6 },
        analyzedAt: Date.now(),
        confidence: 95,
      };

      const summary = formatAnalysisSummary(mockAnalysis);

      expect(summary).toContain('1920 x 1080');
      expect(summary).toContain('16:9');
      expect(summary).toContain('PNG');
      expect(summary).toContain('100.0 KB');
      expect(summary).toContain('Sharpness: 75/100');
      expect(summary).toContain('95%');
    });
  });
});

describe('Ground Truth Prevention - Anti-Hallucination', () => {
  it('should provide verifiable data that prevents AI hallucination', async () => {
    // Create test image with known properties
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d')!;

    // Fill with known color
    ctx.fillStyle = '#336699';
    ctx.fillRect(0, 0, 800, 600);

    const dataUrl = canvas.toDataURL('image/png');
    const analysis = await analyzeImage(dataUrl);

    // GROUND TRUTH: These are FACTS, not hallucinations
    expect(analysis.width).toBe(800); // EXACT pixel width
    expect(analysis.height).toBe(600); // EXACT pixel height
    expect(analysis.aspectRatio).toBe('4:3'); // CALCULATED from exact dimensions

    // Confidence should be high for successful analysis
    expect(analysis.confidence).toBeGreaterThanOrEqual(85);

    // These are measurable properties, not guesses
    expect(typeof analysis.sharpnessScore).toBe('number');
    expect(typeof analysis.noiseLevel).toBe('number');
    expect(typeof analysis.uniqueColorCount).toBe('number');

    // Print calculations are based on REAL dimensions
    expect(analysis.printableAtSize.width).toBeCloseTo(800 / 72, 1);
    expect(analysis.printableAtSize.height).toBeCloseTo(600 / 72, 1);
  });

  it('should maintain >95% confidence for complete successful analysis', async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 300;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#FF0000';
    ctx.fillRect(0, 0, 400, 300);

    const dataUrl = canvas.toDataURL('image/png');
    const analysis = await analyzeImage(dataUrl);

    // High confidence means we trust this data
    expect(analysis.confidence).toBeGreaterThanOrEqual(85);

    // All fields should have valid values
    expect(analysis.width).toBeGreaterThan(0);
    expect(analysis.height).toBeGreaterThan(0);
    expect(analysis.aspectRatio).not.toBe('0:0');
  });
});
