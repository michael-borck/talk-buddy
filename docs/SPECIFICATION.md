# TalkBuddy - Project Specification
> *"Your AI Talking Partner. Master English. Ace Your Interviews."*

## Project Overview
Build TalkBuddy, a real-time voice conversation practice platform designed for dual purposes: English language learning and professional interview preparation. Students can engage in natural conversations with AI personas across various scenarios. The app uses WebSocket streaming for seamless conversation flow and follows a Pure BYOAPI model where users provide their own API keys.

## Core Features

### Real-Time Voice Conversation (MVP Approach)
- **Push-to-Talk Interface**: User-controlled "Start Talking" / "Stop Talking" buttons
- WebSocket-based audio transmission for complete audio segments
- Simple turn-taking: User speaks → AI processes and responds → User speaks again
- Live audio visualization during recording and AI response playback

### Dual-Purpose Platform
**English Language Learning:**
- Casual conversation practice for everyday situations
- Academic English for university settings
- Business English for professional contexts
- Basic vocabulary and confidence building through natural dialogue

**Professional Interview Preparation:**
- Job interview simulations across industries
- Client consultation practice for professionals
- Patient interaction training for healthcare students
- Communication skill development

### Session Management (Simplified MVP)
- Multiple conversation scenarios with different AI personas
- Complete session recording with full transcripts
- **Simple AI-generated feedback** at session end based on full conversation
- Basic session history and progress tracking

## Technology Stack

### Core Framework
- **FastHTML**: Web framework, UI rendering, and WebSocket handling
- **SQLite**: Database via fastlite
- **Python 3.9+**: Backend language

### AI Services (Flexible Provider Selection)

**Provider Options (User Choice):**
- **Browser APIs**: Web Speech API (STT) + SpeechSynthesis API (TTS) - Always available
- **OpenAI API**: Whisper (STT) + GPT-4 (LLM) + TTS - User-provided API key
- **ElevenLabs API**: Premium quality TTS - User-provided API key
- **Hugging Face API**: Free tier LLM - Optional API key or anonymous usage

**Mix-and-Match Support:**
- Users can combine any STT + LLM + TTS providers
- Automatic fallbacks when API services fail or reach limits
- Provider preferences saved per user
- No service tiers - all features available regardless of provider choice

### Frontend
- **Minimal JavaScript**: Audio capture, WebSocket communication, audio playback
- **PicoCSS**: Lightweight styling framework
- **Web Audio API**: Browser audio processing

## Architecture Design

### Project Structure
```
talkbuddy/
├── main.py                  # FastHTML app entry point
├── config/
│   ├── settings.py          # App configuration
│   └── providers.py         # Provider configurations
├── providers/               # Pluggable provider architecture
│   ├── asr/
│   │   ├── base.py          # Abstract base class
│   │   └── openai_whisper.py # OpenAI Whisper implementation
│   ├── llm/
│   │   ├── base.py          # Abstract base class
│   │   └── openai_gpt.py    # OpenAI GPT-4 implementation
│   └── tts/
│       ├── base.py          # Abstract base class
│       ├── openai_tts.py    # OpenAI TTS implementation
│       └── elevenlabs.py    # ElevenLabs implementation
├── services/
│   ├── conversation.py      # Conversation orchestration service
│   ├── auth.py              # Authentication service
│   └── user_keys.py         # API key management
├── models/
│   ├── user.py              # User data model
│   ├── session.py           # Conversation session model
│   └── scenario.py          # Conversation scenario model
├── websockets/
│   └── conversation.py      # WebSocket handler for real-time audio
├── views/
│   ├── auth.py              # Login/register pages
│   ├── dashboard.py         # User dashboard
│   ├── conversation.py      # Conversation interface
│   └── settings.py          # User settings/API keys
├── static/
│   ├── css/                 # Custom styles
│   ├── js/
│   │   └── conversation.js  # Client-side audio handling
│   └── audio/               # Audio assets
├── templates/
│   ├── scenarios/           # Conversation scenario definitions
│   └── personas/            # AI conversation partner personas
└── requirements.txt
```

