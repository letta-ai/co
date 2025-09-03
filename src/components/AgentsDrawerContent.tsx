import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet 
} from 'react-native';
import { DrawerContentComponentProps } from '@react-navigation/drawer';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AgentCard from './AgentCard';
import useAppStore from '../store/appStore';
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
            <Text style={styles.loadingText}>Loading agents...</Text>
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
    backgroundColor: '#F8F8F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
  },
  createButton: {
    padding: 8,
  },
  errorContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#FFE6E6',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF3B30',
  },
  errorText: {
    fontSize: 14,
    color: '#D70015',
    marginBottom: 8,
  },
  retryButton: {
    alignSelf: 'flex-start',
  },
  retryText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  noSelectionContainer: {
    margin: 16,
    padding: 12,
    backgroundColor: '#E3F2FD',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  noSelectionText: {
    fontSize: 14,
    color: '#1565C0',
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
    color: '#8E8E93',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyCreateButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyCreateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  currentAgentInfo: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  currentAgentLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  currentAgentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});

export default AgentsDrawerContent;