/* js/common.js */
/*   
  Project: UAP Manila Corinthian Chapter Website
  Author: ArZ Miranda
  Date Created: 2025-07-19
  Last Modified: 2025-07-19
  Version: 1.0.2

  Description:
    This script powers interactive features of the UAP Manila Corinthian Chapter (MCC) website.
    It manages member login, session handling, and dynamically populates account info including
    membership status, payment history, and contact details.
    Enhancements include password visibility toggling and easy options to save or print data.

  Usage:
    - Expected DOM elements:
      - Login page: #loginForm, username/password inputs, #togglePassword button.
      - Account page: IDs like #cardName, #statusBadge, #totalDue, payment table #paymentsTable, and toggle buttons.
    - Uses Bootstrap 5, FontAwesome 6, Supabase JS SDK v2.
    - Stores session data in sessionStorage['userData'].
    - Auto-populates account info if valid session exists.

  Dependencies:
    - Supabase JavaScript SDK v2
    - Bootstrap 5 CSS & JS
    - FontAwesome 6 Icons

  Change Log:
    2025-07-19 - v1.0.0 - Initial implementation.
    2025-07-19 - v1.0.1 - Fixed initAccount invocation and scoped keydown event.
    2025-07-19 - v1.0.2 - Code cleanup, consistent style, added explanatory comments.

  Contact:
    UAP Manila Corinthian Chapter
    Email: uapmccmembership@gmail.com
    Website: https://manilacorinthianchapter.github.io/mcc/
*/

// Initialize Supabase client with retry
(() => {
  const supabaseUrl = 'https://fvaahtqjusfniadwvoyw.supabase.co',
        supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';

  const initSupabase = () => {
    if (window.supabase) {
      window.sb = window.supabase.createClient(supabaseUrl, supabaseKey);
    } else {
      setTimeout(initSupabase, 25);
    }
  };
  initSupabase();
})();

// Shortcut for document.querySelector
const $ = selector => document.querySelector(selector);

// Masking helpers
const mask = val => val ? '***' + String(val).slice(-4) : '*no data*';
const mailMask = email => {
  if (!email) return '*no data*';
  const [user, domain] = email.split('@');
  return domain ? user[0] + '***@' + domain : email;
};

// Format date as "MMM D, YYYY"
const formatDate = d => {
  const dt = new Date(d);
  return isNaN(dt) ? '—' : dt.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
};

// Format money with peso symbol and thousands separator
const formatMoney = v => isNaN(+v) ? '—' : '₱' + (+v).toLocaleString();

// Retrieve payment-related columns dynamically for future-proofing
async function getPaymentColumns(sbClient, tableName = 'xxsr_001') {
  const { data: columns, error } = await sbClient
    .from('visible_columns')
    .select('column_name')
    .eq('table_name', tableName)
    .order('column_name', { ascending: true });

  if (error || !columns) {
    console.error('Error fetching payment columns:', error);
    return [];
  }

  return columns
    .map(c => c.column_name)
    .filter(name => /\b(chapter_dues|chapter_dues_penalty|chapter_payment_date|iapoa_dues|iapoa_dues_penalty|iapoa_payment_date)_(\d{4})$/.test(name));
}

