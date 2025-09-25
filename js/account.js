// File: account.js
// Handles account page and update form (OTP, allow-list, phone normalize, pw strength, direct REST update)

// scoped helpers (won't clash with other scripts)
(function(){
  const $ = s => document.querySelector(s);
  const $$ = s => document.querySelectorAll(s);
  const mask = s => !s ? '*no data*' : String(s).replace(/.(?=.{4})/g,'•');
  const mailMask = e => {
    if (!e) return '*no data*';
    const [u,h] = String(e).split('@'); if (!h) return mask(e);
    const u2 = u.length<=2 ? u[0]+'•' : u[0]+'•'.repeat(Math.max(1,u.length-2))+u.slice(-1);
    return `${u2}@${h}`;
  };
  const formatMoney = v => v ? ('₱'+Number(v).toLocaleString()) : '—';
  const formatDate  = v => {
    if (!v || v==='—') return '—';
    const d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'2-digit'});
  };

  // email allow-list
  const ALLOW = new Set(['gmail.com','yahoo.com','outlook.com','hotmail.com','live.com','icloud.com','proton.me','protonmail.com','yandex.com','aol.com']);
  const ALLOW_TXT = [...ALLOW].join(', ');
  const emailOk = v => { v=(v||'').trim().toLowerCase(); const h=v.split('@')[1]||''; return ALLOW.has(h); };

  // phone normalize (DB wants 9XXXXXXXXX; UI shows 09XXXXXXXXX)
  const normPhone = v => {
    v = String(v||'').replace(/\D/g,'');
    if (/^09\d{9}$/.test(v)) return v.slice(1);
    if (/^\+?63\d{10}$/.test(v)) return v.replace(/^\+?63/,'');
    return null;
  };
  const dispPhone = db => db ? ('0'+String(db).replace(/^0+/,'')) : '';

  // password strength (NEW RULE: 8+ chars; upper+lower + (digit OR symbol))
  const pwScore = s => {
    s = s || '';
    const len = s.length >= 8;
    const lower = /[a-z]/.test(s);
    const upper = /[A-Z]/.test(s);
    const digit = /\d/.test(s);
    const symbol = /[^A-Za-z0-9]/.test(s);
    const rep3 = /(.)\1{2,}/.test(s);

    let score = 0;
    if (len) score += 40;
    if (lower) score += 15;
    if (upper) score += 15;
    if (digit || symbol) score += 25;     // either is fine
    if (digit && symbol) score += 5;      // tiny bonus if both
    if (rep3) score -= 10;

    return Math.max(0, Math.min(100, score));
  };
  const pwMeetsRule = s => {
    s = s || '';
    const len = s.length >= 8;
    const lower = /[a-z]/.test(s);
    const upper = /[A-Z]/.test(s);
    const digit = /\d/.test(s);
    const symbol = /[^A-Za-z0-9]/.test(s);
    return len && lower && upper && (digit || symbol);
  };

  // Supabase
  const SB_URL = window.SUPABASE_URL || 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const SB_KEY = window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';
  const sb = (window.supabase && window.supabase.createClient) ? window.supabase.createClient(SB_URL, SB_KEY) : null;

  // Configurable table & key columns
  const TABLE = window.MCC_TABLE || 'members';
  const KEY_COLS = Array.isArray(window.MCC_KEYS) ? window.MCC_KEYS : ['row','id','member_id'];

  // OTP endpoints
  const OTP_SEND   = 'https://fvaahtqjusfniadwvoyw.functions.supabase.co/send-otp';
  const OTP_VERIFY = 'https://fvaahtqjusfniadwvoyw.functions.supabase.co/verify-otp';
  const postOTP = (url, body) =>
    fetch(url, {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'apikey':SB_KEY, 'Authorization':'Bearer '+SB_KEY },
      body: JSON.stringify(body || {})
    }).then(r => r.text().then(t => { if(!r.ok) throw new Error(t || ('HTTP '+r.status)); return t; }));

  document.addEventListener('DOMContentLoaded', () => {
    // auth snapshot (your logic)
    let u = JSON.parse(sessionStorage.getItem('userData') || 'null');
    if (!u?.ok) {
      const stored = JSON.parse(localStorage.getItem('userData') || 'null');
      if (stored?.ok) u = stored;
      else return location.href = '/membership/';
    }

    // ---------------- Account card (unchanged) ----------------
    const initAccount = () => {
      const pi = u.pi;
      $('#cardName').textContent     = pi.n  || '*no data*';
      $('#cardBatch').textContent    = pi.bt || '*no data*';
      $('#cardCompany').textContent  = pi.co || '*no data*';
      $('#cardPosition').textContent = pi.po || '*no data*';

      const badge = $('#statusBadge');
      if (badge) {
        const active = String(u.act || '').toLowerCase().startsWith('a');
        badge.textContent = active ? 'Active' : 'Inactive';
        badge.className   = 'badge ' + (active ? 'bg-success' : 'bg-danger');
      }

      const fieldMap = { prcLicense:'prc', email:'e', contactNo:'c', cardCompany:'co', cardPosition:'po' };
      Object.entries(fieldMap).forEach(([elId, piKey]) => {
        const el = document.getElementById(elId);
        if (!el) return;
        let real = pi[piKey] || '';
        if (elId === 'contactNo') real = dispPhone(real);
        el.textContent  = real;
        el.dataset.real = real;
        el.dataset.shown= '1';
      });

      $$('.toggle-sensitive-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const span = btn.parentElement.querySelector('.sensitive-text');
          if (!span) return;
          const show   = span.dataset.shown !== '1';
          const real   = span.dataset.real || '*no data*';
          const masked = span.id === 'email' ? mailMask(real) : mask(real);
          span.textContent  = show ? real : masked;
          span.dataset.shown= show ? '1' : '0';
          btn.querySelector('i').className = show ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        });
      });

      $('#totalDue').textContent = u.due ? ('₱'+Number(u.due).toLocaleString()) : '₱0';

      const pay = u.pay || {};
      const yrs = Array.from(new Set(Object.keys(pay).map(k => (k.match(/_(\d{4})$/)||[])[1]).filter(Boolean))).sort((a,b)=>b-a);

      const headRow = $('#paymentsTable thead tr');
      while (headRow.children.length > 1) headRow.removeChild(headRow.lastChild);
      yrs.forEach(y => {
        const th = document.createElement('th');
        th.textContent = y;
        if (y === yrs[0]) { th.style.background='#cce5ff'; th.style.fontWeight='700'; }
        headRow.appendChild(th);
      });

      const buildGroup = (cats, selector) => {
        const tbody = $(selector);
        if (!tbody) return;
        tbody.querySelectorAll('td').forEach(t => t.remove());
        cats.forEach((cat, i) => {
          const tr = tbody.children[i];
          yrs.forEach(y => {
            const key = `${cat.key}_${y}`;
            let v = pay[key];
            if (v == null || v === '') v = '—';
            const td = document.createElement('td');
            td.textContent = cat.date ? formatDate(v) : (cat.money ? formatMoney(v) : v);
            if (y === yrs[0]) td.style.fontWeight = '700';
            tr.appendChild(td);
          });
        });
      };

      buildGroup([
        { key:'chapter_dues',           money:1 },
        { key:'chapter_dues_penalty',   money:1 },
        { key:'chapter_payment_date',   date:1  }
      ], 'tbody.group-chapter');

      buildGroup([
        { key:'iapoa_dues',             money:1 },
        { key:'iapoa_dues_penalty',     money:1 },
        { key:'iapoa_payment_date',     date:1  }
      ], 'tbody.group-iapoa');
    };

    initAccount();

    // init update form on open (and if already open)
    const updWrap = $('#updateWrapper');
    if (updWrap) {
      updWrap.addEventListener('shown.bs.collapse', initUpdateForm);
      if (updWrap.classList.contains('show')) initUpdateForm();
    }

    // ---------------- Update Form ----------------
    function initUpdateForm(){
      const f = $('#updateInfoForm');
      if (!f || f.dataset.init === '1') return;
      f.dataset.init = '1';

      const fb  = $('#updateFeedback');
      const box = $('#updateAlert');

      const nm = $('#updName'), pr = $('#updPRC'), co = $('#updCompany'), po = $('#updPosition');
      const cn = $('#updContact'), em = $('#updEmail');
      const p1 = $('#pwd1'), p2 = $('#pwd2'), bar = $('#pwdBar'), tips = $('#pwdTips'), cap = $('#pwdCap');
      const otpBtn = $('#btnSendOTP'), otpIn = $('#otpCode'), otpGo = $('#btnVerifyOTP'), otpSt = $('#otpStatus');

      const okMsg = m => { if (box) box.classList.add('d-none'); if (fb){ fb.textContent=m; fb.className='text-success small'; } };
      const errMsg= m => { if (fb){ fb.textContent=''; fb.className='small'; } if (box){ box.textContent=m; box.classList.remove('d-none'); } };

      // user snapshot
      let u0 = JSON.parse(sessionStorage.getItem('userData') || 'null') || {};
      if (!u0?.ok) u0 = JSON.parse(localStorage.getItem('userData') || 'null') || {};
      const pi = u0.pi || {};

      // find usable key column & value (row, id, member_id)
      let keyCol = null, keyVal = null;
      for (const k of KEY_COLS) {
        const v = u0[k];
        if (v !== undefined && v !== null && String(v).trim() !== '') { keyCol = k; keyVal = v; break; }
      }

      // prefill from snapshot
      (function fill(v){
        if (nm) nm.value = pi.n || '';
        if (pr) { pr.value = (v && v.prc != null ? v.prc : (pi.prc || '')); pr.readOnly=true; pr.disabled=true; pr.setAttribute('aria-disabled','true'); }
        if (co) co.value = (v && v.co  != null ? v.co  : (pi.co  || ''));
        if (po) po.value = (v && v.po  != null ? v.po  : (pi.po  || ''));
        if (cn) cn.value = (v && v.c   != null ? dispPhone(v.c) : dispPhone(pi.c || ''));
        if (em) em.value = (v && v.e   != null ? v.e   : (pi.e   || ''));
      })(pi);

      // refresh from DB once (try each key col until one works)
      (async () => {
        try {
          if (!sb) return;
          let got = null;
          const valCandidates = [];
          if (keyCol) valCandidates.push([keyCol, keyVal]);
          for (const k of KEY_COLS) {
            if (!valCandidates.find(([kk])=>kk===k) && u0[k]!=null) valCandidates.push([k, u0[k]]);
          }
          for (const [kc, kv] of valCandidates) {
            const r = await sb.from(TABLE).select('n,prc,co,po,c,e').eq(kc, kv).maybeSingle();
            if (r && r.data) { keyCol = kc; keyVal = kv; got = r.data; break; }
          }
          if (got) {
            if (nm) nm.value = got.n  || (pi.n  || '');
            if (pr) pr.value = got.prc|| (pi.prc|| '');
            if (co) co.value = got.co || (pi.co || '');
            if (po) po.value = got.po || (pi.po || '');
            if (cn) cn.value = dispPhone(got.c || (pi.c || ''));
            if (em) em.value = got.e || (pi.e || '');
            try { u0.pi = Object.assign({}, u0.pi, got); sessionStorage.setItem('userData', JSON.stringify(u0)); } catch(e){}
          }
        } catch(e) {/*silent*/}
      })();

      // strength meter (new tips)
      const paint = v => {
        const p = pwScore(v||'');
        if (bar){ bar.style.width=p+'%'; bar.className='progress-bar'+(p>=80?' bg-success':p>=60?' bg-warning':' bg-danger'); }
        if (tips){ tips.textContent='Min 8 chars; include UPPER + lower + (number OR symbol).'; }
      };
      if (p1){ ['input','keyup','change','paste'].forEach(ev => p1.addEventListener(ev, () => paint(p1.value))); paint(p1.value||''); }

      // daily cap
      const dayKey='pwdCap_'+new Date().toISOString().slice(0,10), MAX=2;
      let cnt=0; try{ cnt=+JSON.parse(localStorage.getItem(dayKey)||'0')||0 }catch(e){}
      if (cap) cap.textContent = `Password changes today: ${cnt}/${MAX}`;

      // email/phone validity
      let otpVerified=false;
      if (em) em.addEventListener('input', () => {
        const ok = emailOk(em.value);
        em.setCustomValidity(ok ? '' : 'Allowed domains: '+ALLOW_TXT);
        if (otpSt){ otpSt.textContent=''; otpSt.className='small'; }
        otpVerified = false;
      });
      if (cn) cn.addEventListener('blur', () => {
        const dbv = normPhone(cn.value);
        if (cn.value && dbv===null) cn.setCustomValidity('Enter PH mobile as 09XXXXXXXXX or +639XXXXXXXXX');
        else cn.setCustomValidity('');
      });

      // OTP (ALWAYS required)
      const setOtp = (t,cls)=>{ if(otpSt){ otpSt.textContent=t; otpSt.className='small '+(cls||''); } };

      if (otpBtn) otpBtn.addEventListener('click', async () => {
        const to = (em && em.value ? em.value : '').trim().toLowerCase();
        if (!to){ setOtp('Enter email first','text-danger'); return; }
        if (!emailOk(to)){ setOtp('Only these domains are allowed: '+ALLOW_TXT,'text-danger'); return; }
        otpBtn.disabled=true; const t=otpBtn.textContent; otpBtn.textContent='Sending...';
        try { await postOTP(OTP_SEND, { email: to }); setOtp('OTP sent to email','text-success'); otpVerified=false; }
        catch { setOtp('Failed to send OTP','text-danger'); }
        otpBtn.disabled=false; otpBtn.textContent=t;
      });

      if (otpGo) otpGo.addEventListener('click', async () => {
        const to   = (em && em.value ? em.value : '').trim().toLowerCase();
        const code = (otpIn && otpIn.value ? otpIn.value : '').trim();
        if (!/^\d{6}$/.test(code)){ setOtp('Enter 6-digit OTP','text-danger'); return; }
        otpGo.disabled=true; const t=otpGo.textContent; otpGo.textContent='Verifying...';
        try {
          const v = await postOTP(OTP_VERIFY, { email: to, otp: code });
          otpVerified = (String(v).trim()==='Verified');
          setOtp(otpVerified?'Email verified':'Incorrect or expired', otpVerified?'text-success':'text-danger');
        } catch {
          otpVerified=false; setOtp('Network/verify error','text-danger');
        }
        otpGo.disabled=false; otpGo.textContent=t;
      });

      if (em) em.addEventListener('input', () => { otpVerified=false; setOtp('',''); });

      // submit
      f.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!otpVerified) { errMsg('Please verify the OTP sent to your email.'); return; }
        if (!sb)          { errMsg('Supabase not available.'); return; }
        if (!keyCol || keyVal==null) { errMsg('Missing member key.'); return; }

        // password checks (only if provided)
        const A = p1 && p1.value ? p1.value : '';
        const B = p2 && p2.value ? p2.value : '';
        if (A || B) {
          if (cnt >= MAX) { const rem = 0; errMsg(`Max 2 per day (${rem} remaining).`); return; }
          if (A !== B)    { errMsg('Passwords do not match.'); return; }
          if (!pwMeetsRule(A)) { errMsg('Password too weak. Use 8+ chars, UPPER + lower + (number OR symbol).'); return; }
        }

        // email allow-list
        const newEmail = (em && em.value ? em.value : '').trim().toLowerCase();
        if (!emailOk(newEmail)) { errMsg('Please use an allowed email domain: '+ALLOW_TXT); return; }

        // compare to originals
        const orig = { co:(pi.co||''), po:(pi.po||''), c:String(pi.c||''), e:(pi.e||'').toLowerCase() };
        const cIn  = (cn && cn.value ? cn.value : '').trim();
        const cDb  = cIn ? normPhone(cIn) : null;
        const cChanged = (cIn!=='' && cDb!==orig.c && cDb!==null);
        if (cIn && cDb===null) { errMsg('Invalid contact number format.'); return; }

        // build payload with only changed fields
        const d = {};
        if (co && co.value !== orig.co) d.co = co.value;
        if (po && po.value !== orig.po) d.po = po.value;
        if (newEmail && newEmail !== orig.e) d.e = newEmail;
        if (cChanged) d.c = cDb;

        if (!Object.keys(d).length && !A) { errMsg('No changes to save.'); return; }

        try {
          // 1) Update profile fields via REST
          if (Object.keys(d).length) {
            const up = await sb.from(TABLE).update(d).eq(keyCol, keyVal).select().maybeSingle();
            if (up && up.error) throw up.error;
          }

          // (If you also change password server-side, call your function here.)

          // Reflect on top card
          if (d.co) $('#cardCompany').textContent  = d.co;
          if (d.po) $('#cardPosition').textContent = d.po;
          if (d.c  !== undefined) $('#contactNo').textContent = dispPhone(d.c);
          if (d.e) $('#email').textContent = d.e;

          // Update daily cap + message
          if (A) {
            cnt++;
            try { localStorage.setItem(dayKey, JSON.stringify(cnt)); } catch(e){}
            const rem = Math.max(0, MAX - cnt);
            if (cap) cap.textContent = `Password changes today: ${cnt}/${MAX}`;
            okMsg(`Saved. Password changes: ${cnt}/${MAX} (${rem} remaining today).`);
          } else {
            okMsg('Saved');
          }

          try { bootstrap.Collapse.getOrCreateInstance('#updateWrapper').hide(); } catch(e){}
        } catch (e2) {
          errMsg('Unable to save. Please try again.');
        }
      });
    }
  });
})();
