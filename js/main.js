// === Supabase client loader (ESM -> UMD fallback) ===
(() => {
    const URL = 'https://fvaahtqjusfniadwvoyw.supabase.co',
        KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';
    window.__ensureSB = async function() {
        if (window.sb) return window.sb;
        if (window.supabase) {
            window.sb = window.supabase.createClient(URL, KEY);
            return window.sb
        }
        try {
            const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
            window.sb = m.createClient(URL, KEY);
            return window.sb
        } catch (e) {
            await new Promise((res, rej) => {
                const s = document.createElement('script');
                s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/index.js';
                s.async = !0;
                s.onload = res;
                s.onerror = rej;
                document.head.appendChild(s)
            });
            window.sb = window.supabase.createClient(URL, KEY);
            return window.sb
        }
    }
})();

// === Helpers ===
const $ = s => document.querySelector(s);
const mask = v => v ? '***' + String(v).slice(-4) : '*no data*';
const mailMask = e => {
    if (!e) return '*no data*';
    const [u, d] = e.split('@');
    return d ? u[0] + '***@' + d : e
};
const formatDate = d => {
    const t = new Date(d);
    return isNaN(t) ? '—' : t.toLocaleDateString(void 0, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
};
const formatMoney = v => isNaN(+v) ? '—' : '₱' + (+v).toLocaleString();
async function getPaymentColumns(sb, tbl = 'xxsr_001') {
    const {
        data
    } = await sb.from('visible_columns').select('column_name').eq('table_name', tbl).order('column_name');
    return (data || []).map(c => c.column_name).filter(n => /(chapter_|iapoa_).+_\d{4}$/.test(n))
}

// === Login ===
async function initLogin() {
    const f = document.getElementById('loginForm');
    if (!f) return;
    const btn = f.querySelector('button[type=submit]'),
        usr = f.username,
        pwd = f.password,
        toggle = document.getElementById('togglePassword');
    if (toggle) {
        toggle.addEventListener('click', () => {
            const h = pwd.type === 'password';
            pwd.type = h ? 'text' : 'password';
            toggle.querySelector('i').className = h ? 'fa-solid fa-eye-slash' : 'fa-solid fa-eye';
            toggle.setAttribute('aria-pressed', String(h))
        })
    }
    f.addEventListener('submit', async ev => {
        ev.preventDefault();
        if (!f.checkValidity()) {
            f.classList.add('was-validated');
            return
        }
        const token = grecaptcha.getResponse();
        if (!token) {
            alert('Please confirm you are human.');
            return
        }
        btn.disabled = !0;
        const sb = await __ensureSB();
        try {
            const {
                data: capResp,
                error: capErr
            } = await sb.functions.invoke('verifyCaptcha', {
                body: {
                    token
                }
            });
            if (capErr || !capResp?.success) {
                alert('CAPTCHA failed. Try again.');
                grecaptcha.reset();
                btn.disabled = !1;
                return
            }
            const cols = await getPaymentColumns(sb),
                fixed = ['row_id', 'username', 'password', 'name', 'prc_license', 'address', 'birthday', 'contact_no', 'email', 'membership_active', 'total_due', 'batch', 'company', 'position'];
            const {
                data: user,
                error: authErr
            } = await sb.from('xxsr_001').select([...fixed, ...cols].join(',')).eq('username', usr.value.trim().toLowerCase()).maybeSingle();
            if (authErr || !user || pwd.value !== user.password) throw new Error('Invalid username or password.');
            const pay = Object.fromEntries(cols.map(k => [k, user[k]]));
            delete user.password;
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
            sessionStorage.setItem('userData', JSON.stringify(sess));
            setTimeout(() => {
                window.location.replace('/account/')
            }, 100)
        } catch (err) {
            alert(err.message || 'Login failed. Please try again.');
            btn.disabled = !1
        }
    })
}

// === Account card ===
function initAccount() {
    let u = JSON.parse(sessionStorage.getItem('userData') || 'null');
    if (!u?.ok) {
        u = JSON.parse(localStorage.getItem('userData') || 'null');
        if (u?.ok) sessionStorage.setItem('userData', JSON.stringify(u))
    }
    if (!u?.ok) {
        location.href = '/membership/';
        return
    }
    const pi = u.pi;
    $('#cardName').textContent = pi.n || '*no data*';
    $('#cardBatch').textContent = pi.bt || '*no data*';
    $('#cardCompany').textContent = pi.co || '*no data*';
    $('#cardPosition').textContent = pi.po || '*no data*';
    const badge = $('#statusBadge');
    if (badge) {
        const active = String(u.act || '').toLowerCase().startsWith('a');
        badge.textContent = active ? 'Active' : 'Inactive';
        badge.className = 'badge ' + (active ? 'bg-success' : 'bg-danger')
    } [{
        id: 'prcLicense',
        v: pi.prc,
        fn: mask
    }, {
        id: 'email',
        v: pi.e,
        fn: mailMask
    }, {
        id: 'contactNo',
        v: pi.c,
        fn: mask
    }].forEach(({
        id,
        v,
        fn
    }) => {
        const el = $('#' + id);
        if (!el) return;
        el.textContent = v ? fn(v) : '*no data*';
        el.dataset.real = v || '';
        el.dataset.shown = '0'
    });
    document.querySelectorAll('.toggle-sensitive-btn').forEach(b => {
        b.addEventListener('click', () => {
            const span = b.parentElement.querySelector('.sensitive-text');
            if (!span) return;
            const show = span.dataset.shown !== '1';
            const real = span.dataset.real || '*no data*';
            let masked = '***' + String(real).slice(-4);
            if (span.id === 'email') {
                const [u1, d] = real.split('@');
                masked = d ? u1[0] + '***@' + d : real
            }
            span.textContent = show ? real : masked;
            span.dataset.shown = show ? '1' : '0';
            b.querySelector('i').className = 'fa-solid ' + (show ? 'fa-eye-slash' : 'fa-eye')
        })
    });
    $('#totalDue').textContent = u.due ? '₱' + Number(u.due).toLocaleString() : '₱0';
    const pay = u.pay || {};
    const yrs = [...new Set(Object.keys(pay).map(k => k.match(/_(\d{4})$/)).filter(Boolean).map(m => m[1]))].sort((a, b) => b - a);
    const head = $('#paymentsTable thead tr');
    while (head.children.length > 1) head.removeChild(head.lastChild);
    yrs.forEach(y => {
        const th = document.createElement('th');
        th.textContent = y;
        if (y === yrs[0]) {
            th.style.background = '#cce5ff';
            th.style.fontWeight = '700'
        }
        head.appendChild(th)
    });
    const build = (cats, sel) => {
        const tb = $(sel);
        if (!tb) return;
        tb.querySelectorAll('td').forEach(td => td.remove());
        cats.forEach((c, i) => {
            const tr = tb.children[i];
            yrs.forEach(y => {
                const key = `${c.key}_${y}`;
                let v = pay[key];
                if (v == null || v === '') v = '—';
                const td = document.createElement('td');
                td.textContent = c.date ? formatDate(v) : c.money ? formatMoney(v) : v;
                if (y === yrs[0]) td.style.fontWeight = '700';
                tr.appendChild(td)
            })
        })
    };
    build([{
        key: 'chapter_dues',
        money: 1
    }, {
        key: 'chapter_dues_penalty',
        money: 1
    }, {
        key: 'chapter_payment_date',
        date: 1
    }], 'tbody.group-chapter');
    build([{
        key: 'iapoa_dues',
        money: 1
    }, {
        key: 'iapoa_dues_penalty',
        money: 1
    }, {
        key: 'iapoa_payment_date',
        date: 1
    }], 'tbody.group-iapoa')
}

// === Update form ===
function initUpdateForm() {
    const f = $('#updateInfoForm');
    if (!f) return;
    const fb = $('#updateFeedback');
    if (f.dataset.init === '1') return;
    f.dataset.init = '1';
    const btn = f.querySelector('button[type=submit]');
    let u = JSON.parse(sessionStorage.getItem('userData') || 'null');
    if (!u?.ok) {
        u = JSON.parse(localStorage.getItem('userData') || 'null');
        if (u?.ok) sessionStorage.setItem('userData', JSON.stringify(u))
    }
    if (!u?.ok) {
        location.href = '/membership/';
        return
    }
    const id = Number(u.row);
    // prefill
    (async () => {
        try {
            const sb = await __ensureSB();
            const {
                data: d
            } = await sb.from('xxsr_001').select('username,email,contact_no,company,position').eq('row_id', id).maybeSingle();
            if (d) {
                f.username.value = d.username || '';
                f.email.value = d.email || u.pi?.e || '';
                f.contact.value = d.contact_no || u.pi?.c || '';
                f.company.value = d.company || u.pi?.co || '';
                f.position.value = d.position || u.pi?.po || ''
            }
        } catch (e) {
            console.error('pf', e)
        }
    })();
    // autocomplete off
    f.setAttribute('autocomplete', 'off');
    ['currentPassword', 'password', 'confirmPassword', 'username', 'email', 'contact', 'company', 'position'].forEach(x => {
        const i = f.querySelector('#' + x);
        if (i) i.setAttribute('autocomplete', 'off')
    });
    // eye + meter
    const pw = f.password,
        wrap = pw.closest('.password-wrapper');
    if (wrap) {
        wrap.style.position = 'relative';
        pw.classList.add('pe-5');
        const eye = document.createElement('button');
        eye.type = 'button';
        eye.className = 'btn btn-sm border-0 bg-transparent position-absolute end-0 top-50 translate-middle-y me-2';
        eye.setAttribute('aria-label', 'Show/hide password');
        eye.innerHTML = '<i class="fa-solid fa-eye"></i>';
        wrap.appendChild(eye);
        eye.onclick = () => {
            const h = pw.type === 'password';
            pw.type = h ? 'text' : 'password';
            eye.firstChild.className = 'fa-solid ' + (h ? 'fa-eye-slash' : 'fa-eye')
        };
        const msg = document.createElement('div');
        msg.className = 'form-text text-muted small';
        const barWrap = document.createElement('div');
        barWrap.className = 'progress mt-1';
        barWrap.innerHTML = '<div class="progress-bar" role="progressbar" style="width:0%"></div>';
        wrap.parentElement.append(msg, barWrap);
        const need = s => ['.{8,}', '[a-z]', '[A-Z]', '\\d', '[^A-Za-z0-9]'].filter(r => !new RegExp(r).test(s)).length;
        const updMeter = () => {
            const s = pw.value,
                miss = need(s),
                lbl = ['8 chars', 'lowercase', 'uppercase', 'number', 'symbol'],
                un = lbl.filter((_, i) => !new RegExp(['.{8,}', '[a-z]', '[A-Z]', '\\d', '[^A-Za-z0-9]'][i]).test(s));
            msg.textContent = un.length ? 'Needs: ' + un.join(', ') : '';
            const pct = ((5 - miss) / 5) * 100;
            const bar = barWrap.querySelector('.progress-bar');
            bar.style.width = pct + '%';
            bar.className = 'progress-bar bg-' + (pct >= 80 ? 'success' : pct >= 60 ? 'info' : pct >= 40 ? 'warning' : 'danger')
        };
        pw.addEventListener('input', updMeter);
        f.confirmPassword.addEventListener('input', () => {
            if (pw.value && f.confirmPassword.value && pw.value !== f.confirmPassword.value) fb.textContent = 'Passwords do not match.';
            else if (fb.textContent === 'Passwords do not match.') fb.textContent = ''
        })
    }
    // quota info
    const tz = 'Asia/Manila';
    const MAX = 2;
    const limitKey = 'updateLimit-' + u.row;
    const quotaInfo = document.createElement('div');
    quotaInfo.id = 'updateQuotaInfo';
    quotaInfo.className = 'col-12 small text-muted mt-0';
    const todayStr = () => new Date().toLocaleDateString('en-CA', {
        timeZone: tz
    });

    function refreshQuota() {
        let lim;
        try {
            lim = JSON.parse(localStorage.getItem(limitKey) || 'null')
        } catch {
            lim = null
        }
        const today = todayStr();
        if (!lim || lim.date !== today) lim = {
            date: today,
            count: 0
        };
        const remaining = Math.max(0, MAX - lim.count);
        quotaInfo.textContent = 'Daily limit: ' + MAX + ' updates. Remaining today: ' + remaining + '.';
        if (!document.getElementById('updateQuotaInfo')) {
            const fbEl = document.getElementById('updateFeedback');
            if (fbEl) {
                f.insertBefore(quotaInfo, fbEl);
            } else {
                f.appendChild(quotaInfo);
            }
        }
        btn.disabled = (remaining === 0);
    }
    refreshQuota();
    // submit
    f.addEventListener('submit', async e => {
        e.preventDefault();
        fb.textContent = '';
        btn.disabled = !0;
        try {
            const today = todayStr();
            let lim;
            try {
                lim = JSON.parse(localStorage.getItem(limitKey) || 'null')
            } catch {
                lim = null
            }
            if (!lim || lim.date !== today) lim = {
                date: today,
                count: 0
            };
            if (lim.count >= MAX) {
                fb.textContent = 'You have reached the limit (' + MAX + ' updates today).';
                refreshQuota();
                btn.disabled = !1;
                return
            }
            const cur = f.currentPassword.value.trim(),
                np = f.password.value.trim(),
                cp = f.confirmPassword.value.trim();
            const need = s => ['.{8,}', '[a-z]', '[A-Z]', '\\d', '[^A-Za-z0-9]'].filter(r => !new RegExp(r).test(s)).length;
            if (np && need(np) > 0) {
                fb.textContent = 'Password is not strong enough.';
                btn.disabled = !1;
                return
            }
            if (np && np !== cp) {
                fb.textContent = 'Passwords do not match.';
                btn.disabled = !1;
                return
            }
            const sb = await __ensureSB();
            const p = {},
                u1 = f.username.value.trim().toLowerCase();
            if (u1) p.username = u1;
            if (np) p.password = np;
            const em = f.email.value.trim();
            if (em) p.email = em;
            const ct = f.contact.value.trim();
            if (ct) p.contact_no = ct;
            const co = f.company.value.trim();
            if (co) p.company = co;
            const po = f.position.value.trim();
            if (po) p.position = po;
            if (!Object.keys(p).length) {
                fb.textContent = 'Nothing to update.';
                btn.disabled = !1;
                return
            }
            const args = {
                p_row_id: id,
                p_current_pass: cur,
                p_username: p.username ?? null,
                p_email: p.email ?? null,
                p_contact_no: p.contact_no ?? null,
                p_company: p.company ?? null,
                p_position: p.position ?? null,
                p_new_pass: p.password ?? null
            };
            const {
                data: updated,
                error: rpcErr
            } = await sb.rpc('update_member_profile', args);
            if (rpcErr) {
                fb.textContent = rpcErr.message || 'Update failed.';
                btn.disabled = !1;
                return
            }
            if (!updated || !updated.length) {
                fb.textContent = 'No changes were applied.';
                btn.disabled = !1;
                return
            }
            lim.count++;
            localStorage.setItem(limitKey, JSON.stringify(lim));
            refreshQuota();
            alert('Update successful. You will now be logged out for security reasons.');
            sessionStorage.removeItem('userData');
            location.href = '/membership/'
        } catch (err) {
            console.error(err);
            fb.textContent = 'Unexpected error. Please try again.';
            btn.disabled = !1
        }
    })
}

// === Misc UI ===
document.addEventListener('scroll', () => {
    const b = $('#btnTop');
    if (!b) return;
    b.classList.toggle('d-none', window.scrollY < 200)
});

document.addEventListener('DOMContentLoaded', () => {
    if ($('#loginForm')) initLogin();
    if (document.querySelector('.account-info')) initAccount();
    const logout = () => {
        sessionStorage.removeItem('userData');
        location.href = '/'
    };
    ['btnLogoutFooter', 'btnLogoutNav'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', logout)
    });
    const snap = () => window.print();
    ['btnSaveScreenshot', 'btnSaveScreenshotNav'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('click', snap)
    });
    const upd = document.getElementById('updateWrapper');
    if (upd) upd.addEventListener('shown.bs.collapse', initUpdateForm)
});

document.addEventListener('DOMContentLoaded', () => {
    if (window.AOS) AOS.init({
        duration: 800,
        once: !0
    })
});

document.addEventListener('DOMContentLoaded', () => {
    const targets = ['/account/', '/another‑page/'],
        path = window.location.pathname;
    if (!targets.includes(path)) return;
    const alpha = '0jZxeQ~-YL7KgOCWRIP2bJ4stim1h_8adUovMnAGzT3HDwBS6FcXu9ylk5VpNfqrE.',
        len = 32;
    let t = '';
    for (let i = 0; i < len; i++) t += alpha.charAt(Math.floor(Math.random() * alpha.length));
    history.replaceState(null, '', '/#uapMCC_' + t)
});

const btnTop = document.getElementById('btnTop');
if (btnTop) window.addEventListener('scroll', () => {
    btnTop.style.display = window.scrollY > 300 ? 'inline-flex' : 'none'
});

document.addEventListener('DOMContentLoaded', () => {
    const h = document.querySelector('header');
    let y = window.scrollY;
    if (!h) return;
    window.addEventListener('scroll', () => {
        const c = window.scrollY;
        if (c < y - 10) h.classList.remove('hide-up');
        else if (c > y + 10) h.classList.add('hide-up');
        y = c
    })
});