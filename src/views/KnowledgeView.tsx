/**
 * KnowledgeView Component
 *
 * MIGRATION STATUS: ✅ EXTRACTED - Ready for use
 *
 * REPLACES: App.tsx.monolithic lines 2490-2789
 * - Knowledge management interface with 3 tabs
 * - Core Memory: View and search memory blocks
 * - Archival Memory: Search, create, edit, delete passages
 * - Files: Upload, list, delete files
 *
 * FEATURES:
 * - Tab switcher (Core Memory / Archival Memory / Files)
 * - Search functionality for Core and Archival
 * - File upload/delete
 * - Passage creation/editing/deletion
 * - Load more pagination for passages
 * - Empty states for each tab
 * - Loading states
 * - Error states
 * - Desktop vs mobile layouts (2 columns vs 1)
 *
 * TAB DETAILS:
 *
 * **Core Memory Tab**:
 * - Lists memory blocks (human, persona, system, etc.)
 * - Search by label or value
 * - Click to view details
 * - Shows character count
 * - 2-column grid on desktop
 *
 * **Archival Memory Tab**:
 * - Search passages with query
 * - Create new passages (button in search bar)
 * - Edit/delete existing passages
 * - Shows timestamps and tags
 * - Load more pagination
 * - Clear search button
 *
 * **Files Tab**:
 * - Upload files button
 * - List uploaded files with dates
 * - Delete files
 * - Upload progress indicator
 * - Empty state
 *
 * CALLBACKS NEEDED:
 * - onSelectBlock: (block) => void
 * - onFileUpload: () => void
 * - onFileDelete: (id, name) => void
 * - onPassageCreate: () => void
 * - onPassageEdit: (passage) => void
 * - onPassageDelete: (id) => void
 * - onLoadMorePassages: () => void
 *
 * STATE NEEDED FROM PARENT:
 * - knowledgeTab: 'core' | 'archival' | 'files'
 * - memoryBlocks, isLoadingBlocks, blocksError
 * - passages, isLoadingPassages, passagesError, hasMorePassages
 * - folderFiles, isLoadingFiles, filesError
 * - memorySearchQuery, passageSearchQuery
 * - isUploadingFile, uploadProgress
 * - isDesktop (for 2-column layout)
 *
 * USED BY: (not yet integrated)
 * - [ ] App.new.tsx (planned)
 *
 * RELATED COMPONENTS:
 * - MemoryBlockViewer.tsx (shows block details)
 * - PassageModal.tsx (create/edit passages)
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Theme } from '../theme';
import type { MemoryBlock, Passage } from '../types/letta';

type KnowledgeTab = 'core' | 'archival' | 'files';

interface FileItem {
  id: string;
  fileName?: string;
  name?: string;
  createdAt?: string;
  created_at?: string;
}

interface KnowledgeViewProps {
  theme: Theme;

  // Tab state
  knowledgeTab: KnowledgeTab;
  onTabChange: (tab: KnowledgeTab) => void;

  // Core Memory
  memoryBlocks: MemoryBlock[];
  memorySearchQuery: string;
  onMemorySearchChange: (query: string) => void;
  isLoadingBlocks: boolean;
  blocksError: string | null;
  onSelectBlock: (block: MemoryBlock) => void;

  // Archival Memory
  passages: Passage[];
  passageSearchQuery: string;
  onPassageSearchChange: (query: string) => void;
  onPassageSearchSubmit: () => void;
  isLoadingPassages: boolean;
  passagesError: string | null;
  hasMorePassages: boolean;
  onLoadMorePassages: () => void;
  onPassageCreate: () => void;
  onPassageEdit: (passage: Passage) => void;
  onPassageDelete: (id: string) => void;

  // Files
  folderFiles: FileItem[];
  isLoadingFiles: boolean;
  filesError: string | null;
  isUploadingFile: boolean;
  uploadProgress: string | null;
  onFileUpload: () => void;
  onFileDelete: (id: string, name: string) => void;

  // Layout
  isDesktop: boolean;
}

export function KnowledgeView(props: KnowledgeViewProps) {
  const {
    theme,
    knowledgeTab,
    onTabChange,
    memoryBlocks,
    memorySearchQuery,
    onMemorySearchChange,
    isLoadingBlocks,
    blocksError,
    onSelectBlock,
    passages,
    passageSearchQuery,
    onPassageSearchChange,
    onPassageSearchSubmit,
    isLoadingPassages,
    passagesError,
    hasMorePassages,
    onLoadMorePassages,
    onPassageCreate,
    onPassageEdit,
    onPassageDelete,
    folderFiles,
    isLoadingFiles,
    filesError,
    isUploadingFile,
    uploadProgress,
    onFileUpload,
    onFileDelete,
    isDesktop,
  } = props;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background.primary }]}>
      {/* Tab Switcher */}
      <View
        style={[
          styles.tabsContainer,
          {
            backgroundColor: theme.colors.background.secondary,
            borderBottomColor: theme.colors.border.primary,
          },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tab,
            knowledgeTab === 'core' && {
              borderBottomColor: theme.colors.text.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => onTabChange('core')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  knowledgeTab === 'core'
                    ? theme.colors.text.primary
                    : theme.colors.text.tertiary,
              },
            ]}
          >
            Core Memory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            knowledgeTab === 'archival' && {
              borderBottomColor: theme.colors.text.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => onTabChange('archival')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  knowledgeTab === 'archival'
                    ? theme.colors.text.primary
                    : theme.colors.text.tertiary,
              },
            ]}
          >
            Archival Memory
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tab,
            knowledgeTab === 'files' && {
              borderBottomColor: theme.colors.text.primary,
              borderBottomWidth: 2,
            },
          ]}
          onPress={() => onTabChange('files')}
        >
          <Text
            style={[
              styles.tabText,
              {
                color:
                  knowledgeTab === 'files'
                    ? theme.colors.text.primary
                    : theme.colors.text.tertiary,
              },
            ]}
          >
            Files
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar for Core Memory */}
      {knowledgeTab === 'core' && (
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.text.tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.tertiary,
                borderColor: theme.colors.border.primary,
              },
            ]}
            placeholder="Search memory blocks..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={memorySearchQuery}
            onChangeText={onMemorySearchChange}
          />
        </View>
      )}

      {/* Search Bar for Archival Memory */}
      {knowledgeTab === 'archival' && (
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color={theme.colors.text.tertiary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              styles.searchInput,
              {
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.background.tertiary,
                borderColor: theme.colors.border.primary,
                paddingRight: passageSearchQuery ? 96 : 60,
              },
            ]}
            placeholder="Search archival memory..."
            placeholderTextColor={theme.colors.text.tertiary}
            value={passageSearchQuery}
            onChangeText={onPassageSearchChange}
            onSubmitEditing={onPassageSearchSubmit}
          />
          {passageSearchQuery && (
            <TouchableOpacity
              style={styles.clearSearchButton}
              onPress={() => {
                onPassageSearchChange('');
                onPassageSearchSubmit();
              }}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.createButton} onPress={onPassageCreate}>
            <Ionicons name="add-circle-outline" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>
      )}

      {/* Content Grid */}
      <View style={styles.contentGrid}>
        {knowledgeTab === 'files' ? (
          // FILES TAB
          <>
            <View style={styles.filesHeader}>
              <Text
                style={[
                  styles.sectionTitle,
                  { color: theme.colors.text.secondary, marginBottom: 0 },
                ]}
              >
                Uploaded Files
              </Text>
              <TouchableOpacity
                onPress={onFileUpload}
                disabled={isUploadingFile}
                style={styles.fileUploadButton}
              >
                {isUploadingFile ? (
                  <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.text.primary} />
                )}
              </TouchableOpacity>
            </View>

            {uploadProgress && (
              <View
                style={[
                  styles.uploadProgress,
                  { backgroundColor: theme.colors.background.tertiary },
                ]}
              >
                <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>
                  {uploadProgress}
                </Text>
              </View>
            )}

            {isLoadingFiles ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.text.secondary} />
              </View>
            ) : filesError ? (
              <Text style={[styles.errorText, { textAlign: 'center', marginTop: 40 }]}>
                {filesError}
              </Text>
            ) : folderFiles.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons
                  name="folder-outline"
                  size={64}
                  color={theme.colors.text.tertiary}
                  style={{ opacity: 0.3 }}
                />
                <Text style={[styles.emptyText, { color: theme.colors.text.tertiary }]}>
                  No files uploaded yet
                </Text>
              </View>
            ) : (
              <FlatList
                data={folderFiles}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => (
                  <View
                    style={[
                      styles.fileCard,
                      {
                        backgroundColor: theme.colors.background.secondary,
                        borderColor: theme.colors.border.primary,
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[styles.fileCardLabel, { color: theme.colors.text.primary }]}
                        numberOfLines={1}
                      >
                        {item.fileName || item.name || 'Untitled'}
                      </Text>
                      <Text
                        style={[
                          styles.fileCardPreview,
                          { color: theme.colors.text.secondary, fontSize: 12 },
                        ]}
                      >
                        {new Date(item.createdAt || item.created_at || '').toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => onFileDelete(item.id, item.fileName || item.name || '')}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </>
        ) : knowledgeTab === 'archival' ? (
          // ARCHIVAL MEMORY TAB
          isLoadingPassages ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text.secondary} />
            </View>
          ) : passagesError ? (
            <Text style={[styles.errorText, { textAlign: 'center', marginTop: 40 }]}>
              {passagesError}
            </Text>
          ) : passages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons
                name="archive-outline"
                size={64}
                color={theme.colors.text.tertiary}
                style={{ opacity: 0.3 }}
              />
              <Text style={[styles.emptyText, { color: theme.colors.text.tertiary }]}>
                No archival memories yet
              </Text>
            </View>
          ) : (
            <FlatList
              data={passages}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.passageCard,
                    {
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: theme.colors.border.primary,
                    },
                  ]}
                >
                  <View style={styles.passageHeader}>
                    <Text
                      style={[
                        styles.passageDate,
                        { color: theme.colors.text.tertiary, fontSize: 11, flex: 1 },
                      ]}
                    >
                      {new Date(item.created_at).toLocaleString()}
                    </Text>
                    <View style={styles.passageActions}>
                      <TouchableOpacity onPress={() => onPassageEdit(item)} style={{ padding: 4 }}>
                        <Ionicons name="create-outline" size={18} color={theme.colors.text.secondary} />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => onPassageDelete(item.id)} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.status.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Text
                    style={[styles.passageText, { color: theme.colors.text.primary }]}
                    numberOfLines={6}
                  >
                    {item.text}
                  </Text>
                  {item.tags && item.tags.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {item.tags.map((tag, idx) => (
                        <View
                          key={idx}
                          style={[
                            styles.tag,
                            { backgroundColor: theme.colors.background.tertiary },
                          ]}
                        >
                          <Text style={{ color: theme.colors.text.secondary, fontSize: 11 }}>
                            {tag}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
              ListFooterComponent={
                hasMorePassages ? (
                  <TouchableOpacity onPress={onLoadMorePassages} style={styles.loadMoreButton}>
                    <Text style={{ color: theme.colors.text.secondary }}>Load more...</Text>
                  </TouchableOpacity>
                ) : null
              }
            />
          )
        ) : (
          // CORE MEMORY TAB
          isLoadingBlocks ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.text.secondary} />
            </View>
          ) : blocksError ? (
            <Text style={[styles.errorText, { textAlign: 'center', marginTop: 40 }]}>
              {blocksError}
            </Text>
          ) : (
            <FlatList
              data={memoryBlocks.filter((block) => {
                if (memorySearchQuery) {
                  return (
                    block.label.toLowerCase().includes(memorySearchQuery.toLowerCase()) ||
                    block.value.toLowerCase().includes(memorySearchQuery.toLowerCase())
                  );
                }
                return true;
              })}
              numColumns={isDesktop ? 2 : 1}
              key={isDesktop ? 'desktop' : 'mobile'}
              keyExtractor={(item) => item.id || item.label}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.memoryCard,
                    {
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: theme.colors.border.primary,
                    },
                  ]}
                  onPress={() => onSelectBlock(item)}
                >
                  <View style={styles.memoryCardHeader}>
                    <Text style={[styles.memoryCardLabel, { color: theme.colors.text.primary }]}>
                      {item.label}
                    </Text>
                    <Text style={[styles.memoryCardCount, { color: theme.colors.text.tertiary }]}>
                      {item.value.length} chars
                    </Text>
                  </View>
                  <Text
                    style={[styles.memoryCardPreview, { color: theme.colors.text.secondary }]}
                    numberOfLines={4}
                  >
                    {item.value || 'Empty'}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons
                    name="library-outline"
                    size={64}
                    color={theme.colors.text.tertiary}
                    style={{ opacity: 0.3 }}
                  />
                  <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
                    {memorySearchQuery ? 'No memory blocks found' : 'No memory blocks yet'}
                  </Text>
                </View>
              }
            />
          )
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderBottomWidth: 1,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    flex: 1,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 24,
    zIndex: 1,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingLeft: 40,
    paddingRight: 16,
    fontSize: 14,
    borderWidth: 1,
    fontFamily: 'Lexend_400Regular',
  },
  clearSearchButton: {
    position: 'absolute',
    right: 64,
    padding: 8,
  },
  createButton: {
    position: 'absolute',
    right: 28,
    padding: 8,
  },
  contentGrid: {
    flex: 1,
  },
  filesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: 'Lexend_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fileUploadButton: {
    padding: 4,
  },
  uploadProgress: {
    marginHorizontal: 8,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    marginTop: 16,
  },
  errorText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: '#E07042',
  },
  listContent: {
    padding: 8,
  },
  fileCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  fileCardLabel: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
  },
  fileCardPreview: {
    fontSize: 12,
    fontFamily: 'Lexend_400Regular',
    marginTop: 4,
  },
  passageCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  passageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  passageDate: {
    fontFamily: 'Lexend_400Regular',
  },
  passageActions: {
    flexDirection: 'row',
    gap: 8,
  },
  passageText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 20,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  memoryCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    margin: 4,
    minHeight: 120,
  },
  memoryCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryCardLabel: {
    fontSize: 16,
    fontFamily: 'Lexend_600SemiBold',
    flex: 1,
  },
  memoryCardCount: {
    fontSize: 11,
    fontFamily: 'Lexend_400Regular',
    marginLeft: 8,
  },
  memoryCardPreview: {
    fontSize: 13,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 18,
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
});

export default KnowledgeView;
