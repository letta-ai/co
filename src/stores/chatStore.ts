import { create } from 'zustand';
import type { LettaMessage, StreamingChunk } from '../types/letta';

interface StreamState {
  reasoning: string;
  toolCalls: Array<{ id: string; name: string; args: string }>;
  assistantMessage: string;
}

interface CompletedBlock {
  type: 'reasoning' | 'assistant_message';
  content: string;
}

interface ChatState {
  // Message state
  messages: LettaMessage[];
  isLoadingMessages: boolean;
  isLoadingMore: boolean;
  earliestCursor: string | null;
  hasMoreBefore: boolean;

  // Streaming state
  isStreaming: boolean;
  isSendingMessage: boolean;
  currentStream: StreamState;
  completedStreamBlocks: CompletedBlock[];

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

  // Streaming actions
  startStreaming: () => void;
  stopStreaming: () => void;
  updateStreamReasoning: (reasoning: string) => void;
  updateStreamAssistant: (content: string) => void;
  addStreamToolCall: (toolCall: { id: string; name: string; args: string }) => void;
  completeReasoningBlock: (content: string) => void;
  completeAssistantBlock: (content: string) => void;
  clearStream: () => void;

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
  currentStream: {
    reasoning: '',
    toolCalls: [],
    assistantMessage: '',
  },
  completedStreamBlocks: [],

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

  // Streaming actions
  startStreaming: () => {
    set({
      isStreaming: true,
      currentStream: { reasoning: '', toolCalls: [], assistantMessage: '' },
      completedStreamBlocks: [],
      lastMessageNeedsSpace: true,
    });
  },

  stopStreaming: () => {
    set({ isStreaming: false, lastMessageNeedsSpace: false });
  },

  updateStreamReasoning: (reasoning) => {
    set((state) => {
      // If we have assistant message, save it first and start new reasoning block
      if (state.currentStream.assistantMessage) {
        return {
          completedStreamBlocks: [
            ...state.completedStreamBlocks,
            { type: 'assistant_message' as const, content: state.currentStream.assistantMessage },
          ],
          currentStream: {
            reasoning,
            toolCalls: [],
            assistantMessage: '',
          },
        };
      }
      // Otherwise accumulate reasoning
      return {
        currentStream: {
          ...state.currentStream,
          reasoning: state.currentStream.reasoning + reasoning,
        },
      };
    });
  },

  updateStreamAssistant: (content) => {
    set((state) => {
      // If we have reasoning and no assistant message yet, save reasoning first
      if (state.currentStream.reasoning && !state.currentStream.assistantMessage) {
        return {
          completedStreamBlocks: [
            ...state.completedStreamBlocks,
            { type: 'reasoning' as const, content: state.currentStream.reasoning },
          ],
          currentStream: {
            reasoning: '',
            toolCalls: [],
            assistantMessage: content,
          },
        };
      }
      // Otherwise accumulate assistant message
      return {
        currentStream: {
          ...state.currentStream,
          assistantMessage: state.currentStream.assistantMessage + content,
        },
      };
    });
  },

  addStreamToolCall: (toolCall) => {
    set((state) => {
      // Check if tool call already exists
      const exists = state.currentStream.toolCalls.some((tc) => tc.id === toolCall.id);
      if (exists) return state;

      return {
        currentStream: {
          ...state.currentStream,
          toolCalls: [...state.currentStream.toolCalls, toolCall],
        },
      };
    });
  },

  completeReasoningBlock: (content) => {
    set((state) => ({
      completedStreamBlocks: [
        ...state.completedStreamBlocks,
        { type: 'reasoning' as const, content },
      ],
    }));
  },

  completeAssistantBlock: (content) => {
    set((state) => ({
      completedStreamBlocks: [
        ...state.completedStreamBlocks,
        { type: 'assistant_message' as const, content },
      ],
    }));
  },

  clearStream: () => {
    set({
      currentStream: { reasoning: '', toolCalls: [], assistantMessage: '' },
      completedStreamBlocks: [],
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
