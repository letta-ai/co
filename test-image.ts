import { LettaClient } from '@letta-ai/letta-client';

async function testImage() {
    const token = process.env.LETTA_API_KEY;
    if (!token) {
        console.error('Error: LETTA_API_KEY environment variable not set');
        process.exit(1);
    }

    const client = new LettaClient({ token });

    const imageUrl = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg";
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const imageData = Buffer.from(imageBuffer).toString('base64');

    const response = await client.agents.messages.create(
        "agent-bb780791-961a-4fa3-95ba-b681b6d508e6", {
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Describe this image."
                        },
                        {
                            type: "image",
                            source: {
                                type: "base64",
                                mediaType: "image/jpeg",
                                data: imageData,
                            },
                        }
                    ],
                }
            ],
        }
    );

    console.log('Response:', response);
}

testImage().catch(console.error);
