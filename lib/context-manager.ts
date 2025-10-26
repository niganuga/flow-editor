/**
 * Context Manager with ChromaDB Integration
 *
 * Provides the learning layer for >95% confidence by storing:
 * - Conversation history
 * - Image analyses
 * - Successful tool executions
 *
 * This creates a knowledge base that improves parameter validation over time
 * by learning from historical patterns.
 *
 * @module context-manager
 */

import type { ImageAnalysis } from './image-analyzer';

// ===== INTERFACES =====

/**
 * Complete conversation context including messages, analysis, and tool executions
 */
export interface ConversationContext {
  /** Unique identifier for this conversation */
  conversationId: string;

  /** All messages exchanged in this conversation */
  messages: ChatMessage[];

  /** Image analysis for the current working image (if any) */
  imageAnalysis: ImageAnalysis | null;

  /** History of tool executions in this conversation */
  toolExecutions: ToolExecution[];

  /** Timestamp when conversation was created */
  createdAt: number;

  /** Timestamp of last update */
  lastUpdatedAt: number;
}

/**
 * Single chat message in a conversation
 */
export interface ChatMessage {
  /** Message sender */
  role: 'user' | 'assistant';

  /** Message text content */
  content: string;

  /** Optional image URL if message includes an image */
  imageUrl?: string;

  /** Message timestamp */
  timestamp: number;
}

/**
 * Record of a tool execution with parameters and results
 */
export interface ToolExecution {
  /** Name of the tool that was executed */
  toolName: string;

  /** Parameters passed to the tool */
  parameters: any;

  /** Whether the execution succeeded */
  success: boolean;

  /** AI confidence score (0-100) */
  confidence: number;

  /** Metrics from the execution result */
  resultMetrics: {
    /** Number of pixels changed */
    pixelsChanged: number;

    /** Percentage of image changed */
    percentageChanged: number;

    /** Execution time in milliseconds */
    executionTimeMs: number;

    /** Quality score of the result (0-100) */
    qualityScore: number;
  };

  /** Snapshot of image specs at time of execution */
  imageSpecsSnapshot: Partial<ImageAnalysis>;

  /** Execution timestamp */
  timestamp: number;
}

/**
 * ChromaDB collection names
 */
const COLLECTIONS = {
  CHAT_HISTORY: 'ai_chat_history',
  TOOL_EXECUTIONS: 'tool_executions',
  IMAGE_ANALYSES: 'image_analyses'
} as const;

/**
 * ChromaDB availability flag
 */
let chromaAvailable = false;

// ===== INITIALIZATION =====

/**
 * Initialize ChromaDB collections for context storage.
 * Creates three collections:
 * - ai_chat_history: Conversation messages
 * - tool_executions: Successful tool runs with parameters
 * - image_analyses: Technical image analysis results
 *
 * @returns Promise that resolves when collections are ready
 *
 * @example
 * ```typescript
 * await initializeCollections();
 * console.log('Context manager ready');
 * ```
 */
export async function initializeCollections(): Promise<void> {
  try {
    console.log('[ContextManager] Initializing ChromaDB collections...');

    // NOTE: ChromaDB is accessed via MCP (Model Context Protocol)
    // This is a placeholder - actual MCP integration would happen here
    // For now, we'll set chromaAvailable to false to enable graceful degradation

    // In a real implementation with MCP:
    // const chatHistoryResult = await use_mcp_tool({
    //   server_name: "chromadb",
    //   tool_name: "chroma_create_collection",
    //   arguments: {
    //     name: COLLECTIONS.CHAT_HISTORY,
    //     metadata: {
    //       description: "Chat conversation history",
    //       version: "1.0"
    //     }
    //   }
    // });

    // For now, log that we're running in degraded mode
    console.log('[ContextManager] ChromaDB MCP not available - running in degraded mode');
    console.log('[ContextManager] Context will be stored in memory only');

    chromaAvailable = false;

  } catch (error) {
    console.warn('[ContextManager] Failed to initialize ChromaDB:', error);
    chromaAvailable = false;
    // Gracefully degrade - system works without ChromaDB
  }
}

