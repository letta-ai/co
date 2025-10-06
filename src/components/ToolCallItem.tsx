import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme';

interface ToolCallItemProps {
  callText: string;
  resultText?: string;
  reasoning?: string;
}

// Extract parameters for contextual display
const extractParams = (callText: string): Record<string, any> => {
  try {
    const m = callText.match(/^\s*[\w.]+\s*\(([\s\S]*)\)\s*$/);
    if (!m) return {};
    const argsStr = m[1].trim();
    return JSON.parse(argsStr.startsWith('{') ? argsStr : `{${argsStr}}`);
  } catch {
    return {};
  }
};

// Map tool names to friendly display messages
const getToolDisplayName = (toolName: string, callText: string): string => {
  const params = extractParams(callText);

  if (toolName === 'web_search' && params.query) {
    return `Searching the web for "${params.query}"`;
  }

  if (toolName === 'conversation_search' && params.query) {
    return `Searching conversation history for "${params.query}"`;
  }

  if (toolName === 'fetch_webpage' && params.url) {
    const url = params.url.length > 50 ? params.url.substring(0, 50) + '...' : params.url;
    return `Fetching ${url}`;
  }

  const displayNames: Record<string, string> = {
    web_search: 'Searching the web',
    fetch_webpage: 'Fetching webpage',
    memory_insert: 'Inserting into memory',
    memory_replace: 'Updating memory',
    conversation_search: 'Searching conversation history',
    send_message: 'Sending message',
  };
  return displayNames[toolName] || toolName;
};

const ToolCallItem: React.FC<ToolCallItemProps> = ({ callText, resultText, reasoning }) => {
  const [expanded, setExpanded] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(false);
  const [reasoningExpanded, setReasoningExpanded] = useState(false);
  const rainbowAnimValue = useRef(new Animated.Value(0)).current;

  // Animate rainbow gradient when reasoning is expanded
  useEffect(() => {
    if (reasoningExpanded) {
      rainbowAnimValue.setValue(0);
      const animation = Animated.loop(
        Animated.timing(rainbowAnimValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [reasoningExpanded]);

  // Extract the tool name from callText
  const toolName = useMemo(() => {
    const raw = callText?.trim() || '';
    const m = raw.match(/^\s*([\w.]+)\s*\(/);
    return m ? m[1] : '';
  }, [callText]);

  // Get friendly display name
  const displayName = useMemo(() => getToolDisplayName(toolName, callText), [toolName, callText]);

  // Try to parse a "name({json})" or "name(k=v, ...)" shape into
  // a nicer multiline representation for readability.
  const prettyCallText = useMemo(() => {
    const raw = callText?.trim() || '';
    // Extract name and args inside parens if present
    const m = raw.match(/^\s*([\w.]+)\s*\(([\s\S]*)\)\s*$/);
    const fn = m ? m[1] : 'tool';
    const inside = m ? m[2].trim() : raw;

    const looksJsonLike = (s: string) => s.startsWith('{') || s.startsWith('[');

    const toPrettyJson = (s: string): string | null => {
      try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return null; }
    };

    const fromKvToPrettyJson = (s: string): string | null => {
      // Best-effort conversion of "k=v, x=1" into JSON
      try {
        // Wrap in braces and quote keys. Avoid touching quoted strings by a light heuristic:
        // this will work for our formatted args that already JSON.stringify values.
        const replaced = s.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g, '"$1": ');
        const wrapped = `{ ${replaced} }`;
        return toPrettyJson(wrapped);
      } catch {
        return null;
      }
    };

    const argsPretty =
      looksJsonLike(inside)
        ? (toPrettyJson(inside) ?? inside)
        : (fromKvToPrettyJson(inside) ?? inside);

    // If we couldn't improve it, just return the raw text
    if (argsPretty === raw) return raw;

    // Compose a friendly multiline signature
    const indented = argsPretty
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');
    return `${fn}(\n${indented}\n)`;
  }, [callText]);

  const formattedResult = useMemo(() => {
    if (!resultText) return '';
    const s = resultText.trim();
    try {
      if (s.startsWith('{') || s.startsWith('[')) {
        return JSON.stringify(JSON.parse(s), null, 2);
      }
    } catch {}
    return resultText;
  }, [resultText]);

  return (
    <View style={styles.container}>
      {reasoning && (
        <TouchableOpacity
          onPress={() => setReasoningExpanded(!reasoningExpanded)}
          style={styles.reasoningToggle}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color={darkTheme.colors.text.secondary}
            style={{ marginRight: 6 }}
          />
          <Text style={styles.reasoningToggleText}>Reasoning</Text>
          <View style={{ flex: 1 }} />
          <Ionicons
            name={reasoningExpanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={darkTheme.colors.text.tertiary}
          />
        </TouchableOpacity>
      )}
      {reasoning && reasoningExpanded && (
        <Animated.View style={[
          styles.reasoningExpandedContainer,
          {
            borderLeftColor: rainbowAnimValue.interpolate({
              inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
              outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
            }),
          }
        ]}>
          <Text style={styles.reasoningExpandedText}>{reasoning}</Text>
        </Animated.View>
      )}
      <TouchableOpacity
        style={[styles.header, expanded && !resultText && styles.headerExpanded, expanded && resultText && styles.headerExpandedWithResult]}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color={darkTheme.colors.text.secondary}
          style={styles.chevron}
        />
        <Text style={expanded ? styles.callText : styles.displayName} numberOfLines={expanded ? 0 : 1}>
          {expanded ? prettyCallText : displayName}
        </Text>
      </TouchableOpacity>
      {expanded && !!resultText && (
        <TouchableOpacity
          style={[styles.resultHeader, resultExpanded && styles.resultHeaderExpanded]}
          onPress={() => setResultExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={resultExpanded ? 'chevron-down' : 'chevron-forward'}
            size={12}
            color={darkTheme.colors.text.tertiary}
            style={styles.resultChevron}
          />
          <Text style={styles.resultLabel}>Result</Text>
        </TouchableOpacity>
      )}
      {expanded && resultExpanded && !!resultText && (
        <View style={styles.resultBox}>
          <Text style={styles.resultText}>{formattedResult}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },
  reasoningToggleText: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
    color: darkTheme.colors.text.secondary,
  },
  reasoningExpandedContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#555555',
    overflow: 'hidden',
  },
  reasoningExpandedText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
    lineHeight: 22,
    fontStyle: 'normal',
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
  chevron: {
    marginTop: 2,
  },
  headerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerExpandedWithResult: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  displayName: {
    color: darkTheme.colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
    flexShrink: 1,
  },
  callText: {
    color: darkTheme.colors.text.primary,
    fontFamily: 'Menlo',
    fontSize: 13,
    lineHeight: 18,
    flexShrink: 1,
    // Preserve whitespace and newlines for pretty-printed JSON
    whiteSpace: 'pre-wrap' as any,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: darkTheme.colors.background.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: darkTheme.colors.border.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  resultHeaderExpanded: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  resultChevron: {
    marginTop: 1,
  },
  resultLabel: {
    color: darkTheme.colors.text.tertiary,
    fontSize: 12,
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
  resultText: {
    color: darkTheme.colors.text.primary,
    fontSize: 14,
    lineHeight: 20,
    whiteSpace: 'pre-wrap' as any,
    fontFamily: 'Menlo',
  },
});

export default React.memo(ToolCallItem);