### Provider Architecture
- **Abstract base classes** for ASR, LLM, and TTS providers
- **Factory pattern** for provider instantiation
- **Pluggable design** allowing easy addition of new providers
- **MVP implementation** with OpenAI + ElevenLabs providers

### WebSocket Flow (Simplified for MVP)
1. User selects conversation type (English practice or interview prep)
2. User clicks "Start Talking" button to begin recording
3. Client JavaScript records complete audio segment while button is held/active
4. User clicks "Stop Talking" - complete audio segment sent via WebSocket to server
5. Server processes complete audio: Audio → STT → LLM (with persona) → TTS → Audio
6. Server sends back complete AI response audio via WebSocket
7. Client plays AI conversation partner's full response
8. Process repeats with clear turn-taking until user ends session
9. Session automatically saves with transcript and simple AI-generated feedback

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

### User API Keys Table (Updated for Flexible Providers)
```sql
CREATE TABLE user_api_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL,  -- 'openai', 'elevenlabs', 'huggingface'
    api_key_encrypted TEXT,  -- NULL for browser APIs or anonymous usage
    is_valid BOOLEAN DEFAULT NULL,
    is_preferred BOOLEAN DEFAULT FALSE,  -- User's preferred provider for this service type
    service_type TEXT NOT NULL,  -- 'stt', 'llm', 'tts'
    last_validated TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
);
```

### Conversation Sessions Table (Simplified MVP)
```sql
CREATE TABLE conversation_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scenario_id INTEGER NOT NULL,
    session_type TEXT NOT NULL,  -- 'english_practice', 'interview_prep'
    transcript TEXT,
    feedback TEXT,  -- Simple AI-generated session summary
    duration INTEGER,  -- seconds
    turn_count INTEGER,  -- number of back-and-forth exchanges
    status TEXT DEFAULT 'active',  -- 'active', 'completed', 'cancelled'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (scenario_id) REFERENCES scenarios (id)
);
```

