# TASK-014: Workouts API
Status: DONE
Milestone: M4

## Goal
Full CRUD API for workouts, workout exercises, and sets.

## Subtasks
- [ ] Schemas (Pydantic in/out)
- [ ] Workout CRUD (list, create from plan day, get, patch, delete)
- [ ] WorkoutExercise CRUD (add, patch, delete, reorder)
- [ ] WorkoutSet CRUD (add, patch, delete, reorder)

## Key behaviours
- POST /workouts: accepts plan_day_id, snapshots label, auto-populates exercises (standalones + superset exercises) with superset_group from plan
- Exercises and sets deletable independently (plan is just a template)
- GET /workouts returns list summary (id, date, plan_day_label, set count)
- GET /workouts/{id} returns full nested structure
