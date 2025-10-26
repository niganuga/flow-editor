# Undo/Redo Feature Documentation

## Overview

A comprehensive undo/redo system with history tracking has been implemented for the image editor. This feature allows users to navigate through their editing history, undo changes, redo changes, and jump to any point in their editing timeline.

## Features Implemented

### 1. History Stack Management

**File:** `/lib/image-store.ts`

- **History Tracking**: Stores up to 20 image states in memory
- **Smart Memory Management**: Automatically trims old entries when limit is reached
- **State Preservation**: Each history entry includes:
  - Image URL
  - Image File object
  - File name
  - Description of the change
  - Timestamp

### 2. User Interface Components

#### Undo/Redo Controls
**File:** `/components/undo-redo-controls.tsx`

- **Visual Buttons**: Clear undo/redo buttons with icons
- **State Indicators**: Disabled state when action is not available
- **History Counter**: Shows current position (e.g., "5/12")
- **Responsive Design**: Hides button text on mobile, shows icons only

#### History Dropdown
- **Interactive Timeline**: Click any history entry to jump directly to that state
- **Visual Feedback**: Current state highlighted in the list
- **Timestamps**: Each entry shows when it was created
- **Descriptions**: Clear labels for each state (e.g., "AI Edit: Color Knockout")

### 3. Keyboard Shortcuts

**File:** `/components/keyboard-shortcuts.tsx`

- **Undo**: `Ctrl+Z` / `Cmd+Z`
- **Redo**: `Ctrl+Y` / `Cmd+Y` / `Ctrl+Shift+Z` / `Cmd+Shift+Z`
- **Smart Detection**: Disabled when typing in input fields
- **Cross-platform**: Works on Windows, Mac, and Linux

### 4. Integration Points

#### AI Chat Panel
**File:** `/components/panels/ai-chat-panel.tsx`

After successful AI tool execution:
```typescript
const { addToHistory } = useImageStore.getState()
const toolNames = toolExecutions
  .filter(t => t.success)
  .map(t => TOOL_DISPLAY_NAMES[t.toolName] || t.toolName)
  .join(', ')

if (toolNames) {
  addToHistory(`AI Edit: ${toolNames}`)
}
```

#### Tool Panels
All tool panels now track history when applying changes:

- **Background Remover**: `addToHistory("Background Removed (model_name)")`
- **Upscaler**: `addToHistory("Upscaled 2x (model_name)")`
- **Color Knockout**: `addToHistory("Color Knockout: #FF0000, #00FF00")`
- **Recolor**: `addToHistory("Recolor: red to blue")`
- **Texture Cut**: `addToHistory("Texture Cut Applied")`

### 5. Top Bar Integration

**File:** `/components/top-bar.tsx`

- Undo/redo controls appear only when an image is loaded
- Positioned with a visual separator from the logo
- Clean, minimal design that doesn't clutter the interface

## Usage Examples

### Basic Undo/Redo

1. Upload an image
2. Apply any edit (e.g., remove background)
3. Press `Ctrl+Z` to undo
4. Press `Ctrl+Y` to redo

### History Navigation

1. Click the History button (shows "3/5" indicator)
2. View all previous states in dropdown
3. Click any state to jump directly to it

### Programmatic Usage

```typescript
import { useImageStore } from '@/lib/image-store'

// In a component
const { undo, redo, canUndo, canRedo, addToHistory } = useImageStore()

// Check if undo is available
if (canUndo()) {
  undo()
}

// Add custom entry to history
addToHistory('Custom Edit: Brightness +50')

// Jump to specific history point
const { jumpToHistory, history } = useImageStore.getState()
jumpToHistory(2) // Jump to index 2
```

## Technical Implementation

### Store Architecture

```typescript
interface ImageState {
  // Current image state
  imageUrl: string | null
  imageFile: File | null
  imageName: string | null

  // History tracking
  history: HistoryEntry[]
  historyIndex: number
  maxHistorySize: number

  // Actions
  undo: () => void
  redo: () => void
  canUndo: () => boolean
  canRedo: () => boolean
  addToHistory: (description: string) => void
  jumpToHistory: (index: number) => void
}
```

