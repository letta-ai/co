import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import lettaApi from '../api/lettaApi';
import { darkTheme } from '../theme';
import type { LettaAgent, Project } from '../types/letta';

interface SidebarProps {
  currentProject: Project | null;
  currentAgent: LettaAgent | null;
  onAgentSelect: (agent: LettaAgent) => void;
  onProjectPress: () => void;
  onCreateAgent: () => void;
  onLogout: () => void;
  isVisible: boolean;
}

export default function Sidebar({
  currentProject,
  currentAgent,
  onAgentSelect,
  onProjectPress,
  onCreateAgent,
  onLogout,
  isVisible,
}: SidebarProps) {
  const [agents, setAgents] = useState<LettaAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
      console.log('Loaded agents for sidebar:', agentList.length);
    } catch (error: any) {
      console.error('Failed to load agents:', error);
      Alert.alert('Error', 'Failed to load agents: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadAgents(true);
  };

  useEffect(() => {
    if (currentProject) {
      loadAgents();
    }
  }, [currentProject]);

  if (!isVisible) return null;

  return (
    <View style={styles.sidebar}>
      {/* Project Header */}
      <TouchableOpacity style={styles.projectHeader} onPress={onProjectPress}>
        <Text style={styles.projectName}>
          {currentProject?.name || 'Select Project'}
        </Text>
        <Text style={styles.projectSubtext}>
          {agents.length} agent{agents.length !== 1 ? 's' : ''}
        </Text>
      </TouchableOpacity>

      {/* Agents List */}
      <View style={styles.agentListContainer}>
        <Text style={styles.sectionTitle}>Agents</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#666" />
            <Text style={styles.loadingText}>Loading agents...</Text>
          </View>
        ) : (
          <ScrollView
            style={styles.agentList}
            refreshControl={
              <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
            }
          >
            {agents.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No agents found</Text>
                <TouchableOpacity style={styles.createButton} onPress={onCreateAgent}>
                  <Text style={styles.createButtonText}>Create Agent</Text>
                </TouchableOpacity>
              </View>
            ) : (
              agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.agentItem,
                    currentAgent?.id === agent.id && styles.selectedAgentItem
                  ]}
                  onPress={() => onAgentSelect(agent)}
                >
                  <Text style={[
                    styles.agentName,
                    currentAgent?.id === agent.id && styles.selectedAgentName
                  ]}>
                    {agent.name}
                  </Text>
                  <Text style={styles.agentMeta}>
                    {agent.last_run_completion
                      ? `Last run: ${new Date(agent.last_run_completion).toLocaleDateString()}`
                      : 'Never run'
                    }
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={styles.bottomActions}>
        <TouchableOpacity style={styles.createButton} onPress={onCreateAgent}>
          <Text style={styles.createButtonText}>+ New Agent</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: darkTheme.layout.sidebarWidth,
    backgroundColor: darkTheme.colors.background.secondary,
    borderRightWidth: 1,
    borderRightColor: darkTheme.colors.border.primary,
    flexDirection: 'column',
    height: '100%',
  },
  projectHeader: {
    padding: darkTheme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.secondary,
    backgroundColor: darkTheme.colors.background.tertiary,
  },
  projectName: {
    fontSize: darkTheme.typography.agentName.fontSize,
    fontWeight: darkTheme.typography.agentName.fontWeight,
    fontFamily: darkTheme.typography.agentName.fontFamily,
    color: darkTheme.colors.text.primary,
    letterSpacing: darkTheme.typography.agentName.letterSpacing,
  },
  projectSubtext: {
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    color: darkTheme.colors.text.secondary,
    marginTop: darkTheme.spacing[0.5],
  },
  agentListContainer: {
    flex: 1,
    paddingHorizontal: darkTheme.spacing[2],
  },
  sectionTitle: {
    fontSize: darkTheme.typography.technical.fontSize,
    fontWeight: darkTheme.typography.technical.fontWeight,
    fontFamily: darkTheme.typography.technical.fontFamily,
    color: darkTheme.colors.text.secondary,
    textTransform: darkTheme.typography.technical.textTransform,
    letterSpacing: darkTheme.typography.technical.letterSpacing,
    marginTop: darkTheme.spacing[2],
    marginBottom: darkTheme.spacing[1.5],
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: darkTheme.spacing[3],
  },
  loadingText: {
    marginLeft: darkTheme.spacing[1],
    fontSize: darkTheme.typography.bodySmall.fontSize,
    fontFamily: darkTheme.typography.bodySmall.fontFamily,
    color: darkTheme.colors.text.secondary,
  },
  agentList: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing[5],
  },
  emptyText: {
    fontSize: darkTheme.typography.bodySmall.fontSize,
    fontFamily: darkTheme.typography.bodySmall.fontFamily,
    color: darkTheme.colors.text.secondary,
    marginBottom: darkTheme.spacing[2],
    textAlign: 'center',
  },
  agentItem: {
    paddingVertical: darkTheme.spacing[1.5],
    paddingHorizontal: darkTheme.spacing[1.5],
    marginBottom: darkTheme.spacing[0.5],
    borderRadius: darkTheme.layout.borderRadius.medium,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  selectedAgentItem: {
    backgroundColor: darkTheme.colors.background.tertiary,
    borderLeftWidth: 3,
    borderLeftColor: darkTheme.colors.interactive.primary,
  },
  agentName: {
    fontSize: darkTheme.typography.bodySmall.fontSize,
    fontWeight: '500',
    fontFamily: darkTheme.typography.bodySmall.fontFamily,
    color: darkTheme.colors.text.primary,
  },
  selectedAgentName: {
    color: darkTheme.colors.interactive.primary,
    fontWeight: '600',
  },
  agentMeta: {
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    color: darkTheme.colors.text.secondary,
    marginTop: darkTheme.spacing[0.5],
  },
  bottomActions: {
    padding: darkTheme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border.secondary,
    backgroundColor: darkTheme.colors.background.tertiary,
  },
  createButton: {
    backgroundColor: darkTheme.colors.interactive.secondary,
    paddingVertical: darkTheme.spacing[1.5],
    paddingHorizontal: darkTheme.spacing[2],
    borderRadius: darkTheme.layout.borderRadius.medium,
    marginBottom: darkTheme.spacing[1],
    shadowColor: darkTheme.colors.interactive.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    color: darkTheme.colors.text.inverse,
    fontSize: darkTheme.typography.buttonSmall.fontSize,
    fontWeight: darkTheme.typography.buttonSmall.fontWeight,
    fontFamily: darkTheme.typography.buttonSmall.fontFamily,
    textAlign: 'center',
    textTransform: darkTheme.typography.buttonSmall.textTransform,
    letterSpacing: darkTheme.typography.buttonSmall.letterSpacing,
  },
  logoutButton: {
    paddingVertical: darkTheme.spacing[1],
    paddingHorizontal: darkTheme.spacing[2],
  },
  logoutButtonText: {
    color: darkTheme.colors.text.secondary,
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    textAlign: 'center',
  },
});