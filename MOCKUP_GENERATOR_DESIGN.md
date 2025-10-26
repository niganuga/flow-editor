# Mockup Generator - Design Specification

## 🎯 Overview

A tool that lets users see their design on actual products (t-shirts, hoodies, mugs, etc.) - both through a visual panel AND via AI chat commands.

---

## 🎨 User Experience

### **Scenario 1: Panel Tool (Manual)**
```
User uploads "Girls Will Be Girls" design
→ Opens Mockup Generator panel
→ Selects "White T-Shirt"
→ Sees design instantly applied to t-shirt mockup
→ Can adjust: position, size, product color
→ Downloads mockup image for marketing
```

### **Scenario 2: AI Chat (Voice)**
```
User: "Show me this on a black hoodie"
→ AI calls mockup tool automatically
→ Generates hoodie mockup with design
→ Shows in chat with preview
→ AI: "Here's your design on a black hoodie! Looks great!"
```

---

## 🛠️ Technical Architecture

### **Component Structure**

```
components/panels/
└── mockup-generator-panel.tsx        ← Main panel UI

lib/tools/
└── mockup-generator.ts               ← Core tool logic

lib/ai-tools-orchestrator.ts          ← Register as AI tool

public/mockups/                        ← Mockup templates
├── tshirt-white-front.png
├── hoodie-black-front.png
├── mug-white-side.png
└── ...
```

---

## 📐 Panel Tool Design (UI)

### **Layout:**

```
┌─────────────────────────────────────────────────┐
│  MOCKUP GENERATOR                          [×]  │
├─────────────────────────────────────────────────┤
│                                                 │
│  ┌────────────────┐  ┌────────────────┐       │
│  │  [T-Shirt]     │  │  [Hoodie]      │       │
│  │  ▼             │  │  ▼             │       │
│  │  • White       │  │  • Black       │       │
│  │  • Black       │  │  • White       │       │
│  │  • Gray        │  │  • Gray        │       │
│  └────────────────┘  └────────────────┘       │
│                                                 │
│  ┌───────────────────────────────────────────┐ │
│  │                                           │ │
│  │         [PREVIEW AREA]                    │ │
│  │                                           │ │
│  │    ┌─────────────┐                        │ │
│  │    │   Design    │                        │ │
│  │    │     on      │  ← Mockup preview     │ │
│  │    │  Product    │                        │ │
│  │    └─────────────┘                        │ │
│  │                                           │ │
│  └───────────────────────────────────────────┘ │
│                                                 │
│  Position: [Center ▼] [Top ▼] [Front ▼]       │
│  Size: ──●────────── 12 inches                 │
│                                                 │
│  [Download Mockup]  [Share]  [Try Another]     │
│                                                 │
└─────────────────────────────────────────────────┘
```

### **Key Features:**

1. **Product Selection:**
   - Dropdown with product categories
   - Color swatches for each product
   - Real-time preview

2. **Design Controls:**
   - Position (center, left, right, top, bottom)
   - Size slider (4" - 16")
   - Rotation (if needed)

3. **Actions:**
   - Download mockup (high-res PNG)
   - Share link
   - Generate another variation

---

## 🤖 AI Tool Integration

### **Tool Definition:**

```typescript
// lib/ai-tools-orchestrator.ts

const mockupTool = {
  name: 'generate_mockup',
  description: `
    Generates a product mockup with the user's design.
    Use when user asks to see their design on a product
    (e.g., "show me on a t-shirt", "how would this look on a hoodie?")
  `,
  parameters: {
    type: 'object',
    properties: {
      productType: {
        type: 'string',
        enum: ['tshirt', 'hoodie', 'mug', 'poster', 'tank', 'longsleeve'],
        description: 'Type of product for mockup'
      },
      productColor: {
        type: 'string',
        enum: ['white', 'black', 'gray', 'navy', 'red'],
        description: 'Color of the product'
      },
      designSize: {
        type: 'number',
        description: 'Design width in inches (default: 12)',
        default: 12
      },
      position: {
        type: 'string',
        enum: ['center', 'left', 'right', 'top'],
        description: 'Where to place design on product',
        default: 'center'
      }
    },
    required: ['productType', 'productColor']
  }
}
```

