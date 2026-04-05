# TASK-001: Monorepo Scaffold
Status: DONE
Milestone: M1

## Goal
Set up the pnpm monorepo structure with `apps/web` and `apps/api` directories, root config files, and a root `.gitignore`.

## Subtasks
- [x] `pnpm-workspace.yaml` at root listing `apps/*`
- [x] `package.json` at root (private, engines, pnpm version)
- [x] `apps/web/` directory (Next.js placeholder)
- [x] `apps/api/` directory (FastAPI placeholder)
- [x] `tasks/` directory (already exists)
- [x] Root `.gitignore` covering Node, Python, Docker, .env

## Decisions
- pnpm workspaces chosen for monorepo tooling (consistent with Next.js ecosystem)
- `apps/api` is Python/FastAPI — no `package.json` inside it
- `.gitignore` must cover: `node_modules`, `__pycache__`, `.env`, Docker volumes, `.next`, `dist`

## Blockers
- None

## Where we left off
Done.
