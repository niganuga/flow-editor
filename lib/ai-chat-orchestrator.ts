/**
 * AI Chat Orchestrator - Core orchestration layer for AI Design Assistant
 *
 * This is the MAIN ORCHESTRATOR that coordinates the entire workflow:
 * 1. Extract ground truth from image analyzer
 * 2. Call Claude Vision API with function calling
 * 3. Validate parameters before execution
 * 4. Execute tools safely
 * 5. Store successful executions for learning
 * 6. Return results with confidence scores
 *
 * Architecture:
 * User Message → AI Chat Orchestrator (THIS FILE) →
 *   1. analyzeImage() → Get ground truth specs
 *   2. Claude Vision API → Get tool calls
 *   3. validateToolParameters() → Validate each call
 *   4. executeTool() → Execute if valid
 *   5. storeToolExecution() → Learn from success
 *   6. Return response to UI
 *
 * @module ai-chat-orchestrator
 */

import Anthropic from '@anthropic-ai/sdk';
import type { ImageAnalysis } from './image-analyzer';
import { analyzeImage } from './image-analyzer';
import {
  storeConversationTurn,
  storeToolExecution,
  findSimilarExecutions,
  getConversationContext,
  type ToolExecution,
} from './context-manager';
import { validateToolParameters, type ValidationResult } from './parameter-validator';
import { validateToolResult, getExpectedOperation } from './result-validator';
import { toolDefinitions } from './ai-tools-orchestrator';
import { performColorKnockout, pickColorFromImage } from './tools/color-knockout';
import { extractColors, recolorImage, type BlendMode as RecolorBlendMode } from './tools/recolor';
import { textureCut, createPatternTexture } from './tools/texture-cut';
import { removeBackground } from './tools/background-remover';
import { upscaleImage } from './tools/upscaler';

// ===== INTERFACES =====

/**
 * Request to orchestrator for processing user message
 */
export interface OrchestratorRequest {
  /** User's message text */
  message: string;

  /** URL to the image being edited */
  imageUrl: string;

  /** Optional second image URL (for reference or dual-image workflows) */
  attachedImageUrl?: string;

  /** Optional preview result URL from most recent tool execution in chat */
  previewResultUrl?: string;

  /** Unique conversation identifier */
  conversationId: string;

  /** Optional conversation history for context */
  conversationHistory?: ConversationMessage[];

  /** Optional editing history from History Panel for full context */
  editingHistory?: {
    totalOperations: number;
    currentStateIndex: number;
    operations: Array<{
      step: number;
      operation: string;
      description: string;
      isCurrent: boolean;
      timestamp: number;
    }>;
  };

  /** Optional user context for personalization */
  userContext?: {
    /** Industry context (e.g., "custom apparel printing") */
    industry?: string;

    /** User expertise level */
    expertise?: 'novice' | 'intermediate' | 'expert';

    /** Additional preferences */
    preferences?: Record<string, any>;
  };
}

/**
 * Response from orchestrator with tool execution results
 */
export interface OrchestratorResponse {
  /** Whether the request succeeded */
  success: boolean;

  /** Claude's response message to the user */
  message: string;

  /** Array of tool executions performed */
  toolExecutions: ToolExecutionResult[];

  /** Overall confidence score 0-100 */
  confidence: number;

  /** Image analysis from ground truth extraction */
  imageAnalysis?: ImageAnalysis;

  /** Conversation ID for tracking */
  conversationId: string;

  /** Response timestamp */
  timestamp: number;

  /** Error message if failed */
  error?: string;

  /** Clarification data (if clarification needed) */
  clarification?: ClarificationData;
}

/**
 * Clarification data when AI needs user confirmation
 */
export interface ClarificationData {
  /** Whether clarification is needed */
  needsClarification: boolean;

  /** Parsed steps from user request */
  parsedSteps: ClarificationStep[];

  /** Print readiness warnings (if applicable) */
  printWarnings: PrintWarning[];

  /** Suggested optimized workflow (if better approach exists) */
  suggestedWorkflow?: SuggestedWorkflow;

  /** User-facing options */
  options: ClarificationOption[];
}

export interface ClarificationStep {
  /** Step number */
  number: number;

  /** User-friendly description */
  description: string;

  /** Tool name */
  toolName: string;

  /** Tool parameters */
  parameters: any;

  /** Why this step is needed */
  reasoning?: string;
}

export interface PrintWarning {
  /** Warning severity */
  severity: 'critical' | 'warning' | 'info';

  /** Warning message */
  message: string;

  /** What will be affected */
  impact: string;

  /** Suggested fix */
  suggestedFix?: string;
}

export interface SuggestedWorkflow {
  /** Why this workflow is better */
  reason: string;

  /** Optimized steps */
  steps: ClarificationStep[];

  /** Benefits of suggested approach */
  benefits: string[];
}

export interface ClarificationOption {
  /** Option ID */
  id: 'execute-original' | 'execute-suggested' | 'cancel';

  /** User-facing label */
  label: string;

  /** Description of what this option does */
  description: string;
}

/**
 * Result of a single tool execution
 */
export interface ToolExecutionResult {
  /** Name of the tool that was executed */
  toolName: string;

  /** Parameters passed to the tool */
  parameters: any;

  /** Parameter validation result */
  validationResult: ValidationResult;

  /** Whether execution succeeded */
  executionSuccess: boolean;

  /** URL to result image if execution succeeded */
  resultImageUrl?: string;

  /** Error message if execution failed */
  error?: string;

  /** Execution time in milliseconds */
  executionTimeMs: number;

  /** Confidence score for this execution */
  confidence: number;
}

/**
 * Conversation message for history tracking
 */
export interface ConversationMessage {
  /** Message sender role */
  role: 'user' | 'assistant';

  /** Message content text */
  content: string;

  /** Message timestamp */
  timestamp: number;

  /** Optional image URL if message included image */
  imageUrl?: string;

  /** Optional tool executions performed in this turn */
  toolExecutions?: ToolExecutionResult[];
}

// ===== MAIN ORCHESTRATION FUNCTION =====

/**
 * Process user message and execute tools via Claude Vision API.
 *
 * This is the main orchestration function that:
 * 1. Analyzes the image for ground truth
 * 2. Calls Claude Vision API with function calling
 * 3. Validates parameters before execution
 * 4. Executes tools if validation passes
 * 5. Stores successful executions for learning
 * 6. Returns results with confidence scores
 *
 * @param request - Orchestrator request with message and image
 * @returns Orchestrator response with tool executions
 *
 * @example
 * ```typescript
 * const response = await processUserMessage({
 *   message: "Remove the blue background",
 *   imageUrl: blobUrl,
 *   conversationId: "conv-123",
 *   conversationHistory: [],
 *   userContext: { industry: "custom apparel printing" }
 * });
 *
 * if (response.success) {
 *   console.log(`Executed ${response.toolExecutions.length} tools`);
 *   console.log(`Overall confidence: ${response.confidence}%`);
 * }
 * ```
 */
