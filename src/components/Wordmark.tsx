import React from 'react';
import { useColorScheme, View, StyleSheet } from 'react-native';
import DarkWordmark from '../../assets/wordmarks/wordmark-darkmode.svg';
import LightWordmark from '../../assets/wordmarks/wordmark-lightmode.svg';

interface WordmarkProps {
  width?: number;
  height?: number;
}

const Wordmark: React.FC<WordmarkProps> = ({ width = 160, height = 28 }) => {
  const scheme = useColorScheme();
  const Svg = scheme === 'dark' ? DarkWordmark : LightWordmark;
  return (
    <View style={styles.container}>
      <Svg width={width} height={height} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default Wordmark;
