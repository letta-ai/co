/**
 * useMessageGroups Hook
 *
 * Transforms raw Letta messages into unified MessageGroup objects for rendering.
 *
 * WHAT IT DOES:
 * - Groups messages by ID (reasoning + assistant share ID → single group)
 * - Pairs tool calls with tool returns automatically
 * - Extracts compaction alerts from user messages
 * - Parses multipart user messages (text + images)
 * - Appends streaming group as temporary FlatList item
 *
 * WHY IT EXISTS:
 * Before: Reasoning and assistant messages were separate FlatList items,
 *         requiring complex pairing logic in the render component.
 * After:  One MessageGroup per logical message turn, with reasoning co-located.
 *
 * STREAMING BEHAVIOR:
 * - While streaming: Appends temporary group (id='streaming', groupKey='streaming-assistant')
 * - Server refresh: Replaces with real messages (different groupKeys prevent flashing)
 *
 * This hook is pure - no side effects, just data transformation.
 */

import { useMemo } from 'react';
import type { LettaMessage } from '../types/letta';

/**
 * Unified message group for rendering
 */
export interface MessageGroup {
  // Identification
  id: string;          // Original message ID (or 'streaming')
  groupKey: string;    // Unique key for FlatList (id + type)

  // Type determines rendering component
  type: 'user' | 'assistant' | 'tool_call' | 'tool_return_orphaned' | 'compaction';

  // Universal content
  content: string;
  reasoning?: string;

  // Tool-specific
  toolCall?: {
    name: string;
    args: string;      // Python-formatted: "search(query=\"foo\")"
  };
  toolReturn?: string;

  // User-specific (multipart messages)
  images?: Array<{
    type: string;
    source: {
      type: string;
      data: string;
      mediaType?: string;
      media_type?: string;
      url?: string;
    };
  }>;

  // Compaction-specific
  compactionMessage?: string;

  // Metadata
  created_at: string;
  role: 'user' | 'assistant' | 'system' | 'tool';

  // Streaming indicator
  isStreaming?: boolean;
}

/**
 * Streaming state interface
 */
export interface StreamingState {
  reasoning: string;
  assistantMessage: string;
  toolCalls: Array<{
    id: string;
    name: string;
    args: string;
  }>;
}

interface UseMessageGroupsParams {
  messages: LettaMessage[];
  isStreaming: boolean;
  streamingState?: StreamingState;
}

/**
 * Group messages by ID into unified MessageGroup objects
 */
export function useMessageGroups({
  messages,
  isStreaming,
  streamingState,
}: UseMessageGroupsParams): MessageGroup[] {
  return useMemo(() => {
    // Step 1: Filter out system messages and login/heartbeat
    const filteredMessages = messages.filter((msg) => {
      if (msg.message_type === 'system_message') return false;

      // Filter login/heartbeat user messages
      if (msg.message_type === 'user_message' && msg.content) {
        try {
          const contentStr = typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content);
          const parsed = JSON.parse(contentStr);
          if (parsed?.type === 'login' || parsed?.type === 'heartbeat') {
            return false;
          }
        } catch {
          // Not JSON, keep it
        }
      }

      return true;
    });

    // Step 2: Sort chronologically
    const sorted = [...filteredMessages].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeA - timeB;
    });

    // Step 3: Group by ID
    const groupedById = new Map<string, LettaMessage[]>();
    for (const msg of sorted) {
      if (!groupedById.has(msg.id)) {
        groupedById.set(msg.id, []);
      }
      groupedById.get(msg.id)!.push(msg);
    }

    // Step 4: Convert each ID group to MessageGroup
    const groups: MessageGroup[] = [];

    for (const [id, messagesInGroup] of Array.from(groupedById.entries())) {
      const group = createMessageGroup(id, messagesInGroup);
      if (group) {
        groups.push(group);
      }
    }

    // Step 4.5: Remove assistant groups that have a tool call in the same step
    // When reasoning → assistant → tool call happen in the same step, we only want to show the tool call
    const stepIdToGroups = new Map<string, MessageGroup[]>();
    for (const group of groups) {
      const msg = sorted.find(m => m.id === group.id);
      const stepId = extractStepId(msg);
      if (stepId) {
        if (!stepIdToGroups.has(stepId)) {
          stepIdToGroups.set(stepId, []);
        }
        stepIdToGroups.get(stepId)!.push(group);
      }
    }

    // Remove assistant groups if there's a tool_call group in the same step
    const groupsToRemove = new Set<string>();
    for (const [stepId, stepGroups] of stepIdToGroups.entries()) {
      const hasToolCall = stepGroups.some(g => g.type === 'tool_call');
      if (hasToolCall) {
        // Remove any assistant groups in this step (tool call supersedes)
        for (const group of stepGroups) {
          if (group.type === 'assistant') {
            groupsToRemove.add(group.id);
          }
        }
      }
    }

    // Filter out the groups marked for removal
    const filteredGroups = groups.filter(g => !groupsToRemove.has(g.id));

    // Step 4.6: Pair orphaned tool returns with their tool calls
    // Letta uses different IDs for tool_call_message and tool_return_message,
    // but they share the same step_id - that's how we link them
    const toolCallGroups = new Map<string, MessageGroup>();
    const orphanedReturns = new Map<string, MessageGroup>();

    // First pass: index tool calls and orphaned returns by step_id
    for (const group of filteredGroups) {
      if (group.type === 'tool_call') {
        const msg = sorted.find(m => m.id === group.id);
        const stepId = extractStepId(msg);
        if (stepId) {
          toolCallGroups.set(stepId, group);
        }
      } else if (group.type === 'tool_return_orphaned') {
        const msg = sorted.find(m => m.id === group.id);
        const stepId = extractStepId(msg);
        if (stepId) {
          orphanedReturns.set(stepId, group);
        }
      }
    }

    // Second pass: pair tool calls with their returns
    for (const [stepId, returnGroup] of orphanedReturns.entries()) {
      const callGroup = toolCallGroups.get(stepId);
      if (callGroup && !callGroup.toolReturn) {
        // Merge the return into the call group
        callGroup.toolReturn = returnGroup.content;

        // Remove the orphaned return from filtered groups array
        const returnIndex = filteredGroups.findIndex(g => g.id === returnGroup.id);
        if (returnIndex !== -1) {
          filteredGroups.splice(returnIndex, 1);
        }
      }
    }

    // Step 5: Sort groups by created_at
    filteredGroups.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeA - timeB;
    });

    // Step 6: Append streaming group if active
    if (isStreaming && streamingState) {
      const streamingGroup = createStreamingGroup(streamingState);
      if (streamingGroup) {
        filteredGroups.push(streamingGroup);
      }
    }

    return filteredGroups;
  }, [messages, isStreaming, streamingState]);
}