### **AI Conversation Flow:**

```
User: "Show me this on a black hoodie"

↓ AI detects mockup request

Claude calls: generate_mockup({
  productType: 'hoodie',
  productColor: 'black',
  designSize: 12,
  position: 'center'
})

↓ Tool executes

Returns mockup image URL

↓ AI shows result

AI: "Here's your design on a black hoodie!
     The 12-inch print looks perfect centered on the chest.
     Want to try a different color or product?"
```

---

## 🔧 Implementation

### **1. Core Tool Function**

```typescript
// lib/tools/mockup-generator.ts

export interface MockupOptions {
  productType: 'tshirt' | 'hoodie' | 'mug' | 'poster' | 'tank' | 'longsleeve';
  productColor: 'white' | 'black' | 'gray' | 'navy' | 'red';
  designSize: number;        // inches
  position: 'center' | 'left' | 'right' | 'top';
  designUrl: string;         // User's design
}

export async function generateMockup(
  options: MockupOptions,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob> {

  onProgress?.(10, 'Loading mockup template...');

  // Load product mockup template
  const mockupPath = `/mockups/${options.productType}-${options.productColor}-front.png`;
  const mockup = await loadImage(mockupPath);

  onProgress?.(30, 'Loading your design...');

  // Load user's design
  const design = await loadImage(options.designUrl);

  onProgress?.(50, 'Calculating placement...');

  // Calculate design placement
  const placement = calculatePlacement({
    mockupWidth: mockup.width,
    mockupHeight: mockup.height,
    designWidth: design.width,
    designHeight: design.height,
    targetSize: options.designSize,
    position: options.position,
    productType: options.productType
  });

  onProgress?.(70, 'Applying design to product...');

  // Composite design onto mockup
  const canvas = createCanvas(mockup.width, mockup.height);
  const ctx = canvas.getContext('2d');

  // Draw mockup
  ctx.drawImage(mockup, 0, 0);

  // Apply perspective transform if needed (for realistic look)
  if (options.productType === 'tshirt' || options.productType === 'hoodie') {
    ctx.save();
    // Apply subtle perspective for realism
    applyPerspectiveTransform(ctx, placement);
  }

  // Draw design
  ctx.drawImage(
    design,
    placement.x,
    placement.y,
    placement.width,
    placement.height
  );

  ctx.restore();

  onProgress?.(90, 'Finalizing mockup...');

  // Export as high-res PNG
  const blob = await canvasToBlob(canvas, 'image/png', 1.0);

  onProgress?.(100, 'Mockup ready!');

  return blob;
}

/**
 * Calculates where to place design on mockup
 */
function calculatePlacement(params: {
  mockupWidth: number;
  mockupHeight: number;
  designWidth: number;
  designHeight: number;
  targetSize: number;    // inches
  position: string;
  productType: string;
}): Placement {

  // Each product has a "print area" definition
  const printAreas = {
    tshirt: {
      center: { x: 0.5, y: 0.35, maxWidth: 0.4, maxHeight: 0.3 },
      left: { x: 0.3, y: 0.35, maxWidth: 0.15, maxHeight: 0.2 },
      // ...
    },
    hoodie: {
      center: { x: 0.5, y: 0.4, maxWidth: 0.45, maxHeight: 0.35 },
      // ...
    }
  };

  const area = printAreas[params.productType][params.position];

  // Calculate actual pixel dimensions
  const targetWidthPx = (params.targetSize / 14) * params.mockupWidth * area.maxWidth;
  const scale = targetWidthPx / params.designWidth;

  return {
    x: params.mockupWidth * area.x - (params.designWidth * scale / 2),
    y: params.mockupHeight * area.y,
    width: params.designWidth * scale,
    height: params.designHeight * scale
  };
}
```

---

### **2. Panel Component**

