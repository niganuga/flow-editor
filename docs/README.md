# Replicate AI API Integration Documentation

Complete production-ready API documentation for integrating Replicate's image editing and AI processing capabilities into the Flow Editor application.

## Quick Navigation

### For Different Needs

**Just starting out?** → Read: [REPLICATE_QUICK_REFERENCE.md](./REPLICATE_QUICK_REFERENCE.md)
- 5-minute setup
- Copy-paste code snippets
- Common errors and fixes

**Building a feature?** → Read: [REPLICATE_IMPLEMENTATION_GUIDE.md](./REPLICATE_IMPLEMENTATION_GUIDE.md)
- Real React components
- Advanced patterns
- Complete examples

**Need complete reference?** → Read: [REPLICATE_API_INTEGRATION.md](./REPLICATE_API_INTEGRATION.md)
- All API details
- Error handling strategies
- Best practices
- Security guidelines

**Following a checklist?** → Read: [REPLICATE_DEVELOPER_CHECKLIST.md](./REPLICATE_DEVELOPER_CHECKLIST.md)
- Pre-development setup
- Implementation phases
- Testing checklists
- Deployment guide

**Project overview?** → Read: [REPLICATE_DOCUMENTATION_SUMMARY.md](./REPLICATE_DOCUMENTATION_SUMMARY.md)
- All files explained
- Architecture overview
- Getting started guide

## Documentation Files

### Markdown Guides (Read First)

| File | Purpose | Time | When to Read |
|------|---------|------|-------------|
| [REPLICATE_QUICK_REFERENCE.md](./REPLICATE_QUICK_REFERENCE.md) | Quick lookup and code snippets | 5-10 min | Need to implement something now |
| [REPLICATE_API_INTEGRATION.md](./REPLICATE_API_INTEGRATION.md) | Complete API reference | 30-45 min | Need deep understanding |
| [REPLICATE_IMPLEMENTATION_GUIDE.md](./REPLICATE_IMPLEMENTATION_GUIDE.md) | Code examples and patterns | 20-30 min | Building features |
| [REPLICATE_DEVELOPER_CHECKLIST.md](./REPLICATE_DEVELOPER_CHECKLIST.md) | Step-by-step guide | 60+ min | Following process |
| [REPLICATE_DOCUMENTATION_SUMMARY.md](./REPLICATE_DOCUMENTATION_SUMMARY.md) | Overview of all documentation | 10-15 min | Project kickoff |

### API Specifications

| File | Format | Purpose | Use When |
|------|--------|---------|----------|
| [replicate-openapi.yaml](./replicate-openapi.yaml) | OpenAPI 3.0 | Formal API specification | Sharing with external teams, API doc tools |
| [replicate-postman-collection.json](./replicate-postman-collection.json) | Postman Collection | Ready-to-use API tests | Testing endpoints, learning API |

### Code & Types

| Location | Purpose |
|----------|---------|
| `/lib/types/replicate-api.ts` | TypeScript type definitions (50+ interfaces) |
| `/lib/api/replicate.ts` | Client library for predictions |
| `/app/api/replicate/predictions/route.ts` | POST/GET prediction endpoints |
| `/app/api/replicate/predictions/[id]/route.ts` | GET/DELETE prediction endpoints |

## 5-Minute Setup

```bash
# 1. Get API token (visit https://replicate.com/account/api-tokens)
# Copy your token

# 2. Add to .env.local
echo "REPLICATE_API_TOKEN=r8_xxx..." >> .env.local

# 3. Done! Start using:
npm run dev
```

## Common Tasks

### Remove Image Background

```typescript
import { editImageWithProgress } from '@/lib/replicate-service';

const result = await editImageWithProgress(
  'https://example.com/photo.jpg',
  'Remove the background completely. Make it transparent.',
  (message) => console.log(message)
);
```

See: [Quick Reference](./REPLICATE_QUICK_REFERENCE.md) > Remove Background

### Apply Image Filter

```typescript
const result = await editImageWithProgress(
  imageUrl,
  'Apply a warm vintage film filter with increased saturation'
);
```

See: [Quick Reference](./REPLICATE_QUICK_REFERENCE.md) > Apply Filter

### Transfer Pose Between Images

```typescript
const result = await editImageWithProgress(
  imageUrl,
  'Transfer the yoga pose from image 1 to image 2'
);
```

