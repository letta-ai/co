import base64
import httpx
import os
from letta_client import Letta

token = os.getenv('LETTA_API_KEY')
if not token:
    print("Error: LETTA_API_KEY environment variable not set")
    exit(1)

client = Letta(token=token)

image_url = "https://upload.wikimedia.org/wikipedia/commons/a/a7/Camponotus_flavomarginatus_ant.jpg"
image_data = base64.standard_b64encode(httpx.get(image_url).content).decode("utf-8")

response = client.agents.messages.create(
    agent_id="agent-bb780791-961a-4fa3-95ba-b681b6d508e6",
    messages=[
        {
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": "image/jpeg",
                        "data": image_data,
                    },
                },
                {
                    "type": "text",
                    "text": "Describe this image."
                }
            ],
        }
    ],
)

print("Response:")
print(response)
