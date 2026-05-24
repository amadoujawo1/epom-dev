#!/bin/bash
# ePOM Tactical Node - Linux Start Script
echo "Starting ePOM Backend with Gunicorn..."
cd "$(dirname "$0")"
# Try to run gunicorn via module invocation (safer)
python3 -m gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app || python -m gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app || gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app
