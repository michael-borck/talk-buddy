# Talk Buddy Desktop

<!-- BADGES:START -->
[![ai](https://img.shields.io/badge/-ai-ff6f00?style=flat-square)](https://github.com/topics/ai) [![conversation-practice](https://img.shields.io/badge/-conversation--practice-blue?style=flat-square)](https://github.com/topics/conversation-practice) [![cross-platform](https://img.shields.io/badge/-cross--platform-blue?style=flat-square)](https://github.com/topics/cross-platform) [![electron](https://img.shields.io/badge/-electron-47848f?style=flat-square)](https://github.com/topics/electron) [![english-learning](https://img.shields.io/badge/-english--learning-blue?style=flat-square)](https://github.com/topics/english-learning) [![interview-prep](https://img.shields.io/badge/-interview--prep-blue?style=flat-square)](https://github.com/topics/interview-prep) [![natural-language-processing](https://img.shields.io/badge/-natural--language--processing-blue?style=flat-square)](https://github.com/topics/natural-language-processing) [![speech-recognition](https://img.shields.io/badge/-speech--recognition-blue?style=flat-square)](https://github.com/topics/speech-recognition) [![text-to-speech](https://img.shields.io/badge/-text--to--speech-blue?style=flat-square)](https://github.com/topics/text-to-speech) [![typescript](https://img.shields.io/badge/-typescript-3178c6?style=flat-square)](https://github.com/topics/typescript)
<!-- BADGES:END -->

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

Before running Talk Buddy Desktop, you need:

1. **Speaches API** - Speech-to-text and text-to-speech
   - Cloud service available at: https://speaches.locopuente.org
   - No installation needed! (unless you want to self-host)
   - [API Documentation](https://speaches.locopuente.org/docs)

2. **[Ollama](https://ollama.ai)** - Local AI models
   ```bash
   # Install Ollama and pull a model
   ollama pull llama2
   ```

### Installation

#### Option 1: Download Release (Recommended)
1. Go to [Releases](https://github.com/yourusername/talk-buddy/releases)
2. Download the installer for your platform
3. Install and run Talk Buddy

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
talk-buddy-desktop/
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
- **Speaches URL**: Default `https://speaches.locopuente.org` (cloud-hosted)
- **Ollama URL**: Default `http://localhost:11434` (local) or cloud-hosted
- **AI Model**: Any model from Anthropic, OpenAI, Gemini, Groq, or Ollama
- **Voice**: Male or Female (mapped to OpenAI-compatible voices)

## 💾 Data Storage

All data is stored locally:
- **Windows**: `%APPDATA%/Talk Buddy/talkbuddy.db`
- **macOS**: `~/Library/Application Support/Talk Buddy/talkbuddy.db`
- **Linux**: `~/.config/Talk Buddy/talkbuddy.db`

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
- [Speaches](https://github.com/speaches-ai/speaches) - Speech services
- [Ollama](https://ollama.ai/) - Local AI models

## Version History

- v2.0 - Electron + React desktop app (current)
- v1.0 - Web version with PocketBase (see v1-archive/)