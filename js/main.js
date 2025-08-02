// ─────────────────────────────────────────────────────────────────────────────
//  main.js (refactored)
// ─────────────────────────────────────────────────────────────────────────────

/* === Supabase loader (ESM → UMD fallback) === */
(() => {
  const URL = 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const KEY = '…your key…';
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
})();

/* === Helpers === */
const $   = s => document.querySelector(s);
const $$  = s => Array.from(document.querySelectorAll(s));
const mask      = v => v ? '***' + String(v).slice(-4) : '*no data*';
const mailMask  = e => {
  if (!e) return '*no data*';
  const [u,d] = e.split('@');
  return d ? `${u[0]}***@${d}` : e;
};
const formatDate  = d => {
  const t = new Date(d);
  return isNaN(t) ? '—' : t.toLocaleDateString(undefined, { year:'numeric', month:'short', day:'numeric' });
};
const formatMoney = v => isNaN(+v) ? '—' : '₱' + (+v).toLocaleString();
async function getPaymentColumns(sb, tbl='xxsr_001') {
  const { data } = await sb.from('visible_columns')
    .select('column_name')
    .eq('table_name', tbl)
    .order('column_name');
  return (data||[])
    .map(c => c.column_name)
    .filter(n => /(chapter_|iapoa_).+_\d{4}$/.test(n));
}

/* === initLogin === */
async function initLogin() {
  const f = $('#loginForm');
  if (!f) return;
  const btn    = f.querySelector('button[type=submit]');
  const usr    = f.username;
  const pwd    = f.password;
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
    if (!f.checkValidity()) {
      f.classList.add('was-validated');
      return;
    }
    const token = grecaptcha.getResponse();
    if (!token) {
      alert('Please confirm you are human.');
      return;
    }
    btn.disabled = true;
    const sb = await __ensureSB();
    try {
      // verify captcha
      const { data: capResp, error: capErr } =
        await sb.functions.invoke('verifyCaptcha', { body:{ token } });
      if (capErr || !capResp?.success) {
        alert('CAPTCHA failed. Try again.');
        grecaptcha.reset();
        btn.disabled = false;
        return;
      }
      // fetch user + payments
      const cols  = await getPaymentColumns(sb);
      const fixed = [
        'row_id','username','password','name','prc_license','address',
        'birthday','contact_no','email','membership_active',
        'total_due','batch','company','position'
      ];
      const { data: user, error: authErr } = await sb
        .from('xxsr_001')
        .select([...fixed, ...cols].join(','))
        .eq('username', usr.value.trim().toLowerCase())
        .maybeSingle();
      if (authErr || !user || pwd.value !== user.password) {
        throw new Error('Invalid username or password.');
      }
      // build session
      const pay = Object.fromEntries(cols.map(k => [k, user[k]]));
      delete user.password;
      const sess = {
        ok: 1,
        row: String(user.row_id).toLowerCase(),
        pi: {
          n: user.name, prc: user.prc_license, a: user.address,
          b: user.birthday, c: user.contact_no, e: user.email,
          bt: user.batch||'', co: user.company||'', po: user.position||''
        },
        act: user.membership_active,
        due: user.total_due,
        pay
      };
      sessionStorage.setItem('userData', JSON.stringify(sess));
      setTimeout(() => window.location.replace('/account/'), 100);

    } catch (err) {
      alert(err.message || 'Login failed. Please try again.');
      btn.disabled = false;
    }
  });
}

