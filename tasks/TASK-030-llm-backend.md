# TASK-030: LLM Backend
Status: DONE
Milestone: M9

## Goal
Implement the LLM foundation backend: provider abstraction, context assembly, briefing cache, chat endpoint.

## Subtasks
- [x] Add `anthropic` dependency
- [x] Add env vars (ANTHROPIC_API_KEY, USER_TIMEZONE) to docker-compose + .env.example
- [x] DailyBriefing model + migration 0010
- [x] LLMProvider interface + ClaudeProvider (llm.py)
- [x] Context builder (llm_context.py): 7d granular + 4-week summaries
- [x] Briefing + chat router (briefing.py)
- [x] Register router in main.py

## Decisions
- BRIEFING_MODEL: claude-haiku-4-5-20251001 (cheap, auto-runs)
- CHAT_MODEL: claude-sonnet-4-6 (richer reasoning for Q&A)
- Briefing cached per date (unique constraint on date column)
- Context: 7d granular data + prior 4 weeks as weekly summaries
- USER_TIMEZONE env var (default: Europe/Warsaw) controls midnight cache invalidation
