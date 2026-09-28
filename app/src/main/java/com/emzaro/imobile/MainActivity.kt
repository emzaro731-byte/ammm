package com.emzaro.imobile

import android.app.Activity
import android.os.Bundle
import android.widget.*

class MainActivity: Activity() {
    private lateinit var status: TextView
    private lateinit var number: TextView
    override fun onCreate(b: Bundle?) {
        super.onCreate(b)
        setContentView(R.layout.activity_main)
        status=findViewById(R.id.status); number=findViewById(R.id.number)
        findViewById<Button>(R.id.auth).setOnClickListener {
            status.text="Account mode is local for now. Cloud backend is disabled."
        }
        findViewById<Button>(R.id.buy).setOnClickListener {
            status.text="Number service is ready for provider integration."
            number.text="+234 ••• ••• ••••"
        }
        findViewById<Button>(R.id.refresh).setOnClickListener {
            status.text="Inbox is ready for virtual-number provider integration."
        }
    }
}
