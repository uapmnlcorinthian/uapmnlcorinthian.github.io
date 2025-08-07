// File: account.js
// Handles account page and update form

document.addEventListener('DOMContentLoaded', () => {
  // Auth check
  let u = JSON.parse(sessionStorage.getItem('userData') || 'null');
  if (!u?.ok) {
    const stored = JSON.parse(localStorage.getItem('userData') || 'null');
    if (stored?.ok) u = stored;
    else return location.href = '/membership/';
  }

  // === Account initialization ===
  const initAccount = () => {
    const pi = u.pi;
    $('#cardName').textContent     = pi.n  || '*no data*';
    $('#cardBatch').textContent    = pi.bt || '*no data*';
    $('#cardCompany').textContent  = pi.co || '*no data*';
    $('#cardPosition').textContent = pi.po || '*no data*';

    // Status badge
    const badge = $('#statusBadge');
    if (badge) {
      const active = String(u.act || '').toLowerCase().startsWith('a');
      badge.textContent = active ? 'Active' : 'Inactive';
      badge.className   = 'badge ' + (active ? 'bg-success' : 'bg-danger');
    }

    // Sensitive data fields
    const fieldMap = {
      prcLicense:  'prc',
      email:       'e',
      contactNo:   'c',
      cardCompany: 'co',
      cardPosition:'po'
    };
    Object.entries(fieldMap).forEach(([elId, piKey]) => {
      const el = document.getElementById(elId);
      if (!el) return;
      let real = pi[piKey] || '';
      if (elId === 'contactNo') real = '0' + String(real).replace(/^0+/, '');
      el.textContent  = real;
      el.dataset.real = real;
      el.dataset.shown= '1';
    });

    // Toggle sensitive data
    $$('.toggle-sensitive-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const span = btn.parentElement.querySelector('.sensitive-text');
        if (!span) return;
        const show   = span.dataset.shown !== '1';
        const real   = span.dataset.real || '*no data*';
        const masked = span.id === 'email'
          ? mailMask(real)
          : mask(real);
        span.textContent  = show ? real  : masked;
        span.dataset.shown= show ? '1' : '0';
        btn.querySelector('i').className = show
          ? 'fa-solid fa-eye-slash'
          : 'fa-solid fa-eye';
      });
    });

    // Total dues
    $('#totalDue').textContent = u.due
      ? '₱' + Number(u.due).toLocaleString()
      : '₱0';

    // Payment year columns
    const pay = u.pay || {};
    const yrs = Array.from(
      new Set(
        Object.keys(pay)
          .map(k => {
            const m = k.match(/_(\d{4})$/);
            return m ? m[1] : null;
          })
          .filter(Boolean)
      )
    ).sort((a, b) => b - a);

    // Build table header
    const headRow = $('#paymentsTable thead tr');
    while (headRow.children.length > 1) headRow.removeChild(headRow.lastChild);
    yrs.forEach(y => {
      const th = document.createElement('th');
      th.textContent = y;
      if (y === yrs[0]) {
        th.style.background   = '#cce5ff';
        th.style.fontWeight   = '700';
      }
      headRow.appendChild(th);
    });

    // Helper to fill a group of rows
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
          td.textContent = cat.date
            ? formatDate(v)
            : (cat.money ? formatMoney(v) : v);
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

  // === Update form initialization ===
  const initUpdateForm = () => {
    const f = $('#updateInfoForm');
    if (!f || f.dataset.init === '1') return;
    f.dataset.init = '1';

    const fb = $('#updateFeedback');
    const btn= f.querySelector('button[type=submit]');
    const needRules = ['.{8,}','[a-z]','[A-Z]','\\d','[^A-Za-z0-9]'];
    const checkMissing = s => needRules.filter(r => !new RegExp(r).test(s)).length;
    const id = Number(u.row);

    // … rest of update-form logic unchanged …
    // (ensure your JSON.parse fallback is a string, e.g. JSON.stringify({...}))  
  };

  // Run initializers
  initAccount();

  // Only wire up updateForm when its collapse is shown
  const updWrap = $('#updateWrapper');
  if (updWrap) {
    updWrap.addEventListener('shown.bs.collapse', initUpdateForm);
  }
});
