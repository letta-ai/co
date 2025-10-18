/**
 * InlineReasoningButton Component
 *
 * Small chevron button that toggles reasoning visibility.
 * Designed to appear inline next to message labels (e.g., "(co said) [>]").
 *
 * Replaces the standalone ReasoningToggle component with a more compact,
 * integrated design.
 */

import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface InlineReasoningButtonProps {
  isExpanded: boolean;
  onToggle: () => void;
  isDark: boolean;
}

export const InlineReasoningButton: React.FC<InlineReasoningButtonProps> = ({
  isExpanded,
  onToggle,
  isDark,
}) => {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={styles.button}
      activeOpacity={0.6}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Ionicons
        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
        size={18}
        color={isDark ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.5)'}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    marginLeft: 6,
    padding: 2,
  },
});

export default InlineReasoningButton;
