/* js/common.js – v1.4.2 (2025‑07‑22)
*/

/* ╭─ Supabase bootstrap (retry) ─╮ */
(() => {
  const url = 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';
  (function init() {
    if (window.supabase) window.sb = window.supabase.createClient(url, key);
    else setTimeout(init, 25);
  })();
})();
/* ╰────────────────────────────── */

/* ── Helpers ── */
const $ = sel => document.querySelector(sel);
const mask      = v => v ? '***' + String(v).slice(-4) : '*no data*';
const mailMask  = e => {
  if (!e) return '*no data*';
  const [u,d] = e.split('@');
  return d ? u[0] + '***@' + d : e;
};
const formatDate  = d => {
  const t = new Date(d);
  return isNaN(t) ? '—'
    : t.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
};
const formatMoney = v => isNaN(+v) ? '—' : '₱' + (+v).toLocaleString();

async function getPaymentColumns(sb, tbl='xxsr_001') {
  const { data } = await sb.from('visible_columns')
                           .select('column_name')
                           .eq('table_name', tbl)
                           .order('column_name');
  return (data||[])
    .map(c=>c.column_name)
    .filter(n=>/(chapter_|iapoa_).+_\d{4}$/.test(n));
}

/* ── LOGIN ── */
async function initLogin() {
  const form = $('#loginForm'); if (!form) return;
  const btn  = form.querySelector('button[type=submit]');
  const usr  = form.username, pwd = form.password;
  const tgl  = $('#togglePassword');

  // Simple eye toggle
  if (tgl) {
    tgl.addEventListener('click', ()=>{
      const isHidden = pwd.type === 'password';
      pwd.type = isHidden ? 'text' : 'password';
      tgl.querySelector('i').className = 'fa-solid ' +
        (isHidden ? 'fa-eye-slash' : 'fa-eye');
      tgl.setAttribute('aria-pressed', String(isHidden));
    });
  }

 form.addEventListener('submit', async ev => {
   ev.preventDefault();

   // 1) HTML5 form validation
   if (!form.checkValidity()) {
     form.classList.add('was-validated');
     return;
   }

   // 2) Client‑side CAPTCHA check
   const captchaResp = grecaptcha.getResponse();
   if (!captchaResp) {
     alert('Please confirm you are human.');
     return;
   }

   btn.disabled = true;

   // 3) Server‑side CAPTCHA verification
   const verify = await fetch('https://fvaahtqjusfniadwvoyw.functions.supabase.co/verifyCaptcha', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ token: captchaResp })
   }).then(r => r.json());

   if (!verify.success) {
     alert('Captcha failed. Try again.');
     grecaptcha.reset();
     btn.disabled = false;
     return;
   }

    // wait for supabase client
   const sb = await new Promise(r => {
     const i = setInterval(()=>{
       if (window.sb) {
         clearInterval(i);
         r(window.sb);
       }
     }, 25);
   });

    const cols = await getPaymentColumns(sb);
    const fixed = [
      'row_id','username','password','name','prc_license','address',
      'birthday','contact_no','email','membership_active','total_due',
      'batch','company','position'
    ];
    const { data } = await sb.from('xxsr_001')
                             .select([...fixed, ...cols].join(','))
                             .eq('username', usr.value.trim().toLowerCase())
                             .maybeSingle();

    if (!data || pwd.value !== data.password) {
      alert('Invalid username or password.');
      btn.disabled = false;
      return;
    }

    const pay = {};
    cols.forEach(k=> pay[k] = data[k]);
    delete data.password;

    sessionStorage.setItem('userData', JSON.stringify({
      ok: 1,
      row: String(data.row_id).toLowerCase(),
      pi: {
        n: data.name,
        prc: data.prc_license,
        a: data.address,
        b: data.birthday,
        c: data.contact_no,
        e: data.email,
        bt: data.batch||'',
        co: data.company||'',
        po: data.position||''
      },
      act: data.membership_active,
      due: data.total_due,
      pay
    }));

    location.href = '/account/';
  });
}

