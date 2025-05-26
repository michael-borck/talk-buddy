"""
Browser Web Speech API provider for Speech-to-Text
"""
from typing import Optional
from ..base import STTProvider, AudioData, TranscriptionResult

class BrowserSTTProvider(STTProvider):
    """
    Browser-based Speech-to-Text using Web Speech API
    This provider handles client-side speech recognition
    """
    
    def __init__(self):
        self._name = "Browser Web Speech API"
    
    async def transcribe(self, audio_data: AudioData) -> TranscriptionResult:
        """
        Note: Browser STT is handled client-side with JavaScript
        This method is not directly called but maintains interface consistency
        """
        raise NotImplementedError(
            "Browser STT is handled client-side. Use JavaScript WebSocket communication."
        )
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def is_available(self) -> bool:
        """Browser STT is always available (handled client-side)"""
        return True
    
    def get_client_config(self) -> dict:
        """Configuration for client-side setup"""
        return {
            "provider": "browser",
            "continuous": True,
            "interim_results": True,
            "language": "en-US"
        }