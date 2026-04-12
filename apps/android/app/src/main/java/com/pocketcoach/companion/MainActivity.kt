package com.pocketcoach.companion

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.*
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import com.pocketcoach.companion.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

val HEALTH_PERMISSIONS = setOf(
    HealthPermission.getReadPermission(StepsRecord::class),
    HealthPermission.getReadPermission(SleepSessionRecord::class),
    HealthPermission.getReadPermission(HeartRateRecord::class),
    HealthPermission.getReadPermission(RestingHeartRateRecord::class),
    // Note: RestingHeartRateRecord needs its own manifest permission (READ_RESTING_HEART_RATE)
    HealthPermission.getReadPermission(HeartRateVariabilityRmssdRecord::class),
    HealthPermission.getReadPermission(OxygenSaturationRecord::class),
    HealthPermission.getReadPermission(TotalCaloriesBurnedRecord::class),
    HealthPermission.getReadPermission(ExerciseSessionRecord::class),
)

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    private val requestPermissions = registerForActivityResult(
        PermissionController.createRequestPermissionResultContract()
    ) { granted ->
        val missing = HEALTH_PERMISSIONS - granted
        if (missing.isEmpty()) {
            setStatus("Health Connect permissions granted.")
        } else {
            setStatus("Missing ${missing.size} Health Connect permission(s). Some data may not sync.")
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val prefs = Prefs.get(this)
        binding.editUrl.setText(prefs.getString(Prefs.KEY_URL, ""))
        binding.editEmail.setText(prefs.getString(Prefs.KEY_EMAIL, ""))
        binding.editPassword.setText(prefs.getString(Prefs.KEY_PASSWORD, ""))

        binding.btnSave.setOnClickListener { saveSettings() }
        binding.btnGrantPermissions.setOnClickListener { requestPermissions.launch(HEALTH_PERMISSIONS) }
        binding.btnSyncNow.setOnClickListener { syncNow() }

        checkHealthConnectPermissions()
    }

    private fun checkHealthConnectPermissions() {
        val status = HealthConnectClient.getSdkStatus(this)
        if (status != HealthConnectClient.SDK_AVAILABLE) {
            setStatus("Health Connect not available on this device.")
            return
        }

        lifecycleScope.launch {
            val client = HealthConnectClient.getOrCreate(this@MainActivity)
            val granted = client.permissionController.getGrantedPermissions()
            val missing = HEALTH_PERMISSIONS - granted
            if (missing.isNotEmpty()) {
                requestPermissions.launch(HEALTH_PERMISSIONS)
            }
        }
    }

    private fun saveSettings() {
        val url = binding.editUrl.text.toString().trim()
        val email = binding.editEmail.text.toString().trim()
        val password = binding.editPassword.text.toString()

        if (url.isBlank() || email.isBlank() || password.isBlank()) {
            setStatus("All fields are required")
            return
        }

        Prefs.get(this).edit()
            .putString(Prefs.KEY_URL, url)
            .putString(Prefs.KEY_EMAIL, email)
            .putString(Prefs.KEY_PASSWORD, password)
            .remove(Prefs.KEY_SESSION_COOKIE)
            .apply()

        scheduleHourlySync()
        setStatus("Settings saved. Hourly sync scheduled.")
    }

    private fun syncNow() {
        if (!Prefs.isConfigured(this)) {
            setStatus("Save settings first")
            return
        }

        setStatus("Syncing…")
        binding.btnSyncNow.isEnabled = false

        lifecycleScope.launch {
            val result = runSync()
            binding.btnSyncNow.isEnabled = true
            setStatus(result)
        }
    }

    private suspend fun runSync(): String {
        val api = ApiClient(this)
        val reader = HealthConnectReader(this)
        var ok = 0
        var failed = 0

        try {
            val snapshot = reader.readDailySnapshot(java.time.LocalDate.now())
            if (withContext(Dispatchers.IO) { api.post("/gadgetbridge/daily", snapshot) } != null) ok++ else failed++
        } catch (e: Exception) {
            failed++
        }

        try {
            val workouts = reader.readRecentWorkouts()
            for (w in workouts) {
                if (withContext(Dispatchers.IO) { api.post("/gadgetbridge/workout", w) } != null) ok++ else failed++
            }
        } catch (e: Exception) {
            failed++
        }

        return if (failed == 0) "Sync complete ($ok posted)" else "Sync done: $ok OK, $failed failed"
    }

    private fun scheduleHourlySync() {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()

        val workRequest = PeriodicWorkRequestBuilder<SyncWorker>(1, TimeUnit.HOURS)
            .setConstraints(constraints)
            .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 15, TimeUnit.MINUTES)
            .build()

        WorkManager.getInstance(this).enqueueUniquePeriodicWork(
            "pocket_coach_sync",
            ExistingPeriodicWorkPolicy.UPDATE,
            workRequest,
        )
    }

    private fun setStatus(message: String) {
        binding.textStatus.text = message
        binding.textStatus.visibility = View.VISIBLE
    }
}
