# AI Design Partner - Testing Guide

## Phase 8 Testing (Final Phase)

This guide covers testing the complete end-to-end AI Design Assistant with the updated AI Chat Panel.

## Prerequisites

1. **API Key Setup**:
   ```bash
   export ANTHROPIC_API_KEY="your-key-here"
   ```

2. **Development Server Running**:
   ```bash
   pnpm dev
   ```

3. **Test Image Ready**: Have a test image (PNG/JPG) ready for upload

## Test Checklist

### 1. Initial Setup Tests

#### Test 1.1: Panel Opens
- [ ] Click "AI Design Partner" button in the editor
- [ ] Panel opens with welcome message
- [ ] Panel displays Phase 8 info banner
- [ ] Panel shows "No image - Please upload one first" status

**Expected**: Panel opens successfully with all UI elements visible

#### Test 1.2: No Image Handling
- [ ] Type a message without uploading an image
- [ ] Click send
- [ ] Verify error message: "Please upload an image first. I need to see what you're working with!"

**Expected**: Graceful error handling when no image is present

### 2. Image Upload Tests

#### Test 2.1: Upload Image
- [ ] Upload a test image to the editor
- [ ] Verify AI Chat Panel status changes to "Image loaded - Ready to edit!"
- [ ] Input field becomes enabled
- [ ] Send button becomes enabled

**Expected**: Panel recognizes uploaded image and enables interaction

#### Test 2.2: Multiple Image Uploads
- [ ] Upload first image
- [ ] Send a message
- [ ] Upload a different image
- [ ] Send another message
- [ ] Verify both messages use the correct image

**Expected**: AI uses the currently loaded image for each request

### 3. Basic Message Tests

#### Test 3.1: Simple Question
**Prompt**: "What can you do?"

- [ ] Type and send message
- [ ] User message appears (right-aligned, dark background)
- [ ] Processing indicator appears
- [ ] Assistant response appears (left-aligned, light background)
- [ ] Response explains capabilities
- [ ] No tool executions shown

**Expected**: AI responds with capabilities, no tools executed

#### Test 3.2: Image Analysis
**Prompt**: "Analyze this image"

- [ ] Send message
- [ ] Processing indicator shown
- [ ] Response includes analysis
- [ ] May include tool execution for image analysis
- [ ] Confidence score displayed (if applicable)

**Expected**: AI provides detailed image analysis

### 4. Tool Execution Tests

#### Test 4.1: Background Removal
**Prompt**: "Remove the background"

- [ ] Send message
- [ ] Processing indicator shown
- [ ] Response message received
- [ ] Tool execution card displayed
  - [ ] Shows "Background Removal"
  - [ ] Shows confidence score
  - [ ] Shows success status (green check)
  - [ ] Has "Show result preview" button
- [ ] Main canvas updates with result
- [ ] Result has transparent background

**Expected**: Background removed successfully, canvas updated

#### Test 4.2: Color Knockout
**Prompt**: "Remove white color"

- [ ] Send message
- [ ] Tool execution card for "Color Knockout" appears
- [ ] Confidence score badge shown (color-coded)
- [ ] Success status shown
- [ ] Click "Show result preview"
  - [ ] Preview image displayed inline
  - [ ] Preview shows white removed
- [ ] Click "Parameters"
  - [ ] Parameters JSON displayed
  - [ ] Shows color: "white"
- [ ] Canvas updates automatically

**Expected**: White color removed, all UI elements functional

#### Test 4.3: Multiple Tools
**Prompt**: "Remove the background and make it bigger"

- [ ] Send message
- [ ] Multiple tool execution cards appear
  - [ ] Background Removal
  - [ ] Upscaler
- [ ] Each has its own confidence score
- [ ] Each has success/failure status
- [ ] Tools executed in sequence
- [ ] Final result applied to canvas

**Expected**: Multiple tools execute in order, final result shown

### 5. Confidence Score Tests

#### Test 5.1: High Confidence
**Prompt**: "Remove the background"

- [ ] Confidence badge shown
- [ ] Badge is green (95%+ confidence)
- [ ] Badge shows "95%" or higher
- [ ] Zap icon displayed
- [ ] Hover shows tooltip

