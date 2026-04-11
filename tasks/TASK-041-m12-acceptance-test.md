# TASK-041: M12 Acceptance Test
Status: TODO
Milestone: M12

## Goal
End-to-end acceptance test of all M12 features using real watch data flowing from CMF Watch Pro 3 → Gadgetbridge → Android companion app → PocketCoach API.

## Prerequisites
- TASK-039 (Android app) installed and running on phone
- TASK-040 (stable Cloudflare tunnel) so data reaches the laptop reliably

## Test Checklist
- [ ] Android app syncs successfully (check API logs for POST /gadgetbridge/daily hits)
- [ ] Today view: steps + sleep stats appear in health panel
- [ ] Today view: full health panel (7 metrics) opens on tap
- [ ] Today view: triage card appears when watch workout is pending
- [ ] Triage: merge / new workout / new activity / dismiss all work correctly
- [ ] Insights: Health section shows steps, sleep, HR bar charts with real data
- [ ] Briefing: references health data (sleep, HR, steps) in generated text
- [ ] Hourly sync: new data appears within ~1 hour without manual trigger

## Notes
- Fix any bugs found during this test before closing M12
- After M12 is closed, open decision on M13 (LLM Tool Use) — build only if real usage demands it
