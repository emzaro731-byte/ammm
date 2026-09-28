package com.emzaro.imobile

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import org.json.JSONObject
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL

class MainActivity : Activity() {
    private lateinit var info: TextView
    private lateinit var accountStatus: TextView
    private lateinit var nameInput: EditText
    private lateinit var phoneInput: EditText
    private lateinit var emailInput: EditText
    private lateinit var passwordInput: EditText
    private var accessToken: String? = null

    companion object {
        private const val SUPABASE_URL = BuildConfig.SUPABASE_URL
        private const val SUPABASE_KEY = BuildConfig.SUPABASE_PUBLISHABLE_KEY
    }

    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        setContentView(R.layout.activity_main)

        info = findViewById(R.id.simInfo)
        accountStatus = findViewById(R.id.accountStatus)
        nameInput = findViewById(R.id.nameInput)
        phoneInput = findViewById(R.id.phoneInput)
        emailInput = findViewById(R.id.emailInput)
        passwordInput = findViewById(R.id.passwordInput)

        findViewById<Button>(R.id.createAccountButton).setOnClickListener { signUp() }
        findViewById<Button>(R.id.signInButton).setOnClickListener { signIn() }

        if (checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                arrayOf(
                    Manifest.permission.READ_PHONE_STATE,
                    Manifest.permission.READ_PHONE_NUMBERS
                ),
                10
            )
        } else {
            showSimInfo()
        }
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        results: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        if (requestCode == 10) showSimInfo()
    }

    private fun signUp() {
        val name = nameInput.text.toString().trim()
        val phone = phoneInput.text.toString().trim()
        val email = emailInput.text.toString().trim()
        val password = passwordInput.text.toString()

        if (name.isEmpty() || phone.isEmpty() || email.isEmpty() || password.length < 6) {
            toast("Enter your name, phone, email and a password of at least 6 characters.")
            return
        }

        accountStatus.text = "Creating your i mobile account..."
        Thread {
            try {
                val body = JSONObject().apply {
                    put("email", email)
                    put("password", password)
                    put("data", JSONObject().apply { put("full_name", name); put("phone", phone) })
                }
                val result = authRequest("/auth/v1/signup", body)
                if (result.code in 200..299) {
                    val json = JSONObject(result.body)
                    val token = json.optString("access_token")
                    if (token.isNotBlank()) {
                        accessToken = token
                        saveProfile(token, json.optString("user", "").let {
                            if (it.isNotBlank()) JSONObject(it) else JSONObject()
                        }, name, phone, email)
                    } else {
                        runOnUiThread {
                            accountStatus.text = "Check your email to confirm your account, then sign in."
                        }
                    }
                } else {
                    showError(result.body)
                }
            } catch (e: Exception) {
                showError(e.message ?: "Network error")
            }
        }.start()
    }

    private fun signIn() {
        val email = emailInput.text.toString().trim()
        val password = passwordInput.text.toString()

        if (email.isEmpty() || password.isEmpty()) {
            toast("Enter your email and password.")
            return
        }

        accountStatus.text = "Signing in..."
        Thread {
            try {
                val body = JSONObject().apply {
                    put("email", email)
                    put("password", password)
                }
                val result = authRequest("/auth/v1/token?grant_type=password", body)
                if (result.code in 200..299) {
                    val json = JSONObject(result.body)
                    accessToken = json.optString("access_token")
                    val user = json.optJSONObject("user")
                    val profile = fetchProfile(accessToken ?: "")
                    val displayName = profile?.optString("full_name")
                        ?.takeIf { it.isNotBlank() }
                        ?: user?.optJSONObject("user_metadata")?.optString("full_name")
                        ?: email
                    runOnUiThread {
                        accountStatus.text = "Signed in as $displayName"
                        passwordInput.text.clear()
                    }
                } else {
                    showError(result.body)
                }
            } catch (e: Exception) {
                showError(e.message ?: "Network error")
            }
        }.start()
    }

    private fun saveProfile(
        token: String,
        user: JSONObject,
        name: String,
        phone: String,
        email: String
    ) {
        val userId = user.optString("id")
        if (userId.isBlank()) {
            runOnUiThread { accountStatus.text = "Account created. Please sign in." }
            return
        }

        Thread {
            try {
                val body = JSONObject().apply {
                    put("id", userId)
                    put("full_name", name)
                    put("phone", phone)
                    put("email", email)
                }
                val result = apiRequest(
                    "/rest/v1/imobile_profiles",
                    "POST",
                    body.toString(),
                    token
                )
                runOnUiThread {
                    if (result.code in 200..299) {
                        accountStatus.text = "Account created and signed in as $name"
                    } else {
                        accountStatus.text = "Account created. Profile setup needs attention."
                    }
                    passwordInput.text.clear()
                }
            } catch (e: Exception) {
                runOnUiThread {
                    accountStatus.text = "Account created. Profile setup will retry after sign-in."
                    passwordInput.text.clear()
                }
            }
        }.start()
    }

    private fun fetchProfile(token: String): JSONObject? {
        if (token.isBlank()) return null
        val result = apiRequest(
            "/rest/v1/imobile_profiles?select=full_name,phone,email,kyc_status,sim_status&limit=1",
            "GET",
            null,
            token
        )
        if (result.code !in 200..299) return null
        val text = result.body.trim()
        if (!text.startsWith("[")) return null
        val array = org.json.JSONArray(text)
        return if (array.length() > 0) array.getJSONObject(0) else null
    }

    private fun authRequest(path: String, body: JSONObject): HttpResult {
        return apiRequest(path, "POST", body.toString(), null)
    }

    private fun apiRequest(
        path: String,
        method: String,
        body: String?,
        token: String?
    ): HttpResult {
        val connection = (URL(SUPABASE_URL + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15000
            readTimeout = 15000
            setRequestProperty("apikey", SUPABASE_KEY)
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            if (!token.isNullOrBlank()) {
                setRequestProperty("Authorization", "Bearer $token")
            }
            if (body != null) doOutput = true
        }

        if (body != null) {
            connection.outputStream.use { it.write(body.toByteArray(Charsets.UTF_8)) }
        }

        val code = connection.responseCode
        val stream = if (code >= 400) connection.errorStream else connection.inputStream
        val response = stream?.use {
            BufferedReader(InputStreamReader(it)).readText()
        } ?: ""
        connection.disconnect()
        return HttpResult(code, response)
    }

    private fun showError(raw: String) {
        val message = try {
            val json = JSONObject(raw)
            json.optString("msg")
                .ifBlank { json.optString("message") }
                .ifBlank { json.optString("error_description") }
                .ifBlank { "Request failed" }
        } catch (_: Exception) {
            "Request failed"
        }
        runOnUiThread { accountStatus.text = message }
    }

    private fun toast(message: String) {
        runOnUiThread {
            Toast.makeText(this, message, Toast.LENGTH_LONG).show()
        }
    }

    private fun showSimInfo() {
        val sm = getSystemService(SubscriptionManager::class.java)
        val tm = getSystemService(TelephonyManager::class.java)
        val list = try { sm.activeSubscriptionInfoList } catch (_: SecurityException) { null }
        val b = StringBuilder("SIM STATUS\n\n")
        if (list.isNullOrEmpty()) {
            b.append("No active SIM detected.\n\nInsert a physical SIM to view its network information.")
        } else {
            for (i in list.indices) {
                val s = list[i]
                b.append("SIM ").append(i + 1).append("\n")
                b.append("Carrier: ").append(s.carrierName ?: "Unknown").append("\n")
                b.append("Country: ").append(s.countryIso.uppercase()).append("\n")
                b.append("Slot: ").append(s.simSlotIndex + 1).append("\n")
                b.append("MCC/MNC: ").append(s.mccString ?: "Unknown").append("/")
                    .append(s.mncString ?: "Unknown").append("\n\n")
            }
            b.append("Network: ").append(tm.networkOperatorName.ifBlank { "Unknown" })
        }
        info.text = b.toString()
    }

    data class HttpResult(val code: Int, val body: String)
}