// ===== IN-MEMORY FALLBACK STORAGE =====

/**
 * In-memory storage when ChromaDB is unavailable
 */
const memoryStore: {
  conversations: Map<string, ConversationContext>;
  toolExecutions: ToolExecution[];
} = {
  conversations: new Map(),
  toolExecutions: []
};

// ===== CONVERSATION MANAGEMENT =====

/**
 * Store a conversation turn (user message + assistant response).
 *
 * @param conversationId - Unique conversation identifier
 * @param userMessage - User's message text
 * @param assistantResponse - Assistant's response text
 * @param imageAnalysis - Optional image analysis from this turn
 *
 * @example
 * ```typescript
 * await storeConversationTurn(
 *   'conv-123',
 *   'Remove the blue background',
 *   'I'll use color knockout to remove the blue...',
 *   imageAnalysis
 * );
 * ```
 */
export async function storeConversationTurn(
  conversationId: string,
  userMessage: string,
  assistantResponse: string,
  imageAnalysis: ImageAnalysis | null
): Promise<void> {
  try {
    const timestamp = Date.now();

    // Create messages
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: userMessage,
        timestamp
      },
      {
        role: 'assistant',
        content: assistantResponse,
        timestamp: timestamp + 1
      }
    ];

    if (chromaAvailable) {
      // Store in ChromaDB via MCP
      // const document = JSON.stringify({
      //   conversationId,
      //   messages,
      //   imageAnalysisSummary: imageAnalysis ? formatImageAnalysisSummary(imageAnalysis) : null,
      //   timestamp
      // });

      // await use_mcp_tool({
      //   server_name: "chromadb",
      //   tool_name: "chroma_add_documents",
      //   arguments: {
      //     collection_name: COLLECTIONS.CHAT_HISTORY,
      //     documents: [document],
      //     metadatas: [{
      //       conversation_id: conversationId,
      //       timestamp: timestamp.toString(),
      //       has_image: imageAnalysis !== null ? 'true' : 'false'
      //     }],
      //     ids: [generateDocumentId()]
      //   }
      // });
    } else {
      // Store in memory
      let context = memoryStore.conversations.get(conversationId);

      if (!context) {
        context = {
          conversationId,
          messages: [],
          imageAnalysis: null,
          toolExecutions: [],
          createdAt: timestamp,
          lastUpdatedAt: timestamp
        };
        memoryStore.conversations.set(conversationId, context);
      }

      context.messages.push(...messages);
      if (imageAnalysis) {
        context.imageAnalysis = imageAnalysis;
      }
      context.lastUpdatedAt = timestamp;
    }

    console.log(`[ContextManager] Stored conversation turn for ${conversationId}`);

  } catch (error) {
    console.error('[ContextManager] Failed to store conversation turn:', error);
    // Don't throw - graceful degradation
  }
}

// ===== TOOL EXECUTION TRACKING =====

/**
 * Store a successful tool execution for learning.
 * Only stores executions with success=true and confidence>=70.
 *
 * @param conversationId - Conversation this execution belongs to
 * @param execution - Tool execution record
 *
 * @example
 * ```typescript
 * await storeToolExecution('conv-123', {
 *   toolName: 'color_knockout',
 *   parameters: { colors: [...], tolerance: 30 },
 *   success: true,
 *   confidence: 95,
 *   resultMetrics: { pixelsChanged: 50000, ... },
 *   imageSpecsSnapshot: { width: 1920, height: 1080, ... },
 *   timestamp: Date.now()
 * });
 * ```
 */
