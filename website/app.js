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

  const showDashboard=session=>{
    if(!session){$("dashboard").classList.add("hidden");$("landing").classList.remove("hidden");return}
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
});