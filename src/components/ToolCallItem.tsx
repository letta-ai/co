import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme';

interface ToolCallItemProps {
  callText: string;
  resultText?: string;
}

const ToolCallItem: React.FC<ToolCallItemProps> = ({ callText, resultText }) => {
  const [expanded, setExpanded] = useState(false);

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

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.header, expanded && styles.headerExpanded]}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-forward'}
          size={14}
          color={darkTheme.colors.text.secondary}
          style={styles.chevron}
        />
        <Text style={styles.callText} numberOfLines={expanded ? 0 : 2}>
          {expanded ? prettyCallText : callText}
        </Text>
      </TouchableOpacity>
      {expanded && !!resultText && (
        <View style={styles.resultBox}>
          <Text style={styles.resultLabel}>Result</Text>
          <Text style={styles.resultText}>
            {(() => {
              const s = (resultText || '').trim();
              try {
                if (s.startsWith('{') || s.startsWith('[')) {
                  return JSON.stringify(JSON.parse(s), null, 2);
                }
              } catch {}
              return resultText;
            })()}
          </Text>
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
  chevron: {
    marginTop: 2,
  },
  headerExpanded: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
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
    whiteSpace: 'pre-wrap' as any,
    fontFamily: 'Menlo',
  },
});

export default ToolCallItem;
