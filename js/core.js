// === Universal Helpers ===
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const mask = v => v ? '***' + String(v).slice(-4) : '*no data*';
const mailMask = e => {
  if (!e) return '*no data*';
  const [u,d] = e.split('@');
  return d ? `${u[0]}***@${d}` : e;
};
const formatDate = d => {
  const t = new Date(d);
  return isNaN(t) ? '—' : t.toLocaleDateString(undefined, { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};
const formatMoney = v => isNaN(+v) ? '—' : '₱' + (+v).toLocaleString();

// === Supabase Initialization ===
(() => {
  const URL = 'https://fvaahtqjusfniadwvoyw.supabase.co';
  const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ2YWFodHFqdXNmbmlhZHd2b3l3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MDQ4ODgsImV4cCI6MjA2ODM4MDg4OH0.uvHGXXlijYIbuX_l85Ak7kdQDy3OaLmeplEEPlMqHo8';
  
  window.__ensureSB = async () => {
    if (window.sb) return window.sb;
    if (window.supabase) {
      window.sb = window.supabase.createClient(URL, KEY);
      return window.sb;
    }
    
    try {
      const m = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm');
      window.sb = m.createClient(URL, KEY);
      return window.sb;
    } catch {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/index.js';
        s.async = true;
        s.onload = () => {
          window.sb = window.supabase.createClient(URL, KEY);
          resolve(window.sb);
        };
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }
  };
})();

// === Column Helper (Used in auth/account) ===
async function getPaymentColumns(sb, tbl = 'xxsr_001') {
  const { data } = await sb.from('visible_columns')
    .select('column_name')
    .eq('table_name', tbl)
    .order('column_name');
  return (data || [])
    .map(c => c.column_name)
    .filter(n => /(chapter_|iapoa_).+_\d{4}$/.test(n));
}