See: [Implementation Guide](./REPLICATE_IMPLEMENTATION_GUIDE.md) > Pose Transfer

### Batch Process Multiple Images

```typescript
const queue = new ImageEditingQueue(3);
const results = await queue.editBatch([
  { url: 'image1.jpg', prompt: 'Remove bg' },
  { url: 'image2.jpg', prompt: 'Remove bg' },
  // more...
]);
```

See: [Implementation Guide](./REPLICATE_IMPLEMENTATION_GUIDE.md) > Batch Processing

## API Endpoints

### REST API

```
POST   /api/replicate/predictions          Create prediction
GET    /api/replicate/predictions          List predictions
GET    /api/replicate/predictions/{id}     Get status
DELETE /api/replicate/predictions/{id}     Cancel prediction
POST   /api/webhooks/replicate             Handle webhooks
```

Full specification: [replicate-openapi.yaml](./replicate-openapi.yaml)

### Using with Fetch

```typescript
// Create prediction
const response = await fetch('/api/replicate/predictions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    version: 'qwen/qwen-image-edit-plus',
    input: {
      image: ['https://example.com/photo.jpg'],
      prompt: 'Remove background'
    }
  })
});

const prediction = await response.json();
console.log(prediction.id); // Use for polling
```

## React Components

### Image Editor Panel

```tsx
import { ImageEditorPanel } from '@/components/image-editor-panel';

export default function Page() {
  return (
    <ImageEditorPanel
      imageUrl={imageUrl}
      onImageEdited={(editedUrl) => {
        console.log('Done:', editedUrl);
      }}
    />
  );
}
```

### Image Comparison Slider

```tsx
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

### Batch Processor

```tsx
import { BatchEditorPanel } from '@/components/batch-editor-panel';

export default function Page() {
  return <BatchEditorPanel />;
}
```

See: [Implementation Guide](./REPLICATE_IMPLEMENTATION_GUIDE.md) > Components

## TypeScript Types

All operations are fully typed. Example:

```typescript
import type {
  ReplicatePrediction,
  QwenImageEditInput,
  CreatePredictionRequest,
} from '@/lib/types/replicate-api';

const input: QwenImageEditInput = {
  image: ['https://example.com/photo.jpg'],
  prompt: 'Remove background',
  guidance_scale: 7.5,
  num_inference_steps: 50,
};

const request: CreatePredictionRequest = {
  version: 'qwen/qwen-image-edit-plus',
  input,
};
```

See: `/lib/types/replicate-api.ts` for all 50+ type definitions

## Error Handling

### Simple

```typescript
try {
  const result = await editImageWithProgress(url, prompt);
} catch (error) {
  console.error('Failed:', error.message);
}
```

### With User Messages

```typescript
import { handleReplicateError } from '@/lib/replicate-error-handler';

try {
  const result = await editImageWithProgress(url, prompt);
} catch (error) {
  const { userMessage, recoverySteps } = handleReplicateError(error);
  console.error(userMessage); // Show to user
  console.info(recoverySteps); // Show recovery steps
}
```

### With Retry

```typescript
const result = await withRetry(
  () => editImageWithProgress(url, prompt),
  { maxAttempts: 3, initialDelayMs: 1000 }
);
```

See: [API Integration Guide](./REPLICATE_API_INTEGRATION.md) > Error Handling

## Testing

### Postman Collection

Import and test all endpoints:
1. Import: `docs/replicate-postman-collection.json`
2. Set variables:
   - `base_url` = `http://localhost:3000`
   - `image_url` = your test image
3. Run requests

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { editImageSimple } from '@/lib/replicate-service';

describe('Image Editing', () => {
  it('should edit image', async () => {
    const result = await editImageSimple(url, 'Remove background');
    expect(result).toMatch(/^https/);
  });
});
```

See: [Implementation Guide](./REPLICATE_IMPLEMENTATION_GUIDE.md) > Testing

## Performance Tips

### Optimize Images Before Upload

```typescript
const optimized = await optimizeImageForProcessing(imageBuffer, {
  maxWidth: 1024,
  maxHeight: 1024,
  quality: 85
});
```

### Choose Appropriate Quality

```typescript
// Fast & cheap
num_inference_steps: 20

// Balanced (default)
num_inference_steps: 50

