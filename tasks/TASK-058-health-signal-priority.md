# TASK-058: Health signal data priority
Status: IN PROGRESS
Milestone: M17

## Goal
Instruct the LLM that RHR, SpO2, HRV, and stress are background signals —
only flag if meaningfully abnormal, never recite as routine daily stats.

## Subtasks
- [ ] Add health signal priority rules to BRIEFING_SYSTEM
