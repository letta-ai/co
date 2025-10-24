/**
 * MessageGroupBubble Component
 *
 * Unified renderer for MessageGroup objects from useMessageGroups hook.
 * Replaces the fragmented rendering logic from MessageBubbleEnhanced.
 *
 * Single component that handles all message types:
 * - user: User messages with optional images
 * - assistant: Assistant messages with optional reasoning
 * - tool_call: Tool call + return with optional reasoning
 * - tool_return_orphaned: Orphaned tool return (defensive case)
 * - compaction: Memory compaction alerts
 *
 * Features unified message headers with dynamic labels:
 * - "(co said)" / "(co is saying)" for assistant messages
 * - "(co thought)" / "(co is thinking)" for reasoning-only messages
 * - "(co searched the web)" / "(co is searching the web)" for tool calls
 * - Inline reasoning toggle button (chevron) instead of separate row
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MessageGroup } from '../hooks/useMessageGroups';
import type { Theme } from '../theme';

// Import sub-components (reused from existing architecture)
import ToolCallItem from './ToolCallItem';
import ExpandableMessageContent from './ExpandableMessageContent';
import CompactionBar from './CompactionBar';
import OrphanedToolReturn from './OrphanedToolReturn';
import InlineReasoningButton from './InlineReasoningButton';
import { getMessageLabel } from '../utils/messageLabels';

interface MessageGroupBubbleProps {
  group: MessageGroup;
  theme: Theme;
  colorScheme: 'light' | 'dark';

  // Interaction state (keyed by group.id)
  expandedReasoning: Set<string>;
  expandedCompaction: Set<string>;
  expandedToolReturns: Set<string>;
  copiedMessageId: string | null;
  showCompaction: boolean;
  showToolResults?: boolean;

  // Interaction handlers
  toggleReasoning: (groupId: string) => void;
  toggleCompaction: (groupId: string) => void;
  toggleToolReturn: (groupId: string) => void;
  copyToClipboard: (content: string, groupId: string) => void;

  // Layout props
  lastMessageNeedsSpace?: boolean;
  containerHeight?: number;
}

export const MessageGroupBubble: React.FC<MessageGroupBubbleProps> = ({
  group,
  theme,
  colorScheme,
  expandedReasoning,
  expandedCompaction,
  expandedToolReturns,
  copiedMessageId,
  showCompaction,
  showToolResults = false,
  toggleReasoning,
  toggleCompaction,
  toggleToolReturn,
  copyToClipboard,
  lastMessageNeedsSpace = false,
  containerHeight = 0,
}) => {
  const isDark = colorScheme === 'dark';

  // ========================================
  // COMPACTION MESSAGE
  // ========================================
  if (group.type === 'compaction') {
    // Hide if user disabled compaction in settings
    if (!showCompaction) {
      return null;
    }

    const isExpanded = expandedCompaction.has(group.id);
    return (
      <CompactionBar
        message={group.compactionMessage || group.content}
        messageId={group.id}
        isExpanded={isExpanded}
        onToggle={() => toggleCompaction(group.id)}
        theme={theme}
      />
    );
  }

  // ========================================
  // ORPHANED TOOL RETURN
  // ========================================
  if (group.type === 'tool_return_orphaned') {
    const isExpanded = expandedToolReturns.has(group.id);
    return (
      <View style={styles.messageContainer}>
        <OrphanedToolReturn
          content={group.content}
          messageId={group.id}
          isExpanded={isExpanded}
          onToggle={() => toggleToolReturn(group.id)}
          theme={theme}
          isDark={isDark}
        />
      </View>
    );
  }

  // ========================================
  // TOOL CALL MESSAGE
  // ========================================
  // Unified label architecture:
  // - ONE label at top: "(co updated memory)" with chevron
  // - Label chevron controls ALL content (reasoning + tool call + result)
  // - Everything collapsed by default
  //
  // This prevents duplicate labels when both reasoning and tool call are present.
  if (group.type === 'tool_call') {
    const isExpanded = expandedReasoning.has(group.id);
    const label = getMessageLabel(group);
    const [showToolDetails, setShowToolDetails] = React.useState(false);

    return (
      <View style={styles.messageContainer}>
        {/* Unified header: label + chevron for everything */}
        <View style={styles.messageHeader}>
          <Text style={[styles.messageLabel, { color: theme.colors.text.primary }]}>
            {label}
          </Text>
          <View style={styles.headerButtons}>
            {/* Tool details button */}
            <TouchableOpacity
              onPress={() => setShowToolDetails(!showToolDetails)}
              style={styles.toolDetailsButton}
              activeOpacity={0.7}
            >
              <Ionicons
                name="information-circle-outline"
                size={16}
                color={theme.colors.text.tertiary}
              />
            </TouchableOpacity>
            <InlineReasoningButton
              isExpanded={isExpanded}
              onToggle={() => toggleReasoning(group.id)}
              isDark={isDark}
            />
          </View>
        </View>

        {/* Expanded content - only show when chevron is clicked */}
        {isExpanded && (
          <>
            {/* Reasoning content */}
            {group.reasoning && (
              <View
                style={[
                  styles.reasoningExpandedContainer,
                  {
                    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                    borderLeftColor: theme.colors.border.primary,
                  },
                ]}
              >
                <Text style={[styles.reasoningExpandedText, { color: theme.colors.text.primary }]}>
                  {group.reasoning}
                </Text>
              </View>
            )}

            {/* Tool call + return */}
            <ToolCallItem
              callText={group.toolCall?.args || group.content}
              resultText={group.toolReturn}
              hasResult={!!group.toolReturn}
              showResult={showToolResults}
              showToolDetails={showToolDetails}
              isDark={isDark}
              hideHeader={true} // Label already shown in unified header above
            />
          </>
        )}
      </View>
    );
  }

  // ========================================
  // USER MESSAGE
  // ========================================
  if (group.type === 'user') {
    // Skip if no content
    if (!group.content.trim() && (!group.images || group.images.length === 0)) {
      return null;
    }

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
          {group.images && group.images.length > 0 && (
            <View style={styles.messageImagesContainer}>
              {group.images.map((img: any, idx: number) => {
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
          {group.content.trim().length > 0 && (
            <ExpandableMessageContent
              content={group.content}
              isUser={true}
              isDark={isDark}
              lineLimit={3}
            />
          )}
        </View>
      </View>
    );
  }

  // ========================================
  // ASSISTANT MESSAGE
  // ========================================
  if (group.type === 'assistant') {
    const isReasoningExpanded = expandedReasoning.has(group.id);
    const label = getMessageLabel(group);

    // Determine if this is the last message (for spacing)
    const shouldHaveMinHeight = lastMessageNeedsSpace;

    return (
      <View
        style={[
          styles.assistantFullWidthContainer,
          shouldHaveMinHeight && { minHeight: Math.max(containerHeight * 0.9, 450) },
          group.isStreaming && styles.streamingPulse,
        ]}
      >
        {/* Unified header: label + optional reasoning button */}
        <View style={styles.messageHeader}>
          <Text style={[styles.messageLabel, { color: theme.colors.text.primary }]}>
            {label}
          </Text>
          {group.reasoning && (
            <InlineReasoningButton
              isExpanded={isReasoningExpanded}
              onToggle={() => toggleReasoning(group.id)}
              isDark={isDark}
            />
          )}
        </View>

        {/* Expanded reasoning content */}
        {group.reasoning && isReasoningExpanded && (
          <View
            style={[
              styles.reasoningExpandedContainer,
              {
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
                borderLeftColor: theme.colors.border.primary,
              },
            ]}
          >
            <Text style={[styles.reasoningExpandedText, { color: theme.colors.text.primary }]}>
              {group.reasoning}
            </Text>
          </View>
        )}

        {/* Message content with copy button */}
        <View style={{ position: 'relative' }}>
          <ExpandableMessageContent
            content={group.content}
            isUser={false}
            isDark={isDark}
            lineLimit={20}
          />

          {/* Copy button (absolute positioned overlay) */}
          <View style={styles.copyButtonContainer}>
            <TouchableOpacity
              onPress={() => copyToClipboard(group.content, group.id)}
              style={styles.copyButton}
              activeOpacity={0.7}
              testID="copy-button"
            >
              <Ionicons
                name={copiedMessageId === group.id ? 'checkmark-outline' : 'copy-outline'}
                size={16}
                color={
                  copiedMessageId === group.id
                    ? theme.colors.interactive.primary
                    : theme.colors.text.tertiary
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // Unknown type - should never happen
  return null;
};

const styles = StyleSheet.create({
  messageContainer: {
    marginVertical: 8,
    paddingHorizontal: 18,
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
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
    maxWidth: 700,
    alignSelf: 'center',
  },
  // Unified message header (label + reasoning button)
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toolDetailsButton: {
    padding: 8,
    opacity: 0.3,
    borderRadius: 4,
  },
  messageLabel: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
    flex: 1,
  },
  // Reasoning expanded content (from ReasoningToggle)
  reasoningExpandedContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingLeft: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  reasoningExpandedText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 20,
    fontStyle: 'normal',
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
  streamingPulse: {
    // Optional: Add subtle pulse animation for streaming messages
    opacity: 0.95,
  },
});

export default MessageGroupBubble;