### Scenarios Table (Simplified MVP)
```sql
CREATE TABLE scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,  -- 'english_casual', 'english_academic', 'english_business', 'interview_tech', 'interview_general', 'interview_healthcare'
    session_type TEXT NOT NULL,  -- 'english_practice', 'interview_prep'
    persona_prompt TEXT,  -- AI conversation partner personality and instructions
    context_prompt TEXT,  -- Conversation context and guidelines
    sample_topics TEXT,  -- JSON array of conversation starters
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## Security & Abuse Prevention

### Authentication
- Email/password with bcrypt hashing
- Email verification required before API key entry
- Simple session management

### Registration Protection (Simplified)
- Basic email validation and verification
- Simple registration throttling (max 3 accounts per IP per day)
- **Session limits**: Maximum 1 concurrent conversation, 2-hour auto-timeout
- **Daily limits**: Maximum 10 conversation sessions per day per user

### Session Protection (Simplified)
- Maximum 1 concurrent conversation session per user
- Auto-disconnect sessions after 2 hours of inactivity
- Maximum 10 conversation sessions per day per user
- **No real-time rate limiting needed** - user controls audio input timing

### API Key Security
- Encrypt API keys in database using Fernet symmetric encryption
- Validate API keys on first use with test requests
- Clear error messages for invalid/expired keys
- Never log or expose API keys in responses

## Core Functionality

### User Registration & Setup (Free Service with Provider Choice)
1. User registers with email/password (for abuse prevention only)
2. Email verification required before accessing conversation features
3. **Default setup**: Browser APIs enabled by default (no configuration needed)
4. **Optional enhancement**: Users can add API keys for preferred providers
5. **Provider selection**: Users choose preferred STT, LLM, and TTS providers
6. System validates API keys when provided and tests fallback chains
7. **Flexible configuration**: Save provider preferences and fallback order

### Conversation Flow (Multi-Provider Support)
1. User selects conversation type and scenario from dashboard
2. **Active providers displayed**: Shows current STT → LLM → TTS chain
3. WebSocket connection established with user's configured providers
4. **User clicks "Start Talking"** - recording begins with visual feedback
5. **User speaks, then clicks "Stop Talking"** - audio processed by selected providers
6. Server processes audio using user's preferred provider chain with automatic fallbacks
7. Client receives and plays AI response using configured TTS provider
8. **Provider status indicators** show which services are active/failed
9. Process repeats with fallback handling if any provider fails
10. Session saved with provider usage information for reliability tracking

### Provider Integration (Flexible Multi-Provider)
- **STT Pipeline**: 
  - Browser: Audio → Web Speech API → Text (always available)
  - OpenAI: Audio → Base64 → Whisper API → Text (if API key provided)
- **LLM Pipeline**: 
  - Hugging Face: Text + Context → HF Inference API → Response (free tier)
  - OpenAI: Text + Context → GPT-4 → Response (if API key provided)
- **TTS Pipeline**: 
  - Browser: Response → SpeechSynthesis API → Direct browser audio (always available)
  - OpenAI: Response → OpenAI TTS → Audio (if API key provided)
  - ElevenLabs: Response → ElevenLabs → Audio (if API key provided)
- **Fallback Handling**: Automatic provider switching when services fail or reach limits

## Conversation Scenarios (MVP)

### English Practice Scenarios

#### Casual Conversation (Beginner-Friendly)
- **Persona**: Friendly native English speaker, patient and encouraging
- **Topics**: Introductions, hobbies, weather, daily routines, food preferences
- **Approach**: Simple vocabulary, shorter responses, encouraging feedback
- **Sample Starters**: "Hi! What's your favorite food?", "Tell me about your hobbies"

#### Academic English (Intermediate)
- **Persona**: University student or teaching assistant, supportive but academic
- **Topics**: Classroom discussions, study habits, university life, academic interests
- **Approach**: Academic vocabulary, structured conversations, educational focus
- **Sample Starters**: "What's your major?", "How do you prefer to study?"

#### Business English (Professional)
- **Persona**: Professional colleague, business-focused but friendly
- **Topics**: Work projects, meetings, networking, professional development
- **Approach**: Professional communication, workplace vocabulary, career discussions
- **Sample Starters**: "Tell me about your current project", "What are your career goals?"

### Interview Preparation Scenarios

#### Software Engineering Interviews
- **Persona**: Senior software engineer, technical but approachable
- **Focus**: Technical experience, problem-solving approach, coding discussions
- **Sample Questions**: "Walk me through a challenging project", "How do you approach debugging?"

#### General Business Interviews
- **Persona**: HR manager or team lead, professional and encouraging
- **Focus**: Behavioral questions, teamwork, communication skills, cultural fit
- **Sample Questions**: "Tell me about yourself", "Describe a time you overcame a challenge"

#### Healthcare/Client-Facing Roles
- **Persona**: Healthcare professional or client services manager
- **Focus**: Communication skills, empathy, handling difficult situations
- **Sample Questions**: "How would you handle an upset patient?", "Describe your communication style"

## Client-Side Audio Handling

### WebSocket Communication (Multi-Provider)
```javascript
// Enhanced message types supporting flexible provider combinations:
{type: 'audio_complete', data: 'base64_audio', provider: 'browser|openai'}  // User → Server
{type: 'transcript_direct', text: 'text', provider: 'browser'}              // User → Server (browser STT)
{type: 'transcript', text: 'transcribed_text', provider: 'openai|browser'}  // Server → User  
{type: 'ai_response', text: 'ai_response', provider: 'openai|huggingface'}  // Server → User
{type: 'ai_audio_complete', data: 'base64_audio', provider: 'openai|elevenlabs'} // Server → User
{type: 'ai_speak_browser', text: 'text'}                                    // Server → User (browser TTS)
{type: 'processing', status: 'transcribing|thinking|speaking', provider: 'string'} // Server → User
{type: 'provider_status', stt: 'browser', llm: 'openai', tts: 'browser'}   // Server → User (active providers)
{type: 'fallback_activated', from: 'openai', to: 'browser', service: 'stt'} // Server → User
{type: 'error', message: 'error_description', provider: 'string'}           // Server → User
{type: 'session_end', feedback: 'simple_feedback'}                          // Server → User
```

## Environment Configuration

### Required Environment Variables
```
# Database
DATABASE_URL=sqlite:///voice_interview.db

