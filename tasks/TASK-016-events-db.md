# TASK-016: Events DB
Status: DONE
Milestone: M5

## Goal
Add FootballSession, ActivitySession, and WellbeingLog models + migration 0007.

## Subtasks
- [x] Add models to models.py
- [x] Write migration 0007_add_events

## Schema

### FootballSession
- id: PK
- date: Date
- session_type: str ("training" | "match")
- duration_minutes: int
- rpe: int (1–10)
- notes: str | null
- created_at: DateTime

### ActivitySession
- id: PK
- date: Date
- activity_type: str (free text, e.g. "walk", "home workout")
- duration_minutes: int
- notes: str | null
- created_at: DateTime

### WellbeingLog
- id: PK
- date: Date
- log_type: str ("pain" | "fatigue" | "soreness")
- severity: int (1–10)
- body_part: str | null (free text, e.g. "left knee")
- notes: str | null
- workout_id: FK → Workout (nullable)
- football_session_id: FK → FootballSession (nullable)
- activity_session_id: FK → ActivitySession (nullable)
- created_at: DateTime

## Decisions
- session_type and log_type stored as plain strings (not DB enums) for simplicity
- WellbeingLog can link to at most one event — UI enforces this, no DB constraint needed
- duration_minutes as int (not interval) — simpler for display and calculations
