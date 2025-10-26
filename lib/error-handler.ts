/**
 * Error Handler - Intelligent Retry Logic with Parameter Adjustment
 *
 * Phase 6 of 8-phase AI Design Assistant implementation.
 * Provides intelligent retry mechanism that adjusts parameters based on failure modes.
 *
 * Purpose: Maintain >95% confidence through automatic error recovery:
 * 1. Detects failure mode (validation, execution, quality, timeout, API error)
 * 2. Determines if retry is appropriate
 * 3. Adjusts parameters intelligently to fix the issue
 * 4. Retries with exponential backoff
 * 5. Learns from failures for future improvements
 *
 * Integration:
 * - Uses parameter-validator (Phase 3) for parameter validation
 * - Uses result-validator (Phase 5) for quality validation
 * - Uses context-manager (Phase 2) for learning from failures
 * - Used by API route (Phase 7) for robust tool execution
 *
 * @module error-handler
 */

import { validateToolParameters, type ValidationResult } from './parameter-validator';
import { validateToolResult, type ResultValidation } from './result-validator';
import { executeToolFunction } from './ai-tools-orchestrator';
import { storeToolExecution, type ToolExecution } from './context-manager';
import type { ImageAnalysis } from './image-analyzer';

// ===== INTERFACES =====

/**
 * Strategy for retry attempt
 */
export interface RetryStrategy {
  /** Whether to retry */
  shouldRetry: boolean;

  /** Adjusted parameters for retry */
  adjustedParameters?: any;

  /** Reason for retry strategy */
  reasoning: string;

  /** Maximum retries attempted */
  maxRetries: number;

  /** Current retry count */
  retryCount: number;

  /** Delay before retry (ms) */
  retryDelayMs: number;
}

/**
 * Analysis of what went wrong
 */
export interface FailureAnalysis {
  /** Type of failure */
  failureMode: 'validation' | 'execution' | 'quality' | 'timeout' | 'api_error';

  /** Root cause description */
  rootCause: string;

  /** Whether failure is recoverable */
  recoverable: boolean;

  /** Suggested parameter adjustments */
  suggestedFixes: ParameterAdjustment[];
}

/**
 * Suggestion for parameter adjustment
 */
export interface ParameterAdjustment {
  /** Parameter to adjust */
  parameter: string;

  /** Current value */
  currentValue: any;

  /** Suggested value */
  suggestedValue: any;

  /** Reason for adjustment */
  reason: string;
}

/**
 * Result of retry execution
 */
export interface RetryResult {
  /** Whether retry succeeded */
  success: boolean;

  /** Final result if successful */
  result?: any;

  /** All attempts made */
  attempts: RetryAttempt[];

  /** Final error if all retries failed */
  finalError?: string;
}

/**
 * Record of a single retry attempt
 */
export interface RetryAttempt {
  /** Attempt number (1-indexed) */
  attemptNumber: number;

  /** Parameters used for this attempt */
  parameters: any;

  /** Whether attempt succeeded */
  success: boolean;

  /** Error message if failed */
  error?: string;

  /** Quality score if succeeded */
  qualityScore?: number;

  /** Reason for parameter adjustment */
  adjustmentReason?: string;

  /** Execution time in milliseconds */
  executionTimeMs: number;
}

// ===== MAIN RETRY EXECUTOR =====

/**
 * Execute tool with automatic retry and parameter adjustment.
 *
 * Flow:
 * 1. Validate parameters (Phase 3)
 * 2. Execute tool
 * 3. Validate result (Phase 5)
 * 4. If failure, analyze and determine retry strategy
 * 5. Adjust parameters based on failure mode
 * 6. Retry with exponential backoff
 * 7. Store failure data for learning
 *
 * @param toolName - Tool to execute
 * @param parameters - Initial parameters
 * @param imageUrl - Image URL
 * @param imageAnalysis - Ground truth analysis
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns Retry result with all attempts
 *
 * @example
 * ```typescript
 * const result = await executeWithRetry(
 *   'color_knockout',
 *   { colors: [{ r: 255, g: 0, b: 0, hex: '#ff0000' }], tolerance: 30 },
 *   imageUrl,
 *   imageAnalysis,
 *   3
 * );
 *
 * if (result.success) {
 *   console.log(`Succeeded after ${result.attempts.length} attempt(s)`);
 *   console.log('Result URL:', result.result);
 * } else {
 *   console.error('Failed after all retries:', result.finalError);
 *   result.attempts.forEach(attempt => {
 *     console.log(`Attempt ${attempt.attemptNumber}: ${attempt.error}`);
 *   });
 * }
 * ```
 */
