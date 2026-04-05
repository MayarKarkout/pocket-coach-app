# TASK-029: UI Polish — Log, Today, Workouts
Status: DONE
Milestone: M8 (post-milestone polish)

## Goal
Fix 8 UX issues identified after M8 completion.

## Subtasks
- [x] Log: fix forward arrow bug (URL-based date state)
- [x] Log: calendar popup on date text click (hidden date input)
- [x] Log: date in URL (`/log?date=YYYY-MM-DD`) so back navigation preserves it
- [x] Log: back button on all new-log form pages
- [x] Today: event cards tappable → edit form
- [x] Today: + button → type-picker menu
- [x] Today: remove avg wellbeing stat
- [x] Workouts: week span shows short weekday names (`Mon 23 – Sun 29 Mar`)

## Decisions
- Date in URL via `useSearchParams` + `router.replace` (no history stack clutter)
- Calendar popup via hidden `<input type="date">` with `showPicker()` — native mobile picker
- After form submit, redirect to `/log?date=[submitted_date]`
- Back button uses `router.back()` to return to same URL (preserves date)
- Today: `AddMenu` is a separate client component; page stays server-rendered
- Forward arrow hidden on today (can't pre-log future dates)
