#!/bin/bash

echo "Starting TalkBuddy services..."

# Start PocketBase in background
echo "Starting PocketBase on port 8090..."
./pocketbase serve &
POCKETBASE_PID=$!

# Give PocketBase time to start
sleep 2

# Start Whisper server
echo "Starting Whisper server on port 8091..."
source whisper-venv/bin/activate
python whisper-server.py &
WHISPER_PID=$!

echo ""
echo "Services started:"
echo "- PocketBase: http://localhost:8090 (PID: $POCKETBASE_PID)"
echo "- Whisper API: http://localhost:8091 (PID: $WHISPER_PID)"
echo ""
echo "To stop all services, press Ctrl+C"

# Wait for Ctrl+C
trap "echo 'Stopping services...'; kill $POCKETBASE_PID $WHISPER_PID; exit" INT
wait