document.addEventListener('DOMContentLoaded', () => {
  // Scroll-to-top button
  const btnTop = $('#btnTop');
  if (btnTop) {
    window.addEventListener('scroll', () => {
      btnTop.classList.toggle('d-none', window.scrollY < 200);
    });
    btnTop.addEventListener('click', () => window.scrollTo({ 
      top: 0, 
      behavior: 'smooth' 
    }));
  }

  // Header behavior
  const header = document.querySelector('header');
  if (header) {
    let lastY = window.scrollY;
    window.addEventListener('scroll', () => {
      const y = window.scrollY;
      if (y > lastY + 10) header.classList.add('hide-up');
      else if (y < lastY - 10) header.classList.remove('hide-up');
      lastY = y;
    });
  }

  // Print buttons
  $$('[id^="btnSaveScreenshot"]').forEach(btn => {
    btn.addEventListener('click', () => window.print());
  });

  // Logout functionality
  const doLogout = () => { 
    sessionStorage.removeItem('userData'); 
    location.href = '/'; 
  };
  ['btnLogoutFooter', 'btnLogoutNav'].forEach(id => {
    const el = document.getElementById(id); 
    if (el) el.addEventListener('click', doLogout);
  });

  // Privacy policy toggles
  document.querySelectorAll('.pp-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const cardBody = btn.closest('.card-body');
      cardBody.querySelectorAll('.pp-text').forEach(el => 
        el.classList.toggle('expanded')
      );
      btn.textContent = btn.textContent === 'Show more' 
        ? 'Show less' 
        : 'Show more';
    });
  });
});