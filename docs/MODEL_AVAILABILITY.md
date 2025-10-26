# Replicate Model Availability - October 2025 Research

**Document Version:** 1.0.0
**Research Date:** October 13, 2025
**Purpose:** Verify model existence, pricing, and parameters for potential integration
**Status:** Research Only - No Implementation

---

## Executive Summary

This document verifies the availability of AI models on Replicate's platform as of October 2025. All pricing and parameters are current as of the research date.

### Quick Status

| Model Request | Status | Replicate URL | Cost/Image |
|---------------|--------|---------------|------------|
| BRIA RMBG 2.0 | ✅ **FOUND** | `bria/remove-background` | $0.018 |
| Magic Image Refiner | ✅ **FOUND** | `batouresearch/magic-image-refiner` | ~$0.006 (avg) |
| VTracer | ❌ **NOT FOUND** | N/A | N/A |
| Recraft Vectorize | ✅ **ALTERNATIVE** | `recraft-ai/recraft-vectorize` | $0.01 |

### Key Findings

- **BRIA RMBG 2.0** exists and is more expensive but higher quality than current models
- **Magic Image Refiner** exists and could replace/supplement current upscalers
- **VTracer** is not on Replicate, but **Recraft Vectorize** provides SVG conversion
- **851-labs/background-remover** is 53x cheaper than BRIA ($0.00034 vs $0.018)

---

## 1. Background Removal Models

### Model A: Bria Remove Background (RMBG 2.0)

**Status:** ✅ **VERIFIED - EXISTS ON REPLICATE**

#### Model Identification

```
Model Path: bria/remove-background
Version ID: 0d70cc721b10cd04ea9194a33d27d7004b6aebba3911fa145eedf6cfe307ccac
Hardware: CPU
Added to Replicate: July 17, 2025
```

#### Pricing

| Metric | Cost |
|--------|------|
| **Per Output Image** | **$0.018** |
| Images per $1 | ~55 images |
| Hardware | CPU (slower, cheaper) |

**Comparison to Current:**
- Current (BRIA RMBG 1.4): Unknown cost (need to check)
- New (BRIA RMBG 2.0): $0.018 per image
- **Price Impact:** Need baseline comparison

#### Input Parameters

```typescript
interface BriaRemoveBackgroundInput {
  // Image input (one required)
  image?: string;        // URI to image file
  image_url?: string;    // Image URL (alternative)

  // Features
  content_moderation?: boolean;        // Default: false
  preserve_partial_alpha?: boolean;    // Default: true
}
```

**Parameter Details:**

1. **image** (string, URI, nullable)
   - Description: Image file
   - Format: URI or data URL
   - Default: null

2. **image_url** (string, URI, nullable)
   - Description: Image URL
   - Format: HTTP(S) URL
   - Default: null
   - Note: Alternative to `image` parameter

3. **content_moderation** (boolean)
   - Description: Enable content moderation
   - Default: false
   - Purpose: Filter inappropriate content

4. **preserve_partial_alpha** (boolean)
   - Description: Controls whether partially transparent areas from the input image are retained in the output
   - Default: true
   - **Key Feature:** 256 levels of transparency (not just binary)

#### Key Features

**Advanced Transparency:**
- Uses **non-binary masks** with **256 transparency levels**
- Better edge quality vs. binary masks
- Natural blending with any background

**Training Data:**
- Trained exclusively on **licensed data** (Getty Images, Envato, Freepik)
- **15,000+ high-quality images** with pixel-wise manual labeling
- Safe for commercial use (no copyright issues)

**Architecture:**
- Based on **BiRefNet architecture**
- Enhanced with BRIA proprietary training

**Quality:**
- Preserves fine image details
- Natural edge transitions
- Suitable for professional use

#### Deprecation Notices

**✅ NO DEPRECATION WARNINGS**

- RMBG 1.4 is still supported (current version in our app)
- RMBG 2.0 is the latest (July 2025)
- No forced migration required

#### Use Cases