/* === initAccount === */
function initAccount() {
  let u = JSON.parse(sessionStorage.getItem('userData') || 'null');
  if (!u?.ok) {
    const stored = JSON.parse(localStorage.getItem('userData')||'null');
    if (stored?.ok) {
      u = stored;
      sessionStorage.setItem('userData', JSON.stringify(u));
    }
  }
  if (!u?.ok) {
    location.href = '/membership/';
    return;
  }
  const pi = u.pi;
  $('#cardName').textContent     = pi.n || '*no data*';
  $('#cardBatch').textContent    = pi.bt||'*no data*';
  $('#cardCompany').textContent  = pi.co||'*no data*';
  $('#cardPosition').textContent = pi.po||'*no data*';

  // status badge
  const badge = $('#statusBadge');
  if (badge) {
    const active = String(u.act||'').toLowerCase().startsWith('a');
    badge.textContent = active ? 'Active' : 'Inactive';
    badge.className   = 'badge ' + (active ? 'bg-success' : 'bg-danger');
  }

  // sensitive fields toggle
  ['prcLicense','email','contactNo'].forEach(id => {
    const el = $('#' + id);
    if (!el) return;
    const val = id==='email' ? mailMask(pi.e) : mask(pi[id.slice(0, -2)]);
    el.textContent = val;
    el.dataset.real  = pi[id.slice(0, -2)]||'';
    el.dataset.shown = '0';
  });
  $$('.toggle-sensitive-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const span = btn.parentElement.querySelector('.sensitive-text');
      if (!span) return;
      const show  = span.dataset.shown!=='1';
      const real  = span.dataset.real || '*no data*';
      const masked= span.id==='email' ? mailMask(real) : mask(real);
      span.textContent = show ? real : masked;
      span.dataset.shown = show ? '1':'0';
      btn.querySelector('i').className = show
        ? 'fa-solid fa-eye-slash'
        : 'fa-solid fa-eye';
    });
  });

  // totalDue
  $('#totalDue').textContent = u.due
    ? '₱'+Number(u.due).toLocaleString()
    : '₱0';

  // payments table
  const pay = u.pay||{};
  const yrs = Array.from(new Set(
    Object.keys(pay)
      .map(k=>k.match(/_(\d{4})$/))
      .filter(Boolean)
      .map(m=>m[1])
  )).sort((a,b)=>b-a);

  const headRow = $('#paymentsTable thead tr');
  // clear extra THs
  while (headRow.children.length>1) headRow.removeChild(headRow.lastChild);
  yrs.forEach(y=>{
    const th = document.createElement('th');
    th.textContent = y;
    if (y===yrs[0]) {
      th.style.background   = '#cce5ff';
      th.style.fontWeight   = '700';
    }
    headRow.appendChild(th);
  });

  const buildGroup = (cats, selector) => {
    const tbody = $(selector);
    if (!tbody) return;
    // clear old TDs
    tbody.querySelectorAll('td').forEach(t=>t.remove());
    cats.forEach((cat,i)=>{
      const tr = tbody.children[i];
      yrs.forEach(y=>{
        const key = `${cat.key}_${y}`;
        let v = pay[key];
        if (v==null||v==='') v='—';
        const td = document.createElement('td');
        td.textContent = cat.date
          ? formatDate(v)
          : cat.money
            ? formatMoney(v)
            : v;
        if (y===yrs[0]) td.style.fontWeight='700';
        tr.appendChild(td);
      });
    });
  };

  buildGroup([
    { key:'chapter_dues',           money:1 },
    { key:'chapter_dues_penalty',   money:1 },
    { key:'chapter_payment_date',   date:1 }
  ], 'tbody.group-chapter');

  buildGroup([
    { key:'iapoa_dues',           money:1 },
    { key:'iapoa_dues_penalty',   money:1 },
    { key:'iapoa_payment_date',   date:1 }
  ], 'tbody.group-iapoa');
}

