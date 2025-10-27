"use client"

import type React from "react"
import { useState } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  Info,
  ChevronDown,
  ChevronUp,
  Zap,
  Clock
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  ClarificationData,
  WorkflowStep,
  PrintReadinessWarning,
  ClarificationOption,
  ConfidenceLevel
} from "@/lib/types/ai-clarification"

interface AIClarificationMessageProps {
  data: ClarificationData
  onSelectOption: (optionId: 'suggested' | 'original' | 'custom') => void
  isLoading?: boolean
}

/**
 * Confidence Badge Component
 */
function ConfidenceBadge({ level }: { level?: ConfidenceLevel }) {
  if (!level) return null

  const colors = {
    high: 'bg-green-100 text-green-800 border-green-800',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-800',
    low: 'bg-orange-100 text-orange-800 border-orange-800'
  }

  const labels = {
    high: 'High Confidence',
    medium: 'Medium Confidence',
    low: 'Low Confidence'
  }

  return (
    <span className={`text-xs font-bold px-2 py-0.5 border-2 rounded ${colors[level]}`}>
      {labels[level]}
    </span>
  )
}

/**
 * Workflow Step Component
 */
function WorkflowStepCard({ step }: { step: WorkflowStep }) {
  return (
    <div className="border-2 border-foreground rounded-lg p-3 bg-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm">
            {step.stepNumber}. {step.operation}
          </span>
        </div>
        {step.confidenceLevel && <ConfidenceBadge level={step.confidenceLevel} />}
      </div>

      {step.estimatedTime && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
          <Clock className="w-3 h-3" />
          <span>~{step.estimatedTime}s</span>
        </div>
      )}
    </div>
  )
}

/**
 * Print Warning Component
 */
function PrintWarningCard({ warning }: { warning: PrintReadinessWarning }) {
  const Icon = warning.severity === 'error' ? AlertTriangle : Info
  const borderColor = warning.severity === 'error' ? 'border-destructive' : 'border-yellow-600'
  const bgColor = warning.severity === 'error' ? 'bg-destructive/10' : 'bg-yellow-50'

  return (
    <div className={`border-2 ${borderColor} ${bgColor} rounded-lg p-3`}>
      <div className="flex items-start gap-2">
        <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${warning.severity === 'error' ? 'text-destructive' : 'text-yellow-600'}`} />
        <div className="flex-1">
          <p className="font-bold text-sm mb-1">{warning.message}</p>
          {warning.suggestion && (
            <p className="text-xs text-muted-foreground">{warning.suggestion}</p>
          )}
          {(warning.currentValue !== undefined && warning.recommendedValue !== undefined) && (
            <div className="text-xs mt-2 space-y-1">
              <div>Current: <span className="font-bold">{warning.currentValue}</span></div>
              <div>Recommended: <span className="font-bold text-green-700">{warning.recommendedValue}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Option Button Component
 */
function OptionButton({
  option,
  onSelect,
  isLoading
}: {
  option: ClarificationOption
  onSelect: () => void
  isLoading: boolean
}) {
  return (
    <Button
      onClick={onSelect}
      disabled={isLoading}
      variant={option.isRecommended ? "default" : "outline"}
      className={`brutalist-button w-full h-auto py-3 px-4 flex-col items-start gap-2 ${
        option.isRecommended ? 'ring-2 ring-accent ring-offset-2' : ''
      }`}
    >
      <div className="flex items-center gap-2 w-full">
        {option.isRecommended && <Zap className="w-4 h-4" />}
        <span className="font-bold text-sm">{option.label}</span>
      </div>
      <p className="text-xs text-left opacity-80 font-normal">{option.description}</p>
    </Button>
  )
}

/**
 * Main Clarification Message Component
 */
export function AIClarificationMessage({
  data,
  onSelectOption,
  isLoading = false
}: AIClarificationMessageProps) {
  const [showDetails, setShowDetails] = useState(true)

  const hasWarnings = data.printWarnings.length > 0
  const hasSuggestion = data.suggestedWorkflow && data.suggestedWorkflow.length > 0

  return (
    <div className="border-2 border-foreground rounded-xl bg-accent/10 p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 border-2 border-foreground rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
          <Lightbulb className="w-5 h-5 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <h3 className="font-bold text-sm mb-1">AI Workflow Suggestion</h3>
          <p className="text-xs text-muted-foreground">
            I analyzed your request: "{data.userRequest}"
          </p>
          {data.overallConfidenceLevel && (
            <div className="mt-2">
              <ConfidenceBadge level={data.overallConfidenceLevel} />
            </div>
          )}
        </div>
      </div>

      {/* Print Warnings */}
      {hasWarnings && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <span className="font-bold text-sm">Print Readiness Warnings</span>
          </div>
          <div className="space-y-2">
            {data.printWarnings.map((warning, idx) => (
              <PrintWarningCard key={idx} warning={warning} />
            ))}
          </div>
        </div>
      )}

      {/* Collapsible Details */}
      <div className="border-2 border-foreground rounded-lg overflow-hidden">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-3 bg-card hover:bg-accent/20 transition-colors"
        >
          <span className="font-bold text-sm">Workflow Details</span>
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDetails && (
          <div className="p-3 bg-card border-t-2 border-foreground space-y-3">
            {/* Your Requested Steps */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-4 h-4" />
                <span className="font-bold text-sm">Your Requested Steps:</span>
              </div>
              <div className="space-y-2">
                {data.parsedSteps.map((step) => (
                  <WorkflowStepCard key={step.stepNumber} step={step} />
                ))}
              </div>
            </div>

            {/* AI Suggested Workflow */}
            {hasSuggestion && (
              <div className="pt-3 border-t-2 border-foreground">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-bold text-sm text-green-700">AI Suggested Workflow:</span>
                </div>
                {data.suggestedReason && (
                  <p className="text-xs text-muted-foreground mb-2 italic">
                    {data.suggestedReason}
                  </p>
                )}
                <div className="space-y-2">
                  {data.suggestedWorkflow!.map((step) => (
                    <WorkflowStepCard key={step.stepNumber} step={step} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Options */}
      <div className="space-y-2">
        <p className="font-bold text-sm">Choose how to proceed:</p>
        <div className="grid gap-2">
          {data.options.map((option) => (
            <OptionButton
              key={option.id}
              option={option}
              onSelect={() => onSelectOption(option.id)}
              isLoading={isLoading}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
