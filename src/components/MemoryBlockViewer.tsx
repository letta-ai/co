import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  ScrollView,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import MessageContent from './MessageContent';
import { darkTheme, lightTheme } from '../theme';
import type { MemoryBlock } from '../types/letta';

interface MemoryBlockViewerProps {
  block: MemoryBlock | null;
  onClose: () => void;
  isDark?: boolean;
  isDesktop: boolean;
}

const MemoryBlockViewer: React.FC<MemoryBlockViewerProps> = ({
  block,
  onClose,
  isDark = true,
  isDesktop,
}) => {
  const theme = isDark ? darkTheme : lightTheme;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (block) {
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
  }, [block]);

  if (!block) return null;

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
        <View style={[styles.desktopHeader, { borderBottomColor: theme.colors.border.primary }]}>
          <View style={styles.headerLeft}>
            <Ionicons name="cube-outline" size={20} color={theme.colors.text.tertiary} />
            <Text style={[styles.headerLabel, { color: theme.colors.text.tertiary }]}>
              KNOWLEDGE
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={true}
        >
          <View style={styles.blockContent}>
            <Text style={[styles.blockTitle, { color: theme.colors.text.primary }]}>
              {block.label}
            </Text>
            {block.description && (
              <Text style={[styles.blockDescription, { color: theme.colors.text.secondary }]}>
                {block.description}
              </Text>
            )}
            <View style={styles.divider} />
            <MessageContent content={block.value} isUser={false} isDark={isDark} />
          </View>
        </ScrollView>
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
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
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
          <View style={[styles.mobileHeader, { borderBottomColor: theme.colors.border.primary }]}>
            <View style={styles.headerLeft}>
              <Ionicons name="cube-outline" size={20} color={theme.colors.text.tertiary} />
              <Text style={[styles.headerLabel, { color: theme.colors.text.tertiary }]}>
                KNOWLEDGE
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollContent}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={true}
          >
            <View style={styles.blockContent}>
              <Text style={[styles.blockTitle, { color: theme.colors.text.primary }]}>
                {block.label}
              </Text>
              {block.description && (
                <Text style={[styles.blockDescription, { color: theme.colors.text.secondary }]}>
                  {block.description}
                </Text>
              )}
              <View style={styles.divider} />
              <MessageContent content={block.value} isUser={false} isDark={isDark} />
            </View>
          </ScrollView>
        </Animated.View>
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
  desktopHeader: {
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
  mobilePanel: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 10,
  },
  mobileHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
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
  blockContent: {
    flex: 1,
  },
  blockTitle: {
    fontSize: 24,
    fontFamily: 'Lexend_700Bold',
    marginBottom: 8,
  },
  blockDescription: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    marginBottom: 16,
    lineHeight: 20,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 20,
  },
});

export default MemoryBlockViewer;
