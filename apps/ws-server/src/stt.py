import asyncio
from faster_whisper import WhisperModel
import numpy as np
import time
from fastapi import WebSocket
from src.speech_state import SpeechState
from src.interview_agent.ai_brain import get_interviewer_response
from src.interview_agent.software_engineer import InterviewMetrics, provide_encouragement
from src.websocket.webrtc_tts_track import TTSAudioTrack
from src.tts_service import tts_service
from src.core.helper import send_over_ws
from src.services.redis.event_emitter import emit_question_evaluate, emit_end_interview, emit_generate_report

model = WhisperModel('small.en', device='cpu', compute_type='int8')

def transcribe_audio_sync(speech: np.ndarray) -> str:
    """
    Transcribe int16 PCM audio at 16kHz to text.
    """
    if len(speech) == 0:
        return ""
    
    # Convert int16 to float32 [-1, 1]
    audio_float = speech.astype(np.float32) / 32768.0
    
    # Calculate RMS (root mean square) to check audio level
    rms = np.sqrt(np.mean(audio_float ** 2))
    peak = np.abs(audio_float).max()
    
    # If audio is too quiet, apply gain boost
    if rms < 0.01:
        print(f"[STT] ⚠️  Audio too quiet (RMS: {rms:.4f}), applying 2x gain")
        audio_float = np.clip(audio_float * 2.0, -1.0, 1.0)
        rms = np.sqrt(np.mean(audio_float ** 2))
        print(f"[STT] After gain: RMS={rms:.4f}")
    
    try:
        segments, info = model.transcribe(
            audio_float,
            beam_size=5,
            language="en",
            vad_filter=False,
            temperature=0.0,
            without_timestamps=True,
            best_of=1,
            condition_on_previous_text=False,
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6
        )
        
        text = " ".join(seg.text for seg in segments).strip()
        
        if not text:
            print(f"[STT] Empty result. Language: {info.language}, prob: {info.language_probability:.2f}")
        else:
            print(f"[STT] ✅ Transcribed: \"{text}\"")
        
        return text
        
    except Exception as e:
        print(f"[STT] ❌ Transcription error: {e}")
        import traceback
        traceback.print_exc()
        return ""

async def transcribe_audio(speech: np.ndarray) -> str:
    return await asyncio.to_thread(transcribe_audio_sync, speech)


