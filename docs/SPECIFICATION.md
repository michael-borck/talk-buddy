# TalkBuddy - Educational Project Specification
> *"Open-Source AI Conversation Practice for Students and Educators"*

## Project Overview
TalkBuddy is a free, open-source real-time voice conversation practice platform designed for educational use. Students can practice conversations with AI personas across various scenarios, while educators can create custom interview scenarios and conversation contexts. The platform uses a **default-free approach** with browser APIs and open-source models, while allowing users to optionally connect their own commercial API keys for enhanced experiences.

## Educational Focus & Use Cases

### Primary Use Case: Interview Practice
- **Multi-discipline interview preparation** across various fields
- **Educator-created scenarios** for specific courses/programs
- **Student-generated scenarios** for peer learning
- **Flexible difficulty levels** adaptable to different academic levels
- **Practice for academic, professional, and research interviews**

### Secondary Use Case: Conversation Practice
- **Language learning support** for international students
- **Communication skills development** across disciplines
- **Public speaking confidence building**
- **Professional presentation practice**

### Target Users
- **Students**: All academic levels practicing interview skills
- **Educators**: Creating custom scenarios for their courses
- **International Students**: Improving English communication
- **Career Services**: Supporting student job preparation
- **Self-learners**: Anyone wanting to practice conversations

## Technology Philosophy

### Default Free Stack (No API Keys Required)
- **STT**: Web Speech API (browser-native)
- **LLM**: Hugging Face Inference API (free tier) OR local Ollama server
- **TTS**: SpeechSynthesis API (browser-native)
- **Completely functional out-of-the-box experience**

### Optional Commercial Enhancement
- **User choice**: Upgrade specific components with personal API keys
- **OpenAI**: Enhanced STT (Whisper), LLM (GPT-4), TTS
- **ElevenLabs**: Premium TTS quality
- **Mix-and-match**: Users can upgrade only specific components

### Open Source & Self-Hosted
- **MIT License**: Free to use, modify, and redistribute
- **Docker deployment**: Easy institutional setup
- **Local Ollama integration**: Full privacy with local LLMs
- **No vendor dependencies**: Fully functional with free services

## Core Features (Revised)

### Authentication (Abuse Prevention Only)
- **Simple email/password** registration
- **No email verification required** for basic use
- **Session management** to prevent abuse
- **Rate limiting**: Reasonable daily conversation limits
- **Purpose**: Prevent spam/abuse, not monetization

### Scenario Management (Individual-Focused with Easy Sharing)
- **Default interview scenarios** across multiple disciplines:
  - Technical interviews (CS, Engineering, Data Science)
  - Academic interviews (Research positions, Graduate programs)
  - Professional interviews (Business, Healthcare, Education)
  - Behavioral interviews (Leadership, Teamwork, Problem-solving)
- **Universal scenario creation**: Any user can create custom scenarios
- **Flexible sharing model**: Export scenarios as files or shareable links
- **Import system**: Users import scenarios they want to practice with
- **Community library**: Optional public sharing for discoverable scenarios
- **No account management**: Clean separation between creators and users

### Conversation Interface (Simplified)
- **Push-to-talk design**: Clear turn-taking for reliable processing
- **Real-time transcript**: Shows conversation as it happens
- **Session recording**: Full conversation history with timestamps
- **Simple feedback**: Basic conversation summary and suggestions
- **Provider indicators**: Shows which AI services are active

### Dashboard Features (Individual-Focused)
- **Conversation history**: Review past practice sessions
- **My Scenarios**: Created scenarios with sharing options (export/link generation)
- **Imported Scenarios**: Scenarios obtained from others (file/link import)
- **Community Library**: Browse and discover publicly shared scenarios
- **Practice statistics**: Track improvement over time
- **Session management**: Delete, replay, or continue conversations
- **Profile management**: Multiple practice personas/contexts
- **Sharing tools**: Generate shareable links, export files, QR codes

## Updated Architecture

