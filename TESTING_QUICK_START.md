# Testing Quick Start Guide

This guide will help you set up and run tests for the AI Photo Editor application.

## Prerequisites

Node.js 18+ and npm/pnpm installed.

## 1. Install Testing Dependencies

Run this command to install all required testing packages:

```bash
npm install --save-dev vitest @vitest/ui @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom happy-dom
```

Or if using pnpm:

```bash
pnpm add -D vitest @vitest/ui @vitest/coverage-v8 @testing-library/react @testing-library/jest-dom happy-dom
```

## 2. Project Structure

The testing setup has been created with the following structure:

```
flow-editor/
├── vitest.config.ts          # Vitest configuration
├── tests/
│   ├── setup.ts              # Test setup and global mocks
│   ├── unit/                 # Unit tests
│   │   ├── color-utils.test.ts
│   │   └── file-utils.test.ts
│   └── utils/                # Test utilities
│       └── test-data-generator.ts
├── TEST_COVERAGE_ASSESSMENT.md  # Comprehensive assessment report
└── TESTING_QUICK_START.md       # This file
```

## 3. Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (recommended for development)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

### Run tests with UI (interactive)
```bash
npm run test:ui
```

### Run E2E tests (Playwright)
```bash
npm run test:e2e
```

## 4. Current Test Coverage

As of the initial setup:
- **color-utils.ts**: 50+ unit tests covering all color conversion functions
- **file-utils.ts**: Basic file conversion tests

Expected test results:
```
✓ Color Utilities (15 test suites, 50+ tests)
  ✓ rgbToHex
  ✓ hexToRgb
  ✓ rgbToHsl
  ✓ hslToRgb
  ✓ rgbToLab (LAB color space)
  ✓ deltaE2000 (perceptual color distance)
  ✓ getColorMatchConfidence

✓ File Utilities (5 test suites)
  ✓ fileToDataUrl
  ✓ dataUrlToBlob
  ✓ blobToFile
  ✓ canvasToBlob
  ✓ canvasToFile
```

## 5. Writing New Tests

### Example Unit Test

Create a new file: `tests/unit/your-module.test.ts`

```typescript
import { describe, it, expect } from 'vitest'
import { yourFunction } from '@/lib/your-module'

describe('YourModule', () => {
  describe('yourFunction', () => {
    it('should do something', () => {
      const result = yourFunction('input')
      expect(result).toBe('expected')
    })

    it('should handle edge cases', () => {
      expect(() => yourFunction(null)).toThrow()
    })
  })
})
```

### Testing with Canvas

Canvas operations are automatically mocked in `tests/setup.ts`. Example:

```typescript
import { describe, it, expect } from 'vitest'
import { generateTestImage } from '../utils/test-data-generator'

describe('Canvas Operations', () => {
  it('should process image', async () => {
    const imageUrl = await generateTestImage(100, 100, {
      backgroundColor: '#ff0000'
    })

    // Your test logic here
  })
})
```

### Testing Async Operations

```typescript
it('should handle async operations', async () => {
  const result = await someAsyncFunction()
  expect(result).toBeDefined()
})
```

## 6. Test Coverage Goals

Current coverage targets (from vitest.config.ts):
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

View coverage report after running `npm run test:coverage`:
```bash
open coverage/index.html
```

## 7. Mocked Dependencies

The following are automatically mocked in `tests/setup.ts`:

- HTMLCanvasElement (getContext, toBlob, toDataURL)
- Image (constructor, onload/onerror)
- FileReader (readAsDataURL, readAsArrayBuffer)
- URL.createObjectURL / revokeObjectURL
- window.devicePixelRatio

## 8. Common Testing Patterns

### Testing Color Conversions
```typescript
it('should convert RGB to hex', () => {
  expect(rgbToHex({ r: 255, g: 0, b: 0 })).toBe('#ff0000')
})
```

### Testing with Mock Files
```typescript
it('should process file', async () => {
  const mockFile = new File(['content'], 'test.png', { type: 'image/png' })
  const result = await processFile(mockFile)
  expect(result).toBeDefined()
})
```

### Testing Error Handling
```typescript
it('should throw on invalid input', () => {
  expect(() => functionUnderTest(null)).toThrow('Invalid input')
})

it('should reject async errors', async () => {
  await expect(asyncFunction()).rejects.toThrow()
})
```

### Testing with Progress Callbacks
```typescript
it('should call progress callback', async () => {
  const progressCalls: number[] = []

  await functionWithProgress((progress) => {
    progressCalls.push(progress)
  })

  expect(progressCalls.length).toBeGreaterThan(0)
  expect(progressCalls[progressCalls.length - 1]).toBe(100)
})
```

## 9. Continuous Integration

The project includes CI/CD recommendations in the assessment report. Basic GitHub Actions workflow:

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run test:e2e
```

## 10. Next Steps

Follow the roadmap in `TEST_COVERAGE_ASSESSMENT.md`:

### Week 1-2 (Current Phase)
- [x] Install testing infrastructure
- [x] Set up Vitest configuration
- [x] Create initial tests for color-utils.ts
- [x] Create initial tests for file-utils.ts
- [ ] Run tests and verify 100% coverage for utils
- [ ] Add CI/CD pipeline

### Week 3-4 (Next Phase)
- [ ] Test canvas-utils.ts
- [ ] Test color-knockout.ts
- [ ] Test recolor.ts (color extraction, region detection)
- [ ] Add performance benchmarks

### Week 5+ (Future Phases)
See detailed roadmap in TEST_COVERAGE_ASSESSMENT.md

## 11. Troubleshooting

### Tests won't run
```bash
# Clear node_modules and reinstall
rm -rf node_modules
npm install
```

### Canvas errors in tests
The canvas is automatically mocked in `tests/setup.ts`. If you see canvas-related errors, check that the setup file is being loaded.

### Import path errors
Make sure path aliases are configured in both `vitest.config.ts` and `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"],
      "@/lib/*": ["./lib/*"],
      "@/components/*": ["./components/*"]
    }
  }
}
```

### Coverage thresholds failing
Adjust thresholds in `vitest.config.ts` if needed during initial development:
```typescript
thresholds: {
  lines: 60,      // Lower temporarily
  functions: 60,
  branches: 60,
  statements: 60
}
```

## 12. Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- Full assessment report: `TEST_COVERAGE_ASSESSMENT.md`

## 13. Getting Help

For questions about:
- Test infrastructure: Check vitest.config.ts and tests/setup.ts
- Writing tests: See examples in tests/unit/
- Mocking strategies: Review tests/setup.ts
- CI/CD: See TEST_COVERAGE_ASSESSMENT.md section 7

---

**Last Updated:** 2025-10-12
**Testing Framework:** Vitest 1.x
**Current Coverage:** 0% (baseline with initial tests ready)
**Target Coverage:** 80% (12-week roadmap)
