export * from './letta';

export interface AppState {
  currentAgent: string | null;
  agents: LettaAgent[];
  messages: Record<string, LettaMessage[]>;
  isLoading: boolean;
  error: string | null;
  apiToken: string | null;
}

export interface NavigationState {
  isDrawerOpen: boolean;
}

import { LettaAgent, LettaMessage } from './letta';