// Initialize login form behavior
async function initLogin() {
  const form = $('#loginForm');
  if (!form) return;

  const btnSubmit = form.querySelector('button[type=submit]');
  const usernameInput = form.username;
  const passwordInput = form.password;
  const toggleBtn = $('#togglePassword');

  // Toggle password visibility
  toggleBtn.onclick = () => {
    const hidden = passwordInput.type === 'password';
    passwordInput.type = hidden ? 'text' : 'password';
    toggleBtn.querySelector('i').className = 'fa-solid ' + (hidden ? 'fa-eye-slash' : 'fa-eye');
  };

  // Handle form submission
  form.onsubmit = async ev => {
    ev.preventDefault();

    if (!form.checkValidity()) {
      form.classList.add('was-validated');
      return;
    }

    btnSubmit.disabled = true;

    // Wait until Supabase client is ready
    const sbClient = await new Promise(resolve => {
      const interval = setInterval(() => {
        if (window.sb) {
          clearInterval(interval);
          resolve(window.sb);
        }
      }, 50);
    });

    // Get payment columns dynamically
    const paymentCols = await getPaymentColumns(sbClient);

    const fixedCols = [
      'row_id', 'username', 'password', 'name', 'prc_license', 'address', 'birthday',
      'contact_no', 'email', 'membership_active', 'total_due', 'batch', 'company', 'position'
    ];

    const selectCols = [...fixedCols, ...paymentCols].join(',');

    // Query user record
    const { data, error } = await sbClient.from('xxsr_001')
      .select(selectCols)
      .eq('username', usernameInput.value.trim().toLowerCase())
      .maybeSingle();

    // Validate login
    if (error || !data || passwordInput.value !== data.password) {
      alert('Invalid username or password.');
      btnSubmit.disabled = false;
      return;
    }

    // Extract payment data
    const payData = {};
    Object.keys(data).forEach(key => {
      if (paymentCols.includes(key)) payData[key] = data[key];
    });

    // Remove password before storing session data
    delete data.password;

    // Store session data
    sessionStorage.setItem('userData', JSON.stringify({
      ok: 1,
      row: String(data.row_id).trim().toLowerCase(),
      pi: {
        n: data.name,
        prc: data.prc_license,
        a: data.address,
        b: data.birthday,
        c: data.contact_no,
        e: data.email,
        bt: data.batch || '',
        co: data.company || '',
        po: data.position || ''
      },
      act: data.membership_active,
      due: data.total_due,
      pay: payData
    }));

    // Redirect to account page
    location.href = '/mcc/account/';
  };
}

