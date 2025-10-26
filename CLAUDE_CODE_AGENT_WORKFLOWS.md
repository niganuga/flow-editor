# Claude Code Agent Workflows - Development Guide (2025)

## Overview

You have **46 specialized Claude Code sub-agents** that act as your development team. This document shows you how to leverage them for real codebase improvements, code quality, testing, and rapid feature development.

**Key Principle:** Sub-agents are specialized AI assistants that I (Claude) invoke to handle specific tasks with isolated context windows and specialized expertise.

---

## Understanding Your Agent Team

### What Are Sub-Agents?

Sub-agents enable:
1. **Parallelization**: Multiple agents work simultaneously on different tasks
2. **Context Management**: Each agent has isolated context, only sends relevant info back
3. **Specialization**: Task-specific configurations and system prompts
4. **Quality**: Dedicated experts for code review, testing, security, etc.

### Your 46-Agent Roster

**Development (11 agents)**
- frontend-developer, backend-architect, typescript-pro, javascript-pro
- nextjs-architecture-expert, fullstack-developer, mobile-developer
- ai-engineer, data-engineer, ui-ux-designer, debugger

**Quality & Testing (7 agents)**
- code-reviewer, test-automator, test-engineer, performance-profiler
- load-testing-specialist, performance-engineer, visual-regression-testing-agent

**Security & Compliance (4 agents)**
- security-auditor, security-engineer, compliance-specialist, web-accessibility-checker

**DevOps & Infrastructure (6 agents)**
- deployment-engineer, devops-troubleshooter, monitoring-specialist
- terraform-specialist, vercel-deployment-specialist

**Documentation (5 agents)**
- documentation-expert, technical-writer, api-documenter, changelog-generator

**Orchestration (4 agents)**
- workflow-orchestrator, context-manager, task-decomposition-expert, mcp-expert

**Specialized (9 agents)**
- vector-db-specialist, llm-observability-agent, error-detective
- prompt-engineer, database-architect, react-performance-optimizer
- supabase-realtime-optimizer, dx-optimizer, architect-reviewer

---

## Part 1: Real Development Workflows

### Workflow 1: Implement New Feature (Production-Quality)

**When to use:** Adding any new feature to the codebase

**Example:** "Add a new Blur Tool to the image editor"

**Agent Sequence:**
```
task-decomposition-expert (research)
  → nextjs-architecture-expert (design)
  → [frontend-developer + typescript-pro + test-engineer] (parallel build)
  → code-reviewer (quality check)
  → security-auditor (security scan)
  → documentation-expert (docs)
  → deployment-engineer (deploy)
```

**How You'd Ask Me:**
```
"I need to add a Blur Tool. Use task-decomposition-expert to break this down,
then coordinate parallel development with frontend-developer, typescript-pro,
and test-engineer. Have code-reviewer validate before we deploy."
```

**What Happens:**
1. **task-decomposition-expert** analyzes codebase:
   - Similar tools: ColorKnockoutPanel, RecolorPanel
   - Files needed: components/panels/blur-panel.tsx, lib/tools/blur.ts
   - Integration points: app/page.tsx (add to openPanels), bottom-dock.tsx
   - Test requirements: Visual regression, unit tests

2. **nextjs-architecture-expert** designs structure:
   - Canvas manipulation approach
   - State management (useImageStore)
   - API route if needed (app/api/blur/route.ts)

3. **Parallel Development** (3 agents simultaneously):
   - **frontend-developer**: BlurPanel UI component
   - **typescript-pro**: Blur algorithm (canvas filter)
   - **test-engineer**: Test suite

4. **code-reviewer**: Reviews all code for:
   - Type safety, error handling
   - Follows existing patterns (DraggablePanel)
   - Performance considerations

5. **security-auditor**: Scans for vulnerabilities

6. **documentation-expert**: Updates AI_TOOLS_DOCUMENTATION.md

**Time Savings:** 3-4 hours → 30 minutes with agents

---

### Workflow 2: Fix Production Bug

