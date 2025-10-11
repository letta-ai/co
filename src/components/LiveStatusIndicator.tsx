import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { darkTheme } from '../theme';

interface LiveStatusIndicatorProps {
  status: string; // e.g., "thinking", "searching the web", "saying"
}

const LiveStatusIndicator: React.FC<LiveStatusIndicatorProps> = ({ status }) => {
  const rainbowAnimValue = useRef(new Animated.Value(0)).current;

  // Animate rainbow gradient
  useEffect(() => {
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
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>(</Text>
      <Animated.Text
        style={[
          styles.coText,
          {
            color: rainbowAnimValue.interpolate({
              inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
              outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
            })
          }
        ]}
      >
        co
      </Animated.Text>
      <Text style={styles.text}> is {status})</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    paddingVertical: 4,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
    color: darkTheme.colors.text.secondary,
  },
  coText: {
    fontSize: 14,
    fontFamily: 'Lexend_600SemiBold',
  },
});

export default React.memo(LiveStatusIndicator);
