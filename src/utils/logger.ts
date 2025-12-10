/**
 * Centralized Logger Utility
 *
 * Environment-aware logging that only outputs in development mode.
 * Use this instead of console.log/warn/error throughout the app.
 */

const isDev = __DEV__;

export const logger = {
  debug: (...args: unknown[]) => {
    if (isDev) console.log('[DEBUG]', ...args);
  },
  info: (...args: unknown[]) => {
    if (isDev) console.log('[INFO]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (isDev) console.warn('[WARN]', ...args);
  },
  error: (...args: unknown[]) => {
    // Errors always log, but only with details in dev
    if (isDev) {
      console.error('[ERROR]', ...args);
    } else {
      // In production, log minimal error info
      const message = args[0];
      if (typeof message === 'string') {
        console.error('[ERROR]', message);
      }
    }
  },
};

export default logger;
