# TASK-029: Today View

Status: IN PROGRESS
Milestone: M8

## Goal
Build the Today tab as the app's home screen: 7-day rolling averages at a glance, today's logged events, and a placeholder for the future LLM coach.

## Subtasks
- [ ] `GET /today` API endpoint returning today's events + 7d rolling stats
- [ ] Today page UI: stats row + events feed + coach placeholder

## Decisions
- 7d stats: avg daily calories, total sessions (gym+football+activity), avg wellbeing severity
- Today's feed: same card style as Log tab, today only
- Coach placeholder: static card, greyed out, clearly future
- Layout order: stats → today's feed → coach placeholder
- No "planned for today" section in M8 — just what's been logged

## Blockers
None

## Where we left off
Implementation in progress.