**When to use:** Debugging errors, performance issues, crashes

**Example:** "Recolor tool failing on large images"

**Agent Sequence:**
```
error-detective (analyze logs)
  → debugger (root cause)
  → typescript-pro (fix)
  → test-engineer (regression test)
  → code-reviewer (review)
  → deployment-engineer (hotfix)
```

**How You'd Ask Me:**
```
"The recolor tool is timing out on images >5MB. Use error-detective to analyze,
then debugger to find root cause. Fix with typescript-pro and add regression
tests. Deploy as hotfix."
```

**What Happens:**
1. **error-detective** analyzes:
   - Reads `lib/tools/recolor.ts`
   - Identifies: No image compression before processing
   - Stack trace shows: `extractColors()` timing out at line 89

2. **debugger** determines:
   ```typescript
   // ISSUE: Processing full 5MB image in browser
   const image = await loadImage(imageUrl) // 5000x5000px

   // FIX NEEDED: Resize for color extraction
   const resized = resizeImage(image, { maxWidth: 1000 })
   ```

3. **typescript-pro** implements fix:
   - Adds compression utility
   - Updates extractColors to resize
   - Maintains quality for final output

4. **test-engineer** adds test:
   ```typescript
   test('recolor handles large images', async () => {
     const largeImage = await loadFixture('5mb-image.png')
     const result = await recolorImage(largeImage, palette, settings)
     expect(result).toBeDefined()
     expect(performance.now() - start).toBeLessThan(5000) // <5s
   })
   ```

5. **deployment-engineer** creates hotfix branch and deploys

**Time Savings:** 2-3 hours debugging → 15 minutes with agents

---

### Workflow 3: Code Quality Audit

**When to use:** Before major release, quarterly reviews, after refactoring

**Example:** "Audit the entire image tools implementation"

**Agent Sequence:**
```
architect-reviewer (architecture)
  → code-reviewer (code quality)
  → security-auditor (vulnerabilities)
  → performance-profiler (bottlenecks)
  → web-accessibility-checker (a11y)
  → documentation-expert (completeness)
```

**How You'd Ask Me:**
```
"Run a full quality audit on lib/tools/. Use architect-reviewer for structure,
code-reviewer for patterns, security-auditor for vulnerabilities, and
performance-profiler for optimization opportunities. Give me a comprehensive report."
```

**What Happens (All in Parallel):**

1. **architect-reviewer** examines:
   - Consistent patterns across tools?
   - SOLID principles followed?
   - Separation of concerns?
   - **Findings:**
     - ✅ Good: Consistent error handling
     - ⚠️ Issue: Duplicate canvas utility code in 3 files
     - 💡 Suggestion: Extract shared utilities

2. **code-reviewer** checks:
   - Type safety
   - Error handling
   - Code duplication
   - **Findings:**
     - ✅ Good: Strong TypeScript types
     - ⚠️ Issue: Missing error boundaries in panels
     - 💡 Suggestion: Add React error boundaries

3. **security-auditor** scans:
   - Input validation
   - XSS vulnerabilities
   - API key exposure
   - **Findings:**
     - ✅ Good: Server-side API keys
     - ⚠️ Issue: No file size validation in upload
     - 💡 Suggestion: Add 50MB limit, validate MIME types

4. **performance-profiler** analyzes:
   - Memory leaks
   - Expensive operations
   - Bundle size
   - **Findings:**
     - ⚠️ Issue: Canvas not cleaned up on unmount
     - ⚠️ Issue: Blob URLs not revoked (memory leak)
     - 💡 Suggestion: Add cleanup in useEffect

5. **web-accessibility-checker** validates:
   - ARIA labels
   - Keyboard navigation
   - Color contrast
   - **Findings:**
     - ⚠️ Issue: Canvas lacks alt text
     - ⚠️ Issue: Color picker not keyboard accessible

6. **documentation-expert** reviews:
   - API documentation completeness
   - Code comments
   - README accuracy

