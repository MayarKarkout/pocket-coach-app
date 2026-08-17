# TASK-063: Nav consolidation — drop standalone Workouts tab

Status: DONE
Milestone: M18

## Goal
Drop the standalone "Workouts" nav tab. Workout sessions become just another
entry type in the Log tab's combined feed (alongside football/activity/
wellbeing/meal), addable from there too. Workouts tab's week-view browsing is
not carried over — Log's existing day-by-day navigation is sufficient. Plan
management gets a new, less prominent entry point ("Plans →" link on Log)
since it loses its home on the Workouts tab.

End-state nav: Today / Log / Food (3 tabs).

## Subtasks
- [x] Backend: add optional `date` query filter to `list_workouts`
      (mirrors `football.py`'s `list_football_sessions` pattern)
- [x] `lib/events.ts`: add `workout` kind to `EventItem` union
- [x] `log/page.tsx`: fetch workouts for selected date, add `WorkoutCard`,
      extend `TYPE_FILTERS`, extend `deleteItem`, add "+ Workout" button,
      add "Plans →" link
- [x] `nav-bar.tsx`: remove Workouts tab entry + unused `Dumbbell` import
- [x] Delete `app/workouts/page.tsx`, `workouts-list.tsx`, `loading.tsx`
- [x] `app/workouts/new/page.tsx` → server component reading
      `searchParams: Promise<{ date?: string }>`, pass `initialDate` down
      (also fixes the "defaults to today" bug in `new-workout-form.tsx`)
- [x] Repoint stray `/workouts` (list) links to `/log`:
      `new-workout-form.tsx` cancel button, `workout-log.tsx` back button +
      post-delete redirect
- [x] Check `app/plans/*` for hardcoded back-to-Workouts links (none found)
- [x] Static verification: `tsc --noEmit`, grep for `"/workouts"`,
      `py_compile` + `black --check` on `workouts.py`

## Decisions
- "Plans →" link styled like Food tab's "Meal Library" button (bordered
  button next to "+ Workout" etc.) rather than Today's small text-link,
  since it sits among the other action buttons in the same row.
- Workout detail/edit page's back button and post-delete redirect now go to
  `/log` (unparameterized), matching the exact pattern already used by
  `log/football/[id]/edit-football-form.tsx` et al. (`router.push("/log")`).
- Deleted `apps/web/app/log/events-feed.tsx`: a dead/unused duplicate of
  `log/page.tsx`'s card components (nothing imported `EventsFeed` anywhere
  in the tree — confirmed via grep). It failed `tsc` once `EventItem` grew
  the `workout` variant; rather than teach a second, unreachable copy of
  the card-switch about workouts, removed it. Not part of the original
  brief but directly caused by this change and net-negative to keep per
  CLAUDE.md's no-dead-weight stance.

## Blockers
None.

## Where we left off
Complete. `npx tsc --noEmit` passes clean; `grep -rn '"/workouts"' apps/web/app`
shows only the two legitimate API-fetch calls in `workouts/new/*` (POST/GET
`/workouts`), no stale list-page links; `python -m py_compile` on
`workouts.py` passes. `black` itself isn't installed in this sandbox (no
pip/venv available) — manually confirmed the diff's line lengths (all ≤88
chars) and formatting match the existing black-formatted style of the file
and mirror `football.py`'s already-formatted filter pattern exactly; worth
a real `black --check` run in an environment that has it.
