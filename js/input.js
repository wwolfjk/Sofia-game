/* Entrada: arrastre relativo con el dedo/ratón + flechas/WASD.
 * Movimiento relativo: la nave no salta al punto tocado y el dedo no la tapa.
 * Expone Input.attach(canvas, scaleFn) y Input.consume() -> {dx, dy} en px lógicos.
 */
(function (root) {
  const keys = new Set();
  let dx = 0, dy = 0;
  let last = null;
  let scaleFn = () => 1;
  let tapFn = null;

  // Un toque corto y casi sin movimiento cuenta como "tap" (también Espacio/Enter).
  function onTap(fn) { tapFn = fn; }

  function attach(canvas, getScale) {
    scaleFn = getScale;

    canvas.addEventListener('pointerdown', (e) => {
      last = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t0: performance.now() };
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!last || last.id !== e.pointerId) return;
      const s = scaleFn();
      dx += (e.clientX - last.x) / s;
      dy += (e.clientY - last.y) / s;
      last.x = e.clientX;
      last.y = e.clientY;
      e.preventDefault();
    });
    canvas.addEventListener('pointerup', (e) => {
      if (!last || last.id !== e.pointerId) return;
      const quick = performance.now() - last.t0 < 500;
      const still = Math.hypot(e.clientX - last.x0, e.clientY - last.y0) < 12;
      last = null;
      if (quick && still && tapFn) tapFn();
    });
    canvas.addEventListener('pointercancel', (e) => { if (last && last.id === e.pointerId) last = null; });

    // iOS: evita scroll elástico, zoom por pellizco y doble toque
    const stop = (e) => e.preventDefault();
    // la pantalla final necesita scroll: no se bloquea ahí
    document.addEventListener('touchmove', (e) => {
      if (e.target.closest && e.target.closest('#reward')) return;
      e.preventDefault();
    }, { passive: false });
    document.addEventListener('gesturestart', stop);
    document.addEventListener('gesturechange', stop);
    document.addEventListener('contextmenu', stop);
    let lastTap = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTap < 350 && e.target === canvas) e.preventDefault();
      lastTap = now;
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      if (/^(Arrow|Key[WASD])/.test(e.code)) { keys.add(e.code); e.preventDefault(); }
      if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat && tapFn) { tapFn(); e.preventDefault(); }
    });
    window.addEventListener('keyup', (e) => keys.delete(e.code));
    window.addEventListener('blur', () => { keys.clear(); last = null; });
  }

  // Devuelve el movimiento acumulado desde la última llamada.
  // dt en segundos; keySpeed en px lógicos/s para el teclado.
  function consume(dt, keySpeed) {
    let mx = dx, my = dy;
    dx = 0; dy = 0;
    const k = keySpeed * dt;
    if (keys.has('ArrowLeft') || keys.has('KeyA')) mx -= k;
    if (keys.has('ArrowRight') || keys.has('KeyD')) mx += k;
    if (keys.has('ArrowUp') || keys.has('KeyW')) my -= k;
    if (keys.has('ArrowDown') || keys.has('KeyS')) my += k;
    return { dx: mx, dy: my };
  }

  root.Input = { attach, consume, onTap };
})(window);
