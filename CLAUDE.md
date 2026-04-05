# PocketCoach — CLAUDE.md

## Project
Mobile-first PWA. Single user. Claude writes all code; Miro directs tasks and debugs Python.

**Stack:** Next.js (App Router) + Tailwind + shadcn/ui | FastAPI (Python) + SQLAlchemy + Alembic | PostgreSQL | Docker Compose + Cloudflare Tunnel

**Structure:** `apps/web` (frontend) · `apps/api` (backend) · `tasks/` (task docs) · `PROJECT_STATUS.md` (PM doc)

## Decision Authority
- **Miro decides:** anything product-facing — features, UX behaviour, data fields, scope changes
- **Claude decides:** implementation details, file structure, libraries, patterns
- When in doubt: ask Miro before building, not after

## Data Model
| Table | Key fields |
|---|---|
| users, sessions | auth |
| plans, plan_days, plan_exercises, supersets | training plan templates |
| workouts, workout_exercises, workout_sets | logged gym sessions |
| football_sessions | date, session_type, duration_minutes, rpe, notes, occurred_at |
| activity_sessions | date, activity_type, duration_minutes, notes, occurred_at |
| wellbeing_logs | date, log_type, severity, body_part, notes, occurred_at, FK→workout/football/activity |
| meal_logs | date, meal_type, notes, calories, occurred_at |

## Rules

**Architecture**
- `apps/web`: UI only — no business logic, calls backend via fetch
- `apps/api`: all logic, auth, DB, calculations
- `weightKg`: Decimal in DB, string in API responses
- LLM (M9): always behind `LLMProvider` interface

**Code**
- Python: type hints + Pydantic on all I/O + Black formatting
- TypeScript: strict mode, no `any`
- No defensive coding — no null guards, fallbacks, or error handling for cases that cannot happen. Trust the framework. Validate only at system boundaries (user input, external APIs).
- No over-engineering — solve exactly what's asked, nothing more
- Tests: pytest only, for metric calculations. No UI or integration tests.

**Established patterns**
- `from datetime import date as Date` — always alias in Python to avoid Pydantic field shadowing
- PATCH endpoints use `model_fields_set` to distinguish "not sent" vs "explicitly null"
- Server components fetch data; client components handle interactivity
- `apiServerFetch` (with cookie forwarding) for server-side fetches; `apiFetch` for client-side
- Event times stored as `occurred_at: datetime | null` (UTC); displayed via `toLocaleTimeString()`

## Workflow (always, without being asked)

**Session start:** read `PROJECT_STATUS.md`, then any relevant task doc.

**Every task:** create `tasks/TASK-XXX-name.md` before writing code.
```
# TASK-XXX: Title
Status: IN PROGRESS | DONE | BLOCKED
Milestone: MX
## Goal
## Subtasks
- [ ] item
## Decisions
## Blockers
## Where we left off
```

**Subagents:** 3+ independent subtasks → spawn subagents automatically. No approval needed.

**Session end:** update `PROJECT_STATUS.md` — milestone status, what's done, what's next, open decisions.

**Migrations:** never run automatically — always run manually after deploying DB changes:
```bash
docker exec pocket-coach-app-api-1 alembic upgrade head
```
See `docs/docker-troubleshooting.md` for Docker/port issues.

## Roadmap
M1 Skeleton+DB · M2 Auth · M3 Plans · M4 Workouts · M5 Events · M6 Food · M7 Insights · M8 Today · M9 LLM
