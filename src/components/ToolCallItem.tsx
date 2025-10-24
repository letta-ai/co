import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme, lightTheme } from '../theme';

interface ToolCallItemProps {
  callText: string;
  resultText?: string;
  hasResult?: boolean;
  showResult?: boolean; // When false, hide the result section entirely
  isDark?: boolean;
  hideHeader?: boolean; // When true, skip rendering the label header (shown by parent)
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

const ToolCallItem: React.FC<ToolCallItemProps> = ({ callText, resultText, hasResult = false, showResult = true, isDark = true, hideHeader = false }) => {
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

  // Convert JSON arguments to YAML format for better readability
  const jsonToYaml = (obj: any, indent = 0): string => {
    const spaces = '  '.repeat(indent);

    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'boolean') return obj.toString();
    if (typeof obj === 'number') return obj.toString();

    // String handling - use literal block style for multiline strings
    if (typeof obj === 'string') {
      if (obj.includes('\n')) {
        // Multiline string - use literal block style
        const lines = obj.split('\n');
        return '|\n' + lines.map(line => spaces + '  ' + line).join('\n');
      }
      // Single line string - quote if contains special characters
      if (obj.match(/[:#{}[\],&*!|>'"@`-]/) || obj.trim() !== obj) {
        return `"${obj.replace(/"/g, '\\"')}"`;
      }
      return obj;
    }

    // Array handling
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return '\n' + obj.map(item =>
        spaces + '- ' + jsonToYaml(item, indent + 1).replace(/^\s+/, '')
      ).join('\n');
    }

    // Object handling
    if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';
      return '\n' + entries.map(([key, value]) => {
        const yamlValue = jsonToYaml(value, indent + 1);
        // If value starts with newline, it's multiline
        if (yamlValue.startsWith('\n') || yamlValue.startsWith('|')) {
          return `${spaces}${key}: ${yamlValue}`;
        }
        return `${spaces}${key}: ${yamlValue}`;
      }).join('\n');
    }

    return String(obj);
  };

  // Try to parse a "name({json})" or "name(k=v, ...)" shape into
  // a nicer multiline representation for readability.
  const prettyCallText = useMemo(() => {
    const raw = callText?.trim() || '';
    // Extract name and args inside parens if present
    const m = raw.match(/^\s*([\w.]+)\s*\(([\s\S]*)\)\s*$/);
    const fn = m ? m[1] : 'tool';
    const inside = m ? m[2].trim() : raw;

    const looksJsonLike = (s: string) => s.startsWith('{') || s.startsWith('[');

    const toYaml = (s: string): string | null => {
      try {
        const parsed = JSON.parse(s);
        return jsonToYaml(parsed, 1).trim();
      } catch {
        return null;
      }
    };

    const fromKvToYaml = (s: string): string | null => {
      // Best-effort conversion of "k=v, x=1" into YAML
      try {
        // Wrap in braces and quote keys
        const replaced = s.replace(/([A-Za-z_][A-Za-z0-9_]*)\s*=/g, '"$1": ');
        const wrapped = `{ ${replaced} }`;
        return toYaml(wrapped);
      } catch {
        return null;
      }
    };

    const argsPretty =
      looksJsonLike(inside)
        ? (toYaml(inside) ?? inside)
        : (fromKvToYaml(inside) ?? inside);

    // If we couldn't improve it, just return the raw text
    if (argsPretty === raw) return raw;

    // Compose a friendly multiline signature
    return `${fn}(\n${argsPretty}\n)`;
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
      {!hideHeader && (
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
      )}
      {hideHeader && (
        <View style={styles.embeddedContainer}>
          {/* Details button - bottom right */}
          <TouchableOpacity
            style={styles.detailsButton}
            onPress={() => setExpanded((e) => !e)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="information-circle-outline"
              size={16}
              color={theme.colors.text.tertiary}
            />
          </TouchableOpacity>

          {/* Expanded tool call details */}
          {expanded && (
            <View style={styles.expandedDetails}>
              <Text style={[styles.callText, { color: theme.colors.text.primary }]}>
                {prettyCallText}
              </Text>
            </View>
          )}
        </View>
      )}
      {showResult && !!resultText && (
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
      {showResult && resultExpanded && !!resultText && (
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
  embeddedContainer: {
    position: 'relative',
    width: '100%',
  },
  detailsButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 8,
    opacity: 0.3,
    borderRadius: 4,
    zIndex: 10,
  },
  expandedDetails: {
    paddingTop: 8,
    paddingBottom: 4,
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
    fontSize: 12,
    lineHeight: 16,
    flexShrink: 1,
    opacity: 0.7,
    // Preserve whitespace and newlines for pretty-printed JSON
    whiteSpace: 'pre-wrap' as any,
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
