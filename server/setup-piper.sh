#!/bin/bash

# Setup script for Piper TTS
# This installs Piper in a virtual environment with a good quality voice

echo "Setting up Piper TTS..."

# Create virtual environment
echo "Creating virtual environment..."
python3 -m venv piper-venv

# Activate virtual environment
source piper-venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install flask flask-cors

# Download Piper binary (choose architecture)
echo "Downloading Piper binary..."
ARCH=$(uname -m)
if [ "$ARCH" = "x86_64" ]; then
    wget https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz
    tar -xzf piper_linux_x86_64.tar.gz
    rm piper_linux_x86_64.tar.gz
elif [ "$ARCH" = "aarch64" ]; then
    wget https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_aarch64.tar.gz
    tar -xzf piper_linux_aarch64.tar.gz
    rm piper_linux_aarch64.tar.gz
else
    echo "Unsupported architecture: $ARCH"
    exit 1
fi

# Make piper executable
chmod +x piper/piper

# Create voices directory
mkdir -p piper-voices

# Download English voices
echo "Downloading English voice models..."
cd piper-voices

# Download female voice (Southern English)
echo "Downloading female voice..."
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/southern_english_female/low/en_GB-southern_english_female-low.onnx.json

# Download male voice (Alan)
echo "Downloading male voice..."
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/low/en_GB-alan-low.onnx
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/en/en_GB/alan/low/en_GB-alan-low.onnx.json

cd ..

echo "Piper setup complete!"
echo "To start the Piper server, run: source piper-venv/bin/activate && python piper-server.py"