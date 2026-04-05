# TASK-013: Workouts DB
Status: DONE
Milestone: M4

## Goal
Add Workout, WorkoutExercise, WorkoutSet models and migration 0004.

## Subtasks
- [ ] Add models to models.py
- [ ] Write migration 0004

## Schema

### Workout
- id: PK
- date: Date
- plan_day_id: FK → PlanDay (nullable — day may be deleted)
- plan_day_label: str (snapshotted at creation)
- notes: str | null

### WorkoutExercise
- id: PK
- workout_id: FK → Workout (cascade delete)
- name: str (snapshotted from plan)
- superset_group: str | null (e.g. "A" — for visual grouping)
- position: int

### WorkoutSet
- id: PK
- workout_exercise_id: FK → WorkoutExercise (cascade delete)
- reps_min: int | null
- reps_max: int | null
- duration_min_seconds: int | null
- duration_max_seconds: int | null
- weight_kg: Numeric(6,2) | null
- notes: str | null
- position: int

## Decisions
- plan_day_label snapshotted so history survives plan edits/deletions
- weight_kg is Numeric(6,2) matching SPEC (decimal)
- position on WorkoutSet for user-defined set ordering