class StreamingSpeechProcessor:
    """Non-blocking speech processor with interrupt handling"""
    def __init__(self, ws: WebSocket, state: SpeechState, metrics: InterviewMetrics, tts_track: TTSAudioTrack = None, flow_manager=None, session=None):
        self.ws = ws
        self.state = state
        self.metrics = metrics
        self.tts_track = tts_track
        self.flow_manager = flow_manager
        self.session = session
        self.processing_queue = asyncio.Queue()
        self.is_processing = False
        self.last_activity_time = time.time()
        self.last_encouragement_time = 0
        self.monitoring_task = None
        self.has_received_answer = False
        self.ai_speaking = False  # Track if AI is currently speaking
        self.speech_end_task = None  # Task to notify when speech ends
        
    async def start(self):
        self.is_processing = True
        asyncio.create_task(self._process_loop())
        self.monitoring_task = asyncio.create_task(self._monitor_pauses())
        
    async def stop(self):
        self.is_processing = False
        if self.monitoring_task:
            self.monitoring_task.cancel()
        if self.speech_end_task:
            self.speech_end_task.cancel()
        
    async def add_speech_segment(self, speech_buffer: list):
        """Add to queue without blocking"""
        if speech_buffer:
            # User started speaking - interrupt AI if speaking
            if self.ai_speaking and self.tts_track:
                print("🛑 User interrupted - clearing AI speech queue")
                self.tts_track.clear_queue()
                self.ai_speaking = False
                
                # Cancel the speech end notification task
                if self.speech_end_task:
                    self.speech_end_task.cancel()
                
                # Notify frontend that AI stopped
                await send_over_ws(self.ws, {
                    "type": "ai_speaking",
                    "speaking": False
                })
            
            await self.processing_queue.put(speech_buffer.copy())
            self.last_activity_time = time.time()
            self.has_received_answer = True
            
    async def _process_loop(self):
        """Background processing"""
        while self.is_processing:
            try:
                speech_buffer = await asyncio.wait_for(
                    self.processing_queue.get(),
                    timeout=0.5
                )
                await self._process_segment(speech_buffer)
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"❌ Processing error: {e}")
                
    async def _process_segment(self, speech_buffer: list):
        """Process speech segment"""
        from src.core.helper import get_duration
        
        full_speech = np.concatenate(speech_buffer)
        duration = get_duration(full_speech)
        
        if duration < 0.3:
            return
            
        # Get answer duration
        answer_duration = self.metrics.get_answer_duration()
        
        # Send processing indicator (full utterance built; analyzing now)
        await send_over_ws(self.ws, {
            "type": "processing",
            "status": "analyzing"
        })
        
        # Transcribe
        text = await transcribe_audio(full_speech)
        
        if text:
            print(f'✅ [{answer_duration:.1f}s] User: "{text}"')
            
            # Send transcript
            await send_over_ws(self.ws, {
                "type": "transcript",
                "text": text,
                "is_final": True,
                "duration": duration
            })
            
            # Add to history
            self.state.add_message("user", text)
            
            # Analyze answer
            analysis = self.metrics.analyze_answer_pace(answer_duration, text)
            
            # Generate response with context
            context = {
                "answer_analysis": analysis,
                "long_pause": answer_duration if answer_duration > 10 else None
            }
            
            # Start AI response (non-blocking)
            asyncio.create_task(self._generate_response(text, context))
            
    async def _generate_response(self, user_text: str, context: dict):
        """Generate CONVERSATIONAL AI response: acknowledge + follow-up OR acknowledge + next question."""
        try:
            if not self.flow_manager:
                print("❌ No flow manager - cannot generate response")
                return

            if self.flow_manager.is_interview_complete():
                print("[CHECKPOINT] Interview complete - wrapping up")
                # Use AI-generated closing if we got one, else fallback
                ai_response = "Thank you for your time. That concludes our interview. We'll be in touch!"
                self.state.add_message("assistant", ai_response)
                if self.session:
                    self.session.interview_completed = True
                    emit_end_interview(self.session, self.state.conversation_history)
                    emit_generate_report(self.session, self.state.conversation_history)
                await send_over_ws(self.ws, {"type": "llm_response", "response": ai_response})
                if self.tts_track:
                    await self._play_tts(ai_response)
                # Send interview_ended event to trigger frontend redirect
                await send_over_ws(self.ws, {"type": "interview_ended"})
                return

            await send_over_ws(self.ws, {
                "type": "ai_status",
                "status": "thinking"
            })

            current_ctx, next_q, system_prompt, llm_context = self.flow_manager.get_context_for_interviewer_response()

            merged_context = {
                **context,
                **llm_context,
                "current_question_context": current_ctx,
            }
            if next_q:
                merged_context["next_question"] = next_q

            ai_response, move_to_next = await get_interviewer_response(
                self.state.conversation_history,
                system_prompt,
                self.metrics,
                merged_context,
            )

            self.state.add_message("assistant", ai_response)

            if move_to_next:
                # Emit question_evaluate before advancing (we have correct question number)
                q_num = self.flow_manager.current_question_index
                q_ctx, _, _, _ = self.flow_manager.get_context_for_interviewer_response()
                if self.session:
                    import time
                    question_asked_at = self.metrics.question_start_time
                    answer_dur = self.metrics.get_answer_duration()
                    emit_question_evaluate(
                        self.session,
                        question_number=q_num,
                        question=q_ctx or "",
                        user_response=user_text,
                        ai_response=ai_response,
                        question_asked_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(question_asked_at)) if question_asked_at else None,
                        answer_started_at=None,  # Not tracked precisely
                        answer_ended_at=time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                        thinking_time_sec=0,
                        answer_duration_sec=int(answer_dur) if answer_dur else None,
                        conversation_history=self.state.conversation_history.copy(),
                        metrics={
                            "struggling_indicators": self.metrics.struggling_indicators,
                            "confidence_score": context.get("answer_analysis", {}).get("is_confident", False),
                        },
                    )
                self.flow_manager.advance_to_next_question()
                self.metrics.start_question()

            # Send text response
            await send_over_ws(self.ws, {
                "type": "llm_response",
                "response": ai_response
            })

            # Generate and play TTS audio
            if self.tts_track:
                await self._play_tts(ai_response)

        except Exception as e:
            print(f"❌ AI response error: {e}")
            import traceback
            traceback.print_exc()
    
    async def _play_tts(self, text: str):
        """Generate and play TTS with interrupt handling"""
        try:
            print(f"🔊 Generating TTS for: {text[:50]}...")
            
            # Notify frontend that AI is about to speak
            self.ai_speaking = True
            await send_over_ws(self.ws, {
                "type": "ai_speaking",
                "speaking": True
            })
            
            # Generate TTS audio
            tts_audio = await tts_service.synthesize_speech(text)
            
            if tts_audio:
                # Add to queue
                self.tts_track.add_silence(300)  # 300ms pause before speaking
                self.tts_track.add_audio(tts_audio)
                
                # Get total duration in queue
                duration = self.tts_track.get_queue_duration()
                print(f"✅ TTS audio queued ({duration:.2f}s)")
                
                # Schedule notification for when speech ends
                # Cancel previous task if it exists
                if self.speech_end_task:
                    self.speech_end_task.cancel()
                
                self.speech_end_task = asyncio.create_task(
                    self._notify_speech_ended(duration)
                )
            else:
                print("❌ Failed to generate TTS audio")
                self.ai_speaking = False
                await send_over_ws(self.ws, {
                    "type": "ai_speaking",
                    "speaking": False
                })
                
        except Exception as e:
            print(f"❌ TTS error: {e}")
            self.ai_speaking = False
            await send_over_ws(self.ws, {
                "type": "ai_speaking",
                "speaking": False
            })
    
    async def _notify_speech_ended(self, duration: float):
        """Notify frontend when AI finishes speaking"""
        try:
            # Wait for the audio to finish playing
            await asyncio.sleep(duration + 0.5)  # Add 0.5s buffer
            
            self.ai_speaking = False
            await send_over_ws(self.ws, {
                "type": "ai_speaking",
                "speaking": False
            })
            print("🔇 AI finished speaking")
            
        except asyncio.CancelledError:
            # Task was cancelled (likely due to user interruption)
            print("🛑 Speech notification cancelled (interrupted)")
            pass
            
    async def _monitor_pauses(self):
        """Monitor for long pauses and provide encouragement"""
        while self.is_processing:
            await asyncio.sleep(3)  # Check every 3 seconds
            
            # Skip if user is currently speaking
            if self.state.is_speaking:
                self.last_activity_time = time.time()
                continue
            
            # Skip if AI is speaking
            if self.ai_speaking:
                self.last_activity_time = time.time()
                continue
            
            # Skip if we haven't received any answer yet
            if not self.has_received_answer:
                continue
            
            time_since_activity = time.time() - self.last_activity_time
            time_since_last_encouragement = time.time() - self.last_encouragement_time
            
            # Send encouragement if appropriate
            if (not self.state.is_speaking and 
                not self.ai_speaking and
                time_since_activity > 12 and 
                time_since_last_encouragement > 15):
                
                encouragement = await provide_encouragement(time_since_activity)
                
                if encouragement:
                    print(f"💭 Sending encouragement after {time_since_activity:.1f}s of silence")
                    await send_over_ws(self.ws, {
                        "type": "interviewer_tip",
                        "message": encouragement
                    })
                    
                    # Play TTS for encouragement
                    if self.tts_track:
                        await self._play_tts(encouragement)
                    
                self.last_encouragement_time = time.time()