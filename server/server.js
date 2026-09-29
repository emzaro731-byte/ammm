import express from "express";
const app=express(); app.use(express.json({limit:"2mb"}));
const PORT=process.env.PORT||10000;
const keys={openai:process.env.OPENAI_API_KEY,groq:process.env.GROQ_API_KEY,grok:process.env.XAI_API_KEY};
async function call(p,m){
 const cfg=p==="groq"?["https://api.groq.com/openai/v1/chat/completions",keys.groq,process.env.GROQ_MODEL||"openai/gpt-oss-120b"]:p==="grok"?["https://api.x.ai/v1/chat/completions",keys.grok,process.env.GROK_MODEL||"grok-4.1-fast"]:["https://api.openai.com/v1/chat/completions",keys.openai,process.env.AI_MODEL||"gpt-4o-mini"];
 if(!cfg[1]) throw Error(p.toUpperCase()+" API key is not configured");
 const r=await fetch(cfg[0],{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+cfg[1]},body:JSON.stringify({model:cfg[2],messages:[{role:"system",content:"You are Veylola AI, a helpful, accurate and safe AI assistant."},{role:"user",content:m}]} )});
 const d=await r.json(); if(!r.ok) throw Error(d?.error?.message||"Provider error");
 return d.choices?.[0]?.message?.content||"No response generated.";
}
app.get("/",(_,r)=>r.json({name:"Veylola AI API",status:"online"}));
app.get("/health",(_,r)=>r.json({status:"ok"}));
app.get("/v1/capabilities",(_,r)=>r.json({chat:true,providers:["veylola","groq","grok"]}));
app.post("/chat",async(req,res)=>{try{const m=String(req.body?.message||"").trim();if(!m)return res.status(400).json({error:"message is required"});let p=String(req.body?.provider||"veylola").toLowerCase();if(p==="veylola")p="openai";res.json({response:await call(p,m),provider:p});}catch(e){res.status(500).json({error:e.message});}});
app.listen(PORT,()=>console.log("Veylola AI API listening on "+PORT));