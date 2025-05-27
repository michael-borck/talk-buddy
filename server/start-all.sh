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

echo ""
echo "Services started:"
echo "- PocketBase: http://192.168.20.120:38990 (PID: $POCKETBASE_PID)"
echo "- Whisper API: http://0.0.0.0:38991 (PID: $WHISPER_PID)"
echo "- Piper TTS: http://0.0.0.0:38992 (PID: $PIPER_PID)"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $POCKETBASE_PID $WHISPER_PID $PIPER_PID; exit" INT
wait
