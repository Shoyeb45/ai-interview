from dotenv import load_dotenv
from src.core.helper import setup_gcp_cred

load_dotenv()

# setup google cloud credentials
setup_gcp_cred()

from aiortc import MediaStreamTrack
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
from src.websocket.websocket_conn import handle_websocket_message
from src.core.helper import get_token
from src.session.session import InterviewSession
from src.manager.webrtc_audio_input import WebRTCAudioInput


# Global states
app = FastAPI()

@app.websocket('/ws')
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("WebSocket connection accepted")

    user_id = get_token(str(ws.url))
    print(f"[CHECKPOINT] user_connected user_id={user_id}")

    session = InterviewSession(user_id)
    webrtc_input = WebRTCAudioInput(ws, user_id, session)
    await webrtc_input.start_processor()
    
    @webrtc_input.pc.on('track')
    async def _on_track(track: MediaStreamTrack):
        await webrtc_input.on_track(track)

    @webrtc_input.pc.on('connectionstatechange')
    async def _on_state_change():
        await webrtc_input.on_state_change()

    # Handle WebSocket messages
    async def handle_messages():
        try:
            await handle_websocket_message(ws, webrtc_input.pc, webrtc_input.should_stop)
        except WebSocketDisconnect:
            print("WebSocket disconnected")
        except Exception as e:
            print(f"WebSocket error: {e}")
            import traceback
            traceback.print_exc()
    
    # Start message handler
    message_task = asyncio.create_task(handle_messages())
    await webrtc_input.process_audio()

    # Wait for completion
    try:
        await message_task
    finally:
        await webrtc_input.cleanup()