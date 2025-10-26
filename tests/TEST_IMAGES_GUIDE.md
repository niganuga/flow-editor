# Test Images Guide for V1 vs V2 Comparison

High-quality stock images for testing background removal and upscaling operations.

**Generated:** October 13, 2025

---

## 📋 Overview

This guide provides 3 high-quality test images covering different styles:
1. **Illustration** - Vector/cartoon art for testing edge quality
2. **Logo** - Simple graphics for testing transparency
3. **Photorealism** - Professional photography for testing detail preservation

All images are **free to use** for testing purposes.

---

## 🎨 1. ILLUSTRATION

### Recommended Image: Cartoon Character

**Best Sources:**
- **PurePNG**: https://purepng.com/cartoon
- **StickPNG**: https://www.stickpng.com/cat/cartoons
- **Freepik**: https://www.freepik.com/free-photos-vectors/cartoon-character

**Example: Cartoon Character PNG**
- **URL**: https://purepng.com/cartoon
- **Format**: PNG with transparent background
- **Resolution**: High-quality (1000x1000+)
- **License**: CC0 Public Domain

**Why this tests well:**
- ✅ Complex edges (hair, clothing details)
- ✅ Vibrant colors (tests color preservation)
- ✅ Clear subject separation (tests background removal)
- ✅ Upscaling shows if details become pixelated

**Download Instructions:**
1. Visit https://purepng.com/cartoon
2. Browse cartoon character gallery
3. Click on any character image
4. Click "Download PNG" button
5. Save as `test-illustration.png`

**Recommended specific images:**
- 3D cartoon character (smooth gradients)
- Animated character with hair details
- Character with complex clothing

---

## 🏷️ 2. LOGO

### Recommended Image: Nike Logo (Swoosh)

**Source:** PurePNG
- **Direct URL**: https://purepng.com/photo/1648/logos-nike-logo
- **Format**: PNG with transparent background
- **Resolution**: Multiple sizes available (256x256 to 2000x2000)
- **License**: Free for personal/educational use

**Alternative Logo Sources:**
- **Apple Logo**: Search "apple logo" on PurePNG
- **Adidas Logo**: https://purepng.com/adidas
- **Google Logo**: https://purepng.com/google
- **Abstract Logo**: https://www.cleanpng.com/free/logo.html

**Why logos test well:**
- ✅ Simple shapes (tests precision)
- ✅ Solid colors (tests color accuracy)
- ✅ Already transparent (tests if transparency preserved)
- ✅ Upscaling should maintain crisp edges

**Download Instructions:**
1. Visit https://purepng.com/photo/1648/logos-nike-logo
2. Choose resolution (recommend 1000x1000+)
3. Right-click image → "Save image as"
4. Save as `test-logo.png`

**Best for testing:**
- Background removal: Should detect no background to remove
- Upscaling: Should maintain sharp vector-like edges
- Quality validation: Should score 100/100 (already perfect)

---

## 📸 3. PHOTOREALISM

### Recommended Image: Portrait Photography

**Best Source:** Unsplash
- **Portrait Gallery**: https://unsplash.com/s/photos/portrait
- **Studio Portrait**: https://unsplash.com/s/photos/studio-portrait
- **Product Photography**: https://unsplash.com/s/photos/product-photography

**Example: High-Quality Portrait**
- **URL**: https://unsplash.com/s/photos/portrait
- **Format**: JPEG (high-quality, 3000x4000+)
- **Resolution**: Professional camera quality
- **License**: Free to use (Unsplash License)

**Alternative Photorealism Sources:**
- **Pexels Portraits**: https://www.pexels.com/search/portrait/
- **Pixabay Photos**: https://pixabay.com/photos/
- **RawPixel**: https://www.rawpixel.com/category/53/free-images

**Why photorealism tests well:**
- ✅ Complex backgrounds (tests bg removal accuracy)
- ✅ Fine details (hair, skin texture, fabric)
- ✅ Natural lighting (tests if upscaling preserves quality)
- ✅ Large file size (tests compression/processing)

**Download Instructions:**
1. Visit https://unsplash.com/s/photos/portrait
2. Find a studio portrait with clean background
3. Click image to open full view
4. Click download button (top right)
5. Save as `test-photorealism.jpg`

**Recommended specific subjects:**
- **Person with clear background** (white/solid color) - Best for bg removal
- **Product photo on table** - Tests object detection
- **Studio portrait** - High detail for upscaling tests

---

## 📥 Quick Setup Script

Create these test images in your project:

```bash
# Create test images directory
mkdir -p /Users/makko/Code/OneFlow/flow-editor/tests/fixtures/images

# Download test images (manual - visit URLs above)
# Or use wget/curl if you have direct image URLs

# Expected files:
# tests/fixtures/images/test-illustration.png
# tests/fixtures/images/test-logo.png
# tests/fixtures/images/test-photorealism.jpg
```

