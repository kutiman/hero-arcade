// Pattern Train: look at the repeating cars and tap the one that comes next.
const ICONS = [
  ['star', '#ffe14d'], ['favorite', '#e3261c'], ['bolt', '#58c6ff'], ['sports_soccer', '#ffffff'],
  ['pets', '#c98a4b'], ['icecream', '#ffd1a1'], ['forest', '#4cc47a'], ['sunny', '#ffe14d'], ['cake', '#ff9ec4'],
];
const PATTERNS = ['AB', 'AB', 'AAB', 'ABB', 'ABC', 'ABC', 'AABB', 'ABAC'];
const CARS = 7;
const CHOICES = 3;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let round = 0;
let streak = 0;
let answer = null;
let locked = false;

function car(item, extra = '') {
  const el = document.createElement('div');
  el.className = `car ${extra}`;
  if (item) {
    el.style.color = item[1];
    el.innerHTML = Icons.svg(item[0]);
  }
  return el;
}

function deal() {
  const rule = PATTERNS[round];
  const letters = [...new Set(rule)];
  const picks = Arcade.shuffled(ICONS);
  const lookup = Object.fromEntries(letters.map((letter, index) => [letter, picks[index]]));
  const sequence = Array.from({ length: CARS }, (item, index) => lookup[rule[index % rule.length]]);
  answer = sequence[CARS - 1];

  const engine = document.createElement('div');
  engine.className = 'car engine';
  engine.innerHTML = Icons.svg('train');
  $('train').className = 'train';
  $('train').replaceChildren(engine, ...sequence.slice(0, -1).map(item => car(item)), car(null, 'empty'));

  const wrong = picks.filter(item => item !== answer).slice(0, CHOICES - 1);
  $('options').replaceChildren(...Arcade.shuffled([answer, ...wrong]).map((item, index) => {
    const button = document.createElement('button');
    button.className = 'option';
    button.style.color = item[1];
    button.setAttribute('aria-label', `Choice ${index + 1}`);
    button.innerHTML = Icons.svg(item[0]);
    button.onclick = () => choose(button, item);
    return button;
  }));
  locked = false;
}

async function choose(button, item) {
  if (locked) return;
  if (item !== answer) {
    streak = 0;
    Sfx.play('drop');
    button.classList.remove('shake');
    void button.offsetWidth;
    button.classList.add('shake');
    return;
  }
  locked = true;
  streak++;
  const empty = $('train').querySelector('.empty');
  empty.classList.remove('empty');
  empty.style.color = item[1];
  empty.innerHTML = Icons.svg(item[0]);
  Sfx.play('snap', streak);
  Sfx.buzz(14);
  Arcade.burst(empty);
  round++;
  Arcade.showRounds($('rounds'), PATTERNS.length, round);
  await wait(600);
  Sfx.play('whoosh');
  $('train').classList.add('leaving');
  await wait(800);
  if (round < PATTERNS.length) deal();
  else Arcade.finish($('done'));
}

function start() {
  $('done').hidden = true;
  round = 0;
  streak = 0;
  Arcade.showRounds($('rounds'), PATTERNS.length, 0);
  Sfx.music(true);
  deal();
}

$('again').onclick = () => { Sfx.play('tap'); start(); };
Icons.fill();
Arcade.soundButton($('sound'));
start();
