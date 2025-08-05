// UAP Membership – full client script w/ PDF template fill (PDF-LIB) //
let otpVerified = false;

(() => {
  const d = document,
        f = d.getElementById('membershipForm');
  if (!f) return;

  // ----------------- utils ----------------- //
  const q  = (s, r=d)=>r.querySelector(s);
  const qa = (s, r=d)=>[...r.querySelectorAll(s)];
  const ls = localStorage;

  const now = new Date();
  const yr  = now.getFullYear();
  const td  = now.toISOString().slice(0, 10);

  const API = 'https://uap-apply.manilacorinthianchapter.workers.dev/apply';

  // === PDF-LIB fill (fixed template + your coords + auto-align) === //
  const TEMPLATE_URL = 'https://pdf-cors.uapmnlcorinthian.com/';

  // Your coordinates (as provided; small typos cleaned)
  const COORDS_RAW = {
    1: {
      // Membership type
      type_New:      { x: 641,  y: 328.1, w: 22,  h: 15 },
      type_Existing: { x: 781,  y: 329.1, w: 21,  h: 15 },

      // Photo
      photo_b64:     { x: 927,  y: 321.1, w: 237, h: 264 },

      // Identity
      lastName:      { x: 38,   y: 265.1, w: 161, h: 24, size: 10 },
      firstName:     { x: 204,  y: 264.1, w: 182, h: 24, size: 10 },
      middleName:    { x: 390,  y: 265.1, w: 177, h: 22, size: 10 },
      birthdate:     { x: 37,   y: 304.4, w: 162, h: 15, size: 10 },
      birthplace:    { x: 204,  y: 303.4, w: 182, h: 19, size: 10 },
      sex:           { x: 389,  y: 303.4, w: 86,  h: 16, size: 10 },
      civilStatus:   { x: 478,  y: 302.4, w: 91,  h: 18, size: 10 },
      homeAddress:   { x: 38,   y: 336.4, w: 347, h: 23, size: 10 },
      tel:           { x: 389,  y: 335.4, w: 87,  h: 26, size: 10 },
      fax:           { x: 479,  y: 335.4, w: 90,  h: 25, size: 10 },
      mobile:        { x: 572,  y: 375.4, w: 147, h: 18, size: 10 },
      facebook:      { x: 36,   y: 375.4, w: 163, h: 17, size: 10 },
      twitter:       { x: 203,  y: 374.4, w: 183, h: 17, size: 10 },
      prc:           { x: 389,  y: 375.4, w: 86,  h: 17, size: 10 },
      uap:           { x: 481,  y: 375.4, w: 89,  h: 17, size: 10 },
      email:         { x: 573,  y: 409.4, w: 146, h: 24, size: 10 },

      // Company / Office
      co_name_addr:  { x: 37,   y: 409.4, w: 349, h: 42, size: 10 },
      co_tel:        { x: 391,  y: 411.4, w: 84,  h: 22, size: 10 },
      co_fax:        { x: 480,  y: 408.4, w: 89,  h: 26, size: 10 },
      // co_email: intentionally omitted per your note
      co_designation:{ x: 479,  y: 439.4, w: 240, h: 11, size: 10 },

      // Education
      bs_school:     { x: 39,   y: 465.4, w: 435, h: 19, size: 10 },
      bs_year:       { x: 479,  y: 465.4, w: 126, h: 17, size: 10 },
      bs_honors:     { x: 616,  y: 464.4, w: 103, h: 20, size: 10 },

      pg_school:     { x: 37,   y: 498.4, w: 215, h: 16, size: 10 },
      pg_year:       { x: 481,  y: 499.4, w: 131, h: 15, size: 10 },
      pg_honors:     { x: 617,  y: 498.4, w: 103, h: 18, size: 10 },

      sp_course:     { x: 38,   y: 532.4, w: 436, h: 16, size: 10 },
      sp_school:     { x: 38,   y: 532.4, w: 436, h: 16, size: 10 },
      sp_year:       { x: 618,  y: 532.4, w: 101, h: 18, size: 10 },

      awards:        { x: 39,   y: 564.4, w: 680, h: 18, size: 10 },

      // Professional information
      profession:    { x: 66,   y: 613.5, w: 186, h: 14, size: 10 },
      prc_no:        { x: 258,  y: 612.5, w: 128, h: 14, size: 10 },
      prc_issued:    { x: 390,  y: 614.5, w: 178, h: 12, size: 10 },
      prc_valid:     { x: 573,  y: 613.5, w: 146, h: 14, size: 10 },

      ex1:           { x: 66,   y: 678.5, w: 186, h: 13, size: 10 },
      xp1:           { x: 258,  y: 678.5, w: 128, h: 13, size: 10 },
      ex2:           { x: 67,   y: 695.5, w: 186, h: 13, size: 10 },
      xp2:           { x: 257,  y: 696.5, w: 129, h: 12, size: 10 },
      ex3:           { x: 66,   y: 713.5, w: 187, h: 14, size: 10 },
      xp3:           { x: 260,  y: 713.5, w: 126, h: 14, size: 10 },
      ex4:           { x: 66,   y: 732.5, w: 186, h: 13, size: 10 },
      xp4:           { x: 258,  y: 730.5, w: 127, h: 14, size: 10 },

      // Practice checkboxes
      practice_Academe:            { x: 390,  y: 677.5, w: 21, h: 12 },
      practice_Government:         { x: 390,  y: 695.5, w: 22, h: 13 },
      practice_PrivatePractice:    { x: 388,  y: 711.5, w: 23, h: 15 },
      practice_PrivateCorporation: { x: 389,  y: 732.5, w: 21, h: 12 },

      // Services checkboxes + others
      svc_PreDesign:         { x: 695.5, y: 825.5, w: 11, h: 11 },
      svc_Design:            { x: 789.5, y: 825.5, w: 15, h: 13 },
      svc_SpecializedAllied: { x: 695.5, y: 845.5, w: 13, h: 15 },
      svc_Construction:      { x: 789.5, y: 846.5, w: 13, h: 14 },
      svc_PostConstruction:  { x: 694.5, y: 866.5, w: 14, h: 17 },
      svc_Consulting:        { x: 694.5, y: 888.5, w: 14, h: 17 },
      svc_DesignBuild:       { x: 790.5, y: 867.5, w: 13, h: 17 },
      svc_Others:            { x: 790.5, y: 889.5, w: 14, h: 14 },
      svc_others:            { x: 812.5, y: 894.5, w: 56, h: 9,  size: 10 },

      // CPD rows
      cpd1_title: { x: 81.5, y: 935.2,  w: 386, h: 15, size: 10 },
      cpd1_date:  { x: 473.5,y: 935.2,  w: 102, h: 15, size: 10 },
      cpd1_units: { x: 587.5,y: 934.2,  w: 102, h: 18, size: 10 },
      cpd1_part:  { x: 697.5,y: 934.2,  w: 175, h: 16, size: 10 },

      cpd2_title: { x: 81.5, y: 956.6,  w: 385, h: 15, size: 10 },
      cpd2_date:  { x: 473.5,y: 956.6,  w: 102, h: 15, size: 10 },
      cpd2_units: { x: 587.5,y: 956.6,  w: 102, h: 18, size: 10 },
      cpd2_part:  { x: 697.5,y: 956.6,  w: 175, h: 16, size: 10 },

      cpd3_title: { x: 81.5, y: 977,   w: 385, h: 15, size: 10 },
      cpd3_date:  { x: 473.5,y: 977,   w: 102, h: 15, size: 10 },
      cpd3_units: { x: 587.5,y: 977,   w: 102, h: 18, size: 10 },
      cpd3_part:  { x: 697.5,y: 977,   w: 175, h: 16, size: 10 },

      cpd4_title: { x: 81.5, y: 1001,  w: 385, h: 15, size: 10 },
      cpd4_date:  { x: 473.5,y: 1001,  w: 102, h: 15, size: 10 },
      cpd4_units: { x: 587.5,y: 1001,  w: 102, h: 18, size: 10 },
      cpd4_part:  { x: 697.5,y: 1001,  w: 175, h: 16, size: 10 }
    },
    2: {
      // Membership Status (page 2)
      cur_chap:      { x: 176,  y: 1065,  w: 292, h: 15, size: 10 },
      cur_res:       { x: 473,  y: 1065,  w: 105, h: 15, size: 10 },
      cur_pos:       { x: 585,  y: 1065,  w: 288, h: 15, size: 10 },

      prev_chap:     { x: 176,  y: 1077,  w: 292, h: 15, size: 10 },
      prev_res:      { x: 473,  y: 1077,  w: 105, h: 15, size: 10 },
      prev_pos:      { x: 585,  y: 1077,  w: 288, h: 15, size: 10 },

      natpos1:       { x: 82,   y: 1130,  w: 496, h: 15, size: 10 },
      natpos1_dates: { x: 586,  y: 1130,  w: 286, h: 15, size: 10 },
      natpos2:       { x: 82,   y: 1150,  w: 496, h: 15, size: 10 },
      natpos2_dates: { x: 586,  y: 1150,  w: 286, h: 15, size: 10 },
      natpos3:       { x: 82,   y: 1173,  w: 496, h: 15, size: 10 },
      natpos3_dates: { x: 586,  y: 1173,  w: 286, h: 15, size: 10 },

      cof_year:      { x: 353.5,y: 1194.6,w: 48,  h: 16, size: 10 },
      cof_exp:       { x: 531.5,y: 1193.6,w: 340, h: 17, size: 10 },

      // Signature & date on page 2
      signature_b64: { x: 590.5,y: 1226.6,w: 286, h: 60 },
      sig_date:      { x: 585.5,y: 1267.6,w: 100, h: 10, size: 10 }
    }
  };

  // Which keys are checkboxes / images / multiline
  const CHECK_KEYS = new Set([
    'type_New','type_Existing',
    'practice_Academe','practice_Government','practice_PrivatePractice','practice_PrivateCorporation',
    'svc_PreDesign','svc_Design','svc_SpecializedAllied','svc_Construction','svc_PostConstruction','svc_Consulting','svc_DesignBuild','svc_Others'
  ]);
  const IMAGE_KEYS = new Set(['photo_b64','signature_b64']);
  const MULTILINE_KEYS = new Set(['homeAddress','co_name_addr','awards']);

  // Snap/align items that are “close enough”
  const SNAP = { x: 4, y: 3 }; // px tolerance
  function median(vals){ const a = vals.slice().sort((p,q)=>p-q); const m=Math.floor(a.length/2); return a.length%2?a[m]:(a[m-1]+a[m])/2; }
  function clusterBy(values, key, tol){
    const items = values.slice().sort((a,b)=>a[key]-b[key]);
    const clusters=[]; let current=[];
    for(const it of items){
      if(!current.length) current.push(it);
      else{
        const ref = median(current.map(v=>v[key]));
        if(Math.abs(it[key]-ref) <= tol) current.push(it);
        else { clusters.push(current); current=[it]; }
      }
    }
    if(current.length) clusters.push(current);
    return clusters;
  }
  function normalizeCoords(raw) {
    const out = { 1: {}, 2: {} };
    for (const pageNo of [1,2]) {
      const entries = Object.entries(raw[pageNo] || {}).map(([k,v])=>({k, ...v}));
      // Snap Y rows
      for (const group of clusterBy(entries,'y',SNAP.y)) {
        if (group.length < 2) continue;
        const ymed = Math.round(median(group.map(g=>g.y))*10)/10;
        group.forEach(g => { g.y = ymed; });
      }
      // Snap X columns
      for (const group of clusterBy(entries,'x',SNAP.x)) {
        if (group.length < 2) continue;
        const xmed = Math.round(median(group.map(g=>g.x))*10)/10;
        group.forEach(g => { g.x = xmed; });
      }
      // Rebuild
      for (const g of entries) {
        const {k, x,y,w,h,size} = g;
        out[pageNo][k] = { x,y,w,h, ...(size?{size}:{}) };
      }
    }
    return out;
  }
  const COORDS = normalizeCoords(COORDS_RAW);

  // Build array-aware object from form
  function formToObject(form){
    const fd = new FormData(form);
    const o = {};
    for (const [k,v] of fd.entries()){
      if (o[k] !== undefined){
        if (Array.isArray(o[k])) o[k].push(v);
        else o[k] = [o[k], v];
      } else o[k] = v;
    }
    return o;
  }

  // Checkbox → booleans for PDF
  function computeBooleansForPdf(body) {
    body.type_New = (body.type === 'New');
    body.type_Existing = (body.type === 'Existing');

    const practices = Array.isArray(body['practice[]']) ? body['practice[]'] :
                      Array.isArray(body.practice) ? body.practice : [];
    body.practice_Academe            = practices.includes('Academe');
    body.practice_Government         = practices.includes('Government');
    body.practice_PrivatePractice    = practices.includes('Private Practice');
    body.practice_PrivateCorporation = practices.includes('Private Corporation');

    const svcs = Array.isArray(body['svc[]']) ? body['svc[]'] :
                 Array.isArray(body.svc) ? body.svc : [];
    body.svc_PreDesign         = svcs.includes('Pre-Design');
    body.svc_Design            = svcs.includes('Design');
    body.svc_SpecializedAllied = svcs.includes('Specialized/Allied');
    body.svc_Construction      = svcs.includes('Construction');
    body.svc_PostConstruction  = svcs.includes('Post-Construction');
    body.svc_Consulting        = svcs.includes('Consulting');
    body.svc_DesignBuild       = svcs.includes('Design-Build');
    body.svc_Others            = svcs.includes('Others');
  }

  // Ensure PDF-LIB is available (local path first, CDN fallback)
  async function ensurePdfLib(){
    if (window.PDFLib) return true;
    const tryLoad = (src)=>new Promise(res=>{
      const s = document.createElement('script');
      s.src = src; s.onload=()=>res(true); s.onerror=()=>res(false);
      document.head.appendChild(s);
    });
    if (await tryLoad('/lib/pdf-lib/pdf-lib.min.js')) return true;
    return await tryLoad('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js');
  }

  // Download filled PDF
  async function downloadFilledPdf(body) {
    if (!(await ensurePdfLib())) {
      alert('PDF-LIB not found. Please include /lib/pdf-lib/pdf-lib.min.js');
      return;
    }
    const { PDFDocument, StandardFonts, rgb } = PDFLib;

    const tplBytes = await fetch(TEMPLATE_URL).then(r => {
      if (!r.ok) throw new Error('Template PDF not found');
      return r.arrayBuffer();
    });
    const pdfDoc = await PDFDocument.load(tplBytes, { updateMetadata: false });

    const helv = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helvBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const fmtDate = v => (v && /^\d{4}-\d{2}-\d{2}$/.test(v)) ? v : (v || '');

    // derive booleans from groups
    computeBooleansForPdf(body);

    // draw helper
    function clipToWidth(s, w, sz, font) {
      if (!s) return '';
      let out = '';
      for (const ch of s) {
        const t = out + ch;
        if (font.widthOfTextAtSize(t, sz) <= w) out = t;
        else break;
      }
      return out;
    }
    function drawWrapped(page, s, x, yTop, w, h, sz, font) {
      if (!s) return;
      const lineH = sz + 2;
      const maxLines = Math.max(1, Math.floor(h / lineH));
      const words = String(s).split(/\s+/);
      const lines = [];
      let curr = '';
      for (const wrd of words) {
        const t = curr ? curr + ' ' + wrd : wrd;
        if (font.widthOfTextAtSize(t, sz) <= w) curr = t;
        else { if (curr) lines.push(curr); curr = wrd; }
        if (lines.length >= maxLines) break;
      }
      if (curr && lines.length < maxLines) lines.push(curr);
      for (let i = 0; i < lines.length; i++) {
        page.drawText(lines[i], { x, y: yTop - i*lineH, size: sz, font, color: rgb(0,0,0) });
      }
    }

    for (const [pageNo, map] of Object.entries(COORDS)) {
      const pIndex = parseInt(pageNo,10)-1;
      const page = pdfDoc.getPage(pIndex);
      if (!page) continue;
      const ph = page.getHeight();
      const tl2bl = (y,h=0,pad=2)=> ph - y - (h||0) + pad;

      for (const [key, box] of Object.entries(map)) {
        const size = box.size || 10;
        // Use exact key if present; else try base (e.g., 'cpd1_part' base 'cpd1_part' same)
        let valRaw = body[key];
        if (valRaw === undefined) {
          // try without suffix after underscore (e.g., 'prc_no' → 'prc')
          const base = key.replace(/_.+$/,'');
          if (body[base] !== undefined) valRaw = body[base];
        }

        // Normalize dates
        const val = (/(_date|birthdate|prc_issued|prc_valid|sig_date)$/i.test(key)) ? fmtDate(valRaw) : (valRaw ?? '');

        if (IMAGE_KEYS.has(key) && val) {
          try {
            const isPng = /^data:image\/png/i.test(val);
            const img = isPng ? await pdfDoc.embedPng(val) : await pdfDoc.embedJpg(val);
            page.drawImage(img, { x: box.x, y: tl2bl(box.y, box.h, 0), width: box.w, height: box.h });
          } catch {}
          continue;
        }

        if (CHECK_KEYS.has(key)) {
          if (val) {
            const cx = box.x + Math.min(box.w, 12) * 0.15;
            const cy = tl2bl(box.y, box.h, 0) + Math.min(box.h, 12) * 0.15;
            page.drawText('✔', { x: cx, y: cy, size: Math.min(box.w, box.h, 12), font: helvBold, color: rgb(0,0,0) });
          }
          continue;
        }

        const x = box.x;
        const y = tl2bl(box.y, box.h);
        const text = String(val ?? '');

        if (MULTILINE_KEYS.has(key) || (box.h && box.h > size + 4)) {
          drawWrapped(page, text, x, y, box.w, box.h, size, helv);
        } else {
          const clipped = clipToWidth(text, box.w, size, helv);
          page.drawText(clipped, { x, y, size, font: helv, color: rgb(0,0,0) });
        }
      }
    }

    const out = await pdfDoc.save();
    const url = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'uap-application.pdf';
    a.click();
    URL.revokeObjectURL(url);
  }

  // ----------------- Signature Pad ----------------- //
  const sigCanvas      = d.getElementById('sigCanvas'),
        sigPreview     = d.getElementById('sigPreview'),
        sigPlaceholder = d.getElementById('sigPlaceholder'),
        sigDrawInput   = d.getElementById('sigDraw'),
        openSigBtn     = d.getElementById('openSig'),
        clearSigBtn    = d.getElementById('clearSig'),
        useSigBtn      = d.getElementById('useSig'),
        sigPadDialog   = d.getElementById('sigPadDialog');

  let sigCtx, sigPaths = [], sigCurrentPath = [], isDrawing = false, sigLastX, sigLastY, sigDPR;
  let hasSignature = false, sigUndoStack = [];

  function initSignaturePad() {
    if (!sigCanvas) return;
    const cssWidth = sigCanvas.offsetWidth, cssHeight = sigCanvas.offsetHeight;
    sigDPR = window.devicePixelRatio || 1;
    sigCanvas.width  = cssWidth  * sigDPR;
    sigCanvas.height = cssHeight * sigDPR;
    sigCanvas.style.width  = cssWidth  + 'px';
    sigCanvas.style.height = cssHeight + 'px';
    sigCtx = sigCanvas.getContext('2d', { willReadFrequently: true });
    sigCtx.setTransform(1, 0, 0, 1, 0, 0);
    sigCtx.scale(sigDPR, sigDPR);
    sigCtx.lineCap   = 'round';
    sigCtx.lineJoin  = 'round';
    sigCtx.strokeStyle = '#111';
    sigCtx.lineWidth = 2;
    clearSignature();
  }

  function getPointerPos(e) {
    const r = sigCanvas.getBoundingClientRect();
    let x, y;
    if (e.touches && e.touches[0]) { x = e.touches[0].clientX - r.left; y = e.touches[0].clientY - r.top; }
    else { x = e.clientX - r.left; y = e.clientY - r.top; }
    return { x, y };
  }

  function startDrawing(e) {
    isDrawing = true;
    const p = getPointerPos(e);
    sigLastX = p.x; sigLastY = p.y;
    sigCurrentPath = [{ x: sigLastX, y: sigLastY }];
    sigPaths.push(sigCurrentPath);
    sigUndoStack.push(sigCtx.getImageData(0, 0, sigCanvas.width, sigCanvas.height));
  }

  function draw(e) {
    if (!isDrawing) return;
    e.preventDefault();
    const p = getPointerPos(e);
    sigCtx.beginPath();
    sigCtx.moveTo(sigLastX, sigLastY);
    sigCtx.lineTo(p.x, p.y);
    sigCtx.stroke();
    sigCurrentPath.push({ x: p.x, y: p.y });
    sigLastX = p.x; sigLastY = p.y;
    if (sigCurrentPath.length > 5 && !hasSignature) hasSignature = true;
  }

  function stopDrawing() {
    isDrawing = false;
    if (sigCurrentPath.length > 0) {
      sigUndoStack.push(sigCtx.getImageData(0, 0, sigCanvas.width, sigCanvas.height));
    }
  }

  function clearSignature() {
    if (!sigCtx) return;
    sigCtx.clearRect(0, 0, sigCanvas.width, sigCanvas.height);
    sigPaths = []; sigCurrentPath = []; sigUndoStack = []; hasSignature = false;
  }

  function saveSignature() {
    const cssWidth = sigCanvas.offsetWidth, cssHeight = sigCanvas.offsetHeight;
    const c = d.createElement('canvas'); c.width = cssWidth; c.height = cssHeight;
    const t = c.getContext('2d');
    t.drawImage(sigCanvas, 0, 0, sigCanvas.width, sigCanvas.height, 0, 0, cssWidth, cssHeight);
    const dataURL = c.toDataURL('image/png');
    sigDrawInput.value = dataURL;
    sigPreview.src = dataURL;
    sigPreview.style.display = 'block';
    sigPlaceholder.style.display = 'none';
    sigPadDialog?.hide();
  }

  f.addEventListener('input', e => {
    if (e.target.classList.contains('field-error') && e.target.checkValidity()) {
      e.target.classList.remove('field-error');
    }
  });

  if (sigCanvas) {
    initSignaturePad();
    sigCanvas.addEventListener('pointerdown', startDrawing);
    sigCanvas.addEventListener('pointermove',  draw);
    sigCanvas.addEventListener('pointerup',    stopDrawing);
    sigCanvas.addEventListener('pointercancel',stopDrawing);
    sigCanvas.addEventListener('touchstart', startDrawing, { passive:false });
    sigCanvas.addEventListener('touchmove',  draw,         { passive:false });
    sigCanvas.addEventListener('touchend',   stopDrawing,  { passive:false });
    sigCanvas.addEventListener('touchcancel',stopDrawing,  { passive:false });
  }
  q('#openSig')?.addEventListener('click', () => { setTimeout(initSignaturePad, 50); sigPadDialog?.show(); });
  q('#clearSig')?.addEventListener('click', clearSignature);
  q('#useSig')?.addEventListener('click',   saveSignature);

  // ----------------- Limits & formatting ----------------- 
  const bd = q('[name=birthdate]');
  if (bd) bd.max = td;

  ['bs_year', 'pg_year', 'sp_year', 'cof_year'].forEach(n => {
    const e = q(`[name=${n}]`); if (e) e.max = yr;
  });

  ['tel', 'fax', 'co_tel', 'co_fax'].forEach(n => {
    const e = q(`[name=${n}]`);
    if (e) e.addEventListener('blur', () => {
      e.value = e.value.replace(/[^0-9+\-() ]/g, '').replace(/\s+/g, ' ').trim();
    });
  });

  ['firstName', 'middleName', 'lastName', 'cur_chap', 'prev_chap', 'co_designation'].forEach(n => {
    const e = q(`[name=${n}]`);
    if (e) e.addEventListener('blur', () => {
      e.value = e.value.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase());
    });
  });

  const badDomains = ['mailinator.com','10minutemail.com','guerrillamail.com','tempmail.com'];
  ['email', 'co_email'].forEach(n => {
    const e = q(`[name=${n}]`); if (!e) return;
    e.addEventListener('blur',   () => { e.value = e.value.trim().toLowerCase(); });
    e.addEventListener('change', () => {
      const host = (e.value.split('@')[1] || '').toLowerCase();
      e.setCustomValidity(badDomains.includes(host) ? 'Please use a non-disposable email' : '');
      otpVerified = false; updateOtpUi(); updateSubmitState();
    });
  });

  // ----------------- OTP ----------------- //
  const sendOtpBtn  = q('#sendOtpBtn'),
        otpInput    = q('#otpInput'),
        verifyOtpBtn= q('#verifyOtpBtn'),
        otpStatus   = q('#otpStatus'),
        emailInput  = q('[name="email"]'),
        submitBtn   = q('#submitBtn') || q('button[type=submit]');

  function sigOk(){ return (q('#sigDraw')?.value || '').length > 50 || hasSignature; }
  function grpOk(){ return qa('input[name="practice[]"]:checked').length + qa('input[name="svc[]"]:checked').length > 0; }

  function ageOk(){
    if (!bd?.value) return true;
    const b = new Date(bd.value), n = new Date();
    let a = n.getFullYear() - b.getFullYear();
    const m = n.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && n.getDate() < b.getDate())) a--;
    bd.setCustomValidity(a < 18 ? 'Must be at least 18 years old' : '');
    return a >= 18;
  }

  function xpOk(){
    const di = q('[name=prc_issued]'); if (!di?.value) return true;
    const yearsSince = yr - new Date(di.value).getFullYear();
    let ok = true;
    qa('[name^=xp]').forEach(e => {
      if (e.value && +e.value > yearsSince + 5) { e.setCustomValidity('Check “Years of Practice” against PRC issue date'); ok = false; }
      else e.setCustomValidity('');
    });
    return ok;
  }

  function isFormValid(){
    return f.checkValidity() && sigOk() && grpOk() && ageOk() && xpOk() && q('#agreeInfo')?.checked && otpVerified;
  }

  function updateSubmitState(){ if (submitBtn) submitBtn.disabled = !isFormValid(); }

  function updateOtpUi(){
    if (!otpStatus || !otpInput || !verifyOtpBtn) return;
    if (otpVerified) {
      otpStatus.textContent = 'Verified!';
      otpStatus.style.color = 'green';
      otpInput.disabled = true;
      verifyOtpBtn.disabled = true;
    } else {
      otpStatus.textContent = '';
      otpStatus.style.color = '';
      otpInput.disabled = false;
      verifyOtpBtn.disabled = false;
    }
  }

  sendOtpBtn?.addEventListener('click', async () => {
    if (!emailInput || !emailInput.value) { alert('Please enter your email.'); return; }
    sendOtpBtn.disabled = true; const t = sendOtpBtn.textContent; sendOtpBtn.textContent = 'Sending...';
    try{
      const r = await fetch('https://fvaahtqjusfniadwvoyw.functions.supabase.co/send-otp', {
        method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ email: emailInput.value })
      });
      if (r.ok) alert('OTP sent to your email.'); else alert('Failed to send OTP.');
    } catch { alert('Network error.'); }
    sendOtpBtn.disabled = false; sendOtpBtn.textContent = t;
  });

  verifyOtpBtn?.addEventListener('click', async () => {
    if (!otpInput.value.match(/^\d{6}$/)) { otpStatus.textContent='Enter 6-digit OTP'; otpStatus.style.color='red'; return; }
    verifyOtpBtn.disabled = true; otpStatus.textContent='Verifying...'; otpStatus.style.color='#444';
    try{
      const r = await fetch('https://fvaahtqjusfniadwvoyw.functions.supabase.co/verify-otp', {
        method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ email: emailInput.value, otp: otpInput.value })
      });
      const t = await r.text();
      if (r.ok && t === 'Verified') { otpVerified = true; }
      else { otpVerified = false; otpStatus.textContent='Incorrect or expired.'; otpStatus.style.color='red'; }
      updateOtpUi(); updateSubmitState();
    } catch {
      otpVerified = false; otpStatus.textContent='Network error.'; otpStatus.style.color='red'; updateSubmitState();
    }
    verifyOtpBtn.disabled = false;
  });

  otpInput?.addEventListener('input', () => { otpVerified = false; updateOtpUi(); updateSubmitState(); });
  emailInput?.addEventListener('input', () => { otpVerified = false; updateOtpUi(); updateSubmitState(); });

  // ----------------- Photo preview ----------------- //
  const fi = d.getElementById('ph'), phP = d.getElementById('phPrev');
  const removePhotoBtn = d.createElement('button');
  removePhotoBtn.className = 'btn btn-outline-danger btn-sm mt-2';
  removePhotoBtn.textContent = 'Remove Photo';
  removePhotoBtn.style.display = 'none';
  const photoCtrls = q('.photo-ctrls'); if (photoCtrls) photoCtrls.appendChild(removePhotoBtn);

  function processImage(file){
    return new Promise((res, rej)=>{
      if (!file.type.match('image.*')) { rej('File is not an image'); return; }
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const c = d.createElement('canvas'), ctx = c.getContext('2d');
          const size = Math.min(img.width, img.height), sx = (img.width-size)/2, sy = (img.height-size)/2;
          const maxSize = 800; c.width = maxSize; c.height = maxSize;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);
          const dataURL = c.toDataURL('image/jpeg', 0.85); res(dataURL);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  fi?.addEventListener('change', async () => {
    const f0 = fi.files[0]; if (!f0) return;
    if (f0.size > 2*1024*1024) { fi.setCustomValidity('Max photo size 2 MB'); return; }
    try{
      const dataURL = await processImage(f0);
      phP.src = dataURL; fi.setCustomValidity(''); removePhotoBtn.style.display = 'block';
    } catch (err){ console.error('Image processing error:', err); fi.setCustomValidity('Invalid image file'); }
  });

  removePhotoBtn.addEventListener('click', () => {
    if (!fi || !phP) return;
    fi.value = '';
    phP.src = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><rect width='100%' height='100%' fill='white'/><circle cx='80' cy='60' r='28' fill='%23d1d5db'/><rect x='30' y='100' width='100' height='40' rx='20' fill='%23d1d5db'/></svg>";
    removePhotoBtn.style.display = 'none';
    fi.setCustomValidity('');
  });

  // ----------------- Toggles & derived required ----------------- //
  const svcO = q('[name=svc_others]'), chkO = d.getElementById('s8');
  if (svcO && chkO) {
    chkO.addEventListener('change', () => {
      svcO.style.display = chkO.checked ? 'block' : 'none';
      if (!chkO.checked) svcO.value = '';
    });
  }

  function needCo(){
    const a = q('[name=co_name_addr]'),
          t = q('[name=co_tel]'),
          f2= q('[name=co_fax]'),
          e = q('[name=co_email]'),
          g = q('[name=co_designation]');
    const on = [a,t,f2,e,g].some(x=>x && x.value.trim());
    [e,g].forEach(x => x && (x.required = on));
  }
  ;['co_name_addr','co_tel','co_fax','co_email','co_designation'].forEach(n=>{
    const el = q(`[name=${n}]`); if (el) el.addEventListener('input', needCo);
  });

  // ----------------- CPD tally ----------------- //
  function tallyCPD(){
    const tot = ['1','2','3','4'].reduce((s,i)=>{
      const el = q(`[name=cpd${i}_units]`);
      return s + (parseFloat(el ? el.value : 0) || 0);
    }, 0);
    const t = q('#cpdTot'); if (t) t.textContent = tot.toFixed(1);
  }
  ;['1','2','3','4'].forEach(i => q(`[name=cpd${i}_units]`)?.addEventListener('input', tallyCPD));
  tallyCPD();

  // ----------------- Basic validations ----------------- //
  function atLeastOneGroup(){
    const a = qa('input[name="practice[]"]:checked').length,
          b = qa('input[name="svc[]"]:checked').length;
    if (a + b === 0) { alert('Select at least one “Type of Practice” or “Service Rendered”.'); return false; }
    return true;
  }

  function highlightInvalidFields(form){
    form.querySelectorAll('.field-error').forEach(el => el.classList.remove('field-error'));
    let firstInvalid = null;
    form.querySelectorAll('[required]').forEach(el => {
      if (!el.checkValidity()) { el.classList.add('field-error'); if (!firstInvalid) firstInvalid = el; }
    });
    if (firstInvalid){
      firstInvalid.scrollIntoView({ behavior:'smooth', block:'center' });
      firstInvalid.focus();
    }
  }

  // ----------------- Draft save/restore ----------------- //
  function saveDraft(){
    const o = {};
    new FormData(f).forEach((v,k) => (o[k] ? (Array.isArray(o[k]) ? o[k].push(v) : o[k] = [o[k], v]) : o[k] = v));
    o.photo_b64     = phP?.src?.startsWith('data:image') ? phP.src : null;
    o.signature_b64 = q('#sigDraw')?.value || null;
    o.hasAcknowledged = q('#agreeInfo')?.checked;
    ls.setItem('uapForm', JSON.stringify(o));
    const n = new Date(); q('#saveTimestamp').textContent = `Last saved: ${n.toLocaleTimeString()}`;
  }

  function loadDraft(){
    try{
      const o = JSON.parse(ls.getItem('uapForm') || '{}');
      Object.entries(o).forEach(([k,v])=>{
        const el = f.querySelector(`[name="${k}"]`);
        if (!el) {
          qa(`[name="${k}"]`).forEach(e=>{
            if (['checkbox','radio'].includes(e.type)) e.checked = Array.isArray(v) ? v.includes(e.value) : v == e.value;
          });
          return;
        }
        if (['checkbox','radio'].includes(el.type)){
          qa(`[name="${k}"]`).forEach(e => { e.checked = Array.isArray(v) ? v.includes(e.value) : v == e.value; });
        } else {
          el.value = Array.isArray(v) ? v[0] : v;
        }
      });
      if (o.photo_b64 && phP) { phP.src = o.photo_b64; removePhotoBtn.style.display = 'block'; }
      if (o.signature_b64) {
        const sigPreview = q('#sigPreview'), sigPlaceholder = q('#sigPlaceholder'), sigDrawInput = q('#sigDraw');
        if (sigDrawInput) sigDrawInput.value = o.signature_b64;
        if (sigPreview) { sigPreview.src = o.signature_b64; sigPreview.style.display = 'block'; }
        if (sigPlaceholder) sigPlaceholder.style.display = 'none';
      }
      if (o.hasAcknowledged) q('#agreeInfo').checked = true;
      needCo(); tallyCPD();
    } catch(e){ console.error('Error loading draft:', e); }
  }

  const saveInfo = d.createElement('div');
  saveInfo.id = 'saveTimestamp';
  saveInfo.className = 'text-end small text-muted mb-2';
  f.parentNode.insertBefore(saveInfo, f);

  const draftControls = d.createElement('div');
  draftControls.className = 'd-flex justify-content-end gap-2 mb-3';
  draftControls.style.position = 'sticky';
  draftControls.style.top = '1rem';
  draftControls.style.zIndex = 10;

  const saveNowBtn   = d.createElement('button');
  saveNowBtn.className = 'btn btn-outline-secondary btn-sm';
  saveNowBtn.textContent = 'Save Draft Now';
  saveNowBtn.addEventListener('click', saveDraft);

  const clearDraftBtn = d.createElement('button');
  clearDraftBtn.className = 'btn btn-outline-danger btn-sm';
  clearDraftBtn.textContent = 'Clear Draft';
  clearDraftBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your draft?')) { ls.removeItem('uapForm'); location.reload(); }
  });

  draftControls.appendChild(saveNowBtn);
  draftControls.appendChild(clearDraftBtn);
  f.parentNode.insertBefore(draftControls, f);

  loadDraft();
  f.addEventListener('input', e => { if (e.target?.name) { clearTimeout(window.saveDraftTimeout); window.saveDraftTimeout = setTimeout(saveDraft, 800); }});
  q('#useSig')?.addEventListener('click', saveDraft);
  fi?.addEventListener('change', saveDraft);

