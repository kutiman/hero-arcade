// Scratch Reveal: rub away the cover, then tap the small picture that matches what's underneath.
const ROUNDS = 5;
const CHOICES = 3;
const NEXT_ROUND_MS = 1500;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let pictures = [];
let deck = [];
let answer = null;
let round = 0;
let streak = 0;
let locked = false;
let rubbing = false;
let last = null;

const canvas = $('cover');
const paint = canvas.getContext('2d');

function coverPicture() {
  const box = $('frame').getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.round(box.width * dpr);
  canvas.height = Math.round(box.height * dpr);
  paint.setTransform(dpr, 0, 0, dpr, 0, 0);
  paint.globalCompositeOperation = 'source-over';
  paint.fillStyle = '#ffe14d';
  paint.fillRect(0, 0, box.width, box.height);
  paint.fillStyle = '#ff6a4d';
  for (let y = 8, row = 0; y < box.height; y += 15, row++) {
    for (let x = 8 + (row % 2) * 8; x < box.width; x += 16) {
      paint.beginPath();
      paint.arc(x, y, 3.4, 0, 7);
      paint.fill();
    }
  }
  const size = Math.min(box.width, box.height) * .5;
  paint.save();
  paint.translate(box.width / 2 - size / 2, box.height / 2 + size / 2);
  paint.scale(size / 960, size / 960);
  paint.lineJoin = 'round';
  paint.lineWidth = 90;
  paint.strokeStyle = '#111111';
  const mark = Icons.path('touch_app');
  paint.stroke(mark);
  paint.fillStyle = '#fffdf3';
  paint.fill(mark);
  paint.restore();
  paint.globalCompositeOperation = 'destination-out';
  paint.lineCap = paint.lineJoin = 'round';
  paint.lineWidth = Math.max(44, Math.min(box.width, box.height) * .17);
}

function spot(event) {
  const box = canvas.getBoundingClientRect();
  return { x: event.clientX - box.left, y: event.clientY - box.top };
}

function rub(to) {
  paint.beginPath();
  paint.moveTo(last.x, last.y);
  paint.lineTo(to.x + .1, to.y);
  paint.stroke();
  last = to;
}

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  rubbing = true;
  last = spot(event);
  rub(last);
  Sfx.play('near');
});
canvas.addEventListener('pointermove', event => { if (rubbing) rub(spot(event)); });
canvas.addEventListener('pointerup', () => { rubbing = false; });
canvas.addEventListener('pointercancel', () => { rubbing = false; });

function showRounds() {
  $('rounds').innerHTML = Array.from({ length: ROUNDS }, (item, index) =>
    `<span class="${index < round ? 'on' : ''}">${Icons.svg('star')}</span>`).join('');
}

async function guess(button, picture) {
  if (locked) return;
  if (picture !== answer) {
    streak = 0;
    Sfx.play('drop');
    button.classList.remove('shake');
    void button.offsetWidth;
    button.classList.add('shake');
    return;
  }
  locked = true;
  streak++;
  round++;
  showRounds();
  Sfx.play('snap', streak);
  Sfx.buzz(14);
  Arcade.burst(button);
  canvas.classList.add('open');
  await wait(NEXT_ROUND_MS);
  if (round < ROUNDS) { nextPicture(); return; }

  Sfx.music(false);
  Sfx.play('win');
  Sfx.buzz([24, 40, 24, 40, 60]);
  Arcade.rain();
  await wait(1500);
  $('done').hidden = false;
  await wait(800);
  Arcade.reward();
}

async function nextPicture() {
  answer = deck.pop();
  const others = Arcade.shuffled(pictures.filter(p => p !== answer)).slice(0, CHOICES - 1);
  const image = $('hidden-picture');
  image.src = answer.thumb;
  await image.decode().catch(() => {});
  canvas.classList.remove('open');
  coverPicture();
  $('guesses').replaceChildren(...Arcade.shuffled([answer, ...others]).map((picture, index) => {
    const button = document.createElement('button');
    button.className = 'guess';
    button.setAttribute('aria-label', `Picture ${index + 1}`);
    button.innerHTML = `<img alt="" draggable="false" src="${picture.thumb}">`;
    button.onclick = () => guess(button, picture);
    return button;
  }));
  locked = false;
}

function deal() {
  $('done').hidden = true;
  deck = Arcade.shuffled(pictures).slice(0, ROUNDS);
  round = 0;
  streak = 0;
  showRounds();
  Sfx.music(true);
  nextPicture();
}

$('again').onclick = () => { Sfx.play('tap'); deal(); };
new ResizeObserver(() => { if (answer && !canvas.classList.contains('open')) coverPicture(); }).observe($('frame'));

async function begin() {
  Icons.fill();
  Arcade.soundButton($('sound'));
  try { pictures = await ownPictures.list(); } catch (e) {}
  if (pictures.length < ROUNDS) $('need-pictures').hidden = false;
  else deal();
}

begin();
