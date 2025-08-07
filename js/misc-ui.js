// File: supabase.js
// Provides: __ensureSB() loader and getPaymentColumns()
(() => {
  const URL = 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';
  window.__ensureSB = async () => {
    if (window.sb) return window.sb;
    if (window.supabase) {
      window.sb = window.supabase.createClient(URL, KEY);
      return sb;
    }
    try {
      const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
      window.sb = m.createClient(URL, KEY);
      return sb;
    } catch {
      await new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/index.js';
        s.async = true;
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });
      window.sb = window.supabase.createClient(URL, KEY);
      return sb;
    }
  };
  window.getPaymentColumns = async function(sb, tbl='xxsr_001') {
    const { data } = await sb.from('visible_columns')
      .select('column_name')
      .eq('table_name', tbl)
      .order('column_name');
    return (data||[])
      .map(c => c.column_name)
      .filter(n => /(chapter_|iapoa_).+_\d{4}$/.test(n));
  };
})();

// File: helpers.js
// Provides DOM selectors and formatting utilities
(() => {
  window.$ = s => document.querySelector(s);
  window.$$ = s => Array.from(document.querySelectorAll(s));
  window.mask = v => v ? '***' + String(v).slice(-4) : '*no data*';
  window.mailMask = e => {
    if (!e) return '*no data*';
    const [u,d] = e.split('@');
    return d ? `${u[0]}***@${d}` : e;
  };
  window.formatDate = d => {
    const t = new Date(d);
    return isNaN(t) ? '—' : t.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
  };
  window.formatMoney = v => isNaN(+v) ? '—' : '₱' + (+v).toLocaleString();
})();

// File: auth.js
// Handles login form and authentication flow
(() => {
  async function initLogin() {
    const f = $('#loginForm'); if (!f) return;
    const btn = f.querySelector('button[type=submit]');
    const usr = f.username;
    const pwd = f.password;
    const toggle = $('#togglePassword');
    if (toggle) {
      toggle.addEventListener('click', () => {
        const reveal = pwd.type === 'password';
        pwd.type = reveal ? 'text' : 'password';
        toggle.querySelector('i').className = reveal
          ? 'fa-solid fa-eye-slash'
          : 'fa-solid fa-eye';
        toggle.setAttribute('aria-pressed', String(reveal));
      });
    }
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      if (!f.checkValidity()) { f.classList.add('was-validated'); return; }
      const token = grecaptcha.getResponse();
      if (!token) { alert('Please confirm you are human.'); return; }
      btn.disabled = true;
      const sb = await __ensureSB();
      try {
        const { data: capResp, error: capErr } =
          await sb.functions.invoke('verifyCaptcha', { body:{ token } });
        if (capErr || !capResp?.success) {
          alert('CAPTCHA failed. Try again.');
          grecaptcha.reset();
          btn.disabled = false;
          return;
        }
        const cols = await getPaymentColumns(sb);
        const fixed = [
          'row_id','username','password_hash','name','prc_license','address',
          'birthday','contact_no','email','membership_active','total_due','batch','company','position'
        ];
        const { data: user, error: authErr } = await sb
          .from('xxsr_001')
          .select([...fixed, ...cols].join(','))
          .eq('username', usr.value.trim().toLowerCase())
          .maybeSingle();
        if (authErr || !user) throw new Error('Invalid username or password.');
        const { data: isValid, error: verifyErr } = await sb
          .rpc('verify_password', { plain: pwd.value.trim(), hash: user.password_hash })
          .single();
        if (verifyErr || !isValid) throw new Error('Invalid username or password.');
        const pay = Object.fromEntries(cols.map(k => [k, user[k]]));
        delete user.password;
        const sess = { ok:1, row:String(user.row_id).toLowerCase(), pi:{
          n:user.name, prc:user.prc_license, a:user.address,
          b:user.birthday, c:user.contact_no, e:user.email,
          bt:user.batch||'', co:user.company||'', po:user.position||''
        }, act:user.membership_active, due:user.total_due, pay };
        sessionStorage.setItem('userData', JSON.stringify(sess));
        setTimeout(() => window.location.replace('/account/'), 100);
      } catch (err) {
        alert(err.message || 'Login failed. Please try again.');
        btn.disabled = false;
      }
    });
  }
  window.initLogin = initLogin;
})();

