import React from 'react';
import { StyleSheet } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { darkTheme } from '../theme';

interface MessageContentProps {
  content: string;
  isUser: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isUser }) => {
  // Define colors based on Letta theme
  const userTextColor = darkTheme.colors.text.primary; // White for user messages on dark background
  const assistantTextColor = darkTheme.colors.text.primary; // White for assistant messages on dark background
  const userAccentColor = darkTheme.colors.text.inverse; // Dark for user message accents
  const assistantAccentColor = darkTheme.colors.text.secondary; // Gray for assistant message accents

  const markdownStyles = StyleSheet.create({
    body: {
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: darkTheme.typography.chatMessage.fontSize,
      lineHeight: darkTheme.typography.chatMessage.lineHeight * darkTheme.typography.chatMessage.fontSize,
      fontFamily: darkTheme.typography.chatMessage.fontFamily,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: darkTheme.spacing[1],
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: darkTheme.typography.chatMessage.fontSize,
      lineHeight: darkTheme.typography.chatMessage.lineHeight * darkTheme.typography.chatMessage.fontSize,
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
      backgroundColor: isUser ? darkTheme.colors.background.surface : darkTheme.colors.background.tertiary,
      color: isUser ? userTextColor : darkTheme.colors.interactive.primary,
      paddingHorizontal: darkTheme.spacing[0.5],
      paddingVertical: darkTheme.spacing[0.5],
      borderRadius: darkTheme.layout.borderRadius.small,
      fontFamily: darkTheme.typography.code.fontFamily,
      fontSize: darkTheme.typography.code.fontSize,
    },
    code_block: {
      backgroundColor: isUser ? darkTheme.colors.background.surface : darkTheme.colors.background.tertiary,
      color: isUser ? userTextColor : darkTheme.colors.interactive.primary,
      padding: darkTheme.spacing[1],
      borderRadius: darkTheme.layout.borderRadius.medium,
      fontFamily: darkTheme.typography.code.fontFamily,
      fontSize: darkTheme.typography.code.fontSize,
      marginVertical: darkTheme.spacing[0.5],
      borderLeftWidth: 2,
      borderLeftColor: darkTheme.colors.interactive.primary,
    },
    fence: {
      backgroundColor: isUser ? darkTheme.colors.background.surface : darkTheme.colors.background.tertiary,
      color: isUser ? userTextColor : darkTheme.colors.interactive.primary,
      padding: darkTheme.spacing[1],
      borderRadius: darkTheme.layout.borderRadius.medium,
      fontFamily: darkTheme.typography.code.fontFamily,
      fontSize: darkTheme.typography.code.fontSize,
      marginVertical: darkTheme.spacing[0.5],
      borderLeftWidth: 2,
      borderLeftColor: darkTheme.colors.interactive.primary,
    },
    heading1: {
      fontSize: darkTheme.typography.h1.fontSize,
      fontWeight: darkTheme.typography.h1.fontWeight,
      fontFamily: darkTheme.typography.h1.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      marginVertical: darkTheme.spacing[1],
    },
    heading2: {
      fontSize: darkTheme.typography.h2.fontSize,
      fontWeight: darkTheme.typography.h2.fontWeight,
      fontFamily: darkTheme.typography.h2.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      marginVertical: darkTheme.spacing[1],
    },
    heading3: {
      fontSize: darkTheme.typography.h3.fontSize,
      fontWeight: darkTheme.typography.h3.fontWeight,
      fontFamily: darkTheme.typography.h3.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      marginVertical: darkTheme.spacing[0.5],
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
      marginVertical: darkTheme.spacing[0.5],
    },
    ordered_list: {
      marginVertical: darkTheme.spacing[0.5],
    },
    list_item: {
      flexDirection: 'row',
      marginVertical: darkTheme.spacing[0.5],
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
      lineHeight: darkTheme.typography.body.lineHeight * darkTheme.typography.body.fontSize,
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
      marginVertical: darkTheme.spacing[0.5],
    },
    link: {
      color: isUser ? darkTheme.colors.interactive.primary : darkTheme.colors.interactive.primary,
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