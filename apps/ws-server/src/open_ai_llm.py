from openai import AzureOpenAI
from dotenv import load_dotenv
import os 

load_dotenv()

api_version = os.getenv('OPENAI_API_VERSION', '')
api_key = os.getenv('OPENAI_API_KEY', '')
endpoint = os.getenv('OPENAI_URL', '')
deployment = os.getenv('OPENAI_MODEL', '')

client = AzureOpenAI(
    api_version=api_version,
    api_key=api_key,
    azure_endpoint=endpoint
) 


def chat_with_openai(user_prompt: str):
    response = client.chat.completions.create(
        messages=[
            { 'role': 'system', 'content': "You are a helpful assistant.", }, 
            { 'role': 'user', 'content': user_prompt }
        ], 
        max_completion_tokens=800,
        temperature=1.0,
        top_p=1.0,
        frequency_penalty=0.0,
        presence_penalty=0.0,
        model=deployment
    )
    
    return response.choices[0].message.content

