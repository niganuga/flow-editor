# Replicate Integration - Developer Checklist

## Pre-Development

- [ ] Read REPLICATE_QUICK_REFERENCE.md (5 min)
- [ ] Get API token from https://replicate.com/account/api-tokens
- [ ] Add `REPLICATE_API_TOKEN=r8_xxx...` to `.env.local`
- [ ] Verify setup: npm run dev and check for errors
- [ ] Review TypeScript types: `/lib/types/replicate-api.ts`
- [ ] Import Postman collection: `docs/replicate-postman-collection.json`

## Basic Implementation

### Setup Phase

- [ ] Create `.env.local` with `REPLICATE_API_TOKEN`
- [ ] Verify environment variable loads correctly
- [ ] Test API connectivity:
  ```bash
  curl -X POST http://localhost:3000/api/replicate/predictions \
    -H "Content-Type: application/json" \
    -d '{"version":"qwen/qwen-image-edit-plus","input":{"image":["https://example.com/test.jpg"],"prompt":"test"}}'
  ```
- [ ] Confirm token format starts with `r8_`

### API Integration Phase

- [ ] Use existing client library: `/lib/api/replicate.ts`
- [ ] Import types: `import type { ... } from '@/lib/types/replicate-api'`
- [ ] Verify all routes exist:
  - [ ] POST `/api/replicate/predictions`
  - [ ] GET `/api/replicate/predictions/{id}`
  - [ ] DELETE `/api/replicate/predictions/{id}` (optional)
  - [ ] GET `/api/replicate/predictions` (optional)

### Error Handling Phase

- [ ] Implement try-catch blocks
- [ ] Handle 4xx errors (validation, auth, rate limit)
- [ ] Handle 5xx errors (server, timeout)
- [ ] Implement exponential backoff for retries
- [ ] Test error scenarios with Postman
- [ ] Log errors with request IDs for debugging

### Testing Phase

- [ ] Create sample test image (small, < 1MB)
- [ ] Test with Postman collection
- [ ] Try each use case workflow:
  - [ ] Remove background
  - [ ] Apply filter
  - [ ] Generate variations
  - [ ] With webhook (optional)
- [ ] Verify response format matches types
- [ ] Check error responses are formatted correctly

## Feature Implementation

### Remove Background Feature

- [ ] Copy implementation from REPLICATE_IMPLEMENTATION_GUIDE.md > Example 1
- [ ] Create React component:
  - [ ] Input field for image URL
  - [ ] Prompt input: "Remove the background completely"
  - [ ] Progress indicator
  - [ ] Result display
- [ ] Add before/after comparison component
- [ ] Test with Postman
- [ ] Unit test the service function
- [ ] E2E test with real image

### Apply Filter Feature

- [ ] Create filter selection UI
- [ ] Map filter to prompt:
  - [ ] Vintage: "Apply warm vintage film filter"
  - [ ] Bright: "Increase brightness by 30%"
  - [ ] Saturated: "Increase saturation by 40%"
  - [ ] etc.
- [ ] Test with various images
- [ ] Optimize inference steps per filter

### Batch Processing Feature

- [ ] Implement `ImageEditingQueue` from guide
- [ ] Create batch upload component:
  - [ ] Multiple file selection
  - [ ] Preview thumbnails
  - [ ] Prompt input
  - [ ] Progress display
- [ ] Test with 5-10 images
- [ ] Monitor concurrency limits
- [ ] Add error handling per image

### Advanced Features

- [ ] Pose transfer (multi-image):
  - [ ] Select reference image
  - [ ] Select target image
  - [ ] Verify both pass validation
  - [ ] Test result quality

- [ ] Reproducible results (seed):
  - [ ] Generate deterministic seed from content
  - [ ] Test same seed gives same output
  - [ ] Allow user to specify seed

- [ ] Webhooks (async processing):
  - [ ] Set up webhook handler: `/app/api/webhooks/replicate/route.ts`
  - [ ] Implement webhook verification
  - [ ] Test webhook delivery
  - [ ] Update UI when notification received

## Component Implementation

### Image Editor Panel

- [ ] Create component from REPLICATE_IMPLEMENTATION_GUIDE.md
- [ ] Add to page/layout
- [ ] Style to match UI design
- [ ] Test all states:
  - [ ] Initial (empty)
  - [ ] Processing
  - [ ] Success
  - [ ] Error
- [ ] Add loading animation
- [ ] Add error message display
- [ ] Test on mobile/tablet

### Image Comparison Slider

