"""
TalkBuddy Configuration Settings
"""
import os
from dataclasses import dataclass
from typing import Optional

@dataclass
class DatabaseConfig:
    """Database configuration"""
    db_path: str = "talkbuddy.db"
    
@dataclass
class AuthConfig:
    """Authentication configuration"""
    session_secret: str = os.getenv("SESSION_SECRET", "talkbuddy-secret-key-change-in-production")
    session_timeout_hours: int = 24
    guest_session_enabled: bool = True
    
@dataclass
class ProviderConfig:
    """AI Provider configuration"""
    # Default free providers
    use_browser_speech: bool = True
    use_huggingface: bool = True
    huggingface_api_url: str = "https://api-inference.huggingface.co/models/"
    huggingface_model: str = "microsoft/DialoGPT-medium"
    
    # Optional commercial providers
    openai_api_key: Optional[str] = os.getenv("OPENAI_API_KEY")
    elevenlabs_api_key: Optional[str] = os.getenv("ELEVENLABS_API_KEY")
    
    # Ollama local setup
    ollama_enabled: bool = False
    ollama_base_url: str = "http://localhost:11434"
    ollama_model: str = "llama2"

@dataclass
class ConversationConfig:
    """Conversation settings"""
    max_session_duration_minutes: int = 60
    max_turns_per_session: int = 50
    auto_save_interval_seconds: int = 30
    push_to_talk_timeout_seconds: int = 10
    
@dataclass
class RateLimitConfig:
    """Rate limiting for abuse prevention"""
    max_sessions_per_day: int = 20
    max_sessions_per_hour: int = 5
    max_conversation_length_minutes: int = 120

@dataclass
class AppSettings:
    """Main application settings"""
    app_name: str = "TalkBuddy"
    version: str = "1.0.0"
    debug: bool = os.getenv("DEBUG", "False").lower() == "true"
    
    # Sub-configurations
    database: DatabaseConfig = DatabaseConfig()
    auth: AuthConfig = AuthConfig()
    providers: ProviderConfig = ProviderConfig()
    conversation: ConversationConfig = ConversationConfig()
    rate_limits: RateLimitConfig = RateLimitConfig()

# Global settings instance
settings = AppSettings()