/* Núcleo del juego (Fase 3): oleadas por tipo de enemigo con foto, movimiento
 * errático, bocadillos, power-ups aleatorios, 3 vidas, reintento y telón de historia.
 * Estados: 'story' | 'play' | 'clear' | 'dead' | 'end'
 */
(function (root) {
  function Game(canvas, cfg) {
    const W = cfg.canvas.width;
    // El alto se adapta a la pantalla para aprovecharla entera (sin barras arriba y abajo)
    const H = (function () {
      const vv = window.visualViewport;
      const vw = vv ? vv.width : window.innerWidth, vh = vv ? vv.height : window.innerHeight;
      if (!vw || !vh) return cfg.canvas.height;
      return Math.max(cfg.canvas.height, Math.min(cfg.canvas.maxHeight || 820, Math.round((W * vh) / vw)));
    })();
    const ctx = canvas.getContext('2d');
    const d = cfg.difficulty;
    const waves = cfg.waves;
    const story = Story(W, H, cfg);

    const HUD_H = 40;
    const rnd = (a, b) => a + Math.random() * (b - a);
    const pickOne = (arr) => arr[(Math.random() * arr.length) | 0];

    let scale = 1;
    let timeScale = 1; // solo cambia con ?dev
    let godMode = false; // solo con ?dev
    let running = false;
    let lastT = 0;
    let raf = 0;

    let state = 'story';
    let stateT = 0;
    let waveIdx = 0;
    let lives = d.lives;
    let hurtT = 0;       // tiempo restante de "herida" (foto de dolor)
    let invT = 0;        // tiempo restante de invulnerabilidad
    let doubleT = 0;     // ovillo de crochet: disparo doble
    let shield = false;  // té: escudo
    let shieldT = 0;

    const player = { x: W / 2, y: H - 90, w: 34, h: 60, hit: 12 };
    let pBullets = [];
    let eBullets = [];
    let enemies = [];
    let items = [];
    let bubbles = [];
    let parts = [];
    let shootCd = 0;
    let talkT = 2;
    let boss = null;     // jefe final (null fuera del combate)
    let bossCp = 0;      // fase desde la que se reintenta
    let bossDropT = 0;
    let fin = null;      // escena final tras vencer al jefe

    // ---------- Escalado ----------
    function resize() {
      const vv = window.visualViewport;
      const vw = vv ? vv.width : window.innerWidth;
      const vh = vv ? vv.height : window.innerHeight;
      scale = Math.min(vw / W, vh / H);
      const dpr = window.devicePixelRatio || 1;
      canvas.style.width = W * scale + 'px';
      canvas.style.height = H * scale + 'px';
      canvas.width = Math.round(W * scale * dpr);
      canvas.height = Math.round(H * scale * dpr);
      ctx.setTransform(scale * dpr, 0, 0, scale * dpr, 0, 0);
      // las fotos se reducen suavizadas; el pixel-art va con rectángulos enteros
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }

    // ---------- Flujo ----------
    function resetPlayer() {
      player.x = W / 2;
      player.y = H - 90;
      lives = d.lives;
      hurtT = 0;
      invT = 0;
      doubleT = 0;
      shield = false;
      shieldT = 0;
      pBullets = [];
      eBullets = [];
      items = [];
      bubbles = [];
    }

    function spawnWave(i) {
      const w = waves[i];
      enemies = Enemies.spawn(w, cfg.sprites.enemies[w.type], W, HUD_H);
      eBullets = [];
      pBullets = [];
      items = [];
      bubbles = [];
      talkT = rnd(2.5, 4);
    }

    // Empieza la oleada i con la tarjeta de historia (fromClosed = telón ya cerrado)
    function beginWaveWithStory(i, fromClosed) {
      waveIdx = i;
      state = 'story';
      story.start(cfg.story.beforeWave[i] || '', () => { spawnWave(i); state = 'play'; }, fromClosed);
    }

    function waveCleared() {
      state = 'clear';
      stateT = 0;
      eBullets = [];
    }

    function afterClear() {
      if (waveIdx + 1 < waves.length) {
        beginWaveWithStory(waveIdx + 1, false);
      } else {
        state = 'story';
        story.start(cfg.story.beforeBoss, () => startBoss(0, false), false);
      }
    }

    function die() {
      state = 'dead';
      stateT = 0;
      burst(player.x, player.y, '#d9603c', 18);
      Sound.play('die');
      Sound.stopTrack('boss', 500);
    }

    function startBoss(phase, skipIntro) {
      enemies = [];
      eBullets = [];
      pBullets = [];
      items = [];
      bubbles = [];
      bossCp = phase;
      bossDropT = rnd(cfg.boss.dropEveryS[0], cfg.boss.dropEveryS[1]);
      boss = Boss.create(cfg, W, { phase, skipIntro });
      state = 'boss';
      Sound.playTrack('boss', false); // la música del combate sigue donde iba al reintentar
    }

    function retry() {
      resetPlayer();
      if (boss) startBoss(bossCp, true); // el jefe se reintenta desde el inicio de la fase
      else spawnWave(waveIdx);
      invT = 1500;
      if (!boss) state = 'play';
    }

    function restartAll() {
      resetPlayer();
      boss = null;
      enemies = [];
      beginWaveWithStory(0, false);
    }

    function onTap() {
      if (story.active && story.tap()) return;
      if (state === 'finale' && fin.phase === 'talk') nextLine();
      else if (state === 'dead' && stateT > 0.6) retry();
      else if (state === 'end' && stateT > 0.6) restartAll();
    }

    // ---------- Efectos ----------
    function burst(x, y, color, n) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, s = rnd(40, 150);
        parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.3, 0.6), color });
      }
    }

    function hurtPlayer() {
      if (invT > 0 || godMode || (state !== 'play' && state !== 'boss')) return;
      if (shield) { // el té absorbe el golpe
        shield = false;
        shieldT = 0;
        invT = 600;
        burst(player.x, player.y, '#2b8aa8', 14);
        Sound.play('shield');
        return;
      }
      lives--;
      Sound.play('hurt');
      burst(player.x, player.y, '#c2543a', 8);
      if (lives <= 0) { die(); return; }
      hurtT = 450;
      invT = d.invulnerableMs;
    }

    function collect(kind) {
      const p = cfg.powerups;
      Sound.play(kind);
      if (kind === 'chuche') lives = Math.min(d.lives, lives + 1);
      else if (kind === 'te') { shield = true; shieldT = p.shieldMs; }
      else if (kind === 'ovillo') doubleT = p.yarnMs;
      burst(player.x, player.y, kind === 'chuche' ? '#e8485c' : kind === 'te' ? '#2b8aa8' : '#b48be0', 12);
    }

    // ---------- Bocadillos ----------
    function say(e, text, ms, fixed) {
      bubbles.push({ e: fixed ? null : e, x: e.x, y: e.y, h: e.h, text, t: ms / 1000, rot: (Math.random() - 0.5) * 0.07 });
    }

    function updateTalk(dt) {
      talkT -= dt;
      if (talkT <= 0) {
        talkT = rnd(cfg.dialogue.everyS[0], cfg.dialogue.everyS[1]);
        const talkers = enemies.filter((e) => e.state !== 'enter' && e.delay <= 0 && !bubbles.some((b) => b.e === e));
        if (talkers.length) {
          const e = pickOne(talkers);
          say(e, pickOne(cfg.dialogue.lines[e.type]), cfg.dialogue.showMs, false);
        }
      }
    }

    function tickBubbles(dt) {
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        b.t -= dt;
        if (b.e) { if (enemies.includes(b.e)) { b.x = b.e.x; b.y = b.e.y; } else { b.e = null; } }
        if (b.t <= 0) bubbles.splice(i, 1);
      }
    }

    // ---------- Actualización ----------
    function overlaps(ax, ay, aw, ah, bx, by, bw, bh) {
      return Math.abs(ax - bx) * 2 < aw + bw && Math.abs(ay - by) * 2 < ah + bh;
    }

    function movePlayer(dt) {
      const m = Input.consume(dt, 260);
      player.x = Math.max(player.w / 2, Math.min(W - player.w / 2, player.x + m.dx * d.playerSpeed));
      player.y = Math.max(HUD_H + player.h / 2, Math.min(H - player.h / 2, player.y + m.dy * d.playerSpeed));
      invT = Math.max(0, invT - dt * 1000);
      hurtT = Math.max(0, hurtT - dt * 1000);
      doubleT = Math.max(0, doubleT - dt * 1000);
      if (shield) { shieldT -= dt * 1000; if (shieldT <= 0) shield = false; }
    }

    function updateItems(dt) {
      for (let i = items.length - 1; i >= 0; i--) {
        const it = items[i];
        it.y += cfg.powerups.fallSpeed * dt;
        it.t += dt;
        if (it.y > H + 20) { items.splice(i, 1); continue; }
        if (overlaps(it.x, it.y, 22, 22, player.x, player.y, 34, 40)) {
          items.splice(i, 1);
          collect(it.kind);
        }
      }
    }

    function killEnemy(e, j) {
      Sound.play('pop', 40);
      burst(e.x, e.y, waves[waveIdx].color, 12);
      enemies.splice(j, 1);
      if (Math.random() < cfg.dialogue.deathChance) {
        say(e, pickOne(cfg.dialogue.death[e.type]), cfg.dialogue.deathShowMs, true);
      }
      if (Math.random() < cfg.powerups.dropChance) {
        const kind = Powerups.choose(cfg.powerups, lives, d.lives);
        if (kind) items.push({ kind, x: e.x, y: e.y, t: 0, v: (Math.random() * 9) | 0 });
      }
    }

    // disparo automático (doble con el ovillo) y avance de las balas de Sofía
    function autoShoot(dt) {
      shootCd -= dt * 1000;
      if (shootCd <= 0) {
        shootCd = d.fireRateMs;
        Sound.play('shoot', 110);
        const y = player.y - player.h / 2;
        if (doubleT > 0) { pBullets.push({ x: player.x - 8, y }, { x: player.x + 8, y }); }
        else pBullets.push({ x: player.x, y });
      }
      for (let i = pBullets.length - 1; i >= 0; i--) {
        pBullets[i].y -= d.bulletSpeed * dt;
        if (pBullets[i].y < -10) pBullets.splice(i, 1);
      }
    }

    const spawnEBullet = (b) => eBullets.push(Object.assign({ age: 0, bx: b.x }, b));

    // balas enemigas: avance y golpe a Sofía. Devuelve false si Sofía muere.
    function updateEBullets(dt) {
      for (let i = eBullets.length - 1; i >= 0; i--) {
        const b = eBullets[i];
        b.age += dt;
        b.bx += b.vx * dt;
        b.y += b.vy * dt;
        b.x = b.zig ? b.bx + Math.sin(b.age * 7) * b.zig : b.bx;
        if (b.y > H + 10 || b.y < -40 || b.x < -20 || b.x > W + 20) { eBullets.splice(i, 1); continue; }
        if (overlaps(b.x, b.y, b.w, b.h, player.x, player.y, player.hit, player.hit)) {
          eBullets.splice(i, 1);
          hurtPlayer();
          if (state === 'dead') return false;
        }
      }
      return true;
    }

    function updatePlay(dt) {
      const w = waves[waveIdx];
      movePlayer(dt);
      autoShoot(dt);

      Enemies.update(enemies, w, dt, { player, shoot: spawnEBullet });

      if (!updateEBullets(dt)) return;

      // balas de Sofía contra enemigos
      for (let i = pBullets.length - 1; i >= 0; i--) {
        const b = pBullets[i];
        for (let j = enemies.length - 1; j >= 0; j--) {
          const e = enemies[j];
          if (e.delay > 0) continue;
          if (overlaps(b.x, b.y, 4, 12, e.x, e.y, e.hbw, e.hbh)) {
            pBullets.splice(i, 1);
            e.hp--;
            e.flash = 80;
            if (e.hp <= 0) killEnemy(e, j);
            break;
          }
        }
      }

      // contacto directo con un enemigo (también la embestida del gymrat)
      for (const e of enemies) {
        if (e.delay > 0) continue;
        if (overlaps(e.x, e.y, e.hbw, e.hbh, player.x, player.y, player.hit, player.hit)) { hurtPlayer(); break; }
      }

      updateItems(dt);
      updateTalk(dt);
      tickBubbles(dt);

      if (state === 'play' && enemies.length === 0) waveCleared();
    }

    // Vocecitas al escribirse un texto (un blip por letra). key identifica la línea para reiniciar el contador.
    const voice = { key: '', n: 0 };
    function talkBlips(key, text, age, who) {
      if (voice.key !== key) { voice.key = key; voice.n = 0; }
      const n = Math.min(text.length, Math.floor(age * cps()));
      while (voice.n < n) { if (text[voice.n] !== ' ' && voice.n % 2 === 0) Sound.blip(who, voice.n); voice.n++; }
    }
    const cps = () => (cfg.audio && cfg.audio.charsPerSec) || 30;
    let prevBossState = '';

    function updateBoss(dt) {
      if (boss.state === 'talk' && prevBossState !== 'talk' && boss.phase > 0) Sound.play('phase');
      prevBossState = boss.state;
      const bl = Boss.text(boss);
      if (bl) talkBlips('b:' + bl, bl, cfg.boss.lineMs / 1000 - boss.lineT, 'boss');
      movePlayer(dt);
      autoShoot(dt);

      Boss.update(boss, dt, {
        player,
        shoot: spawnEBullet,
        clearBullets: () => { eBullets = []; },
        checkpoint: (phase) => { bossCp = phase; },
      });

      if (!updateEBullets(dt)) return;

      // balas de Sofía contra el jefe
      for (let i = pBullets.length - 1; i >= 0; i--) {
        const b = pBullets[i];
        if (boss.state === 'fight' && overlaps(b.x, b.y, 4, 12, boss.x, boss.y, boss.hbw, boss.hbh)) {
          pBullets.splice(i, 1);
          burst(b.x, b.y, '#f2b632', 2);
          Sound.play('bossHit', 90);
          Boss.hit(boss, {
            clearBullets: () => { eBullets = []; },
            checkpoint: (phase) => { bossCp = phase; },
          });
        }
      }

      // contacto con el jefe
      if (boss.state === 'fight' && overlaps(boss.x, boss.y, boss.hbw, boss.hbh, player.x, player.y, player.hit, player.hit)) hurtPlayer();
      if (state === 'dead') return;

      // de vez en cuando le cae un power-up a Sofía para ayudarla
      if (boss.state === 'fight') {
        bossDropT -= dt;
        if (bossDropT <= 0) {
          bossDropT = rnd(cfg.boss.dropEveryS[0], cfg.boss.dropEveryS[1]);
          const kind = Powerups.choose(cfg.powerups, lives, d.lives);
          if (kind) items.push({ kind, x: rnd(30, W - 30), y: HUD_H + 20, t: 0, v: (Math.random() * 9) | 0 });
        }
      }

      updateItems(dt);
      tickBubbles(dt);

      if (boss.state === 'done') startFinale();
    }

    // ---------- Escena final ----------
    // walk: Sofía se acerca · talk: diálogo · love: corazones · iris: transición a la pantalla final
    const HEARTS = ['#e8485c', '#ef7d6b', '#e0628f', '#f2b632'];

    function startFinale() {
      state = 'finale';
      stateT = 0;
      eBullets = [];
      pBullets = [];
      items = [];
      bubbles = [];
      fin = { phase: 'walk', t: 0, line: 0, lineT: 0, heartT: 0 };
      Sound.stopTrack('boss', 1200);
      Sound.play('win');
    }

    function nextLine() {
      fin.line++;
      fin.lineT = 0;
      if (fin.line >= cfg.dialogue.boss.finale.length) { fin.phase = 'love'; fin.t = 0; }
    }

    function spawnHeart() {
      const my = (boss.y + player.y) / 2;
      parts.push({
        x: W / 2 + rnd(-46, 46), y: my + rnd(-20, 20), vx: rnd(-28, 28), vy: -rnd(45, 115),
        life: rnd(1.3, 2), color: pickOne(HEARTS), heart: true, size: rnd(5.5, 11),
      });
    }

    function updateFinale(dt) {
      Input.consume(dt, 0);
      fin.t += dt;
      const k = Math.min(1, dt * 3);
      boss.x += (W / 2 - boss.x) * k;
      boss.y += (200 - boss.y) * k;
      if (fin.phase === 'walk') {
        const k2 = Math.min(1, dt * 2.5);
        player.x += (W / 2 - player.x) * k2;
        player.y += (440 - player.y) * k2;
        if (fin.t > 1.6) { fin.phase = 'talk'; fin.t = 0; fin.line = 0; fin.lineT = 0; }
      } else if (fin.phase === 'talk') {
        fin.lineT += dt;
        const fl = cfg.dialogue.boss.finale[fin.line];
        if (fl) talkBlips('f:' + fin.line, fl.text, fin.lineT, fl.who === 'boss' ? 'boss' : 'player');
        if (fin.lineT * 1000 > cfg.reward.lineMs) nextLine();
      } else if (fin.phase === 'love' || fin.phase === 'iris') {
        if (!boss.love) Sound.play('chime');
        boss.love = true; // Susi sonriente
        player.y += (boss.y + 100 - player.y) * Math.min(1, dt * 2.2);
        fin.heartT -= dt;
        if (fin.heartT <= 0) { fin.heartT = fin.phase === 'love' ? 0.05 : 0.12; spawnHeart(); }
        if (fin.phase === 'love' && fin.t * 1000 > cfg.reward.heartsMs) {
          fin.phase = 'iris';
          fin.t = 0;
          Reward.show(window.SECRETS || {}, cfg);
          Reward.reveal(0, 0, 0);
          Sound.playFinal();
        }
        if (fin.phase === 'iris') {
          const p = Math.min(1, fin.t / 1.7);
          const e = p * p * (3 - 2 * p);
          const rect = canvas.getBoundingClientRect();
          const cx = rect.left + (W / 2) * scale, cy = rect.top + ((boss.y + player.y) / 2) * scale;
          Reward.reveal(e * Math.hypot(window.innerWidth, window.innerHeight), cx, cy);
          if (p >= 1) {
            Reward.finish();
            running = false; // la pantalla final ya cubre el juego
            cancelAnimationFrame(raf);
          }
        }
      }
    }

    function update(dt) {
      Art.updateBg(dt);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
        if (p.life <= 0) parts.splice(i, 1);
      }

      stateT += dt;
      if (story.active) {
        story.update(dt);
        if (story.blocking) { Input.consume(dt, 0); return; }
      }
      if (state === 'play') updatePlay(dt);
      else if (state === 'boss') updateBoss(dt);
      else if (state === 'finale') updateFinale(dt);
      else if (state === 'clear') {
        // un respiro: Sofía sigue moviéndose y puede recoger lo que cayó
        movePlayer(dt);
        for (const b of pBullets) b.y -= d.bulletSpeed * dt;
        pBullets = pBullets.filter((b) => b.y > -10);
        updateItems(dt);
        tickBubbles(dt);
        if (stateT > 1.2) afterClear();
      } else {
        Input.consume(dt, 0); // muerta o fin: el movimiento no se acumula
        tickBubbles(dt);
      }
    }

    // ---------- Dibujo ----------
    function drawHUD() {
      const hImg = Assets.get(cfg.sprites.heart);
      for (let i = 0; i < d.lives; i++) {
        if (hImg) {
          const st = Art.sticker(hImg, 26);
          ctx.globalAlpha = i < lives ? 1 : 0.22;
          Art.drawSticker(ctx, st, 24 + i * 32, 21);
          ctx.globalAlpha = 1;
        } else Art.flower(ctx, 20 + i * 26, 20, 10, i < lives);
      }
      ctx.font = Art.hand(19);
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'right';
      ctx.fillStyle = Art.INK;
      ctx.fillText(boss ? cfg.ui.boss : cfg.ui.wave + ' ' + (waveIdx + 1) + '/' + waves.length, W - 12, 19);
      ctx.textAlign = 'start';
      ctx.textBaseline = 'top';

      // progreso de la partida (cinta adhesiva)
      const total = waves[waveIdx] ? waves[waveIdx].count : 1;
      const frac = state === 'play' ? 1 - enemies.length / total : state === 'story' ? 0 : 1;
      const prog = boss ? 1 : (waveIdx + (state === 'end' ? 1 : frac)) / waves.length;
      Art.tape(ctx, 12, 34, W - 24, 8, prog, '#e0a526');

      // vida del jefe
      if (boss && boss.state !== 'enter' && state !== 'finale') {
        Art.tape(ctx, 12, 48, W - 24, 12, boss.hp / boss.maxHp, '#d9484f');
        ctx.fillStyle = Art.INK;
        ctx.fillRect(12 + Math.round((W - 24) / 3), 46, 1.5, 16);
        ctx.fillRect(12 + Math.round(((W - 24) * 2) / 3), 46, 1.5, 16);
        ctx.font = Art.hand(17);
        ctx.fillText(cfg.names.boss, 14, 62);
      }

      // power-ups activos (abajo a la izquierda)
      let x = 24;
      if (shield) {
        Powerups.drawIcon(ctx, 'te', x, H - 26, 26);
        Art.tape(ctx, x - 13, H - 9, 26, 5, shieldT / cfg.powerups.shieldMs, '#2b8aa8');
        x += 40;
      }
      if (doubleT > 0) {
        Powerups.drawIcon(ctx, 'ovillo', x, H - 26, 26);
        Art.tape(ctx, x - 13, H - 9, 26, 5, doubleT / cfg.powerups.yarnMs, '#b48be0');
      }
    }

    function drawPlayer() {
      if (state === 'dead') return;
      // parpadeo durante la invulnerabilidad
      if (invT > 0 && Math.floor(invT / 90) % 2 === 0) return;
      const hurt = hurtT > 0;
      const win = state === 'finale' && (fin.phase === 'love' || fin.phase === 'iris') && cfg.sprites.player.win;
      const img = Assets.get(win || (hurt ? cfg.sprites.player.hurt : cfg.sprites.player.normal));
      if (img) {
        Art.drawSticker(ctx, Art.sticker(img, player.h), player.x, player.y);
      } else {
        ctx.fillStyle = hurt ? '#d9603c' : '#e8a9a0';
        ctx.fillRect(Math.round(player.x - 17), Math.round(player.y - 17), 34, 34);
      }
      if (shield) {
        ctx.strokeStyle = 'rgba(43,138,168,' + (0.6 + 0.3 * Math.sin(stateT * 8)) + ')';
        ctx.lineWidth = 2.5;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.arc(player.x, player.y, 34, stateT * 1.5, stateT * 1.5 + Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Bala con foto (collage) si hay una para ese tipo de enemigo
    function drawPhotoBullet(b) {
      const B = cfg.art && cfg.art.bullets && cfg.art.bullets[b.type];
      const img = B && Assets.get(B.src);
      if (!img) return false;
      let rot = 0;
      if (B.spin) rot = b.age * B.spin;
      else if (B.face != null) rot = Math.atan2(b.vy, b.vx) - (B.face * Math.PI) / 180;
      Art.drawStickerRot(ctx, Art.sticker(img, B.h), b.x, b.y, rot);
      return true;
    }

    function drawBullet(b) {
      if (b.kind === 'cover') {
        const cimg = Assets.get(((cfg.art && cfg.art.covers) || [])[b.cover]);
        if (cimg) { Art.drawStickerRot(ctx, Art.sticker(cimg, 40), b.x, b.y, Math.sin(b.age * 2.5) * 0.25); return; }
      }
      if (b.type && drawPhotoBullet(b)) return;
      if (b.kind === 'dumbbell') Art.shape(ctx, 'dumbbell', b.color, b.x, b.y, 7);
      else if (b.kind === 'heart') Art.shape(ctx, 'heart', b.color, b.x, b.y, 6.5);
      else Art.shape(ctx, 'dot', b.color, b.x, b.y, Math.round(b.w * 0.7 * 10) / 10);
    }

    // Globo de cómic sobre (o bajo) quien habla; b = {x, y, h, text, t, color}
    function drawBubble(b, maxW) {
      maxW = maxW || 120;
      ctx.font = Art.hand(17);
      const words = b.text.split(' ');
      const lines = [];
      let line = '';
      for (const wd of words) {
        const test = line ? line + ' ' + wd : wd;
        if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = wd; } else line = test;
      }
      if (line) lines.push(line);
      let tw = 0;
      for (const l of lines) tw = Math.max(tw, ctx.measureText(l).width);
      const lh = 18;
      const bw = Math.ceil(tw) + 22, bh = lines.length * lh + 16;
      const gap = 16; // hueco para el pico
      const above = b.y - b.h / 2 - bh - gap > HUD_H + 34;
      const bx = Math.round(Math.max(6, Math.min(W - 6 - bw, b.x - bw / 2)));
      const by = Math.round(above ? b.y - b.h / 2 - bh - gap : b.y + b.h / 2 + gap);
      const tipY = above ? b.y - b.h / 2 + 4 : b.y + b.h / 2 - 4;
      ctx.globalAlpha = Math.min(1, b.t * 4);
      Art.speech(ctx, bx, by, bw, bh, b.x, tipY, b.color, (g) => {
        g.font = Art.hand(17);
        g.fillStyle = Art.INK;
        g.textBaseline = 'top';
        g.textAlign = 'center';
        let rem = b.shown == null ? 1e9 : Math.floor(b.shown);
        g.textAlign = 'left';
        for (let i = 0; i < lines.length; i++) {
          const part = lines[i].slice(0, Math.max(0, rem));
          rem -= lines[i].length + 1;
          if (part) g.fillText(part, -tw / 2, -bh / 2 + 8 + i * lh);
        }
      });
      ctx.globalAlpha = 1;
      ctx.textAlign = 'start';
    }

    // Nota de papel centrada con título y pista
    function overlayNote(title, hint, color) {
      ctx.fillStyle = 'rgba(59,42,32,0.38)';
      ctx.fillRect(0, 0, W, H);
      const w = 290, h = 150;
      Art.note(ctx, (W - w) / 2, H * 0.36, w, h, -0.03, '#fbf4e4', (g) => {
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = Art.hand(title.length > 16 ? 30 : 38);
        g.fillStyle = color;
        g.fillText(title, 0, -16);
        if (hint && stateT > 0.6 && Math.floor(stateT * 2) % 2 === 0) {
          g.font = Art.serif(16);
          g.fillStyle = Art.INK;
          g.fillText(hint, 0, 40);
        }
      });
      ctx.textAlign = 'start';
      ctx.textBaseline = 'top';
    }

    function draw() {
      Art.drawBg(ctx);

      for (const it of items) {
        const bob = Math.round(Math.sin(it.t * 5) * 2);
        Powerups.drawIcon(ctx, it.kind, it.x, it.y + bob, 28, it.v);
      }

      for (const e of enemies) Enemies.draw(ctx, e);
      if (boss) Boss.draw(ctx, boss);

      const PB = cfg.art && cfg.art.bullets && cfg.art.bullets.player;
      const pImg = PB && Assets.get(PB.src);
      if (pImg) {
        const pst = Art.sticker(pImg, PB.h);
        for (const b of pBullets) Art.drawStickerRot(ctx, pst, b.x, b.y, b.y * 0.05);
      } else {
        for (const b of pBullets) Art.shape(ctx, 'star', '#f2b632', b.x, b.y, 6);
      }
      for (const b of eBullets) drawBullet(b);

      drawPlayer();

      for (const p of parts) {
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 3));
        if (p.heart) { Art.shape(ctx, 'heart', p.color, p.x, p.y, p.size); continue; }
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 4, 3);
      }
      ctx.globalAlpha = 1;

      // escena final: velo rosado y diálogo entre los dos
      if (state === 'finale') {
        if (fin.phase === 'love' || fin.phase === 'iris') {
          ctx.fillStyle = 'rgba(239,125,107,' + Math.min(0.22, fin.t * 0.08) + ')';
          ctx.fillRect(0, 0, W, H);
        }
        if (fin.phase === 'talk') {
          const l = cfg.dialogue.boss.finale[fin.line];
          if (l) {
            const who = l.who === 'boss' ? boss : player;
            drawBubble({ x: who.x, y: who.y, h: who.h, text: l.text, t: 1, color: l.who === 'boss' ? '#ffe3ea' : null, shown: fin.lineT * cps() }, 190);
          }
        }
      }

      for (const b of bubbles) drawBubble(b);
      if (boss) {
        const line = Boss.text(boss);
        if (line) drawBubble({ x: boss.x, y: boss.y, h: boss.h, text: line, t: 1, rot: 0.02, color: '#ffe3ea', shown: (cfg.boss.lineMs / 1000 - boss.lineT) * cps() }, 180);
      }
      drawHUD();

      if (state === 'dead') overlayNote(cfg.ui.dead, cfg.ui.retry, '#c2543a');
      else if (state === 'end') overlayNote(cfg.ui.bossPlaceholder, cfg.ui.playAgain, '#7a3b27');

      story.draw(ctx);
    }

    // ---------- Bucle ----------
    function frame(t) {
      if (!running) return;
      const dt = Math.min(0.05, (t - lastT) / 1000) * timeScale;
      lastT = t;
      update(dt);
      draw();
      raf = requestAnimationFrame(frame);
    }

    function start() {
      const s = cfg.sprites;
      const paths = [s.player.normal, s.player.hurt, s.player.win, s.boss.normal, s.boss.hurt, s.boss.defeated, s.boss.love].concat(Object.values(s.enemies), [].concat(...Object.values(s.items || {})), Object.values((cfg.reward && cfg.reward.images) || {}), Object.values((cfg.art && cfg.art.bullets) || {}).map((b) => b.src), (cfg.art && cfg.art.background) || [], (cfg.art && cfg.art.covers) || [], [s.heart]);
      resize();
      ctx.fillStyle = Art.PAPER;
      ctx.fillRect(0, 0, W, H);
      Promise.all([Assets.load(paths), Art.loadFonts()]).then(() => {
        Art.init(W, H, ((cfg.art && cfg.art.background) || []).map((p) => Assets.get(p)).filter(Boolean));
        for (const k of Object.keys(s.items || {})) {
          const v = s.items[k];
          Powerups.photos[k] = (Array.isArray(v) ? v : [v]).map((p) => Assets.get(p)).filter(Boolean);
        }
        resetPlayer();
        running = true;
        lastT = performance.now();
        beginWaveWithStory(0, true);
        raf = requestAnimationFrame(frame);
      });
    }

    Input.attach(canvas, () => scale);
    Input.onTap(onTap);
    window.addEventListener('resize', () => running && resize());
    if (window.visualViewport) window.visualViewport.addEventListener('resize', () => running && resize());
    window.addEventListener('orientationchange', () => setTimeout(() => running && resize(), 200));

    const api = { start, stop() { running = false; cancelAnimationFrame(raf); } };
    // Solo para pruebas: añade ?dev a la URL
    if (/[?&]dev\b/.test(location.search)) {
      api.dev = {
        get: () => ({ state, waveIdx, lives, enemies: enemies.length, eBullets: eBullets.length, items: items.length, invT, hurtT, doubleT, shield, bubbles: bubbles.length, story: story.active }),
        wave: (i) => { resetPlayer(); beginWaveWithStory(i, false); },
        kill: () => { while (enemies.length) killEnemy(enemies[0], 0); },
        hurt: () => { invT = 0; hurtPlayer(); },
        slow: (f) => { timeScale = f; },
        step: (sec) => { for (let t = 0; t < sec; t += 1 / 60) update(1 / 60); draw(); },
        pause: () => { running = false; cancelAnimationFrame(raf); },
        tap: onTap,
        give: collect,
        god: (on) => { godMode = on; },
        boss: (phase) => { resetPlayer(); startBoss(phase || 0, !!phase); },
        bossHp: (n) => { if (boss) boss.hp = n; },
        bossHit: (n) => { for (let i = 0; i < n; i++) Boss.hit(boss, { clearBullets: () => { eBullets = []; }, checkpoint: (ph) => { bossCp = ph; } }); },
        bossState: () => boss && { state: boss.state, phase: boss.phase, hp: boss.hp, x: Math.round(boss.x), y: Math.round(boss.y) },
        drop: (kind, v) => { items.push({ kind, x: player.x, y: player.y - 140, t: 0, v: v || 0 }); },
        finale: () => { resetPlayer(); startBoss(2, true); boss.hp = 0; boss.state = 'done'; startFinale(); },
        reward: () => { Reward.show(window.SECRETS || {}, cfg); Reward.finish(); Sound.playFinal(); },
        fin: () => fin && { phase: fin.phase, t: Math.round(fin.t * 100) / 100, line: fin.line },
        enemies: () => enemies.map((e) => ({ type: e.type, state: e.state, x: Math.round(e.x), y: Math.round(e.y), hp: e.hp })),
      };
      window.__dev = api.dev;
    }
    return api;
  }

  root.Game = Game;
})(window);
