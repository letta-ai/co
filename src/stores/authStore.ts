import { create } from 'zustand';
import lettaApi from '../api/lettaApi';
import Storage, { STORAGE_KEYS } from '../utils/storage';

interface AuthState {
  // State
  apiToken: string;
  isConnected: boolean;
  isConnecting: boolean;
  isLoadingToken: boolean;
  connectionError: string | null;

  // Actions
  setToken: (token: string) => void;
  loadStoredToken: () => Promise<void>;
  connectWithToken: (token: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // Initial state
  apiToken: '',
  isConnected: false,
  isConnecting: false,
  isLoadingToken: true,
  connectionError: null,

  // Actions
  setToken: (token: string) => set({ apiToken: token }),

  loadStoredToken: async () => {
    try {
      const stored = await Storage.getItem(STORAGE_KEYS.API_TOKEN);
      if (stored) {
        set({ apiToken: stored });
        await get().connectWithToken(stored);
      }
    } catch (error) {
      console.error('Failed to load stored token:', error);
    } finally {
      set({ isLoadingToken: false });
    }
  },

  connectWithToken: async (token: string) => {
    set({ isConnecting: true, connectionError: null });
    try {
      lettaApi.setAuthToken(token);
      const isValid = await lettaApi.testConnection();

      if (isValid) {
        set({ isConnected: true });
        await Storage.setItem(STORAGE_KEYS.API_TOKEN, token);
      } else {
        throw new Error('Invalid API token');
      }
    } catch (error: any) {
      console.error('Connection failed:', error);
      set({
        connectionError: error.message || 'Failed to connect',
        isConnected: false
      });
      lettaApi.removeAuthToken();
    } finally {
      set({ isConnecting: false });
    }
  },

  logout: async () => {
    await Storage.removeItem(STORAGE_KEYS.API_TOKEN);
    lettaApi.removeAuthToken();
    set({
      apiToken: '',
      isConnected: false,
      connectionError: null,
    });
  },

  clearError: () => set({ connectionError: null }),
}));
