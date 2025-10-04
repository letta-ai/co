import lettaApi from '../api/lettaApi';
import type { LettaAgent } from '../types/letta';
import { getDefaultMemoryBlocks } from '../constants/memoryBlocks';
import { CO_SYSTEM_PROMPT } from '../constants/systemPrompt';
import { Letta } from "@letta-ai/letta-client";

const CO_TAG = 'co-app';

/**
 * Create Co - a comprehensive knowledge management assistant
 */
export async function createCoAgent(userName: string): Promise<LettaAgent> {
  try {
    const agent = await lettaApi.createAgent({
      name: 'Co',
      description: 'Co - A comprehensive knowledge management assistant designed to learn, adapt, and think alongside the user',
      // agentType: Letta.AgentType.LettaV1Agent, // currently pending sleeptime fixes
      agentType: Letta.AgentType.MemgptV2Agent,
      model: 'anthropic/claude-sonnet-4-5-20250929',
      system: CO_SYSTEM_PROMPT,
      tags: [CO_TAG],
      memoryBlocks: getDefaultMemoryBlocks(),
      // includeBaseTools: false,
      tools: [
        'conversation_search',
        'web_search',
        'fetch_webpage',
      ],
      tool_rules: [], // No tool rules
      enableSleeptime: true
    });

    // Retrieve the full agent details to get the sleeptime agent ID
    const fullAgent = await lettaApi.getAgent(agent.id);

    // Extract sleeptime agent ID from multi_agent_group
    const sleeptimeAgentId = fullAgent.multi_agent_group?.agent_ids?.[0];

    if (sleeptimeAgentId) {
      console.log('Found sleeptime agent:', sleeptimeAgentId);

      // Attach the archival memory tools to the sleeptime agent
      await lettaApi.attachToolToAgentByName(sleeptimeAgentId, 'archival_memory_search');
      await lettaApi.attachToolToAgentByName(sleeptimeAgentId, 'archival_memory_insert');

      // Store the sleeptime agent ID in the agent object
      fullAgent.sleeptime_agent_id = sleeptimeAgentId;
    }

    return fullAgent;
  } catch (error) {
    console.error('Error creating Co agent:', error);
    throw error;
  }
}

/**
 * Ensure sleeptime agent has required archival memory tools
 */
export async function ensureSleeptimeTools(agent: LettaAgent): Promise<void> {
  try {
    const sleeptimeAgentId = agent.multi_agent_group?.agent_ids?.[0];

    if (!sleeptimeAgentId) {
      console.log('No sleeptime agent found for agent:', agent.id);
      return;
    }

    console.log('Ensuring sleeptime agent has archival tools:', sleeptimeAgentId);

    // Get the sleeptime agent to check its current tools
    const sleeptimeAgent = await lettaApi.getAgent(sleeptimeAgentId);
    const sleeptimeToolNames = sleeptimeAgent.tools?.map(t => t.name) || [];

    console.log('Current sleeptime tools:', sleeptimeToolNames);

    // Attach missing tools
    const requiredTools = ['archival_memory_search', 'archival_memory_insert'];
    for (const toolName of requiredTools) {
      if (!sleeptimeToolNames.includes(toolName)) {
        console.log(`Attaching ${toolName} to sleeptime agent`);
        try {
          await lettaApi.attachToolToAgentByName(sleeptimeAgentId, toolName);
          console.log(`✓ Successfully attached ${toolName}`);
        } catch (error) {
          console.error(`✗ Failed to attach ${toolName}:`, error);
          throw error;
        }
      } else {
        console.log(`✓ ${toolName} already attached`);
      }
    }
  } catch (error) {
    console.error('Error in ensureSleeptimeTools:', error);
    throw error;
  }
}

/**
 * Find or create the Co agent for the logged-in user
 */
export async function findOrCreateCo(userName: string): Promise<LettaAgent> {
  try {
    // Try to find existing Co agent
    const existingAgent = await lettaApi.findAgentByTags([CO_TAG]);

    if (existingAgent) {
      console.log('Found existing Co agent:', existingAgent.id);

      // Retrieve full agent details to get sleeptime agent ID
      const fullAgent = await lettaApi.getAgent(existingAgent.id);
      const sleeptimeAgentId = fullAgent.multi_agent_group?.agent_ids?.[0];

      if (sleeptimeAgentId) {
        fullAgent.sleeptime_agent_id = sleeptimeAgentId;
        console.log('Found sleeptime agent for existing Co:', sleeptimeAgentId);
      }

      // Ensure sleeptime agent has required tools
      await ensureSleeptimeTools(fullAgent);

      return fullAgent;
    }

    // Create new Co agent
    console.log('Creating new Co agent for user:', userName);
    return await createCoAgent(userName);
  } catch (error) {
    console.error('Error in findOrCreateCo:', error);
    throw error;
  }
}
