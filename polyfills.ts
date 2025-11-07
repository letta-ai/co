/**
 * Polyfills for React Native
 *
 * React Native doesn't have native support for:
 * - TextEncoder/TextDecoder - needed by some libraries
 * - Base64 encoding - needed for file uploads
 * - URL parsing - needed for API calls
 *
 * This file loads polyfills to add these missing APIs.
 */

import { Platform } from 'react-native';

// Only apply polyfills on native platforms
if (Platform.OS !== 'web') {
  console.log('🔧 Loading polyfills for React Native...');
  
  // Load basic polyfills (encoding, base64, URL)
  require('react-native-polyfill-globals/src/encoding');
  require('react-native-polyfill-globals/src/base64');
  require('react-native-polyfill-globals/src/url');
  
  console.log('✅ Basic polyfills loaded (encoding, base64, URL)');
} else {
  console.log('🌐 Running on web, no polyfills needed');
}