/* === initUpdateForm === */
function initUpdateForm() {
  const f  = $('#updateInfoForm');
  if (!f || f.dataset.init==='1') return;
  f.dataset.init = '1';
  const fb  = $('#updateFeedback');
  const btn = f.querySelector('button[type=submit]');
  let u = JSON.parse(sessionStorage.getItem('userData')||'null');
  if (!u?.ok) {
    const stored = JSON.parse(localStorage.getItem('userData')||'null');
    if (stored?.ok) {
      u = stored;
      sessionStorage.setItem('userData',JSON.stringify(u));
    }
  }
  if (!u?.ok) { location.href='/membership/'; return; }
  const id = Number(u.row);

  // prefill via supabase
  (async ()=>{
    try {
      const sb = await __ensureSB();
      const { data:d } = await sb.from('xxsr_001')
        .select('username,email,contact_no,company,position')
        .eq('row_id', id)
        .maybeSingle();
      if (d) {
        f.username.value = d.username||'';
        f.email.value    = d.email   ||u.pi.e||'';
        f.contact.value  = d.contact_no||u.pi.c||'';
        f.company.value  = d.company ||u.pi.co||'';
        f.position.value = d.position||u.pi.po||'';
      }
    } catch(e){ console.error('prefill error',e); }
  })();

  // turn off browser autocomplete
  ['currentPassword','password','confirmPassword','username','email','contact','company','position']
    .forEach(id=>{
      const el = f.querySelector('#'+id);
      if (el) el.setAttribute('autocomplete','off');
    });

  // password eye + strength meter
  const pw   = f.password;
  const wrap = pw.closest('.password-wrapper');
  if (wrap) {
    wrap.style.position='relative';
    pw.classList.add('pe-5');
    // eye button
    const eye = document.createElement('button');
    Object.assign(eye, {
      type:'button',
      className:'btn btn-sm border-0 bg-transparent position-absolute end-0 top-50 translate-middle-y me-2',
      innerHTML:'<i class="fa-solid fa-eye"></i>',
      onclick:() => {
        const show = pw.type==='password';
        pw.type = show?'text':'password';
        eye.firstChild.className = 'fa-solid '+(show?'fa-eye-slash':'fa-eye');
      }
    });
    wrap.appendChild(eye);
    // strength meter
    const msg     = document.createElement('div');
    msg.className = 'form-text text-muted small';
    const barWrap = document.createElement('div');
    barWrap.className = 'progress mt-1';
    barWrap.innerHTML = '<div class="progress-bar" role="progressbar" style="width:0%"></div>';
    wrap.parentElement.append(msg,barWrap);

    const needRules = [
      '.{8,}', '[a-z]', '[A-Z]', '\\d', '[^A-Za-z0-9]'
    ];
    const checkMissing = s =>
      needRules.filter(r => !new RegExp(r).test(s)).length;
    pw.addEventListener('input', ()=>{
      const s    = pw.value;
      const miss = checkMissing(s);
      const pct  = ((5-miss)/5)*100;
      const bar  = barWrap.querySelector('.progress-bar');
      msg.textContent = miss
        ? 'Needs: ' + needRules
            .map((r,i)=>['8 chars','lowercase','uppercase','number','symbol'][i])
            .filter((_,i)=>!new RegExp(needRules[i]).test(s))
            .join(', ')
        : '';
      bar.style.width = pct+'%';
      bar.className   = 'progress-bar bg-'+(
        pct>=80   ? 'success'
      : pct>=60   ? 'info'
      : pct>=40   ? 'warning'
      :             'danger');
    });
    f.confirmPassword.addEventListener('input', ()=>{
      if (pw.value && f.confirmPassword.value && pw.value!==f.confirmPassword.value) {
        fb.textContent = 'Passwords do not match.';
      } else if (fb.textContent==='Passwords do not match.') {
        fb.textContent = '';
      }
    });
  }

  // daily quota
  const MAX      = 2;
  const limitKey = 'updateLimit-'+u.row;
  const quotaEl  = document.createElement('div');
  quotaEl.id     = 'updateQuotaInfo';
  quotaEl.className = 'col-12 small text-muted mt-0';

  const todayStr = () => new Date()
    .toLocaleDateString('en-CA',{ timeZone:'Asia/Manila' });

  const refreshQuota = () => {
    let lim = JSON.parse(localStorage.getItem(limitKey)||'null')||{date:todayStr(),count:0};
    if (lim.date!==todayStr()) lim = { date:todayStr(), count:0 };
    const remaining = Math.max(0, MAX-lim.count);
    quotaEl.textContent = `Daily limit: ${MAX} updates. Remaining today: ${remaining}.`;
    if (!$('#updateQuotaInfo')) {
      const ref = $('#updateFeedback') || f;
      ref.parentNode.insertBefore(quotaEl, $('#updateFeedback'));
    }
    btn.disabled = remaining===0;
  };
  refreshQuota();

  // handle submit
  f.addEventListener('submit', async e=> {
    e.preventDefault();
    fb.textContent = '';
    btn.disabled   = true;
    try {
      let lim = JSON.parse(localStorage.getItem(limitKey)||'null')||{date:todayStr(),count:0};
      if (lim.date!==todayStr()) lim = { date:todayStr(), count:0 };
      if (lim.count>=MAX) {
        fb.textContent = `You have reached the limit (${MAX} updates today).`;
        refreshQuota();
        btn.disabled = false;
        return;
      }
      const cur = f.currentPassword.value.trim();
      const np  = f.password.value.trim();
      const cp  = f.confirmPassword.value.trim();
      if (np && checkMissing(np)>0) {
        fb.textContent = 'Password is not strong enough.';
        btn.disabled = false;
        return;
      }
      if (np && np!==cp) {
        fb.textContent = 'Passwords do not match.';
        btn.disabled = false;
        return;
      }
      const sb = await __ensureSB();
      const p = {};
      ['username','email','contact','company','position'].forEach(field=>{
        const val = f[field].value.trim();
        if (val) p[field==='contact'?'contact_no':field] = field==='username'
          ? val.toLowerCase()
          : val;
      });
      if (np) p.new_pass = np;
      if (!Object.keys(p).length) {
        fb.textContent = 'Nothing to update.';
        btn.disabled = false;
        return;
      }
      const args = {
        p_row_id: id,
        p_current_pass: cur,
        p_username: p.username||null,
        p_email: p.email||null,
        p_contact_no: p.contact_no||null,
        p_company: p.company||null,
        p_position: p.position||null,
        p_new_pass: p.new_pass||null
      };
      const { data: updated, error: rpcErr } = await sb.rpc('update_member_profile', args);
      if (rpcErr) {
        fb.textContent = rpcErr.message||'Update failed.';
        btn.disabled = false;
        return;
      }
      if (!updated?.length) {
        fb.textContent = 'No changes were applied.';
        btn.disabled = false;
        return;
      }
      // increment and logout
      lim.count++;
      localStorage.setItem(limitKey, JSON.stringify(lim));
      refreshQuota();
      alert('Update successful. You will now be logged out.');
      sessionStorage.removeItem('userData');
      location.href='/membership/';
    } catch(err) {
      console.error(err);
      fb.textContent = 'Unexpected error. Please try again.';
      btn.disabled = false;
    }
  });
}

