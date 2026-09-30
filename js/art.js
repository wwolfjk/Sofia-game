/* Estilo "collage y recortes": papel, pegatinas con borde blanco, tinta marrón.
 * Todo se dibuja en código (canvas) y se precalcula en canvases pequeños.
 *   Art.loadFonts()            -> carga Caveat y Fraunces (archivos del repo)
 *   Art.init(W, H)             -> fondo de papel y garabatos
 *   Art.sticker(img, h)        -> foto con borde blanco y sombra
 *   Art.drawSticker(ctx, st, x, y)
 *   Art.shape(ctx, kind, color, x, y, r) -> bala (dot | heart | star | dumbbell)
 *   Art.icon(kind, size)       -> power-up como pegatina (chuche | te | ovillo)
 *   Art.flower / Art.tape / Art.note -> HUD y bocadillos
 */
(function (root) {
  const TAU = Math.PI * 2;
  const INK = '#3b2a20';
  const PAPER = '#f3e9d6';
  const cache = {};

  const FONT_HAND = '700 {s}px Caveat, "Segoe Print", cursive';
  const FONT_SERIF = 'italic 400 {s}px Fraunces, Georgia, serif';
  const hand = (s) => FONT_HAND.replace('{s}', s);
  const serif = (s) => FONT_SERIF.replace('{s}', s);

  function makeCanvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  }

  // ---------- Fuentes ----------
  function loadFonts() {
    if (!window.FontFace || !document.fonts) return Promise.resolve();
    const list = [
      ['Caveat', 'assets/fonts/caveat-latin-700-normal.woff2', { weight: '700' }],
      ['Fraunces', 'assets/fonts/fraunces-latin-400-italic.woff2', { weight: '400', style: 'italic' }],
    ];
    return Promise.all(list.map(([name, url, d]) => {
      const f = new FontFace(name, 'url(' + url + ')', d);
      return f.load().then(() => document.fonts.add(f)).catch(() => {});
    }));
  }

  // ---------- Pegatinas ----------
  // draw(g, pad) pinta el dibujo en un canvas con margen `pad` (px de canvas)
  function stickerize(draw, iw, ih, k) {
    const r = Math.round(3.2 * k);
    const pad = r + Math.round(9 * k);
    const W = iw + 2 * pad, H = ih + 2 * pad;
    const art = makeCanvas(W, H);
    draw(art.getContext('2d'), pad);

    const sil = makeCanvas(W, H);
    const s = sil.getContext('2d');
    for (let i = 0; i < 16; i++) s.drawImage(art, Math.cos((i / 16) * TAU) * r, Math.sin((i / 16) * TAU) * r);
    s.drawImage(art, 0, 0);
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = '#fffdf7';
    s.fillRect(0, 0, W, H);

    const out = makeCanvas(W, H);
    const o = out.getContext('2d');
    o.shadowColor = 'rgba(59,42,32,0.38)';
    o.shadowBlur = 5 * k;
    o.shadowOffsetY = 3 * k;
    o.drawImage(sil, 0, 0);
    o.shadowColor = 'transparent';
    o.drawImage(art, 0, 0);
    return { c: out, w: W / k, h: H / k };
  }

  // Foto con borde blanco; h = altura en px lógicos
  function sticker(img, h) {
    const key = img.src + '|' + h;
    if (cache[key]) return cache[key];
    const k = Math.max(1.5, Math.min(4, img.height / h));
    const ih = Math.round(h * k);
    const iw = Math.round((ih * img.width) / img.height);
    return (cache[key] = stickerize((g, pad) => g.drawImage(img, pad, pad, iw, ih), iw, ih, k));
  }

  function drawSticker(ctx, st, x, y) {
    ctx.drawImage(st.c, Math.round(x - st.w / 2), Math.round(y - st.h / 2), st.w, st.h);
  }

  // Pegatina girada alrededor de su centro
  function drawStickerRot(ctx, st, x, y, rot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.drawImage(st.c, -st.w / 2, -st.h / 2, st.w, st.h);
    ctx.restore();
  }

  // ---------- Formas (balas) ----------
  function paintShape(g, kind, color, r) {
    g.lineJoin = 'round';
    g.lineWidth = Math.max(1.2, r * 0.22);
    g.strokeStyle = INK;
    g.fillStyle = color;
    if (kind === 'heart') {
      g.beginPath();
      g.moveTo(0, r * 0.95);
      g.bezierCurveTo(-r * 1.5, -r * 0.1, -r * 0.75, -r * 1.15, 0, -r * 0.4);
      g.bezierCurveTo(r * 0.75, -r * 1.15, r * 1.5, -r * 0.1, 0, r * 0.95);
      g.closePath();
    } else if (kind === 'star') {
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r;
        g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
      }
      g.closePath();
    } else if (kind === 'dumbbell') {
      g.beginPath();
      g.rect(-r * 1.25, -r * 0.7, r * 0.55, r * 1.4);
      g.rect(r * 0.7, -r * 0.7, r * 0.55, r * 1.4);
      g.rect(-r * 0.75, -r * 0.2, r * 1.5, r * 0.4);
    } else {
      g.beginPath();
      g.arc(0, 0, r, 0, TAU);
    }
    g.fill();
    g.stroke();
    if (kind === 'dot' || kind === 'heart') {
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.arc(-r * 0.3, -r * 0.3, r * 0.22, 0, TAU);
      g.fill();
    }
  }

  function shape(ctx, kind, color, x, y, r) {
    const key = 'shape|' + kind + '|' + color + '|' + r;
    let c = cache[key];
    if (!c) {
      const k = 3, size = Math.ceil(r * 3.2);
      const cv = makeCanvas(size * k, size * k);
      const g = cv.getContext('2d');
      g.scale(k, k);
      g.translate(size / 2, size / 2);
      paintShape(g, kind, color, r);
      c = cache[key] = { cv, size };
    }
    ctx.drawImage(c.cv, Math.round(x - c.size / 2), Math.round(y - c.size / 2), c.size, c.size);
  }

  // ---------- Iconos de power-up (pegatinas) ----------
  const ICONS = {
    // chuche: gominola en forma de beso
    chuche(g) {
      g.beginPath();
      g.moveTo(-11, 0);
      g.bezierCurveTo(-11, -8, -3, -10, 0, -5.5);
      g.bezierCurveTo(3, -10, 11, -8, 11, 0);
      g.bezierCurveTo(9, 10, -9, 10, -11, 0);
      g.closePath();
      g.fillStyle = '#e8485c';
      g.fill();
      g.lineWidth = 1.3;
      g.strokeStyle = INK;
      g.stroke();
      g.beginPath();
      g.moveTo(-10, 0.6);
      g.quadraticCurveTo(0, 4, 10, 0.6);
      g.strokeStyle = '#a82538';
      g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.ellipse(-3, 5.2, 3.6, 1.5, -0.2, 0, TAU);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.95)';
      for (const [x, y] of [[-7, -3], [-3, -6], [5, -5], [8, -2], [1, -3], [-6, 4], [6, 4], [2, 6]]) {
        g.beginPath();
        g.arc(x, y, 0.8, 0, TAU);
        g.fill();
      }
    },
    // té: taza con plato y vapor
    te(g) {
      g.lineWidth = 1.3;
      g.strokeStyle = INK;
      g.fillStyle = '#fffaf0';
      g.beginPath();
      g.ellipse(0, 9.5, 11, 2.6, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.beginPath();
      g.arc(9.5, 3, 3.6, -1.3, 1.5);
      g.lineWidth = 1.8;
      g.stroke();
      g.lineWidth = 1.3;
      g.beginPath();
      g.moveTo(-8.5, -2);
      g.lineTo(8.5, -2);
      g.quadraticCurveTo(8.5, 9, 0, 9);
      g.quadraticCurveTo(-8.5, 9, -8.5, -2);
      g.closePath();
      g.fillStyle = '#fffaf0';
      g.fill();
      g.save();
      g.clip();
      g.fillStyle = '#c2543a';
      g.fillRect(-9, 2, 18, 2.2);
      g.restore();
      g.stroke();
      g.fillStyle = '#b8793f';
      g.beginPath();
      g.ellipse(0, -2, 8.5, 1.8, 0, 0, TAU);
      g.fill();
      g.stroke();
      g.strokeStyle = 'rgba(91,70,54,0.6)';
      g.lineWidth = 1.2;
      for (const x0 of [-3, 3]) {
        g.beginPath();
        g.moveTo(x0, -5);
        g.bezierCurveTo(x0 - 3, -8, x0 + 3, -10, x0, -13);
        g.stroke();
      }
    },
    // ovillo de crochet
    ovillo(g) {
      g.fillStyle = '#b48be0';
      g.beginPath();
      g.arc(0, 0, 10, 0, TAU);
      g.fill();
      g.save();
      g.clip();
      g.strokeStyle = '#7a52b8';
      g.lineWidth = 1.4;
      for (const [cx, cy, rr, a0, a1] of [[-12, -4, 14, -0.7, 0.9], [-11, 6, 13, -1.1, 0.5], [12, -12, 15, 1.5, 3.0], [11, 10, 14, 3.3, 4.6], [0, -16, 14, 0.5, 2.6]]) {
        g.beginPath();
        g.arc(cx, cy, rr, a0, a1);
        g.stroke();
      }
      g.restore();
      g.lineWidth = 1.3;
      g.strokeStyle = INK;
      g.beginPath();
      g.arc(0, 0, 10, 0, TAU);
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 3.2;
      g.beginPath();
      g.moveTo(6, 8);
      g.bezierCurveTo(13, 12, 7, 15, 13, 12.5);
      g.stroke();
      g.strokeStyle = '#b48be0';
      g.lineWidth = 1.7;
      g.stroke();
    },
  };

  function icon(kind, size) {
    const key = 'icon|' + kind + '|' + size;
    if (cache[key]) return cache[key];
    const k = 3, iw = size * k, ih = size * k;
    return (cache[key] = stickerize((g, pad) => {
      g.save();
      g.translate(pad + iw / 2, pad + ih / 2);
      g.scale((size / 28) * k, (size / 28) * k);
      ICONS[kind](g);
      g.restore();
    }, iw, ih, k));
  }

  // ---------- HUD ----------
  // Flor de crochet/papel: vida
  function flower(ctx, x, y, r, full) {
    const key = 'flower|' + r + '|' + full;
    let c = cache[key];
    if (!c) {
      const k = 3, size = Math.ceil(r * 3);
      const cv = makeCanvas(size * k, size * k);
      const g = cv.getContext('2d');
      g.scale(k, k);
      g.translate(size / 2, size / 2);
      g.lineWidth = 1.2;
      g.strokeStyle = full ? INK : 'rgba(59,42,32,0.35)';
      g.fillStyle = full ? '#d9603c' : 'rgba(59,42,32,0.08)';
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i * TAU) / 5;
        g.beginPath();
        g.arc(Math.cos(a) * r * 0.62, Math.sin(a) * r * 0.62, r * 0.48, 0, TAU);
        g.fill();
        g.stroke();
      }
      g.fillStyle = full ? '#f2b632' : 'rgba(59,42,32,0.15)';
      g.beginPath();
      g.arc(0, 0, r * 0.4, 0, TAU);
      g.fill();
      g.stroke();
      c = cache[key] = { cv, size };
    }
    ctx.drawImage(c.cv, Math.round(x - c.size / 2), Math.round(y - c.size / 2), c.size, c.size);
  }

  // Tira de cinta washi como barra de progreso (frac 0..1)
  function tape(ctx, x, y, w, h, frac, color) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x + 2, y);
      ctx.lineTo(x + w - 2, y);
      for (let i = 0; i < 3; i++) ctx.lineTo(x + w + (i % 2 ? -2 : 2), y + ((i + 1) * h) / 4);
      ctx.lineTo(x + w - 2, y + h);
      ctx.lineTo(x + 2, y + h);
      for (let i = 0; i < 3; i++) ctx.lineTo(x + (i % 2 ? 4 : 0), y + h - ((i + 1) * h) / 4);
      ctx.closePath();
    };
    ctx.save();
    path();
    ctx.fillStyle = 'rgba(59,42,32,0.10)';
    ctx.fill();
    ctx.clip();
    const fw = Math.max(0, Math.min(1, frac)) * w;
    if (fw > 0) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, fw, h);
      ctx.strokeStyle = 'rgba(255,255,255,0.35)';
      ctx.lineWidth = 2;
      for (let sx = x - h; sx < x + fw; sx += 8) {
        ctx.beginPath();
        ctx.moveTo(sx, y + h);
        ctx.lineTo(sx + h, y);
        ctx.stroke();
      }
    }
    ctx.restore();
    ctx.save();
    path();
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(59,42,32,0.45)';
    ctx.stroke();
    ctx.restore();
  }

  // Nota adhesiva (bocadillo). rot en radianes. Dibuja su texto en Caveat.
  function note(ctx, x, y, w, h, rot, color, fn) {
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    ctx.rotate(rot);
    ctx.shadowColor = 'rgba(59,42,32,0.35)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = color || '#fff3a8';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = 'rgba(59,42,32,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w / 2 + 0.5, -h / 2 + 0.5, w - 1, h - 1);
    ctx.fillStyle = 'rgba(224,165,38,0.75)'; // cinta
    ctx.save();
    ctx.rotate(-0.08);
    ctx.fillRect(-14, -h / 2 - 4, 28, 9);
    ctx.restore();
    if (fn) fn(ctx);
    ctx.restore();
  }

  // Globo de cómic con pico hacia (tipX, tipY). fn(ctx) dibuja el texto con el origen en el centro del globo.
  function speech(ctx, x, y, w, h, tipX, tipY, color, fn) {
    const r = 13;
    const down = tipY > y + h / 2; // pico hacia abajo si el objetivo está debajo
    const baseX = Math.max(x + r + 10, Math.min(x + w - r - 10, tipX));
    const half = 7;
    const tx = Math.max(baseX - 16, Math.min(baseX + 16, tipX));
    ctx.save();
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = INK;
    ctx.fillStyle = color || '#fffdf7';
    // cuerpo (con sombra suave)
    ctx.shadowColor = 'rgba(59,42,32,0.3)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    // pico
    const by = down ? y + h : y;
    ctx.beginPath();
    ctx.moveTo(baseX - half, by);
    ctx.lineTo(tx, tipY);
    ctx.lineTo(baseX + half, by);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // tapa la línea del cuerpo bajo el pico
    ctx.fillRect(baseX - half + 1.5, by - 1.5, half * 2 - 3, 3);
    if (fn) { ctx.save(); ctx.translate(x + w / 2, y + h / 2); fn(ctx); ctx.restore(); }
    ctx.restore();
  }

  // ---------- Fondo ----------
  let bg = null;
  let doodles = [];
  let bgW = 0, bgH = 0;

  function init(W, H, decor) {
    bgW = W;
    bgH = H;
    const k = 2;
    bg = makeCanvas(W * k, H * k);
    const g = bg.getContext('2d');
    g.scale(k, k);
    g.fillStyle = PAPER;
    g.fillRect(0, 0, W, H);
    // grano de papel
    for (let i = 0; i < 2600; i++) {
      g.fillStyle = Math.random() < 0.5 ? 'rgba(120,90,60,0.05)' : 'rgba(255,255,255,0.10)';
      g.fillRect(Math.random() * W, Math.random() * H, 1 + Math.random() * 1.5, 1 + Math.random() * 1.5);
    }
    // puntitos de cuaderno
    g.fillStyle = 'rgba(120,90,60,0.16)';
    for (let x = 12; x < W; x += 24) for (let y = 12; y < H; y += 24) g.fillRect(x, y, 1.4, 1.4);
    // viñeta suave
    const v = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    v.addColorStop(0, 'rgba(120,90,60,0)');
    v.addColorStop(1, 'rgba(120,90,60,0.16)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);

    doodles = [];
    // recortes de fotos reales que flotan por el fondo (sobre todo de día a día: bufanda, libros, crepe...)
    const sizes = [44, 56, 50, 62];
    (decor || []).forEach((img, i) => {
      for (let n = 0; n < 1; n++) {
        doodles.push({
          x: Math.random() * W, y: Math.random() * H, s: 0, v: 12 + Math.random() * 18,
          rot: (Math.random() - 0.5) * 1.2, spin: (Math.random() - 0.5) * 0.25,
          kind: 'photo', st: sticker(img, img.width / img.height > 2 ? 26 : sizes[(i + n) % sizes.length]),
        });
      }
    });
  }

  function updateBg(dt) {
    for (const d of doodles) {
      d.y += d.v * dt;
      d.rot += dt * (d.kind === 'photo' ? d.spin : 0.15);
      if (d.y > bgH + 30) { d.y = -30; d.x = Math.random() * bgW; }
    }
  }

  function drawDoodle(ctx, d) {
    if (d.kind === 'photo') {
      ctx.globalAlpha = 0.24;
      drawStickerRot(ctx, d.st, d.x, d.y, d.rot);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(d.rot);
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = d.col;
    ctx.fillStyle = d.col;
    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    const r = d.s / 2;
    if (d.kind === 'star') {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.closePath();
      ctx.stroke();
    } else if (d.kind === 'heart') {
      ctx.beginPath();
      ctx.moveTo(0, r * 0.9);
      ctx.bezierCurveTo(-r * 1.5, -r * 0.1, -r * 0.75, -r * 1.1, 0, -r * 0.4);
      ctx.bezierCurveTo(r * 0.75, -r * 1.1, r * 1.5, -r * 0.1, 0, r * 0.9);
      ctx.stroke();
    } else if (d.kind === 'flower') {
      for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6, r * 0.4, 0, TAU); ctx.stroke(); }
    } else {
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.bezierCurveTo(-r / 2, -r, 0, r, r / 2, 0);
      ctx.bezierCurveTo(r * 0.7, -r * 0.4, r * 0.9, 0, r, 0);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawBg(ctx) {
    ctx.drawImage(bg, 0, 0, bgW, bgH);
    for (const d of doodles) drawDoodle(ctx, d);
  }

  root.Art = { INK, PAPER, hand, serif, loadFonts, init, updateBg, drawBg, sticker, drawSticker, drawStickerRot, shape, icon, flower, tape, note, speech, makeCanvas };
})(window);
