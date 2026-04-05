# TASK-004: Next.js Frontend + Health Check Page
Status: DONE
Milestone: M1

## Goal
Scaffold the Next.js app in `apps/web` with shadcn/ui, and implement a root page that fetches `GET /health` from the FastAPI backend and displays a status pill.

## Subtasks
- [x] `npx create-next-app` scaffold in `apps/web` (TypeScript, Tailwind, App Router)
- [x] Install shadcn/ui (init)
- [x] Root page (`app/page.tsx`) fetches `GET /health` from FastAPI (server component)
- [x] Display: green "DB connected" or red "DB error" status pill
- [x] `apps/web/Dockerfile` for production use
- [x] `NEXT_PUBLIC_API_URL` env var pointing to FastAPI
- [x] Add `web` + `api` services to `docker-compose.yml`

## Decisions
- Root page is a React Server Component — fetch happens server-side, no client JS needed
- `NEXT_PUBLIC_API_URL` defaults to `http://localhost:8000` for local dev; overridden in Docker via env
- Status pill uses a shadcn/ui `Badge` component (green/red variant)
- `create-next-app` flags: `--typescript --tailwind --app --no-src-dir --import-alias "@/*"`
- Both `web` and `api` Docker services added to `docker-compose.yml` in this task (depends on TASK-002 and TASK-003)

## Blockers
- Depends on TASK-002 (docker-compose base) and TASK-003 (FastAPI app + Dockerfile)

## Where we left off
Done. Node 22 installed via nvm (system had Node 18). Verification (docker compose up) left for manual run.
