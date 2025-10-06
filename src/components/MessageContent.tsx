import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import Markdown from '@ronradtke/react-native-markdown-display';
import { darkTheme } from '../theme';
import createMarkdownStyles from './markdownStyles';

interface MessageContentProps {
  content: string;
  isUser: boolean;
  isDark?: boolean;
}

const MessageContent: React.FC<MessageContentProps> = ({ content, isUser, isDark = true }) => {
  const markdownStyles = React.useMemo(() => createMarkdownStyles({ isUser, isDark }), [isUser, isDark]);

  // Normalize common escaped sequences that sometimes arrive double-escaped
  const normalized = React.useMemo(() => {
    if (!content) return '';
    let s = content
      .replace(/\r\n/g, '\n')   // windows newlines
      .replace(/\\r\\n/g, '\n') // escaped CRLF
      .replace(/\\n/g, '\n')     // escaped LF
      .replace(/\\t/g, '\t');    // escaped tab
    // Normalize common non-Markdown bullets to hyphen-space
    s = s
      .replace(/^\s*[–•]\s+/gm, '- ')   // en dash or dot bullet
      .replace(/^\s*—\s+/gm, '- ');     // em dash bullet
    // Unescape common markdown punctuation that sometimes arrives escaped
    s = s.replace(/\\([*_`#>\-])/g, '$1');
    // Remove a stray trailing backslash from incomplete escapes
    s = s.replace(/\\$/, '');
    // Collapse excessive blank lines to reasonable spacing
    s = s.replace(/\n{3,}/g, '\n\n');
    return s;
  }, [content]);

  return <Markdown style={markdownStyles}>{normalized}</Markdown>;
};

export default React.memo(MessageContent);
