from typing import Union

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
    
    # scipy resample_poly (what we're using now)
    downsampled = signal.resample_poly(pcm_48k, 1, 3)
    downsampled = np.clip(downsampled, -32768, 32767)
    result = downsampled.astype(np.int16)
    
    return result


