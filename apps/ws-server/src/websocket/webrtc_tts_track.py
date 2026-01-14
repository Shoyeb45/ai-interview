import asyncio
import time
import numpy as np
from aiortc import MediaStreamTrack
from av import AudioFrame
from fractions import Fraction
from collections import deque
from scipy import signal

class TTSAudioTrack(MediaStreamTrack):
    """
    Custom audio track for sending TTS audio to WebRTC peer connection
    """
    kind = "audio"
    
    def __init__(self):
        super().__init__()
        self.audio_queue = deque()
        
        # Use 48kHz mono - will let WebRTC handle stereo conversion if needed
        self.sample_rate = 48000
        self.channels = 1
        self.samples_per_frame = 960  # 20ms at 48kHz
        self._timestamp = 0
        self._frame_count = 0

        # Track timing to maintain real-time playback
        self._start_time = None
        self._frames_sent = 0
        
        print(f"🎵 TTSAudioTrack initialized: {self.sample_rate}Hz, {self.channels}ch, {self.samples_per_frame} samples/frame")
    
    async def recv(self):
        """
        Called by WebRTC to get the next audio frame (every ~20ms)
        """

        # 1. Handle Timing/Pacing
        if self._start_time is None:
            self._start_time = time.time()
            
        # Calculate when the NEXT frame should be sent
        # (frames_sent * 0.020 seconds)
        next_frame_time = self._start_time + (self._frames_sent * 0.020)
        now = time.time()

        # Wait until it's actually time to send this frame
        wait_time = next_frame_time - now
        if wait_time > 0:
            await asyncio.sleep(wait_time)
        
        # 2. Get samples from the queue
        num_samples = self.samples_per_frame
        samples = np.zeros(num_samples, dtype=np.int16)
        
        # Efficiently pull from deque
        available = len(self.audio_queue)
        actual_to_pull = min(available, num_samples)
        
        for i in range(actual_to_pull):
            samples[i] = self.audio_queue.popleft()
        
        # 3. Create the AudioFrame
        # Reshape to (channels, samples)
        samples_2d = samples.reshape(1, -1)
        frame = AudioFrame.from_ndarray(samples_2d, format='s16', layout='mono')
        frame.sample_rate = self.sample_rate
        
        # Set Presentation Timestamp (PTS)
        frame.pts = self._timestamp
        frame.time_base = Fraction(1, self.sample_rate)
        
        # Increment for next call
        self._timestamp += num_samples
        self._frames_sent += 1
        
        return frame
    
        # # Get audio data from queue or silence
        # if len(self.audio_queue) >= self.samples_per_frame:
        #     samples = np.array([self.audio_queue.popleft() for _ in range(self.samples_per_frame)], dtype=np.int16)
        # else:
        #     # Drain remaining samples and pad with silence
        #     remaining_samples = []
        #     while len(self.audio_queue) > 0:
        #         remaining_samples.append(self.audio_queue.popleft())
            
        #     if len(remaining_samples) > 0:
        #         padding = np.zeros(self.samples_per_frame - len(remaining_samples), dtype=np.int16)
        #         samples = np.concatenate([np.array(remaining_samples, dtype=np.int16), padding])
        #     else:
        #         samples = np.zeros(self.samples_per_frame, dtype=np.int16)
        
        # # Ensure samples is 1D array
        # samples = samples.flatten()
        
        # # Reshape to (1, samples) for mono
        # samples_2d = samples.reshape(1, -1)
        
        # # Create audio frame with explicit format
        # frame = AudioFrame.from_ndarray(
        #     samples_2d,
        #     format='s16',
        #     layout='mono'
        # )
        
        # frame.sample_rate = self.sample_rate
        # frame.pts = self._timestamp
        # frame.time_base = Fraction(1, self.sample_rate)
        
        # # Update timestamp
        # self._timestamp += self.samples_per_frame
        # self._frame_count += 1
        
        # # Periodic logging
        # if self._frame_count % 50 == 0:
        #     queue_duration = len(self.audio_queue) / self.sample_rate
        #     print(f"📤 Frame {self._frame_count}: Queue={len(self.audio_queue)} samples ({queue_duration:.2f}s)")
        
        # await asyncio.sleep(0.001)
        
        # return frame
    
    def add_audio(self, audio_data: bytes):
        """
        Add PCM audio data (16kHz mono) - will be resampled to 48kHz
        """
        if not audio_data:
            print("⚠️  Empty audio data")
            return
        
        # Convert to int16 array
        audio_16k = np.frombuffer(audio_data, dtype=np.int16)
        
        # Resample to 48kHz
        audio_48k = self._resample_16k_to_48k(audio_16k)
        
        # Add to queue
        for sample in audio_48k:
            self.audio_queue.append(sample)
        
        duration = len(audio_48k) / self.sample_rate
        print(f"🎵 Added {len(audio_16k)}@16kHz -> {len(audio_48k)}@48kHz ({duration:.2f}s)")
        print(f"   Queue: {len(self.audio_queue)} samples ({len(self.audio_queue)/self.sample_rate:.2f}s)")
    
    def _resample_16k_to_48k(self, audio_16k: np.ndarray) -> np.ndarray:
        """Resample using scipy"""
        audio_float = audio_16k.astype(np.float32)
        num_samples = int(len(audio_16k) * 3)
        audio_resampled = signal.resample(audio_float, num_samples)
        audio_resampled = np.clip(audio_resampled, -32768, 32767)
        return audio_resampled.astype(np.int16)
    
    def add_silence(self, duration_ms: int):
        """Add silence"""
        num_samples = int(self.sample_rate * duration_ms / 1000)
        for _ in range(num_samples):
            self.audio_queue.append(0)
        print(f"🔇 Added {duration_ms}ms silence ({num_samples} samples)")
    
    def get_queue_size(self):
        return len(self.audio_queue)
    
    def get_queue_duration(self):
        return len(self.audio_queue) / self.sample_rate
    
    def clear_queue(self):
        self.audio_queue.clear()
        print("🗑️  Queue cleared")
    
    def is_empty(self):
        return len(self.audio_queue) == 0