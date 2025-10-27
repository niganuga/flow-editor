/**
 * AI Clarification Workflow Types
 *
 * Type definitions for the AI Designer Partner clarification system.
 * Supports print readiness validation, workflow optimization, and user confirmation.
 *
 * @module lib/types/ai-clarification
 */

/**
 * Severity levels for warnings and suggestions
 */
export type SeverityLevel = 'error' | 'warning' | 'info';

/**
 * Types of print readiness warnings
 */
export type PrintWarningType =
  | 'low_dpi'           // Image DPI below print standards
  | 'wrong_order'       // Operations in suboptimal order
  | 'quality_loss'      // Operation will reduce quality
  | 'missing_info';     // Required information not provided

/**
 * Known tool names in the system
 */
export type KnownToolName =
  | 'background_remover'
  | 'color_knockout'
  | 'recolor_image'
  | 'upscaler'
  | 'auto_crop'
  | 'smart_resize'
  | 'rotate_flip'
  | 'generate_mockup';

/**
 * Tool call structure matching orchestrator format
 */
export interface ToolCall {
  readonly toolName: KnownToolName | string;
  readonly parameters: Record<string, any>;
}

/**
 * Print readiness warning with suggestion
 */
export interface PrintReadinessWarning {
  readonly type: PrintWarningType;
  readonly severity: SeverityLevel;
  readonly message: string;
  readonly suggestion?: string;
  readonly currentValue?: string | number;
  readonly recommendedValue?: string | number;
}

/**
 * Confidence level for AI decisions
 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/**
 * Individual workflow step parsed from user request
 */
export interface WorkflowStep {
  readonly stepNumber: number;
  readonly operation: string;        // Display name (e.g., "Remove background")
  readonly toolName: KnownToolName;  // Internal tool name
  readonly parameters: Record<string, any>;
  readonly estimatedTime?: number;   // Estimated execution time in seconds
  readonly confidence?: number;      // 0-1: How confident AI is about this step
  readonly confidenceLevel?: ConfidenceLevel; // User-friendly confidence indicator
}

/**
 * User-facing clarification option
 */
export interface ClarificationOption {
  readonly id: 'suggested' | 'original' | 'custom';
  readonly label: string;            // Button text
  readonly description: string;      // Explanation of what this option does
  readonly toolCalls: ReadonlyArray<ToolCall>;
  readonly isRecommended: boolean;   // Highlight as AI's recommendation
}

/**
 * Main clarification data structure
 */
export interface ClarificationData {
  readonly messageId: string;
  readonly userRequest: string;
  readonly parsedSteps: ReadonlyArray<WorkflowStep>;
  readonly printWarnings: ReadonlyArray<PrintReadinessWarning>;
  readonly suggestedWorkflow?: ReadonlyArray<WorkflowStep>;
  readonly suggestedReason?: string;
  readonly options: ReadonlyArray<ClarificationOption>;
  readonly overallConfidence?: number;           // 0-1: Overall confidence in workflow understanding
  readonly overallConfidenceLevel?: ConfidenceLevel; // User-friendly overall confidence
  readonly suggestionConfidence?: number;        // 0-1: Confidence in suggested workflow (if provided)
}

/**
 * Image analysis data for clarification decisions
 */
export interface ClarificationImageAnalysis {
  readonly width: number;
  readonly height: number;
  readonly dpi?: number;
  readonly format: string;
  readonly hasTransparency: boolean;
  readonly colorMode?: 'RGB' | 'CMYK' | 'Grayscale';
}

/**
 * API response type supporting both clarification and direct execution
 */
export interface ClarificationResponse {
  readonly success: boolean;
  readonly needsClarification: boolean;
  readonly clarification?: ClarificationData;
  readonly directExecution?: {
    readonly toolCalls: ReadonlyArray<ToolCall>;
  };
  readonly message: string;
  readonly confidence?: number;
}

/**
 * Type guard: Check if response needs clarification
 */
export function needsClarification(
  response: ClarificationResponse
): response is ClarificationResponse & { clarification: ClarificationData } {
  return response.needsClarification === true && response.clarification !== undefined;
}

/**
 * Type guard: Check if response can execute directly
 */
export function canExecuteDirectly(
  response: ClarificationResponse
): response is ClarificationResponse & { directExecution: { toolCalls: ReadonlyArray<ToolCall> } } {
  return response.needsClarification === false && response.directExecution !== undefined;
}

/**
 * Convert numeric confidence (0-1) to user-friendly level
 *
 * @param confidence - Numeric confidence score (0-1)
 * @returns Confidence level category
 */
export function getConfidenceLevel(confidence: number): ConfidenceLevel {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}

/**
 * Determine if clarification should be shown based on request analysis
 *
 * @param userMessage - User's message
 * @param stepCount - Number of operations detected
 * @param imageAnalysis - Image metadata
 * @returns Whether to show clarification UI
 */
export function shouldShowClarification(
  userMessage: string,
  stepCount: number,
  imageAnalysis?: ClarificationImageAnalysis
): boolean {
  // Always clarify for 3+ operations
  if (stepCount >= 3) return true;

  // Check for print-related keywords with low DPI
  const printKeywords = ['print', 'mockup', 'tshirt', 't-shirt', 'shirt', 'poster'];
  const hasPrintIntent = printKeywords.some(kw => userMessage.toLowerCase().includes(kw));

  if (hasPrintIntent && imageAnalysis) {
    const dpi = imageAnalysis.dpi || 72;
    if (dpi < 150) return true; // Low DPI warning
  }

  return false;
}