/**
 * Create a MessageGroup from messages with the same ID
 */
function createMessageGroup(
  id: string,
  messagesInGroup: LettaMessage[]
): MessageGroup | null {
  if (messagesInGroup.length === 0) return null;

  // Find message types in this group
  const userMsg = messagesInGroup.find((m) => m.message_type === 'user_message');
  const assistantMsg = messagesInGroup.find((m) => m.message_type === 'assistant_message');
  const reasoningMsg = messagesInGroup.find((m) => m.message_type === 'reasoning_message');
  const toolCallMsg = messagesInGroup.find((m) => m.message_type === 'tool_call_message');
  const toolReturnMsg = messagesInGroup.find((m) => m.message_type === 'tool_return_message');

  // Use first message for metadata
  const firstMsg = messagesInGroup[0];

  // ========================================
  // USER MESSAGE
  // ========================================
  if (userMsg) {
    // Check for compaction alert
    const compactionInfo = extractCompactionInfo(userMsg.content);
    if (compactionInfo.isCompaction) {
      return {
        id,
        groupKey: `${id}-compaction`,
        type: 'compaction',
        content: compactionInfo.message,
        compactionMessage: compactionInfo.message,
        created_at: userMsg.created_at,
        role: userMsg.role,
      };
    }

    // Regular user message
    const { textContent, images } = parseUserContent(userMsg.content);

    // Skip if no content
    if (!textContent.trim() && images.length === 0) {
      return null;
    }

    return {
      id,
      groupKey: `${id}-user`,
      type: 'user',
      content: textContent,
      images: images.length > 0 ? images : undefined,
      created_at: userMsg.created_at,
      role: userMsg.role,
    };
  }

  // ========================================
  // TOOL CALL MESSAGE
  // ========================================
  if (toolCallMsg) {
    const toolCall = parseToolCall(toolCallMsg);

    return {
      id,
      groupKey: `${id}-tool_call`,
      type: 'tool_call',
      content: toolCall.args, // The formatted args string
      reasoning: reasoningMsg?.reasoning,
      toolCall: {
        name: toolCall.name,
        args: toolCall.args,
      },
      toolReturn: toolReturnMsg?.content || undefined,
      created_at: toolCallMsg.created_at,
      role: toolCallMsg.role,
    };
  }

  // ========================================
  // ORPHANED TOOL RETURN
  // ========================================
  if (toolReturnMsg && !toolCallMsg) {
    return {
      id,
      groupKey: `${id}-tool_return_orphaned`,
      type: 'tool_return_orphaned',
      content: toolReturnMsg.content,
      created_at: toolReturnMsg.created_at,
      role: toolReturnMsg.role,
    };
  }

  // ========================================
  // ASSISTANT MESSAGE
  // ========================================
  if (assistantMsg) {
    return {
      id,
      groupKey: `${id}-assistant`,
      type: 'assistant',
      content: assistantMsg.content,
      reasoning: reasoningMsg?.reasoning,
      created_at: assistantMsg.created_at,
      role: assistantMsg.role,
    };
  }

  // ========================================
  // STANDALONE REASONING (edge case)
  // ========================================
  if (reasoningMsg) {
    // Reasoning without assistant message - treat as assistant with empty content
    return {
      id,
      groupKey: `${id}-assistant`,
      type: 'assistant',
      content: '',
      reasoning: reasoningMsg.reasoning,
      created_at: reasoningMsg.created_at,
      role: 'assistant',
    };
  }

  // Unknown message type - skip
  return null;
}