**Best For:**
- Professional product photography
- E-commerce images
- Gaming assets
- Advertising content
- High-quality edge preservation

**Commercial License:**
- Non-commercial: Free (with attribution)
- Commercial: Requires BRIA license
- **Replicate Usage:** Covered by Replicate terms

---

### Model B: 851 Labs Background Remover

**Status:** ✅ **VERIFIED - CURRENTLY IN USE (FALLBACK MODEL)**

#### Model Identification

```
Model Path: 851-labs/background-remover
Version ID: a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc
Hardware: Nvidia T4 GPU
Current Status: In use as fallback model
```

#### Pricing

| Metric | Cost |
|--------|------|
| **Per Run** | **$0.00034** |
| Runs per $1 | ~2,941 runs |
| Hardware | Nvidia T4 GPU |

**Cost Comparison:**
- **851 Labs:** $0.00034 per run
- **BRIA 2.0:** $0.018 per run
- **Difference:** BRIA is **53x more expensive**
- **Trade-off:** BRIA has better quality, 851 Labs is much cheaper

#### Features

**Replicate's Recommendation:**
> "For most projects, we recommend 851-labs/background-remover, which is very fast and provides cleaner edges and fewer artifacts than other open-source options."

**Characteristics:**
- ✅ Very fast processing
- ✅ Clean edges
- ✅ Fewer artifacts than alternatives
- ✅ Cost-effective ($0.00034 vs $0.018)
- ❌ Not as refined as BRIA 2.0

#### Current Usage in Flow Editor

**File:** `lib/tools/background-remover.ts:52-56`

```typescript
fallback: {
  version: 'a029dff38972b5fda4ec5d75d7d1cd25aeff621d2cf4946a41055d7db66b80bc',
  name: '851 Labs',
  description: 'Reliable fallback model',
}
```

**Usage:** Auto-fallback when primary models fail

---

## 2. Image Upscaling / Refinement Models

### Model C: Magic Image Refiner

**Status:** ✅ **VERIFIED - EXISTS ON REPLICATE**

#### Model Identification

```
Model Path: batouresearch/magic-image-refiner
Maintainer: batouresearch
Last Updated: February 22, 2025
Hardware: L40S GPU
```

#### Pricing

| Metric | Cost |
|--------|------|
| **Per Second** | **$0.000975** |
| P50 Price (median) | **$0.0060** per run |
| Typical Duration | 6-8 seconds |
| Typical Cost | **~$0.006** per image |

**Cost Comparison to Current Upscalers:**
- **Standard Real-ESRGAN:** Unknown cost (need baseline)
- **Creative (Clarity):** Unknown cost (need baseline)
- **Magic Refiner:** $0.006 per image (estimated)

#### Input Parameters

```typescript
interface MagicImageRefinerInput {
  // Required
  image: string;              // URI to image to refine

  // Core Settings
  prompt?: string;            // Prompt for the model
  steps?: number;             // Default: 20
  creativity?: number;        // Default: 0.25 (range: 0-1)
  resemblance?: number;       // Default: 0.75 (range: 0-1)
  guidance_scale?: number;    // Default: 7

  // Advanced Settings
  resolution?: string;        // Default: "original" | "1024" | "2048"
  hdr?: number;              // Default: 0 (HDR improvement)
  negative_prompt?: string;   // Default includes bad anatomy, low quality
  scheduler?: string;         // Default: "DDIM"

  // Optional Features
  mask?: string;             // URI to image section mask
  seed?: number;             // Random seed for reproducibility
}
```

**Parameter Details:**

1. **image** (string, URI, **required**)
   - Image to refine
   - Format: Data URL or blob URL

2. **prompt** (string)
   - Description for refinement
   - Example: "high quality, sharp details, professional"
   - Influences refinement style

3. **steps** (integer, default: 20)
   - Refinement steps
   - More steps = better quality, slower
   - Range: 10-50 typical

4. **creativity** (float, default: 0.25)
   - Denoising strength
   - Range: 0-1
   - **Lower:** More faithful to original (0.25 = 25%)
   - **Higher:** More creative interpretation