**Expected**: High confidence score displayed correctly

#### Test 5.2: Moderate Confidence
**Prompt**: "Make it artistic" (ambiguous)

- [ ] Confidence score lower (70-79%)
- [ ] Badge is yellow
- [ ] Still attempts execution
- [ ] May show warning in response

**Expected**: Lower confidence reflected in badge color

### 6. Error Handling Tests

#### Test 6.1: API Error
**Setup**: Stop API server or use invalid API key

- [ ] Send message
- [ ] Error message displayed in chat
- [ ] Error message is user-friendly
- [ ] Confidence score is 0
- [ ] No tool execution cards shown

**Expected**: Graceful error handling with clear message

#### Test 6.2: Tool Execution Failure
**Prompt**: Use a prompt that might fail (e.g., invalid color)

- [ ] Tool execution card displayed
- [ ] Shows red X icon (failure)
- [ ] Error message in card
- [ ] Error details shown
- [ ] Canvas not updated
- [ ] Can retry with different prompt

**Expected**: Failure clearly indicated, details provided

#### Test 6.3: Network Timeout
**Setup**: Simulate slow network

- [ ] Send message
- [ ] Processing indicator stays visible
- [ ] Eventually times out
- [ ] Error message displayed
- [ ] Can retry

**Expected**: Timeout handled gracefully

### 7. UI/UX Tests

#### Test 7.1: Suggested Prompts
- [ ] Click "Remove the background" button
- [ ] Input field populated with prompt
- [ ] Click send
- [ ] Prompt executes successfully
- [ ] Test all 6 suggested prompts

**Expected**: All suggested prompts work correctly

#### Test 7.2: Message Display
- [ ] User messages right-aligned
- [ ] User messages have dark background
- [ ] Assistant messages left-aligned
- [ ] Assistant messages have light background
- [ ] Assistant messages show AI icon
- [ ] Timestamps displayed
- [ ] Messages have shadow effect

**Expected**: Messages styled correctly, easy to distinguish

#### Test 7.3: Auto-Scroll
- [ ] Send 10+ messages
- [ ] Verify auto-scroll to bottom
- [ ] New messages always visible
- [ ] Can manually scroll up
- [ ] Auto-scroll on new message

**Expected**: Messages area scrolls automatically

#### Test 7.4: Tool Execution Card Interactions
- [ ] Click "Parameters" to expand
- [ ] Click again to collapse
- [ ] Click "Show result preview"
- [ ] Preview displays correctly
- [ ] Click "Hide result preview"
- [ ] Preview hides

**Expected**: All interactive elements work smoothly

### 8. Conversation History Tests

#### Test 8.1: Context Awareness
- [ ] Send: "Remove the background"
- [ ] Wait for completion
- [ ] Send: "Now make it bigger"
- [ ] AI understands "it" refers to the image
- [ ] Upscaling executes

**Expected**: AI maintains conversation context

#### Test 8.2: Follow-Up Questions
- [ ] Send: "What colors are in this image?"
- [ ] AI responds with colors
- [ ] Send: "Remove the first one"
- [ ] AI remembers the color list
- [ ] Removes correct color

**Expected**: AI uses conversation history for context

### 9. Canvas Integration Tests

#### Test 9.1: Canvas Update
- [ ] Send tool execution prompt
- [ ] Tool succeeds
- [ ] Canvas updates automatically
- [ ] No manual refresh needed
- [ ] New image displayed correctly

**Expected**: Canvas updates seamlessly

#### Test 9.2: Failed Execution No Update
- [ ] Trigger a tool failure
- [ ] Canvas does NOT update
- [ ] Original image remains
- [ ] Can try again

**Expected**: Canvas only updates on success

### 10. Performance Tests

#### Test 10.1: Response Time
- [ ] Send simple message
- [ ] Measure time to response
- [ ] Should be < 5 seconds

**Expected**: Fast response for simple operations

#### Test 10.2: Tool Execution Time
- [ ] Send tool execution message
- [ ] Measure time to completion
- [ ] Should be < 30 seconds

**Expected**: Reasonable execution time

#### Test 10.3: Large Images
- [ ] Upload large image (>5MB)
- [ ] Send tool execution message
- [ ] Verify completion
- [ ] Check for memory issues

