const { LettaClient } = require('@letta-ai/letta-client');

// Get token and optional agent ID from command line or environment
const token = process.env.LETTA_API_KEY;
const agentId = process.argv[2];

if (!token) {
  console.error('ERROR: No LETTA_API_KEY environment variable set');
  console.error('Usage: LETTA_API_KEY=<token> node analyze_message_grouping.js [agent-id]');
  process.exit(1);
}

const client = new LettaClient({ token });

(async () => {
  try {
    // If no agent ID provided, list available agents
    if (!agentId) {
      console.log('No agent ID provided. Listing available agents...\n');
      const agents = await client.agents.list();
      console.log(`Found ${agents.length} agents:\n`);
      agents.forEach((agent, idx) => {
        console.log(`[${idx + 1}] ${agent.name || 'Unnamed'}`);
        console.log(`    ID: ${agent.id}`);
        console.log(`    Created: ${agent.created_at}`);
        console.log('');
      });
      console.log('Usage: node analyze_message_grouping.js <agent-id>');
      process.exit(0);
    }

    console.log(`Fetching messages from agent ${agentId}...\n`);

    const messages = await client.agents.messages.list(agentId, {
      limit: 200,
      use_assistant_message: true,
    });

    console.log(`\n========================================`);
    console.log(`LOADED ${messages.length} MESSAGES`);
    console.log(`========================================\n`);

    // Sort chronologically
    const sorted = [...messages].sort((a, b) => {
      const timeA = new Date(a.date || 0).getTime();
      const timeB = new Date(b.date || 0).getTime();
      return timeA - timeB;
    });

    // Print all messages with grouping info
    console.log('ALL MESSAGES (CHRONOLOGICAL):\n');
    sorted.forEach((msg, idx) => {
      console.log(`[${idx}]`);
      console.log(`  ID:      ${msg.id}`);
      console.log(`  Type:    ${msg.messageType}`);
      console.log(`  Step ID: ${msg.stepId || 'none'}`);
      console.log(`  Created: ${msg.date}`);

      if (msg.messageType === 'reasoning_message') {
        console.log(`  Reasoning: ${msg.reasoning?.substring(0, 80) || 'none'}...`);
      } else if (msg.messageType === 'assistant_message') {
        console.log(`  Content: ${msg.content?.substring(0, 80) || 'none'}...`);
      } else if (msg.messageType === 'tool_call_message') {
        console.log(`  Tool: ${msg.content?.substring(0, 80) || 'none'}...`);
      } else if (msg.messageType === 'tool_return_message') {
        console.log(`  Return: ${msg.content?.substring(0, 80) || 'none'}...`);
      } else if (msg.messageType === 'user_message') {
        const contentStr = typeof msg.content === 'string'
          ? msg.content
          : JSON.stringify(msg.content).substring(0, 80);
        console.log(`  Content: ${contentStr}...`);
      }
      console.log('');
    });

    // Group by ID and analyze
    console.log('\n========================================');
    console.log('GROUPING ANALYSIS (by message ID)');
    console.log('========================================\n');

    const groupedById = new Map();
    for (const msg of sorted) {
      if (!groupedById.has(msg.id)) {
        groupedById.set(msg.id, []);
      }
      groupedById.get(msg.id).push(msg);
    }

    // Find groups with multiple messages
    const multiMessageGroups = Array.from(groupedById.entries())
      .filter(([id, msgs]) => msgs.length > 1);

    console.log(`Found ${multiMessageGroups.length} groups with multiple messages sharing same ID:\n`);

    multiMessageGroups.forEach(([id, msgs], idx) => {
      console.log(`\nGROUP ${idx + 1}: ID=${id}`);
      console.log(`  Contains ${msgs.length} messages:`);
      msgs.forEach((msg, i) => {
        console.log(`    [${i}] ${msg.messageType} (step: ${msg.stepId?.substring(0, 16) || 'none'}...)`);
        if (msg.messageType === 'reasoning_message') {
          console.log(`        Reasoning: "${msg.reasoning?.substring(0, 60)}..."`);
        }
      });
    });

    // Group by step_id and analyze
    console.log('\n\n========================================');
    console.log('GROUPING ANALYSIS (by step_id)');
    console.log('========================================\n');

    const groupedByStep = new Map();
    for (const msg of sorted) {
      if (msg.stepId) {
        if (!groupedByStep.has(msg.stepId)) {
          groupedByStep.set(msg.stepId, []);
        }
        groupedByStep.get(msg.stepId).push(msg);
      }
    }

    console.log(`Found ${groupedByStep.size} unique step IDs:\n`);

    // Show a few examples of step groupings
    let stepCount = 0;
    for (const [stepId, msgs] of groupedByStep.entries()) {
      if (stepCount++ > 10) break; // Only show first 10

      console.log(`\nSTEP: ${stepId}`);
      console.log(`  Contains ${msgs.length} messages with ${new Set(msgs.map(m => m.id)).size} unique IDs:`);
      msgs.forEach((msg, i) => {
        console.log(`    [${i}] ${msg.messageType} (id: ${msg.id.substring(0, 16)}...)`);
        if (msg.messageType === 'reasoning_message') {
          console.log(`        Reasoning: "${msg.reasoning?.substring(0, 60)}..."`);
        }
      });
    }

    // Analyze reasoning accumulation pattern
    console.log('\n\n========================================');
    console.log('REASONING ACCUMULATION PATTERNS');
    console.log('========================================\n');

    // Find messages where reasoning appears multiple times with same ID
    const reasoningGroups = multiMessageGroups.filter(([id, msgs]) =>
      msgs.filter(m => m.messageType === 'reasoning_message').length > 1
    );

    console.log(`Found ${reasoningGroups.length} groups with MULTIPLE reasoning messages:\n`);

    reasoningGroups.forEach(([id, msgs], idx) => {
      const reasoningMsgs = msgs.filter(m => m.messageType === 'reasoning_message');
      const assistantMsg = msgs.find(m => m.messageType === 'assistant_message');
      const toolCallMsg = msgs.find(m => m.messageType === 'tool_call_message');

      console.log(`\nMULTI-REASONING GROUP ${idx + 1}: ID=${id.substring(0, 16)}...`);
      console.log(`  Message composition:`);
      msgs.forEach((msg, i) => {
        console.log(`    [${i}] ${msg.messageType}`);
      });

      console.log(`\n  Reasoning messages (${reasoningMsgs.length} total):`);
      reasoningMsgs.forEach((msg, i) => {
        console.log(`    [${i}] "${msg.reasoning?.substring(0, 100)}..."`);
      });

      if (assistantMsg) {
        console.log(`\n  Assistant message: "${assistantMsg.content?.substring(0, 100)}..."`);
      }
      if (toolCallMsg) {
        console.log(`\n  Tool call: "${toolCallMsg.content?.substring(0, 100)}..."`);
      }

      console.log(`\n  RECOMMENDATION:`);
      if (toolCallMsg && reasoningMsgs.length > 1) {
        console.log(`    → Use LAST reasoning for tool call`);
        console.log(`    → Reasoning [${reasoningMsgs.length - 1}]: "${reasoningMsgs[reasoningMsgs.length - 1].reasoning?.substring(0, 60)}..."`);
      } else if (assistantMsg) {
        console.log(`    → Use FIRST reasoning for assistant`);
        console.log(`    → Reasoning [0]: "${reasoningMsgs[0].reasoning?.substring(0, 60)}..."`);
      }
    });

  } catch (e) {
    console.error('Error:', e.message);
    console.error('Full error:', e);
  }
})();