- [ ] Create component from guide
- [ ] Add to results page
- [ ] Test mouse drag
- [ ] Test touch events (mobile)
- [ ] Verify image loading
- [ ] Test with various aspect ratios

### Batch Editor

- [ ] Create component from guide
- [ ] Test file selection
- [ ] Test progress indication
- [ ] Test result display
- [ ] Test error per image
- [ ] Test cancellation

## Quality Assurance

### Unit Tests

- [ ] Test prediction creation:
  ```typescript
  const result = await editImageSimple(url, prompt);
  expect(result).toMatch(/^https/);
  ```

- [ ] Test error handling:
  ```typescript
  const error = handleReplicateError(new Error('Network failed'));
  expect(error.severity).toBe('error');
  ```

- [ ] Test type safety:
  ```typescript
  const input: QwenImageEditInput = { ... };
  // TypeScript should catch type errors
  ```

- [ ] Test rate limiting:
  ```typescript
  const limiter = new UserRateLimiter(redis);
  const { allowed } = await limiter.checkLimit('user-1');
  ```

### Integration Tests

- [ ] Test full flow with real API:
  ```typescript
  const pred = await createPrediction({...});
  const completed = await pollPrediction({predictionId: pred.id});
  expect(completed.status).toBe('succeeded');
  ```

- [ ] Test API routes:
  ```typescript
  const response = await fetch('/api/replicate/predictions', {...});
  expect(response.status).toBe(201);
  ```

- [ ] Test error responses:
  ```typescript
  const response = await fetch('/api/replicate/predictions', {
    body: JSON.stringify({}) // invalid
  });
  expect(response.status).toBe(400);
  ```

### Manual Testing

- [ ] Test with Postman collection
- [ ] Test each workflow scenario
- [ ] Test error scenarios:
  - [ ] Invalid image URL
  - [ ] Oversized image
  - [ ] Empty prompt
  - [ ] Network timeout
  - [ ] Rate limit (if possible)
- [ ] Test UI responsiveness
- [ ] Test on different browsers
- [ ] Test on mobile

## Performance & Optimization

### Image Optimization

- [ ] Implement image compression before sending:
  ```typescript
  const optimized = await optimizeImageForProcessing(imageBuffer);
  ```
- [ ] Test with various image sizes:
  - [ ] Small (< 1MB)
  - [ ] Medium (1-5MB)
  - [ ] Large (5-10MB)
- [ ] Measure performance impact

### Request Optimization

- [ ] Use appropriate inference steps:
  - [ ] 20-30 for fast/cheap
  - [ ] 50 for balanced (default)
  - [ ] 75+ for high quality
- [ ] Test different guidance scales:
  - [ ] 5.0 for relaxed
  - [ ] 7.5 for balanced
  - [ ] 10.0+ for strict

### Caching

- [ ] Implement result caching:
  ```typescript
  const cache = new PredictionCache();
  ```
- [ ] Test cache hit/miss scenarios
- [ ] Measure latency improvement
- [ ] Monitor cache size

### Concurrency

- [ ] Set appropriate queue limits:
  - [ ] 1-2 for low-load apps
  - [ ] 3-5 for medium-load
  - [ ] 5+ for high-load (with caution)
- [ ] Monitor queue depth
- [ ] Test behavior under load

## Security

### API Token

- [ ] Token stored in `.env.local` only
- [ ] Never logged or exposed in client code
- [ ] Use `SecureTokenManager.maskToken()` in logs
- [ ] Rotate token after development
- [ ] Different tokens for dev/staging/prod

### Input Validation

- [ ] Validate image URLs:
  - [ ] Must be HTTPS
  - [ ] Must be from allowed domains
  - [ ] Check URL format
- [ ] Sanitize user prompts:
  - [ ] Check for injection patterns
  - [ ] Limit prompt length (1000 chars)
  - [ ] Remove dangerous patterns
- [ ] Validate file sizes:
  - [ ] Images < 10MB
  - [ ] Compressed before upload

### Rate Limiting

- [ ] Implement per-user rate limiting:
  ```typescript
  const limiter = new UserRateLimiter(redis);
  const { allowed } = await limiter.checkLimit(userId);
  ```
- [ ] Test rate limit enforcement
- [ ] Monitor for abuse
- [ ] Set alerts for unusual patterns

### Logging

- [ ] Log all API calls with request IDs
- [ ] Never log sensitive data (tokens, full URLs)
- [ ] Use structured logging format
- [ ] Implement log aggregation
- [ ] Monitor for errors

### Webhooks (if implemented)

