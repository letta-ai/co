/**
 * AppSidebar Component
 *
 * Animated slide-in drawer menu with navigation and settings.
 *
 * Menu Items:
 * - Memory: Navigate to knowledge view
 * - Settings: Navigate to settings view
 * - Theme Toggle: Switch between light/dark mode
 * - Open in Browser: Opens agent in Letta web app
 * - Refresh Co: Deletes and recreates agent (developer mode only)
 * - Logout: Signs out user
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Alert,
  Linking,
  FlatList,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Theme } from '../theme';

interface AppSidebarProps {
  theme: Theme;
  colorScheme: 'light' | 'dark';
  visible: boolean;
  animationValue: Animated.Value; // 0 = hidden, 1 = visible
  developerMode: boolean;
  agentId?: string;
  onClose: () => void;
  onMemoryPress: () => void;
  onSettingsPress: () => void;
  onThemeToggle: () => void;
  onRefreshAgent: () => Promise<void>;
  onLogout: () => void;
}

export function AppSidebar({
  theme,
  colorScheme,
  visible,
  animationValue,
  developerMode,
  agentId,
  onClose,
  onMemoryPress,
  onSettingsPress,
  onThemeToggle,
  onRefreshAgent,
  onLogout,
}: AppSidebarProps) {
  const insets = useSafeAreaInsets();

  const handleRefreshAgent = async () => {
    const confirmed =
      Platform.OS === 'web'
        ? window.confirm(
            'This will delete the current co agent and create a new one. All conversation history will be lost. Are you sure?'
          )
        : await new Promise<boolean>((resolve) => {
            Alert.alert(
              'Refresh Co Agent',
              'This will delete the current co agent and create a new one. All conversation history will be lost. Are you sure?',
              [
                { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Refresh', style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });

    if (!confirmed) return;

    onClose();
    await onRefreshAgent();
  };

  const handleOpenInBrowser = () => {
    if (agentId) {
      Linking.openURL(`https://app.letta.com/agents/${agentId}`);
    }
  };

  return (
    <Animated.View
      style={[
        styles.sidebarContainer,
        {
          paddingTop: insets.top,
          backgroundColor: theme.colors.background.secondary,
          borderRightColor: theme.colors.border.primary,
          width: animationValue.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 280],
          }),
        },
      ]}
    >
      <View
        style={[
          styles.sidebarHeader,
          { borderBottomColor: theme.colors.border.primary },
        ]}
      >
        <Text style={[styles.sidebarTitle, { color: theme.colors.text.primary }]}>
          Menu
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.closeSidebar}>
          <Ionicons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ flexGrow: 1 }}
        ListHeaderComponent={
          <View style={styles.menuItems}>
            {/* Memory */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.border.primary },
              ]}
              onPress={() => {
                onClose();
                onMemoryPress();
              }}
            >
              <Ionicons
                name="library-outline"
                size={24}
                color={theme.colors.text.primary}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>
                Memory
              </Text>
            </TouchableOpacity>

            {/* Settings */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.border.primary },
              ]}
              onPress={() => {
                onClose();
                onSettingsPress();
              }}
            >
              <Ionicons
                name="settings-outline"
                size={24}
                color={theme.colors.text.primary}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>
                Settings
              </Text>
            </TouchableOpacity>

            {/* Theme Toggle */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.border.primary },
              ]}
              onPress={onThemeToggle}
            >
              <Ionicons
                name={colorScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={24}
                color={theme.colors.text.primary}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>
                {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </Text>
            </TouchableOpacity>

            {/* Open in Browser */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.border.primary },
              ]}
              onPress={handleOpenInBrowser}
              disabled={!agentId}
            >
              <Ionicons
                name="open-outline"
                size={24}
                color={theme.colors.text.primary}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>
                Open in Browser
              </Text>
            </TouchableOpacity>

            {/* Refresh Co (Developer Mode Only) */}
            {developerMode && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { borderBottomColor: theme.colors.border.primary },
                ]}
                onPress={handleRefreshAgent}
              >
                <Ionicons
                  name="refresh-outline"
                  size={24}
                  color={theme.colors.status.error}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.colors.status.error },
                  ]}
                >
                  Refresh Co
                </Text>
              </TouchableOpacity>
            )}

            {/* Logout */}
            <TouchableOpacity
              style={[
                styles.menuItem,
                { borderBottomColor: theme.colors.border.primary },
              ]}
              onPress={() => {
                onClose();
                onLogout();
              }}
            >
              <Ionicons
                name="log-out-outline"
                size={24}
                color={theme.colors.text.primary}
              />
              <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>
                Logout
              </Text>
            </TouchableOpacity>
          </View>
        }
        data={[]}
        renderItem={() => null}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sidebarContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1000,
    borderRightWidth: 1,
    overflow: 'hidden',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeSidebar: {
    padding: 8,
  },
  sidebarTitle: {
    fontSize: 24,
    fontFamily: 'Lexend_700Bold',
  },
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    marginLeft: 16,
  },
});

export default AppSidebar;
