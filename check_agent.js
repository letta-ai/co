const { LettaClient } = require('@letta-ai/letta-client');
const token = process.env.LETTA_TOKEN || 'your-token';
const client = new LettaClient({ token });

(async () => {
  try {
    const agent = await client.agents.retrieve('agent-a0cb1a4c-d4f8-4379-8d80-5c1fbff60e5d');
    console.log('Agent model:', agent.llmConfig?.model);
    console.log('Full LLM config:', JSON.stringify(agent.llmConfig, null, 2));
    console.log('\n=== CHECKING MODEL CAPABILITIES ===');

    // Try to send a simple message to see what error we get
    console.log('\nTrying to send a test message...');
    try {
      const response = await client.agents.messages.create('agent-a0cb1a4c-d4f8-4379-8d80-5c1fbff60e5d', {
        messages: [{ role: 'user', content: 'test' }]
      });
      console.log('Non-streaming message succeeded!');
      console.log('Response messages:', response.messages?.length || 0);
    } catch (msgError) {
      console.error('Non-streaming message error:', msgError.message);
      console.error('Status:', msgError.statusCode || msgError.status);
      console.error('Body:', JSON.stringify(msgError.body || msgError.data, null, 2));
    }
  } catch (e) {
    console.error('Error:', e.message);
    console.error('Full error:', e);
  }
})();