### Project Structure (Educational)
```
talkbuddy/
├── main.py                  # FastHTML app entry point
├── config/
│   ├── settings.py          # App configuration
│   ├── defaults.py          # Default free provider configs
│   └── scenarios/           # Default scenario definitions
├── providers/               # Pluggable provider architecture
│   ├── free/                # Default free providers
│   │   ├── browser_stt.py   # Web Speech API
│   │   ├── browser_tts.py   # SpeechSynthesis API
│   │   ├── huggingface.py   # HF Inference API
│   │   └── ollama.py        # Local Ollama integration
│   ├── commercial/          # Optional paid providers
│   │   ├── openai.py        # OpenAI services
│   │   └── elevenlabs.py    # ElevenLabs TTS
│   └── base.py              # Abstract interfaces
├── services/
│   ├── conversation.py      # Core conversation logic
│   ├── scenarios.py         # Scenario CRUD and sharing
│   ├── sharing.py           # Link generation and import handling
│   ├── community.py         # Public scenario library
│   ├── auth.py              # Simple auth for abuse prevention
│   └── export.py            # File export/import functionality
├── models/
│   ├── user.py              # Basic user model
│   ├── session.py           # Conversation sessions
│   ├── scenario.py          # Interview/conversation scenarios
│   └── feedback.py          # Session analysis
├── static/
│   ├── css/                 # Educational-friendly styling
│   ├── js/
│   │   └── conversation.js  # Browser audio handling
│   └── scenarios/           # Default scenario files
├── docker/
│   ├── Dockerfile           # Container deployment
│   ├── docker-compose.yml   # Full stack setup
│   └── ollama.yml           # Local LLM option
└── docs/
    ├── deployment.md        # Institutional setup guide
    ├── scenarios.md         # Creating custom scenarios
    └── educator-guide.md    # Teaching with TalkBuddy
```

## Updated Database Schema

### Scenarios Table (Enhanced for Individual Sharing)
```sql
CREATE TABLE scenarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,  -- 'technical', 'academic', 'behavioral', 'language', 'custom'
    discipline TEXT,  -- 'computer_science', 'engineering', 'business', 'healthcare', etc.
    difficulty_level TEXT,  -- 'undergraduate', 'graduate', 'professional', 'entry_level'
    interview_type TEXT,  -- 'technical', 'behavioral', 'case_study', 'presentation'
    persona_prompt TEXT,  -- AI interviewer personality and role
    context_prompt TEXT,  -- Interview context and guidelines
    sample_questions TEXT,  -- JSON array of example questions
    evaluation_criteria TEXT,  -- What to assess in responses
    learning_objectives TEXT,  -- Educational goals
    duration_minutes INTEGER,  -- Suggested session length
    is_default BOOLEAN DEFAULT FALSE,  -- Built-in scenarios
    is_public BOOLEAN DEFAULT FALSE,   -- Available in community library
    is_imported BOOLEAN DEFAULT FALSE, -- User imported from others
    created_by INTEGER,  -- User who created (NULL for defaults)
    imported_from TEXT,  -- Original source if imported
    share_token TEXT,    -- Unique token for sharing links
    download_count INTEGER DEFAULT 0,  -- Track popularity
    rating_average DECIMAL(3,2),       -- Community rating
    rating_count INTEGER DEFAULT 0,    -- Number of ratings
    tags TEXT,          -- JSON array for filtering/search
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users (id)
);
```

### Sharing and Import Tracking
```sql
CREATE TABLE scenario_shares (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scenario_id INTEGER NOT NULL,
    share_token TEXT UNIQUE NOT NULL,
    created_by INTEGER NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP,
    expires_at TIMESTAMP,  -- Optional expiration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (scenario_id) REFERENCES scenarios (id),
    FOREIGN KEY (created_by) REFERENCES users (id)
);

CREATE TABLE scenario_imports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scenario_id INTEGER NOT NULL,
    imported_from_token TEXT,
    imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (scenario_id) REFERENCES scenarios (id)
);
```

