package com.pocketcoach.companion

import android.content.Context
import android.util.Log
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.records.*
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import org.json.JSONObject
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

private const val TAG = "HealthReader"

// Filter to Gadgetbridge data only — avoids double-counting with phone's native health app
private const val GB_PACKAGE = "nodomain.freeyourgadget.gadgetbridge"

private fun <T : Record> List<T>.fromGadgetbridge() =
    filter { it.metadata.dataOrigin.packageName.startsWith(GB_PACKAGE) }

class HealthConnectReader(private val context: Context) {

    private val client by lazy { HealthConnectClient.getOrCreate(context) }

    // -------------------------------------------------------------------------
    // Daily health snapshot
    // -------------------------------------------------------------------------

    suspend fun readDailySnapshot(date: LocalDate): JSONObject {
        val zone = ZoneId.systemDefault()
        val start = date.atStartOfDay(zone).toInstant()
        val end = date.plusDays(1).atStartOfDay(zone).toInstant()
        val range = TimeRangeFilter.between(start, end)

        val steps = readSteps(range)
        val calories = readCalories(range)
        val restingHr = readRestingHr(range)
        val hrv = readHrv(range)
        val spo2 = readSpo2(range)
        val sleep = readSleep(date, zone)

        return JSONObject().apply {
            put("date", date.toString())
            put("steps", steps ?: JSONObject.NULL)
            put("calories_active", calories ?: JSONObject.NULL)
            put("resting_hr", restingHr ?: JSONObject.NULL)
            put("hrv", hrv ?: JSONObject.NULL)
            put("spo2", spo2 ?: JSONObject.NULL)
            put("stress_avg", JSONObject.NULL)
            put("sleep", sleep ?: JSONObject.NULL)
        }
    }

    private suspend fun readSteps(range: TimeRangeFilter): Int? {
        return try {
            val total = client.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records
                .fromGadgetbridge()
                .sumOf { it.count }
            if (total > 0) total.toInt() else null
        } catch (e: Exception) {
            Log.w(TAG, "readSteps failed", e)
            null
        }
    }

    private suspend fun readCalories(range: TimeRangeFilter): Int? {
        return try {
            val total = client.readRecords(ReadRecordsRequest(TotalCaloriesBurnedRecord::class, range)).records
                .fromGadgetbridge()
                .sumOf { it.energy.inKilocalories }
            if (total > 0) total.toInt() else null
        } catch (e: Exception) {
            Log.w(TAG, "readCalories failed", e)
            null
        }
    }

