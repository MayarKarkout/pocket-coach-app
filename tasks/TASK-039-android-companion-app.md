# TASK-039: Android Companion App
Status: IN PROGRESS
Milestone: M12

## Goal
Build a small Android app that reads health data from Health Connect and POSTs it to the PocketCoach API hourly. Minimal settings screen; no other UI.

## Subtasks
- [x] Create Android project at `apps/android/` (Kotlin, min SDK 26)
- [x] Settings screen: URL + email + password fields (SharedPreferences)
- [x] Auth: POST `/auth/login`, store session cookie, reuse on subsequent requests
- [x] Health Connect reader: daily health snapshot (steps, sleep, HR, HRV, SpO2, calories)
- [x] Health Connect reader: recent workouts (last 24h, deduped by source_id)
- [x] WorkManager periodic job: hourly, reads data → POSTs to `/gadgetbridge/daily` + `/gadgetbridge/workout`
- [x] Handle cookie expiry: re-login if 401 received
- [ ] Verify Health Connect permissions grant works end-to-end
- [ ] Confirm data flows from Gadgetbridge → Health Connect → PocketCoach API

## Decisions
- Switched from Gadgetbridge ContentProvider (doesn't exist) to Health Connect API
- Gadgetbridge syncs to Health Connect; app reads from Health Connect
- Auth: session cookie (POST /auth/login), no API token
- Hourly WorkManager job with CONNECTED network constraint
- Build: Android Studio on Windows; APK installed directly to phone; project in `apps/android/`
- `source_id` for workouts: `hc_{healthConnectRecordId}` — deterministic, prevents duplicates
- AGP 8.5.2, compileSdk 35, Gradle 8.7, Health Connect 1.1.0-alpha11

## Where we left off
App builds and installs. Daily snapshot partially works (steps, sleep, HR reading) but
ExerciseSessionRecord throws SecurityException — Exercise permission not granted in Health Connect.

The auto-permission request on launch wasn't triggering the dialog, so we added an explicit
**"Grant Health Connect Permissions"** button. This is the last commit (41e755f).

**Next session:**
1. Pull latest on Windows, rebuild, install
2. Tap "Grant Health Connect Permissions" → grant everything in the dialog
3. Tap "Sync Now" — verify no more SecurityException in logcat
4. Confirm data appears in PocketCoach Today / Insights
5. If data doesn't flow: check Gadgetbridge → Health Connect sync is actually running
   (in Gadgetbridge: Settings → External Integrations → Health Connect → verify permissions granted to Gadgetbridge)
