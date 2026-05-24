#!/bin/bash
# ePOM Tactical Node - Build Script
set -e

echo "Building ePOM Frontend..."
cd "$(dirname "$0")/client"
npm install
npm run build
cd ..

echo "Installing Backend Dependencies..."
pip install -r server/requirements.txt

echo "Build complete."
