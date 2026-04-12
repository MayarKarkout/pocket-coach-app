# PocketCoach — Project Status

## Current Milestone
**M13: LLM Tool Use (deferred)** — ⬜ NOT STARTED

## Milestone Tracker
| Milestone | Description | Status |
|---|---|---|
| M1 | Skeleton + DB | ✅ Done |
| M2 | Auth | ✅ Done |
| M3 | Plans | ✅ Done |
| M4 | Workouts | ✅ Done |
| M5 | Events | ✅ Done |
| M6 | Food Logging | ✅ Done |
| M7 | Insights | ✅ Done |
| M8 | Today View | ✅ Done |
| M9 | LLM Foundation | ✅ Done |
| M10 | Data Summarization | ✅ Done |
| M11 | Gadgetbridge Connector | ✅ Done |
| M12 | Health Data UI + LLM Integration | ✅ Done |
| M13 | LLM Tool Use (deferred) | ⬜ Not started |

## What's Done (M1–M3)
- Monorepo, Docker Compose, PostgreSQL, FastAPI + Alembic, Next.js + shadcn/ui
- Custom auth: bcrypt, HttpOnly cookie sessions, middleware-protected routes
- Plans: full CRUD for plans/days/exercises/supersets; reorder; unified position namespace

## What's Done (M4 — Workouts)
- `Workout`, `WorkoutExercise`, `WorkoutSet` models + migrations 0004–0006
- Create workout from plan day: exercises + sets pre-populated from plan
- Copy from last workout option
- Start time defaults to creation; end time manual with "Now" button
- `/workouts` list + `/workouts/new` + `/workouts/[id]` log page
- Set entry: reps or duration + weight; notes; duplicate last set; superset visual grouping

## What's Done (M5 — Events)
- `FootballSession`, `ActivitySession`, `WellbeingLog` models + migrations 0007–0008
- Full CRUD API for all 3 types; `occurred_at` datetime on all events
- Football: training/match split, duration, RPE; Activity: free-text type, duration; Wellbeing: type, severity, body part — linkable to any event
- Log tab: combined chronological feed, type badges, delete, click-to-edit
- Create + edit forms with time input; nav updated to Today / Workouts / Plans / Log

## What's Done (M6 — Food Logging)
- `MealLog` model + migration 0009
- CRUD API at `/meals`
- Create + edit forms with date, time, meal_type (datalist suggestions), notes, calories
- Integrated into Log tab combined feed (purple badge, click-to-edit)

## What's Done (M7 — Insights)
- Nav refactored: 4 tabs with lucide-react icons (Today / Workouts / Log / Insights); Plans merged into Workouts page
- Time window selector: 7d / 4w / monthly (current calendar month) / yearly / custom date range
- Insights endpoints on all data types: `/workouts/insights`, `/football/insights`, `/activity/insights`, `/wellbeing/insights`, `/meals/insights`
- Summary chart at top of Insights: stacked bar combining gym + football + activity sessions per day
- 5 detail sections: Gym (tonnage BarChart), Football (load BarChart, training/match coloring), Activity (duration BarChart), Wellbeing (LineChart per type, pivoted, inline labels for mobile), Meals (count BarChart + avg calories)
- Log tab: date navigation (default today, prev/next day arrows) + type filter pills (All / Football / Activity / Wellbeing / Meal)
- Workouts tab: week navigation (default current week, prev/next week arrows)

## What's Done (M8 — Today View + Polish)
- `GET /today` endpoint returning today's events (all types) + 7-day rolling stats
- Events sorted by `occurred_at` (nulls last) then `created_at`; workouts use `started_at`
- Rolling stats: avg daily calories + session count (7d); avg wellbeing removed (misleading)
- Today page: 2-stat grid, today's event feed with tappable cards → edit, `+` menu to add any log type
- Log tab: date in URL (`/log?date=`), calendar popup on date click, forward arrow fixed, back buttons on all new-log forms, form submit returns to logged date
- Workouts tab: week span shows short weekday names (`Mon 23 – Sun 29 Mar`), calendar popup on week click
- Docker Compose: hot reload for both API (uvicorn `--reload`) and web (`npm run dev` + `WATCHPACK_POLLING`); no custom image builds

