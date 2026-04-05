# TASK-036: Today Health Stats + Triage UI
Status: DONE
Milestone: M12

## Goal
Surface watch health data and workout triage on the Today page.

## Subtasks
- [ ] Backend: add `health` field to `GET /today` response
- [ ] Frontend: `health-section.tsx` — quick glance (steps + sleep) + expandable panel (7 metrics)
- [ ] Frontend: `triage-section.tsx` — client component; shows pending watch workouts with action buttons
- [ ] Frontend: update `page.tsx` to include both sections

## Decisions
- Health section: steps + sleep in quick glance; tap to expand all 7 metrics inline (accordion)
- Triage section: self-fetching client component; renders nothing when queue empty
- Page order: stats → health glance → events → triage card → briefing → chat
