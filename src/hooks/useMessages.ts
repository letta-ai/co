import { useEffect, useCallback } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAgentStore } from '../stores/agentStore';
import lettaApi from '../api/lettaApi';
import { config } from '../config';
import type { LettaMessage } from '../types/letta';

/**
 * Hook to manage message loading and pagination
 */
export function useMessages() {
  const chatStore = useChatStore();
  const coAgent = useAgentStore((state) => state.coAgent);

  // Helper to filter out "More human than human" message
  const filterFirstMessage = useCallback((msgs: LettaMessage[]): LettaMessage[] => {
    const checkLimit = Math.min(5, msgs.length);
    for (let i = 0; i < checkLimit; i++) {
      if (msgs[i].content.includes('More human than human')) {
        return [...msgs.slice(0, i), ...msgs.slice(i + 1)];
      }
    }
    return msgs;
  }, []);

  // Load initial messages
  const loadMessages = useCallback(
    async (before?: string, limit?: number) => {
      if (!coAgent) return;

      try {
        if (!before) {
          chatStore.setLoadingMessages(true);
        } else {
          chatStore.setLoadingMore(true);
        }

        const loadedMessages = await lettaApi.listMessages(coAgent.id, {
          before: before || undefined,
          limit: limit || (before ? config.features.messagePageSize : config.features.initialMessageLoad),
          use_assistant_message: true,
        });

        if (loadedMessages.length > 0) {
          if (before) {
            // Loading older messages - prepend them
            const filtered = filterFirstMessage([...loadedMessages, ...chatStore.messages]);
            chatStore.setMessages(filtered);
            chatStore.setEarliestCursor(loadedMessages[0].id);
          } else {
            // Initial load
            const filtered = filterFirstMessage(loadedMessages);
            chatStore.setMessages(filtered);
            if (loadedMessages.length > 0) {
              chatStore.setEarliestCursor(loadedMessages[0].id);
            }
          }
          chatStore.setHasMoreBefore(
            loadedMessages.length === (limit || (before ? config.features.messagePageSize : config.features.initialMessageLoad))
          );
        } else if (before) {
          chatStore.setHasMoreBefore(false);
        }
      } catch (error: any) {
        console.error('Failed to load messages:', error);
        throw error;
      } finally {
        chatStore.setLoadingMessages(false);
        chatStore.setLoadingMore(false);
      }
    },
    [coAgent, chatStore, filterFirstMessage]
  );

  // Load more older messages
  const loadMoreMessages = useCallback(() => {
    if (chatStore.hasMoreBefore && !chatStore.isLoadingMore && chatStore.earliestCursor) {
      loadMessages(chatStore.earliestCursor);
    }
  }, [chatStore.hasMoreBefore, chatStore.isLoadingMore, chatStore.earliestCursor, loadMessages]);

  // Load messages when agent becomes available
  useEffect(() => {
    if (coAgent && chatStore.messages.length === 0) {
      loadMessages();
    }
  }, [coAgent]);

  return {
    messages: chatStore.messages,
    isLoadingMessages: chatStore.isLoadingMessages,
    isLoadingMore: chatStore.isLoadingMore,
    hasMoreBefore: chatStore.hasMoreBefore,

    loadMessages,
    loadMoreMessages,
  };
}
