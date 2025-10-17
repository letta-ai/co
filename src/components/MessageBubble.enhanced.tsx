/**
 * Enhanced MessageBubble Component
 *
 * Complete message rendering with all features from the original app:
 * - Reasoning messages (expandable)
 * - Tool calls with paired tool returns
 * - Orphaned tool returns
 * - Compaction bars
 * - User messages with images
 * - Assistant messages with copy button
 * - Expandable content
 *
 * This replaces MessageBubble.v2 with full feature parity.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LettaMessage } from '../types/letta';
import type { Theme } from '../theme';

// Import sub-components
import ReasoningToggle from './ReasoningToggle';
import ToolCallItem from './ToolCallItem';
import MessageContent from './MessageContent';
import ExpandableMessageContent from './ExpandableMessageContent';
import CompactionBar from './CompactionBar';
import OrphanedToolReturn from './OrphanedToolReturn';

interface MessageBubbleEnhancedProps {
  message: LettaMessage;
  displayMessages: LettaMessage[]; // Needed for tool call/return pairing
  theme: Theme;
  colorScheme: 'light' | 'dark';

  // Interaction state
  expandedReasoning: Set<string>;
  expandedCompaction: Set<string>;
  expandedToolReturns: Set<string>;
  copiedMessageId: string | null;
  showCompaction: boolean;

  // Interaction handlers
  toggleReasoning: (messageId: string) => void;
  toggleCompaction: (messageId: string) => void;
  toggleToolReturn: (messageId: string) => void;
  copyToClipboard: (content: string, messageId: string) => void;

  // Layout props
  lastMessageNeedsSpace?: boolean;
  containerHeight?: number;
}

export const MessageBubbleEnhanced: React.FC<MessageBubbleEnhancedProps> = ({
  message,
  displayMessages,
  theme,
  colorScheme,
  expandedReasoning,
  expandedCompaction,
  expandedToolReturns,
  copiedMessageId,
  showCompaction,
  toggleReasoning,
  toggleCompaction,
  toggleToolReturn,
  copyToClipboard,
  lastMessageNeedsSpace = false,
  containerHeight = 0,
}) => {
  const isDark = colorScheme === 'dark';
  const msg = message;

  // Determine message type
  const isUser = msg.message_type === 'user_message';
  const isSystem = msg.message_type === 'system_message';
  const isToolCall = msg.message_type === 'tool_call_message';
  const isToolReturn = msg.message_type === 'tool_return_message';
  const isAssistant = msg.message_type === 'assistant_message';
  const isReasoning = msg.message_type === 'reasoning_message';

  // Filter out system messages
  if (isSystem) return null;

  // ====================
  // REASONING MESSAGE
  // ====================
  if (isReasoning) {
    const isExpanded = expandedReasoning.has(msg.id);
    return (
      <View style={styles.messageContainer}>
        <ReasoningToggle
          reasoning={msg.reasoning || ''}
          messageId={msg.id}
          isExpanded={isExpanded}
          onToggle={() => toggleReasoning(msg.id)}
          isDark={isDark}
        />
      </View>
    );
  }

  // ====================
  // TOOL CALL MESSAGE
  // ====================
  if (isToolCall) {
    // Find the corresponding tool return (next message in the list)
    const msgIndex = displayMessages.findIndex((m) => m.id === msg.id);
    const nextMsg =
      msgIndex >= 0 && msgIndex < displayMessages.length - 1
        ? displayMessages[msgIndex + 1]
        : null;
    const toolReturn =
      nextMsg && nextMsg.message_type === 'tool_return_message' ? nextMsg : null;

    return (
      <View style={styles.messageContainer}>
        <ToolCallItem
          callText={msg.content}
          resultText={toolReturn?.content}
          reasoning={msg.reasoning}
          hasResult={!!toolReturn}
          isDark={isDark}
        />
      </View>
    );
  }

  // ====================
  // TOOL RETURN MESSAGE (Orphaned)
  // ====================
  if (isToolReturn) {
    // Check if previous message is a tool call
    const msgIndex = displayMessages.findIndex((m) => m.id === msg.id);
    const prevMsg = msgIndex > 0 ? displayMessages[msgIndex - 1] : null;
    if (prevMsg && prevMsg.message_type === 'tool_call_message') {
      return null; // Already rendered with the tool call
    }

    // Orphaned tool return - render it standalone
    const isExpanded = expandedToolReturns.has(msg.id);
    return (
      <View style={styles.messageContainer}>
        <OrphanedToolReturn
          content={msg.content}
          messageId={msg.id}
          isExpanded={isExpanded}
          onToggle={() => toggleToolReturn(msg.id)}
          theme={theme}
          isDark={isDark}
        />
      </View>
    );
  }

  // ====================
  // USER MESSAGE
  // ====================
  if (isUser) {
    // Check if this is a compaction alert
    let isCompactionAlert = false;
    let compactionMessage = '';

    try {
      const parsed = JSON.parse(msg.content);
      if (parsed?.type === 'system_alert') {
        isCompactionAlert = true;

        // Extract the message field from the embedded JSON
        const messageText = parsed.message || '';

        // Try to extract JSON from the message (usually in a code block)
        const jsonMatch = messageText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          try {
            const innerJson = JSON.parse(jsonMatch[1]);
            compactionMessage = innerJson.message || messageText;
          } catch {
            compactionMessage = messageText;
          }
        } else {
          compactionMessage = messageText;
        }

        // Strip out the "Note: prior messages..." preamble
        compactionMessage = compactionMessage.replace(
          /^Note: prior messages have been hidden from view.*?The following is a summary of the previous messages:\s*/is,
          ''
        );
      }
    } catch {
      // Not JSON, treat as normal user message
    }

    // Render compaction bar
    if (isCompactionAlert) {
      // Hide compaction if user has disabled it in settings
      if (!showCompaction) {
        return null;
      }

      const isExpanded = expandedCompaction.has(msg.id);
      return (
        <CompactionBar
          message={compactionMessage}
          messageId={msg.id}
          isExpanded={isExpanded}
          onToggle={() => toggleCompaction(msg.id)}
          theme={theme}
        />
      );
    }

    // Parse message content to check for multipart (images)
    let textContent: string = '';
    let imageContent: Array<{
      type: string;
      source: { type: string; data: string; mediaType?: string; media_type?: string; url?: string };
    }> = [];

    if (typeof msg.content === 'object' && Array.isArray(msg.content)) {
      // Multipart message with images
      const contentArray = msg.content as any[];
      imageContent = contentArray.filter((item: any) => item.type === 'image');
      const textParts = contentArray.filter((item: any) => item.type === 'text');
      textContent = textParts
        .map((item: any) => item.text || '')
        .filter((t: string) => t)
        .join('\n');
    } else if (typeof msg.content === 'string') {
      textContent = msg.content;
    } else {
      // Fallback: convert to string
      textContent = String(msg.content || '');
    }

    // Skip rendering if no content at all
    if (!textContent.trim() && imageContent.length === 0) {
      return null;
    }

    // Render user message bubble
    return (
      <View style={[styles.messageContainer, styles.userMessageContainer]}>
        <View
          style={[
            styles.messageBubble,
            styles.userBubble,
            {
              backgroundColor: isDark ? '#FFFFFF' : '#000000',
            },
          ]}
        >
          {/* Display images */}
          {imageContent.length > 0 && (
            <View style={styles.messageImagesContainer}>
              {imageContent.map((img: any, idx: number) => {
                const uri =
                  img.source.type === 'url'
                    ? img.source.url
                    : `data:${img.source.media_type || img.source.mediaType};base64,${img.source.data}`;

                return (
                  <Image key={idx} source={{ uri }} style={styles.messageImage} />
                );
              })}
            </View>
          )}

          {/* Display text content */}
          {textContent.trim().length > 0 && (
            <ExpandableMessageContent
              content={textContent}
              isUser={isUser}
              isDark={isDark}
              lineLimit={3}
            />
          )}
        </View>
      </View>
    );
  }

  // ====================
  // ASSISTANT MESSAGE
  // ====================
  const isReasoningExpanded = expandedReasoning.has(msg.id);
  const isLastMessage = displayMessages[displayMessages.length - 1]?.id === msg.id;
  const shouldHaveMinHeight = isLastMessage && lastMessageNeedsSpace;

  return (
    <View
      style={[
        styles.assistantFullWidthContainer,
        shouldHaveMinHeight && { minHeight: Math.max(containerHeight * 0.9, 450) },
      ]}
    >
      {/* Reasoning toggle */}
      {msg.reasoning && (
        <ReasoningToggle
          reasoning={msg.reasoning}
          messageId={msg.id}
          isExpanded={isReasoningExpanded}
          onToggle={() => toggleReasoning(msg.id)}
          isDark={isDark}
        />
      )}

      {/* "(co said)" label */}
      <Text style={[styles.assistantLabel, { color: theme.colors.text.primary }]}>
        (co said)
      </Text>

      {/* Message content with copy button */}
      <View style={{ position: 'relative' }}>
        <ExpandableMessageContent
          content={msg.content}
          isUser={false}
          isDark={isDark}
          lineLimit={20}
        />

        {/* Copy button (absolute positioned overlay) */}
        <View style={styles.copyButtonContainer}>
          <TouchableOpacity
            onPress={() => copyToClipboard(msg.content, msg.id)}
            style={styles.copyButton}
            activeOpacity={0.7}
            testID="copy-button"
          >
            <Ionicons
              name={copiedMessageId === msg.id ? 'checkmark-outline' : 'copy-outline'}
              size={16}
              color={
                copiedMessageId === msg.id
                  ? theme.colors.interactive.primary
                  : theme.colors.text.tertiary
              }
            />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 8,
    paddingHorizontal: 18,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    borderBottomRightRadius: 6,
    ...Platform.select({
      web: {
        // @ts-ignore - web-only
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  messageImagesContainer: {
    marginBottom: 8,
  },
  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginBottom: 8,
  },
  assistantFullWidthContainer: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
  },
  assistantLabel: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
    marginBottom: 8,
  },
  copyButtonContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    zIndex: 10,
  },
  copyButton: {
    padding: 8,
    opacity: 0.3,
    borderRadius: 4,
  },
});

export default MessageBubbleEnhanced;
