from dotenv import load_dotenv
from src.core.helper import setup_gcp_cred

load_dotenv()

# setup google cloud credentials
setup_gcp_cred()

from aiortc import MediaStreamTrack
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import asyncio
from src.websocket.websocket_conn import handle_websocket_message
from src.core.helper import get_token_and_session, send_over_ws
from src.session.session import InterviewSession
from src.manager.webrtc_audio_input import WebRTCAudioInput
from src.interview_agent.flow_manager import InterviewFlowManager, SessionNotFoundError


# Global states
app = FastAPI()

@app.websocket('/ws')
async def websocket_endpoint(ws: WebSocket):
    await ws.accept()
    print("WebSocket connection accepted")

    token, session_id = get_token_and_session(str(ws.url))

    # Validate token and sessionId are provided
    if not token or not session_id:
        await send_over_ws(ws, {
            "type": "error",
            "code": "MISSING_CREDENTIALS",
            "message": "Missing token or session ID. Please start the interview from the interview page."
        })
        await ws.close(code=4001, reason="Missing token or session ID")
        return

    session = InterviewSession(token, str(session_id))
    payload = session.verify_jwt()
    if payload is None:
        await send_over_ws(ws, {
            "type": "error",
            "code": "FORBIDDEN",
            "message": "Invalid or expired access. Please sign in again."
        })
        await ws.close(code=4003, reason="Invalid or expired token")
        return

    # Load interview config from Redis
    try:
        session.flow_manager = InterviewFlowManager(str(session_id))
    except SessionNotFoundError as e:
        await send_over_ws(ws, {
            "type": "error",
            "code": "SESSION_EXPIRED",
            "message": str(e)
        })
        await ws.close(code=4004, reason="Session expired or invalid")
        return

    print(f"[CHECKPOINT] user_connected user_id={session.user_id}")
    webrtc_input = WebRTCAudioInput(ws, session.user_id, session)
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