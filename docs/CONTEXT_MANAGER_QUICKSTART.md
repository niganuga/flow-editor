# Context Manager - Quick Start Guide

## 30-Second Overview

The Context Manager is a **learning system** that stores successful tool executions and uses them to validate future parameters. Think of it as the AI's memory that gets smarter over time.

## Installation

Already included! No additional dependencies needed (runs in-memory by default).

## Basic Usage

### 1. Initialize (Once at Startup)

```typescript
import { initializeCollections } from './lib/context-manager';

// In your app initialization
await initializeCollections();
```

### 2. Store Conversations

```typescript
import { storeConversationTurn } from './lib/context-manager';

await storeConversationTurn(
  'conversation-id-123',
  'Remove the blue background',  // User message
  'Applied color knockout...',    // Assistant response
  imageAnalysis                   // Optional image data
);
```

### 3. Learn from Successes

```typescript
import { storeToolExecution } from './lib/context-manager';

// After successful tool execution
await storeToolExecution('conversation-id-123', {
  toolName: 'color_knockout',
  parameters: { tolerance: 30 },
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
    hasTransparency: false
  },
  timestamp: Date.now()
});
```

### 4. Use Historical Data

```typescript
import { findSimilarExecutions } from './lib/context-manager';

// Find similar successful executions
const similar = await findSimilarExecutions(
  'color_knockout',
  currentImageAnalysis,
  5  // Top 5 most similar
);

// Calculate recommended tolerance from history
const avgTolerance = similar.reduce(
  (sum, ex) => sum + ex.parameters.tolerance, 0
) / similar.length;

console.log(`Recommended tolerance: ${avgTolerance}`);
```

## Complete Example

```typescript
import { analyzeImage } from './lib/image-analyzer';
import {
  initializeCollections,
  storeConversationTurn,
  storeToolExecution,
  findSimilarExecutions
} from './lib/context-manager';
import { executeToolFunction } from './lib/ai-tools-orchestrator';

// 1. Initialize once
await initializeCollections();

// 2. Analyze image
const imageAnalysis = await analyzeImage(imageUrl);

// 3. Find similar executions
const similar = await findSimilarExecutions(
  'color_knockout',
  imageAnalysis,
  5
);

// 4. Get smart defaults
let tolerance = 30;
if (similar.length >= 3) {
  tolerance = Math.round(
    similar.reduce((sum, ex) => sum + ex.parameters.tolerance, 0) /
    similar.length
  );
}

// 5. Execute tool
const result = await executeToolFunction(
  'color_knockout',
  { colors: [...], tolerance },
  imageUrl
);

// 6. Store conversation
await storeConversationTurn(
  'conv-123',
  'Remove blue',
  `Applied color knockout with tolerance ${tolerance}`,
  imageAnalysis
);

// 7. Store success
if (result.success) {
  await storeToolExecution('conv-123', {
    toolName: 'color_knockout',
    parameters: { tolerance },
    success: true,
    confidence: 95,
    resultMetrics: { /* ... */ },
    imageSpecsSnapshot: { /* ... */ },
    timestamp: Date.now()
  });
}
```

## Key Functions

| Function | Purpose | When to Use |
|----------|---------|-------------|
| `initializeCollections()` | Setup ChromaDB | Once at startup |
| `storeConversationTurn()` | Save chat message | Every user/assistant exchange |
| `storeToolExecution()` | Save successful execution | After tool succeeds with high confidence |
| `findSimilarExecutions()` | Find historical patterns | Before executing tool |
| `getConversationContext()` | Get full conversation | When building context for AI |
| `pruneOldConversations()` | Clean old data | Weekly/monthly maintenance |

## Common Patterns

### Pattern 1: Smart Parameter Defaults

```typescript
// Before executing, check history
const similar = await findSimilarExecutions(toolName, imageAnalysis);

if (similar.length >= 3) {
  // Use historical average
  const params = calculateAverageParams(similar);
} else {
  // Use default params
  const params = getDefaultParams(toolName);
}
```

