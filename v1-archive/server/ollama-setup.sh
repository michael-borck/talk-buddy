#!/bin/bash

# Ollama Setup Script for TalkBuddy
# This script installs Ollama and downloads the llama3.2 model

set -e

echo "==================================="
echo "Ollama Setup for TalkBuddy"
echo "==================================="

# Check if running on Linux or macOS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="Linux"
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macOS"
else
    echo "❌ Unsupported operating system: $OSTYPE"
    echo "This script supports Linux and macOS only."
    exit 1
fi

echo "✅ Detected OS: $OS"

# Check if Ollama is already installed
if command -v ollama &> /dev/null; then
    echo "✅ Ollama is already installed"
    ollama --version
else
    echo "📦 Installing Ollama..."
    
    if [[ "$OS" == "Linux" ]]; then
        # Install on Linux
        curl -fsSL https://ollama.com/install.sh | sh
    elif [[ "$OS" == "macOS" ]]; then
        # Install on macOS
        echo "For macOS, please download and install Ollama from: https://ollama.com/download"
        echo "After installation, run this script again."
        exit 1
    fi
    
    echo "✅ Ollama installed successfully"
fi

# Start Ollama service (if not already running)
echo "🚀 Starting Ollama service..."
if [[ "$OS" == "Linux" ]]; then
    # Check if systemd service exists
    if systemctl is-active --quiet ollama; then
        echo "✅ Ollama service is already running"
    else
        echo "Starting Ollama service..."
        sudo systemctl start ollama
        sudo systemctl enable ollama
        echo "✅ Ollama service started and enabled"
    fi
else
    # On macOS, Ollama runs as an app
    echo "ℹ️  On macOS, Ollama runs as an application. Make sure it's running."
fi

# Wait for Ollama to be ready
echo "⏳ Waiting for Ollama to be ready..."
max_attempts=30
attempt=0
while ! curl -s http://localhost:11434/api/tags >/dev/null 2>&1; do
    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Ollama service failed to start after $max_attempts attempts"
        exit 1
    fi
    echo -n "."
    sleep 1
    ((attempt++))
done
echo ""
echo "✅ Ollama is ready"

# Check if llama3.2 model exists
echo "🔍 Checking for llama3.2 model..."
if ollama list | grep -q "llama3.2"; then
    echo "✅ llama3.2 model is already available"
else
    echo "📥 Downloading llama3.2 model (this may take a while)..."
    ollama pull llama3.2
    echo "✅ llama3.2 model downloaded successfully"
fi

# Test the model
echo "🧪 Testing llama3.2 model..."
response=$(echo "Say 'Hello, TalkBuddy is ready!' in exactly those words." | ollama run llama3.2 --verbose=false 2>/dev/null | head -n 1)
echo "Model response: $response"

echo ""
echo "==================================="
echo "✅ Ollama Setup Complete!"
echo "==================================="
echo ""
echo "Ollama is running at: http://localhost:11434"
echo "Model installed: llama3.2"
echo ""
echo "To test the API directly:"
echo "curl http://localhost:11434/api/generate -d '{"
echo '  "model": "llama3.2",'
echo '  "prompt": "Hello!",'
echo '  "stream": false'
echo "}'"
echo ""
echo "Note: For production use with TalkBuddy, you'll need to:"
echo "1. Configure CORS or use the ollama-proxy.py script"
echo "2. Set up proper authentication if needed"
echo "3. Configure Nginx or similar for HTTPS access"