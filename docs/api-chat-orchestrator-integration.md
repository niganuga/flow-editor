# AI Chat Orchestrator API Integration Guide

## Phase 8 - UI Integration Guide

This guide explains how to integrate the AI Chat Orchestrator API route into the frontend UI.

## API Endpoint

```
POST /api/ai/chat-orchestrator
GET  /api/ai/chat-orchestrator (health check)
```

## Request Format

```typescript
interface ChatOrchestratorRequest {
  message: string;              // User's message
  imageUrl: string;             // URL to the uploaded image (blob://, data://, or http://localhost)
  conversationId: string;       // Unique session ID (e.g., crypto.randomUUID())
  conversationHistory?: Array<{ // Optional conversation history
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
  }>;
  userContext?: {              // Optional user context
    industry?: string;          // e.g., "custom apparel printing"
    expertise?: 'novice' | 'intermediate' | 'expert';
    preferences?: Record<string, any>;
  };
}
```

## Response Format

### Success Response (200)

```typescript
interface ChatOrchestratorResponse {
  success: true;
  message: string;              // Claude's response text
  toolExecutions: Array<{       // Tool executions performed
    toolName: string;           // e.g., "color_knockout"
    parameters: any;            // Tool parameters used
    success: boolean;           // Execution success
    resultImageUrl?: string;    // Result image URL if successful
    confidence: number;         // Confidence score 0-100
  }>;
  confidence: number;           // Overall confidence 0-100
  conversationId: string;       // Conversation ID
  timestamp: number;            // Response timestamp
  processingTimeMs: number;     // Processing time in ms
}
```

### Error Response (400/500/503)

```typescript
interface ErrorResponse {
  success: false;
  error: string;                // Technical error message
  message: string;              // User-friendly message
  conversationId: string;       // Conversation ID
  timestamp: number;            // Response timestamp
  processingTimeMs: number;     // Processing time in ms
}
```

## UI Integration Example

### 1. Basic Integration

```typescript
// components/panels/ai-chat-panel.tsx

import { useState, useCallback } from 'react';
import { useImageStore } from '@/lib/stores/image-store';
import { useMessageStore } from '@/lib/message-store';

export function AIChatPanel() {
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => crypto.randomUUID());
  const imageStore = useImageStore();
  const messageStore = useMessageStore();

  const sendMessage = useCallback(async (message: string) => {
    if (!imageStore.currentImageUrl) {
      console.error('No image uploaded');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/ai/chat-orchestrator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          imageUrl: imageStore.currentImageUrl,
          conversationId,
          conversationHistory: messageStore.messages.map(msg => ({
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp,
          })),
          userContext: {
            industry: 'custom apparel printing',
            expertise: 'intermediate',
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Add user message to store
        messageStore.addMessage({
          role: 'user',
          content: message,
          timestamp: Date.now(),
        });

        // Add assistant response to store
        messageStore.addMessage({
          role: 'assistant',
          content: data.message,
          timestamp: data.timestamp,
          toolExecutions: data.toolExecutions,
        });

        // Update image if tools were executed
        if (data.toolExecutions.length > 0) {
          const lastExecution = data.toolExecutions[data.toolExecutions.length - 1];
          if (lastExecution.success && lastExecution.resultImageUrl) {
            imageStore.setCurrentImage(lastExecution.resultImageUrl);
          }
        }

        // Show confidence indicator
        console.log(`Response confidence: ${data.confidence}%`);
      } else {
        // Handle error
        console.error('API error:', data.error);

        // Show user-friendly message
        messageStore.addMessage({
          role: 'assistant',
          content: data.message || 'I encountered an error. Please try again.',
          timestamp: data.timestamp,
          isError: true,
        });
      }
    } catch (error) {
      console.error('Network error:', error);

      messageStore.addMessage({
        role: 'assistant',
        content: 'Network error. Please check your connection and try again.',
        timestamp: Date.now(),
        isError: true,
      });
    } finally {
      setLoading(false);
    }
  }, [conversationId, imageStore, messageStore]);

  return (
    <div className="ai-chat-panel">
      {/* UI components */}
    </div>
  );
}
```

