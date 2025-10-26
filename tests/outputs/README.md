# Test Outputs Directory

This directory contains visual outputs from the v1 vs v2 comparison tests.

**Generated:** Automatically by `tests/v1-vs-v2-comparison.test.ts`

---

## 📁 Directory Structure

```
tests/outputs/
├── background-removal/
│   ├── input-original.png          # Original input image
│   ├── v1-bria-rmbg-output.png     # V1 output (Bria RMBG 1.4)
│   ├── v2-rmbg2-output.png         # V2 output (BRIA RMBG 2.0)
│   └── index.html                  # Visual comparison viewer
├── upscaling/
│   ├── input-original.png          # Original input image
│   ├── v1-real-esrgan-output.png   # V1 output (Real-ESRGAN)
│   ├── v2-magic-refiner-output.png # V2 output (Magic Refiner)
│   ├── v2-swinir-output.png        # V2 output (SwinIR)
│   └── index.html                  # Visual comparison viewer
└── fixtures/
    └── (Downloaded test images)
```

---

## 🖼️ Viewing Comparisons

### Method 1: HTML Viewer (Recommended)

Open the `index.html` file in any browser for side-by-side comparison:

```bash
# Background Removal Comparison
open tests/outputs/background-removal/index.html

# Upscaling Comparison
open tests/outputs/upscaling/index.html
```

The HTML viewer includes:
- Side-by-side original/v1/v2 comparison
- Checkerboard background for transparency
- Responsive grid layout
- Zoom on hover (planned)

### Method 2: Individual Files

Open PNG files directly to inspect:

```bash
# View original
open tests/outputs/background-removal/input-original.png

# View v1 output
open tests/outputs/background-removal/v1-bria-rmbg-output.png

# View v2 output
open tests/outputs/background-removal/v2-rmbg2-output.png
```

---

## 📝 File Naming Convention

### Background Removal:
- `input-original.png` - Original test image
- `v1-{model-name}-output.png` - V1 model output
- `v2-{model-name}-output.png` - V2 model output

### Upscaling:
- `input-original.png` - Original small image
- `v1-real-esrgan-output.png` - V1 standard upscaling
- `v2-magic-refiner-output.png` - V2 creative upscaling
- `v2-swinir-output.png` - V2 texture-focused upscaling

---

## 🔄 Regenerating Outputs

To regenerate all test outputs:

```bash
# Run comparison tests
pnpm test v1-vs-v2-comparison

# Outputs will be automatically saved to this directory
```

To clean all outputs before regenerating:

```bash
# Delete all outputs
rm -rf tests/outputs/*

# Run tests to regenerate
pnpm test v1-vs-v2-comparison
```

---

## ⚙️ How It Works

### 1. Test Execution:
```typescript
// tests/v1-vs-v2-comparison.test.ts
const { v1, v2 } = await runComparisonTest(...)

// Automatically saves outputs
saveComparisonSet(operation, modelName, original, v1Output, v2Output)
```

### 2. Image Saving:
```typescript
// tests/utils/save-test-output.ts
saveTestOutput(dataUrl, 'v2-rmbg2-output', 'background-removal')
// Saves to: tests/outputs/background-removal/v2-rmbg2-output.png
```

### 3. HTML Generation:
```typescript
// Creates side-by-side comparison HTML
createComparisonHTML(operation, paths)
// Generates: tests/outputs/{operation}/index.html
```

---

## 📊 Expected vs Actual Outputs

### With Mock Data (Current):

**File Sizes:**
- Original: ~3 bytes (mock data)
- V1/V2: ~16 bytes (mock data)

**Dimensions:**
- All: 100x100 (mock)

**Quality Scores:**
- Background Removal: 10/100 (low due to mock data)
- Upscaling: 0/100 (low due to mock data)

### With Real Images (Expected):

**File Sizes:**
- Original: 150KB - 2MB
- V1: 200KB - 3MB
- V2: 180KB - 2.5MB (better compression)

**Dimensions:**
- Background Removal: Same as original
- Upscaling: 2x-4x larger

**Quality Scores:**
- Background Removal: V1 = 80-85/100, V2 = 90-95/100
- Upscaling: V1 = 75-85/100, V2 = 85-95/100

---

## 🎯 Visual Quality Checks

### What to Look For:

**Background Removal:**
- ✅ Transparent background added
- ✅ Clean edges (no jagged artifacts)
- ✅ Subject preserved
- ✅ Fine details (hair, fur) intact

**V2 Advantages:**
- 256-level alpha transparency (smoother edges)
- Better handling of complex edges
- Partial transparency preserved

**Upscaling:**
- ✅ Resolution increased (2x, 4x)
- ✅ Sharp details
- ✅ No blurriness
- ✅ Textures preserved

**V2 Advantages:**
- Better texture quality (SwinIR)
- Creative enhancement (Magic Refiner)
- Sharper edges

---

## 🐛 Troubleshooting

### Issue: No files generated

**Cause:** Tests may have failed before outputs were saved

**Solution:**
```bash
# Check test output for errors
pnpm test v1-vs-v2-comparison --reporter=verbose

# Ensure outputs directory exists
mkdir -p tests/outputs/{background-removal,upscaling}
```

### Issue: Images look corrupted or tiny

**Cause:** Using mock data instead of real images

**Solution:**
1. Download real test images (see `tests/TEST_IMAGES_GUIDE.md`)
2. Place in `tests/fixtures/images/`
3. Update tests to use real images
4. Re-run tests

### Issue: HTML viewer shows broken images

**Cause:** Files not in correct location relative to index.html

**Solution:**
- Ensure all PNGs are in same directory as index.html
- Check browser console for 404 errors
- Verify file paths are relative (not absolute)

---

## 📈 Comparing Results

### Side-by-Side Comparison:

1. Open HTML viewer
2. Compare original → v1 → v2
3. Look for:
   - Edge quality
   - Color accuracy
   - Artifact presence
   - Overall sharpness

### Diff Tool Comparison:

```bash
# Compare v1 vs v2 with ImageMagick
compare \
  tests/outputs/background-removal/v1-bria-rmbg-output.png \
  tests/outputs/background-removal/v2-rmbg2-output.png \
  tests/outputs/background-removal/diff.png
```

### Overlay Comparison:

Use Photoshop, GIMP, or other image editors:
1. Load both images as layers
2. Use difference blend mode
3. See exactly what changed

---

## 🔒 Git Ignore

**Note:** This directory should be in `.gitignore` to avoid committing test outputs.

```gitignore
# .gitignore
tests/outputs/
!tests/outputs/README.md
```

Test outputs are regenerated on each test run, so no need to version control them.

---

## 📚 Related Files

- **Test Suite:** `tests/v1-vs-v2-comparison.test.ts`
- **Save Utility:** `tests/utils/save-test-output.ts`
- **Test Images Guide:** `tests/TEST_IMAGES_GUIDE.md`
- **Comparison Report:** `tests/comparison-report.md`

---

**Last Updated:** October 13, 2025
**Generated By:** V1 vs V2 Comparison Test Suite
