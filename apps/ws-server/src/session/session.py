from src.speech_state import SpeechState
from src.interview_agent.software_engineer import InterviewMetrics
from src.core.helper import send_over_ws
from src.tts_service import tts_service


class InterviewSession:
    def __init__(self, user_id: str):
        self.user_id = user_id
        self.state = SpeechState()
        self.metrics = InterviewMetrics()
        self.transport = None  # set by manager (Transport abstraction)
        self.ws = None  # set by WebRTC/WS layer (legacy; prefer transport)
        self.tts_track = None  # set by WebRTC layer (legacy; prefer transport)
        self.agent = None  # set by manager (InterviewAgent)
        self.audio_pipeline = None  # set by manager after agent (AudioPipeline)
        self.video_pipeline = None  # optional: VideoPipeline(self) for video interviews

    async def send_text(self, text: str):
        """Send text response to client (e.g. LLM response)."""
        msg = {"type": "llm_response", "response": text}
        if self.transport:
            await self.transport.send(msg)
        elif self.ws:
            await send_over_ws(self.ws, msg)

    async def speak(self, text: str, silence_before_ms: int = 300, silence_after_ms: int = 0):
        """Generate TTS and queue for playback."""
        if not text:
            return
        if self.transport:
            if silence_before_ms:
                self.transport.add_silence(silence_before_ms)
            audio = await tts_service.synthesize_speech(text)
            if audio:
                await self.transport.play_audio(audio)
            if silence_after_ms:
                self.transport.add_silence(silence_after_ms)
        elif self.tts_track:
            if silence_before_ms:
                self.tts_track.add_silence(silence_before_ms)
            audio = await tts_service.synthesize_speech(text)
            if audio:
                self.tts_track.add_audio(audio)
            if silence_after_ms:
                self.tts_track.add_silence(silence_after_ms)
