# Canvas Issue & Solution

## Problem

The AI chat orchestrator is trying to run image processing tools on the **server-side** (API route), but:

1. ❌ Canvas npm package requires native C++ compilation
2. ❌ pnpm is blocking build scripts for security
3. ❌ Blob URLs from browser don't work on server
4. ❌ Even with data URLs, server still needs canvas package

## Current Flow (Broken)

```
Browser → API (/api/ai/chat-orchestrator) → Server executes tools → Returns result
          ❌ Fails: canvas package not available
```

## Solution: Client-Side Tool Execution

Instead of executing tools on the server, execute them **in the browser** where Canvas API is native:

```
Browser → API (get Claude's response) → Browser executes tools → Update canvas
          ✅ Works: native Canvas API
```

## Implementation Plan

### Option 1: Quick Fix (10 min)
Make API route return tool instructions without executing:

**Modify:** `app/api/ai/chat-orchestrator/route.ts`
- Remove tool execution
- Just return Claude's tool calls
- Let client execute the tools

**Modify:** `components/panels/ai-chat-panel.tsx`
- Execute tools locally after receiving response
- Use existing tool functions from lib/tools/*

### Option 2: Install canvas package (30 min+)
Try to get canvas package working on server:
```bash
# Requires system dependencies
brew install pkg-config cairo pango libpng jpeg giflib librsvg
pnpm rebuild canvas
```

## Recommendation

Use **Option 1** - it's faster, simpler, and more reliable:
- ✅ No native dependencies needed
- ✅ Works on any hosting platform
- ✅ Faster (no server processing)
- ✅ Better security (image data stays in browser)

## What's Working Now

✅ AI chat UI  
✅ Claude Vision API integration  
✅ Tool selection logic  
✅ Data URL conversion  
❌ Tool execution (fails on server)  
❌ Result display on canvas  

## Expected Behavior

1. User: "Remove white color"
2. AI: Calls `color_knockout` tool
3. Tool executes **in browser**
4. Result displays in main canvas panel

Ready to implement Option 1?
