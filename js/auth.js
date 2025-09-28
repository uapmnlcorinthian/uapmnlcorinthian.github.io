// auth.js (for membership.html)

// --- role/session helpers (tamper-evident + expiry) ---
function rlLevel(r){return({member:0,moderator:1,admin:2,super_admin:3})[String(r||'member')]??0}
function nowSec(){return Math.floor(Date.now()/1000)}
function expForRole(r){return rlLevel(r)>=rlLevel('admin')?nowSec()+86400:nowSec()+1200} // admin=1d; others=20m
async function sha256Hex(s){const b=new TextEncoder().encode(s),h=await crypto.subtle.digest('SHA-256',b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,'0')).join('')}
async function makeRoleSig({uid,role,exp,accessToken}){return sha256Hex([uid,role,exp,accessToken||''].join('|'))}

document.addEventListener('DOMContentLoaded', async () => {
  if (!window.location.pathname.includes('/membership/')) return;

  // ===== Toggle View Functionality =====
  const toggleBtn = document.getElementById('toggleViewBtn');
  const loginCard = document.querySelector('.login-card');
  const instructions = document.querySelector('.instructions');

  if (toggleBtn && loginCard && instructions) {
    function showLogin() {
      loginCard.style.display = 'block';
      instructions.style.display = 'none';
      toggleBtn.textContent = 'Back to instructions';
      toggleBtn.setAttribute('aria-expanded', 'true');
    }

    function showInstructions() {
      loginCard.style.display = 'none';
      instructions.style.display = 'block';
      toggleBtn.textContent = 'Login here';
      toggleBtn.setAttribute('aria-expanded', 'false');
    }

    toggleBtn.addEventListener('click', () => {
      const loginVisible = loginCard.style.display === 'block';
      loginVisible ? showInstructions() : showLogin();
    });

    function handleResize() {
      if (window.innerWidth >= 992) {
        loginCard.style.display = 'block';
        instructions.style.display = 'block';
        toggleBtn.style.display = 'none';
      } else {
        if (!loginCard.style.display || loginCard.style.display === 'none') {
          showInstructions();
        }
        toggleBtn.style.display = 'block';
      }
    }

    // Initialize and handle resize
    handleResize();
    window.addEventListener('resize', handleResize);
  }

  // ===== Login Functionality =====
  const initLogin = async () => {
    const f = document.getElementById('loginForm');
    if (!f) return;

    const btn = f.querySelector('button[type=submit]');
    const usr = f.username;
    const pwd = f.password;
    const toggle = document.getElementById('togglePassword');
    
    // Password visibility toggle
    if (toggle) {
      toggle.addEventListener('click', () => {
        const reveal = pwd.type === 'password';
        pwd.type = reveal ? 'text' : 'password';
        const icon = toggle.querySelector('i');
        if (icon) {
          icon.className = reveal ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
        }
        toggle.setAttribute('aria-pressed', String(reveal));
      });
    }
    
    // Form submission handler
    f.addEventListener('submit', async ev => {
      ev.preventDefault();
      
      // Form validation
      if (!f.checkValidity()) {
        f.classList.add('was-validated');
        return;
      }
      
      // CAPTCHA check
      const token = typeof grecaptcha !== 'undefined' ? grecaptcha.getResponse() : null;
      if (!token) {
        alert('Please confirm you are human.');
        return;
      }
      
      btn.disabled = true;
      const sb = await window.__ensureSB();
      
      try {
        // Verify CAPTCHA
        const { data: capResp, error: capErr } = 
          await sb.functions.invoke('verifyCaptcha', { body: { token } });
        
        if (capErr || !capResp?.success) {
          alert('CAPTCHA failed. Try again.');
          if (typeof grecaptcha !== 'undefined') grecaptcha.reset();
          btn.disabled = false;
          return;
        }
        
        // Fetch user data
        const cols = await getPaymentColumns(sb);
        const fixed = [
          'row_id','username','password_hash','name','prc_license',
          'address','birthday','contact_no','email','membership_active',
          'total_due','batch','company','position','role'
        ];
        
        const { data: user, error: authErr } = await sb
          .from('xxsr_001')
          .select([...fixed, ...cols].join(','))
          .eq('username', usr.value.trim().toLowerCase())
          .maybeSingle();

        if (authErr || !user) {
          throw new Error('Invalid username or password.');
        }

		// Verify password
		const { data: isValid, error: verifyErr } = await sb
		  .rpc('verify_password', { plain: pwd.value.trim(), hash: user.password_hash });

		if (verifyErr || !isValid) {
		  throw new Error('Invalid username or password.');
		}
		
		// === Ensure Supabase Auth session (needed for RLS writes later) ===
		try {
		  // Already signed in?
		  const { data: s0 } = await sb.auth.getSession();
		  if (!s0?.session) {
			// Try sign-in with email + same password the user entered
			let { error: siErr } = await sb.auth.signInWithPassword({
			  email: user.email,               // uses the email you fetched from your table
			  password: pwd.value.trim()
			});

			if (siErr) {
			  // If the user doesn't exist in Supabase Auth yet, create once (auto-confirm must be enabled OR email confirmation is handled)
			  const { error: suErr } = await sb.auth.signUp({
				email: user.email,
				password: pwd.value.trim()
			  });

			  if (!suErr) {
				// Sign in again after sign-up
				const { error: siErr2 } = await sb.auth.signInWithPassword({
				  email: user.email,
				  password: pwd.value.trim()
				});
				if (siErr2) console.warn('Supabase sign-in-after-signup failed', siErr2);
			  } else {
				console.warn('Supabase sign-up failed', suErr);
			  }
			}
		  }
		} catch (e) {
		  console.warn('Supabase auth bootstrap failed', e);
		}

        // Store session
        const pay = Object.fromEntries(cols.map(k => [k, user[k]]));
        const sess = { 
          ok: 1, 
          row: String(user.row_id).toLowerCase(), 
          pi: {
            n: user.name,
            prc: user.prc_license,
            a: user.address,
            b: user.birthday,
            c: user.contact_no,
            e: user.email,
            bt: user.batch || '',
            co: user.company || '',
            po: user.position || ''
          },
          act: user.membership_active,
          due: user.total_due,
          pay 
        };
		
		// --- append role + bounded validity + tamper-evident signature (after SB auth is ready) ---
		const role = String(user.role || 'member').toLowerCase();

		// get the fresh session AFTER sign-in/sign-up above
		const { data: sR2 } = await sb.auth.getSession();
		const at = (sR2 && sR2.session && sR2.session.access_token) || '';

		const rlexp = expForRole(role); // admin=1d; others=20m
		const rlsig = await makeRoleSig({
		  uid: String(user.row_id || ''),
		  role,
		  exp: rlexp,
		  accessToken: at
		});

		sess.rl    = role;   // role string
		sess.rlexp = rlexp;  // expiry
		sess.rlsig = rlsig;  // signature bound to this login session

        sessionStorage.setItem('userData', JSON.stringify(sess));
        try{ localStorage.setItem('userData', JSON.stringify(sess)); }catch(e){}
		
        setTimeout(() => window.location.replace('/account/'), 100);
      } catch (err) {
        alert(err.message || 'Login failed. Please try again.');
        btn.disabled = false;
      }
    });
  };

  await initLogin();
});

// Helper function for payment columns
async function getPaymentColumns(sb, tbl = 'xxsr_001') {
  const { data } = await sb.from('visible_columns')
    .select('column_name')
    .eq('table_name', tbl)
    .order('column_name');
  return (data || [])
    .map(c => c.column_name)
    .filter(n => /(chapter_|iapoa_).+_\d{4}$/.test(n));
}