**Output:** Consolidated 50-page audit report with prioritized fixes

**Time Savings:** 2 days manual review → 20 minutes with agents

---

### Workflow 4: Test Coverage Improvement

**When to use:** Increasing test coverage, preventing regressions

**Example:** "Get to 80% test coverage for image tools"

**Agent Sequence:**
```
test-engineer (strategy)
  → [test-automator + visual-regression-testing-agent] (parallel)
  → performance-engineer (performance tests)
  → code-reviewer (test quality)
```

**How You'd Ask Me:**
```
"We need 80% test coverage on lib/tools/. Use test-engineer to create strategy,
test-automator for unit/integration tests, and visual-regression-testing-agent
for visual tests. Run them in parallel."
```

**What Happens:**

1. **test-engineer** analyzes current coverage:
   ```
   Current Coverage:
   - recolor.ts: 45% (missing edge cases)
   - color-knockout.ts: 60% (no error handling tests)
   - texture-cut.ts: 30% (barely tested)
   - upscaler.ts: 70% (good coverage)
   - background-remover.ts: 55% (missing model fallback tests)

   Strategy:
   1. Unit tests for each function
   2. Integration tests for workflows
   3. Visual regression for output
   4. Performance benchmarks
   ```

2. **test-automator** generates tests:
   ```typescript
   // tests/tools/recolor.test.ts
   describe('Recolor Tool', () => {
     it('extracts color palette', async () => {
       const palette = await extractColors(testImage, options)
       expect(palette).toHaveLength(9)
       expect(palette[0]).toHaveProperty('hex')
     })

     it('handles invalid images gracefully', async () => {
       await expect(
         extractColors('invalid-url', options)
       ).rejects.toThrow('Failed to load image')
     })

     it('respects tolerance parameter', async () => {
       const result = await recolorImage(testImage, palette, {
         tolerance: 50
       })
       // Verify more colors matched than tolerance: 10
     })
   })
   ```

3. **visual-regression-testing-agent** creates visual tests:
   ```typescript
   // tests/visual/recolor.visual.test.ts
   test('recolor preserves image quality', async ({ page }) => {
     await applyRecolor(testImage, colorMapping)
     const diff = await compareToBaseline('recolor-output.png')
     expect(diff.percentDifference).toBeLessThan(1)
   })
   ```

4. **performance-engineer** adds benchmarks:
   ```typescript
   test('color extraction completes in <2s', async () => {
     const start = performance.now()
     await extractColors(testImage, options)
     expect(performance.now() - start).toBeLessThan(2000)
   })
   ```

5. **code-reviewer** validates test quality:
   - Tests are independent
   - Good assertions
   - Clear test names
   - Proper cleanup

**Result:** 45% → 82% coverage in 1 hour

---

### Workflow 5: Performance Optimization

**When to use:** Slow load times, laggy UI, high memory usage

**Example:** "Canvas rendering is slow, optimize performance"

**Agent Sequence:**
```
performance-profiler (identify bottlenecks)
  → [react-performance-optimizer + javascript-pro] (parallel fixes)
  → load-testing-specialist (stress test)
  → code-reviewer (verify no breaking changes)
```

**How You'd Ask Me:**
```
"Canvas is laggy when editing large images. Use performance-profiler to identify
bottlenecks, then react-performance-optimizer and javascript-pro to fix in parallel.
Verify with load-testing-specialist."
```

**What Happens:**

1. **performance-profiler** analyzes:
   ```
   Bottlenecks Found:
   1. Canvas re-renders on every mouse move (60fps → 15fps)
      Location: components/canvas.tsx:145

   2. Image data copied on every operation (300ms per operation)
      Location: lib/canvas-utils.ts:67

   3. No memoization for expensive calculations
      Location: components/panels/recolor-panel.tsx:89

   4. Large bundle size (2.3MB gzipped)
      Culprit: Duplicate dependencies
   ```

