# TASK-010: Plans UI
Status: DONE
Milestone: M3

## Goal
Plans list, create, and edit UI. Mobile-first.

## Subtasks
- [x] lib/api-server.ts — server-side fetch helper with cookie forwarding
- [x] lib/plans.ts — shared Plan types
- [x] app/plans/page.tsx — plan list server component
- [x] app/plans/plans-list.tsx — client component (activate/delete/navigate)
- [x] app/plans/new/page.tsx — create plan form
- [x] app/plans/[id]/edit/page.tsx — edit page server component
- [x] app/plans/[id]/edit/plan-editor.tsx — interactive editor client component
- [x] Update home page with nav link

## Decisions
- All mutations update local state from API response (full plan returned each time)
- Reorder via up/down buttons
- Inline editing for day labels and exercises

## Blockers
None

## Where we left off
Starting fresh.
