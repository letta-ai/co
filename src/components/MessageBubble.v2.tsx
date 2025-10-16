import React from 'react';
import { View, Text, StyleSheet, Image, Platform } from 'react-native';
import { LettaMessage } from '../types/letta';
import MessageContent from './MessageContent';
import ToolCallItem from './ToolCallItem';
import type { Theme } from '../theme';

interface MessageBubbleProps {
  message: LettaMessage;
  theme: Theme;
}

export const MessageBubbleV2: React.FC<MessageBubbleProps> = ({ message, theme }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  const isTool = message.role === 'tool' || message.message_type?.includes('tool');

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
                <Text
                  key={index}
                  style={[
                    styles.messageText,
                    { color: isUser ? theme.colors.text.inverse : theme.colors.text.primary }
                  ]}
                >
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

  // System messages - centered, muted
  if (isSystem) {
    return (
      <View style={styles.systemContainer}>
        <View
          style={[
            styles.systemBubble,
            {
              backgroundColor: theme.colors.background.tertiary,
              borderColor: theme.colors.border.primary,
            }
          ]}
        >
          <Text style={[styles.systemText, { color: theme.colors.text.secondary }]}>
            {typeof message.content === 'string' ? message.content : 'System message'}
          </Text>
          <Text style={[styles.timestamp, { color: theme.colors.text.tertiary }]}>
            {formatTime(message.created_at)}
          </Text>
        </View>
      </View>
    );
  }

  // User and Assistant messages
  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.assistantContainer]}>
      <View
        style={[
          styles.bubble,
          isUser ? [
            styles.userBubble,
            { backgroundColor: theme.colors.interactive.primary }
          ] : [
            styles.assistantBubble,
            {
              backgroundColor: theme.colors.background.surface,
              borderColor: theme.colors.border.primary,
            }
          ],
          Platform.OS === 'web' && isUser && {
            // @ts-ignore
            boxShadow: '0 2px 8px rgba(239, 160, 78, 0.2)',
          },
          Platform.OS === 'web' && !isUser && {
            // @ts-ignore
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          },
        ]}
      >
        {renderContent()}
        <Text
          style={[
            styles.timestamp,
            { color: isUser ? 'rgba(255, 255, 255, 0.7)' : theme.colors.text.tertiary }
          ]}
        >
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
    paddingHorizontal: 16,
    flexDirection: 'row',
  },
  userContainer: {
    justifyContent: 'flex-end',
  },
  assistantContainer: {
    justifyContent: 'flex-start',
  },
  systemContainer: {
    marginVertical: 8,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  toolContainer: {
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
  },
  userBubble: {
    borderBottomRightRadius: 6,
  },
  assistantBubble: {
    borderBottomLeftRadius: 6,
    borderWidth: 1,
  },
  systemBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    maxWidth: '90%',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: 'Lexend_400Regular',
  },
  systemText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    fontFamily: 'Lexend_400Regular',
  },
  messageImage: {
    width: 240,
    height: 240,
    borderRadius: 12,
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 11,
    marginTop: 6,
    fontFamily: 'Lexend_400Regular',
  },
});

export default MessageBubbleV2;
