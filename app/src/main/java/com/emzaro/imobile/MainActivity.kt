package com.emzaro.imobile

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.os.Bundle
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast

class MainActivity : Activity() {
    private lateinit var info: TextView
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        setContentView(R.layout.activity_main)
        info = findViewById(R.id.simInfo)
        findViewById<Button>(R.id.activateButton).setOnClickListener {
            Toast.makeText(this, "SIM activation will connect to the i mobile operator platform.", Toast.LENGTH_LONG).show()
        }
        findViewById<Button>(R.id.airtimeButton).setOnClickListener {
            Toast.makeText(this, "Airtime module ready for provider integration.", Toast.LENGTH_SHORT).show()
        }
        findViewById<Button>(R.id.dataButton).setOnClickListener {
            Toast.makeText(this, "Data bundle module ready for provider integration.", Toast.LENGTH_SHORT).show()
        }
        findViewById<Button>(R.id.transactionsButton).setOnClickListener {
            Toast.makeText(this, "Transactions module ready for backend integration.", Toast.LENGTH_SHORT).show()
        }
        findViewById<Button>(R.id.supportButton).setOnClickListener {
            Toast.makeText(this, "Customer support module ready.", Toast.LENGTH_SHORT).show()
        }
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
            b.append("No active SIM detected.\n\nInsert a physical SIM to view its network information.")
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