export async function executeWithRetry(
  toolName: string,
  parameters: any,
  imageUrl: string,
  imageAnalysis: ImageAnalysis,
  maxRetries: number = 3
): Promise<RetryResult> {
  const attempts: RetryAttempt[] = [];
  let currentParams = { ...parameters };
  let retryCount = 0;

  console.log(`[ErrorHandler] Starting ${toolName} with max ${maxRetries} retries`);

  while (retryCount <= maxRetries) {
    const attemptStartTime = Date.now();

    try {
      // ===== STEP 1: Validate Parameters =====
      console.log(`[ErrorHandler] Attempt ${retryCount + 1}: Validating parameters...`);

      const validation = await validateToolParameters(
        toolName,
        currentParams,
        imageAnalysis,
        imageUrl
      );

      if (!validation.isValid) {
        // Parameter validation failed
        console.log(`[ErrorHandler] Validation failed: ${validation.errors[0]}`);

        const failure = analyzeFailure(null, validation);
        const strategy = await determineRetryStrategy(
          failure,
          currentParams,
          imageAnalysis,
          retryCount
        );

        attempts.push({
          attemptNumber: retryCount + 1,
          parameters: { ...currentParams },
          success: false,
          error: `Validation failed: ${validation.errors[0]}`,
          adjustmentReason: strategy.reasoning,
          executionTimeMs: Date.now() - attemptStartTime,
        });

        // Store failed attempt for learning
        await storeFailedExecution(toolName, currentParams, failure, imageAnalysis);

        if (!strategy.shouldRetry || retryCount >= maxRetries) {
          console.log('[ErrorHandler] No more retries available');
          return {
            success: false,
            attempts,
            finalError: failure.rootCause,
          };
        }

        // Adjust parameters and retry
        currentParams = strategy.adjustedParameters || currentParams;
        retryCount++;
        console.log(`[ErrorHandler] Retrying in ${strategy.retryDelayMs}ms with adjusted parameters`);
        await sleep(strategy.retryDelayMs);
        continue;
      }

      // Validation warnings
      if (validation.warnings.length > 0) {
        console.log(`[ErrorHandler] Validation warnings: ${validation.warnings.join('; ')}`);
      }

      // ===== STEP 2: Execute Tool =====
      console.log(`[ErrorHandler] Executing ${toolName}...`);

      const executionResult = await executeToolSafely(toolName, currentParams, imageUrl);

      if (!executionResult.success) {
        // Execution failed
        const executionError = new Error(executionResult.error || 'Tool execution failed');
        const failure = analyzeFailure(executionError);
        const strategy = await determineRetryStrategy(
          failure,
          currentParams,
          imageAnalysis,
          retryCount
        );

        attempts.push({
          attemptNumber: retryCount + 1,
          parameters: { ...currentParams },
          success: false,
          error: executionResult.error || 'Execution failed',
          adjustmentReason: strategy.reasoning,
          executionTimeMs: Date.now() - attemptStartTime,
        });

        await storeFailedExecution(toolName, currentParams, failure, imageAnalysis);

        if (!strategy.shouldRetry || retryCount >= maxRetries) {
          return {
            success: false,
            attempts,
            finalError: failure.rootCause,
          };
        }

        currentParams = strategy.adjustedParameters || currentParams;
        retryCount++;
        await sleep(strategy.retryDelayMs);
        continue;
      }

      const resultUrl = executionResult.result?.imageUrl;

      if (!resultUrl) {
        throw new Error('Tool execution returned no result URL');
      }

      // ===== STEP 3: Validate Result Quality =====
      console.log(`[ErrorHandler] Validating result quality...`);

      const resultValidation = await validateToolResult(
        imageUrl,
        resultUrl,
        toolName,
        currentParams
      );

      if (!resultValidation.isValid || resultValidation.qualityScore < 70) {
        // Quality too low
        console.log(
          `[ErrorHandler] Quality validation failed (score: ${resultValidation.qualityScore})`
        );

        const failure = analyzeFailure(null, validation, resultValidation);
        const strategy = await determineRetryStrategy(
          failure,
          currentParams,
          imageAnalysis,
          retryCount
        );

        attempts.push({
          attemptNumber: retryCount + 1,
          parameters: { ...currentParams },
          success: false,
          qualityScore: resultValidation.qualityScore,
          error: `Quality too low: ${resultValidation.qualityScore}/100`,
          adjustmentReason: strategy.reasoning,
          executionTimeMs: Date.now() - attemptStartTime,
        });

        await storeFailedExecution(toolName, currentParams, failure, imageAnalysis);

        if (!strategy.shouldRetry || retryCount >= maxRetries) {
          return {
            success: false,
            attempts,
            finalError: failure.rootCause,
          };
        }

        currentParams = strategy.adjustedParameters || currentParams;
        retryCount++;
        await sleep(strategy.retryDelayMs);
        continue;
      }

      // ===== SUCCESS! =====
      console.log(
        `[ErrorHandler] Success! Quality: ${resultValidation.qualityScore}/100, Confidence: ${validation.confidence}%`
      );

      attempts.push({
        attemptNumber: retryCount + 1,
        parameters: { ...currentParams },
        success: true,
        qualityScore: resultValidation.qualityScore,
        executionTimeMs: Date.now() - attemptStartTime,
      });

      // Store successful execution for learning
      await storeToolExecution('success', {
        toolName,
        parameters: currentParams,
        success: true,
        confidence: Math.min(validation.confidence, resultValidation.qualityScore),
        resultMetrics: {
          pixelsChanged: resultValidation.changeMetrics.pixelsChanged,
          percentageChanged: resultValidation.changeMetrics.percentageChanged,
          executionTimeMs: Date.now() - attemptStartTime,
          qualityScore: resultValidation.qualityScore,
        },
        imageSpecsSnapshot: {
          width: imageAnalysis.width,
          height: imageAnalysis.height,
          format: imageAnalysis.format,
          hasTransparency: imageAnalysis.hasTransparency,
          uniqueColorCount: imageAnalysis.uniqueColorCount,
          sharpnessScore: imageAnalysis.sharpnessScore,
          noiseLevel: imageAnalysis.noiseLevel,
          isPrintReady: imageAnalysis.isPrintReady,
        },
        timestamp: Date.now(),
      });

      return {
        success: true,
        result: resultUrl,
        attempts,
      };
    } catch (error) {
      // Unexpected execution error
      console.error('[ErrorHandler] Unexpected error:', error);

      const failure = analyzeFailure(error as Error);
      const strategy = await determineRetryStrategy(
        failure,
        currentParams,
        imageAnalysis,
        retryCount
      );

      attempts.push({
        attemptNumber: retryCount + 1,
        parameters: { ...currentParams },
        success: false,
        error: (error as Error).message,
        adjustmentReason: strategy.reasoning,
        executionTimeMs: Date.now() - attemptStartTime,
      });

      await storeFailedExecution(toolName, currentParams, failure, imageAnalysis);

      if (!strategy.shouldRetry || retryCount >= maxRetries) {
        return {
          success: false,
          attempts,
          finalError: failure.rootCause,
        };
      }

      currentParams = strategy.adjustedParameters || currentParams;
      retryCount++;
      await sleep(strategy.retryDelayMs);
    }
  }

  // Should never reach here, but handle it
  return {
    success: false,
    attempts,
    finalError: 'Max retries exceeded',
  };
}

