# FinSight

FinSight is a full-stack personal finance & investing assistant. Track holdings, log
expenses, set savings goals, get a financial-health score, simulate investment scenarios,
and chat with an AI copilot — plus an admin dashboard for platform overview and user management.

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

## Cloudflare Workers frontend

The React/Vite single-page app can be served from Cloudflare Workers Static
Assets. The current FastAPI API and SQLAlchemy database are **not** part of this
Worker deployment: host the API separately and configure its public HTTPS origin
as `API_ORIGIN`. The Worker proxies same-origin `/api` requests to that fixed
origin. Do not set this to localhost in production.

### Local Cloudflare-runtime preview

1. Start the backend locally using the SQLite instructions above.
2. In `frontend`, copy `.dev.vars.example` to `.dev.vars` (PowerShell:
   `Copy-Item .dev.vars.example .dev.vars`).
3. Run `npm ci` once, then `npm run cf:dev` in `frontend`.
4. Open the Wrangler URL shown in the terminal (usually
   `http://localhost:8787`). This exercises the Worker proxy and SPA fallback
   locally; it does not publish anything.

### Git-connected deployment

The Worker configuration is in `frontend/wrangler.jsonc`; its entry point is
`frontend/src/worker.ts` and it serves the built `frontend/dist` directory.
Use Node.js 22 or newer when running Wrangler 4.
Before a production deployment:

1. Host the FastAPI API and its PostgreSQL database at a stable HTTPS origin.
   The current API is not backed by Cloudflare D1; moving it to D1 requires a
   deliberate database-layer migration.
2. In the existing Worker, open **Settings → Builds** and use either of these
   matching configurations:

   - **Recommended monorepo setup:** set **Root directory** to `frontend`,
     **Build command** to `npm run build`, and **Deploy command** to
     `npx wrangler deploy`.
   - **If Root directory must remain the repository root:** leave the build
     command empty and set **Deploy command** to
     `cd frontend && npm ci && npm run cf:deploy`. This command installs the
     frontend dependencies, builds Vite's `dist`, and runs Wrangler from the
     directory containing `wrangler.jsonc`.

   Do not run plain `npx wrangler deploy` from the repository root: it will not
   use `frontend/wrangler.jsonc` and can autoconfigure the source directory as a
   static site, publishing unbuilt `.tsx` source instead of the app.
   For production deployments, the Workers Builds **Deploy command** must be
   `npx wrangler deploy`, not `npx wrangler preview`. The latter creates a
   Wrangler Preview and requires the `previews` configuration block. This
   project includes that block; configure a preview-safe `API_ORIGIN` for
   Previews separately because Preview settings do not inherit production
   settings.
3. Set `API_ORIGIN` in the Worker's production environment to the API's HTTPS
   origin (scheme and host only; no path, query, or credentials). Add the same
   variable to preview environments if previews should reach an API.
4. Confirm production secrets, `DEMO_MODE`, CORS, database backups, and API
   health before publishing. Do not use the seeded demo credentials as
   production credentials.

For a direct CLI deployment, first authenticate Wrangler with `npx wrangler
login`, configure `API_ORIGIN` in the Cloudflare dashboard, and only then run
`npm run cf:deploy` from `frontend`. That command publishes the Worker; it is
intentionally not part of CI.

Static asset requests are free and unlimited under Workers Static Assets.
Requests routed through the API proxy invoke a Worker. Cloudflare's current
Workers Free plan includes 100,000 Worker requests/day; Workers Paid starts at
USD $5/month. D1 is not used by this deployment. Review [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)
and [Static Assets billing](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/)
before enabling paid usage.

## Environment variables

See [`.env.example`](.env.example) for every setting with comments. Key ones:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | SQLAlchemy database URL. |
| `JWT_SECRET` | Signing secret for auth tokens. |
| `OPENROUTER_API_KEY` | Enables the AI copilot. Empty → local fallback. |
| `MARKET_DATA_PROVIDER` | `demo` or `finnhub`. |
| `DEMO_MODE` | When true, market data is simulated and labeled as such. |
| `VITE_SUPPORT_PAYMENT_URL` | Optional Stripe Payment Link (`https://buy.stripe.com/...`) for voluntary one-time or recurring support. Leave empty to hide the support option. |

To accept voluntary support, create a Stripe Payment Link in the Stripe Dashboard and
set `VITE_SUPPORT_PAYMENT_URL` in `.env` before building the frontend. The checkout is
hosted by Stripe; FinSight does not process or store payment details. The link is
optional and does not unlock paid features or guarantee contributions.

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
    pages/        # auth, dashboard, portfolio, markets, expenses, goals, health, AI, admin
    services/     # API client + type-safe wrappers
    hooks/        # useApi, useMutation, useAuth
    types/        # shared TypeScript types
```