    private suspend fun readRestingHr(range: TimeRangeFilter): Int? {
        return try {
            val resting = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records
                .fromGadgetbridge()
            if (resting.isNotEmpty()) return resting.last().beatsPerMinute.toInt()

            val hrSamples = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range)).records
                .fromGadgetbridge()
                .flatMap { it.samples }
                .map { it.beatsPerMinute }
            hrSamples.minOrNull()?.toInt()
        } catch (e: Exception) {
            Log.w(TAG, "readRestingHr failed", e)
            null
        }
    }

    private suspend fun readHrv(range: TimeRangeFilter): Double? {
        return try {
            val records = client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range)).records
                .fromGadgetbridge()
            if (records.isEmpty()) null else records.map { it.heartRateVariabilityMillis }.average()
        } catch (e: Exception) {
            Log.w(TAG, "readHrv failed", e)
            null
        }
    }

    private suspend fun readSpo2(range: TimeRangeFilter): Double? {
        return try {
            val records = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, range)).records
                .fromGadgetbridge()
            if (records.isEmpty()) null else records.map { it.percentage.value }.average()
        } catch (e: Exception) {
            Log.w(TAG, "readSpo2 failed", e)
            null
        }
    }

    private suspend fun readSleep(date: LocalDate, zone: ZoneId): JSONObject? {
        return try {
            // Last night's sleep: sessions ending between 6pm yesterday and 2pm today
            val windowStart = date.minusDays(1).atTime(18, 0).atZone(zone).toInstant()
            val windowEnd = date.atTime(14, 0).atZone(zone).toInstant()
            val range = TimeRangeFilter.between(windowStart, windowEnd)

            val session = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range)).records
                .fromGadgetbridge()
                .maxByOrNull { it.endTime.epochSecond - it.startTime.epochSecond }
                ?: return null

            var deepMinutes = 0
            var lightMinutes = 0
            var remMinutes = 0
            var awakeMinutes = 0

            for (stage in session.stages) {
                val mins = ((stage.endTime.epochSecond - stage.startTime.epochSecond) / 60).toInt()
                when (stage.stage) {
                    SleepSessionRecord.STAGE_TYPE_DEEP -> deepMinutes += mins
                    SleepSessionRecord.STAGE_TYPE_LIGHT -> lightMinutes += mins
                    SleepSessionRecord.STAGE_TYPE_REM -> remMinutes += mins
                    SleepSessionRecord.STAGE_TYPE_AWAKE_IN_BED -> awakeMinutes += mins
                }
            }

            // duration_minutes = actual sleep (excludes awake); fall back to session length if no stages
            val asleepMinutes = deepMinutes + lightMinutes + remMinutes
            val durationMinutes = if (asleepMinutes > 0) asleepMinutes
                else ((session.endTime.epochSecond - session.startTime.epochSecond) / 60).toInt()

            JSONObject().apply {
                put("duration_minutes", durationMinutes)
                put("deep_minutes", deepMinutes)
                put("light_minutes", lightMinutes)
                put("rem_minutes", remMinutes)
                put("awake_minutes", awakeMinutes)
            }
        } catch (e: Exception) {
            Log.w(TAG, "readSleep failed", e)
            null
        }
    }

    // -------------------------------------------------------------------------
    // Recent workouts (last 7 days)
    // -------------------------------------------------------------------------

    suspend fun readRecentWorkouts(): List<JSONObject> {
        val end = Instant.now()
        val start = end.minusSeconds(7 * 86400L)  // 7 days — backend dedupes by source_id
        val range = TimeRangeFilter.between(start, end)

        return try {
            // No Gadgetbridge-package filter here: CMF Watch Pro 3 (experimental support) may
            // write ExerciseSessionRecord under a different data origin or not at all via GB.
            // Daily snapshot metrics keep the filter to avoid double-counting phone health apps.
            val records = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range)).records
            Log.d(TAG, "ExerciseSessionRecord: ${records.size} total in last 7 days")
            records.forEachIndexed { i, r ->
                Log.d(TAG, "  [$i] origin=${r.metadata.dataOrigin.packageName} type=${r.exerciseType} start=${r.startTime}")
            }
            records.map { session ->
                    val durationMinutes = ((session.endTime.epochSecond - session.startTime.epochSecond) / 60).toInt()
                    val hrRange = TimeRangeFilter.between(session.startTime, session.endTime)
                    val hrSamples = try {
                        // No package filter — match whatever source wrote the session
                        client.readRecords(ReadRecordsRequest(HeartRateRecord::class, hrRange)).records
                            .flatMap { it.samples }.map { it.beatsPerMinute }
                    } catch (e: Exception) { emptyList() }

                    JSONObject().apply {
                        put("source_id", "hc_${session.metadata.id}")
                        put("workout_type", exerciseTypeName(session.exerciseType))
                        put("started_at", session.startTime.toString())
                        put("ended_at", session.endTime.toString())
                        put("duration_minutes", durationMinutes)
                        put("avg_hr", if (hrSamples.isNotEmpty()) hrSamples.average().toInt() else JSONObject.NULL)
                        put("max_hr", hrSamples.maxOrNull()?.toInt() ?: JSONObject.NULL)
                        put("calories", JSONObject.NULL)
                        put("notes", session.title ?: JSONObject.NULL)
                    }
                }
        } catch (e: Exception) {
            Log.e(TAG, "readRecentWorkouts failed", e)
            emptyList()
        }
    }

    private fun exerciseTypeName(type: Int): String = when (type) {
        ExerciseSessionRecord.EXERCISE_TYPE_RUNNING -> "RUNNING"
        ExerciseSessionRecord.EXERCISE_TYPE_WALKING -> "WALKING"
        ExerciseSessionRecord.EXERCISE_TYPE_BIKING -> "CYCLING"
        ExerciseSessionRecord.EXERCISE_TYPE_SWIMMING_POOL -> "SWIMMING"
        ExerciseSessionRecord.EXERCISE_TYPE_STRENGTH_TRAINING -> "STRENGTH_TRAINING"
        ExerciseSessionRecord.EXERCISE_TYPE_YOGA -> "YOGA"
        ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "HIKING"
        ExerciseSessionRecord.EXERCISE_TYPE_FOOTBALL_AMERICAN -> "FOOTBALL"
        ExerciseSessionRecord.EXERCISE_TYPE_FOOTBALL_AUSTRALIAN -> "FOOTBALL"
        ExerciseSessionRecord.EXERCISE_TYPE_SOCCER -> "FOOTBALL"
        ExerciseSessionRecord.EXERCISE_TYPE_HIGH_INTENSITY_INTERVAL_TRAINING -> "HIIT"
        ExerciseSessionRecord.EXERCISE_TYPE_PILATES -> "PILATES"
        ExerciseSessionRecord.EXERCISE_TYPE_BOXING -> "BOXING"
        else -> "WORKOUT_$type"
    }
}
