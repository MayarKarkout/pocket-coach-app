# TASK-065: Activity Snapshot — Frontend

Status: DONE
Milestone: M22

## Goal
Build the shareable Snapshot UI: a new entry point off Insights that lets
Miro pick a period, optionally include food/health data and an AI recap, and
export the result as an on-screen card, copiable text, or a PNG image.

## Subtasks
- [ ] New "Snapshot" link/button on the Insights page
- [ ] Snapshot page: reuse the existing Insights time-window selector (7d / 4w / monthly / yearly / custom range) — no new period UI
- [ ] Two toggles, both off by default: "Include food/health data", "Add AI summary"
- [ ] Fetch `GET /snapshot` (TASK-064) on period/toggle change; fetch `POST /snapshot/summary` only when the AI toggle is on
- [ ] On-screen card component: styled, screenshot-ready layout — activity totals always shown, food/health section only when toggled and present, AI paragraph only when toggled
- [ ] "Copy text" button: plain-text rendering of the same content, copied to clipboard
- [ ] "Export PNG" button: renders the card to a PNG via a client-side library (e.g. html-to-image) and downloads it
- [ ] Card must read standalone — no app jargon, since it may be shared with a coach/trainer outside the app

## Decisions
PNG export library choice is an implementation detail (Claude decides).

## Blockers
Depends on TASK-064 (`/snapshot`, `/snapshot/summary` endpoints).

## Where we left off
Done. `/insights/snapshot` page: reuses `TimeWindowSelector`; two toggles (food/health, AI summary — AI summary has an explicit "Generate" button rather than auto-firing on every toggle/range change, to avoid unnecessary LLM calls); `SnapshotCard` component (also used as the PNG export target via `html-to-image`); "Copy text" button using a shared `toPlainText()` formatter in `lib/snapshot.ts` so the card and copy output never drift. Added "Snapshot →" link on `/insights`. Installed `html-to-image` dependency. Verified end-to-end through the actual web proxy (`/proxy/snapshot`, `/proxy/snapshot/summary`) with real data and a real Gemini call; `tsc --noEmit` clean.
