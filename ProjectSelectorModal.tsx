import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import lettaApi from './src/api/lettaApi';
import type { Project, ListProjectsParams } from './src/types/letta';

interface ProjectSelectorModalProps {
  visible: boolean;
  currentProject: Project | null;
  onProjectSelect: (project: Project) => void;
  onClose: () => void;
}

export default function ProjectSelectorModal({
  visible,
  currentProject,
  onProjectSelect,
  onClose,
}: ProjectSelectorModalProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const LIMIT = 19;

  const loadProjects = async (isLoadMore = false, query = '') => {
    try {
      if (!isLoadMore) {
        setIsLoading(true);
        setOffset(0);
      } else {
        setIsLoadingMore(true);
      }

      const params: ListProjectsParams = {
        limit: LIMIT,
        offset: isLoadMore ? offset : 0,
      };

      if (query.trim()) {
        params.name = query.trim();
      }

      const response = await lettaApi.listProjects(params);
      
      if (isLoadMore) {
        setProjects(prev => [...prev, ...response.projects]);
        setOffset(prev => prev + LIMIT);
      } else {
        setProjects(response.projects);
        setOffset(LIMIT);
      }
      
      setHasNextPage(response.hasNextPage);
    } catch (error: any) {
      console.error('Failed to load projects:', error);
      Alert.alert('Error', 'Failed to load projects: ' + error.message);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Debounce search
    const timeoutId = setTimeout(() => {
      loadProjects(false, query);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const loadMoreProjects = () => {
    if (hasNextPage && !isLoadingMore) {
      loadProjects(true, searchQuery);
    }
  };

  const handleProjectSelect = (project: Project) => {
    onProjectSelect(project);
    onClose();
  };

  const resetAndLoad = () => {
    setSearchQuery('');
    setProjects([]);
    setOffset(0);
    loadProjects(false, '');
  };

  useEffect(() => {
    if (visible) {
      resetAndLoad();
    }
  }, [visible]);

  useEffect(() => {
    const cleanup = handleSearch(searchQuery);
    return cleanup;
  }, [searchQuery]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Select Project</Text>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search projects..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>Loading projects...</Text>
          </View>
        ) : (
          <ScrollView style={styles.projectList}>
            {projects.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {searchQuery ? 'No projects found matching your search' : 'No projects available'}
                </Text>
              </View>
            ) : (
              <>
                {projects.map((project) => (
                  <TouchableOpacity
                    key={project.id}
                    style={[
                      styles.projectItem,
                      currentProject?.id === project.id && styles.selectedProject,
                    ]}
                    onPress={() => handleProjectSelect(project)}
                  >
                    <View style={styles.projectInfo}>
                      <Text style={styles.projectName}>{project.name}</Text>
                      <Text style={styles.projectSlug}>#{project.slug}</Text>
                    </View>
                    
                    {currentProject?.id === project.id && (
                      <View style={styles.checkmark}>
                        <Text style={styles.checkmarkText}>✓</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}

                {hasNextPage && (
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={loadMoreProjects}
                    disabled={isLoadingMore}
                  >
                    {isLoadingMore ? (
                      <ActivityIndicator size="small" color="#007AFF" />
                    ) : (
                      <Text style={styles.loadMoreText}>Load More</Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50, // Account for status bar
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
    width: 60,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 60,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  searchInput: {
    height: 36,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    backgroundColor: '#f8f8f8',
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
  projectList: {
    flex: 1,
  },
  projectItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  selectedProject: {
    backgroundColor: '#f0f8ff',
  },
  projectInfo: {
    flex: 1,
  },
  projectName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  projectSlug: {
    fontSize: 14,
    color: '#666',
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  loadMoreButton: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  loadMoreText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#fff',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
});