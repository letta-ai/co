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

    // Retrieve full agent details
    const fullAgent = await client.agents.retrieve(coAgent.id);
    const sleeptimeAgentId = fullAgent.multiAgentGroup?.agentIds?.[0];

    if (!sleeptimeAgentId) {
      console.log('No sleeptime agent found in multi_agent_group');
      return;
    }

    console.log('\n=== SLEEPTIME AGENT ===');
    console.log('ID:', sleeptimeAgentId);

    // Find archival memory tools by name using API filtering
    console.log('\n=== FINDING ARCHIVAL TOOLS ===');
    const archivalSearchTools = await client.tools.list({ name: 'archival_memory_search' });
    const archivalInsertTools = await client.tools.list({ name: 'archival_memory_insert' });

    const archivalSearchTool = archivalSearchTools?.[0];
    const archivalInsertTool = archivalInsertTools?.[0];

    console.log('archival_memory_search tool:', archivalSearchTool ? archivalSearchTool.id : 'NOT FOUND');
    console.log('archival_memory_insert tool:', archivalInsertTool ? archivalInsertTool.id : 'NOT FOUND');

    if (!archivalSearchTool || !archivalInsertTool) {
      console.log('\n⚠️  Could not find archival memory tools');
      return;
    }

    // Check current tools on sleeptime agent
    const sleeptimeAgent = await client.agents.retrieve(sleeptimeAgentId);
    const currentToolNames = sleeptimeAgent.tools?.map(t => t.name) || [];
    console.log('\n=== CURRENT SLEEPTIME AGENT TOOLS ===');
    console.log(currentToolNames.join(', ') || 'none');

    // Attach archival_memory_search if not present
    if (!currentToolNames.includes('archival_memory_search')) {
      console.log('\n=== ATTACHING archival_memory_search ===');
      try {
        await client.agents.tools.attach(sleeptimeAgentId, archivalSearchTool.id);
        console.log('✓ Successfully attached archival_memory_search');
      } catch (err) {
        console.error('✗ Failed to attach archival_memory_search:', err.message);
        if (err.body) console.error('Error details:', JSON.stringify(err.body, null, 2));
      }
    } else {
      console.log('\n✓ archival_memory_search already attached');
    }

    // Attach archival_memory_insert if not present
    if (!currentToolNames.includes('archival_memory_insert')) {
      console.log('\n=== ATTACHING archival_memory_insert ===');
      try {
        await client.agents.tools.attach(sleeptimeAgentId, archivalInsertTool.id);
        console.log('✓ Successfully attached archival_memory_insert');
      } catch (err) {
        console.error('✗ Failed to attach archival_memory_insert:', err.message);
        if (err.body) console.error('Error details:', JSON.stringify(err.body, null, 2));
      }
    } else {
      console.log('\n✓ archival_memory_insert already attached');
    }

    // Verify final state
    console.log('\n=== FINAL VERIFICATION ===');
    const updatedAgent = await client.agents.retrieve(sleeptimeAgentId);
    const finalToolNames = updatedAgent.tools?.map(t => t.name) || [];
    console.log('Sleeptime agent tools:', finalToolNames.join(', '));

    const hasArchivalSearch = finalToolNames.includes('archival_memory_search');
    const hasArchivalInsert = finalToolNames.includes('archival_memory_insert');
    console.log('\narchival_memory_search:', hasArchivalSearch ? '✓' : '✗');
    console.log('archival_memory_insert:', hasArchivalInsert ? '✓' : '✗');

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