// High quality
num_inference_steps: 100
```

### Batch Processing

```typescript
const queue = new ImageEditingQueue(3); // Max 3 concurrent
```

### Cache Results

```typescript
const cache = new PredictionCache();
cache.set(input, output);
```

See: [API Integration Guide](./REPLICATE_API_INTEGRATION.md) > Best Practices

## Security

### Checklist

- [ ] API token in `.env.local` only (never commit)
- [ ] Use HTTPS for all URLs
- [ ] Validate image URLs (from trusted domains)
- [ ] Sanitize user prompts
- [ ] Implement rate limiting per user
- [ ] Log errors (not tokens)
- [ ] Verify webhook signatures

See: [API Integration Guide](./REPLICATE_API_INTEGRATION.md) > Security Considerations

## Cost Management

### Estimate Costs

```typescript
const calculator = new ReplicateCostCalculator();
const cost = calculator.estimateCost(
  'qwen/qwen-image-edit-plus',
  imageSize,
  inferenceSteps
);

console.log('Est: $' + cost.estimatedCost);
console.log('Time: ' + cost.processingTimeSeconds + 's');
```

### Monitor Budget

```typescript
const budget = new BudgetMonitor(100); // $100/month
budget.recordSpend(0.05);
console.log('Remaining: $' + budget.getRemainingBudget());
```

See: [API Integration Guide](./REPLICATE_API_INTEGRATION.md) > Cost Optimization

## Troubleshooting

| Error | Solution |
|-------|----------|
| `REPLICATE_API_TOKEN not configured` | Add token to `.env.local` |
| `Rate limit exceeded (429)` | Wait 1+ minute, reduce size |
| `File too large (413)` | Compress to < 10MB |
| `Authentication failed (401)` | Verify token format (r8_xxx) |
| `Processing timed out` | Try simpler prompt or fewer steps |

See: [Quick Reference](./REPLICATE_QUICK_REFERENCE.md) > Common Errors

## Architecture

```
Client Request
    ↓
/api/replicate/predictions (route handler)
    ↓
Zod Validation
    ↓
Replicate API Call
    ↓
Response/Error Handling
    ↓
Client Response
    ↓
Frontend UI Components
    ↓
User Feedback
```

**Key Files:**
- Routes: `/app/api/replicate/`
- Client: `/lib/api/replicate.ts`
- Types: `/lib/types/replicate-api.ts`
- Components: `/components/` (image-editor-panel.tsx, etc.)

## Deployment

### Environment Variables

```bash
# Production
REPLICATE_API_TOKEN=r8_prod_xxx...

# Staging
REPLICATE_API_TOKEN=r8_staging_xxx...

# Development
REPLICATE_API_TOKEN=r8_dev_xxx...
```

### Health Check

```bash
# Test API is working
curl http://localhost:3000/api/replicate/predictions \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"version":"qwen/qwen-image-edit-plus","input":{"image":["https://example.com/test.jpg"],"prompt":"test"}}'
```

### Monitoring

- Monitor error rates
- Track cost trends
- Alert on rate limits
- Log all predictions (with request IDs)

See: [Developer Checklist](./REPLICATE_DEVELOPER_CHECKLIST.md) > Deployment

## Getting Help

### Documentation

1. **Quick lookup:** [Quick Reference](./REPLICATE_QUICK_REFERENCE.md)
2. **How-to guide:** [Implementation Guide](./REPLICATE_IMPLEMENTATION_GUIDE.md)
3. **Complete reference:** [API Integration Guide](./REPLICATE_API_INTEGRATION.md)
4. **Step-by-step:** [Developer Checklist](./REPLICATE_DEVELOPER_CHECKLIST.md)

### External Resources

- Replicate Docs: https://replicate.com/docs
- API Reference: https://replicate.com/docs/api/rest
- Model Explorer: https://replicate.com/explore
- Discord Community: https://discord.gg/replicate

### Support Channels

- Email: support@example.com
- Slack: #replicate-integration
- GitHub: Create an issue

## Summary

This documentation provides everything needed to:

✅ Understand Replicate API
✅ Set up and configure integration
✅ Implement features with code examples
✅ Handle errors gracefully
✅ Test with Postman
✅ Deploy to production
✅ Monitor and optimize
✅ Troubleshoot issues

**Start with:** [REPLICATE_QUICK_REFERENCE.md](./REPLICATE_QUICK_REFERENCE.md)

---

**Version:** 1.0.0
**Status:** Production Ready
**Last Updated:** October 20, 2024
**Maintained By:** Flow Editor Team
