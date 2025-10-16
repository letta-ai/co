import { useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAgentStore } from '../stores/agentStore';
import { useChatStore } from '../stores/chatStore';

/**
 * Hook to manage authentication state and actions
 */
export function useAuth() {
  const authStore = useAuthStore();
  const clearAgent = useAgentStore((state) => state.clearAgent);
  const clearMessages = useChatStore((state) => state.clearMessages);

  // Load stored token on mount
  useEffect(() => {
    authStore.loadStoredToken();
  }, []);

  // Enhanced logout that clears all related state
  const logout = async () => {
    await authStore.logout();
    clearAgent();
    clearMessages();
  };

  return {
    apiToken: authStore.apiToken,
    isConnected: authStore.isConnected,
    isConnecting: authStore.isConnecting,
    isLoadingToken: authStore.isLoadingToken,
    connectionError: authStore.connectionError,

    setToken: authStore.setToken,
    connectWithToken: authStore.connectWithToken,
    logout,
    clearError: authStore.clearError,
  };
}
