/**
 * File Upload Utility
 *
 * Handles document file picking and upload for file attachments.
 * Currently supports web platform only.
 *
 * This utility is used by MessageInputEnhanced to handle document uploads.
 * Mobile support can be added later using expo-document-picker.
 */

import { Platform, Alert } from 'react-native';

export interface FilePickerResult {
  name: string;
  size: number;
  type: string;
  file: File; // Web File object
}

/**
 * Opens a file picker for document selection
 *
 * @returns Promise<FilePickerResult | null> - Selected file info or null if cancelled
 */
export async function pickFile(): Promise<FilePickerResult | null> {
  if (Platform.OS !== 'web') {
    Alert.alert('Not Supported', 'File upload is currently only supported on web.');
    return null;
  }

  return new Promise((resolve) => {
    try {
      // Create file input element
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.txt,.md,.json,.csv,.doc,.docx';

      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        console.log('Selected file:', file.name, 'size:', file.size, 'type:', file.type);

        // Check file size (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          const sizeMB = (file.size / 1024 / 1024).toFixed(2);
          Alert.alert(
            'File Too Large',
            `This file is ${sizeMB}MB. Maximum allowed is 10MB.`
          );
          resolve(null);
          return;
        }

        resolve({
          name: file.name,
          size: file.size,
          type: file.type,
          file,
        });
      };

      input.oncancel = () => {
        resolve(null);
      };

      // Trigger file picker
      input.click();
    } catch (error) {
      console.error('Error creating file picker:', error);
      Alert.alert('Error', 'Failed to open file picker');
      resolve(null);
    }
  });
}
