import { useCallback } from 'react';
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

  // Handle individual streaming chunks
  const handleStreamingChunk = useCallback((chunk: StreamingChunk) => {
    console.log('Streaming chunk:', chunk.message_type, 'content:', chunk.content);

    // Handle error chunks
    if ((chunk as any).error) {
      console.error('Error chunk received:', (chunk as any).error);
      chatStore.stopStreaming();
      chatStore.setSendingMessage(false);
      chatStore.clearStream();
      return;
    }

    // Handle stop_reason chunks
    if ((chunk as any).message_type === 'stop_reason') {
      console.log('Stop reason received:', (chunk as any).stopReason || (chunk as any).stop_reason);
      return;
    }

    // Process reasoning messages
    if (chunk.message_type === 'reasoning_message' && chunk.reasoning) {
      chatStore.updateStreamReasoning(chunk.reasoning);
    }

    // Process tool call messages
    else if ((chunk.message_type === 'tool_call_message' || chunk.message_type === 'tool_call') && chunk.tool_call) {
      const callObj = chunk.tool_call.function || chunk.tool_call;
      const toolName = callObj?.name || callObj?.tool_name || 'tool';
      const args = callObj?.arguments || callObj?.args || {};
      const toolCallId = chunk.id || `tool_${toolName}_${Date.now()}`;

      const formatArgsPython = (obj: any): string => {
        if (!obj || typeof obj !== 'object') return '';
        return Object.entries(obj)
          .map(([k, v]) => `${k}=${typeof v === 'string' ? `"${v}"` : JSON.stringify(v)}`)
          .join(', ');
      };

      const toolLine = `${toolName}(${formatArgsPython(args)})`;
      chatStore.addStreamToolCall({ id: toolCallId, name: toolName, args: toolLine });
    }

    // Process assistant messages
    else if (chunk.message_type === 'assistant_message' && chunk.content) {
      let contentText = '';
      const content = chunk.content as any;

      if (typeof content === 'string') {
        contentText = content;
      } else if (typeof content === 'object' && content !== null) {
        if (Array.isArray(content)) {
          contentText = content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text || '')
            .join('');
        } else if (content.text) {
          contentText = content.text;
        }
      }

      if (contentText) {
        chatStore.updateStreamAssistant(contentText);
      }
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

        // Add images
        for (const img of imagesToSend) {
          contentParts.push({
            type: 'image',
            source: {
              type: 'base64',
              mediaType: img.mediaType,
              data: img.base64,
            },
          });
        }

        // Add text if present
        if (messageText && typeof messageText === 'string' && messageText.length > 0) {
          contentParts.push({
            type: 'text',
            text: messageText,
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

        // Build message content
        let messageContent: any;
        if (imagesToSend.length > 0) {
          const contentParts = [];

          for (const img of imagesToSend) {
            contentParts.push({
              type: 'image',
              source: {
                type: 'base64',
                mediaType: img.mediaType,
                data: img.base64,
              },
            });
          }

          if (messageText && typeof messageText === 'string' && messageText.length > 0) {
            contentParts.push({
              type: 'text',
              text: messageText,
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
            console.log('Stream complete - refreshing messages from server');

            // Wait for server to finalize, then refresh messages
            setTimeout(async () => {
              try {
                const currentCount = chatStore.messages.filter((msg) => !msg.id.startsWith('temp-')).length;
                const fetchLimit = Math.max(currentCount + 10, 100);

                const recentMessages = await lettaApi.listMessages(coAgent.id, {
                  limit: fetchLimit,
                  use_assistant_message: true,
                });

                console.log('Received', recentMessages.length, 'messages from server after stream');

                // Replace all messages with server version
                chatStore.setMessages(recentMessages);
              } catch (error) {
                console.error('Failed to refresh messages after stream:', error);
              } finally {
                chatStore.stopStreaming();
                chatStore.setSendingMessage(false);
                chatStore.clearStream();
                chatStore.clearImages();
              }
            }, 500);
          },
          (error) => {
            console.error('Stream error:', error);
            chatStore.stopStreaming();
            chatStore.setSendingMessage(false);
            chatStore.clearStream();
          }
        );
      } catch (error) {
        console.error('Failed to send message:', error);
        chatStore.stopStreaming();
        chatStore.setSendingMessage(false);
        chatStore.clearStream();
        throw error;
      }
    },
    [coAgent, chatStore, handleStreamingChunk]
  );

  return {
    isStreaming: chatStore.isStreaming,
    isSendingMessage: chatStore.isSendingMessage,
    currentStream: chatStore.currentStream,
    sendMessage,
  };
}
