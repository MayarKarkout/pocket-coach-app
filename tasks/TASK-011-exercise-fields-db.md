# TASK-011: Exercise Fields + Superset DB
Status: DONE
Milestone: M3

## Goal
Extend PlanExercise with new fields, add Superset model, migration 0003.

## Subtasks
- [x] Update models.py: PlanExercise fields + Superset model
- [x] Write migration 0003

## Schema

### Superset (new)
- id
- day_id: FK → PlanDay
- group_label: str (e.g. "A", "B")
- rest_seconds: int default 90
- position: int

### PlanExercise changes
- Remove: planned_reps
- Add: reps_min (int|null), reps_max (int|null), duration_seconds (int|null)
- Add: per_side (bool, default false)
- Add: intensity_pct (int, default 70)
- Add: rest_seconds (int, default 90) — used when superset_id is null
- Add: superset_id (FK → Superset, nullable)
- planned_sets stays

## Decisions
- reps and duration are mutually exclusive
- superset_id null = standalone
- standalone exercises keep day_id + position as-is
- superset exercises: position = within-superset order; superset has its own position in the day