export async function processUserMessage(
  request: OrchestratorRequest
): Promise<OrchestratorResponse> {
  const startTime = Date.now();

  try {
    console.log('[Orchestrator] Processing user message:', request.message);

    // ===== STEP 1: Extract ground truth from image =====
    console.log('[Orchestrator] Step 1: Analyzing image for ground truth...');

    const imageAnalysis = await analyzeImage(request.imageUrl, (progress, msg) => {
      console.log(`[Orchestrator] Analysis: ${progress}% - ${msg}`);
    });

    console.log('[Orchestrator] Image analysis complete:', {
      dimensions: `${imageAnalysis.width}x${imageAnalysis.height}`,
      colors: imageAnalysis.dominantColors.length,
      confidence: imageAnalysis.confidence,
    });

    // ===== STEP 2: Call Claude Vision API with function calling =====
    console.log('[Orchestrator] Step 2: Calling Claude Vision API...');

    const systemPrompt = buildSystemPrompt(
      imageAnalysis,
      request.userContext,
      !!request.previewResultUrl,
      request.previewResultUrl ? 'preview result' : undefined,
      request.editingHistory
    );
    const claudeTools = convertToolsToClaudeFormat(toolDefinitions);

    const claudeResponse = await callClaudeVisionAPI({
      message: request.message,
      imageUrl: request.imageUrl,
      previewResultUrl: request.previewResultUrl,
      attachedImageUrl: request.attachedImageUrl,
      conversationHistory: request.conversationHistory,
      systemPrompt,
      tools: claudeTools,
    });

    console.log('[Orchestrator] Claude response received');

    // Extract text response and function calls
    const { textResponse, functionCalls } = extractResponseContent(claudeResponse);

    console.log('[Orchestrator] Found:', {
      textLength: textResponse.length,
      functionCalls: functionCalls.length,
    });

    // ===== STEP 3-5: Validate and execute each tool call =====
    const toolExecutionResults: ToolExecutionResult[] = [];
    const confidenceScores: number[] = [imageAnalysis.confidence];

    if (functionCalls.length > 0) {
      console.log(`[Orchestrator] Step 3-5: Processing ${functionCalls.length} function call(s)...`);

      for (let i = 0; i < functionCalls.length; i++) {
        const call = functionCalls[i];
        console.log(`[Orchestrator] Processing call ${i + 1}/${functionCalls.length}: ${call.toolName}`);

        const executionResult = await processToolCall(
          call,
          imageAnalysis,
          request.imageUrl,
          request.conversationId
        );

        toolExecutionResults.push(executionResult);
        confidenceScores.push(executionResult.confidence);

        console.log(`[Orchestrator] Tool ${call.toolName} execution:`, {
          success: executionResult.executionSuccess,
          confidence: executionResult.confidence,
          timeMs: executionResult.executionTimeMs,
        });
      }
    }

    // ===== STEP 6: Calculate overall confidence =====
    const overallConfidence = calculateOverallConfidence(confidenceScores);

    console.log('[Orchestrator] Overall confidence:', overallConfidence);

    // ===== STEP 7: Store conversation turn =====
    await storeConversationTurn(
      request.conversationId,
      request.message,
      textResponse,
      imageAnalysis
    );

    // ===== STEP 8: Build and return response =====
    const elapsedTime = Date.now() - startTime;

    const response: OrchestratorResponse = {
      success: true,
      message: textResponse,
      toolExecutions: toolExecutionResults,
      confidence: overallConfidence,
      imageAnalysis,
      conversationId: request.conversationId,
      timestamp: Date.now(),
    };

    console.log(`[Orchestrator] Request completed in ${elapsedTime}ms`);

    return response;
  } catch (error) {
    console.error('[Orchestrator] Request failed:', error);

    // Return error response (never throw)
    return {
      success: false,
      message: 'I encountered an error processing your request. Please try again.',
      toolExecutions: [],
      confidence: 0,
      conversationId: request.conversationId,
      timestamp: Date.now(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ===== TOOL CALL PROCESSING =====

/**
 * Process a single tool call: validate, execute, and store.
 *
 * @param call - Function call from Claude
 * @param imageAnalysis - Ground truth image analysis
 * @param imageUrl - Image URL for execution
 * @param conversationId - Conversation ID for storing
 * @returns Tool execution result
 */
async function processToolCall(
  call: { toolName: string; parameters: any },
  imageAnalysis: ImageAnalysis,
  imageUrl: string,
  conversationId: string
): Promise<ToolExecutionResult> {
  const startTime = Date.now();

  try {
    // ===== STEP 3: Validate parameters =====
    console.log(`[Orchestrator] Validating ${call.toolName} parameters...`);

    const validationResult = await validateToolParameters(
      call.toolName,
      call.parameters,
      imageAnalysis,
      imageUrl
    );

    console.log(`[Orchestrator] Validation result:`, {
      isValid: validationResult.isValid,
      confidence: validationResult.confidence,
      warnings: validationResult.warnings.length,
      errors: validationResult.errors.length,
    });

    // If validation failed, return error result
    if (!validationResult.isValid) {
      return {
        toolName: call.toolName,
        parameters: call.parameters,
        validationResult,
        executionSuccess: false,
        error: `Validation failed: ${validationResult.errors.join('; ')}`,
        executionTimeMs: Date.now() - startTime,
        confidence: 0,
      };
    }

    // Warn if low confidence but continue
    if (validationResult.confidence < 70) {
      console.warn(
        `[Orchestrator] Low confidence (${validationResult.confidence}%) but proceeding:`,
        validationResult.warnings
      );
    }

    // ===== STEP 4: Execute tool =====
    console.log(`[Orchestrator] Executing ${call.toolName}...`);

    const resultImageUrl = await executeToolSafely(call.toolName, call.parameters, imageUrl);

    const executionTimeMs = Date.now() - startTime;

    console.log(`[Orchestrator] Execution succeeded in ${executionTimeMs}ms`);

    // ===== STEP 5: Validate result (pixel-level verification) =====
    console.log(`[Orchestrator] Validating result quality...`);

    const resultValidation = await validateToolResult({
      toolName: call.toolName,
      beforeImageUrl: imageUrl,
      afterImageUrl: resultImageUrl,
      expectedOperation: getExpectedOperation(call.toolName),
      onProgress: (progress, msg) => {
        console.log(`[ResultValidator] ${progress}% - ${msg}`);
      },
    });

    console.log(`[Orchestrator] Result validation:`, {
      success: resultValidation.success,
      pixelsChanged: resultValidation.pixelsChanged,
      percentageChanged: resultValidation.percentageChanged.toFixed(2) + '%',
      qualityScore: resultValidation.qualityScore,
    });

    // ===== STEP 6: Store successful execution with real metrics =====
    if (validationResult.confidence >= 70 && resultValidation.success) {
      await storeToolExecution(conversationId, {
        toolName: call.toolName,
        parameters: call.parameters,
        success: true,
        confidence: Math.min(validationResult.confidence, resultValidation.qualityScore),
        resultMetrics: {
          executionTimeMs,
          pixelsChanged: resultValidation.pixelsChanged,
          percentageChanged: resultValidation.percentageChanged,
          qualityScore: resultValidation.qualityScore,
        },
        imageSpecsSnapshot: {
          width: imageAnalysis.width,
          height: imageAnalysis.height,
          dominantColors: imageAnalysis.dominantColors,
          hasTransparency: imageAnalysis.hasTransparency,
          uniqueColorCount: imageAnalysis.uniqueColorCount,
          sharpnessScore: imageAnalysis.sharpnessScore,
          noiseLevel: imageAnalysis.noiseLevel,
          isPrintReady: imageAnalysis.isPrintReady,
        },
        timestamp: Date.now(),
      });
    }

    return {
      toolName: call.toolName,
      parameters: call.parameters,
      validationResult,
      executionSuccess: true,
      resultImageUrl,
      executionTimeMs,
      confidence: validationResult.confidence,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    console.error(`[Orchestrator] Tool execution failed:`, error);

    return {
      toolName: call.toolName,
      parameters: call.parameters,
      validationResult: {
        isValid: false,
        confidence: 0,
        warnings: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        reasoning: 'Execution failed',
      },
      executionSuccess: false,
      error: error instanceof Error ? error.message : 'Execution failed',
      executionTimeMs,
      confidence: 0,
    };
  }
}

// ===== CLAUDE API INTEGRATION =====

/**
 * Initialize Anthropic client (lazy initialization)
 */
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }

    anthropicClient = new Anthropic({
      apiKey,
    });
  }

  return anthropicClient;
}

/**
 * Set client (for testing)
 */
export function setAnthropicClient(client: Anthropic | null) {
  anthropicClient = client;
}

/**
 * Reset client (for testing)
 */
export function resetAnthropicClient() {
  anthropicClient = null;
}

/**
 * Call Claude Vision API with function calling.
 *
 * @param params - API call parameters
 * @returns Claude API response
 */
async function callClaudeVisionAPI(params: {
  message: string;
  imageUrl: string;
  previewResultUrl?: string;
  attachedImageUrl?: string;
  conversationHistory?: ConversationMessage[];
  systemPrompt: string;
  tools: any[];
}): Promise<any> {
  const anthropic = getAnthropicClient();

  // Build message history
  const messages: any[] = [];

  // Add conversation history (if any)
  // Filter out messages with empty content - Claude API requires non-empty content
  if (params.conversationHistory && params.conversationHistory.length > 0) {
    for (const msg of params.conversationHistory) {
      // Skip messages with empty or whitespace-only content
      // Must be a string with at least 1 non-whitespace character
      if (
        msg.content &&
        typeof msg.content === 'string' &&
        msg.content.trim().length > 0
      ) {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      } else {
        // Log skipped messages for debugging
        console.log('[Orchestrator] Skipping empty message from history:', {
          role: msg.role,
          contentType: typeof msg.content,
          contentLength: typeof msg.content === 'string' ? msg.content.length : 0,
        });
      }
    }
  }

  // Add current message with image(s)
  // Helper function to convert image URL to source format
  const convertImageUrl = async (url: string): Promise<any> => {
    if (url.startsWith('blob:')) {
      // Blob URLs cannot be processed server-side - they must be converted client-side
      throw new Error(
        'Blob URL detected server-side. Blob URLs must be converted to data URLs on the client before sending to the server. ' +
        'This is likely a bug in the client-side image preparation code.'
      );
    } else if (url.startsWith('data:')) {
      // Data URL - extract base64 part
      // Use indexOf instead of regex to avoid stack overflow on large strings
      const headerEnd = url.indexOf(',');
      if (headerEnd === -1) {
        throw new Error('Invalid data URL format - missing comma');
      }

      const header = url.substring(0, headerEnd);
      const data = url.substring(headerEnd + 1);

      // Extract media type from header (e.g., "data:image/png;base64")
      const mediaTypeMatch = header.match(/^data:([^;]+)/);
      if (!mediaTypeMatch) {
        throw new Error('Invalid data URL format - missing media type');
      }

      return {
        type: 'base64',
        media_type: mediaTypeMatch[1],
        data: data,
      };
    } else {
      // External URL
      return {
        type: 'url',
        url: url,
      };
    }
  };

  // Build message content with images
  const messageContent: any[] = [];

  // Always add canvas image first
  const canvasSource = await convertImageUrl(params.imageUrl);
  messageContent.push({
    type: 'image',
    source: canvasSource,
  });

  // Determine image labels based on what's present
  const hasPreview = !!params.previewResultUrl;
  const hasAttachment = !!params.attachedImageUrl;

  if (hasPreview || hasAttachment) {
    // Multiple images - label the canvas image
    messageContent.push({
      type: 'text',
      text: '[Canvas Image - Current working image]',
    });
  }

  // Add preview result if exists
  if (hasPreview) {
    const previewSource = await convertImageUrl(params.previewResultUrl);
    messageContent.push({
      type: 'image',
      source: previewSource,
    });
    messageContent.push({
      type: 'text',
      text: '[Preview Result - Most recent tool output from chat]',
    });
  }

  // Add attached reference image if exists
  if (hasAttachment) {
    const attachmentSource = await convertImageUrl(params.attachedImageUrl);
    messageContent.push({
      type: 'image',
      source: attachmentSource,
    });
    messageContent.push({
      type: 'text',
      text: '[Attached Reference Image - User provided for inspiration/guidance]',
    });
  }

  // Add user's message
  messageContent.push({
    type: 'text',
    text: params.message,
  });

  messages.push({
    role: 'user',
    content: messageContent,
  });

  // Call Claude API
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4096,
    system: params.systemPrompt,
    messages,
    tools: params.tools.length > 0 ? params.tools : undefined,
  });

  return response;
}

