# Real Image Test Guide

## Quick Start - Test "Girls Will Be Girls" Image

### Step 1: Open the Test Interface
```bash
open tests/test-real-image.html
```

### Step 2: Upload Your Image
1. Click "Choose File" button
2. Select the "Girls Will Be Girls" image you provided
3. Click "Test Background Removal (V1 vs V2)"

### Step 3: Wait for Processing
- V1 (Bria RMBG 1.4): ~5-10 seconds
- V2 (BRIA RMBG 2.0): ~5-10 seconds
- Total: ~10-20 seconds

### Step 4: Compare Results
The page will show:
- Original image (left)
- V1 output (center) - Binary transparency
- V2 output (right) - 256-level alpha transparency

## What to Look For

### Expected V2 Improvements:
1. **Edge Quality**: Smoother edges around characters
2. **Hair Details**: Better preservation of fine details
3. **Semi-Transparency**: Gradual transparency instead of hard edges
4. **Color Accuracy**: Better color preservation at edges

### Quality Scores:
- **80-95/100**: Excellent (expected for real images)
- **60-79/100**: Good (minor issues)
- **30-59/100**: Fair (noticeable problems)
- **0-29/100**: Poor (significant issues)

## Current Setup

✅ **API Routes Created:**
- `/api/ai-tools/background-removal` (V1)
- `/api/ai-tools/background-removal-v2` (V2)

✅ **Dev Server Running:** http://localhost:3000

✅ **Test Interface:** `tests/test-real-image.html`

## Cost Comparison

| Version | Model | Cost | Alpha Levels | Speed |
|---------|-------|------|--------------|-------|
| V1 | Bria RMBG 1.4 | $0.003 | Binary (2) | Fast |
| V2 | BRIA RMBG 2.0 | $0.018 | 256-level | Fast |

**V2 is 6x more expensive but provides professional-grade transparency.**

## Troubleshooting

### Error: "Authentication failed"
- Set Replicate API key in `.env.local`:
  ```
  REPLICATE_API_TOKEN=r8_...
  ```

### Error: "API routes not found"
- Make sure dev server is running: `pnpm dev`
- Check that port 3000 is available

### No quality scores showing
- Quality validation requires successful processing
- Check browser console for errors

## Expected Test Results

### "Girls Will Be Girls" Image:
- **Complexity**: High (multiple characters, intricate details)
- **V1 Expected**: Good edges, binary transparency
- **V2 Expected**: Excellent edges, smooth anti-aliasing
- **V2 Quality Improvement**: +10-20 points over V1
- **V2 Processing Time**: Similar to V1 (~5-10s)

### When to Use V2:
- Professional/commercial projects
- Images with complex edges (hair, fur, fine details)
- When semi-transparency is needed
- Premium tier users

### When to Use V1:
- Quick tests and demos
- Simple objects with clean edges
- Cost-sensitive applications
- Basic free tier
