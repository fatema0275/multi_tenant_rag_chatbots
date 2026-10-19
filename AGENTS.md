# AGENTS.md

SiteMind — a multi-tenant RAG chatbot. Four runtimes talk over HTTP; none share a process.

## Service map (ports and ownership)

| Runtime | Dir | Port | Role |
| --- | --- | --- | --- |
| Node API gateway | `backend/` | 5000 | Express REST API; owns Postgres access via Sequelize |
| Crawl service | `ml-service/` | 8001 | Flask + Celery; crawling, branding, admin analytics, widget API |
| Embedding/NLI service | `services/embedding-service/` | 5001 | FastAPI; sentence embeddings + entailment (NLI) checks |
| Web dashboard | `frontend/` | 3000 | React/Vite admin UI |
| Redis | — | 6379 | Celery broker (required by ml-service) |

### Call graph (verified from code)
- `backend` → `ml-service` via `CRAWL_BRIDGE_URL` (default `http://localhost:8001`).
- `backend` → `embedding-service` via `EMBEDDING_SERVICE_URL` (default `http://localhost:5001`) — embeddings in `backend/routes/chat.js`, NLI in `/nli/batch`.
- `ml-service` widget routes → `backend` via `BACKEND_INTERNAL_URL` / `NODE_BACKEND_URL` (default `http://localhost:5000`).
- `GET /static/widget-v1.js` is served by `backend` but proxied from the ml-service bridge.
- `frontend` dev server proxies `/api` and `/static` to `http://localhost:5000` (see `frontend/vite.config.js`).

## Running locally

Start order matters: Redis → Celery worker → Flask → embedding service → backend → frontend.

```powershell
# Redis (Docker alternative: make redis in ml-service)
docker run --rm -p 6379:6379 redis:7-alpine

# Crawl worker (required for any crawl job to actually run)
celery -A crawl_service.celery_app worker --loglevel=info --concurrency=4   # workdir: ml-service

python run.py                                    # ml-service Flask, :8001
uvicorn main:app --host 0.0.0.0 --port 5001      # services/embedding-service
npm run dev                                      # backend, :5000
npm run dev                                      # frontend, :3000
```

Prerequisites: Redis must be up for ml-service; Playwright Chromium (`python -m playwright install chromium`); system `tesseract-ocr` + `poppler-utils` for PDF/image OCR (see `DEPLOYMENT.md`). The embedding service downloads `all-MiniLM-L6-v2` and `cross-encoder/nli-distilroberta-base` on first run.

`ml-service/Makefile` is the canonical command list but assumes unix tools (`make`, `docker`, `find`) — on Windows run the underlying commands directly.

## Environment / secrets

`.env` files are gitignored and **not tracked**; only `*.env.example` are committed. Do not commit real `.env` values.

- `backend/.env`: `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`/`SUPABASE_ANON_KEY`/`SUPABASE_SERVICE_ROLE_KEY`, `GROQ_API_KEY` (chat answers), `GOOGLE_CLIENT_ID`, `GOOGLE_DRIVE_API_KEY`, `CRAWL_BRIDGE_URL`, `EMBEDDING_SERVICE_URL`.
- `ml-service/.env`: `DATABASE_URL`, `DIRECT_URL`, `REDIS_URL`, `FLASK_PORT`, `CRAWL_*` tunables, `GOOGLE_DRIVE_API_KEY`.
- `frontend/.env`: `VITE_API_BASE_URL`, `VITE_GOOGLE_CLIENT_ID`.

## Database (shared — be careful)

- `backend` (Sequelize) and `ml-service` (psycopg2) connect to the **same** Supabase Postgres (`DATABASE_URL`). Migrations are already applied to the shared DB.
- Many scripts mutate live data and are not isolated tests: `backend/scripts/*` (`seed_admin.js`, `apply_*.js`, `fix_*.js`, `clear_stuck_jobs.js`), `backend/test-api.js`, `ml-service/test_flask_admin_analytics.py`, `scripts/test*.js`. Run only against a throwaway DB unless you intend to change shared state.

## Testing reality

- No CI (`.github/` does not exist) and no unit-test runner wired up.
- `backend` `npm test` is the npm default stub. Real checks are ad-hoc scripts run with `node <file>.js`; several create real rows in the shared DB.
- `ml-service` `make test` runs `pytest tests/` but there is **no `tests/` directory** — it fails. `make lint` uses `ruff check crawl_service/ run.py`.
- `frontend` `npm run lint` fails: `eslint` is not in `devDependencies` and there is no eslint config.

## Layout gotchas

- Canonical backend service code is `backend/services/*`. `backend/src/services/*` are one-line re-exports (`module.exports = require('../../services/...')`) — edit the `backend/services/` originals.
- Handoff docs live in two places: `docs/` (analytics handoff, checklist) and `doc/` (per-module handoffs).
- `backend/migrations` has duplicate timestamp prefixes (`20260101000017` appears twice).
- `backend/config/config.js` logs `DATABASE_URL` on import and has no JWT/model config (models are under `backend/models/`).
- `ml-service/run.py` hardcodes `sys.path.insert(0, r"C:\Python312\lib\site-packages")` — machine-specific.
- Root `package-lock.json` is orphaned (there is no root `package.json`).
- `README.md` setup steps are partly stale (references `widget/`, `docs/` paths that don't match the tree). Trust the code and manifests over the README.

## Skills

Repo-local skills live in `.agents/skills/`:
- `project1-report` — regenerates the Project I report `.docx` from `report/content.md`; run via its `scripts/generate_report.py`.
- `prompt-handoff-summary` — generates technical handoff summaries.
