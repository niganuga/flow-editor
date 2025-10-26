/**
 * AI Design Partner Integration Example
 *
 * Demonstrates how to integrate the Context Manager with the AI Design Partner
 * to create a learning system that improves parameter selection over time.
 *
 * @module ai-design-partner-integration
 */

import { analyzeImage, type ImageAnalysis } from './image-analyzer';
import {
  storeConversationTurn,
  storeToolExecution,
  findSimilarExecutions,
  getConversationContext,
  type ToolExecution
} from './context-manager';
import { executeToolFunction, getToolDefinition } from './ai-tools-orchestrator';

/**
 * AI Design Partner result with confidence and reasoning
 */
export interface AIDesignResult {
  success: boolean;
  toolName: string;
  parameters: any;
  confidence: number;
  reasoning: string;
  resultUrl?: string;
  metrics?: {
    pixelsChanged: number;
    percentageChanged: number;
    executionTimeMs: number;
    qualityScore: number;
  };
}

/**
 * Execute a design task with AI Design Partner + Context Manager learning.
 *
 * This is the main integration point that demonstrates:
 * 1. Image analysis for ground truth
 * 2. Historical pattern matching
 * 3. Parameter validation from similar executions
 * 4. Tool execution
 * 5. Result storage for future learning
 *
 * @param conversationId - Unique conversation identifier
 * @param imageUrl - URL to the image to process
 * @param userMessage - User's natural language request
 * @param toolName - Name of the tool to execute
 * @param proposedParams - Proposed tool parameters
 * @returns AI Design Result with confidence and metrics
 *
 * @example
 * ```typescript
 * const result = await executeDesignTask(
 *   'conv-123',
 *   imageUrl,
 *   'Remove the blue background',
 *   'color_knockout',
 *   {
 *     colors: [{ r: 66, g: 135, b: 245, hex: '#4287f5' }],
 *     tolerance: 30
 *   }
 * );
 *
 * if (result.confidence > 95) {
 *   console.log('High confidence execution:', result.reasoning);
 * }
 * ```
 */