2. **react-performance-optimizer** fixes React issues:
   ```typescript
   // Before
   <Canvas
     onMouseMove={(e) => handleMouseMove(e)}
   />

   // After: Throttle mouse events
   const throttledMouseMove = useThrottle(handleMouseMove, 16) // 60fps
   <Canvas onMouseMove={throttledMouseMove} />

   // Before
   const processedImage = processImage(imageData)

   // After: Memoize expensive operations
   const processedImage = useMemo(
     () => processImage(imageData),
     [imageData]
   )
   ```

3. **javascript-pro** optimizes canvas operations:
   ```typescript
   // Before: Copy entire image data
   const copy = ctx.getImageData(0, 0, canvas.width, canvas.height)

   // After: Use OffscreenCanvas for background processing
   const offscreen = new OffscreenCanvas(width, height)
   const worker = new Worker('canvas-worker.js')
   worker.postMessage({ imageData, operation }, [imageData.buffer])
   ```

4. **load-testing-specialist** stress tests:
   ```
   Test: 100 consecutive image operations
   Before: 45s total, 12 memory leaks
   After: 8s total, 0 memory leaks

   Improvement: 82% faster, no leaks ✅
   ```

**Result:** 60fps smooth rendering, 5x faster operations

---

### Workflow 6: Security Hardening

**When to use:** Before launch, after security incident, compliance requirements

**Example:** "Prepare for SOC 2 audit"

**Agent Sequence:**
```
security-auditor (vulnerability scan)
  → compliance-specialist (SOC 2 requirements)
  → security-engineer (implement fixes)
  → web-accessibility-checker (WCAG 2.2)
  → documentation-expert (security docs)
```

**How You'd Ask Me:**
```
"We need to pass SOC 2 audit next month. Use security-auditor to find
vulnerabilities, compliance-specialist for SOC 2 requirements, and
security-engineer to implement fixes. Document everything."
```

**What Happens:**

1. **security-auditor** scans:
   ```
   Critical Issues (3):
   - API keys logged in console.log statements
   - No rate limiting on /api/ai/chat endpoint
   - CORS allows all origins in production

   High Issues (7):
   - No input sanitization on file uploads
   - Session tokens in localStorage (use httpOnly cookies)
   - Missing Content-Security-Policy headers

   Medium Issues (12):
   - Dependencies with known CVEs
   - No HTTPS enforcement
   ```

2. **compliance-specialist** checks SOC 2:
   ```
   SOC 2 Requirements:
   ✅ Data encryption at rest (Vercel handles)
   ✅ Encryption in transit (HTTPS)
   ⚠️ Access logging (needs implementation)
   ⚠️ Audit trail (needs implementation)
   ⚠️ Incident response plan (needs documentation)
   ❌ Data retention policy (missing)
   ❌ Regular security reviews (not scheduled)
   ```

3. **security-engineer** implements fixes:
   ```typescript
   // Fix 1: Remove console.logs in production
   if (process.env.NODE_ENV !== 'development') {
     console.log = () => {}
     console.debug = () => {}
   }

   // Fix 2: Rate limiting
   import rateLimit from 'express-rate-limit'

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100 // limit each IP to 100 requests per windowMs
   })

   // Fix 3: CORS whitelist
   const allowedOrigins = [
     'https://yourapp.vercel.app',
     process.env.NODE_ENV === 'development' && 'http://localhost:3000'
   ].filter(Boolean)

   // Fix 4: CSP headers
   // next.config.js
   headers: [
     {
       key: 'Content-Security-Policy',
       value: "default-src 'self'; script-src 'self' 'unsafe-eval';"
     }
   ]

   // Fix 5: Input validation
   import { z } from 'zod'

   const uploadSchema = z.object({
     file: z.instanceof(File)
       .refine(f => f.size <= 50_000_000, 'Max 50MB')
       .refine(f => ['image/png', 'image/jpeg'].includes(f.type))
   })
   ```

4. **web-accessibility-checker** ensures WCAG 2.2 AA compliance

