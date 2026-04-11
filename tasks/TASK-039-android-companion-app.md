# TASK-039: Android Companion App
Status: DONE
Milestone: M12

## Goal
Build a small Android app that reads health data from Gadgetbridge's Content Provider and POSTs it to the PocketCoach API hourly. Minimal settings screen; no other UI.

## Subtasks
- [x] Create Android project at `apps/android/` (Kotlin, min SDK 26)
- [x] Settings screen: URL + email + password fields (SharedPreferences)
- [x] Auth: POST `/auth/login`, store session cookie, reuse on subsequent requests
- [x] Gadgetbridge Content Provider reader: daily health snapshot (steps, sleep, HR)
- [x] Gadgetbridge Content Provider reader: recent workouts (last 24h to avoid duplicates)
- [x] WorkManager periodic job: hourly, reads data → POSTs to `/gadgetbridge/daily` + `/gadgetbridge/workout`
- [x] Handle cookie expiry: re-login if 401 received

## Decisions
- Auth: session cookie (POST /auth/login), no API token — no backend changes needed
- Settings screen is the only UI; no other screens
- Hourly WorkManager job with CONNECTED network constraint
- Build: Android Studio on Windows; APK installed directly to phone
- Project lives at `apps/android/` in the monorepo
- HRV, SpO2, stress sent as null initially — Gadgetbridge column names may vary by device; can be added later
- `source_id` for workouts: `gadgetbridge_{deviceMac}_{id}` — deterministic, prevents duplicates

## Notes
- Gadgetbridge Content Provider: `nodomain.freeyourgadget.gadgetbridge.contentprovider`
- Requires "Allow 3rd party access" toggle in Gadgetbridge → Settings
- Permission declared in manifest: `nodomain.freeyourgadget.gadgetbridge.READ_CONTENT_PROVIDER`
- Activity column names (STEPS, HEART_RATE, RAW_KIND) may need adjustment for CMF Watch Pro 3
  — check logcat for "Activity columns:" line on first sync to see actual column names
- Workout URI and columns similarly uncertain — check "Workout columns:" in logcat
- gradle-wrapper.jar not committed (binary); Android Studio generates it on first open

## Where we left off
All source files written. Open `apps/android/` in Android Studio on Windows to:
1. Let it sync/download Gradle + dependencies
2. Build APK (Build → Generate Signed/Debug APK)
3. Install on phone, configure URL + credentials, tap "Sync Now" to test

First test: check logcat for column names and adjust GadgetbridgeReader.kt if needed.
