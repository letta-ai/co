/**
 * CompactionBar Component
 *
 * Displays a thin horizontal line with "compaction" label when conversation
 * history has been summarized. Expandable to show the compaction summary.
 *
 * Used when the agent compacts older messages to manage context window.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageContent from './MessageContent';
import type { Theme } from '../theme';

interface CompactionBarProps {
  message: string;
  messageId: string;
  isExpanded: boolean;
  onToggle: () => void;
  theme: Theme;
}

export const CompactionBar: React.FC<CompactionBarProps> = ({
  message,
  messageId,
  isExpanded,
  onToggle,
  theme,
}) => {
  return (
    <View style={styles.compactionContainer}>
      <TouchableOpacity
        onPress={onToggle}
        style={styles.compactionLine}
        activeOpacity={0.7}
      >
        <View style={[styles.compactionDivider, { backgroundColor: theme.colors.border.primary }]} />
        <Text style={[styles.compactionLabel, { color: theme.colors.text.tertiary }]}>
          compaction
        </Text>
        <View style={[styles.compactionDivider, { backgroundColor: theme.colors.border.primary }]} />
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={12}
          color={theme.colors.text.tertiary}
          style={styles.compactionChevron}
        />
      </TouchableOpacity>
      {isExpanded && (
        <View
          style={[
            styles.compactionMessageContainer,
            {
              backgroundColor: theme.colors.background.surface,
              borderColor: theme.colors.border.primary,
            },
          ]}
        >
          <MessageContent content={message} isUser={false} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  compactionContainer: {
    marginVertical: 16,
    marginHorizontal: 18,
  },
  compactionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactionDivider: {
    flex: 1,
    height: 1,
  },
  compactionLabel: {
    fontSize: 11,
    fontFamily: 'Lexend_400Regular',
    marginHorizontal: 12,
    textTransform: 'lowercase',
  },
  compactionChevron: {
    marginLeft: 4,
  },
  compactionMessageContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default CompactionBar;