export async function storeToolExecution(
  conversationId: string,
  execution: ToolExecution
): Promise<void> {
  try {
    // Only store successful executions with good confidence
    if (!execution.success || execution.confidence < 70) {
      console.log(`[ContextManager] Skipping low-confidence execution (${execution.confidence}%)`);
      return;
    }

    if (chromaAvailable) {
      // Store in ChromaDB via MCP
      // const document = JSON.stringify(execution);

      // await use_mcp_tool({
      //   server_name: "chromadb",
      //   tool_name: "chroma_add_documents",
      //   arguments: {
      //     collection_name: COLLECTIONS.TOOL_EXECUTIONS,
      //     documents: [document],
      //     metadatas: [{
      //       tool_name: execution.toolName,
      //       success: execution.success.toString(),
      //       confidence: execution.confidence.toString(),
      //       conversation_id: conversationId,
      //       timestamp: execution.timestamp.toString()
      //     }],
      //     ids: [generateDocumentId()]
      //   }
      // });
    } else {
      // Store in memory
      memoryStore.toolExecutions.push(execution);

      // Also add to conversation context
      const context = memoryStore.conversations.get(conversationId);
      if (context) {
        context.toolExecutions.push(execution);
        context.lastUpdatedAt = Date.now();
      }
    }

    console.log(`[ContextManager] Stored tool execution: ${execution.toolName} (${execution.confidence}% confidence)`);

  } catch (error) {
    console.error('[ContextManager] Failed to store tool execution:', error);
    // Don't throw - graceful degradation
  }
}

/**
 * Find similar successful tool executions based on image characteristics.
 * Uses semantic search to find executions on similar images.
 *
 * @param toolName - Name of the tool to search for
 * @param imageAnalysis - Current image analysis to match against
 * @param limit - Maximum number of results to return (default: 5)
 * @returns Array of similar successful executions
 *
 * @example
 * ```typescript
 * const similar = await findSimilarExecutions(
 *   'color_knockout',
 *   currentImageAnalysis,
 *   5
 * );
 *
 * // Use to validate parameters
 * const avgTolerance = similar.reduce((sum, ex) =>
 *   sum + ex.parameters.tolerance, 0) / similar.length;
 * ```
 */
export async function findSimilarExecutions(
  toolName: string,
  imageAnalysis: ImageAnalysis,
  limit: number = 5
): Promise<ToolExecution[]> {
  try {
    if (chromaAvailable) {
      // Query ChromaDB via MCP
      // const searchText = imageAnalysisToSearchText(imageAnalysis);

      // const results = await use_mcp_tool({
      //   server_name: "chromadb",
      //   tool_name: "chroma_query_documents",
      //   arguments: {
      //     collection_name: COLLECTIONS.TOOL_EXECUTIONS,
      //     query_texts: [searchText],
      //     n_results: limit,
      //     where: {
      //       tool_name: toolName,
      //       success: "true"
      //     }
      //   }
      // });

      // return results.documents.map((doc: string) => parseToolExecution(doc));

      return [];
    } else {
      // Search in memory
      const matching = memoryStore.toolExecutions
        .filter(ex => ex.toolName === toolName && ex.success)
        .map(ex => ({
          execution: ex,
          similarity: calculateImageSimilarity(imageAnalysis, ex.imageSpecsSnapshot)
        }))
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, limit)
        .map(item => item.execution);

      console.log(`[ContextManager] Found ${matching.length} similar executions for ${toolName}`);
      return matching;
    }

  } catch (error) {
    console.error('[ContextManager] Failed to find similar executions:', error);
    return []; // Return empty array on error
  }
}

// ===== CONTEXT RETRIEVAL =====

/**
 * Get complete conversation context by ID.
 * Retrieves all messages, image analysis, and tool executions.
 *
 * @param conversationId - Conversation identifier
 * @returns Conversation context or null if not found
 *
 * @example
 * ```typescript
 * const context = await getConversationContext('conv-123');
 * if (context) {
 *   console.log(`${context.messages.length} messages`);
 *   console.log(`${context.toolExecutions.length} tool executions`);
 * }
 * ```
 */
