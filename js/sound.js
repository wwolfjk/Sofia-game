/* Sonido: efectos sintetizados (Web Audio, sin archivos), "vocecitas" tipo Deltarune/Animal Crossing
 * para los diálogos y la canción de la pantalla final (config.audio.finalSong).
 * Los móviles solo dejan sonar tras un toque del usuario: Sound.unlock() va dentro del toque de la contraseña.
 *   Sound.unlock(cfg)     -> crea el contexto de audio y desbloquea la canción
 *   Sound.attach(url)     -> pone la canción (URL ya descifrada)
 *   Sound.play(nombre)    -> efecto: shoot pop hurt shield die chuche te ovillo phase bossHit win curtain chime tap
 *   Sound.blip(voz, n)    -> vocecita de un carácter (voz = 'boss' | 'player' | 'story'; n = índice para variar el tono)
 *   Sound.playFinal()     -> empieza la canción
 *   Sound.toggle()        -> silenciar / reanudar todo
 */
(function (root) {
  let ctx = null;
  let master = null;
  let cfgAudio = {};
  let vol = 0.8;
  let muted = false;
  const last = {};

  // ---------- utilidades ----------
  const now = () => (ctx ? ctx.currentTime : 0);

  function ready() {
    if (!ctx) return false;
    if (ctx.state === 'suspended') ctx.resume();
    return !muted;
  }

  function tone(f0, f1, dur, type, gain, delay) {
    const t = now() + (delay || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.03);
  }

  let noiseBuf = null;
  function noise(dur, gain, hp, delay) {
    const t = now() + (delay || 0);
    if (!noiseBuf) {
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const s = ctx.createBufferSource();
    s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t); s.stop(t + dur + 0.02);
  }

  // ---------- efectos ----------
  const SFX = {
    shoot() { tone(1250, 820, 0.05, 'triangle', 0.035); },
    pop() { tone(520, 160, 0.11, 'sine', 0.16); noise(0.06, 0.05, 2500); },
    hurt() { tone(170, 70, 0.22, 'square', 0.12); noise(0.16, 0.1, 500); },
    shield() { tone(1760, 2340, 0.12, 'sine', 0.1); tone(2637, 3136, 0.16, 'sine', 0.07, 0.05); },
    die() { tone(392, 392, 0.2, 'triangle', 0.14); tone(311, 311, 0.2, 'triangle', 0.14, 0.2); tone(233, 196, 0.5, 'triangle', 0.14, 0.4); },
    chuche() { tone(784, 784, 0.1, 'sine', 0.12); tone(1175, 1175, 0.14, 'sine', 0.12, 0.08); tone(1568, 1568, 0.2, 'sine', 0.1, 0.16); },
    te() { tone(660, 660, 0.12, 'sine', 0.11); tone(880, 880, 0.12, 'sine', 0.11, 0.09); tone(1320, 1320, 0.26, 'sine', 0.09, 0.18); },
    ovillo() { tone(523, 784, 0.1, 'triangle', 0.12); tone(784, 1047, 0.1, 'triangle', 0.12, 0.09); tone(1047, 1568, 0.16, 'triangle', 0.1, 0.18); },
    phase() { tone(110, 110, 0.5, 'sawtooth', 0.09); tone(165, 165, 0.5, 'sawtooth', 0.07, 0.03); noise(0.3, 0.05, 300); },
    bossHit() { tone(240, 120, 0.06, 'square', 0.05); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, f, 0.3, 'sine', 0.11, i * 0.11)); },
    chime() { tone(1319, 1319, 0.4, 'sine', 0.06); tone(1568, 1568, 0.45, 'sine', 0.05, 0.12); },
    curtain() { noise(0.6, 0.07, 400); tone(90, 70, 0.5, 'sine', 0.05); },
    tap() { tone(900, 700, 0.04, 'triangle', 0.05); },
  };

  function play(name, minGapMs) {
    if (!ready() || !SFX[name]) return;
    const t = performance.now();
    if (minGapMs && last[name] && t - last[name] < minGapMs) return;
    last[name] = t;
    try { SFX[name](); } catch (e) { /* nunca romper el juego por el sonido */ }
  }

  // Vocecita de diálogo (un "blip" corto por carácter, tono casi siempre distinto)
  function blip(voice, n) {
    if (!ready()) return;
    const v = (cfgAudio.voices && cfgAudio.voices[voice]) || { f: 260, type: 'square', gain: 0.05 };
    const steps = [0, 3, 5, 7, 2, 9, 4];
    const semis = steps[(n || 0) % steps.length] + (Math.random() < 0.3 ? 2 : 0);
    const f = v.f * Math.pow(2, semis / 12);
    tone(f, f * (0.95 + Math.random() * 0.1), 0.06, v.type || 'square', v.gain || 0.05);
  }

  // ---------- arranque y canción ----------
  // WAV de 0,1 s en silencio (data URI) para desbloquear el elemento de audio
  function silence() {
    const n = 800, buf = new Uint8Array(44 + n * 2), v = new DataView(buf.buffer);
    const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 16000, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    let s = '';
    for (let i = 0; i < buf.length; i++) s += String.fromCharCode(buf[i]);
    return 'data:audio/wav;base64,' + btoa(s);
  }

  // Pistas: 'final' (pantalla final) y 'boss' (combate contra Susi). Cada una es un <audio> que se
  // desbloquea en el toque de la contraseña y al que luego se le pone la canción ya descifrada.
  const tracks = {};
  const TRACKS = { final: 'finalSong', boss: 'bossSong' };

  function unlock(cfg) {
    cfgAudio = (cfg && cfg.audio) || {};
    vol = cfgAudio.volume != null ? cfgAudio.volume : 0.8;
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (AC) {
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = cfgAudio.sfxVolume != null ? cfgAudio.sfxVolume : 0.9;
        master.connect(ctx.destination);
        if (ctx.state === 'suspended') ctx.resume();
      }
    }
    Object.keys(TRACKS).forEach((name) => {
      if (!cfgAudio[TRACKS[name]] || tracks[name]) return;
      const a = new Audio(silence());
      a.loop = cfgAudio.loop !== false;
      a.volume = 0;
      const p = a.play();
      if (p && p.then) p.then(() => a.pause()).catch(() => {});
      tracks[name] = { a, src: false, on: false, vol: name === 'boss' ? (cfgAudio.bossVolume != null ? cfgAudio.bossVolume : 0.6) : vol };
    });
  }

  function attach(url, name) {
    const t = tracks[name || 'final'];
    if (!t || !url) return;
    t.a.pause();
    t.a.src = url;
    t.a.preload = 'auto';
    t.a.load();
    t.src = true;
  }

  function playTrack(name, fromStart) {
    const t = tracks[name];
    if (!t || !t.src) return false;
    t.on = true;
    if (fromStart) t.a.currentTime = 0;
    t.a.volume = muted ? 0 : t.vol;
    const p = t.a.play();
    if (p && p.catch) p.catch(() => {});
    return true;
  }

  // Pausa con fundido (ms); keep = true conserva la posición para reanudar
  function stopTrack(name, fadeMs) {
    const t = tracks[name];
    if (!t || !t.on) return;
    t.on = false;
    const a = t.a, v0 = a.volume, steps = Math.max(1, Math.round((fadeMs || 0) / 50));
    let i = 0;
    const id = setInterval(() => {
      i++;
      a.volume = Math.max(0, v0 * (1 - i / steps));
      if (i >= steps) { clearInterval(id); if (!t.on) a.pause(); }
    }, 50);
  }

  const playFinal = () => playTrack('final', true);

  function toggle() {
    muted = !muted;
    Object.keys(tracks).forEach((k) => {
      const t = tracks[k];
      t.a.volume = muted ? 0 : t.vol;
      if (!muted && t.on && t.a.paused && t.src) { const p = t.a.play(); if (p && p.catch) p.catch(() => {}); }
    });
    if (master) master.gain.value = muted ? 0 : (cfgAudio.sfxVolume != null ? cfgAudio.sfxVolume : 0.9);
    return muted;
  }

  root.Sound = { unlock, attach, play, blip, playFinal, playTrack, stopTrack, toggle, hasSong: () => !!(tracks.final && tracks.final.src), isMuted: () => muted, audio: (n) => tracks[n || 'final'] && tracks[n || 'final'].a };
})(window);
