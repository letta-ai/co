/**
 * YouView Component
 *
 * Displays and manages the "You" memory block - the agent's understanding of the user.
 *
 * Features three states:
 * - Loading: Shows spinner while checking for You block
 * - Empty: Prompts user to create their You block
 * - Content: Renders You block markdown with custom styling
 *
 * Parent component must handle:
 * - Checking if You block exists
 * - Creating You block
 * - Loading You block content
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
