import { create } from 'zustand';
import type { LettaAgent } from '../types/letta';
import { findOrCreateCo } from '../utils/coAgent';
import { logger } from '../utils/logger';

interface AgentState {
  // State
  coAgent: LettaAgent | null;
  isInitializingCo: boolean;
  isRefreshingCo: boolean;
  agentError: string | null;

  // Actions
  initializeCo: (userName: string) => Promise<void>;
  refreshCo: () => Promise<void>;
  setAgent: (agent: LettaAgent | null) => void;
  clearAgent: () => void;
}

export const useAgentStore = create<AgentState>((set, get) => ({
  // Initial state
  coAgent: null,
  isInitializingCo: false,
  isRefreshingCo: false,
  agentError: null,

  // Actions
  initializeCo: async (userName: string) => {
    set({ isInitializingCo: true, agentError: null });
    try {
      logger.debug('Initializing Co agent...');
      const agent = await findOrCreateCo(userName);
      set({ coAgent: agent });
      logger.debug('Co agent initialized:', agent.id);
    } catch (error: any) {
      logger.error('Failed to initialize Co:', error);
      set({ agentError: error.message || 'Failed to initialize agent' });
      throw error;
    } finally {
      set({ isInitializingCo: false });
    }
  },

  refreshCo: async () => {
    const currentAgent = get().coAgent;
    if (!currentAgent) return;

    set({ isRefreshingCo: true });
    try {
      const agent = await findOrCreateCo('User');
      set({ coAgent: agent });
    } catch (error: any) {
      logger.error('Failed to refresh Co:', error);
      set({ agentError: error.message || 'Failed to refresh agent' });
    } finally {
      set({ isRefreshingCo: false });
    }
  },

  setAgent: (agent: LettaAgent | null) => set({ coAgent: agent }),

  clearAgent: () => set({ coAgent: null, agentError: null }),
}));
