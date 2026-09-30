/* Cargador de imágenes. Las rutas que no cargan se ignoran (el juego usa placeholders).
 * Los recursos privados (fotos y canción cifradas) se registran descifrados con Assets.register(ruta, url):
 * a partir de ahí, cualquier ruta registrada se carga desde esa URL temporal del navegador.
 */
(function (root) {
  const cache = {};
  const overrides = {};

  const url = (p) => (p && overrides[p]) || p;
  const register = (path, u) => { overrides[path] = u; delete cache[path]; };

  function load(paths) {
    const unique = [...new Set(paths.filter(Boolean))];
    return Promise.all(unique.map((p) => new Promise((resolve) => {
      if (cache[p]) return resolve();
      const im = new Image();
      im.onload = () => { cache[p] = im; resolve(); };
      im.onerror = () => { console.warn('No se pudo cargar', p); resolve(); };
      im.src = url(p);
    })));
  }

  root.Assets = { load, get: (p) => (p && cache[p]) || null, register, url };
})(window);
