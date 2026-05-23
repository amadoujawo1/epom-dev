# ePOM Server

Minimal Flask backend for the private office management system.

Setup

1. Create a virtualenv and install dependencies:

```powershell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

2. Run:

```powershell
python app.py
```

Endpoints

- `GET /api/ping` - health check
- `POST /api/auth/login` - simple auth (demo)
- `GET/POST /api/personnel` - personnel list/add (demo)

- `GET/POST /api/documents` - documents
- `GET/POST /api/actions` - actions
- `GET/POST /api/events` - events

Database (Postgres) setup

Set `DATABASE_URL` to a Postgres URI, for example:

```
export DATABASE_URL=postgresql://user:pass@localhost:5432/epom
```

To initialize the database and run migrations:

```powershell
cd server
venv\Scripts\Activate.ps1
pip install -r requirements.txt
flask db init
flask db migrate -m "init"
flask db upgrade
```

If `DATABASE_URL` is not set, the app will fall back to a local SQLite file `data.db`.