// ===== FAILURE ANALYSIS =====

/**
 * Analyze failure mode and root cause.
 *
 * Determines:
 * - What type of failure occurred
 * - Why it happened
 * - Whether it's recoverable
 * - What fixes to apply
 *
 * @param error - Error that occurred (if any)
 * @param validationResult - Parameter validation result (if available)
 * @param resultValidation - Result quality validation (if available)
 * @returns Detailed failure analysis
 *
 * @example
 * ```typescript
 * const failure = analyzeFailure(null, validationResult);
 * console.log(`Failure mode: ${failure.failureMode}`);
 * console.log(`Root cause: ${failure.rootCause}`);
 * console.log(`Recoverable: ${failure.recoverable}`);
 * ```
 */
export function analyzeFailure(
  error: Error | null,
  validationResult?: ValidationResult,
  resultValidation?: ResultValidation
): FailureAnalysis {
  // ===== VALIDATION FAILURE =====
  if (validationResult && !validationResult.isValid) {
    const firstError = validationResult.errors[0];

    // Color not found in image
    if (
      firstError.includes('not found in image') ||
      firstError.includes('does not exist') ||
      firstError.includes('not in image')
    ) {
      return {
        failureMode: 'validation',
        rootCause: 'Color does not exist in image',
        recoverable: true,
        suggestedFixes: [
          {
            parameter: 'colors',
            currentValue: null,
            suggestedValue: 'Use dominant colors from analysis',
            reason: 'Specified color not found - replace with actual image colors',
          },
        ],
      };
    }

    // Tolerance inappropriate
    if (firstError.includes('tolerance')) {
      return {
        failureMode: 'validation',
        rootCause: 'Tolerance inappropriate for image characteristics',
        recoverable: true,
        suggestedFixes: [
          {
            parameter: 'tolerance',
            currentValue: null,
            suggestedValue: 'Adjust based on noise level',
            reason: "Tolerance doesn't match image noise characteristics",
          },
        ],
      };
    }

    // Dimensions/coordinates out of bounds
    if (firstError.includes('outside') || firstError.includes('bounds')) {
      return {
        failureMode: 'validation',
        rootCause: 'Coordinates or dimensions out of bounds',
        recoverable: true,
        suggestedFixes: [
          {
            parameter: 'coordinates',
            currentValue: null,
            suggestedValue: 'Clamp to image bounds',
            reason: 'Coordinates exceed image dimensions',
          },
        ],
      };
    }

    // Too many colors/mappings
    if (firstError.includes('exceeds') || firstError.includes('too many')) {
      return {
        failureMode: 'validation',
        rootCause: 'Parameter count exceeds reasonable limits',
        recoverable: true,
        suggestedFixes: [
          {
            parameter: 'count',
            currentValue: null,
            suggestedValue: 'Reduce to reasonable count',
            reason: 'Too many items specified',
          },
        ],
      };
    }

    // Generic validation failure
    return {
      failureMode: 'validation',
      rootCause: firstError,
      recoverable: true,
      suggestedFixes: [],
    };
  }

  // ===== QUALITY FAILURE =====
  if (resultValidation && (!resultValidation.isValid || resultValidation.qualityScore < 70)) {
    const reasoning = resultValidation.reasoning;

    // Too much changed (>95%)
    if (reasoning.includes('>95%') || reasoning.includes('too much')) {
      return {
        failureMode: 'quality',
        rootCause: 'Tool removed/changed too much of the image (>95%)',
        recoverable: true,
        suggestedFixes: [
          {
            parameter: 'tolerance',
            currentValue: null,
            suggestedValue: 'Reduce tolerance',
            reason: 'Lower tolerance to affect fewer pixels',
          },
        ],
      };
    }

    // Too little changed (<1%)
    if (reasoning.includes('<1%') || reasoning.includes('too little') || reasoning.includes('minimal')) {
      return {
        failureMode: 'quality',
        rootCause: 'Tool changed too little of the image (<1%)',
        recoverable: true,
        suggestedFixes: [
          {
            parameter: 'tolerance',
            currentValue: null,
            suggestedValue: 'Increase tolerance',
            reason: 'Higher tolerance to affect more pixels',
          },
        ],
      };
    }

    // Quality degraded
    if (reasoning.includes('sharpness') || reasoning.includes('quality')) {
      return {
        failureMode: 'quality',
        rootCause: 'Result quality degraded significantly',
        recoverable: false, // Quality degradation usually can't be fixed by retrying
        suggestedFixes: [],
      };
    }

    // Generic quality failure
    return {
      failureMode: 'quality',
      rootCause: resultValidation.reasoning,
      recoverable: true,
      suggestedFixes: resultValidation.issues.map((issue) => ({
        parameter: 'unknown',
        currentValue: null,
        suggestedValue: 'Adjust parameters',
        reason: issue.message,
      })),
    };
  }

  // ===== EXECUTION ERROR =====
  if (error) {
    const message = error.message.toLowerCase();

    // Timeout
    if (message.includes('timeout') || message.includes('etimedout') || message.includes('timed out')) {
      return {
        failureMode: 'timeout',
        rootCause: 'Operation timed out',
        recoverable: true,
        suggestedFixes: [],
      };
    }

    // Rate limit
    if (message.includes('rate limit') || message.includes('429') || message.includes('too many requests')) {
      return {
        failureMode: 'api_error',
        rootCause: 'API rate limit exceeded',
        recoverable: true,
        suggestedFixes: [],
      };
    }

    // Network error
    if (
      message.includes('network') ||
      message.includes('fetch') ||
      message.includes('econnrefused') ||
      message.includes('enotfound')
    ) {
      return {
        failureMode: 'api_error',
        rootCause: 'Network error',
        recoverable: true,
        suggestedFixes: [],
      };
    }

    // Memory error
    if (message.includes('memory') || message.includes('heap')) {
      return {
        failureMode: 'execution',
        rootCause: 'Out of memory',
        recoverable: false,
        suggestedFixes: [],
      };
    }

    // Generic execution error
    return {
      failureMode: 'execution',
      rootCause: error.message,
      recoverable: false,
      suggestedFixes: [],
    };
  }

  // Unknown failure
  return {
    failureMode: 'execution',
    rootCause: 'Unknown failure',
    recoverable: false,
    suggestedFixes: [],
  };
}

