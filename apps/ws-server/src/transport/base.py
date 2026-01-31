"""Transport abstraction: Session does not depend on WebSocket/WebRTC directly."""

from abc import ABC, abstractmethod


class Transport(ABC):
    @abstractmethod
    async def send(self, msg: dict):
        """Send a JSON-serializable message to the client."""
        ...

    @abstractmethod
    async def play_audio(self, audio: bytes):
        """Queue audio for playback (e.g. TTS)."""
        ...

    @abstractmethod
    def add_silence(self, duration_ms: int):
        """Add silence before/after audio (e.g. pacing)."""
        ...

    def clear_tts_queue(self):
        """Clear any queued TTS (e.g. on user interrupt). No-op if not applicable."""
        pass