/* === initMiscUI === */
function initMiscUI() {
  // back-to-top toggle
  const btnTop = $('#btnTop');
  window.addEventListener('scroll', () => {
    if (!btnTop) return;
    btnTop.classList.toggle('d-none', window.scrollY < 200);
    btnTop.style.display = window.scrollY > 300 ? 'inline-flex' : 'none';
  });

  // shared logout / print
  const doLogout = () => {
    sessionStorage.removeItem('userData');
    location.href = '/';
  };
  ['btnLogoutFooter','btnLogoutNav'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', doLogout);
  });
  const doPrint = () => window.print();
  ['btnSaveScreenshot','btnSaveScreenshotNav'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('click', doPrint);
  });

  // collapse-triggered initUpdateForm
  const updWrap = $('#updateWrapper');
  if (updWrap) {
    updWrap.addEventListener('shown.bs.collapse', initUpdateForm);
  }

  // header hide on scroll
  const header = document.querySelector('header');
  if (header) {
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      header.classList.toggle('hide-up', y > lastY + 10);
      lastY = y;
    });
  }
}

/* === initAOS & deep-link === */
function initAOSandDeepLink() {
  if (window.AOS) AOS.init({ duration:800, once:true });
  const targets  = ['/account/','/another-page/'];
  const path     = window.location.pathname;
  if (targets.includes(path)) {
    const alpha = '0jZxeQ~-YL7KgOCWRIP2bJ4stim1h_8adUovMnAGzT3HDwBS6FcXu9ylk5VpNfqrE.';
    const token = Array.from({length:32}, () => alpha.charAt(Math.floor(Math.random()*alpha.length))).join('');
    history.replaceState(null,'', '/#uapMCC_'+token);
  }
}

/* === EVENT CAROUSEL === */
function initEventCarousel() {
  const track = $('#event-scroller-track');
  if (!track) return;
  let paused = false;
  const speed = 1;
  function loop() {
    if (!paused) {
      track.scrollLeft += speed;
      if (track.scrollLeft >= track.scrollWidth - track.clientWidth) {
        track.scrollLeft = 0;
      }
    }
    requestAnimationFrame(loop);
  }
  loop();
  ['mouseenter','focus'].forEach(evt => track.addEventListener(evt, ()=> paused = true));
  ['mouseleave','blur'].forEach(evt => track.addEventListener(evt, ()=> paused = false));

  // reopen modal
  $$('.card', track).forEach((card,i) => {
    card.addEventListener('click', () => {
      const modal = document.getElementById('scrollerModal-'+i);
      bootstrap.Modal.getOrCreateInstance(modal).show();
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  // 1) Core inits
  initLogin();

  // Only guard (“account” page) — skip on the login page
  if (location.pathname.startsWith('/account/')) {
    initAccount();
  }
  initMiscUI();
  initAOSandDeepLink();
  initEventCarousel();

  // 2) AOS init
  if (window.AOS) AOS.init({ once: true, offset: 120 });

  // 3) Wire up Show more toggles
  document.querySelectorAll('.pp-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      // find the nearest card-body
      const cardBody = btn.closest('.card-body');
      // expand/collapse all .pp-text in that card
      cardBody.querySelectorAll('.pp-text').forEach(el => el.classList.toggle('expanded'));
      // flip the button label
      btn.textContent = btn.textContent === 'Show more' ? 'Show less' : 'Show more';
    });
  });
});
