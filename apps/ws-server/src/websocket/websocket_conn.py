import json
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription
from fastapi import WebSocket, WebSocketDisconnect


async def handle_websocket_message(
    ws: WebSocket,
    pc: RTCPeerConnection,
    should_stop: asyncio.Event,
    session=None,
    on_proctoring_tab_change=None,
):
    """Handle WebSocket messages. on_proctoring_tab_change(session) returns True if interview should end (cheated)."""
    try:
        while not should_stop.is_set():
            try:
                message = await asyncio.wait_for(ws.receive_text(), timeout=1.0)
            except asyncio.TimeoutError:
                continue

            data = json.loads(message)

            # Proctoring: tab change - delegate to handler
            if data.get("type") == "proctoring_event" and data.get("eventType") == "tab_change":
                if session and on_proctoring_tab_change:
                    should_end = await on_proctoring_tab_change(session)
                    if should_end:
                        await ws.send_text(
                            json.dumps({
                                "type": "interview_cheated",
                                "reason": "Too many tab changes. Interview ended due to proctoring violation.",
                            })
                        )
                        should_stop.set()
                continue

            if data['type'] == 'offer':
                offer = RTCSessionDescription(
                    sdp=data['sdp'],
                    type=data['type']
                )

                await pc.setRemoteDescription(offer)
                answer = await pc.createAnswer()
                print(f"📋 Answer SDP:\n{answer.sdp}")
                await pc.setLocalDescription(answer)

                await ws.send_text(json.dumps({
                    'type': pc.localDescription.type,
                    'sdp': pc.localDescription.sdp
                }))
                print("✅ SDP answer sent to client")
                
            elif data['type'] == 'ice':
                if data.get("candidate"):
                    from aiortc.sdp import candidate_from_sdp
        
                    candidate_dict = data["candidate"]
                    candidate = candidate_from_sdp(candidate_dict["candidate"])
                    candidate.sdpMid = candidate_dict["sdpMid"]
                    candidate.sdpMLineIndex = candidate_dict["sdpMLineIndex"]
                    
                    await pc.addIceCandidate(candidate)
                    
    except WebSocketDisconnect:
        print("🔌 WebSocket disconnected by client")
        should_stop.set()
    except json.JSONDecodeError as e:
        print('❌ Invalid JSON data from the frontend.')
        print(e)
    except Exception as e:
        print(f"❌ WebSocket error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("🧹 WebSocket handler cleanup complete")