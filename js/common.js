/* ===== UAP‑MCC – Login & Account (compact) ===== */
(() => {
  const u = 'https://fvaahtqjusfniadwvoyw.supabase.co',
        k = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';
  const w = () => {
    if (window.supabase) {
      window.sb = window.supabase.createClient(u, k);
    } else {
      setTimeout(w, 25);
    }
  };
  w();
})();

const $     = q => document.querySelector(q),
      mask  = v => '***' + String(v).slice(-4),
      mail  = m => { const [a,b]=m.split('@'); return b? a[0]+'***@'+b : m },
      fmt   = d => { const x=new Date(d); return isNaN(x)? '—' : x.toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}); },
      money = v => isNaN(+v)? '—' : '₱'+(+v).toLocaleString();

addEventListener('DOMContentLoaded', ()=>{
  if ($('#loginForm')) L();
  if (document.body.classList.contains('account-info')) A();
});

/* ---- LOGIN ---- */
async function L(){
  const f = $('#loginForm'),
        b = f.querySelector('button[type=submit]'),
        u = f.username, p=f.password,
        e = $('#togglePassword');

  e.onclick = ()=>{
    const hidden = p.type==='password';
    p.type = hidden?'text':'password';
    e.querySelector('i').className = 'fa-solid '+(hidden?'fa-eye-slash':'fa-eye');
  };

  f.onsubmit = async ev=>{
    ev.preventDefault();
    if(!f.checkValidity()){ f.classList.add('was-validated'); return }
    b.disabled=true;

    const sel = [
      'row_id','username','password','name','prc_license','address','birthday','contact_no','email','membership_active','total_due','batch','company','position',
      // all years you use; add future columns here
      'chapter_dues_2023','chapter_dues_penalty_2023','chapter_payment_date_2023','iapoa_dues_2023','iapoa_dues_penalty_2023','iapoa_payment_date_2023',
      'chapter_dues_2022','chapter_dues_penalty_2022','chapter_payment_date_2022','iapoa_dues_2022','iapoa_dues_penalty_2022','iapoa_payment_date_2022',
      'chapter_dues_2021','chapter_dues_penalty_2021','chapter_payment_date_2021','iapoa_dues_2021','iapoa_dues_penalty_2021','iapoa_payment_date_2021'
    ].join(',');

    const { data:d, error:er } = await sb.from('xxsr_001').select(sel).eq('username',u.value.trim().toLowerCase()).maybeSingle();
    if(er||!d||p.value!==d.password){
      alert('Invalid username or password.');
      b.disabled=false;
      return;
    }

    const pay = {};
    Object.keys(d).forEach(k=>{
      if(/^((chapter|iapoa)_dues|.*_payment_date)/.test(k)) pay[k]=d[k];
    });

    sessionStorage.setItem('userData', JSON.stringify({
      ok:1,
      row:String(d.row_id).trim().toLowerCase(),
      pi:{ n:d.name, prc:d.prc_license, a:d.address, b:d.birthday, c:d.contact_no, e:d.email, bt:d.batch||'', co:d.company||'', po:d.position||'' },
      act:d.membership_active, due:d.total_due, pay
    }));
    location.href='account.html';
  };
}

/* ---- ACCOUNT ---- */
function A(){
  const ud = JSON.parse(sessionStorage.getItem('userData')||'null');
  if(!ud?.ok) return location.href='login_page.html';

  // populate profile
  const p = ud.pi;
  $('#cardName').textContent=p.n;
  $('#cardBatch').textContent=p.bt;
  $('#cardCompany').textContent=p.co;
  $('#cardPosition').textContent=p.po;
  const bd=$('#statusBadge'), act=(ud.act||'').toLowerCase().startsWith('a');
  bd.textContent=act?'Active':'Inactive';
  bd.className='badge '+(act?'bg-success':'bg-danger');
  const s=document.querySelectorAll('.sensitive-text');
  [p.prc,p.e,p.c].forEach((val,i)=>{
    s[i].textContent = i===1 ? mail(val) : mask(val);
    s[i].dataset.real = val;
  });
  document.querySelectorAll('.toggle-sensitive-btn').forEach(btn=>{
    btn.onclick=()=>{
      const sp=btn.previousElementSibling, show=sp.dataset.shown!=='1';
      sp.textContent = show?sp.dataset.real:(sp===s[1]?mail(sp.dataset.real):mask(sp.dataset.real));
      sp.dataset.shown = show?'1':'0';
      btn.querySelector('i').className = 'fa-solid '+(show?'fa-eye-slash':'fa-eye');
    };
  });
  $('#totalDue').textContent = money(ud.due);

  // DYNAMIC YEARS & TABLE
  const pay = ud.pay||{};
  const yrs = [...new Set(Object.keys(pay)
    .map(k=>k.match(/_(\d{4})$/))
    .filter(Boolean)
    .map(m=>m[1])
  )].sort((a,b)=>b-a);

  // header
  const headRow = document.querySelector('#paymentsTable thead tr');
  yrs.forEach(y=> headRow.insertAdjacentHTML('beforeend',`<th>${y}</th>`));

  // categories
  const chapterCats = [
    {label:'Chapter Dues',        key:'chapter_dues',         money:true},
    {label:'Chapter Penalty',     key:'chapter_dues_penalty', money:true},
    {label:'Payment Date',        key:'chapter_payment_date', date:true}
  ];
  const iapoaCats = [
    {label:'IAPOA Dues',          key:'iapoa_dues',           money:true},
    {label:'IAPOA Penalty',       key:'iapoa_dues_penalty',   money:true},
    {label:'Payment Date',        key:'iapoa_payment_date',   date:true}
  ];

  function buildRows(cats){
    return cats.map(c=>{
      const cells = yrs.map(y=>{
        const v=pay[`${c.key}_${y}`];
        if(v==null||v==='') return '<td>—</td>';
        if(c.date)  return `<td>${fmt(v)}</td>`;
        if(c.money) return `<td>${money(v)}</td>`;
        return `<td>${v}</td>`;
      }).join('');
      return `<tr><th scope="row">${c.label}</th>${cells}</tr>`;
    }).join('');
  }

  document.querySelector('tbody.group-chapter').innerHTML = buildRows(chapterCats);
  document.querySelector('tbody.group-iapoa').innerHTML  = buildRows(iapoaCats);
}

/* ---- Back‑to‑top (safe) ---- */
const t = document.getElementById('backToTopBtn');
if(t){
  addEventListener('scroll',()=> t.style.display = scrollY>100?'block':'none');
  t.onclick = ()=> scrollTo({top:0,behavior:'smooth'});
}

// ---- LOGOUT ----
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('userData');   // clear our data
    location.href = 'index.html';            // go home
  });
}