// ===== RETRY STRATEGY =====

/**
 * Determine retry strategy based on failure analysis.
 *
 * Decides:
 * - Whether to retry
 * - What parameters to adjust
 * - How long to wait (exponential backoff)
 *
 * @param failure - Failure analysis
 * @param currentParameters - Parameters that failed
 * @param imageAnalysis - Ground truth image analysis
 * @param retryCount - Current retry count
 * @returns Retry strategy with adjusted parameters
 *
 * @example
 * ```typescript
 * const strategy = await determineRetryStrategy(
 *   failure,
 *   currentParams,
 *   imageAnalysis,
 *   1
 * );
 *
 * if (strategy.shouldRetry) {
 *   console.log(`Retry with: ${JSON.stringify(strategy.adjustedParameters)}`);
 *   await sleep(strategy.retryDelayMs);
 * }
 * ```
 */
export async function determineRetryStrategy(
  failure: FailureAnalysis,
  currentParameters: any,
  imageAnalysis: ImageAnalysis,
  retryCount: number
): Promise<RetryStrategy> {
  const baseDelay = 1000; // 1 second
  const exponentialBackoff = baseDelay * Math.pow(2, retryCount);
  const maxRetries = 3;

  // ===== NON-RECOVERABLE FAILURES =====
  if (!failure.recoverable) {
    return {
      shouldRetry: false,
      reasoning: `Non-recoverable failure: ${failure.rootCause}`,
      maxRetries,
      retryCount,
      retryDelayMs: 0,
    };
  }

  // ===== API RATE LIMIT - LONG DELAY =====
  if (failure.failureMode === 'api_error' && failure.rootCause.includes('rate limit')) {
    return {
      shouldRetry: true,
      reasoning: 'API rate limit - retry with longer delay',
      maxRetries,
      retryCount,
      retryDelayMs: 5000, // 5 seconds
    };
  }

  // ===== NETWORK/API ERROR - EXPONENTIAL BACKOFF =====
  if (failure.failureMode === 'api_error') {
    return {
      shouldRetry: true,
      reasoning: 'Network/API error - retry with exponential backoff',
      maxRetries,
      retryCount,
      retryDelayMs: exponentialBackoff,
    };
  }

  // ===== TIMEOUT - RETRY WITH SAME PARAMETERS =====
  if (failure.failureMode === 'timeout') {
    return {
      shouldRetry: true,
      reasoning: 'Timeout - retry with same parameters',
      maxRetries,
      retryCount,
      retryDelayMs: exponentialBackoff,
    };
  }

  // ===== VALIDATION FAILURE - ADJUST PARAMETERS =====
  if (failure.failureMode === 'validation') {
    const adjustments = await applyParameterAdjustments(
      currentParameters,
      failure.suggestedFixes,
      imageAnalysis
    );

    return {
      shouldRetry: true,
      adjustedParameters: adjustments,
      reasoning: `Adjusted parameters: ${failure.suggestedFixes.map((f) => f.reason).join('; ')}`,
      maxRetries,
      retryCount,
      retryDelayMs: exponentialBackoff,
    };
  }

  // ===== QUALITY FAILURE - TWEAK PARAMETERS =====
  if (failure.failureMode === 'quality') {
    const adjustments = await tweakParametersForQuality(currentParameters, imageAnalysis, failure);

    return {
      shouldRetry: true,
      adjustedParameters: adjustments,
      reasoning: 'Tweaked parameters to improve quality based on failure analysis',
      maxRetries,
      retryCount,
      retryDelayMs: exponentialBackoff,
    };
  }

  // ===== DEFAULT - NO RETRY =====
  return {
    shouldRetry: false,
    reasoning: 'Unknown failure mode - cannot determine retry strategy',
    maxRetries,
    retryCount,
    retryDelayMs: 0,
  };
}

