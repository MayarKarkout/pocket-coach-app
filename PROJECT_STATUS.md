# PocketCoach — Project Status

## Current Milestone
**M21: Nav Consolidation** — ✅ Done

**M20: Coach Intelligence Rehaul** — ✅ Done

**M19: Bug Fixes** — ✅ Done

**M18: Natural Language Logging** — ✅ Done

**M17: Coach Intelligence (Briefing Quality)** — ✅ Done

**M16: Macro Intelligence** — ✅ Done

**M15: Food Library + Meal Builder** — ✅ Done

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
| M14 | Performance & Polish | ✅ Done |
| M15 | Food Library + Meal Builder | ✅ Done |
| M16 | Macro Intelligence (Coach + Insights) | ✅ Done |
| M17 | Coach Intelligence (Briefing Quality) | ✅ Done |
| M18 | Natural Language Logging | ✅ Done |
| M19 | Bug Fixes (delete, date-default) | ✅ Done |
| M20 | Coach Intelligence Rehaul (tone, missing-data, briefing structure) | ✅ Done |
| M21 | Nav Consolidation (Workouts → Log merge) | ✅ Done |

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

## What's Done (M16 — Macro Intelligence)
- Migration 0016: `protein_g`, `carbs_g`, `fat_g` (Numeric 6,1) added to `meal_logs`
- Macro computation on save: library meals → ingredients × macros per 100g (exact, synchronous); single food → food_item × grams (exact, synchronous, frontend passes `food_item_id` + `food_item_grams`); free text → AI background task now returns JSON with P/C/F + kcal
- Library meals with notes: AI adjusts all 4 values (kcal + macros) using base macros as context
- Food tab daily summary card shows `Xg P · Xg C · Xg F` when any meal has macro data
- Insights: new stacked bar chart (protein / carbs / fat per day) below the kcal chart in the Meals section
- Briefing context: meals now listed per-entry with time (`[HH:MM]`), kcal, and per-macro breakdown; daily macro totals appended

## Recent Decisions (M15 — Food Library + Meal Builder)
| Decision | Detail |
|---|---|
| Add Meal form: three tabs | Library / Single food / Free text — replaces stacked conditional UI |
| Single food tab | Pick one food item from OFF/library, enter grams, logs with computed kcal and `"{name} ({grams}g)"` as notes. No definition needed. |
| AI-adjusted kcal for library + notes | Base kcal stored immediately; background AI task gets full ingredient list + base kcal + notes and overwrites with adjusted estimate. `calories_estimated=True` on the log entry. |
| Ingredients | Structured: food_item (from food DB) + quantity in grams. Notes on definitions are descriptive only, not parsed for nutrition. |
| Units | Grams only in M15. ml/pieces deferred. |
| food_items schema | `id`, `name`, `kcal_per_100g` (required), `protein_per_100g`, `carbs_per_100g`, `fat_per_100g` (nullable), `source` ("open_food_facts"\|"manual"), `off_id` (nullable). Macros stored now (free from OFF) to avoid backfill in M16. |
| meal_definitions | Named recipes: `id`, `name`, `notes` (nullable), `created_at`, `updated_at`. Ingredient-less definitions allowed (name + manual kcal). Kcal total calculated on read, not stored. |
| meal_ingredients | `meal_definition_id` FK, `food_item_id` FK, `quantity_grams` (Decimal). |
| meal_logs updates | Add `meal_definition_id` (nullable FK, SET NULL on delete) + `portion_multiplier` (nullable Decimal). When both set: calories = definition kcal × multiplier, `calories_estimated=False`, AI estimation skipped. |
| Snapshot pattern | Editing a definition never updates past meal_logs. Same rule as workouts vs. plans. |
| Portions UX | Preset buttons (Whole / ½ / ⅓ / ¼) populate a number input. Custom decimal values supported. Live kcal preview shown. |
| Save as definition | Checkbox in Add Meal form. When checked: ingredient section expands inline (same typeahead as library). Definition name defaults to meal_type. Ingredient-less save allowed. |
| Free-text path | Unchanged — meal_type + notes + AI calorie estimation. No regression. |
| Macros on meal_logs | Deferred to M16. food_items stores macros; meal_logs does not get protein/carbs/fat columns yet. |
| Nav | 4 tabs: Today / Workouts / Log / Food. Insights removed from nav; "View Insights →" button added to Today stats section. Insights routes unchanged. |
| Log tab | Food entries remain in combined feed. Show/hide food checkbox deferred to a later milestone. |
| Food tab | `/food` — date-navigable meal feed, daily calorie total, "+ Add Meal", "Meal Library →" link. Empty state says "Nothing logged yet" (not 0 kcal). |
| Editability | Everything editable: meal logs (including definition link + portion), meal definitions, ingredients, food items. |
| Food prompts | Deferred to a future milestone (M18+): proactive prompts to log food based on last meal time + time of day. |
| Open Food Facts | Search → upsert into local `food_items` by `off_id`. Graceful fallback to local search if OFF unreachable. |

