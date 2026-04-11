package com.pocketcoach.companion

import android.content.Context
import android.util.Log
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.time.LocalDate

private const val TAG = "SyncWorker"

class SyncWorker(context: Context, params: WorkerParameters) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        if (!Prefs.isConfigured(applicationContext)) {
            Log.w(TAG, "Not configured, skipping sync")
            return Result.success()
        }

        val api = ApiClient(applicationContext)
        val reader = HealthConnectReader(applicationContext)
        var anyFailure = false

        // --- Daily health snapshot (today) ---
        try {
            val snapshot = reader.readDailySnapshot(LocalDate.now())
            val response = withContext(Dispatchers.IO) { api.post("/gadgetbridge/daily", snapshot) }
            if (response != null) {
                Log.d(TAG, "Daily snapshot posted: $response")
            } else {
                Log.e(TAG, "Failed to post daily snapshot")
                anyFailure = true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Daily snapshot error", e)
            anyFailure = true
        }

        // --- Recent workouts (last 24h) ---
        try {
            val workouts = reader.readRecentWorkouts()
            Log.d(TAG, "Found ${workouts.size} recent workout(s)")
            for (workout in workouts) {
                val response = withContext(Dispatchers.IO) { api.post("/gadgetbridge/workout", workout) }
                if (response != null) {
                    Log.d(TAG, "Workout posted: $response")
                } else {
                    Log.e(TAG, "Failed to post workout: ${workout.optString("source_id")}")
                    anyFailure = true
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Workout sync error", e)
            anyFailure = true
        }

        return if (anyFailure) Result.retry() else Result.success()
    }
}