5. **documentation-expert** creates:
   - Security.md
   - Incident Response Plan
   - Data Retention Policy
   - Security Review Schedule

**Result:** SOC 2 compliant, all vulnerabilities fixed

---

### Workflow 7: Documentation Generation

**When to use:** After feature completion, API changes, onboarding new developers

**Example:** "Document the entire AI tools system"

**Agent Sequence:**
```
documentation-expert (structure)
  → [technical-writer + api-documenter] (parallel writing)
  → code-reviewer (accuracy check)
```

**How You'd Ask Me:**
```
"Create comprehensive documentation for lib/tools/ and lib/ai-tools-orchestrator.ts.
Use documentation-expert for structure, then technical-writer and api-documenter
in parallel."
```

**What Happens:**

1. **documentation-expert** creates outline:
   ```markdown
   # AI Tools Documentation

   ## Overview
   ## Architecture
   ## Individual Tools
     - Color Knockout
     - Recolor
     - Texture Cut
     - Background Remover
     - Upscaler
   ## Orchestration
   ## API Reference
   ## Usage Examples
   ## Troubleshooting
   ```

2. **technical-writer** writes user-facing docs:
   - Clear explanations
   - Usage examples
   - Best practices
   - Common pitfalls

3. **api-documenter** generates API reference:
   ```typescript
   /**
    * Removes specific colors from an image
    * @param imageUrl - Source image URL
    * @param selectedColors - Array of RGB colors to remove
    * @param settings - Knockout configuration
    * @param onProgress - Progress callback (0-100)
    * @returns Blob of processed image
    * @throws {Error} If image fails to load
    * @example
    * const blob = await performColorKnockout({
    *   imageUrl: 'https://...',
    *   selectedColors: [{ r: 255, g: 255, b: 255, hex: '#FFFFFF' }],
    *   settings: { tolerance: 30, replaceMode: 'transparency' }
    * })
    */
   ```

4. **code-reviewer** verifies:
   - Code examples actually work
   - Parameters match implementation
   - No outdated information

**Result:** Complete, accurate documentation in 30 minutes

---

### Workflow 8: Refactoring Large Codebase

**When to use:** Technical debt cleanup, architecture improvements

**Example:** "Refactor image tools to use shared utilities"

**Agent Sequence:**
```
architect-reviewer (plan refactoring)
  → typescript-pro (implement)
  → test-engineer (ensure no regressions)
  → code-reviewer (validate)
```

**How You'd Ask Me:**
```
"There's duplicate code across lib/tools/. Use architect-reviewer to plan
refactoring, typescript-pro to implement, test-engineer to prevent regressions."
```

**What Happens:**

1. **architect-reviewer** analyzes:
   ```
   Code Duplication Found:

   1. Canvas loading logic (5 files)
      - recolor.ts:45-67
      - color-knockout.ts:89-111
      - texture-cut.ts:123-145

   2. Image validation (4 files)
   3. Error handling patterns (6 files)
   4. Progress callback patterns (5 files)

   Refactoring Plan:
   - Create lib/tools/shared/canvas-loader.ts
   - Create lib/tools/shared/image-validator.ts
   - Create lib/tools/shared/progress-tracker.ts
   - Update all tools to use shared utilities
   ```

2. **typescript-pro** implements:
   ```typescript
   // lib/tools/shared/canvas-loader.ts
   export async function loadImageToCanvas(
     imageUrl: string
   ): Promise<{ canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D }> {
     const img = await loadImage(imageUrl)
     const canvas = document.createElement('canvas')
     canvas.width = img.width
     canvas.height = img.height
     const ctx = canvas.getContext('2d')!
     ctx.drawImage(img, 0, 0)
     return { canvas, ctx }
   }

   // Update recolor.ts
   import { loadImageToCanvas } from './shared/canvas-loader'

   // Before: 23 lines of duplicate code
   // After: 1 line
   const { canvas, ctx } = await loadImageToCanvas(imageUrl)
   ```

