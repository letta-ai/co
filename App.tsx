import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Linking,
  Dimensions,
  useColorScheme
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import LogoLoader from './src/components/LogoLoader';
import Wordmark from './src/components/Wordmark';
// Wordmark is used in the sidebar, not in the chat header
import lettaApi from './src/api/lettaApi';
import Storage, { STORAGE_KEYS } from './src/utils/storage';
import CreateAgentScreen from './CreateAgentScreen';
import AgentSelectorScreen from './AgentSelectorScreen';
import ProjectSelectorModal from './ProjectSelectorModal';
import Sidebar from './src/components/Sidebar';
import MessageContent from './src/components/MessageContent';
import { darkTheme } from './src/theme';
import type { LettaAgent, LettaMessage, StreamingChunk, Project } from './src/types/letta';

export default function App() {
  const [fontsLoaded] = useFonts({
    Roobert: require('./assets/fonts/Roobert-Regular.ttf'),
  });
  const colorScheme = useColorScheme();
  // Authentication state
  const [apiToken, setApiToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  
  // Project state
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [showProjectSelector, setShowProjectSelector] = useState(false);
  
  // Agent state
  const [agents, setAgents] = useState<LettaAgent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<LettaAgent | null>(null);
  const [showAgentSelector, setShowAgentSelector] = useState(true); // Start with agent selector
  const [showCreateAgentScreen, setShowCreateAgentScreen] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  
  // Message state
  const [messages, setMessages] = useState<LettaMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  
  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStep, setStreamingStep] = useState<string>('');

  // Layout state for responsive design
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const isDesktop = screenData.width >= 768;

  // Ref for ScrollView to control scrolling
  const scrollViewRef = useRef<ScrollView>(null);
  // Reserve space and anchor positioning for streaming response
  const [bottomSpacerHeight, setBottomSpacerHeight] = useState(0);
  const [hasPositionedForStream, setHasPositionedForStream] = useState(false);
  // Track scroll position to counteract padding removal jump
  const [scrollY, setScrollY] = useState(0);

  // Smoothly shrink the bottom spacer and counter-scroll to avoid visual jumps
  const smoothRemoveSpacer = (durationMs: number = 220) => {
    const start = Date.now();
    const initial = bottomSpacerHeight;
    if (initial <= 0) return;
    const step = () => {
      const elapsed = Date.now() - start;
      const t = Math.min(1, elapsed / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const newH = Math.round(initial * (1 - eased));
      const delta = bottomSpacerHeight - newH; // amount removed this frame
      if (delta !== 0) {
        // Counteract layout shift by adjusting scroll position upward by the same delta
        const targetY = Math.max(0, scrollY - delta);
        scrollViewRef.current?.scrollTo({ y: targetY, animated: false });
        setScrollY(targetY);
        setBottomSpacerHeight(newH);
      }
      if (t < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  };

  // Load saved token on app startup
  useEffect(() => {
    const loadSavedToken = async () => {
      try {
        console.log(`Using storage type: ${Storage.getStorageType()}`);
        const savedToken = await Storage.getItem(STORAGE_KEYS.TOKEN);
        if (savedToken) {
          console.log('Found saved token, attempting auto-login');
          lettaApi.setAuthToken(savedToken);
          const isValid = await lettaApi.testConnection();
          
          if (isValid) {
            setApiToken(savedToken);
            setIsConnected(true);
            const project = await loadSavedProject();
            if (project) {
              await loadSavedAgent(project);
            }
            console.log('Auto-login successful');
          } else {
            console.log('Saved token is invalid, clearing it');
            await Storage.removeItem(STORAGE_KEYS.TOKEN);
          }
        }
      } catch (error) {
        console.error('Error loading saved token:', error);
      } finally {
        setIsLoadingToken(false);
      }
    };

    const loadSavedProject = async () => {
      try {
        const savedProjectId = await Storage.getItem(STORAGE_KEYS.PROJECT_ID);
        const savedProjectName = await Storage.getItem(STORAGE_KEYS.PROJECT_NAME);

        if (savedProjectId && savedProjectName) {
          console.log(`Restoring project: ${savedProjectName} (ID: ${savedProjectId})`);

          // Use name query parameter for direct lookup
          const response = await lettaApi.listProjects({ name: savedProjectName });
          const foundProject = response.projects.find(p => p.id === savedProjectId);

          if (foundProject) {
            setCurrentProject(foundProject);
            console.log('Restored saved project:', foundProject.name);
            return foundProject;
          } else {
            console.log('Saved project not found by name query, clearing cached data');
            await Storage.removeItem(STORAGE_KEYS.PROJECT_ID);
            await Storage.removeItem(STORAGE_KEYS.PROJECT_NAME);
          }
        } else if (savedProjectId && !savedProjectName) {
          // Legacy case: we have ID but no name - fall back to pagination search once
          console.log('Legacy project ID found without name, doing one-time migration');

          let foundProject = null;
          let limit = 100;
          let hasNextPage = true;
          let offset = 0;

          while (!foundProject && hasNextPage && offset < 500) {
            const response = await lettaApi.listProjects({ limit, offset });
            foundProject = response.projects.find(p => p.id === savedProjectId);

            if (foundProject) {
              // Migrate to new storage format with both ID and name
              await Storage.setItem(STORAGE_KEYS.PROJECT_NAME, foundProject.name);
              setCurrentProject(foundProject);
              console.log('Migrated and restored project:', foundProject.name);
              return foundProject;
            }

            hasNextPage = response.hasNextPage;
            offset += limit;
          }

          // Clean up if not found
          if (!foundProject) {
            console.log('Legacy project not found, clearing it');
            await Storage.removeItem(STORAGE_KEYS.PROJECT_ID);
          }
        }
      } catch (error) {
        console.error('Error loading saved project:', error);
      }
      return null;
    };

    const loadSavedAgent = async (project: Project) => {
      try {
        const savedAgentId = await Storage.getItem(STORAGE_KEYS.AGENT_ID);
        if (savedAgentId && project) {
          const agentList = await lettaApi.listAgentsForProject(project.id, {
            limit: 50,
          });
          const foundAgent = agentList.find(a => a.id === savedAgentId);
          if (foundAgent) {
            setCurrentAgent(foundAgent);
            setShowAgentSelector(false);
            setShowChatView(true);
            await loadMessagesForAgent(foundAgent.id);
            console.log('Restored saved agent:', foundAgent.name);
            return foundAgent;
          } else {
            console.log('Saved agent not found, clearing it');
            await Storage.removeItem(STORAGE_KEYS.AGENT_ID);
          }
        }
      } catch (error) {
        console.error('Error loading saved agent:', error);
      }
      return null;
    };


    loadSavedToken();
  }, []);

  // Listen for orientation/screen size changes
  useEffect(() => {
    const onChange = (result: any) => {
      setScreenData(result.window);
    };

    const subscription = Dimensions.addEventListener('change', onChange);
    return () => subscription?.remove();
  }, []);

  const handleConnect = async () => {
    const trimmedToken = apiToken.trim();
    if (!trimmedToken) {
      Alert.alert('Error', 'Please enter your API token');
      return;
    }

    setIsConnecting(true);
    try {
      lettaApi.setAuthToken(trimmedToken);
      const isValid = await lettaApi.testConnection();
      
      if (isValid) {
        // Save token securely
        await Storage.setItem(STORAGE_KEYS.TOKEN, trimmedToken);
        console.log(`Token saved securely using ${Storage.getStorageType()}`);
        
        setIsConnected(true);
        Alert.alert('Connected', 'Successfully connected to Letta API!');
      } else {
        Alert.alert('Error', 'Invalid API token. Please check your credentials.');
      }
    } catch (error: any) {
      console.error('Connection error:', error);
      Alert.alert('Error', error.message || 'Failed to connect to Letta API');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleProjectSelect = async (project: Project) => {
    try {
      await Storage.setItem(STORAGE_KEYS.PROJECT_ID, project.id);
      await Storage.setItem(STORAGE_KEYS.PROJECT_NAME, project.name);
      setCurrentProject(project);
      console.log('Selected project:', project.name);
    } catch (error) {
      console.error('Error saving selected project:', error);
    }
  };

  const handleAgentSelect = async (agent: LettaAgent) => {
    try {
      await Storage.setItem(STORAGE_KEYS.AGENT_ID, agent.id);
      setCurrentAgent(agent);
      setShowAgentSelector(false);
      setShowChatView(true);
      await loadMessagesForAgent(agent.id);
      console.log('Selected agent:', agent.name);
    } catch (error) {
      console.error('Error selecting agent:', error);
    }
  };

  const handleBackToAgentSelector = () => {
    setShowChatView(false);
    setShowAgentSelector(true);
    setCurrentAgent(null);
    setMessages([]);
  };

  const loadMessagesForAgent = async (agentId: string) => {
    setIsLoadingMessages(true);
    try {
      const messageHistory = await lettaApi.listMessages(agentId, { limit: 50 });
      console.log('Loaded messages for agent:', messageHistory);

      // Filter and transform messages for display
      const displayMessages = messageHistory
        .filter(msg => {
          // Filter by message type
          if (msg.message_type !== 'user_message' && msg.message_type !== 'assistant_message') {
            return false;
          }

          // Filter out heartbeat messages from user messages
          if (msg.message_type === 'user_message' && typeof msg.content === 'string') {
            try {
              const parsed = JSON.parse(msg.content);
              if (parsed?.type === 'heartbeat') {
                return false; // Hide heartbeat messages
              }
            } catch {
              // Keep message if content is not valid JSON
            }
          }

          return true;
        })
        .map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant',
          content: msg.content || '',
          created_at: msg.created_at,
          reasoning: msg.reasoning, // Preserve reasoning field from API
        }));

      setMessages(displayMessages);

      // Scroll to bottom after messages are loaded
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      Alert.alert('Error', 'Failed to load messages: ' + error.message);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentAgent || isSendingMessage) return;

    const userMessage: LettaMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSendingMessage(true);
    setIsStreaming(true);

    // Reserve space at bottom so streamed content can expand without pushing user to scroll
    const vh = Dimensions.get('window').height;
    setBottomSpacerHeight(Math.floor(vh * 0.9));
    setHasPositionedForStream(false);
    // Clear any previous streaming content when starting a new message
    setStreamingMessage('');
    setStreamingStep('');
    
    const messageToSend = inputText.trim();
    setInputText('');

    // Local accumulator to preserve content through callback closures
    // Accumulators for streaming assembly with light whitespace coalescing at chunk boundaries
    let accumulatedMessage = '';
    let accumulatedStep = '';
    let accumulatedReasoningText = '';

    // Normalize streamed text and coalesce boundary spacing to avoid duplicated spaces
    const normalizeStreamText = (s: string) => {
      if (!s) return '';
      // Convert escaped sequences to real characters when server/SDK double-escapes
      return s
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t');
    };

    // Safely extract text from various SDK/object shapes to avoid "[object Object]"
    const extractText = (val: any): string => {
      if (val == null) return '';
      if (typeof val === 'string') return val;
      if (Array.isArray(val)) return val.map(extractText).join('');
      if (typeof val === 'object') {
        // Common fields that may hold text
        if (typeof (val as any).text === 'string') return (val as any).text as string;
        if (typeof (val as any).content === 'string') return (val as any).content as string;
        if (typeof (val as any).message === 'string') return (val as any).message as string;
        // Some SDKs wrap parts under choices[0].delta/content
        const choices = (val as any).choices;
        if (choices && Array.isArray(choices) && choices.length) {
          const c = choices[0];
          return extractText(c?.delta?.content ?? c?.message?.content ?? c?.content);
        }
        // Fallback: do not stringify raw objects into [object Object]
        return '';
      }
      return '';
    };

    // Coalesce boundary spacing to avoid duplicates like "word ." or double spaces
    const coalesceBoundary = (prev: string, next: string) => {
      if (!next) return '';
      let piece = normalizeStreamText(next);
      const prevLast = prev.slice(-1);
      // If previous ends with whitespace and next begins with whitespace, drop leading whitespace
      if (/\s/.test(prevLast) && /^\s/.test(piece)) {
        piece = piece.replace(/^\s+/, '');
      }
      // If previous ends with space and next begins with punctuation that shouldn't be preceded by a space, drop that leading space
      if (prevLast === ' ' && /^\s*[\.,;:!\?\)\]\}]/.test(piece)) {
        piece = piece.replace(/^\s+/, '');
      }
      // If previous ends with an opening bracket and next starts with space, drop the leading space
      if (/[\(\[\{]$/.test(prev) && /^\s+/.test(piece)) {
        piece = piece.replace(/^\s+/, '');
      }
      return piece;
    };

    try {
      await lettaApi.sendMessageStream(
        currentAgent.id,
        {
          messages: [{ role: 'user', content: messageToSend }],
        },
        // onChunk callback - handle streaming tokens
        (chunk) => {
          console.log('Stream chunk:', chunk);
          console.log('Chunk keys:', Object.keys(chunk));

          if (chunk.message_type === 'assistant_message' && chunk.content) {
            // Append new content with boundary coalescing
            const piece = coalesceBoundary(accumulatedMessage, extractText(chunk.content));
            accumulatedMessage += piece;
            setStreamingMessage(accumulatedMessage);
          } else if (chunk.message_type === 'reasoning_message' && chunk.reasoning) {
            // Show reasoning/thinking process (accumulate) with boundary coalescing
            const piece = coalesceBoundary(accumulatedReasoningText, extractText(chunk.reasoning));
            accumulatedReasoningText += piece;
            accumulatedStep = `Thinking: ${accumulatedReasoningText}`;
            setStreamingStep(accumulatedStep);
          } else if (chunk.message_type === 'tool_call') {
            // Show tool execution
            accumulatedStep = `Executing tool: ${chunk.tool_call?.function?.name || 'Unknown'}`;
            setStreamingStep(accumulatedStep);
          } else if (chunk.message_type === 'tool_response') {
            // Tool completed
            accumulatedStep = 'Processing tool result...';
            setStreamingStep(accumulatedStep);
          }
        },
        // onComplete callback
        (response) => {
          console.log('Stream complete:', response);

          // Add the completed assistant message to permanent messages if we have content
          if (accumulatedMessage.trim()) {
            const assistantMessage: LettaMessage = {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              content: accumulatedMessage.trim(),
              created_at: new Date().toISOString(),
              reasoning: accumulatedReasoningText ? accumulatedReasoningText : undefined,
            };

            setMessages(prev => [...prev, assistantMessage]);
            console.log('Added completed assistant message to chat history');
          }

          // Clear streaming state
          setIsStreaming(false);
          setStreamingMessage('');
          setStreamingStep('');
          // Smoothly remove reserved space and counter-scroll to avoid jump
          smoothRemoveSpacer(240);
        },
        // onError callback
        (error) => {
          console.error('Stream error:', error);
          Alert.alert('Error', 'Failed to send message: ' + error.message);
          
          // Keep the user message visible, just restore input for retry
          setInputText(messageToSend);
          
          // Clear streaming state
          setIsStreaming(false);
          setStreamingMessage('');
          setStreamingStep('');
          // Smoothly remove reserved space and counter-scroll to avoid jump
          smoothRemoveSpacer(240);
        }
      );
    } catch (error: any) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message: ' + error.message);
      
      // Keep the user message visible, just restore input for retry
      setInputText(messageToSend);
      
      // Clear streaming state
      setIsStreaming(false);
      setStreamingMessage('');
      setStreamingStep('');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAgentCreated = async (agent: LettaAgent) => {
    setShowCreateAgentScreen(false);
    
    // Auto-select the newly created agent and go to chat
    await handleAgentSelect(agent);
    
    Alert.alert('Success', `Agent "${agent.name}" created successfully!`);
  };

  const handleCreateAgentCancel = () => {
    setShowCreateAgentScreen(false);
  };

  const handleLogout = async () => {
    try {
      await Storage.removeItem(STORAGE_KEYS.TOKEN);
      await Storage.removeItem(STORAGE_KEYS.AGENT_ID);
      await Storage.removeItem(STORAGE_KEYS.PROJECT_ID);
      lettaApi.removeAuthToken();
      setApiToken('');
      setIsConnected(false);
      setCurrentProject(null);
      setCurrentAgent(null);
      setAgents([]);
      setMessages([]);
      setShowChatView(false);
      setShowAgentSelector(true);
      console.log('Logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  if (isLoadingToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Wordmark width={320} height={60} />
          <Text style={styles.subtitle}>Loading...</Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Wordmark width={320} height={60} />
          <Text style={styles.subtitle}>Enter your Letta API token to get started</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Letta API Token"
            value={apiToken}
            onChangeText={setApiToken}
            secureTextEntry
          />
          
          <TouchableOpacity 
            style={[styles.button, isConnecting && styles.buttonDisabled]} 
            onPress={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Connect</Text>
            )}
          </TouchableOpacity>
          
          <Text style={styles.instructions}>
            Get an API key from{' '}
            <Text 
              style={styles.link}
              onPress={() => Linking.openURL('https://app.letta.com/api-keys')}
            >
              https://app.letta.com/api-keys
            </Text>
          </Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  if (showCreateAgentScreen) {
    return (
      <CreateAgentScreen
        onAgentCreated={handleAgentCreated}
        onCancel={handleCreateAgentCancel}
      />
    );
  }

  // Show agent selector after login (main screen) - only when we have a project
  if (showAgentSelector && !showChatView) {
    return (
      <>
        {currentProject ? (
          <AgentSelectorScreen
            currentProject={currentProject}
            onAgentSelect={handleAgentSelect}
            onProjectPress={() => setShowProjectSelector(true)}
            onCreateAgent={() => setShowCreateAgentScreen(true)}
            onLogout={handleLogout}
          />
        ) : null}
        
        <ProjectSelectorModal
          visible={showProjectSelector || !currentProject}
          currentProject={currentProject}
          onProjectSelect={handleProjectSelect}
          onClose={() => setShowProjectSelector(false)}
        />
      </>
    );
  }

  // Show chat view when agent is selected
  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.mainLayout, isDesktop && styles.desktopLayout]}>
        {/* Sidebar for desktop */}
        {isDesktop && (
          <Sidebar
            currentProject={currentProject}
            currentAgent={currentAgent}
            onAgentSelect={handleAgentSelect}
            onProjectPress={() => setShowProjectSelector(true)}
            onCreateAgent={() => setShowCreateAgentScreen(true)}
            onLogout={handleLogout}
            isVisible={true}
          />
        )}

        {/* Mobile sidebar modal */}
        {!isDesktop && (
          <Modal
            visible={sidebarVisible}
            animationType="slide"
            presentationStyle="overCurrentContext"
            onRequestClose={() => setSidebarVisible(false)}
          >
            <SafeAreaView style={styles.mobileModal}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setSidebarVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Sidebar
                currentProject={currentProject}
                currentAgent={currentAgent}
                onAgentSelect={(agent) => {
                  handleAgentSelect(agent);
                  setSidebarVisible(false);
                }}
                onProjectPress={() => {
                  setSidebarVisible(false);
                  setShowProjectSelector(true);
                }}
                onCreateAgent={() => {
                  setSidebarVisible(false);
                  setShowCreateAgentScreen(true);
                }}
                onLogout={handleLogout}
                isVisible={true}
              />
            </SafeAreaView>
          </Modal>
        )}

        {/* Chat Area */}
        <View style={styles.chatArea}>
          {/* Header */}
          <View style={styles.chatHeader}>
            {!isDesktop && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setSidebarVisible(true)}
              >
                <Text style={styles.menuIcon}>☰</Text>
              </TouchableOpacity>
            )}
            <View style={styles.headerContent}>
              <Text style={styles.agentTitle}>
                {currentAgent ? currentAgent.name : 'Select an agent'}
              </Text>
              {currentAgent && (
                <Text style={styles.agentSubtitle}>
                  {currentProject?.name}
                </Text>
              )}
            </View>
            {!isDesktop && (
              <TouchableOpacity onPress={() => setShowCreateAgentScreen(true)}>
                <Text style={styles.headerAction}>+</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Messages */}
          {isLoadingMessages ? (
            <View style={styles.loadingContainer}>
              <LogoLoader
                source={colorScheme === 'dark' 
                  ? require('./assets/animations/Dark-sygnetrotate2.json') 
                  : require('./assets/animations/Light-sygnetrotate2.json')}
                size={120}
              />
              <Text style={styles.loadingText}>Loading messages...</Text>
            </View>
          ) : (
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={{ paddingBottom: bottomSpacerHeight }}
              onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
              scrollEventThrottle={16}>
              <View style={styles.messagesList}>
                {messages.length === 0 && currentAgent && (
                  <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>
                      Start a conversation with {currentAgent.name}
                    </Text>
                  </View>
                )}

                {messages.filter(message => message.role !== 'system').map((message, index) => (
                  <View key={`${message.id || 'msg'}-${index}-${message.created_at}`} style={styles.messageGroup}>
                    {/* Show reasoning above assistant messages */}
                    {message.role === 'assistant' && message.reasoning && (
                      <View style={styles.reasoningContainer}>
                        <Text style={styles.reasoningText}>{message.reasoning}</Text>
                      </View>
                    )}
                    <View style={[
                      styles.message,
                      message.role === 'user' ? styles.userMessage : styles.assistantMessage,
                    ]}>
                      <MessageContent
                        content={message.content}
                        isUser={message.role === 'user'}
                      />
                    </View>
                  </View>
                ))}

                {/* Streaming message display */}
                {isStreaming && (
                  <View
                    style={styles.messageGroup}
                    onLayout={(e) => {
                      if (!hasPositionedForStream) {
                        const y = e.nativeEvent.layout.y;
                        // Position so the streaming assistant message starts near the top
                        scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: false });
                        setHasPositionedForStream(true);
                      }
                    }}
                  >
                    {streamingStep && streamingStep.trim().length > 0 && (
                      <View style={styles.reasoningContainer}>
                        <Text style={styles.reasoningText}>{streamingStep.trim()}</Text>
                      </View>
                    )}
                    <View style={[styles.message, styles.assistantMessage, styles.streamingMessage]}>
                      {streamingMessage && String(streamingMessage).trim().length > 0 ? (
                        <>
                          <MessageContent
                            content={String(streamingMessage).trim()}
                            isUser={false}
                          />
                          <Text style={styles.cursor}>|</Text>
                        </>
                      ) : (
                        <View style={styles.thinkingIndicator}>
                          <ActivityIndicator size="small" color="#666" />
                          <Text style={styles.thinkingText}>Agent is thinking...</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {isSendingMessage && !isStreaming && (
                  <View style={styles.messageGroup}>
                    <View style={[styles.message, styles.assistantMessage]}>
                      <ActivityIndicator size="small" color="#666" />
                    </View>
                  </View>
                )}

                {/* PaddingBottom above reserves vertical room while streaming */}
              </View>
            </ScrollView>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.messageInput}
                value={inputText}
                onChangeText={setInputText}
                multiline
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!inputText.trim() || !currentAgent || isSendingMessage) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!inputText.trim() || !currentAgent || isSendingMessage}
              >
                {isSendingMessage ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* Project Selector Modal for Chat View */}
      <ProjectSelectorModal
        visible={showProjectSelector}
        currentProject={currentProject}
        onProjectSelect={handleProjectSelect}
        onClose={() => setShowProjectSelector(false)}
      />

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  // Setup screen styles
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: darkTheme.spacing[3],
    backgroundColor: darkTheme.colors.background.primary,
  },
  title: {
    fontSize: darkTheme.typography.h1.fontSize,
    fontWeight: darkTheme.typography.h1.fontWeight,
    fontFamily: darkTheme.typography.h1.fontFamily,
    marginBottom: darkTheme.spacing[1],
    color: darkTheme.colors.text.primary,
    letterSpacing: darkTheme.typography.h1.letterSpacing,
  },
  subtitle: {
    fontSize: darkTheme.typography.body.fontSize,
    fontFamily: darkTheme.typography.body.fontFamily,
    color: darkTheme.colors.text.secondary,
    marginBottom: darkTheme.spacing[4],
    textAlign: 'center',
    lineHeight: darkTheme.typography.body.lineHeight * darkTheme.typography.body.fontSize,
  },
  input: {
    width: '100%',
    maxWidth: 400,
    height: darkTheme.layout.inputHeight,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    borderRadius: darkTheme.layout.borderRadius.medium,
    paddingHorizontal: darkTheme.spacing[2],
    marginBottom: darkTheme.spacing[3],
    backgroundColor: darkTheme.colors.background.surface,
    color: darkTheme.colors.text.primary,
    fontSize: darkTheme.typography.input.fontSize,
    fontFamily: darkTheme.typography.input.fontFamily,
  },
  button: {
    backgroundColor: darkTheme.colors.interactive.primary,
    paddingHorizontal: darkTheme.spacing[4],
    paddingVertical: darkTheme.spacing[2],
    borderRadius: darkTheme.layout.borderRadius.medium,
    marginBottom: darkTheme.spacing[3],
    shadowColor: darkTheme.colors.interactive.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonDisabled: {
    backgroundColor: darkTheme.colors.interactive.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: darkTheme.colors.text.inverse,
    fontSize: darkTheme.typography.button.fontSize,
    fontWeight: darkTheme.typography.button.fontWeight,
    fontFamily: darkTheme.typography.button.fontFamily,
    textAlign: 'center',
  },
  instructions: {
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: darkTheme.typography.caption.lineHeight * darkTheme.typography.caption.fontSize,
  },
  link: {
    color: darkTheme.colors.interactive.primary,
    textDecorationLine: 'underline',
  },

  // Main layout styles
  mainLayout: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: darkTheme.colors.background.primary,
  },
  desktopLayout: {
    flexDirection: 'row',
  },

  // Mobile sidebar modal
  mobileModal: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: darkTheme.spacing[2],
    paddingVertical: darkTheme.spacing[1.5],
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
    backgroundColor: darkTheme.colors.background.secondary,
  },
  modalCloseText: {
    fontSize: darkTheme.typography.h6.fontSize,
    color: darkTheme.colors.text.secondary,
    fontWeight: darkTheme.typography.h6.fontWeight,
    fontFamily: darkTheme.typography.h6.fontFamily,
  },

  // Chat area styles
  chatArea: {
    flex: 1,
    flexDirection: 'column',
    backgroundColor: darkTheme.colors.background.primary,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: darkTheme.spacing[2],
    backgroundColor: darkTheme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
    height: darkTheme.layout.headerHeight,
  },
  menuButton: {
    marginRight: darkTheme.spacing[1.5],
    padding: darkTheme.spacing[1],
  },
  menuIcon: {
    fontSize: darkTheme.typography.h6.fontSize,
    color: darkTheme.colors.text.secondary,
    fontFamily: darkTheme.typography.h6.fontFamily,
  },
  
  headerContent: {
    flex: 1,
  },
  agentTitle: {
    fontSize: darkTheme.typography.agentName.fontSize,
    fontWeight: darkTheme.typography.agentName.fontWeight,
    fontFamily: darkTheme.typography.agentName.fontFamily,
    color: darkTheme.colors.text.primary,
    letterSpacing: darkTheme.typography.agentName.letterSpacing,
  },
  agentSubtitle: {
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    color: darkTheme.colors.text.secondary,
    marginTop: darkTheme.spacing[1],
  },
  headerAction: {
    fontSize: darkTheme.typography.h5.fontSize,
    color: darkTheme.colors.interactive.secondary,
    fontWeight: '300',
    marginLeft: darkTheme.spacing[1.5],
    padding: darkTheme.spacing[1],
  },

  // Messages styles
  messagesContainer: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  messagesList: {
    maxWidth: darkTheme.layout.maxContentWidth,
    alignSelf: 'center',
    width: '100%',
    paddingHorizontal: darkTheme.spacing[3],
    paddingVertical: darkTheme.spacing[2],
  },
  messageGroup: {
    marginBottom: darkTheme.spacing.messageGap,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: darkTheme.spacing[3],
    backgroundColor: darkTheme.colors.background.primary,
  },
  loadingText: {
    marginTop: darkTheme.spacing[1.5],
    fontSize: darkTheme.typography.body.fontSize,
    fontFamily: darkTheme.typography.body.fontFamily,
    color: darkTheme.colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: darkTheme.spacing[10],
  },
  emptyText: {
    fontSize: darkTheme.typography.body.fontSize,
    fontFamily: darkTheme.typography.body.fontFamily,
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
    lineHeight: darkTheme.typography.body.lineHeight * darkTheme.typography.body.fontSize,
  },

  // Message styles (Letta design system)
  message: {
    paddingVertical: darkTheme.spacing[0.5],
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '70%',
    backgroundColor: darkTheme.colors.interactive.primary,
    paddingHorizontal: darkTheme.spacing[1],
    paddingVertical: darkTheme.spacing[0.5],
    borderRadius: darkTheme.layout.borderRadius.round,
    borderBottomRightRadius: darkTheme.layout.borderRadius.round,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    borderLeftWidth: 2,
    borderLeftColor: 'transparent',
  },
  messageText: {
    fontSize: 15, // Refined font size (15px)
    fontFamily: darkTheme.typography.chatMessage.fontFamily,
    fontWeight: '400', // Regular weight
    lineHeight: 1.6 * 15, // 1.6 line height ratio for readability
    letterSpacing: darkTheme.typography.chatMessage.letterSpacing,
  },
  userText: {
    color: darkTheme.colors.text.primary,
  },
  assistantText: {
    color: darkTheme.colors.text.primary,
  },

  // Reasoning styles (Subtle and readable)
  reasoningContainer: {
    backgroundColor: 'transparent', // No background
    paddingVertical: darkTheme.spacing[1.5], // Reduced padding
    paddingHorizontal: darkTheme.spacing[2], // Minimal horizontal padding
    marginBottom: darkTheme.spacing[1], // Reduced spacing
    borderLeftWidth: 1, // Very thin line
    borderLeftColor: 'rgba(184, 184, 184, 0.3)', // Subtle gray line
    borderStyle: 'solid',
  },
  reasoningText: {
    fontSize: 13, // Slightly larger for readability
    fontFamily: darkTheme.typography.reasoning.fontFamily,
    fontWeight: '400', // Regular weight for better readability
    color: 'rgba(184, 184, 184, 0.8)', // More visible gray
    fontStyle: darkTheme.typography.reasoning.fontStyle,
    lineHeight: 1.5 * 13, // Comfortable line height
    letterSpacing: 0.01, // Minimal letter spacing
  },

  // Streaming styles (Technical indicators)
  streamingMessage: {
    borderLeftWidth: 0,
    paddingLeft: 0,
    opacity: 0.9,
  },
  cursor: {
    color: darkTheme.colors.text.secondary,
    fontWeight: 'bold',
    opacity: 0.6,
  },
  thinkingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: darkTheme.spacing[1],
  },
  thinkingText: {
    fontSize: darkTheme.typography.reasoning.fontSize,
    fontFamily: darkTheme.typography.reasoning.fontFamily,
    color: darkTheme.colors.text.secondary,
    fontStyle: darkTheme.typography.reasoning.fontStyle,
    marginLeft: darkTheme.spacing[1],
  },

  // Input styles (Floating glass design)
  inputContainer: {
    backgroundColor: 'transparent',
    paddingHorizontal: darkTheme.spacing[3],
    paddingVertical: darkTheme.spacing[2],
    paddingBottom: darkTheme.spacing[3], // Extra bottom padding for floating effect
  },
  inputWrapper: {
    maxWidth: darkTheme.layout.maxInputWidth,
    alignSelf: 'center',
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: darkTheme.colors.background.primary,
    borderRadius: darkTheme.layout.borderRadius.large,
    padding: darkTheme.spacing[0.5],
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  messageInput: {
    flex: 1,
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: darkTheme.layout.borderRadius.large,
    paddingHorizontal: darkTheme.spacing[2],
    paddingVertical: darkTheme.spacing[1.5],
    marginRight: darkTheme.spacing[1],
    maxHeight: 120,
    fontSize: darkTheme.typography.input.fontSize,
    fontFamily: darkTheme.typography.input.fontFamily,
    backgroundColor: 'transparent',
    color: darkTheme.colors.text.primary,
    // Remove noisy blue focus ring on web
    outlineStyle: 'none',
    outlineWidth: 0,
    outlineColor: 'transparent',
  },
  sendButton: {
    backgroundColor: darkTheme.colors.interactive.secondary,
    borderRadius: darkTheme.layout.borderRadius.round,
    paddingHorizontal: darkTheme.spacing[2.5],
    paddingVertical: darkTheme.spacing[1.5],
    minWidth: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: darkTheme.colors.interactive.secondary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonDisabled: {
    backgroundColor: darkTheme.colors.interactive.disabled,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendButtonText: {
    color: darkTheme.colors.text.inverse,
    fontSize: darkTheme.typography.buttonSmall.fontSize,
    fontWeight: darkTheme.typography.buttonSmall.fontWeight,
    fontFamily: darkTheme.typography.buttonSmall.fontFamily,
    textAlign: 'center',
  },

  // Legacy modal styles (for project selector, etc.)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 10, 10, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: darkTheme.colors.background.surface,
    borderRadius: darkTheme.layout.borderRadius.large,
    padding: darkTheme.spacing[3],
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    shadowColor: darkTheme.colors.text.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  modalTitle: {
    fontSize: darkTheme.typography.h5.fontSize,
    fontWeight: darkTheme.typography.h5.fontWeight,
    fontFamily: darkTheme.typography.h5.fontFamily,
    color: darkTheme.colors.text.primary,
    marginBottom: darkTheme.spacing[2],
    textAlign: 'center',
  },
  agentList: {
    maxHeight: 300,
  },
  agentItem: {
    padding: darkTheme.spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.secondary,
    borderRadius: darkTheme.layout.borderRadius.medium,
    marginBottom: darkTheme.spacing[0.5],
  },
  selectedAgentItem: {
    backgroundColor: darkTheme.colors.background.tertiary,
    borderLeftWidth: 3,
    borderLeftColor: darkTheme.colors.interactive.primary,
  },
  agentName: {
    fontSize: darkTheme.typography.body.fontSize,
    fontWeight: darkTheme.typography.agentName.fontWeight,
    fontFamily: darkTheme.typography.agentName.fontFamily,
    color: darkTheme.colors.text.primary,
    marginBottom: darkTheme.spacing[0.5],
  },
  agentDescription: {
    fontSize: darkTheme.typography.caption.fontSize,
    fontFamily: darkTheme.typography.caption.fontFamily,
    color: darkTheme.colors.text.secondary,
  },
  modalCloseButton: {
    marginTop: darkTheme.spacing[2],
    backgroundColor: darkTheme.colors.interactive.primary,
    borderRadius: darkTheme.layout.borderRadius.medium,
    paddingVertical: darkTheme.spacing[1.5],
  },
  modalInput: {
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    borderRadius: darkTheme.layout.borderRadius.medium,
    paddingHorizontal: darkTheme.spacing[1.5],
    paddingVertical: darkTheme.spacing[1.5],
    marginBottom: darkTheme.spacing[3],
    fontSize: darkTheme.typography.input.fontSize,
    fontFamily: darkTheme.typography.input.fontFamily,
    backgroundColor: darkTheme.colors.background.tertiary,
    color: darkTheme.colors.text.primary,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: darkTheme.spacing[1.5],
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    borderRadius: darkTheme.layout.borderRadius.medium,
    paddingVertical: darkTheme.spacing[1.5],
  },
  modalCancelText: {
    color: darkTheme.colors.text.secondary,
    fontSize: darkTheme.typography.button.fontSize,
    fontWeight: darkTheme.typography.button.fontWeight,
    fontFamily: darkTheme.typography.button.fontFamily,
    textAlign: 'center',
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: darkTheme.colors.interactive.primary,
    borderRadius: darkTheme.layout.borderRadius.medium,
    paddingVertical: darkTheme.spacing[1.5],
    shadowColor: darkTheme.colors.interactive.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  modalCreateText: {
    color: darkTheme.colors.text.inverse,
    fontSize: darkTheme.typography.button.fontSize,
    fontWeight: darkTheme.typography.button.fontWeight,
    fontFamily: darkTheme.typography.button.fontFamily,
    textAlign: 'center',
  },
});
