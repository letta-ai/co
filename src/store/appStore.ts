import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import lettaApi from '../api/lettaApi';
import { LettaAgent, LettaMessage, SendMessageRequest, ApiError } from '../types/letta';

interface AppState {
  // Authentication
  apiToken: string | null;
  isAuthenticated: boolean;
  
  // Agents
  agents: LettaAgent[];
  currentAgentId: string | null;
  
  // Messages
  messages: Record<string, LettaMessage[]>;
  
  // UI State
  isLoading: boolean;
  isDrawerOpen: boolean;
  error: string | null;
  
  // Actions
  setApiToken: (token: string) => Promise<void>;
  clearApiToken: () => void;
  
  // Agent Actions
  fetchAgents: () => Promise<void>;
  setCurrentAgent: (agentId: string) => void;
  createAgent: (name: string, description?: string) => Promise<LettaAgent>;
  
  // Message Actions
  fetchMessages: (agentId: string) => Promise<void>;
  sendMessage: (agentId: string, content: string) => Promise<void>;
  
  // UI Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setDrawerOpen: (open: boolean) => void;
  
  // Reset
  reset: () => void;
}

const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      apiToken: null,
      isAuthenticated: false,
      agents: [],
      currentAgentId: null,
      messages: {},
      isLoading: false,
      isDrawerOpen: false,
      error: null,

      // Authentication Actions
      setApiToken: async (token: string) => {
        set({ isLoading: true, error: null });
        
        try {
          lettaApi.setAuthToken(token);
          const isValid = await lettaApi.testConnection();
          
          if (isValid) {
            set({
              apiToken: token,
              isAuthenticated: true,
              isLoading: false,
            });
            
            // Fetch agents after successful authentication
            await get().fetchAgents();
          } else {
            lettaApi.removeAuthToken();
            set({
              error: 'Invalid API token',
              isLoading: false,
            });
          }
        } catch (error) {
          lettaApi.removeAuthToken();
          set({
            error: (error as ApiError).message || 'Authentication failed',
            isLoading: false,
          });
        }
      },

      clearApiToken: () => {
        lettaApi.removeAuthToken();
        set({
          apiToken: null,
          isAuthenticated: false,
          agents: [],
          currentAgentId: null,
          messages: {},
          error: null,
        });
      },

      // Agent Actions
      fetchAgents: async () => {
        if (!get().isAuthenticated) return;
        
        set({ isLoading: true, error: null });
        
        try {
          const agents = await lettaApi.listAgents({ limit: 50 });
          set({ agents, isLoading: false });
        } catch (error) {
          set({
            error: (error as ApiError).message || 'Failed to fetch agents',
            isLoading: false,
          });
        }
      },

      setCurrentAgent: (agentId: string) => {
        set({ currentAgentId: agentId });
        
        // Fetch messages for the selected agent
        get().fetchMessages(agentId);
      },

      createAgent: async (name: string, description?: string) => {
        if (!get().isAuthenticated) {
          throw new Error('Not authenticated');
        }

        set({ isLoading: true, error: null });

        try {
          const newAgent = await lettaApi.createAgent({
            name,
            description,
            model: 'openai/gpt-4.1',
            embedding: 'openai/text-embedding-3-small',
            memory_blocks: [
              {
                label: 'human',
                value: 'The user is using a mobile chat application.',
              },
              {
                label: 'persona',
                value: 'I am a helpful AI assistant.',
              },
            ],
          });

          const agents = [...get().agents, newAgent];
          set({ agents, isLoading: false });
          
          return newAgent;
        } catch (error) {
          set({
            error: (error as ApiError).message || 'Failed to create agent',
            isLoading: false,
          });
          throw error;
        }
      },

      // Message Actions
      fetchMessages: async (agentId: string) => {
        if (!get().isAuthenticated) return;
        
        set({ isLoading: true, error: null });
        
        try {
          const messages = await lettaApi.listMessages(agentId, {
            limit: 50,
            use_assistant_message: true,
          });
          
          set(state => ({
            messages: {
              ...state.messages,
              [agentId]: messages.reverse(), // Reverse to show oldest first
            },
            isLoading: false,
          }));
        } catch (error) {
          set({
            error: (error as ApiError).message || 'Failed to fetch messages',
            isLoading: false,
          });
        }
      },

      sendMessage: async (agentId: string, content: string) => {
        if (!get().isAuthenticated) return;
        
        set({ isLoading: true, error: null });
        
        // Add user message immediately to UI
        const userMessage: LettaMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content,
          created_at: new Date().toISOString(),
        };
        
        set(state => ({
          messages: {
            ...state.messages,
            [agentId]: [...(state.messages[agentId] || []), userMessage],
          },
        }));

        try {
          const request: SendMessageRequest = {
            messages: [{ role: 'user', content }],
            use_assistant_message: true,
          };

          const response = await lettaApi.sendMessage(agentId, request);
          
          // Replace temp user message and add assistant messages
          set(state => {
            const currentMessages = state.messages[agentId] || [];
            const messagesWithoutTemp = currentMessages.filter(
              m => m.id !== userMessage.id
            );
            
            return {
              messages: {
                ...state.messages,
                [agentId]: [...messagesWithoutTemp, ...response.messages],
              },
              isLoading: false,
            };
          });
        } catch (error) {
          // Remove the temporary user message on error
          set(state => ({
            messages: {
              ...state.messages,
              [agentId]: (state.messages[agentId] || []).filter(
                m => m.id !== userMessage.id
              ),
            },
            error: (error as ApiError).message || 'Failed to send message',
            isLoading: false,
          }));
        }
      },

      // UI Actions
      setLoading: (loading: boolean) => set({ isLoading: loading }),
      setError: (error: string | null) => set({ error }),
      setDrawerOpen: (open: boolean) => set({ isDrawerOpen: open }),

      // Reset
      reset: () => {
        lettaApi.removeAuthToken();
        set({
          apiToken: null,
          isAuthenticated: false,
          agents: [],
          currentAgentId: null,
          messages: {},
          isLoading: false,
          isDrawerOpen: false,
          error: null,
        });
      },
    }),
    {
      name: 'letta-app-storage',
      storage: {
        getItem: async (name: string) => {
          const value = await AsyncStorage.getItem(name);
          return value ? JSON.parse(value) : null;
        },
        setItem: async (name: string, value: any) => {
          await AsyncStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: async (name: string) => {
          await AsyncStorage.removeItem(name);
        },
      },
      partialize: (state) => ({
        apiToken: state.apiToken,
        currentAgentId: state.currentAgentId,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.apiToken) {
          lettaApi.setAuthToken(state.apiToken);
          state.isAuthenticated = true;
          // Don't await this, let it run in background
          state.fetchAgents();
        }
      },
    }
  )
);

export default useAppStore;