import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Platform-specific imports
let SecureStore: any = null;

try {
  // Only import SecureStore on native platforms
  if (Platform.OS !== 'web') {
    SecureStore = require('expo-secure-store');
  }
} catch (error) {
  console.warn('SecureStore not available:', error);
}

/**
 * Cross-platform secure storage utility
 * - Uses expo-secure-store on native platforms for encrypted storage
 * - Falls back to AsyncStorage on web platform
 */
export class Storage {
  private static isNative(): boolean {
    return Platform.OS !== 'web' && SecureStore !== null;
  }

  static async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.isNative()) {
        await SecureStore.setItemAsync(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw new Error(`Failed to store item with key: ${key}`);
    }
  }

  static async getItem(key: string): Promise<string | null> {
    try {
      if (this.isNative()) {
        return await SecureStore.getItemAsync(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  static async removeItem(key: string): Promise<void> {
    try {
      if (this.isNative()) {
        await SecureStore.deleteItemAsync(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw new Error(`Failed to remove item with key: ${key}`);
    }
  }

  static async clear(): Promise<void> {
    try {
      if (this.isNative()) {
        // SecureStore doesn't have a clear method, so we can't clear everything
        console.warn('SecureStore does not support clearing all items');
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      throw new Error('Failed to clear storage');
    }
  }

  static getStorageType(): 'SecureStore' | 'AsyncStorage' {
    return this.isNative() ? 'SecureStore' : 'AsyncStorage';
  }
}

export default Storage;