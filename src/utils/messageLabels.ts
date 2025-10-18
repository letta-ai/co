/**
 * Message Label Utilities
 *
 * Computes human-readable labels for message groups based on:
 * - Message type (assistant, tool_call, etc.)
 * - Streaming state
 * - Tool name (for tool calls)
 * - Content presence (reasoning-only vs full message)
 *
 * Used by MessageGroupBubble to show unified "(co <action>)" labels.
 */

import type { MessageGroup } from '../hooks/useMessageGroups';

/**
 * Tool name to human-readable action mapping
 */
const TOOL_ACTIONS: Record<string, { past: string; present: string }> = {
  web_search: { past: 'searched the web', present: 'is searching the web' },
  open_files: { past: 'opened files', present: 'is opening files' },
  memory: { past: 'recalled', present: 'is recalling' },
  conversation_search: { past: 'searched the conversation', present: 'is searching the conversation' },
  grep_files: { past: 'searched files', present: 'is searching files' },
  memory_replace: { past: 'updated memory', present: 'is updating memory' },
  memory_insert: { past: 'added to memory', present: 'is adding to memory' },
  fetch_webpage: { past: 'fetched a webpage', present: 'is fetching a webpage' },
  semantic_search_files: { past: 'searched files', present: 'is searching files' },
};

/**
 * Get human-readable label for a message group
 *
 * Examples:
 * - "(co said)" - assistant message with content
 * - "(co thought)" - assistant message with only reasoning
 * - "(co searched the web)" - completed web_search tool call
 * - "(co is thinking)" - streaming with only reasoning
 * - "(co is searching the web)" - streaming web_search tool call
 */
export function getMessageLabel(group: MessageGroup): string {
  const isStreaming = group.isStreaming === true;

  // TOOL CALL MESSAGE
  if (group.type === 'tool_call') {
    const toolName = group.toolCall?.name || 'unknown_tool';
    const action = TOOL_ACTIONS[toolName];

    if (action) {
      return isStreaming ? `(co ${action.present})` : `(co ${action.past})`;
    }

    // Fallback for unknown tools
    return isStreaming ? `(co is using ${toolName})` : `(co used ${toolName})`;
  }

  // ASSISTANT MESSAGE
  if (group.type === 'assistant') {
    const hasContent = group.content && group.content.trim().length > 0;
    const hasReasoningOnly = group.reasoning && !hasContent;

    if (hasReasoningOnly) {
      // Only reasoning, no assistant message content
      return isStreaming ? '(co is thinking)' : '(co thought)';
    }

    // Has assistant message content (with or without reasoning)
    return isStreaming ? '(co is saying)' : '(co said)';
  }

  // USER MESSAGE (shouldn't need label, but handle gracefully)
  if (group.type === 'user') {
    return ''; // User messages don't show labels
  }

  // COMPACTION (shouldn't need label)
  if (group.type === 'compaction') {
    return ''; // Compaction bars have their own styling
  }

  // ORPHANED TOOL RETURN (defensive)
  if (group.type === 'tool_return_orphaned') {
    return '(tool result)';
  }

  // Fallback
  return '(co)';
}
