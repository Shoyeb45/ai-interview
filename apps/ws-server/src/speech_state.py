from src.websocket.audio_bufffer import AudioBuffer

class SpeechState:
    def __init__(self):
        self.audio_buffer = AudioBuffer()
        self.speech_buffer = []
        self.speech_frame_count = 0
        self.total_speech_frames = 0
        self.silence_frames = 0
        self.is_speaking = False

        # Add conversation tracking: Later move to redis
        self.conversation_history = []
        self.interview_started = False
        self.current_question_count = 0

    def reset(self):
        self.audio_buffer.clear()
        self.speech_buffer = []
        self.speech_frame_count = 0
        self.total_speech_frames = 0
        self.silence_frames = 0
        self.is_speaking = False


    def add_message(self, role: str, content: str, timestamp: float = None):
        """Add message to conversation history with optional timestamp."""
        import time
        ts = timestamp or time.time()
        self.conversation_history.append({
            "role": role,  # "user" or "assistant"
            "content": content,
            "timestamp": ts,
        })