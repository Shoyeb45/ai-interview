import json
import time
from typing import Any, Dict
import wave
from fastapi import WebSocket
import numpy as np
from src.constant import AUDIO_FREQ
from urllib.parse import parse_qs, urlparse


def get_duration(speech_buffer):
    '''Returns audio duration in seconds.

    ## Args
        - `speech_buffer`: Should be valid array
    '''
    return len(speech_buffer) / AUDIO_FREQ


def save_debug_audio(audio_48k: np.ndarray, audio_16k: np.ndarray, label: str, DEBUG_DIR: str):
    """Save both 48kHz and 16kHz audio for comparison"""
    global audio_counter
    audio_counter += 1
    
    timestamp = int(time.time() * 1000)
    
    # Calculate durations
    duration_48k = len(audio_48k) / 48000
    duration_16k = len(audio_16k) / 16000
    
    # Save 48kHz version
    path_48k = DEBUG_DIR / f"{audio_counter:03d}_{label}_48k_{timestamp}.wav"
    with wave.open(str(path_48k), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(48000)
        wf.writeframes(audio_48k.tobytes())
    
    # Save 16kHz version
    path_16k = DEBUG_DIR / f"{audio_counter:03d}_{label}_16k_{timestamp}.wav"
    with wave.open(str(path_16k), 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        wf.writeframes(audio_16k.tobytes())
    
    print(f"💾 Saved debug audio:")
    print(f"   48kHz: {len(audio_48k)} samples, {duration_48k:.2f}s → {path_48k.name}")
    print(f"   16kHz: {len(audio_16k)} samples, {duration_16k:.2f}s → {path_16k.name}")


async def send_over_ws(ws: WebSocket, value: Dict[str, Any]):
    try:
        await ws.send_text(json.dumps(value))
    except Exception as e:
        print('Failed to send data over websocket.')
        print(e)


def get_token(url: str):
    parsed_url = urlparse(url)
    token = parse_qs(parsed_url.query)['token'][0]
    return token