# Quick Test - Phase 8 AI Chat Panel

## 5-Minute Smoke Test

This is a quick smoke test to verify the AI Chat Panel is working correctly.

### Prerequisites
```bash
# Ensure API key is set
export ANTHROPIC_API_KEY="your-key-here"

# Start dev server
pnpm dev
```

### Test Steps (5 minutes)

#### Step 1: Open Panel (30 seconds)
1. Open browser to http://localhost:3000
2. Click "AI Design Partner" button
3. **Verify**:
   - Panel opens
   - Welcome message displayed
   - Phase 8 info banner shown
   - Status shows "No image - Please upload one first"

#### Step 2: Upload Image (30 seconds)
1. Click upload area or drag-drop an image
2. **Verify**:
   - Image displays on canvas
   - AI Chat Panel status changes to "Image loaded - Ready to edit!"
   - Input field enabled
   - Send button enabled

#### Step 3: Simple Message (1 minute)
1. Type: "What can you do?"
2. Click send (or press Enter)
3. **Verify**:
   - User message appears (right side, dark)
   - Processing indicator shows
   - Assistant response appears (left side, light)
   - Response explains capabilities
   - No errors in console

#### Step 4: Background Removal (2 minutes)
1. Type: "Remove the background"
2. Click send
3. **Verify**:
   - Processing indicator shows
   - Assistant response appears
   - Tool execution card displayed
     - Shows "Background Removal"
     - Shows confidence badge (green)
     - Shows success checkmark
   - Canvas updates with result
   - Background is transparent/removed

#### Step 5: Suggested Prompt (1 minute)
1. Click "Remove white color" suggested prompt
2. Input field populates with text
3. Click send
4. **Verify**:
   - Tool execution for "Color Knockout"
   - Confidence score shown
   - Result preview available
   - Canvas updates

### Quick Checklist

- [ ] Panel opens without errors
- [ ] Image upload works
- [ ] Status indicators update
- [ ] Messages display correctly
- [ ] Tool executions show
- [ ] Confidence badges appear
- [ ] Canvas updates automatically
- [ ] No console errors

### If Something Fails

1. **Check Console**: Open browser DevTools (F12) and check Console tab
2. **Check Network**: Go to Network tab and verify API calls
3. **Check API Key**: Verify ANTHROPIC_API_KEY is set correctly
4. **Try Simple Test**: Type "Hello" to test basic connectivity

### Common Issues

**Panel doesn't open**:
- Check browser console for errors
- Verify component is imported correctly

**"AI service not configured"**:
- Set ANTHROPIC_API_KEY environment variable
- Restart dev server

**Tool execution fails**:
- Check image is loaded
- Check API key is valid
- Try a different prompt

**Canvas doesn't update**:
- Check if tool succeeded (green checkmark)
- Check console for errors
- Try refreshing page

### Success Criteria

If all steps pass, Phase 8 is working correctly!

### Next: Full Testing

After quick test passes, proceed to comprehensive testing:
- See: `/Users/makko/Code/OneFlow/flow-editor/AI_DESIGN_PARTNER_TESTING.md`

---

**Time Required**: 5 minutes
**Test Coverage**: Basic functionality
**Status**: Ready to run
