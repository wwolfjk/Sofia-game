/* Tarjeta de historia con telón de teatro.
 * Fases: close1 (el telón cubre el juego) -> open1 (se abre y aparece el texto)
 *        -> read (texto letra a letra, toque para seguir) -> close2 (se cierra)
 *        -> onDone() -> open2 (se abre revelando el juego, que ya funciona).
 * `blocking` = true mientras el juego debe estar parado.
 */
(function (root) {
  function Story(W, H, cfg) {
    const CLOSE = 0.7, OPEN = 0.9;
    let phase = 'none';
    let c = 0;           // 0 = abierto, 1 = cerrado
    let t = 0;
    let text = '';
    let lines = [];
    let shown = 0;
    let done = null;
    let lastN = 0;

    function wrap(ctx, str, maxW) {
      const words = str.split(' ');
      const out = [];
      let line = '';
      for (const w of words) {
        const test = line ? line + ' ' + w : w;
        if (ctx.measureText(test).width > maxW && line) { out.push(line); line = w; }
        else line = test;
      }
      if (line) out.push(line);
      return out;
    }

    // fromClosed: empieza con el telón ya cerrado (por ejemplo, al entrar al juego)
    function start(str, onDone, fromClosed) {
      text = str;
      lastN = 0;
      lines = null;
      if (!fromClosed) Sound.play('curtain');
      shown = 0;
      done = onDone;
      t = 0;
      if (fromClosed) { phase = 'open1'; c = 1; } else { phase = 'close1'; c = 0; }
    }

    function update(dt) {
      if (phase === 'none') return;
      t += dt;
      if (phase === 'close1') { c = Math.min(1, t / CLOSE); if (t >= CLOSE) { phase = 'open1'; t = 0; } }
      else if (phase === 'open1') { c = Math.max(0, 1 - t / OPEN); if (t >= OPEN) { phase = 'read'; t = 0; c = 0; } }
      else if (phase === 'read') { shown = Math.min(text.length, shown + cfg.story.typeSpeed * dt); }
      else if (phase === 'close2') {
        c = Math.min(1, t / CLOSE);
        if (t >= CLOSE) { phase = 'open2'; t = 0; c = 1; if (done) { const f = done; done = null; f(); } }
      } else if (phase === 'open2') { c = Math.max(0, 1 - t / OPEN); if (t >= OPEN) { phase = 'none'; c = 0; } }
      // el texto empieza a escribirse cuando el telón ya va por la mitad
      if (phase === 'open1' && c < 0.5) shown = Math.min(text.length, shown + cfg.story.typeSpeed * dt);
      const n = Math.floor(shown);
      while (lastN < n) { if (text[lastN] !== ' ' && lastN % 2 === 0) Sound.blip('story', lastN); lastN++; }
    }

    function tap() {
      if (phase === 'read') {
        if (shown < text.length) shown = text.length;
        else { phase = 'close2'; t = 0; Sound.play('curtain'); }
        return true;
      }
      return false;
    }

    function drawStage(ctx) {
      // escenario de cartulina kraft con una nota de papel en el centro
      ctx.fillStyle = '#cdb38c';
      ctx.fillRect(0, 0, W, H);
      const v = ctx.createRadialGradient(W / 2, H * 0.45, 40, W / 2, H * 0.45, H * 0.7);
      v.addColorStop(0, 'rgba(255,240,200,0.35)');
      v.addColorStop(1, 'rgba(90,60,30,0.25)');
      ctx.fillStyle = v;
      ctx.fillRect(0, 0, W, H);

      const fs = 26, lh = 34;
      ctx.font = Art.hand(fs);
      if (!lines) lines = wrap(ctx, text, W - 100);
      const cw = W - 52, ch = lines.length * lh + 70;
      const cx = W / 2, cy = H * 0.44;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(-0.02);
      ctx.shadowColor = 'rgba(59,42,32,0.4)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 6;
      ctx.fillStyle = '#fbf4e4';
      ctx.fillRect(-cw / 2, -ch / 2, cw, ch);
      ctx.shadowColor = 'transparent';
      // líneas de cuaderno
      ctx.strokeStyle = 'rgba(120,150,190,0.25)';
      ctx.lineWidth = 1;
      for (let y = -ch / 2 + 44; y < ch / 2 - 10; y += lh) {
        ctx.beginPath();
        ctx.moveTo(-cw / 2 + 14, y + 6);
        ctx.lineTo(cw / 2 - 14, y + 6);
        ctx.stroke();
      }
      // cintas adhesivas en las esquinas
      ctx.fillStyle = 'rgba(224,165,38,0.75)';
      ctx.save();
      ctx.translate(-cw / 2 + 12, -ch / 2 + 6);
      ctx.rotate(-0.6);
      ctx.fillRect(-20, -6, 40, 12);
      ctx.restore();
      ctx.save();
      ctx.translate(cw / 2 - 12, -ch / 2 + 6);
      ctx.rotate(0.6);
      ctx.fillRect(-20, -6, 40, 12);
      ctx.restore();

      // texto escribiéndose
      ctx.font = Art.hand(fs);
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'center';
      ctx.fillStyle = Art.INK;
      let remaining = Math.floor(shown);
      for (let i = 0; i < lines.length; i++) {
        const part = lines[i].slice(0, Math.max(0, remaining));
        remaining -= lines[i].length + 1;
        if (part) ctx.fillText(part, 0, -ch / 2 + 62 + i * lh);
      }
      ctx.restore();

      if (phase === 'read' && shown >= text.length && Math.floor(t * 2) % 2 === 0) {
        ctx.font = Art.serif(15);
        ctx.fillStyle = '#7a3b27';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText(cfg.story.tapHint, W / 2, H - 60);
      }
      ctx.textAlign = 'start';
      ctx.textBaseline = 'top';
    }

    function drawCurtains(ctx) {
      if (c <= 0) return;
      // ease para que se sienta pesado
      const e = c * c * (3 - 2 * c);
      const pw = Math.ceil((W / 2) * e);
      for (let side = 0; side < 2; side++) {
        const x0 = side === 0 ? 0 : W - pw;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x0, 0, pw, H);
        ctx.clip();
        ctx.fillStyle = '#a3412f';
        ctx.fillRect(x0, 0, pw, H);
        // pliegues
        for (let x = x0 - (x0 % 14); x < x0 + pw + 14; x += 14) {
          ctx.fillStyle = 'rgba(0,0,0,0.22)';
          ctx.fillRect(x, 0, 5, H);
          ctx.fillStyle = 'rgba(255,255,255,0.07)';
          ctx.fillRect(x + 7, 0, 3, H);
        }
        ctx.restore();
        // borde dorado en el lado interior
        ctx.fillStyle = '#e8b84a';
        ctx.fillRect(side === 0 ? pw - 3 : W - pw, 0, 3, H);
      }
    }

    function draw(ctx) {
      if (phase === 'none') return;
      if (phase === 'open1' || phase === 'read' || phase === 'close2') drawStage(ctx);
      drawCurtains(ctx);
    }

    return {
      start, update, tap, draw,
      get active() { return phase !== 'none'; },
      get blocking() { return phase !== 'none' && phase !== 'open2'; },
    };
  }

  root.Story = Story;
})(window);
