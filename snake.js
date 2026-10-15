// Moteur snake. Agnostique du contexte : le canvas peut vivre dans un autre document (fenêtre PiP).
class Snake {
  constructor(canvas, { speed = 150, color = '#d0d0d0', wrap = false, onScore = () => {}, onGameOver = () => {} } = {}) {
    Object.assign(this, { canvas, ctx: canvas.getContext('2d'), baseSpeed: speed, color, wrap, onScore, onGameOver });
    this.N = 16;
    this.timer = null;
    this.state = 'idle';
    this.msg = '';
    this.reset();
    this.resize();
  }

  resize() {
    const win = this.canvas.ownerDocument && this.canvas.ownerDocument.defaultView;
    const dpr = (win && win.devicePixelRatio) || 1;
    const w = this.canvas.clientWidth || 160, h = this.canvas.clientHeight || 160;
    this.size = Math.min(w, h);
    this.ox = (w - this.size) / 2; this.oy = (h - this.size) / 2; // grille carrée centrée dans un canvas non carré
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, this.ox * dpr, this.oy * dpr);
    this.cell = this.size / this.N;
    this.draw();
  }

  reset() {
    const c = this.N / 2;
    this.snake = [{ x: c, y: c }, { x: c - 1, y: c }, { x: c - 2, y: c }];
    this.dir = { x: 1, y: 0 };
    this.queue = [];
    this.score = 0;
    this.placeApple();
  }

  placeApple() {
    const free = [];
    for (let y = 0; y < this.N; y++) for (let x = 0; x < this.N; x++)
      if (!this.snake.some(s => s.x === x && s.y === y)) free.push({ x, y });
    this.apple = free[Math.floor(Math.random() * free.length)] || null;
  }

  interval() { return Math.max(70, this.baseSpeed - 10 * Math.floor(this.score / 5)); }

  arm() {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.tick(), this.interval());
  }

  start() {
    if (this.state === 'over') this.reset();
    this.state = 'running';
    this.msg = '';
    this.arm();
    this.draw();
  }

  pause(msg = 'Pause') {
    if (this.state !== 'running') return;
    clearInterval(this.timer);
    this.state = 'paused';
    this.msg = msg;
    this.draw();
  }

  resume() { if (this.state === 'paused') this.start(); }

  destroy() { clearInterval(this.timer); this.state = 'idle'; }

  // Buffer de 2 directions max ; refuse le demi-tour et les doublons.
  setDirection(x, y) {
    const last = this.queue[this.queue.length - 1] || this.dir;
    if (this.queue.length >= 2 || (last.x === -x && last.y === -y) || (last.x === x && last.y === y)) return;
    this.queue.push({ x, y });
  }

  tick() {
    if (this.queue.length) this.dir = this.queue.shift();
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };
    if (this.wrap) { head.x = (head.x + this.N) % this.N; head.y = (head.y + this.N) % this.N; }
    else if (head.x < 0 || head.y < 0 || head.x >= this.N || head.y >= this.N) return this.die();
    const eats = this.apple && head.x === this.apple.x && head.y === this.apple.y;
    if (!eats) this.snake.pop(); // la queue libère sa case avant le test de collision
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) return this.die();
    this.snake.unshift(head);
    if (eats) {
      this.score++;
      this.onScore(this.score);
      this.placeApple();
      if (this.score % 5 === 0) this.arm();
    }
    this.draw();
  }

  die() {
    clearInterval(this.timer);
    this.state = 'over';
    this.msg = 'Entrée pour rejouer';
    this.draw();
    this.onGameOver(this.score);
  }

  draw() {
    const { ctx, cell, size } = this;
    ctx.fillStyle = '#fff';
    ctx.fillRect(-this.ox, -this.oy, size + 2 * this.ox, size + 2 * this.oy);
    const r = cell * 0.3, pad = cell * 0.1;
    const box = p => { ctx.beginPath(); ctx.roundRect(p.x * cell + pad, p.y * cell + pad, cell - 2 * pad, cell - 2 * pad, r); ctx.fill(); };
    if (this.apple) { ctx.fillStyle = '#b8b8b8'; box(this.apple); }
    ctx.fillStyle = this.color;
    this.snake.forEach(box);
    ctx.fillStyle = 'rgba(0,0,0,.15)'; // tête un poil plus foncée
    box(this.snake[0]);
    if (this.msg) {
      ctx.fillStyle = '#888';
      ctx.font = `${Math.max(10, size / 16)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.msg, size / 2, size / 2);
    }
  }
}
