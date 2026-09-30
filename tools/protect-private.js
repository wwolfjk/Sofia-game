/* Cifra los recursos privados (fotos personales y canción) para poder publicarlos en un repo público.
 *
 *   1. Pon los originales en claro en  private-src/  respetando la ruta final, por ejemplo:
 *        private-src/assets/img/player/normal.webp
 *        private-src/assets/audio/final.mp3
 *   2. Escribe en  private-src/answers.txt  las respuestas válidas (una por línea).
 *   3. Ejecuta:   node tools/protect-private.js
 *
 * Genera assets/private/*.enc.js y photos-vault.js. Sube esos dos; NO subas private-src/ (git lo ignora).
 * El juego los descifra con la respuesta de la pregunta, igual que la carta.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Vault = require('../js/vault.js');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'private-src');
const OUT = path.join(ROOT, 'assets', 'private');
const MIME = { '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : [p];
  });
}

(async () => {
  if (!fs.existsSync(path.join(SRC, 'answers.txt'))) { console.error('Falta private-src/answers.txt'); process.exit(1); }
  const answers = fs.readFileSync(path.join(SRC, 'answers.txt'), 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const files = walk(SRC).filter((f) => path.basename(f) !== 'answers.txt');
  if (!files.length) { console.error('No hay archivos en private-src/'); process.exit(1); }

  const assetKey = crypto.randomBytes(32);
  const key = await crypto.webcrypto.subtle.importKey('raw', assetKey, 'AES-GCM', false, ['encrypt']);
  const vault = await Vault.create(answers, { assetKey: Buffer.from(assetKey).toString('base64') }, 150000);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = {};
  let i = 0;
  for (const f of files.sort()) {
    const logical = path.relative(SRC, f).split(path.sep).join('/');
    const iv = crypto.randomBytes(12);
    const ct = Buffer.from(await crypto.webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, fs.readFileSync(f)));
    const name = 'f' + String(++i).padStart(2, '0') + '.enc';
    // Como script (window.__ENC) en base64: así carga también al abrir index.html desde el disco
    fs.writeFileSync(path.join(OUT, name + '.js'), "(window.__ENC=window.__ENC||{})['" + name + "']='" + Buffer.concat([iv, ct]).toString('base64') + "';\n");
    manifest[logical] = { f: name, t: MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' };
    console.log('  cifrado', logical, '->', name, Math.round(ct.length / 1024) + ' KB');
  }
  fs.writeFileSync(path.join(ROOT, 'photos-vault.js'),
    '/* Generado con tools/protect-private.js. Cifrado: no editar a mano. */\nwindow.PRIVATE = ' + JSON.stringify({ v: Date.now().toString(36), vault, files: manifest }) + ';\n');

  // Comprobación: cada respuesta abre el vault y el primer archivo se descifra bien
  for (const a of answers) {
    const s = await Vault.unlock(vault, a);
    if (!s) throw new Error('La respuesta "' + a + '" no abre el vault');
  }
  console.log('Listo: ' + files.length + ' archivos cifrados, ' + answers.length + ' respuestas verificadas.');
})();
