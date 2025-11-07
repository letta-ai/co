import { useCallback, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useAgentStore } from '../stores/agentStore';
import lettaApi from '../api/lettaApi';
import type { StreamingChunk, LettaMessage } from '../types/letta';

/**
 * Hook to handle streaming message sending
 */
export function useMessageStream() {
  const chatStore = useChatStore();
  const coAgent = useAgentStore((state) => state.coAgent);

  // Track last message ID to detect when a new message starts
  const lastMessageIdRef = useRef<string | null>(null);

  // Handle individual streaming chunks - ULTRA SIMPLE
  const handleStreamingChunk = useCallback((chunk: StreamingChunk) => {
    const chunkType = chunk.message_type;
    const chunkId = (chunk as any).id;

    // Skip non-content chunks
    if (chunkType === 'stop_reason' || chunkType === 'usage_statistics') {
      return;
    }

    // Handle errors
    if ((chunk as any).error) {
      console.error('❌ Stream error:', (chunk as any).error);
      return;
    }

    console.log(`📦 [${chunkType}] ID: ${chunkId?.substring(0, 8)}...`);

    // DETECT NEW MESSAGE: If we see a different ID on reasoning OR tool_call, finalize current
    // This handles both: reasoning → tool_call transitions AND tool_call → reasoning transitions
    if ((chunkType === 'reasoning_message' || chunkType === 'tool_call_message') && chunkId) {
      if (lastMessageIdRef.current && chunkId !== lastMessageIdRef.current) {
        console.log('🔄 NEW MESSAGE DETECTED - finalizing previous');
        chatStore.finalizeCurrentMessage();
      }
      lastMessageIdRef.current = chunkId;
    }

    // ACCUMULATE BASED ON TYPE
    if (chunkType === 'reasoning_message' && chunk.reasoning && chunkId) {
      chatStore.accumulateReasoning(chunkId, chunk.reasoning);
    }
    else if (chunkType === 'tool_call_message' && chunkId) {
      // SDK v1.0: tool_calls is now an array
      const toolCalls = (chunk as any).tool_calls || [(chunk as any).toolCall || (chunk as any).tool_call].filter(Boolean);
      if (toolCalls.length > 0) {
        const toolCall = toolCalls[0];
        const toolName = toolCall.name || toolCall.tool_name || 'unknown';
        // Try multiple places for arguments
        let args = toolCall.arguments || toolCall.args || '';
        
        // If args is an object, format it as a string
        if (typeof args === 'object' && args !== null) {
          args = JSON.stringify(args);
        }
        
        console.log('🔧 Tool call:', toolName, 'args:', args);
        chatStore.accumulateToolCall(chunkId, toolName, args);
      }
    }
    else if (chunkType === 'assistant_message' && chunkId) {
      let contentText = '';
      const content = chunk.content as any;

      if (typeof content === 'string') {
        contentText = content;
      } else if (Array.isArray(content)) {
        contentText = content
          .filter((item: any) => item.type === 'text')
          .map((item: any) => item.text || '')
          .join('');
      } else if (content?.text) {
        contentText = content.text;
      }

      if (contentText) {
        chatStore.accumulateAssistant(chunkId, contentText);
      }
    }
    // tool_return_message - just log, we'll handle pairing later
    else if (chunkType === 'tool_return_message') {
      console.log('📨 Tool return received');
    }
  }, [chatStore]);

  // Send a message with streaming
  const sendMessage = useCallback(
    async (messageText: string, imagesToSend: Array<{ uri: string; base64: string; mediaType: string }>) => {
      if ((!messageText.trim() && imagesToSend.length === 0) || !coAgent || chatStore.isSendingMessage) {
        return;
      }

      console.log('sendMessage called - messageText:', messageText, 'imagesToSend length:', imagesToSend.length);

      chatStore.setSendingMessage(true);

      // Immediately add user message to UI
      let tempMessageContent: any;
      if (imagesToSend.length > 0) {
        const contentParts = [];

        // Always add text part first (even if empty) when images present
        contentParts.push({
          type: 'text',
          text: messageText || '',
        });

        // Add images after text
        for (const img of imagesToSend) {
          contentParts.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType,
              data: img.base64,
            },
          });
        }

        tempMessageContent = contentParts;
      } else {
        tempMessageContent = messageText;
      }

      const tempUserMessage: LettaMessage = {
        id: `temp-${Date.now()}`,
        role: 'user',
        message_type: 'user_message',
        content: tempMessageContent,
        created_at: new Date().toISOString(),
      } as LettaMessage;

      chatStore.addMessage(tempUserMessage);

      try {
        chatStore.startStreaming();
        lastMessageIdRef.current = null; // Reset for new stream

        // Build message content
        let messageContent: any;
        if (imagesToSend.length > 0) {
          const contentParts = [];

          // Always add text part first (even if empty) when images present
          contentParts.push({
            type: 'text',
            text: messageText || '',
          });

          for (const img of imagesToSend) {
            contentParts.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: img.mediaType,
                data: img.base64,
              },
            });
          }

          messageContent = contentParts;
        } else {
          messageContent = messageText;
        }

        const payload = {
          messages: [{ role: 'user', content: messageContent }],
          use_assistant_message: true,
          stream_tokens: true,
        };

        await lettaApi.sendMessageStream(
          coAgent.id,
          payload,
          (chunk: StreamingChunk) => {
            handleStreamingChunk(chunk);
          },
          async (response) => {
            console.log('🎬 STREAM COMPLETE');

            // Finalize the last message
            chatStore.finalizeCurrentMessage();

            // Get all completed messages
            const { currentStreamingMessage, completedStreamingMessages } = useChatStore.getState();

            const allStreamedMessages = [...completedStreamingMessages];
            if (currentStreamingMessage) {
              allStreamedMessages.push(currentStreamingMessage);
            }

            console.log('📨 Converting', allStreamedMessages.length, 'streamed messages to permanent messages');

            // Convert to LettaMessage format and add to messages
            const permanentMessages: LettaMessage[] = allStreamedMessages.map((msg, idx) => {
              // Format tool call content as Python-style string (like server does)
              let content = msg.content;
              if (msg.type === 'tool_call' && msg.toolCallName) {
                const { formatToolCall } = require('../utils/formatToolCall');
                content = formatToolCall(msg.toolCallName, msg.content);
              }

              return {
                id: msg.id,
                role: 'assistant',
                message_type: msg.type === 'tool_call' ? 'tool_call_message' : 'assistant_message',
                content: content,
                reasoning: msg.reasoning,
                ...(msg.type === 'tool_call' && msg.toolCallName ? {
                  tool_calls: [{
                    name: msg.toolCallName,
                    arguments: msg.content, // Keep as JSON for parseToolCall fallback
                  }]
                } : {}),
                created_at: msg.timestamp,
              } as any;
            });

            // Add to messages array
            if (permanentMessages.length > 0) {
              chatStore.addMessages(permanentMessages);
            }

            // Clear streaming state
            chatStore.clearAllStreamingState();
            chatStore.stopStreaming();
            chatStore.setSendingMessage(false);
            chatStore.clearImages();

            console.log('✅ Stream finished and converted to messages');
          },
          (error) => {
            console.error('Stream error:', error);
            chatStore.clearAllStreamingState();
            chatStore.stopStreaming();
            chatStore.setSendingMessage(false);
          }
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        chatStore.clearAllStreamingState();
        chatStore.stopStreaming();
        chatStore.setSendingMessage(false);
        throw error;
      }
    },
    [coAgent, chatStore, handleStreamingChunk]
  );

  return {
    isStreaming: chatStore.isStreaming,
    isSendingMessage: chatStore.isSendingMessage,
    sendMessage,
  };
}
