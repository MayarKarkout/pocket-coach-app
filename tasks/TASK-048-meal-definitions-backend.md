# TASK-048: meal_definitions backend

Status: DONE
Milestone: M15

## Goal
Named meal recipes with optional structured ingredients. Kcal totals computed on read, not stored.

## Subtasks
- [ ] Alembic migration: `meal_definitions`, `meal_ingredients`
- [ ] SQLAlchemy models
- [ ] CRUD endpoints (kcal totals in GET responses)

## Decisions
- `meal_definitions`: `id`, `name`, `notes`, `created_at`, `updated_at`
- `meal_ingredients`: `meal_definition_id` FK (cascade), `food_item_id` FK, `quantity_grams` Decimal
- Ingredient-less definitions allowed (name + maybe notes)
