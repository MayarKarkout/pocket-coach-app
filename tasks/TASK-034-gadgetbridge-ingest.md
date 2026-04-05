# TASK-034: Gadgetbridge Ingest API
Status: DONE
Milestone: M11

## Goal
Ingest endpoints for Gadgetbridge data — daily health snapshots and watch workouts.

## Subtasks
- [ ] `apps/api/app/gadgetbridge.py` with ingest logic + routes
- [ ] `POST /gadgetbridge/daily` — upsert daily health snapshot
- [ ] `POST /gadgetbridge/workout` — create watch workout (skip if source_id exists)
- [ ] Register router in main.py

## API Contract

### POST /gadgetbridge/daily
```json
{
  "date": "2026-03-29",
  "steps": 8432,
  "calories_active": 450,
  "resting_hr": 58,
  "hrv": 42.5,
  "spo2": 98.2,
  "stress_avg": 25,
  "sleep": {
    "duration_minutes": 420,
    "deep_minutes": 90,
    "light_minutes": 250,
    "rem_minutes": 60,
    "awake_minutes": 20,
    "score": 78
  }
}
```
Response: `{ "id": 1, "date": "2026-03-29", "created": true }`

### POST /gadgetbridge/workout
```json
{
  "source_id": "gb_workout_abc123",
  "started_at": "2026-03-29T09:00:00Z",
  "ended_at": "2026-03-29T10:05:00Z",
  "duration_minutes": 65,
  "workout_type": "STRENGTH_TRAINING",
  "avg_hr": 142,
  "max_hr": 178,
  "calories": 380
}
```
Response: `{ "id": 1, "triage_status": "pending", "suggested_category": "gym", "created": true }`
If duplicate source_id: `{ "id": 1, "triage_status": "...", "suggested_category": "...", "created": false }`

## Decisions
- Auth: same cookie-based auth as all other endpoints
- All fields except `date` (daily) / `source_id` + `workout_type` (workout) are optional
- Upsert on daily: update all fields on conflict
- Dedup on workout: if source_id already exists, return existing record, `created: false`
