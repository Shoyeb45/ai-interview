"""WebSocket transport: send JSON messages only."""

from fastapi import WebSocket
from src.core.helper import send_over_ws
from src.transport.base import Transport


class WebSocketTransport(Transport):
    def __init__(self, ws: WebSocket):
        self.ws = ws

    async def send(self, msg: dict):
        await send_over_ws(self.ws, msg)

    async def play_audio(self, audio: bytes):
        pass  # WebSocket alone doesn't play audio

    def add_silence(self, duration_ms: int):
        pass