/**
 * Create streaming group from current stream state
 */
function createStreamingGroup(state: StreamingState): MessageGroup | null {
  const now = new Date().toISOString();

  // Determine type: tool_call if we have tool calls, otherwise assistant
  if (state.toolCalls.length > 0) {
    // For streaming, we'll show all tool calls as one group
    const primaryCall = state.toolCalls[0];
    return {
      id: 'streaming',
      groupKey: 'streaming-tool_call',
      type: 'tool_call',
      content: primaryCall.args,
      reasoning: state.reasoning || undefined,
      toolCall: {
        name: primaryCall.name,
        args: primaryCall.args,
      },
      toolReturn: undefined, // No return yet during streaming
      created_at: now,
      role: 'assistant',
      isStreaming: true,
    };
  }

  // Assistant message streaming
  if (state.assistantMessage || state.reasoning) {
    return {
      id: 'streaming',
      groupKey: 'streaming-assistant',
      type: 'assistant',
      content: state.assistantMessage,
      reasoning: state.reasoning || undefined,
      created_at: now,
      role: 'assistant',
      isStreaming: true,
    };
  }

  // No content yet - don't show anything
  return null;
}

/**
 * Extract compaction info from user message content
 */
function extractCompactionInfo(content: any): {
  isCompaction: boolean;
  message: string;
} {
  try {
    const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
    const parsed = JSON.parse(contentStr);

    if (parsed?.type === 'system_alert') {
      let messageText = parsed.message || '';

      // Try to extract JSON from code block
      const jsonMatch = messageText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        try {
          const innerJson = JSON.parse(jsonMatch[1]);
          messageText = innerJson.message || messageText;
        } catch {
          // Use outer message
        }
      }

      // Strip preamble (use [\s\S] instead of . with s flag for ES5 compatibility)
      messageText = messageText.replace(
        /^Note: prior messages have been hidden from view[\s\S]*?The following is a summary of the previous messages:\s*/i,
        ''
      );

      return {
        isCompaction: true,
        message: messageText,
      };
    }
  } catch {
    // Not JSON
  }

  return { isCompaction: false, message: '' };
}

/**
 * Parse user message content (text + images)
 */
function parseUserContent(content: any): {
  textContent: string;
  images: Array<{
    type: string;
    source: {
      type: string;
      data: string;
      mediaType?: string;
      media_type?: string;
      url?: string;
    };
  }>;
} {
  let textContent = '';
  let images: any[] = [];

  if (typeof content === 'object' && Array.isArray(content)) {
    // Multipart message
    images = content.filter((item: any) => item.type === 'image');
    const textParts = content.filter((item: any) => item.type === 'text');
    textContent = textParts
      .map((item: any) => item.text || '')
      .filter((t: string) => t)
      .join('\n');
  } else if (typeof content === 'string') {
    textContent = content;
  } else {
    textContent = String(content || '');
  }

  return { textContent, images };
}

/**
 * Extract step_id from a message - this is how Letta links tool calls with their returns
 */
function extractStepId(msg: LettaMessage | undefined): string | null {
  if (!msg) return null;

  const msgAny = msg as any;
  // Letta uses step_id to group tool call and tool return messages
  return msgAny.step_id || null;
}

/**
 * Parse tool call message to extract name and args
 */
function parseToolCall(msg: LettaMessage): {
  name: string;
  args: string;
} {
  // Try to parse from content (already formatted string like "search(query=\"foo\")")
  if (typeof msg.content === 'string' && msg.content.includes('(')) {
    return {
      name: msg.content.split('(')[0],
      args: msg.content,
    };
  }

  // Fallback: extract from tool_call object
  if (msg.tool_call || msg.tool_calls?.[0]) {
    const toolCall = msg.tool_call || msg.tool_calls![0];
    const callObj: any = toolCall.function || toolCall;
    const name = callObj?.name || 'unknown_tool';
    const args = callObj?.arguments || callObj?.args || {};

    // Format as Python call
    const formatArgsPython = (obj: any): string => {
      if (!obj || typeof obj !== 'object') return '';
      return Object.entries(obj)
        .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
        .join(', ');
    };

    const argsStr = `${name}(${formatArgsPython(args)})`;

    return { name, args: argsStr };
  }

  // Fallback to content as-is
  return {
    name: 'unknown_tool',
    args: String(msg.content || ''),
  };
}
