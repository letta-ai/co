const { LettaClient } = require('@letta-ai/letta-client');

// Get token and agent ID from command line or environment
const token = process.env.LETTA_API_KEY;
const agentId = process.argv[2] || 'agent-e8c7e12c-843c-4a88-a2b1-e498010d2936';

if (!token) {
  console.error('ERROR: No LETTA_API_KEY environment variable set');
  process.exit(1);
}

const client = new LettaClient({ token });

(async () => {
  try {
    console.log(`Fetching messages from agent ${agentId}...\n`);

    const messages = await client.agents.messages.list(agentId, {
      limit: 10,
      use_assistant_message: true,
    });

    console.log(`\nGot ${messages.length} messages\n`);
    console.log('First message structure:\n');
    console.log(JSON.stringify(messages[0], null, 2));

    console.log('\n\nLast message structure:\n');
    console.log(JSON.stringify(messages[messages.length - 1], null, 2));

  } catch (e) {
    console.error('Error:', e.message);
    console.error('Full error:', e);
  }
})();
