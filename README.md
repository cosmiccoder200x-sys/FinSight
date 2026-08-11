# FinSight

FinSight is a full-stack personal finance & investing assistant. Track holdings, log
expenses, get a financial-health score, simulate investment scenarios, and chat with an
AI copilot — plus an admin dashboard for platform overview and user management.

## Stack

- **Frontend**: React 18 + TypeScript + Vite, Tailwind CSS, React Router, Recharts, Lucide icons
- **Backend**: Python 3.11 + FastAPI, SQLAlchemy 2.0, Pydantic v2, JWT auth, Alembic-style init
- **AI**: OpenRouter (any model, e.g. `openai/gpt-4o-mini`) with a local-analysis fallback
- **Market data**: Demo provider (simulated, labeled) or Finnhub
- **Database**: PostgreSQL 16 (Docker) or SQLite (local quick-start)
- **Infra**: Docker Compose (db + backend + frontend behind nginx)

## Quick start (Docker)

> Requires Docker with Compose v2.

```bash
cp .env.example .env   # fill in OPENROUTER_API_KEY to enable the AI copilot
docker compose up --build
```

- Frontend: http://localhost:5173
- API docs (Swagger UI): http://localhost:8000/docs
- Seed users created on first boot (see `.env.example`):
  - admin: `admin@finsight.app` / `admin1234`
  - demo: `demo@finsight.app` / `demo1234`

## Local development (no Docker)

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux
pip install -r requirements.txt

# Quick start with SQLite (no Postgres needed)
$env:DATABASE_URL = "sqlite:///./finsight.db"   # PowerShell
# export DATABASE_URL="sqlite:///./finsight.db" # bash

uvicorn app.main:app --reload --port 8000
```

Backend runs at http://localhost:8000 (API docs at `/docs`).

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at http://localhost:5173 and proxies `/api` to the backend.

## Tests

```bash
cd backend
.venv\Scripts\activate
$env:DATABASE_URL = "sqlite:///:memory:"
pytest -q
```

Run the frontend type-check + production build:

```bash
cd frontend
npm run build
```

## Environment variables

See [`.env.example`](.env.example) for every setting with comments. Key ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy database URL. |
| `JWT_SECRET` | Signing secret for auth tokens. |
| `OPENROUTER_API_KEY` | Enables the AI copilot. Empty → local fallback. |
| `MARKET_DATA_PROVIDER` | `demo` or `finnhub`. |
| `DEMO_MODE` | When true, market data is simulated and labeled as such. |

## Project layout

```
backend/
  app/
    api/          # FastAPI routers (auth, portfolio, expenses, market, health, AI, admin)
    models/       # SQLAlchemy models
    schemas/      # Pydantic schemas
    services/     # market data, analytics, health scoring, simulator, AI copilot
    core/         # config, security, database
    main.py       # app factory, CORS, seed script
  tests/          # pytest suite
frontend/
  src/
    components/   # UI kit, charts, layout
    pages/        # auth, dashboard, portfolio, markets, expenses, health, AI, admin
    services/     # API client + type-safe wrappers
    hooks/        # useApi, useMutation, useAuth
    types/        # shared TypeScript types
```