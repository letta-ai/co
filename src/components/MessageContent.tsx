import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { darkTheme } from '../theme';
import createMarkdownStyles from './markdownStyles';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isUser }) => {
  // Define colors based on Letta theme
  const userTextColor = darkTheme.colors.text.inverse; // Inverse (light) text on brand-blue bubble
  const assistantTextColor = darkTheme.colors.text.primary; // White for assistant messages on dark background
  const userAccentColor = darkTheme.colors.text.inverse; // Dark for user message accents
  const assistantAccentColor = darkTheme.colors.text.secondary; // Gray for assistant message accents

  const codeFontFamily = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'SFMono-Regular',
  });

  const markdownStyles = createMarkdownStyles({ isUser });

  return (
    <Markdown style={markdownStyles}>
      {content}
    </Markdown>
  );
};

export default MessageContent;
