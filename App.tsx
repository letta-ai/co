import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  Modal,
  Dimensions,
  useColorScheme,
  Platform,
  Linking,
  Animated,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useFonts, Lexend_300Light, Lexend_400Regular, Lexend_500Medium, Lexend_600SemiBold, Lexend_700Bold } from '@expo-google-fonts/lexend';
import LogoLoader from './src/components/LogoLoader';
import lettaApi from './src/api/lettaApi';
import Storage, { STORAGE_KEYS } from './src/utils/storage';
import { findOrCreateCo } from './src/utils/coAgent';
import CoLoginScreen from './CoLoginScreen';
import MessageContent from './src/components/MessageContent';
import ExpandableMessageContent from './src/components/ExpandableMessageContent';
import AnimatedStreamingText from './src/components/AnimatedStreamingText';
import ToolCallItem from './src/components/ToolCallItem';
import { darkTheme, lightTheme, CoColors } from './src/theme';
import type { LettaAgent, LettaMessage, StreamingChunk, MemoryBlock } from './src/types/letta';

// Import web styles for transparent input
if (Platform.OS === 'web') {
  require('./web-styles.css');
}

function CoApp() {
  const insets = useSafeAreaInsets();
  const systemColorScheme = useColorScheme();
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(systemColorScheme || 'dark');

  const [fontsLoaded] = useFonts({
    Lexend_300Light,
    Lexend_400Regular,
    Lexend_500Medium,
    Lexend_600SemiBold,
    Lexend_700Bold,
  });

  const toggleColorScheme = () => {
    setColorScheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  // Authentication state
  const [apiToken, setApiToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingToken, setIsLoadingToken] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Co agent state
  const [coAgent, setCoAgent] = useState<LettaAgent | null>(null);
  const [isInitializingCo, setIsInitializingCo] = useState(false);

  // Message state
  const [messages, setMessages] = useState<LettaMessage[]>([]);
  const PAGE_SIZE = 50;
  const INITIAL_LOAD_LIMIT = 20;
  const [earliestCursor, setEarliestCursor] = useState<string | null>(null);
  const [hasMoreBefore, setHasMoreBefore] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [inputText, setInputText] = useState('');
  const [selectedImages, setSelectedImages] = useState<Array<{ uri: string; base64: string; mediaType: string }>>([]);
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStep, setStreamingStep] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<string>('');
  const [streamingReasoning, setStreamingReasoning] = useState<string>('');
  const [isReasoningStreaming, setIsReasoningStreaming] = useState(false);
  const [lastMessageNeedsSpace, setLastMessageNeedsSpace] = useState(false);
  const spacerHeightAnim = useRef(new Animated.Value(0)).current;
  const streamCompleteRef = useRef(false);
  const rainbowAnimValue = useRef(new Animated.Value(0)).current;

  // Token buffering for smooth streaming
  const tokenBufferRef = useRef<string>('');
  const streamingReasoningRef = useRef<string>('');
  const bufferIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // HITL approval state
  const [approvalVisible, setApprovalVisible] = useState(false);
  const [approvalData, setApprovalData] = useState<{
    id?: string;
    toolName?: string;
    toolArgs?: string;
    reasoning?: string;
  } | null>(null);
  const [approvalReason, setApprovalReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  const toolCallMsgIdsRef = useRef<Map<string, string>>(new Map());
  const toolReturnMsgIdsRef = useRef<Map<string, string>>(new Map());

  // Layout state for responsive design
  const [screenData, setScreenData] = useState(Dimensions.get('window'));
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'memory' | 'files'>('memory');
  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<MemoryBlock | null>(null);
  const sidebarAnimRef = useRef(new Animated.Value(0)).current;

  // File management state
  const [coFolder, setCoFolder] = useState<any | null>(null);
  const [folderFiles, setFolderFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [filesError, setFilesError] = useState<string | null>(null);

  const isDesktop = screenData.width >= 768;

  // Ref for ScrollView to control scrolling
  const scrollViewRef = useRef<FlatList<any>>(null);
  const [scrollY, setScrollY] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [inputContainerHeight, setInputContainerHeight] = useState(0);
  const pendingJumpToBottomRef = useRef<boolean>(false);
  const pendingJumpRetriesRef = useRef<number>(0);

  // Load stored API token on mount
  useEffect(() => {
    loadStoredToken();
  }, []);

  // Cleanup intervals on unmount
  useEffect(() => {
    return () => {
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
      }
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, []);

  // Initialize Co when connected
  useEffect(() => {
    if (isConnected && !coAgent && !isInitializingCo) {
      initializeCo();
    }
  }, [isConnected, coAgent, isInitializingCo]);

  // Load messages when Co agent is ready
  useEffect(() => {
    if (coAgent) {
      loadMessages();
    }
  }, [coAgent]);

  const loadStoredToken = async () => {
    try {
      const stored = await Storage.getItem(STORAGE_KEYS.API_TOKEN);
      if (stored) {
        setApiToken(stored);
        await connectWithToken(stored);
      }
    } catch (error) {
      console.error('Failed to load stored token:', error);
    } finally {
      setIsLoadingToken(false);
    }
  };

  const connectWithToken = async (token: string) => {
    setIsConnecting(true);
    setConnectionError(null);
    try {
      lettaApi.setAuthToken(token);
      const isValid = await lettaApi.testConnection();

      if (isValid) {
        setIsConnected(true);
        await Storage.setItem(STORAGE_KEYS.API_TOKEN, token);
      } else {
        throw new Error('Invalid API token');
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      setConnectionError(error.message || 'Failed to connect');
      lettaApi.removeAuthToken();
      setIsConnected(false);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleLogin = async (token: string) => {
    setApiToken(token);
    await connectWithToken(token);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await Storage.removeItem(STORAGE_KEYS.API_TOKEN);
            lettaApi.removeAuthToken();
            setApiToken('');
            setIsConnected(false);
            setCoAgent(null);
            setMessages([]);
            setConnectionError(null);
          },
        },
      ]
    );
  };

  const initializeCo = async () => {
    setIsInitializingCo(true);
    try {
      console.log('Initializing Co agent...');
      const agent = await findOrCreateCo('User');
      setCoAgent(agent);
      console.log('Co agent ready:', agent.id);
    } catch (error: any) {
      console.error('Failed to initialize Co:', error);
      Alert.alert('Error', 'Failed to initialize Co: ' + (error.message || 'Unknown error'));
    } finally {
      setIsInitializingCo(false);
    }
  };

  const loadMessages = async (before?: string) => {
    if (!coAgent) return;

    try {
      if (!before) {
        setIsLoadingMessages(true);
      } else {
        setIsLoadingMore(true);
      }

      const loadedMessages = await lettaApi.listMessages(coAgent.id, {
        before: before || undefined,
        limit: before ? PAGE_SIZE : INITIAL_LOAD_LIMIT,
        use_assistant_message: true,
      });

      if (loadedMessages.length > 0) {
        if (before) {
          setMessages(prev => [...loadedMessages, ...prev]);
          setEarliestCursor(loadedMessages[0].id);
        } else {
          setMessages(loadedMessages);
          if (loadedMessages.length > 0) {
            setEarliestCursor(loadedMessages[0].id);
            pendingJumpToBottomRef.current = true;
            pendingJumpRetriesRef.current = 3;
          }
        }
        setHasMoreBefore(loadedMessages.length === (before ? PAGE_SIZE : INITIAL_LOAD_LIMIT));
      } else {
        setHasMoreBefore(false);
      }
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      Alert.alert('Error', 'Failed to load messages: ' + (error.message || 'Unknown error'));
    } finally {
      setIsLoadingMessages(false);
      setIsLoadingMore(false);
    }
  };

  const loadMoreMessages = () => {
    if (hasMoreBefore && !isLoadingMore && earliestCursor) {
      loadMessages(earliestCursor);
    }
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: false,
        quality: 0.8,
        base64: true,
      });

      console.log('Image picker result:', { canceled: result.canceled, assetsCount: result.assets?.length });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        console.log('Asset info:', {
          hasBase64: !!asset.base64,
          base64Length: asset.base64?.length,
          uri: asset.uri
        });

        if (asset.base64) {
          // Check size: 5MB = 5 * 1024 * 1024 bytes
          const MAX_SIZE = 5 * 1024 * 1024;
          const sizeMB = (asset.base64.length / 1024 / 1024).toFixed(2);
          console.log(`Image size: ${sizeMB}MB, max allowed: 5MB`);

          if (asset.base64.length > MAX_SIZE) {
            console.error(`IMAGE REJECTED: ${sizeMB}MB exceeds 5MB limit`);
            Alert.alert(
              'Image Too Large',
              `This image is ${sizeMB}MB, but the maximum allowed size is 5MB. Please select a smaller image or compress it first.`
            );
            return;  // Discard the image
          }

          const mediaType = asset.uri.match(/\.(jpg|jpeg)$/i) ? 'image/jpeg' :
                            asset.uri.match(/\.png$/i) ? 'image/png' :
                            asset.uri.match(/\.gif$/i) ? 'image/gif' :
                            asset.uri.match(/\.webp$/i) ? 'image/webp' : 'image/jpeg';

          console.log('Adding image with mediaType:', mediaType);
          setSelectedImages(prev => [...prev, {
            uri: asset.uri,
            base64: asset.base64,
            mediaType,
          }]);
        } else {
          console.error('No base64 data in asset');
          Alert.alert('Error', 'Failed to read image data');
        }
      } else {
        console.log('Image picker canceled or no assets');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!inputText.trim() && selectedImages.length === 0) || !coAgent || isSendingMessage) return;

    const messageText = String(inputText || '').trim();
    const imagesToSend = [...selectedImages];

    console.log('sendMessage called - messageText:', messageText, 'type:', typeof messageText, 'imagesToSend length:', imagesToSend.length);

    setInputText('');
    setSelectedImages([]);
    setIsSendingMessage(true);

    // Remove space from previous message before adding new user message
    setLastMessageNeedsSpace(false);
    spacerHeightAnim.setValue(0);

    // Immediately add user message to UI (with images if any)
    let tempMessageContent: any;
    if (imagesToSend.length > 0) {
      const contentParts = [];

      // Add images using base64 (SDK expects camelCase, converts to snake_case for HTTP)
      for (const img of imagesToSend) {
        contentParts.push({
          type: 'image',
          source: {
            type: 'base64',
            mediaType: img.mediaType,
            data: img.base64,
          },
        });
      }

      // Add text if present
      console.log('[TEMP] About to check text - messageText:', JSON.stringify(messageText), 'type:', typeof messageText, 'length:', messageText?.length);
      if (messageText && typeof messageText === 'string' && messageText.length > 0) {
        console.log('[TEMP] Adding text to contentParts');
        contentParts.push({
          type: 'text',
          text: messageText,
        });
      }

      console.log('[TEMP] Final contentParts:', JSON.stringify(contentParts));
      tempMessageContent = contentParts;
    } else {
      tempMessageContent = messageText;
    }

    const tempUserMessage: LettaMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: tempMessageContent,
      date: new Date().toISOString(),
    } as LettaMessage;

    setMessages(prev => [...prev, tempUserMessage]);

    // Scroll to bottom immediately to show user message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: false });
    }, 50);

    try {
      setIsStreaming(true);
      setLastMessageNeedsSpace(true);
      setStreamingMessage('');
      setStreamingStep('');
      setStreamingMessageId('');
      setStreamingReasoning('');
      setIsReasoningStreaming(true);
      tokenBufferRef.current = '';
      streamingReasoningRef.current = '';
      streamCompleteRef.current = false;

      // Animate spacer growing to push user message up (push previous content out of view)
      const targetHeight = Math.max(containerHeight * 0.9, 450);
      spacerHeightAnim.setValue(0);

      Animated.timing(spacerHeightAnim, {
        toValue: targetHeight,
        duration: 400,
        useNativeDriver: false, // height animation can't use native driver
      }).start();

      // During animation, keep scroll at bottom
      if (scrollIntervalRef.current) {
        clearInterval(scrollIntervalRef.current);
      }
      scrollIntervalRef.current = setInterval(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 16); // ~60fps

      setTimeout(() => {
        if (scrollIntervalRef.current) {
          clearInterval(scrollIntervalRef.current);
          scrollIntervalRef.current = null;
        }
      }, 400);

      // Start smooth token release interval
      if (bufferIntervalRef.current) {
        clearInterval(bufferIntervalRef.current);
      }
      bufferIntervalRef.current = setInterval(() => {
        if (tokenBufferRef.current.length > 0) {
          // Release 1-3 characters at a time for smooth effect
          const chunkSize = Math.min(3, tokenBufferRef.current.length);
          const chunk = tokenBufferRef.current.slice(0, chunkSize);
          tokenBufferRef.current = tokenBufferRef.current.slice(chunkSize);
          setStreamingMessage(prev => prev + chunk);
        } else if (streamCompleteRef.current) {
          // Buffer is empty and streaming is done - finalize
          if (bufferIntervalRef.current) {
            clearInterval(bufferIntervalRef.current);
            bufferIntervalRef.current = null;
          }

          setStreamingMessage(currentContent => {
            setIsStreaming(false);
            setIsReasoningStreaming(false);
            setStreamingStep('');

            const finalReasoning = streamingReasoningRef.current || '';
            console.log('Finalizing message with reasoning:', finalReasoning);

            const finalMessage: LettaMessage = {
              id: streamingMessageId || `msg_${Date.now()}`,
              role: 'assistant',
              content: currentContent,
              created_at: new Date().toISOString(),
              reasoning: finalReasoning || undefined,
            };

            console.log('Final message object:', finalMessage);
            setMessages(prev => [...prev, finalMessage]);
            setStreamingMessageId('');
            setStreamingReasoning('');
            streamingReasoningRef.current = '';

            return '';
          });
        }
      }, 20); // 50 FPS

      toolCallMsgIdsRef.current.clear();
      toolReturnMsgIdsRef.current.clear();

      // Build message content based on whether we have images
      let messageContent: any;
      if (imagesToSend.length > 0) {
        // Multi-part content with images
        const contentParts = [];

        // Add images using base64 (SDK expects camelCase, converts to snake_case for HTTP)
        for (const img of imagesToSend) {
          console.log('Adding image - mediaType:', img.mediaType, 'base64 length:', img.base64?.length);

          contentParts.push({
            type: 'image',
            source: {
              type: 'base64',
              mediaType: img.mediaType,
              data: img.base64,
            },
          });
        }

        // Add text if present
        console.log('[API] About to check text - messageText:', JSON.stringify(messageText), 'type:', typeof messageText);
        if (messageText && typeof messageText === 'string' && messageText.length > 0) {
          console.log('[API] Adding text to contentParts - text value:', messageText);
          const textItem = {
            type: 'text' as const,
            text: String(messageText), // Explicitly convert to string as safeguard
          };
          console.log('[API] Text item to push:', JSON.stringify(textItem));
          contentParts.push(textItem);
        }

        messageContent = contentParts;
        console.log('Built contentParts:', contentParts.length, 'items');
        console.log('Full message structure:', JSON.stringify({role: 'user', content: messageContent}, null, 2).substring(0, 1000));
      } else {
        // Text-only message
        messageContent = messageText;
        console.log('Sending text-only message:', messageText);
      }

      console.log('=== ABOUT TO SEND TO API ===');
      console.log('messageContent type:', typeof messageContent);
      console.log('messageContent is array?', Array.isArray(messageContent));
      console.log('messageContent:', JSON.stringify(messageContent, null, 2));

      const payload = {
        messages: [{ role: 'user', content: messageContent }],
        use_assistant_message: true,
        stream_tokens: true,
      };

      console.log('Full payload being sent:', JSON.stringify(payload, null, 2).substring(0, 2000));

      await lettaApi.sendMessageStream(
        coAgent.id,
        payload,
        (chunk: StreamingChunk) => {
          handleStreamingChunk(chunk);
        },
        async (response) => {
          console.log('Stream complete');
          // Signal that streaming is done - buffer interval will finalize when empty
          streamCompleteRef.current = true;
        },
        (error) => {
          console.error('Streaming error:', error);

          // Clear intervals on error
          if (bufferIntervalRef.current) {
            clearInterval(bufferIntervalRef.current);
            bufferIntervalRef.current = null;
          }
          if (scrollIntervalRef.current) {
            clearInterval(scrollIntervalRef.current);
            scrollIntervalRef.current = null;
          }

          // Reset spacer animation
          spacerHeightAnim.setValue(0);
          streamCompleteRef.current = false;

          setIsStreaming(false);
          setIsReasoningStreaming(false);
          setStreamingMessage('');
          setStreamingStep('');
          setStreamingMessageId('');
          setStreamingReasoning('');
          tokenBufferRef.current = '';
          streamingReasoningRef.current = '';
          Alert.alert('Error', 'Failed to send message: ' + (error.message || 'Unknown error'));
        }
      );
    } catch (error: any) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message: ' + (error.message || 'Unknown error'));
      setIsStreaming(false);
      spacerHeightAnim.setValue(0);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleStreamingChunk = (chunk: StreamingChunk) => {
    console.log('Streaming chunk:', chunk.message_type, 'content:', chunk.content, 'reasoning:', chunk.reasoning);

    // Capture message ID if present
    if (chunk.id && !streamingMessageId) {
      setStreamingMessageId(chunk.id);
    }

    if (chunk.message_type === 'assistant_message' && chunk.content) {
      // Reasoning is complete, assistant message has started
      setIsReasoningStreaming(false);

      // Extract text from content if it's an object
      let contentText = '';
      if (typeof chunk.content === 'string') {
        contentText = chunk.content;
      } else if (typeof chunk.content === 'object' && chunk.content !== null) {
        // Handle content array from Letta SDK
        if (Array.isArray(chunk.content)) {
          contentText = chunk.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text || '')
            .join('');
        } else if (chunk.content.text) {
          contentText = chunk.content.text;
        }
      }

      if (contentText) {
        // Add to buffer instead of directly to state for smooth streaming
        tokenBufferRef.current += contentText;
        setStreamingStep('');
      }
    } else if (chunk.message_type === 'reasoning_message' && chunk.reasoning) {
      // Accumulate reasoning in both ref and state
      streamingReasoningRef.current += chunk.reasoning;
      setStreamingReasoning(prev => prev + chunk.reasoning);
    } else if ((chunk.message_type === 'tool_call_message' || chunk.message_type === 'tool_call') && chunk.tool_call) {
      // Handle both formats: with and without .function wrapper
      const callObj = chunk.tool_call.function || chunk.tool_call;
      const toolName = callObj?.name || callObj?.tool_name || 'tool';
      setStreamingStep(`Calling ${toolName}...`);
    } else if (chunk.message_type === 'tool_return_message' || chunk.message_type === 'tool_response') {
      setStreamingStep('Processing result...');
    } else if (chunk.message_type === 'approval_request_message') {
      // Handle approval request
      const callObj = chunk.tool_call?.function || chunk.tool_call;
      setApprovalData({
        id: chunk.id,
        toolName: callObj?.name || callObj?.tool_name,
        toolArgs: callObj?.arguments || callObj?.args,
        reasoning: chunk.reasoning,
      });
      setApprovalVisible(true);
    }
  };

  const handleApproval = async (approve: boolean) => {
    if (!approvalData?.id || !coAgent) return;

    setIsApproving(true);
    try {
      await lettaApi.approveToolRequest(coAgent.id, {
        approval_request_id: approvalData.id,
        approve,
        reason: approvalReason || undefined,
      });

      setApprovalVisible(false);
      setApprovalData(null);
      setApprovalReason('');

      // Continue streaming after approval
    } catch (error: any) {
      console.error('Approval error:', error);
      Alert.alert('Error', 'Failed to process approval: ' + (error.message || 'Unknown error'));
    } finally {
      setIsApproving(false);
    }
  };

  const loadMemoryBlocks = async () => {
    if (!coAgent) return;

    setIsLoadingBlocks(true);
    setBlocksError(null);
    try {
      const blocks = await lettaApi.listAgentBlocks(coAgent.id);
      setMemoryBlocks(blocks);
    } catch (error: any) {
      console.error('Failed to load memory blocks:', error);
      setBlocksError(error.message || 'Failed to load memory blocks');
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const initializeCoFolder = async () => {
    if (!coAgent) return;

    try {
      console.log('Initializing co folder...');

      // Check if "co" folder already exists
      const folders = await lettaApi.listFolders();
      let folder = folders.find((f: any) => f.name === 'co');

      if (!folder) {
        // Create the folder
        console.log('Creating co folder...');
        folder = await lettaApi.createFolder('co', 'Files shared with co');
      }

      setCoFolder(folder);
      console.log('Co folder ready:', folder.id);

      // Attach folder to agent if not already attached
      try {
        await lettaApi.attachFolderToAgent(coAgent.id, folder.id);
        console.log('Folder attached to agent');
      } catch (error: any) {
        // Might already be attached, ignore error
        console.log('Folder attach info:', error.message);
      }

      // Load files
      await loadFolderFiles(folder.id);
    } catch (error: any) {
      console.error('Failed to initialize co folder:', error);
      setFilesError(error.message || 'Failed to initialize folder');
    }
  };

  const loadFolderFiles = async (folderId?: string) => {
    const id = folderId || coFolder?.id;
    if (!id) return;

    setIsLoadingFiles(true);
    setFilesError(null);
    try {
      const files = await lettaApi.listFolderFiles(id);
      setFolderFiles(files);
    } catch (error: any) {
      console.error('Failed to load files:', error);
      setFilesError(error.message || 'Failed to load files');
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const pickAndUploadFile = async () => {
    if (!coFolder) {
      Alert.alert('Error', 'Folder not initialized');
      return;
    }

    try {
      // Create input element for file selection (web)
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,.txt,.md,.json,.csv,.doc,.docx';

      input.onchange = async (e: any) => {
        const file = e.target?.files?.[0];
        if (!file) return;

        console.log('Selected file:', file.name, 'size:', file.size);

        // Check file size (10MB limit)
        const MAX_SIZE = 10 * 1024 * 1024;
        if (file.size > MAX_SIZE) {
          Alert.alert('File Too Large', 'Maximum file size is 10MB');
          return;
        }

        setIsUploadingFile(true);
        try {
          // Upload file
          const job = await lettaApi.uploadFileToFolder(coFolder.id, file);
          console.log('Upload job:', job.id);

          // Poll for job completion
          let attempts = 0;
          const maxAttempts = 60; // 60 seconds max
          while (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const status = await lettaApi.getJobStatus(job.id);
            console.log('Job status:', status.status);

            if (status.status === 'completed') {
              console.log('File uploaded successfully');
              await loadFolderFiles();
              Alert.alert('Success', `${file.name} uploaded successfully`);
              break;
            } else if (status.status === 'failed') {
              throw new Error('Upload failed: ' + (status.metadata || 'Unknown error'));
            }

            attempts++;
          }

          if (attempts >= maxAttempts) {
            throw new Error('Upload timed out');
          }
        } catch (error: any) {
          console.error('Upload error:', error);
          Alert.alert('Upload Failed', error.message || 'Failed to upload file');
        } finally {
          setIsUploadingFile(false);
        }
      };

      input.click();
    } catch (error: any) {
      console.error('File picker error:', error);
      Alert.alert('Error', 'Failed to open file picker');
    }
  };

  const deleteFile = async (fileId: string, fileName: string) => {
    if (!coFolder) return;

    Alert.alert(
      'Delete File',
      `Are you sure you want to delete "${fileName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await lettaApi.deleteFile(coFolder.id, fileId);
              await loadFolderFiles();
              Alert.alert('Success', 'File deleted');
            } catch (error: any) {
              console.error('Delete error:', error);
              Alert.alert('Error', 'Failed to delete file: ' + (error.message || 'Unknown error'));
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    if (coAgent && sidebarVisible && activeSidebarTab === 'memory') {
      loadMemoryBlocks();
    }
  }, [coAgent, sidebarVisible, activeSidebarTab]);

  useEffect(() => {
    if (coAgent && sidebarVisible && activeSidebarTab === 'files') {
      if (!coFolder) {
        initializeCoFolder();
      } else {
        loadFolderFiles();
      }
    }
  }, [coAgent, sidebarVisible, activeSidebarTab]);

  // Initialize folder when agent is ready
  useEffect(() => {
    if (coAgent && !coFolder) {
      initializeCoFolder();
    }
  }, [coAgent]);

  // Animate sidebar
  useEffect(() => {
    Animated.timing(sidebarAnimRef, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [sidebarVisible]);

  // Animate rainbow gradient for "co is thinking"
  useEffect(() => {
    if (isReasoningStreaming) {
      rainbowAnimValue.setValue(0);
      Animated.loop(
        Animated.timing(rainbowAnimValue, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        })
      ).start();
    } else {
      rainbowAnimValue.stopAnimation();
    }
  }, [isReasoningStreaming]);

  // State for tracking expanded reasoning
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [expandedCompaction, setExpandedCompaction] = useState<Set<string>>(new Set());

  const toggleReasoning = (messageId: string) => {
    setExpandedReasoning(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  const toggleCompaction = (messageId: string) => {
    setExpandedCompaction(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };

  // Group messages for efficient FlatList rendering
  type MessageGroup =
    | { key: string; type: 'toolPair'; call: LettaMessage; ret?: LettaMessage; reasoning?: string }
    | { key: string; type: 'message'; message: LettaMessage; reasoning?: string };

  const groupedMessages = useMemo(() => {
    const groups: MessageGroup[] = [];
    const toolCallsMap = new Map<string, LettaMessage>();
    const processedIds = new Set<string>();

    messages.forEach(msg => {
      if (msg.message_type?.includes('tool_call') && msg.step_id) {
        toolCallsMap.set(msg.step_id, msg);
      }
    });

    messages.forEach(msg => {
      if (processedIds.has(msg.id)) return;

      // Filter out login/heartbeat messages
      if (msg.role === 'user' && msg.content) {
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed?.type === 'login' || parsed?.type === 'heartbeat') {
            processedIds.add(msg.id);
            return;
          }
        } catch {
          // Not JSON, keep the message
        }
      }

      if (msg.message_type?.includes('tool_return') && msg.step_id) {
        const toolCall = toolCallsMap.get(msg.step_id);
        if (toolCall) {
          groups.push({
            key: toolCall.id,
            type: 'toolPair',
            call: toolCall,
            ret: msg,
            reasoning: toolCall.reasoning || msg.reasoning,
          });
          processedIds.add(toolCall.id);
          processedIds.add(msg.id);
          return;
        }
      }

      if (!msg.message_type?.includes('tool_call') && !msg.message_type?.includes('tool_return')) {
        groups.push({
          key: msg.id,
          type: 'message',
          message: msg,
          reasoning: msg.reasoning,
        });
        processedIds.add(msg.id);
      }
    });

    return groups;
  }, [messages]);

  const renderMessageGroup = ({ item }: { item: MessageGroup }) => {
    if (item.type === 'toolPair') {
      // Extract tool call information from the message
      const toolCall = item.call.tool_call || item.call.tool_calls?.[0];
      let callText = item.call.content || 'Tool call';

      if (toolCall) {
        // Handle both formats: with and without .function wrapper
        const callObj = toolCall.function || toolCall;
        const name = callObj.name || callObj.tool_name || 'tool';
        const argsRaw = callObj.arguments ?? callObj.args ?? '{}';
        let args = '';
        try {
          args = typeof argsRaw === 'string' ? argsRaw : JSON.stringify(argsRaw);
        } catch {
          args = String(argsRaw);
        }
        callText = `${name}(${args})`;
      }

      const resultText = item.ret?.content || undefined;

      return (
        <View key={item.key} style={styles.messageContainer}>
          <ToolCallItem
            callText={callText}
            resultText={resultText}
          />
        </View>
      );
    } else {
      const msg = item.message;
      const isUser = msg.role === 'user';
      const isSystem = msg.role === 'system';

      if (isSystem) return null;

      if (isUser) {
        // Check if this is a system_alert compaction message
        let isCompactionAlert = false;
        let compactionMessage = '';
        try {
          const parsed = JSON.parse(msg.content);
          if (parsed?.type === 'system_alert') {
            isCompactionAlert = true;
            // Extract the message field from the embedded JSON in the message text
            const messageText = parsed.message || '';
            // Try to extract JSON from the message (it's usually in a code block)
            const jsonMatch = messageText.match(/```json\s*(\{[\s\S]*?\})\s*```/);
            if (jsonMatch) {
              try {
                const innerJson = JSON.parse(jsonMatch[1]);
                compactionMessage = innerJson.message || messageText;
              } catch {
                compactionMessage = messageText;
              }
            } else {
              compactionMessage = messageText;
            }

            // Strip out the "Note: prior messages..." preamble
            compactionMessage = compactionMessage.replace(/^Note: prior messages have been hidden from view.*?The following is a summary of the previous messages:\s*/is, '');
          }
        } catch {
          // Not JSON, treat as normal user message
        }

        if (isCompactionAlert) {
          // Render compaction alert as thin grey expandable line
          const isCompactionExpanded = expandedCompaction.has(msg.id);

          return (
            <View key={item.key} style={styles.compactionContainer}>
              <TouchableOpacity
                onPress={() => toggleCompaction(msg.id)}
                style={styles.compactionLine}
                activeOpacity={0.7}
              >
                <View style={styles.compactionDivider} />
                <Text style={styles.compactionLabel}>compaction</Text>
                <View style={styles.compactionDivider} />
                <Ionicons
                  name={isCompactionExpanded ? 'chevron-up' : 'chevron-down'}
                  size={12}
                  color={theme.colors.text.tertiary}
                  style={styles.compactionChevron}
                />
              </TouchableOpacity>
              {isCompactionExpanded && (
                <View style={styles.compactionMessageContainer}>
                  <MessageContent content={compactionMessage} />
                </View>
              )}
            </View>
          );
        }

        // Parse message content to check for multipart (images)
        let textContent: string = '';
        let imageContent: Array<{type: string, source: {type: string, data: string, mediaType: string}}> = [];

        if (typeof msg.content === 'object' && Array.isArray(msg.content)) {
          // Multipart message with images
          imageContent = msg.content.filter((item: any) => item.type === 'image');
          const textParts = msg.content.filter((item: any) => item.type === 'text');
          textContent = textParts.map((item: any) => item.text || '').filter(t => t).join('\n');
        } else if (typeof msg.content === 'string') {
          textContent = msg.content;
        } else {
          // Fallback: convert to string
          textContent = String(msg.content || '');
        }

        // Skip rendering if no content at all
        if (!textContent.trim() && imageContent.length === 0) {
          return null;
        }

        return (
          <View
            key={item.key}
            style={[styles.messageContainer, styles.userMessageContainer]}
          >
            <View
              style={[
                styles.messageBubble,
                styles.userBubble,
                { backgroundColor: colorScheme === 'dark' ? CoColors.pureWhite : CoColors.deepBlack }
              ]}
              // @ts-ignore - web-only data attribute for CSS targeting
              dataSet={{ userMessage: 'true' }}
            >
              {/* Display images */}
              {imageContent.length > 0 && (
                <View style={styles.messageImagesContainer}>
                  {imageContent.map((img: any, idx: number) => {
                    const uri = img.source.type === 'url'
                      ? img.source.url
                      : `data:${img.source.media_type || img.source.mediaType};base64,${img.source.data}`;

                    return (
                      <Image
                        key={idx}
                        source={{ uri }}
                        style={styles.messageImage}
                      />
                    );
                  })}
                </View>
              )}

              {/* Display text content */}
              {textContent.trim().length > 0 && (
                <ExpandableMessageContent
                  content={textContent}
                  isUser={isUser}
                  isDark={colorScheme === 'dark'}
                  lineLimit={3}
                />
              )}
            </View>
          </View>
        );
      } else {
        const isReasoningExpanded = expandedReasoning.has(msg.id);
        const isLastMessage = groupedMessages[groupedMessages.length - 1]?.key === item.key;
        const shouldHaveMinHeight = isLastMessage && lastMessageNeedsSpace;

        return (
          <View key={item.key} style={[
            styles.assistantFullWidthContainer,
            shouldHaveMinHeight && { minHeight: Math.max(containerHeight * 0.9, 450) }
          ]}>
            {item.reasoning && (
              <TouchableOpacity
                onPress={() => toggleReasoning(msg.id)}
                style={styles.reasoningToggle}
              >
                <Text style={styles.reasoningToggleText}>Reasoning</Text>
                <Ionicons
                  name={isReasoningExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={darkTheme.colors.text.tertiary}
                />
              </TouchableOpacity>
            )}
            {item.reasoning && isReasoningExpanded && (
              <View style={styles.reasoningExpandedContainer}>
                <Text style={styles.reasoningExpandedText}>{item.reasoning}</Text>
              </View>
            )}
            <ExpandableMessageContent
              content={msg.content}
              isUser={isUser}
              isDark={colorScheme === 'dark'}
              lineLimit={20}
            />
          </View>
        );
      }
    }
  };

  const handleScroll = (e: any) => {
    const y = e.nativeEvent.contentOffset.y;
    setScrollY(y);
    const threshold = 80;
    const distanceFromBottom = Math.max(0, contentHeight - (y + containerHeight));
    setShowScrollToBottom(distanceFromBottom > threshold);
  };

  const handleContentSizeChange = (_w: number, h: number) => {
    setContentHeight(h);
    if (pendingJumpToBottomRef.current && containerHeight > 0 && pendingJumpRetriesRef.current > 0) {
      const offset = Math.max(0, h - containerHeight);
      scrollViewRef.current?.scrollToOffset({ offset, animated: false });
      setShowScrollToBottom(false);
      pendingJumpRetriesRef.current -= 1;
      if (pendingJumpRetriesRef.current <= 0) pendingJumpToBottomRef.current = false;
    }
  };

  const handleMessagesLayout = (e: any) => {
    const h = e.nativeEvent.layout.height;
    setContainerHeight(h);
    if (pendingJumpToBottomRef.current && contentHeight > 0 && pendingJumpRetriesRef.current > 0) {
      const offset = Math.max(0, contentHeight - h);
      scrollViewRef.current?.scrollToOffset({ offset, animated: false });
      setShowScrollToBottom(false);
      pendingJumpRetriesRef.current -= 1;
      if (pendingJumpRetriesRef.current <= 0) pendingJumpToBottomRef.current = false;
    }
  };

  const scrollToBottom = () => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
  };

  const handleInputLayout = (e: any) => {
    setInputContainerHeight(e.nativeEvent.layout.height || 0);
  };

  const inputStyles = {
    width: '100%',
    minHeight: 44,
    maxHeight: 120,
    paddingLeft: 18,
    paddingRight: 130,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 28,
    color: colorScheme === 'dark' ? '#000000' : '#FFFFFF', // Inverted: black text in dark mode
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    lineHeight: 20,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' && {
      // @ts-ignore
      background: 'transparent',
      backgroundImage: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    }),
  } as const;

  if (isLoadingToken || !fontsLoaded) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.interactive.primary} />
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  if (!isConnected) {
    return (
      <CoLoginScreen
        onLogin={handleLogin}
        isLoading={isConnecting}
        error={connectionError}
      />
    );
  }

  if (isInitializingCo || !coAgent) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: theme.colors.background.primary }]}>
        <ActivityIndicator size="large" color={theme.colors.interactive.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.text.secondary }]}>Initializing co...</Text>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaView>
    );
  }

  // Main chat view
  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background.primary }]}
      // @ts-ignore - web-only data attribute
      dataSet={{ theme: colorScheme }}
    >
      {/* Sidebar */}
      <Animated.View
        style={[
          styles.sidebarContainer,
          {
            paddingTop: insets.top,
            backgroundColor: theme.colors.background.secondary,
            borderRightColor: theme.colors.border.primary,
            width: sidebarAnimRef.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 280],
            }),
          },
        ]}
      >
        <View style={styles.sidebarHeader}>
          <Text style={[styles.sidebarTitle, { color: theme.colors.text.primary }]}>Menu</Text>
          <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.closeSidebar}>
            <Ionicons name="close" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Menu Items */}
        <View style={styles.menuItems}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border.primary }]}
            onPress={() => {
              setActiveSidebarTab('memory');
              loadMemoryBlocks();
            }}
          >
            <Ionicons name="library-outline" size={24} color={theme.colors.text.primary} />
            <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Memory</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border.primary }]}
            onPress={() => {
              setActiveSidebarTab('files');
            }}
          >
            <Ionicons name="document-text-outline" size={24} color={theme.colors.text.primary} />
            <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Files</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border.primary }]}
            onPress={() => {
              toggleColorScheme();
            }}
          >
            <Ionicons
              name={colorScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={24}
              color={theme.colors.text.primary}
            />
            <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>
              {colorScheme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border.primary }]}
            onPress={() => {
              if (coAgent) {
                Linking.openURL(`https://app.letta.com/agents/${coAgent.id}`);
              }
            }}
            disabled={!coAgent}
          >
            <Ionicons name="open-outline" size={24} color={theme.colors.text.primary} />
            <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Open in Browser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border.primary }]}
            onPress={() => {
              setSidebarVisible(false);
              handleLogout();
            }}
          >
            <Ionicons name="log-out-outline" size={24} color={theme.colors.text.primary} />
            <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Memory blocks section - only show when memory tab is active */}
        {activeSidebarTab === 'memory' && (
          <View style={styles.memorySection}>
            <Text style={[styles.memorySectionTitle, { color: theme.colors.text.secondary }]}>Memory Blocks</Text>
            {isLoadingBlocks ? (
              <ActivityIndicator size="large" color={theme.colors.text.secondary} />
            ) : blocksError ? (
              <Text style={styles.errorText}>{blocksError}</Text>
            ) : (
              <FlatList
                data={memoryBlocks}
                keyExtractor={(item) => item.id || item.label}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.memoryBlockItem, {
                      backgroundColor: theme.colors.background.primary,
                      borderColor: theme.colors.border.primary
                    }]}
                    onPress={() => setSelectedBlock(item)}
                  >
                    <Text style={[styles.memoryBlockLabel, { color: theme.colors.text.primary }]}>{item.label}</Text>
                    <Text style={[styles.memoryBlockPreview, { color: theme.colors.text.secondary }]} numberOfLines={2}>
                      {item.value}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        )}

        {/* Files section - only show when files tab is active */}
        {activeSidebarTab === 'files' && (
          <View style={styles.memorySection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={[styles.memorySectionTitle, { color: theme.colors.text.secondary, marginBottom: 0 }]}>Files</Text>
              <TouchableOpacity
                onPress={pickAndUploadFile}
                disabled={isUploadingFile}
                style={{ padding: 4 }}
              >
                {isUploadingFile ? (
                  <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color={theme.colors.text.primary} />
                )}
              </TouchableOpacity>
            </View>
            {isLoadingFiles ? (
              <ActivityIndicator size="large" color={theme.colors.text.secondary} />
            ) : filesError ? (
              <Text style={styles.errorText}>{filesError}</Text>
            ) : folderFiles.length === 0 ? (
              <Text style={[styles.memoryBlockPreview, { color: theme.colors.text.secondary, textAlign: 'center', marginTop: 20 }]}>
                No files uploaded yet
              </Text>
            ) : (
              <FlatList
                data={folderFiles}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View
                    style={[styles.memoryBlockItem, {
                      backgroundColor: theme.colors.background.primary,
                      borderColor: theme.colors.border.primary,
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.memoryBlockLabel, { color: theme.colors.text.primary }]} numberOfLines={1}>
                        {item.fileName || item.name || 'Untitled'}
                      </Text>
                      <Text style={[styles.memoryBlockPreview, { color: theme.colors.text.secondary, fontSize: 12 }]}>
                        {new Date(item.createdAt || item.created_at).toLocaleDateString()}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => deleteFile(item.id, item.fileName || item.name)}
                      style={{ padding: 8 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={theme.colors.status.error} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        )}
      </Animated.View>

      {/* Main content area */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.primary }]}>
          <TouchableOpacity onPress={() => setSidebarVisible(!sidebarVisible)} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>co</Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

      {/* Messages */}
      <View style={styles.messagesContainer} onLayout={handleMessagesLayout}>
        <FlatList
          ref={scrollViewRef}
          data={groupedMessages}
          renderItem={renderMessageGroup}
          keyExtractor={(item) => item.key}
          onScroll={handleScroll}
          onContentSizeChange={handleContentSizeChange}
          contentContainerStyle={styles.messagesList}
          ListHeaderComponent={
            hasMoreBefore ? (
              <TouchableOpacity onPress={loadMoreMessages} style={styles.loadMoreButton}>
                {isLoadingMore ? (
                  <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                ) : (
                  <Text style={styles.loadMoreText}>Load more messages</Text>
                )}
              </TouchableOpacity>
            ) : null
          }
          ListFooterComponent={
            <>
              {isStreaming && (
                <Animated.View style={[styles.assistantFullWidthContainer, { minHeight: spacerHeightAnim }]}>
                  {/* Always show reasoning section when streaming */}
                  <TouchableOpacity
                    onPress={() => toggleReasoning('streaming')}
                    style={styles.reasoningToggle}
                  >
                    {isReasoningStreaming ? (
                      <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Animated.Text
                          style={{
                            fontSize: 24,
                            fontFamily: 'Lexend_700Bold',
                            color: rainbowAnimValue.interpolate({
                              inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                              outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
                            })
                          }}
                        >
                          co
                        </Animated.Text>
                        <Text style={{ fontSize: 24, fontFamily: 'Lexend_400Regular', color: darkTheme.colors.text.tertiary }}> is thinking</Text>
                      </View>
                    ) : (
                      <Text style={styles.reasoningToggleText}>Reasoning</Text>
                    )}
                    {!isReasoningStreaming && (
                      <Ionicons
                        name={expandedReasoning.has('streaming') ? "chevron-up" : "chevron-down"}
                        size={16}
                        color={darkTheme.colors.text.tertiary}
                      />
                    )}
                  </TouchableOpacity>
                  {expandedReasoning.has('streaming') && (
                    <View style={styles.reasoningExpandedContainer}>
                      <Text style={styles.reasoningExpandedText}>
                        {streamingReasoning || ''}
                      </Text>
                    </View>
                  )}
                  {streamingStep && (
                    <Text style={styles.streamingStep}>{streamingStep}</Text>
                  )}
                  {streamingMessage && (
                    <MessageContent
                      content={streamingMessage + ' ○'}
                      isUser={false}
                      isDark={colorScheme === 'dark'}
                    />
                  )}
                </Animated.View>
              )}
            </>
          }
          ListEmptyComponent={
            isLoadingMessages ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color={theme.colors.text.secondary} />
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Start your conversation with Co</Text>
              </View>
            )
          }
        />

        {/* Scroll to newest message button */}
        {showScrollToBottom && (
          <TouchableOpacity onPress={scrollToBottom} style={styles.scrollToBottomButton}>
            <Ionicons
              name="arrow-down"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]} onLayout={handleInputLayout}>
        <View style={styles.inputCentered}>
          {/* Solid backdrop matching theme */}
          <View style={[
            styles.inputBackdrop,
            {
              backgroundColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
              borderWidth: 0,
            }
          ]} />

          {/* Image preview section */}
          {selectedImages.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {selectedImages.map((img, index) => (
                <View key={index} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    onPress={() => removeImage(index)}
                    style={styles.removeImageButton}
                  >
                    <Ionicons name="close-circle" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          <View style={styles.inputWrapper}>
            <TouchableOpacity
              onPress={pickAndUploadFile}
              style={styles.fileButton}
              disabled={isSendingMessage || isUploadingFile}
            >
              <Ionicons name="attach-outline" size={24} color="#888888" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.imageButton}
              disabled={isSendingMessage}
            >
              <Ionicons name="image-outline" size={24} color="#888888" />
            </TouchableOpacity>
            <TextInput
              style={inputStyles}
              placeholder=""
              placeholderTextColor={colorScheme === 'dark' ? '#666666' : '#999999'}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={4000}
              editable={!isSendingMessage}
              autoFocus
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                { backgroundColor: theme.colors.background.primary },
                ((!inputText.trim() && selectedImages.length === 0) || isSendingMessage) && styles.sendButtonDisabled
              ]}
              disabled={(!inputText.trim() && selectedImages.length === 0) || isSendingMessage}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#fff' : '#000'} />
              ) : (
                <View style={[styles.sendRing, { borderColor: colorScheme === 'dark' ? CoColors.pureWhite : CoColors.deepBlack }]} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </View>

      {/* Memory block detail modal */}
      <Modal
        visible={selectedBlock !== null}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSelectedBlock(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.detailContainer, { paddingTop: insets.top }]}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailTitle}>{selectedBlock?.label}</Text>
              <TouchableOpacity onPress={() => setSelectedBlock(null)}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <Text style={styles.detailContent}>{selectedBlock?.value}</Text>
          </View>
        </View>
      </Modal>

      {/* Approval modal */}
      <Modal
        visible={approvalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setApprovalVisible(false)}
      >
        <View style={styles.approvalOverlay}>
          <View style={styles.approvalContainer}>
            <Text style={styles.approvalTitle}>Tool Approval Required</Text>

            {approvalData?.toolName && (
              <Text style={styles.approvalTool}>Tool: {approvalData.toolName}</Text>
            )}

            {approvalData?.reasoning && (
              <View style={styles.approvalReasoning}>
                <Text style={styles.approvalReasoningLabel}>Reasoning:</Text>
                <Text style={styles.approvalReasoningText}>{approvalData.reasoning}</Text>
              </View>
            )}

            <TextInput
              style={styles.approvalInput}
              placeholder="Optional reason..."
              placeholderTextColor={theme.colors.text.tertiary}
              value={approvalReason}
              onChangeText={setApprovalReason}
              multiline
            />

            <View style={styles.approvalButtons}>
              <TouchableOpacity
                style={[styles.approvalButton, styles.denyButton]}
                onPress={() => handleApproval(false)}
                disabled={isApproving}
              >
                <Text style={styles.approvalButtonText}>Deny</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.approvalButton, styles.approveButton]}
                onPress={() => handleApproval(true)}
                disabled={isApproving}
              >
                {isApproving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.approvalButtonText}>Approve</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <StatusBar style="auto" />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <CoApp />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: darkTheme.colors.background.primary,
  },
  mainContent: {
    flex: 1,
    flexDirection: 'column',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: darkTheme.colors.background.primary,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: darkTheme.colors.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
  },
  menuButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 36,
    fontFamily: 'Lexend_700Bold',
    color: darkTheme.colors.text.primary,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonDisabled: {
    opacity: 0.3,
  },
  headerSpacer: {
    width: 40,
  },
  logoutButton: {
    padding: 8,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 100, // Space for input at bottom
  },
  messageContainer: {
    paddingHorizontal: 40,
    paddingVertical: 8,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  assistantFullWidthContainer: {
    paddingHorizontal: 40,
    paddingVertical: 12,
    width: '100%',
  },
  messageBubble: {
    maxWidth: 600,
    padding: 12,
    borderRadius: 24,
  },
  userBubble: {
    // Background color set dynamically per theme in render
  },
  messageImagesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  messageImage: {
    width: 200,
    height: 200,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  assistantBubble: {
    backgroundColor: darkTheme.colors.background.secondary,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
  },
  userMessageText: {
    color: darkTheme.colors.background.primary,
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
  },
  assistantMessageText: {
    color: darkTheme.colors.text.primary,
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
  },
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  reasoningToggleText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.tertiary,
    marginRight: 4,
  },
  reasoningExpandedContainer: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 6,
    borderLeftWidth: 2,
    borderLeftColor: darkTheme.colors.text.tertiary,
  },
  reasoningExpandedText: {
    fontSize: 13,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.tertiary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reasoningContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: darkTheme.colors.border.primary,
  },
  reasoningLabel: {
    fontSize: 12,
    fontFamily: 'Lexend_600SemiBold',
    color: darkTheme.colors.text.secondary,
    marginBottom: 4,
  },
  reasoningText: {
    fontSize: 12,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.tertiary,
    fontStyle: 'italic',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    color: darkTheme.colors.text.secondary,
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
  },
  streamingStep: {
    fontSize: 12,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
    fontStyle: 'italic',
    marginBottom: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
    textAlign: 'center',
  },
  scrollToBottomButton: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: darkTheme.colors.interactive.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  inputCentered: {
    position: 'relative',
    maxWidth: 800,
    width: '100%',
  },
  inputBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 28,
    zIndex: -1,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  fileButton: {
    position: 'absolute',
    right: 88,
    bottom: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageButton: {
    position: 'absolute',
    right: 52,
    bottom: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imagePreviewContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 12,
    gap: 8,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  imagePreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
  },
  sendButton: {
    position: 'absolute',
    right: 10,
    bottom: 6,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendRing: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: darkTheme.colors.background.primary,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sidebarContainer: {
    height: '100%',
    backgroundColor: darkTheme.colors.background.secondary,
    borderRightWidth: 1,
    borderRightColor: darkTheme.colors.border.primary,
    overflow: 'hidden',
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
  },
  closeSidebar: {
    padding: 8,
  },
  sidebarTitle: {
    fontSize: 24,
    fontFamily: 'Lexend_700Bold',
    color: darkTheme.colors.text.primary,
  },
  menuItems: {
    paddingTop: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: darkTheme.colors.border.primary,
  },
  menuItemText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.primary,
    marginLeft: 16,
  },
  memorySection: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  memorySectionTitle: {
    fontSize: 14,
    fontFamily: 'Lexend_600SemiBold',
    color: darkTheme.colors.text.secondary,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  memoryBlockItem: {
    padding: 16,
    backgroundColor: darkTheme.colors.background.secondary,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
  },
  memoryBlockLabel: {
    fontSize: 16,
    fontFamily: 'Lexend_600SemiBold',
    color: darkTheme.colors.text.primary,
    marginBottom: 4,
  },
  memoryBlockPreview: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
  },
  detailContainer: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: darkTheme.colors.background.primary,
    borderRadius: 16,
    padding: 20,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailTitle: {
    fontSize: 20,
    fontFamily: 'Lexend_700Bold',
    color: darkTheme.colors.text.primary,
  },
  detailContent: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.primary,
    lineHeight: 24,
  },
  errorText: {
    color: darkTheme.colors.status.error,
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    textAlign: 'center',
  },
  approvalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  approvalContainer: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: darkTheme.colors.background.primary,
    borderRadius: 16,
    padding: 20,
  },
  approvalTitle: {
    fontSize: 20,
    fontFamily: 'Lexend_700Bold',
    color: darkTheme.colors.text.primary,
    marginBottom: 16,
  },
  approvalTool: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.primary,
    marginBottom: 12,
  },
  approvalReasoning: {
    backgroundColor: darkTheme.colors.background.secondary,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  approvalReasoningLabel: {
    fontSize: 12,
    fontFamily: 'Lexend_600SemiBold',
    color: darkTheme.colors.text.secondary,
    marginBottom: 4,
  },
  approvalReasoningText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.primary,
  },
  approvalInput: {
    height: 80,
    borderWidth: 1,
    borderColor: darkTheme.colors.border.primary,
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.primary,
    backgroundColor: darkTheme.colors.background.secondary,
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  approvalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  approvalButton: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  denyButton: {
    backgroundColor: darkTheme.colors.status.error,
  },
  approveButton: {
    backgroundColor: darkTheme.colors.status.success,
  },
  approvalButtonText: {
    color: darkTheme.colors.background.primary,
    fontSize: 16,
    fontFamily: 'Lexend_600SemiBold',
  },
  typingCursor: {
    width: 2,
    height: 20,
    backgroundColor: darkTheme.colors.interactive.primary,
    marginLeft: 2,
    marginTop: 2,
  },
  compactionContainer: {
    marginVertical: 16,
    marginHorizontal: 20,
  },
  compactionLine: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  compactionDivider: {
    flex: 1,
    height: 1,
    backgroundColor: '#3a3a3a',
  },
  compactionLabel: {
    fontSize: 11,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.tertiary,
    marginHorizontal: 12,
    textTransform: 'lowercase',
  },
  compactionChevron: {
    marginLeft: 4,
  },
  compactionMessageContainer: {
    marginTop: 8,
    padding: 12,
    backgroundColor: darkTheme.colors.background.surface,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: darkTheme.colors.border.secondary,
  },
  compactionMessageText: {
    fontSize: 13,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
    lineHeight: 18,
  },
});
