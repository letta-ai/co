/**
 * StreamingTestPage - Minimal test page for debugging streaming accumulation
 *
 * This page shows exactly what's happening with streaming chunks:
 * - Raw chunks as they arrive
 * - Accumulated text in real-time
 * - Message groups as they're rendered
 */

import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useAgentStore } from './src/stores/agentStore';
import { useChatStore } from './src/stores/chatStore';
import { useAuth } from './src/hooks/useAuth';
import { useAgent } from './src/hooks/useAgent';
import lettaApi from './src/api/lettaApi';
import type { StreamingChunk } from './src/types/letta';
import CoLoginScreen from './CoLoginScreen';

export default function StreamingTestPage() {
  const [input, setInput] = useState('');
  const [chunks, setChunks] = useState<Array<{ type: string; content: string; timestamp: number }>>([]);
  const [isSending, setIsSending] = useState(false);

  const { isConnected, isLoadingToken } = useAuth();
  const { coAgent, isInitializingCo } = useAgent();
  const currentStream = useChatStore((state) => state.currentStream);
  const isStreaming = useChatStore((state) => state.isStreaming);
  const chatStore = useChatStore();

  // Show login if not connected
  if (!isConnected) {
    return <CoLoginScreen />;
  }

  // Show loading if initializing agent
  if (isLoadingToken || isInitializingCo || !coAgent) {
    return (
      <View style={styles.container}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>Initializing agent...</Text>
        </View>
      </View>
    );
  }

  const handleSend = async () => {
    if (!input.trim() || !coAgent || isSending) return;

    const messageText = input.trim();
    setInput('');
    setChunks([]);
    setIsSending(true);

    try {
      chatStore.startStreaming();

      const payload = {
        messages: [{ role: 'user', content: messageText }],
        use_assistant_message: true,
        stream_tokens: true,
      };

      await lettaApi.sendMessageStream(
        coAgent.id,
        payload,
        (chunk: StreamingChunk) => {
          // Log every chunk
          const timestamp = Date.now();
          console.log('[CHUNK]', chunk.message_type, chunk);

          // Add to visual log
          setChunks((prev) => [
            ...prev,
            {
              type: chunk.message_type,
              content: JSON.stringify(chunk, null, 2),
              timestamp,
            },
          ]);

          // Process through normal handlers
          if (chunk.message_type === 'reasoning_message' && chunk.reasoning) {
            chatStore.updateStreamReasoning(chunk.reasoning);
          } else if (chunk.message_type === 'assistant_message' && chunk.content) {
            let contentText = '';
            const content = chunk.content as any;

            if (typeof content === 'string') {
              contentText = content;
            } else if (typeof content === 'object' && content !== null) {
              if (Array.isArray(content)) {
                contentText = content
                  .filter((item: any) => item.type === 'text')
                  .map((item: any) => item.text || '')
                  .join('');
              } else if (content.text) {
                contentText = content.text;
              }
            }

            if (contentText) {
              chatStore.updateStreamAssistant(contentText);
            }
          }
        },
        (response) => {
          console.log('[STREAM COMPLETE]', response);
          chatStore.stopStreaming();
          setIsSending(false);
        },
        (error) => {
          console.error('[STREAM ERROR]', error);
          chatStore.stopStreaming();
          setIsSending(false);
        }
      );
    } catch (error) {
      console.error('[SEND ERROR]', error);
      chatStore.stopStreaming();
      setIsSending(false);
    }
  };

  const handleClear = () => {
    setChunks([]);
    chatStore.clearStream();
    chatStore.stopStreaming();
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Streaming Test Page</Text>
          <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>Clear</Text>
          </TouchableOpacity>
        </View>

        {/* Status */}
        <View style={styles.status}>
          <Text style={styles.statusText}>
            Agent: {coAgent ? coAgent.id.substring(0, 8) : 'None'}
          </Text>
          <Text style={styles.statusText}>
            Streaming: {isStreaming ? 'Yes' : 'No'}
          </Text>
        </View>

        {/* Accumulated State */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📊 Accumulated State</Text>
          <ScrollView style={styles.stateContainer}>
            <Text style={styles.label}>Reasoning ({currentStream.reasoning.length} chars):</Text>
            <Text style={styles.content}>{currentStream.reasoning || '(empty)'}</Text>

            <Text style={styles.label}>Assistant ({currentStream.assistantMessage.length} chars):</Text>
            <Text style={styles.content}>{currentStream.assistantMessage || '(empty)'}</Text>

            <Text style={styles.label}>Tool Calls ({currentStream.toolCalls.length}):</Text>
            <Text style={styles.content}>
              {currentStream.toolCalls.length > 0
                ? currentStream.toolCalls.map((tc) => tc.args).join('\n')
                : '(none)'}
            </Text>
          </ScrollView>
        </View>

        {/* Raw Chunks */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📦 Raw Chunks ({chunks.length})</Text>
          <ScrollView style={styles.chunksContainer}>
            {chunks.map((chunk, idx) => (
              <View key={idx} style={styles.chunk}>
                <Text style={styles.chunkType}>
                  [{idx}] {chunk.type}
                </Text>
                <Text style={styles.chunkContent}>{chunk.content}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Input */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="Type a message to test streaming..."
            placeholderTextColor="#666"
            editable={!isSending}
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            style={[styles.sendButton, (!input.trim() || isSending) && styles.sendButtonDisabled]}
            disabled={!input.trim() || isSending}
          >
            <Text style={styles.sendButtonText}>{isSending ? 'Sending...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  clearButton: {
    padding: 8,
    backgroundColor: '#333',
    borderRadius: 4,
  },
  clearButtonText: {
    color: '#fff',
    fontSize: 14,
  },
  status: {
    padding: 16,
    backgroundColor: '#222',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  statusText: {
    color: '#aaa',
    fontSize: 12,
    marginBottom: 4,
  },
  section: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  sectionTitle: {
    padding: 8,
    backgroundColor: '#222',
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  stateContainer: {
    flex: 1,
    padding: 12,
  },
  label: {
    color: '#888',
    fontSize: 12,
    marginTop: 8,
    marginBottom: 4,
  },
  content: {
    color: '#fff',
    fontSize: 13,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 8,
  },
  chunksContainer: {
    flex: 1,
    padding: 12,
  },
  chunk: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#222',
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: '#0a84ff',
  },
  chunkType: {
    color: '#0a84ff',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chunkContent: {
    color: '#aaa',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#222',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#0a84ff',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#333',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
