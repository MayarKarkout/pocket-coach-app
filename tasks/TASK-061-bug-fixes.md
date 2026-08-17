# TASK-061: Bug fixes — delete button reliability + new-entry form date defaults

Status: DONE
Milestone: M18

## Goal
Fix two reported bugs:
1. The two-tap delete confirm button on the Log tab (`apps/web/app/log/page.tsx`) is unreliable on touchscreens — taps sometimes don't register as the confirming delete.
2. Football/Activity/Wellbeing "new entry" forms always default their date field to today, instead of the date the user was viewing on the Log tab when they tapped the action button.

## Subtasks
- [x] Bug 1: Remove `onBlur`-based reset of `confirming` in `DeleteButton` (root cause of dropped second taps on mobile); auto-reset `confirming` via a timeout instead.
- [x] Bug 2a: `log/page.tsx` — Football/Activity/Wellbeing action buttons now carry `?date=${selectedDate}`, mirroring the existing `+ Meal` button.
- [x] Bug 2b: Convert `log/football/new/page.tsx`, `log/activity/new/page.tsx`, `log/wellbeing/new/page.tsx` into async server components reading `searchParams: Promise<{ date?: string }>`, computing `initialDate`, passing to form.
- [x] Bug 2c: Update `NewFootballForm`, `NewActivityForm`, `NewWellbeingForm` to accept `initialDate` prop and seed `date` state from it.
- [x] Verify with `npx tsc --noEmit` in `apps/web`.

## Decisions
- Left `apps/web/app/log/events-feed.tsx` untouched (dead code, not imported anywhere).
- Left `apps/web/app/log/meals/new/*` untouched (dead code, superseded by `/food/new`).
- Left `apps/web/app/workouts/new/*` untouched (same bug pattern, but in scope for a separate M21 task landing in parallel).
- Reused the shared `todayISO` from `@/lib/dates` in the new server-component pages rather than duplicating a local `todayISO()` helper — avoids duplicate code; no defensive-coding fallback needed since the page always computes and passes a non-empty `initialDate`.

## Blockers
None.

## Where we left off
Both bugs fixed. `npx tsc --noEmit` in `apps/web` passes with no errors. No dev server / docker started per instructions (isolated worktree, other parallel agents active). Task complete.
