from typing import Union
from av import Packet, frame
import numpy as np
from scipy import signal

class AudioBuffer:
    def __init__(self, max_seconds=10, sample_rate=16000):
        self.sample_rate = sample_rate
        self.max_samples = max_seconds * sample_rate
        self.buffer = np.zeros(0, dtype=np.int16)

    def add(self, samples: np.ndarray):
        if samples.ndim != 1:
            raise ValueError(f"Expected 1D audio, got shape {samples.shape}")
        self.buffer = np.concatenate([self.buffer, samples])
        if len(self.buffer) > self.max_samples:
            self.buffer = self.buffer[-self.max_samples:]

    def clear(self):
        self.buffer = np.zeros(0, dtype=np.int16)

    def get(self):
        return self.buffer


def downsample_48k_to_16k(pcm_48k: np.ndarray) -> np.ndarray:
    """
    Downsample 48kHz to 16kHz using multiple methods to test quality.
    """
    if len(pcm_48k) == 0:
        return np.array([], dtype=np.int16)
    
    # METHOD 1: scipy resample_poly (what we're using now)
    downsampled = signal.resample_poly(pcm_48k, 1, 3)
    downsampled = np.clip(downsampled, -32768, 32767)
    result = downsampled.astype(np.int16)
    
    # Save comparison on first call for debugging
    if not hasattr(downsample_48k_to_16k, '_saved_comparison'):
        try:
            from pathlib import Path
            import wave
            
            debug_dir = Path("audio_debug")
            debug_dir.mkdir(exist_ok=True)
            
            # Save original 48k
            path_48k = debug_dir / "DOWNSAMPLE_TEST_original_48k.wav"
            with wave.open(str(path_48k), 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(48000)
                wf.writeframes(pcm_48k[:48000].tobytes())  # First 1 second
            
            # Save scipy downsampled 16k
            path_16k_scipy = debug_dir / "DOWNSAMPLE_TEST_scipy_16k.wav"
            with wave.open(str(path_16k_scipy), 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(16000)
                wf.writeframes(result[:16000].tobytes())
            
            # Try simple decimation for comparison
            simple_decimate = pcm_48k[::3][:16000]
            path_16k_simple = debug_dir / "DOWNSAMPLE_TEST_simple_16k.wav"
            with wave.open(str(path_16k_simple), 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)
                wf.setframerate(16000)
                wf.writeframes(simple_decimate.tobytes())
            
            print(f"🧪 Saved downsampling comparison files:")
            print(f"   1. {path_48k.name} (original)")
            print(f"   2. {path_16k_scipy.name} (scipy method)")
            print(f"   3. {path_16k_simple.name} (simple decimation)")
            print(f"   👉 Listen to all three and compare!")
            
            downsample_48k_to_16k._saved_comparison = True
        except Exception as e:
            print(f"Warning: Could not save downsampling test: {e}")
    
    return result


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