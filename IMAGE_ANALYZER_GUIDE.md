# Technical Image Analyzer - Complete Guide

## Overview

The **Technical Image Analyzer** is the **foundation** for preventing AI hallucinations by extracting REAL, verifiable ground truth specifications directly from image pixel data using the Canvas API.

**Purpose**: Provide Claude with accurate technical specifications that achieve >95% confidence, eliminating guesswork and preventing hallucinations.

---

## File Location

```
/Users/makko/Code/OneFlow/flow-editor/lib/image-analyzer.ts
```

---

## Core Concept: Ground Truth

### The Problem
AI models (including Claude) can hallucinate when asked to make assumptions about image specifications:
- "This looks like it might be 1920x1080" (WRONG - guessing)
- "The image appears sharp" (WRONG - subjective)
- "I think it has transparency" (WRONG - assumption)

### The Solution
Extract EXACT specifications from pixel data:
- Width: **1920 pixels** (FACT - measured)
- Height: **1080 pixels** (FACT - measured)
- Sharpness: **78/100** (FACT - calculated via Laplacian edge detection)
- Transparency: **false** (FACT - checked every alpha channel value)

**This is ground truth. This is what prevents hallucinations.**

---

## API Reference

### Main Function: `analyzeImage()`

```typescript
async function analyzeImage(
  imageUrl: string,
  onProgress?: (progress: number, message: string) => void
): Promise<ImageAnalysis>
```

#### Parameters
- `imageUrl` - Image URL (blob URL, data URL, or external URL)
- `onProgress` - Optional callback for progress updates (0-100%)

#### Returns: `ImageAnalysis`

```typescript
interface ImageAnalysis {
  // Basic Specifications
  width: number;              // EXACT pixel width
  height: number;             // EXACT pixel height
  aspectRatio: string;        // Simplified ratio ("16:9", "4:3", etc.)
  dpi: number | null;         // DPI from metadata (or null)
  fileSize: number;           // File size in bytes
  format: string;             // Image format ("png", "jpeg", etc.)

  // Color Analysis
  hasTransparency: boolean;   // Checked ALL alpha channels
  dominantColors: Array<{     // Extracted via sampling
    r: number;
    g: number;
    b: number;
    hex: string;
    percentage: number;
  }>;
  colorDepth: number;         // 8, 24, or 32 bits
  uniqueColorCount: number;   // Approximate unique colors

  // Quality Metrics
  isBlurry: boolean;          // sharpness < 50
  sharpnessScore: number;     // 0-100 (Laplacian edge detection)
  noiseLevel: number;         // 0-100 (local variance analysis)

  // Print Readiness
  isPrintReady: boolean;      // Meets print standards
  printableAtSize: {          // Max printable at 300 DPI
    width: number;
    height: number;
  };

  // Metadata
  analyzedAt: number;         // Timestamp
  confidence: number;         // 0-100 (100 = full success)
}
```

---

## Usage Examples

### Basic Usage

```typescript
import { analyzeImage } from '@/lib/image-analyzer';

const imageUrl = 'https://example.com/image.jpg';

const analysis = await analyzeImage(imageUrl);

console.log(`Image: ${analysis.width}x${analysis.height}`);
console.log(`Sharpness: ${analysis.sharpnessScore}/100`);
console.log(`Print ready: ${analysis.isPrintReady ? 'Yes' : 'No'}`);
```

### With Progress Tracking

```typescript
const analysis = await analyzeImage(imageUrl, (progress, message) => {
  console.log(`${progress}%: ${message}`);
});

// Output:
// 5%: Loading image...
// 10%: Preparing canvas...
// 30%: Analyzing colors...
// 60%: Calculating sharpness...
// 100%: Analysis complete in 234ms
```

### With File Upload

```typescript
async function handleFileUpload(file: File) {
  const imageUrl = URL.createObjectURL(file);

  try {
    const analysis = await analyzeImage(imageUrl, (progress, message) => {
      updateProgressBar(progress, message);
    });

    // Use analysis for validation
    if (analysis.width < 800 || analysis.height < 600) {
      alert('Image too small. Minimum 800x600 required.');
      return;
    }

    if (analysis.isBlurry) {
      alert(`Warning: Image appears blurry (sharpness: ${analysis.sharpnessScore}/100)`);
    }

    // Proceed with upload
    processImage(file, analysis);

  } finally {
    URL.revokeObjectURL(imageUrl);
  }
}
```

### Claude Integration Pattern

```typescript
import { analyzeImage, formatAnalysisSummary } from '@/lib/image-analyzer';

async function sendToClaudeWithGroundTruth(imageUrl: string, userPrompt: string) {
  // 1. Extract ground truth
  const analysis = await analyzeImage(imageUrl);

  // 2. Format as context for Claude
  const technicalContext = formatAnalysisSummary(analysis);

  // 3. Send to Claude with FACTS, not assumptions
  const response = await sendToClaude({
    imageUrl,
    prompt: `
