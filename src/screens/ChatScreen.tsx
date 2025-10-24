import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMessages } from '../hooks/useMessages';
import { useMessageStream } from '../hooks/useMessageStream';
import { useChatStore } from '../stores/chatStore';
import { useMessageInteractions } from '../hooks/useMessageInteractions';
import { useScrollToBottom } from '../hooks/useScrollToBottom';
import { useMessageGroups } from '../hooks/useMessageGroups';

import MessageGroupBubble from '../components/MessageGroupBubble';
import MessageInputEnhanced from '../components/MessageInputEnhanced';

interface ChatScreenProps {
  theme: any;
  colorScheme: 'light' | 'dark';
  showCompaction?: boolean;
  showToolResults?: boolean;
}

export function ChatScreen({ theme, colorScheme, showCompaction = true, showToolResults = false }: ChatScreenProps) {
  const insets = useSafeAreaInsets();

  // Hooks
  const { messages, isLoadingMessages, loadMoreMessages, hasMoreBefore, isLoadingMore } = useMessages();
  const { isStreaming, isSendingMessage, sendMessage } = useMessageStream();
  const {
    expandedReasoning,
    expandedCompaction,
    expandedToolReturns,
    copiedMessageId,
    toggleReasoning,
    toggleCompaction,
    toggleToolReturn,
    copyToClipboard,
    expandReasoning,
  } = useMessageInteractions();

  // Scroll management
  const { scrollViewRef, scrollToBottom, onContentSizeChange, onScroll } = useScrollToBottom({
    scrollOnMount: true,
    delay: 150,
  });

  // Chat store for images and streaming state
  const selectedImages = useChatStore((state) => state.selectedImages);
  const addImage = useChatStore((state) => state.addImage);
  const removeImage = useChatStore((state) => state.removeImage);
  const lastMessageNeedsSpace = useChatStore((state) => state.lastMessageNeedsSpace);
  const currentStreamingMessage = useChatStore((state) => state.currentStreamingMessage);
  const completedStreamingMessages = useChatStore((state) => state.completedStreamingMessages);

  /**
   * Transform raw Letta messages into unified MessageGroup objects.
   *
   * This groups messages by ID (reasoning + assistant → single group),
   * pairs tool calls with returns, and appends streaming messages.
   *
   * Each MessageGroup has a unique groupKey for FlatList rendering.
   */
  const messageGroups = useMessageGroups({
    messages,
    isStreaming,
    currentStreamingMessage,
    completedStreamingMessages,
  });

  // Animation refs and layout
  const spacerHeightAnim = useRef(new Animated.Value(0)).current;
  const [containerHeight, setContainerHeight] = React.useState(0);

  // Auto-expand reasoning blocks when message groups change
  useEffect(() => {
    messageGroups.forEach((group) => {
      // Auto-expand any message with reasoning
      if (group.reasoning && group.reasoning.trim()) {
        expandReasoning(group.id);
      }
    });
  }, [messageGroups, expandReasoning]);

  // Handle send message - no auto-scroll
  const handleSend = async (text: string) => {
    await sendMessage(text, selectedImages);
  };

  // Render message group
  const renderMessageGroup = ({ item, index }: { item: any; index: number }) => {
    // Determine if this is the last group (for spacing)
    const isLastGroup = index === messageGroups.length - 1;

    return (
      <MessageGroupBubble
        group={item}
        theme={theme}
        colorScheme={colorScheme}
        expandedReasoning={expandedReasoning}
        expandedCompaction={expandedCompaction}
        expandedToolReturns={expandedToolReturns}
        copiedMessageId={copiedMessageId}
        showCompaction={showCompaction}
        showToolResults={showToolResults}
        toggleReasoning={toggleReasoning}
        toggleCompaction={toggleCompaction}
        toggleToolReturn={toggleToolReturn}
        copyToClipboard={copyToClipboard}
        lastMessageNeedsSpace={isLastGroup && lastMessageNeedsSpace}
        containerHeight={containerHeight}
      />
    );
  };

  const isEmpty = messageGroups.length === 0 && !isLoadingMessages;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {!isEmpty && (
        <>
          {/* Messages List */}
          <FlatList
            ref={scrollViewRef}
            data={messageGroups}
            renderItem={renderMessageGroup}
            keyExtractor={(group) => group.groupKey}
            contentContainerStyle={[
              styles.messagesList,
              { paddingBottom: insets.bottom + 80 },
            ]}
            onContentSizeChange={onContentSizeChange}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onEndReached={loadMoreMessages}
            onEndReachedThreshold={0.5}
            initialNumToRender={100}
            maxToRenderPerBatch={20}
            windowSize={21}
            removeClippedSubviews={Platform.OS === 'android'}
          />

          {/* Spacer for animation */}
          {lastMessageNeedsSpace && <Animated.View style={{ height: spacerHeightAnim }} />}
        </>
      )}

      {/* Message Input - Centered when empty, at bottom when has messages */}
      <View style={isEmpty ? styles.centeredInputContainer : styles.inputWrapper}>
        <MessageInputEnhanced
          onSend={handleSend}
          isSendingMessage={isSendingMessage || isLoadingMessages}
          theme={theme}
          colorScheme={colorScheme}
          hasMessages={messageGroups.length > 0}
          isLoadingMessages={isLoadingMessages}
          isStreaming={isStreaming}
          hasExpandedReasoning={expandedReasoning.size > 0}
          selectedImages={selectedImages}
          onAddImage={addImage}
          onRemoveImage={removeImage}
          disabled={isSendingMessage || isLoadingMessages}
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    paddingTop: 16,
    paddingBottom: 16,
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
  },
  centeredInputContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  inputWrapper: {
    // Wrapper for when messages exist (no special styling needed)
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.OS === 'ios' ? 24 : 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
});
