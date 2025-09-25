// File: account.js
// Handles account page & update form (xxsr_001 + row_id; OTP; allow-list; phone normalize; pw strength & cap)

// Scope everything to avoid conflicts ($ already used elsewhere)
(function () {
  // ---------- tiny helpers ----------
  var $  = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return document.querySelectorAll(s); };

  var mask = function (s) { return !s ? '*no data*' : String(s).replace(/.(?=.{4})/g, '•'); };
  var mailMask = function (e) {
    if (!e) return '*no data*';
    var parts = String(e).split('@');
    var u = parts[0], h = parts[1];
    if (!h) return mask(e);
    var midLen = Math.max(1, u.length - 2);
    var u2 = u.length <= 2 ? (u.charAt(0) + '•') : (u.charAt(0) + new Array(midLen + 1).join('•') + u.charAt(u.length - 1));
    return u2 + '@' + h;
  };
  var formatMoney = function (v) { return v ? '₱' + Number(v).toLocaleString() : '—'; };
  var formatDate = function (v) {
    if (!v || v === '—') return '—';
    var d = new Date(v);
    return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };
  var setText = function (el, val) { if (el) el.value = (val != null ? String(val) : ''); };
  var setCard = function (id, val) {
    var el = document.getElementById(id);
    if (el) el.textContent = (val != null && val !== '') ? String(val) : '*no data*';
  };

  // email allow-list
  var ALLOW = { 'gmail.com':1,'yahoo.com':1,'outlook.com':1,'hotmail.com':1,'live.com':1,'icloud.com':1,'proton.me':1,'protonmail.com':1,'yandex.com':1,'aol.com':1 };
  var ALLOW_TXT = 'gmail.com, yahoo.com, outlook.com, hotmail.com, live.com, icloud.com, proton.me, protonmail.com, yandex.com, aol.com';
  var emailOk = function (v) {
    v = (v || '').trim().toLowerCase();
    var h = v.split('@')[1] || '';
    return !!ALLOW[h];
  };

  // PH phone: DB stores 9XXXXXXXXX; UI shows 09XXXXXXXXX
  var normPhone = function (v) {
    v = String(v || '').replace(/\D/g, '');
    if (/^09\d{9}$/.test(v)) return v.slice(1);
    if (/^\+?63\d{10}$/.test(v)) return v.replace(/^\+?63/, '');
    if (/^\d{10}$/.test(v)) return v; // already 10 digits (leading 9 + 9 more)
    return null;
  };
  var dispPhone = function (db) { return db ? ('0' + String(db).replace(/^0+/, '')) : ''; };

  // Password strength: >=8, upper+lower + (digit OR symbol)
  var pwScore = function (s) {
    s = s || '';
    var len = s.length >= 8;
    var lower = /[a-z]/.test(s);
    var upper = /[A-Z]/.test(s);
    var digit = /\d/.test(s);
    var symbol = /[^A-Za-z0-9]/.test(s);
    var rep3 = /(.)\1{2,}/.test(s);

    var score = 0;
    if (len) score += 40;
    if (lower) score += 15;
    if (upper) score += 15;
    if (digit || symbol) score += 25; // either is enough
    if (digit && symbol) score += 5;  // tiny bonus if both
    if (rep3) score -= 10;

    if (score < 0) score = 0;
    if (score > 100) score = 100;
    return score;
  };
  var pwMeetsRule = function (s) {
    s = s || '';
    return s.length >= 8 && /[a-z]/.test(s) && /[A-Z]/.test(s) && (/\d/.test(s) || /[^A-Za-z0-9]/.test(s));
  };

  // Supabase client (provided in HTML)
  var SB_URL = (typeof window !== 'undefined' && window.SUPABASE_URL) ? window.SUPABASE_URL : 'https://fvaahtqjusfniadwvoyw.supabase.co';
  var SB_KEY = (typeof window !== 'undefined') ? window.SUPABASE_ANON_KEY : null;
  var sb = (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function')
    ? window.supabase.createClient(SB_URL, SB_KEY)
    : null;

  // Table / key actually used
  var TABLE  = 'xxsr_001';
  var KEYCOL = 'row_id';

  // OTP endpoints
  var OTP_SEND   = 'https://fvaahtqjusfniadwvoyw.functions.supabase.co/send-otp';
  var OTP_VERIFY = 'https://fvaahtqjusfniadwvoyw.functions.supabase.co/verify-otp';
  var postOTP = function (url, body) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': SB_KEY, 'Authorization': 'Bearer ' + SB_KEY },
      body: JSON.stringify(body || {})
    }).then(function (r) {
      return r.text().then(function (t) {
        if (!r.ok) throw new Error(t || ('HTTP ' + r.status));
        return t;
      });
    });
  };

  // ---------------- Page boot ----------------
  document.addEventListener('DOMContentLoaded', function () {
    // auth snapshot from your login flow
    var u = null;
    try { u = JSON.parse(sessionStorage.getItem('userData') || 'null'); } catch (e) {}
    if (!u || !u.ok) {
      try {
        var stored = JSON.parse(localStorage.getItem('userData') || 'null');
        if (stored && stored.ok) u = stored; else { location.href = '/membership/'; return; }
      } catch (e) { location.href = '/membership/'; return; }
    }

    // ---- Account card (your original) ----
    var initAccount = function () {
      var pi = u.pi || {};
      var b = $('#statusBadge');

      setCard('cardName', pi.n || '*no data*');
      setCard('cardBatch', pi.bt || '*no data*');
      setCard('cardCompany', pi.co || '*no data*');
      setCard('cardPosition', pi.po || '*no data*');
      setCard('prcLicense', pi.prc || '*no data*');
      setCard('email', pi.e || '*no data*');
      setCard('contactNo', dispPhone(pi.c || ''));

      if (b) {
        var active = String(u.act || '').toLowerCase().indexOf('a') === 0;
        b.textContent = active ? 'Active' : 'Inactive';
        b.className = 'badge ' + (active ? 'bg-success' : 'bg-danger');
      }

      var map = { prcLicense: 'prc', email: 'e', contactNo: 'c', cardCompany: 'co', cardPosition: 'po' };
      for (var id in map) {
        if (!map.hasOwnProperty(id)) continue;
        var el = document.getElementById(id);
        if (!el) continue;
        var real = pi[map[id]] || '';
        if (id === 'contactNo') real = dispPhone(real);
        el.textContent = real;
        el.setAttribute('data-real', real);
        el.setAttribute('data-shown', '1');
      }

      var toggles = $$('.toggle-sensitive-btn');
      for (var i = 0; i < toggles.length; i++) {
        (function (btn) {
          btn.addEventListener('click', function () {
            var span = btn.parentElement ? btn.parentElement.querySelector('.sensitive-text') : null;
            if (!span) return;
            var shown = span.getAttribute('data-shown') !== '1';
            var real  = span.getAttribute('data-real') || '*no data*';
            var masked = span.id === 'email' ? mailMask(real) : mask(real);
            span.textContent = shown ? real : masked;
            span.setAttribute('data-shown', shown ? '1' : '0');
            var ico = btn.querySelector('i');
            if (ico) ico.className = shown ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
          });
        })(toggles[i]);
      }

      var totalDue = $('#totalDue');
      if (totalDue) totalDue.textContent = u.due ? ('₱' + Number(u.due).toLocaleString()) : '₱0';

      var pay = u.pay || {};
      var keys = Object.keys(pay);
      var yearSet = {};
      for (var k = 0; k < keys.length; k++) {
        var m = keys[k].match(/_(\d{4})$/);
        if (m && m[1]) yearSet[m[1]] = 1;
      }
      var yrs = Object.keys(yearSet).sort(function (a, b) { return b - a; });

      var headRow = $('#paymentsTable thead tr');
      if (headRow) {
        while (headRow.children.length > 1) headRow.removeChild(headRow.lastChild);
        for (var y = 0; y < yrs.length; y++) {
          var th = document.createElement('th');
          th.textContent = yrs[y];
          if (yrs[y] === yrs[0]) { th.style.background = '#cce5ff'; th.style.fontWeight = '700'; }
          headRow.appendChild(th);
        }
      }

      var buildGroup = function (cats, selector) {
        var tbody = $(selector);
        if (!tbody) return;
        var toRemove = tbody.querySelectorAll('td');
        for (var r = 0; r < toRemove.length; r++) toRemove[r].remove();
        for (var c = 0; c < cats.length; c++) {
          var tr = tbody.children[c];
          for (var yy = 0; yy < yrs.length; yy++) {
            var key = cats[c].key + '_' + yrs[yy];
            var v = pay[key];
            if (v == null || v === '') v = '—';
            var td = document.createElement('td');
            td.textContent = cats[c].date ? formatDate(v) : (cats[c].money ? formatMoney(v) : v);
            if (yrs[yy] === yrs[0]) td.style.fontWeight = '700';
            tr.appendChild(td);
          }
        }
      };

      buildGroup(
        [{ key: 'chapter_dues', money: 1 }, { key: 'chapter_dues_penalty', money: 1 }, { key: 'chapter_payment_date', date: 1 }],
        'tbody.group-chapter'
      );
      buildGroup(
        [{ key: 'iapoa_dues', money: 1 }, { key: 'iapoa_dues_penalty', money: 1 }, { key: 'iapoa_payment_date', date: 1 }],
        'tbody.group-iapoa'
      );
    };

    initAccount();

    // Wire update form on open (and now if already visible)
    var updWrap = $('#updateWrapper');
    if (updWrap) {
      updWrap.addEventListener('shown.bs.collapse', initUpdateForm);
      if (updWrap.classList.contains('show')) initUpdateForm();
    }

    // ---- Update form ----
    function initUpdateForm() {
      var f = $('#updateInfoForm');
      if (!f || f.getAttribute('data-init') === '1') return;
      f.setAttribute('data-init', '1');

      var fb  = $('#updateFeedback');
      var box = $('#updateAlert');

      var nm = $('#updName'), pr = $('#updPRC'), co = $('#updCompany'), po = $('#updPosition'), cn = $('#updContact'), em = $('#updEmail');
      var cur = $('#pwdCurrent'); // current password (if changing)
      var p1 = $('#pwd1'),   p2 = $('#pwd2'),   bar = $('#pwdBar'),     tips = $('#pwdTips'),     cap = $('#pwdCap');
      var otpBtn = $('#btnSendOTP'), otpIn = $('#otpCode'), otpGo = $('#btnVerifyOTP'), otpSt = $('#otpStatus');

      var okMsg = function (m) {
        if (box) box.classList.add('d-none');
        if (fb) { fb.textContent = m; fb.className = 'text-success small'; }
      };
      var errMsg = function (m) {
        if (fb) { fb.textContent = ''; fb.className = 'small'; }
        if (box) { box.textContent = m; box.classList.remove('d-none'); }
      };

      // session again (fresh)
      var u0 = null;
      try { u0 = JSON.parse(sessionStorage.getItem('userData') || 'null') || {}; } catch (e) { u0 = {}; }
      if (!u0 || !u0.ok) { try { u0 = JSON.parse(localStorage.getItem('userData') || 'null') || {}; } catch (e) { u0 = {}; } }
      var pi = u0.pi || {};
      var rowId = (u0 && (u0.row != null)) ? String(u0.row) : null; // key value for row_id

      // prefill from snapshot
      (function fillFromSnapshot() {
        setText(nm, pi.n || '');
        if (pr) {
          pr.value = (pi.prc != null ? pi.prc : '');
          pr.readOnly = true; pr.disabled = true; pr.setAttribute('aria-disabled', 'true');
        }
        setText(co, pi.co || '');
        setText(po, pi.po || '');
        setText(cn, pi.c != null ? dispPhone(pi.c) : '');
        setText(em, pi.e || '');
      })();

      // refresh from DB (xxsr_001 via row_id)
      (function refreshFromDBOnce(){
        if (!sb || !rowId) return;
        sb.from(TABLE)
          .select('name,prc_license,company,position,contact_no,email')
          .eq(KEYCOL, rowId)
          .maybeSingle()
          .then(function (r) {
            if (!r || !r.data) return;
            var d = r.data;

            setText(nm, d.name != null ? d.name : (pi.n || ''));
            if (pr) pr.value = (d.prc_license != null ? d.prc_license : (pi.prc || ''));
            setText(co, d.company != null ? d.company : (pi.co || ''));
            setText(po, d.position != null ? d.position : (pi.po || ''));
            setText(cn, d.contact_no != null ? dispPhone(d.contact_no) : (pi.c != null ? dispPhone(pi.c) : ''));
            setText(em, d.email != null ? d.email : (pi.e || ''));

            // reflect on card
            setCard('cardCompany',  d.company != null ? d.company : (pi.co || '*no data*'));
            setCard('cardPosition', d.position != null ? d.position : (pi.po || '*no data*'));
            setCard('contactNo',    d.contact_no != null ? dispPhone(d.contact_no) : (pi.c != null ? dispPhone(pi.c) : '*no data*'));
            setCard('email',        d.email != null ? d.email : (pi.e || '*no data*'));
            setCard('prcLicense',   d.prc_license != null ? d.prc_license : (pi.prc || '*no data*'));

            // sync session
            try {
              var np = (u0 && u0.pi) ? u0.pi : {};
              if (d.name        != null) np.n   = d.name;
              if (d.prc_license != null) np.prc = d.prc_license;
              if (d.company     != null) np.co  = d.company;
              if (d.position    != null) np.po  = d.position;
              if (d.contact_no  != null) np.c   = d.contact_no;
              if (d.email       != null) np.e   = d.email;
              u0.pi = np;
              sessionStorage.setItem('userData', JSON.stringify(u0));
            } catch (e) {}
          })
          .catch(function(){});
      })();

      // strength bar
      var paint = function (v) {
        var p = pwScore(v || '');
        if (bar) {
          bar.style.width = p + '%';
          bar.className = 'progress-bar' + (p >= 80 ? ' bg-success' : (p >= 60 ? ' bg-warning' : ' bg-danger'));
        }
        if (tips) tips.textContent = 'Min 8 chars; include UPPER + lower + (number OR symbol).';
      };
      if (p1) {
        var evs = ['input','keyup','change','paste'];
        for (var i = 0; i < evs.length; i++) p1.addEventListener(evs[i], function(){ paint(p1.value); });
        paint(p1.value || '');
      }

      // daily cap
      var dayKey = 'pwdCap_' + new Date().toISOString().slice(0, 10);
      var MAX = 10; // allowed password changes/day
      var cnt = 0;
      try { cnt = +JSON.parse(localStorage.getItem(dayKey) || '0') || 0; } catch (e) {}
      if (cap) cap.textContent = 'Password changes today: ' + cnt + '/' + MAX;

      // validity handlers
      var otpVerified = false;

      if (em) em.addEventListener('input', function () {
        var ok = emailOk(em.value);
        if (typeof em.setCustomValidity === 'function') em.setCustomValidity(ok ? '' : 'Allowed domains: ' + ALLOW_TXT);
        if (otpSt) { otpSt.textContent = ''; otpSt.className = 'small'; }
        otpVerified = false;
      });

      if (cn) cn.addEventListener('blur', function () {
        var dbv = normPhone(cn.value);
        if (typeof cn.setCustomValidity === 'function') {
          if (cn.value && dbv === null) cn.setCustomValidity('Enter PH mobile as 09XXXXXXXXX or +639XXXXXXXXX');
          else cn.setCustomValidity('');
        }
      });

      // OTP flow (required)
      var setOtp = function (t, cls) {
        if (otpSt) { otpSt.textContent = t; otpSt.className = 'small ' + (cls || ''); }
      };

      if (otpBtn) otpBtn.addEventListener('click', function () {
        var to = (em && em.value ? em.value : '').trim().toLowerCase();
        if (!to) { setOtp('Enter email first', 'text-danger'); return; }
        if (!emailOk(to)) { setOtp('Only these domains are allowed: ' + ALLOW_TXT, 'text-danger'); return; }
        otpBtn.disabled = true; var t = otpBtn.textContent; otpBtn.textContent = 'Sending...';
        postOTP(OTP_SEND, { email: to })
          .then(function(){ setOtp('OTP sent to email', 'text-success'); otpVerified = false; })
          .catch(function(){ setOtp('Failed to send OTP', 'text-danger'); })
          .finally(function(){ otpBtn.disabled = false; otpBtn.textContent = t; });
      });

      if (otpGo) otpGo.addEventListener('click', function () {
        var to   = (em && em.value ? em.value : '').trim().toLowerCase();
        var code = (otpIn && otpIn.value ? otpIn.value : '').trim();
        if (!/^\d{6}$/.test(code)) { setOtp('Enter 6-digit OTP', 'text-danger'); return; }
        otpGo.disabled = true; var t = otpGo.textContent; otpGo.textContent = 'Verifying...';
        postOTP(OTP_VERIFY, { email: to, otp: code })
          .then(function (v) {
            otpVerified = (String(v).trim() === 'Verified');
            setOtp(otpVerified ? 'Email verified' : 'Incorrect or expired', otpVerified ? 'text-success' : 'text-danger');
          })
          .catch(function(){ otpVerified = false; setOtp('Network/verify error', 'text-danger'); })
          .finally(function(){ otpGo.disabled = false; otpGo.textContent = t; });
      });

      if (em) em.addEventListener('input', function(){ otpVerified = false; setOtp('', ''); });

      // submit
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!sb) { errMsg('Supabase not available.'); return; }
        if (!rowId) { errMsg('Missing member key.'); return; }
        if (!otpVerified) { errMsg('Please verify the OTP sent to your email.'); return; }

        // password checks (only if provided)
        var A = p1 ? (p1.value || '') : '';
        var B = p2 ? (p2.value || '') : '';
        var C = cur ? (cur.value || '') : ''; // current password
        if (A || B) {
          if (cnt >= MAX) { var remCap = 0; errMsg('Max ' + MAX + ' per day (' + remCap + ' remaining).'); return; }
          if (A !== B) { errMsg('Passwords do not match.'); return; }
          if (!pwMeetsRule(A)) { errMsg('Password too weak. Use 8+ chars, UPPER + lower + (number OR symbol).'); return; }
          if (!C) { errMsg('Enter your current password to change it.'); return; }
        }

        // ALWAYS read current form values
        var newCompany  = co ? String(co.value || '').trim() : '';
        var newPosition = po ? String(po.value || '').trim() : '';
        var newEmail    = (em && em.value ? em.value : '').trim().toLowerCase();

        // email allow-list
        if (!emailOk(newEmail)) { errMsg('Please use an allowed email domain: ' + ALLOW_TXT); return; }

        // phone normalize: only send if user typed something
        var cIn  = (cn && cn.value ? String(cn.value).trim() : '');
        var cDb  = cIn ? normPhone(cIn) : null;
        if (cIn && cDb === null) { errMsg('Invalid contact number format.'); return; }

        // Build payload: ALWAYS include company/position/email; include contact_no only if provided
        var d = { company: newCompany, position: newPosition, email: newEmail };
        if (cIn) d.contact_no = cDb;

        // If changing password, verify current first using RPC verify_password and row's password_hash
        var verifyCurrentPassword = function() { return Promise.resolve(true); };
        if (A) {
          verifyCurrentPassword = function() {
            return sb.from('xxsr_001').select('password_hash').eq('row_id', rowId).maybeSingle()
              .then(function (sel) {
                if (!sel || !sel.data || !sel.data.password_hash) throw new Error('no-hash');
                return sb.rpc('verify_password', { plain: C, hash: sel.data.password_hash });
              })
              .then(function (rv) {
                var ok = (rv && rv.data === true) || rv === true;
                if (!ok) throw new Error('bad-current');
                return true;
              });
          };
        }

        verifyCurrentPassword()
          .then(function () {
            // include password to trigger your hashing trigger
            if (A) d.password = A;

            // If everything is empty (shouldn't happen since company/position/email are always sent), guard anyway
            if (!Object.keys(d).length) { errMsg('No changes to save.'); return Promise.resolve(null); }

            return sb.from(TABLE)
              .update(d)
              .eq(KEYCOL, rowId)
              .select('company,position,email,contact_no')
              .maybeSingle();
          })
          .then(function (up) {
            if (!up) return; // early return already handled
            if (up && up.error) throw up.error;

            var res = (up && up.data) ? up.data : null;

            // reflect on card from DB response (preferred), else from payload
            setCard('cardCompany',  res ? (res.company  || '*no data*') : d.company);
            setCard('cardPosition', res ? (res.position || '*no data*') : d.position);
            setCard('email',        res ? (res.email    || '*no data*') : d.email);
            if (res && typeof res.contact_no !== 'undefined') {
              setCard('contactNo', dispPhone(res.contact_no));
            } else if (typeof d.contact_no !== 'undefined') {
              setCard('contactNo', dispPhone(d.contact_no));
            }

            // sync session snapshot
            try {
              var np = {};
              for (var k in pi) if (pi.hasOwnProperty(k)) np[k] = pi[k];
              np.co = d.company;
              np.po = d.position;
              np.e  = d.email;
              if (typeof d.contact_no !== 'undefined') np.c = d.contact_no;
              u0.pi = np;
              sessionStorage.setItem('userData', JSON.stringify(u0));
            } catch (e) {}

            // password cap
            if (A) {
              cnt++;
              try { localStorage.setItem(dayKey, JSON.stringify(cnt)); } catch (e) {}
              var rem = Math.max(0, MAX - cnt);
              if (cap) cap.textContent = 'Password changes today: ' + cnt + '/' + MAX;
              okMsg('Saved. Password changes: ' + cnt + '/' + MAX + ' (' + rem + ' remaining today).');
            } else {
              okMsg('Saved');
            }

            try { bootstrap.Collapse.getOrCreateInstance('#updateWrapper').hide(); } catch (e) {}
          })
          .catch(function (err) {
            if (err && err.message === 'bad-current') errMsg('Current password is incorrect.');
            else if (err && err.message === 'no-hash') errMsg('Password not set. Please contact support.');
            else errMsg('Unable to save. Please try again.');
          });
      });
    }
  });
})();
