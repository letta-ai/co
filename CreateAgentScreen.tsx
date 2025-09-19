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
  Switch,
  useColorScheme,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import lettaApi from './src/api/lettaApi';
import type { LettaAgent, LettaTool, LettaModel, MemoryBlock, CreateAgentRequest } from './src/types/letta';

interface CreateAgentScreenProps {
  onAgentCreated: (agent: LettaAgent) => void;
  onCancel: () => void;
}

export default function CreateAgentScreen({ onAgentCreated, onCancel }: CreateAgentScreenProps) {
  const colorScheme = useColorScheme();
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [memoryBlocks, setMemoryBlocks] = useState<MemoryBlock[]>([
    { label: 'human', value: 'The user is chatting via a mobile app.' },
    { label: 'persona', value: 'I am a helpful AI assistant.' }
  ]);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [sleepTimeEnabled, setSleepTimeEnabled] = useState(true);
  
  // Data state
  const [tools, setTools] = useState<LettaTool[]>([]);
  const [models, setModels] = useState<LettaModel[]>([]);
  
  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [showToolPicker, setShowToolPicker] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load tools and models with individual error handling
      const results = await Promise.allSettled([
        lettaApi.listTools(),
        lettaApi.listModels()
      ]);

      // Handle tools
      if (results[0].status === 'fulfilled') {
        setTools(results[0].value);
      } else {
        console.warn('Failed to load tools:', results[0].reason);
      }

      // Handle models
      if (results[1].status === 'fulfilled') {
        setModels(results[1].value);
        if (results[1].value.length > 0) {
          const firstModel = results[1].value[0];
          setSelectedModel(`${firstModel.provider_name}/${firstModel.model}`);
        }
      } else {
        console.warn('Failed to load models:', results[1].reason);
        Alert.alert('Warning', 'Could not load available models. You can still create an agent with default settings.');
      }
    } catch (error: any) {
      console.error('Failed to load data:', error);
      Alert.alert('Error', 'Failed to load configuration data. You can still create an agent with default settings.');
    } finally {
      setIsLoading(false);
    }
  };

  const addMemoryBlock = () => {
    setMemoryBlocks([...memoryBlocks, { label: '', value: '' }]);
  };

  const removeMemoryBlock = (index: number) => {
    setMemoryBlocks(memoryBlocks.filter((_, i) => i !== index));
  };

  const updateMemoryBlock = (index: number, field: 'label' | 'value', text: string) => {
    const updated = [...memoryBlocks];
    updated[index][field] = text;
    setMemoryBlocks(updated);
  };

  const toggleTool = (toolName: string) => {
    setSelectedTools(prev => 
      prev.includes(toolName) 
        ? prev.filter(name => name !== toolName)
        : [...prev, toolName]
    );
  };

  const createAgent = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a name for your agent');
      return;
    }

    setIsCreating(true);
    try {
      const agentData: CreateAgentRequest = {
        name: name.trim(),
      };

      // Add optional fields only if they have values
      if (description.trim()) {
        agentData.description = description.trim();
      }
      
      if (memoryBlocks.some(block => block.label && block.value)) {
        agentData.memoryBlocks = memoryBlocks.filter(block => block.label && block.value);
      }
      
      if (selectedTools.length > 0) {
        agentData.tools = selectedTools;
      }
      
      if (selectedModel) {
        agentData.model = selectedModel;
      }
      
      agentData.sleeptimeEnable = sleepTimeEnabled;

      console.log('Creating agent with data:', agentData);
      console.log('Available models:', models.map(m => ({name: m.model, provider: m.provider_name})));
      const agent = await lettaApi.createAgent(agentData);
      onAgentCreated(agent);
    } catch (error: any) {
      console.error('Failed to create agent:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        code: error.code,
        response: error.response,
        responseData: error.response?.data,
        responseStatus: error.response?.status,
        responseHeaders: error.response?.headers
      });
      
      let errorMessage = 'Failed to create agent';
      if (error.response?.data?.message) {
        errorMessage += ': ' + error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage += ': ' + error.response.data.error;
      } else if (error.response?.data) {
        errorMessage += ': ' + JSON.stringify(error.response.data);
      } else if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          {(() => {
            const LogoLoader = require('./src/components/LogoLoader').default;
            const logoSource = colorScheme === 'dark'
              ? require('./assets/animations/Dark-sygnetrotate2.json')
              : require('./assets/animations/Light-sygnetrotate2.json');
            return <LogoLoader source={logoSource} size={120} />;
          })()}
          <Text style={styles.loadingText}>Loading configuration...</Text>
        </View>
        <StatusBar style="auto" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Agent</Text>
        <TouchableOpacity 
          onPress={createAgent}
          disabled={isCreating || !name.trim()}
          style={[styles.createButton, (!name.trim() || isCreating) && styles.createButtonDisabled]}
        >
          {isCreating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.createButtonText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter agent name"
            value={name}
            onChangeText={setName}
            autoFocus
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Enter agent description (optional)"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Model */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Language Model</Text>
          <TouchableOpacity 
            style={styles.picker}
            onPress={() => setShowModelPicker(!showModelPicker)}
          >
            <Text style={styles.pickerText}>
              {selectedModel || 'Select model'}
            </Text>
            <Text style={styles.pickerArrow}>{showModelPicker ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          
          {showModelPicker && (
            <ScrollView style={styles.pickerOptions} nestedScrollEnabled={true}>
              {models.map((model, index) => {
                const modelId = `${model.provider_name}/${model.model}`;
                return (
                  <TouchableOpacity
                    key={`${model.model}-${index}`}
                    style={[styles.option, selectedModel === modelId && styles.selectedOption]}
                    onPress={() => {
                      setSelectedModel(modelId);
                      setShowModelPicker(false);
                    }}
                  >
                    <Text style={styles.optionText}>{modelId}</Text>
                    <Text style={styles.optionSubtext}>
                      {model.provider_name} • {model.context_window} tokens
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>


        {/* Memory Blocks */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Memory Blocks</Text>
            <TouchableOpacity onPress={addMemoryBlock}>
              <Text style={styles.addButton}>+ Add</Text>
            </TouchableOpacity>
          </View>
          
          {memoryBlocks.map((block, index) => (
            <View key={index} style={styles.memoryBlock}>
              <View style={styles.memoryBlockHeader}>
                <TextInput
                  style={styles.memoryBlockLabel}
                  placeholder="Label"
                  value={block.label}
                  onChangeText={(text) => updateMemoryBlock(index, 'label', text)}
                />
                {memoryBlocks.length > 1 && (
                  <TouchableOpacity onPress={() => removeMemoryBlock(index)}>
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Memory block content"
                value={block.value}
                onChangeText={(text) => updateMemoryBlock(index, 'value', text)}
                multiline
                numberOfLines={2}
              />
            </View>
          ))}
        </View>

        {/* Tools */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tools</Text>
            <TouchableOpacity onPress={() => setShowToolPicker(!showToolPicker)}>
              <Text style={styles.addButton}>
                {showToolPicker ? 'Hide' : 'Select'} ({selectedTools.length})
              </Text>
            </TouchableOpacity>
          </View>
          
          {showToolPicker && (
            <ScrollView style={styles.toolList} nestedScrollEnabled={true}>
              {tools.map((tool) => (
                <TouchableOpacity
                  key={tool.id}
                  style={styles.toolItem}
                  onPress={() => toggleTool(tool.name)}
                >
                  <View style={styles.toolInfo}>
                    <Text style={styles.toolName}>{tool.name}</Text>
                    {tool.description && (
                      <Text style={styles.toolDescription}>{tool.description}</Text>
                    )}
                  </View>
                  <View style={[styles.checkbox, selectedTools.includes(tool.name) && styles.checkboxSelected]}>
                    {selectedTools.includes(tool.name) && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Sleep-time Compute */}
        <View style={styles.section}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.sectionTitle}>Sleep-time Compute</Text>
              <Text style={styles.settingDescription}>
                Enable background learning during idle periods
              </Text>
            </View>
            <Switch
              value={sleepTimeEnabled}
              onValueChange={setSleepTimeEnabled}
              trackColor={{ false: '#ddd', true: '#007AFF' }}
              thumbColor="#fff"
            />
          </View>
        </View>

      </ScrollView>

      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  createButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  createButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fff',
  },
  pickerText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  pickerArrow: {
    fontSize: 12,
    color: '#666',
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
    overflow: 'scroll',
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedOption: {
    backgroundColor: '#f0f8ff',
  },
  optionText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  addButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  memoryBlock: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 8,
  },
  memoryBlockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memoryBlockLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 4,
  },
  removeButton: {
    fontSize: 18,
    color: '#ff3b30',
    marginLeft: 12,
  },
  toolList: {
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    maxHeight: 200,
  },
  toolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  toolDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
});
