import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { darkTheme } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { LettaAgent } from '../types/letta';

interface AgentCardProps {
  agent: LettaAgent;
  isSelected: boolean;
  onPress: () => void;
  isFavorited?: boolean;
  onToggleFavorite?: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isSelected, onPress, isFavorited, onToggleFavorite }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Ionicons
              name="person-outline"
              size={20}
              color={isSelected ? darkTheme.colors.text.inverse : darkTheme.colors.interactive.primary}
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.rowHeader}>
              <Text 
                style={[styles.name, isSelected && styles.selectedText]}
                numberOfLines={1}
              >
                {agent.name}
              </Text>
              {onToggleFavorite && (
                <TouchableOpacity
                  accessibilityLabel={isFavorited ? 'Unfavorite agent' : 'Favorite agent'}
                  onPress={onToggleFavorite}
                  style={styles.starBtn}
                >
                  <Ionicons name={isFavorited ? 'star' : 'star-outline'} size={16} color={isFavorited ? '#ffd166' : (isSelected ? darkTheme.colors.text.inverse : darkTheme.colors.text.secondary)} />
                </TouchableOpacity>
              )}
            </View>
            <Text 
              style={[styles.date, isSelected && styles.selectedSubtext]}
            >
              Created {formatDate(agent.created_at)}
            </Text>
          </View>
        </View>
        
        {agent.description && (
          <Text 
            style={[styles.description, isSelected && styles.selectedSubtext]}
            numberOfLines={2}
          >
            {agent.description}
          </Text>
        )}
        
        {agent.tags && agent.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {agent.tags.slice(0, 3).map((tag, index) => (
              <View 
                key={index} 
                style={[styles.tag, isSelected && styles.selectedTag]}
              >
                <Text 
                  style={[styles.tagText, isSelected && styles.selectedTagText]}
                >
                  {tag}
                </Text>
              </View>
            ))}
            {agent.tags.length > 3 && (
              <Text style={[styles.moreText, isSelected && styles.selectedSubtext]}>
                +{agent.tags.length - 3} more
              </Text>
            )}
          </View>
        )}
      </View>
      
      {isSelected && (
        <View style={styles.selectedIndicator}>
          <Ionicons name="checkmark" size={16} color={darkTheme.colors.text.inverse} />
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    backgroundColor: darkTheme.colors.background.tertiary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectedContainer: {
    backgroundColor: darkTheme.colors.interactive.primary,
    borderColor: darkTheme.colors.interactive.primary,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkTheme.colors.background.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.text.primary,
    marginBottom: 2,
  },
  starBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginLeft: 8,
  },
  selectedText: {
    color: darkTheme.colors.text.inverse,
  },
  date: {
    fontSize: 12,
    color: darkTheme.colors.text.secondary,
  },
  selectedSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  description: {
    fontSize: 14,
    color: darkTheme.colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: darkTheme.colors.background.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 6,
    marginBottom: 4,
  },
  selectedTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  tagText: {
    fontSize: 11,
    color: darkTheme.colors.interactive.primary,
    fontWeight: '500',
  },
  selectedTagText: {
    color: darkTheme.colors.text.inverse,
  },
  moreText: {
    fontSize: 11,
    color: darkTheme.colors.text.secondary,
    fontStyle: 'italic',
  },
  selectedIndicator: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AgentCard;