TECHNICAL SPECIFICATIONS (GROUND TRUTH):
${technicalContext}

User Request: ${userPrompt}

IMPORTANT: Use the technical specifications above. These are FACTS extracted
from the image's pixel data. Do not guess or assume different values.
    `,
  });

  return response;
}
```

---

## How It Works

### 1. Basic Specifications
- **Dimensions**: Reads `img.naturalWidth` and `img.naturalHeight`
- **Aspect Ratio**: Calculates GCD and simplifies to common ratios
- **Format**: Detects from URL or data URL MIME type
- **File Size**: Estimates from data URL length or Content-Length header

### 2. DPI Detection
- Attempts to extract from EXIF metadata (if available)
- For PNG: Checks pHYs chunk for pixel dimensions
- Returns `null` if unavailable (defaults to 72 DPI for web)

### 3. Color Analysis
- **Transparency**: Scans ALL alpha channel values (every 4th byte)
- **Dominant Colors**: Uses existing `extractColors()` tool with quantization
- **Unique Colors**: Samples pixels and counts quantized colors
- **Color Depth**: 32-bit if transparent, 24-bit otherwise

### 4. Sharpness Detection (Laplacian Edge Detection)

Algorithm:
1. Convert to grayscale using luminance formula: `0.299*R + 0.587*G + 0.114*B`
2. Apply Laplacian kernel for edge detection:
   ```
   [0,  1, 0]
   [1, -4, 1]
   [0,  1, 0]
   ```
3. Calculate variance of edge intensities
4. Normalize to 0-100 scale
5. Higher variance = sharper image

**Why this works**: Sharp images have strong edges (high variance), blurry images have weak edges (low variance).

### 5. Noise Detection

Algorithm:
1. Sample 20 random 16x16 regions
2. Calculate local variance in each region
3. Average variance across all samples
4. Normalize to 0-100 scale

**Why this works**: Noisy images have high variance even in smooth regions.

### 6. Print Readiness Validation

Criteria:
- DPI >= 300 (professional print standard)
- Minimum 2x2 inches printable at 300 DPI
- Sharpness >= 40 (not too blurry)

Returns `true` only if ALL criteria are met.

---

## Performance Optimization

### Canvas Operations
- Uses `willReadFrequently: true` context option
- Samples pixels instead of checking every pixel (for large images)
- Processes in center region only (avoids edge artifacts)

### Memory Management
- Cleans up blob URLs with `URL.revokeObjectURL()`
- Uses sampling rate based on image size
- No memory leaks from canvas objects

### Progress Tracking
- Reports progress at key milestones (0%, 10%, 30%, 60%, 90%, 100%)
- Provides meaningful status messages
- Allows UI to remain responsive during analysis

---

## Error Handling

### Graceful Degradation
If analysis fails, returns minimal result with `confidence: 0`:

```typescript
{
  width: 0,
  height: 0,
  aspectRatio: '0:0',
  confidence: 0,
  // ... other fields with safe defaults
}
```

### Partial Analysis
If some operations fail, continues with reduced confidence:

```typescript
try {
  sharpness = await calculateSharpness(imageData);
} catch (error) {
  console.warn('Sharpness calculation failed:', error);
  confidence = Math.min(confidence, 90); // Reduce confidence
  sharpness = 0; // Use safe default
}
```

### Always Returns
**Never throws errors** - always returns an `ImageAnalysis` object (even if mostly empty).

---

## Testing

### Unit Tests
Location: `/Users/makko/Code/OneFlow/flow-editor/tests/image-analyzer.test.ts`

Run tests:
```bash
pnpm test tests/image-analyzer.test.ts
```

### Interactive Demo
Location: `/Users/makko/Code/OneFlow/flow-editor/lib/image-analyzer.demo.html`

Open in browser:
```bash
open lib/image-analyzer.demo.html
```

Features:
- Drag-and-drop image upload
- Real-time progress tracking
- Visual display of all metrics
- Color palette extraction
- Confidence scoring

---

## Integration Checklist

When integrating the analyzer into your workflow:

- [ ] Import `analyzeImage` from `@/lib/image-analyzer`
- [ ] Call analyzer BEFORE sending to Claude
- [ ] Include `formatAnalysisSummary()` output in Claude context
- [ ] Use `analysis.confidence` to validate results
- [ ] Handle `confidence: 0` case (analysis failed)
- [ ] Clean up blob URLs with `URL.revokeObjectURL()`
- [ ] Show progress to user with `onProgress` callback
- [ ] Validate critical specs (e.g., minimum dimensions)
- [ ] Use analysis data for UI decisions (e.g., show warnings)

