// Memory Match: flip two cards to find pairs of the player's own pictures. One player, or two taking turns.
// The player can't read yet, so everything on screen is a picture, an icon or a number.
const SIZES = [6, 12, 16, 20];
const PICTURES_NEEDED = SIZES[0] / 2;
const TURN_BACK_MS = 1100;
const MATCH_MS = 380;
const SPOTLIGHT_MS = 900;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let pictures = [];
let players = 1;
let size = SIZES[0];
let deck = [];
let open = [];
let busy = false;
let turn = 0;
let scores = [0, 0];
let streak = 0;
let found = 0;

// Picks the column count that gives the biggest cards on this screen.
function fitCards() {
  const box = $('table').getBoundingClientRect();
  const gap = box.width < 500 ? 8 : 12;
  const width = box.width - 28 - 6;
  const height = box.height - 20 - 6;
  let best = { card: 0, cols: 2 };
  for (let cols = 2; cols <= deck.length; cols++) {
    const rows = Math.ceil(deck.length / cols);
    const card = Math.min((width - gap * (cols - 1)) / cols, (height - gap * (rows - 1)) / rows * .8);
    if (card > best.card) best = { card, cols };
  }
  const style = $('cards').style;
  style.setProperty('--cols', best.cols);
  style.setProperty('--card', `${Math.floor(best.card)}px`);
  style.setProperty('--gap', `${gap}px`);
}

function showScores() {
  $('score-1').textContent = scores[0];
  $('score-2').textContent = scores[1];
  $('player-1').classList.toggle('active', turn === 0);
  $('player-2').classList.toggle('active', turn === 1);
  $('player-2').hidden = players === 1;
  document.body.classList.toggle('two-players', players === 2);
}

async function deal() {
  const chosen = Arcade.shuffled(pictures).slice(0, size / 2);
  deck = Arcade.shuffled([...chosen, ...chosen].map(picture => ({ picture })));
  open = [];
  busy = false;
  turn = 0;
  scores = [0, 0];
  streak = 0;
  found = 0;
  showScores();

  // Load every picture first, so a card never flips over to a blank face.
  const images = chosen.map(picture => {
    const image = new Image();
    image.src = picture.thumb;
    return image.decode().catch(() => {});
  });
  await Promise.all(images);

  $('cards').replaceChildren(...deck.map((card, index) => {
    const button = document.createElement('button');
    button.className = 'card';
    button.style.setProperty('--order', index);
    button.setAttribute('aria-label', `Card ${index + 1}`);
    button.innerHTML = `<span class="inner"><span class="face back">${Icons.svg('extension')}</span>`
      + `<span class="face front"><img alt="" draggable="false" src="${card.picture.thumb}"></span></span>`;
    button.onclick = () => flip(card);
    card.el = button;
    return button;
  }));
  fitCards();
  Sfx.play('whoosh');
  Sfx.music(true);
}

async function flip(card) {
  if (busy || open.includes(card) || card.found) return;
  Sfx.play('pick');
  Sfx.buzz(6);
  card.el.classList.add('up');
  open.push(card);
  if (open.length < 2) return;

  busy = true;
  const [first, second] = open;
  if (first.picture === second.picture) {
    await wait(MATCH_MS);
    for (const match of open) {
      match.found = true;
      match.el.classList.add('found');
    }
    streak++;
    found += 2;
    scores[turn]++;
    Sfx.play('snap', streak);
    Sfx.buzz(14);
    Arcade.burst(first.el, second.el);
    showScores();
    await spotlight(first.picture);
    open = [];
    busy = false;
    if (found === deck.length) finish();
    return;
  }

  await wait(TURN_BACK_MS);
  Sfx.play('drop');
  for (const miss of open) miss.el.classList.add('miss');
  await wait(260);
  for (const miss of open) miss.el.classList.remove('up', 'miss');
  open = [];
  streak = 0;
  if (players === 2) turn = 1 - turn;
  showScores();
  busy = false;
}

// Shows the found picture big for a moment, because it's the prize for the match.
async function spotlight(picture) {
  const el = $('spotlight');
  el.src = picture.thumb;
  el.hidden = false;
  await wait(SPOTLIGHT_MS);
  el.hidden = true;
}

async function finish() {
  Sfx.music(false);
  await wait(450);
  Sfx.play('win');
  Sfx.buzz([24, 40, 24, 40, 60]);
  Arcade.rain();

  const result = $('result');
  if (players === 1) {
    result.innerHTML = `<div class="player one winner">${Icons.svg('star')}${scores[0]}</div>`;
  } else {
    const top = Math.max(...scores);
    result.innerHTML = scores.map((score, index) => {
      const won = score === top;
      return `<div class="player ${index ? 'two' : 'one'} ${won ? 'winner' : ''}">`
        + `${won ? Icons.svg('trophy') : Icons.svg('person')}${score}</div>`;
    }).join('');
  }
  await wait(1100);
  $('done').hidden = false;
  await wait(900);
  Arcade.reward();
}

function showSetup() {
  Sfx.music(false);
  $('done').hidden = true;
  $('solo').classList.toggle('on', players === 1);
  $('duo').classList.toggle('on', players === 2);
  const sizes = $('sizes');
  sizes.textContent = '';
  for (const count of SIZES.filter(n => n / 2 <= pictures.length)) {
    const button = document.createElement('button');
    button.className = 'btn';
    button.textContent = count;
    button.setAttribute('aria-label', `${count} cards`);
    button.onclick = () => {
      Sfx.play('tap');
      size = count;
      $('setup').hidden = true;
      deal();
    };
    sizes.append(button);
  }
  $('setup').hidden = false;
}

function choosePlayers(count) {
  Sfx.play('tap');
  players = count;
  $('solo').classList.toggle('on', players === 1);
  $('duo').classList.toggle('on', players === 2);
}

$('solo').onclick = () => choosePlayers(1);
$('duo').onclick = () => choosePlayers(2);
$('again').onclick = () => { Sfx.play('tap'); $('done').hidden = true; deal(); };
$('change').onclick = () => { Sfx.play('tap'); showSetup(); };
new ResizeObserver(() => { if (deck.length) fitCards(); }).observe($('table'));

async function begin() {
  Icons.fill();
  Arcade.soundButton($('sound'));
  try { pictures = await ownPictures.list(); } catch (e) {}
  if (pictures.length < PICTURES_NEEDED) $('need-pictures').hidden = false;
  else showSetup();
}

begin();
