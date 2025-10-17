/**
 * BottomNavigation Component
 *
 * MIGRATION STATUS: ✅ EXTRACTED - Ready for use
 *
 * REPLACES: App.tsx.monolithic lines 2126-2176
 * - View switcher tabs (You, Chat, Knowledge, Settings)
 * - Active state styling
 * - Conditional rendering based on message count
 *
 * FEATURES:
 * - 4 navigation tabs: You, Chat, Knowledge, Settings
 * - Active tab highlighting
 * - Triggers callbacks for view switching
 * - Theme-aware colors
 * - Hides when no messages (empty state)
 *
 * CALLBACKS:
 * - onYouPress: Load memory blocks
 * - onChatPress: Switch to chat view
 * - onKnowledgePress: Load knowledge/archival memory
 * - onSettingsPress: Open settings
 *
 * DEPENDENCIES:
 * - Theme system
 * - Lexend fonts
 *
 * USED BY: (not yet integrated)
 * - [ ] App.new.tsx (planned)
 *
 * RELATED COMPONENTS:
 * - AppHeader.tsx (appears above this)
 * - YouView.tsx (shown when "You" is active)
 * - ChatScreen.tsx (shown when "Chat" is active)
 * - KnowledgeView.tsx (shown when "Knowledge" is active)
 * - SettingsView.tsx (shown when "Settings" is active)
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
  onSettingsPress: () => void;
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

      <TouchableOpacity
        style={[
          styles.viewSwitcherButton,
          currentView === 'settings' && {
            backgroundColor: theme.colors.background.tertiary,
          },
        ]}
        onPress={onSettingsPress}
      >
        <Text
          style={[
            styles.viewSwitcherText,
            {
              color:
                currentView === 'settings'
                  ? theme.colors.text.primary
                  : theme.colors.text.tertiary,
            },
          ]}
        >
          Settings
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