/* ── ACCOUNT ── */
function initAccount() {
  const u = JSON.parse(sessionStorage.getItem('userData') || 'null');
  if (!u?.ok) return location.href = '/login/';

  const pi = u.pi;
  $('#cardName').textContent    = pi.n || '*no data*';
  $('#cardBatch').textContent   = pi.bt|| '*no data*';
  $('#cardCompany').textContent = pi.co|| '*no data*';
  $('#cardPosition').textContent= pi.po|| '*no data*';

  const badge = $('#statusBadge');
  if (badge) {
    const active = String(u.act||'').toLowerCase().startsWith('a');
    badge.textContent = active ? 'Active' : 'Inactive';
    badge.className   = 'badge ' + (active ? 'bg-success' : 'bg-danger');
  }

  // set sensitive text spans
  [
    {id:'prcLicense', v:pi.prc, fn:mask},
    {id:'email',      v:pi.e, fn:mailMask},
    {id:'contactNo',  v:pi.c, fn:mask}
  ].forEach(({id,v,fn})=>{
    const el = $('#'+id);
    if (!el) return;
    el.textContent = v ? fn(v) : '*no data*';
    el.dataset.real = v || '';
    el.dataset.shown = '0';
  });

  // toggle sensitive
  document.querySelectorAll('.toggle-sensitive-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const span = btn.parentElement.querySelector('.sensitive-text');
      if (!span) return;
      const show = span.dataset.shown !== '1';
      const real = span.dataset.real || '*no data*';
      let masked = '***' + String(real).slice(-4);
      if (span.id === 'email') {
        const [u,d] = real.split('@');
        masked = d ? u[0] + '***@' + d : real;
      }
      span.textContent = show ? real : masked;
      span.dataset.shown = show ? '1' : '0';
      btn.querySelector('i').className = 'fa-solid ' +
        (show ? 'fa-eye-slash' : 'fa-eye');
    });
  });

  $('#totalDue').textContent = u.due ? '₱' + Number(u.due).toLocaleString() : '₱0';

  // build payment years
  const pay = u.pay||{};
  const yrs = [...new Set(Object.keys(pay)
    .map(k=>k.match(/_(\d{4})$/))
    .filter(Boolean).map(m=>m[1])
  )].sort((a,b)=>b-a);

  const head = $('#paymentsTable thead tr');
  // clear old
  while (head.children.length > 1) head.removeChild(head.lastChild);

  yrs.forEach(y=>{
    const th = document.createElement('th');
    th.textContent = y;
    if (y === yrs[0]) {
      th.style.background = '#cce5ff';
      th.style.fontWeight = '700';
    }
    head.appendChild(th);
  });

  const build = (cats, sel) => {
    const tb = $(sel);
    if (!tb) return;
    // clear old cells
    tb.querySelectorAll('td').forEach(td=>td.remove());
    cats.forEach((c,i)=>{
      const tr = tb.children[i];
      yrs.forEach(y=>{
        const key = `${c.key}_${y}`;
        let v = pay[key];
        if (v == null || v === '') v = '—';
        const td = document.createElement('td');
        td.textContent = c.date ? formatDate(v) :
                          c.money ? formatMoney(v) : v;
        if (y === yrs[0]) td.style.fontWeight = '700';
        tr.appendChild(td);
      });
    });
  };

  build([
    {key:'chapter_dues', money:1},
    {key:'chapter_dues_penalty', money:1},
    {key:'chapter_payment_date', date:1}
  ], 'tbody.group-chapter');

  build([
    {key:'iapoa_dues', money:1},
    {key:'iapoa_dues_penalty', money:1},
    {key:'iapoa_payment_date', date:1}
  ], 'tbody.group-iapoa');
}

