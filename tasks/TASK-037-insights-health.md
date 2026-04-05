# TASK-037: Insights Health Charts
Status: DONE
Milestone: M12

## Goal
Add a Health section to the Insights page showing steps, sleep, and HR trends.

## Subtasks
- [ ] Backend: `GET /gadgetbridge/health/insights?from_date=&to_date=`
- [ ] Frontend: `health-insights.tsx` — steps bar chart, sleep bar chart, resting HR bar chart
- [ ] Frontend: update `insights/page.tsx` to include HealthInsights section

## Decisions
- Endpoint on gadgetbridge router (no new router)
- Charts: bar for steps and sleep, bar for HR (consistent with existing Insights style)
