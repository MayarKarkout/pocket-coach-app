# TASK-009: Plans API
Status: DONE
Milestone: M3

## Goal
CRUD endpoints for Plan, PlanDay, PlanExercise. All routes require auth.

## Subtasks
- [x] plans.py router with all endpoints
- [x] Register router in main.py

## Endpoints
- GET    /plans              — list all plans
- POST   /plans              — create plan
- GET    /plans/{id}         — get plan with days+exercises
- PATCH  /plans/{id}         — update plan name
- DELETE /plans/{id}         — delete plan (cascades)
- POST   /plans/{id}/activate — set as active (deactivates others)
- POST   /plans/{id}/days          — add day
- PATCH  /plans/{id}/days/{day_id} — update day label
- DELETE /plans/{id}/days/{day_id} — delete day (cascades)
- POST   /plans/{id}/days/{day_id}/reorder — move day up/down
- POST   /plans/{id}/days/{day_id}/exercises          — add exercise
- PATCH  /plans/{id}/days/{day_id}/exercises/{ex_id}  — update exercise
- DELETE /plans/{id}/days/{day_id}/exercises/{ex_id}  — delete exercise
- POST   /plans/{id}/days/{day_id}/exercises/{ex_id}/reorder — move exercise up/down

## Decisions
None

## Blockers
None

## Where we left off
Starting fresh.