3. **test-engineer** runs full test suite:
   ```bash
   pnpm test

   ✓ recolor.test.ts (12 tests)
   ✓ color-knockout.test.ts (15 tests)
   ✓ texture-cut.test.ts (10 tests)
   ✓ shared/canvas-loader.test.ts (8 tests)

   All 45 tests passing ✅
   ```

4. **code-reviewer** validates:
   - No behavioral changes
   - Improved maintainability
   - Reduced bundle size

**Result:** 30% less code, easier maintenance, no bugs

---

## Part 2: Advanced Agent Patterns

### Pattern 1: Extended Thinking Mode

**When to use:** Complex problems requiring deep analysis

**Trigger Words:**
- `"think"` - Standard thinking (2-3x compute)
- `"think hard"` - Deep thinking (5-7x compute)
- `"think harder"` - Very deep (10-15x compute)
- `"ultrathink"` - Maximum thinking (20-30x compute)

**Example:**
```
"ULTRATHINK before refactoring: Should we use a monorepo structure or separate
packages for image tools? Consider scalability, maintenance, bundle size, and
developer experience. Use architect-reviewer."
```

**What Happens:**
- Claude spends significantly more compute time evaluating alternatives
- Considers edge cases and long-term implications
- Provides detailed reasoning for recommendations

---

### Pattern 2: Parallel Agent Execution

**When to use:** Independent tasks that don't depend on each other

**Example:**
```
"Execute in parallel:
1. security-auditor: Scan for vulnerabilities
2. performance-profiler: Find bottlenecks
3. documentation-expert: Check doc coverage
4. test-engineer: Measure test coverage

Give me a consolidated report."
```

**What Happens:**
- 4 agents work simultaneously
- Each has isolated context
- Results merged into single report
- **Time Savings:** 4x faster than sequential

---

### Pattern 3: Research Before Coding

**Critical for Success:** Always ask agents to research and plan first

**Bad Approach:**
```
"Add blur tool"
```
→ Claude jumps straight to coding without understanding context

**Good Approach:**
```
"Use task-decomposition-expert to research existing tool patterns,
then use nextjs-architecture-expert to plan the blur tool architecture.
THEN start coding."
```

**What Happens:**
- Agent reads existing tool implementations
- Identifies patterns and conventions
- Plans integration points
- THEN writes code that fits perfectly

---

### Pattern 4: Test-Driven Development

**Best for:** Features with clear input/output expectations

**Example:**
```
"Use test-engineer to write tests for a blur tool FIRST based on these requirements:
- Input: Image URL, blur radius (0-100)
- Output: Blurred image as Blob
- Should handle errors gracefully
- Should support progress callbacks

Then use typescript-pro to implement until tests pass."
```

**What Happens:**
1. Tests written first (defines API contract)
2. Implementation matches tests exactly
3. No surprises or mismatched expectations

---

### Pattern 5: Incremental Reviews

**When to use:** Large features, prevent drift

**Example:**
```
"Building a blur tool in 3 phases:

Phase 1: Use frontend-developer to create BlurPanel UI.
         Have code-reviewer check before proceeding.

Phase 2: Use typescript-pro to implement blur algorithm.
         Have code-reviewer check before proceeding.

Phase 3: Use test-engineer to add tests.
         Have code-reviewer do final validation."
```

**Why it works:**
- Catch issues early
- Maintain quality throughout
- Easier to debug small changes

---

## Part 3: Practical Command Patterns

### Quick Reference: How to Invoke Agents

#### Security Scan
```
"Use security-auditor to scan the entire codebase for vulnerabilities.
Focus on API routes, authentication, and data handling."
```

#### Performance Audit
```
"Use performance-profiler to analyze lib/tools/ and identify bottlenecks.
Then use react-performance-optimizer to fix React-specific issues."
```

#### Code Review
```
"Use code-reviewer to review my changes in lib/tools/new-feature.ts.
Check for type safety, error handling, and code patterns."
```

#### Test Generation
```
"Use test-automator to generate comprehensive tests for lib/tools/recolor.ts.
Include unit tests, integration tests, and edge cases."
```

