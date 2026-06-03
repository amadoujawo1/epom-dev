import sys
import os

# Get the absolute path to the server directory
server_dir = os.path.dirname(os.path.abspath(__file__))

# Ensure the server directory is in the Python path (multiple methods for reliability)
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

# Also add parent directory in case imports need it
parent_dir = os.path.dirname(server_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

print(f"[WSGI] Server directory: {server_dir}")
print(f"[WSGI] Python path: {sys.path[:3]}")

try:
    from app import create_app
    print("[WSGI] Successfully imported create_app from app module")
except ImportError as e:
    print(f"[WSGI] Import error: {e}")
    print(f"[WSGI] Server directory exists: {os.path.exists(server_dir)}")
    print(f"[WSGI] app.py exists: {os.path.exists(os.path.join(server_dir, 'app.py'))}")
    raise

app = create_app()
print("[WSGI] Flask app created successfully")
