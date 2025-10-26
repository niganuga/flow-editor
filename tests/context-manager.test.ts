/**
 * Context Manager Tests
 *
 * Tests for ChromaDB-backed learning system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  initializeCollections,
  storeConversationTurn,
  storeToolExecution,
  findSimilarExecutions,
  getConversationContext,
  pruneOldConversations,
  getContextStats,
  clearAllContext,
  type ConversationContext,
  type ToolExecution,
  type ChatMessage
} from '../lib/context-manager';
import type { ImageAnalysis } from '../lib/image-analyzer';

describe('Context Manager', () => {
  beforeEach(async () => {
    // Clear context before each test
    await clearAllContext();
  });

  describe('Initialization', () => {
    it('should initialize without errors', async () => {
      await expect(initializeCollections()).resolves.not.toThrow();
    });

    it('should work in degraded mode without ChromaDB', async () => {
      await initializeCollections();
      const stats = getContextStats();
      expect(stats.chromaAvailable).toBe(false);
    });
  });

  describe('Conversation Storage', () => {
    it('should store conversation turn', async () => {
      const conversationId = 'test-conv-1';
      const userMessage = 'Remove the blue background';
      const assistantResponse = "I'll use color knockout to remove the blue areas.";

      await storeConversationTurn(
        conversationId,
        userMessage,
        assistantResponse,
        null
      );

      const context = await getConversationContext(conversationId);
      expect(context).toBeTruthy();
      expect(context?.messages).toHaveLength(2);
      expect(context?.messages[0].role).toBe('user');
      expect(context?.messages[0].content).toBe(userMessage);
      expect(context?.messages[1].role).toBe('assistant');
      expect(context?.messages[1].content).toBe(assistantResponse);
    });

    it('should store conversation with image analysis', async () => {
      const conversationId = 'test-conv-2';
      const mockAnalysis: ImageAnalysis = {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        dpi: null,
        fileSize: 500000,
        format: 'png',
        hasTransparency: true,
        dominantColors: [
          { r: 66, g: 135, b: 245, hex: '#4287f5', percentage: 45 },
          { r: 255, g: 255, b: 255, hex: '#ffffff', percentage: 30 }
        ],
        colorDepth: 32,
        uniqueColorCount: 15000,
        isBlurry: false,
        sharpnessScore: 75,
        noiseLevel: 15,
        isPrintReady: false,
        printableAtSize: { width: 6.4, height: 3.6 },
        analyzedAt: Date.now(),
        confidence: 95
      };

      await storeConversationTurn(
        conversationId,
        'Analyze this image',
        'The image is 1920x1080 with blue dominant color',
        mockAnalysis
      );

      const context = await getConversationContext(conversationId);
      expect(context?.imageAnalysis).toBeTruthy();
      expect(context?.imageAnalysis?.width).toBe(1920);
      expect(context?.imageAnalysis?.dominantColors).toHaveLength(2);
    });

    it('should append messages to existing conversation', async () => {
      const conversationId = 'test-conv-3';

      await storeConversationTurn(
        conversationId,
        'First message',
        'First response',
        null
      );

      await storeConversationTurn(
        conversationId,
        'Second message',
        'Second response',
        null
      );

      const context = await getConversationContext(conversationId);
      expect(context?.messages).toHaveLength(4);
    });
  });

  describe('Tool Execution Storage', () => {
    it('should store successful tool execution', async () => {
      const conversationId = 'test-conv-4';
      const execution: ToolExecution = {
        toolName: 'color_knockout',
        parameters: {
          colors: [{ r: 66, g: 135, b: 245, hex: '#4287f5' }],
          tolerance: 30,
          replaceMode: 'transparency'
        },
        success: true,
        confidence: 95,
        resultMetrics: {
          pixelsChanged: 500000,
          percentageChanged: 24.8,
          executionTimeMs: 1200,
          qualityScore: 90
        },
        imageSpecsSnapshot: {
          width: 1920,
          height: 1080,
          hasTransparency: false,
          dominantColors: [{ r: 66, g: 135, b: 245, hex: '#4287f5', percentage: 45 }]
        },
        timestamp: Date.now()
      };

      await storeToolExecution(conversationId, execution);

      const stats = getContextStats();
      expect(stats.successfulExecutions).toBeGreaterThan(0);
    });

    it('should NOT store low-confidence executions', async () => {
      const conversationId = 'test-conv-5';
      const execution: ToolExecution = {
        toolName: 'color_knockout',
        parameters: { colors: [], tolerance: 30 },
        success: true,
        confidence: 50, // Below 70 threshold
        resultMetrics: {
          pixelsChanged: 100,
          percentageChanged: 0.5,
          executionTimeMs: 500,
          qualityScore: 40
        },
        imageSpecsSnapshot: {},
        timestamp: Date.now()
      };

      await storeToolExecution(conversationId, execution);

      const stats = getContextStats();
      expect(stats.successfulExecutions).toBe(0);
    });

    it('should NOT store failed executions', async () => {
      const conversationId = 'test-conv-6';
      const execution: ToolExecution = {
        toolName: 'color_knockout',
        parameters: { colors: [], tolerance: 30 },
        success: false, // Failed execution
        confidence: 95,
        resultMetrics: {
          pixelsChanged: 0,
          percentageChanged: 0,
          executionTimeMs: 0,
          qualityScore: 0
        },
        imageSpecsSnapshot: {},
        timestamp: Date.now()
      };

      await storeToolExecution(conversationId, execution);

      const stats = getContextStats();
      expect(stats.successfulExecutions).toBe(0);
    });
  });

  describe('Similar Execution Search', () => {
    it('should find similar executions by image specs', async () => {
      // Store multiple executions with different image specs
      const executions: ToolExecution[] = [
        {
          toolName: 'color_knockout',
          parameters: { tolerance: 25 },
          success: true,
          confidence: 90,
          resultMetrics: {
            pixelsChanged: 500000,
            percentageChanged: 25,
            executionTimeMs: 1000,
            qualityScore: 85
          },
          imageSpecsSnapshot: {
            width: 1920,
            height: 1080,
            hasTransparency: false,
            dominantColors: [{ r: 66, g: 135, b: 245, hex: '#4287f5', percentage: 45 }]
          },
          timestamp: Date.now()
        },
        {
          toolName: 'color_knockout',
          parameters: { tolerance: 30 },
          success: true,
          confidence: 95,
          resultMetrics: {
            pixelsChanged: 480000,
            percentageChanged: 23,
            executionTimeMs: 1100,
            qualityScore: 90
          },
          imageSpecsSnapshot: {
            width: 1920, // Same dimensions
            height: 1080,
            hasTransparency: false,
            dominantColors: [{ r: 70, g: 140, b: 250, hex: '#468cfa', percentage: 40 }]
          },
          timestamp: Date.now()
        },
        {
          toolName: 'color_knockout',
          parameters: { tolerance: 35 },
          success: true,
          confidence: 85,
          resultMetrics: {
            pixelsChanged: 300000,
            percentageChanged: 15,
            executionTimeMs: 800,
            qualityScore: 80
          },
          imageSpecsSnapshot: {
            width: 3840, // Different dimensions
            height: 2160,
            hasTransparency: false
          },
          timestamp: Date.now()
        }
      ];

      // Store all executions
      for (const exec of executions) {
        await storeToolExecution('test-conv-similar', exec);
      }

      // Search for similar executions with 1920x1080 image
      const currentImageAnalysis: ImageAnalysis = {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        dpi: null,
        fileSize: 500000,
        format: 'png',
        hasTransparency: false,
        dominantColors: [{ r: 65, g: 130, b: 240, hex: '#4182f0', percentage: 50 }],
        colorDepth: 24,
        uniqueColorCount: 15000,
        isBlurry: false,
        sharpnessScore: 80,
        noiseLevel: 10,
        isPrintReady: false,
        printableAtSize: { width: 6.4, height: 3.6 },
        analyzedAt: Date.now(),
        confidence: 95
      };

      const similar = await findSimilarExecutions(
        'color_knockout',
        currentImageAnalysis,
        3
      );

      // Should find the 1920x1080 executions as more similar
      expect(similar.length).toBeGreaterThan(0);
      expect(similar[0].imageSpecsSnapshot.width).toBe(1920);
    });

    it('should return empty array when no similar executions found', async () => {
      const currentImageAnalysis: ImageAnalysis = {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        dpi: null,
        fileSize: 500000,
        format: 'png',
        hasTransparency: false,
        dominantColors: [],
        colorDepth: 24,
        uniqueColorCount: 15000,
        isBlurry: false,
        sharpnessScore: 80,
        noiseLevel: 10,
        isPrintReady: false,
        printableAtSize: { width: 6.4, height: 3.6 },
        analyzedAt: Date.now(),
        confidence: 95
      };

      const similar = await findSimilarExecutions(
        'nonexistent_tool',
        currentImageAnalysis
      );

      expect(similar).toEqual([]);
    });
  });

  describe('Context Retrieval', () => {
    it('should retrieve conversation context', async () => {
      const conversationId = 'test-conv-7';

      await storeConversationTurn(
        conversationId,
        'Test message',
        'Test response',
        null
      );

      const context = await getConversationContext(conversationId);

      expect(context).toBeTruthy();
      expect(context?.conversationId).toBe(conversationId);
      expect(context?.createdAt).toBeDefined();
      expect(context?.lastUpdatedAt).toBeDefined();
    });

    it('should return null for nonexistent conversation', async () => {
      const context = await getConversationContext('nonexistent-id');
      expect(context).toBeNull();
    });
  });

  describe('Context Pruning', () => {
    it('should prune old conversations', async () => {
      // Create multiple conversations
      const conversationIds = Array.from({ length: 10 }, (_, i) => `conv-${i}`);

      for (const id of conversationIds) {
        await storeConversationTurn(id, 'Message', 'Response', null);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      let stats = getContextStats();
      expect(stats.conversations).toBe(10);

      // Prune to keep only 5 most recent
      await pruneOldConversations(5);

      stats = getContextStats();
      expect(stats.conversations).toBe(5);
    });

    it('should keep most recent conversations', async () => {
      // Create conversations with delays
      await storeConversationTurn('conv-old', 'Old', 'Old', null);
      await new Promise(resolve => setTimeout(resolve, 50));

      await storeConversationTurn('conv-new', 'New', 'New', null);

      await pruneOldConversations(1);

      const oldContext = await getConversationContext('conv-old');
      const newContext = await getConversationContext('conv-new');

      expect(oldContext).toBeNull();
      expect(newContext).toBeTruthy();
    });
  });

  describe('Statistics', () => {
    it('should return accurate statistics', async () => {
      await storeConversationTurn('conv-1', 'Msg', 'Resp', null);
      await storeConversationTurn('conv-2', 'Msg', 'Resp', null);

      const execution: ToolExecution = {
        toolName: 'color_knockout',
        parameters: {},
        success: true,
        confidence: 90,
        resultMetrics: {
          pixelsChanged: 1000,
          percentageChanged: 5,
          executionTimeMs: 500,
          qualityScore: 80
        },
        imageSpecsSnapshot: {},
        timestamp: Date.now()
      };

      await storeToolExecution('conv-1', execution);

      const stats = getContextStats();

      expect(stats.conversations).toBe(2);
      expect(stats.toolExecutions).toBeGreaterThan(0);
      expect(stats.successfulExecutions).toBeGreaterThan(0);
      expect(stats.chromaAvailable).toBe(false); // In degraded mode for tests
    });
  });

  describe('Error Handling', () => {
    it('should gracefully handle errors in storage', async () => {
      // Should not throw even with invalid data
      await expect(
        storeConversationTurn('', '', '', null)
      ).resolves.not.toThrow();
    });

    it('should gracefully handle errors in retrieval', async () => {
      const context = await getConversationContext('invalid');
      expect(context).toBeNull();
    });

    it('should gracefully handle errors in search', async () => {
      const mockAnalysis = {} as ImageAnalysis;
      const results = await findSimilarExecutions('tool', mockAnalysis);
      expect(results).toEqual([]);
    });
  });

  describe('Learning Patterns', () => {
    it('should enable parameter validation from history', async () => {
      // Store successful executions with similar images
      const executions: ToolExecution[] = [
        {
          toolName: 'color_knockout',
          parameters: { tolerance: 28 },
          success: true,
          confidence: 92,
          resultMetrics: {
            pixelsChanged: 500000,
            percentageChanged: 25,
            executionTimeMs: 1000,
            qualityScore: 88
          },
          imageSpecsSnapshot: { width: 1920, height: 1080, hasTransparency: false },
          timestamp: Date.now()
        },
        {
          toolName: 'color_knockout',
          parameters: { tolerance: 32 },
          success: true,
          confidence: 95,
          resultMetrics: {
            pixelsChanged: 480000,
            percentageChanged: 24,
            executionTimeMs: 1100,
            qualityScore: 90
          },
          imageSpecsSnapshot: { width: 1920, height: 1080, hasTransparency: false },
          timestamp: Date.now()
        },
        {
          toolName: 'color_knockout',
          parameters: { tolerance: 30 },
          success: true,
          confidence: 93,
          resultMetrics: {
            pixelsChanged: 490000,
            percentageChanged: 24.5,
            executionTimeMs: 1050,
            qualityScore: 89
          },
          imageSpecsSnapshot: { width: 1920, height: 1080, hasTransparency: false },
          timestamp: Date.now()
        }
      ];

      for (const exec of executions) {
        await storeToolExecution('learning-test', exec);
      }

      // Find similar executions
      const currentImage: ImageAnalysis = {
        width: 1920,
        height: 1080,
        aspectRatio: '16:9',
        dpi: null,
        fileSize: 500000,
        format: 'png',
        hasTransparency: false,
        dominantColors: [],
        colorDepth: 24,
        uniqueColorCount: 15000,
        isBlurry: false,
        sharpnessScore: 75,
        noiseLevel: 15,
        isPrintReady: false,
        printableAtSize: { width: 6.4, height: 3.6 },
        analyzedAt: Date.now(),
        confidence: 95
      };

      const similar = await findSimilarExecutions('color_knockout', currentImage);

      // Calculate average tolerance from historical data
      const avgTolerance =
        similar.reduce((sum, ex) => sum + ex.parameters.tolerance, 0) / similar.length;

      // Should be around 30 (28 + 32 + 30) / 3
      expect(avgTolerance).toBeGreaterThan(25);
      expect(avgTolerance).toBeLessThan(35);
    });
  });
});
