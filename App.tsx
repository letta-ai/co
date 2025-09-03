import React, { useState, useEffect } from 'react';
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
  Modal 
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import lettaApi from './src/api/lettaApi';
import CreateAgentScreen from './CreateAgentScreen';
import type { LettaAgent, LettaMessage } from './src/types/letta';

export default function App() {
  // Authentication state
  const [apiToken, setApiToken] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Agent state
  const [agents, setAgents] = useState<LettaAgent[]>([]);
  const [currentAgent, setCurrentAgent] = useState<LettaAgent | null>(null);
  const [showAgentSelector, setShowAgentSelector] = useState(false);
  const [showCreateAgentScreen, setShowCreateAgentScreen] = useState(false);
  
  // Message state
  const [messages, setMessages] = useState<LettaMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

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
        setIsConnected(true);
        await loadAgents();
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

  const loadAgents = async () => {
    try {
      const agentList = await lettaApi.listAgents();
      setAgents(agentList);
      
      if (agentList.length > 0) {
        // Auto-select first agent
        const firstAgent = agentList[0];
        setCurrentAgent(firstAgent);
        await loadMessagesForAgent(firstAgent.id);
      } else {
        // Show option to create agent
        Alert.alert(
          'No Agents Found',
          'Would you like to create your first agent?',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'Create Agent', onPress: () => setShowCreateAgentScreen(true) }
          ]
        );
      }
    } catch (error: any) {
      console.error('Failed to load agents:', error);
      Alert.alert('Error', 'Failed to load agents: ' + error.message);
    }
  };

  const loadMessagesForAgent = async (agentId: string) => {
    setIsLoadingMessages(true);
    try {
      const messageHistory = await lettaApi.listMessages(agentId, { limit: 50 });
      console.log('Loaded messages for agent:', messageHistory);
      
      // Filter and transform messages for display
      const displayMessages = messageHistory
        .filter(msg => msg.message_type === 'user_message' || msg.message_type === 'assistant_message')
        .map(msg => ({
          id: msg.id,
          role: msg.message_type === 'user_message' ? 'user' : 'assistant',
          content: msg.content || '',
          created_at: msg.date,
        }));
      
      setMessages(displayMessages);
    } catch (error: any) {
      console.error('Failed to load messages:', error);
      Alert.alert('Error', 'Failed to load messages: ' + error.message);
    } finally {
      setIsLoadingMessages(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || !currentAgent) return;

    const userMessage: LettaMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: inputText.trim(),
      created_at: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsSendingMessage(true);
    const messageToSend = inputText.trim();
    setInputText('');

    try {
      const response = await lettaApi.sendMessage(currentAgent.id, {
        messages: [{ role: 'user', content: messageToSend }],
      });

      console.log('Response messages:', response.messages);
      
      // Filter and transform response messages for display
      const displayMessages = response.messages
        .filter(msg => msg.message_type === 'user_message' || msg.message_type === 'assistant_message')
        .map(msg => ({
          id: msg.id,
          role: msg.message_type === 'user_message' ? 'user' : 'assistant',
          content: msg.content || '',
          created_at: msg.date,
        }));
      
      // Check if the user message is included in the response
      const hasUserMessage = displayMessages.some(msg => msg.role === 'user' && msg.content === messageToSend);
      
      setMessages(prev => {
        const filteredPrev = prev.filter(m => m.id !== userMessage.id);
        
        if (hasUserMessage) {
          // Response includes user message, use all response messages
          return [...filteredPrev, ...displayMessages];
        } else {
          // Response doesn't include user message, keep our user message and add assistant messages
          const assistantMessages = displayMessages.filter(msg => msg.role === 'assistant');
          const finalUserMessage = {
            ...userMessage,
            id: `user-${Date.now()}`, // Give it a proper ID
            created_at: new Date().toISOString(),
          };
          return [...filteredPrev, finalUserMessage, ...assistantMessages];
        }
      });
    } catch (error: any) {
      console.error('Failed to send message:', error);
      Alert.alert('Error', 'Failed to send message: ' + error.message);
      
      // Remove the temp message on error
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setInputText(messageToSend); // Restore the message
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleAgentCreated = async (agent: LettaAgent) => {
    setAgents(prev => [...prev, agent]);
    setCurrentAgent(agent);
    setShowCreateAgentScreen(false);
    
    // Load actual messages from the API
    await loadMessagesForAgent(agent.id);
    
    Alert.alert('Success', `Agent "${agent.name}" created successfully!`);
  };

  const handleCreateAgentCancel = () => {
    setShowCreateAgentScreen(false);
  };


  if (!isConnected) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <Text style={styles.title}>Letta Chat</Text>
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
            Get your API token from the Letta dashboard
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

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.agentSelector}
          onPress={() => setShowAgentSelector(true)}
        >
          <Text style={styles.headerTitle}>
            {currentAgent ? currentAgent.name : 'Select Agent'}
          </Text>
          <Text style={styles.agentCount}>
            {agents.length} agent{agents.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
        
        <View style={styles.headerButtons}>
          <TouchableOpacity onPress={() => setShowCreateAgentScreen(true)}>
            <Text style={styles.createAgentButton}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsConnected(false)}>
            <Text style={styles.disconnectButton}>Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {isLoadingMessages ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>Loading messages...</Text>
        </View>
      ) : (
        <ScrollView style={styles.messagesContainer}>
          {messages.length === 0 && currentAgent && (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                Start a conversation with {currentAgent.name}
              </Text>
            </View>
          )}
          
          {messages.map((message, index) => (
            <View
              key={`${message.id || 'msg'}-${index}-${message.created_at}`}
              style={[
                styles.messageBubble,
                message.role === 'user' ? styles.userMessage : styles.agentMessage,
              ]}
            >
              <Text style={[
                styles.messageText,
                message.role === 'user' ? styles.userText : styles.agentText,
              ]}>
                {message.content}
              </Text>
            </View>
          ))}
          
          {isSendingMessage && (
            <View style={[styles.messageBubble, styles.agentMessage]}>
              <ActivityIndicator size="small" color="#666" />
            </View>
          )}
        </ScrollView>
      )}
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
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
      
      {/* Agent Selector Modal */}
      <Modal
        visible={showAgentSelector}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAgentSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Agent</Text>
            <ScrollView style={styles.agentList}>
              {agents.map((agent) => (
                <TouchableOpacity
                  key={agent.id}
                  style={[
                    styles.agentItem,
                    currentAgent?.id === agent.id && styles.selectedAgentItem
                  ]}
                  onPress={async () => {
                    setCurrentAgent(agent);
                    await loadMessagesForAgent(agent.id);
                    setShowAgentSelector(false);
                  }}
                >
                  <Text style={styles.agentName}>{agent.name}</Text>
                  <Text style={styles.agentDescription}>
                    Created {new Date(agent.created_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowAgentSelector(false)}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>


      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f8f8',
  },
  setupContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#007AFF',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    maxWidth: 400,
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 20,
    backgroundColor: '#fff',
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  agentSelector: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  agentCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  createAgentButton: {
    fontSize: 24,
    color: '#007AFF',
    fontWeight: '300',
  },
  disconnectButton: {
    fontSize: 16,
    color: '#007AFF',
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
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  messageBubble: {
    marginVertical: 4,
    maxWidth: '80%',
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  agentMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#e5e5ea',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userText: {
    color: '#fff',
  },
  agentText: {
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e5ea',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e5ea',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  agentList: {
    maxHeight: 300,
  },
  agentItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5ea',
  },
  selectedAgentItem: {
    backgroundColor: '#f0f8ff',
  },
  agentName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  agentDescription: {
    fontSize: 14,
    color: '#666',
  },
  modalCloseButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
  },
  modalCloseText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    fontSize: 16,
    backgroundColor: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    paddingVertical: 12,
  },
  modalCancelText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  modalCreateButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
  },
  modalCreateText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
