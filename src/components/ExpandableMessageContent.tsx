import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, UIManager } from 'react-native';
import MessageContent from './MessageContent';
import { darkTheme } from '../theme';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface ExpandableMessageContentProps {
  content: string;
  isUser: boolean;
  lineLimit?: number;
  onToggle?: (expanding: boolean) => void;
}

const ExpandableMessageContent: React.FC<ExpandableMessageContentProps> = ({
  content,
  isUser,
  lineLimit = 3,
  onToggle
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [shouldShowToggle, setShouldShowToggle] = useState(false);

  // Only apply expandable behavior to user messages
  if (!isUser) {
    return <MessageContent content={content} isUser={isUser} />;
  }

  // Simple heuristic: estimate if content would exceed line limit
  // Assuming average ~60 chars per line in the chat bubble
  const estimatedLines = content.length / 60;
  const hasLineBreaks = (content.match(/\n/g) || []).length;
  const totalEstimatedLines = Math.max(estimatedLines, hasLineBreaks + 1);

  // Show toggle if content is likely to exceed limit
  const showToggle = totalEstimatedLines > lineLimit;

  if (!showToggle) {
    return <MessageContent content={content} isUser={isUser} />;
  }

  const handleToggle = useCallback(() => {
    const nextExpanded = !isExpanded;
    // Notify parent before state change
    onToggle?.(nextExpanded);
    // Avoid global LayoutAnimation to prevent list flicker; just toggle state
    setIsExpanded(nextExpanded);
  }, [isExpanded, onToggle]);

  return (
    <View>
      <View style={isExpanded ? undefined : styles.collapsedContainer}>
        <MessageContent
          content={isExpanded ? content : content.slice(0, 180) + '...'}
          isUser={isUser}
        />
      </View>
      <TouchableOpacity
        onPress={handleToggle}
        style={styles.toggleButton}
        activeOpacity={0.7}
      >
        <Text style={styles.toggleText}>
          {isExpanded ? 'See less' : 'See more'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  collapsedContainer: {
    maxHeight: 72, // Approximately 3 lines with standard font size
    overflow: 'hidden',
  },
  toggleButton: {
    marginTop: 4,
    paddingVertical: 2,
  },
  toggleText: {
    color: darkTheme.colors.text.inverse,
    fontSize: 13,
    fontWeight: '500',
    opacity: 0.8,
  },
});

export default ExpandableMessageContent;
