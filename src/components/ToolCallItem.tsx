import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme, lightTheme } from '../theme';

interface ToolCallItemProps {
  callText: string;
  resultText?: string;
  hasResult?: boolean;
  isDark?: boolean;
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
const getToolDisplayName = (toolName: string, callText: string, hasResult: boolean): { present: string; past: string } => {
  const params = extractParams(callText);

  if (toolName === 'web_search' && params.query) {
    const query = params.query.length > 50 ? params.query.substring(0, 50) + '...' : params.query;
    return {
      present: `co is searching the web for "${query}"`,
      past: `co searched for "${query}"`
    };
  }

  if (toolName === 'conversation_search' && params.query) {
    const query = params.query.length > 50 ? params.query.substring(0, 50) + '...' : params.query;
    return {
      present: `co is searching conversation history for "${query}"`,
      past: `co searched conversation history for "${query}"`
    };
  }

  if (toolName === 'fetch_webpage' && params.url) {
    const url = params.url.length > 50 ? params.url.substring(0, 50) + '...' : params.url;
    return {
      present: `co is fetching ${url}`,
      past: `co fetched ${url}`
    };
  }

  const displayNames: Record<string, { present: string; past: string }> = {
    web_search: { present: 'co is searching the web', past: 'co searched the web' },
    fetch_webpage: { present: 'co is fetching webpage', past: 'co fetched webpage' },
    memory_insert: { present: 'co is inserting into memory', past: 'co inserted into memory' },
    memory_replace: { present: 'co is updating memory', past: 'co updated memory' },
    conversation_search: { present: 'co is searching conversation history', past: 'co searched conversation history' },
    send_message: { present: 'co is sending message', past: 'co sent message' },
  };
  return displayNames[toolName] || { present: toolName, past: toolName };
};

const ToolCallItem: React.FC<ToolCallItemProps> = ({ callText, resultText, hasResult = false, isDark = true }) => {
  const theme = isDark ? darkTheme : lightTheme;
  const [expanded, setExpanded] = useState(false);
  const [resultExpanded, setResultExpanded] = useState(false);

  // Extract the tool name from callText
  const toolName = useMemo(() => {
    const raw = callText?.trim() || '';
    const m = raw.match(/^\s*([\w.]+)\s*\(/);
    return m ? m[1] : '';
  }, [callText]);

  // Get friendly display names
  const displayNames = useMemo(() => getToolDisplayName(toolName, callText, hasResult), [toolName, callText, hasResult]);
  const displayText = hasResult ? displayNames.past : displayNames.present;

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
      <TouchableOpacity
        style={styles.header}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Text style={[expanded ? styles.callText : styles.displayName, { color: expanded ? theme.colors.text.primary : theme.colors.text.primary }]} numberOfLines={expanded ? 0 : 1}>
          {expanded ? prettyCallText : `(${displayText})`}
        </Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={theme.colors.text.tertiary}
          style={styles.chevron}
        />
      </TouchableOpacity>
      {!!resultText && (
        <TouchableOpacity
          style={[styles.resultHeader, resultExpanded && styles.resultHeaderExpanded, { backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}
          onPress={() => setResultExpanded((e) => !e)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={resultExpanded ? 'chevron-down' : 'chevron-forward'}
            size={12}
            color={theme.colors.text.tertiary}
            style={styles.resultChevron}
          />
          <Text style={[styles.resultLabel, { color: theme.colors.text.tertiary }]}>Result</Text>
        </TouchableOpacity>
      )}
      {resultExpanded && !!resultText && (
        <View style={[styles.resultBox, { backgroundColor: theme.colors.background.tertiary, borderColor: theme.colors.border.primary }]}>
          <Text style={[styles.resultText, { color: theme.colors.text.primary }]}>{formattedResult}</Text>
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
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  chevron: {
    marginLeft: 4,
  },
  displayName: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
    flexShrink: 1,
  },
  callText: {
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
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
    borderLeftWidth: 1,
    borderRightWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  resultHeaderExpanded: {
    borderBottomWidth: 1,
  },
  resultChevron: {
    marginTop: 1,
  },
  resultLabel: {
    fontSize: 12,
  },
  resultBox: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  resultText: {
    fontSize: 14,
    lineHeight: 20,
    whiteSpace: 'pre-wrap' as any,
    fontFamily: Platform.select({
      ios: 'Menlo',
      android: 'monospace',
      default: 'monospace',
    }),
  },
});

export default React.memo(ToolCallItem);
