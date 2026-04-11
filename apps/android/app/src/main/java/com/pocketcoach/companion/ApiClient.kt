package com.pocketcoach.companion

import android.content.Context
import android.util.Log
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

private const val TAG = "ApiClient"
private val JSON = "application/json; charset=utf-8".toMediaType()

class ApiClient(private val context: Context) {

    private val http = OkHttpClient.Builder()
        .followRedirects(false)
        .build()

    /** POST /auth/login — stores the session cookie in Prefs and returns it, or null on failure. */
    fun login(): String? {
        val baseUrl = Prefs.url(context).trimEnd('/')
        val body = JSONObject().apply {
            put("email", Prefs.email(context))
            put("password", Prefs.password(context))
        }.toString()

        val request = Request.Builder()
            .url("$baseUrl/auth/login")
            .post(body.toRequestBody(JSON))
            .build()

        return try {
            http.newCall(request).execute().use { response ->
                if (!response.isSuccessful) {
                    Log.e(TAG, "Login failed: ${response.code}")
                    return null
                }
                // Extract session cookie from Set-Cookie header
                val cookie = response.headers("Set-Cookie")
                    .firstOrNull { it.startsWith("session=") }
                    ?.split(";")?.firstOrNull()
                if (cookie == null) {
                    Log.e(TAG, "Login: no session cookie in response")
                    return null
                }
                Prefs.saveSessionCookie(context, cookie)
                Log.d(TAG, "Login successful")
                cookie
            }
        } catch (e: Exception) {
            Log.e(TAG, "Login exception", e)
            null
        }
    }

    /**
     * POST [path] with the stored session cookie.
     * Automatically re-logins on 401 and retries once.
     * Returns the response body string, or null on failure.
     */
    fun post(path: String, body: JSONObject): String? {
        var cookie = Prefs.sessionCookie(context) ?: login() ?: return null
        var result = doPost(path, body, cookie)

        if (result == null) return null  // network error

        if (result.first == 401) {
            Log.d(TAG, "Got 401 on $path, re-logging in")
            cookie = login() ?: return null
            result = doPost(path, body, cookie)
        }

        return if (result != null && result.first in 200..299) result.second else null
    }

    /** Returns (statusCode, responseBody) or null on exception. */
    private fun doPost(path: String, body: JSONObject, cookie: String): Pair<Int, String>? {
        val baseUrl = Prefs.url(context).trimEnd('/')
        val request = Request.Builder()
            .url("$baseUrl$path")
            .addHeader("Cookie", cookie)
            .post(body.toString().toRequestBody(JSON))
            .build()

        return try {
            http.newCall(request).execute().use { response ->
                Pair(response.code, response.body?.string() ?: "")
            }
        } catch (e: Exception) {
            Log.e(TAG, "POST $path exception", e)
            null
        }
    }
}