- [ ] Implement signature verification
- [ ] Use HTTPS only
- [ ] Validate webhook IP addresses
- [ ] Set webhook timeout
- [ ] Retry failed deliveries

## Monitoring & Debugging

### Logging Setup

- [ ] Configure logging level (dev: debug, prod: info)
- [ ] Add request ID to all logs:
  ```typescript
  console.log(`[${requestId}] Processing...`);
  ```
- [ ] Log prediction lifecycle events
- [ ] Log errors with full context

### Monitoring Metrics

- [ ] Track prediction success rate
- [ ] Monitor average processing time
- [ ] Track cost per prediction
- [ ] Monitor error rates by code
- [ ] Track user activity

### Debugging Tools

- [ ] Enable verbose logging in development
- [ ] Use Postman for API testing
- [ ] Use browser DevTools for frontend
- [ ] Monitor network requests
- [ ] Check server logs: `npm run dev`

### Troubleshooting Guide

- [ ] Check `.env.local` has `REPLICATE_API_TOKEN`
- [ ] Verify token format: `r8_xxx...`
- [ ] Test API directly with curl
- [ ] Check request IDs in logs
- [ ] Review error codes in documentation
- [ ] Test with Postman collection

## Documentation

### Code Documentation

- [ ] Add JSDoc to all functions
- [ ] Document parameters with types
- [ ] Add examples in JSDoc
- [ ] Document error cases
- [ ] Keep README updated

### Team Documentation

- [ ] Share REPLICATE_QUICK_REFERENCE.md
- [ ] Share REPLICATE_API_INTEGRATION.md
- [ ] Explain key patterns in team wiki
- [ ] Document deployment process
- [ ] Document support process

### API Documentation

- [ ] Keep OpenAPI spec updated
- [ ] Document custom modifications
- [ ] Document rate limits
- [ ] Document error codes
- [ ] Document webhook format

## Deployment

### Pre-Deployment

- [ ] All tests passing
- [ ] No console errors/warnings
- [ ] Security review completed
- [ ] Performance benchmarked
- [ ] Documentation updated
- [ ] Team review completed

### Staging Deployment

- [ ] Deploy to staging environment
- [ ] Configure staging token
- [ ] Run full test suite
- [ ] Manual testing on staging
- [ ] Monitor for 24 hours
- [ ] Check logs for errors

### Production Deployment

- [ ] Configure production token
- [ ] Set up monitoring/alerts
- [ ] Prepare rollback plan
- [ ] Deploy during low-traffic period
- [ ] Monitor closely first 24 hours
- [ ] Gradual rollout if possible

### Post-Deployment

- [ ] Verify all endpoints working
- [ ] Check logs for errors
- [ ] Monitor error rates
- [ ] Monitor cost
- [ ] Validate user experience
- [ ] Document any issues

## Post-Launch

- [ ] Monitor cost trends
- [ ] Collect user feedback
- [ ] Optimize based on usage patterns
- [ ] Plan V2 improvements
- [ ] Schedule regular reviews
- [ ] Keep documentation updated

## Maintenance

### Weekly

- [ ] Check error logs
- [ ] Review cost trends
- [ ] Monitor rate limit usage
- [ ] Check for any issues

### Monthly

- [ ] Full system review
- [ ] Performance optimization review
- [ ] Cost analysis
- [ ] Security audit
- [ ] Update documentation

### Quarterly

- [ ] Plan new features
- [ ] Review API changes
- [ ] Update dependencies
- [ ] Performance tuning
- [ ] Team training

## Support Resources

### Documentation Files

- Quick Reference: `/docs/REPLICATE_QUICK_REFERENCE.md`
- Full API Guide: `/docs/REPLICATE_API_INTEGRATION.md`
- Implementation: `/docs/REPLICATE_IMPLEMENTATION_GUIDE.md`
- OpenAPI Spec: `/docs/replicate-openapi.yaml`
- Postman Collection: `/docs/replicate-postman-collection.json`

### External Resources

- Replicate Docs: https://replicate.com/docs
- API Reference: https://replicate.com/docs/api/rest
- Model Info: https://replicate.com/explore
- Discord: https://discord.gg/replicate

### Getting Help

1. Check Quick Reference first
2. Search implementation guide
3. Test with Postman collection
4. Review type definitions
5. Check error logs with request ID
6. Ask in team Slack/Discord
7. Create GitHub issue

---

**Estimated Time:**
- Setup: 30 minutes
- Basic feature: 2-4 hours
- Advanced feature: 4-8 hours
- Full integration: 1-2 weeks

**Difficulty:** Medium
**Requirements:** Node.js, TypeScript, React knowledge
