# TalkBuddy

AI-powered conversation practice application with real-time speech recognition and synthesis. Practice real-world conversations with an AI partner in a safe, supportive environment.

## 🌟 Features

- **Real-time Speech Recognition** - Powered by OpenAI Whisper
- **Natural Text-to-Speech** - Using Piper TTS for consistent voice across browsers
- **AI Conversation Partners** - Contextual responses via Ollama
- **Practice Scenarios** - Coffee shop, hotel check-in, restaurant, and more
- **Audio-First Design** - Simple, accessible interface focused on speaking
- **Self-Hosted** - Complete privacy with all processing on your servers

## 🏗️ Architecture

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   React     │────▶│  PocketBase  │     │   Whisper    │     │    Piper     │
│  Frontend   │     │   Backend    │     │  STT Server  │     │  TTS Server  │
│  (Vite)     │◀────│  Database    │     │   (Flask)    │     │   (Flask)    │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │                                           │
                            └─────────────────┬─────────────────────────┘
                                              │
                                       ┌──────────────┐
                                       │    Ollama    │
                                       │  AI Service  │
                                       └──────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Python 3.8+
- 4GB+ RAM (8GB recommended for Whisper)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/talk-buddy.git
   cd talk-buddy
   ```

2. **Set up the backend services**
   ```bash
   cd server
   
   # Download PocketBase
   ./setup-pocketbase.sh
   
   # Set up Whisper STT
   ./setup-whisper.sh
   
   # Set up Piper TTS
   ./setup-piper.sh
   
   # Import initial scenarios
   ./import-scenarios.sh
   ```

3. **Configure the frontend**
   ```bash
   cd ../client
   npm install
   
   # Copy and edit environment variables
   cp .env.example .env
   # Edit .env with your server URLs
   ```

4. **Start all services**
   ```bash
   cd ../server
   ./start-all.sh
   ```

5. **Start the frontend**
   ```bash
   cd ../client
   npm run dev
   ```

6. **Open the app**
   - Development: http://localhost:5173
   - Production: Configure your domain

## 📁 Project Structure

```
talk-buddy/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # UI components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API and service layers
│   │   └── config.ts       # Configuration
│   └── .env.example        # Environment template
│
├── server/                 # Backend services
│   ├── pb_migrations/      # PocketBase schema
│   ├── whisper-server.py   # Speech-to-text API
│   ├── piper-server.py     # Text-to-speech API
│   ├── start-all.sh        # Start all services
│   └── scenarios-export.json # Initial conversation scenarios
│
└── docs/                   # Documentation
    └── SPECIFICATION-V2.md # Detailed technical spec
```

## 🔧 Configuration

### Environment Variables

Create `.env` in the client folder:
```env
VITE_POCKETBASE_URL=https://your-pocketbase-url
VITE_WHISPER_URL=https://your-whisper-url
VITE_PIPER_URL=https://your-piper-url
VITE_OLLAMA_URL=https://your-ollama-url
VITE_OLLAMA_API_KEY=your-api-key
```

### Service Ports

Default ports (configurable):
- PocketBase: 8090
- Whisper STT: 8091
- Piper TTS: 8092
- React Dev: 5173

## 📚 Documentation

- [Server Setup Guide](server/README.md) - Detailed backend setup
- [Database Setup](server/DATABASE_SETUP.md) - PocketBase configuration
- [Whisper Setup](server/WHISPER_SETUP.md) - STT configuration
- [Technical Specification](docs/SPECIFICATION-V2.md) - Full architecture details
- [Development Roadmap](TODO.md) - Feature progress tracking

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [PocketBase](https://pocketbase.io/) - Backend framework
- [OpenAI Whisper](https://github.com/openai/whisper) - Speech recognition
- [Piper TTS](https://github.com/rhasspy/piper) - Text-to-speech
- [Ollama](https://ollama.ai/) - Local AI models

## Version History

- v2.0 - React + PocketBase architecture (current)
- v1.0 - FastHTML version (see v1-archive branch)