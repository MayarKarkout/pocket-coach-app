# TASK-003: FastAPI Backend + /health Endpoint
Status: DONE
Milestone: M1

## Goal
Bootstrap the FastAPI app in `apps/api` with SQLAlchemy DB connection and a `/health` endpoint that runs `SELECT 1` against PostgreSQL.

## Subtasks
- [x] `apps/api/pyproject.toml` (or `requirements.txt`) with fastapi, uvicorn, sqlalchemy, alembic, psycopg2-binary, python-dotenv
- [x] `apps/api/app/main.py` — FastAPI app
- [x] `apps/api/app/db.py` — SQLAlchemy engine + session factory reading `DATABASE_URL`
- [x] `GET /health` endpoint: runs `SELECT 1` via SQLAlchemy, returns `{"status":"ok","db":"connected"}`
- [x] `apps/api/alembic.ini` + `apps/api/alembic/` scaffold (no migrations yet, just init)
- [x] `apps/api/Dockerfile` for production use
- [ ] Verify: `uvicorn app.main:app` returns healthy response

## Decisions
- `pyproject.toml` preferred over `requirements.txt` for modern Python packaging
- SQLAlchemy used directly (no ORM abstraction layer yet — add when models are defined in M3+)
- `alembic init` run inside `apps/api/` so `alembic.ini` sits alongside `app/`
- `/health` returns 200 on success, 503 on DB failure
- `DATABASE_URL` loaded from environment via `python-dotenv` (reads root `.env`)

## Blockers
- None

## Where we left off
All files created. Verification (uvicorn + live DB) left for manual run.
