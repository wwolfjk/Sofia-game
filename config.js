/* ============================================================
 *  TODO lo personalizable vive aquí.
 *  Lo secreto (fecha de inicio, carta, texto de "te quiero")
 *  NO va aquí: se cifra con tools/encrypt.html -> vault-data.js
 * ============================================================ */
window.CONFIG = {
  // --- Entrada ---
  gate: {
    title: 'Hola, mi bebé.',
    question: '¿Cuál es la capital más cute de África?',
    placeholder: 'tu respuesta…',
    button: 'Entrar',
    wrong: '¿YA NI TE ACUERDAS?',
    // Las respuestas válidas se definen al cifrar (tools/encrypt.html),
    // aquí solo se normaliza lo que escriba (mayúsculas, tildes, v/b).
  },

  // --- Personajes ---
  names: {
    player: 'Sofía',
    boss: 'Susi',
    nicknames: ['Baby', 'Sofía', 'boñiguita', 'mi bebé', 'bebé'],
  },

  // --- Sprites (Fase 6: rutas a las fotos recortadas) ---
  sprites: {
    player: { normal: 'assets/img/player/normal.webp', hurt: 'assets/img/player/hurt.webp', win: 'assets/img/player/win.webp' },
    // love: Susi sonriente (enamorado) en la escena final · defeated: opcional, si no se usa la herida
    boss: { normal: 'assets/img/boss/normal.webp', hurt: 'assets/img/boss/hurt.webp', defeated: null, love: 'assets/img/boss/love.webp' },
    // chuche: varias fotos, cada una sale al azar · ovillo: foto del power-up de disparo doble
    heart: 'assets/img/items/heart.webp',   // vidas del HUD (corazón anatómico)
    items: { chuche: ['assets/img/items/chuche.webp', 'assets/img/items/lollipop.webp', 'assets/img/items/candies.webp', 'assets/img/items/mochis.webp'], te: 'assets/img/items/tea.webp', ovillo: 'assets/img/items/ovillo.webp' },
    enemies: {
      gymrat: 'assets/img/enemies/gymrat.webp',
      performative: 'assets/img/enemies/performative.webp',
      cayetano: 'assets/img/enemies/cayetano.webp',
      indie: 'assets/img/enemies/indie.webp',
      fife: 'assets/img/enemies/fife.webp',
    },
  },

  // --- Dificultad ---
  difficulty: {
    lives: 3,
    playerSpeed: 1.0,       // multiplicador del arrastre del dedo
    fireRateMs: 260,        // disparo automático
    bulletSpeed: 480,       // px/s en el lienzo lógico
    invulnerableMs: 1200,   // tras recibir un golpe
  },

  // --- Historia: telón antes de cada oleada y antes del jefe ---
  // (borradores, salvo el primero: reescríbelos a tu gusto)
  story: {
    tapHint: 'toca para continuar',
    typeSpeed: 38, // letras por segundo
    beforeWave: [
      'He aquí una chica. Era bonita, inteligente y graciosa. Pero era soltera, y desgraciadamente, su gusto en los hombres horrible...',
      'Su misándria crecía. Los pretendientes eran interminables...',
      'Estudiar ADE no ayudaba, por supuesto. El ecosistema germinaba cayetanos sin parar.',
      'Casi pareció caer en las argucias masculinas. En el engaño y la performance de aquel que pretende...',
      'Muy a nuestro pesar, perdió el tiempo con aquellos cuyas únicas preocupaciones eran el futbol y la fiesta.',
    ],
    beforeBoss: 'Y poniendo fin a la contienda, he aquí el chico.',
  },

  // --- Oleadas: una por tipo de enemigo, en este orden (cambia el orden de la lista para reordenar) ---
  // type: clave del enemigo (ver sprites.enemies) · count: cuántos · hp: golpes para morir · size: altura en px
  // speed: velocidad al moverse · pause: [min,max] s que se quedan quietos · wobble: [amplitud, frecuencia] de balanceo
  // maxY: hasta dónde bajan · fireMs: [min,max] entre disparos · bulletSpeed: px/s · color: partículas al morir
  // Extras por tipo: indie.shots · gymrat.charge{everyMs,speed} · cayetano.spread (rad) · performative.zig · fife.burst/burstGapMs
  waves: [
    { type: 'indie',        count: 6, hp: 4, size: 64, speed: 55,  pause: [0.6, 1.6], wobble: [14, 1.3], accel: 2.5, fireMs: [2200, 3600], shots: 3, bulletSpeed: 110, color: '#e0628f' },
    { type: 'gymrat',       count: 5, hp: 8, size: 90, speed: 45,  pause: [0.4, 1.2], wobble: [6, 1],    accel: 3,   fireMs: [2400, 3800], bulletSpeed: 105, color: '#5a5568', maxY: 200,
      charge: { everyMs: [4500, 7000], speed: 300 } },
    { type: 'cayetano',     count: 5, hp: 6, size: 96, speed: 75,  pause: [0.2, 0.9], wobble: [20, 1.8], accel: 3,   fireMs: [2600, 4000], bulletSpeed: 135, color: '#e8a317', spread: 0.38 },
    { type: 'performative', count: 5, hp: 6, size: 84, speed: 120, pause: [0.1, 0.5], wobble: [10, 2.5], accel: 6,   fireMs: [2000, 3200], bulletSpeed: 140, color: '#2f9e73', zig: 45 },
    { type: 'fife',         count: 5, hp: 6, size: 80, speed: 170, pause: [0.2, 0.7], wobble: [0, 1],    accel: 8,   fireMs: [2600, 4000], bulletSpeed: 185, color: '#e8603c', burst: 3, burstGapMs: 110 },
  ],

  // --- Power-ups: caen al matar enemigos con esta probabilidad ---
  powerups: {
    dropChance: 0.22,
    weights: { chuche: 3, te: 2, ovillo: 2 }, // la chuche solo cae si le falta vida
    fallSpeed: 70,
    yarnMs: 8000,    // ovillo de crochet: disparo doble
    shieldMs: 10000, // té: escudo (absorbe 1 golpe, caduca)
  },

  // --- Jefe final (Susi) ---
  // hp: golpes para vencerlo · 3 fases (a 2/3 y 1/3 de vida) · lineMs: duración de cada frase
  // Ataques por fase (todos opcionales): ring (círculo) · aim (apuntado) · spiral (espiral) · fan (abanico) · cover (portada apuntada, cada coverMs)
  boss: {
    size: 150,
    hp: 80,
    lineMs: 2600,
    dropEveryS: [9, 13], // cada cuánto le cae un power-up durante el combate
    phases: [
      { amp: 80,  freq: 0.8, ringMs: 2000, ringN: 10, ringSpeed: 95,  aimMs: 1100, aimSpeed: 150, coverMs: 7500 },
      { amp: 100, freq: 1.0, spiralMs: 180, arms: 2, spiralSpeed: 115, turn: 2.2, aimMs: 1500, aimSpeed: 160, fanMs: 2800, fanSpeed: 140, coverMs: 6500 },
      { amp: 120, freq: 1.3, spiralMs: 170, arms: 3, spiralSpeed: 105, turn: 2.6, ringMs: 3200, ringN: 12, ringSpeed: 105, aimMs: 1300, aimSpeed: 175, coverMs: 5500 },
    ],
  },

  // --- Bocadillos de los enemigos (borradores: reescríbelos) ---
  dialogue: {
    everyS: [2.5, 5],   // cada cuánto habla alguno
    showMs: 2400,
    deathChance: 0.35,  // prob. de soltar una última frase al morir
    deathShowMs: 1300,
    lines: {
      indie: ['Eso es muy mainstream', '¿Has visto mi fanzine?', 'Tengo el vinilo de eso', 'Mi ex estaba loca', 'Voy a abrir un podcast'],
      gymrat: ['¡Día sin piernas, día perdido!', '¿Cuánto levantas, bro?', 'Estoy en volumen', 'Te ayudo con las sentadillas nena', '200g de proteína, mi reina','Mira como moggeo','Bro soy literalmente Sung Jin-Woo'],
      cayetano: ['¡Y a veces se me olvida!', 'Mi padre conoce al dueño', 'Padre rico, padre pobre', '¿Tú dónde veraneas?', 'Un gin-tonic y ya'],
      performative: ['¿Has leído a Rosa Montero?', 'Este matcha está brutal', 'Soy un hombre deconstruido', 'Los hombres deberían desarrolar inteligencia emocional', 'Hace falta más empatía, ¿sabes?'],
      fife: ['¿Quién viene al after?', 'Esta noche triunfo, bro', 'Hoy hay fiesta, ¿no?', 'Cuanta aura bro', 'Tía, dame tu Insta', '¿Un fifita?'],
    },
    // Diálogos del jefe (borrador: los reescribe el usuario). El último, `final`, es fijo.
    boss: {
      intro: ['Cómo te atreves...Darle atención a todos esos hombres', 'Soy Susi. ¡Te voy a yappear!'],
      phase2: ['No está mal, déjame hablarte de Kant...', '¡¿Cómmo que eres comunista?!'],
      phase3: ['Mi bebé, esto no me lo esperaba...', '¡Prepárate, esto acaba de empezar!'],
      defeated: ['Ay... mi corazoncito, Sofía.', 'Siempre supe que ocurruría.'],
      final: '¿Te gustaría empezar 2026 conmigo?',
      // Breve diálogo entre los dos tras vencerlo (borrador: lo escribe el usuario). who: 'player' | 'boss'
      finale: [
        { who: 'player', text: 'Claro que sí, Susi.' },
        { who: 'boss', text: '¿De verdad? ¿Ahora? ¿Por fín?' },
        { who: 'player', text: 'Ahora. Te quiero.' },
      ],
    },
    death: {
      indie: ['Qué mainstream...', 'Mi fanzine...'],
      gymrat: ['¡Mi proteína!', 'Se me fue la serie...'],
      cayetano: ['Se lo digo a mi padre', 'Qué fuerte...'],
      performative: ['Mi libro...', 'Mi matcha...'],
      fife: ['¡Falta, árbitro!', 'Mi noche arruinada...'],
    },
  },

  // --- Pantalla final (recompensa). La fecha, el "te quiero" y la carta van cifrados (vault-data.js) ---
  reward: {
    title: 'Felicidades mi bebé.',
    togetherTitle: 'Llevamos juntos',
    countdownTitle: 'Para cumplir un año',
    anniversaryDone: '¡Ya cumplimos un año!',
    letterTitle: 'Una cartita para ti',
    coverTitle: 'Para Sofía',
    letterHint: 'arrastra el dedo de lado a lado para romper el papel',
    units: { years: 'años', months: 'meses', days: 'días', hours: 'horas', minutes: 'min', seconds: 'seg' },
    // Fotos de la pantalla final (dark academia)
    images: {
      bg: 'assets/img/decor/library-bg.webp',            // fondo: librerías antiguas
      full: 'assets/img/player/full.webp',               // Sofía de cuerpo completo junto a la ventana
      shelf: 'assets/img/decor/shelf.webp',              // foto de vuestros libros, pegada con cinta
      yarnOrange: 'assets/img/decor/yarn-orange.webp',   // ovillos de crochet
      yarnYellow: 'assets/img/decor/yarn-yellow.webp',
      scene: 'assets/img/decor/scene.webp',   // ventana con el Monet en el cristal, cortinas y tu mueble con libros y vela
      parasol: 'assets/img/decor/parasol.webp',          // cuadro enmarcado
      quill: 'assets/img/decor/quill.webp',
      booksOpen: 'assets/img/decor/books-open.webp',
      hourglass: 'assets/img/decor/hourglass.webp',
      flower: 'assets/img/decor/flower.webp',
      mochis: 'assets/img/items/mochis.webp',
      selfie1: 'assets/img/decor/selfie1.webp',          // fotos vuestras
      selfie2: 'assets/img/decor/selfie2.webp',
      booksStack: 'assets/img/decor/books-stack.webp',
      lollipop: 'assets/img/items/lollipop.webp',
      candies: 'assets/img/items/candies.webp',
      scarf: 'assets/img/decor/scarf.webp',
      crepe: 'assets/img/decor/crepe.webp',
    },
    // Textos bajo las fotos (vacíos = sin texto)
    shelfCaption: '',
    paintingCaption: '',
    selfieCaption: '',
    // Posicion de la llama de la vela en la escena (porcentaje del ancho y del alto) para su brillo parpadeante
    heartsMs: 3200,     // duración de los corazones antes de la transición
    lineMs: 3200,       // cada frase del diálogo final (toque para saltar)
  },

  // --- Textos de la interfaz del juego ---
  ui: {
    wave: 'oleada',
    dead: 'Uy… otra vez',
    retry: 'toca para reintentar',
    bossPlaceholder: 'Aquí vendrá el final (Fase 5)',
    boss: 'Boss',
    playAgain: 'toca para jugar otra vez',
  },

  // --- Audio: canción de la pantalla final. Va cifrada (private-src/assets/audio/final.mp3 -> assets/private/) ---
  audio: {
    finalSong: 'assets/audio/final.mp3', volume: 0.8, loop: true,
    bossSong: 'assets/audio/boss.mp3', bossVolume: 0.6,   // música del combate con Susi (privada, cifrada)
    sfxVolume: 0.9,
    // Vocecitas de los diálogos (estilo Deltarune): f = tono base en Hz, type = onda, gain = volumen
    voices: {
      boss: { f: 130, type: 'square', gain: 0.055 },
      player: { f: 330, type: 'triangle', gain: 0.08 },
      story: { f: 200, type: 'triangle', gain: 0.04 },
    },
    charsPerSec: 30,   // velocidad a la que se escribe el texto de los diálogos
  }, // privada: ver tools/protect-private.js

  // --- Recortes de fotos reales (estilo collage) ---
  art: {
    // Balas con foto, por tipo de enemigo (h = altura en px; spin = giro; face = ángulo de la punta del dibujo).
    // Sin foto para un tipo (p. ej. cayetano) se dibuja una forma.
    bullets: {
      player: { src: 'assets/img/bullets/star.webp', h: 20, spin: 3 },               // estrella de fieltro
      indie: { src: 'assets/img/bullets/vinyl.webp', h: 30, spin: 2.5 },             // disco de vinilo
      gymrat: { src: 'assets/img/bullets/dumbbell.webp', h: 17 },                    // mancuerna
      performative: { src: 'assets/img/bullets/matcha.webp', h: 32, spin: 1 },       // matcha helado
      cayetano: { src: 'assets/img/bullets/gin.webp', h: 34, spin: 1.3 },            // gin-tonic
      fife: { src: 'assets/img/bullets/disco.webp', h: 34, spin: 2 },                // bola de discoteca
    },
    // Recortes que flotan despacio por el fondo del juego (muy suaves, no hacen daño)
    // (ya no hay dibujitos: el fondo son solo fotos)
    background: [
      'assets/img/decor/scarf.webp', 'assets/img/decor/books-stack.webp', 'assets/img/decor/crepe.webp',
      'assets/img/decor/yarn-yellow.webp', 'assets/img/decor/king-black.webp', 'assets/img/decor/king-white.webp',
      'assets/img/decor/chessboard.webp', 'assets/img/decor/headset.webp', 'assets/img/decor/alimerka.webp',
      // solo objetos que NO lanza ningún enemigo ni son power-ups (así no se confunden con balas)
      'assets/img/bullets/pen.webp', 'assets/img/bullets/coffee.webp', 'assets/img/decor/quill.webp',
    ],
    // Portadas que lanza el jefe de vez en cuando (Disco Elysium, Metal Gear Solid 2, Crítica de la razón pura)
    covers: ['assets/img/bullets/cover-disco.webp', 'assets/img/bullets/cover-mgs2.webp', 'assets/img/bullets/cover-kant.webp'],
  },

  // --- Lienzo lógico (se escala a cualquier pantalla) ---
  // El ancho lógico es fijo; el alto se adapta a la pantalla (mínimo `height`, máximo `maxHeight`).
  // Un ancho menor = todo se ve más grande en el móvil.
  canvas: { width: 320, height: 570, maxHeight: 820 },
};
