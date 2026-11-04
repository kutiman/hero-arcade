// Shape Sort: drag each colored shape into the hole with the same outline.
const SHAPES = [
  ['star', '#ffe14d'], ['favorite', '#e3261c'], ['bolt', '#58c6ff'], ['pets', '#c98a4b'],
  ['sports_soccer', '#ffffff'], ['directions_car', '#ff6a4d'], ['flight', '#58c6ff'], ['cake', '#ff9ec4'],
  ['icecream', '#ffd1a1'], ['sunny', '#ffe14d'], ['rocket_launch', '#ff6a4d'], ['crown', '#ffe14d'],
  ['forest', '#4cc47a'], ['music_note', '#ff9ec4'], ['train', '#58c6ff'], ['diamond', '#58c6ff'],
];
const ROUND_SIZES = [2, 3, 3, 4, 4];
const SNAP_REACH = .75;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let round = 0;
let left = 0;
let streak = 0;

function drag(piece, hole) {
  let startX = 0, startY = 0;
  piece.addEventListener('pointerdown', event => {
    if (piece.classList.contains('placed')) return;
    piece.setPointerCapture(event.pointerId);
    startX = event.clientX;
    startY = event.clientY;
    piece.classList.add('held');
    Sfx.play('pick');
  });
  piece.addEventListener('pointermove', event => {
    if (!piece.classList.contains('held')) return;
    piece.style.transform = `translate(${event.clientX - startX}px, ${event.clientY - startY}px) scale(1.12)`;
  });
  const drop = event => {
    if (!piece.classList.contains('held')) return;
    piece.classList.remove('held');
    const target = hole.getBoundingClientRect();
    const box = piece.getBoundingClientRect();
    const distance = Math.hypot(box.left + box.width / 2 - target.left - target.width / 2, box.top + box.height / 2 - target.top - target.height / 2);
    if (distance < target.width * SNAP_REACH) place(piece, hole);
    else { piece.style.transform = ''; streak = 0; Sfx.play('drop'); }
  };
  piece.addEventListener('pointerup', drop);
  piece.addEventListener('pointercancel', drop);
}

async function place(piece, hole) {
  const from = piece.getBoundingClientRect();
  piece.style.transform = '';
  const rest = piece.getBoundingClientRect();
  const target = hole.getBoundingClientRect();
  piece.classList.add('placed');
  piece.style.transform = `translate(${target.left - rest.left}px, ${target.top - rest.top}px)`;
  hole.classList.add('filled');
  streak++;
  left--;
  Sfx.play('snap', streak);
  Sfx.buzz(14);
  Arcade.burst(hole);
  if (from && left === 0) {
    round++;
    Arcade.showRounds($('rounds'), ROUND_SIZES.length, round);
    await wait(800);
    if (round < ROUND_SIZES.length) deal();
    else Arcade.finish($('done'));
  }
}

function deal() {
  const chosen = Arcade.shuffled(SHAPES).slice(0, ROUND_SIZES[round]);
  left = chosen.length;
  const holes = chosen.map(([icon]) => {
    const hole = document.createElement('div');
    hole.className = 'hole';
    hole.innerHTML = Icons.svg(icon);
    return hole;
  });
  const pieces = chosen.map(([icon, color], index) => {
    const piece = document.createElement('div');
    piece.className = 'piece';
    piece.style.color = color;
    piece.setAttribute('role', 'button');
    piece.setAttribute('aria-label', `Shape ${index + 1}`);
    piece.innerHTML = Icons.svg(icon);
    drag(piece, holes[index]);
    return piece;
  });
  $('holes').replaceChildren(...Arcade.shuffled(holes));
  $('pieces').replaceChildren(...Arcade.shuffled(pieces));
}

function start() {
  $('done').hidden = true;
  round = 0;
  streak = 0;
  Arcade.showRounds($('rounds'), ROUND_SIZES.length, 0);
  Sfx.music(true);
  deal();
}

$('again').onclick = () => { Sfx.play('tap'); start(); };
Icons.fill();
Arcade.soundButton($('sound'));
start();