### 2. Advanced Integration with Progress

```typescript
// lib/hooks/use-ai-orchestrator.ts

import { useState, useCallback, useRef } from 'react';

export interface AIToolExecution {
  toolName: string;
  parameters: any;
  success: boolean;
  resultImageUrl?: string;
  confidence: number;
}

export interface UseAIOrchestratorOptions {
  conversationId?: string;
  onToolExecution?: (execution: AIToolExecution) => void;
  onProgress?: (message: string) => void;
  userContext?: any;
}

export function useAIOrchestrator(options: UseAIOrchestratorOptions = {}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [toolExecutions, setToolExecutions] = useState<AIToolExecution[]>([]);

  const conversationIdRef = useRef(
    options.conversationId || crypto.randomUUID()
  );
  const conversationHistoryRef = useRef<any[]>([]);

  const sendMessage = useCallback(async (
    message: string,
    imageUrl: string
  ): Promise<{
    success: boolean;
    response?: string;
    toolExecutions?: AIToolExecution[];
    error?: string;
  }> => {
    setLoading(true);
    setError(null);
    setConfidence(null);
    setToolExecutions([]);

    try {
      options.onProgress?.('Sending message to AI...');

      const response = await fetch('/api/ai/chat-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          imageUrl,
          conversationId: conversationIdRef.current,
          conversationHistory: conversationHistoryRef.current,
          userContext: options.userContext,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Update conversation history
        conversationHistoryRef.current.push(
          { role: 'user', content: message, timestamp: Date.now() },
          { role: 'assistant', content: data.message, timestamp: data.timestamp }
        );

        // Keep only last 10 messages to avoid payload size issues
        if (conversationHistoryRef.current.length > 10) {
          conversationHistoryRef.current = conversationHistoryRef.current.slice(-10);
        }

        // Update state
        setConfidence(data.confidence);
        setToolExecutions(data.toolExecutions || []);

        // Notify about tool executions
        data.toolExecutions?.forEach((execution: AIToolExecution) => {
          options.onToolExecution?.(execution);
        });

        options.onProgress?.('Complete!');

        return {
          success: true,
          response: data.message,
          toolExecutions: data.toolExecutions,
        };
      } else {
        setError(data.error || 'Unknown error');

        return {
          success: false,
          error: data.message || data.error,
        };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  }, [options]);

  const reset = useCallback(() => {
    conversationIdRef.current = crypto.randomUUID();
    conversationHistoryRef.current = [];
    setError(null);
    setConfidence(null);
    setToolExecutions([]);
  }, []);

  return {
    sendMessage,
    reset,
    loading,
    error,
    confidence,
    toolExecutions,
    conversationId: conversationIdRef.current,
  };
}
```

### 3. Usage in Components

```typescript
// components/panels/ai-assistant.tsx

import { useAIOrchestrator } from '@/lib/hooks/use-ai-orchestrator';
import { useImageStore } from '@/lib/stores/image-store';

export function AIAssistant() {
  const imageStore = useImageStore();
  const {
    sendMessage,
    loading,
    error,
    confidence,
    toolExecutions,
  } = useAIOrchestrator({
    userContext: {
      industry: 'custom apparel printing',
      expertise: 'intermediate',
    },
    onToolExecution: (execution) => {
      console.log(`Tool executed: ${execution.toolName}`, execution);

      // Update image if successful
      if (execution.success && execution.resultImageUrl) {
        imageStore.setCurrentImage(execution.resultImageUrl);
      }
    },
    onProgress: (message) => {
      console.log('Progress:', message);
    },
  });

  const handleSend = async (message: string) => {
    if (!imageStore.currentImageUrl) {
      alert('Please upload an image first');
      return;
    }

    const result = await sendMessage(message, imageStore.currentImageUrl);

    if (!result.success) {
      console.error('Failed:', result.error);
    }
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        {loading && <div>Processing...</div>}
        {error && <div className="text-red-500">Error: {error}</div>}
        {confidence !== null && (
          <div className="text-green-500">
            Confidence: {confidence}%
          </div>
        )}
      </div>

      {/* Chat UI */}
      <button
        onClick={() => handleSend('Remove the background')}
        disabled={loading}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        Remove Background
      </button>

      {/* Tool execution results */}
      {toolExecutions.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold">Tools Executed:</h3>
          {toolExecutions.map((exec, idx) => (
            <div key={idx} className="mt-2 p-2 border rounded">
              <div>{exec.toolName}</div>
              <div className="text-sm text-gray-600">
                Confidence: {exec.confidence}%
              </div>
              <div className="text-sm">
                {exec.success ? 'Success' : 'Failed'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

## Error Handling

### Status Codes

- **200**: Success
- **400**: Bad request (missing fields, invalid format)
- **429**: Rate limit exceeded
- **500**: Internal server error
- **503**: Service unavailable (API key not configured)
- **504**: Gateway timeout (processing took too long)

### Error Recovery

```typescript
async function sendMessageWithRetry(
  message: string,
  imageUrl: string,
  maxRetries = 3
): Promise<any> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch('/api/ai/chat-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          imageUrl,
          conversationId: crypto.randomUUID(),
        }),
      });

      if (response.status === 429) {
        // Rate limited - wait and retry
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
        continue;
      }

      const data = await response.json();

      if (data.success || attempt === maxRetries) {
        return data;
      }

      // Wait before retry with exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