5. **resolution** (string, default: "original")
   - Options: `"original"`, `"1024"`, `"2048"`
   - Controls output resolution
   - "original" maintains input size

6. **resemblance** (float, default: 0.75)
   - ControlNet conditioning scale
   - Range: 0-1
   - **Higher:** Closer to original (0.75 = 75%)
   - **Lower:** More freedom to refine

7. **guidance_scale** (float, default: 7)
   - Classifier-free guidance scale
   - Controls prompt adherence
   - Range: 1-20 (7 is balanced)

8. **negative_prompt** (string)
   - Default: "low quality, bad anatomy, worst quality"
   - Things to avoid in refinement

9. **hdr** (float, default: 0)
   - HDR improvement strength
   - Range: 0-1
   - Enhances dynamic range

10. **mask** (string, URI, optional)
    - Optional mask for selective refinement
    - Only refine specific image areas
    - **Use Case:** Inpainting, selective enhancement

11. **seed** (integer, optional)
    - Random seed for reproducibility
    - Same seed = same result

12. **scheduler** (string, default: "DDIM")
    - Options: `"DDIM"`, `"DPMSolverMultistep"`, `"K_EULER_ANCESTRAL"`, `"K_EULER"`
    - Controls sampling algorithm
    - DDIM is fastest and most stable

#### Key Features

**Positioning:**
> "A better alternative to SDXL refiners, providing a lot of quality and detail"

**Capabilities:**
- ✅ Image refinement with AI enhancement
- ✅ Upscaling (via resolution parameter)
- ✅ Inpainting (via mask parameter)
- ✅ Selective area refinement
- ✅ Quality and detail improvement

**Best For:**
- Enhancing AI-generated images
- Upscaling with quality improvement
- Fixing artifacts or improving details
- Selective image enhancement

**Comparison to Current Upscalers:**
- **More Features:** Mask support, prompt-guided
- **More Control:** Creativity, resemblance sliders
- **More Versatile:** Can upscale AND refine quality

#### Deprecation Notices

**✅ NO DEPRECATION WARNINGS**

- Model updated February 22, 2025 (recent)
- Active development and maintenance

---

## 3. SVG Vectorization Models

### Model D: VTracer by VisionCortex

**Status:** ❌ **NOT FOUND ON REPLICATE**

#### Research Summary

**What VTracer Is:**
- Open-source raster-to-vector converter
- Converts JPG/PNG → SVG
- Designed for high-resolution scans (up to gigapixels)
- Superior to Potrace (O(n) vs O(n²) algorithm)

**Where It Exists:**
- ❌ NOT on Replicate platform
- ✅ Available as Python package (PyPI)
- ✅ Available as Rust library
- ✅ Available as CLI tool
- ✅ Web demo at visioncortex.org/vtracer/

**Why Not on Replicate:**
- VTracer is a traditional algorithm, not an AI model
- Replicate focuses on AI/ML models
- VTracer doesn't require GPU acceleration

#### Alternative Solutions

**Option 1: Self-Host VTracer**
```bash
# Python
pip install vtracer

# Usage
vtracer input.png output.svg
```

**Option 2: Use Replicate Alternative (see Model E)**

---

### Model E: Recraft Vectorize (Alternative to VTracer)

**Status:** ✅ **VERIFIED - EXISTS ON REPLICATE**

#### Model Identification

```
Model Path: recraft-ai/recraft-vectorize
Version ID: 85bfd1d3da280f0cd1c94f312d33c350b239f33e167a7eb297a6fac46ba1275f
Provider: Recraft AI
Hardware: GPU
```

#### Pricing

| Metric | Cost |
|--------|------|
| **Per Output Image** | **$0.01** |
| Images per $1 | 100 images |
| **Per Second** | **$0.0001** |
| Typical Duration | ~5-10 seconds |

**Cost Estimate:**
- $0.01 per SVG output
- Affordable for reasonable usage
- More expensive than self-hosting VTracer (free)

