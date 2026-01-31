"""Interview agent: opening message, user speech → STT → LLM → TTS."""

import asyncio
from src.agents.base import BaseAgent
from src.core.helper import send_over_ws
from src.stt import StreamingSpeechProcessor


class InterviewAgent(BaseAgent):
    def __init__(self, session):
        self.session = session
        self.processor = StreamingSpeechProcessor(
            session.ws,
            session.state,
            session.metrics,
            session.tts_track,
            session.flow_manager,
        )

    async def start(self):
        opening = self.session.flow_manager.get_opening_message()
        self.session.state.add_message("assistant", opening)
        self.session.state.interview_started = True

        self.session.metrics.start_question()
        await self.session.send_text(opening)

        # Notify frontend that AI is about to speak (opening) so mic state stays in sync
        self.processor.ai_speaking = True
        if self.session.ws:
            await send_over_ws(self.session.ws, {"type": "ai_speaking", "speaking": True})

        await self.session.speak(opening, silence_before_ms=300, silence_after_ms=500)
        # Schedule ai_speaking false when opening TTS finishes (frontend can unmute)
        duration = self.session.tts_track.get_queue_duration() if self.session.tts_track else 0.0
        
        asyncio.create_task(self._notify_opening_speech_ended(duration))
        print("[CHECKPOINT] opening_message_sent")

    async def _notify_opening_speech_ended(self, duration: float):
        """Notify frontend when opening TTS finishes so it can unmute."""
        try:
            await asyncio.sleep(duration + 0.5)
            self.processor.ai_speaking = False
            if self.session.ws:
                await send_over_ws(self.session.ws, {"type": "ai_speaking", "speaking": False})
        except asyncio.CancelledError:
            pass

    async def on_user_speech(self, speech_buffer: list):
        """Handle user speech segment (list of PCM chunks)."""
        await self.processor.add_speech_segment(speech_buffer)
