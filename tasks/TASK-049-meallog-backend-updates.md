# TASK-049: meal_logs backend updates

Status: DONE
Milestone: M15

## Goal
Meal logs can link a meal definition + portion multiplier. When both present, calories come from definition kcal × multiplier and AI estimation is skipped. Snapshot pattern: editing a definition never updates past logs.

## Subtasks
- [ ] Alembic migration: add `meal_definition_id` (nullable FK SET NULL), `portion_multiplier` Decimal nullable
- [ ] Update `MealLog` model
- [ ] Update POST/PATCH to accept definition + multiplier
- [ ] Compute kcal from definition on save (snapshot) when both present
- [ ] Skip AI estimation when definition linked
