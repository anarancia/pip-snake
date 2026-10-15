const $ = s => document.querySelector(s);
const SPEEDS = { lent: 200, normal: 150, rapide: 100 };
const KEYS = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], z: [0, -1], s: [0, 1], a: [-1, 0], q: [-1, 0], d: [1, 0],
};
const PIP_CSS = `
  body { margin: 0; overflow: hidden; background: #fff; }
  canvas { display: block; width: 100vw; height: 100vh; }
  .score { position: fixed; top: 4px; right: 6px; font: 10px system-ui, sans-serif; color: #999; }
`;

const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

const settings = Object.assign({ size: 220, speed: 'normal', color: '#d0d0d0', wrap: false }, store.get('pip-snake', {}));
let best = store.get('pip-snake-best', 0);
let snake = null;
const btn = $('#launch');
const hasDocPip = 'documentPictureInPicture' in window;

// Réglages
const form = $('#settings');
form.size.value = settings.size;
form.speed.value = settings.speed;
form.color.value = settings.color;
form.wrap.checked = settings.wrap;
form.addEventListener('change', () => {
  Object.assign(settings, { size: +form.size.value, speed: form.speed.value, color: form.color.value, wrap: form.wrap.checked });
  store.set('pip-snake', settings);
});
$('#best').textContent = best;

if (!hasDocPip) {
  $('#unsupported').hidden = false;
  btn.textContent = 'Lancer en mode vidéo';
}

function options(scoreEl) {
  return {
    speed: SPEEDS[settings.speed], color: settings.color, wrap: settings.wrap,
    onScore: n => { scoreEl.textContent = n; },
    onGameOver: n => { if (n > best) { best = n; store.set('pip-snake-best', best); $('#best').textContent = best; } },
  };
}

function bindKeys(target) {
  const onKey = e => {
    if (!snake) return;
    const k = KEYS[e.key] || KEYS[e.key.toLowerCase()];
    if (k) { e.preventDefault(); snake.setDirection(...k); snake.resume(); }
    else if (e.key === ' ') { e.preventDefault(); snake.state === 'paused' ? snake.resume() : snake.pause(); }
    else if (e.key === 'Enter' && snake.state === 'over') snake.start();
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}

function stop(unbind, cleanup) {
  unbind();
  snake.destroy();
  snake = null;
  btn.disabled = false;
  cleanup && cleanup();
}

async function openPip() {
  const pip = await documentPictureInPicture.requestWindow({ width: settings.size, height: settings.size });
  const doc = pip.document;
  doc.head.append(Object.assign(doc.createElement('style'), { textContent: PIP_CSS }));
  const canvas = doc.createElement('canvas');
  const score = Object.assign(doc.createElement('span'), { className: 'score', textContent: '0' });
  doc.body.append(canvas, score);
  snake = new Snake(canvas, options(score));
  snake.start();
  snake.pause('Clique ici pour jouer'); // reprise à la première flèche, une fois la fenêtre focus
  const unbind = bindKeys(pip);
  pip.addEventListener('blur', () => snake && snake.pause('Flèche pour reprendre'));
  pip.addEventListener('resize', () => snake && snake.resize());
  pip.addEventListener('pagehide', () => stop(unbind), { once: true });
}

async function openVideo() {
  const block = $('#fallback'), canvas = $('#fallback-canvas'), video = $('#fallback-video');
  block.hidden = false;
  canvas.style.width = canvas.style.height = settings.size + 'px';
  snake = new Snake(canvas, options($('#fallback-score')));
  video.srcObject = canvas.captureStream(30);
  await video.play();
  snake.start();
  const unbind = bindKeys(window); // pas de clavier dans un PiP vidéo : on écoute l'onglet d'origine
  const end = () => stop(unbind, () => { block.hidden = true; video.srcObject = null; });
  $('#fallback-stop').onclick = () => { if (document.pictureInPictureElement) document.exitPictureInPicture(); else end(); };
  if (video.requestPictureInPicture) {
    video.addEventListener('leavepictureinpicture', end, { once: true });
    await video.requestPictureInPicture();
  } else if (video.webkitSetPresentationMode) {
    video.addEventListener('webkitpresentationmodechanged', () => video.webkitPresentationMode === 'inline' && end(), { once: true });
    video.webkitSetPresentationMode('picture-in-picture');
  }
}

btn.addEventListener('click', async () => {
  btn.disabled = true;
  $('#status').textContent = '';
  try { await (hasDocPip ? openPip() : openVideo()); }
  catch (err) { $('#status').textContent = err.message; if (snake) snake.destroy(); snake = null; btn.disabled = false; }
});
