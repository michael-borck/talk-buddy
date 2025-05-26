"""
Browser SpeechSynthesis API provider for Text-to-Speech
"""
from typing import Optional
from ..base import TTSProvider, AudioData

class BrowserTTSProvider(TTSProvider):
    """
    Browser-based Text-to-Speech using SpeechSynthesis API
    This provider handles client-side speech synthesis
    """
    
    def __init__(self):
        self._name = "Browser SpeechSynthesis API"
    
    async def synthesize(
        self, 
        text: str, 
        voice: Optional[str] = None,
        **kwargs
    ) -> AudioData:
        """
        Note: Browser TTS is handled client-side with JavaScript
        This method is not directly called but maintains interface consistency
        """
        raise NotImplementedError(
            "Browser TTS is handled client-side. Use JavaScript WebSocket communication."
        )
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def is_available(self) -> bool:
        """Browser TTS is always available (handled client-side)"""
        return True
    
    def get_client_config(self) -> dict:
        """Configuration for client-side setup"""
        return {
            "provider": "browser",
            "rate": 1.0,
            "pitch": 1.0,
            "volume": 1.0,
            "voice": voice or "default"
        }