// ===== Scroll Acknowledgement =====
const infoSection   = d.getElementById('uap-info'),
      agreeCheckbox = d.getElementById('agreeInfo'),
      scrollSentinel= d.createElement('div');
scrollSentinel.id = 'scrollSentinel';
infoSection?.appendChild(scrollSentinel);

  if (agreeCheckbox) {
    agreeCheckbox.disabled = true;

    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) {
        agreeCheckbox.disabled = false;

        // create the alert
        const toast = Object.assign(document.createElement('sl-alert'), {
          variant:  'success',
          closable: true,
          duration: 3000,
          innerHTML:'You can now acknowledge the UAP information.'
        });

        document.body.appendChild(toast);
        toast.show();   
      }
    }, { threshold: 1.0 });

    observer.observe(scrollSentinel);
  }


  // ----------------- Submit handling (calls PDF fill) ----------------- 
  f.addEventListener('submit', async e => {
    e.preventDefault();
    const checks = [f.checkValidity(), ageOk(), xpOk(), atLeastOneGroup(), sigOk(), agreeCheckbox?.checked];
    highlightInvalidFields(f);
    if (!checks.every(v => v)) {
      const firstInvalid = qa('[required]').find(el => !el.checkValidity())
                        || qa('[name^=xp]').find(el => el.validationMessage)
                        || (!sigOk() ? q('#sigDraw') : null);
      if (firstInvalid) {
        firstInvalid.scrollIntoView({ behavior:'smooth', block:'center' }); firstInvalid.focus();
      }
      const alert = Object.assign(document.createElement('sl-alert'), {
        variant:'danger', closable:true, duration:5000,
        innerHTML:'Please complete all required fields correctly before submitting.'
      });
      document.body.appendChild(alert); alert.toast();
      updateSubmitState(); return;
    }
    if (!otpVerified) {
      alert('Please verify the 6-digit OTP to continue.');
      otpInput?.focus(); updateSubmitState(); return;
    }

    const btn = submitBtn; let originalText = '';
    if (btn) { btn.disabled = true; originalText = btn.textContent; btn.textContent = 'Submitting...'; }
    try {
      const body = formToObject(f);

      // attach processed photo if present
      body.photo_b64 = await (async () => {
        const i = d.getElementById('ph');
        const file = i?.files?.[0];
        if (!file) return (phP?.src?.startsWith('data:image') ? phP.src : null);
        return await processImage(file);
      })();

      body.signature_b64 = q('#sigDraw')?.value || '';

      // Fill + download based on template
      await downloadFilledPdf(body);

      alert('Application submitted successfully!');
      ls.removeItem('uapForm');
    } catch (err) {
      console.error('Submission error:', err);
      alert(`Error: ${err.message||'Submission failed'}`);
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
  });

  // ----------------- Global wiring ----------------- //
  f.addEventListener('input', updateSubmitState);
  window.addEventListener('DOMContentLoaded', updateSubmitState);
  updateOtpUi(); updateSubmitState();
})();