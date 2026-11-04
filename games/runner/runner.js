// Bolt Run: Bolt the robot rolls along by himself. Tap to jump, catch stars, and hop over the crates.
// Bumping a crate only slows him for a moment, so nobody can lose.
const GOALS = [10, 20, 30];
const SPEED = 3.6;
const SLOW_SPEED = 1.5;
const GRAVITY = .52;
const JUMP = -11.5;
const SLOW_MS = 800;

const $ = id => document.getElementById(id);
const canvas = $('world');
const c = canvas.getContext('2d');
const city = new Image();
city.src = '../../shared/city.svg';
const starPath = Icons.path('star');

let view = { w: 0, h: 0, ground: 0, unit: 1 };
let bot = { y: 0, vy: 0, jumps: 0, spin: 0 };
let things = [];
let distance = 0;
let nextThing = 0;
let got = 0;
let goal = GOALS[0];
let running = false;
let slowUntil = 0;
let lastFrame = 0;
let frame = 0;

function fit() {
  const box = $('track').getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  view = { w: box.width, h: box.height, ground: box.height * .82, unit: Math.min(box.height / 420, Math.max(.8, box.width / 560), 1.5) };
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (!running) draw(performance.now());
}

function spawn() {
  const x = view.w + 60;
  const roll = Math.random();
  const u = view.unit;
  if (roll < .36) {
    things.push({ type: 'crate', x, size: 52 * u });
  } else {
    const height = roll < .7 ? 70 : 170;
    things.push({ type: 'star', x, y: view.ground - height * u, size: 46 * u });
  }
  nextThing = distance + (170 + Math.random() * 170) * u;
}

function jump() {
  if (!running || bot.jumps >= 2) return;
  bot.vy = JUMP * view.unit;
  bot.jumps++;
  Sfx.play('jump');
}

function update(now, f) {
  const slow = now < slowUntil;
  const speed = (slow ? SLOW_SPEED : SPEED) * view.unit * f;
  distance += speed;
  bot.spin += speed * .05;
  bot.vy += GRAVITY * view.unit * f;
  bot.y += bot.vy * f;
  if (bot.y >= 0) { bot.y = 0; bot.vy = 0; bot.jumps = 0; }
  if (distance >= nextThing) spawn();

  const botX = view.w * .22;
  const botSize = 74 * view.unit;
  const botY = view.ground + bot.y - botSize / 2;
  for (const thing of things) {
    thing.x -= speed;
    if (thing.type === 'star' && !thing.taken && Math.hypot(thing.x - botX, thing.y - botY) < (botSize + thing.size) * .55) {
      thing.taken = true;
      got++;
      $('got').textContent = got;
      Sfx.play('snap', Math.min(got, 11));
      Sfx.buzz(10);
      if (got >= goal) win();
    }
    if (thing.type === 'crate' && !thing.hit && Math.abs(thing.x - botX) < (botSize + thing.size) * .42 && -bot.y < thing.size * .75) {
      thing.hit = true;
      slowUntil = now + SLOW_MS;
      Sfx.play('bump');
      Sfx.buzz(30);
    }
  }
  things = things.filter(thing => thing.x > -80 && !thing.taken);
}

function drawBolt(x, y, size, now) {
  const hurt = now < slowUntil;
  c.save();
  c.translate(x, y);
  c.scale(size / 100, size / 100);
  c.lineWidth = 6;
  c.strokeStyle = '#111111';
  c.lineJoin = c.lineCap = 'round';

  c.beginPath();
  c.moveTo(0, -46); c.lineTo(8, -70);
  c.stroke();
  c.fillStyle = '#ff6a4d';
  c.beginPath(); c.arc(9, -74, 9, 0, 7); c.fill(); c.stroke();

  c.fillStyle = '#ffe14d';
  c.beginPath(); c.roundRect(-40, -46, 80, 72, 22); c.fill(); c.stroke();

  c.fillStyle = '#111111';
  c.beginPath(); c.roundRect(-28, -34, 60, 32, 14); c.fill();
  c.fillStyle = hurt ? '#ff6a4d' : '#58c6ff';
  [-10, 16].forEach(ex => {
    c.beginPath(); c.arc(ex, -18, 9, 0, 7); c.fill();
  });
  c.strokeStyle = '#111111';
  c.beginPath(); c.arc(2, 8, 11, .2, Math.PI - .2); c.stroke();

  c.save();
  c.translate(0, 34);
  c.rotate(bot.spin);
  c.fillStyle = '#1746c7';
  c.beginPath(); c.arc(0, 0, 18, 0, 7); c.fill(); c.stroke();
  c.fillStyle = '#fffdf3';
  c.fillRect(-3, -14, 6, 28);
  c.restore();
  c.restore();
}

