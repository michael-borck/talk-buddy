#!/bin/bash

echo "Setting up Whisper server..."

# Create Python virtual environment
python3 -m venv whisper-venv

# Activate virtual environment
source whisper-venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install requirements
pip install -r requirements.txt

echo "Setup complete!"
echo ""
echo "To run the Whisper server:"
echo "1. Activate the virtual environment: source whisper-venv/bin/activate"
echo "2. Run the server: python whisper-server.py"
echo ""
echo "The server will run on http://localhost:8091"
echo "PocketBase runs on http://localhost:8090"