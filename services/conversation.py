"""
Conversation service for managing AI-powered conversations
"""
import json
import sqlite3
import asyncio
from datetime import datetime
from typing import Optional, Dict, Any, List
from dataclasses import asdict

from providers.base import ConversationMessage, ProviderStatus
from providers.free.huggingface import HuggingFaceLLMProvider
from providers.free.browser_stt import BrowserSTTProvider
from providers.free.browser_tts import BrowserTTSProvider
from config.settings import settings

class ConversationService:
    """Service for managing conversation sessions"""
    
    def __init__(self):
        self.active_sessions: Dict[str, 'ConversationSession'] = {}
        self.llm_provider = HuggingFaceLLMProvider()
        self.stt_provider = BrowserSTTProvider()
        self.tts_provider = BrowserTTSProvider()
    
    def create_session(self, scenario_id: int, user_id: Optional[int] = None) -> 'ConversationSession':
        """Create a new conversation session"""
        session = ConversationSession(
            scenario_id=scenario_id,
            user_id=user_id,
            llm_provider=self.llm_provider
        )
        
        self.active_sessions[session.session_id] = session
        return session
    
    def get_session(self, session_id: str) -> Optional['ConversationSession']:
        """Get an active session by ID"""
        return self.active_sessions.get(session_id)
    
    def end_session(self, session_id: str) -> bool:
        """End and save a conversation session"""
        session = self.active_sessions.get(session_id)
        if session:
            session.end_session()
            del self.active_sessions[session_id]
            return True
        return False
    
    def get_provider_status(self) -> ProviderStatus:
        """Get current provider availability status"""
        return ProviderStatus(
            stt_provider=self.stt_provider.name,
            llm_provider=self.llm_provider.name,
            tts_provider=self.tts_provider.name,
            all_available=(
                self.stt_provider.is_available and 
                self.llm_provider.is_available and 
                self.tts_provider.is_available
            )
        )

class ConversationSession:
    """Individual conversation session"""
    
    def __init__(self, scenario_id: int, user_id: Optional[int], llm_provider):
        self.session_id = f"session_{datetime.now().timestamp()}"
        self.scenario_id = scenario_id
        self.user_id = user_id
        self.llm_provider = llm_provider
        
        self.messages: List[ConversationMessage] = []
        self.start_time = datetime.now()
        self.end_time: Optional[datetime] = None
        self.turn_count = 0
        
        # Load scenario details
        self.scenario = self._load_scenario()
        
        # Start with AI greeting
        self._add_initial_message()
    
    def _load_scenario(self) -> Dict[str, Any]:
        """Load scenario details from database"""
        conn = sqlite3.connect(settings.database.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT name, description, persona_prompt, context_prompt, sample_questions
            FROM scenarios WHERE id = ?
        ''', (self.scenario_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'name': result[0],
                'description': result[1],
                'persona_prompt': result[2],
                'context_prompt': result[3],
                'sample_questions': json.loads(result[4]) if result[4] else []
            }
        else:
            # Fallback scenario
            return {
                'name': 'General Interview',
                'description': 'General interview practice',
                'persona_prompt': 'You are a helpful interviewer conducting a practice interview.',
                'context_prompt': 'This is a practice interview session.',
                'sample_questions': ['Tell me about yourself.']
            }
    
    def _add_initial_message(self):
        """Add AI's initial greeting message"""
        greeting = self._generate_greeting()
        self.messages.append(ConversationMessage(
            role='assistant',
            content=greeting,
            timestamp=datetime.now().isoformat()
        ))
    
    def _generate_greeting(self) -> str:
        """Generate contextual greeting based on scenario"""
        scenario_name = self.scenario.get('name', 'interview')
        
        if 'technical' in scenario_name.lower():
            return f"Hi! I'm ready to conduct your {scenario_name.lower()} today. Let's start with an introduction - could you tell me a bit about your background and experience?"
        elif 'academic' in scenario_name.lower() or 'graduate' in scenario_name.lower():
            return f"Welcome to your {scenario_name.lower()}! I'm excited to learn about your academic interests and goals. Let's begin - what drew you to this field of study?"
        else:
            return f"Hello! I'll be conducting your {scenario_name.lower()} today. Let's start by having you introduce yourself and tell me what interests you about this opportunity."
    
    async def process_user_message(self, content: str) -> AsyncIterable[str]:
        """Process user message and generate AI response"""
        # Add user message
        user_message = ConversationMessage(
            role='user',
            content=content,
            timestamp=datetime.now().isoformat()
        )
        self.messages.append(user_message)
        self.turn_count += 1
        
        # Generate AI response
        system_prompt = self._build_system_prompt()
        
        response_content = ""
        async for chunk in self.llm_provider.generate_response(
            messages=self.messages,
            system_prompt=system_prompt
        ):
            response_content += chunk
            yield chunk
        
        # Add AI response to conversation
        ai_message = ConversationMessage(
            role='assistant',
            content=response_content,
            timestamp=datetime.now().isoformat()
        )
        self.messages.append(ai_message)
    
    def _build_system_prompt(self) -> str:
        """Build system prompt from scenario"""
        prompt = f"{self.scenario['persona_prompt']}\n\n"
        prompt += f"Context: {self.scenario['context_prompt']}\n\n"
        prompt += "Guidelines:\n"
        prompt += "- Ask one question at a time\n"
        prompt += "- Keep responses conversational and encouraging\n"
        prompt += "- Provide helpful feedback when appropriate\n"
        prompt += "- Stay in character as the interviewer\n"
        prompt += "- Keep responses concise (2-3 sentences max)\n"
        
        return prompt
    
    def get_session_info(self) -> Dict[str, Any]:
        """Get current session information"""
        duration = (datetime.now() - self.start_time).total_seconds()
        
        return {
            'session_id': self.session_id,
            'scenario_name': self.scenario['name'],
            'duration': int(duration),
            'turn_count': self.turn_count,
            'message_count': len(self.messages),
            'start_time': self.start_time.isoformat()
        }
    
    def end_session(self):
        """End the session and save to database"""
        self.end_time = datetime.now()
        duration = (self.end_time - self.start_time).total_seconds()
        
        # Save to database
        conn = sqlite3.connect(settings.database.db_path)
        cursor = conn.cursor()
        
        transcript = json.dumps([asdict(msg) for msg in self.messages])
        
        cursor.execute('''
            INSERT INTO conversation_sessions (
                user_id, scenario_id, transcript, duration, turn_count,
                question_count, status, completed_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            self.user_id,
            self.scenario_id,
            transcript,
            int(duration),
            self.turn_count,
            len([m for m in self.messages if m.role == 'assistant']),
            'completed',
            self.end_time.isoformat()
        ))
        
        conn.commit()
        conn.close()

# Global conversation service instance
conversation_service = ConversationService()