**Expected**: Handles large images without crashing

### 11. Edge Cases

#### Test 11.1: Empty Message
- [ ] Try to send empty message
- [ ] Send button disabled
- [ ] Cannot send

**Expected**: Empty messages prevented

#### Test 11.2: Very Long Message
- [ ] Send 500+ character message
- [ ] Verify message displays correctly
- [ ] Verify AI processes it

**Expected**: Long messages handled correctly

#### Test 11.3: Special Characters
- [ ] Send message with emojis: "Remove the background 🚀"
- [ ] Send message with symbols: "Remove #FFFFFF color"
- [ ] Verify proper handling

**Expected**: Special characters don't break system

#### Test 11.4: Rapid Messages
- [ ] Send message
- [ ] Immediately send another
- [ ] First still processing
- [ ] Second queued
- [ ] Both complete in order

**Expected**: Messages queued properly

### 12. Accessibility Tests

#### Test 12.1: Keyboard Navigation
- [ ] Tab to input field
- [ ] Type message
- [ ] Press Enter to send
- [ ] Tab to suggested prompts
- [ ] Enter to activate

**Expected**: Full keyboard accessibility

#### Test 12.2: Screen Reader
- [ ] Use screen reader
- [ ] Verify messages announced
- [ ] Verify buttons labeled
- [ ] Verify status updates announced

**Expected**: Screen reader compatible

### 13. Integration Tests

#### Test 13.1: Full Workflow
1. [ ] Upload image
2. [ ] Send: "Remove the background"
3. [ ] Verify background removed
4. [ ] Send: "Make colors vibrant"
5. [ ] Verify colors enhanced
6. [ ] Send: "Upscale this image"
7. [ ] Verify image upscaled
8. [ ] Send: "Show me the color palette"
9. [ ] Verify palette displayed

**Expected**: Complete workflow succeeds

#### Test 13.2: Error Recovery
1. [ ] Trigger an error
2. [ ] Error displayed
3. [ ] Send new message
4. [ ] System recovers
5. [ ] New message processes normally

**Expected**: System recovers from errors

## Test Data

### Test Images
1. **Simple Image**: White background, single object
2. **Complex Image**: Multiple colors, gradients
3. **Large Image**: 4000x4000 pixels or larger
4. **Small Image**: 100x100 pixels
5. **Transparent PNG**: Already has transparency

### Test Prompts
1. **Direct Commands**: "Remove the background"
2. **Polite Requests**: "Can you please remove the background?"
3. **Questions**: "What colors are in this image?"
4. **Multi-Step**: "Remove white and make it bigger"
5. **Ambiguous**: "Make it better"
6. **Invalid**: "Make it smell good"

## Success Criteria

### Must Pass (Critical)
- [ ] All basic message tests
- [ ] All tool execution tests (background removal, color knockout)
- [ ] Canvas integration works
- [ ] Confidence scores display correctly
- [ ] Error handling is graceful
- [ ] Suggested prompts work

### Should Pass (Important)
- [ ] Conversation history maintained
- [ ] Multiple tools can chain
- [ ] Performance is acceptable
- [ ] UI is responsive
- [ ] All interactive elements work

### Nice to Have (Optional)
- [ ] Perfect keyboard navigation
- [ ] Screen reader support
- [ ] Handles all edge cases
- [ ] Sub-second responses

## Bug Reporting Template

```markdown
**Test**: [Test Name]
**Expected**: [Expected behavior]
**Actual**: [Actual behavior]
**Steps to Reproduce**:
1. Step 1
2. Step 2
3. Step 3

**Console Errors**: [Any error messages]
**Screenshot**: [If applicable]
**Severity**: Critical | High | Medium | Low
```

## Test Results Log

| Test | Pass/Fail | Notes | Severity |
|------|-----------|-------|----------|
| 1.1  |           |       |          |
| 1.2  |           |       |          |
| ...  |           |       |          |

## Automated Testing (Future)

Consider adding:
- Unit tests for components
- Integration tests for API calls
- E2E tests with Playwright
- Visual regression tests
- Performance benchmarks

---

**Version**: 1.0.0 (Phase 8 Testing)
**Last Updated**: 2025-10-13
