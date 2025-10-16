import { useCallback } from 'react';
import { Alert } from 'react-native';

/**
 * Centralized error handling hook
 */
export function useErrorHandler() {
  const showError = useCallback((error: Error | string, title: string = 'Error') => {
    const message = typeof error === 'string' ? error : error.message;
    console.error(`[Error Handler] ${title}:`, error);
    Alert.alert(title, message);
  }, []);

  const showConfirm = useCallback(
    (title: string, message: string, onConfirm: () => void, onCancel?: () => void) => {
      Alert.alert(title, message, [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
        { text: 'OK', onPress: onConfirm },
      ]);
    },
    []
  );

  return {
    showError,
    showConfirm,
  };
}
