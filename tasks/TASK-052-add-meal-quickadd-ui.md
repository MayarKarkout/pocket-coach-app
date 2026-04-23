# TASK-052: add-meal quick-add UI

Status: DONE
Milestone: M15

## Goal
Revamp Add Meal form: meal-definition typeahead with portion presets + custom decimal, live kcal preview. Save-as-definition checkbox expands inline ingredient section. Free-text path preserved.

## Subtasks
- [ ] Definition typeahead (searches meal_definitions)
- [ ] Portion presets: Whole / ½ / ⅓ / ¼ + custom decimal input
- [ ] Live kcal preview
- [ ] Save-as-definition checkbox + inline ingredient section (reuses food typeahead)
- [ ] Preserve free-text meal_type + notes + AI estimation path

## Where to wire
Update `/log/meals/new/new-meal-form.tsx` AND the Food tab add path.
