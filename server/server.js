import express from "express";
import Database from "better-sqlite3";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app=express();
app.use(express.json({limit:"2mb"}));

const PORT=process.env.PORT||10000;
const JWT_SECRET=process.env.JWT_SECRET;
if(!JWT_SECRET) console.warn("JWT_SECRET is not configured");

const db=new Database(process.env.DB_PATH||"./veylola.db");
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 email TEXT UNIQUE NOT NULL,
 password_hash TEXT NOT NULL,
 name TEXT DEFAULT '',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS conversations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 title TEXT DEFAULT 'New chat',
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS messages (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 conversation_id INTEGER NOT NULL,
 role TEXT NOT NULL,
 content TEXT NOT NULL,
 created_at TEXT DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(conversation_id) REFERENCES conversations(id)
);
`);

const keys={openai:process.env.OPENAI_API_KEY,groq:process.env.GROQ_API_KEY,grok:process.env.XAI_API_KEY};

function tokenFor(user){return jwt.sign({id:user.id,email:user.email},JWT_SECRET,{expiresIn:"30d"});}
function auth(req,res,next){
 try{
  if(!JWT_SECRET)return res.status(500).json({error:"JWT_SECRET is not configured"});
  const h=req.headers.authorization||"";
  const t=h.startsWith("Bearer ")?h.slice(7):"";
  req.user=jwt.verify(t,JWT_SECRET); next();
 }catch{res.status(401).json({error:"Authentication required"});}
}
async function call(p,messages){
 const cfg=p==="groq"
  ? ["https://api.groq.com/openai/v1/chat/completions",keys.groq,process.env.GROQ_MODEL||"openai/gpt-oss-120b"]
  : p==="grok"
  ? ["https://api.x.ai/v1/chat/completions",keys.grok,process.env.GROK_MODEL||"grok-4.1-fast"]
  : ["https://api.openai.com/v1/chat/completions",keys.openai,process.env.AI_MODEL||"gpt-5.6-luna"];
 if(!cfg[1]) throw Error(p.toUpperCase()+" API key is not configured");
 const r=await fetch(cfg[0],{
  method:"POST",
  headers:{"Content-Type":"application/json",Authorization:"Bearer "+cfg[1]},
  body:JSON.stringify({
   model:cfg[2],
   messages:[
    {role:"system",content:"You are Veylola AI, an original AI assistant. Be helpful, accurate, clear, safe, and honest about uncertainty. Maintain context across the conversation. Never claim to be ChatGPT or OpenAI."},
    ...messages
   ]
  })
 });
 const d=await r.json();
 if(!r.ok) throw Error(d?.error?.message||"AI provider error");
 return d.choices?.[0]?.message?.content||"No response generated.";
}

app.get("/",(_,r)=>r.json({name:"Veylola AI API",status:"online",database:"custom"}));
app.get("/health",(_,r)=>r.json({status:"ok",database:"connected"}));

app.post("/auth/register",async(req,res)=>{
 try{
  const email=String(req.body?.email||"").trim().toLowerCase(), password=String(req.body?.password||""), name=String(req.body?.name||"").trim();
  if(!email||password.length<8)return res.status(400).json({error:"Valid email and password of at least 8 characters are required"});
  const hash=await bcrypt.hash(password,12);
  const result=db.prepare("INSERT INTO users(email,password_hash,name) VALUES(?,?,?)").run(email,hash,name);
  const user={id:Number(result.lastInsertRowid),email,name};
  res.status(201).json({user,token:tokenFor(user)});
 }catch(e){res.status(409).json({error:"Account could not be created"});}
});

app.post("/auth/login",async(req,res)=>{
 const email=String(req.body?.email||"").trim().toLowerCase(),password=String(req.body?.password||"");
 const row=db.prepare("SELECT * FROM users WHERE email=?").get(email);
 if(!row||!(await bcrypt.compare(password,row.password_hash)))return res.status(401).json({error:"Invalid email or password"});
 const user={id:row.id,email:row.email,name:row.name};
 res.json({user,token:tokenFor(user)});
});

app.get("/auth/me",auth,(req,res)=>{
 const u=db.prepare("SELECT id,email,name,created_at FROM users WHERE id=?").get(req.user.id);
 res.json({user:u});
});

app.post("/chat",auth,async(req,res)=>{
 try{
  const m=String(req.body?.message||"").trim(); if(!m)return res.status(400).json({error:"message is required"});
  let p=String(req.body?.provider||"veylola").toLowerCase(); if(p==="veylola")p="openai";
  let cid=Number(req.body?.conversation_id);
  if(!cid){const x=db.prepare("INSERT INTO conversations(user_id,title) VALUES(?,?)").run(req.user.id,m.slice(0,60)||"New chat");cid=Number(x.lastInsertRowid);}
  const owner=db.prepare("SELECT id FROM conversations WHERE id=? AND user_id=?").get(cid,req.user.id);
  if(!owner)return res.status(404).json({error:"Conversation not found"});
  db.prepare("INSERT INTO messages(conversation_id,role,content) VALUES(?,?,?)").run(cid,"user",m);
  const history=db.prepare("SELECT role,content FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT 40").all(cid).reverse();
  const answer=await call(p,history);
  db.prepare("INSERT INTO messages(conversation_id,role,content) VALUES(?,?,?)").run(cid,"assistant",answer);
  res.json({response:answer,provider:p,conversation_id:cid});
 }catch(e){res.status(500).json({error:e.message});}
});

app.get("/conversations",auth,(req,res)=>{
 const rows=db.prepare("SELECT id,title,created_at FROM conversations WHERE user_id=? ORDER BY id DESC").all(req.user.id);
 res.json({conversations:rows});
});

app.get("/conversations/:id/messages",auth,(req,res)=>{
 const c=db.prepare("SELECT id FROM conversations WHERE id=? AND user_id=?").get(req.params.id,req.user.id);
 if(!c)return res.status(404).json({error:"Conversation not found"});
 res.json({messages:db.prepare("SELECT id,role,content,created_at FROM messages WHERE conversation_id=? ORDER BY id").all(c.id)});
});

app.get("/v1/capabilities",(_,r)=>r.json({chat:true,auth:true,customDatabase:true,providers:["veylola","groq","grok"]}));
app.listen(PORT,()=>console.log("Veylola custom API listening on "+PORT));