## What's Done (M9 — LLM Foundation)
- `LLMProvider` ABC + `GeminiProvider` (google-genai SDK, gemini-3-flash-preview); singleton via `get_llm()`
- Switched from Anthropic to Google Gemini (free tier, better instruction-following, 1M context window)
- `DailyBriefing` model + migration 0010 (`daily_briefings` table, unique on date)
- Context builder: 7-day granular (workouts/football/activity/wellbeing/meals with details) + 4-week weekly summaries
- `GET /briefing/today` — returns cached briefing or auto-generates; cached per local date (USER_TIMEZONE=Europe/Warsaw)
- `POST /briefing/today/regenerate` — force-regenerates today's briefing
- `POST /briefing/chat` — stateless chat; caller passes message + history
- Today page: `BriefingSection` (auto-loads, clear + regenerate buttons, skeleton loader) + `ChatSection` (message bubbles, localStorage persistence across nav, clear button, Enter to send)

## What's Done (M10 — Data Summarization)
- `DataSummary` model + migration 0011 (`data_summaries` table, unique on `period_type + period_start`)
- `summaries.py`: `get_or_create_summary()` — lazy compute + store for weekly/monthly/yearly periods
- Summary JSON: workouts (session count, tonnage, sets, per-exercise sets/avg_reps/min-max weight), football (counts, duration, avg RPE), activity (count, duration, types), wellbeing (count, avg severity, body parts, types), meals (count, avg kcal/day, days logged)
- `llm_context.py` updated: 7d granular → 4 stored weekly → 2 stored monthly → 1 stored yearly; weekly includes exercise breakdown; all generated lazily on first briefing request

## What's Done (M11 — Gadgetbridge Connector)
- `DailyHealthSnapshot` + `WatchWorkout` models + migration 0012
- `POST /gadgetbridge/daily` — upsert daily health snapshot (sleep, HR, HRV, steps, SpO2, stress, calories)
- `POST /gadgetbridge/workout` — ingest watch workout; deduplicates on `source_id`; auto-suggests "gym" or "activity" category from workout type
- `GET /gadgetbridge/workouts/pending` — list pending watch workouts with merge candidate (manual workout on same date if gym)
- `POST /gadgetbridge/workouts/{id}/triage` — actions: `merge` (link to existing workout), `new_workout` (create Workout), `new_activity` (create ActivitySession), `dismiss`
- All endpoints behind cookie auth

## What's Done (M12 — Health Data UI + LLM Integration)
- Today view: health stats card (steps + sleep quick view, expandable to HR/HRV/SpO2/stress/calories)
- Today view: workout triage card (appears when pending watch workouts exist, actions: merge/new/activity/dismiss)
- Insights: health section with sleep, HR, steps charts over time window
- LLM briefing context: daily health snapshot (steps, sleep, HR) fed into briefing prompt
- Android companion app (`apps/android/`): Kotlin app reads Health Connect, POSTs hourly to PocketCoach API via WorkManager
  - Auth: session cookie (POST /auth/login), 401 re-login
  - Data: steps, sleep stages, resting HR, HRV, SpO2, calories, workouts
  - Filtered to Gadgetbridge data source only (avoids double-counting with phone health apps)
  - Settings screen: URL + email + password; "Sync Now" button for manual trigger
  - End-to-end verified: Gadgetbridge → Health Connect → companion app → PocketCoach API

## Context (M10 — Data Summarization)

### M9–M11 Breakdown (LLM roadmap)