### Pattern 2: Confidence Scoring

```typescript
const similar = await findSimilarExecutions(toolName, imageAnalysis);

let confidence = 70; // Base confidence

if (similar.length >= 5) {
  confidence = 95; // High confidence with lots of history
} else if (similar.length >= 3) {
  confidence = 85; // Good confidence
} else if (similar.length >= 1) {
  confidence = 75; // Some confidence
}
```

### Pattern 3: Context-Aware AI

```typescript
const context = await getConversationContext(conversationId);

const prompt = `
  Previous messages: ${context?.messages.length || 0}
  Current image: ${context?.imageAnalysis?.width}x${context?.imageAnalysis?.height}
  Previous tools used: ${context?.toolExecutions.length || 0}

  User request: ${newMessage}
`;
```

## Testing

```bash
# Run all tests
npm test context-manager.test.ts

# Expected output
✓ tests/context-manager.test.ts (19 tests) 173ms
  Test Files  1 passed (1)
       Tests  19 passed (19)
```

## Debugging

```typescript
import { getContextStats } from './lib/context-manager';

// Get statistics
const stats = getContextStats();

console.log(`Conversations: ${stats.conversations}`);
console.log(`Total executions: ${stats.toolExecutions}`);
console.log(`Successful executions: ${stats.successfulExecutions}`);
console.log(`ChromaDB available: ${stats.chromaAvailable}`);
```

## Performance Tips

1. **Limit queries:** Use `limit` parameter (default: 5)
2. **Prune regularly:** Call `pruneOldConversations()` weekly
3. **Store selectively:** Only store successful, high-confidence executions
4. **Cache contexts:** Store frequently-used conversations in memory

## Error Handling

The Context Manager **never throws errors**:

```typescript
// Safe - always returns array (empty if failed)
const similar = await findSimilarExecutions(toolName, imageAnalysis);

// Safe - always returns null if not found
const context = await getConversationContext('nonexistent-id');

// Safe - no-op if fails
await storeToolExecution(conversationId, execution);
```

## Migration to ChromaDB

Currently runs in-memory. To enable ChromaDB persistence:

1. Install ChromaDB MCP server
2. Configure MCP connection
3. No code changes needed!
4. System automatically uses ChromaDB when available

## Cheat Sheet

```typescript
// INITIALIZATION
await initializeCollections();

// STORE CONVERSATION
await storeConversationTurn(id, userMsg, aiMsg, imageAnalysis);

// STORE SUCCESS
await storeToolExecution(id, {
  toolName: 'color_knockout',
  parameters: { tolerance: 30 },
  success: true,
  confidence: 95,
  resultMetrics: { pixelsChanged: 500000, ... },
  imageSpecsSnapshot: { width: 1920, ... },
  timestamp: Date.now()
});

// FIND SIMILAR
const similar = await findSimilarExecutions(toolName, imageAnalysis, 5);

// GET CONTEXT
const context = await getConversationContext(id);

// GET STATS
const stats = getContextStats();

// PRUNE OLD
await pruneOldConversations(100);

// CLEAR ALL (testing)
await clearAllContext();
```

## Files

- **Implementation:** `/Users/makko/Code/OneFlow/flow-editor/lib/context-manager.ts`
- **Integration:** `/Users/makko/Code/OneFlow/flow-editor/lib/ai-design-partner-integration.ts`
- **Tests:** `/Users/makko/Code/OneFlow/flow-editor/tests/context-manager.test.ts`
- **Docs:** `/Users/makko/Code/OneFlow/flow-editor/docs/CONTEXT_MANAGER.md`

## Support

- Full documentation: `docs/CONTEXT_MANAGER.md`
- Integration example: `lib/ai-design-partner-integration.ts`
- Test examples: `tests/context-manager.test.ts`

---

**That's it!** You now have a learning system that improves with every use.
