/**
 * EmptyStateIntro Component
 *
 * Displays the welcome message when the chat is empty (no messages yet).
 *
 * Features:
 * - Large "co" text
 * - Welcome message: "I'm co, your thinking partner."
 * - Centered layout above the input box
 *
 * This creates a friendly first-time experience and guides users
 * on what co is and what to expect.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Theme } from '../theme';

interface EmptyStateIntroProps {
  theme: Theme;
}

export const EmptyStateIntro: React.FC<EmptyStateIntroProps> = ({
  theme,
}) => {
  return (
    <View style={styles.container}>
      {/* Large "co" text */}
      <Text
        style={[
          styles.coText,
          { color: theme.colors.text.primary },
        ]}
      >
        co
      </Text>

      {/* Welcome message */}
      <Text style={[styles.welcomeText, { color: theme.colors.text.primary }]}>
        I'm co, your thinking partner.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: 0,
  },
  coText: {
    fontSize: 72,
    fontFamily: 'Lexend_700Bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 18,
    lineHeight: 28,
    marginBottom: 32,
    fontFamily: 'Lexend_400Regular',
    textAlign: 'center',
  },
});

export default EmptyStateIntro;