| Milestone | Description | Scope |
|---|---|---|
| M9 | LLM Foundation | `LLMProvider` interface + Claude; Today briefing (Haiku, auto on load); basic chat on Today (Sonnet); context = last 7d granular + last 30d on-the-fly summaries |
| M10 | Data Summarization | Stored weekly/monthly/yearly summaries; date-triggered background job; context assembly uses stored summaries |
| M11 | LLM Tool Use | Function calling; LLM tools to query DB by date range for historical lookups |
| Future | Fact Extraction | Extract structured facts from conversations (pain, patterns); deferred |

### M9 Context Design
- **Tiered context:** last 7d = full granular data; last 30d = weekly summaries (on-the-fly in M9, stored from M10); last 3m = monthly summaries; older = yearly summaries
- **Summaries in M10:** generated by a date-triggered job (e.g. runs when a week/month boundary passes), not lazily on demand
- **No raw conversation history stored** — fact extraction from chat deferred to future milestone
- **Entry point:** Today view only (for now)

### M9 Product Decisions
- **Briefing tone:** realistic, demanding, and encouraging coach — identifies areas to improve, stays grounded in actual data
- **Briefing structure:** structured format (not freeform prose) + a piece of coaching advice; auto-generated once per day, cached in DB, regenerated at midnight
- **Briefing vs. chat:** two separate UI components on Today view — briefing is always visible; chat is a separate interactive section
- **Chat session context:** yes, conversation history passed in-request (in-memory per session, no DB storage)
- **Models:** Haiku for briefing (auto, cheap); Sonnet for chat (on-demand, richer reasoning)
- **Briefing cache:** invalidated at midnight user's local timezone (`USER_TIMEZONE=Europe/Warsaw`); manual regenerate button also available

## Architecture Decisions (stable)
| Decision | Detail |
|---|---|
| FastAPI backend | Miro debugs Python, not TypeScript |
| Custom auth | Single user; no OAuth needed |
| `weightKg` as Decimal/string | DB: Numeric(6,2); API response: string to avoid float precision |
| Workout logging not live | No timer; fill in sets anytime |
| Workout exercises are snapshots | Plan is a template; per-session edits don't affect the plan |
| Superset model | Separate `supersets` table; exercises link via `superset_id` (null = standalone) |
| Event times as `occurred_at` | Nullable UTC datetime; date field kept for sorting |
| LLM behind interface | M9; `LLMProvider` abstraction, never called from frontend |
| LLM models: tiered | Haiku for auto-briefing (cheap, runs on every Today load); Sonnet for Q&A chat |
| LLM context: tiered | 7d granular → 30d weekly summaries → 3m monthly → yearly; older data summarised |
| Summaries: lazy generation | Generated on-demand during briefing context assembly — no scheduler; missing periods computed and stored at that point |
| Summary trigger: no cron | Avoided scheduler dependency; lazy check on each briefing generation is sufficient for single-user app |

## Product Decisions (M5+)
| Decision | Rationale |
|---|---|
| Football has training/match split | Different load context for AI coach |
| Wellbeing log linkable to any event | Attach pain/fatigue to workout, football, or activity |
| Food logging deferred to M6 | Needs own milestone; more complex than other events |
| Meal type is free text with UI suggestions | Suggests breakfast/snack/lunch/snack/dinner but not enforced |
| Calories optional from day one | Will later be calculated by the system; stored as nullable int |
| Today view deferred to M8 | More useful after Insights data layer exists |
| Nav: Today / Workouts / Log / Insights (4 tabs, icons) | Plans merged into Workouts — infrequent enough to not need a permanent tab |
| Plans accessible via button on Workouts page | Simple; only needed for setup/editing |
| "Planned for today" = active plan quick-add | No calendar scheduling; user picks from active plan |
| Log tab date in URL (`/log?date=YYYY-MM-DD`) | Preserves date when navigating to/from detail views |
| Log tab + Workouts: calendar popup on date/week click | Arrows stay; clicking the label opens native date picker |
| Today view: `+` button + tappable event cards | Add or edit any log type directly from Today |
| Avg wellbeing stat removed from Today | Severity average is misleading without more context |