export async function getConversationContext(
  conversationId: string
): Promise<ConversationContext | null> {
  try {
    if (chromaAvailable) {
      // Query ChromaDB via MCP
      // const results = await use_mcp_tool({
      //   server_name: "chromadb",
      //   tool_name: "chroma_query_documents",
      //   arguments: {
      //     collection_name: COLLECTIONS.CHAT_HISTORY,
      //     query_texts: [conversationId],
      //     n_results: 100,
      //     where: {
      //       conversation_id: conversationId
      //     }
      //   }
      // });

      // // Reconstruct context from results
      // return reconstructContext(results);

      return null;
    } else {
      // Return from memory
      const context = memoryStore.conversations.get(conversationId);
      return context || null;
    }

  } catch (error) {
    console.error('[ContextManager] Failed to get conversation context:', error);
    return null;
  }
}

// ===== MAINTENANCE =====

/**
 * Prune old conversations to prevent database bloat.
 * Keeps only the most recent N conversations.
 *
 * @param keepRecentCount - Number of recent conversations to keep (default: 100)
 *
 * @example
 * ```typescript
 * // Keep only last 50 conversations
 * await pruneOldConversations(50);
 * ```
 */
export async function pruneOldConversations(
  keepRecentCount: number = 100
): Promise<void> {
  try {
    if (chromaAvailable) {
      // Delete old documents from ChromaDB
      // This would require querying all conversations, sorting by timestamp,
      // and deleting the oldest ones
      console.log('[ContextManager] Pruning old conversations in ChromaDB...');

    } else {
      // Prune in-memory storage
      const conversations = Array.from(memoryStore.conversations.values())
        .sort((a, b) => b.lastUpdatedAt - a.lastUpdatedAt);

      if (conversations.length > keepRecentCount) {
        const toKeep = conversations.slice(0, keepRecentCount);
        memoryStore.conversations.clear();

        toKeep.forEach(conv => {
          memoryStore.conversations.set(conv.conversationId, conv);
        });

        const pruned = conversations.length - toKeep.length;
        console.log(`[ContextManager] Pruned ${pruned} old conversations`);
      }
    }

  } catch (error) {
    console.error('[ContextManager] Failed to prune conversations:', error);
  }
}

// ===== HELPER FUNCTIONS =====

/**
 * Generate unique document ID for ChromaDB.
 *
 * @returns Unique ID string
 */
