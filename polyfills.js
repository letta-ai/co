/**
 * Polyfills for React Native to support Web Streams API and Crypto
 * Required for Letta SDK streaming functionality
 */

// IMPORTANT: Import crypto polyfill FIRST before anything else
// This provides secure random number generation required by many libraries
import 'react-native-get-random-values';

// Only apply polyfills in React Native environment (not web)
if (typeof global !== 'undefined' && !global.ReadableStream) {
  const { ReadableStream, WritableStream, TransformStream } = require('web-streams-polyfill');

  global.ReadableStream = ReadableStream;
  global.WritableStream = WritableStream;
  global.TransformStream = TransformStream;

  // Also polyfill TextEncoder/TextDecoder which are often needed with streams
  if (!global.TextEncoder) {
    global.TextEncoder = require('text-encoding').TextEncoder;
  }
  if (!global.TextDecoder) {
    global.TextDecoder = require('text-encoding').TextDecoder;
  }

  console.log('[Polyfill] Web Streams API polyfill loaded');
}
