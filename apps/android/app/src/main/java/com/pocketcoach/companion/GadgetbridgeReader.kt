package com.pocketcoach.companion

import android.content.ContentResolver
import android.net.Uri
import android.util.Log
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

private const val TAG = "GBReader"

/**
 * Reads health data from the Gadgetbridge Content Provider.
 *
 * Prerequisites:
 *   1. Gadgetbridge installed with "Allow 3rd party access" enabled in its Settings.
 *   2. This app's manifest declares READ_CONTENT_PROVIDER permission.
 *
 * URI format (Gadgetbridge ≥ 0.76):
 *   content://nodomain.freeyourgadget.gadgetbridge.contentprovider/...
 *
 * If queries return null/empty, check:
 *   - Gadgetbridge 3rd-party access toggle
 *   - Device MAC address (use adb or Gadgetbridge debug info)
 *   - Column names (may vary by Gadgetbridge version — inspect cursor.columnNames)
 */
class GadgetbridgeReader(private val resolver: ContentResolver) {

    companion object {
        private const val AUTHORITY = "nodomain.freeyourgadget.gadgetbridge.contentprovider"

        // RAW_KIND values for sleep stages (Miband/common; CMF Watch Pro 3 may differ)
        private const val KIND_SLEEP_LIGHT = 1      // light sleep
        private const val KIND_SLEEP_DEEP = 5       // deep sleep
        private const val KIND_SLEEP_REM = 8        // REM sleep
        private const val KIND_SLEEP_AWAKE = 6      // awake during sleep window

        // Sentinel values meaning "no HR reading"
        private const val HR_NONE_1 = 0
        private const val HR_NONE_2 = 255
    }

    // -------------------------------------------------------------------------
    // Device discovery
    // -------------------------------------------------------------------------

    /**
     * Returns the MAC address of the first paired Gadgetbridge device.
     * URI: content://AUTHORITY/devicelist
     * Columns include: DEVICE_MAC, DEVICE_NAME, DEVICE_TYPE
     */
    fun getDeviceMac(): String? {
        val uri = Uri.parse("content://$AUTHORITY/devicelist")
        return try {
            resolver.query(uri, null, null, null, null)?.use { cursor ->
                if (!cursor.moveToFirst()) return null
                val macIdx = cursor.getColumnIndex("DEVICE_MAC")
                    .takeIf { it >= 0 } ?: run {
                    // Log available columns to help debug
                    Log.w(TAG, "DEVICE_MAC column not found. Columns: ${cursor.columnNames.joinToString()}")
                    return null
                }
                cursor.getString(macIdx)
            }
        } catch (e: Exception) {
            Log.e(TAG, "getDeviceMac failed", e)
            null
        }
    }

    // -------------------------------------------------------------------------
    // Daily health snapshot
    // -------------------------------------------------------------------------

