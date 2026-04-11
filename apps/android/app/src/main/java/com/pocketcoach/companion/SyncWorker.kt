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

    override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
        if (!Prefs.isConfigured(applicationContext)) {
            Log.w(TAG, "Not configured, skipping sync")
            return@withContext Result.success()
        }

        val api = ApiClient(applicationContext)
        val gbReader = GadgetbridgeReader(applicationContext.contentResolver)

        val deviceMac = gbReader.getDeviceMac()
        if (deviceMac == null) {
            Log.w(TAG, "No Gadgetbridge device found — check 'Allow 3rd party access' in Gadgetbridge settings")
            return@withContext Result.failure()
        }

        Log.d(TAG, "Syncing device: $deviceMac")
        var anyFailure = false

        // --- Daily health snapshot (today) ---
        try {
            val today = LocalDate.now()
            val snapshot = gbReader.readDailySnapshot(today, deviceMac)
            val response = api.post("/gadgetbridge/daily", snapshot)
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
            val workouts = gbReader.readRecentWorkouts(deviceMac)
            Log.d(TAG, "Found ${workouts.size} recent workout(s)")
            for (workout in workouts) {
                val response = api.post("/gadgetbridge/workout", workout)
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

        if (anyFailure) Result.retry() else Result.success()
    }
}
