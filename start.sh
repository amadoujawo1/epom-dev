#!/bin/bash
# ePOM Tactical Node - Root Delegate Script
echo "Starting ePOM Backend..."
cd "$(dirname "$0")/server"
chmod +x start.sh

# Try to run gunicorn directly, then via python module
if command -v gunicorn >/dev/null 2>&1; then
  gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app
else
  python3 -m gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app || python -m gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app
fi
