# ChatterBox V2 - Specification

## Overview

ChatterBox is an AI-powered conversation practice application with an audio-first, visual interface. Users engage in structured interview scenarios through voice interaction, with transcripts saved for later review.

## Core Architecture

### Tech Stack
- **Frontend**: React (Vite) with TypeScript
- **Backend**: PocketBase
- **Database**: SQLite (via PocketBase)
- **Local Storage**: IndexedDB for offline support
- **Audio**: Web Audio API (STT/TTS)
- **Deployment**: Docker/VPS

### Key Design Principles
1. **Audio-First**: Visual interface with no text during conversations
2. **Client-Side Processing**: All audio processing happens in browser
3. **Offline-First**: Practice without internet, sync when connected
4. **Progressive Enhancement**: Core features work on all modern browsers

## User Interface

### Conversation Interface (Audio Mode)

The conversation screen is completely visual with no text elements:

#### AI Avatar
- **Visual**: Circular avatar/icon in center of screen
- **States**:
  - **Listening**: Subtle pulse animation (user is speaking)
  - **Thinking**: Rotating or processing animation (AI processing response)
  - **Speaking**: Expanding rings/waves emanating from avatar (AI speaking)
- **Colors**: 
  - Listening: Blue theme
  - Thinking: Orange/amber theme
  - Speaking: Green theme

#### User Controls
- **Single Button**: Large push-to-talk button at bottom
  - Press and hold to speak
  - Release to stop
  - Visual feedback on press (color change, slight scale)
- **Alternative**: Tap to start/stop recording
- **Visual Indicators**: 
  - Recording indicator (red dot or microphone fill)
  - Audio level visualization (optional)

#### Layout
```
+---------------------------+
|                           |
|      [Status Bar]         |  ← Minimal: timer, end session
|                           |
|                           |
|        AI Avatar          |  ← Center screen
|      (with states)        |
|                           |
|                           |
|                           |
|     [Push to Talk]        |  ← Bottom center
|                           |
+---------------------------+
```

### Navigation & Other Screens

These screens maintain standard UI with text:

#### Dashboard
- Welcome message
- Recent sessions (cards)
- Quick start scenarios
- Progress overview

#### Scenarios Library
- Browse by category
- Search functionality
- Difficulty indicators
- Duration estimates

#### Session History
- List of past sessions
- View full transcripts
- Audio playback (if stored)
- Performance metrics
- Export options

#### Settings
- Audio input/output selection
- Voice preferences
- Notification settings
- Account management

## Data Models

### User
```typescript
interface User {
  id: string
  email: string
  displayName: string
  preferences: UserPreferences
  created: Date
  lastActive: Date
}

interface UserPreferences {
  audioInput?: string
  audioOutput?: string
  ttsVoice?: string
  autoStartRecording: boolean
  hapticFeedback: boolean
}
```

### Scenario
```typescript
interface Scenario {
  id: string
  name: string
  description: string
  category: ScenarioCategory
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  estimatedMinutes: number
  systemPrompt: string
  initialMessage: string
  tags: string[]
  isPublic: boolean
  createdBy?: string
}

enum ScenarioCategory {
  Technical = 'technical',
  Behavioral = 'behavioral',
  Academic = 'academic',
  Medical = 'medical',
  Language = 'language',
  Custom = 'custom'
}
```

### Session
```typescript
interface Session {
  id: string
  userId: string
  scenarioId: string
  startTime: Date
  endTime?: Date
  duration: number
  transcript: Message[]
  metadata: SessionMetadata
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  duration?: number
  confidence?: number
}

interface SessionMetadata {
  wordsPerMinute?: number
  fillerWords?: number
  clarity?: number
  audioQuality?: string
}
```

## Technical Implementation

### Audio Processing Flow
```
1. User presses talk button
   → Start recording via MediaRecorder API
   → Visual feedback (avatar enters listening state)

2. User releases button
   → Stop recording
   → Avatar enters thinking state
   → Send audio to Web Speech API
   → Get transcription

3. Generate AI response
   → Use conversation context
   → Avatar enters speaking state
   → TTS plays response
   → Rings/waves animate with audio

4. Save to IndexedDB
   → Store transcript immediately
   → Queue for server sync
   → Handle offline gracefully
```

### State Management
```typescript
interface ConversationState {
  mode: 'idle' | 'listening' | 'thinking' | 'speaking'
  session: Session | null
  currentTranscript: string
  isRecording: boolean
  audioLevel: number
  error: string | null
}
```

### Offline Support
- Cache scenarios in IndexedDB
- Store sessions locally first
- Background sync when online
- Queue failed uploads
- Conflict resolution (last-write-wins)

## API Endpoints (PocketBase Collections)

### Collections
1. **users** (built-in auth)
2. **scenarios**
3. **sessions**
4. **messages**

### Real-time Subscriptions
- Session updates
- New scenarios
- Progress tracking

## User Flows

### First Time User
1. Land on marketing page
2. Sign up / Continue as guest
3. Select first scenario
4. See brief tutorial (visual)
5. Start conversation
6. Complete session
7. View transcript
8. Prompt to save progress

### Returning User
1. Login
2. See dashboard with progress
3. Resume or start new session
4. Access history
5. Track improvement

### Practice Session
1. Select scenario
2. See title briefly, then fade
3. AI avatar appears
4. AI speaks first (rings animate)
5. User holds button to respond
6. Natural conversation flow
7. End session → See transcript

## Progressive Enhancement

### Minimum Requirements
- Modern browser with audio
- Microphone access
- Internet (first load)

### Enhanced Features
- Offline practice
- Background sync
- Audio downloads
- Export transcripts
- Analytics

## Future Enhancements

### Phase 2
- Multiple AI voices
- Video scenarios
- Group practice
- Peer review
- Custom scenarios

### Phase 3
- Mobile apps
- AR practice
- Real-time coaching
- Integration with calendars
- Certification paths

## Success Metrics

1. **Engagement**
   - Sessions per user
   - Average session length
   - Return rate

2. **Performance**
   - Audio latency < 500ms
   - Transcription accuracy
   - Offline capability

3. **User Satisfaction**
   - Completion rate
   - User feedback
   - Recommendation rate

## Security & Privacy

- Audio processed locally
- Transcripts encrypted at rest
- GDPR compliant
- No audio stored by default
- User controls all data