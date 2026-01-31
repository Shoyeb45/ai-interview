"""WebRTC TTS output: play audio on the peer connection track."""

from src.transport.base import Transport
from src.websocket.webrtc_tts_track import TTSAudioTrack


class WebRTCOutput(Transport):
    def __init__(self, tts_track: TTSAudioTrack):
        self.tts_track = tts_track

    async def send(self, msg: dict):
        pass  # WebRTC track doesn't send JSON

    async def play_audio(self, audio: bytes):
        if audio:
            self.tts_track.add_audio(audio)

    def add_silence(self, duration_ms: int):
        self.tts_track.add_silence(duration_ms)

    def clear_tts_queue(self):
        self.tts_track.clear_queue()

    def get_queue_size(self):
        return self.tts_track.get_queue_size()

    def get_queue_duration(self):
        return self.tts_track.get_queue_duration()
