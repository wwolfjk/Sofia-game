/* Máquina de estados: contraseña -> juego (-> recompensa en la Fase 5). */
(function () {
  const cfg = window.CONFIG;
  const $ = (id) => document.getElementById(id);

  const gate = $('gate');
  const form = $('gate-form');
  const input = $('gate-input');
  const button = $('gate-button');
  const error = $('gate-error');

  $('gate-title').textContent = cfg.gate.title;
  $('gate-question').textContent = cfg.gate.question;
  input.placeholder = cfg.gate.placeholder;
  button.textContent = cfg.gate.button;

  // Secretos descifrados (fecha, carta, texto). Los usará la recompensa.
  window.SECRETS = null;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (button.disabled) return;
    button.disabled = true;
    Sound.unlock(cfg); // dentro del toque del usuario: permite que suene la canción al final
    error.textContent = '';

    let secrets = null;
    try {
      secrets = await Vault.unlock(window.VAULT, input.value);
    } catch (err) {
      console.error(err);
    }

    if (!secrets) {
      error.textContent = cfg.gate.wrong;
      form.classList.remove('shake');
      void form.offsetWidth;
      form.classList.add('shake');
      button.disabled = false;
      input.select();
      return;
    }

    window.SECRETS = secrets;
    try {
      await Privates.unlock(input.value); // fotos personales y canción (cifradas)
      if (cfg.audio && cfg.audio.finalSong) Sound.attach(Assets.url(cfg.audio.finalSong), 'final');
      if (cfg.audio && cfg.audio.bossSong) Sound.attach(Assets.url(cfg.audio.bossSong), 'boss');
    } catch (err) {
      console.error(err);
    }
    startGame();
  });

  function startGame() {
    gate.hidden = true;
    $('game').hidden = false;
    const btn = document.createElement('button');
    btn.id = 'sound-btn';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'Sonido');
    btn.innerHTML = '<span>&#9835;</span>';
    btn.addEventListener('click', (e) => { e.stopPropagation(); btn.classList.toggle('off', Sound.toggle()); });
    btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    document.body.appendChild(btn);
    // Atajo para ver solo la pantalla final: añade ?final a la dirección
    if (/[?&]final(?:&|$)/.test(location.search)) {
      $('game').hidden = true;
      Reward.show(window.SECRETS, cfg);
      Reward.finish();
      Sound.playFinal();
      return;
    }
    Game(document.getElementById('canvas'), cfg).start();
  }
})();
