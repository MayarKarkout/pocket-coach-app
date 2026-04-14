# TASK-042: AI Calorie Estimation

Status: DONE
Milestone: M9 (LLM extension)

## Goal
Automatically estimate calories for meal logs using Gemini when the user doesn't provide them manually. Estimation is async (fire-and-forget after save). User can always override the estimate via the edit form.

## Subtasks
- [x] Add `calories_estimated: bool` column to `meal_logs` (migration 0013)
- [x] Update `MealLog` model in `models.py`
- [x] Update `meals.py` API: background estimation on POST (when no calories provided); expose `calories_estimated` in responses; PATCH sets `calories_estimated = False` when user explicitly provides calories
- [x] Update `llm_context.py`: flag estimated calories with `~` in briefing context
- [x] Update `lib/events.ts`: add `calories_estimated` to `MealLog` type
- [x] Update `new-meal-form.tsx`: non-blocking warning if notes are vague (< 10 chars) and no calories entered
- [x] Update `events-feed.tsx`: show `~` prefix on calories when `calories_estimated = true`

## Decisions
- `calories_estimated: bool` (not enum) — simpler, sufficient for now
- Async via FastAPI `BackgroundTasks` — form closes instantly, estimate arrives in background
- Estimation on POST only; PATCH sets `calories_estimated = False` when calories field is explicitly sent
- If notes are empty/vague, AI call fires anyway (meal_type alone may suffice)
- LLM context hedges: "~450kcal (estimated)" vs "450kcal"

## Blockers
None

## Where we left off
Starting implementation.
