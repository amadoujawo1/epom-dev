#!/bin/bash
# ePOM Tactical Node - Build Script
echo "Building ePOM Frontend..."
cd "$(dirname "$0")/client"
npm install
npm run build
echo "Build complete."
