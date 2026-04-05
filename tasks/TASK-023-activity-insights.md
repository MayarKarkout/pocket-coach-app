# TASK-023: Activity Insights
Status: DONE
Milestone: M7

## Goal
Add activity insights endpoint to the API and a React component to the insights page.

## Subtasks
- [x] GET /activity/insights endpoint in apps/api/app/activity.py
- [x] apps/web/app/insights/activity-insights.tsx client component

## Decisions
- by_period: one entry per session ordered by date asc
- Tooltip shows activity_type + minutes
- Empty state: "No activities in this period."

## Where we left off
Building both parts now.
