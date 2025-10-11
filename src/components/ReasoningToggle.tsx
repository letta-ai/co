import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme } from '../theme';

interface ReasoningToggleProps {
  reasoning: string;
  messageId?: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  customToggleContent?: React.ReactNode;
  hideChevron?: boolean;
}

const ReasoningToggle: React.FC<ReasoningToggleProps> = ({
  reasoning,
  messageId,
  isExpanded: externalExpanded,
  onToggle: externalOnToggle,
  customToggleContent,
  hideChevron = false
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const rainbowAnimValue = useRef(new Animated.Value(0)).current;

  // Use external state if provided, otherwise use internal
  const isExpanded = externalExpanded !== undefined ? externalExpanded : internalExpanded;
  const handleToggle = externalOnToggle || (() => setInternalExpanded(!internalExpanded));

  // Animate rainbow gradient when reasoning is expanded
  useEffect(() => {
    if (isExpanded) {
      rainbowAnimValue.setValue(0);
      const animation = Animated.loop(
        Animated.timing(rainbowAnimValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      );
      animation.start();
      return () => animation.stop();
    }
  }, [isExpanded]);

  return (
    <>
      <TouchableOpacity
        onPress={handleToggle}
        style={styles.reasoningToggle}
      >
        {customToggleContent ? (
          customToggleContent
        ) : (
          <>
            <Text style={styles.reasoningToggleText}>(co thought)</Text>
            {!hideChevron && (
              <Ionicons
                name={isExpanded ? "chevron-up" : "chevron-down"}
                size={18}
                color={darkTheme.colors.text.tertiary}
                style={{ marginLeft: 4 }}
              />
            )}
          </>
        )}
      </TouchableOpacity>
      {isExpanded && (
        <Animated.View style={[
          styles.reasoningExpandedContainer,
          {
            borderLeftColor: rainbowAnimValue.interpolate({
              inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
              outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
            }),
          }
        ]}>
          <Text style={styles.reasoningExpandedText}>{reasoning}</Text>
        </Animated.View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    marginBottom: 8,
  },
  reasoningToggleText: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
    color: darkTheme.colors.text.secondary,
  },
  reasoningExpandedContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#555555',
    overflow: 'hidden',
  },
  reasoningExpandedText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
    lineHeight: 22,
    fontStyle: 'normal',
  },
});

export default React.memo(ReasoningToggle);
