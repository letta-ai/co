import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme, lightTheme } from '../theme';

interface ReasoningToggleProps {
  reasoning: string;
  messageId?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  customToggleContent?: React.ReactNode;
  hideChevron?: boolean;
  isDark?: boolean;
}

const ReasoningToggle: React.FC<ReasoningToggleProps> = ({
  reasoning,
  messageId,
  isExpanded: externalExpanded,
  onToggle: externalOnToggle,
  customToggleContent,
  hideChevron = false,
  isDark = true
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [internalExpanded, setInternalExpanded] = useState(false);

  // Use external state if provided, otherwise use internal
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleToggle = externalOnToggle || (() => setInternalExpanded(!internalExpanded));

  return (
    <>
      <TouchableOpacity
        onPress={handleToggle}
        style={styles.reasoningToggle}
      >
        {customToggleContent ? (
          customToggleContent
        ) : (
          <>
            <Text style={[styles.reasoningToggleText, { color: theme.colors.text.primary }]}>(co thought)</Text>
            {!hideChevron && (
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={theme.colors.text.tertiary}
                style={{ marginLeft: 4 }}
              />
            )}
          </>
        )}
      </TouchableOpacity>
      {isExpanded && (
        <View style={[
          styles.reasoningExpandedContainer,
          {
            backgroundColor: isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.04)',
            borderLeftColor: theme.colors.border.primary,
          }
        ]}>
          <Text style={[styles.reasoningExpandedText, { color: theme.colors.text.primary }]}>{reasoning}</Text>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  reasoningToggleText: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
  },
  reasoningExpandedContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 20,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    overflow: 'hidden',
  },
  reasoningExpandedText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 22,
    fontStyle: 'normal',
  },
});

export default React.memo(ReasoningToggle);