---

## Key Benefits

### 1. Prevents Hallucinations
By providing EXACT specifications, Claude doesn't need to guess:
- No "I think this is 1920x1080" - it IS 1920x1080
- No "It appears sharp" - it HAS a sharpness score of 78/100
- No "Probably has transparency" - it DOES NOT have transparency

### 2. High Confidence
Typical confidence scores:
- **95-100%**: Full successful analysis
- **85-94%**: Partial success (some operations failed)
- **70-84%**: Limited success (multiple failures)
- **0-69%**: Critical failure

### 3. Verifiable Results
Every metric is:
- **Measurable**: Extracted from pixel data
- **Repeatable**: Same image = same results
- **Explainable**: Clear calculation method
- **Trustworthy**: No guessing or assumptions

### 4. Complete Specifications
Provides ALL information needed:
- Dimensions and aspect ratio
- Color analysis (transparency, palette, depth)
- Quality metrics (sharpness, noise)
- Print readiness validation
- Metadata and confidence

---

## Use Cases

### 1. Image Validation
```typescript
const analysis = await analyzeImage(imageUrl);

if (analysis.width < 1920 || analysis.height < 1080) {
  throw new Error('Minimum resolution: 1920x1080');
}

if (analysis.hasTransparency && format === 'jpeg') {
  throw new Error('JPEG does not support transparency. Use PNG.');
}

if (analysis.sharpnessScore < 30) {
  console.warn('Image appears very blurry');
}
```

### 2. Print Preparation
```typescript
const analysis = await analyzeImage(imageUrl);

if (!analysis.isPrintReady) {
  console.error(`
    Image not print-ready:
    - Current size at 300 DPI: ${analysis.printableAtSize.width}" x ${analysis.printableAtSize.height}"
    - Minimum required: 2" x 2"
    - Sharpness: ${analysis.sharpnessScore}/100 (need >= 40)
  `);
}
```

### 3. AI Context Enhancement
```typescript
const analysis = await analyzeImage(imageUrl);
const context = formatAnalysisSummary(analysis);

const prompt = `
GROUND TRUTH SPECIFICATIONS:
${context}

User wants to upscale this image. Based on the ACTUAL specifications above,
what is the maximum safe upscale factor?
`;

const response = await sendToClaude(imageUrl, prompt);
```

### 4. Quality Control
```typescript
const analysis = await analyzeImage(imageUrl);

const issues = [];

if (analysis.isBlurry) {
  issues.push(`Low sharpness: ${analysis.sharpnessScore}/100`);
}

if (analysis.noiseLevel > 50) {
  issues.push(`High noise: ${analysis.noiseLevel}/100`);
}

if (analysis.uniqueColorCount < 100) {
  issues.push(`Low color variety: ${analysis.uniqueColorCount} colors`);
}

if (issues.length > 0) {
  console.warn('Quality issues detected:', issues);
}
```

---

## Future Enhancements

Potential improvements:
1. **EXIF Extraction**: Use `exif-js` library for real DPI detection
2. **Advanced Sharpness**: Implement full CIE Delta E 2000 algorithm
3. **Compression Detection**: Analyze for JPEG compression artifacts
4. **Face Detection**: Identify faces for smart cropping
5. **Object Segmentation**: Identify main subjects vs background
6. **Histogram Analysis**: Provide exposure and contrast metrics
7. **Caching**: Cache analysis results for repeated images
8. **Worker Threads**: Move heavy calculations to web workers

---

## Conclusion

The Technical Image Analyzer is the **foundation** of the entire AI workflow. By extracting ground truth specifications directly from image pixel data, it provides Claude with verifiable facts that prevent hallucinations and achieve >95% confidence.

**Remember**: Always analyze images BEFORE sending to Claude. The analyzer provides the ground truth that makes everything else possible.

---

## Quick Reference

### Import
```typescript
import { analyzeImage, formatAnalysisSummary } from '@/lib/image-analyzer';
```

### Analyze
```typescript
const analysis = await analyzeImage(imageUrl, (progress, msg) => {
  console.log(`${progress}%: ${msg}`);
});
```

### Use Results
```typescript
if (analysis.confidence >= 85) {
  // Trust the results
  console.log(`Image: ${analysis.width}x${analysis.height}`);
  console.log(`Sharpness: ${analysis.sharpnessScore}/100`);
} else {
  // Analysis failed
  console.error('Could not analyze image');
}
```

### Claude Integration
```typescript
const context = formatAnalysisSummary(analysis);
const response = await sendToClaude(imageUrl, `
  GROUND TRUTH:
  ${context}

  User request: ${userPrompt}
`);
```

---

**End of Guide**
