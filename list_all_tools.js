const { LettaClient } = require('@letta-ai/letta-client');
const token = process.env.LETTA_API_KEY;

if (!token) {
  console.error('Please set LETTA_API_KEY environment variable');
  process.exit(1);
}

const client = new LettaClient({ token });

(async () => {
  try {
    console.log('=== LISTING ALL AVAILABLE TOOLS ===\n');
    const allTools = await client.tools.list();

    console.log(`Found ${allTools.length} tools total\n`);

    // Group tools by type
    const toolsByType = {};
    allTools.forEach(tool => {
      const type = tool.toolType || 'unknown';
      if (!toolsByType[type]) {
        toolsByType[type] = [];
      }
      toolsByType[type].push(tool);
    });

    // Display tools grouped by type
    Object.keys(toolsByType).sort().forEach(type => {
      console.log(`\n=== ${type.toUpperCase()} ===`);
      toolsByType[type].forEach(tool => {
        console.log(`  - ${tool.name} (${tool.id})`);
      });
    });

    // Search for archival tools specifically
    console.log('\n\n=== SEARCHING FOR ARCHIVAL TOOLS ===');
    const archivalTools = allTools.filter(t => t.name?.includes('archival'));
    if (archivalTools.length > 0) {
      archivalTools.forEach(tool => {
        console.log(`  ✓ ${tool.name} (${tool.id})`);
      });
    } else {
      console.log('  ✗ No archival tools found');
    }

    // Search for memory tools
    console.log('\n=== SEARCHING FOR MEMORY TOOLS ===');
    const memoryTools = allTools.filter(t => t.name?.includes('memory'));
    if (memoryTools.length > 0) {
      memoryTools.forEach(tool => {
        console.log(`  - ${tool.name} (${tool.id}) [${tool.toolType}]`);
      });
    } else {
      console.log('  ✗ No memory tools found');
    }

  } catch (e) {
    console.error('Error:', e.message);
    if (e.body) {
      console.error('Error body:', JSON.stringify(e.body, null, 2));
    }
  }
})();