function drawStar(x, y, size) {
  const k = size / 960;
  c.save();
  c.translate(x - size / 2, y + size / 2);
  c.scale(k, k);
  c.lineJoin = 'round';
  c.lineWidth = 110;
  c.strokeStyle = '#111111';
  c.stroke(starPath);
  c.fillStyle = '#ffe14d';
  c.fill(starPath);
  c.restore();
}

function drawCrate(x, size) {
  const top = view.ground - size + 18 * view.unit;
  c.fillStyle = '#ff6a4d';
  c.strokeStyle = '#111111';
  c.lineWidth = 5;
  c.fillRect(x - size / 2, top, size, size);
  c.strokeRect(x - size / 2, top, size, size);
  c.beginPath();
  c.moveTo(x - size / 2, top); c.lineTo(x + size / 2, top + size);
  c.moveTo(x + size / 2, top); c.lineTo(x - size / 2, top + size);
  c.stroke();
}

function draw(now) {
  const { w, h, ground, unit } = view;
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#2f6be6');
  sky.addColorStop(1, '#8fd0ff');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h);

  if (city.complete && city.naturalWidth) {
    const height = h * .62;
    const width = height * city.naturalWidth / city.naturalHeight;
    const offset = -(distance * .25) % width;
    for (let x = offset; x < w; x += width) c.drawImage(city, x, ground - height + 18 * unit, width, height);
  }

  c.fillStyle = '#ffe14d';
  c.fillRect(0, ground + 18 * unit, w, h);
  c.fillStyle = '#111111';
  c.fillRect(0, ground + 18 * unit, w, 6);
  c.fillStyle = 'rgba(17, 17, 17, .22)';
  const dash = 70 * unit;
  for (let x = -(distance % (dash * 2)); x < w; x += dash * 2) c.fillRect(x, ground + 40 * unit, dash, 8 * unit);

  for (const thing of things) {
    if (thing.type === 'star') drawStar(thing.x, thing.y, thing.size);
    else drawCrate(thing.x, thing.size);
  }
  const size = 74 * unit;
  drawBolt(w * .22, ground + bot.y - size * .15, size, now);
}

function tick(now) {
  if (!frame) return;
  const f = Math.min(2.5, (now - lastFrame) / 16.67);
  lastFrame = now;
  if (running) update(now, f);
  draw(now);
  if (frame) frame = requestAnimationFrame(tick);
}

function win() {
  running = false;
  Arcade.finish($('done'));
}

function start() {
  $('setup').hidden = true;
  $('done').hidden = true;
  things = [];
  got = 0;
  distance = 0;
  nextThing = 120;
  bot = { y: 0, vy: 0, jumps: 0, spin: 0 };
  slowUntil = 0;
  $('got').textContent = '0';
  running = true;
  lastFrame = performance.now();
  Sfx.music(true);
  if (!frame) frame = requestAnimationFrame(tick);
}

function showSetup() {
  $('sizes').replaceChildren(...GOALS.map(number => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = number;
    button.setAttribute('aria-label', `Catch ${number} stars`);
    button.onclick = () => { Sfx.play('tap'); goal = number; start(); };
    return button;
  }));
  $('setup').hidden = false;
}

$('track').addEventListener('pointerdown', jump);
window.addEventListener('keydown', event => {
  if (event.code === 'Space' || event.code === 'ArrowUp') { event.preventDefault(); jump(); }
});
$('again').onclick = () => { Sfx.play('tap'); start(); };
new ResizeObserver(fit).observe($('track'));
city.onload = () => { if (!running) draw(performance.now()); };

Icons.fill();
Arcade.soundButton($('sound'));
fit();
showSetup();
