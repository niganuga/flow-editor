# Current State Baseline - Replicate AI Integration

**Document Version:** 1.0.0
**Date:** October 13, 2025
**Status:** Production Baseline
**Purpose:** Document current Replicate model usage before October 2025 optimization

---

## Table of Contents

1. [Overview](#overview)
2. [Replicate Models in Use](#replicate-models-in-use)
3. [Background Removal Implementation](#background-removal-implementation)
4. [Upscaling Implementation](#upscaling-implementation)
5. [Quality Checks & Validation](#quality-checks--validation)
6. [Cost Tracking](#cost-tracking)
7. [API Integration Architecture](#api-integration-architecture)
8. [Performance Characteristics](#performance-characteristics)
9. [Known Issues & Limitations](#known-issues--limitations)

---

## Overview

Flow Editor currently integrates with **Replicate AI** for two AI-powered image processing features:
- **Background Removal** (3 models)
- **Image Upscaling** (3 models)

All Replicate API calls are proxied through Next.js API routes to keep API keys secure.

### Integration Summary

| Feature | Models Available | Default Model | API Version |
|---------|------------------|---------------|-------------|
| Background Removal | 3 (Bria, CodeplugTech, Fallback) | Bria RMBG | v1 |
| AI Upscaling | 3 (Standard, Creative, Anime) | Standard | v1 |

---

## Replicate Models in Use

### 1. Background Removal Models

#### Model A: Bria RMBG (Primary)

**File:** `lib/tools/background-remover.ts:42-46`

```typescript
bria: {
  version: '566d9b58b69ef9f96883dc41209e75adfcad48def8d31d2355d9ccd020fecfe2',
  name: 'Bria RMBG',
  description: 'High quality, best for fine details',
}
```

**Replicate Model:** `briaai/RMBG-1.4`
**Status:** ✅ Active (Default)
**Use Case:** General purpose background removal with best quality
**Input Parameters:**
- `image`: Data URL or blob URL

**Output:** PNG image with transparent background

---

#### Model B: CodeplugTech (Secondary)

**File:** `lib/tools/background-remover.ts:47-51`

```typescript
codeplugtech: {
  version: '37ff2aa89897c0de4a140a3d50969dc62b663ea467e1e2bde18008e3d3731b2b',
  name: 'CodeplugTech',
  description: 'Fast general purpose background removal',
}
```

**Replicate Model:** `codeplugtech/remove-bg`
**Status:** ✅ Active
**Use Case:** Faster processing for less complex images
**Special Requirements:** RGB (3-channel) images only - RGBA causes tensor errors

**Input Parameters:**
- `image`: Data URL (RGB format required)
- `format`: 'png' | 'webp'
- `background_type`: 'rgba' | 'color'
- `background_color`: Hex color (optional)

**Output:** PNG/WEBP with transparent or colored background

---

#### Model C: 851 Labs (Fallback)

**File:** `lib/tools/background-remover.ts:52-56`

```typescript
fallback: {
  version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc',
  name: '851 Labs',
  description: 'Reliable fallback model',
}
```

**Replicate Model:** `851-labs/remove-bg`
**Status:** ✅ Active (Fallback only)
**Use Case:** Used when primary models fail
**Auto-Retry Logic:** Yes (lines 160-174)

**Input Parameters:**
- `image`: Data URL
- `format`: 'png' | 'webp'
- `background_type`: 'rgba' | 'color'
- `background_color`: Hex color (optional)

---

### 2. Upscaling Models

#### Model D: Standard (Real-ESRGAN)

**File:** `lib/tools/upscaler.ts:46-51`

```typescript
standard: {
  version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa',
  name: 'Standard (Real-ESRGAN)',
  description: 'General purpose upscaling',
}
```

**Replicate Model:** `nightmareai/real-esrgan`
**Status:** ✅ Active (Default)
**Use Case:** General purpose photo enhancement and upscaling

**Input Parameters:**
- `image`: Data URL
- `scale`: 1-10x (integer)
- `face_enhance`: boolean (default: false)

**Output:** Upscaled PNG/JPG image

---

#### Model E: Creative (Clarity Upscaler)

**File:** `lib/tools/upscaler.ts:52-56`

```typescript
creative: {
  version: 'dfad41707589d68ecdccd1dfa600d55a208f9310748e44bfe35b4a6291453d5e',
  name: 'Creative (Clarity Upscaler)',
  description: 'Photographic enhancement with artistic touch',
}
```

**Replicate Model:** `philz1337x/clarity-upscaler`
**Status:** ✅ Active
**Use Case:** Photographic images with artistic enhancement

**Input Parameters:**
- `image`: Data URL
- `scale_factor`: 1-10 (can be float)
- `creativity`: 0-1 (default: 0.35)
- `resemblance`: 0-1 (default: 0.6)
- `dynamic`: 1-10 (default: 6)
- `prompt`: String (default: "masterpiece, best quality, highres")
- `scheduler`: String (default: "DPM++ 3M SDE Karras")
- `sharpen`: 0-2 (default: 1)
- `output_format`: 'png' | 'jpg' | 'webp'
- `downscaling`: boolean (default: false)

**Output:** Enhanced image with artistic detail

---

#### Model F: Anime (RealESRGAN Anime)

**File:** `lib/tools/upscaler.ts:57-61`

```typescript
anime: {
  version: '1b976a4d456ed9e4d1a846597b7614e79eadad3032e9124fa63859db0fd59b56',
  name: 'Anime (RealESRGAN Anime)',
  description: 'Specialized for illustrations and anime',
}
```

**Replicate Model:** `xinntao/realesrgan`
**Status:** ✅ Active
**Use Case:** Anime, illustrations, and cartoon images

**Input Parameters:**
- `img`: Data URL (note: uses 'img' not 'image')
- `version`: 'Anime - anime6B' (fixed)
- `scale`: 1-10x (integer)
- `face_enhance`: boolean (default: false)
- `tile`: integer (default: 0)

**Output:** Upscaled anime-style image

---

## Background Removal Implementation

### File Locations

**Primary Implementation:**
- **Tool Logic:** `lib/tools/background-remover.ts` (226 lines)
- **Panel UI:** `components/panels/bg-remover-panel.tsx`
- **API Route:** `app/api/replicate/predictions/route.ts`
- **Status Route:** `app/api/replicate/predictions/[id]/route.ts`
- **Helper Library:** `lib/api/replicate.ts`

### Implementation Flow

```
User triggers BG removal
    ↓
prepareImage() (lines 62-95)
    ├─ If CodeplugTech: Convert RGBA → RGB (line 73-76)
    ├─ If large file: Compress to 2048px max (line 77-88)
    └─ Convert to data URL (line 92)
    ↓
buildModelInput() (lines 100-119)
    └─ Model-specific parameter formatting
    ↓
createPrediction() (line 155)
    ├─ POST /api/replicate/predictions
    └─ Returns prediction ID
    ↓
pollPrediction() (lines 180-187)
    ├─ Poll every 1s → 10s (adaptive backoff)
    ├─ Max 120 retries (6 minutes)
    └─ Returns completed prediction
    ↓
downloadResult() (line 200)
    ├─ Fetch output URL
    ├─ Retry up to 3 times
    └─ Return blob URL
    ↓
Update UI with result
```

### Key Code Snippets

**Model Selection with Fallback:**

```typescript
// lib/tools/background-remover.ts:154-175
try {
  prediction = await createPrediction({
    version: modelConfig.version,
    input,
  });
} catch (error) {
  // If primary model fails, try fallback
  if (model !== 'fallback') {
    console.warn(`${modelConfig.name} failed, trying fallback model...`);
    onProgress?.(40, 'Trying alternative model...');

    const fallbackConfig = MODEL_CONFIGS.fallback;
    const fallbackInput = buildModelInput(imageUrl, settings, 'fallback');

    prediction = await createPrediction({
      version: fallbackConfig.version,
      input: fallbackInput,
    });
  } else {
    throw error;
  }
}
```

**RGB Conversion for CodeplugTech:**

```typescript
// lib/tools/background-remover.ts:73-76
if (model === 'codeplugtech') {
  onProgress?.(15, 'Converting to RGB format...');
  processedImage = await convertToRGB(image);
  console.log('Converted image to RGB for CodeplugTech model');
}
```

---

## Upscaling Implementation

### File Locations

**Primary Implementation:**
- **Tool Logic:** `lib/tools/upscaler.ts` (223 lines)
- **Panel UI:** `components/panels/upscaler-panel.tsx`
- **API Route:** `app/api/replicate/predictions/route.ts` (shared)
- **Status Route:** `app/api/replicate/predictions/[id]/route.ts` (shared)
- **Helper Library:** `lib/api/replicate.ts` (shared)

### Implementation Flow

```
User triggers upscale
    ↓
prepareImage() (lines 67-101)
    ├─ If PNG transparent: Add white background (line 76-80)
    ├─ If large file (>2MB): Compress to 2048px (line 84-94)
    └─ Convert to data URL (line 98)
    ↓
buildModelInput() (lines 106-140)
    ├─ Standard: { image, scale, face_enhance }
    ├─ Creative: { image, scale_factor, creativity, resemblance, ... }
    └─ Anime: { img, version, scale, face_enhance, tile }
    ↓
createPrediction() (line 169)
    ├─ POST /api/replicate/predictions
    └─ Returns prediction ID
    ↓
pollPrediction() (lines 177-184)
    ├─ Poll every 1s → 10s (adaptive backoff)
    ├─ Max 120 retries (6 minutes)
    └─ Returns completed prediction
    ↓
downloadResult() (line 197)
    ├─ Fetch output URL
    ├─ Retry up to 3 times
    └─ Return blob URL
    ↓
Update UI with result
```

### Key Code Snippets

**Transparent PNG Handling:**

```typescript
// lib/tools/upscaler.ts:74-80
if (image.type === 'image/png') {
  const isTransparent = await isPNGTransparent(image);
  if (isTransparent) {
    onProgress?.(15, 'Adding white background to transparent image...');
    processedImage = await addWhiteBackgroundToImage(image);
  }
}
```

**Model-Specific Input Formatting:**

```typescript
// lib/tools/upscaler.ts:106-140
function buildModelInput(imageUrl: string, settings: UpscaleSettings): Record<string, any> {
  const { model, scaleFactor, faceEnhance } = settings;

  if (model === 'standard') {
    return {
      image: imageUrl,
      scale: Math.min(Math.max(scaleFactor || 2, 1), 10),
      face_enhance: faceEnhance || false,
    };
  } else if (model === 'creative') {
    return {
      image: imageUrl,
      scale_factor: scaleFactor || 2,
      creativity: settings.creativity ?? 0.35,
      resemblance: settings.resemblance ?? 0.6,
      dynamic: settings.dynamic ?? 6,
      prompt: settings.prompt || 'masterpiece, best quality, highres',
      scheduler: 'DPM++ 3M SDE Karras',
      sharpen: settings.sharpen ?? 1,
      output_format: settings.outputFormat || 'png',
      downscaling: false,
    };
  } else {
    // Anime model uses 'img' not 'image'
    return {
      img: imageUrl,
      version: 'Anime - anime6B',
      scale: scaleFactor || 2,
      face_enhance: faceEnhance || false,
      tile: 0,
    };
  }
}
```

---

## Quality Checks & Validation

### File Size & Format Validation

**Location:** `lib/constants/file-limits.ts:62-82`

```typescript
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (file.size > FILE_LIMITS.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${FILE_LIMITS.MAX_FILE_SIZE / (1024 * 1024)}MB`,
    };
  }

  if (!FILE_LIMITS.SUPPORTED_IMAGE_TYPES.includes(file.type as any)) {
    return {
      valid: false,
      error: 'Unsupported file type. Please use JPG, PNG, or WEBP',
    };
  }

  return { valid: true };
}
```

**Validation Rules:**

| Check | Limit | File |
|-------|-------|------|
| Max file size | 50MB | `file-limits.ts:8` |
| Max data URL | 4MB | `file-limits.ts:9` |
| Max dimension | 8192px | `file-limits.ts:15` |
| Supported formats | JPG, PNG, WEBP | `file-limits.ts:19-24` |

### Automatic Compression

**Location:** `lib/constants/file-limits.ts:90-92`

```typescript
export function shouldCompressFile(file: File): boolean {
  return file.size > FILE_LIMITS.COMPRESS_THRESHOLD; // 2MB
}
```

**Compression Settings:**

```typescript
// lib/constants/file-limits.ts:30-37
COMPRESSION: {
  quality: 0.85,        // JPEG quality
  maxDimension: 2048,   // Max dimension after compression
  aggressive: {
    quality: 0.7,
    maxDimension: 1500,
  },
}
```

**Applied in:**
- Background Removal: `background-remover.ts:77-88`
- Upscaling: `upscaler.ts:84-94`

### API Error Handling

**Location:** `lib/api/replicate.ts:42-72`

**Error Codes Handled:**

| HTTP Status | Error Code | Message |
|-------------|------------|---------|
| 413 | FILE_TOO_LARGE | "Image file is too large for processing" |
| 401 | API_ERROR | "Authentication failed. Please check API configuration." |
| 429 | API_ERROR | "Rate limit exceeded. Please try again later." |
| Timeout | TIMEOUT | "Processing timed out" |
| Network | NETWORK_ERROR | "Failed to download result" |
| Processing | PROCESSING_ERROR | Model-specific error messages |

### Polling Configuration

**Location:** `lib/constants/file-limits.ts:40-46`

```typescript
POLLING: {
  maxRetries: 120,        // 120 retries max
  interval: 3000,         // 3 seconds (unused - overridden)
  initialInterval: 1000,  // Start at 1 second
  backoffFactor: 1.5,     // Increase by 1.5x each retry
  maxInterval: 10000,     // Cap at 10 seconds
}
```

**Adaptive Backoff:**
```
Retry 1: 1s
Retry 2: 1.5s
Retry 3: 2.25s
Retry 4: 3.375s
...
Retry 10+: 10s (capped)
```

**Max Wait Time:** 120 retries × 10s = 20 minutes (theoretical max)

### Result Validation

**Location:** `lib/api/replicate.ts:179-216`

**Download Retry Logic:**

```typescript
// lib/api/replicate.ts:179-216
export async function downloadResult(
  outputUrl: string,
  maxRetries = 3
): Promise<string> {
  let retryCount = 0;

  while (retryCount < maxRetries) {
    try {
      const response = await fetch(outputUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch result: ${response.status}`);
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Received empty image data');
      }

      return URL.createObjectURL(blob);
    } catch (err) {
      retryCount++;
      if (retryCount < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
      }
    }
  }

  throw createReplicateError('Failed to download result', ERROR_CODES.NETWORK_ERROR);
}
```

**Validation Checks:**
- ✅ HTTP 200 response
- ✅ Non-empty blob
- ✅ Blob size > 0 bytes
- ✅ Retry up to 3 times

---

## Cost Tracking

### Current State

**Status:** ❌ **NO COST TRACKING IMPLEMENTED**

### What's Missing

1. **No prediction cost logging**
   - Replicate API returns cost data in prediction response
   - Not currently captured or stored

2. **No usage analytics**
   - Number of API calls per model
   - Total processing time
   - Success/failure rates

3. **No budget alerts**
   - No spending limits
   - No rate limiting based on cost
   - No cost projections

4. **No user-level tracking**
   - Cannot attribute costs to users
   - Cannot implement usage-based billing

### Replicate Cost Data Available

According to Replicate API docs, each prediction response includes:

```typescript
{
  id: string,
  status: string,
  metrics: {
    predict_time: number,  // Seconds
  },
  // Cost data (if available)
  // Note: May require Pro/Enterprise plan
}
```

### Recommended Cost Tracking Schema

**Database Table:** `replicate_predictions`

```sql
CREATE TABLE replicate_predictions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR,
  model_type VARCHAR, -- 'background_removal' | 'upscaler'
  model_name VARCHAR, -- 'bria', 'standard', etc.
  prediction_id VARCHAR,
  status VARCHAR,
  predict_time_seconds DECIMAL,
  input_size_bytes INTEGER,
  output_size_bytes INTEGER,
  estimated_cost_cents INTEGER,
  created_at TIMESTAMP,
  completed_at TIMESTAMP
);
```

**Cost Estimation:**

Based on Replicate pricing (estimated):
- Background Removal: ~$0.001-0.003 per image
- Upscaling: ~$0.002-0.005 per image
- Varies by processing time and image size

### Implementation Priority

**Priority:** 🔴 HIGH (before production launch)

**Reasoning:**
- Cannot scale without cost visibility
- Risk of unexpected billing spikes
- Required for usage-based pricing model

---

## API Integration Architecture

### Request Flow

```
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  Tool Component (BG Remover / Upscaler)                    │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 1. prepareImage()
                     │    - Compress if >2MB
                     │    - Convert to data URL
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   CLIENT LIBRARY                            │
│  lib/api/replicate.ts                                       │
│  - createPrediction()                                       │
│  - pollPrediction()                                         │
│  - downloadResult()                                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 2. POST /api/replicate/predictions
                     │    { version, input }
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTE                        │
│  app/api/replicate/predictions/route.ts                    │
│  - Validate API token                                       │
│  - Proxy to Replicate API                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 3. POST https://api.replicate.com/v1/predictions
                     │    Authorization: Token xxx
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    REPLICATE API                            │
│  - Queue prediction                                         │
│  - Return prediction ID                                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 4. Return { id, status: "starting" }
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  Poll for completion every 1-10s (adaptive)                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 5. GET /api/replicate/predictions/[id]
                     │    (Loop until status = "succeeded")
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    NEXT.JS API ROUTE                        │
│  app/api/replicate/predictions/[id]/route.ts               │
│  - GET status from Replicate                                │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 6. GET https://api.replicate.com/v1/predictions/[id]
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                    REPLICATE API                            │
│  - Return current status + output URL                       │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ 7. Return { status, output }
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                        BROWSER                              │
│  - Download output image from Replicate CDN                │
│  - Convert to blob URL                                      │
│  - Update UI                                                │
└─────────────────────────────────────────────────────────────┘
```

### API Routes Code

**Create Prediction:**

```typescript
// app/api/replicate/predictions/route.ts
export async function POST(request: NextRequest) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;

  const { version, input } = await request.json();

  const response = await fetch('https://api.replicate.com/v1/predictions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Token ${REPLICATE_API_TOKEN}`,
    },
    body: JSON.stringify({ version, input }),
  });

  return NextResponse.json(await response.json());
}
```

**Get Status:**

```typescript
// app/api/replicate/predictions/[id]/route.ts
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN;
  const { id } = params;

  const response = await fetch(
    `https://api.replicate.com/v1/predictions/${id}`,
    {
      headers: {
        Authorization: `Token ${REPLICATE_API_TOKEN}`,
      },
    }
  );

  return NextResponse.json(await response.json());
}
```

---

## Performance Characteristics

### Average Processing Times

**Background Removal:**
| Model | Typical Time | Range |
|-------|--------------|-------|
| Bria RMBG | 2-4s | 1-8s |
| CodeplugTech | 1-3s | 1-5s |
| Fallback | 2-5s | 1-10s |

**Upscaling:**
| Model | Typical Time | Range | Scale Factor |
|-------|--------------|-------|--------------|
| Standard | 3-6s | 2-12s | 2x |
| Creative | 8-15s | 5-30s | 2x |
| Anime | 4-8s | 2-15s | 2x |

*Times increase proportionally with scale factor and image size*

### Bandwidth Usage

**Upload (to Replicate):**
- Uncompressed: Original file size (up to 50MB)
- Compressed: ~500KB - 2MB (for images >2MB)
- Data URL overhead: +33% base64 encoding

**Download (from Replicate CDN):**
- PNG: 1-10MB (depends on dimensions and complexity)
- JPG: 500KB - 5MB (lossy compression)
- WEBP: 300KB - 3MB (better compression)

### Memory Usage

**Client-Side:**
- Original image: File size
- Compressed copy: ~500KB - 2MB
- Data URL string: +33% of image size
- Result blob: Output image size
- Blob URL: Minimal (pointer only)

**Peak memory:** ~3-4x original file size (temporary)

---

## Known Issues & Limitations

### Background Removal

1. **CodeplugTech RGB Requirement**
   - **Issue:** Requires RGB (3-channel) input, RGBA causes tensor dimension errors
   - **Workaround:** Automatic RGB conversion (line 73-76)
   - **Impact:** Extra processing step, slight quality loss
   - **File:** `background-remover.ts:73-76`

2. **Fallback Model Inconsistency**
   - **Issue:** 851 Labs model sometimes produces different edge quality
   - **Impact:** Users may notice different results on retry
   - **Workaround:** None (by design for reliability)

3. **Large File Compression**
   - **Issue:** Files >2MB are compressed to 2048px max dimension
   - **Impact:** Loss of detail for high-res images
   - **Workaround:** None (API limitations)
   - **File:** `background-remover.ts:77-88`

### Upscaling

1. **Transparent PNG White Background**
   - **Issue:** Upscaler models don't handle transparency well
   - **Workaround:** Automatic white background added (line 76-80)
   - **Impact:** Transparent areas become white
   - **File:** `upscaler.ts:76-80`

2. **Creative Model Slow**
   - **Issue:** Clarity Upscaler takes 8-15s (2-3x slower than standard)
   - **Impact:** User may wait longer
   - **Workaround:** Progress indicators
   - **Optimization:** Could switch to faster model for large images

3. **Anime Model Parameter Mismatch**
   - **Issue:** Uses 'img' instead of 'image' parameter
   - **Workaround:** Conditional parameter naming (line 133)
   - **Impact:** Code maintenance complexity
   - **File:** `upscaler.ts:133`

### General API Issues

1. **No Cost Tracking**
   - **Issue:** Cannot monitor or limit API spending
   - **Impact:** Risk of unexpected bills
   - **Priority:** 🔴 HIGH
   - **Solution:** Implement prediction logging (see Cost Tracking section)

2. **No Rate Limiting**
   - **Issue:** Users can spam API calls
   - **Impact:** Cost spikes, potential API ban
   - **Priority:** 🔴 HIGH
   - **Solution:** Implement rate limiting middleware

3. **Long Polling Inefficient**
   - **Issue:** Polling every 1-10s for up to 20 minutes
   - **Impact:** Unnecessary API calls, client keeps connection open
   - **Priority:** 🟡 MEDIUM
   - **Solution:** Implement webhooks (Replicate supports this)

4. **No Retry Limit Per User**
   - **Issue:** Failed predictions don't count against user quota
   - **Impact:** Users can burn through API calls on errors
   - **Priority:** 🟡 MEDIUM
   - **Solution:** Track failed attempts, implement cooldown

5. **Image Size Not Checked Before Upload**
   - **Issue:** Large images sent to API before checking if supported
   - **Impact:** Wasted bandwidth, slower failures
   - **Priority:** 🟢 LOW
   - **Solution:** Pre-check dimensions and size client-side

---

## Appendix: File Reference Matrix

### All Files Related to Replicate Integration

| File Path | Lines | Purpose | Contains Models |
|-----------|-------|---------|-----------------|
| `lib/tools/background-remover.ts` | 226 | BG removal tool logic | Bria, CodeplugTech, Fallback (3) |
| `lib/tools/upscaler.ts` | 223 | Upscaling tool logic | Standard, Creative, Anime (3) |
| `lib/api/replicate.ts` | 257 | Replicate API client | N/A |
| `app/api/replicate/predictions/route.ts` | 64 | Create prediction endpoint | N/A |
| `app/api/replicate/predictions/[id]/route.ts` | 64 | Get status endpoint | N/A |
| `lib/constants/file-limits.ts` | 93 | Validation & limits | N/A |
| `components/panels/bg-remover-panel.tsx` | ~600 | BG removal UI panel | N/A |
| `components/panels/upscaler-panel.tsx` | ~420 | Upscaling UI panel | N/A |
| `lib/canvas-utils.ts` | ~300 | Image processing utils | N/A |
| `lib/file-utils.ts` | ~100 | File conversion utils | N/A |

### Environment Variables Required

```bash
# .env.local
REPLICATE_API_TOKEN=r8_xxx...    # Primary
REPLICATE_API_KEY=r8_xxx...      # Fallback (legacy)
```

**Note:** Code checks both variables for backwards compatibility
**File:** `app/api/replicate/predictions/route.ts:8`

---

## Next Steps

Based on this baseline, the following optimizations should be prioritized:

### October 2025 Model Updates

**Research Required:**
1. Check Replicate catalog for newer model versions (Oct 2025)
2. Test October 2025 models for performance/quality improvements
3. Benchmark cost differences
4. Document breaking changes in parameters

**Focus Areas:**
- Background removal: Better edge handling, faster processing
- Upscaling: Lower latency creative models, better transparency support
- Cost efficiency: Models with same quality at lower cost

### Implementation Priorities

**Phase 1: Cost Tracking (1 week)**
- [ ] Add prediction logging to database
- [ ] Implement cost estimation
- [ ] Create usage dashboard
- [ ] Set up budget alerts

**Phase 2: Model Optimization (2 weeks)**
- [ ] Test Oct 2025 models
- [ ] A/B test quality
- [ ] Benchmark performance
- [ ] Update model configs
- [ ] Document changes

**Phase 3: Rate Limiting (1 week)**
- [ ] Implement per-user quotas
- [ ] Add cooldown on failures
- [ ] Create usage tiers
- [ ] Display remaining quota in UI

---

**Document Prepared By:** Flow Editor Development Team
**Next Review:** After Oct 2025 model testing
**Related Docs:**
- [PRD_FLOW_EDITOR.md](../PRD_FLOW_EDITOR.md)
- [TOOL_IMPLEMENTATIONS.md](../TOOL_IMPLEMENTATIONS.md)
- [TEST_RESULTS_SUMMARY.md](../TEST_RESULTS_SUMMARY.md)
