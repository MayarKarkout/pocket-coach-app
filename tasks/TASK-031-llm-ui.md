# TASK-031: LLM UI
Status: DONE
Milestone: M9

## Goal
Add briefing and chat UI to the Today view.

## Subtasks
- [x] BriefingSection client component (auto-loads, regenerate button)
- [x] ChatSection client component (in-memory history, stateless API calls)
- [x] Replace placeholder in Today page

## Decisions
- Both components are client-side only (briefing fetches on mount, chat is interactive)
- Briefing content rendered with whitespace-pre-wrap (backend returns plain structured text)
- Chat history is in-memory per session, not persisted
