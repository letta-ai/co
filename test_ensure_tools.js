const { LettaClient } = require('@letta-ai/letta-client');
const token = process.env.LETTA_API_KEY;

if (!token) {
  console.error('Please set LETTA_API_KEY environment variable');
  process.exit(1);
}

const client = new LettaClient({ token });

async function ensureSleeptimeTools(agent) {
  try {
    const sleeptimeAgentId = agent.multiAgentGroup?.agentIds?.[0];

    if (!sleeptimeAgentId) {
      console.log('No sleeptime agent found for agent:', agent.id);
      return;
    }

    console.log('Ensuring sleeptime agent has archival tools:', sleeptimeAgentId);

    // Get the sleeptime agent to check its current tools
    const sleeptimeAgent = await client.agents.retrieve(sleeptimeAgentId);
    const sleeptimeToolNames = sleeptimeAgent.tools?.map(t => t.name) || [];

    console.log('Current sleeptime tools:', sleeptimeToolNames);

    // Attach missing tools
    const requiredTools = ['archival_memory_search', 'archival_memory_insert'];
    for (const toolName of requiredTools) {
      if (!sleeptimeToolNames.includes(toolName)) {
        console.log(`Attaching ${toolName} to sleeptime agent`);
        try {
          // Find tool by name
          const tools = await client.tools.list({ name: toolName });
          if (!tools || tools.length === 0) {
            console.error(`✗ Tool ${toolName} not found`);
            continue;
          }

          const tool = tools[0];
          await client.agents.tools.attach(sleeptimeAgentId, tool.id);
          console.log(`✓ Successfully attached ${toolName} (${tool.id})`);
        } catch (error) {
          console.error(`✗ Failed to attach ${toolName}:`, error.message);
          if (error.body) console.error('Error details:', JSON.stringify(error.body, null, 2));
        }
      } else {
        console.log(`✓ ${toolName} already attached`);
      }
    }
  } catch (error) {
    console.error('Error in ensureSleeptimeTools:', error.message);
    if (error.body) console.error('Error details:', JSON.stringify(error.body, null, 2));
    throw error;
  }
}

(async () => {
  try {
    // Find the Co agent by tag
    console.log('Looking for Co agent with tag: co-app');
    const agents = await client.agents.list({ tags: ['co-app'], matchAllTags: true, limit: 1 });

    if (!agents || agents.length === 0) {
      console.log('No Co agent found with tag co-app');
      return;
    }

    const coAgent = agents[0];
    console.log('\n=== CO AGENT ===');
    console.log('ID:', coAgent.id);

    // Retrieve full agent details
    const fullAgent = await client.agents.retrieve(coAgent.id);

    console.log('\n=== RUNNING ensureSleeptimeTools ===');
    await ensureSleeptimeTools(fullAgent);

    console.log('\n=== VERIFICATION ===');
    const sleeptimeAgentId = fullAgent.multiAgentGroup?.agentIds?.[0];
    if (sleeptimeAgentId) {
      const updatedAgent = await client.agents.retrieve(sleeptimeAgentId);
      console.log('Final sleeptime tools:', updatedAgent.tools?.map(t => t.name).join(', '));
    }

  } catch (e) {
    console.error('Error:', e.message);
    if (e.body) {
      console.error('Error body:', JSON.stringify(e.body, null, 2));
    }
    if (e.stack) {
      console.error('Stack:', e.stack);
    }
  }
})();
