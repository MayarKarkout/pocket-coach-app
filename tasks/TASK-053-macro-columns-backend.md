# TASK-053: Macro columns + backend computation
Status: IN PROGRESS
Milestone: M16

## Goal
Add protein_g, carbs_g, fat_g to meal_logs and compute them automatically:
- Library meals: compute from ingredients × food_item macros per 100g (exact, sync)
- Single food: compute from food_item × grams (exact, sync) — requires frontend to pass food_item_id + food_item_grams
- Free text: extend AI background task to return P/C/F alongside kcal

## Subtasks
- [ ] Migration 0016: add protein_g, carbs_g, fat_g to meal_logs
- [ ] Update MealLog model
- [ ] Update MealLogOut schema (add macro fields)
- [ ] Compute macros for library meals on save
- [ ] Compute macros for single food entries (add food_item_id + food_item_grams to CreateMealBody)
- [ ] Extend AI estimation to return JSON with P/C/F + kcal (free text + library+notes paths)
- [ ] Update frontend add-meal-form to pass food_item_id + food_item_grams for single food
- [ ] Update MealLog TypeScript type to include macro fields

## Decisions
- Library + notes: AI adjusts all 4 values (kcal + macros); pass base macros to AI as context
- Macros nullable everywhere; stored as Decimal with 1dp
- food_item_id + food_item_grams are ephemeral (not stored), used only for macro computation at create time
