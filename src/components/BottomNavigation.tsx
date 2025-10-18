/**
 * BottomNavigation Component
 *
 * View switcher with three navigation tabs: You, Chat, Knowledge.
 *
 * Features:
 * - Active tab highlighting
 * - Hides when no messages present (empty state)
 * - Centered layout with max-width constraint
 *
 * Note: Settings is accessed from the sidebar menu, not bottom navigation.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Theme } from '../theme';

export type ViewType = 'you' | 'chat' | 'knowledge' | 'settings';

interface BottomNavigationProps {
  theme: Theme;
  currentView: ViewType;
  hasMessages: boolean;
  onYouPress: () => void;
  onChatPress: () => void;
  onKnowledgePress: () => void;
  onSettingsPress?: () => void; // Optional - not shown in bottom nav
}

export function BottomNavigation({
  theme,
  currentView,
  hasMessages,
  onYouPress,
  onChatPress,
  onKnowledgePress,
  onSettingsPress,
}: BottomNavigationProps) {
  // Hide when chat is empty
  if (!hasMessages) {
    return null;
  }

  return (
    <View
      style={[
        styles.viewSwitcher,
        { backgroundColor: theme.colors.background.secondary },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.viewSwitcherButton,
          currentView === 'you' && {
            backgroundColor: theme.colors.background.tertiary,
          },
        ]}
        onPress={onYouPress}
      >
        <Text
          style={[
            styles.viewSwitcherText,
            {
              color:
                currentView === 'you'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
            },
          ]}
        >
          You
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.viewSwitcherButton,
          currentView === 'chat' && {
            backgroundColor: theme.colors.background.tertiary,
          },
        ]}
        onPress={onChatPress}
      >
        <Text
          style={[
            styles.viewSwitcherText,
            {
              color:
                currentView === 'chat'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
            },
          ]}
        >
          Chat
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.viewSwitcherButton,
          currentView === 'knowledge' && {
            backgroundColor: theme.colors.background.tertiary,
          },
        ]}
        onPress={onKnowledgePress}
      >
        <Text
          style={[
            styles.viewSwitcherText,
            {
              color:
                currentView === 'knowledge'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
            },
          ]}
        >
          Knowledge
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  viewSwitcher: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    maxWidth: 400,
    alignSelf: 'center',
    width: '100%',
  },
  viewSwitcherButton: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewSwitcherText: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
  },
});

export default BottomNavigation;
