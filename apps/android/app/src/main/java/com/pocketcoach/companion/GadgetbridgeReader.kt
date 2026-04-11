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
            put("stress_avg", JSONObject.NULL)  // not available in Health Connect
            put("sleep", sleep ?: JSONObject.NULL)
        }
    }

    private suspend fun readSteps(range: TimeRangeFilter): Int? {
        return try {
            val records = client.readRecords(ReadRecordsRequest(StepsRecord::class, range)).records
            val total = records.sumOf { it.count }
            if (total > 0) total.toInt() else null
        } catch (e: Exception) {
            Log.w(TAG, "readSteps failed", e)
            null
        }
    }

    private suspend fun readCalories(range: TimeRangeFilter): Int? {
        return try {
            val records = client.readRecords(ReadRecordsRequest(TotalCaloriesBurnedRecord::class, range)).records
            val total = records.sumOf { it.energy.inKilocalories }
            if (total > 0) total.toInt() else null
        } catch (e: Exception) {
            Log.w(TAG, "readCalories failed", e)
            null
        }
    }

    private suspend fun readRestingHr(range: TimeRangeFilter): Int? {
        return try {
            // Prefer explicit RestingHeartRateRecord if Gadgetbridge writes it
            val resting = client.readRecords(ReadRecordsRequest(RestingHeartRateRecord::class, range)).records
            if (resting.isNotEmpty()) {
                return resting.last().beatsPerMinute.toInt()
            }
            // Fall back to minimum HR sample of the day
            val hrRecords = client.readRecords(ReadRecordsRequest(HeartRateRecord::class, range)).records
            hrRecords.flatMap { it.samples }.map { it.beatsPerMinute }.minOrNull()?.toInt()
        } catch (e: Exception) {
            Log.w(TAG, "readRestingHr failed", e)
            null
        }
    }

    private suspend fun readHrv(range: TimeRangeFilter): Double? {
        return try {
            val records = client.readRecords(ReadRecordsRequest(HeartRateVariabilityRmssdRecord::class, range)).records
            if (records.isEmpty()) null
            else records.map { it.heartRateVariabilityMillis }.average()
        } catch (e: Exception) {
            Log.w(TAG, "readHrv failed", e)
            null
        }
    }

    private suspend fun readSpo2(range: TimeRangeFilter): Double? {
        return try {
            val records = client.readRecords(ReadRecordsRequest(OxygenSaturationRecord::class, range)).records
            if (records.isEmpty()) null
            else records.map { it.percentage.value }.average()
        } catch (e: Exception) {
            Log.w(TAG, "readSpo2 failed", e)
            null
        }
    }

    private suspend fun readSleep(date: LocalDate, zone: ZoneId): JSONObject? {
        return try {
            // Sleep for "date" is last night — query sessions that END on this date (between 3am prev day and noon today)
            val windowStart = date.minusDays(1).atTime(18, 0).atZone(zone).toInstant()
            val windowEnd = date.atTime(14, 0).atZone(zone).toInstant()
            val range = TimeRangeFilter.between(windowStart, windowEnd)

            val sessions = client.readRecords(ReadRecordsRequest(SleepSessionRecord::class, range)).records
            if (sessions.isEmpty()) return null

            // Use the longest session
            val session = sessions.maxByOrNull {
                it.endTime.epochSecond - it.startTime.epochSecond
            } ?: return null

            val totalMinutes = ((session.endTime.epochSecond - session.startTime.epochSecond) / 60).toInt()

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

            JSONObject().apply {
                put("duration_minutes", totalMinutes)
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
    // Recent workouts (last 24h)
    // -------------------------------------------------------------------------

    suspend fun readRecentWorkouts(): List<JSONObject> {
        val end = Instant.now()
        val start = end.minusSeconds(86400)
        val range = TimeRangeFilter.between(start, end)

        return try {
            val sessions = client.readRecords(ReadRecordsRequest(ExerciseSessionRecord::class, range)).records
            sessions.map { session ->
                val durationMinutes = ((session.endTime.epochSecond - session.startTime.epochSecond) / 60).toInt()
                val hrRange = TimeRangeFilter.between(session.startTime, session.endTime)
                val hrSamples = try {
                    client.readRecords(ReadRecordsRequest(HeartRateRecord::class, hrRange)).records
                        .flatMap { it.samples }.map { it.beatsPerMinute }
                } catch (e: Exception) { emptyList() }

                val avgHr = if (hrSamples.isNotEmpty()) hrSamples.average().toInt() else null
                val maxHr = hrSamples.maxOrNull()?.toInt()

                JSONObject().apply {
                    put("source_id", "hc_${session.metadata.id}")
                    put("workout_type", exerciseTypeName(session.exerciseType))
                    put("started_at", session.startTime.toString())
                    put("ended_at", session.endTime.toString())
                    put("duration_minutes", durationMinutes)
                    put("avg_hr", avgHr ?: JSONObject.NULL)
                    put("max_hr", maxHr ?: JSONObject.NULL)
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
        ExerciseSessionRecord.EXERCISE_TYPE_CYCLING -> "CYCLING"
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
