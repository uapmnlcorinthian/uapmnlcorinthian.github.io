/* ---------- wait until bcrypt is ready ---------- */
(() => {
  let tries = 0;
  const grab = () => {
    // bcryptjs attaches to window.dcodeIO.bcrypt in browsers
    if (!window.bcrypt && window.dcodeIO?.bcrypt) {
      window.bcrypt = window.dcodeIO.bcrypt;
    }
    if (window.bcrypt) return;                     // ready
    if (tries++ < 200) return setTimeout(grab, 20); // wait up to 4 s
    console.error('bcryptjs not loaded');
  };
  grab();
})();



/* ---------- create global client (wait until SDK present) ---------- */
(() => {
  const url  = 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';

  let retries = 0;
  const grab = () => {
    if (window.sb) return;                             // already done
    if (window.supabase) {                             // SDK ready
      window.sb = window.supabase.createClient(url, anon);
      return;
    }
    if (retries++ < 300) setTimeout(grab, 20);         // wait up to 6 s
    else console.error('Supabase SDK not found');
  };
  grab();
})();

/* ---------- main logic ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const sb = () => window.sb;                          // getter (may appear late)

  /* helpers */
  const mask = '••••••••••••••••';
  const fmt  = s => { const d = new Date(s); return isNaN(d)?'':
                     d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); };

  const toggleEye = (btn,inpt) => {
    if (!btn||!inpt) return;
    const ic = btn.querySelector('i');
    const set = sh => ic&&(ic.className='fa-solid '+(sh?'fa-eye-slash':'fa-eye'));
    set(false);
    const flip=()=>{const hid=inpt.type==='password';inpt.type=hid?'text':'password';set(hid);
      btn.setAttribute('aria-label',hid?'Hide password':'Show password');
      btn.setAttribute('aria-pressed',String(hid));};
    btn.addEventListener('click',flip);
    btn.addEventListener('keydown',e=>[' ','Enter'].includes(e.key)&&(e.preventDefault(),flip()));
  };

  const initSens = () =>
    document.querySelectorAll('.toggle-sensitive-btn').forEach(b=>{
      const s=b.previousElementSibling; s.dataset.realValue=s.textContent;
      s.textContent=mask; s.setAttribute('aria-hidden','true');
      const ic=b.querySelector('i');
      b.addEventListener('click',()=>{
        const hid=s.getAttribute('aria-hidden')==='true';
        s.textContent=hid?s.dataset.realValue:mask;
        s.setAttribute('aria-hidden',String(!hid));
        ic&&(ic.className='fa-solid '+(hid?'fa-eye-slash':'fa-eye'));
        b.setAttribute('aria-label',b.getAttribute('aria-label').replace(hid?'Show':'Hide',hid?'Hide':'Show'));
      });
    });

  /* login page */
  const lf=document.getElementById('loginForm');
  if(lf){
    const sbt=lf.querySelector('button[type="submit"]');
    const uI=lf.username, pI=lf.password;
    toggleEye(document.getElementById('togglePassword'),pI);

    lf.addEventListener('submit',async e=>{
      e.preventDefault();
      if(!lf.checkValidity()) return lf.classList.add('was-validated');
      sbt.disabled=true;

      const user=uI.value.trim().toLowerCase();
      const pass=pI.value;

      const {data, error}=await sb()
        .from('xxsr_001')
        .select('username,password,name,prc_license,address,birthday,contact_no,email,membership_active,total_due')
        .eq('username',user)
        .maybeSingle();

      if(error||!data||!bcrypt.compareSync(pass,data.password)){
        alert('Invalid username or password.'); sbt.disabled=false; return;
      }

      sessionStorage.setItem('userData',JSON.stringify({
        status:'success',
        personalInfo:{
          name:data.name,prcLicense:data.prc_license,address:data.address,
          birthday:data.birthday,contactNo:data.contact_no,email:data.email},
        membershipActive:data.membership_active,totalDue:data.total_due
      }));
      location.href='account.html';
    });
  }

  /* account page */
  if(document.body.classList.contains('account-info')){
    const ud=JSON.parse(sessionStorage.getItem('userData')||'null');
    if(!ud?.status){location.href='login_page.html';return;}
    const i=ud.personalInfo;
    document.getElementById('accountInfo').innerHTML=`
      <p><strong>Name:</strong> ${i.name}</p>
      <p><strong>PRC License:</strong> ${i.prcLicense}</p>
      <p><strong>Address:</strong> ${i.address}</p>
      <p><strong>Birthday:</strong> ${fmt(i.birthday)}</p>
      <p><strong>Contact No.:</strong> ${i.contactNo}</p>
      <p><strong>Email:</strong> ${i.email}</p>`;
    document.getElementById('membershipStatus').textContent=ud.membershipActive||'';
    document.getElementById('totalDue').textContent=ud.totalDue||'';
    initSens();
  }

  /* back‑to‑top */
  const tB=document.getElementById('backToTopBtn');
  tB&&(
    window.addEventListener('scroll',()=>tB.style.display=scrollY>100?'block':'none'),
    tB.addEventListener('click',()=>scrollTo({top:0,behavior:'smooth'}))
  );
});