#### Documentation
```
"Use documentation-expert to create user documentation for the recolor tool.
Include API reference, usage examples, and troubleshooting."
```

#### Architecture Review
```
"Use architect-reviewer to evaluate the current image tools architecture.
Should we extract shared logic? Is the structure scalable?"
```

#### Deployment
```
"Use deployment-engineer to deploy this feature to Vercel.
Run all checks first: tests, build, and security scan."
```

#### Bug Investigation
```
"Use error-detective to analyze this error in the recolor tool:
[paste error message]

Then use debugger to find root cause and typescript-pro to fix."
```

#### Accessibility Check
```
"Use web-accessibility-checker to audit the entire app for WCAG 2.2 AA compliance.
Focus on keyboard navigation, ARIA labels, and color contrast."
```

#### Load Testing
```
"Use load-testing-specialist to stress test the /api/ai/chat endpoint.
Simulate 1000 concurrent users and identify breaking points."
```

---

## Part 4: Real Codebase Use Cases

### Use Case 1: Add Image Comparison Slider

**Goal:** Add before/after comparison UI for all image tools

**Workflow:**
```
"THINK HARD about this feature first.

Step 1: Use task-decomposition-expert to research:
- How other tools show before/after
- Integration points in current codebase
- State management approach

Step 2: Use ui-ux-designer to create component design

Step 3: Execute in parallel:
- frontend-developer: Build ImageComparisonSlider component
- typescript-pro: Implement slider logic and gesture handling
- test-engineer: Write tests

Step 4: Use code-reviewer to validate all code

Step 5: Use documentation-expert to update docs"
```

**Expected Result:** Production-ready feature in 1-2 hours

---

### Use Case 2: Optimize Bundle Size

**Goal:** Reduce JavaScript bundle from 2.3MB to <1MB

**Workflow:**
```
"Use performance-profiler to analyze bundle size and identify bloat.

Then execute in parallel:
- javascript-pro: Remove duplicate dependencies
- nextjs-architecture-expert: Implement code splitting
- react-performance-optimizer: Lazy load heavy components

Use load-testing-specialist to verify performance improvements.
Use code-reviewer to ensure no breaking changes."
```

**Expected Result:** 50-60% bundle size reduction

---

### Use Case 3: Implement End-to-End Testing

**Goal:** Add Playwright E2E tests for critical workflows

**Workflow:**
```
"Use test-engineer to create E2E testing strategy for these workflows:
1. Upload image → Apply color knockout → Download
2. Upload image → Recolor → Download
3. AI chat → Suggest tool → Apply → Download

Then use test-automator to implement Playwright tests.

Use visual-regression-testing-agent to add visual checks.

Have code-reviewer validate test quality."
```

**Expected Result:** Full E2E coverage in 2-3 hours

---

### Use Case 4: Migrate to New AI Model

**Goal:** Add support for Claude Opus 4

**Workflow:**
```
"THINK before implementing:

Use ai-engineer to research Claude Opus 4 capabilities and migration path.

Then use typescript-pro to:
1. Update lib/ai-service.ts with Opus 4 model
2. Add model selector to AI chat panel
3. Implement A/B testing (Sonnet vs Opus)

Use test-engineer to add tests for new model.

Use llm-observability-agent to set up cost tracking for Opus 4.

Use documentation-expert to update AI_TOOLS_DOCUMENTATION.md."
```

**Expected Result:** New model integrated with monitoring in 1 hour

---

### Use Case 5: Database Integration for Image History

**Goal:** Add PostgreSQL to store image processing history

**Workflow:**
```
"ULTRATHINK about data architecture first.

Use database-architect to design schema for:
- Users
- Images
- Processing history
- AI chat sessions

Use backend-architect to plan API routes.

Execute in parallel:
- fullstack-developer: Set up Prisma, create migrations
- typescript-pro: Implement repository pattern
- test-engineer: Write database tests
- security-engineer: Add access controls

Use code-reviewer and security-auditor before deploying.

Use documentation-expert to document database schema."
```

