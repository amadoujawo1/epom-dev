#!/bin/bash
# ePOM Tactical Node - Root Delegate Script
echo "Delegating to server/start.sh..."
cd "$(dirname "$0")/server"
chmod +x start.sh
./start.sh
