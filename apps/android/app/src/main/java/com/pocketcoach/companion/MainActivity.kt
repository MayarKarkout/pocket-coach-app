package com.pocketcoach.companion

import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import androidx.work.*
import com.pocketcoach.companion.databinding.ActivityMainBinding
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // Populate fields from saved prefs
        val prefs = Prefs.get(this)
        binding.editUrl.setText(prefs.getString(Prefs.KEY_URL, ""))
        binding.editEmail.setText(prefs.getString(Prefs.KEY_EMAIL, ""))
        binding.editPassword.setText(prefs.getString(Prefs.KEY_PASSWORD, ""))

        binding.btnSave.setOnClickListener { saveSettings() }
        binding.btnSyncNow.setOnClickListener { syncNow() }
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
            .remove(Prefs.KEY_SESSION_COOKIE)  // clear cached cookie on credential change
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
            val result = withContext(Dispatchers.IO) {
                runSync()
            }
            binding.btnSyncNow.isEnabled = true
            setStatus(result)
        }
    }

    private fun runSync(): String {
        val api = ApiClient(this)
        val gbReader = GadgetbridgeReader(contentResolver)

        val deviceMac = gbReader.getDeviceMac()
            ?: return "No Gadgetbridge device found.\nEnable 'Allow 3rd party access' in Gadgetbridge → Settings."

        var ok = 0
        var failed = 0

        // Daily snapshot
        try {
            val snapshot = gbReader.readDailySnapshot(java.time.LocalDate.now(), deviceMac)
            if (api.post("/gadgetbridge/daily", snapshot) != null) ok++ else failed++
        } catch (e: Exception) {
            failed++
        }

        // Recent workouts
        try {
            val workouts = gbReader.readRecentWorkouts(deviceMac)
            for (w in workouts) {
                if (api.post("/gadgetbridge/workout", w) != null) ok++ else failed++
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
