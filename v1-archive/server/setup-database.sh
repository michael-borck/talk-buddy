#!/bin/bash

# Setup script for PocketBase database
# This initializes PocketBase with migrations and seed data

echo "Setting up TalkBuddy database..."

# Check if PocketBase is already running
if lsof -Pi :8090 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ PocketBase is already running on port 8090"
else
    echo "Starting PocketBase..."
    ./pocketbase serve --http="127.0.0.1:8090" &
    POCKETBASE_PID=$!
    
    # Wait for PocketBase to start
    echo "Waiting for PocketBase to start..."
    sleep 5
    
    # Check if it started successfully
    if ! curl -s http://127.0.0.1:8090/api/health >/dev/null; then
        echo "❌ Failed to start PocketBase"
        exit 1
    fi
    echo "✅ PocketBase started (PID: $POCKETBASE_PID)"
fi

# Run migrations (PocketBase does this automatically)
echo "✅ Migrations applied automatically by PocketBase"

# Import initial data
echo ""
echo "Importing initial scenario data..."
node import-data.js

echo ""
echo "Database setup complete!"
echo ""
echo "You can now:"
echo "1. Access PocketBase Admin at http://127.0.0.1:8090/_/"
echo "2. Create an admin account on first visit"
echo "3. View and edit scenarios in the admin panel"
echo ""

# If we started PocketBase, offer to keep it running
if [ ! -z "$POCKETBASE_PID" ]; then
    echo "PocketBase is running in the background (PID: $POCKETBASE_PID)"
    echo "To stop it: kill $POCKETBASE_PID"
fi