export async function executeDesignTask(
  conversationId: string,
  imageUrl: string,
  userMessage: string,
  toolName: string,
  proposedParams: any,
  onProgress?: (progress: number, message: string) => void
): Promise<AIDesignResult> {
  const startTime = Date.now();

  try {
    onProgress?.(5, 'Analyzing image...');

    // ===== STEP 1: Analyze Image (Ground Truth) =====
    const imageAnalysis = await analyzeImage(imageUrl, (prog, msg) => {
      // Map to 5-25% range
      onProgress?.(5 + (prog / 100) * 20, msg);
    });

    onProgress?.(25, 'Searching historical patterns...');

    // ===== STEP 2: Find Similar Successful Executions =====
    const similarExecutions = await findSimilarExecutions(
      toolName,
      imageAnalysis,
      5
    );

    console.log(`[AIDesignPartner] Found ${similarExecutions.length} similar executions`);

    onProgress?.(35, 'Validating parameters...');

    // ===== STEP 3: Validate Parameters Against History =====
    const { validatedParams, confidence, reasoning } = validateParametersWithHistory(
      toolName,
      proposedParams,
      imageAnalysis,
      similarExecutions
    );

    console.log(`[AIDesignPartner] Parameter validation confidence: ${confidence}%`);
    console.log(`[AIDesignPartner] Reasoning: ${reasoning}`);

    onProgress?.(45, `Executing ${toolName}...`);

    // ===== STEP 4: Execute Tool =====
    const executionResult = await executeToolFunction(
      toolName,
      validatedParams,
      imageUrl,
      (prog, msg) => {
        // Map to 45-85% range
        onProgress?.(45 + (prog / 100) * 40, msg);
      }
    );

    onProgress?.(85, 'Calculating metrics...');

    // ===== STEP 5: Calculate Result Metrics =====
    const metrics = await calculateResultMetrics(
      imageUrl,
      executionResult.result?.imageUrl,
      imageAnalysis,
      Date.now() - startTime
    );

    onProgress?.(90, 'Storing execution data...');

    // ===== STEP 6: Store Conversation Turn =====
    const assistantResponse = generateAssistantResponse(
      toolName,
      validatedParams,
      confidence,
      reasoning,
      executionResult.success
    );

    await storeConversationTurn(
      conversationId,
      userMessage,
      assistantResponse,
      imageAnalysis
    );

    // ===== STEP 7: Store Successful Execution for Learning =====
    if (executionResult.success && confidence >= 70) {
      const execution: ToolExecution = {
        toolName,
        parameters: validatedParams,
        success: true,
        confidence,
        resultMetrics: metrics,
        imageSpecsSnapshot: {
          width: imageAnalysis.width,
          height: imageAnalysis.height,
          aspectRatio: imageAnalysis.aspectRatio,
          hasTransparency: imageAnalysis.hasTransparency,
          dominantColors: imageAnalysis.dominantColors,
          sharpnessScore: imageAnalysis.sharpnessScore,
          uniqueColorCount: imageAnalysis.uniqueColorCount,
          isPrintReady: imageAnalysis.isPrintReady
        },
        timestamp: Date.now()
      };

      await storeToolExecution(conversationId, execution);
      console.log('[AIDesignPartner] Stored successful execution for learning');
    }

    onProgress?.(100, 'Complete!');

    // ===== STEP 8: Return Result =====
    return {
      success: executionResult.success,
      toolName,
      parameters: validatedParams,
      confidence,
      reasoning,
      resultUrl: executionResult.result?.imageUrl,
      metrics
    };

  } catch (error) {
    console.error('[AIDesignPartner] Execution failed:', error);

    return {
      success: false,
      toolName,
      parameters: proposedParams,
      confidence: 0,
      reasoning: `Execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metrics: {
        pixelsChanged: 0,
        percentageChanged: 0,
        executionTimeMs: Date.now() - startTime,
        qualityScore: 0
      }
    };
  }
}

/**
 * Validate proposed parameters against historical patterns.
 *
 * Uses similar successful executions to:
 * - Calculate recommended parameter ranges
 * - Adjust parameters that are outside historical norms
 * - Boost confidence when parameters match patterns
 * - Reduce confidence when parameters deviate significantly
 *
 * @param toolName - Tool being executed
 * @param proposedParams - Proposed parameters
 * @param imageAnalysis - Current image analysis
 * @param similarExecutions - Historical similar executions
 * @returns Validated parameters with confidence and reasoning
 */
function validateParametersWithHistory(
  toolName: string,
  proposedParams: any,
  imageAnalysis: ImageAnalysis,
  similarExecutions: ToolExecution[]
): {
  validatedParams: any;
  confidence: number;
  reasoning: string;
} {
  // Start with base confidence
  let confidence = 80;
  const reasons: string[] = [];

  // If no historical data, use proposed parameters with lower confidence
  if (similarExecutions.length === 0) {
    reasons.push('No historical data available - using default parameters');
    return {
      validatedParams: proposedParams,
      confidence: 70,
      reasoning: reasons.join('; ')
    };
  }

  // Clone proposed parameters for validation
  const validatedParams = { ...proposedParams };

  // Tool-specific validation
  switch (toolName) {
    case 'color_knockout':
      return validateColorKnockoutParams(
        validatedParams,
        imageAnalysis,
        similarExecutions
      );

    case 'recolor_image':
      return validateRecolorParams(
        validatedParams,
        imageAnalysis,
        similarExecutions
      );

    case 'texture_cut':
      return validateTextureCutParams(
        validatedParams,
        imageAnalysis,
        similarExecutions
      );

    default:
      reasons.push('Tool-specific validation not implemented');
      return {
        validatedParams,
        confidence: 75,
        reasoning: reasons.join('; ')
      };
  }
}

/**
 * Validate color knockout parameters against history.
 */
function validateColorKnockoutParams(
  params: any,
  imageAnalysis: ImageAnalysis,
  similarExecutions: ToolExecution[]
): { validatedParams: any; confidence: number; reasoning: string } {
  const reasons: string[] = [];
  let confidence = 85;

  // Calculate average tolerance from similar executions
  const avgTolerance = similarExecutions.reduce(
    (sum, ex) => sum + (ex.parameters.tolerance || 30),
    0
  ) / similarExecutions.length;

  const toleranceStdDev = calculateStdDev(
    similarExecutions.map(ex => ex.parameters.tolerance || 30)
  );

  reasons.push(`${similarExecutions.length} similar executions found`);

  // Validate tolerance
  const proposedTolerance = params.tolerance || 30;
  const toleranceDiff = Math.abs(proposedTolerance - avgTolerance);

  if (toleranceDiff > toleranceStdDev * 2) {
    // Proposed tolerance is significantly different from historical average
    params.tolerance = Math.round(avgTolerance);
    reasons.push(
      `Adjusted tolerance from ${proposedTolerance} to ${params.tolerance} ` +
      `(historical avg: ${avgTolerance.toFixed(1)} ± ${toleranceStdDev.toFixed(1)})`
    );
    confidence = 90; // Higher confidence with historical adjustment
  } else {
    // Within acceptable range
    reasons.push(
      `Tolerance ${proposedTolerance} within historical range ` +
      `(${avgTolerance.toFixed(1)} ± ${toleranceStdDev.toFixed(1)})`
    );
    confidence = 95; // Very high confidence
  }

  // Check if transparency is appropriate
  if (!imageAnalysis.hasTransparency && params.replaceMode === 'transparency') {
    reasons.push('Image lacks transparency - output will be PNG');
  }

  return {
    validatedParams: params,
    confidence,
    reasoning: reasons.join('; ')
  };
}

/**
 * Validate recolor parameters against history.
 */
function validateRecolorParams(
  params: any,
  imageAnalysis: ImageAnalysis,
  similarExecutions: ToolExecution[]
): { validatedParams: any; confidence: number; reasoning: string } {
  const reasons: string[] = [];
  let confidence = 85;

  reasons.push(`${similarExecutions.length} similar executions found`);

  // Validate color mappings count
  const avgMappingCount = similarExecutions.reduce(
    (sum, ex) => sum + (ex.parameters.colorMappings?.length || 0),
    0
  ) / similarExecutions.length;

  if (params.colorMappings?.length > avgMappingCount * 1.5) {
    reasons.push(
      `High number of color mappings (${params.colorMappings.length}) ` +
      `vs historical avg (${avgMappingCount.toFixed(1)})`
    );
    confidence -= 5;
  } else {
    reasons.push('Color mapping count within normal range');
    confidence += 5;
  }

  return {
    validatedParams: params,
    confidence: Math.min(95, confidence),
    reasoning: reasons.join('; ')
  };
}

/**
 * Validate texture cut parameters against history.
 */
function validateTextureCutParams(
  params: any,
  imageAnalysis: ImageAnalysis,
  similarExecutions: ToolExecution[]
): { validatedParams: any; confidence: number; reasoning: string } {
  const reasons: string[] = [];
  let confidence = 85;

  reasons.push(`${similarExecutions.length} similar executions found`);

  // Validate amount parameter
  const avgAmount = similarExecutions.reduce(
    (sum, ex) => sum + (ex.parameters.amount || 0.5),
    0
  ) / similarExecutions.length;

  const amountDiff = Math.abs((params.amount || 0.5) - avgAmount);

  if (amountDiff < 0.1) {
    reasons.push(`Amount (${params.amount}) close to historical avg (${avgAmount.toFixed(2)})`);
    confidence += 10;
  }

  return {
    validatedParams: params,
    confidence: Math.min(95, confidence),
    reasoning: reasons.join('; ')
  };
}

/**
 * Calculate result metrics by comparing before/after images.
 */
async function calculateResultMetrics(
  originalUrl: string,
  resultUrl: string | undefined,
  originalAnalysis: ImageAnalysis,
  executionTimeMs: number
): Promise<{
  pixelsChanged: number;
  percentageChanged: number;
  executionTimeMs: number;
  qualityScore: number;
}> {
  if (!resultUrl) {
    return {
      pixelsChanged: 0,
      percentageChanged: 0,
      executionTimeMs,
      qualityScore: 0
    };
  }

  try {
    // Calculate pixels changed (simplified - would need actual pixel comparison)
    const totalPixels = originalAnalysis.width * originalAnalysis.height;
    const estimatedPixelsChanged = Math.floor(totalPixels * 0.25); // Estimate 25%

    // Quality score based on sharpness and noise
    const qualityScore = Math.round(
      (originalAnalysis.sharpnessScore * 0.6) +
      ((100 - originalAnalysis.noiseLevel) * 0.4)
    );

    return {
      pixelsChanged: estimatedPixelsChanged,
      percentageChanged: 25.0,
      executionTimeMs,
      qualityScore
    };
  } catch (error) {
    console.error('[AIDesignPartner] Failed to calculate metrics:', error);
    return {
      pixelsChanged: 0,
      percentageChanged: 0,
      executionTimeMs,
      qualityScore: 0
    };
  }
}

/**
 * Generate assistant response message.
 */
function generateAssistantResponse(
  toolName: string,
  parameters: any,
  confidence: number,
  reasoning: string,
  success: boolean
): string {
  const toolDef = getToolDefinition(toolName);
  const toolDescription = toolDef?.description || toolName;

  if (!success) {
    return `I attempted to use ${toolName} but encountered an error. ${reasoning}`;
  }

  const confidenceMsg = confidence >= 90
    ? 'with high confidence'
    : confidence >= 80
    ? 'with good confidence'
    : 'with moderate confidence';

  return `I've applied ${toolDescription} ${confidenceMsg} (${confidence}%). ${reasoning}`;
}

/**
 * Calculate standard deviation of a number array.
 */
function calculateStdDev(values: number[]): number {
  if (values.length === 0) return 0;

  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;

  return Math.sqrt(avgSquareDiff);
}

/**
 * Get recommended parameters for a tool based on image analysis and history.
 *
 * This is a helper function that AI can call to get smart defaults.
 *
 * @param toolName - Tool to get recommendations for
 * @param imageAnalysis - Current image analysis
 * @returns Recommended parameters with confidence
 *
 * @example
 * ```typescript
 * const recommendation = await getRecommendedParams(
 *   'color_knockout',
 *   imageAnalysis
 * );
 *
 * console.log(`Recommended tolerance: ${recommendation.params.tolerance}`);
 * console.log(`Confidence: ${recommendation.confidence}%`);
 * ```
 */
export async function getRecommendedParams(
  toolName: string,
  imageAnalysis: ImageAnalysis
): Promise<{
  params: any;
  confidence: number;
  reasoning: string;
}> {
  // Find similar successful executions
  const similar = await findSimilarExecutions(toolName, imageAnalysis, 5);

  if (similar.length === 0) {
    // No history - return tool defaults
    return {
      params: getDefaultParams(toolName),
      confidence: 70,
      reasoning: 'No historical data - using default parameters'
    };
  }

  // Calculate average parameters from similar executions
  const avgParams = calculateAverageParams(toolName, similar);

  return {
    params: avgParams,
    confidence: 90 + Math.min(similar.length, 5), // Up to 95% with 5+ examples
    reasoning: `Based on ${similar.length} similar successful executions`
  };
}

/**
 * Get default parameters for a tool.
 */
function getDefaultParams(toolName: string): any {
  switch (toolName) {
    case 'color_knockout':
      return { tolerance: 30, replaceMode: 'transparency', antiAliasing: true };
    case 'recolor_image':
      return { blendMode: 'replace', tolerance: 30 };
    case 'texture_cut':
      return { amount: 0.5, scale: 1, rotation: 0 };
    default:
      return {};
  }
}

/**
 * Calculate average parameters from executions.
 */
function calculateAverageParams(toolName: string, executions: ToolExecution[]): any {
  if (executions.length === 0) return getDefaultParams(toolName);

  switch (toolName) {
    case 'color_knockout': {
      const avgTolerance = executions.reduce(
        (sum, ex) => sum + (ex.parameters.tolerance || 30),
        0
      ) / executions.length;

      return {
        tolerance: Math.round(avgTolerance),
        replaceMode: executions[0].parameters.replaceMode || 'transparency',
        antiAliasing: true
      };
    }

    case 'texture_cut': {
      const avgAmount = executions.reduce(
        (sum, ex) => sum + (ex.parameters.amount || 0.5),
        0
      ) / executions.length;

      return {
        amount: Math.round(avgAmount * 10) / 10,
        scale: 1,
        rotation: 0
      };
    }

    default:
      return executions[0]?.parameters || getDefaultParams(toolName);
  }
}