#### Input Parameters

```typescript
interface RecraftVectorizeInput {
  // Required
  image: string;              // URI to raster image
}
```

**Parameter Details:**

1. **image** (string, URI, **required**)
   - Raster image to convert to SVG
   - Supported formats: PNG, JPG, WEBP
   - Limitations:
     - Max file size: **5MB**
     - Max resolution: **16MP** (megapixels)
     - Max dimension: **4096px**
     - Min dimension: **256px**

**Output:**
- SVG file with vector paths
- Optimized for file size
- Compatible with Adobe Illustrator, Figma, Sketch

#### Key Features

**AI-Powered Vectorization:**
- Uses Recraft's AI technology (3M+ users)
- Precision vectorization with clean paths
- Maintains visual fidelity and design intent

**Quality:**
- ✅ Professional-grade vector output
- ✅ Clean, optimized paths
- ✅ Suitable for logos, icons, illustrations

**Integration:**
- ✅ Compatible with design tools (Illustrator, Figma, Sketch)
- ✅ Scalable graphics (SVG)
- ✅ Commercial usage allowed

**Use Cases:**
- Logo vectorization
- Icon creation
- Scalable graphic conversion
- Design workflow integration

#### Comparison to VTracer

| Feature | VTracer | Recraft Vectorize |
|---------|---------|-------------------|
| **Availability** | Self-host, Python, Rust | Replicate API |
| **Cost** | Free (open-source) | $0.01 per image |
| **Integration** | Manual setup | API call |
| **Quality** | Algorithmic (traditional) | AI-powered |
| **Speed** | Fast (O(n) algorithm) | ~5-10s per image |
| **Resolution** | Gigapixel support | Max 16MP |
| **Ease of Use** | Requires installation | API call only |

**Recommendation:**
- **Use Recraft Vectorize** if:
  - Want AI-enhanced quality
  - Prefer API integration
  - Don't want to manage infrastructure
  - Budget allows $0.01/image

- **Use VTracer (self-host)** if:
  - Budget is very tight (free)
  - Need gigapixel support
  - Want algorithmic control
  - Can manage Python/Rust deployment

---

## 4. Additional Models Discovered

### Model F: SwinIR (Superior Upscaling)

**Status:** ✅ **FOUND ON REPLICATE**

#### Quick Summary

```
Model Path: jingyunliang/swinir (likely)
Purpose: Image upscaling (alternative to Real-ESRGAN)
Hardware: Nvidia T4 GPU
```

#### Research Notes

**From Replicate's Guidance:**
> "SwinIR is very good at upscaling small and low quality images, and like Real-ESRGAN, it is fast and cheap to run."

**Quality Comparison:**
- **SwinIR:** Better textures, superior facial hair and skin detail
- **Real-ESRGAN:** Faster (1.4s vs 4s)
- **Trade-off:** SwinIR = better quality, Real-ESRGAN = faster

**Performance:**
- SwinIR: ~4 seconds
- Real-ESRGAN: ~1.4 seconds
- Hardware: Both run on Nvidia T4 (cheap)

**Pricing:**
- Likely similar to Real-ESRGAN (T4 GPU)
- Need to fetch exact model page for pricing

**Recommendation:**
- Consider testing SwinIR for quality-focused upscaling
- Keep Real-ESRGAN for speed-focused upscaling
- Offer as user choice: "Fast" vs "Quality"

---

## 5. Cost Comparison Matrix

### Background Removal

| Model | Cost | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| **851 Labs** (current fallback) | $0.00034 | Fast | Good | Cost-effective, high volume |
| **BRIA 1.4** (current primary) | Unknown | Medium | Very Good | Current default |
| **BRIA 2.0** (new) | $0.018 | Medium | Excellent | Premium quality, 256-level alpha |
| **CodeplugTech** (current) | Unknown | Fast | Good | Current secondary |

