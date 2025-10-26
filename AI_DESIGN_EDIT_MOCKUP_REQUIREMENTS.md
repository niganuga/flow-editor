# AI Design Edit & Mockup Tool Requirements Specification

## Executive Summary
Implement an AI-powered design editing and product mockup system integrated with the existing AI Chat Panel, allowing users to edit designs and create product mockups with a clear distinction between edit operations (which can replace the main canvas) and mockup operations (which are preview-only).

---

## 1. User Stories

### 1.1 Design Editing Stories

**US-1.1: Edit Existing Design**
```
As a user
I want to request design edits through the AI chat
So that I can modify my existing design without leaving the conversation flow
```

**US-1.2: Preview Edit Results**
```
As a user
I want to preview edited images in the chat panel
So that I can review changes before applying them to the main canvas
```

**US-1.3: Apply/Cancel Edits**
```
As a user
I want clear Apply/Cancel options for each edit
So that I can selectively apply changes to my main canvas
```

### 1.2 Product Mockup Stories

**US-2.1: Create Product Mockups**
```
As a user
I want to generate product mockups with my design
So that I can visualize how my design looks on real products
```

**US-2.2: View Mockups**
```
As a user
I want to view mockups in full size
So that I can inspect details without affecting my main design
```

**US-2.3: Save/Export Mockups**
```
As a user
I want to save or export mockup images
So that I can use them for presentations or marketing
```

---

## 2. Interaction Flow Specifications

### 2.1 Edit Operation Flow
```
User Request → AI Processing → Result Display → User Decision → Canvas Update

1. User types edit request in chat
   ↓
2. AI processes request using appropriate tool
   ↓
3. Result displays in chat with thumbnail
   ↓
4. User can:
   a. Click thumbnail → Open full-size preview
   b. Click "Apply" → Replace main canvas image
   c. Click "Cancel" → Dismiss (keep in chat history)
   ↓
5. If Applied → Update canvas + Add to undo history
```

### 2.2 Mockup Operation Flow
```
User Request → AI Processing → Result Display → Viewing Options

1. User types mockup request in chat
   ↓
2. AI generates mockup using design + product template
   ↓
3. Result displays in chat with thumbnail
   ↓
4. User can:
   a. Click thumbnail → Open full-size viewer
   b. Download mockup image
   c. Request variations
   ↓
5. Mockup remains in chat (never replaces canvas)
```

---

## 3. UI/UX Requirements

### 3.1 Chat Panel Enhancements

#### Message Types
```typescript
interface EditResultMessage {
  type: 'edit_result';
  id: string;
  timestamp: Date;
  request: string;
  result: {
    thumbnailUrl: string;
    fullSizeUrl: string;
    editType: 'color' | 'background' | 'enhancement' | 'other';
    canApplyToCanvas: true;
  };
  status: 'pending' | 'applied' | 'cancelled';
}

interface MockupResultMessage {
  type: 'mockup_result';
  id: string;
  timestamp: Date;
  request: string;
  result: {
    thumbnailUrl: string;
    fullSizeUrl: string;
    productType: string;
    mockupVariant?: string;
    canApplyToCanvas: false;
  };
}
```

#### Visual Design
```
┌─────────────────────────────┐
│ AI Chat Panel               │
├─────────────────────────────┤
│ [User]: Edit background...  │
│                             │
│ [AI]: Processing edit...    │
│                             │
│ ┌───────────────────────┐   │
│ │ [Thumbnail Image]      │   │
│ │                       │   │
│ │  Click to preview ↗   │   │
│ └───────────────────────┘   │
│                             │
│ [Apply to Canvas] [Cancel]  │
│                             │
│ [User]: Create t-shirt...   │
│                             │
│ [AI]: Mockup ready!         │
│                             │
│ ┌───────────────────────┐   │
│ │ [Mockup Thumbnail]     │   │
│ │                       │   │
│ │  Click to view ↗      │   │
│ └───────────────────────┘   │
│                             │
│ [Download] [More Options]   │
└─────────────────────────────┘
```

### 3.2 Image Preview Modal

#### Requirements
- Full-screen modal overlay
- High-resolution image display
- Zoom controls (fit, 100%, 200%)
- Pan capability for zoomed images
- Close button (ESC key support)
- Download option
- Image comparison slider (for edits - before/after)

#### Modal Layout
```
┌──────────────────────────────────────┐
│ ┌──┐                          [X]   │
│ │◀ │  Image Preview          ┌───┐  │
│ └──┘                         │ ⬇ │  │
│                              └───┘  │
│ ┌──────────────────────────────────┐ │
│ │                                  │ │
│ │                                  │ │
│ │        [Full Size Image]         │ │
│ │                                  │ │
│ │                                  │ │
│ └──────────────────────────────────┘ │
│                                      │
│ [Zoom: Fit ▼] [Compare] [Download]  │
└──────────────────────────────────────┘
```

### 3.3 Action Controls

#### Edit Results
- **Apply Button**: Primary action, prominent styling
- **Cancel Button**: Secondary action, subtle styling
- Status indicator: Shows if edit has been applied

#### Mockup Results
- **Download Button**: Primary action
- **View Options**: Dropdown for different views/angles
- **Generate Variations**: Request similar mockups

---

## 4. Technical Requirements

