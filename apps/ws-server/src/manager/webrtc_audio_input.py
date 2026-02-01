"""
WebRTC audio input: I/O only.
- Receive frames from remote track
- Convert sample rate (48k → 16k)
- Pass PCM chunks to session.audio_pipeline
"""
import asyncio
from aiortc import MediaStreamTrack, RTCPeerConnection
from fastapi import WebSocket
import numpy as np
from src.websocket.webrtc_tts_track import TTSAudioTrack
from src.core.helper import get_mono_audio
from src.constant import FRAME_SIZE
from src.websocket.audio_bufffer import downsample_48k_to_16k
from src.session.session import InterviewSession
from src.agents.interview.agent import InterviewAgent
from src.media.audio.pipeline import AudioPipeline
from src.transport.websocket import WebSocketTransport
from src.transport.webrtc_output import WebRTCOutput
from src.transport.composite import CompositeTransport
from src.services.redis.event_emitter import emit_abandon_interview
from aiortc import RTCConfiguration, RTCIceServer
active_sessions: dict[str, InterviewSession] = {}


class WebRTCAudioInput:
    def __init__(self, ws: WebSocket, user_id: str, session: InterviewSession):
        self.pc = RTCPeerConnection(
            configuration=RTCConfiguration(
                iceServers=[
                    RTCIceServer(urls=["stun:stun.l.google.com:19302"]),
                    # Add TURN server for production
                ]
            )
        )
        self.user_id = user_id
        self.session = session
        self.tts_track = TTSAudioTrack()
        self.ws = ws

        self.pc.addTrack(self.tts_track)
        print("🔊 TTS audio track added to peer connection")

        session.ws = ws
        session.tts_track = self.tts_track
        session.transport = CompositeTransport(
            WebSocketTransport(ws),
            WebRTCOutput(self.tts_track),
        )
        session.agent = InterviewAgent(session)
        session.audio_pipeline = AudioPipeline(session)
        active_sessions[user_id] = session

        self.should_stop = asyncio.Event()
        self.connection_ready = asyncio.Event()
        self.audio_ready = asyncio.Event()
        self.video_track_task = None  # for cleanup

    async def start_processor(self):
        await self.session.agent.processor.start()

    async def on_track(self, track: MediaStreamTrack):
        print('🎵 Track received:', track.kind)
        if track.kind == 'video':
            print('📹 Video track connected - starting video pipeline')
            from src.media.video.pipeline import VideoPipeline
            if not self.session.video_pipeline:
                self.session.video_pipeline = VideoPipeline(self.session)
            self.video_track_task = asyncio.create_task(
                self.session.video_pipeline.process_video_track(track, self.should_stop)
            )
            return
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
                    self.session.state.audio_buffer.add(pcm_16k)
                    
                    while len(self.session.state.audio_buffer.buffer) >= FRAME_SIZE:
                        chunk = self.session.state.audio_buffer.buffer[:FRAME_SIZE]
                        self.session.state.audio_buffer.buffer = self.session.state.audio_buffer.buffer[FRAME_SIZE:]
                        await self.session.audio_pipeline.process_chunk(chunk)
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
            await asyncio.wait_for(self.audio_ready.wait(), timeout=5.0)
            print("Audio track ready")
            await asyncio.sleep(0.5)
            await self.session.agent.start()
        except asyncio.TimeoutError:
            print("❌ Connection timeout - peer connection didn't establish")
        except Exception as e:
            print(f"❌ Error during initialization: {e}")
            import traceback
            traceback.print_exc()

    async def cleanup(self):
        print("🧹 Cleaning up connection...")
        self.should_stop.set()
        if self.video_track_task and not self.video_track_task.done():
            self.video_track_task.cancel()
            try:
                await self.video_track_task
            except asyncio.CancelledError:
                pass
        await self.session.agent.processor.stop()
        await asyncio.sleep(0.1)
        try:
            # Emit abandon_interview if not successfully completed
            if not getattr(self.session, "interview_completed", False) and self.session.flow_manager:
                emit_abandon_interview(
                    self.session,
                    reason="connection_closed",
                    conversation_history=getattr(self.session.state, "conversation_history", []),
                )
            await self.pc.close()
            if self.user_id in active_sessions:
                del active_sessions[self.user_id]
            print("✅ Connection closed gracefully")
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
        self.session.state.reset()
