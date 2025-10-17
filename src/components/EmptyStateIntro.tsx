/**
 * EmptyStateIntro Component
 *
 * Displays the welcome message when the chat is empty (no messages yet).
 *
 * Features:
 * - Large "co" text with rainbow color animation
 * - Welcome message: "I'm co, your thinking partner."
 * - Centered layout above the input box
 *
 * This creates a friendly first-time experience and guides users
 * on what co is and what to expect.
 */

import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { RAINBOW_COLORS } from '../hooks/useRainbowAnimation';
import type { Theme } from '../theme';

interface EmptyStateIntroProps {
  rainbowAnimValue: Animated.Value;
  theme: Theme;
}

export const EmptyStateIntro: React.FC<EmptyStateIntroProps> = ({
  rainbowAnimValue,
  theme,
}) => {
  return (
    <View style={styles.container}>
      {/* Large rainbow "co" text */}
      <Animated.Text
        style={[
          styles.coText,
          {
            color: rainbowAnimValue.interpolate({
              inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
              outputRange: RAINBOW_COLORS,
            }),
          },
        ]}
      >
        co
      </Animated.Text>

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
