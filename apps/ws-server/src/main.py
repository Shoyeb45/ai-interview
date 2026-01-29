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
from src.manager.audio_manager import AudioManager


# Global states
app = FastAPI()

@app.websocket('/ws')
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("WebSocket connection accepted")

    user_id = get_token(str(ws.url))
    print(f"[{user_id}] User Connected.")

    audio_manager = AudioManager(ws, user_id)
    await audio_manager.start_processor()
    
    @audio_manager.pc.on('track')
    async def _on_track(track: MediaStreamTrack):
        await audio_manager.on_track(track)

    @audio_manager.pc.on('connectionstatechange')
    async def _on_state_change():
        await audio_manager.on_state_change()

    # Handle WebSocket messages
    async def handle_messages():
        try:
            await handle_websocket_message(ws, audio_manager.pc, audio_manager.should_stop)
        except WebSocketDisconnect:
            print("WebSocket disconnected")
        except Exception as e:
            print(f"WebSocket error: {e}")
            import traceback
            traceback.print_exc()
    
    # Start message handler
    message_task = asyncio.create_task(handle_messages())
    await audio_manager.process_audio()

    # Wait for completion
    try:
        await message_task
    finally:
        await audio_manager.cleanup()