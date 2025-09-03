import React, { useEffect, useRef } from 'react';
import { 
  View, 
  FlatList, 
  Text, 
  StyleSheet, 
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import MessageBubble from '../components/MessageBubble';
import ChatInput from '../components/ChatInput';
import useAppStore from '../store/appStore';
import { LettaMessage } from '../types/letta';

const ChatScreen: React.FC = () => {
  const flatListRef = useRef<FlatList>(null);
  const {
    currentAgentId,
    messages,
    agents,
    isLoading,
    error,
    sendMessage,
    fetchMessages,
  } = useAppStore();

  const currentAgent = agents.find(agent => agent.id === currentAgentId);
  const currentMessages = currentAgentId ? messages[currentAgentId] || [] : [];

  useFocusEffect(
    React.useCallback(() => {
      if (currentAgentId) {
        fetchMessages(currentAgentId);
      }
    }, [currentAgentId, fetchMessages])
  );

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    if (currentMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [currentMessages.length]);

  const handleSendMessage = async (content: string) => {
    if (currentAgentId) {
      await sendMessage(currentAgentId, content);
    }
  };

  const handleRefresh = () => {
    if (currentAgentId) {
      fetchMessages(currentAgentId);
    }
  };

  const renderMessage = ({ item, index }: { item: LettaMessage; index: number }) => {
    return <MessageBubble key={item.id || index} message={item} />;
  };

  const renderEmptyState = () => {
    if (!currentAgentId) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Select an Agent</Text>
          <Text style={styles.emptySubtitle}>
            Choose an agent from the drawer to start chatting
          </Text>
        </View>
      );
    }

    if (currentMessages.length === 0 && !isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Start a conversation</Text>
          <Text style={styles.emptySubtitle}>
            Send a message to {currentAgent?.name || 'your agent'} to begin
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderError = () => {
    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <View style={styles.messagesContainer}>
          {renderError()}
          <FlatList
            ref={flatListRef}
            data={currentMessages}
            renderItem={renderMessage}
            keyExtractor={(item, index) => item.id || `message-${index}`}
            contentContainerStyle={[
              styles.messagesList,
              currentMessages.length === 0 && styles.emptyMessagesList,
            ]}
            ListEmptyComponent={renderEmptyState}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={handleRefresh}
                tintColor="#007AFF"
              />
            }
            onContentSizeChange={() => {
              if (currentMessages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        </View>
        
        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={!currentAgentId || isLoading}
          placeholder={
            !currentAgentId
              ? "Select an agent to start chatting..."
              : isLoading
              ? "Sending..."
              : "Type a message..."
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    paddingVertical: 8,
  },
  emptyMessagesList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFE6E6',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#D70015',
    textAlign: 'center',
  },
});

export default ChatScreen;