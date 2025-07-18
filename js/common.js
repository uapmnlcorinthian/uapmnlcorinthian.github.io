document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase client
  const supabaseUrl = 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8'; // Replace with your anon key
  const supabase = supabase.createClient(supabaseUrl, supabaseAnonKey);

  // LOGIN FORM HANDLER
  const form = document.getElementById('loginForm');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const usernameInput = form ? form.username : null;
  const passwordInput = form ? form.password : null;

  if (form) {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      e.stopPropagation();

      // Bootstrap validation
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        return;
      }
      form.classList.remove('was-validated');

      submitBtn.disabled = true;

      const username = usernameInput.value.trim().toLowerCase();
      const password = passwordInput.value;

      try {
        // Fetch user data from Supabase
        const { data: user, error } = await supabase
          .from('xxsr_001')
          .select('row_id, username, password, name, prc_license, address, birthday, contact_no, email, membership_active, total_due')
          .eq('username', username)
          .single();

        if (error || !user) {
          alert('Invalid username or password.');
          submitBtn.disabled = false;
          return;
        }

        // Compare bcrypt hash
        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
          alert('Invalid username or password.');
          submitBtn.disabled = false;
          return;
        }

        // Store minimal user info in sessionStorage (cleared on tab close)
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
        console.error('Login error:', err);
        alert('An error occurred during login. Please try again later.');
        submitBtn.disabled = false;
      }
    });
  }

  // PASSWORD TOGGLE BUTTON
  const toggleBtn = document.getElementById('togglePassword');

  if (toggleBtn && passwordInput) {
    toggleBtn.setAttribute('aria-pressed', 'false');

    toggleBtn.addEventListener('click', () => {
      const isPassword = passwordInput.type === 'password';
      passwordInput.type = isPassword ? 'text' : 'password';

      const icon = toggleBtn.querySelector('i');
      if (icon) {
        icon.classList.toggle('fa-eye');
        icon.classList.toggle('fa-eye-slash');
      }

      toggleBtn.setAttribute('aria-pressed', isPassword.toString());
      toggleBtn.setAttribute('aria-label', isPassword ? 'Hide password' : 'Show password');
    });

    toggleBtn.addEventListener('keydown', (e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        toggleBtn.click();
      }
    });
  }

  // ACCOUNT PAGE DATA POPULATION
  if (document.body.classList.contains('account-info')) {
    const userData = JSON.parse(sessionStorage.getItem('userData'));

    if (!userData || userData.status !== 'success') {
      alert('Please log in first.');
      window.location.href = 'login_page.html';
      return;
    }

    const infoDiv = document.getElementById('accountInfo');
    const info = userData.personalInfo;

    if (infoDiv && info) {
      infoDiv.innerHTML = `
        <p><strong>Name:</strong> ${info.name}</p>
        <p><strong>PRC License:</strong> ${info.prcLicense}</p>
        <p><strong>Address:</strong> ${info.address}</p>
        <p><strong>Birthday:</strong> ${info.birthday}</p>
        <p><strong>Contact No.:</strong> ${info.contactNo}</p>
        <p><strong>Email:</strong> ${info.email}</p>
      `;
    }

    const membershipStatusEl = document.getElementById('membershipStatus');
    const totalDueEl = document.getElementById('totalDue');

    if (membershipStatusEl) membershipStatusEl.textContent = userData.membershipActive || '';
    if (totalDueEl) totalDueEl.textContent = userData.totalDue || '';
  }
});

// Back to Top Button Logic
const backToTopBtn = document.getElementById('backToTopBtn');

window.onscroll = function () {
  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
    backToTopBtn.style.display = 'block';
  } else {
    backToTopBtn.style.display = 'none';
  }
};

backToTopBtn?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
