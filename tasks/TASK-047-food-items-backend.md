# TASK-047: food_items backend

Status: DONE
Milestone: M15

## Goal
Add `food_items` table and API for food DB entries. Entries upserted from Open Food Facts search or created manually. Macros stored now (free from OFF) to avoid M16 backfill.

## Subtasks
- [ ] Alembic migration 0015 adding `food_items` table
- [ ] SQLAlchemy model
- [ ] API: search / list / create / update / delete endpoints
- [ ] Open Food Facts search integration — graceful fallback to local search if OFF unreachable

## Decisions
- Schema: `id`, `name`, `kcal_per_100g` (required), `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` (nullable), `source` ("open_food_facts" | "manual"), `off_id` (nullable, unique when present)
- OFF search hits `world.openfoodfacts.org/cgi/search.pl`; first N results upserted by `off_id`
- Local search is substring match on `name`; always included alongside OFF results

## Where we left off
Starting implementation.
