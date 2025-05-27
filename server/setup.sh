#!/bin/bash

# Main Setup Script for TalkBuddy
# This script orchestrates the setup of all required services

set -e

echo "==================================="
echo "TalkBuddy Complete Setup"
echo "==================================="
echo ""
echo "This script will set up all required services for TalkBuddy:"
echo "- PocketBase (backend database)"
echo "- Whisper (speech-to-text)"
echo "- Piper (text-to-speech)"
echo "- Ollama (language model)"
echo ""
read -p "Continue with setup? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Setup cancelled."
    exit 1
fi

# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Function to run a setup script
run_setup() {
    local script_name=$1
    local service_name=$2
    
    echo ""
    echo "==================================="
    echo "Setting up $service_name..."
    echo "==================================="
    
    if [ -f "$SCRIPT_DIR/$script_name" ]; then
        bash "$SCRIPT_DIR/$script_name"
    else
        echo "❌ Setup script not found: $script_name"
        echo "   Skipping $service_name setup."
    fi
}

# 1. Setup PocketBase
run_setup "setup-pocketbase.sh" "PocketBase"

# 2. Setup Database (migrations and seed data)
run_setup "setup-database.sh" "Database"

# 3. Setup Whisper (STT)
run_setup "setup-whisper.sh" "Whisper STT"

# 4. Setup Piper (TTS)
run_setup "setup-piper.sh" "Piper TTS"

# 5. Setup Ollama (LLM)
run_setup "ollama-setup.sh" "Ollama LLM"

echo ""
echo "==================================="
echo "✅ TalkBuddy Setup Complete!"
echo "==================================="
echo ""
echo "All services have been set up. You can now:"
echo ""
echo "1. Start all services:"
echo "   cd $SCRIPT_DIR && ./start-all.sh"
echo ""
echo "2. Configure the client:"
echo "   cd ../client"
echo "   cp .env.example .env"
echo "   # Edit .env with your server URLs"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "For production deployment, remember to:"
echo "- Set up proper domain names with HTTPS"
echo "- Configure CORS policies"
echo "- Set up authentication (if needed)"
echo "- Use a process manager like systemd or pm2"
echo ""
echo "Happy conversing with TalkBuddy! 🗣️"