#!/bin/bash

echo "Starting TalkBuddy services..."

# Start PocketBase in background
echo "Starting PocketBase on port 38990..."
./pocketbase serve --http="192.168.20.120:38990" &
POCKETBASE_PID=$!

# Give PocketBase time to start
sleep 2

# Start Whisper server
echo "Starting Whisper server on port 38991..."
source whisper-venv/bin/activate
python whisper-server.py &
WHISPER_PID=$!

# Give Whisper time to start
sleep 2

# Start Piper TTS server
echo "Starting Piper TTS server on port 38992..."
source piper-venv/bin/activate
python piper-server.py &
PIPER_PID=$!

# Give Piper time to start
sleep 2

# Start Ollama proxy server (using whisper-venv which has Flask)
echo "Starting Ollama CORS proxy on port 38993..."
source whisper-venv/bin/activate
pip install requests >/dev/null 2>&1  # Install requests if not already there
python ollama-proxy.py &
OLLAMA_PROXY_PID=$!

echo ""
echo "Services started:"
echo "- PocketBase: http://192.168.20.120:38990 (PID: $POCKETBASE_PID)"
echo "- Whisper API: http://0.0.0.0:38991 (PID: $WHISPER_PID)"
echo "- Piper TTS: http://0.0.0.0:38992 (PID: $PIPER_PID)"
echo "- Ollama Proxy: http://0.0.0.0:38993 (PID: $OLLAMA_PROXY_PID)"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $POCKETBASE_PID $WHISPER_PID $PIPER_PID $OLLAMA_PROXY_PID; exit" INT
wait
