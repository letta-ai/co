/**
 * File Upload Utility
 *
 * Handles document file picking and upload for file attachments.
 * Supports web, iOS, and Android platforms.
 *
 * This utility is used by MessageInputEnhanced to handle document uploads.
 */

import { Platform, Alert } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export interface FilePickerResult {
  name: string;
  size: number;
  type: string;
  file: File; // Web File object
  uri?: string; // Mobile URI
}

/**
 * Opens a file picker for document selection
 *
 * @returns Promise<FilePickerResult | null> - Selected file info or null if cancelled
 */
export async function pickFile(): Promise<FilePickerResult | null> {
  // Web platform - use HTML file input
  if (Platform.OS === 'web') {
    return pickFileWeb();
  }

  // Mobile platforms (iOS/Android) - use expo-document-picker
  return pickFileMobile();
}

/**
 * Web file picker implementation
 */
async function pickFileWeb(): Promise<FilePickerResult | null> {
  return new Promise((resolve) => {
    try {
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

      input.click();
    } catch (error) {
      console.error('Error creating file picker:', error);
      Alert.alert('Error', 'Failed to open file picker');
      resolve(null);
    }
  });
}

/**
 * Mobile file picker implementation (iOS/Android)
 */
async function pickFileMobile(): Promise<FilePickerResult | null> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'text/plain', 'text/markdown', 'application/json', 
             'text/csv', 'application/msword', 
             'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return null;
    }

    const asset = result.assets[0];
    if (!asset) {
      return null;
    }

    console.log('Selected file:', asset.name, 'size:', asset.size, 'type:', asset.mimeType);

    // Check file size (10MB limit)
    const MAX_SIZE = 10 * 1024 * 1024;
    if (asset.size && asset.size > MAX_SIZE) {
      const sizeMB = (asset.size / 1024 / 1024).toFixed(2);
      Alert.alert(
        'File Too Large',
        `This file is ${sizeMB}MB. Maximum allowed is 10MB.`
      );
      return null;
    }

    // For mobile, we need to convert the URI to a File object for upload
    // We'll fetch the file content and create a blob
    const response = await fetch(asset.uri);
    const blob = await response.blob();
    const file = new File([blob], asset.name, { type: asset.mimeType || 'application/octet-stream' });

    return {
      name: asset.name,
      size: asset.size || blob.size,
      type: asset.mimeType || 'application/octet-stream',
      file,
      uri: asset.uri,
    };
  } catch (error) {
    console.error('Error picking file:', error);
    Alert.alert('Error', 'Failed to pick file');
    return null;
  }
}
