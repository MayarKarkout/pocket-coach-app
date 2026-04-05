# TASK-018: Events UI
Status: DONE
Milestone: M5

## Goal
Log tab with combined events feed + forms for each event type. Nav updated to 4 tabs.

## Subtasks
- [x] lib/events.ts — TypeScript types
- [x] nav-bar.tsx — add Today and Log tabs (Today / Workouts / Plans / Log)
- [x] /log page — combined chronological feed (football + activity + wellbeing), delete inline
- [x] /log/football/new — create football session form
- [x] /log/activity/new — create activity session form
- [x] /log/wellbeing/new — create wellbeing log form

## UX notes
- Combined feed sorted by date desc, then created_at desc
- Each entry has a type badge (Football / Activity / Wellbeing)
- Delete with confirm-on-second-click pattern (same as workouts)
- Add buttons per type at top of log page
- Forms submit and redirect back to /log
