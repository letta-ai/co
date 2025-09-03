import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LettaAgent } from '../types/letta';

interface AgentCardProps {
  agent: LettaAgent;
  isSelected: boolean;
  onPress: () => void;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent, isSelected, onPress }) => {
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
              color={isSelected ? '#FFFFFF' : '#007AFF'} 
            />
          </View>
          <View style={styles.textContainer}>
            <Text 
              style={[styles.name, isSelected && styles.selectedText]}
              numberOfLines={1}
            >
              {agent.name}
            </Text>
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
          <Ionicons name="checkmark" size={16} color="#FFFFFF" />
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
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
    color: '#000000',
    marginBottom: 2,
  },
  selectedText: {
    color: '#FFFFFF',
  },
  date: {
    fontSize: 12,
    color: '#8E8E93',
  },
  selectedSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
  },
  description: {
    fontSize: 14,
    color: '#6D6D72',
    lineHeight: 18,
    marginBottom: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#F2F2F7',
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
    color: '#007AFF',
    fontWeight: '500',
  },
  selectedTagText: {
    color: '#FFFFFF',
  },
  moreText: {
    fontSize: 11,
    color: '#8E8E93',
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