/* ── UPDATE‑INFO FORM ── */
function initUpdateForm(){
  const form = $('#updateInfoForm');
  if (!form) return;
  const fb  = $('#updateFeedback');
  const btn = form.querySelector('button[type=submit]');
  const user= JSON.parse(sessionStorage.getItem('userData')||'null');
  if (!user?.ok) return location.href = '/login/';

  // disable browser autofill
  form.setAttribute('autocomplete','off');
  ['currentPassword','password','confirmPassword','username','email','contact','company','position']
    .forEach(id => {
      const inp = form.querySelector('#'+id);
      if (inp) inp.setAttribute('autocomplete','off');
    });

  // strength bar setup
  const pw   = form.password;
  // find dedicated wrapper
  const wrap = pw.closest('.password-wrapper');
  wrap.style.position = 'relative';

  // pad input so text doesn't underlay eye
  pw.classList.add('pe-5');

  // inject eye in wrapper
const eye = document.createElement('button');
eye.type = 'button';
eye.className = [
  'btn', 'btn-sm',
  'border-0', 'bg-transparent',
  'position-absolute', 'end-0', 'top-50', 'translate-middle-y',
  'me-2'
].join(' ');
  eye.setAttribute('aria-label','Show/hide password');
  eye.innerHTML = '<i class="fa-solid fa-eye"></i>';
  wrap.appendChild(eye);
  eye.addEventListener('click', ()=>{
    const hidden = pw.type === 'password';
    pw.type = hidden ? 'text' : 'password';
    eye.querySelector('i').className = 'fa-solid ' +
      (hidden ? 'fa-eye-slash' : 'fa-eye');
    eye.setAttribute('aria-pressed', String(hidden));
  });

  // create strength UI _after_ wrapper
  const msg = document.createElement('div');
  msg.className = 'form-text text-muted small';
  const barWrap = document.createElement('div');
  barWrap.className = 'progress mt-1';
  barWrap.innerHTML = '<div class="progress-bar" role="progressbar" style="width:0%"></div>';
  wrap.parentElement.append(msg, barWrap);

  const rules = [
    {re:/.{8,}/,          t:'8 chars'},
    {re:/[a-z]/,          t:'lowercase'},
    {re:/[A-Z]/,          t:'uppercase'},
    {re:/\d/,             t:'number'},
    {re:/[^a-zA-Z0-9]/,   t:'symbol'}
  ];
  const missing = s => rules.filter(r=>!r.re.test(s)).map(r=>r.t);

  pw.addEventListener('input', ()=>{
    const miss = missing(pw.value);
    msg.textContent = miss.length ? 'Needs: ' + miss.join(', ') : '';
    const pct = ((rules.length - miss.length)/rules.length) * 100;
    const bar = barWrap.querySelector('.progress-bar');
    bar.style.width = pct + '%';
    bar.className = 'progress-bar bg-' +
      (pct>=80 ? 'success' :
       pct>=60 ? 'info' :
       pct>=40 ? 'warning' :
       'danger');
  });

  // submit handler...
  const limitKey = 'updateLimit-' + user.row;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    fb.textContent = '';
    btn.disabled = true;

    const today = new Date().toISOString().split('T')[0];
    if (localStorage.getItem(limitKey) === today) {
      fb.textContent = 'One update per day only.';
      btn.disabled = false;
      return;
    }
    if (pw.value && missing(pw.value).length) {
      fb.textContent = 'Password is not strong enough.';
      btn.disabled = false;
      return;
    }
    if (pw.value && pw.value !== form.confirmPassword.value) {
      fb.textContent = 'Passwords do not match.';
      btn.disabled = false;
      return;
    }

    const sb = window.sb;
    const { data: verify } = await sb.from('xxsr_001')
      .select('password')
      .eq('row_id', Number(user.row))
      .maybeSingle();
    if (!verify || form.currentPassword.value.trim() !== verify.password) {
      fb.textContent = 'Incorrect current password.';
      btn.disabled = false;
      return;
    }

    const payload = {
      username: form.username.value.trim().toLowerCase(),
      password: pw.value.trim(),
      email: form.email.value.trim(),
      contact_no: form.contact.value.trim(),
      company: form.company.value.trim(),
      position: form.position.value.trim()
    };
    Object.keys(payload).forEach(k => { if (!payload[k]) delete payload[k]; });
    if (!Object.keys(payload).length) {
      fb.textContent = 'Nothing to update.';
      btn.disabled = false;
      return;
    }

    const { data: updated, error } = await sb.from('xxsr_001')
                                           .update(payload)
                                           .eq('row_id', Number(user.row))
                                           .select();
    if (error) {
      console.error(error);
      fb.textContent = 'Update failed. Try again later.';
      btn.disabled = false;
      return;
    }

    localStorage.setItem(limitKey, today);
    alert('Update successful. You will now be logged out for security reasons.');
    sessionStorage.removeItem('userData');
    location.href = '/login/';
  });
}

/* show back‑to‑top button */
document.addEventListener('scroll', () => {
  const btn = $('#btnTop');
  if (!btn) return;
  btn.classList.toggle('d-none', window.scrollY < 200);
});

// smooth scroll
document.documentElement.style.scrollBehavior = 'smooth';

/* ── DOM‑READY ── */
document.addEventListener('DOMContentLoaded', ()=>{
  if ($('#loginForm')) initLogin();
  if (document.querySelector('.account-info')) initAccount();

  // logout & save
  const logout = ()=>{ sessionStorage.removeItem('userData'); location.href = '/'; };
  ['btnLogoutFooter','btnLogoutNav'].forEach(id => {
    const el = $('#'+id);
    if (el) el.addEventListener('click', logout);
  });
  const snap = ()=> window.print();
  ['btnSaveScreenshot','btnSaveScreenshotNav'].forEach(id => {
    const el = $('#'+id);
    if (el) el.addEventListener('click', snap);
  });

  // disable dev shortcuts on account
  if (document.querySelector('.account-info')) {
    window.addEventListener('keydown', e=>{
      const blocked = e.key === 'F12'
        || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key.toUpperCase()))
        || (e.ctrlKey && ['U','S','P'].includes(e.key.toUpperCase()));
      if (blocked) {
        e.preventDefault();
      }
    });
  }

  // init Update Info when collapse shown
  const upd = document.getElementById('updateWrapper');
  if (upd) {
    upd.addEventListener('shown.bs.collapse', initUpdateForm);
  }
});

/* ── AOS init ── */
document.addEventListener('DOMContentLoaded', () => {
  if (window.AOS) AOS.init({ duration: 800, once: true });
});

// url obscure
document.addEventListener('DOMContentLoaded', () => {
  const targets = ['/account/','/another‑page/',];
  const path    = window.location.pathname;
  if (!targets.includes(path)) return;

  const alpha = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += alpha.charAt(Math.floor(Math.random() * alpha.length));
  }
  history.replaceState(null, '', '/#uapMCC_' + token);
});





