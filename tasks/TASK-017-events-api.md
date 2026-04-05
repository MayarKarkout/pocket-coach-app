# TASK-017: Events API
Status: DONE
Milestone: M5

## Goal
CRUD API for FootballSession, ActivitySession, and WellbeingLog.

## Subtasks
- [x] Football sessions router (list, create, get, patch, delete)
- [x] Activity sessions router (list, create, get, patch, delete)
- [x] Wellbeing logs router (list, create, get, patch, delete)
- [x] Register all routers in main.py

## Endpoints

### Football
- GET /football — list all, ordered by date desc
- POST /football — create
- GET /football/{id}
- PATCH /football/{id}
- DELETE /football/{id}

### Activity
- GET /activity — list all, ordered by date desc
- POST /activity — create
- GET /activity/{id}
- PATCH /activity/{id}
- DELETE /activity/{id}

### Wellbeing
- GET /wellbeing — list all, ordered by date desc
- POST /wellbeing — create
- GET /wellbeing/{id}
- PATCH /wellbeing/{id}
- DELETE /wellbeing/{id}

## Response shapes

### FootballSession
{ id, date, session_type, duration_minutes, rpe, notes, created_at }

### ActivitySession
{ id, date, activity_type, duration_minutes, notes, created_at }

### WellbeingLog
{ id, date, log_type, severity, body_part, notes, workout_id, football_session_id, activity_session_id, created_at }

## Notes
- date field: use `from datetime import date as Date` alias to avoid Pydantic shadowing
- PATCH uses model_fields_set pattern (same as workouts.py) to distinguish "not sent" vs "explicitly null"
- 404 on unknown id for all GET/PATCH/DELETE
