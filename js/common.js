/**
 * common.js
 * Handles user login, session management, and account info population
 * Uses Supabase for backend data and bcryptjs for password verification
 *
 */

document.addEventListener('DOMContentLoaded', () => {
  /* ----------  CONFIG  ---------- */
  const supabaseUrl  = 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';  // ← keep on ONE line
  const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

  /* ----------  LOGIN PAGE  ---------- */
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    const submitBtn     = loginForm.querySelector('button[type="submit"]');
    const usernameInput = loginForm.username;
    const passwordInput = loginForm.password;
    const toggleBtn     = document.getElementById('togglePassword');

    // Toggle‑eye logic
    if (toggleBtn && passwordInput) {
      toggleBtn.addEventListener('click', () => {
        const hidden = passwordInput.type === 'password';
        passwordInput.type = hidden ? 'text' : 'password';
        toggleBtn.querySelector('i')?.classList.toggle('fa-eye-slash', hidden);
        toggleBtn.querySelector('i')?.classList.toggle('fa-eye',       !hidden);
        toggleBtn.setAttribute('aria-label', hidden ? 'Hide password' : 'Show password');
        toggleBtn.setAttribute('aria-pressed', String(!hidden));
      });
    }

    // Submit handler
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (!loginForm.checkValidity()) {
        loginForm.classList.add('was-validated');
        return;
      }
      loginForm.classList.remove('was-validated');
      submitBtn.disabled = true;

      const username = usernameInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      try {
        // Fetch user by username
        const { data: user, error } = await supabase
          .from('xxsr_001')
          .select('username,password,name,prc_license,address,birthday,contact_no,email,membership_active,total_due')
          .eq('username', username)
          .single();

        if (error || !user || !bcrypt.compareSync(password, user.password)) {
          alert('Invalid username or password.');
          submitBtn.disabled = false;
          return;
        }

        // Store minimal session data
        sessionStorage.setItem('userData', JSON.stringify({
          status: 'success',
          personalInfo: {
            name: user.name,
            prcLicense: user.prc_license,
            address: user.address,
            birthday: user.birthday,
            contactNo: user.contact_no,
            email: user.email,
          },
          membershipActive: user.membership_active,
          totalDue: user.total_due
        }));

        window.location.href = 'account.html';
      } catch (err) {
        console.error(err);
        alert('Login failed. Please try again later.');
        submitBtn.disabled = false;
      }
    });
  }

  /* ----------  ACCOUNT PAGE  ---------- */
  if (document.body.classList.contains('account-info')) {
    const userData = JSON.parse(sessionStorage.getItem('userData') || 'null');
    if (!userData?.status) {
      alert('Please log in first.');
      window.location.href = 'login_page.html';
      return;
    }

    // Populate personal info
    const info = userData.personalInfo;
    document.getElementById('accountInfo').innerHTML = `
      <p><strong>Name:</strong> ${info.name}</p>
      <p><strong>PRC License:</strong> ${info.prcLicense}</p>
      <p><strong>Address:</strong> ${info.address}</p>
      <p><strong>Birthday:</strong> ${formatDate(info.birthday)}</p>
      <p><strong>Contact No.:</strong> ${info.contactNo}</p>
      <p><strong>Email:</strong> ${info.email}</p>
    `;
    document.getElementById('membershipStatus').textContent = userData.membershipActive || '';
    document.getElementById('totalDue').textContent        = userData.totalDue         || '';

    // Init sensitive toggles if markup exists
    initSensitiveToggles();
  }

  /* ----------  UTILITIES ---------- */
  function formatDate(str) {
    const d = new Date(str);
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function initSensitiveToggles() {
    document.querySelectorAll('.toggle-sensitive-btn').forEach((btn) => {
      const span = btn.previousElementSibling;
      span.dataset.realValue = span.textContent;
      span.textContent = '••••••••••••••••';
      span.setAttribute('aria-hidden', 'true');

      btn.addEventListener('click', () => {
        const hidden = span.getAttribute('aria-hidden') === 'true';
        span.textContent = hidden ? span.dataset.realValue : '••••••••••••••••';
        span.setAttribute('aria-hidden', String(!hidden));
        btn.querySelector('i')?.classList.toggle('fa-eye-slash', hidden);
        btn.querySelector('i')?.classList.toggle('fa-eye',       !hidden);
        btn.setAttribute('aria-label', hidden ? btn.getAttribute('aria-label').replace('Show','Hide')
                                              : btn.getAttribute('aria-label').replace('Hide','Show'));
      });
    });
  }

  /* ----------  BACK‑TO‑TOP BUTTON ---------- */
  const topBtn = document.getElementById('backToTopBtn');
  if (topBtn) {
    window.addEventListener('scroll', () => {
      topBtn.style.display = (document.documentElement.scrollTop > 100) ? 'block' : 'none';
    });
    topBtn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
});