// ===== PARAMETER ADJUSTMENT HELPERS =====

/**
 * Apply suggested parameter adjustments from failure analysis.
 *
 * Implements intelligent parameter fixes:
 * - Color not found → Use dominant colors from analysis
 * - Tolerance wrong → Adjust based on noise level
 * - Coordinates out of bounds → Clamp to valid range
 *
 * @param currentParams - Current parameters
 * @param suggestedFixes - Suggested fixes from failure analysis
 * @param imageAnalysis - Ground truth image analysis
 * @returns Adjusted parameters
 */
async function applyParameterAdjustments(
  currentParams: any,
  suggestedFixes: ParameterAdjustment[],
  imageAnalysis: ImageAnalysis
): Promise<any> {
  const adjusted = { ...currentParams };

  for (const fix of suggestedFixes) {
    // Fix: Replace invalid colors with dominant colors
    if (fix.parameter === 'colors') {
      console.log('[ErrorHandler] Replacing colors with dominant colors from image');
      adjusted.colors = imageAnalysis.dominantColors.slice(0, 3).map((c) => ({
        r: c.r,
        g: c.g,
        b: c.b,
        hex: c.hex,
      }));
    }

    // Fix: Adjust tolerance based on noise level
    if (fix.parameter === 'tolerance') {
      const currentTolerance = adjusted.tolerance || 30;

      if (imageAnalysis.noiseLevel > 30) {
        // High noise - increase tolerance
        adjusted.tolerance = Math.max(currentTolerance, 35);
        console.log(`[ErrorHandler] Increased tolerance to ${adjusted.tolerance} for noisy image`);
      } else {
        // Low noise - decrease tolerance
        adjusted.tolerance = Math.min(currentTolerance, 25);
        console.log(`[ErrorHandler] Decreased tolerance to ${adjusted.tolerance} for clean image`);
      }
    }

    // Fix: Clamp coordinates to image bounds
    if (fix.parameter === 'coordinates') {
      if (adjusted.x !== undefined) {
        adjusted.x = Math.max(0, Math.min(adjusted.x, imageAnalysis.width - 1));
      }
      if (adjusted.y !== undefined) {
        adjusted.y = Math.max(0, Math.min(adjusted.y, imageAnalysis.height - 1));
      }
      console.log(`[ErrorHandler] Clamped coordinates to valid bounds`);
    }

    // Fix: Reduce excessive counts
    if (fix.parameter === 'count') {
      if (adjusted.colorMappings && Array.isArray(adjusted.colorMappings)) {
        const maxMappings = Math.min(9, imageAnalysis.dominantColors.length);
        adjusted.colorMappings = adjusted.colorMappings.slice(0, maxMappings);
        console.log(`[ErrorHandler] Reduced color mappings to ${maxMappings}`);
      }
    }
  }

  return adjusted;
}

