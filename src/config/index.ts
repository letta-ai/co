/**
 * Application configuration
 * Centralized configuration for the entire app
 */

export const config = {
  api: {
    baseURL: process.env.EXPO_PUBLIC_API_URL || 'https://api.letta.com',
    timeout: 120000, // 2 minutes - agent creation with sleeptime can take a while
    retries: 3,
    retryDelay: 1000,
  },

  features: {
    enableSleeptime: true,
    maxImageSize: 5 * 1024 * 1024, // 5MB
    messagePageSize: 50,
    initialMessageLoad: 100,
    developerMode: true,
  },

  ui: {
    animationDuration: 400,
    debounceDelay: 300,
    scrollToBottomDelay: 100,
  },

  app: {
    name: 'Co',
    version: '1.0.0',
    description: 'A comprehensive knowledge management assistant',
  },
} as const;

export type Config = typeof config;