**Cost Impact:**
- 851 Labs → BRIA 2.0 = **53x cost increase** ($0.00034 → $0.018)
- BRIA 1.4 → BRIA 2.0 = **Unknown** (need baseline pricing)

**Recommendation:**
- Keep 851 Labs as **budget option** (53x cheaper)
- Add BRIA 2.0 as **premium option** (better quality)
- Let users choose: "Fast & Cheap" vs "High Quality"

### Upscaling / Refinement

| Model | Cost (Est.) | Speed | Use Case |
|-------|-------------|-------|----------|
| **Real-ESRGAN Standard** (current) | Unknown | ~1.8s | General purpose |
| **Real-ESRGAN Anime** (current) | Unknown | ~4-8s | Illustrations |
| **Clarity Upscaler** (current) | Unknown | ~8-15s | Creative enhancement |
| **Magic Image Refiner** (new) | $0.006 | ~6-8s | Quality refinement + upscaling |
| **SwinIR** (discovered) | Unknown | ~4s | Quality-focused upscaling |

**Analysis:**
- Magic Refiner offers **more features** (mask, prompt, HDR)
- SwinIR offers **better quality** than Real-ESRGAN
- Need baseline pricing to make informed decision

### Vectorization

| Solution | Cost | Integration | Quality |
|----------|------|-------------|---------|
| **VTracer** (self-host) | $0 (free) | Manual | Algorithmic (traditional) |
| **Recraft Vectorize** (API) | $0.01/image | API call | AI-enhanced |

**Recommendation:**
- **Start with Recraft Vectorize** ($0.01/image is reasonable)
- If volume is very high, consider self-hosting VTracer

---

## 6. Recommended Next Steps

### Phase 1: Baseline Current Costs (1 day)

**Action Items:**
- [ ] Add cost tracking to existing Replicate predictions
- [ ] Log 100+ predictions to establish baseline
- [ ] Calculate average cost per model

**Why:** Need baseline costs before comparing to new models

### Phase 2: Model Testing (3-5 days)

**Priority 1: Background Removal**
- [ ] Test BRIA 2.0 quality vs. current models
- [ ] Compare edge quality, transparency handling
- [ ] Benchmark processing time
- [ ] Decide: Replace primary or offer as premium?

**Priority 2: Upscaling**
- [ ] Test Magic Image Refiner quality
- [ ] Test SwinIR vs Real-ESRGAN
- [ ] Compare quality, speed, cost
- [ ] Decide: Replace or add as options?

**Priority 3: Vectorization** (Optional)
- [ ] Test Recraft Vectorize on logos/icons
- [ ] Compare to VTracer (self-hosted test)
- [ ] Evaluate cost vs. self-hosting
- [ ] Decide: Integrate or defer?

### Phase 3: Cost-Benefit Analysis (1 day)

**Decision Matrix:**

| Factor | Weight | BRIA 2.0 | Magic Refiner | Recraft Vectorize |
|--------|--------|----------|---------------|-------------------|
| Quality Improvement | 40% | ? | ? | ? |
| Cost Impact | 30% | +5300% | ? | New feature |
| User Demand | 20% | High | Medium | Low |
| Implementation Effort | 10% | Low | Low | Medium |
| **Total Score** | 100% | **TBD** | **TBD** | **TBD** |

**Questions to Answer:**
1. Will users pay for BRIA 2.0's quality? (53x cost)
2. Does Magic Refiner replace or supplement current upscalers?
3. Is vectorization a must-have or nice-to-have?

### Phase 4: Implementation Plan (Based on Analysis)

**Recommended Approach:**

**Option A: Tiered Quality**
```typescript
// Let users choose quality tier
backgroundRemovalQuality: 'budget' | 'standard' | 'premium'
// budget = 851 Labs ($0.00034)
// standard = BRIA 1.4 (current)
// premium = BRIA 2.0 ($0.018)
```

**Option B: Intelligent Auto-Select**
```typescript
// Automatically select model based on image characteristics
if (needsHighQualityEdges && budget.allows('premium')) {
  model = 'bria-2.0';
} else if (simpleBackground) {
  model = '851-labs';
} else {
  model = 'bria-1.4';
}
```

