import React, { useRef, useState } from 'react';
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

import MessageBubbleEnhanced from '../components/MessageBubble.enhanced';
import MessageInputEnhanced from '../components/MessageInputEnhanced';

interface ChatScreenProps {
  theme: any;
  colorScheme: 'light' | 'dark';
  showCompaction?: boolean;
}

export function ChatScreen({ theme, colorScheme, showCompaction = true }: ChatScreenProps) {
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
  } = useMessageInteractions();

  // Scroll management
  const { scrollViewRef, scrollToBottom, onContentSizeChange } = useScrollToBottom({
    scrollOnMount: true,
    delay: 150,
    animated: false,
  });

  // Filter and sort messages for display
  const displayMessages = React.useMemo(() => {
    // Sort messages chronologically
    const sorted = [...messages].sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeA - timeB;
    });

    // Filter out system messages and login/heartbeat messages
    return sorted.filter(msg => {
      if (msg.message_type === 'system_message') return false;

      if (msg.message_type === 'user_message' && msg.content) {
        try {
          const contentStr = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
          const parsed = JSON.parse(contentStr);
          if (parsed?.type === 'login' || parsed?.type === 'heartbeat') {
            return false;
          }
        } catch {
          // Not JSON, keep the message
        }
      }

      return true;
    });
  }, [messages]);

  // Chat store for images
  const selectedImages = useChatStore((state) => state.selectedImages);
  const addImage = useChatStore((state) => state.addImage);
  const removeImage = useChatStore((state) => state.removeImage);
  const lastMessageNeedsSpace = useChatStore((state) => state.lastMessageNeedsSpace);

  // Animation refs and layout
  const spacerHeightAnim = useRef(new Animated.Value(0)).current;
  const [containerHeight, setContainerHeight] = React.useState(0);

  // Handle send message
  const handleSend = async (text: string) => {
    await sendMessage(text, selectedImages);
    scrollToBottom(true); // Animate scroll when sending
  };

  // Render message item
  const renderMessage = ({ item }: { item: any }) => (
    <MessageBubbleEnhanced
      message={item}
      displayMessages={displayMessages}
      theme={theme}
      colorScheme={colorScheme}
      expandedReasoning={expandedReasoning}
      expandedCompaction={expandedCompaction}
      expandedToolReturns={expandedToolReturns}
      copiedMessageId={copiedMessageId}
      showCompaction={showCompaction}
      toggleReasoning={toggleReasoning}
      toggleCompaction={toggleCompaction}
      toggleToolReturn={toggleToolReturn}
      copyToClipboard={copyToClipboard}
      lastMessageNeedsSpace={lastMessageNeedsSpace}
      containerHeight={containerHeight}
    />
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
    >
      {/* Messages List */}
      <FlatList
        ref={scrollViewRef}
        data={displayMessages}
        renderItem={renderMessage}
        keyExtractor={(item) => `${item.id}-${item.message_type}`}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: insets.bottom + 80 },
        ]}
        onContentSizeChange={onContentSizeChange}
        onEndReached={loadMoreMessages}
        onEndReachedThreshold={0.5}
        initialNumToRender={100}
        maxToRenderPerBatch={20}
        windowSize={21}
        removeClippedSubviews={Platform.OS === 'android'}
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 10,
        }}
      />

      {/* Spacer for animation */}
      {lastMessageNeedsSpace && <Animated.View style={{ height: spacerHeightAnim }} />}

      {/* Message Input - Enhanced with rainbow animations */}
      <MessageInputEnhanced
        onSend={handleSend}
        isSendingMessage={isSendingMessage || isLoadingMessages}
        theme={theme}
        colorScheme={colorScheme}
        hasMessages={displayMessages.length > 0}
        isStreaming={isStreaming}
        hasExpandedReasoning={expandedReasoning.size > 0}
        selectedImages={selectedImages}
        onAddImage={addImage}
        onRemoveImage={removeImage}
        disabled={isSendingMessage || isLoadingMessages}
      />
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