## Performance Considerations

1. **Image Size**: Keep images under 5MB for optimal performance
2. **Conversation History**: Limit to last 10 messages to reduce payload size
3. **Timeout**: API has a 60-second timeout for processing
4. **Caching**: Consider caching tool execution results by image hash

## Security Notes

1. **Image URLs**: Only blob://, data://, and localhost URLs are allowed by default
2. **Rate Limiting**: Implement client-side rate limiting to avoid 429 errors
3. **Sanitization**: Always sanitize user messages before displaying
4. **CORS**: API includes CORS headers for local development

## Testing the Integration

### Manual Testing

```bash
# Health check
curl http://localhost:3000/api/ai/chat-orchestrator

# Test request
curl -X POST http://localhost:3000/api/ai/chat-orchestrator \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Remove the blue background",
    "imageUrl": "data:image/png;base64,iVBORw0KG...",
    "conversationId": "test-123"
  }'
```

### Automated Testing

```typescript
// __tests__/ai-integration.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import { useAIOrchestrator } from '@/lib/hooks/use-ai-orchestrator';
import fetchMock from 'jest-fetch-mock';

describe('AI Orchestrator Integration', () => {
  beforeEach(() => {
    fetchMock.resetMocks();
  });

  it('should send message and receive response', async () => {
    fetchMock.mockResponseOnce(JSON.stringify({
      success: true,
      message: 'Background removed successfully',
      toolExecutions: [{
        toolName: 'background_remover',
        success: true,
        resultImageUrl: 'blob:result',
        confidence: 95,
      }],
      confidence: 95,
      conversationId: 'test-123',
      timestamp: Date.now(),
    }));

    const { result } = renderHook(() => useAIOrchestrator());

    await act(async () => {
      const response = await result.current.sendMessage(
        'Remove background',
        'blob:test-image'
      );

      expect(response.success).toBe(true);
      expect(response.response).toContain('successfully');
      expect(response.toolExecutions).toHaveLength(1);
    });

    expect(result.current.confidence).toBe(95);
    expect(result.current.toolExecutions[0].toolName).toBe('background_remover');
  });
});
```

## Next Steps (Phase 8)

1. Implement the UI components using this integration guide
2. Add real-time progress indicators
3. Implement conversation history UI
4. Add confidence visualization
5. Create tool execution animations
6. Add error recovery UI
7. Implement image comparison slider for before/after
8. Add download functionality for processed images

## Environment Variables

Ensure these are set in `.env.local`:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-api03-...

# Optional (for specific tools)
REPLICATE_API_TOKEN=r8_...
```

## Support

For issues or questions about the API integration:
1. Check the health endpoint: `GET /api/ai/chat-orchestrator`
2. Review console logs for detailed error messages
3. Ensure all required environment variables are set
4. Check that the image URL is from an allowed origin