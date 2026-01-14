import asyncio
import io
import numpy as np
from google.cloud import texttospeech
from pydub import AudioSegment

class TTSService:
    """Google Cloud Text-to-Speech service"""
    
    def __init__(self):
        self.client = texttospeech.TextToSpeechClient()
        
        # Voice configuration
        self.voice = texttospeech.VoiceSelectionParams(
            language_code="en-US",
            name="en-US-Neural2-D",  # Male, calm interviewer voice
            # Other good options:
            # "en-US-Neural2-A" - Male, more energetic
            # "en-US-Neural2-C" - Female, professional
            # "en-US-Neural2-F" - Female, warm
        )
        
        # Audio configuration - use LINEAR16 for better quality and easier processing
        self.audio_config = texttospeech.AudioConfig(
            audio_encoding=texttospeech.AudioEncoding.LINEAR16,
            sample_rate_hertz=16000,  # 16kHz for WebRTC compatibility
            speaking_rate=1.0,  # Normal speed (0.25 to 4.0)
            pitch=0.0,  # Normal pitch (-20.0 to 20.0)
        )
    
    async def synthesize_speech(self, text: str) -> bytes:
        """
        Convert text to speech audio
        
        Returns:
            bytes: Raw PCM audio data (16-bit, 16kHz, mono)
        """
        if not text:
            return b''
        
        # Run synthesis in thread pool (blocking operation)
        return await asyncio.to_thread(self._synthesize_blocking, text)
    
    def _synthesize_blocking(self, text: str) -> bytes:
        """Blocking synthesis call"""
        try:
            synthesis_input = texttospeech.SynthesisInput(text=text)
            
            response = self.client.synthesize_speech(
                input=synthesis_input,
                voice=self.voice,
                audio_config=self.audio_config
            )
            
            print(f"🔊 Generated TTS audio: {len(response.audio_content)} bytes")
            return response.audio_content
            
        except Exception as e:
            print(f"❌ TTS Error: {e}")
            return b''
    
    async def text_to_pcm_chunks(self, text: str, chunk_duration_ms: int = 20) -> list:
        """
        Convert text to PCM audio chunks for streaming
        
        Args:
            text: Text to synthesize
            chunk_duration_ms: Size of each chunk in milliseconds (default 20ms for WebRTC)
            
        Returns:
            list of numpy arrays (int16 PCM chunks)
        """
        audio_data = await self.synthesize_speech(text)
        
        if not audio_data:
            return []
        
        # Convert bytes to numpy array (16-bit PCM)
        audio_array = np.frombuffer(audio_data, dtype=np.int16)
        
        # Calculate chunk size in samples
        sample_rate = 16000
        chunk_size = int(sample_rate * chunk_duration_ms / 1000)
        
        # Split into chunks
        chunks = []
        for i in range(0, len(audio_array), chunk_size):
            chunk = audio_array[i:i + chunk_size]
            
            # Pad last chunk if needed
            if len(chunk) < chunk_size:
                chunk = np.pad(chunk, (0, chunk_size - len(chunk)), mode='constant')
            
            chunks.append(chunk)
        
        print(f"🎵 Created {len(chunks)} audio chunks ({chunk_duration_ms}ms each)")
        return chunks



# Global TTS instance
tts_service = TTSService()



async def generate_and_send_tts(text: str) -> bytes:
    """
    Helper function to generate TTS audio
    
    Returns:
        bytes: Raw PCM audio data
    """
    
    return await tts_service.synthesize_speech(text)