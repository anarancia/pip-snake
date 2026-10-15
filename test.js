// Auto-vérification du moteur : node test.js
const assert = require('assert');
const fs = require('fs');
new Function(fs.readFileSync(__dirname + '/snake.js', 'utf8') + '; globalThis.Snake = Snake;')();
const ctx = new Proxy({}, { get: () => () => {}, set: () => true });
const canvas = { clientWidth: 160, clientHeight: 160, getContext: () => ctx };

let scores = [], over = null;
const s = new Snake(canvas, { onScore: n => scores.push(n), onGameOver: n => { over = n; } });
s.timer = 1; s.state = 'running'; // on pilote tick() à la main
assert.deepStrictEqual(s.snake[0], { x: 8, y: 8 });
s.apple = { x: 10, y: 8 };
s.tick(); s.tick();
assert.deepStrictEqual(s.snake[0], { x: 10, y: 8 });
assert.strictEqual(s.snake.length, 4, 'pomme = +1 segment');
assert.deepStrictEqual(scores, [1]);

s.setDirection(-1, 0); // demi-tour refusé
s.setDirection(0, -1); s.setDirection(1, 0); s.setDirection(0, 1); // 3e direction ignorée (buffer 2)
assert.strictEqual(s.queue.length, 2);
s.apple = { x: 0, y: 0 };
s.tick(); assert.deepStrictEqual(s.snake[0], { x: 10, y: 7 });
s.tick(); assert.deepStrictEqual(s.snake[0], { x: 11, y: 7 });

for (let i = 0; i < 10 && s.state === 'running'; i++) s.tick();
assert.strictEqual(s.state, 'over', 'mur = mort');
assert.strictEqual(over, 1);

const w = new Snake(canvas, { wrap: true });
w.timer = 1; w.state = 'running'; w.apple = { x: 0, y: 0 };
for (let i = 0; i < 8; i++) w.tick();
assert.deepStrictEqual(w.snake[0], { x: 0, y: 8 }, 'wrap');
assert.strictEqual(w.state, 'running');

console.log('ok');
