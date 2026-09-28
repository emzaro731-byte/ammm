package com.emzaro.imobile

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.widget.TextView

class MainActivity : Activity() {
    private lateinit var info: TextView
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        setContentView(R.layout.activity_main)
        info = findViewById(R.id.simInfo)
        if (checkSelfPermission(Manifest.permission.READ_PHONE_STATE) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(arrayOf(Manifest.permission.READ_PHONE_STATE, Manifest.permission.READ_PHONE_NUMBERS), 10)
        } else showSimInfo()
    }
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, results: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, results)
        if (requestCode == 10) showSimInfo()
    }
    private fun showSimInfo() {
        val sm = getSystemService(SubscriptionManager::class.java)
        val tm = getSystemService(TelephonyManager::class.java)
        val list = try { sm.activeSubscriptionInfoList } catch (_: SecurityException) { null }
        val b = StringBuilder("SIM STATUS\n\n")
        if (list.isNullOrEmpty()) {
            b.append("No active SIM detected.\n\nInsert a physical SIM and reopen i mobile.")
        } else {
            for (i in list.indices) {
                val s = list[i]
                b.append("SIM ").append(i + 1).append("\n")
                b.append("Carrier: ").append(s.carrierName ?: "Unknown").append("\n")
                b.append("Country: ").append(s.countryIso.uppercase()).append("\n")
                b.append("Slot: ").append(s.simSlotIndex + 1).append("\n")
                b.append("MCC/MNC: ").append(s.mccString ?: "Unknown").append("/").append(s.mncString ?: "Unknown").append("\n\n")
            }
            b.append("Network: ").append(tm.networkOperatorName.ifBlank { "Unknown" })
        }
        info.text = b.toString()
    }
}