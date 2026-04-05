# TASK-012: Superset Moves + Unified Day Ordering
Status: DONE
Milestone: M3

## Goal
Full superset move API + UI, and unified position ordering for standalones and supersets within a day.

## Subtasks
- [x] API: move standalone → existing superset
- [x] API: move standalone → new superset (atomic)
- [x] API: move superset exercise → standalone (auto-delete empty superset)
- [x] API: move superset exercise → existing superset (auto-delete empty superset)
- [x] API: move superset exercise → new superset (atomic, auto-delete empty superset)
- [x] API: unified day position namespace (_next_day_position, _reorder_day_items)
- [x] UI: ExerciseRow move row for superset exercises (Standalone / other SS letters / + New)
- [x] UI: DaySection renders standalones and supersets interleaved by position

## Decisions
- Auto-delete source superset when last exercise is moved out
- Move to standalone lands at end of unified position list
- Existing data with overlapping positions (standalones 0,1,2 and supersets 0,1,2) renders supersets after standalones initially; user can reorder from there