// ===== SYSTEM PROMPT BUILDER =====

/**
 * Build system prompt with ground truth specifications.
 *
 * @param imageAnalysis - Ground truth image analysis
 * @param userContext - Optional user context
 * @param hasPreview - Whether a preview result exists in this conversation
 * @param previewDescription - Description of the preview result (e.g., "mockup on white hoodie")
 * @param editingHistory - Optional editing history from History Panel
 * @returns System prompt string
 */
function buildSystemPrompt(
  imageAnalysis: ImageAnalysis,
  userContext?: OrchestratorRequest['userContext'],
  hasPreview?: boolean,
  previewDescription?: string,
  editingHistory?: OrchestratorRequest['editingHistory']
): string {
  // Calculate print sizes at different DPIs
  const effectiveDPI = imageAnalysis.dpi || 72;
  const currentPrintWidth = (imageAnalysis.width / effectiveDPI).toFixed(1);
  const currentPrintHeight = (imageAnalysis.height / effectiveDPI).toFixed(1);

  // Standard print sizes
  const print300Width = (imageAnalysis.width / 300).toFixed(1);
  const print300Height = (imageAnalysis.height / 300).toFixed(1);
  const print150Width = (imageAnalysis.width / 150).toFixed(1);
  const print150Height = (imageAnalysis.height / 150).toFixed(1);

  const historySection = editingHistory && editingHistory.totalOperations > 0 ? `

<editing_history>
COMPLETE EDITING HISTORY (${editingHistory.totalOperations} operations):
You have full context of all operations performed on this image. Use this to:
- Avoid repeating operations already done
- Understand the current image state
- Make informed decisions about next steps

${editingHistory.operations
  .map(op => `${op.step}. ${op.operation.toUpperCase()}: ${op.description}${op.isCurrent ? ' ← CURRENT STATE' : ''}`)
  .join('\n')}

Current state: Step ${editingHistory.currentStateIndex + 1}/${editingHistory.totalOperations}
</editing_history>
` : '';

  return `You are an AI Design Assistant specializing in apparel printing and image editing workflows.

<role>
Expert design partner helping with professional print production. You understand multi-step image editing workflows and can orchestrate complex tool chains to achieve desired results.
</role>

<ground_truth_data>
IMAGE TECHNICAL SPECIFICATIONS (Trust this data over visual perception):
• Dimensions: ${imageAnalysis.width} × ${imageAnalysis.height} pixels
• Current print size: ${currentPrintWidth}" × ${currentPrintHeight}" at ${effectiveDPI} DPI
• Professional quality (300 DPI): ${print300Width}" × ${print300Height}"
• Good quality (150 DPI): ${print150Width}" × ${print150Height}"
• File format: ${imageAnalysis.format.toUpperCase()}, ${(imageAnalysis.fileSize / 1024).toFixed(1)} KB
• Transparency: ${imageAnalysis.hasTransparency ? 'YES - Ready for garment printing' : 'NO - Has solid background'}
• Image quality: Sharpness ${imageAnalysis.sharpnessScore}/100 ${imageAnalysis.isBlurry ? '(needs improvement)' : '(good quality)'}
• Dominant colors: ${imageAnalysis.dominantColors.map((c) => c.hex).join(', ')}
• Effective DPI: ${effectiveDPI}
</ground_truth_data>${historySection}

<attachment_capabilities>
REFERENCE IMAGES AND DUAL-IMAGE WORKFLOWS:

Users can attach a second image using the paperclip button in the chat. This enables powerful dual-image workflows:

• **Reference Images**: Users can attach inspiration images to guide AI generation
  - "Make my design look like this [attached reference]"
  - "Use similar colors to this [attached image]"
  - "Create mockup in the style of [attached example]"

• **Dual-Image Composition**: Some tools support multiple images as input
  - When a user attaches an image AND mentions it in their request, consider using it
  - Example: "mockup my design on this template [attached tshirt template]"

IMPORTANT:
- Attachments are OPTIONAL - not all requests will have them
- When present, the attached image will be available in the request data
- Use attachments when the user's message references them
- For mockups without attachments, use single-image generation with descriptive prompts
</attachment_capabilities>

<preview_result_workflow>
PREVIEW RESULTS AS INPUT FOR SEQUENTIAL OPERATIONS:

When a tool execution creates a preview result (shown in chat), it can be used as input for the next operation.

**TWO IMAGE CONTEXTS AVAILABLE**:
1. **Canvas Image**: The main image on the canvas (original or Applied result)
2. **Preview Result**: The most recent tool output shown in chat (not yet Applied)
${hasPreview ? `\n**CURRENT SESSION STATE**: A preview result exists (${previewDescription || 'tool output'})` : ''}

**CLARIFICATION PROTOCOL** (CRITICAL - MUST FOLLOW):

When a preview result exists AND user makes a new request:

1. **CLEAR PREVIEW REFERENCE** - Use preview directly:
   - "use the preview"
   - "use that result"
   - "use the mockup"
   - "now put that on..."
   - "take the preview and..."
   - "from that result..."

   Action: Use preview as input WITHOUT asking for clarification

2. **AMBIGUOUS REQUEST** - Ask for clarification:
   - "change the color to red"
   - "make it bigger"
   - "remove the background"
   - "upscale it"
   - Any operation that doesn't clearly specify which image

   Action: Ask explicitly: "Which image should I use? The preview result (mockup on white hoodie) or the original canvas image?"

3. **NO PREVIEW CONTEXT** - Use canvas image:
   - No preview exists in conversation
   - User hasn't mentioned preview

   Action: Use canvas image as input

**CLARIFICATION EXAMPLES**:

Example 1 - Ambiguous request:
User: "change the color to blue"
Preview: mockup on white hoodie from previous turn
Assistant: "I see you have a preview result (mockup on white hoodie). Which image should I use?
• The preview result (mockup)
• The original canvas image"

Example 2 - Clear reference:
User: "use the preview and put it on a black tshirt"
Preview: mockup on white hoodie
Assistant: "Perfect! I'll use the preview result (mockup on white hoodie) and create a new mockup on a black t-shirt."
[Proceeds with operation using preview]

Example 3 - No preview:
User: "change the color to blue"
Preview: None
Assistant: "I'll change the color to blue on your canvas image."
[Proceeds with operation using canvas image]

REMEMBER:
- ALWAYS ask for clarification when ambiguous and preview exists
- NEVER assume which image to use without clear reference
- Preview results enable powerful sequential workflows when used intentionally
</preview_result_workflow>

<multi_tool_orchestration>
CRITICAL: You MUST detect and execute ALL operations in a user's request.

When a request contains multiple operations (connected by "and", "then", "after", "followed by", etc.), you MUST:

1. **IDENTIFY ALL OPERATIONS**: Break down the request into individual tool calls
2. **PLAN THE SEQUENCE**: Determine the correct order of execution
3. **EXPLAIN YOUR PLAN**: Tell the user what you'll do BEFORE executing
4. **EXECUTE SEQUENTIALLY**: Make multiple tool_use calls in the correct order
5. **CHAIN OUTPUTS**: Use the output from one tool as input for the next

DETECTION PATTERNS:
• "remove background and mockup" → TWO tools: background_remover THEN generate_mockup
• "upscale then remove background" → TWO tools: upscaler THEN background_remover
• "change red to blue and remove background" → TWO tools: recolor_image THEN background_remover
• "remove background, upscale, and mockup on shirt" → THREE tools in sequence

EXECUTION TEMPLATE:
<thinking>
User request analysis:
- Operation 1: [tool_name] with [key parameters]
- Operation 2: [tool_name] with [key parameters]
- Operation 3: [tool_name] with [key parameters] (if applicable)
Execution order matters because: [reasoning]
</thinking>

User-facing response: "I'll help you with that! Here's what I'll do:
1. First, [describe operation 1]
2. Then, [describe operation 2]
3. Finally, [describe operation 3] (if applicable)

Let me start now..."

[Execute tool_use for operation 1]
[Execute tool_use for operation 2]
[Execute tool_use for operation 3 if needed]
</multi_tool_orchestration>

<tool_chaining_examples>
Example 1 - Background removal + Mockup:
User: "remove background and put on black tshirt"
Assistant: "Perfect! I'll help you with that in 2 steps:
1. First, I'll remove the background to make it print-ready
2. Then, I'll create a mockup on a black t-shirt

Starting now..."
[tool_use: background_remover]
[tool_use: generate_mockup with product="tshirt", color="black"]

Example 2 - Color change + Background removal:
User: "change the blue to red then remove background"
Assistant: "Got it! I'll do this in 2 steps:
1. First, I'll change the blue areas to red
2. Then, I'll remove the background for printing

Let me start..."
[tool_use: recolor_image with color mappings]
[tool_use: background_remover]

Example 3 - Triple operation:
User: "remove background, upscale 2x, and create a mockup on white mug"
Assistant: "I'll handle all three steps for you:
1. Remove the background for a clean design
2. Upscale 2x for better print quality
3. Create a mockup on a white mug

Starting the process..."
[tool_use: background_remover]
[tool_use: upscaler with scale=2]
[tool_use: generate_mockup with product="mug", color="white"]
</tool_chaining_examples>

<communication_style>
• Be conversational and friendly (like texting a knowledgeable friend)
• Use simple, clear language - avoid technical jargon
• Keep responses concise (2-3 sentences for simple queries)
• Always use inches for print sizes with context ("12 inches wide - perfect for a standard t-shirt!")
• For print readiness questions, always provide:
  1. Current printable size in inches
  2. Maximum quality size at 300 DPI
  3. Transparency status
  4. Clear recommendation
</communication_style>

<print_readiness_protocol>
CRITICAL: Check print quality BEFORE executing workflow

STANDARDS:
• Professional Print: 300 DPI minimum
• Acceptable Print: 150 DPI minimum
• Low DPI Warning: <150 DPI
• Apparel Standard: 12-14" wide at 300 DPI

WORKFLOW ORDER VALIDATION:
❌ WRONG: "remove background, then upscale"
   → Background removal can introduce artifacts that upscaling amplifies

✅ CORRECT: "upscale first, then remove background"
   → Higher quality source = cleaner background removal

DPI CALCULATIONS:
• Print width (inches) = Image width (px) / DPI
• Print height (inches) = Image height (px) / DPI
• Example: 2400px / 300 DPI = 8 inches

TRIGGERS FOR PRINT WARNINGS:
1. DPI < 300 → Warn about print quality
2. DPI < 150 → Critical warning (poor quality)
3. No transparency + print intent → Suggest background removal
4. Workflow order issues → Suggest optimization
5. 3+ operations → Show clarification with all steps

CLARIFICATION FORMAT:
When print concerns or complex workflows detected, respond with structured clarification format (see below).
</print_readiness_protocol>

<clarification_format>
WHEN TO SHOW CLARIFICATION:
1. Multiple operations (3+ steps)
2. Print DPI concerns (< 300 DPI)
3. Better workflow order exists
4. User asks to check print readiness

RESPONSE STRUCTURE:
{
  "needsClarification": true,
  "parsedSteps": [
    {
      "number": 1,
      "description": "Remove background for transparent printing",
      "toolName": "background_remover",
      "parameters": {...},
      "reasoning": "Required for garment printing"
    }
  ],
  "printWarnings": [
    {
      "severity": "warning",
      "message": "Current DPI is 72",
      "impact": "Can print at 8\" × 9.3\" at 300 DPI (professional quality)",
      "suggestedFix": "Upscale before removing background for best results"
    }
  ],
  "suggestedWorkflow": {
    "reason": "Upscaling before background removal produces cleaner edges",
    "steps": [
      {
        "number": 1,
        "description": "Upscale 2x for better print quality",
        "toolName": "upscaler",
        "parameters": { "scale": 2 }
      },
      {
        "number": 2,
        "description": "Remove background with high-quality source",
        "toolName": "background_remover",
        "parameters": {}
      }
    ],
    "benefits": [
      "Cleaner edge detection",
      "Professional 300 DPI quality",
      "Better for 12\" chest prints"
    ]
  },
  "options": [
    {
      "id": "execute-suggested",
      "label": "Use Optimized Workflow",
      "description": "Upscale first, then remove background"
    },
    {
      "id": "execute-original",
      "label": "Use Original Request",
      "description": "Remove background only"
    },
    {
      "id": "cancel",
      "label": "Cancel",
      "description": "Don't execute anything"
    }
  ]
}

SIMPLE REQUESTS (No clarification needed):
• Single operation with clear intent
• DPI already sufficient (≥300)
• No workflow optimization possible
• User said "yes", "use suggested", "go ahead"

Example: "Remove the background" → Execute immediately (no clarification)
Example: "Upscale to 4000px" → Execute immediately
Example: "Remove bg and put on black shirt" → Execute both steps (clear intent)

COMPLEX REQUESTS (Clarification needed):
• 3+ operations
• Low DPI + multiple steps
• Workflow order matters (upscale before bg removal)
• Print quality concerns

Example: "Remove background, upscale 2x, and create mockup on white hoodie"
→ Show clarification with optimized order: upscale → bg removal → mockup
</clarification_format>

<auto_undo_protocol>
When user indicates an error ("too much", "wrong", "not what I wanted", "only the [specific part]"):
- System automatically undoes to previous state
- Acknowledge the feedback naturally
- Adjust parameters based on feedback
- Re-execute with corrected parameters
- Don't mention the undo process

Example correction flow:
User: "knocked out too much color, just the orange inside"
You: "Got it! I'll be more precise and only target the orange inside. Using a tighter tolerance..."
[System auto-undoes, you provide corrected tool call]
</auto_undo_protocol>

<user_context>
Industry: ${userContext?.industry || 'general design'}
Expertise Level: ${userContext?.expertise || 'intermediate'}
</user_context>

<decision_framework>
When analyzing requests:
1. Parse for ALL action verbs and operations
2. Identify sequential dependencies
3. Plan optimal execution order
4. Consider intermediate states between tools
5. Validate each step maintains image quality
</decision_framework>

<print_readiness_protocol>
PRINT QUALITY VALIDATION RULES:

DPI REQUIREMENTS:
• High Quality Print: 300 DPI minimum (professional standard)
• Good Quality Print: 150-299 DPI (acceptable for most uses)
• Low Quality Warning: <150 DPI (will appear pixelated when printed)
• Screen Only: 72-96 DPI (not suitable for printing)

WORKFLOW OPTIMIZATION FOR PRINT:
1. ALWAYS upscale BEFORE background removal (preserves edge quality)
2. ALWAYS upscale BEFORE color operations (maintains color accuracy)
3. NEVER upscale after mockup generation (mockup is final preview only)

TRANSPARENCY CHECKS:
• DTG/Screen Printing: Requires transparent background
• Print Surface Color: Critical for color knockout decisions
  - White surface: Transparency works perfectly
  - Colored surface: May need color adjustment for visibility

AUTOMATIC PRINT CHECKS (run silently):
IF image.dpi < 150 AND user mentions "print":
  → Flag for clarification
IF operation order loses quality:
  → Suggest reordering
</print_readiness_protocol>

<clarification_protocol>
WHEN TO SHOW CLARIFICATION:

TRIGGER CONDITIONS (any of these):
1. Complex request with 3+ operations
2. Print-intended image with DPI < 150
3. Suboptimal workflow order detected
4. Missing critical print information
5. Print surface color needed for knockout decisions

CLARIFICATION GUIDELINES:
• Keep explanations brief (1-2 sentences max)
• Focus on "why" this helps print quality
• Always give user final say
• Suggest better workflows without being pushy

NEVER CLARIFY FOR:
• Simple single operations
• Images already at 300+ DPI
• Clear, unambiguous requests
• Non-print workflows
</clarification_protocol>

<best_practices_rules>
SMART SUGGESTION TRIGGERS:

1. LOW DPI DETECTION (<150 DPI):
   → "This image is {dpi} DPI. For quality printing, shall I upscale to 300 DPI first?"

2. BACKGROUND REMOVAL AFTER RESIZE:
   → "I'll upscale first, then remove background for cleaner edges."

3. COLOR KNOCKOUT WITHOUT SURFACE INFO:
   → "What color will this print on? (affects transparency handling)"

4. MOCKUP BEFORE EDITING:
   → "For best results, I'll complete edits before creating the mockup."

RESPONSE TONE:
• "Heads up: [issue]. I'll [solution]." (informative)
• "For best print quality, I'll [action]." (proactive)
• Never say "error" or "problem" - use "let me adjust" or "I'll optimize"
</best_practices_rules>

<mockup_tool_critical_requirements>
⚠️ CRITICAL MOCKUP TOOL PARAMETER REQUIREMENTS ⚠️

The generate_mockup tool REQUIRES explicit style parameter selection:

<decision_tree>
IF request contains ANY of these keywords/phrases:
- "model" (ANY mention: "model wearing", "on a model", "female model", "male model")
- "person" or "people"
- "wearing" or "worn"
- "lifestyle"
- "street style"
- "marketing photo"
- "fashion shot"

THEN you MUST include: style: "lifestyle-model"

ELSE (product-only keywords):
- "mockup on [product]" (without model/person/wearing)
- "show on [product]"
- "create mockup"
- "product mockup"
- No lifestyle keywords present

THEN include: style: "product-only" (or omit for default)
</decision_tree>

<function_call_examples>
USER: "mockup model wearing the hoodie"
CORRECT CALL:
{
  "toolName": "generate_mockup",
  "parameters": {
    "product": "hoodie",
    "color": "white",
    "style": "lifestyle-model"  ← REQUIRED
  }
}

USER: "female model wearing the design on a black tshirt"
CORRECT CALL:
{
  "toolName": "generate_mockup",
  "parameters": {
    "product": "tshirt",
    "color": "black",
    "style": "lifestyle-model"  ← REQUIRED
  }
}

USER: "mockup on white tshirt"
CORRECT CALL:
{
  "toolName": "generate_mockup",
  "parameters": {
    "product": "tshirt",
    "color": "white",
    "style": "product-only"  ← or omit
  }
}
</function_call_examples>

⚠️ VALIDATION RULE: Before EVERY generate_mockup call, CHECK:
Does request mention model/person/wearing/lifestyle?
→ YES: MUST include style: "lifestyle-model"
→ NO: Use style: "product-only" or omit

FAILURE TO INCLUDE style: "lifestyle-model" WHEN NEEDED = WRONG OUTPUT
</mockup_tool_critical_requirements>

<pre_mockup_validation>
Before calling generate_mockup, explicitly state in your thinking:
"Mockup style check: User said '[quote user phrase]' which contains [model/wearing/lifestyle OR none of these keywords], so I'll use style='[lifestyle-model OR product-only]'"
</pre_mockup_validation>

<output_format>
Structure your responses as:
1. Acknowledgment of the full request
2. Clear execution plan (if multi-step)
3. Progress updates between tools
4. Final summary of what was accomplished
</output_format>

REMEMBER:
- ALWAYS detect multiple operations in compound requests
- ALWAYS explain multi-step plans before executing
- ALWAYS execute ALL requested operations in sequence
- NEVER stop after just the first tool when multiple are needed
- ALWAYS use style: "lifestyle-model" when user asks for model/person/lifestyle shots

MOCKUP STYLE FINAL CHECK:
⚠️ BEFORE ANY generate_mockup call, SCAN for these words:
• "model" → MUST use style: "lifestyle-model"
• "person" → MUST use style: "lifestyle-model"
• "wearing"/"worn" → MUST use style: "lifestyle-model"
• "lifestyle" → MUST use style: "lifestyle-model"
If ANY of these words appear, style: "lifestyle-model" is MANDATORY.
This is a HARD REQUIREMENT - no exceptions.`;
}

