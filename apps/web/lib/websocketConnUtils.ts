export async function handleWebSocketOpen(
  ws: WebSocket,
  pc: RTCPeerConnection
) {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: false,
  });

  await pc.setLocalDescription(offer);

  ws.send(
    JSON.stringify({
      type: offer.type,
      sdp: offer.sdp,
    })
  );
}
