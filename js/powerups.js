/* Power-ups con guiños a Sofía. Los iconos son pegatinas dibujadas en js/art.js.
 *  chuche (beso de gominola) -> cura 1 vida · te -> escudo (absorbe 1 golpe) · ovillo de crochet -> disparo doble
 */
(function (root) {
  // Dibuja el icono centrado en (cx, cy); size = tamaño lógico
  // Fotos reales de los objetos (si las hay, sustituyen al dibujo). Las rellena game.js
  const photos = {};

  function drawIcon(ctx, kind, cx, cy, size, variant) {
    const arr = photos[kind];
    const img = arr && arr.length ? arr[(variant || 0) % arr.length] : null;
    if (img) Art.drawSticker(ctx, Art.sticker(img, Math.round(size * 0.95)), cx, cy);
    else Art.drawSticker(ctx, Art.icon(kind, size), cx, cy);
  }

  // Elige qué cae según los pesos de config (la chuche solo si le falta vida)
  function choose(cfg, lives, maxLives) {
    const w = Object.assign({}, cfg.weights);
    if (lives >= maxLives) w.chuche = 0;
    else if (lives === 1) w.chuche *= 2;
    const total = Object.values(w).reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (const k of Object.keys(w)) { r -= w[k]; if (r < 0) return k; }
    return null;
  }

  root.Powerups = { drawIcon, choose, photos };
})(window);
