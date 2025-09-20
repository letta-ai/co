import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { darkTheme } from '../theme';

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

  const markdownStyles = StyleSheet.create({
    body: {
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: darkTheme.typography.chatMessage.fontSize,
      // Tighter line-height helps visually center single-line text in bubbles
      lineHeight: darkTheme.typography.chatMessage.fontSize * 1.4,
      fontFamily: darkTheme.typography.chatMessage.fontFamily,
    },
    paragraph: {
      marginTop: darkTheme.spacing[1],
      marginBottom: darkTheme.spacing[2],
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: darkTheme.typography.chatMessage.fontSize,
      lineHeight: darkTheme.typography.chatMessage.fontSize * 1.4,
      fontFamily: darkTheme.typography.chatMessage.fontFamily,
    },
    strong: {
      fontWeight: 'bold',
      color: isUser ? userTextColor : assistantTextColor,
    },
    em: {
      fontStyle: 'italic',
      color: isUser ? userTextColor : assistantTextColor,
    },
    code_inline: {
      backgroundColor: darkTheme.colors.background.surface,
      color: isUser ? userTextColor : '#E5E5E5',
      paddingHorizontal: darkTheme.spacing[0.5],
      paddingVertical: darkTheme.spacing[0.25],
      borderRadius: darkTheme.layout.borderRadius.small,
      borderWidth: 0,
      fontFamily: codeFontFamily,
      // Match body size/line-height for consistency in lists
      fontSize: darkTheme.typography.chatMessage.fontSize,
      lineHeight: darkTheme.typography.chatMessage.fontSize * 1.4,
    },
    code_block: {
      backgroundColor: darkTheme.colors.background.surface,
      color: isUser ? userTextColor : '#E5E5E5',
      padding: darkTheme.spacing[1.5],
      borderRadius: darkTheme.layout.borderRadius.small,
      borderWidth: 0,
      fontFamily: codeFontFamily,
      fontSize: darkTheme.typography.code.fontSize,
      marginTop: darkTheme.spacing[1],
      marginBottom: darkTheme.spacing[2],
    },
    fence: {
      backgroundColor: darkTheme.colors.background.surface,
      color: isUser ? userTextColor : '#E5E5E5',
      padding: darkTheme.spacing[1.5],
      borderRadius: darkTheme.layout.borderRadius.small,
      borderWidth: 0,
      fontFamily: darkTheme.typography.code.fontFamily,
      fontSize: darkTheme.typography.code.fontSize,
      marginTop: darkTheme.spacing[1],
      marginBottom: darkTheme.spacing[2],
    },
    heading1: {
      fontSize: darkTheme.typography.h1.fontSize,
      fontWeight: darkTheme.typography.h1.fontWeight,
      fontFamily: darkTheme.typography.h1.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      lineHeight: darkTheme.typography.h1.lineHeight * darkTheme.typography.h1.fontSize,
      letterSpacing: darkTheme.typography.h1.letterSpacing,
      marginTop: darkTheme.spacing[2],
      marginBottom: darkTheme.spacing[1],
    },
    heading2: {
      fontSize: darkTheme.typography.h2.fontSize,
      fontWeight: darkTheme.typography.h2.fontWeight,
      fontFamily: darkTheme.typography.h2.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      lineHeight: darkTheme.typography.h2.lineHeight * darkTheme.typography.h2.fontSize,
      letterSpacing: darkTheme.typography.h2.letterSpacing,
      marginTop: darkTheme.spacing[1.5],
      marginBottom: darkTheme.spacing[1],
    },
    heading3: {
      fontSize: darkTheme.typography.h3.fontSize,
      fontWeight: darkTheme.typography.h3.fontWeight,
      fontFamily: darkTheme.typography.h3.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      lineHeight: darkTheme.typography.h3.lineHeight * darkTheme.typography.h3.fontSize,
      letterSpacing: darkTheme.typography.h3.letterSpacing,
      marginTop: darkTheme.spacing[1.25] || darkTheme.spacing[1],
      marginBottom: darkTheme.spacing[0.75] || darkTheme.spacing[0.5],
    },
    heading4: {
      fontSize: darkTheme.typography.h4.fontSize,
      fontWeight: darkTheme.typography.h4.fontWeight,
      fontFamily: darkTheme.typography.h4.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      marginVertical: darkTheme.spacing[0.5],
    },
    heading5: {
      fontSize: darkTheme.typography.h5.fontSize,
      fontWeight: darkTheme.typography.h5.fontWeight,
      fontFamily: darkTheme.typography.h5.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      marginVertical: darkTheme.spacing[0.5],
    },
    heading6: {
      fontSize: darkTheme.typography.h6.fontSize,
      fontWeight: darkTheme.typography.h6.fontWeight,
      fontFamily: darkTheme.typography.h6.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      marginVertical: darkTheme.spacing[0.5],
    },
    bullet_list: {
      marginTop: darkTheme.spacing[0.5],
      marginBottom: darkTheme.spacing[1],
    },
    ordered_list: {
      marginTop: darkTheme.spacing[0.5],
      marginBottom: darkTheme.spacing[1],
    },
    list_item: {
      flexDirection: 'row',
      marginVertical: 2,
    },
    bullet_list_icon: {
      color: isUser ? userTextColor : assistantAccentColor,
      marginRight: darkTheme.spacing[1],
      fontSize: darkTheme.typography.body.fontSize,
    },
    bullet_list_content: {
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: darkTheme.typography.body.fontSize,
      fontFamily: darkTheme.typography.body.fontFamily,
      lineHeight: darkTheme.typography.chatMessage.fontSize * 1.4,
      flex: 1,
    },
    ordered_list_icon: {
      color: isUser ? userTextColor : assistantAccentColor,
      marginRight: darkTheme.spacing[1],
      fontSize: darkTheme.typography.body.fontSize,
    },
    ordered_list_content: {
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: darkTheme.typography.body.fontSize,
      fontFamily: darkTheme.typography.body.fontFamily,
      lineHeight: darkTheme.typography.body.lineHeight * darkTheme.typography.body.fontSize,
      flex: 1,
    },
    blockquote: {
      backgroundColor: isUser ? darkTheme.colors.background.surface : darkTheme.colors.background.tertiary,
      borderLeftWidth: 4,
      borderLeftColor: isUser ? darkTheme.colors.text.secondary : darkTheme.colors.interactive.primary,
      paddingLeft: darkTheme.spacing[1.5],
      paddingVertical: darkTheme.spacing[1],
      marginTop: darkTheme.spacing[1.5],
      marginBottom: darkTheme.spacing[2],
    },
    link: {
      color: isUser ? darkTheme.colors.text.inverse : darkTheme.colors.interactive.primary,
      textDecorationLine: 'underline',
    },
    hr: {
      backgroundColor: isUser ? darkTheme.colors.border.secondary : darkTheme.colors.border.primary,
      height: 1,
      marginVertical: darkTheme.spacing[1],
    },
  });

  return (
    <Markdown style={markdownStyles}>
      {content}
    </Markdown>
  );
};

export default MessageContent;
