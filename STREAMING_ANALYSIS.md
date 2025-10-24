# Letta Streaming Analysis & Implementation Guide

## Real Streaming Behavior (From Testing)

Based on actual testing with the message "create a memory block called cameron":

### Message Flow Pattern

```
[0-21]   reasoning_message      (ID: message-f7b4fa60-0195-4e50-98c9-dfb6a03b013f)
[22-36]  tool_call_message      (ID: message-f7b4fa60-0195-4e50-98c9-dfb6a03b013f)  ← SAME ID
[37]     tool_return_message    (ID: message-e906b6cc-33a1-440c-8ff6-15b06ec287c8)  ← NEW ID
[38-53]  reasoning_message      (ID: message-cc7aa672-7859-4e22-9ccd-2efbde068e6c)  ← NEW ID
[54-88]  assistant_message      (ID: message-cc7aa672-7859-4e22-9ccd-2efbde068e6c)  ← SAME ID
[89]     stop_reason
[90]     usage_statistics
```

### Key Insights

1. **Chunks are DELTAS** - Each chunk contains only the new text, not the full accumulated text
2. **Message IDs group related chunks** - All chunks with the same ID belong together
3. **Reasoning + Content share IDs** - Reasoning and its paired content (tool_call OR assistant) have the same ID
4. **Tool returns have separate IDs** - Tool return messages have different IDs from their calls
5. **New reasoning = New message group** - When a new reasoning_message with a different ID arrives, the previous group is complete

## Message Grouping Rules

### Rule 1: Message Boundary Detection
A new message group starts when we receive a `reasoning_message` chunk with a **different ID** than the current one.

### Rule 2: Message Structure
Each message group contains:
- `reasoning` (optional) - from `reasoning_message` chunks
- `content` - from either `tool_call_message` OR `assistant_message` chunks
- `id` - the shared message ID from Letta

### Rule 3: Tool Returns
Tool return messages (`tool_return_message`) have separate IDs and should be stored separately, then paired with their tool call using `step_id`.

## Correct Implementation Strategy

### Data Structure
```typescript
interface AccumulatingMessage {
  id: string;
  reasoning: string;  // Accumulate reasoning chunks here
  content: string;    // Accumulate tool_call OR assistant chunks here
  type: 'tool_call' | 'assistant' | null;  // What kind of content
  toolCallName?: string;  // For tool calls
}
```

### Algorithm

```
currentMessage = null
completedMessages = []

ON CHUNK RECEIVED:
  chunkId = chunk.id

  // NEW MESSAGE GROUP DETECTED
  if chunk.message_type === 'reasoning_message' AND currentMessage AND currentMessage.id !== chunkId:
    // Previous message is complete
    completedMessages.push(currentMessage)
    currentMessage = { id: chunkId, reasoning: '', content: '', type: null }

  // INITIALIZE IF NEEDED
  if NOT currentMessage:
    currentMessage = { id: chunkId, reasoning: '', content: '', type: null }

  // ACCUMULATE BASED ON TYPE
  if chunk.message_type === 'reasoning_message':
    currentMessage.reasoning += chunk.reasoning

  else if chunk.message_type === 'tool_call_message':
    currentMessage.type = 'tool_call'
    currentMessage.toolCallName = chunk.tool_call.name
    currentMessage.content += chunk.tool_call.arguments  // Delta!

  else if chunk.message_type === 'assistant_message':
    currentMessage.type = 'assistant'
    currentMessage.content += extractText(chunk.content)  // Delta!

  else if chunk.message_type === 'tool_return_message':
    // Tool returns are separate - just store them
    storeToolReturn(chunk)

ON STREAM COMPLETE:
  // Finalize the last message
  if currentMessage:
    completedMessages.push(currentMessage)

  // Convert to display format and add to messages array
  convertAndStore(completedMessages)
```

## Problems We've Had

### Problem 1: "One Slot" - Messages Replacing Each Other
**Symptom**: Only one message visible during streaming, messages replace each other
**Cause**: Only showing `currentStream`, not showing `completedStreamPhases` alongside it
**Fix**: Display BOTH completed messages AND current accumulating message

### Problem 2: Messages Disappearing After Completion
**Symptom**: Messages visible during stream, gone after stream ends
**Cause**: Clearing state before converting to permanent messages
**Fix**: Convert to messages FIRST, THEN clear streaming state

### Problem 3: Finalization Timing
**Symptom**: Messages not moving to completed at the right time
**Cause**: Finalizing on message TYPE change instead of ID change
**Fix**: Only finalize when we see a new reasoning_message with a different ID

### Problem 4: Fetching from Server
**Symptom**: Flickering, delay, messages appearing twice
**Cause**: Trying to fetch "official" messages from server after streaming
**Fix**: Don't fetch from server - we have everything from the stream

## Current Issues

1. Messages still disappearing during streaming (one slot problem persists)
2. Messages not reappearing after completion
3. Flickering between phases

## Required Fixes

1. **Simplify state structure** - One accumulating message, one array of completed
2. **Fix display logic** - Show BOTH accumulated + completed simultaneously
3. **Fix finalization** - Trigger only on ID change
4. **Fix persistence** - Convert to messages immediately, don't clear state prematurely
