const { LettaClient } = require('@letta-ai/letta-client');
const token = process.env.LETTA_API_KEY;

if (!token) {
  console.error('Please set LETTA_API_KEY environment variable');
  process.exit(1);
}

const client = new LettaClient({ token });

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
    console.log('Name:', coAgent.name);
    console.log('Tools:', coAgent.tools?.map(t => t.name).join(', ') || 'none');

    // Retrieve full agent details to get multi_agent_group
    console.log('\n=== RETRIEVING FULL AGENT DETAILS ===');
    const fullAgent = await client.agents.retrieve(coAgent.id);

    console.log('Multi-agent group:', fullAgent.multiAgentGroup ? 'present' : 'not present');

    if (fullAgent.multiAgentGroup) {
      console.log('Manager type:', fullAgent.multiAgentGroup.managerType);
      console.log('Agent IDs:', fullAgent.multiAgentGroup.agentIds);

      const sleeptimeAgentId = fullAgent.multiAgentGroup.agentIds?.[0];

      if (sleeptimeAgentId) {
        console.log('\n=== SLEEPTIME AGENT ===');
        console.log('ID:', sleeptimeAgentId);

        // Retrieve sleeptime agent details
        const sleeptimeAgent = await client.agents.retrieve(sleeptimeAgentId);
        console.log('Name:', sleeptimeAgent.name);
        console.log('Agent type:', sleeptimeAgent.agentType);
        console.log('Tools:', sleeptimeAgent.tools?.map(t => t.name).join(', ') || 'none');

        console.log('\n=== TOOL DETAILS ===');
        sleeptimeAgent.tools?.forEach((tool, idx) => {
          console.log(`${idx + 1}. ${tool.name} (${tool.id})`);
        });

        // Check if archival memory tools are present
        const hasArchivalSearch = sleeptimeAgent.tools?.some(t => t.name === 'archival_memory_search');
        const hasArchivalInsert = sleeptimeAgent.tools?.some(t => t.name === 'archival_memory_insert');

        console.log('\n=== ARCHIVAL TOOLS STATUS ===');
        console.log('archival_memory_search:', hasArchivalSearch ? '✓ present' : '✗ missing');
        console.log('archival_memory_insert:', hasArchivalInsert ? '✓ present' : '✗ missing');
      }
    }
  } catch (e) {
    console.error('Error:', e.message);
    if (e.body) {
      console.error('Error body:', JSON.stringify(e.body, null, 2));
    }
  }
})();