## Recent Decisions (M12 Planning)
| Decision | Detail |
|---|---|
| M12 workout triage entry point | Card on Today view when pending watch workouts exist (Option B); disappears when queue is clear |
| M12 Today health stats | Quick glance: steps + sleep; tap to open full panel with all 7 metrics (sleep, HR, HRV, steps, SpO2, stress, calories) |
| M12 Insights health | New Insights section with sleep, HR, steps charts |
| M12 briefing context | Health snapshot data (sleep, HR, steps etc.) fed into LLM briefing context |
| M12 Android companion app | Small Android app reads Gadgetbridge Content Provider and POSTs to PocketCoach API; minimal settings screen (URL + credentials); hourly WorkManager job; no API token — app calls /auth/login and stores session cookie |
| M12 Gadgetbridge setup | CMF Watch Pro 3 paired directly with Gadgetbridge (no K1 key needed in current version); connects automatically |
| M12 data pipeline | Gadgetbridge → Android companion app → PocketCoach API (via Cloudflare tunnel); historical data not imported (going forward only) |
| M12 acceptance test | End-to-end with real watch data after Android app is built; all UI work (Today health, triage, Insights, briefing) tested together |
| Cloudflare stable tunnel | Deferred — current trycloudflare.com URL changes on restart; needs domain + named tunnel (open decision) |

## Recent Decisions (M11 Planning)
| Decision | Detail |
|---|---|
| M11 scope | Gadgetbridge connector: DB tables, API ingestion endpoints, workout triage logic — backend only |
| M12 scope | Health data UI + LLM integration: workout triage UI, Today view health stats, Wellbeing/Insights charts, briefing context |
| M13 scope | LLM Tool Use (deferred from original M11 — build if real usage demands it) |
| Gadgetbridge chosen | CMF Watch Pro 3 is supported (experimental/partial); direct pairing, no server auth needed |
| Data in scope | Sleep, resting HR, HRV, steps, calories, SpO2, stress (daily); workouts with GPS/HR |
| Daily health data destination | New `daily_health_snapshots` table; surfaced in Wellbeing/Insights and Today view |
| Imported workouts | Auto-suggest type (gym/activity) based on Gadgetbridge workout type; user can edit; merge with existing manual workout or create new or save as ActivitySession |
| Workout merge | If gym session already logged manually, watch data (HR, duration) merges into it |
| Testing approach | Curl with sample Gadgetbridge payload fixtures during dev; real device acceptance test by Miro |
| Connector abstraction | Build Gadgetbridge concretely first; extract abstraction when a second source is added |

## Recent Decisions (M10)
| Decision | Detail |
|---|---|
| Summary trigger | Lazy — generated during briefing context assembly, no scheduler |
| Summary format | Structured JSON only, no prose |
| No backfill | Only forward from now; test data only, no historical migration |
| Workout exercise detail | Per-exercise: sets, avg_reps (nullable), min/max weight_kg (nullable) |
| Summary schema — workouts | `session_count`, `total_tonnage_kg`, `total_volume_sets`, `exercises[]` |
| Summary schema — football | `session_count`, `training_count`, `match_count`, `total_duration_minutes`, `avg_rpe` |
| Summary schema — activity | `session_count`, `total_duration_minutes`, `activity_types[]` |
| Summary schema — wellbeing | `log_count`, `avg_severity`, `body_parts_affected[]`, `log_types[]` |
| Summary schema — meals | `log_count`, `avg_daily_calories`, `days_with_logs` |

## Open Decisions
- **Persistent Cloudflare tunnel** — currently using a temporary trycloudflare.com URL (changes on restart). Needs a domain (~$10/yr) + named tunnel + cloudflared as systemd service for stability. See `docs/cloudflare-tunnel.md`.

## Blockers
- None currently

