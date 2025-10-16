/**
 * Polyfills for React Native to support Web Streams API and Crypto
 * Required for Letta SDK streaming functionality
 */

// IMPORTANT: Import crypto polyfill FIRST before anything else
// This provides secure random number generation required by many libraries
import 'react-native-get-random-values';

// Manually polyfill web streams instead of using react-native-polyfill-globals/auto
// which has compatibility issues with newer web-streams-polyfill versions
if (typeof global !== 'undefined') {
  // Load web-streams-polyfill
  const webStreams = require('web-streams-polyfill');

  // Always override to ensure consistency across platforms
  global.ReadableStream = webStreams.ReadableStream;
  global.WritableStream = webStreams.WritableStream;
  global.TransformStream = webStreams.TransformStream;

  // Polyfill TextEncoder/TextDecoder
  if (!global.TextEncoder || !global.TextDecoder) {
    const encoding = require('text-encoding');
    global.TextEncoder = encoding.TextEncoder;
    global.TextDecoder = encoding.TextDecoder;
  }

  // Polyfill fetch if needed (usually provided by React Native)
  if (!global.fetch) {
    console.warn('[Polyfill] fetch not available - some features may not work');
  }

  // Polyfill URL and URLSearchParams if needed
  if (!global.URL) {
    try {
      const { URL, URLSearchParams } = require('react-native-url-polyfill');
      global.URL = URL;
      global.URLSearchParams = URLSearchParams;
    } catch (e) {
      console.warn('[Polyfill] URL polyfill not available:', e.message);
    }
  }

  console.log('[Polyfill] Web Streams API polyfill loaded');
  console.log('[Polyfill] ReadableStream:', typeof global.ReadableStream);
  console.log('[Polyfill] WritableStream:', typeof global.WritableStream);
  console.log('[Polyfill] TransformStream:', typeof global.TransformStream);
  console.log('[Polyfill] TextEncoder:', typeof global.TextEncoder);
  console.log('[Polyfill] TextDecoder:', typeof global.TextDecoder);
}
