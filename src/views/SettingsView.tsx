/**
 * SettingsView Component
 *
 * Application settings and preferences screen.
 *
 * Current Settings:
 * - Show Compaction: Toggle visualization of conversation compaction events
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Theme } from '../theme';

interface SettingsViewProps {
  theme: Theme;
  showCompaction: boolean;
  onToggleCompaction: () => void;
}

export function SettingsView({
  theme,
  showCompaction,
  onToggleCompaction,
}: SettingsViewProps) {
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: theme.colors.background.secondary,
            borderBottomColor: theme.colors.border.primary,
          },
        ]}
      >
        <Text style={[styles.title, { color: theme.colors.text.primary }]}>
          Settings
        </Text>
      </View>

      {/* Settings Content */}
      <View style={styles.content}>
        {/* Show Compaction Toggle */}
        <View
          style={[
            styles.settingItem,
            { borderBottomColor: theme.colors.border.primary },
          ]}
        >
          <View style={styles.settingInfo}>
            <Text style={[styles.settingLabel, { color: theme.colors.text.primary }]}>
              Show Compaction
            </Text>
            <Text
              style={[
                styles.settingDescription,
                { color: theme.colors.text.secondary },
              ]}
            >
              Display compaction bars when conversation history is summarized
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.toggle,
              showCompaction && [
                styles.toggleActive,
                { backgroundColor: theme.colors.interactive.primary },
              ],
              !showCompaction && {
                backgroundColor: theme.colors.background.tertiary,
              },
            ]}
            onPress={onToggleCompaction}
          >
            <View
              style={[
                styles.toggleThumb,
                showCompaction && styles.toggleThumbActive,
              ]}
            />
          </TouchableOpacity>
        </View>

        {/* Future settings can be added here */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Lexend_700Bold',
  },
  content: {
    flex: 1,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 18,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    // Background color set dynamically
  },
  toggleThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    transform: [{ translateX: 20 }],
  },
});

export default SettingsView;
