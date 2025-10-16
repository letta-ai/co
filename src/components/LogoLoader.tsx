import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';

interface LogoLoaderProps {
  // Pass a require('...') or an imported JSON
  source?: any;
  loop?: boolean;
  autoPlay?: boolean;
  size?: number; // square size in px
}

const LogoLoader: React.FC<LogoLoaderProps> = ({
  source,
  loop = true,
  autoPlay = true,
  size = 160,
}) => {
  // If Lottie is not available or source not provided, use ActivityIndicator
  if (!source) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  // Dynamically import LottieView only if needed
  let LottieView: any;
  try {
    LottieView = require('lottie-react-native').default;
  } catch (e) {
    // Fallback to ActivityIndicator if Lottie is not available
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LottieView
        source={source}
        autoPlay={autoPlay}
        loop={loop}
        style={{ width: size, height: size }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LogoLoader;
