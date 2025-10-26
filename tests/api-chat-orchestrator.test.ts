/**
 * API Chat Orchestrator Tests
 *
 * Test suite for the AI Chat Orchestrator API route.
 * Tests request validation, error handling, and integration with the orchestrator.
 *
 * @module tests/api-chat-orchestrator
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { POST, GET, OPTIONS } from '@/app/api/ai/chat-orchestrator/route';
import * as orchestratorModule from '@/lib/ai-chat-orchestrator';

// Mock the orchestrator module
vi.mock('@/lib/ai-chat-orchestrator', () => ({
  processUserMessage: vi.fn(),
  isOrchestratorReady: vi.fn(),
}));

describe('API Chat Orchestrator Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default to API key being configured
    vi.mocked(orchestratorModule.isOrchestratorReady).mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/ai/chat-orchestrator (Health Check)', () => {
    it('should return healthy status when configured', async () => {
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('healthy');
      expect(data.ready).toBe(true);
      expect(data.version).toBe('1.0.0');
      expect(data.features).toContain('vision-analysis');
      expect(data.features).toContain('function-calling');
      expect(data.message).toBe('AI Chat Orchestrator is ready');
    });

    it('should return not_configured when API key missing', async () => {
      vi.mocked(orchestratorModule.isOrchestratorReady).mockReturnValue(false);

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.status).toBe('not_configured');
      expect(data.ready).toBe(false);
      expect(data.message).toBe('ANTHROPIC_API_KEY not configured');
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(orchestratorModule.isOrchestratorReady).mockImplementation(() => {
        throw new Error('Test error');
      });

      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.status).toBe('error');
      expect(data.ready).toBe(false);
      expect(data.error).toBe('Test error');
    });
  });

  describe('POST /api/ai/chat-orchestrator (Main Endpoint)', () => {
    function createRequest(body: any): NextRequest {
      return new NextRequest('http://localhost:3000/api/ai/chat-orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    }

    it('should process valid request successfully', async () => {
      const mockResponse: orchestratorModule.OrchestratorResponse = {
        success: true,
        message: 'I removed the blue background successfully.',
        toolExecutions: [
          {
            toolName: 'color_knockout',
            parameters: {
              colors: [{ r: 0, g: 0, b: 255, hex: '#0000FF' }],
              tolerance: 30,
            },
            validationResult: {
              isValid: true,
              confidence: 95,
              warnings: [],
              errors: [],
              reasoning: 'Parameters validated successfully',
            },
            executionSuccess: true,
            resultImageUrl: 'blob:http://localhost:3000/result-image',
            executionTimeMs: 1234,
            confidence: 95,
          },
        ],
        confidence: 95,
        conversationId: 'test-conv-123',
        timestamp: Date.now(),
      };

      vi.mocked(orchestratorModule.processUserMessage).mockResolvedValue(mockResponse);

      const request = createRequest({
        message: 'Remove the blue background',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('I removed the blue background successfully.');
      expect(data.toolExecutions).toHaveLength(1);
      expect(data.toolExecutions[0].toolName).toBe('color_knockout');
      expect(data.confidence).toBe(95);
      expect(data.conversationId).toBe('test-conv-123');
    });

    it('should reject request with missing required fields', async () => {
      const request = createRequest({
        message: 'Test message',
        // Missing imageUrl and conversationId
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toContain('Missing required fields');
      expect(data.error).toContain('imageUrl');
      expect(data.error).toContain('conversationId');
    });

    it('should reject invalid JSON', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat-orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json {{{',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid JSON in request body');
    });

    it('should validate image URL origin', async () => {
      const request = createRequest({
        message: 'Test message',
        imageUrl: 'https://malicious-site.com/image.png',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid image URL origin');
    });

    it('should allow blob URLs', async () => {
      vi.mocked(orchestratorModule.processUserMessage).mockResolvedValue({
        success: true,
        message: 'Processed',
        toolExecutions: [],
        confidence: 80,
        conversationId: 'test-conv-123',
        timestamp: Date.now(),
      });

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should allow data URLs', async () => {
      vi.mocked(orchestratorModule.processUserMessage).mockResolvedValue({
        success: true,
        message: 'Processed',
        toolExecutions: [],
        confidence: 80,
        conversationId: 'test-conv-123',
        timestamp: Date.now(),
      });

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'data:image/png;base64,iVBORw0KG...',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
    });

    it('should validate conversation history format', async () => {
      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
        conversationHistory: [
          {
            // Missing role
            content: 'Test',
          },
        ],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid conversation history format');
    });

    it('should accept valid conversation history', async () => {
      vi.mocked(orchestratorModule.processUserMessage).mockResolvedValue({
        success: true,
        message: 'Processed',
        toolExecutions: [],
        confidence: 80,
        conversationId: 'test-conv-123',
        timestamp: Date.now(),
      });

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
        conversationHistory: [
          {
            role: 'user',
            content: 'Previous message',
            timestamp: Date.now() - 60000,
          },
          {
            role: 'assistant',
            content: 'Previous response',
            timestamp: Date.now() - 30000,
          },
        ],
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(orchestratorModule.processUserMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          conversationHistory: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'assistant' }),
          ]),
        })
      );
    });

    it('should return 503 when API key not configured', async () => {
      vi.mocked(orchestratorModule.isOrchestratorReady).mockReturnValue(false);

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(503);
      expect(data.success).toBe(false);
      expect(data.error).toBe('AI service not configured');
    });

    it('should handle orchestrator errors gracefully', async () => {
      vi.mocked(orchestratorModule.processUserMessage).mockResolvedValue({
        success: false,
        message: 'I encountered an error processing your request.',
        toolExecutions: [],
        confidence: 0,
        conversationId: 'test-conv-123',
        timestamp: Date.now(),
        error: 'Tool execution failed',
      });

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Tool execution failed');
      expect(data.message).toContain('I encountered an error');
    });

    it('should handle rate limit errors', async () => {
      vi.mocked(orchestratorModule.processUserMessage).mockRejectedValue(
        new Error('rate limit exceeded')
      );

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(429);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rate limit exceeded');
      expect(data.message).toContain('Too many requests');
    });

    it('should handle timeout errors', async () => {
      vi.mocked(orchestratorModule.processUserMessage).mockRejectedValue(
        new Error('Request timeout')
      );

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(504);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Request timeout');
      expect(data.message).toContain('took too long');
    });

    it('should include processing time in response', async () => {
      vi.mocked(orchestratorModule.processUserMessage).mockResolvedValue({
        success: true,
        message: 'Processed',
        toolExecutions: [],
        confidence: 80,
        conversationId: 'test-conv-123',
        timestamp: Date.now(),
      });

      const request = createRequest({
        message: 'Test message',
        imageUrl: 'blob:http://localhost:3000/test-image',
        conversationId: 'test-conv-123',
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(typeof data.processingTimeMs).toBe('number');
    });
  });

  describe('OPTIONS /api/ai/chat-orchestrator (CORS)', () => {
    it('should return proper CORS headers', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/chat-orchestrator', {
        method: 'OPTIONS',
      });

      const response = await OPTIONS(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('POST, GET, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });
});