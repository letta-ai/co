import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useMessages } from '../hooks/useMessages';
import { useMessageStream } from '../hooks/useMessageStream';
import { useChatStore } from '../stores/chatStore';
import { useAgentStore } from '../stores/agentStore';
import { useMessageInteractions } from '../hooks/useMessageInteractions';
import { useScrollToBottom } from '../hooks/useScrollToBottom';
import { useMessageGroups } from '../hooks/useMessageGroups';

import MessageGroupBubble from '../components/MessageGroupBubble';
import MessageInputEnhanced from '../components/MessageInputEnhanced';
import lettaApi from '../api/lettaApi';
import { Storage, STORAGE_KEYS } from '../utils/storage';

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
  const coAgent = useAgentStore((state) => state.coAgent);
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
  const streamError = useChatStore((state) => state.streamError);
  const clearStreamError = useChatStore((state) => state.clearStreamError);

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

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!coAgent) {
      throw new Error('Agent not initialized');
    }

    // Get or create the co-app folder
    let folderId = await Storage.getItem(STORAGE_KEYS.CO_FOLDER_ID);

    if (!folderId) {
      const folders = await lettaApi.listFolders({ name: 'co-app' });

      if (folders.length > 0) {
        folderId = folders[0].id;
      } else {
        const folder = await lettaApi.createFolder('co-app', 'Files shared with co agent');
        folderId = folder.id;
      }

      await Storage.setItem(STORAGE_KEYS.CO_FOLDER_ID, folderId);
    }

    await lettaApi.uploadFileToFolder(folderId, file, 'replace');

    // Attach folder to agent if not already attached
    try {
      await lettaApi.attachFolderToAgent(coAgent.id, folderId);
    } catch (error: any) {
      // If already attached, that's fine
      if (!error.message?.includes('already attached') && error.status !== 409) {
        throw error;
      }
    }
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
      {/* Error Banner */}
      {streamError && (
        <View style={[styles.errorBanner, { backgroundColor: theme.colors.error || '#dc2626' }]}>
          <Text style={styles.errorText}>{streamError}</Text>
          <TouchableOpacity onPress={clearStreamError} style={styles.errorDismiss}>
            <Text style={styles.errorDismissText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

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
          onFileUpload={handleFileUpload}
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
    ...Platform.select({
      web: {
        // @ts-ignore - web-only property
        position: 'fixed',
      },
    }),
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorText: {
    color: '#ffffff',
    fontSize: 14,
    flex: 1,
  },
  errorDismiss: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
  },
  errorDismissText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
});
