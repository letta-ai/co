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
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
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
import MemoryBlockViewer from './src/components/MemoryBlockViewer';
import { darkTheme, lightTheme, CoColors } from './src/theme';
import type { LettaAgent, LettaMessage, StreamingChunk, MemoryBlock, Passage } from './src/types/letta';

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
  const [isInputFocused, setIsInputFocused] = useState(false);

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
  const [activeSidebarTab, setActiveSidebarTab] = useState<'files'>('files');
  const [currentView, setCurrentView] = useState<'chat' | 'knowledge'>('chat');
  const [knowledgeTab, setKnowledgeTab] = useState<'core' | 'archival' | 'files'>('core');
  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<MemoryBlock | null>(null);
  const [memorySearchQuery, setMemorySearchQuery] = useState('');
  const sidebarAnimRef = useRef(new Animated.Value(0)).current;
  const [developerMode, setDeveloperMode] = useState(true);
  const [headerClickCount, setHeaderClickCount] = useState(0);
  const headerClickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // File management state
  const [coFolder, setCoFolder] = useState<any | null>(null);
  const [folderFiles, setFolderFiles] = useState<any[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);

  // Archival memory state
  const [passages, setPassages] = useState<Passage[]>([]);
  const [isLoadingPassages, setIsLoadingPassages] = useState(false);
  const [passagesError, setPassagesError] = useState<string | null>(null);
  const [passageSearchQuery, setPassageSearchQuery] = useState('');
  const [selectedPassage, setSelectedPassage] = useState<Passage | null>(null);
  const [isCreatingPassage, setIsCreatingPassage] = useState(false);
  const [isEditingPassage, setIsEditingPassage] = useState(false);
  const [passageAfterCursor, setPassageAfterCursor] = useState<string | undefined>(undefined);
  const [hasMorePassages, setHasMorePassages] = useState(false);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>('');
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
      console.log('=== CO AGENT INITIALIZED ===');
      console.log('Co agent ID:', agent.id);
      console.log('Co agent name:', agent.name);
      console.log('Co agent LLM config:', JSON.stringify(agent.llmConfig, null, 2));
      console.log('LLM model:', agent.llmConfig?.model);
      console.log('LLM context window:', agent.llmConfig?.contextWindow);
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

  const copyToClipboard = async (content: string) => {
    try {
      await Clipboard.setStringAsync(content);
      // Optionally show a brief success feedback
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
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
          console.error('=== APP STREAMING ERROR CALLBACK ===');
          console.error('Streaming error:', error);
          console.error('Error type:', typeof error);
          console.error('Error keys:', Object.keys(error || {}));
          console.error('Error details:', {
            message: error?.message,
            status: error?.status,
            code: error?.code,
            response: error?.response,
            responseData: error?.responseData
          });

          // Try to log full error structure
          try {
            console.error('Full error JSON:', JSON.stringify(error, null, 2));
          } catch (e) {
            console.error('Could not stringify error:', e);
          }

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

          // Create detailed error message
          let errorMsg = 'Failed to send message';
          if (error?.message) {
            errorMsg += ': ' + error.message;
          }
          if (error?.status) {
            errorMsg += ' (Status: ' + error.status + ')';
          }
          if (error?.responseData) {
            try {
              const responseStr = typeof error.responseData === 'string'
                ? error.responseData
                : JSON.stringify(error.responseData);
              errorMsg += '\nDetails: ' + responseStr;
            } catch (e) {
              // ignore
            }
          }

          Alert.alert('Error', errorMsg);
        }
      );
    } catch (error: any) {
      console.error('=== APP SEND MESSAGE OUTER CATCH ===');
      console.error('Failed to send message:', error);
      console.error('Error type:', typeof error);
      console.error('Error keys:', Object.keys(error || {}));
      console.error('Error details:', {
        message: error?.message,
        status: error?.status,
        code: error?.code,
        response: error?.response,
        responseData: error?.responseData
      });

      try {
        console.error('Full error JSON:', JSON.stringify(error, null, 2));
      } catch (e) {
        console.error('Could not stringify error:', e);
      }

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

  // Archival Memory (Passages) functions
  const loadPassages = async (resetCursor = false) => {
    if (!coAgent) return;

    setIsLoadingPassages(true);
    setPassagesError(null);
    try {
      const params: any = {
        limit: 50,
      };

      if (!resetCursor && passageAfterCursor) {
        params.after = passageAfterCursor;
      }

      if (passageSearchQuery) {
        params.search = passageSearchQuery;
      }

      const result = await lettaApi.listPassages(coAgent.id, params);

      if (resetCursor) {
        setPassages(result);
      } else {
        setPassages(prev => [...prev, ...result]);
      }

      setHasMorePassages(result.length === 50);
      if (result.length > 0) {
        setPassageAfterCursor(result[result.length - 1].id);
      }
    } catch (error: any) {
      console.error('Failed to load passages:', error);
      setPassagesError(error.message || 'Failed to load passages');
    } finally {
      setIsLoadingPassages(false);
    }
  };

  const createPassage = async (text: string, tags?: string[]) => {
    if (!coAgent) return;

    setIsLoadingPassages(true);
    try {
      await lettaApi.createPassage(coAgent.id, { text, tags });
      await loadPassages(true);
      Alert.alert('Success', 'Passage created successfully');
    } catch (error: any) {
      console.error('Failed to create passage:', error);
      Alert.alert('Error', error.message || 'Failed to create passage');
    } finally {
      setIsLoadingPassages(false);
    }
  };

  const deletePassage = async (passageId: string) => {
    if (!coAgent) return;

    const confirmed = Platform.OS === 'web'
      ? window.confirm('Are you sure you want to delete this passage?')
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete Passage',
            'Are you sure you want to delete this passage?',
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await lettaApi.deletePassage(coAgent.id, passageId);
      await loadPassages(true);
      if (Platform.OS === 'web') {
        window.alert('Passage deleted successfully');
      } else {
        Alert.alert('Success', 'Passage deleted');
      }
    } catch (error: any) {
      console.error('Delete passage error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete passage: ' + (error.message || 'Unknown error'));
      } else {
        Alert.alert('Error', 'Failed to delete passage: ' + (error.message || 'Unknown error'));
      }
    }
  };

  const modifyPassage = async (passageId: string, text: string, tags?: string[]) => {
    if (!coAgent) return;

    setIsLoadingPassages(true);
    try {
      await lettaApi.modifyPassage(coAgent.id, passageId, { text, tags });
      await loadPassages(true);
      Alert.alert('Success', 'Passage updated successfully');
    } catch (error: any) {
      console.error('Failed to modify passage:', error);
      Alert.alert('Error', error.message || 'Failed to modify passage');
    } finally {
      setIsLoadingPassages(false);
    }
  };

  const initializeCoFolder = async () => {
    if (!coAgent) return;

    try {
      console.log('Initializing co folder...');

      let folder: any = null;

      // First, try to get cached folder ID
      const cachedFolderId = await Storage.getItem(STORAGE_KEYS.CO_FOLDER_ID);
      if (cachedFolderId) {
        console.log('Found cached folder ID:', cachedFolderId);
        try {
          // Try to get the folder by ID directly (we'll need to add this method)
          const folders = await lettaApi.listFolders({ name: 'co-app' });
          folder = folders.find(f => f.id === cachedFolderId);
          if (folder) {
            console.log('Using cached folder:', folder.id, folder.name);
          } else {
            console.log('Cached folder ID not found, will search...');
            await Storage.removeItem(STORAGE_KEYS.CO_FOLDER_ID);
          }
        } catch (error) {
          console.log('Failed to get cached folder, will search:', error);
          await Storage.removeItem(STORAGE_KEYS.CO_FOLDER_ID);
        }
      }

      // If we don't have a cached folder, search for it
      if (!folder) {
        console.log('Searching for co-app folder...');
        const folders = await lettaApi.listFolders({ name: 'co-app' });
        console.log('Folder query result:', folders.length, 'folders');
        folder = folders.length > 0 ? folders[0] : null;
        console.log('Selected folder:', folder ? { id: folder.id, name: folder.name } : null);
      }

      // If still no folder, create it
      if (!folder) {
        console.log('Creating co-app folder...');
        try {
          folder = await lettaApi.createFolder('co-app', 'Files shared with co');
          console.log('Folder created:', folder.id, 'name:', folder.name);
        } catch (createError: any) {
          // If 409 conflict, folder was created by another process - try to find it again
          if (createError.status === 409) {
            console.log('Folder already exists (409), retrying fetch...');
            const foldersRetry = await lettaApi.listFolders({ name: 'co-app' });
            console.log('Retry folder query result:', foldersRetry.length, 'folders');
            folder = foldersRetry.length > 0 ? foldersRetry[0] : null;
            if (!folder) {
              console.error('Folder "co-app" not found after 409 conflict');
              setFilesError('Folder "co-app" exists but could not be retrieved. Try refreshing.');
              return;
            }
          } else {
            throw createError;
          }
        }
      }

      // Cache the folder ID for next time
      await Storage.setItem(STORAGE_KEYS.CO_FOLDER_ID, folder.id);
      console.log('Cached folder ID:', folder.id);

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
        setUploadProgress(`Uploading ${file.name}...`);

        // Show immediate feedback
        console.log(`Starting upload: ${file.name}`);

        try {
          // Upload file - this returns the job info
          const result = await lettaApi.uploadFileToFolder(coFolder.id, file);
          console.log('Upload result:', result);

          // The upload might complete immediately or return a job
          if (result.id && result.id.startsWith('file-')) {
            // It's a job ID - poll for completion
            setUploadProgress('Processing file...');
            let attempts = 0;
            const maxAttempts = 30; // 30 seconds max

            while (attempts < maxAttempts) {
              await new Promise(resolve => setTimeout(resolve, 1000));

              try {
                const status = await lettaApi.getJobStatus(result.id);
                console.log('Job status:', status.status);

                if (status.status === 'completed') {
                  console.log('File uploaded successfully');
                  await loadFolderFiles();

                  // Close all open files to avoid flooding context
                  if (coAgent) {
                    try {
                      await lettaApi.closeAllFiles(coAgent.id);
                      console.log('Closed all open files after upload');
                    } catch (err) {
                      console.error('Failed to close files:', err);
                    }
                  }

                  setUploadProgress('');
                  Alert.alert('Success', `${file.name} uploaded successfully`);
                  break;
                } else if (status.status === 'failed') {
                  throw new Error('Upload failed: ' + (status.metadata || 'Unknown error'));
                }
              } catch (jobError: any) {
                // If job not found (404), it might have completed already
                if (jobError.status === 404) {
                  console.log('Job not found - assuming completed');
                  await loadFolderFiles();

                  // Close all open files to avoid flooding context
                  if (coAgent) {
                    try {
                      await lettaApi.closeAllFiles(coAgent.id);
                      console.log('Closed all open files after upload');
                    } catch (err) {
                      console.error('Failed to close files:', err);
                    }
                  }

                  setUploadProgress('');
                  Alert.alert('Success', `${file.name} uploaded successfully`);
                  break;
                }
                throw jobError;
              }

              attempts++;
            }

            if (attempts >= maxAttempts) {
              throw new Error('Upload processing timed out');
            }
          } else {
            // Upload completed immediately
            console.log('File uploaded immediately');
            await loadFolderFiles();

            // Close all open files to avoid flooding context
            if (coAgent) {
              try {
                await lettaApi.closeAllFiles(coAgent.id);
                console.log('Closed all open files after upload');
              } catch (err) {
                console.error('Failed to close files:', err);
              }
            }

            setUploadProgress('');
            Alert.alert('Success', `${file.name} uploaded successfully`);
          }
        } catch (error: any) {
          console.error('Upload error:', error);
          setUploadProgress('');
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

    const confirmed = Platform.OS === 'web'
      ? window.confirm(`Are you sure you want to delete "${fileName}"?`)
      : await new Promise<boolean>((resolve) => {
          Alert.alert(
            'Delete File',
            `Are you sure you want to delete "${fileName}"?`,
            [
              { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
            ]
          );
        });

    if (!confirmed) return;

    try {
      await lettaApi.deleteFile(coFolder.id, fileId);
      await loadFolderFiles();
      if (Platform.OS === 'web') {
        window.alert('File deleted successfully');
      } else {
        Alert.alert('Success', 'File deleted');
      }
    } catch (error: any) {
      console.error('Delete error:', error);
      if (Platform.OS === 'web') {
        window.alert('Failed to delete file: ' + (error.message || 'Unknown error'));
      } else {
        Alert.alert('Error', 'Failed to delete file: ' + (error.message || 'Unknown error'));
      }
    }
  };

  useEffect(() => {
    if (coAgent && currentView === 'knowledge') {
      if (knowledgeTab === 'core') {
        loadMemoryBlocks();
      } else if (knowledgeTab === 'archival') {
        loadPassages(true);
      }
    }
  }, [coAgent, currentView, knowledgeTab]);

  useEffect(() => {
    if (coAgent && sidebarVisible) {
      if (!coFolder) {
        initializeCoFolder();
      } else {
        loadFolderFiles();
      }
    }
  }, [coAgent, sidebarVisible]);

  // Initialize folder when agent is ready
  useEffect(() => {
    if (coAgent && !coFolder) {
      initializeCoFolder();
    }
  }, [coAgent]);

  // State for tracking expanded reasoning
  const [expandedReasoning, setExpandedReasoning] = useState<Set<string>>(new Set());
  const [expandedCompaction, setExpandedCompaction] = useState<Set<string>>(new Set());

  // Animate sidebar
  useEffect(() => {
    Animated.timing(sidebarAnimRef, {
      toValue: sidebarVisible ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [sidebarVisible]);

  // Animate rainbow gradient for "co is thinking", input box, and reasoning sections
  useEffect(() => {
    if (isReasoningStreaming || isInputFocused || expandedReasoning.size > 0) {
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
  }, [isReasoningStreaming, isInputFocused, expandedReasoning]);

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

    // Build a map to find reasoning messages that precede tool calls
    const reasoningBeforeToolCall = new Map<string, string>();
    const reasoningMessagesToSkip = new Set<string>();

    for (let i = 0; i < messages.length - 1; i++) {
      const current = messages[i];
      const next = messages[i + 1];

      // If current message has reasoning and next is a tool_call, associate them
      if (current.reasoning && next.message_type?.includes('tool_call') && next.id) {
        reasoningBeforeToolCall.set(next.id, current.reasoning);
        reasoningMessagesToSkip.add(current.id); // Mark this message to skip
        console.log('🔗 Found reasoning before tool call:', {
          toolCallId: next.id,
          reasoningMsgId: current.id,
          reasoning: current.reasoning.substring(0, 100) + '...'
        });
      }
    }

    messages.forEach(msg => {
      if (processedIds.has(msg.id)) return;

      // Skip reasoning messages that precede tool calls
      if (reasoningMessagesToSkip.has(msg.id)) {
        processedIds.add(msg.id);
        console.log('⏭️  Skipping reasoning message that precedes tool call:', msg.id);
        return;
      }

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
          // Get reasoning from the message that preceded the tool call
          const reasoning = reasoningBeforeToolCall.get(toolCall.id);
          console.log('📦 Creating tool pair group:');
          console.log('  toolCall.id:', toolCall.id);
          console.log('  reasoning from map:', reasoning);

          groups.push({
            key: toolCall.id,
            type: 'toolPair',
            call: toolCall,
            ret: msg,
            reasoning: reasoning,
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

      // DEBUG LOGGING
      console.log('🔧 Tool Pair Debug:');
      console.log('  item.reasoning:', item.reasoning);
      console.log('  item.call.reasoning:', item.call.reasoning);
      console.log('  item.ret?.reasoning:', item.ret?.reasoning);
      console.log('  item.call keys:', Object.keys(item.call));
      console.log('  Full item.call:', JSON.stringify(item.call, null, 2));

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
      const reasoning = item.reasoning || undefined;

      console.log('  Final reasoning value:', reasoning);

      return (
        <View key={item.key} style={styles.messageContainer}>
          <ToolCallItem
            callText={callText}
            resultText={resultText}
            reasoning={reasoning}
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
                <Ionicons
                  name="sparkles"
                  size={16}
                  color={darkTheme.colors.text.secondary}
                  style={{ marginRight: 6 }}
                />
                <Text style={styles.reasoningToggleText}>Reasoning</Text>
                <View style={{ flex: 1 }} />
                <Ionicons
                  name={isReasoningExpanded ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={darkTheme.colors.text.tertiary}
                />
              </TouchableOpacity>
            )}
            {item.reasoning && isReasoningExpanded && (
              <Animated.View style={[
                styles.reasoningExpandedContainer,
                {
                  borderLeftColor: rainbowAnimValue.interpolate({
                    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                    outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
                  }),
                }
              ]}>
                <Text style={styles.reasoningExpandedText}>{item.reasoning}</Text>
              </Animated.View>
            )}
            <ExpandableMessageContent
              content={msg.content}
              isUser={isUser}
              isDark={colorScheme === 'dark'}
              lineLimit={20}
            />
            <View style={styles.copyButtonContainer}>
              <TouchableOpacity
                onPress={() => copyToClipboard(msg.content)}
                style={styles.copyButton}
                activeOpacity={0.7}
                testID="copy-button"
              >
                <Ionicons
                  name="copy-outline"
                  size={16}
                  color={theme.colors.text.tertiary}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.messageSeparator} />
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

  const inputStyles = useMemo(() => ({
    width: '100%',
    height: 48,
    paddingLeft: 18,
    paddingRight: 130,
    paddingTop: 12,
    paddingBottom: 12,
    borderRadius: 24,
    color: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
    fontFamily: 'Lexend_400Regular',
    fontSize: 16,
    lineHeight: 24,
    borderWidth: 0,
    backgroundColor: theme.colors.background.primary,
    ...(Platform.OS === 'web' && {
      // @ts-ignore
      outline: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
    }),
  } as const), [colorScheme, theme]);

  const inputWrapperStyle = useMemo(() => ({
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colorScheme === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  }), [colorScheme]);

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

        <FlatList
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1 }}
          ListHeaderComponent={
            <View style={styles.menuItems}>
          <TouchableOpacity
            style={[styles.menuItem, { borderBottomColor: theme.colors.border.primary }]}
            onPress={() => {
              setCurrentView('knowledge');
              loadMemoryBlocks();
            }}
          >
            <Ionicons name="library-outline" size={24} color={theme.colors.text.primary} />
            <Text style={[styles.menuItemText, { color: theme.colors.text.primary }]}>Knowledge</Text>
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

          {developerMode && (
            <TouchableOpacity
              style={[styles.menuItem, { borderBottomColor: theme.colors.border.primary }]}
              onPress={async () => {
                console.log('Refresh Co button pressed');
                const confirmed = Platform.OS === 'web'
                  ? window.confirm('This will delete the current co agent and create a new one. All conversation history will be lost. Are you sure?')
                  : await new Promise<boolean>((resolve) => {
                      Alert.alert(
                        'Refresh Co Agent',
                        'This will delete the current co agent and create a new one. All conversation history will be lost. Are you sure?',
                        [
                          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
                          { text: 'Refresh', style: 'destructive', onPress: () => resolve(true) },
                        ]
                      );
                    });

                if (!confirmed) return;

                console.log('Refresh confirmed, starting process...');
                setSidebarVisible(false);
                try {
                  if (coAgent) {
                    console.log('Deleting agent:', coAgent.id);
                    const deleteResult = await lettaApi.deleteAgent(coAgent.id);
                    console.log('Delete result:', deleteResult);
                    console.log('Agent deleted successfully, clearing state...');
                    setCoAgent(null);
                    setMessages([]);
                    setEarliestCursor(null);
                    setHasMoreBefore(false);
                    console.log('Initializing new co agent...');
                    await initializeCo();
                    console.log('Co agent refreshed successfully');
                    if (Platform.OS === 'web') {
                      window.alert('Co agent refreshed successfully');
                    } else {
                      Alert.alert('Success', 'Co agent refreshed successfully');
                    }
                  }
                } catch (error: any) {
                  console.error('=== ERROR REFRESHING CO ===');
                  console.error('Error type:', typeof error);
                  console.error('Error message:', error?.message);
                  console.error('Error stack:', error?.stack);
                  console.error('Full error:', error);
                  if (Platform.OS === 'web') {
                    window.alert('Failed to refresh co: ' + (error.message || 'Unknown error'));
                  } else {
                    Alert.alert('Error', 'Failed to refresh co: ' + (error.message || 'Unknown error'));
                  }
                }
              }}
            >
              <Ionicons name="refresh-outline" size={24} color={theme.colors.status.error} />
              <Text style={[styles.menuItemText, { color: theme.colors.status.error }]}>Refresh Co</Text>
            </TouchableOpacity>
          )}

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
          }
          data={[]}
          renderItem={() => null}
        />
      </Animated.View>

      {/* Main content area */}
      <View style={styles.mainContent}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.primary }]}>
          <TouchableOpacity onPress={() => setSidebarVisible(!sidebarVisible)} style={styles.menuButton}>
            <Ionicons name="menu" size={24} color={theme.colors.text.primary} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <TouchableOpacity
              onPress={() => {
                setHeaderClickCount(prev => prev + 1);

                if (headerClickTimeoutRef.current) {
                  clearTimeout(headerClickTimeoutRef.current);
                }

                headerClickTimeoutRef.current = setTimeout(() => {
                  if (headerClickCount >= 6) {
                    setDeveloperMode(!developerMode);
                    if (Platform.OS === 'web') {
                      window.alert(developerMode ? 'Developer mode disabled' : 'Developer mode enabled');
                    } else {
                      Alert.alert('Developer Mode', developerMode ? 'Disabled' : 'Enabled');
                    }
                  }
                  setHeaderClickCount(0);
                }, 2000);
              }}
            >
              <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>co</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* View Switcher */}
        <View style={[styles.viewSwitcher, { backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.primary }]}>
          <TouchableOpacity
            style={[
              styles.viewSwitcherButton,
              currentView === 'chat' && { backgroundColor: theme.colors.background.tertiary }
            ]}
            onPress={() => setCurrentView('chat')}
          >
            <Text style={[
              styles.viewSwitcherText,
              { color: currentView === 'chat' ? theme.colors.text.primary : theme.colors.text.tertiary }
            ]}>Chat</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewSwitcherButton,
              currentView === 'knowledge' && { backgroundColor: theme.colors.background.tertiary }
            ]}
            onPress={() => {
              setCurrentView('knowledge');
              loadMemoryBlocks();
            }}
          >
            <Text style={[
              styles.viewSwitcherText,
              { color: currentView === 'knowledge' ? theme.colors.text.primary : theme.colors.text.tertiary }
            ]}>Knowledge</Text>
          </TouchableOpacity>
        </View>

        {/* Chat and Knowledge Row */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatRow}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 60 : 0}
        >
          {currentView === 'chat' ? (
          <>
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
                      <>
                        <Ionicons
                          name="sparkles"
                          size={16}
                          color={darkTheme.colors.text.secondary}
                          style={{ marginRight: 6 }}
                        />
                        <Text style={styles.reasoningToggleText}>Reasoning</Text>
                        <View style={{ flex: 1 }} />
                      </>
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
                    <Animated.View style={[
                      styles.reasoningExpandedContainer,
                      {
                        borderLeftColor: rainbowAnimValue.interpolate({
                          inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                          outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
                        }),
                      }
                    ]}>
                      <Text style={styles.reasoningExpandedText}>
                        {streamingReasoning || ''}
                      </Text>
                    </Animated.View>
                  )}
                  {streamingStep && (
                    <Text style={styles.streamingStep}>{streamingStep}</Text>
                  )}
                  {streamingMessage && (
                    <>
                      <View style={{ flex: 1 }}>
                        <MessageContent
                          content={streamingMessage}
                          isUser={false}
                          isDark={colorScheme === 'dark'}
                        />
                        <Text style={{ color: theme.colors.text.tertiary, marginTop: 4 }}>○</Text>
                      </View>
                      <View style={styles.copyButtonContainer}>
                        <TouchableOpacity
                          onPress={() => copyToClipboard(streamingMessage)}
                          style={styles.copyButton}
                          activeOpacity={0.7}
                          testID="copy-button"
                        >
                          <Ionicons
                            name="copy-outline"
                            size={16}
                            color={theme.colors.text.tertiary}
                          />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.messageSeparator} />
                    </>
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
      <View
        style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}
        onLayout={handleInputLayout}
      >
        <View style={styles.inputCentered}>
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

          <Animated.View style={[
            styles.inputWrapper,
            inputWrapperStyle,
            isInputFocused && {
              borderColor: rainbowAnimValue.interpolate({
                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
              }),
              shadowColor: rainbowAnimValue.interpolate({
                inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
                outputRange: ['#FF6B6B', '#FFD93D', '#6BCF7F', '#4D96FF', '#9D4EDD', '#FF6B6B']
              }),
              shadowOpacity: 0.4,
              shadowRadius: 16,
            }
          ]}>
            <TouchableOpacity
              onPress={pickAndUploadFile}
              style={styles.fileButton}
              disabled={isSendingMessage || isUploadingFile}
            >
              <Ionicons name="attach-outline" size={20} color="#666666" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.imageButton}
              disabled={isSendingMessage}
            >
              <Ionicons name="image-outline" size={20} color="#666666" />
            </TouchableOpacity>
            <TextInput
              style={inputStyles}
              placeholder="What's on your mind?"
              placeholderTextColor={colorScheme === 'dark' ? '#666666' : '#999999'}
              value={inputText}
              onChangeText={setInputText}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              multiline
              maxLength={4000}
              editable={!isSendingMessage}
              autoFocus
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                {
                  backgroundColor: (!inputText.trim() && selectedImages.length === 0) || isSendingMessage
                    ? 'transparent'
                    : colorScheme === 'dark' ? CoColors.pureWhite : CoColors.deepBlack
                },
              ]}
              disabled={(!inputText.trim() && selectedImages.length === 0) || isSendingMessage}
            >
              {isSendingMessage ? (
                <ActivityIndicator size="small" color={colorScheme === 'dark' ? '#fff' : '#000'} />
              ) : (
                <Ionicons
                  name="arrow-up"
                  size={20}
                  color={
                    (!inputText.trim() && selectedImages.length === 0)
                      ? '#444444'
                      : colorScheme === 'dark' ? CoColors.deepBlack : CoColors.pureWhite
                  }
                />
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>
      </>
      ) : (
        /* Knowledge View */
        <View style={styles.memoryViewContainer}>
          {/* Knowledge Tabs */}
          <View style={[styles.knowledgeTabs, { backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.primary }]}>
            <TouchableOpacity
              style={[
                styles.knowledgeTab,
                knowledgeTab === 'core' && { borderBottomColor: theme.colors.text.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setKnowledgeTab('core')}
            >
              <Text style={[
                styles.knowledgeTabText,
                { color: knowledgeTab === 'core' ? theme.colors.text.primary : theme.colors.text.tertiary }
              ]}>Core Memory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.knowledgeTab,
                knowledgeTab === 'archival' && { borderBottomColor: theme.colors.text.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setKnowledgeTab('archival')}
            >
              <Text style={[
                styles.knowledgeTabText,
                { color: knowledgeTab === 'archival' ? theme.colors.text.primary : theme.colors.text.tertiary }
              ]}>Archival Memory</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.knowledgeTab,
                knowledgeTab === 'files' && { borderBottomColor: theme.colors.text.primary, borderBottomWidth: 2 }
              ]}
              onPress={() => setKnowledgeTab('files')}
            >
              <Text style={[
                styles.knowledgeTabText,
                { color: knowledgeTab === 'files' ? theme.colors.text.primary : theme.colors.text.tertiary }
              ]}>Files</Text>
            </TouchableOpacity>
          </View>

          {/* Search bars */}
          {knowledgeTab === 'core' && (
            <View style={styles.memorySearchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.text.tertiary} style={styles.memorySearchIcon} />
              <TextInput
                style={[styles.memorySearchInput, {
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.tertiary,
                  borderColor: theme.colors.border.primary,
                }]}
                placeholder="Search memory blocks..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={memorySearchQuery}
                onChangeText={setMemorySearchQuery}
              />
            </View>
          )}

          {knowledgeTab === 'archival' && (
            <View style={styles.memorySearchContainer}>
              <Ionicons name="search" size={20} color={theme.colors.text.tertiary} style={styles.memorySearchIcon} />
              <TextInput
                style={[styles.memorySearchInput, {
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.background.tertiary,
                  borderColor: theme.colors.border.primary,
                  paddingRight: passageSearchQuery ? 96 : 60,
                }]}
                placeholder="Search archival memory..."
                placeholderTextColor={theme.colors.text.tertiary}
                value={passageSearchQuery}
                onChangeText={setPassageSearchQuery}
                onSubmitEditing={() => loadPassages(true)}
              />
              {passageSearchQuery && (
                <TouchableOpacity
                  style={{ position: 'absolute', right: 64, padding: 8 }}
                  onPress={() => {
                    setPassageSearchQuery('');
                    loadPassages(true);
                  }}
                >
                  <Ionicons name="close-circle" size={20} color={theme.colors.text.tertiary} />
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={{ position: 'absolute', right: 28, padding: 8 }}
                onPress={() => setIsCreatingPassage(true)}
              >
                <Ionicons name="add-circle-outline" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
          )}

          {/* Knowledge blocks grid */}
          <View style={styles.memoryBlocksGrid}>
            {knowledgeTab === 'files' ? (
              /* Files view */
              <>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12 }}>
                  <Text style={[styles.memorySectionTitle, { color: theme.colors.text.secondary, marginBottom: 0 }]}>Uploaded Files</Text>
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
                {uploadProgress && (
                  <View style={{ marginHorizontal: 8, marginBottom: 12, paddingVertical: 8, paddingHorizontal: 12, backgroundColor: theme.colors.background.tertiary, borderRadius: 8 }}>
                    <Text style={{ color: theme.colors.text.secondary, fontSize: 14 }}>{uploadProgress}</Text>
                  </View>
                )}
                {isLoadingFiles ? (
                  <View style={styles.memoryLoadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.text.secondary} />
                  </View>
                ) : filesError ? (
                  <Text style={[styles.errorText, { textAlign: 'center', marginTop: 40 }]}>{filesError}</Text>
                ) : folderFiles.length === 0 ? (
                  <View style={styles.memoryEmptyState}>
                    <Ionicons name="folder-outline" size={64} color={theme.colors.text.tertiary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.memoryEmptyText, { color: theme.colors.text.tertiary }]}>No files uploaded yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={folderFiles}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.memoryBlocksContent}
                    renderItem={({ item }) => (
                      <View
                        style={[styles.memoryBlockCard, {
                          backgroundColor: theme.colors.background.secondary,
                          borderColor: theme.colors.border.primary,
                          flexDirection: 'row',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          minHeight: 'auto'
                        }]}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.memoryBlockCardLabel, { color: theme.colors.text.primary }]} numberOfLines={1}>
                            {item.fileName || item.name || 'Untitled'}
                          </Text>
                          <Text style={[styles.memoryBlockCardPreview, { color: theme.colors.text.secondary, fontSize: 12 }]}>
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
              </>
            ) : knowledgeTab === 'archival' ? (
              /* Archival Memory view */
              isLoadingPassages ? (
                  <View style={styles.memoryLoadingContainer}>
                    <ActivityIndicator size="large" color={theme.colors.text.secondary} />
                  </View>
                ) : passagesError ? (
                  <Text style={[styles.errorText, { textAlign: 'center', marginTop: 40 }]}>{passagesError}</Text>
                ) : passages.length === 0 ? (
                  <View style={styles.memoryEmptyState}>
                    <Ionicons name="archive-outline" size={64} color={theme.colors.text.tertiary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.memoryEmptyText, { color: theme.colors.text.tertiary }]}>No archival memories yet</Text>
                  </View>
                ) : (
                  <FlatList
                    data={passages}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.memoryBlocksContent}
                    renderItem={({ item }) => (
                      <View
                        style={[styles.memoryBlockCard, {
                          backgroundColor: theme.colors.background.secondary,
                          borderColor: theme.colors.border.primary,
                        }]}
                      >
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <Text style={[styles.memoryBlockCardPreview, { color: theme.colors.text.tertiary, fontSize: 11, flex: 1 }]}>
                            {new Date(item.created_at).toLocaleString()}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => {
                                setSelectedPassage(item);
                                setIsEditingPassage(true);
                              }}
                              style={{ padding: 4 }}
                            >
                              <Ionicons name="create-outline" size={18} color={theme.colors.text.secondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => deletePassage(item.id)}
                              style={{ padding: 4 }}
                            >
                              <Ionicons name="trash-outline" size={18} color={theme.colors.status.error} />
                            </TouchableOpacity>
                          </View>
                        </View>
                        <Text
                          style={[styles.memoryBlockCardPreview, { color: theme.colors.text.primary }]}
                          numberOfLines={6}
                        >
                          {item.text}
                        </Text>
                        {item.tags && item.tags.length > 0 && (
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                            {item.tags.map((tag, idx) => (
                              <View key={idx} style={{ backgroundColor: theme.colors.background.tertiary, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                                <Text style={{ color: theme.colors.text.secondary, fontSize: 11 }}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                    ListFooterComponent={
                      hasMorePassages ? (
                        <TouchableOpacity
                          onPress={() => loadPassages(false)}
                          style={{ padding: 16, alignItems: 'center' }}
                        >
                          <Text style={{ color: theme.colors.text.secondary }}>Load more...</Text>
                        </TouchableOpacity>
                      ) : null
                    }
                  />
                )
            ) : isLoadingBlocks ? (
              <View style={styles.memoryLoadingContainer}>
                <ActivityIndicator size="large" color={theme.colors.text.secondary} />
              </View>
            ) : blocksError ? (
              <Text style={[styles.errorText, { textAlign: 'center', marginTop: 40 }]}>{blocksError}</Text>
            ) : (
              <FlatList
                data={memoryBlocks.filter(block => {
                  // Core memory: show all blocks
                  // Filter by search query
                  if (memorySearchQuery) {
                    return block.label.toLowerCase().includes(memorySearchQuery.toLowerCase()) ||
                           block.value.toLowerCase().includes(memorySearchQuery.toLowerCase());
                  }

                  return true;
                })}
                numColumns={isDesktop ? 2 : 1}
                key={isDesktop ? 'desktop' : 'mobile'}
                keyExtractor={(item) => item.id || item.label}
                contentContainerStyle={styles.memoryBlocksContent}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.memoryBlockCard, {
                      backgroundColor: theme.colors.background.secondary,
                      borderColor: theme.colors.border.primary
                    }]}
                    onPress={() => setSelectedBlock(item)}
                  >
                    <View style={styles.memoryBlockCardHeader}>
                      <Text style={[styles.memoryBlockCardLabel, { color: theme.colors.text.primary }]}>
                        {item.label}
                      </Text>
                      <Text style={[styles.memoryBlockCardCount, { color: theme.colors.text.tertiary }]}>
                        {item.value.length} chars
                      </Text>
                    </View>
                    <Text
                      style={[styles.memoryBlockCardPreview, { color: theme.colors.text.secondary }]}
                      numberOfLines={4}
                    >
                      {item.value || 'Empty'}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.memoryEmptyState}>
                    <Ionicons name="library-outline" size={64} color={theme.colors.text.tertiary} style={{ opacity: 0.3 }} />
                    <Text style={[styles.memoryEmptyText, { color: theme.colors.text.secondary }]}>
                      {memorySearchQuery ? 'No memory blocks found' : 'No memory blocks yet'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      )}

        {/* Knowledge block viewer - right pane on desktop */}
        {isDesktop && selectedBlock && (
          <MemoryBlockViewer
            block={selectedBlock}
            onClose={() => setSelectedBlock(null)}
            isDark={colorScheme === 'dark'}
            isDesktop={isDesktop}
          />
        )}
      </KeyboardAvoidingView>
    </View>

      {/* Knowledge block viewer - overlay on mobile */}
      {!isDesktop && selectedBlock && (
        <MemoryBlockViewer
          block={selectedBlock}
          onClose={() => setSelectedBlock(null)}
          isDark={colorScheme === 'dark'}
          isDesktop={isDesktop}
        />
      )}

      {/* Create/Edit Passage Modal */}
      {(isCreatingPassage || isEditingPassage) && (
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.background.primary, borderColor: theme.colors.border.primary }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.colors.text.primary }]}>
                {isCreatingPassage ? 'Create Passage' : 'Edit Passage'}
              </Text>
              <TouchableOpacity onPress={() => {
                setIsCreatingPassage(false);
                setIsEditingPassage(false);
                setSelectedPassage(null);
              }}>
                <Ionicons name="close" size={24} color={theme.colors.text.primary} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              <Text style={[styles.inputLabel, { color: theme.colors.text.secondary }]}>Text</Text>
              <TextInput
                style={[styles.textArea, { color: theme.colors.text.primary, backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}
                multiline
                numberOfLines={6}
                defaultValue={selectedPassage?.text || ''}
                placeholder="Enter passage text..."
                placeholderTextColor={theme.colors.text.tertiary}
                onChangeText={(text) => {
                  if (selectedPassage) {
                    setSelectedPassage({ ...selectedPassage, text });
                  } else {
                    setSelectedPassage({ text, id: '', created_at: new Date().toISOString() } as Passage);
                  }
                }}
              />
              <Text style={[styles.inputLabel, { color: theme.colors.text.secondary, marginTop: 16 }]}>Tags (comma-separated)</Text>
              <TextInput
                style={[styles.textInput, { color: theme.colors.text.primary, backgroundColor: theme.colors.background.secondary, borderColor: theme.colors.border.primary }]}
                defaultValue={selectedPassage?.tags?.join(', ') || ''}
                placeholder="tag1, tag2, tag3"
                placeholderTextColor={theme.colors.text.tertiary}
                onChangeText={(text) => {
                  const tags = text.split(',').map(t => t.trim()).filter(t => t);
                  if (selectedPassage) {
                    setSelectedPassage({ ...selectedPassage, tags });
                  } else {
                    setSelectedPassage({ text: '', tags, id: '', created_at: new Date().toISOString() } as Passage);
                  }
                }}
              />
            </View>
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary, { borderColor: theme.colors.border.primary }]}
                onPress={() => {
                  setIsCreatingPassage(false);
                  setIsEditingPassage(false);
                  setSelectedPassage(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary, { backgroundColor: theme.colors.text.primary }]}
                onPress={async () => {
                  if (!selectedPassage?.text) {
                    Alert.alert('Error', 'Please enter passage text');
                    return;
                  }
                  if (isEditingPassage && selectedPassage.id) {
                    await modifyPassage(selectedPassage.id, selectedPassage.text, selectedPassage.tags);
                  } else {
                    await createPassage(selectedPassage.text, selectedPassage.tags);
                  }
                  setIsCreatingPassage(false);
                  setIsEditingPassage(false);
                  setSelectedPassage(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.background.primary }]}>
                  {isCreatingPassage ? 'Create' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

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

      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
  chatRow: {
    flex: 1,
    flexDirection: 'row',
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
  viewSwitcher: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
  },
  viewSwitcherButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  viewSwitcherText: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
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
    maxWidth: 700,
    width: '100%',
    alignSelf: 'center',
    paddingBottom: 100, // Space for input at bottom
  },
  messageContainer: {
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  assistantMessageContainer: {
    alignItems: 'flex-start',
  },
  assistantFullWidthContainer: {
    paddingHorizontal: 18,
    paddingVertical: 16,
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
    fontSize: 18,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 26,
  },
  assistantMessageText: {
    color: darkTheme.colors.text.primary,
    fontSize: 18,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 26,
  },
  reasoningToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
  },
  reasoningToggleText: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
    color: darkTheme.colors.text.secondary,
  },
  reasoningExpandedContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingLeft: 20,
    marginBottom: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#555555',
    overflow: 'hidden',
  },
  reasoningExpandedText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.secondary,
    lineHeight: 22,
    fontStyle: 'normal',
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
    paddingHorizontal: 60,
    paddingVertical: 80,
  },
  emptyText: {
    fontSize: 24,
    fontFamily: 'Lexend_400Regular',
    color: darkTheme.colors.text.primary,
    textAlign: 'center',
    lineHeight: 36,
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
    maxWidth: 700,
    width: '100%',
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  fileButton: {
    position: 'absolute',
    right: 88,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  imageButton: {
    position: 'absolute',
    right: 52,
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
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
    bottom: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transition: 'all 0.2s ease',
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
    marginHorizontal: 18,
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
  // Memory View Styles
  memoryViewContainer: {
    flex: 1,
    backgroundColor: darkTheme.colors.background.primary,
  },
  knowledgeTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  knowledgeTab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
  },
  knowledgeTabText: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
  },
  memoryViewHeader: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: darkTheme.colors.border.primary,
  },
  backToChat: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backToChatText: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    marginLeft: 8,
  },
  memoryViewTitle: {
    fontSize: 32,
    fontFamily: 'Lexend_700Bold',
  },
  memorySearchContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  memorySearchIcon: {
    position: 'absolute',
    left: 36,
    zIndex: 1,
  },
  memorySearchInput: {
    flex: 1,
    height: 44,
    paddingLeft: 40,
    paddingRight: 16,
    borderRadius: 22,
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    borderWidth: 1,
  },
  memoryBlocksGrid: {
    flex: 1,
    paddingHorizontal: 16,
  },
  memoryBlocksContent: {
    paddingBottom: 24,
  },
  memoryLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  memoryBlockCard: {
    flex: 1,
    margin: 8,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 160,
    maxWidth: '100%',
  },
  memoryBlockCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  memoryBlockCardLabel: {
    fontSize: 18,
    fontFamily: 'Lexend_600SemiBold',
    flex: 1,
  },
  memoryBlockCardCount: {
    fontSize: 12,
    fontFamily: 'Lexend_400Regular',
    marginLeft: 8,
  },
  memoryBlockCardPreview: {
    fontSize: 14,
    fontFamily: 'Lexend_400Regular',
    lineHeight: 20,
  },
  memoryEmptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  memoryEmptyText: {
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    marginTop: 16,
  },
  assistantMessageWithCopyContainer: {
    position: 'relative',
    flex: 1,
  },
  copyButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 4,
  },
  copyButton: {
    padding: 8,
    opacity: 0.3,
    borderRadius: 4,
  },
  messageSeparator: {
    height: 1,
    backgroundColor: darkTheme.colors.border.primary,
    marginTop: 16,
    opacity: 0.8,
  },
  // Modal styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 600,
    borderRadius: 16,
    borderWidth: 1,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Lexend_600SemiBold',
  },
  modalBody: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Lexend_500Medium',
    marginBottom: 8,
  },
  textInput: {
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
  },
  textArea: {
    minHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: 'Lexend_400Regular',
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonSecondary: {
    borderWidth: 1,
  },
  modalButtonPrimary: {
    // Background color set dynamically
  },
  modalButtonText: {
    fontSize: 16,
    fontFamily: 'Lexend_500Medium',
  },
});
