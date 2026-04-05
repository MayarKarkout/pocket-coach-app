# TASK-035: Gadgetbridge Triage Logic
Status: DONE
Milestone: M11

## Goal
Endpoints to list pending watch workouts and action triage decisions.

## Subtasks
- [ ] `GET /gadgetbridge/workouts/pending` — list pending watch workouts
- [ ] `POST /gadgetbridge/workouts/{id}/triage` — action: merge | new_workout | new_activity | dismiss
- [ ] Triage action logic (create Workout / ActivitySession / link)
- [ ] Auto-suggest merge candidate (manual workout on same date)

## API Contract

### GET /gadgetbridge/workouts/pending
Response: list of watch workouts with `triage_status = "pending"`, including `merge_candidate` (manual workout id + label on same date if gym suggestion).

### POST /gadgetbridge/workouts/{id}/triage
```json
{ "action": "merge", "workout_id": 42 }
{ "action": "new_workout" }
{ "action": "new_activity" }
{ "action": "dismiss" }
```

**merge**: set `merged_workout_id`, status → "merged". No changes to Workout — link is the merge.
**new_workout**: create Workout from watch data (date, started_at/ended_at, notes = workout_type), status → "new_workout", set `merged_workout_id` to new workout id.
**new_activity**: create ActivitySession (date, duration_minutes, activity_type = mapped from workout_type), status → "new_activity", set `merged_activity_id`.
**dismiss**: status → "dismissed".

## Decisions
- Merge candidate: query for Workout on same date; return first if exists (user picks manually if multiple)
- new_workout label: use workout_type as plan_day_label (e.g. "STRENGTH_TRAINING")
- new_activity type: map GYM_TYPES → "gym", others → lowercase workout_type (e.g. "running")