**Expected Result:** Database integrated with security in 3-4 hours

---

## Part 5: Measuring Success

### Metrics to Track

**Development Velocity**
- Feature completion time: Baseline vs with agents
- Bug fix time: Baseline vs with agents
- Code review turnaround: Baseline vs with agents

**Code Quality**
- Test coverage: Target 80%+
- Security vulnerabilities: Target 0 critical
- Performance metrics: LCP <2.5s, FID <100ms

**Agent Usage**
- Most used agents
- Time saved per agent
- Success rate of agent suggestions

---

## Part 6: Best Practices Summary

### ✅ DO

1. **Research first**: Always use task-decomposition-expert or architect-reviewer before coding
2. **Use extended thinking**: Add "think hard" or "ultrathink" for complex problems
3. **Parallel execution**: Invoke multiple agents for independent tasks
4. **Incremental reviews**: Review after each phase, not just at the end
5. **Test-driven**: Write tests first with test-engineer
6. **Isolate context**: Use sub-agents to prevent context pollution
7. **Validate output**: Use code-reviewer for all significant changes
8. **Document decisions**: Use documentation-expert to capture rationale

### ❌ DON'T

1. **Jump to coding**: Skipping research leads to wrong solutions
2. **Sequential when parallel works**: Wastes time
3. **Skip code review**: Leads to technical debt
4. **Ignore security**: Use security-auditor regularly
5. **Skip tests**: Use test-engineer for regression prevention
6. **Forget documentation**: Use documentation-expert proactively
7. **Over-rely on single agent**: Leverage specialization

---

## Part 7: 30-Day Activation Plan

### Week 1: Foundation
- [ ] Run security-auditor full scan, fix critical issues
- [ ] Use test-engineer to measure current test coverage
- [ ] Use performance-profiler to establish baseline metrics
- [ ] Use documentation-expert to audit doc completeness

### Week 2: Quality
- [ ] Use test-automator to reach 80% coverage
- [ ] Use visual-regression-testing-agent to add visual tests
- [ ] Use code-reviewer for all existing tools
- [ ] Use architect-reviewer to plan refactoring

### Week 3: Optimization
- [ ] Use performance-profiler + javascript-pro to optimize bundle
- [ ] Use react-performance-optimizer for UI improvements
- [ ] Use load-testing-specialist to stress test APIs
- [ ] Measure improvements vs Week 1 baseline

### Week 4: Advanced
- [ ] Build 1 feature using full agent workflow
- [ ] Use workflow-orchestrator for parallel development
- [ ] Set up llm-observability-agent for cost tracking
- [ ] Document learnings with technical-writer

---

## Resources

**Official Docs**
- [Claude Code Sub-Agents](https://docs.claude.com/en/docs/claude-code/sub-agents)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)

**Community**
- [Awesome Claude Code Sub-Agents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- [Seth Hobson's 84 Agents](https://github.com/wshobson/agents)

**Articles**
- [Beyond a Single AI: Sub-Agents 10x Development](https://garysvenson09.medium.com/beyond-a-single-ai-how-claudes-sub-agents-will-10x-your-development-workflow-582b0a9fcc11)
- [Practical Guide to Claude Code Sub-Agents](https://jewelhuq.medium.com/practical-guide-to-mastering-claude-codes-main-agent-and-sub-agents-fd52952dcf00)

---

## Conclusion

Your 46 agents are a specialized development team waiting to be activated. Start with simple workflows (security scan, code review) and progressively use more complex patterns (parallel execution, multi-phase features).

**The key insight:** These agents enable you to work at 10x speed while maintaining quality. Use them proactively, not reactively.

**Next Action:** Pick one workflow from Part 4 and try it today. Measure the time savings.

---

**Document Version:** 1.0
**Date:** October 12, 2025
**Author:** Claude (AI Development Assistant)
**Status:** Ready to Use
