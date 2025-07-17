document.addEventListener('DOMContentLoaded', () => {
  // Obfuscated secret token parts (Base64 encoded)
  const part1 = 'dU5pcVUz';        // 'uNiqU3'
  const part2 = 'V0azRzMTIzNDU2';  // 'T0k3n123456'
  const SECRET_TOKEN = atob(part1) + atob(part2);

  // LOGIN FORM HANDLER
  const form = document.getElementById('loginForm');
  if (form) {
    const apiURL = 'https://script.google.com/macros/s/AKfycbzQKcBqQfPnBpZmjaMBt4CS0r79kA5HxlSC-V0MlVkWxbhOOPGJmIsFjRyDJW87HA5buw/exec';
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const username = form.username.value.trim();
      const password = form.password.value.trim();

      if (!username || !password) {
        alert('Please enter username and password.');
        return;
      }

      submitBtn.disabled = true;

      const formData = new URLSearchParams({
        username,
        password,
        token: SECRET_TOKEN
      });

      try {
        const res = await fetch(apiURL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: formData.toString(),
        });

        if (!res.ok) throw new Error('Network response was not ok');

        const data = await res.json();

        if (data.status === 'success') {
          localStorage.setItem('userData', JSON.stringify(data));
          window.location.href = 'account.html';
        } else {
          alert(data.error || 'Login failed. Incorrect username or password.');
        }
      } catch (err) {
        alert('An error occurred during login. Please try again later.');
        console.error('Login error:', err);
      } finally {
        submitBtn.disabled = false;
      }
    });
  }

  // PASSWORD TOGGLE BUTTON (using FontAwesome icons)
  const toggleBtn = document.getElementById('togglePassword');
  const passwordInput = document.getElementById('password');

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
    const userData = JSON.parse(localStorage.getItem('userData'));

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

    const paymentsBody = document.getElementById('paymentsBody');
    if (paymentsBody && userData.payments) {
      paymentsBody.innerHTML = userData.payments.map(payment => `
        <tr>
          <td>${payment.fiscalYear}</td>
          <td>${payment.chapterDues}</td>
          <td>${payment.chapterDuesPenalty}</td>
          <td>${payment.chapterPaymentDate}</td>
          <td>${payment.iapoaDues}</td>
          <td>${payment.iapoaDuesPenalty}</td>
          <td>${payment.iapoaPaymentDate}</td>
        </tr>
      `).join('');
    }

    const membershipStatusEl = document.getElementById('membershipStatus');
    const totalDueEl = document.getElementById('totalDue');

    if (membershipStatusEl) membershipStatusEl.textContent = userData.membershipActive || '';
    if (totalDueEl) totalDueEl.textContent = userData.totalDue || '';
  }
});

const backToTopBtn = document.getElementById('backToTopBtn');

window.onscroll = function() {
  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
    backToTopBtn.style.display = "block";
  } else {
    backToTopBtn.style.display = "none";
  }
};

backToTopBtn.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

  // Created By ARZ Miranda