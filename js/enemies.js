/* Enemigos: creación, movimiento errático y ataques por tipo.
 * Todos los números salen de config.waves; aquí solo está el comportamiento.
 * Estados: 'enter' (entra desde arriba) -> 'wander' (deambula y dispara)
 *          gymrat: 'charge' (embiste) -> 'return' (vuelve arriba)
 */
(function (root) {
  const rnd = (a, b) => a + Math.random() * (b - a);

  function spawn(w, spritePath, W, HUD_H) {
    const img = Assets.get(spritePath);
    const aspect = img ? img.width / img.height : 1;
    const h = w.size;
    const wd = Math.round(h * aspect);
    const list = [];
    for (let i = 0; i < w.count; i++) {
      list.push({
        type: w.type, img, w: wd, h,
        hbw: Math.round(wd * 0.7), hbh: Math.round(h * 0.7),
        hp: w.hp, flash: 0,
        x: rnd(wd / 2 + 8, W - wd / 2 - 8), y: -h - 20,
        vx: 0, vy: 0,
        delay: i * 0.7,
        state: 'enter', entryY: HUD_H + h / 2 + 16 + rnd(0, 50),
        minX: wd / 2 + 8, maxX: W - wd / 2 - 8,
        minY: HUD_H + h / 2 + 16, maxY: w.maxY || 250,
        tx: 0, ty: 0, pause: 0,
        fireT: 0, burst: 0, burstT: 0,
        chargeT: w.charge ? rnd(w.charge.everyMs[0], w.charge.everyMs[1]) / 1000 : 0,
        t: 0, ph: rnd(0, 6.28),
      });
    }
    return list;
  }

  function pick(e) {
    e.tx = rnd(e.minX, e.maxX);
    e.ty = rnd(e.minY, e.maxY);
  }

  // Vector unitario hacia Sofía (siempre con algo de componente hacia abajo)
  function aim(e, p) {
    const dx = p.x - e.x, dy = p.y - e.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: Math.max(0.3, dy / len) };
  }

  // Ataques por tipo. `s` = disparo: s({x,y,vx,vy,w,h,color,kind,zig})
  const attacks = {
    // Balas lentas en direcciones al azar, hacia abajo
    indie(e, w, ctx) {
      for (let k = 0; k < (w.shots || 3); k++) {
        const a = Math.PI / 2 + rnd(-0.75, 0.75);
        ctx.shoot({ x: e.x, y: e.y + e.h / 2, vx: Math.cos(a) * w.bulletSpeed, vy: Math.sin(a) * w.bulletSpeed, w: 8, h: 8, color: w.color });
      }
    },
    // Una mancuerna grande y lenta en línea recta
    gymrat(e, w, ctx) {
      ctx.shoot({ x: e.x, y: e.y + e.h / 2, vx: 0, vy: w.bulletSpeed, w: 18, h: 8, color: w.color, kind: 'dumbbell' });
    },
    // Abanico de 3 apuntando a Sofía
    cayetano(e, w, ctx) {
      const d = aim(e, ctx.player);
      const base = Math.atan2(d.y, d.x);
      for (const off of [-w.spread, 0, w.spread]) {
        const a = base + off;
        ctx.shoot({ x: e.x, y: e.y + e.h / 2, vx: Math.cos(a) * w.bulletSpeed, vy: Math.max(0.3, Math.sin(a)) * w.bulletSpeed, w: 7, h: 7, color: w.color });
      }
    },
    // Bala en zigzag
    performative(e, w, ctx) {
      ctx.shoot({ x: e.x, y: e.y + e.h / 2, vx: 0, vy: w.bulletSpeed, w: 8, h: 8, color: w.color, zig: w.zig || 45 });
    },
    // Ráfaga apuntada (el primer disparo sale ya)
    fife(e, w) {
      e.burst = w.burst;
      e.burstT = 0;
    },
  };

  function fireBurstShot(e, w, ctx) {
    const d = aim(e, ctx.player);
    ctx.shoot({ x: e.x, y: e.y + e.h / 2, vx: d.x * w.bulletSpeed, vy: d.y * w.bulletSpeed, w: 7, h: 7, color: w.color });
  }

  function typed(ctx, e) {
    return { player: ctx.player, shoot: (b) => { b.type = e.type; ctx.shoot(b); } };
  }

  function update(list, w, dt, ctx) {
    for (const e of list) {
      e.flash = Math.max(0, e.flash - dt * 1000);
      if (e.delay > 0) { e.delay -= dt; continue; }
      e.t += dt;

      if (e.state === 'enter') {
        e.y += 150 * dt;
        if (e.y >= e.entryY) {
          e.state = 'wander';
          pick(e);
          e.fireT = rnd(w.fireMs[0], w.fireMs[1]) / 1000 + 0.5;
        }
        continue;
      }

      if (e.state === 'charge' || e.state === 'return') {
        const sp = e.state === 'charge' ? w.charge.speed : 170;
        const dx = e.tx - e.x, dy = e.ty - e.y, dist = Math.hypot(dx, dy);
        if (dist < 10) {
          if (e.state === 'charge') { e.state = 'return'; e.tx = e.x; e.ty = e.minY + rnd(0, 40); }
          else { e.state = 'wander'; e.chargeT = rnd(w.charge.everyMs[0], w.charge.everyMs[1]) / 1000; pick(e); e.vx = e.vy = 0; }
        } else {
          e.x += (dx / dist) * sp * dt;
          e.y += (dy / dist) * sp * dt;
        }
        continue;
      }

      // wander: va a un punto al azar, se para un momento y elige otro
      const dx = e.tx - e.x, dy = e.ty - e.y, dist = Math.hypot(dx, dy);
      let dvx = 0, dvy = 0;
      if (e.pause > 0) {
        e.pause -= dt;
        if (e.pause <= 0) pick(e);
      } else if (dist < 8) {
        e.pause = rnd(w.pause[0], w.pause[1]);
      } else {
        dvx = (dx / dist) * w.speed;
        dvy = (dy / dist) * w.speed;
      }
      const k = Math.min(1, dt * (w.accel || 4));
      e.vx += (dvx - e.vx) * k;
      e.vy += (dvy - e.vy) * k;
      e.x += e.vx * dt;
      e.y += e.vy * dt;
      if (w.wobble) e.x += Math.sin(e.t * w.wobble[1] + e.ph) * w.wobble[0] * dt;
      e.x = Math.max(e.minX, Math.min(e.maxX, e.x));
      e.y = Math.max(e.minY, e.y);

      // embestida del gymrat
      if (w.charge) {
        e.chargeT -= dt;
        if (e.chargeT <= 0) { e.state = 'charge'; e.tx = ctx.player.x; e.ty = 350; continue; }
      }

      const ec = typed(ctx, e); // las balas saben de qué enemigo vienen (para su foto)

      // ráfaga en curso
      if (e.burst > 0) {
        e.burstT -= dt;
        if (e.burstT <= 0) { fireBurstShot(e, w, ec); e.burst--; e.burstT = w.burstGapMs / 1000; }
      }

      e.fireT -= dt;
      if (e.fireT <= 0) {
        e.fireT = rnd(w.fireMs[0], w.fireMs[1]) / 1000;
        attacks[e.type](e, w, ec);
      }
    }
  }

  // Separación suave para que no se apilen unos sobre otros
  function separate(list, dt) {
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.delay > 0 || a.state === 'enter') continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.delay > 0 || b.state === 'enter') continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        const ox = (a.hbw + b.hbw) / 2 - Math.abs(dx);
        const oy = (a.hbh + b.hbh) / 2 - Math.abs(dy);
        if (ox > 0 && oy > 0) {
          // empuja en el eje de menor solape
          const push = 120 * dt;
          if (ox < oy) { const s = dx >= 0 ? 1 : -1; a.x -= s * push; b.x += s * push; }
          else { const s = dy >= 0 ? 1 : -1; a.y -= s * push * 0.6; b.y += s * push * 0.6; }
          a.x = Math.max(a.minX, Math.min(a.maxX, a.x));
          b.x = Math.max(b.minX, Math.min(b.maxX, b.x));
        }
      }
    }
  }

  function draw(ctx, e) {
    if (e.delay > 0) return;
    ctx.globalAlpha = e.flash > 0 ? 0.5 : 1;
    if (e.img) {
      Art.drawSticker(ctx, Art.sticker(e.img, e.h), e.x, e.y);
    } else {
      ctx.fillStyle = '#6ad1ff';
      ctx.fillRect(Math.round(e.x - e.w / 2), Math.round(e.y - e.h / 2), e.w, e.h);
    }
    ctx.globalAlpha = 1;
  }

  function updateAll(list, w, dt, ctx) {
    update(list, w, dt, ctx);
    separate(list, dt);
  }

  root.Enemies = { spawn, update: updateAll, draw };
})(window);
