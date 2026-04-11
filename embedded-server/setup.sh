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

# -- done ----------------------------------------------------------------
echo ""
echo "[setup] Done. Embedded speech server is ready."
echo "[setup] You can now enable 'Embedded (Offline)' in Talk Buddy Settings."
