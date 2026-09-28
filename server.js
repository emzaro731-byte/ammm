import express from "express";
import { createClient } from "@supabase/supabase-js";

const app=express();
app.use(express.json());
app.use(express.static("website"));

const PORT=Number(process.env.PORT||10000);
const SUPABASE_URL=process.env.SUPABASE_URL||"https://vihbsfrwnslnmheowkhy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||"";
const VOICEBIP_API_KEY=process.env.VOICEBIP_API_KEY;
const VOICEBIP_AGENT_ID=process.env.VOICEBIP_AGENT_ID;

app.get("/api/health",(_req,res)=>res.json({ok:true,providerConfigured:Boolean(VOICEBIP_API_KEY&&VOICEBIP_AGENT_ID)}));

app.post("/api/provision-number",async(req,res)=>{
  try{
    if(!VOICEBIP_API_KEY||!VOICEBIP_AGENT_ID)return res.status(503).json({error:"Render configuration problem: VOICEBIP_API_KEY or VOICEBIP_AGENT_ID is missing."});
    const auth=req.headers.authorization||"";
    if(!auth.startsWith("Bearer "))return res.status(401).json({error:"Authentication problem: no Supabase access token was sent."});
    if(!SUPABASE_PUBLISHABLE_KEY)return res.status(503).json({error:"Supabase publishable key is not configured on Render."});
    const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data:{user},error:userError}=await supabase.auth.getUser(auth.slice(7));
    if(userError||!user)return res.status(401).json({error:"Authentication problem: Supabase rejected the access token.",details:userError?.message||"No user found."});
    const provider=await fetch("https://api.voicebip.com/v1/numbers/auto",{method:"POST",headers:{Authorization:"Bearer "+VOICEBIP_API_KEY,"Content-Type":"application/json"},body:JSON.stringify({agent_id:VOICEBIP_AGENT_ID,type:"mobile_virtual",country_code:"NG",channels:["sms"]})});
    const payload=await provider.json();
    if(!provider.ok)return res.status(provider.status).json({error:"VoiceBip provider error.",details:payload});
    const phone=payload.e164??payload.phone_number,providerId=payload.number_id;
    if(!phone||!providerId)return res.status(502).json({error:"VoiceBip response problem: provider returned no phone number or number ID.",details:payload});
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!secret)return res.status(503).json({error:"Supabase service role key is not configured on Render."});
    const admin=createClient(SUPABASE_URL,secret);
    const {error:insertError}=await admin.from("imobile_numbers").insert({user_id:user.id,provider:"voicebip",provider_number_id:providerId,phone_number:phone,number_type:payload.type??"mobile_virtual",country_code:"NG",channels:payload.channels??["sms"],status:"active"});
    if(insertError)return res.status(500).json({error:"Database save problem: the number was provisioned but could not be saved to imobile_numbers.",details:insertError.message});
    res.json({phone_number:phone,provider_number_id:providerId,status:"active",message:"Your +234 virtual number is ready."});
  }catch(e){res.status(500).json({error:e instanceof Error?e.message:"Unexpected error"});}
});
app.use((req,res)=>res.sendFile("index.html",{root:"website"}));
app.listen(PORT,()=>console.log("i mobile server listening on "+PORT));