### 4.1 API Integration

#### Edit Operations
```typescript
interface EditRequest {
  image: string; // base64 or URL
  operation: 'remove_background' | 'change_color' | 'enhance' | 'custom';
  parameters: Record<string, any>;
  prompt?: string; // for AI-guided edits
}

interface EditResponse {
  success: boolean;
  resultUrl: string;
  thumbnailUrl: string;
  processingTime: number;
  metadata: {
    dimensions: { width: number; height: number };
    format: string;
    editType: string;
  };
}
```

#### Mockup Generation (Replicate API)
```typescript
interface MockupRequest {
  designImage: string; // User's design
  productType: 'tshirt' | 'mug' | 'poster' | 'phone_case' | 'custom';
  productTemplate?: string; // Optional specific template
  placement?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

interface MockupResponse {
  success: boolean;
  mockupUrl: string;
  thumbnailUrl: string;
  productInfo: {
    type: string;
    variant: string;
    dimensions: { width: number; height: number };
  };
}
```

### 4.2 State Management

#### Required Stores
```typescript
// Extend existing message-store.ts
interface ChatState {
  messages: Array<EditResultMessage | MockupResultMessage | TextMessage>;
  activeEdits: Map<string, EditResultMessage>;
  mockupHistory: MockupResultMessage[];
  processingQueue: string[];
}

// Extend existing image-store.ts
interface ImageState {
  mainCanvas: ImageData;
  editHistory: EditOperation[];
  pendingEdit?: {
    id: string;
    imageUrl: string;
    timestamp: Date;
  };
}
```

### 4.3 Component Architecture

```
components/
├── panels/
│   ├── ai-chat-panel.tsx (enhanced)
│   ├── edit-result-card.tsx (new)
│   ├── mockup-result-card.tsx (new)
│   └── image-preview-modal.tsx (new)
├── ai-tools/
│   ├── design-editor.tsx (new)
│   └── mockup-generator.tsx (new)
└── ui/
    ├── action-buttons.tsx (new)
    └── image-viewer.tsx (new)
```

---

## 5. Implementation Priority

### Phase 1: Core Infrastructure
1. Extend message store for new message types
2. Create image preview modal component
3. Implement action button controls

### Phase 2: Edit Operations
1. Integrate existing edit tools with chat
2. Implement apply/cancel logic
3. Connect to canvas update system

### Phase 3: Mockup System
1. Integrate Replicate API for mockups
2. Create mockup result display
3. Implement mockup viewer

### Phase 4: Polish & Enhancement
1. Add image comparison slider
2. Implement download functionality
3. Add keyboard shortcuts
4. Performance optimization

---

## 6. Success Criteria

### Functional Requirements
- ✅ Users can request edits through natural language in chat
- ✅ Edit results display as thumbnails in chat
- ✅ Clicking thumbnails opens full-size preview
- ✅ Apply button updates main canvas with edited image
- ✅ Cancel button dismisses edit without affecting canvas
- ✅ Mockups display in chat but never replace canvas
- ✅ All images can be viewed in full-size modal
- ✅ Mockups can be downloaded directly

### Performance Requirements
- Edit processing < 5 seconds for standard operations
- Mockup generation < 10 seconds
- Image preview loads < 1 second
- Smooth transitions and animations (60 fps)

### UX Requirements
- Clear visual distinction between edits and mockups
- Intuitive apply/cancel workflow
- Responsive design for all screen sizes
- Accessible keyboard navigation
- Clear loading and error states

### Technical Requirements
- Proper error handling for API failures
- Image optimization for thumbnails
- Memory-efficient image handling
- Undo/redo support for applied edits
- Persistent chat history across sessions

---

## 7. API Endpoints Required

### Backend Services
```typescript
// Edit Operations
POST /api/ai/edit
  Body: { image, operation, parameters }
  Response: { resultUrl, thumbnailUrl }

// Mockup Generation
POST /api/ai/mockup
  Body: { designImage, productType, options }
  Response: { mockupUrl, thumbnailUrl, productInfo }

// Image Processing
GET /api/image/thumbnail/:id
  Response: Optimized thumbnail image

GET /api/image/full/:id
  Response: Full resolution image
```

---

## 8. Testing Scenarios

### Edit Flow Testing
1. Request background removal → Preview → Apply → Verify canvas update
2. Request color change → Preview → Cancel → Verify canvas unchanged
3. Multiple edits in sequence → Apply selectively → Verify correct updates

### Mockup Flow Testing
1. Request t-shirt mockup → View full size → Download
2. Request multiple product mockups → View each → Verify canvas unchanged
3. Mixed edit and mockup requests → Verify correct behavior for each

### Error Handling
1. API timeout → Show error message → Allow retry
2. Invalid image format → Show helpful error → Suggest alternatives
3. Network failure → Graceful degradation → Queue for retry

---

## 9. Accessibility Requirements

- ARIA labels for all interactive elements
- Keyboard navigation support (Tab, Enter, Escape)
- Screen reader compatibility
- High contrast mode support
- Focus management for modals
- Alt text for all images

---

## 10. Security Considerations

- Validate all image uploads (size, format, content)
- Sanitize user prompts before API calls
- Rate limiting for API requests
- Secure image storage with expiration
- CORS configuration for image serving
- Input validation for all parameters