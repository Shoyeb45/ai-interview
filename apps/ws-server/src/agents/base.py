"""Base agent interface. Agents own LLM/flow logic."""


class BaseAgent:
    async def start(self):
        raise NotImplementedError

    async def on_user_speech(self, pcm: bytes):
        raise NotImplementedError
