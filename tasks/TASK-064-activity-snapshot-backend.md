# TASK-064: Activity Snapshot — Backend

Status: DONE
Milestone: M22

## Goal
Provide the backend data for the shareable Activity Snapshot feature: a single
endpoint that aggregates activity (and optionally food/health) totals over an
arbitrary date range, plus an endpoint that turns those totals into a short
optional AI recap paragraph.

## Subtasks
- [ ] `GET /snapshot?from_date=&to_date=&include_food=false&include_health=false`
      — combined totals-only payload (no per-period breakdown; totals only per
      the M22 decision):
      - workouts: session_count, total_tonnage_kg
      - football: session_count, training_count, match_count, total_duration_minutes, avg_rpe
      - activity: session_count, total_duration_minutes, activity_types[]
      - meals (only if include_food): avg_daily_calories, days_with_logs, macro totals
      - health (only if include_health): avg_steps, avg_sleep, avg_resting_hr (only fields with data — never emit "no data" placeholders, same principle as M20)
- [ ] `POST /snapshot/summary` — accepts the same from_date/to_date/include_food/include_health,
      recomputes totals server-side (don't trust client-supplied numbers), feeds
      them to Gemini via a new `SNAPSHOT_SYSTEM` prompt matching the
      data-oriented/realistic tone from `briefing.py` (M20), returns a short
      recap paragraph. Synchronous, no caching — same pattern as `/briefing/chat`.
- [ ] Pydantic response schemas for both endpoints
- [ ] Reuse query patterns already in `workouts.py` / `football.py` / `activity.py` /
      `meals.py` insights endpoints where it stays clean; don't force a shared
      abstraction if direct per-type queries are simpler for a totals-only response

## Decisions
See `PROJECT_STATUS.md` → "Recent Decisions (M22 Planning — Activity Snapshot)"
for the product decisions this implements (use case, default data scope,
detail level, AI commentary, output formats).

## Blockers
None.

## Where we left off
Done. New `apps/api/app/snapshot.py`: `GET /snapshot` (totals-only, direct queries mirroring existing insights endpoints, no per-period breakdown) and `POST /snapshot/summary` (recomputes totals server-side, feeds to Gemini via new `SNAPSHOT_SYSTEM` prompt). Registered in `main.py`. Verified locally via docker-compose: totals endpoint correct with/without food+health toggles, summary endpoint produces a grounded, data-only paragraph via a real Gemini call.
