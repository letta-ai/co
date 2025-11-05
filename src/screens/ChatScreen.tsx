import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Alert,
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

    console.log('handleFileUpload - file:', file.name);

    // Get or create the co-app folder
    let folderId = await Storage.getItem(STORAGE_KEYS.CO_FOLDER_ID);

    if (!folderId) {
      console.log('No folder ID found, searching for co-app folder...');
      const folders = await lettaApi.listFolders({ name: 'co-app' });
      
      if (folders.length > 0) {
        folderId = folders[0].id;
        console.log('Found existing co-app folder:', folderId);
      } else {
        console.log('Creating new co-app folder...');
        const folder = await lettaApi.createFolder('co-app', 'Files shared with co agent');
        folderId = folder.id;
        console.log('Created new folder:', folderId);
      }

      await Storage.setItem(STORAGE_KEYS.CO_FOLDER_ID, folderId);
    }

    console.log('Uploading file to folder:', folderId);
    const result = await lettaApi.uploadFileToFolder(folderId, file, 'replace');
    console.log('File uploaded successfully:', result);

    // Attach folder to agent if not already attached
    console.log('Ensuring folder is attached to agent...');
    try {
      await lettaApi.attachFolderToAgent(coAgent.id, folderId);
      console.log('Folder attached to agent');
    } catch (error: any) {
      // If already attached, that's fine
      if (error.message?.includes('already attached') || error.status === 409) {
        console.log('Folder already attached to agent');
      } else {
        throw error;
      }
    }

    console.log('File upload complete!');
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
});
