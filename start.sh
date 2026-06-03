#!/bin/bash
# ePOM Tactical Node - Root Delegate Script
echo "Starting ePOM Backend..."

# Get the absolute path to the server directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SERVER_DIR="$SCRIPT_DIR/server"

# Change to server directory
cd "$SERVER_DIR" || { echo "[!] Failed to change to server directory: $SERVER_DIR"; exit 1; }

# Set PYTHONPATH to include the server directory
export PYTHONPATH="$SERVER_DIR:$PYTHONPATH"

echo "[*] Working directory: $(pwd)"
echo "[*] Python path: $PYTHONPATH"
echo "[*] Files in server directory:"
ls -la

# Try to run gunicorn directly, then via python module
if command -v gunicorn >/dev/null 2>&1; then
  echo "[*] Using gunicorn from PATH"
  gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app
else
  echo "[*] Using python3 -m gunicorn"
  python3 -m gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app || python -m gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app
fi
