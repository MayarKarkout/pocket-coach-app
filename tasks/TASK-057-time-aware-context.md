# TASK-057: Time-aware briefing context
Status: IN PROGRESS
Milestone: M17

## Goal
Pass current local time into briefing context. Instruct the LLM not to draw
conclusions from today's incomplete metrics before midday.

## Subtasks
- [ ] Pass now (local datetime) to build_context; add current time to context header
- [ ] Update BRIEFING_SYSTEM: before noon, don't evaluate today's steps/kcal/activity
