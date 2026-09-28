import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};

serve(async(req)=>{
 if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
 try{
  const {question}=await req.json();
  if(!question||typeof question!=="string") return new Response(JSON.stringify({error:"Question is required"}),{status:400,headers:{...cors,"Content-Type":"application/json"}});
  const key=Deno.env.get("GROQ_API_KEY");
  if(!key) return new Response(JSON.stringify({error:"GROQ_API_KEY is not configured"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});
  const response=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{"Authorization":"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify({model:"llama-3.3-70b-versatile",temperature:0.2,messages:[{role:"system",content:"You are ExamPilot AI, a Nigerian exam tutor. Explain answers clearly and step by step. Focus on JAMB, WAEC, NECO and university entrance preparation. Do not claim leaked or guaranteed exam questions."},{role:"user",content:question}]})});
  const data=await response.json();
  const answer=data?.choices?.[0]?.message?.content;
  if(!response.ok||!answer) throw new Error(data?.error?.message||"AI request failed");
  return new Response(JSON.stringify({answer}),{headers:{...cors,"Content-Type":"application/json"}});
 }catch(e){return new Response(JSON.stringify({error:e instanceof Error?e.message:"AI request failed"}),{status:500,headers:{...cors,"Content-Type":"application/json"}});}
});