// ===== TOOL CONVERSION =====

/**
 * Convert tool definitions to Claude function calling format.
 *
 * @param tools - Tool definitions from ai-tools-orchestrator
 * @returns Claude-formatted tool array
 */
function convertToolsToClaudeFormat(tools: any[]): any[] {
  return tools.map((tool) => ({
    name: tool.name,
    description: tool.description,
    input_schema: tool.parameters,
  }));
}

// ===== RESPONSE PARSING =====

/**
 * Extract text response and function calls from Claude response.
 *
 * @param response - Claude API response
 * @returns Parsed text and function calls
 */
function extractResponseContent(response: any): {
  textResponse: string;
  functionCalls: Array<{ toolName: string; parameters: any }>;
} {
  let textResponse = '';
  const functionCalls: Array<{ toolName: string; parameters: any }> = [];

  // Parse content blocks
  for (const block of response.content) {
    if (block.type === 'text') {
      textResponse += block.text;
    } else if (block.type === 'tool_use') {
      functionCalls.push({
        toolName: block.name,
        parameters: block.input,
      });
    }
  }

  return { textResponse, functionCalls };
}

// ===== TOOL EXECUTION =====

/**
 * Execute a tool safely with error handling.
 *
 * Routes to appropriate tool implementation based on tool name.
 *
 * @param toolName - Name of tool to execute
 * @param parameters - Tool parameters
 * @param imageUrl - Image URL for processing
 * @returns URL to result image
 */
