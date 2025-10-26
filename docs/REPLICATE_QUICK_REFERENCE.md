# Replicate API - Quick Reference Guide

## Setup (5 minutes)

```bash
# 1. Get API token from https://replicate.com/account/api-tokens

# 2. Add to .env.local
REPLICATE_API_TOKEN=r8_xxx...

# 3. Install npm package (already installed)
npm install replicate
```

## Common Tasks

### Remove Background

```typescript
import { editImageWithProgress } from '@/lib/replicate-service';

const result = await editImageWithProgress(
  'https://example.com/image.jpg',
  'Remove the background and make it transparent',
  (message) => console.log(message) // Progress callback
);

console.log('Result:', result); // URL of edited image
```

### Apply Filter/Effect

```typescript
const result = await editImageWithProgress(
  imageUrl,
  'Apply a warm vintage film filter. Increase saturation by 20%'
);
```

### Pose Transfer

```typescript
const result = await editImageWithProgress(
  imageUrl,
  `Transfer the yoga pose from image 1 to image 2`,
  // Note: pass array with 2 images in input
);
```

### Generate Multiple Variations

```typescript
const prediction = await createPrediction({
  version: 'qwen/qwen-image-edit-plus',
  input: {
    image: [imageUrl],
    prompt: 'Apply a summer filter',
    num_outputs: 3, // Get 3 variations
  },
});

const completed = await pollPrediction({ predictionId: prediction.id });
const imageUrls = completed.output.images; // Array of 3 URLs
```

### Reproducible Results (Same Seed)

```typescript
const seed = 12345;

const result1 = await editImageWithProgress(
  imageUrl,
  'Apply sunset filter',
  undefined,
  { seed } // Add seed option
);

// Same image, same prompt, same seed = identical output
const result2 = await editImageWithProgress(
  imageUrl,
  'Apply sunset filter',
  undefined,
  { seed }
);

// result1 === result2
```

## React Component Usage

### Basic Edit Panel

```typescript
import { ImageEditorPanel } from '@/components/image-editor-panel';

export default function Page() {
  return (
    <ImageEditorPanel
      imageUrl="https://example.com/photo.jpg"
      onImageEdited={(url) => {
        console.log('Edited image:', url);
      }}
    />
  );
}
```

### Before/After Comparison

```typescript
import { ImageComparison } from '@/components/image-comparison';

export default function Page() {
  return (
    <ImageComparison
      before="https://example.com/original.jpg"
      after="https://example.com/edited.jpg"
      title="Before / After"
    />
  );
}
```

### Batch Processing

```typescript
import { BatchEditorPanel } from '@/components/batch-editor-panel';

export default function Page() {
  return <BatchEditorPanel />;
}
```

## API Routes

### Create Prediction (POST)

```bash
curl -X POST http://localhost:3000/api/replicate/predictions \
  -H "Content-Type: application/json" \
  -d '{
    "version": "qwen/qwen-image-edit-plus",
    "input": {
      "image": ["https://example.com/photo.jpg"],
      "prompt": "Remove background"
    }
  }'

# Response: { id: "...", status: "starting", ... }
```

### Get Status (GET)

```bash
curl http://localhost:3000/api/replicate/predictions/abc-123-def-456

# Response: { id: "...", status: "succeeded", output: {...}, ... }
```

### Cancel Prediction (DELETE)

```bash
curl -X DELETE http://localhost:3000/api/replicate/predictions/abc-123-def-456

# Response: { id: "...", status: "canceled", ... }
```

### List Predictions (GET)

```bash
curl http://localhost:3000/api/replicate/predictions?limit=10&offset=0

# Response: { results: [...], next: "..." }
```

## Error Handling

### Common Errors

```typescript
import { editImageWithProgress } from '@/lib/replicate-service';
import { handleReplicateError } from '@/lib/replicate-error-handler';

try {
  const result = await editImageWithProgress(imageUrl, prompt);
} catch (error) {
  const { userMessage, recoverySteps } = handleReplicateError(error);
  console.log('User message:', userMessage);
  console.log('Try:', recoverySteps);
}
```

### Error Codes

| Code | Meaning | Fix |
|------|---------|-----|
| `RATE_LIMIT_ERROR` | Too many requests | Wait 1+ minute, reduce image size |
| `FILE_TOO_LARGE` | Image > 10MB | Compress/resize image |
| `AUTHENTICATION_ERROR` | Token invalid | Check REPLICATE_API_TOKEN |
| `TIMEOUT` | Process took > 5 min | Try simpler prompt, fewer steps |
| `PROCESSING_ERROR` | Model failed | Try different prompt or image |

## Performance Tips

### 1. Image Optimization

```typescript
import sharp from 'sharp';

// Optimize before sending to Replicate
const optimized = await sharp(imageBuffer)
  .resize(1024, 1024, {
    fit: 'inside',
    withoutEnlargement: true,
  })
  .jpeg({ quality: 85 })
  .toBuffer();
```

### 2. Adjust Inference Steps

```typescript
// Faster (lower quality)
num_inference_steps: 20  // ~30 seconds

// Balanced
num_inference_steps: 50  // ~60 seconds (default)

// Slower (high quality)
num_inference_steps: 100 // ~120 seconds
```

### 3. Cache Results

