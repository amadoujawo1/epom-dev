#!/bin/bash
# ePOM Tactical Node - Root Delegate Script
set -e  # Exit on any error

echo "[START] Starting ePOM Backend..."

# Get the absolute path to the server directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"

echo "[START] Script directory: $SCRIPT_DIR"
echo "[START] Server directory: $SERVER_DIR"

# Verify server directory exists
if [ ! -d "$SERVER_DIR" ]; then
  echo "[ERROR] Server directory not found: $SERVER_DIR"
  exit 1
fi

# Verify app.py exists
if [ ! -f "$SERVER_DIR/app.py" ]; then
  echo "[ERROR] app.py not found in $SERVER_DIR"
  exit 1
fi

# Verify wsgi.py exists
if [ ! -f "$SERVER_DIR/wsgi.py" ]; then
  echo "[ERROR] wsgi.py not found in $SERVER_DIR"
  exit 1
fi

# Change to server directory
cd "$SERVER_DIR" || { echo "[ERROR] Failed to change to server directory: $SERVER_DIR"; exit 1; }

echo "[START] Changed to directory: $(pwd)"

# Set PYTHONPATH to include the server directory
export PYTHONPATH="$SERVER_DIR:$PYTHONPATH"

echo "[START] PYTHONPATH: $PYTHONPATH"
echo "[START] Files in server directory:"
ls -la | head -20

# Try to run gunicorn
echo "[START] Attempting to start gunicorn..."

if command -v gunicorn >/dev/null 2>&1; then
  echo "[START] Using gunicorn from PATH"
  gunicorn --pythonpath "$SERVER_DIR" --bind 0.0.0.0:8000 --workers 4 --timeout 120 wsgi:app
else
  echo "[START] Using python3 -m gunicorn"
  python3 -m gunicorn --pythonpath "$SERVER_DIR" --bind 0.0.0.0:8000 --workers 4 --timeout 120 wsgi:app || python -m gunicorn --pythonpath "$SERVER_DIR" --bind 0.0.0.0:8000 --workers 4 --timeout 120 wsgi:app
fi