// Initialize account page, populate user data and payment history
function initAccount() {
  const userData = JSON.parse(sessionStorage.getItem('userData') || 'null');
  if (!userData?.ok) {
    location.href = '/mcc/login/';
    return;
  }

  const pi = userData.pi;

  // Populate member info card
  $('#cardName').textContent = pi.n || '*no data*';
  $('#cardBatch').textContent = pi.bt || '*no data*';
  $('#cardCompany').textContent = pi.co || '*no data*';
  $('#cardPosition').textContent = pi.po || '*no data*';

  const statusBadge = $('#statusBadge');
  const isActive = (userData.act || '').toLowerCase().startsWith('a');
  if (statusBadge) {
    statusBadge.textContent = isActive ? 'Active' : 'Inactive';
    statusBadge.className = 'badge ' + (isActive ? 'bg-success' : 'bg-danger');
  }

  // Masked sensitive fields: PRC License, Email, Contact Number
  const sensitiveFields = [
    { id: 'prcLicense', value: pi.prc, maskFn: mask },
    { id: 'email', value: pi.e, maskFn: mailMask },
    { id: 'contactNo', value: pi.c, maskFn: mask }
  ];

  sensitiveFields.forEach(({ id, value, maskFn }) => {
    const el = document.getElementById(id);
    if (!el) return;
    const displayVal = value ? maskFn(value) : '*no data*';
    el.textContent = displayVal;
    el.dataset.real = value || '';
    el.dataset.shown = '0';
  });

  // Toggle sensitive info visibility on button click
  document.querySelectorAll('.toggle-sensitive-btn').forEach(btn => {
    btn.onclick = () => {
      const span = btn.parentElement.querySelector('.sensitive-text');
      if (!span) return;

      const show = span.dataset.shown !== '1';
      const realVal = span.dataset.real || '*no data*';
      const maskedVal = span.id === 'email'
        ? (() => {
            const [a, b] = realVal.split('@');
            return b ? a[0] + '***@' + b : realVal;
          })()
        : '***' + String(realVal).slice(-4);

      span.textContent = show ? realVal : maskedVal;
      span.dataset.shown = show ? '1' : '0';
      btn.querySelector('i').className = 'fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye');
    };
  });

  // Show total due amount formatted
  $('#totalDue').textContent = userData.due ? '₱' + Number(userData.due).toLocaleString() : '₱0';

  const pay = userData.pay || {};

  // Extract unique payment years from keys
  const years = [...new Set(Object.keys(pay)
    .map(k => k.match(/_(\d{4})$/))
    .filter(Boolean)
    .map(m => m[1])
  )].sort((a, b) => b - a);

  // Update table header for payment years
  const headRow = document.querySelector('#paymentsTable thead tr');
  while (headRow && headRow.children.length > 1) headRow.removeChild(headRow.lastChild);
  years.forEach(year => {
    const th = document.createElement('th');
    th.textContent = year;
    if (year === years[0]) {
      th.style.backgroundColor = '#cce5ff';
      th.style.fontWeight = '700';
    }
    headRow.appendChild(th);
  });

  // Helper to build payment rows dynamically
  function buildRows(categories, tbodySelector) {
    const tbody = document.querySelector(tbodySelector);
    if (!tbody) return;

    [...tbody.querySelectorAll('tr')].forEach(tr => {
      [...tr.querySelectorAll('td')].forEach(td => td.remove());
    });

    categories.forEach((cat, i) => {
      const tr = tbody.children[i];
      if (!tr) return;
      years.forEach(year => {
        const key = `${cat.key}_${year}`;
        let val = pay[key];
        if (val === undefined || val === null || val === '') val = '—';

        const td = document.createElement('td');
        td.textContent = cat.date ? formatDate(val) : cat.money ? formatMoney(val) : val;
        if (year === years[0]) td.style.fontWeight = '700';
        tr.appendChild(td);
      });
    });
  }

  // Define payment categories
  const chapterCategories = [
    { label: 'Chapter Dues', key: 'chapter_dues', money: true },
    { label: 'Chapter Penalty', key: 'chapter_dues_penalty', money: true },
    { label: 'Payment Date', key: 'chapter_payment_date', date: true }
  ];
  const iapoaCategories = [
    { label: 'IAPOA Dues', key: 'iapoa_dues', money: true },
    { label: 'IAPOA Penalty', key: 'iapoa_dues_penalty', money: true },
    { label: 'Payment Date', key: 'iapoa_payment_date', date: true }
  ];

  buildRows(chapterCategories, 'tbody.group-chapter');
  buildRows(iapoaCategories, 'tbody.group-iapoa');
}

// Main initialization on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  if ($('#loginForm')) {
    initLogin();
  }
  if (document.querySelector('.account-info')) {
    initAccount();

    // Only on account page: block common devtools/open shortcuts
    window.addEventListener('keydown', e => {
      const blocked =
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) ||
        (e.ctrlKey && ['U', 'S', 'P'].includes(e.key.toUpperCase()));
      if (blocked) {
        e.preventDefault();
        alert('This action is disabled for security reasons.');
      }
    });
  }

  // Show/hide navbar buttons on account page if user logged in
  const isAccountPage = location.pathname.endsWith('/mcc/account/') || location.pathname.endsWith('/account/');
  const userData = sessionStorage.getItem('userData');
  if (isAccountPage && userData) {
    $('#btnSaveScreenshotNav')?.classList.remove('d-none');
    $('#btnLogoutNav')?.classList.remove('d-none');
  }

  // Logout handlers
  function logout() {
    sessionStorage.removeItem('userData');
    location.href = '/mcc/';
  }
  ['btnLogoutFooter', 'btnLogoutNav'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', logout);
  });

  // Save screenshot handlers
  function saveScreenshot() {
    window.print();
  }
  ['btnSaveScreenshot', 'btnSaveScreenshotNav'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', saveScreenshot);
  });
});
