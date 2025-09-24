import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AgentCard from './AgentCard';
import useAppStore from '../store/appStore';
import { darkTheme } from '../theme';
import { showPrompt, showAlert } from '../utils/prompts';

const AgentsDrawerContent: React.FC<DrawerContentComponentProps> = (props) => {
  const insets = useSafeAreaInsets();
  const {
    agents,
    currentAgentId,
    isLoading,
    error,
    setCurrentAgent,
    createAgent,
    fetchAgents,
    toggleFavorite,
    isFavorite,
  } = useAppStore();

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleAgentPress = (agentId: string) => {
    setCurrentAgent(agentId);
    props.navigation.closeDrawer();
  };

  const handleCreateAgent = () => {
    showPrompt({
      title: 'Create New Agent',
      message: 'Enter a name for your new agent:',
      placeholder: 'Agent name',
      onConfirm: async (name) => {
        try {
          await createAgent(name);
        } catch (error) {
          showAlert('Error', 'Failed to create agent. Please try again.');
        }
      },
    });
  };

  const currentAgent = agents.find(agent => agent.id === currentAgentId);
  const colorScheme = useColorScheme();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Agents</Text>
        <TouchableOpacity
          style={styles.createButton}
          onPress={handleCreateAgent}
          disabled={isLoading}
        >
          <Ionicons name="add" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={fetchAgents} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!currentAgentId && !isLoading && agents.length > 0 && (
        <View style={styles.noSelectionContainer}>
          <Text style={styles.noSelectionText}>
            Select an agent to start chatting
          </Text>
        </View>
      )}

      <ScrollView style={styles.agentsList} showsVerticalScrollIndicator={false}>
        {agents.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isSelected={agent.id === currentAgentId}
            onPress={() => handleAgentPress(agent.id)}
            isFavorited={isFavorite(agent.id)}
            onToggleFavorite={() => toggleFavorite(agent.id)}
          />
        ))}
        
        {agents.length === 0 && !isLoading && !error && (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color="#8E8E93" />
            <Text style={styles.emptyTitle}>No agents yet</Text>
            <Text style={styles.emptySubtitle}>
              Create your first agent to get started
            </Text>
            <TouchableOpacity
              style={styles.emptyCreateButton}
              onPress={handleCreateAgent}
            >
              <Text style={styles.emptyCreateButtonText}>Create Agent</Text>
            </TouchableOpacity>
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={darkTheme.colors.text.secondary} />
            <Text style={styles.loadingText}>Loading agents…</Text>
          </View>
        )}
      </ScrollView>

      {currentAgent && (
        <View style={styles.currentAgentInfo}>
          <Text style={styles.currentAgentLabel}>Current:</Text>
          <Text style={styles.currentAgentName} numberOfLines={1}>
            {currentAgent.name}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
    backgroundColor: darkTheme.colors.background.tertiary,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: darkTheme.colors.text.primary,
  },
  createButton: {
    padding: 8,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: darkTheme.colors.status.error + '20',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.colors.status.error,
  },
  errorText: {
    fontSize: 14,
    color: darkTheme.colors.status.error,
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 14,
    color: darkTheme.colors.interactive.primary,
    fontWeight: '600',
  },
  noSelectionContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: darkTheme.colors.background.tertiary,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: darkTheme.colors.interactive.primary,
  },
  noSelectionText: {
    fontSize: 14,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
  },
  agentsList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: darkTheme.colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCreateButton: {
    backgroundColor: darkTheme.colors.interactive.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyCreateButtonText: {
    color: darkTheme.colors.text.inverse,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  loadingText: {
    fontSize: 14,
    color: darkTheme.colors.text.secondary,
    marginLeft: 8,
  },
  currentAgentInfo: {
    padding: 16,
    backgroundColor: darkTheme.colors.background.tertiary,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border.primary,
  },
  currentAgentLabel: {
    fontSize: 12,
    color: darkTheme.colors.text.secondary,
    marginBottom: 4,
  },
  currentAgentName: {
    fontSize: 16,
    fontWeight: '600',
    color: darkTheme.colors.text.primary,
  },
});

export default AgentsDrawerContent;
