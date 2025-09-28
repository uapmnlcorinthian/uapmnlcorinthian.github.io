// member_viewer.js — robust load; delayed boot behind a button; rebinds after repaint
(async () => {
  "use strict";

  const sb = await (window.__ensureSB ? window.__ensureSB() : null);
  if (!sb) { console.error("Supabase not ready"); return; }

  const TABLE = "xxsr_001", KEY = "row_id";
  const $ = s => document.querySelector(s), $$ = s => document.querySelectorAll(s);

  let yrs = [], _cur = { id: null, data: null }, _bound = false, _booted = false;

  // expose current selection for editor + boot handle
  window.__mbv_getCurrent = () => _cur?.data || null;
  window.__mbv_getId      = () => _cur?.id || window.__mbv_curId || null;// expose helpers so the button can kick things
  window.__mbv_search    = (q='') => search(q);
  window.__mbv_forceInit = forceInit;

  // ---------- session helper (silent sign-in from stored creds) ----------
  async function ensureSession() {
    try {
      const g = await sb.auth.getSession();
      if (g?.data?.session) return true;
    } catch (_) {}
    let u = null;
    try {
      u = JSON.parse(sessionStorage.getItem("userData") || "null")
        || JSON.parse(localStorage.getItem("userData") || "null");
    } catch (_) {}
    if (u && u.em && u.pw) {
      try {
        const r = await sb.auth.signInWithPassword({ email: u.em, password: u.pw });
        return !r.error;
      } catch (_) { return false; }
    }
    return false;
  }
  await ensureSession();

  // re-search after auth change
  sb.auth.onAuthStateChange((_evt, sess) => {
    if (!_booted) return; // only after we boot the tools
    const q = $("#mbv_q")?.value || "";
    setTimeout(() => { try { search(q); } catch (e) { console.error("post-auth search", e); } }, sess ? 50 : 0);
  });

  // ---------- utils ----------
  const mask  = s => !s ? "*no data*" : String(s).replace(/.(?=.{4})/g, "•");
  const mailM = e => {
    if (!e) return "*no data*";
    let [p, h] = String(e).split("@");
    if (!h) return mask(e);
    let L = Math.max(1, p.length - 2);
    let u = p.length <= 2 ? p.charAt(0) + "•" : p.charAt(0) + Array(L + 1).join("•") + p.charAt(p.length - 1);
    return u + "@" + h;
  };
  const zeroish = v => { if (v == null) return true; let t = String(v).trim(); return t === "" || /^0+(\.0+)?$/.test(t); };
  const fmtMoney = v => { if (zeroish(v)) return "—"; let n = Number(v); return isFinite(n) ? "₱" + n.toLocaleString() : "—"; };
  const fmtDate = v => { if (!v || v === "—") return "—"; let d = new Date(v); return isNaN(d) ? "—" : d.toLocaleDateString(void 0, { year: "numeric", month: "short", day: "2-digit" }); };
  const setCard = (id, val) => { let el = document.getElementById(id); if (el) el.textContent = (val != null && val !== "") ? String(val) : "*no data*"; };
  const dispPhone = db => db ? ('0' + String(db).replace(/^0+/, '')) : '';
  const dateInputVal = v => {
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;             // already yyyy-MM-dd
    const d = new Date(v); if (isNaN(d)) return "";
    const pad = n => String(n).padStart(2, "0");
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  };

  // ---------- name parsing (rules you approved) ----------
  function splitFullName(full) {
    full = (full || "").trim().replace(/\s+/g, " ");
    if (!full) return { s: "", g: "", m: "" };
    let s = "", g = "", m = "";
    if (full.includes(",")) {
      s = (full.split(",")[0] || "").trim();
      const rest = (full.split(",").slice(1).join(",") || "").trim();
      ({ g, m } = splitGivenMiddle(rest));
    } else {
      const toks = full.split(" ");
      s = toks.shift() || "";
      ({ g, m } = splitGivenMiddle(toks.join(" ")));
    }
    return { s, g, m };
  }
  function splitGivenMiddle(rest) {
    rest = (rest || "").trim();
    if (!rest) return { g: "", m: "" };
    let toks = rest.split(/\s+/), suffix = "";
    const sufRx = /^(jr|sr|ii|iii|iv)\.?$/i;
    if (toks.length > 1 && sufRx.test(toks[toks.length - 1])) {
      suffix = toks.pop().replace(/\.$/, "");
    }
    let midIdx = -1;
    for (let i = 0; i < toks.length; i++) {
      if (/^[A-Za-z]{1,2}\.$/.test(toks[i])) { midIdx = i; break; }
    }
    let g = "", m = "";
    if (midIdx >= 0) {
      m = toks[midIdx].replace(/\./g, "");
      toks.splice(midIdx, 1);
      g = toks.join(" ").trim();
    } else {
      if (toks.length >= 2) { m = toks.pop(); g = toks.join(" ").trim(); }
      else { g = toks.join(" ").trim(); m = ""; }
    }
    if (suffix) g = (g ? g + " " : "") + suffix.toUpperCase();
    return { g, m };
  }

  // ---------- DB row -> UI object (with split fallbacks) ----------
  function rowToU(d) {
    let pay = {}; Object.keys(d || {}).forEach(k => { if (/_(\d{4})$/.test(k)) pay[k] = d[k]; });
    const sn = d.name_surname || "", gn = d.name_given || "", mn = d.name_middle || "";
    let sn2 = sn, gn2 = gn, mn2 = mn;
    if (!sn2 || !gn2) {
      const sp = splitFullName(d.name || "");
      sn2 = sn2 || sp.s; gn2 = gn2 || sp.g; mn2 = mn2 || sp.m;
    }
    return {
      ok: 1, act: d.status || "Active", due: d.total_due || 0,
      pi: {
        n: d.name || "", bt: d.batch || "", co: d.company || "", po: d.position || "",
        prc: d.prc_license || "", e: d.email || "", c: d.contact_no || "",
        addr: d.address || "", bday: (d.birthday || ""),
        sn: sn2, gn: gn2, mn: mn2
      },
      pay
    };
  }

  // ---------- painters ----------
  function paintPay(pay) {
    let ys = {}; Object.keys(pay || {}).forEach(k => { let m = k.match(/_(\d{4})$/); if (m) ys[m[1]] = 1; });
    yrs = Object.keys(ys).sort((a, b) => b - a);
    const head = $("#paymentsTable thead tr");
    if (head) {
      while (head.children.length > 1) head.removeChild(head.lastChild);
      yrs.forEach((y, i) => {
        let th = document.createElement("th"); th.textContent = y;
        if (i === 0) { th.style.background = "#cce5ff"; th.style.fontWeight = "700"; }
        head.appendChild(th);
      });
    }
  }
  function grp(cats, sel, pay) {
    let tb = $(sel); if (!tb) return;
    tb.querySelectorAll("td").forEach(td => td.remove());
    cats.forEach((c, ri) => {
      let tr = tb.children[ri];
      yrs.forEach((y, i) => {
        let k = c.key + "_" + y, v = pay[k]; if (v == null || v === '') v = '—';
        let td = document.createElement("td");
        td.textContent = c.date ? fmtDate(v) : (c.money ? fmtMoney(v) : v);
        if (i === 0) td.style.fontWeight = "700";
        tr.appendChild(td);
      });
    });
  }
  function toggles() {
    $$('.toggle-sensitive-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        let s = btn.parentElement ? btn.parentElement.querySelector('.sensitive-text') : null; if (!s) return;
        let sh = s.getAttribute('data-shown') !== '1', real = s.getAttribute('data-real') || '*no data*';
        let masked = s.id === 'email' ? mailM(real) : mask(real);
        s.textContent = sh ? real : masked; s.setAttribute('data-shown', sh ? '1' : '0');
        let i = btn.querySelector('i'); if (i) i.className = sh ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
      });
    });
  }

  function itemHTML(d) {
    let n = d.name || '(no name)', p = d.prc_license || '—', b = d.batch ? (' • Batch ' + d.batch) : '',
      s = (String(d.status || 'Active').toLowerCase().startsWith('a') ? '<span class="badge bg-success ms-2">A</span>' : '<span class="badge bg-danger ms-2">I</span>');
    return `<button type="button" class="list-group-item list-group-item-action d-flex justify-content-between align-items-center" data-id="${d[KEY]}"><span><strong>${n}</strong> <small class="text-muted">PRC: ${p}${b}</small></span>${s}</button>`;
  }

  // ---------- render ----------
  function render(u) {
    _cur.data = u;
    const pi = u.pi || {}, act = String(u.act || '').toLowerCase().startsWith('a');
    setCard('cardName', pi.n || '*no data*'); setCard('cardBatch', pi.bt || '*no data*');
    setCard('cardCompany', pi.co || '*no data*'); setCard('cardPosition', pi.po || '*no data*');
    setCard('prcLicense', pi.prc || '*no data*'); setCard('email', pi.e || '*no data*'); setCard('contactNo', dispPhone(pi.c || ''));
    const b = $("#statusBadge"); if (b) { b.textContent = act ? 'Active' : 'Inactive'; b.className = 'badge ' + (act ? 'bg-success' : 'bg-danger'); }

    // reflect raw into data-real for toggles
    const map = { prcLicense: 'prc', email: 'e', contactNo: 'c', cardCompany: 'co', cardPosition: 'po' };
    for (let id in map) {
      let el = document.getElementById(id); if (!el) continue;
      let real = (id === 'contactNo') ? dispPhone(pi[map[id]] || '') : (pi[map[id]] || '');
      el.textContent = real; el.setAttribute('data-real', real); el.setAttribute('data-shown', '1');
    }

    $('#totalDue').textContent = u.due ? ('₱' + Number(u.due).toLocaleString()) : '₱0';
    paintPay(u.pay || {});
    grp([{ key: 'chapter_dues', money: 1 }, { key: 'chapter_dues_penalty', money: 1 }, { key: 'chapter_payment_date', date: 1 }], 'tbody.group-chapter', u.pay || {});
    grp([{ key: 'iapoa_dues', money: 1 }, { key: 'iapoa_dues_penalty', money: 1 }, { key: 'iapoa_payment_date', date: 1 }], 'tbody.group-iapoa', u.pay || {});
    toggles();

    // fill Admin Edit Panel
    try {
      const g = id => document.getElementById(id), get = v => (v == null ? '' : String(v));
      g('upd2Name')     && (g('upd2Name').value     = get(pi.n));
      g('upd2PRC')      && (g('upd2PRC').value      = get(pi.prc));
      g('upd2Batch')    && (g('upd2Batch').value    = get(pi.bt));
      g('upd2Company')  && (g('upd2Company').value  = get(pi.co));
      g('upd2Position') && (g('upd2Position').value = get(pi.po));
      g('upd2Contact')  && (g('upd2Contact').value  = dispPhone(pi.c || ""));
      g('upd2Email')    && (g('upd2Email').value    = get(pi.e));
      g('upd2Address')  && (g('upd2Address').value  = get(pi.addr || ''));
      g('upd2Birthday') && (g('upd2Birthday').value = dateInputVal(pi.bday || ""));
      // split parts
      g('upd2Surname')  && (g('upd2Surname').value  = get(pi.sn));
      g('upd2Given')    && (g('upd2Given').value    = get(pi.gn));
      g('upd2Middle')   && (g('upd2Middle').value   = get(pi.mn));
      if (window.__mbv_curId) { const el = document.getElementById('mbv_selid'); if (el) el.textContent = String(window.__mbv_curId); }
    } catch (_) {}
  }

  // ---------- search ----------
  async function search(q) {
    const L = $("#mbv_list"); if (!L) return;
    L.innerHTML = '<div class="list-group-item text-muted">Loading…</div>';
    try {
      let isNum = /^\D*?(\d{6,})\D*$/.test(q);
      let s = sb.from(TABLE).select('*').limit(25).order('name', { ascending: true });
      if (q && q.trim().length) { if (isNum) { let prc = q.replace(/\D/g, ''); s = s.ilike('prc_license', '%' + prc + '%'); } else { s = s.ilike('name', '%' + q + '%'); } }
      const r = await s; if (r.error) throw r.error;

      L.innerHTML = '';
      if (r.data && r.data.length) {
        r.data.forEach(d => L.insertAdjacentHTML('beforeend', itemHTML(d)));
        const first = L.querySelector('[data-id]');
        if (first) {
          const id = Number(first.getAttribute('data-id'));
          const one = await sb.from(TABLE).select('*').eq(KEY, id).maybeSingle();
          if (one && one.data) {
            const u = rowToU(one.data); render(u); window.__mbv_curId = id; _cur.id = id;
            L.querySelectorAll('[data-id]').forEach(x => x.classList.remove('active')); first.classList.add('active');
          }
        }
      } else {
        L.innerHTML = '<div class="list-group-item">No results</div>';
      }
    } catch (err) {
      console.error('SELECT error:', err);
      L.innerHTML = '<div class="list-group-item text-danger">Cannot load members (RLS/auth). Ensure Supabase session.</div>';
    }
  }

  // ---------- bind search listeners idempotently ----------
  function bindSearchOnce() {
    if (_bound) return;
    const q = $("#mbv_q"), c = $("#mbv_clr");
    if (!q) return; // wait until visible
    let T;
    const handler = () => { clearTimeout(T); T = setTimeout(() => search(q.value || ''), 160); };
    ['input', 'keyup', 'change'].forEach(ev => q.addEventListener(ev, handler));
    c && c.addEventListener('click', () => { q.value = ''; search(''); });
    _bound = true;
  }

  // selection click
  function bindListClicksOnce() {
    const list = $("#mbv_list"); if (!list || list.dataset.clickBound === '1') return;
    list.dataset.clickBound = '1';
    list.addEventListener('click', async e => {
      const el = e.target.closest('[data-id]'); if (!el) return;
      const id = Number(el.getAttribute('data-id'));
      try {
        const one = await sb.from(TABLE).select('*').eq(KEY, id).maybeSingle();
        if (one && one.data) {
          const u = rowToU(one.data); render(u); window.__mbv_curId = id; _cur.id = id;
          $$('#mbv_list [data-id]').forEach(x => x.classList.remove('active')); el.classList.add('active');
        }
      } catch (ex) { console.error('row fetch error:', ex); }
    });
  }

  // watch for account.js repaint and rebind search if it disappears
  const mo = new MutationObserver(() => {
    if (!_booted) return;
    // Re-bind search if needed
    if (!document.getElementById('mbv_q')) { _bound = false; return; } // removed; allow rebind on next tick
    if (!_bound) bindSearchOnce();
    // Re-render selection if card text got replaced
    if (!_cur.id || !_cur.data) return;
    const nameNow = $("#cardName")?.textContent?.trim() || '';
    const nameSel = _cur.data?.pi?.n || '';
    if (nameSel && nameNow && nameNow !== nameSel) { render(_cur.data); }
  });
  mo.observe(document.body, { subtree: true, childList: true, characterData: true });

  // soft refresh for editor
  window.__mbv_refresh = async function (id) {
    if (!id) return;
    try {
      const one = await sb.from(TABLE).select('*').eq(KEY, id).maybeSingle();
      if (one && one.data) {
        const u = rowToU(one.data); render(u); _cur = { id, data: u };
        const btn = document.querySelector(`#mbv_list [data-id="${id}"]`);
        if (btn) {
          const d = one.data, n = d.name || '(no name)', p = d.prc_license || '—', b = d.batch ? (' • Batch ' + d.batch) : '';
          const s = (String(d.status || 'Active').toLowerCase().startsWith('a') ? '<span class="badge bg-success ms-2">A</span>' : '<span class="badge bg-danger ms-2">I</span>');
          btn.innerHTML = `<span><strong>${n}</strong> <small class="text-muted">PRC: ${p}${b}</small></span>${s}`;
        }
        const el = document.getElementById('mbv_selid'); if (el) el.textContent = String(id);
      }
    } catch (ex) { console.error('refresh error:', ex); }
  };

  // delayed boot — only when wrap is visible or when forceInit() is called
function maybeBoot(){
  const wrap = document.getElementById('mbv_wrap');   // <- fixed "document"
  if (wrap && wrap.style.display === 'none') return;  // still hidden
  if (_booted) return;
  _booted = true;
  _bound = false;                 // allow rebind
  bindSearchOnce();
  bindListClicksOnce();
  search('');                     // first fill
  setTimeout(() => {
    const q = document.getElementById('mbv_q');
    // kick the debounced handler so user sees results without typing
    if (q) q.dispatchEvent(new Event('input', { bubbles: true }));
  }, 60);
}

function forceInit(){
  _booted = false;                // re-evaluate bindings
  maybeBoot();                    // will bind + run search('')
}

  // If you *don’t* click the button (wrap not hidden), still boot:
  document.addEventListener('DOMContentLoaded', maybeBoot);
})();
