#!/bin/bash
# ePOM Tactical Node - Linux Start Script
echo "Starting ePOM Backend with Gunicorn..."
cd "$(dirname "$0")"
gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app