// File: account.js
// Populates account page with user data
(() => {
  function initAccount() {
    if (location.pathname === '/membership/') return;
    let u = JSON.parse(sessionStorage.getItem('userData') || 'null');
    if (!u?.ok) {
      const stored = JSON.parse(localStorage.getItem('userData')||'null');
      if (stored?.ok) { u = stored; sessionStorage.setItem('userData', JSON.stringify(u)); }
    }
    if (!u?.ok) { location.href = '/membership/'; return; }
    const pi = u.pi;
    $('#cardName').textContent = pi.n || '*no data*';
    $('#cardBatch').textContent = pi.bt || '*no data*';
    $('#cardCompany').textContent = pi.co || '*no data*';
    $('#cardPosition').textContent = pi.po || '*no data*';
    const badge = $('#statusBadge');
    if (badge) {
      const active = String(u.act||'').toLowerCase().startsWith('a');
      badge.textContent = active ? 'Active' : 'Inactive';
      badge.className = 'badge ' + (active ? 'bg-success' : 'bg-danger');
    }
    const fieldMap = { prcLicense:'prc', email:'e', contactNo:'c', cardCompany:'co', cardPosition:'po' };
    Object.entries(fieldMap).forEach(([elId, piKey]) => {
      const el = document.getElementById(elId);
      if (!el) return;
      let real = pi[piKey] || '';
      if (elId === 'contactNo') real = '0'+String(real).replace(/^0+/, '');
      el.textContent = real;
      el.dataset.real = real;
      el.dataset.shown = '1';
    });
    $$('.toggle-sensitive-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const span = btn.parentElement.querySelector('.sensitive-text');
        if (!span) return;
        const show = span.dataset.shown!=='1';
        const real = span.dataset.real || '*no data*';
        const masked = span.id==='email' ? mailMask(real) : mask(real);
        span.textContent = show ? real : masked;
        span.dataset.shown = show?'1':'0';
        btn.querySelector('i').className = show?'fa-solid fa-eye-slash':'fa-solid fa-eye';
      });
    });
    $('#totalDue').textContent = u.due ? '₱'+Number(u.due).toLocaleString() : '₱0';
    const pay = u.pay||{};
    const yrs = Array.from(new Set(Object.keys(pay)
      .map(k=>k.match(/_(\d{4})$/)).filter(Boolean).map(m=>m[1])
    )).sort((a,b)=>b-a);
    const headRow = $('#paymentsTable thead tr');
    while (headRow.children.length>1) headRow.removeChild(headRow.lastChild);
    yrs.forEach(y => {
      const th = document.createElement('th'); th.textContent = y;
      if (y===yrs[0]) { th.style.background='#cce5ff'; th.style.fontWeight='700'; }
      headRow.appendChild(th);
    });
    const buildGroup = (cats, sel) => {
      const tbody = $(sel); if (!tbody) return;
      tbody.querySelectorAll('td').forEach(t=>t.remove());
      cats.forEach((cat,i) => {
        const tr = tbody.children[i];
        yrs.forEach(y => {
          const key = `${cat.key}_${y}`;
          let v = pay[key]; if (v==null||v==='') v='—';
          const td = document.createElement('td');
          td.textContent = cat.date ? formatDate(v) : (cat.money?formatMoney(v):v);
          if (y===yrs[0]) td.style.fontWeight='700';
          tr.appendChild(td);
        });
      });
    };
    buildGroup([
      { key:'chapter_dues', money:1 },
      { key:'chapter_dues_penalty', money:1 },
      { key:'chapter_payment_date', date:1 }
    ], 'tbody.group-chapter');
    buildGroup([
      { key:'iapoa_dues', money:1 },
      { key:'iapoa_dues_penalty', money:1 },
      { key:'iapoa_payment_date', date:1 }
    ], 'tbody.group-iapoa');
  }
  window.initAccount = initAccount;
})();