```typescript
// components/panels/mockup-generator-panel.tsx

'use client'

import { useState } from 'react'
import { DraggablePanel } from '@/components/draggable-panel'
import { useImageStore } from '@/lib/image-store'
import { generateMockup, type MockupOptions } from '@/lib/tools/mockup-generator'

export function MockupGeneratorPanel({ onClose }: { onClose: () => void }) {
  const { imageUrl } = useImageStore()

  const [productType, setProductType] = useState<MockupOptions['productType']>('tshirt')
  const [productColor, setProductColor] = useState<MockupOptions['productColor']>('white')
  const [designSize, setDesignSize] = useState(12)
  const [position, setPosition] = useState<MockupOptions['position']>('center')
  const [mockupUrl, setMockupUrl] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    if (!imageUrl) return

    setIsGenerating(true)

    try {
      const blob = await generateMockup({
        productType,
        productColor,
        designSize,
        position,
        designUrl: imageUrl
      }, (progress, message) => {
        console.log(`${progress}%: ${message}`)
      })

      const url = URL.createObjectURL(blob)
      setMockupUrl(url)
    } catch (error) {
      console.error('Mockup generation failed:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <DraggablePanel
      title="Mockup Generator"
      onClose={onClose}
      className="w-[600px]"
    >
      <div className="space-y-4">
        {/* Product Selection */}
        <div>
          <label className="text-sm font-medium">Product</label>
          <select
            value={productType}
            onChange={(e) => setProductType(e.target.value as any)}
            className="w-full mt-1"
          >
            <option value="tshirt">T-Shirt</option>
            <option value="hoodie">Hoodie</option>
            <option value="mug">Mug</option>
            <option value="poster">Poster</option>
          </select>
        </div>

        {/* Color Selection */}
        <div>
          <label className="text-sm font-medium">Color</label>
          <div className="flex gap-2 mt-1">
            {['white', 'black', 'gray', 'navy', 'red'].map(color => (
              <button
                key={color}
                onClick={() => setProductColor(color as any)}
                className={`w-12 h-12 rounded border-2 ${
                  productColor === color ? 'border-blue-500' : 'border-gray-300'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </div>

        {/* Size Slider */}
        <div>
          <label className="text-sm font-medium">
            Design Size: {designSize} inches
          </label>
          <input
            type="range"
            min="4"
            max="16"
            value={designSize}
            onChange={(e) => setDesignSize(Number(e.target.value))}
            className="w-full mt-1"
          />
        </div>

        {/* Position */}
        <div>
          <label className="text-sm font-medium">Position</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as any)}
            className="w-full mt-1"
          >
            <option value="center">Center</option>
            <option value="left">Left Chest</option>
            <option value="right">Right Chest</option>
            <option value="top">Top</option>
          </select>
        </div>

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={!imageUrl || isGenerating}
          className="w-full py-2 bg-blue-500 text-white rounded"
        >
          {isGenerating ? 'Generating...' : 'Generate Mockup'}
        </button>

        {/* Preview */}
        {mockupUrl && (
          <div className="mt-4">
            <img
              src={mockupUrl}
              alt="Mockup preview"
              className="w-full rounded border"
            />
            <div className="mt-2 flex gap-2">
              <a
                href={mockupUrl}
                download={`mockup-${productType}-${productColor}.png`}
                className="px-4 py-2 bg-green-500 text-white rounded"
              >
                Download
              </a>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-gray-200 rounded"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}
      </div>
    </DraggablePanel>
  )
}
```

---

### **3. AI Tool Registration**

```typescript
// lib/ai-tools-orchestrator.ts

