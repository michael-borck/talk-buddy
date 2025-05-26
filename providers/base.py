"""
Base provider interfaces for TalkBuddy
"""
from abc import ABC, abstractmethod
from typing import AsyncIterator, Optional, Dict, Any
from dataclasses import dataclass

@dataclass
class AudioData:
    """Audio data container"""
    data: bytes
    sample_rate: int = 16000
    channels: int = 1
    format: str = "wav"

@dataclass
class TranscriptionResult:
    """Speech-to-text result"""
    text: str
    confidence: float = 0.0
    language: Optional[str] = None

@dataclass
class ConversationMessage:
    """Conversation message"""
    role: str  # 'user' or 'assistant'
    content: str
    timestamp: Optional[str] = None

class STTProvider(ABC):
    """Abstract Speech-to-Text provider"""
    
    @abstractmethod
    async def transcribe(self, audio_data: AudioData) -> TranscriptionResult:
        """Transcribe audio to text"""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name"""
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available"""
        pass

class LLMProvider(ABC):
    """Abstract Language Model provider"""
    
    @abstractmethod
    async def generate_response(
        self, 
        messages: list[ConversationMessage],
        system_prompt: Optional[str] = None,
        **kwargs
    ) -> AsyncIterator[str]:
        """Generate streaming response"""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name"""
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available"""
        pass

class TTSProvider(ABC):
    """Abstract Text-to-Speech provider"""
    
    @abstractmethod
    async def synthesize(
        self, 
        text: str, 
        voice: Optional[str] = None,
        **kwargs
    ) -> AudioData:
        """Synthesize text to speech"""
        pass
    
    @property
    @abstractmethod
    def name(self) -> str:
        """Provider name"""
        pass
    
    @property
    @abstractmethod
    def is_available(self) -> bool:
        """Check if provider is available"""
        pass

@dataclass
class ProviderStatus:
    """Provider availability status"""
    stt_provider: str
    llm_provider: str
    tts_provider: str
    all_available: bool