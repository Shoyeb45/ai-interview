from openai import AsyncAzureOpenAI
from dotenv import load_dotenv
import os

load_dotenv()

api_version = os.getenv("OPENAI_API_VERSION", "")
api_key = os.getenv("OPENAI_API_KEY", "")
endpoint = os.getenv("OPENAI_URL", "")
deployment = os.getenv("OPENAI_MODEL", "")

client = AsyncAzureOpenAI(
    api_version=api_version,
    api_key=api_key,
    azure_endpoint=endpoint,
)

async def chat_with_openai(messages: list[dict]):
    response = await client.chat.completions.create(
        model=deployment,
        messages=messages,
        max_tokens=150,
        temperature=1.0,
        top_p=1.0,
        frequency_penalty=0.0,
        presence_penalty=0.0,
    )

    return response.choices[0].message.content
