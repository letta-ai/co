import React from 'react';
import { View, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';

interface LogoLoaderProps {
  // Pass a require('...') or an imported JSON
  source: any;
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
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LogoLoader;
