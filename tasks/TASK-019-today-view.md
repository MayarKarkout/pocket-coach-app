# TASK-019: Today View
Status: IN PROGRESS
Milestone: M8

## Goal
Build the Today view — a dashboard showing today's logged events and 7-day rolling stats.

## Subtasks
- [x] Backend: `GET /today` endpoint in `apps/api/app/today.py`
- [x] Backend: Register router in `main.py`
- [x] Frontend: Replace stub `apps/web/app/today/page.tsx` with full server component

## Decisions
- `occurred_at` is used as sort key for events (nulls last), then `created_at` as tiebreak
- For workouts, `started_at` is treated as the `occurred_at` equivalent for sorting
- `avg_daily_calories` averages daily totals (not per-meal), returns null if no calorie data at all
- `sessions` counts workouts + football + activity (not wellbeing or meals)
- Today page is a read-only server component (no interactivity needed for M8)

## Blockers
None

## Where we left off
Task completed — both backend endpoint and frontend page implemented.