    /**
     * Reads today's health data from Gadgetbridge and returns a JSONObject
     * matching the PocketCoach /gadgetbridge/daily schema.
     *
     * URI: content://AUTHORITY/activity/{deviceMac}/{startTs}/{endTs}
     * (timestamps in Unix seconds)
     *
     * Activity sample columns (Miband-style; CMF Watch may differ):
     *   TIMESTAMP, RAW_INTENSITY, STEPS, RAW_KIND, HEART_RATE
     */
    fun readDailySnapshot(date: LocalDate, deviceMac: String): JSONObject {
        val zone = ZoneId.systemDefault()
        val startTs = date.atStartOfDay(zone).toEpochSecond()
        val endTs = date.plusDays(1).atStartOfDay(zone).toEpochSecond()

        val uri = Uri.parse("content://$AUTHORITY/activity/$deviceMac/$startTs/$endTs")

        var totalSteps = 0
        var totalCalories = 0
        var hasCalories = false
        val hrValues = mutableListOf<Int>()
        val sleepKindMinutes = mutableMapOf<Int, Int>()  // kind → minute count

        try {
            resolver.query(uri, null, null, null, null)?.use { cursor ->
                Log.d(TAG, "Activity columns: ${cursor.columnNames.joinToString()}")

                val iSteps = cursor.getColumnIndex("STEPS")
                val iKind = cursor.getColumnIndex("RAW_KIND")
                val iHr = cursor.getColumnIndex("HEART_RATE")
                // "CALORIES" may not exist on all devices
                val iCal = cursor.getColumnIndex("CALORIES").takeIf { it >= 0 }

                while (cursor.moveToNext()) {
                    val steps = if (iSteps >= 0) cursor.getInt(iSteps) else 0
                    val kind = if (iKind >= 0) cursor.getInt(iKind) else -1
                    val hr = if (iHr >= 0) cursor.getInt(iHr) else 0
                    val cal = iCal?.let { cursor.getInt(it) } ?: 0

                    totalSteps += steps
                    if (iCal != null && cal > 0) {
                        totalCalories += cal
                        hasCalories = true
                    }
                    if (hr != HR_NONE_1 && hr != HR_NONE_2 && hr > 0) {
                        hrValues += hr
                    }
                    if (kind in listOf(KIND_SLEEP_LIGHT, KIND_SLEEP_DEEP, KIND_SLEEP_REM, KIND_SLEEP_AWAKE)) {
                        // Each row in Gadgetbridge activity represents a 1-minute bucket
                        sleepKindMinutes[kind] = (sleepKindMinutes[kind] ?: 0) + 1
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "readDailySnapshot failed", e)
        }

        val lightMinutes = sleepKindMinutes[KIND_SLEEP_LIGHT] ?: 0
        val deepMinutes = sleepKindMinutes[KIND_SLEEP_DEEP] ?: 0
        val remMinutes = sleepKindMinutes[KIND_SLEEP_REM] ?: 0
        val awakeMinutes = sleepKindMinutes[KIND_SLEEP_AWAKE] ?: 0
        val totalSleepMinutes = lightMinutes + deepMinutes + remMinutes

        val sleep = if (totalSleepMinutes > 0) {
            JSONObject().apply {
                put("duration_minutes", totalSleepMinutes)
                put("deep_minutes", deepMinutes)
                put("light_minutes", lightMinutes)
                put("rem_minutes", remMinutes)
                put("awake_minutes", awakeMinutes)
            }
        } else null

        // Resting HR approximation: minimum valid reading of the day
        val restingHr = hrValues.minOrNull()

        return JSONObject().apply {
            put("date", date.toString())
            put("steps", if (totalSteps > 0) totalSteps else JSONObject.NULL)
            put("calories_active", if (hasCalories && totalCalories > 0) totalCalories else JSONObject.NULL)
            put("resting_hr", restingHr ?: JSONObject.NULL)
            put("hrv", JSONObject.NULL)        // TODO: query HRV if available
            put("spo2", JSONObject.NULL)       // TODO: query SpO2 if available
            put("stress_avg", JSONObject.NULL) // TODO: query stress if available
            put("sleep", sleep ?: JSONObject.NULL)
        }
    }

    // -------------------------------------------------------------------------
    // Recent workouts
    // -------------------------------------------------------------------------

    /**
     * Returns workout sessions recorded by Gadgetbridge in the last 24 hours.
     *
     * URI: content://AUTHORITY/workout_samples/{deviceMac}/{startTs}/{endTs}
     *
     * Expected columns: ID (or TIMESTAMP as dedup key), WORKOUT_TYPE (or ACTIVITY_TYPE),
     * START_TIME, END_TIME, DURATION, AVG_HEART_RATE, MAX_HEART_RATE, CALORIES, STEPS
     *
     * NOTE: Gadgetbridge workout URI/columns vary by version and device.
     * Check cursor.columnNames in logcat and adjust column names here if needed.
     */
    fun readRecentWorkouts(deviceMac: String): List<JSONObject> {
        val nowTs = Instant.now().epochSecond
        val sinceTs = nowTs - 86400  // last 24h

        val uri = Uri.parse("content://$AUTHORITY/workout_samples/$deviceMac/$sinceTs/$nowTs")
        val result = mutableListOf<JSONObject>()

        try {
            resolver.query(uri, null, null, null, null)?.use { cursor ->
                Log.d(TAG, "Workout columns: ${cursor.columnNames.joinToString()}")

                val iId = cursor.getColumnIndex("ID").takeIf { it >= 0 }
                    ?: cursor.getColumnIndex("TIMESTAMP").takeIf { it >= 0 }
                val iType = cursor.getColumnIndex("WORKOUT_TYPE").takeIf { it >= 0 }
                    ?: cursor.getColumnIndex("ACTIVITY_TYPE").takeIf { it >= 0 }
                val iStart = cursor.getColumnIndex("START_TIME").takeIf { it >= 0 }
                    ?: cursor.getColumnIndex("START_TIMESTAMP").takeIf { it >= 0 }
                val iEnd = cursor.getColumnIndex("END_TIME").takeIf { it >= 0 }
                    ?: cursor.getColumnIndex("END_TIMESTAMP").takeIf { it >= 0 }
                val iDuration = cursor.getColumnIndex("DURATION").takeIf { it >= 0 }
                val iAvgHr = cursor.getColumnIndex("AVG_HEART_RATE").takeIf { it >= 0 }
                    ?: cursor.getColumnIndex("AVERAGE_HR").takeIf { it >= 0 }
                val iMaxHr = cursor.getColumnIndex("MAX_HEART_RATE").takeIf { it >= 0 }
                    ?: cursor.getColumnIndex("MAX_HR").takeIf { it >= 0 }
                val iCal = cursor.getColumnIndex("CALORIES").takeIf { it >= 0 }

                while (cursor.moveToNext()) {
                    val id = iId?.let { cursor.getLong(it) } ?: continue
                    val type = iType?.let { cursor.getString(it) } ?: "UNKNOWN"
                    val startTs = iStart?.let { cursor.getLong(it) }
                    val endTs = iEnd?.let { cursor.getLong(it) }

                    val durationSeconds = when {
                        iDuration != null -> cursor.getInt(iDuration)
                        startTs != null && endTs != null -> (endTs - startTs).toInt()
                        else -> null
                    }
                    val durationMinutes = durationSeconds?.let { it / 60 }

                    val startedAt = startTs?.let {
                        Instant.ofEpochSecond(it).toString()  // ISO-8601 UTC
                    }
                    val endedAt = endTs?.let {
                        Instant.ofEpochSecond(it).toString()
                    }

                    val avgHr = iAvgHr?.let { cursor.getInt(it) }.takeIf { it != null && it > 0 }
                    val maxHr = iMaxHr?.let { cursor.getInt(it) }.takeIf { it != null && it > 0 }
                    val calories = iCal?.let { cursor.getInt(it) }.takeIf { it != null && it > 0 }

                    result += JSONObject().apply {
                        put("source_id", "gadgetbridge_${deviceMac}_$id")
                        put("workout_type", type)
                        put("started_at", startedAt ?: JSONObject.NULL)
                        put("ended_at", endedAt ?: JSONObject.NULL)
                        put("duration_minutes", durationMinutes ?: JSONObject.NULL)
                        put("avg_hr", avgHr ?: JSONObject.NULL)
                        put("max_hr", maxHr ?: JSONObject.NULL)
                        put("calories", calories ?: JSONObject.NULL)
                        put("notes", JSONObject.NULL)
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "readRecentWorkouts failed", e)
        }

        return result
    }
}
