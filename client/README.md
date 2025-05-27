# TalkBuddy Client

React-based frontend for the TalkBuddy conversation practice application.

## Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your server URLs:
   ```env
   VITE_POCKETBASE_URL=http://localhost:8090
   VITE_WHISPER_URL=http://localhost:8091
   VITE_PIPER_URL=http://localhost:8092
   VITE_OLLAMA_URL=http://localhost:11434
   VITE_OLLAMA_API_KEY=your-api-key
   ```

3. **Start development server:**
   ```bash
   npm run dev
   ```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Project Structure

```
src/
├── components/        # Reusable UI components
│   ├── ConversationAvatar.tsx
│   ├── PushToTalkButton.tsx
│   └── ...
├── pages/            # Page components
│   ├── HomePage.tsx
│   └── ConversationPage.tsx
├── services/         # API and business logic
│   ├── conversation.ts
│   ├── pocketbase.ts
│   ├── speech.ts
│   └── whisper.ts
├── types/            # TypeScript type definitions
├── config.ts         # App configuration
└── main.tsx         # App entry point
```

## Key Features

### Speech Services

The app uses:
- **Whisper API** for speech-to-text (STT)
- **Piper TTS** for text-to-speech (TTS)
- Fallback to browser's Web Speech API if needed

### Conversation Flow

1. User selects a practice scenario
2. AI presents initial greeting via TTS
3. User responds using push-to-talk
4. Speech is converted to text via Whisper
5. AI generates contextual response
6. Response is spoken via Piper TTS

### State Management

The app uses React's built-in state management:
- Component state for UI interactions
- Service classes for business logic
- No external state library needed

## Production Build

```bash
npm run build
```

The build output will be in the `dist/` folder.

## Environment Variables

All environment variables must be prefixed with `VITE_`:

- `VITE_POCKETBASE_URL` - PocketBase API endpoint
- `VITE_WHISPER_URL` - Whisper STT service
- `VITE_PIPER_URL` - Piper TTS service
- `VITE_OLLAMA_URL` - Ollama AI service
- `VITE_OLLAMA_API_KEY` - API key for Ollama

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Brave: Requires Piper TTS (no browser TTS)

## Troubleshooting

### Microphone Access
- Ensure HTTPS in production
- User must grant microphone permission
- Check browser console for errors

### CORS Issues
- Verify server CORS configuration
- Check that URLs in .env match server setup
- Use HTTPS for production domains

### Audio Playback
- Some browsers block autoplay
- User interaction required to start audio
- Check browser console for blocked requests