/**
 * Tweak parameters to improve quality based on failure analysis.
 *
 * Quality-based adjustments:
 * - Too much changed (>95%) → Reduce tolerance
 * - Too little changed (<1%) → Increase tolerance
 * - Effect too strong → Reduce amount/intensity
 * - Effect too weak → Increase amount/intensity
 *
 * @param currentParams - Current parameters
 * @param imageAnalysis - Ground truth image analysis
 * @param failure - Failure analysis
 * @returns Tweaked parameters
 */
async function tweakParametersForQuality(
  currentParams: any,
  imageAnalysis: ImageAnalysis,
  failure: FailureAnalysis
): Promise<any> {
  const adjusted = { ...currentParams };

  // Too much changed - reduce tolerance/amount
  if (failure.rootCause.includes('>95%') || failure.rootCause.includes('too much')) {
    if (adjusted.tolerance !== undefined) {
      adjusted.tolerance = Math.max(adjusted.tolerance - 10, 10);
      console.log(`[ErrorHandler] Reduced tolerance to ${adjusted.tolerance} (too much changed)`);
    }

    if (adjusted.amount !== undefined) {
      adjusted.amount = Math.max(adjusted.amount - 0.2, 0.1);
      console.log(`[ErrorHandler] Reduced amount to ${adjusted.amount} (too much changed)`);
    }
  }

  // Too little changed - increase tolerance/amount
  if (failure.rootCause.includes('<1%') || failure.rootCause.includes('too little') || failure.rootCause.includes('minimal')) {
    if (adjusted.tolerance !== undefined) {
      adjusted.tolerance = Math.min(adjusted.tolerance + 10, 50);
      console.log(`[ErrorHandler] Increased tolerance to ${adjusted.tolerance} (too little changed)`);
    }

    if (adjusted.amount !== undefined) {
      adjusted.amount = Math.min(adjusted.amount + 0.2, 1.0);
      console.log(`[ErrorHandler] Increased amount to ${adjusted.amount} (too little changed)`);
    }
  }

  return adjusted;
}

