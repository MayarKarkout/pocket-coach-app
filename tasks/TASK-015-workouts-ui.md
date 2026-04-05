# TASK-015: Workouts UI
Status: DONE
Milestone: M4

## Goal
Workout list page and workout log page.

## Subtasks
- [ ] /workouts — list page (date, day label, set count) + "New workout" flow
- [ ] /workouts/[id] — log page: exercises + sets, add/remove exercises, add/edit/delete sets
- [ ] Superset exercises visually grouped (stacked by superset_group label)
- [ ] Set row: reps min/max or duration min/max + weight; notes inline
- [ ] Quick-add set prefills from previous set values

## UX notes
- New workout: pick a plan (defaults to active), then pick a day → creates workout
- Set entry must be fast on mobile
- Superset group shown as label (e.g. "A") above grouped exercises
