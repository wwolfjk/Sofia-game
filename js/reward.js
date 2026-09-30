/* Pantalla final (recompensa), estilo dark academia: ventana en arco con la puesta de sol,
 * cortinas de terciopelo, estanterías con libros clásicos, velas y pergaminos. Con scroll.
 *   mensaje de victoria + "te quiero" · tiempo juntos · cuenta atrás al aniversario · carta con sello
 * Los datos secretos (fecha, love, letter) llegan ya descifrados en `secrets`.
 *   Reward.show(secrets, cfg)   -> construye y muestra la pantalla
 *   Reward.reveal(r, cx, cy)    -> iris circular de transición (px CSS)
 *   Reward.finish()             -> quita el iris
 */
(function (root) {
  const INK = '#2a1c14';
  const GOLD = '#e2c070';
  let el = null;
  let timer = null;

  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  // ---------- Ventana con la puesta de sol ----------
  function windowSvg(sunriseSrc) {
    const arch = 'M70,500 L70,190 A110,110 0 0 1 290,190 L290,500 Z';
    let s = '<svg viewBox="0 0 360 530" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#1e1b48"/><stop offset="0.3" stop-color="#4a2a5e"/><stop offset="0.55" stop-color="#a2455f"/>' +
          '<stop offset="0.78" stop-color="#e0703f"/><stop offset="1" stop-color="#f8c46a"/></linearGradient>' +
        '<radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff0c0"/><stop offset="0.35" stop-color="#ffd27a" stop-opacity="0.9"/><stop offset="1" stop-color="#ff9a4a" stop-opacity="0"/></radialGradient>' +
        '<radialGradient id="glow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#ffcf7a" stop-opacity="0.55"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/></radialGradient>' +
        '<linearGradient id="drape" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#3f1420"/><stop offset="0.3" stop-color="#6b2230"/><stop offset="0.55" stop-color="#4a1825"/><stop offset="0.8" stop-color="#712836"/><stop offset="1" stop-color="#4a1825"/></linearGradient>' +
        '<clipPath id="win"><path d="' + arch + '"/></clipPath>' +
        '<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#000" flood-opacity="0.55"/></filter>' +
      '</defs>';
    // pared con rayas de papel pintado
    s += '<rect width="360" height="530" fill="#1d2822"/>';
    for (let x = 0; x < 360; x += 24) s += '<rect x="' + x + '" width="12" height="530" fill="rgba(255,255,255,0.03)"/>';
    // cielo dentro del arco: el cuadro del amanecer (o un cielo dibujado si no hay imagen)
    if (sunriseSrc) {
      s += '<g clip-path="url(#win)"><image href="' + esc(sunriseSrc) + '" x="60" y="70" width="240" height="440" preserveAspectRatio="xMidYMid slice"/>' +
        '<rect x="60" y="70" width="240" height="440" fill="#2a1438" opacity="0.14"/></g>';
    } else {
      s += '<g clip-path="url(#win)"><rect x="60" y="60" width="240" height="450" fill="url(#sky)"/>' +
        '<circle cx="205" cy="418" r="74" fill="url(#sun)"/><circle cx="205" cy="418" r="30" fill="#fff0c0"/></g>';
    }
    // marco de madera, líneas doradas y parteluces
    s += '<path d="' + arch + '" fill="none" stroke="#2a1a10" stroke-width="15"/>';
    s += '<path d="' + arch + '" fill="none" stroke="#9a7b3a" stroke-width="1.6" transform="translate(0,0)" opacity="0.9"/>';
    s += '<g fill="#2a1a10"><rect x="177" y="80" width="6" height="420"/><rect x="70" y="262" width="220" height="6"/><rect x="70" y="392" width="220" height="6"/></g>';
    s += '<g fill="#9a7b3a" opacity="0.8"><rect x="179" y="80" width="1.4" height="420"/><rect x="70" y="264" width="220" height="1.4"/><rect x="70" y="394" width="220" height="1.4"/></g>';
    // repisa de la ventana
    s += '<rect x="48" y="500" width="264" height="20" rx="2" fill="#3a2516" filter="url(#soft)"/><rect x="48" y="500" width="264" height="3" fill="#6b4a2e"/>';
    // cortinas de terciopelo
    s += '<path d="M0,0 L78,0 C70,90 92,250 62,420 C56,470 70,500 50,530 L0,530 Z" fill="url(#drape)" filter="url(#soft)"/>';
    s += '<path d="M360,0 L282,0 C290,90 268,250 298,420 C304,470 290,500 310,530 L360,530 Z" fill="url(#drape)" filter="url(#soft)"/>';
    s += '<g fill="none" stroke="rgba(0,0,0,0.25)" stroke-width="3"><path d="M26,0 C22,200 30,360 18,530"/><path d="M50,0 C46,190 58,340 42,520"/><path d="M334,0 C338,200 330,360 342,530"/><path d="M310,0 C314,190 302,340 318,520"/></g>';
    s += '<g fill="none" stroke="rgba(255,190,190,0.14)" stroke-width="2"><path d="M38,0 C34,200 44,350 30,530"/><path d="M322,0 C326,200 316,350 330,530"/></g>';
    s += '<rect x="0" y="0" width="360" height="14" fill="#2a1a10"/><rect x="0" y="12" width="360" height="2" fill="#9a7b3a"/>';
    // vela con llama
    s += '<ellipse cx="258" cy="500" rx="26" ry="5" fill="#b8902e"/><rect x="250" y="462" width="16" height="38" rx="2" fill="#f1e4c4" stroke="#7a6a48" stroke-width="0.8"/>';
    s += '<circle class="glow" cx="258" cy="448" r="56" fill="url(#glow)"/>';
    s += '<path class="flame" d="M258,430 C252,440 252,448 258,452 C264,448 264,440 258,430 Z" fill="#ffd27a"/><path d="M258,440 C256,445 256,448 258,450 C260,448 260,445 258,440 Z" fill="#fff6d8"/>';
    s += '</svg>';
    return s;
  }

  // ---------- Fechas ----------
  function breakdown(start, now) {
    let y = now.getFullYear() - start.getFullYear();
    let m = now.getMonth() - start.getMonth();
    let d = now.getDate() - start.getDate();
    if (d < 0) { m--; d += new Date(now.getFullYear(), now.getMonth(), 0).getDate(); }
    if (m < 0) { y--; m += 12; }
    return { years: y, months: m, days: d, hours: now.getHours(), minutes: now.getMinutes(), seconds: now.getSeconds() };
  }

  function parseDate(str) {
    const [y, m, d] = String(str).split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, 0, 0, 0);
  }

  // ---------- Pantalla ----------
  function tiles(ids, units) {
    return ids.map((k) => '<div class="tile"><b data-k="' + k + '">0</b><span>' + esc(units[k]) + '</span></div>').join('');
  }

  const imgTag = (src, cls) => (src ? '<img class="' + cls + '" src="' + esc(src) + '" alt="" draggable="false">' : '');
  const thread = (cls, color, d) => '<svg class="thread ' + cls + '" viewBox="0 0 40 240" aria-hidden="true"><path d="' + d + '" fill="none" stroke="' + color + '" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="7 2"/></svg>';

  function build(secrets, cfg) {
    const R = cfg.reward;
    const I = {};
    Object.keys(R.images || {}).forEach((k) => { I[k] = Assets.url(R.images[k]); });
    const node = document.getElementById('reward');
    const photo = (src, cls, cap, deco) => (src
      ? '<figure class="r-photo ' + cls + '">' + (deco || '') + '<img src="' + esc(src) + '" alt="" draggable="false">' + (cap ? '<figcaption>' + esc(cap) + '</figcaption>' : '') + '</figure>'
      : '');
    node.innerHTML =
      '<div id="reward-scroll"><div class="r-inner">' +
        '<div id="scene-top">' + (I.scene
          ? '<img class="scene-photo" src="' + esc(I.scene) + '" alt="" draggable="false">'
          : windowSvg(I.sunrise)) +
          imgTag(I.full, 'scene-img sofia') +
        '</div>' +
        '<div id="scene-shelves"' + (I.bg ? ' style="background-image:url(\'' + esc(I.bg) + '\')"' : '') + '></div>' +
        '<section class="r-card r-head">' + imgTag(I.candies, 'deco d-candies') + imgTag(I.scarf, 'deco d-scarf') + '<h1>' + esc(R.title) + '</h1><p class="love">' + esc(secrets.love || '') + '</p></section>' +
        '<section class="r-card">' + imgTag(I.yarnOrange, 'yarn y-orange') + thread('th-right', '#e8781f', 'M20,0 C4,36 38,70 20,106 S4,170 26,236') +
          '<h2>' + esc(R.togetherTitle) + '</h2><div class="tiles t6" id="t-together">' + tiles(['years', 'months', 'days', 'hours', 'minutes', 'seconds'], R.units) + '</div></section>' +
        '<section class="r-card">' + imgTag(I.hourglass, 'deco d-hourglass') + imgTag(I.yarnYellow, 'yarn y-yellow') + thread('th-left', '#e8b820', 'M20,0 C36,34 4,70 22,108 S36,172 14,236') +
          '<h2>' + esc(R.countdownTitle) + '</h2><div class="tiles t4" id="t-count">' + tiles(['days', 'hours', 'minutes', 'seconds'], R.units) + '</div><p class="date" id="t-date"></p></section>' +
        photo(I.shelf, 'p-shelf', R.shelfCaption, imgTag(I.lollipop, 'deco d-lollipop') + imgTag(I.crepe, 'deco d-crepe')) +
        (I.parasol ? '<figure class="r-frame">' + imgTag(I.booksOpen, 'deco d-booksopen') + '<div class="frame"><img src="' + esc(I.parasol) + '" alt="" draggable="false"></div>' + (R.paintingCaption ? '<figcaption>' + esc(R.paintingCaption) + '</figcaption>' : '') + '</figure>' : '') +
        (I.selfie1 || I.selfie2
          ? '<div class="r-selfies">' + imgTag(I.mochis, 'deco d-mochis') +
              (I.selfie1 ? '<figure class="r-photo s1"><img src="' + esc(I.selfie1) + '" alt="" draggable="false"></figure>' : '') +
              (I.selfie2 ? '<figure class="r-photo s2"><img src="' + esc(I.selfie2) + '" alt="" draggable="false"></figure>' : '') +
              (R.selfieCaption ? '<p class="s-cap">' + esc(R.selfieCaption) + '</p>' : '') + '</div>'
          : '') +
        '<section class="r-card r-letter">' + imgTag(I.quill, 'deco d-quill') + imgTag(I.flower, 'deco d-flower') + imgTag(I.booksStack, 'deco d-books') + '<h2>' + esc(R.letterTitle) + '</h2>' +
          '<div class="letter-wrap" id="letter-wrap"><div class="letter-text">' + esc(secrets.letter || '') + '</div><canvas id="letter-cover"></canvas></div></section>' +
        '<p class="r-foot" aria-hidden="true">&#9829;</p>' +
      '</div></div>';
    return node;
  }

  // El fondo de biblioteca cubre toda la página bajo la ventana
  function layoutShelves() {
    const inner = el && el.querySelector('.r-inner');
    const top = document.getElementById('scene-top');
    const sh = document.getElementById('scene-shelves');
    if (!inner || !top || !sh) return;
    // la librería empieza bajo la parte difuminada de la escena, para que se fundan
    const start = top.offsetHeight;
    sh.style.top = start + 'px';
    sh.style.height = Math.max(0, inner.scrollHeight - start) + 'px';
  }

  function startTicker(secrets, cfg) {
    const start = parseDate(secrets.startDate);
    const anniv = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
    const together = document.getElementById('t-together');
    const count = document.getElementById('t-count');
    document.getElementById('t-date').textContent = anniv.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

    function fill(box, values) {
      box.querySelectorAll('b').forEach((b) => { b.textContent = values[b.dataset.k]; });
    }
    function tick() {
      const now = new Date();
      fill(together, breakdown(start, now));
      const diff = anniv - now;
      if (diff <= 0) {
        count.innerHTML = '<p class="done">' + esc(cfg.reward.anniversaryDone) + '</p>';
        document.getElementById('t-date').textContent = '';
      } else {
        fill(count, {
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff % 86400000) / 3600000),
          minutes: Math.floor((diff % 3600000) / 60000),
          seconds: Math.floor((diff % 60000) / 1000),
        });
      }
    }
    tick();
    clearInterval(timer);
    timer = setInterval(tick, 1000);
  }

  // ---------- Carta con sello, rasgable ----------
  function setupTear(cfg) {
    const wrap = document.getElementById('letter-wrap');
    const canvas = document.getElementById('letter-cover');
    const R = cfg.reward;
    const CELL = 14;
    let ctx, w = 0, h = 0, mask, cols, rows, cleared = 0, opened = false, last = null;

    function blob(x, y, r) {
      ctx.beginPath();
      const n = 14;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, rr = r * (0.78 + Math.random() * 0.42);
        ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
    }

    function drawCover() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#d6c08f'; // pergamino envejecido
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < w * h / 70; i++) {
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(90,55,25,0.11)' : 'rgba(255,245,215,0.14)';
        ctx.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5);
      }
      const v = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75); // bordes oscurecidos
      v.addColorStop(0, 'rgba(90,55,25,0)');
      v.addColorStop(1, 'rgba(90,55,25,0.38)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = 'rgba(60,35,15,0.25)'; // pliegues
      ctx.lineWidth = 1.5;
      for (const f of [0.33, 0.66]) { ctx.beginPath(); ctx.moveTo(0, h * f); ctx.lineTo(w, h * f); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(w / 2, 0); ctx.lineTo(w / 2, h); ctx.stroke();
      ctx.strokeStyle = 'rgba(122,82,30,0.75)'; // doble filete dorado
      ctx.lineWidth = 1.6;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      ctx.lineWidth = 0.8;
      ctx.strokeRect(18, 18, w - 36, h - 36);
      // sello de lacre
      const cx = w / 2, cy = h * 0.32;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.45)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.fillStyle = '#7a1f2c';
      ctx.beginPath();
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2, rr = 38 + (i % 2 ? 3 : 0);
        ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = 'rgba(255,200,190,0.35)';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#5a1420'; // corazón en relieve
      ctx.beginPath();
      ctx.moveTo(cx, cy + 14); ctx.bezierCurveTo(cx - 26, cy - 4, cx - 12, cy - 22, cx, cy - 8); ctx.bezierCurveTo(cx + 12, cy - 22, cx + 26, cy - 4, cx, cy + 14);
      ctx.fill();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#2a1c14';
      ctx.font = 'italic 400 34px Fraunces, Georgia, serif';
      ctx.fillText(R.coverTitle, w / 2, cy + 80);
      ctx.font = 'italic 400 16px Fraunces, Georgia, serif';
      const words = R.letterHint.split(' ');
      let line = '', y = cy + 116;
      for (const wd of words) {
        const t = line ? line + ' ' + wd : wd;
        if (ctx.measureText(t).width > w - 80 && line) { ctx.fillText(line, w / 2, y); y += 22; line = wd; } else line = t;
      }
      ctx.fillText(line, w / 2, y);
    }

    function layout() {
      if (opened || cleared > 0) return;
      const r = wrap.getBoundingClientRect();
      w = Math.round(r.width);
      h = Math.round(r.height);
      if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL);
      rows = Math.ceil(h / CELL);
      mask = new Uint8Array(cols * rows);
      drawCover();
    }

    function mark(x, y, r) {
      const c0 = Math.max(0, Math.floor((x - r) / CELL)), c1 = Math.min(cols - 1, Math.floor((x + r) / CELL));
      const r0 = Math.max(0, Math.floor((y - r) / CELL)), r1 = Math.min(rows - 1, Math.floor((y + r) / CELL));
      for (let cy = r0; cy <= r1; cy++) {
        for (let cx = c0; cx <= c1; cx++) {
          const i = cy * cols + cx;
          if (!mask[i] && Math.hypot((cx + 0.5) * CELL - x, (cy + 0.5) * CELL - y) <= r) { mask[i] = 1; cleared++; }
        }
      }
    }

    function stamp(x, y) {
      const r = 22 + Math.random() * 8;
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = '#efe3c6'; // fibra clara del borde roto
      blob(x, y, r + 5);
      ctx.globalCompositeOperation = 'destination-out';
      blob(x, y, r);
      ctx.globalCompositeOperation = 'source-over';
      mark(x, y, r);
    }

    function open() {
      if (opened) return;
      opened = true;
      canvas.classList.add('gone');
      setTimeout(() => { canvas.style.display = 'none'; }, 900);
    }

    function pos(e) {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    canvas.addEventListener('pointerdown', (e) => {
      if (opened || !ctx) return;
      last = pos(e);
      stamp(last.x, last.y);
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* sin captura: sigue funcionando */ }
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!last || opened) return;
      const p = pos(e);
      const dist = Math.hypot(p.x - last.x, p.y - last.y);
      const steps = Math.max(1, Math.ceil(dist / 8));
      for (let i = 1; i <= steps; i++) stamp(last.x + ((p.x - last.x) * i) / steps, last.y + ((p.y - last.y) * i) / steps);
      last = p;
      if (cleared / (cols * rows) > 0.5) open();
    });
    const end = () => { last = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    layout();
    window.addEventListener('resize', () => { layout(); layoutShelves(); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layout(); layoutShelves(); });
    setTimeout(() => { layout(); layoutShelves(); }, 400);
  }

  function show(secrets, cfg) {
    el = build(secrets, cfg);
    el.hidden = false;
    document.body.classList.add('in-reward');
    startTicker(secrets, cfg);
    setupTear(cfg);
    layoutShelves();
    requestAnimationFrame(() => layoutShelves());
    return el;
  }

  function reveal(r, cx, cy) {
    if (el) el.style.clipPath = 'circle(' + Math.round(r) + 'px at ' + Math.round(cx) + 'px ' + Math.round(cy) + 'px)';
  }

  function finish() {
    if (el) el.style.clipPath = 'none';
  }

  root.Reward = { show, reveal, finish, breakdown, parseDate };
})(window);
