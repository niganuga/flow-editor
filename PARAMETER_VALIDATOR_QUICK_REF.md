# Parameter Validator - Quick Reference

## Import

```typescript
import { validateToolParameters, quickValidate } from './lib/parameter-validator';
import type { ValidationResult } from './lib/parameter-validator';
```

## Basic Usage

### Full Validation (before tool execution)

```typescript
const validation = await validateToolParameters(
  toolName,      // 'color_knockout', 'recolor_image', etc.
  parameters,    // { colors: [...], tolerance: 30, ... }
  imageAnalysis, // From analyzeImage()
  imageUrl       // Blob URL or data URL
);

if (!validation.isValid) {
  console.error('Invalid:', validation.errors);
  return;
}

if (validation.confidence < 80) {
  console.warn('Low confidence:', validation.warnings);
}

// Execute tool
await executeToolFunction(toolName, parameters, imageUrl);
```

### Quick Validation (UI forms)

```typescript
const result = quickValidate(toolName, parameters);

if (!result.isValid) {
  setFormError(result.errors[0]);
  return;
}

// Schema valid - proceed with form
```

## ValidationResult Interface

```typescript
interface ValidationResult {
  isValid: boolean;              // Can this be executed?
  confidence: number;            // 0-100 (>95 = excellent)
  warnings: string[];            // Non-critical issues
  errors: string[];              // Blocking issues
  adjustedParameters?: any;      // Suggested improvements
  reasoning: string;             // Detailed explanation
  historicalConfidence?: number; // From past executions
}
```

## Confidence Bands

| Score | Meaning | Action |
|-------|---------|--------|
| 95-100 | Excellent | Execute confidently |
| 80-94 | Good | Safe to execute, minor warnings |
| 70-79 | Fair | Review warnings, consider adjustments |
| 50-69 | Poor | High risk of failure |
| 0-49 | Critical | Will likely fail, invalid parameters |

## Validation Checks by Tool

### Color Knockout
- ✅ Colors exist in image (pixel sampling)
- ✅ Tolerance matches noise level
- ✅ Coverage reasonable (1-95%)
- ✅ Format supports transparency

### Recolor Image
- ✅ Valid palette indices
- ✅ Perceptual color difference (DeltaE >5)
- ✅ Tolerance matches complexity
- ✅ Mapping count reasonable

### Texture Cut
- ✅ Valid texture type
- ✅ Amount in range (0.1-0.9)
- ✅ Scale appropriate for size
- ✅ No custom textures (automated mode)

### Upscaler
- ✅ Output ≤16MP
- ✅ Scale factor 2-10x
- ✅ Image quality suitable (sharpness ≥40)
- ✅ Noise level manageable

### Background Remover
- ✅ Image size reasonable (<25MP)
- ✅ Clear subject detected
- ✅ Transparency warnings

## Common Patterns

### Pattern 1: Validate then Execute

```typescript
async function executeWithValidation(tool, params, analysis, imageUrl) {
  const validation = await validateToolParameters(tool, params, analysis, imageUrl);

  if (!validation.isValid) {
    return { success: false, error: validation.errors[0] };
  }

  if (validation.confidence < 80 && validation.adjustedParameters) {
    params = validation.adjustedParameters; // Use adjusted params
  }

  return await executeToolFunction(tool, params, imageUrl);
}
```

### Pattern 2: Form Validation

```typescript
function validateForm(formData) {
  const result = quickValidate(toolName, formData);

  if (!result.isValid) {
    return { valid: false, error: result.errors[0] };
  }

  return { valid: true };
}
```

### Pattern 3: Store Successful Execution

```typescript
if (execution.success && validation.confidence >= 70) {
  await storeToolExecution(conversationId, {
    toolName,
    parameters,
    success: true,
    confidence: validation.confidence,
    resultMetrics: metrics,
    imageSpecsSnapshot: analysis,
    timestamp: Date.now()
  });
}
```

## Error Handling

```typescript
try {
  const validation = await validateToolParameters(...);

  if (!validation.isValid) {
    throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
  }

  // Execute tool
} catch (error) {
  console.error('Validation error:', error);
  // Fall back gracefully
}
```

## Example Errors

### Schema Errors
```
❌ Missing required parameter: colors
❌ Parameter 'tolerance' has wrong type. Expected number, got string
❌ Parameter 'replaceMode' has invalid value 'fade'
```

### Color Errors
```
❌ Color #808080 not found in image (distance: 95.3)
⚠️  Color #ff0000 has weak match (distance: 42.1)
⚠️  Color #00ff00 is rare in image (0.05% of pixels)
```

### Parameter Warnings
```
⚠️  High noise (45/100). Tolerance 15 too strict. Suggest ≥25
⚠️  Mapping count (12) exceeds color count (5)
⚠️  Output size 207.4MP exceeds maximum 16MP
```

## Integration Checklist

- [ ] Import validator functions
- [ ] Get image analysis before validation
- [ ] Validate parameters before execution
- [ ] Check confidence score
- [ ] Handle warnings appropriately
- [ ] Use adjusted parameters if provided
- [ ] Store successful executions
- [ ] Show errors to users

## Performance Tips

- Use `quickValidate()` for instant UI feedback (< 1ms)
- Use full `validateToolParameters()` before execution (50-250ms)
- Color checking is fastest on smaller images
- Historical lookups are fast (in-memory)
- Validation is non-blocking (async)

## Debugging

### Enable Logging
```typescript
// The validator logs to console
console.log('[ParameterValidator] ...')
```

### Check Reasoning
```typescript
console.log('Validation reasoning:', validation.reasoning);
```

### Inspect Adjusted Parameters
```typescript
if (validation.adjustedParameters) {
  console.log('Suggested adjustments:', validation.adjustedParameters);
}
```

## Common Issues

### "Color not found in image"
**Cause:** Claude hallucinated a color not present in the image
**Solution:** Use adjusted parameters or ask user to select color

### "Tolerance too strict/loose"
**Cause:** Tolerance doesn't match image noise level
**Solution:** Use adjusted tolerance from `adjustedParameters`

### "Output exceeds maximum"
**Cause:** Scale factor would create image >16MP
**Solution:** Reduce scale factor to suggested value in error

### "Invalid palette index"
**Cause:** Index out of bounds for dominant colors
**Solution:** Re-extract palette or use valid index range (0 to N-1)

## Files

- **Implementation:** `/lib/parameter-validator.ts`
- **Tests:** `/tests/parameter-validator.test.ts`
- **Full Guide:** `/PARAMETER_VALIDATOR_GUIDE.md`
- **Status:** `/PARAMETER_VALIDATOR_STATUS.md`

## Quick Test

```bash
npm run test -- parameter-validator.test.ts
```

## Support

For detailed documentation, see `/PARAMETER_VALIDATOR_GUIDE.md`

---

**Version:** 1.0.0
**Last Updated:** 2025-10-12