**Option C: Premium Features**
```typescript
// BRIA 2.0 and Magic Refiner as paid add-ons
userPlan: 'free' | 'pro' | 'enterprise'
// free: 851 Labs, Real-ESRGAN
// pro: BRIA 2.0, Magic Refiner
// enterprise: All models, priority processing
```

---

## 7. Deprecation & Compatibility Notes

### Models Currently in Use

**Safe to Continue Using:**
- ✅ BRIA RMBG 1.4 - No deprecation warnings
- ✅ 851 Labs Background Remover - Actively recommended by Replicate
- ✅ Real-ESRGAN (all variants) - Still maintained
- ✅ CodeplugTech - No warnings found

**No Breaking Changes Detected:**
- All current model APIs remain stable
- No forced migrations required
- Gradual upgrade path available

### Future-Proofing

**API Version:**
- All models use Replicate API v1
- No v2 migration announcements found

**Long-Term Support:**
- BRIA models backed by commercial company (stable)
- 851 Labs actively maintained
- Real-ESRGAN widely used (community support)

---

## 8. Summary & Recommendations

### Verified Models

| Model | Status | Recommended Action |
|-------|--------|-------------------|
| **BRIA RMBG 2.0** | ✅ Exists | **Test quality**, compare cost/benefit |
| **Magic Image Refiner** | ✅ Exists | **Test features**, evaluate vs. current upscalers |
| **VTracer** | ❌ Not on Replicate | Consider **Recraft Vectorize** alternative |
| **Recraft Vectorize** | ✅ Exists | **Evaluate need** for vectorization feature |
| **SwinIR** | ✅ Exists (bonus) | **Test quality** vs. Real-ESRGAN |

### Cost Impact Assessment

**High Cost Increase:**
- ⚠️ BRIA 2.0 is **53x more expensive** than 851 Labs
- ⚠️ Need baseline costs for informed decision
- ⚠️ May require premium pricing tier

**Medium Cost Impact:**
- Magic Image Refiner: $0.006/image (need baseline comparison)
- Recraft Vectorize: $0.01/image (new feature, no baseline)

### Implementation Priority

**Priority 1: Background Removal (BRIA 2.0)**
- **Why:** Significant quality improvement (256-level alpha)
- **Risk:** 53x cost increase
- **Recommendation:** Test quality, offer as premium option

**Priority 2: Upscaling Enhancement (Magic Refiner or SwinIR)**
- **Why:** More control and features
- **Risk:** Medium cost impact, complexity
- **Recommendation:** Test both, pick best balance

**Priority 3: Vectorization (Recraft Vectorize)**
- **Why:** New capability (raster → SVG)
- **Risk:** Low demand, $0.01/image cost
- **Recommendation:** Survey users first, then decide

---

## Appendix: Research URLs

**Models Verified:**
- BRIA Remove Background: https://replicate.com/bria/remove-background
- Magic Image Refiner: https://replicate.com/batouresearch/magic-image-refiner
- Recraft Vectorize: https://replicate.com/recraft-ai/recraft-vectorize
- 851 Labs Background Remover: https://replicate.com/851-labs/background-remover

**Additional Resources:**
- Replicate Pricing: https://replicate.com/pricing
- Background Removal Collection: https://replicate.com/collections/remove-backgrounds
- Super-Resolution Collection: https://replicate.com/collections/super-resolution
- VTracer GitHub: https://github.com/visioncortex/vtracer

---

**Research Completed By:** Flow Editor Development Team
**Next Actions:**
1. Establish cost baseline for current models
2. Test quality of new models
3. Conduct cost-benefit analysis
4. Create implementation plan based on findings

**Related Docs:**
- [CURRENT_STATE_BASELINE.md](./CURRENT_STATE_BASELINE.md)
- [PRD_FLOW_EDITOR.md](../PRD_FLOW_EDITOR.md)
