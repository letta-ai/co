import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  useColorScheme,
  ActivityIndicator,
} from 'react-native';
import lettaApi from '../api/lettaApi';
import { darkTheme } from '../theme';
import Wordmark from './Wordmark';
import { Ionicons } from '@expo/vector-icons';
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
  const colorScheme = useColorScheme();
  const [agents, setAgents] = useState<LettaAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // Simple, minimal loading indicator (no animated logo)

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
      {/* Brand at top-left */}
      <View style={styles.brandBar}>
        <Wordmark width={320} height={60} />
      </View>
      {/* Project Header moved to bottom */}

      {/* Agents List */}
      <View style={styles.agentListContainer}>
        <Text style={styles.sectionTitle}>Agents</Text>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={darkTheme.colors.text.secondary} />
            <Text style={styles.loadingText}>Loading agents…</Text>
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

        <TouchableOpacity style={styles.bottomProjectSelector} onPress={onProjectPress}>
          <View style={styles.bottomProjectText}>
            <Text style={styles.bottomProjectLabel}>Project</Text>
            <Text style={styles.bottomProjectName} numberOfLines={1}>
              {currentProject?.name || 'Select Project'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={darkTheme.colors.text.secondary} />
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
  brandBar: {
    paddingHorizontal: darkTheme.spacing[2],
    paddingVertical: darkTheme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
    backgroundColor: darkTheme.colors.background.secondary,
  },
  projectHeader: {
    display: 'none',
  },
  projectHeaderText: {
    display: 'none',
  },
  projectLabel: {
    fontSize: darkTheme.typography.label.fontSize,
    fontFamily: darkTheme.typography.label.fontFamily,
    fontWeight: darkTheme.typography.label.fontWeight,
    color: darkTheme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: darkTheme.typography.label.letterSpacing,
    marginBottom: darkTheme.spacing[0.5],
  },
  projectName: {
    fontSize: darkTheme.typography.h6.fontSize,
    fontWeight: darkTheme.typography.h6.fontWeight,
    fontFamily: darkTheme.typography.h6.fontFamily,
    color: darkTheme.colors.text.primary,
    letterSpacing: darkTheme.typography.h6.letterSpacing,
  },
  projectSubtext: {
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    color: darkTheme.colors.text.secondary,
    marginTop: darkTheme.spacing[0.5],
  },
  agentListContainer: {
    flex: 1,
    paddingHorizontal: darkTheme.spacing[2.5] || darkTheme.spacing[2],
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
    paddingVertical: darkTheme.spacing[1.5],
    paddingHorizontal: darkTheme.spacing[2],
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
    paddingVertical: darkTheme.spacing[2],
    paddingHorizontal: darkTheme.spacing[1.75] || darkTheme.spacing[2],
    marginBottom: darkTheme.spacing[1.5] || darkTheme.spacing[1.25],
    borderRadius: 0,
    borderLeftWidth: 0,
    borderLeftColor: 'transparent',
  },
  selectedAgentItem: {
    backgroundColor: darkTheme.colors.background.surface,
    borderLeftWidth: 0,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    borderRadius: 0,
  },
  agentName: {
    fontSize: darkTheme.typography.body.fontSize,
    fontWeight: '600',
    fontFamily: darkTheme.typography.body.fontFamily,
    color: darkTheme.colors.text.primary,
  },
  selectedAgentName: {
    color: darkTheme.colors.text.primary,
    fontWeight: '600',
  },
  agentMeta: {
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    color: darkTheme.colors.text.secondary,
    marginTop: darkTheme.spacing[0.75] || darkTheme.spacing[0.5],
  },
  bottomActions: {
    padding: darkTheme.spacing[2],
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border.primary,
    backgroundColor: darkTheme.colors.background.tertiary,
  },
  bottomProjectSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: darkTheme.spacing[1],
  },
  bottomProjectText: {
    flex: 1,
  },
  bottomProjectLabel: {
    fontSize: darkTheme.typography.label.fontSize,
    fontFamily: darkTheme.typography.label.fontFamily,
    fontWeight: darkTheme.typography.label.fontWeight,
    color: darkTheme.colors.text.secondary,
    textTransform: 'uppercase',
    letterSpacing: darkTheme.typography.label.letterSpacing,
    marginBottom: darkTheme.spacing[0.5],
  },
  bottomProjectName: {
    fontSize: darkTheme.typography.bodySmall.fontSize,
    fontWeight: darkTheme.typography.bodySmall.fontWeight,
    fontFamily: darkTheme.typography.bodySmall.fontFamily,
    color: darkTheme.colors.text.primary,
    letterSpacing: darkTheme.typography.bodySmall.letterSpacing,
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
