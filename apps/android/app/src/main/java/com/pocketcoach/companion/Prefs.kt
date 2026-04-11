package com.pocketcoach.companion

import android.content.Context
import android.content.SharedPreferences

object Prefs {
    private const val FILE = "pocket_coach"

    const val KEY_URL = "url"
    const val KEY_EMAIL = "email"
    const val KEY_PASSWORD = "password"
    const val KEY_SESSION_COOKIE = "session_cookie"

    fun get(context: Context): SharedPreferences =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun url(context: Context): String = get(context).getString(KEY_URL, "") ?: ""
    fun email(context: Context): String = get(context).getString(KEY_EMAIL, "") ?: ""
    fun password(context: Context): String = get(context).getString(KEY_PASSWORD, "") ?: ""
    fun sessionCookie(context: Context): String? = get(context).getString(KEY_SESSION_COOKIE, null)

    fun saveSessionCookie(context: Context, cookie: String?) =
        get(context).edit().putString(KEY_SESSION_COOKIE, cookie).apply()

    fun isConfigured(context: Context): Boolean {
        val url = url(context)
        val email = email(context)
        val password = password(context)
        return url.isNotBlank() && email.isNotBlank() && password.isNotBlank()
    }
}
