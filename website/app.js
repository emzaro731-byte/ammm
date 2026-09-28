const SUPABASE_URL="https://vihbsfrwnslnmheowkhy.supabase.co";
const SUPABASE_PUBLISHABLE_KEY="sb_publishable_HIMGxb-O6fj9O7OzT4ukuQ_jm5W8mWz";

document.addEventListener("DOMContentLoaded",()=>{
  const modal=document.getElementById("modal");
  const msg=document.getElementById("msg");
  const title=document.querySelector(".dialog h2");
  const submit=document.getElementById("submit");
  const open=document.getElementById("open");
  const hero=document.getElementById("hero");
  const close=document.getElementById("close");

  const showModal=()=>{
    modal.classList.remove("hidden");
    msg.textContent="";
    document.getElementById("email").focus();
  };
  open.onclick=showModal;
  hero.onclick=showModal;
  close.onclick=()=>modal.classList.add("hidden");

  let mode="signup";
  const setMode=(m)=>{
    mode=m;
    title.textContent=m==="signup"?"Create account":"Sign in";
    submit.textContent=m==="signup"?"Create account":"Sign in";
    msg.textContent="";
  };

  const switcher=document.createElement("button");
  switcher.type="button";
  switcher.textContent="Already have an account? Sign in";
  switcher.style.cssText="margin-top:12px;width:100%;";
  submit.after(switcher);
  switcher.onclick=()=>{
    setMode(mode==="signup"?"signin":"signup");
    switcher.textContent=mode==="signup"?"Already have an account? Sign in":"Need an account? Create one";
  };

  if(!window.supabase){
    msg.textContent="Account service could not load. Please refresh the page.";
    return;
  }

  const supabase=window.supabase.createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);

  submit.onclick=async()=>{
    const email=document.getElementById("email").value.trim();
    const password=document.getElementById("password").value;
    if(!email||!email.includes("@")){
      msg.textContent="Enter a valid email address.";
      return;
    }
    if(password.length<6){
      msg.textContent="Password must be at least 6 characters.";
      return;
    }
    submit.disabled=true;
    msg.textContent=mode==="signup"?"Creating your account…":"Signing you in…";
    try{
      if(mode==="signup"){
        const {data,error}=await supabase.auth.signUp({email,password,options:{emailRedirectTo:window.location.origin}});
        if(error) throw error;
        msg.textContent=data.session?"Account created and signed in.":"Account created. Check your email to confirm, then sign in.";
      }else{
        const {error}=await supabase.auth.signInWithPassword({email,password});
        if(error) throw error;
        msg.textContent="Signed in successfully.";
        setTimeout(()=>modal.classList.add("hidden"),700);
      }
    }catch(error){
      msg.textContent=error?.message||"Authentication failed. Please try again.";
    }finally{
      submit.disabled=false;
    }
  };
});