// Expo + SVG transformer config to import .svg as React components
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable react-native-svg-transformer
config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer');

// Treat SVGs as source, not assets
const { assetExts, sourceExts } = config.resolver;
config.resolver.assetExts = assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...sourceExts, 'svg'];

module.exports = config;