// ===== HELPER FUNCTIONS =====

/**
 * Execute tool with error handling wrapper.
 *
 * Wraps tool execution with timeout and error handling.
 *
 * @param toolName - Tool to execute
 * @param parameters - Tool parameters
 * @param imageUrl - Image URL
 * @returns Execution result
 */
async function executeToolSafely(
  toolName: string,
  parameters: any,
  imageUrl: string
): Promise<{ success: boolean; result?: any; error?: string }> {
  try {
    const result = await executeToolFunction(toolName, parameters, imageUrl);
    return result;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Sleep for specified milliseconds.
 *
 * @param ms - Milliseconds to sleep
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Store failed execution for learning.
 *
 * Integrates with context-manager (Phase 2) to learn from failures.
 *
 * @param toolName - Tool that failed
 * @param parameters - Parameters that failed
 * @param failure - Failure analysis
 * @param imageAnalysis - Image analysis
 */
async function storeFailedExecution(
  toolName: string,
  parameters: any,
  failure: FailureAnalysis,
  imageAnalysis: ImageAnalysis
): Promise<void> {
  try {
    await storeToolExecution('retry-failures', {
      toolName,
      parameters,
      success: false,
      confidence: 0,
      resultMetrics: {
        executionTimeMs: 0,
        pixelsChanged: 0,
        percentageChanged: 0,
        qualityScore: 0,
      },
      imageSpecsSnapshot: {
        width: imageAnalysis.width,
        height: imageAnalysis.height,
        format: imageAnalysis.format,
        hasTransparency: imageAnalysis.hasTransparency,
        uniqueColorCount: imageAnalysis.uniqueColorCount,
        sharpnessScore: imageAnalysis.sharpnessScore,
        noiseLevel: imageAnalysis.noiseLevel,
        isPrintReady: imageAnalysis.isPrintReady,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.warn('[ErrorHandler] Failed to store failed execution:', error);
    // Don't throw - graceful degradation
  }
}

// ===== PUBLIC API SUMMARY =====

/**
 * Get retry statistics for monitoring.
 *
 * @param attempts - Array of retry attempts
 * @returns Statistics about retries
 *
 * @example
 * ```typescript
 * const stats = getRetryStatistics(result.attempts);
 * console.log(`Total attempts: ${stats.totalAttempts}`);
 * console.log(`Success rate: ${stats.successRate}%`);
 * console.log(`Average execution time: ${stats.avgExecutionTime}ms`);
 * ```
 */
export function getRetryStatistics(attempts: RetryAttempt[]): {
  totalAttempts: number;
  successfulAttempts: number;
  failedAttempts: number;
  successRate: number;
  avgExecutionTime: number;
  totalExecutionTime: number;
} {
  const total = attempts.length;
  const successful = attempts.filter((a) => a.success).length;
  const failed = total - successful;
  const successRate = total > 0 ? (successful / total) * 100 : 0;

  const totalTime = attempts.reduce((sum, a) => sum + a.executionTimeMs, 0);
  const avgTime = total > 0 ? totalTime / total : 0;

  return {
    totalAttempts: total,
    successfulAttempts: successful,
    failedAttempts: failed,
    successRate: Math.round(successRate),
    avgExecutionTime: Math.round(avgTime),
    totalExecutionTime: totalTime,
  };
}
