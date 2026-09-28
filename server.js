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

app.get("/api/number-options",async(req,res)=>{
  try{
    const apiKey=process.env.FLEEXA_API_KEY;
    if(!apiKey)return res.status(503).json({error:"Fleexa is not configured on Render. Add FLEEXA_API_KEY."});
    const response=await fetch("https://fleexa.com.ng/developer/rent/sms4/areas",{headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"}});
    const payload=await response.json();
    if(!response.ok)return res.status(response.status).json({error:"Fleexa availability request failed.",details:payload});
    res.json({success:true,areas:payload?.data??payload});
  }catch(e){res.status(500).json({error:e instanceof Error?e.message:"Unexpected error"});}
});

app.post("/api/provision-number",async(req,res)=>{
  try{
    const auth=req.headers.authorization||"";
    if(!auth.startsWith("Bearer "))return res.status(401).json({error:"Authentication problem: no Supabase access token was sent."});
    if(!SUPABASE_PUBLISHABLE_KEY)return res.status(503).json({error:"Supabase publishable key is not configured on Render."});
    const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data:{user},error:userError}=await supabase.auth.getUser(auth.slice(7));
    if(userError||!user)return res.status(401).json({error:"Authentication problem: Supabase rejected the access token.",details:userError?.message||"No user found."});
    const apiKey=process.env.FLEEXA_API_KEY;
    if(!apiKey)return res.status(503).json({error:"Fleexa is not configured on Render. Add FLEEXA_API_KEY."});
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!secret)return res.status(503).json({error:"Supabase service role key is not configured on Render."});
    const admin=createClient(SUPABASE_URL,secret);
    const existing=await admin.from("imobile_numbers").select("phone_number,provider_number_id").eq("user_id",user.id).eq("status","active").eq("provider","fleexa").limit(1).maybeSingle();
    if(existing.data?.phone_number)return res.json({phone_number:existing.data.phone_number,provider_number_id:existing.data.provider_number_id,status:"active",message:"Your existing virtual number is ready."});
    const purchase=await fetch("https://fleexa.com.ng/developer/rent/sms4/buy",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({appName:"i mobile",time:"1"})});
    const purchasePayload=await purchase.json();
    if(!purchase.ok)return res.status(purchase.status).json({error:"Fleexa number rental failed.",details:purchasePayload});
    const number=purchasePayload?.data;
    if(!number?.number||!number?.rental_id)return res.status(502).json({error:"Fleexa returned an incomplete rental response.",details:purchasePayload});
    const {error:insertError}=await admin.from("imobile_numbers").insert({user_id:user.id,provider:"fleexa",provider_number_id:String(number.rental_id),phone_number:number.number,number_type:"long_term_sms",country_code:"NG",channels:["sms"],status:"active"});
    if(insertError)return res.status(500).json({error:"Fleexa rented the number, but saving it failed.",details:insertError.message});
    res.json({phone_number:number.number,provider_number_id:String(number.rental_id),status:"active",message:"Your long-term virtual number is ready.",expire_at:number.expire_at});
  }catch(e){res.status(500).json({error:e instanceof Error?e.message:"Unexpected error"});}
});
app.use((req,res)=>res.sendFile("index.html",{root:"website"}));
app.listen(PORT,()=>console.log("i mobile server listening on "+PORT));
