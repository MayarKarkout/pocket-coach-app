# TASK-043: Watch Workout Retrieval Fix
Status: DONE
Milestone: M12

## Goal
Watch workouts recorded via Gadgetbridge are visible in the Gadgetbridge app but not
reaching PocketCoach. Fix the Android companion app so workout sessions from Health
Connect are reliably ingested.

## Root Cause
Two issues in `GadgetbridgeReader.readRecentWorkouts()`:

1. **24-hour window** — if Gadgetbridge syncs the workout to Health Connect with any
   delay (e.g. background sync runs late, phone was offline), it falls outside the window
   and is silently skipped. Since `source_id` deduplication is already in place on the
   backend, extending the window is safe.

2. **Strict Gadgetbridge package filter** — `fromGadgetbridge()` filters
   `ExerciseSessionRecord` by `nodomain.freeyourgadget.gadgetbridge`. The CMF Watch Pro 3
   has experimental Gadgetbridge support; exercise sessions may be written to Health
   Connect under a different data origin, or Gadgetbridge may not export
   `ExerciseSessionRecord` for this device at all. The filter is valuable for daily metrics
   (avoids double-counting with phone health apps) but counter-productive for workouts
   where we want anything the watch recorded.

## Subtasks
- [x] Create task doc
- [x] Extend workout read window: 24h → 7 days
- [x] Remove `fromGadgetbridge()` filter for `ExerciseSessionRecord` only
- [x] Add per-workout type logging so we can see what's being read
- [x] Improve sync status display (show workout count) in MainActivity

## Decisions
- Daily snapshot filter (steps, calories, HR) stays Gadgetbridge-only — multiple apps
  write these and we must not double-count.
- Workout filter removed entirely — user has one watch; no double-counting risk. If a
  second source appears later, re-add filtering then.
- 7-day window chosen: long enough to catch delayed syncs; combined with `source_id`
  dedup on the backend, it's idempotent.

## Blockers
None

## Where we left off
—
