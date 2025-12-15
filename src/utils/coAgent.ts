import lettaApi from '../api/lettaApi';
import type { LettaAgent } from '../types/letta';
import { getDefaultMemoryBlocks } from '../constants/memoryBlocks';
import { CO_SYSTEM_PROMPT } from '../constants/systemPrompt';
import { logger } from './logger';

const CO_TAG = 'co-app';

/**
 * Create Co - a comprehensive knowledge management assistant
 */
export async function createCoAgent(userName: string): Promise<LettaAgent> {
  try {
    const agent = await lettaApi.createAgent({
      name: 'Co',
      description: 'Co - A comprehensive knowledge management assistant designed to learn, adapt, and think alongside the user',
      model: 'anthropic/claude-haiku-4-5-20251001',
      system: CO_SYSTEM_PROMPT,
      tags: [CO_TAG],
      memoryBlocks: getDefaultMemoryBlocks(),
      tools: [
        'conversation_search',
        'web_search',
        'fetch_webpage',
        'memory',
        'archival_memory_search',
      ],
      sleeptimeEnable: true,
    });

    logger.debug('Agent created, finding sleeptime agent via shared memory blocks...');

    // Get the first memory block ID - both primary and sleeptime agents share the same blocks
    const blockId = agent.memory?.blocks?.[0]?.id;

    if (!blockId) {
      logger.warn('No memory blocks found on agent. Cannot find sleeptime agent.');
      return agent;
    }

    // Get all agents that share this memory block (should be primary + sleeptime)
    const agentsForBlock = await lettaApi.listAgentsForBlock(blockId);

    // Find the sleeptime agent (the one that's NOT the primary agent)
    const sleeptimeAgent = agentsForBlock.find(a => a.id !== agent.id);

    if (sleeptimeAgent) {
      logger.debug('Found sleeptime agent:', sleeptimeAgent.id);

      // Retrieve full primary agent details and store sleeptime agent ID
      const fullAgent = await lettaApi.getAgent(agent.id);
      fullAgent.sleeptime_agent_id = sleeptimeAgent.id;

      // Create and attach shared archive
      await connectSharedArchive(fullAgent.id, sleeptimeAgent.id);

      // Attach archival memory tools to sleeptime agent
      await ensureSleeptimeTools(fullAgent);

      return fullAgent;
    } else {
      logger.warn('No sleeptime agent found sharing memory blocks');
      return agent;
    }
  } catch (error) {
    logger.error('Error creating Co agent:', error);
    throw error;
  }
}

/**
 * Create or find a shared archive and attach to both primary and sleeptime agents
 */
async function connectSharedArchive(primaryAgentId: string, sleeptimeAgentId: string): Promise<void> {
  try {
    logger.debug('Connecting shared archive for agents:', primaryAgentId, sleeptimeAgentId);

    // Check if an archive already exists for this agent pair
    const archives = await lettaApi.listArchives();
    let sharedArchive = archives.find(a => a.name === `Co Memory - ${primaryAgentId}`);

    if (!sharedArchive) {
      // Create new shared archive
      logger.debug('Creating new shared archive');
      sharedArchive = await lettaApi.createArchive(
        `Co Memory - ${primaryAgentId}`,
        'Shared archival memory between Co primary and sleeptime agents'
      );
    }

    // Attach archive to both agents
    logger.debug('Attaching archive to primary agent:', primaryAgentId);
    await lettaApi.attachArchiveToAgent(primaryAgentId, sharedArchive.id);

    logger.debug('Attaching archive to sleeptime agent:', sleeptimeAgentId);
    await lettaApi.attachArchiveToAgent(sleeptimeAgentId, sharedArchive.id);

    logger.debug('Successfully connected shared archive:', sharedArchive.id);
  } catch (error) {
    logger.error('Error connecting shared archive:', error);
    throw error;
  }
}

/**
 * Ensure sleeptime agent has required archival memory tools and co_memory block
 */
