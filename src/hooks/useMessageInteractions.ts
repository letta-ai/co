/**
 * useMessageInteractions Hook
 *
 * Manages state and handlers for message interactions:
 * - Expanding/collapsing reasoning blocks
 * - Expanding/collapsing compaction summaries
 * - Expanding/collapsing orphaned tool returns
 * - Copying message content to clipboard
 *
 * Uses Set data structure for O(1) lookups and efficient state management.
 */

import { useState, useCallback } from 'react';
import * as Clipboard from 'expo-clipboard';

export function useMessageInteractions() {
  // State - using Sets for efficient O(1) lookups
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [expandedCompaction, setExpandedCompaction] = useState<Set<string>>(new Set());
  const [expandedToolReturns, setExpandedToolReturns] = useState<Set<string>>(new Set());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  // Toggle reasoning expansion for a message
  const toggleReasoning = useCallback((messageId: string) => {
    setExpandedReasoning((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Toggle compaction expansion for a message
  const toggleCompaction = useCallback((messageId: string) => {
    setExpandedCompaction((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Toggle tool return expansion for a message
  const toggleToolReturn = useCallback((messageId: string) => {
    setExpandedToolReturns((prev) => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  // Copy message content to clipboard with 2-second confirmation
  const copyToClipboard = useCallback(async (content: string, messageId?: string) => {
    try {
      await Clipboard.setStringAsync(content);
      if (messageId) {
        setCopiedMessageId(messageId);
        setTimeout(() => setCopiedMessageId(null), 2000);
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
    }
  }, []);

  // Auto-expand reasoning for a message (doesn't toggle, just adds)
  const expandReasoning = useCallback((messageId: string) => {
    setExpandedReasoning((prev) => {
      if (prev.has(messageId)) return prev; // Already expanded
      const next = new Set(prev);
      next.add(messageId);
      return next;
    });
  }, []);

  return {
    // State
    expandedReasoning,
    expandedCompaction,
    expandedToolReturns,
    copiedMessageId,

    // Handlers
    toggleReasoning,
    toggleCompaction,
    toggleToolReturn,
    copyToClipboard,
    expandReasoning,
  };
}