```typescript
const cache = new Map<string, string>();

async function editWithCache(imageUrl: string, prompt: string) {
  const key = `${imageUrl}-${prompt}`;

  if (cache.has(key)) {
    return cache.get(key)!;
  }

  const result = await editImageWithProgress(imageUrl, prompt);
  cache.set(key, result);
  return result;
}
```

### 4. Batch Processing

```typescript
const queue = new ImageEditingQueue(3); // Max 3 concurrent

const results = await queue.editBatch(
  [
    { url: 'image1.jpg', prompt: 'Remove bg' },
    { url: 'image2.jpg', prompt: 'Remove bg' },
    // ... more images
  ],
  (index, result) => console.log(`Image ${index} done`)
);
```

## Cost Estimation

```typescript
import { ReplicateCostCalculator } from '@/lib/replicate-service';

const calculator = new ReplicateCostCalculator();

// Single prediction
const cost = calculator.estimateCost(
  'qwen/qwen-image-edit-plus',
  imageBuffer.byteLength,
  50 // inference steps
);

console.log('Est. cost: $' + cost.estimatedCost.toFixed(4));
console.log('Est. time: ' + cost.processingTimeSeconds + 's');

// Batch
const batchCost = calculator.estimateBatchCost([
  { model: 'qwen/qwen-image-edit-plus', inputSize: 1024 * 1024 * 5 },
  { model: 'qwen/qwen-image-edit-plus', inputSize: 1024 * 1024 * 3 },
]);

console.log('Total: $' + batchCost.total.toFixed(4));
```

## Webhook Setup

### 1. Create Handler

```typescript
// /app/api/webhooks/replicate/route.ts
export async function POST(request: NextRequest) {
  const { id, status, output, error } = await request.json();

  if (status === 'succeeded') {
    // Save result to database
    // Notify user
  } else if (status === 'failed') {
    // Log error
    // Notify user
  }

  return NextResponse.json({ received: true });
}
```

### 2. Create with Webhook

```typescript
const prediction = await createPrediction({
  version: 'qwen/qwen-image-edit-plus',
  input: { image: [url], prompt },
  webhook: 'https://example.com/api/webhooks/replicate',
  webhook_events_filter: ['completed'],
});
```

## Monitoring

### Log Predictions

```typescript
import { PredictionMonitor } from '@/lib/replicate-service';

const monitor = new PredictionMonitor();

// Log creation
monitor.recordPrediction('pred-123', 'qwen/qwen-image-edit-plus', 'starting');

// Log completion
monitor.markCompleted('pred-123', 'succeeded', inputSize, outputSize);

// Get metrics
const metrics = monitor.getMetrics('pred-123');
console.log(`Took ${metrics.totalTime}ms`);
```

### Track Budget

```typescript
import { BudgetMonitor } from '@/lib/replicate-service';

const budget = new BudgetMonitor(100); // $100/month limit

budget.recordSpend(0.05); // $0.05 per prediction

console.log('Remaining: $' + budget.getRemainingBudget().toFixed(2));
console.log('Used: ' + budget.getUsagePercentage().toFixed(1) + '%');
```

## Security Checklist

- [ ] API token in `.env.local` (not committed)
- [ ] Use HTTPS for webhooks
- [ ] Validate webhook signatures
- [ ] Rate limit by user
- [ ] Sanitize user prompts
- [ ] Validate image URLs (HTTPS only, known domains)
- [ ] Log sensitive operations
- [ ] Rotate token periodically
- [ ] Monitor for unusual usage

## Debugging

### Enable Verbose Logging

```typescript
const prediction = await createPrediction({
  version: 'qwen/qwen-image-edit-plus',
  input: {
    image: [url],
    prompt: 'Test',
  },
});

// Check logs in Next.js server console
console.log('Prediction ID:', prediction.id);

const completed = await pollPrediction({
  predictionId: prediction.id,
  onStatus: (msg, pred) => {
    console.log('Status:', msg);
    console.log('Logs:', pred.logs);
  },
});
```

### Test API Directly

```bash
# Test create prediction
curl -X POST http://localhost:3000/api/replicate/predictions \
  -H "Content-Type: application/json" \
  -d '{"version":"qwen/qwen-image-edit-plus","input":{"image":["https://example.com/test.jpg"],"prompt":"test"}}'

# Test get status
curl http://localhost:3000/api/replicate/predictions/test-id

# Test list
curl http://localhost:3000/api/replicate/predictions
```

## Resources

- API Docs: [/docs/REPLICATE_API_INTEGRATION.md](/docs/REPLICATE_API_INTEGRATION.md)
- Implementation: [/docs/REPLICATE_IMPLEMENTATION_GUIDE.md](/docs/REPLICATE_IMPLEMENTATION_GUIDE.md)
- OpenAPI Spec: [/docs/replicate-openapi.yaml](/docs/replicate-openapi.yaml)
- Postman Collection: [/docs/replicate-postman-collection.json](/docs/replicate-postman-collection.json)
- Type Definitions: [/lib/types/replicate-api.ts](/lib/types/replicate-api.ts)

## Support

- Email: support@example.com
- Docs: https://replicate.com/docs
- Discord: https://discord.gg/replicate
- GitHub: https://github.com/replicate/replicate-js

---

**Last Updated:** October 20, 2024
**Version:** 1.0.0
