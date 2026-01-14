from pathlib import Path
from aiortc import MediaStreamTrack, RTCPeerConnection
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import numpy as np
import webrtcvad
import asyncio
from src.audio_bufffer import downsample_48k_to_16k, get_mono_audio
from src.stt import get_vad_result
from src.websocket_conn import handle_websocket_message
from src.helper import get_token, process_speech_segment, send_over_ws
from src.constant import FRAME_SIZE, MAX_SPEECH_DURATION, MIN_SPEECH_DURATION, MIN_SPEECH_FRAMES, SILENCE_THRESHOLD
from src.speech_state import SpeechState
from src.interview_agent.software_engineer import start_interview
app = FastAPI()

active_sessions: dict[str, SpeechState] = {}

# Create debug directory
DEBUG_DIR = Path("audio_debug")
DEBUG_DIR.mkdir(exist_ok=True)

vad = webrtcvad.Vad(2)  # 2 (less aggressive)


@app.websocket('/ws')
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("✅ WebSocket connection accepted")

    user_id = get_token(str(ws.url))

    print(f"[{user_id}] User Connected.")

    pc = RTCPeerConnection()
    pc.addTransceiver("audio", direction="recvonly")
    
    state = SpeechState()
    active_sessions[user_id] = state

    opening_message = await start_interview()

    state.add_message('assistant', opening_message)
    state.interview_started = True

    # Send opening message to user
    await send_over_ws(ws, {
        "type": "llm_response",
        "response": opening_message
    })
    
    # Flag to signal track handler to stop
    should_stop = asyncio.Event()
    
    @pc.on('track')
    async def on_track(track: MediaStreamTrack):
        print('🎵 Track received:', track.kind)

        if track.kind != 'audio':
            return
        
        print('🎤 Audio track connected')

        try:
            while not should_stop.is_set():
                try:
                    # Add timeout to prevent infinite blocking
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

                            if state.is_speaking:
                                state.speech_buffer.append(chunk)
                                state.total_speech_frames += 1
                                
                                if state.total_speech_frames >= MAX_SPEECH_DURATION:
                                    print("⏱️  Max duration reached, forcing transcription")
                                    await process_speech_segment(ws, state.speech_buffer, state)
                                    state.reset()
                        else:
                            if state.is_speaking:
                                if state.silence_frames <= SILENCE_THRESHOLD:
                                    state.speech_buffer.append(chunk)
                                
                                if state.silence_frames > SILENCE_THRESHOLD:
                                    print("🔴 User stopped speaking")
                                    await process_speech_segment(ws, state.speech_buffer, state)
                                    state.reset()
                
                except asyncio.TimeoutError:
                    # Timeout is normal, just check if we should stop
                    continue
                except Exception as e:
                    if "ended" in str(e).lower() or "closed" in str(e).lower():
                        print("🔌 Track ended")
                        break
                    print(f"⚠️  Error receiving frame: {e}")
                    break
                    
        except Exception as e:
            print(f"❌ Error in audio processing: {e}")
            import traceback
            traceback.print_exc()
        finally:
            print("🧹 Audio track handler cleanup")
                    
    @pc.on('connectionstatechange')
    async def on_state_change():
        print('📡 Connection state:', pc.connectionState)
        if pc.connectionState in ['failed', 'closed']:
            should_stop.set()

    try:
        await handle_websocket_message(ws, pc, should_stop)
    except WebSocketDisconnect:
        print("🔌 WebSocket disconnected")
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("🧹 Cleaning up connection...")
        should_stop.set()  # Signal track handler to stop
        await asyncio.sleep(0.1)  # Give track handler time to exit
        try:
            await pc.close()
            # ✅ Remove user from active sessions
            if user_id in active_sessions:
                del active_sessions[user_id]

            print("✅ Connection closed gracefully")
        except Exception as e:
            print(f"⚠️  Error during cleanup: {e}")
        state.reset()