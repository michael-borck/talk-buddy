#!/usr/bin/env bash
#
# Talk Buddy — embedded speech server setup.
#
# Creates a Python virtual environment and installs the dependencies
# needed to run the offline TTS/STT server (server.py). Run this once
# per machine before enabling the "Embedded (Offline)" provider in
# Talk Buddy settings.
#
# This script is idempotent — re-running it on an existing venv will
# update packages in place rather than fail.
#
# Requirements: python3 (3.10+ recommended), pip. On macOS: `brew
# install python3`. On Debian/Ubuntu: `sudo apt install python3 python3-venv`.

set -e

# Resolve the directory this script lives in so it works regardless of
# the caller's CWD.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "[setup] Talk Buddy embedded server setup"
echo "[setup] Working directory: $SCRIPT_DIR"

# -- Python check --------------------------------------------------------
if ! command -v python3 >/dev/null 2>&1; then
  echo "[setup] ERROR: python3 not found on PATH."
  echo "[setup] Install Python 3.10+ and re-run this script."
  echo "[setup]   macOS:    brew install python3"
  echo "[setup]   Debian:   sudo apt install python3 python3-venv python3-pip"
  echo "[setup]   Windows:  https://www.python.org/downloads/"
  exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "[setup] Found python3 version $PYTHON_VERSION"

# -- venv ----------------------------------------------------------------
if [ ! -d "venv" ]; then
  echo "[setup] Creating virtual environment at venv/ ..."
  python3 -m venv venv
else
  echo "[setup] venv/ already exists — will update packages in place."
fi

# -- activation ----------------------------------------------------------
# shellcheck disable=SC1091
source venv/bin/activate

# -- pip upgrade ---------------------------------------------------------
echo "[setup] Upgrading pip ..."
pip install --upgrade pip >/dev/null

# -- requirements --------------------------------------------------------
if [ ! -f "requirements.txt" ]; then
  echo "[setup] ERROR: requirements.txt not found in $SCRIPT_DIR"
  exit 1
fi

echo "[setup] Installing dependencies from requirements.txt ..."
echo "[setup] (This can take several minutes on first install — it downloads"
echo "[setup]  ~500MB of model + ML wheels. Subsequent runs are cached.)"
pip install -r requirements.txt

# -- Piper voice models --------------------------------------------------
# The embedded server's TTS uses Piper ONNX voice files. Mirrors what the
# release workflow does in .github/workflows/build.yml. Without these,
# /health reports services.tts=false even though the server is "running."
mkdir -p models
PIPER_BASE="https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en"

# Downloads are verified against pinned SHA-256s (same pins as
# server.py) so a compromised upstream can't hand us a poisoned model.
sha256_check() {
  local file="$1" expected="$2" actual
  if command -v sha256sum >/dev/null 2>&1; then
    actual=$(sha256sum "$file" | awk '{print $1}')
  else
    actual=$(shasum -a 256 "$file" | awk '{print $1}')
  fi
  [ "$actual" = "$expected" ]
}

download_if_missing() {
  local dest="$1"
  local url="$2"
  local sha="$3"
  if [ -s "$dest" ]; then
    echo "[setup] OK $(basename "$dest") (already present)"
  else
    echo "[setup] Downloading $(basename "$dest") ..."
    curl -fL --progress-bar "$url" -o "$dest" || {
      echo "[setup] ERROR: failed to download $url"
      rm -f "$dest"
      exit 1
    }
    sha256_check "$dest" "$sha" || {
      echo "[setup] ERROR: checksum mismatch for $(basename "$dest") — refusing to use it"
      rm -f "$dest"
      exit 1
    }
  fi
}

download_if_missing "models/en_GB-alan-low.onnx"      "$PIPER_BASE/en_GB/alan/low/en_GB-alan-low.onnx"      "a1f60584620a2bed203de823d08f5abb336fb15f3d6f33f8c341e3e2cabf5dde"
download_if_missing "models/en_GB-alan-low.onnx.json" "$PIPER_BASE/en_GB/alan/low/en_GB-alan-low.onnx.json" "c8164cc04b6ce102c651ce4a1e788e8429fa638501fca0723860718d4b44637e"
download_if_missing "models/en_US-amy-low.onnx"       "$PIPER_BASE/en_US/amy/low/en_US-amy-low.onnx"       "a5a91abb7de0f104358a25aded480ddacf1ff0762886325886ec406a2e86aab3"
download_if_missing "models/en_US-amy-low.onnx.json"  "$PIPER_BASE/en_US/amy/low/en_US-amy-low.onnx.json"  "2250a9a605b8dc35a116717fadc5056695dd809e34a15d02f72a0f52d53d3ebb"

# -- done ----------------------------------------------------------------
echo ""
echo "[setup] Done. Embedded speech server is ready."
echo "[setup] You can now enable 'Embedded (Offline)' in Talk Buddy Settings."
