from dotenv import load_dotenv
from src.core.helper import get_vad_result, get_mono_audio, setup_gcp_cred


load_dotenv()

# setup google cloud credentials
setup_gcp_cred()

from pathlib import Path
from aiortc import MediaStreamTrack, RTCPeerConnection
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import numpy as np
import webrtcvad
import asyncio
from src.audio_bufffer import downsample_48k_to_16k
from src.websocket.websocket_conn import handle_websocket_message
from src.core.helper import get_token, send_over_ws
from src.constant import FRAME_SIZE, MAX_SPEECH_DURATION, MIN_SPEECH_DURATION, MIN_SPEECH_FRAMES, SILENCE_THRESHOLD
from src.speech_state import SpeechState
from src.interview_agent.software_engineer import start_interview, InterviewMetrics
from src.tts_service import tts_service
from src.websocket.webrtc_tts_track import TTSAudioTrack
from src.stt import StreamingSpeechProcessor

# Global states
app = FastAPI()
active_sessions: dict[str, SpeechState] = {}
vad = webrtcvad.Vad(2)


@app.websocket('/ws')
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("✅ WebSocket connection accepted")

    user_id = get_token(str(ws.url))
    print(f"[{user_id}] User Connected.")

    # Create peer connection
    pc = RTCPeerConnection()
    
    # Create and add TTS audio track BEFORE any negotiation
    tts_track = TTSAudioTrack()
    pc.addTrack(tts_track)
    print("🔊 TTS audio track added to peer connection")
    
    state = SpeechState()
    metrics = InterviewMetrics()
    active_sessions[user_id] = state

    should_stop = asyncio.Event()
    connection_ready = asyncio.Event()
    audio_ready = asyncio.Event()  # New: Track when audio track is connected
    

    @pc.on('track')
    async def on_track(track: MediaStreamTrack):
        print('🎵 Track received:', track.kind)

        if track.kind != 'audio':
            return
        
        print('🎤 Audio track connected')
        audio_ready.set()

        try:
            while not should_stop.is_set():
                try:
                    frame = await asyncio.wait_for(track.recv(), timeout=1.0)
                    raw = frame.to_ndarray()

                    audio_mono = get_mono_audio(raw, frame)
                    
                    if audio_mono.dtype == np.float32 or audio_mono.dtype == np.float64:
                        audio_mono = (audio_mono * 32767).astype(np.int16)
                    
                    pcm_16k = downsample_48k_to_16k(audio_mono)
                    state.audio_buffer.add(pcm_16k)

                    while len(state.audio_buffer.buffer) >= FRAME_SIZE:
                        chunk = state.audio_buffer.buffer[:FRAME_SIZE]
                        state.audio_buffer.buffer = state.audio_buffer.buffer[FRAME_SIZE:]

                        vad_result = get_vad_result(chunk, vad)
                        
                        if vad_result:
                            state.speech_frame_count += 1
                            state.silence_frames = 0
                        else:
                            if state.is_speaking:
                                state.silence_frames += 1
                            state.speech_frame_count = max(0, state.speech_frame_count - 1)

                        should_record = (state.speech_frame_count >= MIN_SPEECH_FRAMES)

                        if should_record:
                            if not state.is_speaking:
                                if state.speech_frame_count >= MIN_SPEECH_DURATION:
                                    print("🟢 User started speaking")
                                    state.is_speaking = True
                                    state.speech_buffer = []
                                    state.total_speech_frames = 0
                                    
                                    # INTERRUPT AI SPEECH - clear the TTS queue
                                    if tts_track and tts_track.get_queue_size() > 0:
                                        print("🛑 Interrupting AI - clearing TTS queue")
                                        tts_track.clear_queue()

                            if state.is_speaking:
                                state.speech_buffer.append(chunk)
                                state.total_speech_frames += 1
                                
                                if state.total_speech_frames >= MAX_SPEECH_DURATION:
                                    print("⏱️  Max duration, processing")
                                    await processor.add_speech_segment(state.speech_buffer)
                                    state.reset()
                        else:
                            if state.is_speaking:
                                if state.silence_frames <= SILENCE_THRESHOLD:
                                    state.speech_buffer.append(chunk)
                                
                                if state.silence_frames > SILENCE_THRESHOLD:
                                    print("🔴 User stopped speaking")
                                    await processor.add_speech_segment(state.speech_buffer)
                                    state.reset()
                                    
                                    # Notify frontend that user stopped speaking
                                    await send_over_ws(ws, {
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
    @pc.on('connectionstatechange')
    async def on_state_change():
        print('📡 Connection state:', pc.connectionState)
        if pc.connectionState == 'connected':
            connection_ready.set()
            print('✅ Peer connection ready')
        elif pc.connectionState in ['failed', 'closed']:
            should_stop.set()

    # Create streaming processor with TTS track
    processor = StreamingSpeechProcessor(ws, state, metrics, tts_track)
    await processor.start()

    # Handle WebSocket messages
    async def handle_messages():
        try:
            await handle_websocket_message(ws, pc, should_stop)
        except WebSocketDisconnect:
            print("WebSocket disconnected")
        except Exception as e:
            print(f"WebSocket error: {e}")
            import traceback
            traceback.print_exc()
    
    # Start message handler
    message_task = asyncio.create_task(handle_messages())
    
    # Wait for BOTH connection and audio track to be ready
    try:
        print("⏳ Waiting for connection and audio track...")
        await asyncio.wait_for(connection_ready.wait(), timeout=10.0)
        print("✅ Connection established")
        
        # Wait a bit more for audio track to be fully connected
        await asyncio.wait_for(audio_ready.wait(), timeout=5.0)
        print("✅ Audio track ready")
        
        # Give WebRTC a moment to stabilize
        await asyncio.sleep(0.5)
        
        print("🎉 Sending opening message with TTS")
        
        # Get opening message
        opening_message = await start_interview()
        state.add_message('assistant', opening_message)
        state.interview_started = True
        
        # Start question timer
        metrics.start_question()

        # Send text response to frontend
        await send_over_ws(ws, {
            "type": "llm_response",
            "response": opening_message
        })
        
        # Generate TTS audio
        print(f"🔊 Generating TTS for opening message: '{opening_message[:50]}...'")
        
        opening_audio = await tts_service.synthesize_speech(opening_message)
        
        if opening_audio and len(opening_audio) > 0:
            print(f"✅ TTS generated: {len(opening_audio)} bytes")
            
            # Add initial silence to ensure smooth start
            # await tts_track.add_silence(300)
            
            # # Queue the audio
            # await tts_track.add_audio(opening_audio)
            
            # # Add trailing silence for natural pause
            # await tts_track.add_silence(500)
            
            tts_track.add_silence(300)
            tts_track.add_audio(opening_audio)
            tts_track.add_silence(500)
            print(f"✅ Opening TTS audio queued successfully")
            
            # Debug: Log track state
            print(f"📊 TTS Track stats - Queue size: {tts_track.get_queue_size() if hasattr(tts_track, 'get_queue_size') else 'unknown'}")
        else:
            print("❌ Failed to generate TTS audio")
        
    except asyncio.TimeoutError:
        print("❌ Connection timeout - peer connection didn't establish")
    except Exception as e:
        print(f"❌ Error during initialization: {e}")
        import traceback
        traceback.print_exc()
    
    # Wait for completion
    try:
        await message_task
    finally:
        print("🧹 Cleaning up connection...")
        should_stop.set()
        await processor.stop()
        await asyncio.sleep(0.1)
        try:
            await pc.close()
            if user_id in active_sessions:
                del active_sessions[user_id]
            print("✅ Connection closed gracefully")
        except Exception as e:
            print(f"❌ Error during cleanup: {e}")
        state.reset()