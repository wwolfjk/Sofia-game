/* Vault: cifra/descifra los secretos con la respuesta a la pregunta.
 * - Una clave maestra aleatoria cifra los secretos (AES-GCM).
 * - Esa clave maestra se guarda cifrada una vez por cada respuesta válida
 *   (clave derivada con PBKDF2), así varias variantes abren lo mismo.
 * Script clásico (sin módulos) para que también funcione desde file://.
 */
(function (root) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const subtle = () => (root.crypto || globalThis.crypto).subtle;
  const rand = (n) => (root.crypto || globalThis.crypto).getRandomValues(new Uint8Array(n));

  const b64 = (buf) => {
    const bytes = new Uint8Array(buf);
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s);
  };
  const unb64 = (str) => Uint8Array.from(atob(str), (c) => c.charCodeAt(0));

  // "Madrid", "madrid", " Mádrid " -> "madrid" (se ignoran mayúsculas, tildes, espacios y v/b)
  function normalize(s) {
    return String(s)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .replace(/v/g, 'b');
  }

  async function deriveKey(answer, salt, iter) {
    const base = await subtle().importKey('raw', enc.encode(normalize(answer)), 'PBKDF2', false, ['deriveKey']);
    return subtle().deriveKey(
      { name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' },
      base,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  async function seal(key, bytes) {
    const iv = rand(12);
    const ct = await subtle().encrypt({ name: 'AES-GCM', iv }, key, bytes);
    return { iv: b64(iv), ct: b64(ct) };
  }

  function open(key, box) {
    return subtle().decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
  }

  // answers: array de respuestas válidas; secrets: objeto JSON con lo que se cifra
  async function create(answers, secrets, iter) {
    iter = iter || 200000;
    const salt = rand(16);
    const masterRaw = rand(32);
    const master = await subtle().importKey('raw', masterRaw, 'AES-GCM', false, ['encrypt']);
    const data = await seal(master, enc.encode(JSON.stringify(secrets)));
    const uniq = [...new Set(answers.map(normalize).filter(Boolean))];
    const keys = [];
    for (const a of uniq) {
      keys.push(await seal(await deriveKey(a, salt, iter), masterRaw));
    }
    return { v: 1, iter, salt: b64(salt), data, keys };
  }

  // Devuelve el objeto de secretos, o null si la respuesta no es válida
  async function unlock(vault, answer) {
    if (!normalize(answer)) return null;
    const key = await deriveKey(answer, unb64(vault.salt), vault.iter);
    for (const entry of vault.keys) {
      try {
        const masterRaw = await open(key, entry);
        const master = await subtle().importKey('raw', masterRaw, 'AES-GCM', false, ['decrypt']);
        return JSON.parse(dec.decode(await open(master, vault.data)));
      } catch (e) { /* prueba la siguiente */ }
    }
    return null;
  }

  const Vault = { normalize, create, unlock, b64, unb64 };
  root.Vault = Vault;
  if (typeof module !== 'undefined') module.exports = Vault;
})(typeof window !== 'undefined' ? window : globalThis);
