from src.audio_bufffer import AudioBuffer

class SpeechState:
    def __init__(self):
        self.audio_buffer = AudioBuffer()
        self.speech_buffer = []
        self.speech_frame_count = 0
        self.total_speech_frames = 0
        self.silence_frames = 0
        self.is_speaking = False

    def reset(self):
        self.audio_buffer.clear()
        self.speech_buffer = []
        self.speech_frame_count = 0
        self.total_speech_frames = 0
        self.silence_frames = 0
        self.is_speaking = False
