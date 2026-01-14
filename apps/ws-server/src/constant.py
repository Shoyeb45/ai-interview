# FIXED THRESHOLDS for natural conversation

ENERGY_THRESHOLD = 150
FRAME_SIZE = 320  # 20ms at 16kHz
MIN_SPEECH_FRAMES = 3  # Quick detection (60ms)
MIN_SPEECH_DURATION = 3  # Start recording after 60ms
SILENCE_THRESHOLD = 35  # Increased to 700ms of silence before cutting
MAX_SPEECH_DURATION = 5000  # 6 seconds max before forcing transcription

AUDIO_FREQ = 16_000