import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

interface MessageInputV2Props {
  onSend: (text: string) => void;
  disabled?: boolean;
  theme: any;
  selectedImages: Array<{ uri: string; base64: string; mediaType: string }>;
  onAddImage: (image: { uri: string; base64: string; mediaType: string }) => void;
  onRemoveImage: (index: number) => void;
}

export const MessageInputV2: React.FC<MessageInputV2Props> = ({
  onSend,
  disabled = false,
  theme,
  selectedImages,
  onAddImage,
  onRemoveImage,
}) => {
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    if ((inputText.trim() || selectedImages.length > 0) && !disabled) {
      onSend(inputText);
      setInputText('');
    }
  }, [inputText, selectedImages, disabled, onSend]);

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        if (asset.base64) {
          const MAX_SIZE = 5 * 1024 * 1024;
          if (asset.base64.length > MAX_SIZE) {
            const sizeMB = (asset.base64.length / 1024 / 1024).toFixed(2);
            Alert.alert(
              'Image Too Large',
              `This image is ${sizeMB}MB. Maximum allowed is 5MB.`
            );
            return;
          }

          const mediaType = asset.uri.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
            asset.uri.match(/\.png$/i) ? 'image/png' :
            asset.uri.match(/\.gif$/i) ? 'image/gif' :
            asset.uri.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg';

          onAddImage({
            uri: asset.uri,
            base64: asset.base64,
            mediaType,
          });
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  return (
    <View style={styles.container}>
      {/* Selected Images Preview */}
      {selectedImages.length > 0 && (
        <ScrollView
          horizontal
          style={styles.imagesPreview}
          contentContainerStyle={styles.imagesPreviewContent}
        >
          {selectedImages.map((img, index) => (
            <View key={index} style={styles.imagePreviewContainer}>
              <Image source={{ uri: img.uri }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageButton}
                onPress={() => onRemoveImage(index)}
              >
                <Ionicons name="close-circle" size={24} color="#ff4444" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Input Row */}
      <View style={styles.inputRow}>
        <TouchableOpacity
          style={styles.attachButton}
          onPress={pickImage}
          disabled={disabled}
        >
          <Ionicons
            name="image-outline"
            size={24}
            color={disabled ? theme.colors.text.tertiary : theme.colors.text.secondary}
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.tertiary,
            },
          ]}
          placeholder="What's on your mind?"
          placeholderTextColor={theme.colors.text.tertiary}
          value={inputText}
          onChangeText={setInputText}
          multiline
          maxLength={4000}
          editable={!disabled}
          onSubmitEditing={handleSend}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (inputText.trim() || selectedImages.length > 0) && !disabled
              ? { opacity: 1, backgroundColor: theme.colors.interactive.primary }
              : { opacity: 0.4, backgroundColor: 'rgba(239, 160, 78, 0.1)' },
          ]}
          onPress={handleSend}
          disabled={disabled || (!inputText.trim() && selectedImages.length === 0)}
        >
          <Ionicons
            name="send"
            size={18}
            color={(inputText.trim() || selectedImages.length > 0) && !disabled ? '#ffffff' : theme.colors.text.tertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  imagesPreview: {
    marginBottom: 8,
  },
  imagesPreviewContent: {
    paddingVertical: 4,
  },
  imagePreviewContainer: {
    marginRight: 8,
    position: 'relative',
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    fontSize: 15,
    lineHeight: 20,
    borderWidth: 0,
    fontFamily: 'Lexend_400Regular',
    ...(Platform.OS === 'web' && {
      // @ts-ignore - outlineStyle is web-only
      outlineStyle: 'none',
    }),
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 160, 78, 0.1)',
  },
});

export default MessageInputV2;
