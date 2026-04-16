# TASK-046: Backend Query Optimisation

Status: DONE
Milestone: M14

## Goal
Make API endpoints faster by fixing N+1 queries, adding DB indexes, parallelizing
sequential queries, filtering Log endpoint by date server-side, and caching LLM context.

## Subtasks
- [x] Add `index=True` to all `date` columns + Alembic migration
- [x] Fix N+1 in gym insights with `selectinload`
- [x] Parallelize Today endpoint's 9 sequential queries
- [x] Add `date` query param to Log endpoints (football, activity, wellbeing, meals) for server-side filtering
- [x] Update Log frontend to pass `?date=` param instead of loading all records
- [x] Cache LLM context for the day (don't rebuild ~70 queries on every chat message)

## Decisions
- LLM context cache: in-memory dict keyed by date string, invalidated at midnight
  (same logic as briefing cache). Simple module-level dict, no external cache needed.
- Log endpoints: add optional `date` query param; when provided, filter server-side
- Migration: 0013_date_indexes
