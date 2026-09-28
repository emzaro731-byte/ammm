import express from "express";
import { createClient } from "@supabase/supabase-js";

const app=express();
app.use(express.json());
app.use(express.static("website"));

const PORT=Number(process.env.PORT||10000);
const SUPABASE_URL=process.env.SUPABASE_URL||"https://vihbsfrwnslnmheowkhy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||"";
const EVESES_API_BASE="https://api.eveses.com/api/v1";
const EVESES_LEGACY_RENTAL_BASE="https://api.eveses.com/v1";

app.get("/api/health",(_req,res)=>res.json({ok:true,providerConfigured:Boolean(process.env.EVESES_API_KEY)}));

async function evesesFetch(path,options={},base=EVESES_API_BASE){
  const key=process.env.EVESES_API_KEY;
  if(!key)throw Object.assign(new Error("Eveses is not configured on Render. Add EVESES_API_KEY."),{status:503});
  const headers={Authorization:"Bearer "+key,"Content-Type":"application/json",...(options.headers||{})};
  const response=await fetch(base+path,{...options,headers});
  const text=await response.text();
  let payload={}; try{payload=text?JSON.parse(text):{}}catch{payload={raw:text};}
  if(!response.ok)throw Object.assign(new Error("Eveses API request failed."),{status:response.status,payload});
  return payload;
}

app.get("/api/wallet",async(req,res)=>{
  try{
    if(!process.env.EVESES_API_KEY)return res.status(503).json({error:"Eveses is not configured on Render."});
    const payload=await evesesFetch("/me");
    const balance=payload?.wallet?.balance??payload?.balance??payload?.data?.wallet?.balance??payload?.data?.balance??0;
    res.json({balance,currency:payload?.wallet?.currency||payload?.currency||"USD",raw:payload});
  }catch(e){
    res.status(e.status||500).json({error:e.message||"Could not load wallet.",details:e.payload||null});
  }
});

app.get("/api/wallet",async(req,res)=>{try{if(!process.env.EVESES_API_KEY)return res.status(503).json({error:"Eveses is not configured on Render."});const payload=await evesesFetch("/me");const balance=payload?.wallet?.balance??payload?.balance??payload?.data?.wallet?.balance??payload?.data?.balance??0;res.json({balance,currency:payload?.wallet?.currency||payload?.currency||"USD"});}catch(e){res.status(e.status||500).json({error:e.message||"Could not load wallet.",details:e.payload||null});}});

app.get("/api/number-options",async(req,res)=>{
  try{
    const payload=await evesesFetch("/numbers/summary?country=ng");
    res.json({success:true,country:"NG",data:payload});
  }catch(e){
    res.status(e.status||500).json({error:e.message||"Unexpected error",details:e.payload||null});
  }
});

app.post("/api/provision-number",async(req,res)=>{
  try{
    const auth=req.headers.authorization||"";
    if(!auth.startsWith("Bearer "))return res.status(401).json({error:"Authentication problem: no Supabase access token was sent."});
    if(!SUPABASE_PUBLISHABLE_KEY)return res.status(503).json({error:"Supabase publishable key is not configured on Render."});

    const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data:{user},error:userError}=await supabase.auth.getUser(auth.slice(7));
    if(userError||!user)return res.status(401).json({error:"Authentication problem: Supabase rejected the access token.",details:userError?.message||"No user found."});

    if(!process.env.EVESES_API_KEY)return res.status(503).json({error:"Eveses is not configured on Render. Add EVESES_API_KEY."});
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!secret)return res.status(503).json({error:"Supabase service role key is not configured on Render."});

    const admin=createClient(SUPABASE_URL,secret);
    const existing=await admin.from("imobile_numbers").select("phone_number,provider_number_id").eq("user_id",user.id).eq("status","active").eq("provider","eveses").limit(1).maybeSingle();
    if(existing.data?.phone_number)return res.json({phone_number:existing.data.phone_number,provider_number_id:existing.data.provider_number_id,status:"active",message:"Your existing virtual number is ready."});

    const order=await evesesFetch("/numbers/orders",{
      method:"POST",
      body:JSON.stringify({country:"ng",mode:"rent",service:"any",duration_minutes:1440})
    });
    const number=order?.number||order?.data?.number;
    const orderId=order?.id||order?.uuid||order?.data?.id;
    if(!number||!orderId)return res.status(502).json({error:"Eveses returned an incomplete rental response.",details:order});

    const {error:insertError}=await admin.from("imobile_numbers").insert({
      user_id:user.id,
      provider:"eveses",
      provider_number_id:String(orderId),
      phone_number:number,
      number_type:"long_term_sms",
      country_code:"NG",
      channels:["sms"],
      status:"active"
    });
    if(insertError)return res.status(500).json({error:"Eveses rented the number, but saving it failed.",details:insertError.message});

    res.json({phone_number:number,provider_number_id:String(orderId),status:"active",message:"Your long-term Nigerian virtual number is ready.",expire_at:order?.expire_at||order?.expires_at||order?.data?.expire_at,price:order?.price||order?.data?.price});
  }catch(e){
    res.status(e.status||500).json({error:e.message||"Unexpected error",details:e.payload||null});
  }
});

app.get("/api/inbox",async(req,res)=>{
  try{
    const auth=req.headers.authorization||"";
    if(!auth.startsWith("Bearer "))return res.status(401).json({error:"Authentication problem: no Supabase access token was sent."});
    if(!SUPABASE_PUBLISHABLE_KEY)return res.status(503).json({error:"Supabase publishable key is not configured on Render."});
    const supabase=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
    const {data:{user},error:userError}=await supabase.auth.getUser(auth.slice(7));
    if(userError||!user)return res.status(401).json({error:"Authentication problem: Supabase rejected the access token."});
    const secret=process.env.SUPABASE_SERVICE_ROLE_KEY;
    if(!secret)return res.status(503).json({error:"Supabase service role key is not configured on Render."});
    const admin=createClient(SUPABASE_URL,secret);
    const existing=await admin.from("imobile_numbers").select("provider_number_id").eq("user_id",user.id).eq("status","active").eq("provider","eveses").limit(1).maybeSingle();
    if(!existing.data?.provider_number_id)return res.json({messages:[]});
    const orderId=encodeURIComponent(existing.data.provider_number_id);
    let payload;
    try{
      payload=await evesesFetch("/numbers/orders/"+orderId+"/sms",{},EVESES_LEGACY_RENTAL_BASE);
    }catch(firstError){
      if(firstError.status===404||firstError.status===502){
        payload=await evesesFetch("/numbers/orders/"+orderId+"/sms");
      }else{
        throw firstError;
      }
    }
    res.json({messages:Array.isArray(payload)?payload:(payload?.messages||payload?.data||[])});
  }catch(e){
    res.status(e.status||500).json({error:e.message||"Unexpected error",details:e.payload||null});
  }
});

app.use((req,res)=>res.sendFile("index.html",{root:"website"}));
app.listen(PORT,()=>console.log("i mobile server listening on "+PORT));