import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { darkTheme } from '../theme';

interface ToolCallItemProps {
  callText: string;
  resultText?: string;
}

const ToolCallItem: React.FC<ToolCallItemProps> = ({ callText, resultText }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, expanded && styles.headerExpanded]}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Text style={styles.chevron}>{expanded ? '▾' : '▸'}</Text>
        <Text style={styles.callText} numberOfLines={expanded ? 0 : 2}>
          {callText}
        </Text>
      </TouchableOpacity>
      {expanded && !!resultText && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text style={styles.resultText}>{resultText}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: darkTheme.colors.background.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkTheme.colors.border.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  headerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  chevron: {
    color: darkTheme.colors.text.secondary,
    marginTop: 2,
  },
  callText: {
    color: darkTheme.colors.text.primary,
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
  },
  resultBox: {
    backgroundColor: darkTheme.colors.background.tertiary,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: darkTheme.colors.border.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultLabel: {
    color: darkTheme.colors.text.secondary,
    fontSize: 11,
    marginBottom: 6,
  },
  resultText: {
    color: darkTheme.colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
  },
});

export default ToolCallItem;

