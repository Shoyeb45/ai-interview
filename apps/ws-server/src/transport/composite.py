"""Composite transport: WebSocket for messages + WebRTC for audio."""

from src.transport.base import Transport


class CompositeTransport(Transport):
    def __init__(self, message_transport: Transport, audio_transport: Transport):
        self._message = message_transport
        self._audio = audio_transport

    async def send(self, msg: dict):
        await self._message.send(msg)

    async def play_audio(self, audio: bytes):
        await self._audio.play_audio(audio)

    def add_silence(self, duration_ms: int):
        self._audio.add_silence(duration_ms)

    def clear_tts_queue(self):
        if hasattr(self._audio, "clear_tts_queue"):
            self._audio.clear_tts_queue()

    def get_queue_size(self):
        return getattr(self._audio, "get_queue_size", lambda: 0)()

    def get_queue_duration(self):
        return getattr(self._audio, "get_queue_duration", lambda: 0.0)()
