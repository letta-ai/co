import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { darkTheme } from '../theme';
import { LettaMessage } from '../types/letta';

interface MessageBubbleProps {
  message: LettaMessage;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getBubbleStyle = () => {
    if (isSystem) {
      return [styles.bubble, styles.systemBubble];
    }
    return [
      styles.bubble,
      isUser ? styles.userBubble : styles.assistantBubble
    ];
  };

  const getTextStyle = () => {
    if (isSystem) {
      return [styles.messageText, styles.systemText];
    }
    return [
      styles.messageText,
      isUser ? styles.userText : styles.assistantText
    ];
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={getBubbleStyle()}>
        <Text style={getTextStyle()}>
          {message.content}
        </Text>
        <Text style={styles.timestamp}>
          {formatTime(message.created_at)}
        </Text>
        {message.tool_calls && message.tool_calls.length > 0 && (
          <View style={styles.toolCallsContainer}>
            <Text style={styles.toolCallsTitle}>Tools used:</Text>
            {message.tool_calls.map((toolCall, index) => (
              <Text key={index} style={styles.toolCallText}>
                • {toolCall.function.name}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    marginHorizontal: 16,
  },
  userContainer: {
    alignItems: 'flex-end',
  },
  assistantContainer: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userBubble: {
    backgroundColor: darkTheme.colors.interactive.primary,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: darkTheme.colors.background.surface,
    borderBottomLeftRadius: 4,
  },
  systemBubble: {
    backgroundColor: darkTheme.colors.status.warning,
    borderRadius: 8,
    maxWidth: '90%',
    alignSelf: 'center',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: darkTheme.colors.text.inverse,
  },
  assistantText: {
    color: darkTheme.colors.text.primary,
  },
  systemText: {
    color: darkTheme.colors.text.primary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
  },
  toolCallsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: darkTheme.colors.background.tertiary,
    borderRadius: 8,
  },
  toolCallsTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    opacity: 0.8,
  },
  toolCallText: {
    fontSize: 12,
    opacity: 0.8,
  },
});

export default MessageBubble;
