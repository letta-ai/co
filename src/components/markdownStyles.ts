import { Platform, StyleSheet } from 'react-native';
import { darkTheme } from '../theme';

export interface MarkdownStyleOptions {
  isUser: boolean;
}

export const createMarkdownStyles = ({ isUser }: MarkdownStyleOptions) => {
  const theme = darkTheme;
  const userTextColor = theme.colors.text.inverse;
  const assistantTextColor = theme.colors.text.primary;

  const codeFontFamily = Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "DejaVu Sans Mono", "Courier New", monospace',
  });

  return StyleSheet.create({
    body: {
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: theme.typography.body.fontSize,
      lineHeight: theme.typography.body.fontSize * 1.5,
      fontFamily: theme.typography.body.fontFamily,
    },
    paragraph: {
      marginTop: theme.spacing[1],
      marginBottom: theme.spacing[2],
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: theme.typography.body.fontSize,
      lineHeight: theme.typography.body.fontSize * 1.5,
      fontFamily: theme.typography.body.fontFamily,
    },
    strong: { fontWeight: '700' },
    em: { fontStyle: 'italic' },

    code_inline: {
      // Inline code should look like text (no bubble)
      backgroundColor: 'transparent',
      color: isUser ? userTextColor : '#E5E5E5',
      paddingHorizontal: 0,
      paddingVertical: 0,
      borderRadius: 0,
      borderWidth: 0,
      borderColor: 'transparent',
      fontFamily: codeFontFamily,
      fontSize: theme.typography.code.fontSize,
      lineHeight: theme.typography.code.fontSize * 1.5,
    },
    code_block: {
      backgroundColor: theme.colors.background.surface,
      color: isUser ? userTextColor : '#E5E5E5',
      padding: theme.spacing[1.5],
      borderRadius: theme.layout.borderRadius.small,
      fontFamily: codeFontFamily,
      fontSize: theme.typography.codeBlock.fontSize,
      marginTop: theme.spacing[1],
      marginBottom: theme.spacing[2],
    },

    heading1: {
      fontSize: theme.typography.h1.fontSize,
      fontWeight: theme.typography.h1.fontWeight,
      fontFamily: theme.typography.h1.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      lineHeight: theme.typography.h1.fontSize * theme.typography.h1.lineHeight,
      letterSpacing: theme.typography.h1.letterSpacing,
      marginTop: theme.spacing[2],
      marginBottom: theme.spacing[1],
    },
    heading2: {
      fontSize: theme.typography.h2.fontSize,
      fontWeight: theme.typography.h2.fontWeight,
      fontFamily: theme.typography.h2.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      lineHeight: theme.typography.h2.fontSize * theme.typography.h2.lineHeight,
      letterSpacing: theme.typography.h2.letterSpacing,
      marginTop: theme.spacing[1.5],
      marginBottom: theme.spacing[1],
    },
    heading3: {
      fontSize: theme.typography.h3.fontSize,
      fontWeight: theme.typography.h3.fontWeight,
      fontFamily: theme.typography.h3.fontFamily,
      color: isUser ? userTextColor : assistantTextColor,
      lineHeight: theme.typography.h3.fontSize * theme.typography.h3.lineHeight,
      letterSpacing: theme.typography.h3.letterSpacing,
      marginTop: theme.spacing[1],
      marginBottom: theme.spacing[0.5],
    },

    bullet_list: { marginTop: theme.spacing[0.5], marginBottom: theme.spacing[1] },
    ordered_list: { marginTop: theme.spacing[0.5], marginBottom: theme.spacing[1] },
    list_item: { flexDirection: 'row', marginVertical: 2 },
    bullet_list_icon: {
      color: isUser ? userTextColor : theme.colors.text.secondary,
      marginRight: theme.spacing[1],
      fontSize: theme.typography.body.fontSize,
    },
    bullet_list_content: {
      color: isUser ? userTextColor : assistantTextColor,
      fontSize: theme.typography.body.fontSize,
      fontFamily: theme.typography.body.fontFamily,
      lineHeight: theme.typography.body.fontSize * 1.5,
      flex: 1,
    },

    blockquote: {
      backgroundColor: isUser ? theme.colors.background.surface : theme.colors.background.tertiary,
      borderLeftWidth: 4,
      borderLeftColor: isUser ? theme.colors.text.secondary : theme.colors.interactive.primary,
      paddingLeft: theme.spacing[1.5],
      paddingVertical: theme.spacing[1],
      marginTop: theme.spacing[1.5],
      marginBottom: theme.spacing[2],
    },

    link: {
      color: isUser ? theme.colors.text.inverse : theme.colors.interactive.primary,
      textDecorationLine: 'underline',
    },
    hr: {
      backgroundColor: isUser ? theme.colors.border.secondary : theme.colors.border.primary,
      height: 1,
      marginVertical: theme.spacing[1],
    },
  });
};

export default createMarkdownStyles;
