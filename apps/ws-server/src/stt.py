from faster_whisper import WhisperModel
import numpy as np
from src.constant import ENERGY_THRESHOLD
from webrtcvad import Vad

model = WhisperModel('small.en', device='cpu', compute_type='int8')

def transcribe_audio(speech: np.ndarray) -> str:
    """
    Transcribe int16 PCM audio at 16kHz to text.
    """
    if len(speech) == 0:
        return ""
    
    # Convert int16 to float32 [-1, 1]
    audio_float = speech.astype(np.float32) / 32768.0
    
    # Calculate RMS (root mean square) to check audio level
    rms = np.sqrt(np.mean(audio_float ** 2))
    peak = np.abs(audio_float).max()
    
    print(f"[STT] Audio stats: RMS={rms:.4f}, Peak={peak:.4f}, Duration={len(speech)/16000:.2f}s")
    
    # If audio is too quiet, apply gain boost
    if rms < 0.01:
        print(f"[STT] ⚠️  Audio too quiet (RMS: {rms:.4f}), applying 2x gain")
        audio_float = np.clip(audio_float * 2.0, -1.0, 1.0)
        rms = np.sqrt(np.mean(audio_float ** 2))
        print(f"[STT] After gain: RMS={rms:.4f}")
    
    # If still too quiet, there might be a problem with the audio pipeline
    if rms < 0.005:
        print(f"[STT] ❌ Audio extremely quiet even after gain. Check microphone/audio source!")
    
    try:
        segments, info = model.transcribe(
            audio_float,
            beam_size=5,
            language="en",
            vad_filter=False,
            temperature=0.0,
            without_timestamps=True,
            best_of=1,
            condition_on_previous_text=False,
            compression_ratio_threshold=2.4,
            log_prob_threshold=-1.0,
            no_speech_threshold=0.6
        )
        
        text = " ".join(seg.text for seg in segments).strip()
        
        # Debug logging
        if not text:
            print(f"[STT] ⚠️  Empty result. Language: {info.language}, prob: {info.language_probability:.2f}")
            print(f"[STT] This usually means:")
            print(f"      1. Audio too quiet (check RMS above)")
            print(f"      2. Audio quality too poor (check downsampling)")
            print(f"      3. No actual speech in the audio")
        else:
            print(f"[STT] ✅ Transcribed: \"{text}\"")
        
        return text
        
    except Exception as e:
        print(f"[STT] ❌ Transcription error: {e}")
        import traceback
        traceback.print_exc()
        return ""
    

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