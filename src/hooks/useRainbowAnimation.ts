/**
 * useRainbowAnimation Hook
 *
 * Manages the rainbow color cycling animation for the input box.
 *
 * Animation triggers when ANY of these conditions are true:
 * - Streaming in progress (agent is responding)
 * - Input is focused (user is typing)
 * - Reasoning blocks are expanded (user viewing agent thoughts)
 * - No messages yet (empty state / first time experience)
 *
 * Returns an Animated.Value that cycles through 6 rainbow colors
 * over 3 seconds in a continuous loop.
 *
 * Color sequence: Red -> Yellow -> Green -> Blue -> Purple -> Red
 */

import { useEffect, useRef } from 'react';
import { Animated } from 'react-native';

interface UseRainbowAnimationParams {
  isStreaming: boolean;
  isInputFocused: boolean;
  hasExpandedReasoning: boolean;
  hasMessages: boolean;
}

export function useRainbowAnimation({
  isStreaming,
  isInputFocused,
  hasExpandedReasoning,
  hasMessages,
}: UseRainbowAnimationParams) {
  const rainbowAnimValue = useRef(new Animated.Value(0)).current;

  // Determine if animation should be active
  const shouldAnimate = isStreaming || isInputFocused || hasExpandedReasoning || !hasMessages;

  useEffect(() => {
    if (shouldAnimate) {
      // Reset to start position
      rainbowAnimValue.setValue(0);

      // Create looping animation
      const animation = Animated.loop(
        Animated.timing(rainbowAnimValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false, // Color interpolation requires false
        })
      );

      animation.start();

      return () => {
        animation.stop();
      };
    } else {
      // Stop animation when conditions no longer met
      rainbowAnimValue.stopAnimation();
    }
  }, [shouldAnimate, rainbowAnimValue]);

  return {
    rainbowAnimValue,
    isAnimating: shouldAnimate,
  };
}

/**
 * Rainbow color interpolation configuration
 *
 * Use with Animated.Text or Animated.View:
 *
 * color: rainbowAnimValue.interpolate({
 *   inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
 *   outputRange: RAINBOW_COLORS
 * })
 */
export const RAINBOW_COLORS = [
  '#FF6B6B', // Red
  '#FFD93D', // Yellow
  '#6BCF7F', // Green
  '#4D96FF', // Blue
  '#9D4EDD', // Purple
  '#FF6B6B', // Red (loop back)
] as const;