export const toolDefinitions = [
  // ... existing tools ...

  {
    name: 'generate_mockup',
    description: 'Generates a product mockup with the user\'s design on it',
    parameters: {
      type: 'object',
      properties: {
        productType: {
          type: 'string',
          enum: ['tshirt', 'hoodie', 'mug', 'poster', 'tank', 'longsleeve'],
          description: 'Type of product'
        },
        productColor: {
          type: 'string',
          enum: ['white', 'black', 'gray', 'navy', 'red'],
          description: 'Product color'
        },
        designSize: {
          type: 'number',
          description: 'Design width in inches (4-16)',
          default: 12
        },
        position: {
          type: 'string',
          enum: ['center', 'left', 'right', 'top'],
          default: 'center'
        }
      },
      required: ['productType', 'productColor']
    }
  }
]
```

---

## 📁 Mockup Templates

### **Required Assets:**

```
public/mockups/
├── tshirt/
│   ├── white-front.png      (2000x2500px)
│   ├── black-front.png
│   ├── gray-front.png
│   └── ...
├── hoodie/
│   ├── white-front.png      (2000x2500px)
│   ├── black-front.png
│   └── ...
├── mug/
│   ├── white-side.png       (2000x1500px)
│   └── ...
└── poster/
    └── white-frame.png      (2000x2500px)
```

### **Template Requirements:**

1. **High Resolution:** 2000x2500px minimum
2. **Transparent Background:** Where design goes
3. **Print Area Markers:** (optional, for placement calculation)
4. **Professional Photography:** Realistic product shots

---

## 🎨 User Flows

### **Flow 1: Panel User**

```
1. User uploads design
2. Clicks "Mockup Generator" button
3. Panel opens with product options
4. User selects: T-Shirt → White → 12" → Center
5. Clicks "Generate Mockup"
6. [Loading: 2-3 seconds]
7. Mockup appears in preview
8. User downloads mockup
9. Uses in marketing materials
```

### **Flow 2: AI Chat User**

```
User: "Show me this on a black hoodie"

AI: *Generating mockup...*
    [Shows mockup preview]
    "Here's your design on a black hoodie!
     The 12-inch print looks great centered on the chest.
     Want to try a different color?"

User: "Try white"

AI: [Generates white hoodie mockup]
    "White hoodie looks clean! Which do you prefer?"
```

---

## ⚡ Performance

### **Optimization:**

1. **Template Caching:** Pre-load mockup templates
2. **Worker Thread:** Generate mockups off main thread
3. **Progressive Rendering:** Show low-res preview first
4. **CDN Delivery:** Store templates on CDN

### **Expected Times:**

- Panel generation: 2-3 seconds
- AI generation: 3-4 seconds (includes API call)
- Download: Instant (blob URL)

---

## 🎯 AI Trigger Keywords

Claude should call `generate_mockup` when user says:
- "Show me on a [product]"
- "How would this look on a [product]?"
- "Generate a mockup"
- "Put this on a t-shirt"
- "Can I see this on a [product]?"

---

## 💡 Future Enhancements

### **Phase 2:**
- Multiple angles (front, back, side)
- Fabric textures (realistic draping)
- Environment scenes (person wearing it)
- Batch generation (all colors at once)

### **Phase 3:**
- AI-powered mockup suggestions
- Auto-adjust design for product type
- Social media templates
- Print-ready export (with specs)

---

## 📊 Success Metrics

**User Engagement:**
- % of users who generate mockups
- Average mockups per session
- Download rate

**Quality:**
- Mockup generation success rate (target: >99%)
- Average generation time (target: <3s)
- User satisfaction rating

---

## ✅ Implementation Checklist

- [ ] Create `/lib/tools/mockup-generator.ts`
- [ ] Create `/components/panels/mockup-generator-panel.tsx`
- [ ] Add mockup templates to `/public/mockups/`
- [ ] Register tool in `ai-tools-orchestrator.ts`
- [ ] Update system prompt with mockup keywords
- [ ] Add mockup button to UI
- [ ] Test panel mockup generation
- [ ] Test AI mockup generation via chat
- [ ] Performance optimization
- [ ] Documentation

---

## 🎉 Summary

**What:** Mockup generator that works via panel UI AND AI chat

**How:**
- Panel: Visual tool with dropdowns and sliders
- AI: Detects "show me on [product]" and calls tool automatically

**Tech:**
- Canvas API for compositing
- Pre-made mockup templates
- Real-time preview
- High-res export

**Result:** Users can instantly visualize their design on real products!
