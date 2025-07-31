(() => {
  const { createApp, ref, reactive, computed } = Vue;
  createApp({
    setup() {
      // === Configuration ===
      const repo       = "uapmnlcorinthian/uapmnlcorinthian.github.io",
            br         = "main",
            remoteBase = "_data",
            schemaFile = "_schemas.yml";

      // State
      const tok      = ref(sessionStorage.getItem("gh_token") || ""),
            files    = ref([]),
            file     = ref("");
      const SC       = reactive({}),
            schema   = reactive({ type: "array", wrap: null, fields: [], display: "" }),
            data     = ref([]),
            obj      = reactive({}),
            rowsKeys = ref([]),
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

      // Corrected rows mapping: use 'row' and 'idx' keys
      const rows = computed(() => {
        if (schema.type === 'map') return [];
        // ensure each element is defined
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

      // GitHub API fetch
      async function ghFetch(path) {
        const res = await fetch(
          `https://api.github.com/repos/${repo}/contents/${remoteBase}/${path}?ref=${br}`,
          { headers: hdrs() }
        );
        if (!res.ok) throw new Error('Fetch failed');
        const j = await res.json();
        return { text: atob(j.content), sha: j.sha };
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

      // Schema inference
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
            schema.type = 'objlist'; schema.wrap = ks[0];
            schema.fields = inferFields(y[ks[0]][0]);
            schema.display = schema.fields.find(f => ['title','name'].includes(f.k))?.k || schema.fields[0]?.k;
            return;
          }
          schema.type = 'map'; schema.wrap = null; schema.fields = []; schema.display = '';
          return;
        }
        schema.type = 'array'; schema.wrap = null;
        schema.fields = inferFields((y||[])[0]);
        schema.display = schema.fields.find(f => ['title','name'].includes(f.k))?.k || schema.fields[0]?.k;
      }

      // Initialize
      async function init() {
        try {
          const s = await ghFetch(schemaFile);
          Object.assign(SC, jsyaml.load(s.text) || {});
        } catch(err) { console.error('Schema load error:', err); }
        try {
          const r = await fetch(
            `https://api.github.com/repos/${repo}/contents/${remoteBase}?ref=${br}`,
            { headers: hdrs() }
          );
          const list = (await r.json()).map(x => x.name);
          files.value = list.filter(n => n!==schemaFile);
          file.value = files.value[0] || '';
          await loadFile();
        } catch(err) { console.error('File list error:', err); }
      }

      // File operations
      async function loadFile() {
        if (!file.value) return;
        const r = await ghFetch(file.value);
        let y = {};
        try { y = jsyaml.load(r.text) || {}; } catch(e) { console.error('YAML parse error:', e); }
        sha.value = r.sha || '';
        pickSchema(file.value, y);
        if (schema.type === 'map') {
          Object.assign(obj, y);
          rowsKeys.value = Object.keys(obj);
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

      function addItem() { /* ... */ }
      function dupItem() { /* ... */ }
      function delItem() { /* ... */ }
      function moveItem(d) { /* ... */ }
      async function save() { /* ... */ }
      function exportYaml() { /* ... */ }
      function login() { /* ... */ }
      function logout() { /* ... */ }      

      init();
      return { repo, tok, files, file, schema, data, obj, rowsKeys, sel, q, sortMode,
               rows, inputType, labelOf, login, logout, loadFile, addItem, dupItem,
               delItem, moveItem, save, exportYaml, prev, next, reload };
    }
  }).mount('#app');
})();
