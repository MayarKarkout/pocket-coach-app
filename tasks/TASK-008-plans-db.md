# TASK-008: Plans DB Models + Migration
Status: DONE
Milestone: M3

## Goal
Add Plan, PlanDay, PlanExercise SQLAlchemy models and Alembic migration 0002.

## Subtasks
- [x] Add models to models.py
- [x] Write migration 0002_add_plans

## Decisions
- Days are named training slots (free-text label), no weekday binding
- planned_sets and planned_reps are separate int fields
- position int field on both PlanDay and PlanExercise for ordering
- is_active bool on Plan; set-active endpoint deactivates all others first

## Blockers
None

## Where we left off
Starting fresh.
