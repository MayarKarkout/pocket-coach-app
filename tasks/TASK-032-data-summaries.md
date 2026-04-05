# TASK-032: Data Summaries — DB + Lazy Generation
Status: DONE
Milestone: M10

## Goal
Store weekly/monthly/yearly data summaries in the DB. Generate lazily during briefing context assembly. Replace on-the-fly weekly computation in llm_context.py with stored summaries, and add monthly + yearly tiers.

## Subtasks
- [x] Migration 0011: `data_summaries` table
- [x] `DataSummary` model in models.py
- [x] `summaries.py`: compute + lazy get-or-create
- [x] Update `llm_context.py` to use stored summaries + monthly/yearly tiers

## Decisions
- Trigger: lazy (on briefing generation), no scheduler
- Format: structured JSON only, no prose
- No backfill
- Workout exercise detail: sets, avg_reps (nullable), min/max weight_kg (nullable)
- Weekly: rolling 7-day windows (same as current code)
- Monthly: calendar months before the weekly window
- Yearly: calendar years before the monthly window

## Schema
```json
{
  "workouts": {"session_count", "total_tonnage_kg", "total_volume_sets", "exercises": [{"name", "sets", "avg_reps", "min_weight_kg", "max_weight_kg"}]},
  "football": {"session_count", "training_count", "match_count", "total_duration_minutes", "avg_rpe"},
  "activity": {"session_count", "total_duration_minutes", "activity_types"},
  "wellbeing": {"log_count", "avg_severity", "body_parts_affected", "log_types"},
  "meals": {"log_count", "avg_daily_calories", "days_with_logs"}
}
```
