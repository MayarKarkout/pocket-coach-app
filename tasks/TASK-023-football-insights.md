# TASK-023: Football Insights

Status: DONE
Milestone: M7

## Goal
Add a football insights API endpoint and React component showing session counts, load totals, and a per-session bar chart.

## Subtasks
- [x] Add `PeriodLoad` + `FootballInsightsOut` Pydantic models to `football.py`
- [x] Add `GET /football/insights` endpoint before `/{id}` route
- [x] Create `apps/web/app/insights/football-insights.tsx` client component

## Decisions
- `by_period` returns one entry per session (not aggregated by date), ordered by date asc
- Training bars: `hsl(var(--primary))`, match bars: `hsl(var(--destructive))`
- Empty state: "No football sessions in this period."

## Blockers
None

## Where we left off
Both files written in a single session.