function generateDocumentId(): string {
  return `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Convert ImageAnalysis to searchable text for ChromaDB semantic search.
 *
 * @param analysis - Image analysis to convert
 * @returns Searchable text representation
 */
function imageAnalysisToSearchText(analysis: ImageAnalysis): string {
  const parts: string[] = [
    `dimensions: ${analysis.width}x${analysis.height}`,
    `aspect ratio: ${analysis.aspectRatio}`,
    `format: ${analysis.format}`,
    `transparency: ${analysis.hasTransparency}`,
    `colors: ${analysis.uniqueColorCount}`,
    `sharpness: ${analysis.sharpnessScore}`,
    `noise: ${analysis.noiseLevel}`,
    `print ready: ${analysis.isPrintReady}`
  ];

  // Add dominant colors
  if (analysis.dominantColors.length > 0) {
    const colorList = analysis.dominantColors
      .slice(0, 3)
      .map(c => c.hex)
      .join(', ');
    parts.push(`dominant colors: ${colorList}`);
  }

  return parts.join('; ');
}

/**
 * Format image analysis into a summary string for storage.
 *
 * @param analysis - Image analysis to format
 * @returns Summary string
 */
function formatImageAnalysisSummary(analysis: ImageAnalysis): string {
  return `${analysis.width}x${analysis.height} ${analysis.format}, ` +
         `${analysis.dominantColors.length} colors, ` +
         `sharpness ${analysis.sharpnessScore}/100, ` +
         `${analysis.hasTransparency ? 'with' : 'no'} transparency`;
}

/**
 * Parse tool execution from ChromaDB document string.
 *
 * @param document - JSON document string from ChromaDB
 * @returns Parsed ToolExecution object
 */
function parseToolExecution(document: string): ToolExecution {
  try {
    return JSON.parse(document) as ToolExecution;
  } catch (error) {
    console.error('[ContextManager] Failed to parse tool execution:', error);
    // Return dummy execution on parse error
    return {
      toolName: 'unknown',
      parameters: {},
      success: false,
      confidence: 0,
      resultMetrics: {
        pixelsChanged: 0,
        percentageChanged: 0,
        executionTimeMs: 0,
        qualityScore: 0
      },
      imageSpecsSnapshot: {},
      timestamp: 0
    };
  }
}

/**
 * Calculate similarity score between two image analyses.
 * Uses weighted comparison of key properties.
 *
 * @param a - First image analysis
 * @param b - Second image analysis (partial)
 * @returns Similarity score 0-100 (higher = more similar)
 */
function calculateImageSimilarity(
  a: ImageAnalysis,
  b: Partial<ImageAnalysis>
): number {
  let score = 0;
  let weights = 0;

  // Dimension similarity (weight: 30)
  if (b.width && b.height) {
    const dimDiff = Math.abs(a.width - b.width) / Math.max(a.width, b.width) +
                    Math.abs(a.height - b.height) / Math.max(a.height, b.height);
    const dimScore = Math.max(0, 100 - dimDiff * 50);
    score += dimScore * 0.3;
    weights += 0.3;
  }

  // Aspect ratio similarity (weight: 10)
  if (b.aspectRatio) {
    const arScore = a.aspectRatio === b.aspectRatio ? 100 : 50;
    score += arScore * 0.1;
    weights += 0.1;
  }

  // Transparency match (weight: 15)
  if (b.hasTransparency !== undefined) {
    const transScore = a.hasTransparency === b.hasTransparency ? 100 : 0;
    score += transScore * 0.15;
    weights += 0.15;
  }

  // Color count similarity (weight: 15)
  if (b.uniqueColorCount) {
    const colorDiff = Math.abs(a.uniqueColorCount - b.uniqueColorCount) /
                      Math.max(a.uniqueColorCount, b.uniqueColorCount);
    const colorScore = Math.max(0, 100 - colorDiff * 100);
    score += colorScore * 0.15;
    weights += 0.15;
  }

  // Sharpness similarity (weight: 15)
  if (b.sharpnessScore !== undefined) {
    const sharpDiff = Math.abs(a.sharpnessScore - b.sharpnessScore);
    const sharpScore = Math.max(0, 100 - sharpDiff);
    score += sharpScore * 0.15;
    weights += 0.15;
  }

  // Quality similarity (weight: 15)
  if (b.isPrintReady !== undefined) {
    const qualScore = a.isPrintReady === b.isPrintReady ? 100 : 50;
    score += qualScore * 0.15;
    weights += 0.15;
  }

  // Normalize by total weights used
  return weights > 0 ? score / weights : 0;
}

// ===== PUBLIC API SUMMARY =====

/**
 * Get statistics about stored context data.
 *
 * @returns Object with counts of conversations, executions, etc.
 *
 * @example
 * ```typescript
 * const stats = getContextStats();
 * console.log(`${stats.conversations} conversations`);
 * console.log(`${stats.toolExecutions} tool executions`);
 * ```
 */
export function getContextStats(): {
  conversations: number;
  toolExecutions: number;
  successfulExecutions: number;
  chromaAvailable: boolean;
} {
  if (chromaAvailable) {
    return {
      conversations: 0, // Would query ChromaDB
      toolExecutions: 0,
      successfulExecutions: 0,
      chromaAvailable: true
    };
  } else {
    const successfulExecutions = memoryStore.toolExecutions.filter(
      ex => ex.success && ex.confidence >= 70
    ).length;

    return {
      conversations: memoryStore.conversations.size,
      toolExecutions: memoryStore.toolExecutions.length,
      successfulExecutions,
      chromaAvailable: false
    };
  }
}

/**
 * Clear all stored context (for testing/debugging).
 *
 * @example
 * ```typescript
 * await clearAllContext();
 * console.log('Context cleared');
 * ```
 */
export async function clearAllContext(): Promise<void> {
  try {
    memoryStore.conversations.clear();
    memoryStore.toolExecutions = [];

    console.log('[ContextManager] Cleared all context data');
  } catch (error) {
    console.error('[ContextManager] Failed to clear context:', error);
  }
}
