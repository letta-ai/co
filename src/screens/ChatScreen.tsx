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

import MessageBubble from '../components/MessageBubble';
import MessageInputV2 from '../components/MessageInput.v2';
import LiveStatusIndicator from '../components/LiveStatusIndicator';

interface ChatScreenProps {
  theme: any;
}

export function ChatScreen({ theme }: ChatScreenProps) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<FlatList<any>>(null);

  // Hooks
  const { messages, isLoadingMessages, loadMoreMessages, hasMoreBefore, isLoadingMore } = useMessages();
  const { isStreaming, isSendingMessage, currentStream, completedStreamBlocks, sendMessage } = useMessageStream();

  // Chat store for images
  const selectedImages = useChatStore((state) => state.selectedImages);
  const addImage = useChatStore((state) => state.addImage);
  const removeImage = useChatStore((state) => state.removeImage);
  const lastMessageNeedsSpace = useChatStore((state) => state.lastMessageNeedsSpace);

  // Animation refs
  const spacerHeightAnim = useRef(new Animated.Value(0)).current;

  // Scroll to bottom
  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  // Handle send message
  const handleSend = async (text: string) => {
    await sendMessage(text, selectedImages);
    scrollToBottom();
  };

  // Render message item
  const renderMessage = ({ item }: { item: any }) => (
    <MessageBubble message={item} theme={theme} />
  );

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* Messages List */}
      <FlatList
        ref={scrollViewRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesList,
          { paddingBottom: insets.bottom + 80 },
        ]}
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

      {/* Streaming Indicator */}
      {isStreaming && (
        <LiveStatusIndicator
          currentStream={currentStream}
          completedStreamBlocks={completedStreamBlocks}
          theme={theme}
        />
      )}

      {/* Spacer for animation */}
      {lastMessageNeedsSpace && (
        <Animated.View style={{ height: spacerHeightAnim }} />
      )}

      {/* Message Input */}
      <View
        style={[
          styles.inputContainer,
          { backgroundColor: theme.colors.background.secondary },
        ]}
      >
        <MessageInputV2
          onSend={handleSend}
          disabled={isSendingMessage || isLoadingMessages}
          theme={theme}
          selectedImages={selectedImages}
          onAddImage={addImage}
          onRemoveImage={removeImage}
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
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
});
