# TalkBuddy Desktop

AI-powered conversation practice desktop application with real-time speech recognition and synthesis. Practice real-world conversations with an AI partner in a safe, supportive environment - all running locally on your computer.

## 🌟 Features

- **Real-time Speech Recognition** - Powered by Speaches API
- **Natural Text-to-Speech** - High-quality voice synthesis
- **AI Conversation Partners** - Contextual responses via Ollama
- **Practice Scenarios** - Coffee shop, hotel check-in, restaurant, and more
- **Local Data Storage** - All your data stays on your computer
- **Cross-Platform** - Works on Windows, macOS, and Linux
- **No Authentication Required** - Simple, privacy-focused design

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐
│  React + Electron│────▶│   SQLite     │     │  Speaches    │
│    Desktop App   │     │  Local DB    │     │  STT + TTS   │
│                  │◀────│              │     │   Server     │
└─────────────────┘     └──────────────┘     └──────────────┘
                               │                      │
                               └──────────┬───────────┘
                                          │
                                   ┌──────────────┐
                                   │    Ollama    │
                                   │  AI Service  │
                                   └──────────────┘
```

## 🚀 Quick Start

### Prerequisites

Before running TalkBuddy Desktop, you need:

1. **Speaches API** - Speech-to-text and text-to-speech
   - Cloud service available at: https://speaches.serveur.au
   - No installation needed! (unless you want to self-host)
   - [API Documentation](https://speaches.serveur.au/docs)

2. **[Ollama](https://ollama.ai)** - Local AI models
   ```bash
   # Install Ollama and pull a model
   ollama pull llama2
   ```

### Installation

#### Option 1: Download Release (Recommended)
1. Go to [Releases](https://github.com/yourusername/talk-buddy/releases)
2. Download the installer for your platform
3. Install and run TalkBuddy

#### Option 2: Build from Source
```bash
# Clone the repository
git clone https://github.com/yourusername/talk-buddy.git
cd talk-buddy

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for your platform
npm run dist
```

## 📁 Project Structure

```
talkbuddy-desktop/
├── public/                 # Electron main process
│   ├── electron.js         # Main process entry
│   └── preload.js          # Preload script for IPC
├── src/                    # React application
│   ├── components/         # UI components
│   ├── pages/              # Page components
│   ├── services/           # API services
│   │   ├── sqlite.ts       # Local database
│   │   ├── speaches.ts     # STT/TTS service
│   │   └── ollama.ts       # AI service
│   └── storage/            # Database setup
├── assets/                 # Application icons
└── dist/                  # Built applications
```

## 🔧 Configuration

Configure external services in Settings:
- **Speaches URL**: Default `https://speaches.serveur.au` (cloud-hosted)
- **Ollama URL**: Default `http://localhost:11434` (local)
- **Ollama Model**: Default `llama2`
- **Voice**: Male or Female (mapped to OpenAI-compatible voices)

## 💾 Data Storage

All data is stored locally:
- **Windows**: `%APPDATA%/talkbuddy/talkbuddy.db`
- **macOS**: `~/Library/Application Support/talkbuddy/talkbuddy.db`
- **Linux**: `~/.config/talkbuddy/talkbuddy.db`

## 🚀 Development

```bash
# Install dependencies
npm install

# Run development mode
npm run dev

# Build React app
npm run build

# Package for current platform
npm run dist

# Package for all platforms
npm run dist-all
```

## 📚 Documentation

- [Migration Notes](MIGRATION_NOTES.md) - Changes from web version
- [Original Web Version](v1-archive/) - Previous architecture

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our repository.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Electron](https://www.electronjs.org/) - Desktop framework
- [React](https://react.dev/) - UI framework
- [Speaches](https://github.com/anthropics/speaches) - Speech services
- [Ollama](https://ollama.ai/) - Local AI models

## Version History

- v2.0 - Electron + React desktop app (current)
- v1.0 - Web version with PocketBase (see v1-archive/)