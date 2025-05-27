# TalkBuddy Server

This directory contains all backend services for TalkBuddy: PocketBase, Whisper STT, and Piper TTS.

## Overview

TalkBuddy uses a microservices architecture with four main components:

1. **PocketBase** - Database and API backend
2. **Whisper Server** - Speech-to-text processing
3. **Piper Server** - Text-to-speech synthesis
4. **Ollama** - AI conversation engine (external service)

## Quick Setup

```bash
# Set up all services
./setup-pocketbase.sh
./setup-whisper.sh
./setup-piper.sh

# Import initial data
./import-scenarios.sh

# Start everything
./start-all.sh
```

## Services

### PocketBase (Port 8090)

SQLite-based backend providing:
- Database for scenarios and sessions
- REST API
- Admin UI at http://localhost:8090/_/

**Collections:**
- `scenarios` - Conversation scenarios with prompts
- `sessions` - User practice sessions and transcripts

### Whisper STT (Port 8091)

OpenAI Whisper for speech recognition:
- Converts audio to text
- Supports multiple languages
- Uses the "base" model by default

**Endpoints:**
- `POST /transcribe` - Convert audio to text
- `GET /health` - Health check

### Piper TTS (Port 8092)

Neural text-to-speech synthesis:
- Natural-sounding voices
- Consistent across all browsers
- British English voice by default

**Endpoints:**
- `POST /synthesize` - Generate audio from text
- `POST /synthesize/base64` - Get base64-encoded audio
- `GET /voices` - List available voices

## Setup Scripts

- `setup-pocketbase.sh` - Downloads and configures PocketBase
- `setup-whisper.sh` - Sets up Whisper with Python dependencies
- `setup-piper.sh` - Installs Piper and voice models
- `import-scenarios.sh` - Loads initial conversation scenarios
- `export-scenarios.sh` - Exports current scenarios to JSON

## Starting Services

### All at once:
```bash
./start-all.sh
```

### Individually:
```bash
# PocketBase
./pocketbase serve

# Whisper (in virtual environment)
source whisper-venv/bin/activate
python whisper-server.py

# Piper (in virtual environment)
source piper-venv/bin/activate
python piper-server.py
```

## Configuration

### Environment Variables

Services can be configured via environment:

```bash
# Custom PocketBase URL (for import/export scripts)
POCKETBASE_URL=http://localhost:8090

# Choose Piper voice
PIPER_VOICE=piper-voices/en_GB-alan-low.onnx
```

### CORS Settings

All services are configured to accept requests from:
- http://localhost:5173 (Vite dev server)
- http://localhost:3000 (Alternative dev port)
- Your production domain (configure in each server file)

## Database Management

### Initial Setup
```bash
# Import included scenarios
./import-scenarios.sh
```

### Backup Current Data
```bash
# Export scenarios to JSON
./export-scenarios.sh
```

### Manual Scenario Management

1. Access PocketBase admin: http://localhost:8090/_/
2. Navigate to Collections → scenarios
3. Add/edit/delete scenarios through the UI

## Troubleshooting

### PocketBase Issues

**Port already in use:**
```bash
killall pocketbase
# or
lsof -ti:8090 | xargs kill
```

**Can't import scenarios:**
- Check API rules in PocketBase admin
- Temporarily allow public create access

### Whisper Issues

**Out of memory:**
- Use smaller model in whisper-server.py
- Change `"base"` to `"tiny"` or `"small"`

**Slow transcription:**
- Upgrade to GPU-enabled Whisper
- Use smaller audio chunks

### Piper Issues

**Voice not found:**
```bash
cd piper-voices
ls *.onnx  # Check available voices
```

**Audio quality issues:**
- Try different voice models
- Adjust speech rate in requests

## Production Deployment

1. Use systemd services for auto-start
2. Configure reverse proxy (nginx/caddy)
3. Set up SSL certificates
4. Update CORS origins in server files
5. Use environment-specific ports

See the main README for production configuration details.