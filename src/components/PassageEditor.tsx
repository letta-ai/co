import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Dimensions,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { darkTheme, lightTheme } from '../theme';
import type { Passage } from '../types/letta';

interface PassageEditorProps {
  passage: Passage | null; // null = create new, object = edit existing
  isVisible: boolean;
  onClose: () => void;
  onSave: (text: string, tags: string[]) => Promise<void>;
  isDark?: boolean;
  isDesktop: boolean;
}

const PassageEditor: React.FC<PassageEditorProps> = ({
  passage,
  isVisible,
  onClose,
  onSave,
  isDark = true,
  isDesktop,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [text, setText] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when passage changes or visibility changes
  useEffect(() => {
    if (isVisible) {
      setText(passage?.text || '');
      setTagsInput(passage?.tags?.join(', ') || '');
      setError(null);
    }
  }, [passage, isVisible]);

  useEffect(() => {
    if (isVisible) {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isVisible]);

  const handleSave = async () => {
    if (!text.trim()) {
      setError('Please enter some text for the memory.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await onSave(text.trim(), tags);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save memory');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isVisible) return null;

  const isEditing = !!passage;
  const title = isEditing ? 'Edit Memory' : 'New Memory';

  const content = (
    <>
      <View style={[styles.header, { borderBottomColor: theme.colors.border.primary }]}>
        <View style={styles.headerLeft}>
          <Ionicons name="archive-outline" size={20} color={theme.colors.text.tertiary} />
          <Text style={[styles.headerLabel, { color: theme.colors.text.tertiary }]}>
            {title.toUpperCase()}
          </Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeButton} disabled={isSaving}>
          <Ionicons name="close" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>
          Memory Content
        </Text>
        <TextInput
          style={[
            styles.textArea,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.tertiary,
              borderColor: theme.colors.border.primary,
            },
          ]}
          placeholder="Enter the memory text..."
          placeholderTextColor={theme.colors.text.tertiary}
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={8}
          textAlignVertical="top"
          editable={!isSaving}
        />

        <Text style={[styles.inputLabel, { color: theme.colors.text.secondary, marginTop: 20 }]}>
          Tags (comma-separated, optional)
        </Text>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.colors.text.primary,
              backgroundColor: theme.colors.background.tertiary,
              borderColor: theme.colors.border.primary,
            },
          ]}
          placeholder="e.g., personal, preference, work"
          placeholderTextColor={theme.colors.text.tertiary}
          value={tagsInput}
          onChangeText={setTagsInput}
          editable={!isSaving}
        />

        {error && (
          <Text style={[styles.errorText, { color: theme.colors.status.error }]}>{error}</Text>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: theme.colors.text.primary,
              opacity: isSaving || !text.trim() ? 0.5 : 1,
            },
          ]}
          onPress={handleSave}
          disabled={isSaving || !text.trim()}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={theme.colors.background.primary} />
          ) : (
            <Text style={[styles.saveButtonText, { color: theme.colors.background.primary }]}>
              {isEditing ? 'Update Memory' : 'Create Memory'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </>
  );

  if (isDesktop) {
    // Desktop: Right pane
    const panelWidth = slideAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 440],
    });

    return (
      <Animated.View
        style={[
          styles.desktopPane,
          {
            width: panelWidth,
            backgroundColor: theme.colors.background.primary,
            borderLeftColor: theme.colors.border.primary,
          },
        ]}
      >
        {content}
      </Animated.View>
    );
  } else {
    // Mobile: Full screen overlay
    return (
      <Animated.View
        style={[
          styles.mobileOverlay,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <Animated.View
            style={[
              styles.mobilePanel,
              {
                backgroundColor: theme.colors.background.primary,
                transform: [
                  {
                    translateY: slideAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Dimensions.get('window').height, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {content}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    );
  }
};

const styles = StyleSheet.create({
  // Desktop styles
  desktopPane: {
    borderLeftWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },

  // Mobile styles
  mobileOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  keyboardView: {
    flex: 1,
  },
  mobilePanel: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },

  // Shared styles
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerLabel: {
    fontSize: 12,
    fontFamily: 'Lexend_600SemiBold',
    letterSpacing: 1.2,
  },
  closeButton: {
    padding: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
    marginBottom: 8,
  },
  textArea: {
    minHeight: 160,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 22,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    marginTop: 12,
  },
  saveButton: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: 'Lexend_600SemiBold',
  },
});

export default PassageEditor;
