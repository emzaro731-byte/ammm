const SUPABASE_URL="https://vihbsfrwnslnmheowkhy.supabase.co";const SUPABASE_PUBLISHABLE_KEY="sb_publishable_HIMGxb-O6fj9O7OzT4ukuQ_jm5W8mWz";
document.addEventListener("DOMContentLoaded",async()=>{const $=id=>document.getElementById(id),modal=$("modal"),msg=$("msg"),title=document.querySelector(".dialog h2"),submit=$("submit"),toast=$("toast");const showToast=(t,b="")=>{toast.innerHTML="<b>"+t+"</b>"+(b?"<br><small>"+b+"</small>":"");toast.classList.remove("hidden");clearTimeout(showToast.t);showToast.t=setTimeout(()=>toast.classList.add("hidden"),2800)},haptic=()=>{try{navigator.vibrate?.(8)}catch{}},showModal=()=>{haptic();modal.classList.remove("hidden");msg.textContent="";$("email").focus()};$("open").onclick=showModal;$("hero").onclick=showModal;$("close").onclick=()=>modal.classList.add("hidden");modal.addEventListener("click",e=>{if(e.target===modal)modal.classList.add("hidden")});
let mode="signup";const switcher=document.createElement("button");switcher.type="button";switcher.className="glass-button";switcher.textContent="Already have an account? Sign in";switcher.style.cssText="margin-top:10px;width:100%;padding:13px;border-radius:16px";submit.after(switcher);const setMode=m=>{mode=m;title.textContent=m==="signup"?"Create account":"Welcome back";submit.textContent=m==="signup"?"Create account":"Sign in";switcher.textContent=m==="signup"?"Already have an account? Sign in":"Need an account? Create one";msg.textContent=""};switcher.onclick=()=>setMode(mode==="signup"?"signin":"signup");
if(!window.supabase){msg.textContent="Account service could not load. Please refresh.";return}const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);const showDashboard=session=>{if(!session){$("dashboard").classList.add("hidden");$("landing").classList.remove("hidden");return}$("userEmail").textContent=session.user?.email||"Signed-in account";$("landing").classList.add("hidden");$("dashboard").classList.remove("hidden");modal.classList.add("hidden")};const {data:{session}}=await supabase.auth.getSession();showDashboard(session);supabase.auth.onAuthStateChange((_event,newSession)=>showDashboard(newSession));
submit.onclick=async()=>{const email=$("email").value.trim(),password=$("password").value;if(!email||!email.includes("@")){msg.textContent="Enter a valid email address.";return}if(password.length<6){msg.textContent="Password must be at least 6 characters.";return}submit.disabled=true;msg.textContent=mode==="signup"?"Creating your account…":"Signing you in…";try{if(mode==="signup"){const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});if(error)throw error;if(data.session)showDashboard(data.session);else msg.textContent="Account created. Check your email to confirm, then sign in."}else{const {data,error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;showDashboard(data.session)}}catch(error){msg.textContent=error?.message||"Authentication failed. Please try again."}finally{submit.disabled=false}};$("profileTop")?.addEventListener("click",()=>showToast("Profile",$("userEmail").textContent));
const provisionNumber=async()=>{const btn=document.querySelector('[data-action="number"]');if(btn)btn.disabled=true;haptic();showToast("Requesting number","Finding your +234 virtual number…");try{const {data:sessionData}=await supabase.auth.getSession(),accessToken=sessionData?.session?.access_token;if(!accessToken)throw new Error("Please sign in again.");const response=await fetch("/api/provision-number",{method:"POST",headers:{Authorization:"Bearer "+accessToken,"Content-Type":"application/json"}});const data=await response.json();if(!response.ok){const detail=typeof data?.details==="string"?data.details:(data?.details?.message||data?.details?.error||"");throw new Error((data?.error||"Number service failed.")+(detail?" — "+detail:"")+" (HTTP "+response.status+")")}if(data?.error)throw new Error(data.error);const number=data?.phone_number;if(!number)throw new Error("No number was returned by the provider.");document.querySelectorAll(".masked").forEach(el=>{el.textContent=number;el.style.wordBreak="break-word"});$("numberStatus").textContent="Active · SMS enabled";showToast("Number ready",number)}catch(error){showToast("Number request failed",error?.message||"The number service could not complete the request.")}finally{if(btn)btn.disabled=false}};
const openInbox=async()=>{
  haptic();
  let sheet=document.getElementById("inboxSheet");
  if(!sheet){
    sheet=document.createElement("div");
    sheet.id="inboxSheet";
    sheet.className="modal";
    sheet.innerHTML='<div class="dialog sheet glass" style="max-height:82dvh;overflow:auto"><button class="close-button" id="closeInbox">×</button><div class="sheet-handle"></div><p class="eyebrow">MESSAGES</p><h2>SMS Inbox</h2><p class="sheet-copy" id="inboxStatus">Loading messages…</p><div id="inboxList"></div></div>';
    document.body.appendChild(sheet);
    sheet.addEventListener("click",e=>{if(e.target===sheet)sheet.classList.add("hidden")});
    sheet.querySelector("#closeInbox").onclick=()=>sheet.classList.add("hidden");
  }
  sheet.classList.remove("hidden");
  const list=sheet.querySelector("#inboxList"),status=sheet.querySelector("#inboxStatus");
  list.innerHTML="";
  try{
    const {data:sessionData}=await supabase.auth.getSession(),token=sessionData?.session?.access_token;
    if(!token)throw new Error("Please sign in again.");
    const response=await fetch("/api/inbox",{headers:{Authorization:"Bearer "+token}});
    const data=await response.json();
    if(!response.ok)throw new Error((data?.error||"Could not load inbox.")+(data?.details?.message?" — "+data.details.message:""));
    const messages=Array.isArray(data?.messages)?data.messages:[];
    if(!messages.length){
      status.textContent="No messages yet";
      list.innerHTML='<div class="surface" style="text-align:center;margin-top:14px"><div style="font-size:34px;margin-bottom:10px">✉</div><b>Your inbox is empty</b><p>New SMS received by your active number will appear here.</p></div>';
      return;
    }
    status.textContent=messages.length+" message"+(messages.length===1?"":"s");
    messages.forEach((m,i)=>{
      const card=document.createElement("article");card.className="surface";card.style.cssText="margin-top:12px;padding:18px;border-radius:22px";
      const otp=m.otp||m.code||"";
      const text=m.message||m.text||m.body||m.content||(otp?"Verification code: "+otp:"SMS received");
      const sender=m.sender||m.from||m.phone||"Unknown sender";
      const when=m.received_at||m.created_at||m.timestamp||"";
      card.innerHTML='<b>'+String(sender).replace(/</g,"&lt;")+'</b>'+(when?'<small style="display:block;color:#8a8e97;margin-top:4px">'+String(when).replace(/</g,"&lt;")+'</small>':"")+'<p style="white-space:pre-wrap;margin:12px 0 0">'+String(text).replace(/</g,"&lt;")+'</p>'+(otp?'<button class="glass-button" style="margin-top:12px;padding:9px 13px;border-radius:13px">Copy code</button>':"");
      if(otp)card.querySelector("button").onclick=async()=>{await navigator.clipboard?.writeText(String(otp));showToast("Code copied",String(otp))};
      list.appendChild(card);
    });
  }catch(error){
    status.textContent="Could not load messages";
    list.innerHTML='<div class="surface" style="margin-top:14px"><b>Inbox unavailable</b><p>'+String(error?.message||"Please try again.").replace(/</g,"&lt;")+'</p><button class="glass-button" id="retryInbox" style="padding:10px 14px;border-radius:14px">Try again</button></div>';
    document.getElementById("retryInbox")?.addEventListener("click",openInbox);
  }
};
const actions={fund:()=>showToast("Fund wallet","Wallet funding is not connected yet."),number:provisionNumber,inbox:()=>showToast("SMS Inbox","Incoming messages for your active number will appear here."),transactions:()=>showToast("Transactions","Your transaction history will appear here."),profile:()=>showToast("Profile & Settings","Account settings will appear here.")};document.querySelectorAll("[data-action]").forEach(btn=>btn.addEventListener("click",()=>{haptic();actions[btn.dataset.action]?.()}));document.querySelectorAll(".tab").forEach(tab=>tab.addEventListener("click",()=>{haptic();document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));tab.classList.add("active");const t=tab.dataset.tab;if(t==="inbox")actions.inbox();if(t==="wallet")actions.fund();if(t==="profile")actions.profile()}));$("logout")?.addEventListener("click",async()=>{await supabase.auth.signOut();showDashboard(null);showToast("Signed out")})});