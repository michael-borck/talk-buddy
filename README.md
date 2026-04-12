# Talk Buddy

<!-- BADGES:START -->
[![ai](https://img.shields.io/badge/-ai-ff6f00?style=flat-square)](https://github.com/topics/ai) [![conversation-practice](https://img.shields.io/badge/-conversation--practice-blue?style=flat-square)](https://github.com/topics/conversation-practice) [![cross-platform](https://img.shields.io/badge/-cross--platform-blue?style=flat-square)](https://github.com/topics/cross-platform) [![electron](https://img.shields.io/badge/-electron-47848f?style=flat-square)](https://github.com/topics/electron) [![english-learning](https://img.shields.io/badge/-english--learning-blue?style=flat-square)](https://github.com/topics/english-learning) [![interview-prep](https://img.shields.io/badge/-interview--prep-blue?style=flat-square)](https://github.com/topics/interview-prep) [![speech-recognition](https://img.shields.io/badge/-speech--recognition-blue?style=flat-square)](https://github.com/topics/speech-recognition) [![text-to-speech](https://img.shields.io/badge/-text--to--speech-blue?style=flat-square)](https://github.com/topics/text-to-speech) [![typescript](https://img.shields.io/badge/-typescript-3178c6?style=flat-square)](https://github.com/topics/typescript)
<!-- BADGES:END -->

Practice real-world conversations with an AI partner — job interviews, client presentations, difficult meetings, delivering bad news — in a safe, private space where it's OK to stumble. Talk Buddy listens to you, responds out loud, and keeps a transcript you can review afterward.

Built for university students, especially those practising English as a second language.

## What it does

You pick a scenario (or write your own), press the mic, and have a spoken conversation with the AI. When you're done you get a transcript and optional analysis of how it went.

Under the hood:

```
You speak → Speech recognition → AI thinks → Voice speaks back
           (Listening)            (AI Brain)   (Voice)
```

Everything runs on your computer. Your recordings and transcripts never leave your machine. You bring your own AI key (Anthropic, OpenAI, Gemini, Groq, or a local Ollama model) and choose how speech is handled — either a built-in offline engine or a cloud server.

## Features

- **Hold-to-speak conversations** with spacebar or button — the AI responds out loud in real time
- **Scenario library** — pre-built scenarios for interviews, presentations, HR meetings, and more; create your own
- **Practice packs** — group scenarios into focused practice sessions
- **Session history** with transcripts and optional AI analysis
- **Multiple AI providers** — Anthropic (Claude), OpenAI (GPT), Google (Gemini), Groq, Ollama, or any custom endpoint
- **Built-in offline speech** — works without internet using the embedded Piper + Whisper engine
- **Cloud speech** — connect to a [Speaches](https://github.com/speaches-ai/speaches) server for higher-quality voices (Kokoro TTS, Faster Whisper STT)
- **Audio turn cue** — a subtle sound when it's your turn to speak (configurable: rise, click, or silent)
- **Privacy-first** — all data stored locally in SQLite; bring your own keys; nothing phoned home
- **Cross-platform** — macOS, Windows, Linux

## Quick start

### Download a release

1. Go to [Releases](https://github.com/michael-borck/talk-buddy/releases)
2. Download the installer for your platform (.dmg for Mac, .exe for Windows, .AppImage for Linux)
3. Open Talk Buddy, go to Settings → AI Brain, pick your AI provider, paste your key, and save
4. Pick a scenario and start talking

### Or build from source

```bash
git clone https://github.com/michael-borck/talk-buddy.git
cd talk-buddy
npm install
npm run dev
```

The first `npm install` rebuilds `better-sqlite3` against Electron's ABI automatically (via the `postinstall` hook). If you see a `NODE_MODULE_VERSION` mismatch, run `npm run rebuild`.

## How it works

```
talk-buddy/
├── src/
│   ├── main/                  # Electron main process
│   │   ├── index.js           # App lifecycle, IPC handlers, embedded server management
│   │   └── preload.js         # Context bridge exposing electronAPI to renderer
│   └── renderer/              # React application (Vite-bundled)
│       ├── App.tsx            # Router, sidebar, home page
│       ├── pages/             # Scenarios, Conversation, Settings, SessionHistory, etc.
│       ├── components/        # EditorialVoiceVisualizer, StatusFooter, cards, modals
│       ├── services/          # speaches.ts, chat.ts, embedded.ts, audioCues.ts, sqlite.ts
│       └── index.css          # Studio Calm design tokens + component classes
├── embedded-server/           # Optional offline speech engine (Python + Piper + Whisper)
│   ├── server.py              # Flask server with OpenAI-compatible endpoints
│   ├── setup.sh               # Creates venv + installs deps + downloads voice models
│   └── requirements.txt       # Python dependencies (synced with CI workflow)
├── .github/workflows/
│   └── build.yml              # Release pipeline: builds embedded server + Electron app
│                              #   on macOS / Windows / Linux, publishes to GitHub Releases
├── docs/                      # In-app help documentation (markdown)
│   └── design/
│       └── studio-calm.md     # Design system spec for the Buddy suite
└── public/docs/               # Mirror of docs/ served by the app's help viewer
```

### The conversation pipeline

1. **You speak** → browser captures audio via `getUserMedia`
2. **Speech recognition** → audio is sent to the speech server (built-in Whisper or cloud Speaches) via main-process IPC to bypass CORS
3. **AI responds** → the transcript is sent to your configured AI provider (Claude, GPT, Gemini, etc.) with the scenario's system prompt + conversation history
4. **Voice speaks** → the AI's text reply is sent to the TTS server, returned as audio, and played through an `<audio>` element. The voice visualizer animates with real audio amplitude from a Web Audio analyser.
5. **Your turn** → a configurable audio cue plays, the status flips to "your turn", and you can hold spacebar or the button to speak again

All speech traffic routes through the Electron main process (not the browser renderer) to avoid CORS issues with external servers.

## Configuration

All settings are in the app's Settings page (the wrench icon in the sidebar). The five tabs:

| Tab | What it controls |
|---|---|
| **Listening** | How Talk Buddy understands your speech — built-in (offline) or cloud server |
| **Voice** | How Talk Buddy speaks back — built-in voices (Alan & Amy) or cloud voices (Kokoro) |
| **AI Brain** | Which AI powers the conversation — Anthropic, OpenAI, Gemini, Groq, Ollama, or custom |
| **Conversation Style** | How the AI behaves — natural, educational, concise, business, supportive, or custom instructions |
| **Your Data** | Export/import data, clear everything, links to documentation |

### Speech options

| Option | Internet needed? | Quality | Setup |
|---|---|---|---|
| **Built-in (offline)** | No | Good (Piper TTS, Whisper STT) | Click "Set up" in Settings — installs Python venv + voice models (~500MB, one-time) |
| **Cloud server** | Yes | Better (Kokoro TTS, Faster Whisper STT) | Point to a [Speaches](https://github.com/speaches-ai/speaches) server and paste the access key |

### AI options

| Provider | Key needed? | Where to get one |
|---|---|---|
| **Anthropic (Claude)** | Yes | [console.anthropic.com](https://console.anthropic.com/) |
| **OpenAI (GPT)** | Yes | [platform.openai.com](https://platform.openai.com/) |
| **Google (Gemini)** | Yes | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **Groq** | Yes | [console.groq.com](https://console.groq.com/) |
| **Ollama (local)** | No | [ollama.com](https://ollama.com/) — install and run `ollama pull llama3` |
| **Custom** | Maybe | Any OpenAI-compatible endpoint |

For hosted providers (Anthropic, OpenAI, Gemini, Groq), the server address is set automatically — you only need to paste your key and pick a model.

## Data storage

All data stays on your computer in a single SQLite file:

| Platform | Location |
|---|---|
| macOS | `~/Library/Application Support/Talk Buddy/talkbuddy.db` |
| Windows | `%APPDATA%/Talk Buddy/talkbuddy.db` |
| Linux | `~/.config/Talk Buddy/talkbuddy.db` |

Audio recordings are **not stored** — only the text transcripts survive. The mic blob is discarded after transcription.

## Design

Talk Buddy uses **Studio Calm**, a design system built for ESL students practising high-stakes conversations. Warm paper background, clean sans-serif typography (Figtree), sage accent, generous whitespace, unhurried motion. Everything is designed to reduce anxiety and keep the focus on the conversation.

Studio Calm is shared across the Buddy suite (Talk Buddy, Study Buddy, Career Compass) with a per-app accent colour: sage for Talk Buddy, bluebell for Study Buddy, warm ochre for Career Compass. See [docs/design/studio-calm.md](docs/design/studio-calm.md) for the full spec.

## Development

```bash
npm install          # Install deps + rebuild native modules for Electron
npm run dev          # Start Vite + Electron together (hot reload)
npm run build        # Vite production build (type-checks + bundles)
npm run rebuild      # Rebuild better-sqlite3 against Electron ABI
npm run electron:dist  # Package for current platform via electron-builder
```

### Embedded speech server (optional)

```bash
cd embedded-server
./setup.sh           # Creates Python venv, installs deps, downloads Piper voice models
```

Or use the in-app setup: Settings → Listening/Voice → Built-in → "Not installed — Set up".

## Part of the Buddy suite

Talk Buddy is one of three apps sharing the Studio Calm design system:

- **Talk Buddy** — practise conversations (you're here)
- **Study Buddy** — privacy-first personal tutor (planned)
- **Career Compass** — explore career paths (planned)

## Documentation

- [Design system spec](docs/design/studio-calm.md) — Studio Calm tokens, patterns, and migration plan
- [Design mockup](docs/design/mockups/studio-calm.html) — interactive HTML preview (open in browser)
- [In-app help](docs/) — getting started, service setup, troubleshooting

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

- [Electron](https://www.electronjs.org/) — desktop framework
- [React](https://react.dev/) — UI framework
- [Speaches](https://github.com/speaches-ai/speaches) — speech-to-text and text-to-speech server
- [Ollama](https://ollama.com/) — local AI models
- [Piper](https://github.com/rhasspy/piper) — offline voice synthesis (embedded server)
- [Figtree](https://fonts.google.com/specimen/Figtree) — the typeface
