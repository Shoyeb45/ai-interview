import json
import time
from typing import Any, Dict, Union
import wave
from fastapi import WebSocket
import numpy as np
from av import Packet, frame
from src.constant import AUDIO_FREQ, ENERGY_THRESHOLD
from urllib.parse import parse_qs, urlparse
from webrtcvad import Vad
import os
from pydub import AudioSegment


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



def debug_audio_stats(full_speech: np.ndarray):
    audio_float = full_speech.astype(np.float32) / 32768.0
    rms = np.sqrt(np.mean(audio_float ** 2))
    print(f'🔊 Audio RMS: {rms:.4f}, Peak: {np.abs(audio_float).max():.4f}')


def get_vad_result(chunk, vad: Vad):
    energy = np.abs(chunk).mean()

    # Run VAD with energy threshold pre-filter
    if energy > ENERGY_THRESHOLD:
        try:
            return vad.is_speech(chunk.tobytes(), sample_rate=16000)
        except Exception as e:
            print('Error occurred while checking VAD.')
            print(e)
            return False

    return False   

def get_mono_audio(raw, frame: Union[frame.Frame, Packet]):
    # Handle stereo interleaved data
    if raw.ndim == 2:
        if raw.shape[1] == frame.samples * 2:
            audio_mono = raw.reshape(-1)[::2]  # De-interleave
        else:
            audio_mono = raw[0]
    else:
        audio_mono = raw
    
    return audio_mono


def upsample_16k_to_48k(pcm_16k: bytes) -> bytes:
    """Convert 16kHz int16 PCM bytes to 48kHz int16 PCM bytes"""
    if not pcm_16k:
        return b''
    # Create AudioSegment from raw 16kHz PCM
    audio = AudioSegment(
        data=pcm_16k,
        sample_width=2,      # 16-bit
        frame_rate=16000,
        channels=1
    )
    # Resample to 48kHz
    audio_48k = audio.set_frame_rate(48000)
    return audio_48k.raw_data



def setup_gcp_cred():
    cred_path = '/tmp/gcp-creds.json'
    gcp_json = os.getenv("GOOGLE_CREDENTIALS_JSON")

    if gcp_json:
        # Write the JSON string to a temporary file
        with open(cred_path, 'w', encoding='utf-8') as f:
            f.write(gcp_json)
        
        # Point the Google SDK to this file for authentication
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path
        print(f"Credentials saved to {cred_path}")
    else:
        print("Warning: GOOGLE_CREDENTIALS_JSON environment variable not found.")

