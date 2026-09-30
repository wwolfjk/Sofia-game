/* Recursos privados: fotos personales y canción, cifradas en assets/private/*.enc.js.
 * Se descifran en el navegador con la misma respuesta de la pregunta (ver photos-vault.js).
 * Se cargan como scripts (no con fetch) para que también funcione abriendo index.html desde el disco.
 * Para añadir o cambiar uno: ponlo en private-src/ y ejecuta `node tools/protect-private.js`.
 */
(function (root) {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error('No se pudo cargar ' + src));
      document.head.appendChild(s);
    });
  }

  async function unlock(answer) {
    const P = root.PRIVATE;
    if (!P) return false;
    const secrets = await Vault.unlock(P.vault, answer);
    if (!secrets) return false;
    const key = await crypto.subtle.importKey('raw', Vault.unb64(secrets.assetKey), 'AES-GCM', false, ['decrypt']);
    await Promise.all(Object.keys(P.files).map(async (path) => {
      const info = P.files[path];
      try {
        await loadScript('assets/private/' + info.f + '.js?v=' + (P.v || ''));
        const bytes = Vault.unb64(root.__ENC[info.f]);
        delete root.__ENC[info.f];
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.slice(0, 12) }, key, bytes.slice(12));
        Assets.register(path, URL.createObjectURL(new Blob([plain], { type: info.t })));
      } catch (e) {
        console.warn('No se pudo descifrar', path, e);
      }
    }));
    return true;
  }

  root.Privates = { unlock };
})(window);
