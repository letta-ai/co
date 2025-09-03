import { Platform } from 'react-native';
import { Alert } from 'react-native';

export interface PromptOptions {
  title: string;
  message: string;
  placeholder?: string;
  defaultValue?: string;
  onConfirm: (text: string) => void;
  onCancel?: () => void;
}

export const showPrompt = (options: PromptOptions): void => {
  const { title, message, placeholder, defaultValue, onConfirm, onCancel } = options;

  if (Platform.OS === 'web') {
    // Use native browser prompt for web
    const result = prompt(`${title}\n\n${message}`, defaultValue || '');
    if (result !== null && result.trim()) {
      onConfirm(result.trim());
    } else if (onCancel) {
      onCancel();
    }
  } else {
    // Use React Native Alert.prompt for mobile
    Alert.prompt(
      title,
      message,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: onCancel,
        },
        {
          text: 'Create',
          onPress: (text) => {
            if (text && text.trim()) {
              onConfirm(text.trim());
            } else if (onCancel) {
              onCancel();
            }
          },
        },
      ],
      'plain-text',
      defaultValue,
      placeholder
    );
  }
};

export const showAlert = (title: string, message: string, onPress?: () => void): void => {
  Alert.alert(title, message, onPress ? [{ text: 'OK', onPress }] : undefined);
};

export const showConfirmAlert = (
  title: string,
  message: string,
  onConfirm: () => void,
  onCancel?: () => void,
  confirmText: string = 'OK',
  cancelText: string = 'Cancel'
): void => {
  Alert.alert(
    title,
    message,
    [
      {
        text: cancelText,
        style: 'cancel',
        onPress: onCancel,
      },
      {
        text: confirmText,
        style: 'destructive',
        onPress: onConfirm,
      },
    ]
  );
};