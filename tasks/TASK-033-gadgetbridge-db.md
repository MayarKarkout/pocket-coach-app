# TASK-033: Gadgetbridge DB — Models + Migration
Status: DONE
Milestone: M11

## Goal
Add `daily_health_snapshots` and `watch_workouts` tables to store data ingested from Gadgetbridge.

## Subtasks
- [ ] `DailyHealthSnapshot` model in models.py
- [ ] `WatchWorkout` model in models.py
- [ ] Migration 0012

## Decisions
- `daily_health_snapshots`: one row per date (upsert on ingest); stores sleep, HR, HRV, steps, calories, SpO2, stress; raw_data JSON for full payload
- `watch_workouts`: one row per external source_id (dedup on ingest); triage_status drives lifecycle; merge = FK link to existing workout or activity — no schema changes to workouts table
- `suggested_category`: "gym" | "activity" — derived from workout_type at ingest time
- triage_status values: "pending" | "merged" | "new_workout" | "new_activity" | "dismissed"

## Schema

### daily_health_snapshots
| field | type |
|---|---|
| id | PK |
| date | Date, UNIQUE |
| source | str ("gadgetbridge") |
| steps | int? |
| calories_active | int? |
| resting_hr | int? |
| hrv | float? (ms) |
| spo2 | float? (%) |
| stress_avg | int? |
| sleep_duration_minutes | int? |
| sleep_deep_minutes | int? |
| sleep_light_minutes | int? |
| sleep_rem_minutes | int? |
| sleep_awake_minutes | int? |
| sleep_score | int? |
| raw_data | JSON |
| imported_at | datetime |

### watch_workouts
| field | type |
|---|---|
| id | PK |
| source_id | str, UNIQUE |
| source | str ("gadgetbridge") |
| date | Date |
| started_at | datetime? |
| ended_at | datetime? |
| duration_minutes | int? |
| workout_type | str (raw from device) |
| suggested_category | str ("gym" or "activity") |
| avg_hr | int? |
| max_hr | int? |
| calories | int? |
| notes | str? |
| triage_status | str, default "pending" |
| merged_workout_id | FK→workouts? |
| merged_activity_id | FK→activity_sessions? |
| raw_data | JSON |
| imported_at | datetime |