export async function ensureSleeptimeTools(agent: LettaAgent): Promise<void> {
  try {
    // Try to get sleeptime agent ID from either the custom property or multi_agent_group
    const sleeptimeAgentId = agent.sleeptime_agent_id || agent.multi_agent_group?.agent_ids?.[0];

    if (!sleeptimeAgentId) {
      logger.debug('No sleeptime agent found for agent:', agent.id);
      return;
    }

    logger.debug('Ensuring sleeptime agent has archival tools:', sleeptimeAgentId);

    // Get the sleeptime agent to check its current tools and blocks
    const sleeptimeAgent = await lettaApi.getAgent(sleeptimeAgentId);
    const sleeptimeToolNames = sleeptimeAgent.tools?.map(t => t.name) || [];
    const sleeptimeBlockLabels = sleeptimeAgent.memory?.blocks?.map(b => b.label) || [];

    // Attach missing tools
    const requiredTools = ['archival_memory_search', 'archival_memory_insert'];
    for (const toolName of requiredTools) {
      if (!sleeptimeToolNames.includes(toolName)) {
        logger.debug(`Attaching ${toolName} to sleeptime agent`);
        try {
          await lettaApi.attachToolToAgentByName(sleeptimeAgentId, toolName);
        } catch (error) {
          logger.error(`Failed to attach ${toolName}:`, error);
          throw error;
        }
      }
    }

    // Ensure sleeptime-only blocks exist
    const sleeptimeOnlyBlocks = [
      { name: 'co_memory', importName: 'CO_MEMORY_BLOCK' as const },
      { name: 'sleeptime_identity', importName: 'SLEEPTIME_IDENTITY_BLOCK' as const },
      { name: 'sleeptime_procedures', importName: 'SLEEPTIME_PROCEDURES_BLOCK' as const },
    ];

    for (const blockInfo of sleeptimeOnlyBlocks) {
      if (!sleeptimeBlockLabels.includes(blockInfo.name)) {
        logger.debug(`Creating ${blockInfo.name} block for sleeptime agent`);
        try {
          const memoryBlocks = await import('../constants/memoryBlocks');
          const blockDef = memoryBlocks[blockInfo.importName] as { label: string; value: string; description: string; limit: number };

          // Two-step process: create block, then attach to agent
          const createdBlock = await lettaApi.createBlock({
            label: blockDef.label,
            value: blockDef.value,
            description: blockDef.description,
            limit: blockDef.limit,
          });

          await lettaApi.attachBlockToAgent(sleeptimeAgentId, createdBlock.id!);
        } catch (error) {
          logger.error(`Failed to create/attach ${blockInfo.name} block:`, error);
          throw error;
        }
      }
    }
  } catch (error) {
    logger.error('Error in ensureSleeptimeTools:', error);
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
      logger.debug('Found existing Co agent:', existingAgent.id);

      // Retrieve full agent details
      const fullAgent = await lettaApi.getAgent(existingAgent.id);

      // Find sleeptime agent using shared memory blocks (same approach as createCoAgent)
      const blockId = fullAgent.memory?.blocks?.[0]?.id;

      if (blockId) {
        const agentsForBlock = await lettaApi.listAgentsForBlock(blockId);

        // Find the sleeptime agent (the one that's NOT the primary agent)
        const sleeptimeAgent = agentsForBlock.find(a => a.id !== fullAgent.id);

        if (sleeptimeAgent) {
          fullAgent.sleeptime_agent_id = sleeptimeAgent.id;
          logger.debug('Found sleeptime agent for existing Co:', sleeptimeAgent.id);

          // Connect shared archive
          await connectSharedArchive(fullAgent.id, sleeptimeAgent.id);
        }
      }

      // Ensure sleeptime agent has required tools
      await ensureSleeptimeTools(fullAgent);

      return fullAgent;
    }

    // Create new Co agent
    logger.debug('Creating new Co agent for user:', userName);
    return await createCoAgent(userName);
  } catch (error) {
    logger.error('Error in findOrCreateCo:', error);
    throw error;
  }
}
