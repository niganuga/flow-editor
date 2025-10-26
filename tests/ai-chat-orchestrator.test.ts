/**
 * AI Chat Orchestrator Tests
 *
 * Tests the core orchestration flow including:
 * - Image analysis integration
 * - Claude API integration
 * - Parameter validation
 * - Tool execution
 * - Error handling
 * - Confidence calculation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  processUserMessage,
  isOrchestratorReady,
  setAnthropicClient,
  resetAnthropicClient,
  type OrchestratorRequest,
  type OrchestratorResponse,
} from '../lib/ai-chat-orchestrator';
import * as imageAnalyzer from '../lib/image-analyzer';
import * as contextManager from '../lib/context-manager';
import * as parameterValidator from '../lib/parameter-validator';
import Anthropic from '@anthropic-ai/sdk';

// ===== MOCKS =====

// Mock image analyzer
vi.mock('../lib/image-analyzer', () => ({
  analyzeImage: vi.fn(),
}));

// Mock context manager
vi.mock('../lib/context-manager', () => ({
  storeConversationTurn: vi.fn(),
  storeToolExecution: vi.fn(),
  findSimilarExecutions: vi.fn(),
  getConversationContext: vi.fn(),
}));

// Mock parameter validator
vi.mock('../lib/parameter-validator', () => ({
  validateToolParameters: vi.fn(),
}));

// Mock tool implementations
vi.mock('../lib/tools/color-knockout', () => ({
  performColorKnockout: vi.fn(),
  pickColorFromImage: vi.fn(),
}));

vi.mock('../lib/tools/recolor', () => ({
  extractColors: vi.fn(),
  recolorImage: vi.fn(),
}));

vi.mock('../lib/tools/texture-cut', () => ({
  textureCut: vi.fn(),
  createPatternTexture: vi.fn(),
}));

vi.mock('../lib/tools/background-remover', () => ({
  removeBackground: vi.fn(),
}));

vi.mock('../lib/tools/upscaler', () => ({
  upscaleImage: vi.fn(),
}));

// Mock Anthropic SDK
const mockAnthropicCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockAnthropicCreate,
      },
    })),
  };
});

// ===== TEST DATA =====

const mockImageAnalysis: imageAnalyzer.ImageAnalysis = {
  width: 1920,
  height: 1080,
  aspectRatio: '16:9',
  dpi: null,
  fileSize: 512000,
  format: 'png',
  hasTransparency: true,
  dominantColors: [
    { r: 255, g: 0, b: 0, hex: '#ff0000', percentage: 35 },
    { r: 0, g: 0, b: 255, hex: '#0000ff', percentage: 25 },
    { r: 255, g: 255, b: 255, hex: '#ffffff', percentage: 40 },
  ],
  colorDepth: 32,
  uniqueColorCount: 5000,
  isBlurry: false,
  sharpnessScore: 75,
  noiseLevel: 20,
  isPrintReady: false,
  printableAtSize: { width: 6.4, height: 3.6 },
  analyzedAt: Date.now(),
  confidence: 95,
};

const mockValidationResult: parameterValidator.ValidationResult = {
  isValid: true,
  confidence: 90,
  warnings: [],
  errors: [],
  reasoning: 'All parameters valid',
};

// ===== TESTS =====

describe('AI Chat Orchestrator', () => {
  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock Anthropic client
    const mockClient = {
      messages: {
        create: mockAnthropicCreate,
      },
    } as any;

    setAnthropicClient(mockClient);

    // Set up default mock returns
    vi.mocked(imageAnalyzer.analyzeImage).mockResolvedValue(mockImageAnalysis);
    vi.mocked(parameterValidator.validateToolParameters).mockResolvedValue(mockValidationResult);
    vi.mocked(contextManager.storeConversationTurn).mockResolvedValue();
    vi.mocked(contextManager.storeToolExecution).mockResolvedValue();
    vi.mocked(contextManager.findSimilarExecutions).mockResolvedValue([]);

    // Set ANTHROPIC_API_KEY for tests
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isOrchestratorReady', () => {
    it('should return true when API key is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      expect(isOrchestratorReady()).toBe(true);
    });

    it('should return false when API key is not set', () => {
      delete process.env.ANTHROPIC_API_KEY;
      expect(isOrchestratorReady()).toBe(false);
    });
  });

  describe('processUserMessage', () => {
    it('should process simple user message without tool calls', async () => {
      // Mock Claude response with text only
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'I can help you edit this image. What would you like to do?',
          },
        ],
      });

      const request: OrchestratorRequest = {
        message: 'What can you do with this image?',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-1',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true);
      expect(response.message).toContain('I can help you edit this image');
      expect(response.toolExecutions).toHaveLength(0);
      expect(response.confidence).toBeGreaterThan(0);
      expect(response.imageAnalysis).toBeDefined();

      // Verify image analysis was called
      expect(imageAnalyzer.analyzeImage).toHaveBeenCalledWith(
        request.imageUrl,
        expect.any(Function)
      );

      // Verify conversation was stored
      expect(contextManager.storeConversationTurn).toHaveBeenCalledWith(
        request.conversationId,
        request.message,
        expect.any(String),
        mockImageAnalysis
      );
    });

    it('should process user message with tool call', async () => {
      // Mock Claude response with tool call
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: "I'll remove the blue background for you.",
          },
          {
            type: 'tool_use',
            name: 'color_knockout',
            input: {
              colors: [{ r: 0, g: 0, b: 255, hex: '#0000ff' }],
              tolerance: 30,
              replaceMode: 'transparency',
            },
          },
        ],
      });

      // Mock tool execution
      const { performColorKnockout } = await import('../lib/tools/color-knockout');
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      vi.mocked(performColorKnockout).mockResolvedValue(mockBlob);

      const request: OrchestratorRequest = {
        message: 'Remove the blue background',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-2',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true);
      expect(response.toolExecutions).toHaveLength(1);
      expect(response.toolExecutions[0].toolName).toBe('color_knockout');
      expect(response.toolExecutions[0].executionSuccess).toBe(true);
      expect(response.toolExecutions[0].resultImageUrl).toBeDefined();
      expect(response.toolExecutions[0].confidence).toBeGreaterThan(0);

      // Verify parameter validation was called
      expect(parameterValidator.validateToolParameters).toHaveBeenCalledWith(
        'color_knockout',
        expect.any(Object),
        mockImageAnalysis,
        request.imageUrl
      );

      // Verify tool execution was stored
      expect(contextManager.storeToolExecution).toHaveBeenCalledWith(
        request.conversationId,
        expect.objectContaining({
          toolName: 'color_knockout',
          success: true,
        })
      );
    });

    it('should handle validation failure gracefully', async () => {
      // Mock Claude response with invalid tool call
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: "I'll try to remove that color.",
          },
          {
            type: 'tool_use',
            name: 'color_knockout',
            input: {
              colors: [{ r: 999, g: 999, b: 999, hex: '#invalid' }],
              tolerance: 150, // Invalid: exceeds maximum
            },
          },
        ],
      });

      // Mock validation failure
      vi.mocked(parameterValidator.validateToolParameters).mockResolvedValue({
        isValid: false,
        confidence: 0,
        warnings: [],
        errors: ['Color does not exist in image', 'Tolerance exceeds maximum'],
        reasoning: 'Invalid parameters',
      });

      const request: OrchestratorRequest = {
        message: 'Remove the purple background',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-3',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true); // Request succeeded, but tool failed
      expect(response.toolExecutions).toHaveLength(1);
      expect(response.toolExecutions[0].executionSuccess).toBe(false);
      expect(response.toolExecutions[0].error).toContain('Validation failed');

      // Verify tool execution was NOT stored (validation failed)
      expect(contextManager.storeToolExecution).not.toHaveBeenCalled();
    });

    it('should handle multiple tool calls', async () => {
      // Mock Claude response with multiple tool calls
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: "I'll extract the color palette and then recolor the image.",
          },
          {
            type: 'tool_use',
            name: 'extract_color_palette',
            input: {
              paletteSize: 9,
              algorithm: 'smart',
            },
          },
          {
            type: 'tool_use',
            name: 'recolor_image',
            input: {
              colorMappings: [{ originalIndex: 0, newColor: '#00ff00' }],
              blendMode: 'replace',
              tolerance: 30,
            },
          },
        ],
      });

      // Mock tool executions
      const { extractColors, recolorImage } = await import('../lib/tools/recolor');
      vi.mocked(extractColors).mockResolvedValue([
        { hex: '#ff0000', rgb: { r: 255, g: 0, b: 0 }, name: 'Red', percentage: 50 },
      ]);

      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      vi.mocked(recolorImage).mockResolvedValue(mockBlob);

      const request: OrchestratorRequest = {
        message: 'Change the red to green',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-4',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true);
      expect(response.toolExecutions).toHaveLength(2);
      expect(response.toolExecutions[0].toolName).toBe('extract_color_palette');
      expect(response.toolExecutions[1].toolName).toBe('recolor_image');
      expect(response.toolExecutions[0].executionSuccess).toBe(true);
      expect(response.toolExecutions[1].executionSuccess).toBe(true);

      // Verify both tools were validated
      expect(parameterValidator.validateToolParameters).toHaveBeenCalledTimes(2);
    });

    it('should handle tool execution errors gracefully', async () => {
      // Mock Claude response with tool call
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: "I'll remove the background.",
          },
          {
            type: 'tool_use',
            name: 'background_remover',
            input: {
              model: 'general',
            },
          },
        ],
      });

      // Mock tool execution failure
      const { removeBackground } = await import('../lib/tools/background-remover');
      vi.mocked(removeBackground).mockRejectedValue(new Error('API rate limit exceeded'));

      const request: OrchestratorRequest = {
        message: 'Remove the background',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-5',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true); // Request succeeded, but tool failed
      expect(response.toolExecutions).toHaveLength(1);
      expect(response.toolExecutions[0].executionSuccess).toBe(false);
      expect(response.toolExecutions[0].error).toContain('API rate limit exceeded');

      // Verify tool execution was NOT stored (execution failed)
      expect(contextManager.storeToolExecution).not.toHaveBeenCalled();
    });

    it('should handle low validation confidence with warnings', async () => {
      // Mock Claude response with tool call
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: "I'll try to remove that color, but I'm not very confident.",
          },
          {
            type: 'tool_use',
            name: 'color_knockout',
            input: {
              colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }],
              tolerance: 60, // High tolerance
            },
          },
        ],
      });

      // Mock low confidence validation
      vi.mocked(parameterValidator.validateToolParameters).mockResolvedValue({
        isValid: true,
        confidence: 65,
        warnings: ['Tolerance may be too high', 'Color match is weak'],
        errors: [],
        reasoning: 'Parameters are valid but confidence is low',
      });

      const { performColorKnockout } = await import('../lib/tools/color-knockout');
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      vi.mocked(performColorKnockout).mockResolvedValue(mockBlob);

      const request: OrchestratorRequest = {
        message: 'Remove the reddish color',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-6',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true);
      expect(response.toolExecutions[0].executionSuccess).toBe(true);
      expect(response.toolExecutions[0].confidence).toBe(65);
      expect(response.confidence).toBeLessThan(70); // Overall confidence affected

      // Verify tool execution was NOT stored (confidence < 70)
      expect(contextManager.storeToolExecution).not.toHaveBeenCalled();
    });

    it('should calculate overall confidence correctly', async () => {
      // Mock Claude response with multiple tool calls
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Processing...',
          },
          {
            type: 'tool_use',
            name: 'color_knockout',
            input: { colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }] },
          },
        ],
      });

      // Mock validation with different confidences
      vi.mocked(parameterValidator.validateToolParameters).mockResolvedValue({
        isValid: true,
        confidence: 85,
        warnings: [],
        errors: [],
        reasoning: 'Valid',
      });

      const { performColorKnockout } = await import('../lib/tools/color-knockout');
      const mockBlob = new Blob(['fake-image'], { type: 'image/png' });
      vi.mocked(performColorKnockout).mockResolvedValue(mockBlob);

      const request: OrchestratorRequest = {
        message: 'Process image',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-7',
      };

      const response = await processUserMessage(request);

      // Overall confidence should be minimum of:
      // - Image analysis confidence: 95
      // - Validation confidence: 85
      // Result: 85
      expect(response.confidence).toBe(85);
    });

    it('should handle image analysis failure', async () => {
      // Mock image analysis failure
      vi.mocked(imageAnalyzer.analyzeImage).mockResolvedValue({
        ...mockImageAnalysis,
        confidence: 0,
        width: 0,
        height: 0,
      });

      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Unable to analyze image properly.',
          },
        ],
      });

      const request: OrchestratorRequest = {
        message: 'Process this image',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-8',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true);
      expect(response.confidence).toBe(0); // Low confidence due to analysis failure
    });

    it('should handle Claude API errors gracefully', async () => {
      // Mock API error
      mockAnthropicCreate.mockRejectedValue(new Error('API timeout'));

      const request: OrchestratorRequest = {
        message: 'Do something',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-9',
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(false);
      expect(response.error).toContain('API timeout');
      expect(response.confidence).toBe(0);
    });

    it('should include conversation history in API call', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'Based on our previous conversation...',
          },
        ],
      });

      const request: OrchestratorRequest = {
        message: 'Continue from before',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-10',
        conversationHistory: [
          {
            role: 'user',
            content: 'What can you do?',
            timestamp: Date.now() - 10000,
          },
          {
            role: 'assistant',
            content: 'I can help edit images.',
            timestamp: Date.now() - 5000,
          },
        ],
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true);

      // Verify API was called with conversation history
      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'What can you do?',
            }),
            expect.objectContaining({
              role: 'assistant',
              content: 'I can help edit images.',
            }),
          ]),
        })
      );
    });

    it('should include user context in system prompt', async () => {
      mockAnthropicCreate.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'For custom apparel printing...',
          },
        ],
      });

      const request: OrchestratorRequest = {
        message: 'Help me prepare this for printing',
        imageUrl: 'data:image/png;base64,iVBORw0KGgo=',
        conversationId: 'test-conv-11',
        userContext: {
          industry: 'custom apparel printing',
          expertise: 'novice',
        },
      };

      const response = await processUserMessage(request);

      expect(response.success).toBe(true);

      // Verify API was called with user context in system prompt
      expect(mockAnthropicCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          system: expect.stringContaining('custom apparel printing'),
        })
      );
    });
  });
});
