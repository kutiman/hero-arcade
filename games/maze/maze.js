// Maze Rover: drag the robot through the maze to the flag. Three mazes make a game.
const SIZES = [5, 7, 9];
const MAZES = 3;
const REACH = 3;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const canvas = $('maze');
const c = canvas.getContext('2d');
const rover = Icons.path('smart_toy');
const flag = Icons.path('flag');

let size = SIZES[0];
let walls = [];
let spot = { x: 0, y: 0 };
let trail = [];
let done = 0;
let cell = 40;
let dragging = false;
let locked = false;

const key = (x, y) => y * size + x;
const DIRECTIONS = [[0, -1, 0, 2], [1, 0, 1, 3], [0, 1, 2, 0], [-1, 0, 3, 1]];

// Carves a maze by wandering and backtracking, so every cell can be reached.
function carve() {
  walls = Array.from({ length: size * size }, () => [true, true, true, true]);
  const seen = new Set([key(0, 0)]);
  const stack = [[0, 0]];
  while (stack.length) {
    const [x, y] = stack[stack.length - 1];
    const next = Arcade.shuffled(DIRECTIONS).find(([dx, dy]) => {
      const nx = x + dx, ny = y + dy;
      return nx >= 0 && ny >= 0 && nx < size && ny < size && !seen.has(key(nx, ny));
    });
    if (!next) { stack.pop(); continue; }
    const [dx, dy, side, back] = next;
    walls[key(x, y)][side] = false;
    walls[key(x + dx, y + dy)][back] = false;
    seen.add(key(x + dx, y + dy));
    stack.push([x + dx, y + dy]);
  }
}

function fit() {
  const box = $('field').getBoundingClientRect();
  const side = Math.floor(Math.min(box.width, box.height));
  const dpr = window.devicePixelRatio || 1;
  canvas.style.width = canvas.style.height = `${side}px`;
  canvas.width = canvas.height = Math.round(side * dpr);
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  cell = side / size;
  draw();
}

function drawIcon(path, x, y, s, color) {
  c.save();
  c.translate(x - s / 2, y + s / 2);
  c.scale(s / 960, s / 960);
  c.lineJoin = 'round';
  c.lineWidth = 100;
  c.strokeStyle = '#111111';
  c.stroke(path);
  c.fillStyle = color;
  c.fill(path);
  c.restore();
}

function draw() {
  const side = cell * size;
  c.fillStyle = '#fffdf3';
  c.fillRect(0, 0, side, side);

  c.fillStyle = '#ffe14d';
  for (const [x, y] of trail) c.fillRect(x * cell, y * cell, cell, cell);

  c.strokeStyle = '#111111';
  c.lineCap = 'round';
  c.lineWidth = Math.max(4, cell * .1);
  c.beginPath();
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const [top, right, bottom, left] = walls[key(x, y)];
      const px = x * cell, py = y * cell;
      if (top) { c.moveTo(px, py); c.lineTo(px + cell, py); }
      if (right) { c.moveTo(px + cell, py); c.lineTo(px + cell, py + cell); }
      if (bottom) { c.moveTo(px, py + cell); c.lineTo(px + cell, py + cell); }
      if (left) { c.moveTo(px, py); c.lineTo(px, py + cell); }
    }
  }
  c.stroke();

  drawIcon(flag, (size - .5) * cell, (size - .5) * cell, cell * .74, '#e3261c');
  drawIcon(rover, (spot.x + .5) * cell, (spot.y + .5) * cell, cell * .78, '#58c6ff');
}

// The shortest open route to a nearby cell, or nothing if it's behind a wall.
function route(toX, toY) {
  const queue = [{ x: spot.x, y: spot.y, path: [] }];
  const seen = new Set([key(spot.x, spot.y)]);
  while (queue.length) {
    const { x, y, path } = queue.shift();
    if (x === toX && y === toY) return path;
    if (path.length >= REACH) continue;
    DIRECTIONS.forEach(([dx, dy, side]) => {
      const nx = x + dx, ny = y + dy;
      if (walls[key(x, y)][side] || seen.has(key(nx, ny))) return;
      seen.add(key(nx, ny));
      queue.push({ x: nx, y: ny, path: [...path, [nx, ny]] });
    });
  }
  return null;
}

async function follow(event) {
  if (locked) return;
  const box = canvas.getBoundingClientRect();
  const x = Math.floor((event.clientX - box.left) / cell);
  const y = Math.floor((event.clientY - box.top) / cell);
  if (x < 0 || y < 0 || x >= size || y >= size || (x === spot.x && y === spot.y)) return;
  const path = route(x, y);
  if (!path) return;
  for (const [px, py] of path) {
    trail.push([px, py]);
    spot = { x: px, y: py };
  }
  Sfx.play('near');
  draw();
  if (spot.x === size - 1 && spot.y === size - 1) reached();
}

async function reached() {
  locked = true;
  dragging = false;
  done++;
  Arcade.showRounds($('rounds'), MAZES, done);
  Sfx.play('snap', done * 2);
  Sfx.buzz(14);
  Arcade.burst(canvas);
  await wait(900);
  if (done < MAZES) newMaze();
  else Arcade.finish($('done'));
}

function newMaze() {
  carve();
  spot = { x: 0, y: 0 };
  trail = [[0, 0]];
  locked = false;
  fit();
}

function start() {
  $('setup').hidden = true;
  $('done').hidden = true;
  done = 0;
  Arcade.showRounds($('rounds'), MAZES, 0);
  Sfx.music(true);
  newMaze();
}

function showSetup() {
  $('sizes').replaceChildren(...SIZES.map(number => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = number;
    button.setAttribute('aria-label', `Maze size ${number}`);
    button.onclick = () => { Sfx.play('tap'); size = number; start(); };
    return button;
  }));
  $('setup').hidden = false;
}

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  dragging = true;
  follow(event);
});
canvas.addEventListener('pointermove', event => { if (dragging) follow(event); });
canvas.addEventListener('pointerup', () => { dragging = false; });
canvas.addEventListener('pointercancel', () => { dragging = false; });
$('again').onclick = () => { Sfx.play('tap'); showSetup(); };
new ResizeObserver(() => { if (walls.length) fit(); }).observe($('field'));

Icons.fill();
Arcade.soundButton($('sound'));
showSetup();
