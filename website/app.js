const SUPABASE_URL="https://vihbsfrwnslnmheowkhy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_HIMGxb-O6fj9O7OzT4ukuQ_jm5W8mWz";

document.addEventListener("DOMContentLoaded",async()=>{
  const $=id=>document.getElementById(id);
  const modal=$("modal"),msg=$("msg"),title=document.querySelector(".dialog h2"),submit=$("submit");

  const showModal=()=>{modal.classList.remove("hidden");msg.textContent="";$("email").focus()};
  $("open").onclick=showModal;$("hero").onclick=showModal;$("close").onclick=()=>modal.classList.add("hidden");

  let mode="signup";
  const switcher=document.createElement("button");
  switcher.type="button";switcher.textContent="Already have an account? Sign in";
  switcher.style.cssText="margin-top:12px;width:100%";submit.after(switcher);
  const setMode=m=>{mode=m;title.textContent=m==="signup"?"Create account":"Sign in";submit.textContent=m==="signup"?"Create account":"Sign in";switcher.textContent=m==="signup"?"Already have an account? Sign in":"Need an account? Create one";msg.textContent=""};
  switcher.onclick=()=>setMode(mode==="signup"?"signin":"signup");

  if(!window.supabase){msg.textContent="Account service could not load. Please refresh.";return}
  const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

  const actionMessage=(heading,body)=>{
    alert(heading+"\n\n"+body);
  };

  const showDashboard=session=>{
    if(!session){
      $("dashboard").classList.add("hidden");$("landing").classList.remove("hidden");return;
    }
    $("userEmail").textContent=session.user?.email||"Signed-in account";
    $("landing").classList.add("hidden");$("dashboard").classList.remove("hidden");modal.classList.add("hidden");
  };

  const {data:{session}}=await supabase.auth.getSession();
  showDashboard(session);
  supabase.auth.onAuthStateChange((_event,newSession)=>showDashboard(newSession));

  submit.onclick=async()=>{
    const email=$("email").value.trim(),password=$("password").value;
    if(!email||!email.includes("@")){msg.textContent="Enter a valid email address.";return}
    if(password.length<6){msg.textContent="Password must be at least 6 characters.";return}
    submit.disabled=true;msg.textContent=mode==="signup"?"Creating your account…":"Signing you in…";
    try{
      if(mode==="signup"){
        const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});
        if(error)throw error;
        if(data.session)showDashboard(data.session);
        else msg.textContent="Account created. Check your email to confirm, then sign in.";
      }else{
        const {data,error}=await supabase.auth.signInWithPassword({email,password});
        if(error)throw error;
        showDashboard(data.session);
      }
    }catch(error){msg.textContent=error?.message||"Authentication failed. Please try again."}
    finally{submit.disabled=false}
  };

  $("logout").onclick=async()=>{await supabase.auth.signOut();showDashboard(null)};

  const provisionNumber=async()=>{
    const btn=[...document.querySelectorAll("#dashboard button")].find(b=>b.textContent.includes("Get a +234 number")||b.textContent.trim()==="Continue");
    if(btn)btn.disabled=true;
    actionMessage("Number request","Requesting your +234 virtual number…");
    try{
      const {data,error}=await supabase.functions.invoke("provision-number");
      if(error)throw error;
      if(data?.error)throw new Error(data.error);
      const number=data?.phone_number;
      if(!number)throw new Error("No number was returned by the provider.");
      document.querySelectorAll(".masked").forEach(el=>el.textContent=number);
      document.querySelectorAll(".dash-grid article").forEach(card=>{
        if(card.textContent.includes("MY VIRTUAL NUMBER")){
          const p=card.querySelector("p");if(p)p.textContent="Active • SMS enabled";
        }
      });
      actionMessage("Number ready",number+"\\n\\nYour provider-issued virtual number is now active.");
    }catch(error){
      actionMessage("Number request failed",error?.message||"The number service could not complete the request.");
    }finally{if(btn)btn.disabled=false}
  };

  const buttons=[...document.querySelectorAll("#dashboard button")].filter(b=>b.id!=="logout");
  buttons.forEach(button=>{
    button.addEventListener("click",async()=>{
      const label=button.textContent.trim();
      if(label==="Fund wallet") actionMessage("Fund wallet","Wallet funding is not connected yet. Your current balance is ₦0.00.");
      else if(label==="Get a +234 number"||label==="Continue") await provisionNumber();
      else if(label==="Open inbox") actionMessage("SMS inbox","Your inbox will show incoming SMS for your active virtual number.");
      else if(label==="View transactions") actionMessage("Transactions","Your transaction history will appear here.");
      else if(label==="Open profile") actionMessage("Profile","Profile settings will appear here.");
    });
  });
});