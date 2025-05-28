# Whisper Speech-to-Text Setup

This guide explains how to set up OpenAI Whisper locally for speech-to-text functionality in TalkBuddy.

## Requirements

- Python 3.8 or higher
- 1-2 GB of free disk space (for model files)
- 4GB+ RAM recommended

## Installation

1. **Set up the Whisper server:**
   ```bash
   cd server
   ./setup-whisper.sh
   ```

2. **The setup script will:**
   - Create a Python virtual environment
   - Install Flask, Flask-CORS, and OpenAI Whisper
   - Download the Whisper base model (~74MB)

## Running the Services

### Option 1: Run Everything Together
```bash
cd server
./start-all.sh
```

This starts both PocketBase (port 8090) and Whisper (port 8091).

### Option 2: Run Separately

**Terminal 1 - PocketBase:**
```bash
cd server
./pocketbase serve
```

**Terminal 2 - Whisper:**
```bash
cd server
source whisper-venv/bin/activate
python whisper-server.py
```

## Whisper Models

The server uses the "base" model by default, which offers a good balance of speed and accuracy:

| Model | Size | Relative Speed | Accuracy |
|-------|------|----------------|----------|
| tiny  | 39M  | ~10x faster    | Good     |
| base  | 74M  | ~7x faster     | Better   |
| small | 244M | ~4x faster     | Good     |
| medium| 769M | ~2x faster     | Better   |
| large | 1.5G | 1x             | Best     |

To change models, edit `whisper-server.py` line 21:
```python
model = whisper.load_model("base")  # Change to "tiny", "small", etc.
```

## How It Works

1. **Browser Support Detection:**
   - Chrome/Edge: Uses native Web Speech API (fastest)
   - Firefox/Safari/Brave: Falls back to Whisper API

2. **Audio Flow:**
   - User holds push-to-talk button
   - Audio is recorded as WebM format
   - Sent to Whisper server as base64 or file upload
   - Whisper transcribes and returns text
   - Text is used for AI conversation

3. **Performance:**
   - First transcription may be slower (model loading)
   - Subsequent transcriptions are faster
   - Base model processes ~5 seconds of audio in ~1 second

## Troubleshooting

**"No module named whisper" error:**
- Make sure you activated the virtual environment:
  ```bash
  source whisper-venv/bin/activate
  ```

**"Connection refused" in browser:**
- Check that Whisper server is running on port 8091
- Check browser console for CORS errors

**Slow transcription:**
- First run downloads the model (one-time)
- Consider using "tiny" model for faster response
- CPU transcription is slower than GPU

**No audio detected:**
- Check microphone permissions in browser
- Ensure audio is being recorded (check blob size in console)

## API Endpoints

- `GET /health` - Check if server is running
- `POST /transcribe` - Transcribe audio (base64 or file)
- `GET /models` - List available models

## Testing

Test the Whisper server directly:
```bash
curl http://localhost:8091/health
```

## Notes

- Whisper runs entirely offline - no internet required after setup
- Audio is processed locally - privacy preserved
- The server can handle multiple concurrent requests
- For production, consider using Gunicorn instead of Flask dev server