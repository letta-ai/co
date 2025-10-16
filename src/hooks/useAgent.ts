import { useEffect } from 'react';
import { useAgentStore } from '../stores/agentStore';
import { useAuthStore } from '../stores/authStore';

/**
 * Hook to manage Co agent initialization and state
 */
export function useAgent() {
  const agentStore = useAgentStore();
  const isConnected = useAuthStore((state) => state.isConnected);

  // Auto-initialize Co when connected
  useEffect(() => {
    if (isConnected && !agentStore.coAgent && !agentStore.isInitializingCo) {
      agentStore.initializeCo('User');
    }
  }, [isConnected, agentStore.coAgent, agentStore.isInitializingCo]);

  return {
    coAgent: agentStore.coAgent,
    isInitializingCo: agentStore.isInitializingCo,
    isRefreshingCo: agentStore.isRefreshingCo,
    agentError: agentStore.agentError,

    initializeCo: agentStore.initializeCo,
    refreshCo: agentStore.refreshCo,
    setAgent: agentStore.setAgent,
    clearAgent: agentStore.clearAgent,
  };
}
