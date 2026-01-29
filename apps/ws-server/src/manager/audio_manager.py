import asyncio
from aiortc import MediaStreamTrack, RTCPeerConnection
from fastapi import WebSocket
import numpy as np
from src.websocket.webrtc_tts_track import TTSAudioTrack
from src.speech_state import SpeechState
from src.interview_agent.software_engineer import start_interview, InterviewMetrics
from src.core.helper import get_vad_result, get_mono_audio
from src.constant import FRAME_SIZE, MAX_SPEECH_DURATION, MIN_SPEECH_DURATION, MIN_SPEECH_FRAMES, SILENCE_THRESHOLD
from src.websocket.audio_bufffer import downsample_48k_to_16k
from src.stt import StreamingSpeechProcessor
from src.core.helper import get_token, send_over_ws
from src.tts_service import tts_service
import webrtcvad

active_sessions: dict[str, SpeechState] = {}
vad = webrtcvad.Vad(2)


class AudioManager:
    def __init__(self, ws: WebSocket, user_id: str):
        self.pc = RTCPeerConnection()
        self.user_id = user_id
        self.tts_track = TTSAudioTrack()
        self.ws = ws

        self.pc.addTrack(self.tts_track)
        print("🔊 TTS audio track added to peer connection")

        self.state = SpeechState()
        self.metrics = InterviewMetrics()
        self.processor = StreamingSpeechProcessor(ws, self.state, self.metrics, self.tts_track)
        active_sessions[user_id] = self.state

        self.should_stop = asyncio.Event()
        self.connection_ready = asyncio.Event()
        self.audio_ready = asyncio.Event()  # New: Track when audio track is connected

    async def start_processor(self):
        await self.processor.start()

    async def on_track(self, track: MediaStreamTrack):
        print('🎵 Track received:', track.kind)

        if track.kind != 'audio':
            return
        
        print('🎤 Audio track connected')
        self.audio_ready.set()

        try:
            while not self.should_stop.is_set():
                try:
                    frame = await asyncio.wait_for(track.recv(), timeout=1.0)
                    raw = frame.to_ndarray()

                    audio_mono = get_mono_audio(raw, frame)
                    
                    if audio_mono.dtype == np.float32 or audio_mono.dtype == np.float64:
                        audio_mono = (audio_mono * 32767).astype(np.int16)
                    
                    pcm_16k = downsample_48k_to_16k(audio_mono)
                    self.state.audio_buffer.add(pcm_16k)

                    while len(self.state.audio_buffer.buffer) >= FRAME_SIZE:
                        chunk = self.state.audio_buffer.buffer[:FRAME_SIZE]
                        self.state.audio_buffer.buffer = self.state.audio_buffer.buffer[FRAME_SIZE:]

                        vad_result = get_vad_result(chunk, vad)
                        
                        if vad_result:
                            self.state.speech_frame_count += 1
                            self.state.silence_frames = 0
                        else:
                            if self.state.is_speaking:
                                self.state.silence_frames += 1
                            self.state.speech_frame_count = max(0, self.state.speech_frame_count - 1)

                        should_record = (self.state.speech_frame_count >= MIN_SPEECH_FRAMES)

                        if should_record:
                            if not self.state.is_speaking:
                                if self.state.speech_frame_count >= MIN_SPEECH_DURATION:
                                    print("🟢 User started speaking")
                                    self.state.is_speaking = True
                                    self.state.speech_buffer = []
                                    self.state.total_speech_frames = 0
                                    
                                    # INTERRUPT AI SPEECH - clear the TTS queue
                                    if self.tts_track and self.tts_track.get_queue_size() > 0:
                                        print("🛑 Interrupting AI - clearing TTS queue")
                                        self.tts_track.clear_queue()

                            if self.state.is_speaking:
                                self.state.speech_buffer.append(chunk)
                                self.state.total_speech_frames += 1
                                
                                if self.state.total_speech_frames >= MAX_SPEECH_DURATION:
                                    print("⏱️  Max duration, processing")
                                    await self.processor.add_speech_segment(self.state.speech_buffer)
                                    self.state.reset()
                        else:
                            if self.state.is_speaking:
                                if self.state.silence_frames <= SILENCE_THRESHOLD:
                                    self.state.speech_buffer.append(chunk)
                                
                                if self.state.silence_frames > SILENCE_THRESHOLD:
                                    print("🔴 User stopped speaking")
                                    await self.processor.add_speech_segment(self.state.speech_buffer)
                                    self.state.reset()
                                    
                                    # Notify frontend that user stopped speaking
                                    await send_over_ws(self.ws, {
                                        "type": "user_speaking",
                                        "speaking": False
                                    })
                
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    if "ended" in str(e).lower() or "closed" in str(e).lower():
                        print("Track ended")
                        break
                    print(f"Error receiving frame: {e}")
                    break
                    
        except Exception as e:
            print(f"Error in audio processing: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("Audio track handler cleanup")        
    
    async def on_state_change(self):
        print('Connection state:', self.pc.connectionState)
        if self.pc.connectionState == 'connected':
            self.connection_ready.set()
            print('Peer connection ready')
        elif self.pc.connectionState in ['failed', 'closed']:
            self.should_stop.set()

    
    async def process_audio(self):
        try:
            print("⏳ Waiting for connection and audio track...")
            await asyncio.wait_for(self.connection_ready.wait(), timeout=10.0)
            print("Connection established")
            
            # Wait a bit more for audio track to be fully connected
            await asyncio.wait_for(self.audio_ready.wait(), timeout=5.0)
            print("Audio track ready")
            
            # Give WebRTC a moment to stabilize
            await asyncio.sleep(0.5)
            
            print("🎉 Sending opening message with TTS")
            
            # Get opening message
            opening_message = await start_interview()
            self.state.add_message('assistant', opening_message)
            self.state.interview_started = True
            
            # Start question timer
            self.metrics.start_question()

            # Send text response to frontend
            await send_over_ws(self.ws, {
                "type": "llm_response",
                "response": opening_message
            })
            
            # Generate TTS audio
            print(f"🔊 Generating TTS for opening message: '{opening_message[:50]}...'")
            
            opening_audio = await tts_service.synthesize_speech(opening_message)
            
            if opening_audio and len(opening_audio) > 0:
                print(f"✅ TTS generated: {len(opening_audio)} bytes")
                
                self.tts_track.add_silence(300)
                self.tts_track.add_audio(opening_audio)
                self.tts_track.add_silence(500)
                print(f"✅ Opening TTS audio queued successfully")
                
                # Debug: Log track state
                print(f"📊 TTS Track stats - Queue size: {self.tts_track.get_queue_size() if hasattr(self.tts_track, 'get_queue_size') else 'unknown'}")
            else:
                print("❌ Failed to generate TTS audio")
            
        except asyncio.TimeoutError:
            print("❌ Connection timeout - peer connection didn't establish")
        except Exception as e:
            print(f"❌ Error during initialization: {e}")
            import traceback
            traceback.print_exc()

    async def cleanup(self):
        print("🧹 Cleaning up connection...")
        self.should_stop.set()
        await self.processor.stop()
        await asyncio.sleep(0.1)
        try:
            await self.pc.close()
            if self.user_id in self.active_sessions:
                del active_sessions[self.user_id]
            print("✅ Connection closed gracefully")
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
        self.state.reset()