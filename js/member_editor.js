// member_editor.js — admin edit with live checks, name parts combine, diff-only save
(async () => {
  "use strict";
  const $ = s => document.querySelector(s), T = "xxsr_001", K = "row_id";
  const sb = await (window.__ensureSB ? window.__ensureSB() : null);
  if (!sb) { console.error("Supabase not ready"); return; }

  let curId = null;
  document.addEventListener("click", e => {
    const b = e.target.closest("#mbv_list [data-id]");
    if (b) {
      curId = +b.getAttribute("data-id");
      const el = $("#mbv_selid"); if (el) el.textContent = String(curId);
    }
  });

  // helpers
  const normPhone = v => {
    v = String(v || "").replace(/\D/g, "");
    if (/^09\d{9}$/.test(v)) return v.slice(1);
    if (/^639\d{9}$/.test(v)) return v.slice(2);
    if (/^\+?63\d{10}$/.test(v)) return v.replace(/^\+?63/, "").replace(/^0+/, "");
    if (/^\d{10}$/.test(v)) return v;
    return null;
  };
  const validPhoneUI = v => { v = String(v || "").trim(); return v === "" || /^(09\d{9}|\+639\d{9})$/.test(v); };
  const isoDateOrNull = v => { v = String(v || "").trim(); if (!v) return null; return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null; };
  const g = id => document.getElementById(id);
  const joinFullName = (s, giv, m) => {
    s = (s || "").trim(); giv = (giv || "").trim(); m = (m || "").trim();
    let L = s ? (s + ", ") : "";
    let R = giv + (m ? (" " + m) : "");
    return (L + R).trim();
  };

  // pull current normalized data from viewer
  function curObj() { return (typeof window.__mbv_getCurrent === "function") ? window.__mbv_getCurrent() : null; }
  function curKey() { return curId || (typeof window.__mbv_getId === "function" ? window.__mbv_getId() : null); }

  // read inputs
  const gv = id => { const el = g(id); return el ? String(el.value || "").trim() : ""; };
  const mark = (el, ok) => { if (!el) return; el.classList.toggle("is-invalid", !ok); el.classList.toggle("is-valid", ok); };

  // live validation bindings (similar to account.js)
  function wireLiveValidation() {
    const ph = g("upd2Contact"); if (ph) {
      const f = () => {
        const raw = String(ph.value || "").trim();
        const ok = (raw === "") || /^(09\d{9}|\+639\d{9})$/.test(raw);
        mark(ph, ok || !raw);
        if (ph.setCustomValidity) ph.setCustomValidity(ok ? "" : "Enter 09XXXXXXXXX or +639XXXXXXXXX");
      };
      ["input", "change", "keyup", "blur", "paste"].forEach(ev => ph.addEventListener(ev, f)); f();
    }
    const bd = g("upd2Birthday"); if (bd) {
      const f = () => {
        const ok = /^\d{4}-\d{2}-\d{2}$/.test(String(bd.value || ""));
        mark(bd, ok || !bd.value);
        if (bd.setCustomValidity) bd.setCustomValidity(ok || !bd.value ? "" : "Use YYYY-MM-DD");
      };
      ["input", "change", "blur"].forEach(ev => bd.addEventListener(ev, f)); f();
    }
    const bt = g("upd2Batch"); if (bt) {
      const f = () => {
        let v = String(bt.value || "").trim();
        let ok = v === "" || (/^\d+$/.test(v) && +v >= 1);
        mark(bt, ok || !v);
        if (bt.setCustomValidity) bt.setCustomValidity(ok || !v ? "" : "Positive whole number");
      };
      ["input", "change", "keyup", "blur", "paste"].forEach(ev => bt.addEventListener(ev, f)); f();
    }
    // simple presence check for name parts (at least surname or given)
    ["upd2Surname", "upd2Given"].forEach(id => {
      const el = g(id); if (!el) return;
      const f = () => { const ok = (gv("upd2Surname") !== "" || gv("upd2Given") !== ""); mark(el, ok); };
      ["input", "change", "keyup", "blur"].forEach(ev => el.addEventListener(ev, f)); f();
    });
  }
  wireLiveValidation();

  // build diff only for changed fields
  function buildDiff() {
    const u = curObj(); if (!u) return { diff: {}, meta: {} };
    const pi = u.pi || {};
    const s = gv("upd2Surname"), gi = gv("upd2Given"), mi = gv("upd2Middle");
    const nameFull = joinFullName(s, gi, mi);

    const prc = gv("upd2PRC");
    const addr = gv("upd2Address");
    const bday = isoDateOrNull(gv("upd2Birthday"));
    const contactIn = gv("upd2Contact");
    const email = gv("upd2Email");
    const batch = gv("upd2Batch");
    const company = gv("upd2Company");
    const position = gv("upd2Position");

    // validate phone UI
    const phEl = g("upd2Contact");
    const phoneUIOk = validPhoneUI(contactIn);
    mark(phEl, phoneUIOk || !contactIn);
    if (!phoneUIOk && contactIn) throw new Error("Invalid contact number. Use 09XXXXXXXXX or +639XXXXXXXXX.");
    const contactDb = contactIn ? normPhone(contactIn) : null;
    if (contactIn && contactDb === null) throw new Error("Invalid contact number after normalization.");

    // validate batch
    const btEl = g("upd2Batch");
    let batchOk = (batch === "") || (/^\d+$/.test(batch) && +batch >= 1);
    mark(btEl, batchOk || batch === "");
    if (!batchOk) throw new Error("Batch must be a positive whole number.");

    // validate birthday
    const bdEl = g("upd2Birthday");
    let bdOk = !gv("upd2Birthday") || !!bday;
    mark(bdEl, bdOk || !gv("upd2Birthday"));
    if (!bdOk) throw new Error("Birthday must be YYYY-MM-DD.");

    const diff = {};
    // full name + split columns
    if (nameFull !== (pi.n || "")) diff.name = nameFull;
    if (s !== (pi.sn || ""))       diff.name_surname = s;
    if (gi !== (pi.gn || ""))      diff.name_given   = gi;
    if (mi !== (pi.mn || ""))      diff.name_middle  = mi;

    if (prc      !== (pi.prc || ""))  diff.prc_license = prc;
    if (addr     !== (pi.addr || "")) diff.address     = addr;
    if ((bday || "") !== (pi.bday || "")) diff.birthday = bday;
    if (batch    !== (pi.bt || ""))   diff.batch       = batch;
    if (company  !== (pi.co || ""))   diff.company     = company;
    if (position !== (pi.po || ""))   diff.position    = position;
    if (email    !== (pi.e || ""))    diff.email       = email;
    if (contactDb != null && contactDb !== (pi.c || "")) diff.contact_no = contactDb;

    return { diff, meta: { prcInput: prc, prcCurrent: pi.prc || "" } };
  }

  // save handler
  async function save() {
    const id = curKey(); if (!id) { alert("Pick a member first."); return; }
    let payload, meta;
    try { ({ diff: payload, meta } = buildDiff()); }
    catch (e) { alert(e.message || "Invalid input."); return; }

    // optional: reset password to PRC (if checkbox exists)
    const chk = $("#chkResetPw");
    if (chk && chk.checked) {
      const prcVal = (meta.prcInput && meta.prcInput.trim()) ? meta.prcInput.trim() : meta.prcCurrent;
      if (!prcVal) { alert("Cannot reset password: PRC is empty."); return; }
      payload.password = prcVal; // hashed by your DB trigger
    }

    if (Object.keys(payload).length === 0) { alert("Nothing to update."); return; }
    if (!confirm("Are you sure? You cannot undo this edit.")) return;

    const r = await sb.from(T).update(payload).eq(K, id);
    if (r.error) { alert("Update failed: " + r.error.message); return; }

    if (chk) chk.checked = false;
    if (window.__mbv_refresh) await window.__mbv_refresh(id);
  }

  // "Load from Card" convenience (re-fills inputs from the current selection)
  async function loadFromCard() {
    const u = curObj(); if (!u) { alert("Pick a member first."); return; }
    const pi = u.pi || {};
    const set = (id, val) => { const el = g(id); if (el) el.value = val || ""; };
    set("upd2Surname",  pi.sn || "");
    set("upd2Given",    pi.gn || "");
    set("upd2Middle",   pi.mn || "");
    set("upd2PRC",      pi.prc || "");
    set("upd2Batch",    pi.bt || "");
    set("upd2Company",  pi.co || "");
    set("upd2Position", pi.po || "");
    set("upd2Contact",  pi.c ? ("0" + String(pi.c).replace(/^0+/, "")) : "");
    set("upd2Email",    pi.e || "");
    set("upd2Address",  pi.addr || "");
    set("upd2Birthday", (pi.bday || "").slice(0, 10)); // yyyy-MM-dd if already ISO-like
  }

  document.getElementById("mbv_editbtn")?.addEventListener("click", save);
  document.getElementById("mbv_fillfromcard")?.addEventListener("click", loadFromCard);
})();
