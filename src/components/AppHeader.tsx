/**
 * AppHeader Component
 *
 * Application header with menu button and app title.
 *
 * Features:
 * - Menu button triggers sidebar drawer
 * - Hidden developer mode toggle (tap "co" title 7 times in 2 seconds)
 * - Responsive to safe area insets
 * - Conditionally hides when no messages present
 */

import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../theme';

interface AppHeaderProps {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  hasMessages: boolean;
  onMenuPress: () => void;
  developerMode: boolean;
  onDeveloperModeToggle: () => void;
}

export function AppHeader({
  theme,
  colorScheme,
  hasMessages,
  onMenuPress,
  developerMode,
  onDeveloperModeToggle,
}: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const headerClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleTitlePress = () => {
    setHeaderClickCount(prev => prev + 1);

    if (headerClickTimeoutRef.current) {
      clearTimeout(headerClickTimeoutRef.current);
    }

    headerClickTimeoutRef.current = setTimeout(() => {
      if (headerClickCount >= 6) {
        onDeveloperModeToggle();
        if (Platform.OS === 'web') {
          window.alert(developerMode ? 'Developer mode disabled' : 'Developer mode enabled');
        } else {
          Alert.alert('Developer Mode', developerMode ? 'Disabled' : 'Enabled');
        }
      }
      setHeaderClickCount(0);
    }, 2000);
  };

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 12,
          backgroundColor: theme.colors.background.secondary,
          borderBottomColor: theme.colors.border.primary,
        },
        !hasMessages && {
          backgroundColor: 'transparent',
          borderBottomWidth: 0,
        },
      ]}
    >
      <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
        <Ionicons
          name="menu"
          size={24}
          color={colorScheme === 'dark' ? '#FFFFFF' : theme.colors.text.primary}
        />
      </TouchableOpacity>

      {hasMessages && (
        <>
          <View style={styles.headerCenter}>
            <TouchableOpacity onPress={handleTitlePress}>
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>
                co
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerSpacer} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: 'Lexend_700Bold',
  },
  headerSpacer: {
    width: 40, // Balance the menu button width
  },
});

export default AppHeader;