// File: updateForm.js
// Manages member profile update form
(() => {
  function initUpdateForm() {
    const f = $('#updateInfoForm'); if (!f||f.dataset.init==='1') return;
    f.dataset.init = '1';
    const fb = $('#updateFeedback');
    const btn = f.querySelector('button[type=submit]');
    const needRules=[ '.{8,}','[a-z]','[A-Z]','\\d','[^A-Za-z0-9]' ];
    const checkMissing = s => needRules.filter(r=>!new RegExp(r).test(s)).length;
    let u = JSON.parse(sessionStorage.getItem('userData')||'null');
    if (!u?.ok) {
      const stored = JSON.parse(localStorage.getItem('userData')||'null');
      if (stored?.ok) { u=stored; sessionStorage.setItem('userData', JSON.stringify(u)); }
    }
    if (!u?.ok) { location.href='/membership/'; return; }
    const id = Number(u.row);
    (async()=>{
      try {
        const sb = await __ensureSB();
        const { data:d } = await sb.from('xxsr_001')
          .select('username,email,contact_no,company,position')
          .eq('row_id', id).maybeSingle();
        if (d) {
          f.username.value = d.username||'';
          f.email.value    = d.email||u.pi.e||'';
          f.contact.value  = '0'+(d.contact_no || u.pi.c || '').replace(/^0+/,'');
          f.company.value  = d.company||u.pi.co||'';
          f.position.value = d.position||u.pi.po||'';
        }
      } catch(e){ console.error('prefill error', e); }
    })();
    ['currentPassword','password','confirmPassword','username','email','contact','company','position']
      .forEach(id=>{ const el=f.querySelector('#'+id); if(el) el.setAttribute('autocomplete','off'); });
    const pw = f.password;
    const wrap = pw.closest('.password-wrapper');
    if (wrap) {
      wrap.style.position='relative'; pw.classList.add('pe-5');
      const eye = document.createElement('button');
      Object.assign(eye, { type:'button', className:'btn btn-sm border-0 bg-transparent position-absolute end-0 top-50 translate-middle-y me-2', innerHTML:'<i class="fa-solid fa-eye"></i>', onclick:()=>{
        const show = pw.type==='password'; pw.type=show?'text':'password';
        eye.firstChild.className='fa-solid '+(show?'fa-eye-slash':'fa-eye');
      }});
      wrap.appendChild(eye);
      const msg = document.createElement('div'); msg.className='form-text text-muted small';
      const barWrap = document.createElement('div'); barWrap.className='progress mt-1';
      barWrap.innerHTML='<div class="progress-bar" role="progressbar" style="width:0%"></div>';
      wrap.parentElement.append(msg, barWrap);
      pw.addEventListener('input', () => {
        const s=pw.value; const miss=checkMissing(s);
        const pct = ((5-miss)/5)*100; const bar = barWrap.querySelector('.progress-bar');
        msg.textContent = miss
          ? 'Needs: '+needRules.map((r,i)=>['8 chars','lowercase','uppercase','number','symbol'][i]).filter((_,i)=>!new RegExp(needRules[i]).test(s)).join(', ')
          : '';
        bar.style.width = pct+'%';
        bar.className = 'progress-bar bg-'+(
          pct>=80?'success':pct>=60?'info':pct>=40?'warning':'danger'
        );
      });
      f.confirmPassword.addEventListener('input', () => {
        if (pw.value && f.confirmPassword.value && pw.value!==f.confirmPassword.value) {
          fb.textContent = 'Passwords do not match.';
        } else if (fb.textContent==='Passwords do not match.') fb.textContent='';
      });
    }
    const unameInput = f.querySelector('#username');
    const unameFeedback = document.createElement('div');
    unameFeedback.className = 'form-text text-danger small mt-1';
    unameInput.after(unameFeedback);
    const usernameRegex = /^[a-z0-9]{6,}$/;
    unameInput.addEventListener('input', ()=>{
      const val = unameInput.value.trim();
      if (!val) { unameFeedback.textContent=''; btn.disabled=false; return; }
      if (!usernameRegex.test(val)) {
        unameFeedback.textContent='Username must be at least 6 chars, lowercase letters & numbers only.';
        btn.disabled=true;
      } else { unameFeedback.textContent=''; btn.disabled=false; }
    });
    const MAX=2; const limitKey='updateLimit-'+u.row;
    const quotaEl=document.createElement('div'); quotaEl.id='updateQuotaInfo'; quotaEl.className='col-12 small text-muted mt-0';
    const todayStr=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Manila'});
    const refreshQuota=()=>{
      let lim=JSON.parse(localStorage.getItem(limitKey)||'null')||{date:todayStr(),count:0};
      if(lim.date!==todayStr()) lim={date:todayStr(),count:0};
      const remaining=Math.max(0, MAX-lim.count);
      quotaEl.textContent=`Daily limit: ${MAX} updates. Remaining: ${remaining}.`;
      if (!$('#updateQuotaInfo')) {
        const ref=$('#updateFeedback')||f; ref.parentNode.insertBefore(quotaEl, $('#updateFeedback'));
      }
      btn.disabled = remaining===0;
    };
    refreshQuota();
    f.addEventListener('submit', async e=>{
      e.preventDefault(); fb.textContent=''; btn.disabled=true;
      try {
        let lim=JSON.parse(local
