#!/bin/bash

# PocketBase setup script for TalkBuddy

echo "Setting up PocketBase for TalkBuddy..."

# Detect OS and architecture
OS=$(uname -s)
ARCH=$(uname -m)

# Map to PocketBase naming
if [ "$OS" = "Linux" ]; then
    OS="linux"
elif [ "$OS" = "Darwin" ]; then
    OS="darwin"
fi

if [ "$ARCH" = "x86_64" ]; then
    ARCH="amd64"
elif [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    ARCH="arm64"
fi

# Download URL
VERSION="0.23.7"
FILENAME="pocketbase_${VERSION}_${OS}_${ARCH}.zip"
URL="https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/${FILENAME}"

# Download PocketBase
if [ ! -f "pocketbase" ]; then
    echo "Downloading PocketBase v${VERSION} for ${OS}/${ARCH}..."
    curl -L -o pocketbase.zip "$URL"
    unzip pocketbase.zip
    rm pocketbase.zip
    chmod +x pocketbase
    echo "PocketBase downloaded successfully!"
else
    echo "PocketBase already exists."
fi

# Create initial directories
mkdir -p pb_data pb_migrations

echo "Setup complete! Run './pocketbase serve' to start the server."
echo "Admin UI will be available at: http://127.0.0.1:8090/_/"