## Recent Decisions (M15–M17 Planning)
| Decision | Detail |
|---|---|
| M15 scope | Food Library + Meal Builder: `food_items` table (kcal + macros per 100g), `meal_definitions` (named recipes with ingredients), updated `meal_logs` (quick-add from recent/frequent definitions + portion multiplier, free-text fallback preserved), macro totals on log entries + daily summary |
| M16 scope | Macro Intelligence: daily macro targets (configurable in settings), Insights macro breakdown charts, coach briefing context includes macro actuals vs targets + meal timing |
| M17 scope | Coach Intelligence: time-aware context (current time of day, don't comment on incomplete-day metrics), data priority guidance (RHR/SpO2 = background, only flag if abnormal), missing data = unknown not zero |
| Food DB | Open Food Facts (free, open-source, ~3M products, international) — search on ingredient add, cache result in local `food_items` table; no lock-in, works offline after first lookup |
| AI estimation | Kept as fallback for free-text meal entries where no meal definition is selected |
| Milestone split rationale | M15 is DB/migration-heavy; M16 adds coach + insights layer on top; M17 is prompt/context engineering only — can ship independently |

## What's Done (M15 — Food Library + Meal Builder)
- `food_items` table + migration 0015 (kcal + optional macros per 100g, `source`, unique `off_id`)
- Open Food Facts search integration: `/food-items/search` typeahead, OFF hits auto-upserted by off_id, graceful fallback to local search if OFF unreachable
- `meal_definitions` + `meal_ingredients` tables; ingredient rows = food_item × grams; kcal totals computed on read; snapshot pattern (editing a definition never updates past logs)
- `meal_logs` gains `meal_definition_id` + `portion_multiplier`; when both present, kcal = definition × multiplier, AI estimation skipped
- Nav refactored → Today / Workouts / Log / Food (Insights moved to a "View Insights →" link on Today stats)
- `/food` tab: date-navigable meal feed, daily kcal total, `+ Add Meal` → `/food/new`, `Meal Library →` link
- `/food/library`: list / new / edit meal definitions with ingredient typeahead, live kcal preview
- `/food/new` (Add Meal): three tabs — **Library** (definition typeahead + portion presets Whole/½/⅓/¼ + custom decimal + live kcal preview), **Single food** (pick one food item, enter grams, logs with computed kcal + name in notes), **Free text** (notes + optional calories + AI estimation + save-as-definition)
- Food typeahead supports adding a custom food inline when no search matches (name + kcal/100g)
- AI-adjusted kcal: when a library meal is logged with notes (e.g. "2 extra eggs"), base kcal is stored immediately then a background AI task re-estimates incorporating the modification

## Recent Decisions (M14 — Performance & Polish)
| Decision | Detail |
|---|---|
| Loading states: simple spinner | Use a simple spinner (not skeleton shapes) for all route loading states |
| TASK-044: Frontend loading states | Add `loading.tsx` with spinner to Today, Log, Workouts, Insights routes; wrap data sections in Suspense — fixes "Rendering..." dead time on navigation |
| TASK-045: Log tab zoom bug | Find and fix viewport overflow on Log page causing mobile browser auto-zoom; small CSS fix |
| TASK-046: Backend query optimisation | Add date indexes (migration), fix N+1 in gym insights with `selectinload`, parallelize Today endpoint queries, add server-side date filtering to Log endpoint, cache LLM context for the day |
| Task order | 044 → 045 → 046; frontend feel first, DB migration last |

## Recent Decisions — AI Calorie Estimation
| Decision | Detail |
|---|---|
| Calories estimated by AI | On meal save, backend triggers async AI call to estimate kcal from notes |
| Async, non-blocking | Form closes immediately; calories field populates in feed once estimate arrives |
| Manual override kept | Calories field stays on create form; user can enter exact value to skip estimation |
| Edit always available | Estimated (or any) calories editable after the fact via edit form |
| Vague notes: warn + call anyway | Non-blocking UI warning if notes are sparse; AI call still fires (name alone may suffice) |
| LLM context flag | `calories_estimated: bool` on `meal_logs`; passed to Coach briefing so it hedges on estimated values |
| Interim solution | AI estimation is a stopgap until a proper food DB / barcode system is built |

## Deployment
Push to `main` → GitHub Actions auto-deploys via Tailscale SSH to `goodold@100.104.55.29`. Runs `git pull`, `docker compose up --build -d`, `alembic upgrade head`. No manual steps needed.

## Recent Decisions (TASK-040/041)
| Decision | Detail |
|---|---|
| Stable tunnel approach | Tailscale instead of Cloudflare tunnel — free, private, no domain needed, works from any device with Tailscale installed |
| Domain deferred | Buy a domain only if/when PocketCoach is shared with others |
| TASK-039 | Done — Android companion app end-to-end verified |

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

## What's Done (M17 — Coach Intelligence)
- Time-aware context: current local time passed into context; today's label includes the time and a `[MORNING]` flag before noon instructing the LLM not to evaluate incomplete-day totals
- Health signal priority: BRIEFING_SYSTEM instructs LLM to treat RHR/SpO2/HRV/stress as background signals — only flag if clearly abnormal, never recite as routine stats
- Missing data semantics: days with no meal logs now show "No meals logged — food intake unknown, not zero"; days without a health snapshot show "No health data — device metrics unknown"; BRIEFING_SYSTEM instructs LLM to treat absent data as unknown, never imply zero

## Recent Decisions (M17 — Coach Intelligence)
| Decision | Detail |
|---|---|
| Time-aware context | Pass current local time into briefing; before midday, LLM should not draw conclusions from today's step count, calorie total, or activity (day is incomplete) |
| Health signal priority | RHR, SpO2, HRV, stress are background signals — only flag if meaningfully abnormal; don't recite as routine stats |
| Missing data = unknown | Absent food logs, missing health snapshots, null fields → represented as "no data" in context; LLM instructed never to imply zero |

## Recent Decisions (M16 — Macro Intelligence)
| Decision | Detail |
|---|---|
| No macro targets | Track actuals only — no daily targets, no settings page in M16 |
| Macro sources | Library meals: computed from ingredients × macros per 100g (exact, synchronous). Single food: item macros × grams (exact, synchronous). Free text: extend existing AI background task to return P/C/F alongside kcal |
| meal_logs macro columns | Add `protein_g`, `carbs_g`, `fat_g` (nullable Decimal) — migration required |
| Food tab macro display | Daily macro totals alongside kcal (e.g. "2100 kcal · 180g P · 220g C · 60g F") |
| Insights macro chart | Stacked bar (P/C/F per day) in food section, using existing time window selector |
| Briefing context | Add meal times (`occurred_at`) + daily macro actuals to LLM context |

## What's Done (M18 — Natural Language Logging)
- `POST /quick-log/parse` — free text → draft entries via Gemini Flash (synchronous); all 5 entry types (meal, activity, football, wellbeing, gym workout with exercises + sets); date inference ("yesterday", weekdays) + optional local time → UTC `occurred_at`
- `POST /quick-log/commit` — creates confirmed drafts server-side; gym workouts created plan-less (`plan_day_id=null`, LLM label); meals without stated kcal trigger the existing AI nutrition estimation background task
- `/quick-log` page: textarea → review screen with per-type editable cards (delete entry, edit any field, add/remove workout sets + exercises) → save all → back to Today
- Today `+` menu: "✨ Quick Log" entry at the top
- Quick Log workout draft editor has full parity with the manual `/workouts/[id]` editor: superset grouping, timed-vs-rep sets with min–max ranges, per-set notes, duplicate-set
- `per_side` (unilateral exercise flag) extended from plan templates to logged workouts — migration 0017 adds it to `workout_exercises`; editable in the manual workout editor (add-exercise checkbox + inline toggle, "/ side" shown on set rows) and in Quick Log (LLM detects "per side"/"each leg" phrasing); plan-day snapshot and copy-from-workout both carry it over
- Verified end-to-end locally: parse quality (5 types from one blob, "6pm" → 18:00, "3x5 at 100kg" → 3 set rows, supersets, timed sets, per-set notes, per_side), commit, AI kcal estimation on committed meals, manual exercise add/PATCH with per_side

## Recent Decisions (M18 — Natural Language Logging)
| Decision | Detail |
|---|---|
| Entry point | New "Quick Log" option in the `+` menu on Today view |
| UI | Dedicated `/quick-log` page with a single textarea; user types anything in natural language |
| LLM | Gemini Flash, synchronous call (user waits for parse result) |
| Entry types | All types: meal logs, activity sessions, football sessions, wellbeing logs, gym workouts (with exercises + sets) |
| Multi-entry | One submission can produce multiple entries (e.g. a full day parsed into 4–5 records) |
| Date inference | LLM infers date from context ("yesterday", "this morning"); defaults to today if unspecified |
| Confirm screen | Parsed entries shown as editable cards; user can edit inline, delete individual entries, then save all |
| Additive only | Does not replace any existing forms; purely augments current input mechanisms |

## What's Done (M19 — Bug Fixes)
- Delete confirm no longer resets on blur (was dropping a deliberate second tap on mobile); auto-resets 3s after arming instead, so the tap-to-arm/tap-to-confirm pattern is reliable
- Football/Activity/Wellbeing new-entry forms (`/log/football/new`, `/log/activity/new`, `/log/wellbeing/new`) now read the viewed date from the URL and default to it, matching the existing Meal flow — fixes new entries silently defaulting to today when logging against a past/future day from the Log tab

## What's Done (M20 — Coach Intelligence Rehaul)
- `llm_context.py`: dropped the "No meals logged" / "No health data" placeholder lines entirely — absent food/health data is no longer surfaced in LLM context at all
- `briefing.py`: persona reframed from "realistic and demanding" to "data-oriented and realistic"; "Missing data" rules block removed (moot — context no longer emits it); new "Primary signal" note establishes workouts/football/activity as the reliable signal to reason from
- Daily briefing format gains a `GOING WELL / TO IMPROVE` section (between TRENDS and TODAY'S ADVICE); "TODAY'S ADVICE" prescriptive recommendation kept
- Verified end-to-end via a live `/briefing/today/regenerate` call against Gemini: new section renders with data-grounded content, tone reads as neutral/data-driven rather than demanding, and no missing-food/health commentary appears

## What's Done (M21 — Nav Consolidation)
- `GET /workouts` gains an optional `date` query filter (mirrors the existing pattern on `/football`, `/activity`, etc.)
- Log tab feed now includes workouts: new `WorkoutCard`, `workout` entry in `TYPE_FILTERS`, `+ Workout` action button (`/workouts/new?date=`), delete wired to `DELETE /workouts/{id}`
- Workouts week-view list route removed (`apps/web/app/workouts/page.tsx`, `workouts-list.tsx`, `loading.tsx`) — fully superseded by Log's day-by-day view; workout detail/edit (`/workouts/[id]`) and creation (`/workouts/new`) routes kept and now linked from Log
- `/workouts/new` fixed to read the viewed date from the URL (same bug class as M19, fixed here since this task already touched the flow's entry point)
- Nav bar reduced to Today / Log / Food; Plans relocated to a "Plans →" link on the Log tab
- Also removed `apps/web/app/log/events-feed.tsx`, discovered to be dead code (an unused, unimported duplicate of `log/page.tsx`'s feed/card components)
- Verified via `tsc --noEmit` (clean) and live API smoke test: `GET /workouts?date=` filters correctly, `DELETE /workouts/{id}` returns proper 404 on a missing id

## Recent Decisions (M19 Planning — Bug Fixes)
| Decision | Detail |
|---|---|
| Delete confirm bug | Root cause: `events-feed.tsx` `DeleteButton` two-tap confirm pattern breaks on mobile (blur fires before second tap registers, no visual cue on first tap). Keep the tap-to-arm/tap-to-confirm pattern — fix the reliability bug, don't redesign the interaction. |
| Date-defaults-to-today bug | Root cause: Log tab "new X" forms (confirmed in `new-activity-form.tsx`, likely all of activity/football/wellbeing/meal) initialize date state to `todayISO()` and never read the `date` query param carried in the URL from the viewed day. Fix: read the viewed date from the URL and use it as the default. |

## Recent Decisions (M20 Planning — Coach Intelligence Rehaul)
| Decision | Detail |
|---|---|
| Missing food/health data | Drop entirely — never comment on absent meal logs or health snapshots. Food/health only referenced when present and directly relevant. Supersedes the M17 "missing data = unknown, not zero" framing (that instruction is now moot since absence won't be mentioned at all). Activities (workouts/football/activity sessions) are the primary, always-reliable signal. |
| Coach tone | Drop "demanding"/"harsh" framing. New framing: data-oriented and realistic. Still ends with a concrete, prescriptive recommendation (keep the "Today's Advice" structure) — just delivered neutrally, not pushily. Applies to both `BRIEFING_SYSTEM` and `CHAT_SYSTEM` in `briefing.py`. |
| Briefing structure | Add a new section: what's going well / what to improve, alongside the existing 7-day summary, trends, and advice sections. |

## Recent Decisions (M21 Planning — Nav Consolidation)
| Decision | Detail |
|---|---|
| Workouts tab removed | Workouts sessions move fully into the Log tab feed (new "Workout" type + filter pill), addable from Log's add flow. No more separate Workouts tab. |
| Week-view browsing dropped | Workouts tab's week-view (Mon–Sun, prev/next week arrows) is not carried over. Log's existing day-by-day navigation is sufficient — accepted trade-off, not preserved. |
| Plans access | Plan management (create/edit plan templates) becomes a link off Log or Today, same pattern as "Meal Library →" on Food and "View Insights →" on Today. |
| Nav after M21 | Today / Log / Food (3 tabs) + Insights link + Plans link. To be finalized when M21 is scoped into tasks. |

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
| TASK-042 | tasks/TASK-042-ai-calorie-estimation.md | ✅ Done |
| TASK-044 | tasks/TASK-044-frontend-loading-states.md | ✅ Done |
| TASK-045 | tasks/TASK-045-log-zoom-fix.md | ✅ Done |
| TASK-046 | tasks/TASK-046-backend-query-optimisation.md | ✅ Done |
| TASK-047 | tasks/TASK-047-food-items-backend.md | ✅ Done |
| TASK-048 | tasks/TASK-048-meal-definitions-backend.md | ✅ Done |
| TASK-049 | tasks/TASK-049-meallog-backend-updates.md | ✅ Done |
| TASK-050 | tasks/TASK-050-nav-food-tab.md | ✅ Done |
| TASK-051 | tasks/TASK-051-meal-library-ui.md | ✅ Done |
| TASK-052 | tasks/TASK-052-add-meal-quickadd-ui.md | ✅ Done |
| TASK-053 | tasks/TASK-053-macro-columns-backend.md | ✅ Done |
| TASK-054 | tasks/TASK-054-food-tab-macros.md | ✅ Done |
| TASK-055 | tasks/TASK-055-insights-macro-chart.md | ✅ Done |
| TASK-056 | tasks/TASK-056-briefing-meal-context.md | ✅ Done |
| TASK-057 | tasks/TASK-057-time-aware-context.md | ✅ Done |
| TASK-058 | tasks/TASK-058-health-signal-priority.md | ✅ Done |
| TASK-059 | tasks/TASK-059-missing-data-semantics.md | ✅ Done |
| TASK-060 | tasks/TASK-060-natural-language-logging.md | ✅ Done |
| TASK-061 | tasks/TASK-061-bug-fixes.md | ✅ Done |
| TASK-062 | tasks/TASK-062-coach-intelligence-rehaul.md | ✅ Done |
| TASK-063 | tasks/TASK-063-nav-consolidation.md | ✅ Done |

---
*Last updated: 2026-08-17 — M19/M20/M21 shipped (bug fixes, coach intelligence rehaul, nav consolidation). M13 (LLM Tool Use) still deferred.*
