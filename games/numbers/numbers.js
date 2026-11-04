// Number Pop: tap the number you hear or count the stars. Every right answer uncovers more of a picture.
// The player can't read yet, so the number is also spoken aloud.
const LIMITS = [5, 10, 20];
const TILES = 9;
const ANSWERS = 4;
const COUNT_STARS_UP_TO = 10;
const NEXT_ROUND_MS = 700;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let pictures = [];
let limit = LIMITS[0];
let target = 0;
let hidden = [];
let streak = 0;
let locked = false;

function say(number) {
  if (Sfx.muted || !window.speechSynthesis) return;
  speechSynthesis.cancel();
  const voice = new SpeechSynthesisUtterance(String(number));
  voice.lang = navigator.language;
  voice.rate = .85;
  speechSynthesis.speak(voice);
}

function ask() {
  let next = target;
  while (next === target) next = 1 + Math.floor(Math.random() * limit);
  target = next;

  const stars = target <= COUNT_STARS_UP_TO && Math.random() < .5;
  $('target').className = stars ? 'target stars' : 'target';
  $('target').innerHTML = stars ? Icons.svg('star').repeat(target) : target;
  if (!stars) say(target);

  const options = new Set([target]);
  while (options.size < Math.min(ANSWERS, limit)) options.add(1 + Math.floor(Math.random() * limit));
  $('answers').replaceChildren(...Arcade.shuffled([...options]).map(number => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = number;
    button.setAttribute('aria-label', String(number));
    button.onclick = () => answer(button, number);
    return button;
  }));
  locked = false;
}

async function answer(button, number) {
  if (locked) return;
  if (number !== target) {
    streak = 0;
    Sfx.play('drop');
    button.classList.remove('shake');
    void button.offsetWidth;
    button.classList.add('shake');
    say(target);
    return;
  }
  locked = true;
  streak++;
  Sfx.play('snap', streak);
  Sfx.buzz(14);
  Arcade.burst(button);
  say(number);

  const tile = hidden.pop();
  tile.classList.add('gone');
  if (hidden.length) {
    await wait(NEXT_ROUND_MS);
    ask();
    return;
  }
  Sfx.music(false);
  await wait(500);
  Sfx.play('win');
  Sfx.buzz([24, 40, 24, 40, 60]);
  Arcade.rain();
  await wait(1700);
  $('done').hidden = false;
  await wait(800);
  Arcade.reward();
}

function deal() {
  const picture = Arcade.shuffled(pictures)[0];
  $('prize').hidden = !picture;
  if (picture) $('prize').src = picture.thumb;
  const tiles = Array.from({ length: TILES }, () => {
    const tile = document.createElement('div');
    tile.className = 'tile-cover';
    tile.innerHTML = Icons.svg('question_mark');
    return tile;
  });
  $('cover').replaceChildren(...tiles);
  hidden = Arcade.shuffled(tiles);
  streak = 0;
  target = 0;
  $('done').hidden = true;
  Sfx.music(true);
  ask();
}

function showSetup() {
  $('sizes').replaceChildren(...LIMITS.map(number => {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = number;
    button.setAttribute('aria-label', `Numbers up to ${number}`);
    button.onclick = () => {
      Sfx.play('tap');
      limit = number;
      $('setup').hidden = true;
      deal();
    };
    return button;
  }));
  $('setup').hidden = false;
}

$('say').onclick = () => { say(target); };
$('again').onclick = () => { Sfx.play('tap'); deal(); };

async function begin() {
  Icons.fill();
  Arcade.soundButton($('sound'));
  try { pictures = await ownPictures.list(); } catch (e) {}
  showSetup();
}

begin();
