package com.emzaro.imobile

import android.app.Activity
import android.os.Bundle
import android.widget.*
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL

class MainActivity: Activity() {
    private var token:String?=null
    private lateinit var email:EditText
    private lateinit var password:EditText
    private lateinit var status:TextView
    private lateinit var number:TextView
    private lateinit var inbox:TextView

    override fun onCreate(b:Bundle?){
        super.onCreate(b);setContentView(R.layout.activity_main)
        email=findViewById(R.id.email);password=findViewById(R.id.password)
        status=findViewById(R.id.status);number=findViewById(R.id.number);inbox=findViewById(R.id.inbox)
        findViewById<Button>(R.id.auth).setOnClickListener{auth()}
        findViewById<Button>(R.id.buy).setOnClickListener{provision()}
        findViewById<Button>(R.id.refresh).setOnClickListener{refreshInbox()}
    }

    private fun request(path:String,method:String,body:String?=null,withAuth:Boolean=true):JSONObject{
        val c=URL(BuildConfig.SUPABASE_URL+path).openConnection() as HttpURLConnection
        c.requestMethod=method
        c.setRequestProperty("apikey",BuildConfig.SUPABASE_PUBLISHABLE_KEY)
        c.setRequestProperty("Content-Type","application/json")
        if(withAuth) token?.let{c.setRequestProperty("Authorization","Bearer $it")}
        if(body!=null){c.doOutput=true;c.outputStream.use{it.write(body.toByteArray())}}
        val stream=if(c.responseCode in 200..299)c.inputStream else c.errorStream
        val text=stream?.bufferedReader()?.readText().orEmpty()
        if(c.responseCode !in 200..299) throw Exception(JSONObject(if(text.isBlank())"{}" else text).optString("msg",text))
        return JSONObject(if(text.isBlank())"{}" else text)
    }

    private fun auth(){
        Thread{
            try{
                val e=email.text.toString().trim(); val p=password.text.toString()
                if(e.isBlank()||p.length<6){runOnUiThread{status.text="Enter an email and a password of at least 6 characters."};return@Thread}
                var r=request("/auth/v1/token?grant_type=password","POST",JSONObject().put("email",e).put("password",p).toString(),false)
                if(!r.has("access_token")){
                    val s=request("/auth/v1/signup","POST",JSONObject().put("email",e).put("password",p).toString(),false)
                    if(!s.has("access_token")){runOnUiThread{status.text="Account created. Check your email, then sign in."};return@Thread}
                    r=s
                }
                token=r.optString("access_token",null)
                runOnUiThread{status.text="Signed in. You can request a +234 number."}
                refreshNumber()
            }catch(x:Exception){runOnUiThread{status.text=x.message?:"Authentication failed"}}
        }.start()
    }

    private fun provision(){
        Thread{
            try{
                if(token==null){runOnUiThread{status.text="Sign in first."};return@Thread}
                val c=URL(BuildConfig.SUPABASE_URL+"/functions/v1/provision-number").openConnection() as HttpURLConnection
                c.requestMethod="POST";c.setRequestProperty("apikey",BuildConfig.SUPABASE_PUBLISHABLE_KEY);c.setRequestProperty("Authorization","Bearer $token");c.setRequestProperty("Content-Type","application/json");c.doOutput=true;c.outputStream.use{it.write("{}".toByteArray())}
                val stream=if(c.responseCode in 200..299)c.inputStream else c.errorStream
                val r=JSONObject(stream.bufferedReader().readText())
                runOnUiThread{number.text=r.optString("phone_number","Not available");status.text=r.optString("message","Number request complete")}
            }catch(x:Exception){runOnUiThread{status.text=x.message?:"Number provisioning failed"}}
        }.start()
    }

    private fun refreshNumber(){
        Thread{
            try{
                val r=request("/rest/v1/imobile_numbers?select=phone_number,status,expires_at&order=created_at.desc&limit=1","GET")
                runOnUiThread{if(r.toString().startsWith("["))number.text=r.toString()}
            }catch(_:Exception){}
        }.start()
    }

    private fun refreshInbox(){
        Thread{
            try{
                val r=request("/rest/v1/imobile_messages?select=direction,sender,recipient,body,created_at&order=created_at.desc&limit=30","GET")
                runOnUiThread{inbox.text=if(r.toString()=="[]")"SMS inbox is empty" else r.toString()}
            }catch(x:Exception){runOnUiThread{status.text=x.message?:"Inbox refresh failed"}}
        }.start()
    }
}