### Enhanced Session Tracking
```sql
CREATE TABLE conversation_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    scenario_id INTEGER NOT NULL,
    session_name TEXT,  -- User-provided session identifier
    transcript TEXT,
    ai_feedback TEXT,   -- Auto-generated session analysis
    self_reflection TEXT,  -- Student's post-session notes
    instructor_notes TEXT,  -- Optional educator feedback
    duration INTEGER,   -- seconds
    turn_count INTEGER,
    question_count INTEGER,  -- Number of questions asked
    providers_used TEXT,  -- JSON of which providers were active
    performance_metrics TEXT,  -- JSON of conversation analysis
    shared_with_instructor BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (scenario_id) REFERENCES scenarios (id)
);
```

## Default Scenario Examples

### Computer Science Technical Interview
- **Persona**: Senior Software Engineer at a tech company
- **Context**: 45-minute technical interview for new graduate position
- **Focus**: Data structures, algorithms, system design basics, coding approach
- **Sample Questions**: "Explain how you would design a URL shortener", "Walk me through reversing a linked list"
- **Evaluation**: Technical accuracy, communication clarity, problem-solving approach

### Graduate School Research Interview
- **Persona**: Faculty member in student's field of interest
- **Context**: Graduate program admission interview
- **Focus**: Research interests, academic background, career goals
- **Sample Questions**: "What research questions interest you?", "How does our program align with your goals?"
- **Evaluation**: Research understanding, motivation, fit with program

### Business Case Study Interview
- **Persona**: Management consultant or business analyst
- **Context**: Case-based interview for business roles
- **Focus**: Analytical thinking, business acumen, presentation skills
- **Sample Questions**: Market sizing, profitability analysis, strategic recommendations
- **Evaluation**: Structured thinking, quantitative skills, business intuition

## Educational Workflow (Individual-Focused)

### Instructor Workflow
1. **Create custom scenario** using built-in scenario builder
2. **Test scenario** by practicing with it themselves
3. **Export/Share**: Generate shareable link or download file
4. **Distribute**: Post link in LMS, email, or provide file to students
5. **Optional**: Publish to community library for broader access

### Student Workflow
1. **Import scenarios**: Click shared links or upload scenario files
2. **Browse library**: Discover scenarios in personal collection or community
3. **Practice sessions**: Unlimited practice with any imported scenarios
4. **Track progress**: Review session history and improvement metrics
5. **Share creations**: Students can also create and share scenarios

### Community Workflow
1. **Public library**: Browse scenarios shared by community
2. **Search/filter**: Find scenarios by discipline, difficulty, type
3. **Rating system**: Rate scenarios to help others discover quality content
4. **Contribution**: Anyone can contribute scenarios to public library

## Deployment Options

### Quick Start (Free Services)
1. **Clone repository** and configure environment
2. **Use default browser APIs** + Hugging Face free tier
3. **Load default scenarios** for immediate use
4. **Optional**: Students can add personal API keys for enhancement

### Institutional Deployment
1. **Docker container** deployment on campus infrastructure
2. **Local Ollama server** for complete privacy
3. **Custom scenario loading** for specific programs
4. **LDAP/SSO integration** for seamless access

### Enhanced Setup
1. **Institutional API keys** for premium experiences
2. **ElevenLabs integration** for natural TTS
3. **Custom model fine-tuning** for specific domains
4. **Advanced analytics** for educational research

## Success Metrics (Educational)

### Student Engagement
- **Session completion rates** across different scenarios
- **Return usage patterns** indicating sustained learning
- **Scenario diversity** - students exploring multiple interview types
- **Self-reported confidence improvement** through optional surveys

### Educational Effectiveness
- **Interview performance correlation** with practice frequency
- **Skill progression tracking** through conversation analysis
- **Educator adoption** and custom scenario creation
- **Community contribution** of shared scenarios and improvements

### Technical Performance
- **Response latency** under 3 seconds for smooth conversations
- **Provider fallback reliability** when services are unavailable
- **Cross-platform compatibility** for diverse student devices
- **Resource efficiency** for institutional deployments

---

## Updated Value Proposition

**"Free, open-source interview practice platform that puts students first. No costs, no vendor lock-in, no data harvesting - just effective conversation practice powered by modern AI. Educators can create custom scenarios, students can practice unlimited sessions, and institutions can deploy privately while contributing to a shared educational resource."**

This positions TalkBuddy as an educational tool focused on accessibility, privacy, and community contribution rather than a commercial product competing with existing services.