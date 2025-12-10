import { create } from 'zustand';
import type { LettaMessage, StreamingChunk } from '../types/letta';

/**
 * Simple streaming message accumulator
 * One message = reasoning + content (tool_call OR assistant)
 */
interface StreamingMessage {
  id: string;  // Message ID from Letta
  reasoning: string;
  content: string;
  type: 'tool_call' | 'assistant' | null;
  toolCallName?: string;
  timestamp: string;
}

interface ChatState {
  // Message state
  messages: LettaMessage[];
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  earliestCursor: string | null;
  hasMoreBefore: boolean;

  // Streaming state - SIMPLE!
  isStreaming: boolean;
  isSendingMessage: boolean;
  currentStreamingMessage: StreamingMessage | null;  // What we're accumulating right now
  completedStreamingMessages: StreamingMessage[];     // Messages finished but stream still active

  // UI state
  hasInputText: boolean;
  lastMessageNeedsSpace: boolean;

  // Error state
  streamError: string | null;

  // Image attachments
  selectedImages: Array<{ uri: string; base64: string; mediaType: string }>;

  // Actions
  setMessages: (messages: LettaMessage[]) => void;
  addMessage: (message: LettaMessage) => void;
  addMessages: (messages: LettaMessage[]) => void;
  prependMessages: (messages: LettaMessage[]) => void;
  clearMessages: () => void;

  // Streaming actions - SIMPLE!
  startStreaming: () => void;
  stopStreaming: () => void;

  // Accumulate into current message
  accumulateReasoning: (messageId: string, reasoning: string) => void;
  accumulateToolCall: (messageId: string, toolName: string, args: string) => void;
  accumulateAssistant: (messageId: string, content: string) => void;

  // Move current to completed (when we detect new message)
  finalizeCurrentMessage: () => void;

  // Clear all streaming state
  clearAllStreamingState: () => void;

  // Image actions
  addImage: (image: { uri: string; base64: string; mediaType: string }) => void;
  removeImage: (index: number) => void;
  clearImages: () => void;

  // Loading actions
  setLoadingMessages: (loading: boolean) => void;
  setLoadingMore: (loading: boolean) => void;
  setSendingMessage: (sending: boolean) => void;
  setEarliestCursor: (cursor: string | null) => void;
  setHasMoreBefore: (hasMore: boolean) => void;

  // UI actions
  setHasInputText: (hasText: boolean) => void;
  setLastMessageNeedsSpace: (needs: boolean) => void;

  // Error actions
  setStreamError: (error: string | null) => void;
  clearStreamError: () => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  messages: [],
  isLoadingMessages: false,
  isLoadingMore: false,
  earliestCursor: null,
  hasMoreBefore: false,

  isStreaming: false,
  isSendingMessage: false,
  currentStreamingMessage: null,
  completedStreamingMessages: [],

  hasInputText: false,
  lastMessageNeedsSpace: false,
  streamError: null,
  selectedImages: [],

  // Message actions
  setMessages: (messages) => {
    set({ messages });
  },

  addMessage: (message) => {
    set((state) => ({
      messages: [...state.messages, message],
      lastMessageNeedsSpace: message.role === 'user' ? false : state.lastMessageNeedsSpace,
    }));
  },

  addMessages: (messages) => {
    set((state) => ({
      messages: [...state.messages, ...messages],
    }));
  },

  prependMessages: (messages) => {
    set((state) => ({
      messages: [...messages, ...state.messages],
    }));
  },

  clearMessages: () => {
    set({ messages: [], earliestCursor: null, hasMoreBefore: false, lastMessageNeedsSpace: false });
  },

  // Streaming actions - DEAD SIMPLE
  startStreaming: () => {
    set({
      isStreaming: true,
      currentStreamingMessage: null,
      completedStreamingMessages: [],
      lastMessageNeedsSpace: true,
    });
  },

  stopStreaming: () => {
    set({ isStreaming: false });
  },

  // Accumulate reasoning (delta)
  accumulateReasoning: (messageId, reasoning) => {
    set((state) => {
      // If no current message OR different ID, create new
      if (!state.currentStreamingMessage || state.currentStreamingMessage.id !== messageId) {
        return {
          currentStreamingMessage: {
            id: messageId,
            reasoning: reasoning,
            content: '',
            type: null,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Same message, accumulate reasoning
      return {
        currentStreamingMessage: {
          ...state.currentStreamingMessage,
          reasoning: state.currentStreamingMessage.reasoning + reasoning,
        },
      };
    });
  },

  // Accumulate tool call (delta)
  accumulateToolCall: (messageId, toolName, args) => {
    set((state) => {
      // If no current message OR different ID, create new
      if (!state.currentStreamingMessage || state.currentStreamingMessage.id !== messageId) {
        return {
          currentStreamingMessage: {
            id: messageId,
            reasoning: '',
            content: args,
            type: 'tool_call',
            toolCallName: toolName,
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Same message, accumulate tool call args
      return {
        currentStreamingMessage: {
          ...state.currentStreamingMessage,
          type: 'tool_call',
          toolCallName: toolName,
          content: state.currentStreamingMessage.content + args,
        },
      };
    });
  },

  // Accumulate assistant (delta)
  accumulateAssistant: (messageId, content) => {
    set((state) => {
      // If no current message OR different ID, create new
      if (!state.currentStreamingMessage || state.currentStreamingMessage.id !== messageId) {
        return {
          currentStreamingMessage: {
            id: messageId,
            reasoning: '',
            content: content,
            type: 'assistant',
            timestamp: new Date().toISOString(),
          },
        };
      }

      // Same message, accumulate assistant content
      return {
        currentStreamingMessage: {
          ...state.currentStreamingMessage,
          type: 'assistant',
          content: state.currentStreamingMessage.content + content,
        },
      };
    });
  },

  // Move current to completed
  finalizeCurrentMessage: () => {
    set((state) => {
      if (!state.currentStreamingMessage) {
        return {};
      }

      return {
        completedStreamingMessages: [...state.completedStreamingMessages, state.currentStreamingMessage],
        currentStreamingMessage: null,
      };
    });
  },

  // Clear everything
  clearAllStreamingState: () => {
    set({
      currentStreamingMessage: null,
      completedStreamingMessages: [],
    });
  },

  // Image actions
  addImage: (image) => {
    set((state) => ({
      selectedImages: [...state.selectedImages, image],
    }));
  },

  removeImage: (index) => {
    set((state) => ({
      selectedImages: state.selectedImages.filter((_, i) => i !== index),
    }));
  },

  clearImages: () => {
    set({ selectedImages: [] });
  },

  // Loading actions
  setLoadingMessages: (loading) => set({ isLoadingMessages: loading }),
  setLoadingMore: (loading) => set({ isLoadingMore: loading }),
  setSendingMessage: (sending) => set({ isSendingMessage: sending }),
  setEarliestCursor: (cursor) => set({ earliestCursor: cursor }),
  setHasMoreBefore: (hasMore) => set({ hasMoreBefore: hasMore }),

  // UI actions
  setHasInputText: (hasText) => set({ hasInputText: hasText }),
  setLastMessageNeedsSpace: (needs) => set({ lastMessageNeedsSpace: needs }),

  // Error actions
  setStreamError: (error) => set({ streamError: error }),
  clearStreamError: () => set({ streamError: null }),
}));
