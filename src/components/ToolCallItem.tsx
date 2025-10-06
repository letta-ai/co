import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme';
import ReasoningToggle from './ReasoningToggle';

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
      {reasoning && <ReasoningToggle reasoning={reasoning} />}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#242424',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    backgroundColor: '#242424',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: darkTheme.colors.text.tertiary,
    fontSize: 12,
  },
  resultBox: {
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