async function executeToolSafely(
  toolName: string,
  parameters: any,
  imageUrl: string
): Promise<string> {
  switch (toolName) {
    case 'color_knockout': {
      const blob = await performColorKnockout({
        imageUrl,
        selectedColors: parameters.colors.map((c: any) => ({
          r: c.r,
          g: c.g,
          b: c.b,
          hex: c.hex,
        })),
        settings: {
          tolerance: parameters.tolerance || 30,
          replaceMode: parameters.replaceMode || 'transparency',
          feather: parameters.feather || 0,
          antiAliasing: parameters.antiAliasing !== false,
          edgeSmoothing: 0.5,
        },
        onProgress: (progress, msg) => {
          console.log(`[Tool:color_knockout] ${progress}% - ${msg}`);
        },
      });

      return URL.createObjectURL(blob);
    }

    case 'recolor_image': {
      // First extract palette
      const palette = await extractColors(
        imageUrl,
        {
          paletteSize: 9,
          algorithm: 'smart',
          includeRareColors: false,
          quality: 80,
        },
        (progress, msg) => {
          console.log(`[Tool:recolor_image:extract] ${progress}% - ${msg}`);
        }
      );

      // Create color mappings
      const mappings = new Map<number, string>();
      parameters.colorMappings.forEach((mapping: any) => {
        mappings.set(mapping.originalIndex, mapping.newColor);
      });

      const blob = await recolorImage(
        imageUrl,
        palette,
        {
          colorMappings: mappings,
          blendMode: (parameters.blendMode || 'replace') as RecolorBlendMode,
          tolerance: parameters.tolerance || 30,
          preserveTransparency: true,
        },
        (progress, msg) => {
          console.log(`[Tool:recolor_image] ${progress}% - ${msg}`);
        }
      );

      return URL.createObjectURL(blob);
    }

    case 'texture_cut': {
      // Create texture based on type
      let textureUrl: string;

      if (parameters.textureType === 'custom') {
        throw new Error('Custom textures require user upload - use built-in patterns instead');
      }

      textureUrl = createPatternTexture(parameters.textureType, 200, 200, '#000000', 10);

      const blob = await textureCut({
        baseImageUrl: imageUrl,
        textureUrl,
        cutSettings: {
          amount: parameters.amount || 0.5,
          featherPx: 0,
          invert: parameters.invert || false,
        },
        transformSettings: {
          scale: parameters.scale || 1,
          rotation: parameters.rotation || 0,
          tile: parameters.tile || false,
        },
        onProgress: (progress, msg) => {
          console.log(`[Tool:texture_cut] ${progress}% - ${msg}`);
        },
      });

      return URL.createObjectURL(blob);
    }

    case 'background_remover': {
      const blob = await removeBackground(
        imageUrl,
        {
          model: parameters.model || 'general',
        },
        (progress, msg) => {
          console.log(`[Tool:background_remover] ${progress}% - ${msg}`);
        }
      );

      return URL.createObjectURL(blob);
    }

    case 'upscaler': {
      const blob = await upscaleImage(
        imageUrl,
        {
          scale: parameters.scale || 2,
          algorithm: parameters.algorithm || 'lanczos',
        },
        (progress, msg) => {
          console.log(`[Tool:upscaler] ${progress}% - ${msg}`);
        }
      );

      return URL.createObjectURL(blob);
    }

    case 'extract_color_palette': {
      const palette = await extractColors(
        imageUrl,
        {
          paletteSize: parameters.paletteSize || 9,
          algorithm: parameters.algorithm || 'smart',
          includeRareColors: false,
          quality: 80,
        },
        (progress, msg) => {
          console.log(`[Tool:extract_color_palette] ${progress}% - ${msg}`);
        }
      );

      // Return palette as JSON data URL
      const paletteJson = JSON.stringify({
        colors: palette.map((c) => ({
          hex: c.hex,
          rgb: c.rgb,
          name: c.name,
          percentage: c.percentage,
        })),
      });

      return `data:application/json;base64,${btoa(paletteJson)}`;
    }

    case 'pick_color_at_position': {
      const color = await pickColorFromImage(imageUrl, parameters.x, parameters.y);

      // Return color as JSON data URL
      const colorJson = JSON.stringify({
        color: {
          hex: color.hex,
          r: color.r,
          g: color.g,
          b: color.b,
        },
        position: { x: parameters.x, y: parameters.y },
      });

      return `data:application/json;base64,${btoa(colorJson)}`;
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
}

// ===== CONFIDENCE CALCULATION =====

/**
 * Calculate overall confidence from multiple confidence scores.
 *
 * Uses minimum of all scores to ensure conservative confidence reporting.
 *
 * @param scores - Array of confidence scores 0-100
 * @returns Overall confidence 0-100
 */
function calculateOverallConfidence(scores: number[]): number {
  if (scores.length === 0) return 0;

  // Use minimum to be conservative
  const minScore = Math.min(...scores);

  // Apply slight penalty for multiple operations (complexity)
  const complexityPenalty = scores.length > 2 ? 5 : 0;

  return Math.max(0, Math.min(100, minScore - complexityPenalty));
}

// ===== PUBLIC API =====

/**
 * Get conversation context by ID.
 *
 * @param conversationId - Conversation identifier
 * @returns Conversation context or null
 */
export async function getConversation(conversationId: string) {
  return await getConversationContext(conversationId);
}

/**
 * Check if orchestrator is ready (API key configured).
 *
 * @returns True if ready, false otherwise
 */
export function isOrchestratorReady(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Detect if clarification is needed based on complexity and print concerns
 */
function detectClarificationNeed(
  functionCalls: Array<{ toolName: string; parameters: any }>,
  imageAnalysis: ImageAnalysis,
  userMessage: string
): { needsClarification: boolean; reason: string } {
  // Simple single-step operations don't need clarification
  if (functionCalls.length === 1) {
    return { needsClarification: false, reason: 'Single operation' };
  }

  // 3+ operations always show clarification
  if (functionCalls.length >= 3) {
    return {
      needsClarification: true,
      reason: 'Complex multi-step workflow (3+ operations)',
    };
  }

  // Check print readiness concerns
  const effectiveDPI = imageAnalysis.dpi || 72;
  const hasPrintConcern = effectiveDPI < 300;

  // Low DPI + multiple operations = clarify
  if (hasPrintConcern && functionCalls.length > 1) {
    return {
      needsClarification: true,
      reason: 'Low DPI with multiple operations',
    };
  }

  // Check for workflow order optimization
  const hasUpscale = functionCalls.some((c) => c.toolName === 'upscaler');
  const hasBgRemoval = functionCalls.some(
    (c) => c.toolName === 'background_remover'
  );

  if (hasUpscale && hasBgRemoval) {
    // Check order: upscale should come before bg removal
    const upscaleIndex = functionCalls.findIndex((c) => c.toolName === 'upscaler');
    const bgIndex = functionCalls.findIndex(
      (c) => c.toolName === 'background_remover'
    );

    if (bgIndex < upscaleIndex) {
      return {
        needsClarification: true,
        reason: 'Workflow order optimization available',
      };
    }
  }

  // Check if user explicitly asks to check print readiness
  const printReadinessQuery = /print.?ready|print.?quality|ready.?for.?print|check.?print/i.test(
    userMessage
  );

  if (printReadinessQuery) {
    return {
      needsClarification: true,
      reason: 'User requested print readiness check',
    };
  }

  return { needsClarification: false, reason: 'No clarification needed' };
}

/**
 * Generate print warnings based on image analysis
 */
function generatePrintWarnings(
  imageAnalysis: ImageAnalysis
): PrintWarning[] {
  const warnings: PrintWarning[] = [];
  const effectiveDPI = imageAnalysis.dpi || 72;

  // DPI warnings
  if (effectiveDPI < 150) {
    warnings.push({
      severity: 'critical',
      message: `Current DPI is ${effectiveDPI}`,
      impact: 'Poor print quality - images will appear pixelated',
      suggestedFix: 'Upscale image 2-4x for professional print quality',
    });
  } else if (effectiveDPI < 300) {
    const printWidth = (imageAnalysis.width / 300).toFixed(1);
    const printHeight = (imageAnalysis.height / 300).toFixed(1);

    warnings.push({
      severity: 'warning',
      message: `Current DPI is ${effectiveDPI}`,
      impact: `Can print at ${printWidth}" × ${printHeight}" at 300 DPI (professional quality)`,
      suggestedFix: 'Upscale for larger print sizes',
    });
  }

  // Transparency warnings
  if (!imageAnalysis.hasTransparency) {
    warnings.push({
      severity: 'info',
      message: 'Design has solid background',
      impact: 'Background will print as white on garments',
      suggestedFix: 'Remove background for transparent printing',
    });
  }

  return warnings;
}

/**
 * Generate optimized workflow suggestion
 */
function generateWorkflowSuggestion(
  originalCalls: Array<{ toolName: string; parameters: any }>,
  imageAnalysis: ImageAnalysis
): SuggestedWorkflow | undefined {
  const hasUpscale = originalCalls.some((c) => c.toolName === 'upscaler');
  const hasBgRemoval = originalCalls.some(
    (c) => c.toolName === 'background_remover'
  );
  const effectiveDPI = imageAnalysis.dpi || 72;

  // Optimization: Upscale before background removal
  if (hasBgRemoval && effectiveDPI < 300) {
    const upscaleIndex = originalCalls.findIndex((c) => c.toolName === 'upscaler');
    const bgIndex = originalCalls.findIndex(
      (c) => c.toolName === 'background_remover'
    );

    // If bg removal comes before upscale, or no upscale exists
    if (!hasUpscale || bgIndex < upscaleIndex) {
      const optimizedSteps: ClarificationStep[] = [];
      let stepNumber = 1;

      // Add upscale first
      optimizedSteps.push({
        number: stepNumber++,
        description: 'Upscale image for better quality',
        toolName: 'upscaler',
        parameters: { scale: 2, algorithm: 'lanczos' },
        reasoning: 'Higher resolution = cleaner background removal',
      });

      // Add background removal
      optimizedSteps.push({
        number: stepNumber++,
        description: 'Remove background with high-quality source',
        toolName: 'background_remover',
        parameters: {},
        reasoning: 'Better edge detection on upscaled image',
      });

      // Add other operations
      for (const call of originalCalls) {
        if (call.toolName !== 'upscaler' && call.toolName !== 'background_remover') {
          optimizedSteps.push({
            number: stepNumber++,
            description: `Apply ${call.toolName}`,
            toolName: call.toolName,
            parameters: call.parameters,
          });
        }
      }

      return {
        reason: 'Upscaling before background removal produces cleaner edges',
        steps: optimizedSteps,
        benefits: [
          'Cleaner edge detection on higher resolution',
          'Professional 300 DPI print quality',
          'Better results for apparel printing',
        ],
      };
    }
  }

  return undefined;
}

/**
 * Parse function calls into clarification steps
 */
function parseFunctionCallsToSteps(
  functionCalls: Array<{ toolName: string; parameters: any }>
): ClarificationStep[] {
  return functionCalls.map((call, index) => ({
    number: index + 1,
    description: getToolDescription(call.toolName, call.parameters),
    toolName: call.toolName,
    parameters: call.parameters,
  }));
}

/**
 * Get user-friendly tool description
 */
function getToolDescription(toolName: string, parameters: any): string {
  switch (toolName) {
    case 'background_remover':
      return 'Remove background for transparent printing';
    case 'upscaler':
      return `Upscale image ${parameters.scale || 2}x for better quality`;
    case 'color_knockout':
      return 'Remove selected colors';
    case 'recolor_image':
      return 'Change image colors';
    case 'generate_mockup':
      return `Create mockup on ${parameters.color || 'white'} ${parameters.product || 'tshirt'}`;
    case 'auto_crop':
      return 'Auto-detect and crop image';
    default:
      return `Apply ${toolName}`;
  }
}

/**
 * Get Claude tool calls WITHOUT executing them (for client-side execution).
 *
 * This function:
 * 1. Analyzes the image for ground truth
 * 2. Calls Claude Vision API with function calling
 * 3. Returns tool calls WITHOUT executing them
 *
 * @param request - Orchestrator request with message and image
 * @returns Tool calls and analysis for client-side execution
 */
export async function getClaudeToolCalls(
  request: OrchestratorRequest
): Promise<{
  textResponse: string;
  functionCalls: Array<{ toolName: string; parameters: any }>;
  imageAnalysis: ImageAnalysis | undefined;
  clarification?: ClarificationData;
}> {
  try {
    console.log('[Orchestrator] Getting tool calls for:', request.message);

    // ===== STEP 1: Server-side image analysis (October 2025 stack) =====
    console.log('[Orchestrator] Step 1: Analyzing image server-side (sharp + @napi-rs/canvas)...');

    let imageAnalysis: ImageAnalysis;

    try {
      // Try modern server-side analysis
      const { analyzeImageServerSide } = await import('./server-image-analyzer');

      imageAnalysis = await analyzeImageServerSide(request.imageUrl, (progress, msg) => {
        console.log(`[Orchestrator] Server Analysis: ${progress}% - ${msg}`);
      });

      console.log('[Orchestrator] Server-side analysis complete:', {
        dimensions: `${imageAnalysis.width}x${imageAnalysis.height}`,
        transparency: imageAnalysis.hasTransparency,
        dpi: imageAnalysis.dpi || 72,
        colors: imageAnalysis.dominantColors.length,
        confidence: imageAnalysis.confidence,
      });
    } catch (error) {
      // Fallback: Skip analysis if server-side fails
      console.warn('[Orchestrator] Server-side analysis unavailable, using Claude Vision only:', error);

      imageAnalysis = {
        width: 0,
        height: 0,
        aspectRatio: 'unknown',
        dpi: null,
        fileSize: 0,
        format: 'unknown',
        hasTransparency: false,
        dominantColors: [],
        colorDepth: 24,
        uniqueColorCount: 0,
        isBlurry: false,
        sharpnessScore: 0,
        noiseLevel: 0,
        isPrintReady: false,
        printableAtSize: { width: 0, height: 0 },
        analyzedAt: Date.now(),
        confidence: 0,
      };
    }

    // ===== STEP 2: Preprocess message for mockup style detection =====
    console.log('[Orchestrator] Step 2: Preprocessing message for lifestyle keywords...');

    const lifestyleKeywords = [
      'model', 'models',
      'person', 'people',
      'wearing', 'worn', 'wear',
      'lifestyle', 'lifestyle photo', 'lifestyle shot',
      'street style', 'street wear',
      'fashion', 'fashion photo', 'fashion shot',
      'marketing photo', 'marketing shot',
      'campaign', 'photoshoot',
    ];

    const messageLower = request.message.toLowerCase();
    const hasLifestyleKeyword = lifestyleKeywords.some(keyword =>
      messageLower.includes(keyword)
    );

    // If lifestyle keywords detected, add explicit instruction to guide Claude
    let processedMessage = request.message;
    if (hasLifestyleKeyword) {
      console.log('[Orchestrator] ⚠️ LIFESTYLE KEYWORDS DETECTED - Adding explicit style instruction');
      processedMessage = `${request.message}\n\n[SYSTEM INSTRUCTION: User request contains lifestyle/model keywords. For any generate_mockup calls, you MUST use style="lifestyle-model" parameter.]`;
    } else {
      console.log('[Orchestrator] No lifestyle keywords detected - using product-only mode');
    }

    // ===== STEP 3: Call Claude Vision API with function calling =====
    console.log('[Orchestrator] Step 3: Calling Claude Vision API...');

    const systemPrompt = buildSystemPrompt(
      imageAnalysis,
      request.userContext,
      !!request.previewResultUrl,
      request.previewResultUrl ? 'preview result' : undefined,
      request.editingHistory
    );
    const claudeTools = convertToolsToClaudeFormat(toolDefinitions);

    const claudeResponse = await callClaudeVisionAPI({
      message: processedMessage, // Use preprocessed message
      imageUrl: request.imageUrl,
      previewResultUrl: request.previewResultUrl,
      attachedImageUrl: request.attachedImageUrl,
      conversationHistory: request.conversationHistory,
      systemPrompt,
      tools: claudeTools,
    });

    console.log('[Orchestrator] Claude response received');

    // Extract text response and function calls
    const { textResponse, functionCalls } = extractResponseContent(claudeResponse);

    console.log('[Orchestrator] Found:', {
      textLength: textResponse.length,
      functionCalls: functionCalls.length,
    });

    // ===== STEP 4: Override style parameter if lifestyle keywords detected =====
    // Claude sometimes ignores instructions, so we enforce the parameter override
    if (hasLifestyleKeyword) {
      console.log('[Orchestrator] Applying post-processing override for lifestyle mockups...');

      functionCalls.forEach((call, index) => {
        if (call.toolName === 'generate_mockup') {
          const originalStyle = call.parameters?.style;
          call.parameters.style = 'lifestyle-model';

          console.log(`[Orchestrator] ✓ Overrode mockup #${index + 1} style: "${originalStyle}" → "lifestyle-model"`);
        }
      });
    }

    // ===== STEP 5: Detect if clarification is needed =====
    console.log('[Orchestrator] Checking if clarification is needed...');

    const clarificationCheck = detectClarificationNeed(
      functionCalls,
      imageAnalysis,
      request.message
    );

    console.log('[Orchestrator] Clarification check:', clarificationCheck);

    let clarification: ClarificationData | undefined;

    if (clarificationCheck.needsClarification) {
      console.log('[Orchestrator] Building clarification data...');

      // Parse original steps
      const parsedSteps = parseFunctionCallsToSteps(functionCalls);

      // Generate print warnings
      const printWarnings = generatePrintWarnings(imageAnalysis);

      // Generate workflow suggestion (if optimization available)
      const suggestedWorkflow = generateWorkflowSuggestion(
        functionCalls,
        imageAnalysis
      );

      // Build options
      const options: ClarificationOption[] = [];

      if (suggestedWorkflow) {
        options.push({
          id: 'execute-suggested',
          label: 'Use Optimized Workflow',
          description: suggestedWorkflow.reason,
        });
      }

      options.push(
        {
          id: 'execute-original',
          label: suggestedWorkflow ? 'Use Original Request' : 'Continue',
          description: suggestedWorkflow
            ? 'Execute steps in the order you requested'
            : 'Execute the planned workflow',
        },
        {
          id: 'cancel',
          label: 'Cancel',
          description: "Don't execute anything",
        }
      );

      clarification = {
        needsClarification: true,
        parsedSteps,
        printWarnings,
        suggestedWorkflow,
        options,
      };

      console.log('[Orchestrator] Clarification data built:', {
        steps: parsedSteps.length,
        warnings: printWarnings.length,
        hasSuggestion: !!suggestedWorkflow,
      });
    }

    // Return tool calls WITHOUT executing them (with optional clarification)
    return {
      textResponse,
      functionCalls,
      imageAnalysis,
      clarification,
    };
  } catch (error) {
    console.error('[Orchestrator] Failed to get tool calls:', error);

    // Return empty response on error
    return {
      textResponse: 'I encountered an error analyzing your request. Please try again.',
      functionCalls: [],
      imageAnalysis: undefined,
    };
  }
}
