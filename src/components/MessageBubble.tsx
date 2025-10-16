import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { darkTheme } from '../theme';
import { LettaMessage } from '../types/letta';
import MessageContent from './MessageContent';
import ToolCallItem from './ToolCallItem';

interface MessageBubbleProps {
  message: LettaMessage;
  theme?: any;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, theme = darkTheme }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool' || message.message_type?.includes('tool');

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

  // Render tool call messages separately
  if (isTool) {
    return (
      <View style={styles.toolContainer}>
        <ToolCallItem message={message} theme={theme} />
      </View>
    );
  }

  // Render multimodal content (images + text)
  const renderContent = () => {
    if (Array.isArray(message.content)) {
      return (
        <View>
          {message.content.map((item: any, index: number) => {
            if (item.type === 'image' && item.source) {
              const imageUri = item.source.type === 'base64'
                ? `data:${item.source.mediaType || 'image/jpeg'};base64,${item.source.data}`
                : item.source.url;

              return (
                <Image
                  key={index}
                  source={{ uri: imageUri }}
                  style={styles.messageImage}
                  resizeMode="cover"
                />
              );
            } else if (item.type === 'text') {
              return (
                <Text key={index} style={getTextStyle()}>
                  {item.text}
                </Text>
              );
            }
            return null;
          })}
        </View>
      );
    }

    // Render regular text content
    if (typeof message.content === 'string') {
      return (
        <MessageContent
          content={message.content}
          messageType={message.message_type}
          theme={theme}
        />
      );
    }

    return null;
  };

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View style={getBubbleStyle()}>
        {renderContent()}
        <Text style={styles.timestamp}>
          {formatTime(message.created_at)}
        </Text>
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
  toolContainer: {
    marginVertical: 2,
    marginHorizontal: 16,
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
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 8,
    marginVertical: 8,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    opacity: 0.7,
    color: darkTheme.colors.text.tertiary,
  },
});

export default MessageBubble;
