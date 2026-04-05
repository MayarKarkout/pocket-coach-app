# TASK-038: Briefing Context — Health Data
Status: DONE
Milestone: M12

## Goal
Include daily health snapshot data (sleep, HR, steps, HRV, etc.) in the LLM briefing context.

## Subtasks
- [ ] Update `llm_context.py` `_fmt_granular` to query and include `DailyHealthSnapshot` per day

## Decisions
- Health data included in granular (7-day) section only; summaries don't include it