## Task Index
| Task | File | Status |
|---|---|---|
| TASK-001–007 | M1–M2 tasks | ✅ Done |
| TASK-008–012 | M3 tasks | ✅ Done |
| TASK-013 | [tasks/TASK-013-workouts-db.md](tasks/TASK-013-workouts-db.md) | ✅ Done |
| TASK-014 | [tasks/TASK-014-workouts-api.md](tasks/TASK-014-workouts-api.md) | ✅ Done |
| TASK-015 | [tasks/TASK-015-workouts-ui.md](tasks/TASK-015-workouts-ui.md) | ✅ Done |
| TASK-016 | [tasks/TASK-016-events-db.md](tasks/TASK-016-events-db.md) | ✅ Done |
| TASK-017 | [tasks/TASK-017-events-api.md](tasks/TASK-017-events-api.md) | ✅ Done |
| TASK-018 | [tasks/TASK-018-events-ui.md](tasks/TASK-018-events-ui.md) | ✅ Done |
| TASK-019 | [tasks/TASK-019-today-view.md](tasks/TASK-019-today-view.md) | ✅ Done |
| TASK-020 | [tasks/TASK-020-food-db.md](tasks/TASK-020-food-db.md) | ✅ Done |
| TASK-021 | [tasks/TASK-021-nav-refactor.md](tasks/TASK-021-nav-refactor.md) | ✅ Done |
| TASK-022 | [tasks/TASK-022-insights-infrastructure.md](tasks/TASK-022-insights-infrastructure.md) | ✅ Done |
| TASK-023–027 | Insights sections (gym/football/activity/wellbeing/meals) | ✅ Done |
| TASK-028 | Insights polish (summary chart, wellbeing fix, log/workouts date filters) | ✅ Done |
| TASK-029 | [tasks/TASK-029-ui-polish.md](tasks/TASK-029-ui-polish.md) | ✅ Done |
| TASK-030 | [tasks/TASK-030-llm-backend.md](tasks/TASK-030-llm-backend.md) | ✅ Done |
| TASK-031 | [tasks/TASK-031-llm-ui.md](tasks/TASK-031-llm-ui.md) | ✅ Done |
| TASK-032 | [tasks/TASK-032-data-summaries.md](tasks/TASK-032-data-summaries.md) | ✅ Done |
| TASK-033 | [tasks/TASK-033-gadgetbridge-db.md](tasks/TASK-033-gadgetbridge-db.md) | ✅ Done |
| TASK-034 | [tasks/TASK-034-gadgetbridge-ingest.md](tasks/TASK-034-gadgetbridge-ingest.md) | ✅ Done |
| TASK-035 | [tasks/TASK-035-gadgetbridge-triage.md](tasks/TASK-035-gadgetbridge-triage.md) | ✅ Done |
| TASK-036 | [tasks/TASK-036-today-health-triage.md](tasks/TASK-036-today-health-triage.md) | ✅ Done |
| TASK-037 | [tasks/TASK-037-insights-health.md](tasks/TASK-037-insights-health.md) | ✅ Done |
| TASK-038 | [tasks/TASK-038-briefing-health-context.md](tasks/TASK-038-briefing-health-context.md) | ✅ Done |
| TASK-039 | [tasks/TASK-039-android-companion-app.md](tasks/TASK-039-android-companion-app.md) | ⬜ Todo |
| TASK-040 | [tasks/TASK-040-cloudflare-stable-tunnel.md](tasks/TASK-040-cloudflare-stable-tunnel.md) | ⬜ Todo |
| TASK-041 | [tasks/TASK-041-m12-acceptance-test.md](tasks/TASK-041-m12-acceptance-test.md) | ⬜ Todo |

---
*Last updated: 2026-04-12 — M12 complete. Android companion app end-to-end verified: Gadgetbridge → Health Connect → PocketCoach API. Steps, sleep, and auth all working. M13 (LLM Tool Use) deferred until real usage demands it.*
