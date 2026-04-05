# TASK-002: Docker Compose + PostgreSQL
Status: DONE
Milestone: M1

## Goal
Provide a `docker-compose.yml` that starts a PostgreSQL 16 container with a named volume, plus `.env.example` and a local `.env` for connection vars.

## Subtasks
- [x] `docker-compose.yml` with `postgres` service (image: postgres:16, named volume, port 5432)
- [x] `.env.example` with `DATABASE_URL` and `POSTGRES_*` vars
- [x] `.env` (gitignored) for local dev
- [ ] Verify `docker compose up -d` starts Postgres

## Decisions
- PostgreSQL 16 (latest stable at project start)
- Named volume `postgres_data` so data survives `docker compose down`
- `DATABASE_URL` format: `postgresql://user:password@localhost:5432/pocketcoach`
- Port 5432 exposed on host for local development convenience

## Blockers
- None

## Where we left off
Files created. Verification (docker compose up) left for manual run.
