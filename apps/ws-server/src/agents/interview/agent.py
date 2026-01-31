"""Interview agent: opening message, user speech → STT → LLM → TTS."""

from src.agents.base import BaseAgent
from src.interview_agent.software_engineer import start_interview
from src.stt import StreamingSpeechProcessor


class InterviewAgent(BaseAgent):
    def __init__(self, session):
        self.session = session
        self.processor = StreamingSpeechProcessor(
            session.ws,
            session.state,
            session.metrics,
            session.tts_track,
        )

    async def start(self):
        opening = await start_interview()
        self.session.state.add_message("assistant", opening)
        self.session.state.interview_started = True
        self.session.metrics.start_question()
        await self.session.send_text(opening)
        await self.session.speak(opening, silence_before_ms=300, silence_after_ms=500)
        print("[CHECKPOINT] opening_message_sent")

    async def on_user_speech(self, speech_buffer: list):
        """Handle user speech segment (list of PCM chunks)."""
        await self.processor.add_speech_segment(speech_buffer)