# Security
SECRET_KEY=your-secret-key-for-sessions
ENCRYPTION_KEY=your-fernet-encryption-key

# Email (for verification)
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# Optional: CAPTCHA
HCAPTCHA_SITE_KEY=your-hcaptcha-site-key
HCAPTCHA_SECRET_KEY=your-hcaptcha-secret-key
```

## Development Priorities

### Phase 1: Core MVP (Week 1-2)
1. Basic FastHTML app structure with simple authentication
2. User API key management with encryption and validation
3. **Push-to-talk conversation interface** with clear audio recording/playback
4. **Simple WebSocket pipeline**: complete audio → STT → LLM → TTS → complete audio response
5. Basic conversation scenarios (one English, one interview) with clear personas
6. Session recording with transcript and simple AI feedback

### Phase 2: Enhanced Scenarios (Week 3)
7. Multiple conversation scenarios across English learning and interview prep
8. Improved conversation interface with better visual feedback
9. Session history with basic conversation metrics
10. **Simple AI feedback generation** based on complete session transcripts
11. Error handling and graceful fallbacks for API issues

### Phase 3: Polish & Deploy (Week 4)
12. **Optional future enhancements** planning (silence detection, adaptive conversation)
13. Performance optimization for faster audio processing
14. Security review and deployment preparation
15. User documentation and onboarding flow
16. **Foundation for advanced features**: infrastructure ready for real-time streaming, fluency scoring, etc.

## Success Metrics
- **Conversation Latency**: < 3 seconds from speech to AI response
- **User Engagement**: Natural conversation flow with appropriate turn-taking
- **Learning Effectiveness**: Measurable improvement in English fluency and interview confidence
- **User Experience**: Intuitive interface supporting both ESL learners and interview candidates
- **Technical Reliability**: Graceful handling of API failures and network issues
- **Accessibility**: Clear interface design suitable for non-native English speakers

## Technical Constraints (Free Service Focus)
- **Free service model**: No costs to users, registration only for abuse prevention
- **Flexible provider architecture**: Users choose preferred AI services
- **SQLite database** (simple deployment)
- **Push-to-talk interface** (no complex real-time audio streaming)
- **Complete audio segments** (simplified processing pipeline)
- **Provider fallbacks** (automatic switching when services fail)
- **Cross-browser compatibility** (Chrome, Firefox, Safari)

## Future Enhancement Roadmap
### Phase 2 Enhancements (Post-MVP)
- **Continuous audio streaming** with silence detection (Voice Activity Detection)
- **Real-time conversation flow** with natural turn-taking
- **Adaptive conversation difficulty** based on user performance
- **Granular fluency scoring** with detailed pronunciation feedback
- **Advanced LLM prompting** for skill-level adaptation

### Phase 3 Advanced Features
- **Speech analytics integration** for detailed pronunciation analysis
- **Multi-language support** for non-English native speakers
- **Group conversation practice** (multiple users with AI moderator)
- **Custom scenario creation** by instructors or advanced users

---

This specification provides a complete roadmap for building TalkBuddy - a dual-purpose conversational AI platform that serves both English language learners and interview preparation needs with real-time voice processing and a clean, extensible architecture.