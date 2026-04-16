# TASK-045: Log Tab Zoom Bug

Status: DONE
Milestone: M14

## Goal
Fix the Log page causing mobile browser to auto-zoom in, requiring the user to
manually zoom out every time they navigate there.

## Root cause
Mobile browsers auto-zoom when page content overflows the viewport width. Something
on the Log page is wider than the screen — likely the action button row or a card.

## Subtasks
- [x] Identify overflowing element
- [x] Constrain it within viewport

## Decisions
- Fix overflow without changing the visual layout
