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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
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
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

  // Streaming state
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingStep, setStreamingStep] = useState<string>('');
  const [streamingMessageId, setStreamingMessageId] = useState<string>('');
  const [streamingReasoning, setStreamingReasoning] = useState<string>('');
  const [lastMessageNeedsSpace, setLastMessageNeedsSpace] = useState(false);
  const spacerHeightAnim = useRef(new Animated.Value(0)).current;
  const streamCompleteRef = useRef(false);

  // Token buffering for smooth streaming
  const tokenBufferRef = useRef<string>('');
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
  const [activeSidebarTab, setActiveSidebarTab] = useState<'memory'>('memory');
  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([]);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [blocksError, setBlocksError] = useState<string | null>(null);
  const [selectedBlock, setSelectedBlock] = useState<MemoryBlock | null>(null);

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

  const sendMessage = async () => {
    if (!inputText.trim() || !coAgent || isSendingMessage) return;

    const messageText = inputText.trim();
    setInputText('');
    setIsSendingMessage(true);

    // Remove space from previous message before adding new user message
    setLastMessageNeedsSpace(false);
    spacerHeightAnim.setValue(0);

    // Immediately add user message to UI
    const tempUserMessage: LettaMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: messageText,
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
      tokenBufferRef.current = '';
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
            setStreamingStep('');

            const finalMessage: LettaMessage = {
              id: streamingMessageId || `msg_${Date.now()}`,
              role: 'assistant',
              content: currentContent,
              created_at: new Date().toISOString(),
              reasoning: streamingReasoning || undefined,
            };

            setMessages(prev => [...prev, finalMessage]);
            setStreamingMessageId('');
            setStreamingReasoning('');

            return '';
          });
        }
      }, 20); // 50 FPS

      toolCallMsgIdsRef.current.clear();
      toolReturnMsgIdsRef.current.clear();

      await lettaApi.sendMessageStream(
        coAgent.id,
        {
          messages: [{ role: 'user', content: messageText }],
          use_assistant_message: true,
          stream_tokens: true,
        },
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
          setStreamingMessage('');
          setStreamingStep('');
          setStreamingMessageId('');
          setStreamingReasoning('');
          tokenBufferRef.current = '';
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
    console.log('Streaming chunk:', chunk.message_type, 'content:', chunk.content);

    // Capture message ID if present
    if (chunk.id && !streamingMessageId) {
      setStreamingMessageId(chunk.id);
    }

    if (chunk.message_type === 'assistant_message' && chunk.content) {
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
      // Accumulate reasoning
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

  useEffect(() => {
    if (coAgent && sidebarVisible && activeSidebarTab === 'memory') {
      loadMemoryBlocks();
    }
  }, [coAgent, sidebarVisible, activeSidebarTab]);

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
              <ExpandableMessageContent
                content={msg.content}
                isUser={isUser}
                isDark={colorScheme === 'dark'}
                lineLimit={3}
              />
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
    if (messageDirection === 'reversed') {
      // When inverted, newest messages are at top (offset 0)
      scrollViewRef.current?.scrollToOffset({ offset: 0, animated: true });
    } else {
      // Normal mode: scroll to end (newest at bottom)
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
    setShowScrollToBottom(false);
  };

  const handleInputLayout = (e: any) => {
    setInputContainerHeight(e.nativeEvent.layout.height || 0);
  };

  const inputStyles = {
    flex: 1,
    maxHeight: 100,
    height: 48,
    paddingLeft: 18,
    paddingRight: 54,
    paddingTop: 14,
    paddingBottom: 14,
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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top, backgroundColor: theme.colors.background.secondary, borderBottomColor: theme.colors.border.primary }]}>
        <TouchableOpacity onPress={() => setSidebarVisible(true)} style={styles.menuButton}>
          <Ionicons name="menu" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.colors.text.primary }]}>co</Text>
        </View>

        <TouchableOpacity
          onPress={toggleColorScheme}
          style={styles.headerButton}
        >
          <Ionicons
            name={colorScheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
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
              name={messageDirection === 'reversed' ? 'arrow-up' : 'arrow-down'}
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
          <View style={styles.inputWrapper}>
            <TextInput
              style={inputStyles}
              placeholder=""
              placeholderTextColor={colorScheme === 'dark' ? '#666666' : '#999999'}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={4000}
              editable={!isSendingMessage}
            />
            <TouchableOpacity
              onPress={sendMessage}
              style={[
                styles.sendButton,
                { backgroundColor: theme.colors.background.primary },
                (!inputText.trim() || isSendingMessage) && styles.sendButtonDisabled
              ]}
              disabled={!inputText.trim() || isSendingMessage}
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

      {/* Sidebar */}
      <Modal
        visible={sidebarVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setSidebarVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setSidebarVisible(false)}
        >
          <View style={[styles.sidebarContainer, { paddingTop: insets.top }]}>
            <TouchableOpacity onPress={() => setSidebarVisible(false)} style={styles.closeSidebar}>
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </TouchableOpacity>

            <Text style={styles.sidebarTitle}>co Memory</Text>

            {isLoadingBlocks ? (
              <ActivityIndicator size="large" color={darkTheme.colors.text.secondary} />
            ) : blocksError ? (
              <Text style={styles.errorText}>{blocksError}</Text>
            ) : (
              <FlatList
                data={memoryBlocks}
                keyExtractor={(item) => item.id || item.label}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.memoryBlockItem}
                    onPress={() => setSelectedBlock(item)}
                  >
                    <Text style={styles.memoryBlockLabel}>{item.label}</Text>
                    <Text style={styles.memoryBlockPreview} numberOfLines={2}>
                      {item.value}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </TouchableOpacity>
      </Modal>

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
    backgroundColor: darkTheme.colors.background.primary,
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
    paddingVertical: 4,
    marginBottom: 8,
  },
  reasoningToggleText: {
    fontSize: 13,
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
  sendButton: {
    position: 'absolute',
    right: 10,
    top: '50%',
    transform: [{ translateY: -18 }],
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
    width: '100%',
    maxHeight: '80%',
    backgroundColor: darkTheme.colors.background.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  closeSidebar: {
    alignSelf: 'flex-end',
    padding: 8,
  },
  sidebarTitle: {
    fontSize: 24,
    fontFamily: 'Lexend_700Bold',
    color: darkTheme.colors.text.primary,
    marginBottom: 16,
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
