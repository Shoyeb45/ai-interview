import json
import asyncio
from aiortc import RTCPeerConnection, RTCSessionDescription
from fastapi import WebSocket, WebSocketDisconnect


async def handle_websocket_message(ws: WebSocket, pc: RTCPeerConnection, should_stop: asyncio.Event):
    try:
        while not should_stop.is_set():
            try:
                # Add timeout so we can check should_stop periodically
                message = await asyncio.wait_for(ws.receive_text(), timeout=1.0)
            except asyncio.TimeoutError:
                continue  # Check should_stop and loop again
                
            data = json.loads(message)

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