(() => {
  const { createApp, ref, reactive, computed } = Vue;
  createApp({
    setup() {
      // === Configuration ===
      const repo       = "uapmnlcorinthian/uapmnlcorinthian.github.io",  // <-- DO NOT CHANGE repo
            br         = "main",
            remoteBase = "_data",
            schemaFile = "_schemas.yml";

      // Clean non-printable characters from YAML content
      function cleanYamlContent(str) {
        return str.replace(/[^\x20-\x7E\n\t]/g, '');
      }

      // State
      const tok      = ref(sessionStorage.getItem("gh_token") || ""),
            files    = ref([]),
            file     = ref("");
      const SC       = reactive({}),
            schema   = reactive({ type: "array", wrap: null, fields: [], display: "" }),
            data     = ref([]),
            mapItems = ref([]),
            sha      = ref(""),
            sel      = ref(-1),
            q        = ref(""),
            sortMode = ref("index");

      // Helpers
      const hdrs       = () => ({ Authorization: `Bearer ${tok.value}` });
      const displayKey = computed(() => schema.display || schema.fields[0]?.k);
      const labelOf    = e => {
        const k = displayKey.value;
        return e && typeof e === 'object' && e[k]
          ? String(e[k])
          : e?.title || e?.name || 'Item';
      };

      const rows = computed(() => {
        if (schema.type === 'map') return [];
        const valid = Array.isArray(data.value) ? data.value.filter(r => r != null) : [];
        let arr = valid.map((row, idx) => ({ row, idx }));
        const qq = q.value.trim().toLowerCase();
        if (qq) arr = arr.filter(x => labelOf(x.row).toLowerCase().includes(qq));
        if (sortMode.value === 'name') {
          arr.sort((a, b) => labelOf(a.row).localeCompare(labelOf(b.row)));
        }
        return arr;
      });

      const inputType = (f,v) =>
        f.t === 'number'   ? 'number'
      : f.t === 'datetime' ? 'datetime-local'
      : f.t === 'date' && /T|Z/.test(v) ? 'text'
      : f.t === 'date'      ? 'date'
      : 'text';

      // GitHub API
      async function ghFetch(path) {
        const res = await fetch(
          `https://api.github.com/repos/${repo}/contents/${remoteBase}/${path}?ref=${br}`,
          { headers: hdrs() }
        );
        if (!res.ok) throw new Error('Fetch failed');
        const j = await res.json();
        const rawContent = atob(j.content);
        return { 
          text: cleanYamlContent(rawContent),
          sha: j.sha 
        };
      }
      
      async function ghPut(path, content, prevSha) {
        const body = JSON.stringify({
          message: `Update ${path}`,
          content: btoa(unescape(encodeURIComponent(content))),
          sha: prevSha,
          branch: br
        });
        return fetch(
          `https://api.github.com/repos/${repo}/contents/${remoteBase}/${path}`,
          { method: 'PUT', headers: { ...hdrs(), 'Content-Type':'application/json' }, body }
        );
      }

      function objFromFields(fields) {
        const o = {};
        fields.forEach(f => {
          o[f.k] = f.t === 'bool' ? false : (f.t === 'list' ? [] : (f.t === 'sublist' ? [] : ''));
        });
        return o;
      }

      function inferFields(o) {
        return o && typeof o==='object'
          ? Object.keys(o).map(k => ({
              k,
              l: k.replace(/[\_-]+/g,' ').replace(/\b\w/g,m => m.toUpperCase()),
              t: Array.isArray(o[k])  ? 'list'
               : typeof o[k]==='boolean'? 'bool'
               : typeof o[k]==='number' ? 'number'
               : /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(o[k]) ? 'date'
               : 'text'
            }))
          : [];
      }
      
      function pickSchema(fn,y) {
        const s = SC[fn];
        if (s) return Object.assign(schema, s);
        if (y && !Array.isArray(y) && typeof y==='object') {
          const ks = Object.keys(y);
          if (ks.length && Array.isArray(y[ks[0]])) {
            schema.type = 'objlist'; 
            schema.wrap = ks[0];
            schema.fields = inferFields(y[ks[0]][0]);
            schema.display = schema.fields.find(f => ['title','name'].includes(f.k))?.k || schema.fields[0]?.k;
            return;
          }
          schema.type = 'map'; 
          schema.wrap = null; 
          schema.fields = []; 
          schema.display = '';
          return;
        }
        schema.type = 'array'; 
        schema.wrap = null;
        schema.fields = inferFields((y||[])[0]);
        schema.display = schema.fields.find(f => ['title','name'].includes(f.k))?.k || schema.fields[0]?.k;
      }

      // Core functions
      async function init() {
        try {
          const s = await ghFetch(schemaFile);
          Object.assign(SC, jsyaml.load(s.text) || {});
        } catch(err) { console.error('Schema error:', err); }
        try {
          const r = await fetch(
            `https://api.github.com/repos/${repo}/contents/${remoteBase}?ref=${br}`,
            { headers: hdrs() }
          );
          const list = (await r.json()).map(x => x.name);
          files.value = list.filter(n => n!==schemaFile);
          file.value = files.value[0] || '';
          await loadFile();
        } catch(err) { console.error('File error:', err); }
      }

      async function loadFile() {
        if (!file.value) return;
        const r = await ghFetch(file.value);
        let y = {};
        try { y = jsyaml.load(r.text) || {}; } catch(e) { console.error('YAML error:', e); }
        sha.value = r.sha || '';
        pickSchema(file.value, y);
        if (schema.type === 'map') {
          mapItems.value = Object.entries(y).map(([k, v]) => ({ key: k, value: v }));
          sel.value = -1;
        } else if (schema.type === 'objlist') {
          const arr = y?.[schema.wrap];
          data.value = Array.isArray(arr) ? arr : [];
          sel.value = data.value.length ? 0 : -1;
        } else {
          data.value = Array.isArray(y) ? y : [];
          sel.value = data.value.length ? 0 : -1;
        }
      }

      const cur = computed(() => sel.value >= 0 ? data.value[sel.value] : {});

      function open(idx) {
        sel.value = idx;
      }

      function prev() {
        if (sel.value > 0) sel.value--;
      }

      function next() {
        if (sel.value < data.value.length - 1) sel.value++;
      }

      function reload() {
        loadFile();
      }

      function addItem() {
        const newItem = objFromFields(schema.fields);
        data.value.push(newItem);
        sel.value = data.value.length - 1;
      }

      function dupItem() {
        if (sel.value < 0) return;
        const copy = JSON.parse(JSON.stringify(data.value[sel.value]));
        data.value.splice(sel.value + 1, 0, copy);
        sel.value++;
      }

      function delItem() {
        if (sel.value < 0) return;
        data.value.splice(sel.value, 1);
        if (sel.value >= data.value.length) sel.value = data.value.length - 1;
      }

      function moveItem(d) {
        if (sel.value < 0) return;
        const newIdx = sel.value + d;
        if (newIdx < 0 || newIdx >= data.value.length) return;
        [data.value[newIdx], data.value[sel.value]] = [data.value[sel.value], data.value[newIdx]];
        sel.value = newIdx;
      }

      async function save() {
        if (!file.value) return;
        let content;
        if (schema.type === 'map') {
          const obj = {};
          mapItems.value.forEach(item => obj[item.key] = item.value);
          content = jsyaml.dump(obj);
        } else if (schema.type === 'objlist') {
          const wrapObj = {};
          wrapObj[schema.wrap] = data.value;
          content = jsyaml.dump(wrapObj);
        } else {
          content = jsyaml.dump(data.value);
        }
        try {
          const res = await ghPut(file.value, content, sha.value);
          if (res.ok) {
            const j = await res.json();
            sha.value = j.content.sha;
            alert('Saved!');
          } else throw new Error(await res.text());
        } catch(err) {
          console.error(err);
          alert('Save failed: ' + err.message);
        }
      }

      function exportYaml() {
        let content;
        if (schema.type === 'map') {
          const obj = {};
          mapItems.value.forEach(item => obj[item.key] = item.value);
          content = jsyaml.dump(obj);
        } else if (schema.type === 'objlist') {
          const wrapObj = {};
          wrapObj[schema.wrap] = data.value;
          content = jsyaml.dump(wrapObj);
        } else {
          content = jsyaml.dump(data.value);
        }
        const blob = new Blob([content], { type: 'application/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.value;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 0);
      }

      function addKey() {
        mapItems.value.push({ key: '', value: '' });
      }

      function removeKey(i) {
        mapItems.value.splice(i, 1);
      }

      function login() {
        const t = prompt('GitHub Personal Access Token (with repo scope):');
        if (t) {
          tok.value = t;
          sessionStorage.setItem('gh_token', t);
          init();
        }
      }

      function logout() {
        tok.value = '';
        sessionStorage.removeItem('gh_token');
      }

      init();
      return { 
        repo, tok, files, file, schema, data, mapItems, sel, q, sortMode,
        rows, inputType, labelOf, login, logout, loadFile, addItem, dupItem,
        delItem, moveItem, save, exportYaml, prev, next, reload, open, 
        addKey, removeKey, cur, objFromFields
      };
    }
  }).mount('#app');
})();

(function(){
  // Gate: show the button if (a) role >= admin OR (b) a GitHub token exists
  function canShow(){
    try{
      const r = +localStorage.getItem('u_role') || 0; // 2=admin, 3=super_admin
      if(r >= 2) return true;
    }catch{}
    try{
      if (sessionStorage.getItem('gh_token')) return true;
    }catch{}
    return false;
  }

  const btn = document.getElementById('cms-adm-btn');
  if(canShow() && btn) btn.style.display = 'inline-flex';

  // Clicking the button opens the short guide
  btn?.addEventListener('click', () => {
    const dlg = document.getElementById('cmsGuideShort');
    if(dlg?.showModal) dlg.showModal();
  });

  // Close buttons for both dialogs
  document.addEventListener('click', (e)=>{
    const closeId = e.target?.getAttribute?.('data-close');
    if(closeId){
      const dlg = document.getElementById(closeId);
      if(dlg?.close) dlg.close();
    }
  });

  // Esc to close
  ['cmsGuideShort','cmsGuideFull'].forEach(id=>{
    const d = document.getElementById(id);
    d?.addEventListener('cancel',(ev)=>ev.preventDefault());
    d?.addEventListener('keydown',(ev)=>{
      if(ev.key==='Escape'){ d.close(); }
    });
  });

  // Open full from short
  document.getElementById('openFullGuide')?.addEventListener('click',()=>{
    document.getElementById('cmsGuideShort')?.close();
    const f = document.getElementById('cmsGuideFull');
    f?.showModal && f.showModal();
  });
})();

// Auto-open the short "How this CMS works" guide once per browser
(function(){
  const SEEN = 'cmsGuideSeen_v1';
  const shortDlg = document.getElementById('cmsGuideShort');
  if (!localStorage.getItem(SEEN) && shortDlg?.showModal) {
    setTimeout(() => shortDlg.showModal(), 200);
    localStorage.setItem(SEEN, '1');
  }
})();