### History Entry Structure

```typescript
interface HistoryEntry {
  imageUrl: string      // The image at this point in history
  imageFile: File       // File object for downloads
  fileName: string      // Name of the file
  description: string   // Human-readable description
  timestamp: number     // When this state was created
}
```

## Performance Considerations

1. **Memory Management**
   - Limited to 20 history states to prevent memory issues
   - Old entries automatically removed when limit reached
   - Blob URLs are managed properly to prevent memory leaks

2. **UI Responsiveness**
   - History operations are synchronous and instant
   - No network requests required for undo/redo
   - Smooth transitions between states

3. **File Size Handling**
   - Each history entry stores full image data
   - Consider implementing compression for large images
   - Future enhancement: Store only deltas between states

## Testing

### Manual Testing Steps

1. **Basic Functionality**
   - Upload image
   - Apply multiple edits
   - Test undo (should go back)
   - Test redo (should go forward)
   - Verify buttons enable/disable correctly

2. **Keyboard Shortcuts**
   - Test Ctrl+Z for undo
   - Test Ctrl+Y for redo
   - Test Ctrl+Shift+Z for redo
   - Verify shortcuts disabled in input fields

3. **History Dropdown**
   - Click history button
   - Verify all states appear
   - Click different states
   - Verify image updates correctly

4. **Edge Cases**
   - Test with no image loaded
   - Test with maximum history (20 items)
   - Test clearing image (should clear history)
   - Test rapid undo/redo

### Console Logging

The system includes debug logging:
```
[History] Undo to: AI Edit: Color Knockout
[History] Redo to: Upscaled 2x
[History] Jump to: Background Removed
```

## Future Enhancements

1. **Persistent History**
   - Save history to localStorage
   - Restore history on page refresh
   - Export/import history states

2. **Advanced Features**
   - Branch history (create alternate timelines)
   - History comparison view
   - Batch undo/redo operations
   - History search and filtering

3. **Performance Optimizations**
   - Implement delta compression
   - Use Web Workers for history operations
   - Lazy loading of history entries
   - Virtual scrolling for long histories

4. **UI Improvements**
   - Visual timeline view
   - Before/after preview on hover
   - Animated transitions between states
   - Touch gestures for mobile

## Browser Compatibility

- Chrome: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Edge: ✅ Full support
- Mobile browsers: ✅ Touch-friendly UI

## Accessibility

- Keyboard navigation fully supported
- ARIA labels on all buttons
- Screen reader friendly
- High contrast mode compatible
- Focus indicators on interactive elements

## Known Limitations

1. History limited to current session (not persistent)
2. Maximum 20 states (configurable)
3. Each state stores full image (no compression)
4. No branching history support

## Troubleshooting

### Issue: Undo/redo buttons not appearing
**Solution:** Ensure an image is loaded first

### Issue: Keyboard shortcuts not working
**Solution:** Click outside any input fields first

### Issue: History dropdown empty
**Solution:** Make at least one edit after loading image

### Issue: Memory usage high with large images
**Solution:** Consider reducing image size before editing

## API Reference

### useImageStore Hook

```typescript
const {
  // State
  history,           // Array of history entries
  historyIndex,      // Current position in history

  // Actions
  undo,             // Go back one state
  redo,             // Go forward one state
  canUndo,          // Check if undo available
  canRedo,          // Check if redo available
  addToHistory,     // Add current state to history
  jumpToHistory,    // Jump to specific index

} = useImageStore()
```

## Examples in Production

The undo/redo system is integrated throughout the application:

1. **AI Chat**: Every successful tool execution adds to history
2. **Manual Tools**: All panels track their changes
3. **File Operations**: Import/export maintain history
4. **Batch Operations**: Multiple changes tracked individually

This comprehensive undo/redo system provides users with confidence to experiment freely, knowing they can always revert changes or compare different editing approaches.