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
    const auth=req.headers.authorization||"";
    if(!auth.startsWith("Bearer "))return res.status(401).json({error:"Authentication problem: no Supabase access token was sent."});
    if(!SUPABASE_PUBLISHABLE_KEY)return res.status(503).json({error:"Supabase publishable key is not configured on Render."});
    const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data:{user},error:userError}=await supabase.auth.getUser(auth.slice(7));
    if(userError||!user)return res.status(401).json({error:"Authentication problem: Supabase rejected the access token.",details:userError?.message||"No user found."});
    const apiKey=process.env.NUMASIMS_API_KEY;
    if(!apiKey)return res.status(503).json({error:"NumaSims is not configured on Render. Add NUMASIMS_API_KEY."});
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!secret)return res.status(503).json({error:"Supabase service role key is not configured on Render."});
    const admin=createClient(SUPABASE_URL,secret);
    const existing=await admin.from("imobile_numbers").select("phone_number,provider_number_id").eq("user_id",user.id).eq("status","active").eq("provider","numasims").limit(1).maybeSingle();
    if(existing.data?.phone_number)return res.json({phone_number:existing.data.phone_number,provider_number_id:existing.data.provider_number_id,status:"active",message:"Your existing +234 virtual number is ready."});
    const available=await fetch("https://numasims.com/api/v1/numbers/available?countryCode=NG&numberType=mobile&currency=NGN",{headers:{Authorization:"Bearer "+apiKey}});
    const availablePayload=await available.json();
    if(!available.ok)return res.status(available.status).json({error:"NumaSims availability error.",details:availablePayload});
    const choice=availablePayload?.data?.find(n=>Array.isArray(n.features)&&n.features.includes("sms"))||availablePayload?.data?.[0];
    if(!choice?.phoneNumber)return res.status(404).json({error:"NumaSims has no Nigerian mobile numbers with SMS available right now.",details:availablePayload});
    const purchase=await fetch("https://numasims.com/api/v1/numbers",{method:"POST",headers:{Authorization:"Bearer "+apiKey,"Content-Type":"application/json"},body:JSON.stringify({phoneNumber:choice.phoneNumber,countryCode:"NG",currency:"NGN"})});
    const purchasePayload=await purchase.json();
    if(!purchase.ok)return res.status(purchase.status).json({error:"NumaSims number purchase failed.",details:purchasePayload});
    const number=purchasePayload?.data;
    if(!number?.phoneNumber||!number?.id)return res.status(502).json({error:"NumaSims returned an incomplete number response.",details:purchasePayload});
    const {error:insertError}=await admin.from("imobile_numbers").insert({user_id:user.id,provider:"numasims",provider_number_id:number.id,phone_number:number.phoneNumber,number_type:"mobile",country_code:"NG",channels:number.capabilities??["sms"],status:"active"});
    if(insertError)return res.status(500).json({error:"NumaSims provisioned the number, but saving it failed.",details:insertError.message});
    res.json({phone_number:number.phoneNumber,provider_number_id:number.id,status:"active",message:"Your +234 virtual number is ready."});
  }catch(e){res.status(500).json({error:e instanceof Error?e.message:"Unexpected error"});}
});
app.use((req,res)=>res.sendFile("index.html",{root:"website"}));
app.listen(PORT,()=>console.log("i mobile server listening on "+PORT));
