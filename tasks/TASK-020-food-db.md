# TASK-020: Food DB
Status: DONE
Milestone: M6

## Goal
Add MealLog model and migration 0009.

## Subtasks
- [x] Add MealLog model to models.py
- [x] Write migration 0009_add_meal_logs

## Schema

### MealLog
- id: PK
- date: Date
- meal_type: str (free text, e.g. "breakfast", "lunch")
- notes: str | null
- calories: int | null
- occurred_at: datetime | null (timezone-aware)
- created_at: datetime (server default)
