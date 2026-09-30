/* Jefe final (Susi): 3 fases, patrones de balas, diálogos y fotos normal/herida.
 * Estados: 'enter' (baja) -> 'talk' (frases, invulnerable) -> 'fight' -> (cambio de fase: 'talk')
 *          -> vida 0: 'talk' con frases de derrota -> 'done'
 * Todos los números salen de config.boss.
 */
(function (root) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const TAU = Math.PI * 2;

  // opts: { phase, skipIntro } — para reintentar desde el inicio de una fase
  function create(cfg, W, opts) {
    opts = opts || {};
    const bc = cfg.boss;
    const img = Assets.get(cfg.sprites.boss.normal);
    const aspect = img ? img.width / img.height : 0.6;
    const w = Math.round(bc.size * aspect);
    const phase = opts.phase || 0;
    const b = {
      cfg, W,
      x: W / 2, baseX: W / 2, y: opts.skipIntro ? 150 : -bc.size, w, h: bc.size,
      hbw: Math.round(w * 0.65), hbh: Math.round(bc.size * 0.75),
      maxHp: bc.hp,
      hp: Math.round(bc.hp * (1 - phase / 3)),
      phase, state: 'enter', t: 0, hurtT: 0,
      lines: [], lineT: 0, then: null, timers: {}, ang: 0,
    };
    if (opts.skipIntro) startPhase(b, phase);
    return b;
  }

  function talk(b, lines, then) {
    b.state = 'talk';
    b.lines = lines.slice();
    b.lineT = b.cfg.boss.lineMs / 1000;
    b.then = then;
  }

  function startPhase(b, i) {
    b.phase = i;
    b.state = 'fight';
    b.baseX = b.x;
    b.t = 0;
    const ph = b.cfg.boss.phases[i];
    b.timers = {
      ring: 1.0, aim: 0.8, spiral: 0.6, fan: 1.6, cover: 3 + Math.random() * 3,
    };
    b.ph = ph;
  }

  // El jefe dispara corazones (color por tipo de ataque)
  const col = { ring: '#e8485c', aim: '#d9603c', spiral: '#b48be0', fan: '#2b8aa8' };

  function shoot(ctx, b, ang, speed, color) {
    ctx.shoot({ x: b.x, y: b.y + b.h * 0.2, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, w: 8, h: 8, color, kind: 'heart' });
  }

  function angleToPlayer(b, p) {
    return Math.atan2(p.y - (b.y + b.h * 0.2), p.x - b.x);
  }

  function update(b, dt, ctx) {
    b.t += dt;
    b.hurtT = Math.max(0, b.hurtT - dt * 1000);

    if (b.state === 'enter') {
      b.y += 130 * dt;
      if (b.y >= 150) {
        b.y = 150;
        talk(b, b.cfg.dialogue.boss.intro, () => startPhase(b, 0));
      }
      return;
    }

    if (b.state === 'talk') {
      b.lineT -= dt;
      if (b.lineT <= 0) {
        b.lines.shift();
        if (b.lines.length) b.lineT = b.cfg.boss.lineMs / 1000;
        else if (b.then) { const f = b.then; b.then = null; f(); }
      }
      b.x = b.baseX + Math.sin(b.t * 1.2) * 12; // balanceo suave mientras habla
      return;
    }

    if (b.state !== 'fight') return;
    const ph = b.ph;
    b.x = b.baseX + Math.sin(b.t * ph.freq) * ph.amp;
    b.ang += (ph.turn || 0) * dt;

    const T = b.timers;
    if (ph.ringMs && (T.ring -= dt) <= 0) {
      T.ring = ph.ringMs / 1000;
      const off = rnd(0, TAU);
      for (let i = 0; i < ph.ringN; i++) shoot(ctx, b, off + (i * TAU) / ph.ringN, ph.ringSpeed, col.ring);
    }
    if (ph.aimMs && (T.aim -= dt) <= 0) {
      T.aim = ph.aimMs / 1000;
      shoot(ctx, b, angleToPlayer(b, ctx.player), ph.aimSpeed, col.aim);
    }
    if (ph.spiralMs && (T.spiral -= dt) <= 0) {
      T.spiral = ph.spiralMs / 1000;
      for (let i = 0; i < ph.arms; i++) shoot(ctx, b, b.ang + (i * TAU) / ph.arms, ph.spiralSpeed, col.spiral);
    }
    if (ph.coverMs && (T.cover -= dt) <= 0) { // portada apuntada a Sofía (Disco Elysium, MGS2, Kant...)
      T.cover = ph.coverMs / 1000 * (0.8 + Math.random() * 0.4);
      const a = angleToPlayer(b, ctx.player), sp = 120;
      ctx.shoot({ x: b.x, y: b.y + b.h * 0.2, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 22, h: 28, color: '#fff', kind: 'cover', cover: (Math.random() * 3) | 0 });
    }
    if (ph.fanMs && (T.fan -= dt) <= 0) {
      T.fan = ph.fanMs / 1000;
      const base = angleToPlayer(b, ctx.player);
      for (let k = -2; k <= 2; k++) shoot(ctx, b, base + k * 0.22, ph.fanSpeed, col.fan);
    }
  }

  // Un golpe de Sofía. Gestiona cambio de fase y derrota.
  function hit(b, ctx) {
    if (b.state !== 'fight') return;
    b.hp--;
    b.hurtT = 130;
    const D = b.cfg.dialogue.boss;
    if (b.hp <= 0) {
      b.hp = 0;
      ctx.clearBullets();
      talk(b, D.defeated.concat([D.final]), () => { b.state = 'done'; });
    } else if (b.phase === 0 && b.hp <= b.maxHp * 2 / 3) {
      ctx.clearBullets();
      ctx.checkpoint(1);
      talk(b, D.phase2, () => startPhase(b, 1));
    } else if (b.phase === 1 && b.hp <= b.maxHp / 3) {
      ctx.clearBullets();
      ctx.checkpoint(2);
      talk(b, D.phase3, () => startPhase(b, 2));
    }
  }

  // Frase actual (o null)
  function text(b) {
    return b.state === 'talk' && b.lines.length ? b.lines[0] : null;
  }

  function draw(g, b) {
    const defeated = b.hp <= 0;
    const hurt = b.hurtT > 0 || defeated;
    const cfgS = b.cfg.sprites.boss;
    let img = Assets.get(hurt ? (defeated && cfgS.defeated ? cfgS.defeated : cfgS.hurt) : cfgS.normal) || Assets.get(cfgS.normal);
    if (b.love && Assets.get(cfgS.love)) img = Assets.get(cfgS.love); // escena final: enamorado
    const shake = b.hurtT > 0 ? Math.round(rnd(-2, 2)) : 0;
    if (img) {
      Art.drawSticker(g, Art.sticker(img, b.h), b.x + shake, b.y);
    } else {
      g.fillStyle = hurt ? '#d9603c' : '#f2b632';
      g.fillRect(Math.round(b.x - b.w / 2) + shake, Math.round(b.y - b.h / 2), b.w, b.h);
    }
  }

  root.Boss = { create, update, hit, text, draw };
})(window);
