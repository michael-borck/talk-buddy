#!/bin/bash

# TalkBuddy Development Server Startup Script

echo "🚀 Starting TalkBuddy..."

# Activate virtual environment
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

echo "📋 Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "📚 Installing dependencies..."
pip install -r requirements.txt

# Run the server
echo "🌐 Starting server at http://localhost:5001"
python main.py