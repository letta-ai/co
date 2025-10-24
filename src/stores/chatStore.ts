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
  selectedImages: [],

  // Message actions
  setMessages: (messages) => {
    console.log('[CHAT STORE] setMessages:', messages.length);
    set({ messages });
  },

  addMessage: (message) => {
    console.log('[CHAT STORE] addMessage:', message.id);
    set((state) => ({
      messages: [...state.messages, message],
    }));
  },

  addMessages: (messages) => {
    console.log('[CHAT STORE] addMessages:', messages.length);
    set((state) => ({
      messages: [...state.messages, ...messages],
    }));
  },

  prependMessages: (messages) => {
    console.log('[CHAT STORE] prependMessages:', messages.length);
    set((state) => ({
      messages: [...messages, ...state.messages],
    }));
  },

  clearMessages: () => {
    console.log('[CHAT STORE] clearMessages');
    set({ messages: [], earliestCursor: null, hasMoreBefore: false });
  },

  // Streaming actions - DEAD SIMPLE
  startStreaming: () => {
    console.log('▶️ START STREAMING');
    set({
      isStreaming: true,
      currentStreamingMessage: null,
      completedStreamingMessages: [],
      lastMessageNeedsSpace: true,
    });
  },

  stopStreaming: () => {
    console.log('⏹️ STOP STREAMING');
    set({ isStreaming: false, lastMessageNeedsSpace: false });
  },

  // Accumulate reasoning (delta)
  accumulateReasoning: (messageId, reasoning) => {
    set((state) => {
      // If no current message OR different ID, create new
      if (!state.currentStreamingMessage || state.currentStreamingMessage.id !== messageId) {
        console.log('🆕 New message started:', messageId.substring(0, 20));
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
        console.log('🆕 New tool call message started:', messageId.substring(0, 20));
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
        console.log('🆕 New assistant message started:', messageId.substring(0, 20));
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
        console.log('⚠️ No current message to finalize');
        return {};
      }

      console.log('✅ FINALIZE MESSAGE:', state.currentStreamingMessage.id.substring(0, 20));
      return {
        completedStreamingMessages: [...state.completedStreamingMessages, state.currentStreamingMessage],
        currentStreamingMessage: null,
      };
    });
  },

  // Clear everything
  clearAllStreamingState: () => {
    console.log('🧹 CLEAR ALL STREAMING STATE');
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
}));
