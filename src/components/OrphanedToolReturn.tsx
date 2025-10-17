/**
 * OrphanedToolReturn Component
 *
 * Displays a tool return message that doesn't have a matching tool call.
 * This can happen when messages are compacted or in edge cases.
 *
 * Shows as a collapsible "Result (orphaned)" label.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageContent from './MessageContent';
import type { Theme } from '../theme';

interface OrphanedToolReturnProps {
  content: string;
  messageId: string;
  isExpanded: boolean;
  onToggle: () => void;
  theme: Theme;
  isDark: boolean;
}

export const OrphanedToolReturn: React.FC<OrphanedToolReturnProps> = ({
  content,
  messageId,
  isExpanded,
  onToggle,
  theme,
  isDark,
}) => {
  return (
    <View style={styles.toolReturnContainer}>
      <TouchableOpacity
        style={styles.toolReturnHeader}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={12}
          color={theme.colors.text.tertiary}
        />
        <Text style={[styles.toolReturnLabel, { color: theme.colors.text.tertiary }]}>
          Result (orphaned)
        </Text>
      </TouchableOpacity>
      {isExpanded && (
        <View
          style={[
            styles.toolReturnContent,
            {
              backgroundColor: isDark ? 'rgba(30, 30, 30, 0.3)' : 'rgba(240, 240, 240, 0.5)',
              borderColor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.05)',
            },
          ]}
        >
          <MessageContent content={content} isUser={false} isDark={isDark} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  toolReturnContainer: {
    width: '100%',
    marginTop: -8,
    marginBottom: 4,
  },
  toolReturnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  toolReturnLabel: {
    fontSize: 10,
    fontFamily: 'Lexend_400Regular',
    opacity: 0.5,
  },
  toolReturnContent: {
    borderRadius: 4,
    padding: 8,
    borderWidth: 1,
  },
});

export default OrphanedToolReturn;
