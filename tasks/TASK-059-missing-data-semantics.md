# TASK-059: Missing data semantics
Status: IN PROGRESS
Milestone: M17

## Goal
Ensure absent data is represented as "no data" not zero, both in context and
in the LLM's interpretation.

## Subtasks
- [ ] Add explicit "No meals logged" marker in granular context when no meal entries for a day
- [ ] Add "No health data" marker when no daily health snapshot for a day
- [ ] Add missing data rules to BRIEFING_SYSTEM
