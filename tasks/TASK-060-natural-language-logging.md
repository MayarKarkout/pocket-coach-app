# TASK-060: Natural Language Logging (M18)

Status: DONE
Milestone: M18

## Goal
One free-text box → LLM parses into structured draft entries (meals, activities, football, wellbeing, gym workouts with sets) → user reviews/edits on a confirm screen → saves all. Entry point: "Quick Log" in the `+` menu on Today.

## Subtasks
- [x] Backend: `POST /quick-log/parse` — free text → list of draft entries (Gemini Flash, synchronous)
- [x] Backend: `POST /quick-log/commit` — creates all confirmed entries server-side
- [x] Prompt with schema for all 5 entry types + date inference (today default, "yesterday" etc.)
- [x] Frontend: `/quick-log` page — textarea + submit
- [x] Frontend: confirm screen — editable cards per entry type, delete individual, save all
- [x] Today `+` menu: "✨ Quick Log" option
- [x] Meal entries without stated calories: AI nutrition estimation background task fires on commit
- [x] End-to-end verified locally: parse (all 5 types, date/time inference, set expansion), commit, workout structure, meal estimation

## Decisions
- LLM: Gemini Flash (`gemini-3-flash-preview`), synchronous parse call
- Commit is a backend endpoint (not frontend calling per-type CRUD): workout creation needs plan-less workouts (`plan_day_id=None`, LLM-provided `plan_day_label`), and architecture rule keeps logic in the API
- Draft schema = discriminated Pydantic union on `entry_type`; same schema for parse response and commit request, so edited drafts round-trip
- Format instructions in the user message, not system prompt (per Gemini feedback memory)
- `time` is local HH:MM in drafts; backend converts to UTC `occurred_at` via `USER_TIMEZONE`; for workouts it becomes `started_at`
- Gym sets: "3x5 at 100kg" → 3 set rows with `reps_min=5`, `reps_max=None`
- Unparseable LLM output → 502 with "Could not understand the text. Try rephrasing."

## Blockers
- None

## Where we left off
- Shipped. No migration needed (no schema changes).
