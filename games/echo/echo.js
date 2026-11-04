// Echo Pads: watch the pads light up, then tap them in the same order. A miss just replays the tune.
// The music choice skips the game, so the pads can simply be played.
const PADS = [
  { icon: 'star', color: '#ffe14d', note: 261.63 },
  { icon: 'favorite', color: '#ff6a4d', note: 329.63 },
  { icon: 'bolt', color: '#58c6ff', note: 392 },
  { icon: 'forest', color: '#4cc47a', note: 523.25 },
];
const LENGTHS = [3, 5, 7];
const SHOW_MS = 480;
const GAP_MS = 190;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let goal = LENGTHS[0];
let tune = [];
let step = 0;
let listening = false;
let freePlay = false;
let buttons = [];

async function flash(index, ms = 260) {
  const pad = buttons[index];
  pad.classList.add('lit');
  Sfx.play('note', PADS[index].note);
  await wait(ms);
  pad.classList.remove('lit');
}

async function playTune() {
  listening = false;
  await wait(650);
  for (const index of tune) {
    await flash(index, SHOW_MS);
    await wait(GAP_MS);
  }
  step = 0;
  listening = true;
}

async function press(index) {
  if (freePlay) { flash(index); return; }
  if (!listening) return;
  flash(index);
  if (index !== tune[step]) {
    listening = false;
    Sfx.play('drop');
    await playTune();
    return;
  }
  step++;
  if (step < tune.length) return;

  listening = false;
  Arcade.showRounds($('rounds'), goal, tune.length);
  await wait(320);
  Sfx.play('snap', tune.length);
  Arcade.burst(buttons[index]);
  if (tune.length >= goal) { Arcade.finish($('done')); return; }
  tune.push(Math.floor(Math.random() * PADS.length));
  await playTune();
}

function start() {
  $('done').hidden = true;
  $('setup').hidden = true;
  $('rounds').hidden = freePlay;
  if (freePlay) return;
  tune = [Math.floor(Math.random() * PADS.length)];
  Arcade.showRounds($('rounds'), goal, 0);
  playTune();
}

function choice(label, onPick, aria) {
  const button = document.createElement('button');
  button.className = 'btn';
  button.innerHTML = label;
  button.setAttribute('aria-label', aria);
  button.onclick = () => { Sfx.play('tap'); onPick(); };
  return button;
}

buttons = PADS.map((pad, index) => {
  const button = document.createElement('button');
  button.className = 'pad';
  button.style.setProperty('--pad', pad.color);
  button.setAttribute('aria-label', `Pad ${index + 1}`);
  button.addEventListener('pointerdown', () => press(index));
  return button;
});
$('pads').replaceChildren(...buttons);

$('again').onclick = () => { Sfx.play('tap'); start(); };
Icons.fill();
Arcade.soundButton($('sound'));
buttons.forEach((button, index) => { button.innerHTML = Icons.svg(PADS[index].icon); });
$('sizes').replaceChildren(
  ...LENGTHS.map(length => choice(length, () => { goal = length; freePlay = false; start(); }, `Tune of ${length} notes`)),
  choice(Icons.svg('piano'), () => { freePlay = true; start(); }, 'Play freely'),
);
$('setup').hidden = false;
