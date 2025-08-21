# Embedded TTS/STT Server

This is the embedded speech server for Talk Buddy, providing offline text-to-speech and speech-to-text functionality.

## Features

- **Text-to-Speech (TTS)**: Uses `pyttsx3` with platform-native voices
- **Speech-to-Text (STT)**: Uses OpenAI Whisper (tiny model)
- **OpenAI-compatible API**: Drop-in replacement for external speech services
- **Cross-platform**: Works on Windows, macOS, and Linux
- **Offline**: No internet connection required after initial setup

## API Endpoints

### Health Check
```
GET /health
```

### List Models
```
GET /v1/models
```

### Text-to-Speech
```
POST /v1/audio/speech
Content-Type: application/json

{
  "input": "Hello, this is a test.",
  "voice": "female|male",
  "model": "tts-voice-0"
}
```

### Speech-to-Text
```
POST /v1/audio/transcriptions
Content-Type: multipart/form-data

file: <audio_file>
model: whisper-tiny
```

### Shutdown
```
POST /shutdown
```

## Installation

1. Install Python dependencies:
```bash
pip install -r requirements.txt
```

2. Run the server:
```bash
python server.py
```

The server will start on `http://127.0.0.1:8765` by default.

## Environment Variables

- `HOST`: Server host (default: 127.0.0.1)
- `PORT`: Server port (default: 8765)

## Voice Selection

The server automatically detects available system voices and assigns:
- Index 0: Male voice (or first available)
- Index 1: Female voice (or second available)

Voice selection is determined by the `voice` parameter in TTS requests:
- `"male"`, `"alan"` → Male voice
- `"female"`, `"amy"` → Female voice

## Model Information

- **TTS**: Uses system-native voices via pyttsx3
- **STT**: Uses Whisper "tiny" model (~39MB)
- **Total memory usage**: ~100-200MB
- **Startup time**: 5-10 seconds (Whisper model loading)

## Integration with Talk Buddy

This server is designed to be launched as a child process by the main Electron application and provides the same API interface as the external Speechly service.