---

## 🧪 Test Usage

### In V1 vs V2 Comparison Tests

```typescript
import { readFileSync } from 'fs'
import { join } from 'path'

const FIXTURES_DIR = join(__dirname, 'fixtures', 'images')

// Load test images
const illustrationImage = new File(
  [readFileSync(join(FIXTURES_DIR, 'test-illustration.png'))],
  'test-illustration.png',
  { type: 'image/png' }
)

const logoImage = new File(
  [readFileSync(join(FIXTURES_DIR, 'test-logo.png'))],
  'test-logo.png',
  { type: 'image/png' }
)

const photorealismImage = new File(
  [readFileSync(join(FIXTURES_DIR, 'test-photorealism.jpg'))],
  'test-photorealism.jpg',
  { type: 'image/jpeg' }
)

// Use in tests
await removeBackgroundV2({
  image: photorealismImage,
  settings: { preserve_alpha: true },
})
```

---

## 📊 Expected Test Results

### Illustration (Cartoon Character)

**Background Removal:**
- V1 (Bria 1.4): 85-90/100 (may lose fine hair details)
- V2 (BRIA 2.0): 95-100/100 (preserves edges with 256-level alpha)

**Upscaling:**
- V1 (Real-ESRGAN): 80-85/100 (some blur on edges)
- V2 (Magic Refiner): 90-95/100 (sharper, more vibrant)

### Logo (Nike Swoosh)

**Background Removal:**
- V1: 95-100/100 (already transparent)
- V2: 95-100/100 (no background to remove)

**Upscaling:**
- V1: 85-90/100 (maintains shape)
- V2: 95-100/100 (crisp vector-like edges)

### Photorealism (Portrait)

**Background Removal:**
- V1: 80-85/100 (binary transparency, some edge issues)
- V2: 90-95/100 (smooth alpha, better hair/edge quality)

**Upscaling:**
- V1: 75-80/100 (skin texture may blur)
- V2: 85-95/100 (preserves texture, sharper details)

---

## 🔒 Licensing Notes

**PurePNG (Logos, Illustrations):**
- License: CC0 Public Domain
- Use: Free for personal and educational testing
- Attribution: Not required
- ⚠️ **Note**: Some logos are trademarked. Don't use in production/commercial products.

**Unsplash (Photorealism):**
- License: Unsplash License
- Use: Free for commercial and non-commercial
- Attribution: Appreciated but not required
- Download tracking: Unsplash requires download endpoint trigger

**Pexels (Alternative):**
- License: Pexels License
- Use: Free for commercial and non-commercial
- Attribution: Not required
- Restrictions: Don't sell unmodified photos

---

## 🎯 Test Coverage Matrix

| Image Type | Background Removal | Upscaling | Quality Validation | Cost Tracking |
|------------|-------------------|-----------|-------------------|---------------|
| **Illustration** | ✅ Complex edges | ✅ Color vibrancy | ✅ Edge quality | ✅ Full tracking |
| **Logo** | ✅ Transparency check | ✅ Shape precision | ✅ Corruption check | ✅ Full tracking |
| **Photorealism** | ✅ Hair/detail separation | ✅ Texture preservation | ✅ Resolution check | ✅ Full tracking |

---

## 🚀 Quick Download Checklist

- [ ] Download illustration from PurePNG (cartoon character)
- [ ] Download logo from PurePNG (Nike or similar)
- [ ] Download portrait from Unsplash (studio portrait)
- [ ] Create `tests/fixtures/images/` directory
- [ ] Save images with correct filenames
- [ ] Verify image quality (1000x1000+ resolution)
- [ ] Run test suite: `pnpm test v1-vs-v2-comparison`

---

## 📚 Additional Resources

**More Test Image Sources:**
- **Test Image Library**: https://testimages.org/
- **Sample Images**: https://sample-videos.com/
- **Placeholder Images**: https://picsum.photos/

**Image Processing Test Datasets:**
- **Kodak Image Dataset**: Classic test images for compression
- **DIV2K Dataset**: High-quality images for super-resolution
- **BSDS500**: Berkeley segmentation dataset

**For Production Testing:**
Consider creating a permanent test fixture repository with:
- Various resolutions (small, medium, large, huge)
- Different formats (PNG, JPEG, WEBP)
- Edge cases (very large, very small, corrupted)
- Different subjects (people, products, abstract, text)

---

**Next Steps:**
1. Download the 3 recommended images
2. Place in `tests/fixtures/images/`
3. Update test file to use real images instead of generated ones
4. Run comparison tests: `pnpm test v1-vs-v2-comparison`
5. Review generated `tests/comparison-report.md`
