/**
 * YouView Component
 *
 * MIGRATION STATUS: ✅ EXTRACTED - Ready for use
 *
 * REPLACES: App.tsx.monolithic lines 2181-2237
 * - Memory blocks viewer ("You" view)
 * - Shows "You" block content in markdown
 * - Create "You" block if it doesn't exist
 * - Loading and empty states
 *
 * FEATURES:
 * - Three states: loading, empty, content
 * - Loading: Shows spinner while checking for You block
 * - Empty: Shows "Want to understand yourself?" with create button
 * - Content: Renders You block markdown
 * - Markdown rendering with custom styles
 * - Responsive max-width (700px)
 *
 * LOGIC DEPENDENCIES:
 * - Parent must handle:
 *   - Checking if You block exists
 *   - Creating You block
 *   - Loading You block content
 *   - State management (hasCheckedYouBlock, hasYouBlock, youBlockContent)
 *
 * USED BY: (not yet integrated)
 * - [ ] App.new.tsx (planned)
 *
 * RELATED COMPONENTS:
 * - MemoryBlockViewer.tsx (alternative memory block display)
 * - KnowledgeView.tsx (archival memory view)
 *
 * TODO:
 * - Add edit functionality
 * - Add multiple memory blocks support
 * - Add block type badges
 */

import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Markdown from '@ronradtke/react-native-markdown-display';
import { createMarkdownStyles } from '../components/markdownStyles';
import type { Theme } from '../theme';

interface YouViewProps {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  hasCheckedYouBlock: boolean;
  hasYouBlock: boolean;
  youBlockContent: string;
  isCreatingYouBlock: boolean;
  onCreateYouBlock: () => void;
}

export function YouView({
  theme,
  colorScheme,
  hasCheckedYouBlock,
  hasYouBlock,
  youBlockContent,
  isCreatingYouBlock,
  onCreateYouBlock,
}: YouViewProps) {
  // Loading state - checking for You block
  if (!hasCheckedYouBlock) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={theme.colors.text.primary} />
        </View>
      </View>
    );
  }

  // Empty state - no You block exists
  if (!hasYouBlock) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
        <View style={styles.emptyState}>
          <Text
            style={[
              styles.emptyTitle,
              { color: theme.colors.text.primary },
            ]}
          >
            Want to understand yourself?
          </Text>
          <TouchableOpacity
            onPress={onCreateYouBlock}
            disabled={isCreatingYouBlock}
            style={[
              styles.createButton,
              {
                backgroundColor: theme.colors.background.tertiary,
                borderColor: theme.colors.border.primary,
              },
            ]}
          >
            {isCreatingYouBlock ? (
              <ActivityIndicator size="large" color={theme.colors.text.primary} />
            ) : (
              <Ionicons name="add" size={48} color={theme.colors.text.primary} />
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Content state - You block exists, show markdown
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.contentContainer}
      >
        <Markdown
          style={createMarkdownStyles({
            isUser: false,
            isDark: colorScheme === 'dark',
          })}
        >
          {youBlockContent}
        </Markdown>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 40,
    textAlign: 'center',
    fontFamily: 'Lexend_700Bold',
  },
  createButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    padding: 20,
  },
});

export default YouView;
