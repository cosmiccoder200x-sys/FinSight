# FinSight contributor and deployment instructions

## Project overview

FinSight is a personal-finance application with a React/Vite frontend and a
FastAPI/Python API. The API currently uses SQLAlchemy with SQLite for local
development or PostgreSQL for Docker deployments. Cloudflare Workers serves the
frontend and can proxy `/api` requests to a separately hosted FinSight API.

## Development commands

- Frontend: `cd frontend; npm ci; npm run dev`
- Frontend production build: `cd frontend; npm run build`
- Backend dependencies: `cd backend; python -m pip install -r requirements.txt`
- Backend local API: `cd backend; uvicorn app.main:app --reload --port 8000`
- Backend tests: `cd backend; pytest -q`
- Local Cloudflare runtime: copy `frontend/.dev.vars.example` to
  `frontend/.dev.vars`, start the local API, then run `cd frontend; npm run cf:dev`.

PowerShell local backend configuration:

```powershell
$env:DATABASE_URL = "sqlite:///./finsight.db"
$env:DEMO_MODE = "true"
uvicorn app.main:app --reload --port 8000
```

## Architecture and deployment

- The React/Vite application is built into `frontend/dist` and served as a
  single-page application by Cloudflare Workers Static Assets.
- `frontend/src/worker.ts` proxies only `/api` and `/api/*` to the configured
  `API_ORIGIN`. The origin must be a fixed HTTPS origin in production. It is not
  a general-purpose user-controlled proxy.
- The FastAPI API and its SQLAlchemy/PostgreSQL database are not deployed by
  this Worker configuration. Keep API hosting and data storage configured
  separately; do not point a production frontend at localhost.
- For Workers Builds with repository-root as the root directory, set the build
  command empty and the deploy command to
  `cd frontend && npm ci && npm run cf:deploy`. Alternatively set the root
  directory to `frontend`, build command to `npm run build`, and deploy command
  to `npx wrangler deploy`. Wrangler must run in `frontend`, where its
  `wrangler.jsonc` config and built `dist` assets are located.
- Deploying with `npm run cf:deploy` from `frontend` requires an authenticated
  Wrangler session and publishes publicly; do not run it without the owner's
  explicit production approval.
- Cloudflare API tokens, JWT secrets, database credentials, and third-party API
  keys must be configured as platform secrets/environment settings, never
  committed to Git.

## Coding and security standards

- Keep TypeScript strict and Python type hints consistent with existing code.
- Validate all user input on the server and scope database reads/writes to the
  authenticated user.
- Use parameterized SQL and existing authentication/authorization helpers.
- Do not log passwords, JWTs, API keys, financial records, or request bodies.
- Keep demo/simulated financial and market data clearly labelled.
- Report upstream/API failures explicitly; do not replace them with success
  shaped fallback data.
- Preserve existing local Vite development and Docker behavior when editing
  deployment configuration.
- Add or update focused tests for behavioral changes.

## CI requirements

Run the frontend production build, Wrangler deploy dry-run, and full backend
pytest suite before submitting changes. GitHub Actions runs these checks on
pushes and pull requests.
