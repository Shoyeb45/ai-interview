"""Audio pipeline: VAD + buffering + speech segmentation. Feeds agent.on_user_speech."""

import webrtcvad
from src.core.helper import get_vad_result, send_over_ws
from src.constant import (
    MAX_SPEECH_DURATION,
    MIN_SPEECH_DURATION,
    MIN_SPEECH_FRAMES,
    SILENCE_THRESHOLD,
)


class AudioPipeline:
    def __init__(self, session):
        self.session = session
        self.vad = webrtcvad.Vad(2)

    async def process_chunk(self, chunk):
        """
        Process one FRAME_SIZE chunk of 16kHz PCM. Updates session.state and
        calls agent.on_user_speech when a full utterance is detected.
        """
        state = self.session.state
        vad_result = get_vad_result(chunk, self.vad)

        if vad_result:
            state.speech_frame_count += 1
            state.silence_frames = 0
        else:
            if state.is_speaking:
                state.silence_frames += 1
            state.speech_frame_count = max(0, state.speech_frame_count - 1)

        should_record = state.speech_frame_count >= MIN_SPEECH_FRAMES

        if should_record:
            if not state.is_speaking:
                # Only treat as "user started" when no TTS is queued (avoid echo/noise cutting off opening)
                tts_has_audio = self.session.tts_track and self.session.tts_track.get_queue_size() > 0
                if state.speech_frame_count >= MIN_SPEECH_DURATION and not tts_has_audio:
                    print("[CHECKPOINT] user_started_speaking")
                    state.is_speaking = True
                    state.speech_buffer = []
                    state.total_speech_frames = 0
                    if self.session.tts_track and self.session.tts_track.get_queue_size() > 0:
                        print("[CHECKPOINT] tts_interrupted")
                        self.session.tts_track.clear_queue()
                    # Notify frontend so mic UI stays in sync (user is speaking)
                    if self.session.ws:
                        await send_over_ws(self.session.ws, {
                            "type": "user_speaking",
                            "speaking": True,
                        })

            if state.is_speaking:
                state.speech_buffer.append(chunk)
                state.total_speech_frames += 1
                if state.total_speech_frames >= MAX_SPEECH_DURATION:
                    print("⏱️  Max duration, processing")
                    # Mute mic first so frontend turns off mic immediately
                    if self.session.ws:
                        await send_over_ws(self.session.ws, {
                            "type": "user_speaking",
                            "speaking": False,
                        })
                    await self.session.agent.on_user_speech(state.speech_buffer)
                    state.reset()
        else:
            if state.is_speaking:
                if state.silence_frames <= SILENCE_THRESHOLD:
                    state.speech_buffer.append(chunk)
                if state.silence_frames > SILENCE_THRESHOLD:
                    print("[CHECKPOINT] user_stopped_speaking")
                    # Notify frontend first so mic turns off smoothly (user stopped)
                    if self.session.ws:
                        await send_over_ws(self.session.ws, {
                            "type": "user_speaking",
                            "speaking": False,
                        })
                    await self.session.agent.on_user_speech(state.speech_buffer)
                    state.reset()
