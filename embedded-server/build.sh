#!/bin/bash

# Build script for embedded server
# Creates a standalone executable using PyInstaller

echo "Building embedded server executable..."

# Activate virtual environment
source venv/bin/activate

# Install PyInstaller if not already installed
pip install pyinstaller

# Create the executable
pyinstaller --onefile \
    --name server \
    --hidden-import=piper \
    --hidden-import=whisper \
    --hidden-import=flask \
    --hidden-import=flask_cors \
    --hidden-import=soundfile \
    --hidden-import=numpy \
    --add-data "models:models" \
    --distpath ../dist/embedded-server \
    server.py

echo "Build complete! Executable created at ../dist/embedded-server/server"

# Deactivate virtual environment
deactivate