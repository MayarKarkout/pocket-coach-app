# TASK-044: Frontend Loading States

Status: DONE
Milestone: M14

## Goal
Make navigation feel instant by showing a spinner immediately while data loads,
instead of a blank "Rendering..." screen.

## Root cause
- Server components (Today, Workouts) block full page render until all data fetches
  complete — no `loading.tsx` exists anywhere
- Several Insights child components return `null` while fetching (no visible feedback)
- Log page Suspense boundary has `fallback={null}` — nothing shown while searchParams
  resolve; also no loading state while client-side fetch runs

## Subtasks
- [x] Create `app/today/loading.tsx`
- [x] Create `app/workouts/loading.tsx`
- [x] Fix Log page: Suspense fallback + loading state while client fetch runs
- [x] Fix Insights components: add loading text to football, activity, wellbeing, meal, health, summary

## Decisions
- Simple spinner only (no skeletons)
- Spinner reused via shared component at `components/ui/page-spinner.tsx`
