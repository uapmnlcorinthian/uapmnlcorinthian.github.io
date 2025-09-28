(() => {
  "use strict";

  /* ---------- tiny utils ---------- */
  const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
  const pJS=(s,d=null)=>(!s||s==="undefined")?d:(()=>{try{return JSON.parse(s)}catch{return d}})();
  const J=k=>{const a=pJS(sessionStorage.getItem(k),undefined);return a!==undefined?a:pJS(localStorage.getItem(k),null)};
  const Sget=(k,d)=>pJS(localStorage.getItem(k),d);
  const Sset=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
  ["userData","kan_drafts_v2"].forEach(k=>{try{const v=localStorage.getItem(k); if(v==="undefined"||v==="") localStorage.removeItem(k);}catch{}});

  const lvl=r=>({member:0,moderator:1,admin:2,super_admin:3})[String(r||"member")]||0;
  const now =()=>Math.floor(Date.now()/1000);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));
  const ordNext=a=>a.length?Math.max.apply(null,a.map(x=>+x.ord||0))+10:1000;
  const status=(msg,type="ok")=>{ const b=$("#kanStatus"); if(!b) return; b.className=""; b.classList.add("show",type); b.textContent=msg; };

  let WRAP, SB, COLS=[], CARDS=[], VIEW="active";
  const DRAFT_KEY="kan_drafts_v2";
  let D=Sget(DRAFT_KEY,{ops:[],base:{cols:{},cards:{}},baseAt:null,tmp:-1});
  const U=J("userData")||{};
	function visibleInView(x){
	  if (VIEW === "trash")     return !!x.is_deleted;
	  if (VIEW === "archived")  return !!x.archived && !x.is_deleted;
	  /* VIEW === "active" */   return !x.archived && !x.is_deleted;
	}

	const byCol = cid =>
	  CARDS
		.filter(x => x.col_id === cid && visibleInView(x))
		.sort((a,b)=>(+a.ord||0)-(+b.ord||0));

  /* ---------- Supabase client that keeps session fresh ---------- */
  async function ensureSB(){
    if (window.__ensureSB) return await window.__ensureSB();
    if (window.sb) return window.sb;
    if (!window.supabase || !window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) { status("Supabase not configured.","err"); return null; }
    window.sb = window.supabase.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    return window.sb;
  }

  /* ---------- role guard (uses your tamper-evident session) ---------- */
  async function sha(s){const b=new TextEncoder().encode(s),h=await crypto.subtle.digest("SHA-256",b);return Array.from(new Uint8Array(h)).map(x=>x.toString(16).padStart(2,"0")).join("")}
  const nowSec=()=>Math.floor(Date.now()/1000);
  const badge=(t,c)=>{const el=$("#roleBadge"); if(el){ el.textContent=t; el.className="badge "+(c||"bg-secondary"); } };
  const setLastSynced=s=>{ const el=$("#lastSynced"); if(el) el.textContent="Last synced: "+(s||"—"); };

  async function guard(){
    if(!U.ok){ badge("Sign in required","bg-danger"); location.href='/membership/'; return false; }
    const role=String(U.rl||"member").toLowerCase();
    if(lvl(role)<lvl("admin")){ badge("Forbidden","bg-danger"); location.href='/403/'; return false; }
    SB = await ensureSB(); if(!SB) return false;

    // make sure supabase session is alive (client auto refresh is enabled)
    const { data:s } = await SB.auth.getSession();
    const at = (s && s.session && s.session.access_token) || "";
    const exp=+U.rlexp||0, sig=String(U.rlsig||"");
    const expect=await sha([String(U.row||""),role,String(exp),at].join("|"));
    if(!(exp>nowSec() && sig===expect)){ try{sessionStorage.removeItem("userData");localStorage.removeItem("userData")}catch{} badge("Expired","bg-warning"); location.href='/membership/?relogin=1'; return false; }

    badge("Admin verified","bg-success");
    return true;
  }

  /* ---------- storage ops helpers ---------- */
  function meta(){ return {updated_by_id:String(U.row||""),updated_by_name:String((U.pi&&U.pi.n)||""),updated_at:new Date().toISOString()} }
  function markDraft(){
    const n=D.ops.length, b=$("#syncCount"); if(!b) return;
    if(n>0){ b.textContent=String(n); b.classList.remove("d-none"); window.onbeforeunload=e=>(e.returnValue="Unsynced changes will be lost."); }
    else   { b.classList.add("d-none"); window.onbeforeunload=null; }
  }
  function q(op){ D.ops.push(op); Sset(DRAFT_KEY,D); markDraft(); }
  function qCoalesce(op){
    const last=D.ops[D.ops.length-1];
    if(last && last.id===op.id){
      if(last.t==="edit" && op.t==="edit"){ last.title=op.title; last.detail=op.detail; Sset(DRAFT_KEY,D); markDraft(); return; }
      if((last.t==="move"||last.t==="reord") && (op.t==="move"||op.t==="reord")){
        last.t="move"; last.ord=op.ord; if(op.col_id) last.col_id=op.col_id; Sset(DRAFT_KEY,D); markDraft(); return;
      }
      if(last.t==="color" && op.t==="color"){ last.color=op.color; Sset(DRAFT_KEY,D); markDraft(); return; }
      if((last.t==="trash"&&op.t==="undelete")||(last.t==="undelete"&&op.t==="trash")){ D.ops.pop(); Sset(DRAFT_KEY,D); markDraft(); return; }
    }
    q(op);
  }

  /* ---------- palette + contrast ---------- */
  const palette=()=>["#e0e0e0","#343a40","#6c757d","#adb5bd","#ff6b6b","#ffa94d","#ffd43b","#94d82d","#69db7c","#38d9a9","#4dabf7","#228be6","#b197fc","#845ef7","#f06595"];
  function closePal(){ const p=$("#kanPal"); p && p.remove(); }
  function getContrast(hex){ if(!hex) return "#000"; const h=hex.replace("#",""); if(h.length<6) return "#000";
    const r=parseInt(h.slice(0,2),16), g=parseInt(h.slice(2,4),16), b=parseInt(h.slice(4,6),16);
    return ((r*299+g*587+b*114)/1000>=128)?"#000":"#fff";
  }

  function showSwatch(btn,id){
    const x=CARDS.find(k=>+k.id===+id); if(!x) return; closePal();
    const r=btn.getBoundingClientRect(), pop=document.createElement("div");
    pop.id="kanPal"; pop.style.cssText="position:fixed;z-index:1080;background:#fff;border:1px solid #ddd;border-radius:8px;padding:8px;box-shadow:0 6px 18px rgba(0,0,0,.12);left:"+r.left+"px;top:"+(r.bottom+4)+"px;";
    pop.innerHTML=`<div style="display:grid;grid-template-columns:repeat(5,18px);gap:8px">${palette().map(c=>`<button data-swatch="${c}" title="${c}" style="width:18px;height:18px;border:1px solid #ccc;background:${c};border-radius:4px"></button>`).join("")}</div>`;
    document.body.appendChild(pop);
    pop.addEventListener("click", e=>{
      const c=e.target?.getAttribute?.("data-swatch"); if(!c) return;
      x.color=c; Object.assign(x,meta()); qCoalesce({t:"color",id:x.id,color:c}); paint(); closePal();
    }, {once:true});
    setTimeout(()=>document.addEventListener("click", closePal, {once:true}),0);
  }

  /* ---------- render ---------- */
  const colHeaderBar = `<div class="col-color"></div>`;
  function colEl(c){
    const d=document.createElement("div");
    d.className="kan-col";
    d.innerHTML=`<div class="card shadow-sm">
      <div class="card-header kan-h bg-light">
        <span class="t">${esc(c.title||"")}</span>
        <div class="d-flex gap-1">
          <button class="btn btn-sm btn-outline-primary" data-add="${c.id}">Add</button>
          <button class="btn btn-sm btn-outline-secondary" data-rename-col="${c.id}">Rename</button>
          ${VIEW!=="trash"?`<button class="btn btn-sm btn-outline-danger" data-cdel="${c.id}">Trash</button>`:`<button class="btn btn-sm btn-outline-secondary" data-cundo="${c.id}">Restore</button>`}
        </div>
      </div>
      <div class="card-body">
        ${colHeaderBar}
        <div class="kan-slot" data-slot="${c.id}"></div>
        <div class="kan-add"><input type="text" class="form-control form-control-sm" placeholder="+ Add card…" data-add-input="${c.id}">
          <button class="btn btn-sm btn-primary" data-add-go="${c.id}">Add</button></div>
      </div>
    </div>`;
    const s=d.querySelector("[data-slot]"); byCol(c.id).forEach(x=>s.appendChild(cardEl(x)));
    return d;
  }

  function attachDnD(card,id){
    const grip=card.querySelector(".kan-grip"); let allow=false;
    const arm=()=>{allow=true; card.setAttribute("draggable","true");};
    grip?.addEventListener("mousedown",arm); grip?.addEventListener("touchstart",arm,{passive:true});
    card.addEventListener("dragstart",ev=>{
      if(!allow){ev.preventDefault();return}
      ev.dataTransfer.effectAllowed = "move";          // polish
      ev.dataTransfer.setData("text/plain",String(id));
      card.classList.add("dragging");
    });
    card.addEventListener("dragend",()=>{allow=false; card.removeAttribute("draggable"); card.classList.remove("dragging");});
  }

  function enableDropzones() {
    $$(".kan-slot").forEach(slot => {
      const colId = +slot.getAttribute("data-slot");

      slot.addEventListener("dragenter", ev => {
        ev.preventDefault();
        slot.classList.add("col-highlight");
      });

      slot.addEventListener("dragover", ev => {
        ev.preventDefault();
        slot.classList.add("col-highlight");
        ev.dataTransfer.dropEffect = "move";

        const cards = Array.from(slot.querySelectorAll(".kan-card:not(.dragging)"));
        const after = cards.reverse().find(c => ev.clientY >= c.getBoundingClientRect().top + c.offsetHeight / 2);
        slot._insertAfterId = after ? +after.dataset.id : null;

        if (cards.length === 0) slot.classList.add("empty");
      });

      slot.addEventListener("dragleave", () => {
        slot.classList.remove("col-highlight");
        slot.classList.remove("empty");     // cleanup
        slot._insertAfterId = null;
      });

      slot.addEventListener("drop", ev => {
        ev.preventDefault();
        slot.classList.remove("col-highlight");
        slot.classList.remove("empty");     // cleanup
        slot._insertAfterId = null;

        const draggedId = +ev.dataTransfer.getData("text/plain");
        const x = CARDS.find(k => +k.id === draggedId);
        if (!x) return;

        const list = byCol(colId);
        let newOrd;

        if (!slot._insertAfterId) {
          if (list.length === 0) {
            newOrd = ordNext([]); // e.g. 1000
          } else {
            const top = list[0];
            newOrd = (+top.ord || 0) - 10;
          }
        } else {
          const after = CARDS.find(k => +k.id === +slot._insertAfterId);
          newOrd = (+after.ord || 0) + 10;
        }

        x.col_id = colId;
        x.ord = newOrd;
        Object.assign(x, meta());

        qCoalesce({ t: "move", id: x.id, col_id: x.col_id, ord: x.ord });
        paint();
      });
    });
  }

  function formatNotes(s){
    if(!s) return "";
    return s.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
            .replace(/\*(.*?)\*/g,"<em>$1</em>")
            .replace(/~~(.*?)~~/g,"<del>$1</del>")
            .replace(/__(.*?)__/g,"<u>$1</u>")
            .replace(/\n/g,"<br>");
  }

  function wrapSelection(el, pre, post=pre){
    el.focus();
    const v=el.value, a=el.selectionStart??0, b=el.selectionEnd??0, sel=v.slice(a,b);
    const hadPre=v.slice(a-pre.length,a)===pre, hadPost=v.slice(b,b+post.length)===post;
    if(sel && hadPre && hadPost){
      const before=v.slice(0,a-pre.length), after=v.slice(b+post.length);
      el.value=before+sel+after; const pos=a-pre.length+sel.length; el.setSelectionRange(pos,pos); el.dispatchEvent(new Event("input",{bubbles:true})); return;
    }
    const wrapped = sel?`${pre}${sel}${post}`:`${pre}${post}`;
    el.value=v.slice(0,a)+wrapped+v.slice(b);
    const pos = sel ? (a+wrapped.length) : (a+pre.length);
    el.setSelectionRange(pos,pos); el.dispatchEvent(new Event("input",{bubbles:true}));
  }

  function inlineEdit(id, focus="notes"){
    const x=CARDS.find(k=>+k.id===+id); if(!x) return;
    const card=document.querySelector(`.kan-card[data-id="${id}"]`); if(!card) return;

    const bg=x.color||"#fff", fg=getContrast(bg);
    card.style.background=bg; card.style.color=fg;
    card.innerHTML=`
      <div class="d-flex align-items-start justify-content-between mb-2">
        <div class="d-flex align-items-center gap-2 flex-grow-1">
          <span class="kan-grip">⋮⋮</span>
          <input class="form-control form-control-sm" id="e_title" value="${esc(x.title||"")}" style="background:rgba(255,255,255,.9);">
        </div>
        <div class="d-flex gap-1 ms-2">
          <button class="btn btn-primary btn-sm" id="e_save">Save</button>
          <button class="btn btn-outline-secondary btn-sm" id="e_cancel">Cancel</button>
        </div>
      </div>
      <div class="d-flex gap-1 mb-2" id="formatting-toolbar">
        <button type="button" class="btn btn-sm btn-outline-dark" data-format="bold"><strong>B</strong></button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-format="italic"><em>I</em></button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-format="underline"><u>U</u></button>
        <button type="button" class="btn btn-sm btn-outline-dark" data-format="strike"><s>S</s></button>
      </div>
      <textarea class="form-control form-control-sm" id="e_notes" rows="3" placeholder="Notes…" style="background:rgba(255,255,255,.9);">${esc(x.detail||"")}</textarea>
    `;

    card.querySelectorAll('input,textarea,button').forEach(el=>{
      el.addEventListener('click', e=>e.stopPropagation());
      el.addEventListener('dblclick', e=>e.stopPropagation());
    });

    const t=$("#e_title"), n=$("#e_notes");
    (focus==="notes"?n:t)?.focus();
    if(focus==="notes" && n) n.setSelectionRange(n.value.length,n.value.length);
    if(focus==="title" && t) t.setSelectionRange(t.value.length,t.value.length);

    $$("#formatting-toolbar [data-format]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const m=btn.getAttribute("data-format");
        const map={bold:["**","**"], italic:["*","*"], underline:["__","__"], strike:["~~","~~"]};
        const [pre,post]=map[m]||["",""];
        wrapSelection(n,pre,post);
      });
    });

    const save=()=>{
      const v=(t.value||"").trim(); if(!v){ t.classList.add("is-invalid"); status("Title is required.","warn"); return; }
      x.title=v; x.detail=(n.value||"").trim(); Object.assign(x,meta());
      qCoalesce({t:"edit",id:x.id,title:x.title,detail:x.detail}); paint();
      status("Edited locally. Press Sync to save to DB.","ok");
    };
    const cancel=()=>{ paint(); status("Edit cancelled.","warn"); };

    $("#e_save")?.addEventListener("click",save);
    $("#e_cancel")?.addEventListener("click",cancel);
    card.addEventListener("keydown",ev=>{
      if(ev.key==="Enter"&&(ev.metaKey||ev.ctrlKey)) save();
      else if(ev.key==="Escape") cancel();
    });
  }

  function cardEl(x){
    const d=document.createElement("div");
    d.className="kan-card"; d.dataset.id=x.id;
    const bg=x.color||"#fff", fg=getContrast(bg);
    d.style.cssText=`background:${bg};color:${fg};border-radius:8px;`;

    d.innerHTML=`
      <div class="d-flex align-items-center justify-content-between">
        <div class="d-flex align-items-center gap-2">
          <span class="kan-grip" title="Drag">⋮⋮</span>
          <span class="j-title">${esc(x.title||"")}</span>
        </div>
        <div class="d-flex gap-1">
          <button class="btn btn-sm" data-edit="${x.id}"  style="background:rgba(255,255,255,.2);border-color:${fg};color:${fg}">Edit</button>
          <button class="btn btn-sm" data-color="${x.id}" style="background:rgba(255,255,255,.2);border-color:${fg};color:${fg}">🎨</button>
          ${VIEW!=="trash"
            ? `<button class="btn btn-sm" data-del="${x.id}" style="background:rgba(255,255,255,.2);border-color:${fg};color:${fg}">Trash</button>`
            : `<button class="btn btn-sm" data-undelete="${x.id}" style="background:rgba(255,255,255,.2);border-color:${fg};color:${fg}">Restore</button>`}
        </div>
      </div>
      ${x.detail?`<div class="small mt-1 j-notes" style="opacity:.85;">${formatNotes(x.detail)}</div>`:""}
      <div class="small mt-1" style="opacity:.7;"><i class="fa-regular fa-user"></i> ${esc(x.updated_by_name||"")} <span class="mx-1">•</span> <i class="fa-regular fa-clock"></i> ${x.updated_at?new Date(x.updated_at).toLocaleString():""}</div>
    `;

    attachDnD(d, x.id);
    d.addEventListener("dblclick", e=> e.preventDefault());
    d.addEventListener("click", ev=>{
      if(ev.target && ev.target.closest(".btn")) return;
      const focus = ev.target.closest(".j-title") ? "title" :
                    ev.target.closest(".j-notes") ? "notes" : "notes";
      inlineEdit(x.id, focus);
    });

    d.querySelector("[data-edit]")?.addEventListener("click", e=>{ e.stopPropagation(); inlineEdit(x.id,"title"); });
    d.querySelector("[data-color]")?.addEventListener("click", e=>{ e.stopPropagation(); showSwatch(e.currentTarget, x.id); });
    d.querySelector("[data-del]")?.addEventListener("click", e=>{ e.stopPropagation(); trashLocal(x.id); });
    d.querySelector("[data-undelete]")?.addEventListener("click", e=>{ e.stopPropagation(); undeleteLocal(x.id); });

    return d;
  }

  /* ---------- paint & preview ---------- */
  function paint(){
    if(!WRAP) return;
    const qtxt=(($("#kanSearch")||{}).value||"").toLowerCase();
    WRAP.innerHTML="";
    COLS.sort((a,b)=>(+a.ord||0)-(+b.ord||0)).forEach(c=>{
      const d=colEl(c), s=d.querySelector("[data-slot]");
      const list = byCol(c.id).filter(x=>!qtxt || (x.title||"").toLowerCase().includes(qtxt) || (x.detail||"").toLowerCase().includes(qtxt));
      s.innerHTML=""; list.forEach(x=>s.appendChild(cardEl(x)));
      if (list.length === 0) { s.classList.add('empty'); s.setAttribute('data-empty','Drop here'); }
      else { s.classList.remove('empty'); s.removeAttribute('data-empty'); }
      WRAP.appendChild(d);
    });
    bind(); enableDropzones();
  }

  // Replays local ops OVER fetched data so drafts are visible after reload
  function previewLocal(){
    for(const o of D.ops){
      if(o.t==="cadd"){
        if(!COLS.find(c=>String(c.id)===String(o.id)))
          COLS.push({ id:o.id, title:o.title||"", ord:o.ord||1000, color:"#e9ecef", archived:false, is_deleted:false });
      }
      if(o.t==="cren"){
        const c = COLS.find(x=>String(x.id)===String(o.id)); if(c){ if(o.title) c.title=o.title; if(o.color) c.color=o.color; }
      }
      if(o.t==="cdel"){
        COLS = COLS.filter(x=>String(x.id)!==String(o.id)); // simple preview: hide
      }
      if(o.t==="add"){
        if(!CARDS.find(x=>String(x.id)===String(o.id))){
          CARDS.push(Object.assign({ id:o.id, col_id:o.col_id, title:o.title||"", detail:o.detail||"", ord:o.ord||1000, color:o.color||"#e0e0e0", archived:false, is_deleted:false }, meta()));
        }
      }
      if(o.t==="edit" || o.t==="update"){
        const x = CARDS.find(k=>String(k.id)===String(o.id)); if(x){
          if(o.title!=null) x.title=o.title;
          if(o.detail!=null) x.detail=o.detail;
          if(o.col_id!=null) x.col_id=o.col_id;
          if(o.ord!=null) x.ord=o.ord;
          if(o.color!=null) x.color=o.color;
          if(o.is_deleted!=null) x.is_deleted=!!o.is_deleted;
        }
      }
      if(o.t==="move" || o.t==="reord"){
        const x = CARDS.find(k=>String(k.id)===String(o.id)); if(x){ if(o.col_id!=null) x.col_id=o.col_id; if(o.ord!=null) x.ord=o.ord; }
      }
      if(o.t==="trash"){ const x=CARDS.find(k=>String(k.id)===String(o.id)); if(x) x.is_deleted=true; }
      if(o.t==="undelete"){ const x=CARDS.find(k=>String(k.id)===String(o.id)); if(x) x.is_deleted=false; }
      if(o.t==="color"){ const x=CARDS.find(k=>String(k.id)===String(o.id)); if(x) x.color=o.color; }
    }
  }

  /* ---------- compaction (minimize cost) ---------- */
  function compactOps(ops){
    const colAdds=new Map(); const colUpdates=new Map(); const colDeletes=new Set();
    const cardAdds=new Map(); const cardUpdates=new Map(); const cardDeletes=new Set();

    for(const o of ops){
      if(o.t==="cadd"){ colAdds.set(o.id,{title:o.title,ord:o.ord}); colDeletes.delete(o.id); }
      else if(o.t==="cren"||o.t==="ccolor"){ const u=colUpdates.get(o.id)||{}; if(o.title) u.title=o.title; if(o.color) u.color=o.color; colUpdates.set(o.id,u); }
      else if(o.t==="cdel"){ if(colAdds.has(o.id)) { colAdds.delete(o.id); colUpdates.delete(o.id); } else colDeletes.add(o.id); }

      if(o.t==="add"){ cardAdds.set(o.id,{col_id:o.col_id,title:o.title,detail:o.detail,ord:o.ord,color:o.color}); cardDeletes.delete(o.id); }
      else if(["edit","move","reord","color","trash","undelete","update"].includes(o.t)){
        const u=cardUpdates.get(o.id)||{};
        if(o.title!=null) u.title=o.title;
        if(o.detail!=null) u.detail=o.detail;
        if(o.col_id!=null) u.col_id=o.col_id;
        if(o.ord!=null) u.ord=o.ord;
        if(o.color!=null) u.color=o.color;
        if(o.t==="trash") u.is_deleted=true;
        if(o.t==="undelete") u.is_deleted=false;
        cardUpdates.set(o.id,u);
      }
    }

    for(const [id,u] of cardUpdates){
      if(u.is_deleted===true && cardAdds.has(id)){ cardAdds.delete(id); cardUpdates.delete(id); }
    }

    const out=[];
    for(const [id,v] of colAdds) out.push({t:"cadd",id,title:v.title,ord:v.ord});
    for(const [id,u] of colUpdates) if(!colAdds.has(id) && !colDeletes.has(id)) out.push({t:"cren",id,title:u.title,color:u.color});
    for(const id of colDeletes) out.push({t:"cdel",id});

    for(const [id,v] of cardAdds) out.push({t:"add",id,col_id:v.col_id,title:v.title,detail:v.detail,ord:v.ord,color:v.color});
    for(const [id,u] of cardUpdates) if(!cardAdds.has(id) && !cardDeletes.has(id)){ out.push({t:"update",id, ...u}); }
    return out;
  }

  /* ---------- server I/O ---------- */
  async function ensureViewsOrFilters(){ return {colsTbl:"kan_columns", cardsTbl:"kan_cards", useFilter:true}; }

  async function load(){
    const sb=SB||await ensureSB(); if(!sb){ return; }
    const t=await ensureViewsOrFilters();

    let qCols=sb.from(t.colsTbl).select("id,title,ord,color,archived,is_deleted,updated_at");
    let qCards=sb.from(t.cardsTbl).select("id,col_id,title,detail,ord,color,archived,is_deleted,updated_by_id,updated_by_name,updated_at");
    if(t.useFilter){
      if(VIEW==="active"){ qCols=qCols.eq("archived",false).eq("is_deleted",false); qCards=qCards.eq("archived",false).eq("is_deleted",false); }
      else if(VIEW==="archived"){ qCols=qCols.eq("archived",true).eq("is_deleted",false); qCards=qCards.eq("archived",true).eq("is_deleted",false); }
      else if(VIEW==="trash"){ qCols=qCols.eq("is_deleted",true); qCards=qCards.eq("is_deleted",true); }
    }

    const r1=await qCols.order("ord",{ascending:true});
    const r2=await qCards.order("ord",{ascending:true});
    COLS = r1.error?[]:(r1.data||[]);
	CARDS = r2.error ? [] : (r2.data || []);

    // Seed defaults if empty
    if(VIEW==="active" && COLS.length===0){
      COLS=[{id:-101,title:"To Do",ord:100,color:"#e9ecef"},{id:-102,title:"Doing",ord:200,color:"#e9ecef"},{id:-103,title:"Done",ord:300,color:"#e9ecef"}];
      D.ops.push({t:"cadd",id:-101,title:"To Do",ord:100},{t:"cadd",id:-102,title:"Doing",ord:200},{t:"cadd",id:-103,title:"Done",ord:300});
      Sset(DRAFT_KEY,D);
    }

    // base stamps for conflict checking
    D.base={cols:{},cards:{}}; COLS.forEach(c=>D.base.cols[String(c.id)]=c.updated_at||null); CARDS.forEach(x=>D.base.cards[String(x.id)]=x.updated_at||null);
    D.baseAt=new Date().toISOString(); Sset(DRAFT_KEY,D);

    // show drafts on reload
    previewLocal();

    paint(); markDraft(); status("Board loaded.","ok");
  }

  async function runSync(){
    if(D.ops.length===0){ status("Nothing to sync.","warn"); return; }

    const sb=SB||await ensureSB(); if(!sb){ status("Supabase client missing.","err"); return; }

    const OPS = compactOps(D.ops);
    try{
      const { data, error } = await sb.rpc("apply_kan_ops", {
        p_ops: OPS,
        p_by_id: String(U.row||""),
        p_by_name: String((U.pi&&U.pi.n)||"")
      });
      if(error) throw error;

      const colMap = (data?.cols)||{}, cardMap=(data?.cards)||{};
      COLS.forEach(c=>{ if(String(c.id) in colMap) c.id = +colMap[String(c.id)]; });
      CARDS.forEach(x=>{ if(String(x.id) in cardMap) x.id = +cardMap[String(x.id)]; });

      D={ops:[],base:{cols:{},cards:{}},baseAt:null,tmp:-1}; Sset(DRAFT_KEY,D);
      await load(); setLastSynced(new Date().toLocaleTimeString()); status("Sync complete (single call).","ok");
    }catch(e){
      status("Sync failed: "+(e?.message||"Unknown error"),"err");
    }
  }

  /* ---------- local ops & bind ---------- */
  function addComposer(cid){ document.querySelector(`[data-add-input="${cid}"]`)?.focus(); }
  function addComposerGo(cid){ const i=document.querySelector(`[data-add-input="${cid}"]`); if(!i) return; const t=(i.value||"").trim(); if(!t) return; addLocal(cid,t,""); i.value=""; }
  function addColLocal(title){ const id=D.tmp--; COLS.push({id,title,ord:ordNext(COLS),color:"#e9ecef",archived:false,is_deleted:false}); q({t:"cadd",id,title,ord:ordNext(COLS)}); paint(); status("Column added (local).","ok"); }
  function renameColLocal(id){ const c=COLS.find(x=>+x.id===+id); if(!c) return; const t=prompt("Column title",c.title||""); if(t==null) return; c.title=t; q({t:"cren",id,title:t}); paint(); status("Column renamed (local).","ok"); }
  function trashColLocal(id){ if(CARDS.some(x=>+x.col_id===+id) && !confirm("Column not empty. Move to Trash?")) return; const c=COLS.find(x=>+x.id===+id); if(!c) return; c.is_deleted=true; c.deleted_at=new Date().toISOString(); q({t:"cdel",id,is_deleted:true}); CARDS=CARDS.filter(x=>+x.col_id!==+id); paint(); status("Column moved to trash (local).","warn"); }
  function undeleteColLocal(id){ const c=COLS.find(x=>+x.id===+id); if(!c) return; c.is_deleted=false; c.deleted_at=null; q({t:"cundelete",id,is_deleted:false}); paint(); status("Column restored (local).","ok"); }

  function addLocal(colId,title,detail,color){
    const id=D.tmp--;
    const x=Object.assign({id,col_id:colId,title,detail:detail||"",ord:ordNext(byCol(colId)),color:color||"#e0e0e0"},meta());
    CARDS.push(x);
    q({t:"add",id,col_id:colId,title:x.title,detail:x.detail,ord:x.ord,color:x.color});
    paint();
    status("Card added (local).","ok");
  }

  function trashLocal(id){
    const x = CARDS.find(k => +k.id === +id);
    if (!x) return;

    const resp = prompt('Type "YES" to move this card to Trash:', '');
    if (!resp || resp.trim().toUpperCase() !== 'YES') return;

    x.is_deleted = true;
    x.deleted_at = new Date().toISOString();
    Object.assign(x, meta());
    qCoalesce({ t: "trash", id: x.id, is_deleted: true });
    paint();
    status("Card moved to trash (local).","warn");
  }

  function undeleteLocal(id){
    const x=CARDS.find(k=>+k.id===+id);
    if(!x) return;
    x.is_deleted=false;
    x.deleted_at=null;
    Object.assign(x,meta());
    qCoalesce({t:"undelete",id:x.id,is_deleted:false});
    paint();
    status("Card restored (local).","ok");
  }

  function bind(){
    $$("[data-add]").forEach(b=>b.onclick=()=>addComposer(+b.getAttribute("data-add")));
    $$("[data-add-go]").forEach(b=>b.onclick=()=>addComposerGo(+b.getAttribute("data-add-go")));
    $$("[data-add-input]").forEach(i=>i.addEventListener("keydown",ev=>{ if(ev.key==="Enter") addComposerGo(+i.getAttribute("data-add-input")); }));
    $$("[data-rename-col]").forEach(b=>b.onclick=()=>renameColLocal(+b.getAttribute("data-rename-col")));
    $$("[data-cdel]").forEach(b=>b.onclick=()=>trashColLocal(+b.getAttribute("data-cdel")));
    $$("[data-cundo]").forEach(b=>b.onclick=()=>undeleteColLocal(+b.getAttribute("data-cundo")));
  }

  /* ---------- boot ---------- */
  document.addEventListener("DOMContentLoaded", async ()=>{
    WRAP=$("#kanWrap");
    const tip=document.createElement("div"); tip.id="kanStatus"; WRAP?.parentNode?.insertBefore(tip, WRAP);

    if(await guard()){
      $("#btnAddTask")?.addEventListener("click",()=>{const f=COLS[0]; if(!f){status("No columns yet.","warn");return} addLocal(f.id,"[Task] ","")});
      $("#btnAddBug") ?.addEventListener("click",()=>{const f=COLS[0]; if(!f){status("No columns yet.","warn");return} addLocal(f.id,"[Bug] ","")});
      $("#btnAddNote")?.addEventListener("click",()=>{const f=COLS[0]; if(!f){status("No columns yet.","warn");return} addLocal(f.id,"[Note] ","")});
      $("#btnAddCol") ?.addEventListener("click",()=>{const t=prompt("Column title"); if(!t) return; addColLocal(t)});

      $("#btnSync")   ?.addEventListener("click",()=>runSync());
      $("#btnDiscard")?.addEventListener("click",()=>{ if(D.ops.length===0){status("No drafts.","warn");return} if(confirm("Discard all local changes?")){ D={ops:[],base:{cols:{},cards:{}},baseAt:null,tmp:-1}; Sset(DRAFT_KEY,D); load(); status("Drafts discarded.","ok"); }});
      $("#btnReload") ?.addEventListener("click", async function(){ this.disabled=true; status("Reloading…","warn"); try{await load()} finally{this.disabled=false; status("Board reloaded.","ok");} });
      $("#btnUndo")   ?.addEventListener("click",()=>{ if(D.ops.length>0){ D.ops.pop(); Sset(DRAFT_KEY,D); paint(); markDraft(); status("Undid last local change.","ok"); }else{status("Nothing to undo.","warn")}});
      $("#kanSearch") ?.addEventListener("input", paint);
      $("#fltActive")   ?.addEventListener("change",e=>{ if(e.target.checked){ VIEW="active";   load(); }});
      $("#fltArchived") ?.addEventListener("change",e=>{ if(e.target.checked){ VIEW="archived"; load(); }});
      $("#fltTrash")    ?.addEventListener("change",e=>{ if(e.target.checked){ VIEW="trash";    load(); }});

      await load(); markDraft(); setLastSynced("—");
    }
  });
})();