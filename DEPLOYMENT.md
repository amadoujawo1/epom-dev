# ePOM Production Deployment Guide

This document outlines the steps to deploy the ePOM Tactical Node to a production environment.

## 1. Prerequisites
- Python 3.8+
- Node.js 18+ (for building)
- (Recommended) PostgreSQL database

## 2. Environment Setup
1. Copy `.env.production` to `.env` in the `server` directory.
2. Update the `SECRET_KEY` and `JWT_SECRET_KEY` with secure, random strings.
3. If using PostgreSQL, set the `DATABASE_URL`.

## 3. Frontend Build
Ensure the latest frontend is built:
```bash
cd client
npm install
npm run build
```

## 4. Server Setup
Create a virtual environment and install production dependencies:
```bash
cd server
python -m venv venv
# Windows
.\venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
```

## 5. Running in Production

### Windows (using Waitress)
```bash
waitress-serve --port=8000 wsgi:app
```

### Linux (using Gunicorn)
```bash
gunicorn --bind 0.0.0.0:8000 --workers 4 wsgi:app
```

## 6. Security Checklist
- [ ] Set `DEBUG=False` in `.env`
- [ ] Use a strong `SECRET_KEY`
- [ ] Configure `CORS_ORIGINS` to your production domain
- [ ] Ensure the server is behind a reverse proxy (like Nginx) for SSL/HTTPS.
