import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  RefreshControl,
  Alert,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import lettaApi from './src/api/lettaApi';
import { darkTheme } from './src/theme';
import type { LettaAgent, Project } from './src/types/letta';

interface AgentSelectorScreenProps {
  currentProject: Project | null;
  onAgentSelect: (agent: LettaAgent) => void;
  onProjectPress: () => void;
  onCreateAgent: () => void;
  onLogout: () => void;
}

export default function AgentSelectorScreen({
  currentProject,
  onAgentSelect,
  onProjectPress,
  onCreateAgent,
  onLogout,
}: AgentSelectorScreenProps) {
  const colorScheme = useColorScheme();
  const [agents, setAgents] = useState<LettaAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const logoSource = colorScheme === 'dark'
    ? require('./assets/animations/Dark-sygnetrotate2.json')
    : require('./assets/animations/Light-sygnetrotate2.json');
  const LogoLoader = require('./src/components/LogoLoader').default;

  const loadAgents = async (isRefresh = false) => {
    if (!currentProject) {
      setAgents([]);
      setIsLoading(false);
      return;
    }

    try {
      if (!isRefresh) setIsLoading(true);
      
      const agentList = await lettaApi.listAgentsForProject(currentProject.id, {
        sortBy: 'last_run_completion',
        limit: 50,
      });
      
      setAgents(agentList);
    } catch (error: any) {
      console.error('Failed to load agents:', error);
      Alert.alert('Error', 'Failed to load agents: ' + error.message);
    } finally {
      setIsLoading(false);
      if (isRefresh) setIsRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadAgents(true);
  };

  useEffect(() => {
    loadAgents();
  }, [currentProject]);

  const formatLastActive = (lastRunCompletion?: string): string => {
    if (!lastRunCompletion) return 'Never active';
    
    const now = new Date();
    const lastActive = new Date(lastRunCompletion);
    const diffMs = now.getTime() - lastActive.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return lastActive.toLocaleDateString();
  };

  const getAgentInitials = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading && !isRefreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.projectSelector} onPress={onProjectPress}>
            <Text style={styles.projectName}>
              {currentProject ? currentProject.name : 'Select Project'}
            </Text>
            <Text style={styles.projectInfo}>Tap to change project</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.logoutButton}>Logout</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.loadingContainer}>
          <LogoLoader source={logoSource} size={120} />
          <Text style={styles.loadingText}>Loading agents...</Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.projectSelector} onPress={onProjectPress}>
          <Text style={styles.projectName}>
            {currentProject ? currentProject.name : 'Select Project'}
          </Text>
          <Text style={styles.projectInfo}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={onCreateAgent} style={styles.createButton}>
            <Text style={styles.createButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onLogout}>
            <Text style={styles.logoutButton}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.agentList}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      >
        {!currentProject ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Select a project to view agents</Text>
          </View>
        ) : agents.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No agents found</Text>
            <TouchableOpacity onPress={onCreateAgent} style={styles.createFirstButton}>
              <Text style={styles.createFirstButtonText}>Create your first agent</Text>
            </TouchableOpacity>
          </View>
        ) : (
          agents.map((agent) => (
            <TouchableOpacity
              key={agent.id}
              style={styles.agentItem}
              onPress={() => onAgentSelect(agent)}
            >
              <View style={styles.agentAvatar}>
                <Text style={styles.agentAvatarText}>
                  {getAgentInitials(agent.name)}
                </Text>
              </View>
              
              <View style={styles.agentInfo}>
                <View style={styles.agentHeader}>
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.lastActive}>
                    {formatLastActive(agent.last_run_completion)}
                  </Text>
                </View>
                
                <Text style={styles.agentDescription} numberOfLines={1}>
                  {agent.description || agent.system || 'No description'}
                </Text>
                
                {agent.tags && agent.tags.length > 0 && (
                  <View style={styles.tagsContainer}>
                    {agent.tags.slice(0, 3).map((tag, index) => (
                      <View key={index} style={styles.tag}>
                        <Text style={styles.tagText}>{tag}</Text>
                      </View>
                    ))}
                    {agent.tags.length > 3 && (
                      <Text style={styles.moreTagsText}>+{agent.tags.length - 3}</Text>
                    )}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: darkTheme.colors.background.tertiary,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
  },
  projectSelector: {
    flex: 1,
  },
  projectName: {
    fontSize: 20,
    fontWeight: '600',
    color: darkTheme.colors.text.primary,
  },
  projectInfo: {
    fontSize: 12,
    color: darkTheme.colors.text.secondary,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  createButton: {
    marginRight: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 20,
    color: '#fff',
    fontWeight: '300',
  },
  logoutButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  agentList: {
    flex: 1,
  },
  agentItem: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    alignItems: 'center',
  },
  agentAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  agentAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  agentInfo: {
    flex: 1,
  },
  agentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  lastActive: {
    fontSize: 12,
    color: '#666',
  },
  agentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: '#f0f0f0',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 4,
    marginTop: 2,
  },
  tagText: {
    fontSize: 11,
    color: '#666',
  },
  moreTagsText: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  createFirstButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  createFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
