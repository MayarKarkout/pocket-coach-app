# TASK-022: Insights Infrastructure
Status: IN PROGRESS
Milestone: M7

## Goal
Time window selector + Insights page shell that all insight sections plug into.

## Subtasks
- [ ] lib/insights.ts — DateRange type + time window helpers
- [ ] app/insights/time-window-selector.tsx — client component
- [ ] app/insights/page.tsx — shell with selector, sections lazy-loaded by range

## DateRange interface
```ts
export interface DateRange { from: string; to: string; } // YYYY-MM-DD
export type TimeWindow = "7d" | "4w" | "monthly" | "yearly" | "custom";
```

## Time window → date range
- 7d: today-6 → today
- 4w: today-27 → today
- monthly: first of current month → today
- yearly: Jan 1 of current year → today
- custom: user picks from/to with date inputs
