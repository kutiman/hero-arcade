// Puzzle screens: picture gallery, difficulty picker, the game itself, scoring and progress.
// The player can't read yet, so everything on screen is a picture, an icon or a number.
const LEVELS = [
  { cols: 3, rows: 2, ghost: .3 },
  { cols: 4, rows: 3, ghost: .22 },
  { cols: 6, rows: 4, ghost: .13 },
  { cols: 8, rows: 6, ghost: .07 },
];
const RANKS = [
  { stars: 0, icon: 'eco' },
  { stars: 4, icon: 'bolt' },
  { stars: 10, icon: 'rocket_launch' },
  { stars: 20, icon: 'crown' },
  { stars: 36, icon: 'trophy' },
];
const PICTURE_WIDTH = 1600;
const MAX_OWN_SIZE = 1600;
const STARS_KEY = 'hero-arcade.puzzle-stars';
const BEST_KEY = 'hero-arcade.puzzle-best';
const SAVED_KEY = 'hero-arcade.puzzle-saved';
const PARENT_HOLD_MS = 2000;
// The painted pictures in art.js stay available; set this to true to bring them back.
const SHOW_BUILT_IN_PICTURES = false;
const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

let game = null;
let chosen = null;
let chosenLevel = 0;
let pictures = [];
let removing = null;
let run = null;
let celebration = 0;
let firstGallery = true;

function load(key) {
  try { return JSON.parse(localStorage.getItem(key)) || {}; } catch (e) { return {}; }
}

function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

function starsHtml(count) {
  return LEVELS.map((level, i) => `<span class="${i < count ? 'on' : ''}">${Icons.svg('star')}</span>`).join('');
}

// File names make poor titles: drop the random code on the end and words like "4k".
function tidyTitle(title) {
  const words = title
    .replace(/\s+(?=[a-z0-9]*\d)[a-z0-9]{12,}$/i, '')
    .replace(/\b(4k|8k|hd|uhd|ps4|ps5|wallpaper)\b/gi, '')
    .trim()
    .split(/\s+/);
  return words.map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') || 'My Picture';
}

function totalStars() {
  return Object.values(load(STARS_KEY)).reduce((sum, count) => sum + count, 0);
}

function rankFor(stars) {
  let index = 0;
  RANKS.forEach((rank, i) => { if (stars >= rank.stars) index = i; });
  return index;
}

function showRank() {
  const stars = totalStars();
  const index = rankFor(stars);
  const next = RANKS[index + 1];
  const floor = RANKS[index].stars;
  $('rank-icon').innerHTML = Icons.svg(RANKS[index].icon);
  $('rank-stars').innerHTML = `${Icons.svg('star')}${stars}`;
  $('rank-fill').style.width = next ? `${(stars - floor) / (next.stars - floor) * 100}%` : '100%';
}

async function syncProgress() {
  const merged = await ownPictures.syncProgress({ stars: load(STARS_KEY), best: load(BEST_KEY) });
  if (!merged) return;
  save(STARS_KEY, merged.stars);
  save(BEST_KEY, merged.best);
}

function toast(message) {
  const el = $('toast');
  el.innerHTML = message;
  el.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => { el.hidden = true; }, 3500);
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = url;
  });
}

async function pictureCanvas(picture) {
  if (picture.artId) return Art.render(picture.artId, PICTURE_WIDTH);
  const image = await loadImage(picture.url);
  const scale = Math.min(1, MAX_OWN_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function pictureThumb(picture, width) {
  if (picture.artId) return Art.render(picture.artId, width);
  const thumb = new Image();
  thumb.src = picture.thumb;
  thumb.alt = '';
  thumb.loading = 'lazy';
  thumb.decoding = 'async';
  thumb.draggable = false;
  return thumb;
}

async function buildGallery() {
  const tiles = $('tiles');

  const add = document.createElement('button');
  add.className = 'tile add';
  add.setAttribute('aria-label', 'Add a picture');
  add.innerHTML = Icons.svg('add_photo_alternate');
  add.onclick = () => { Sfx.play('tap'); $('file').click(); };

  const addFolder = document.createElement('button');
  addFolder.className = 'tile add folder';
  addFolder.setAttribute('aria-label', 'Load a whole folder');
  addFolder.innerHTML = Icons.svg('create_new_folder');
  addFolder.onclick = () => { Sfx.play('tap'); $('folder').click(); };

  let own = [];
  try { own = await ownPictures.list(); } catch (e) {}
  await syncProgress();
  const stars = load(STARS_KEY);
  showRank();
  pictures.forEach(p => { if (p.url && p.url.startsWith('blob:')) URL.revokeObjectURL(p.url); });
  pictures = [
    ...own.map(p => ({ key: `own-${p.id}`, ownId: p.id, title: tidyTitle(p.title), url: p.url, thumb: p.thumb })),
    ...(SHOW_BUILT_IN_PICTURES ? Art.pictures : []).map(p => ({ key: p.id, artId: p.id, title: p.title })),
  ];

  tiles.replaceChildren();
  pictures.forEach((picture, index) => {
    const tile = document.createElement('div');
    tile.className = firstGallery ? 'tile enter' : 'tile';
    tile.style.setProperty('--order', Math.min(index, 10));
    tile.tabIndex = 0;
    tile.setAttribute('role', 'button');
    tile.setAttribute('aria-label', picture.title);
    tile.onclick = () => { Sfx.play('tap'); showLevels(picture); };
    tile.onkeydown = event => { if (event.key === 'Enter') tile.click(); };
    tile.append(pictureThumb(picture, 480));

    const label = document.createElement('div');
    label.className = 'label';
    const earned = document.createElement('span');
    earned.className = 'stars';
    earned.innerHTML = starsHtml(stars[picture.key] || 0);
    label.append(earned);
    tile.append(label);

    if (picture.ownId !== undefined) {
      const remove = document.createElement('button');
      remove.className = 'remove';
      remove.innerHTML = Icons.svg('close');
      remove.setAttribute('aria-label', `Remove ${picture.title}`);
      remove.onclick = event => {
        event.stopPropagation();
        Sfx.play('tap');
        removing = picture;
        $('remove-preview').replaceChildren(pictureThumb(picture, 480));
        $('confirm-remove').hidden = false;
      };
      tile.append(remove);
    }
    tiles.append(tile);
  });
  tiles.append(add, addFolder);
  document.body.classList.toggle('no-pictures', !pictures.length);
  firstGallery = false;
}

async function addFiles(files) {
  const images = [...files].filter(f => f.type.startsWith('image/'));
  if (!images.length) return;
  let added = 0;
  for (const file of images) {
    const url = URL.createObjectURL(file);
    try {
      await loadImage(url);
      const title = (file.name || 'My picture').replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
      await ownPictures.add(file, title === 'image' ? 'My picture' : title);
      added++;
    } catch (e) {
      toast(Icons.svg('error'));
    }
    URL.revokeObjectURL(url);
  }
  if (added) { Sfx.play('snap'); buildGallery(); }
}

function showLevels(picture) {
  chosen = picture;
  const stars = load(STARS_KEY)[picture.key] || 0;
  const saved = load(SAVED_KEY);
  $('levels-preview').replaceChildren(pictureThumb(picture, 640));
  const buttons = $('level-buttons');
  buttons.textContent = '';
  LEVELS.forEach((level, index) => {
    const count = level.cols * level.rows;
    const button = document.createElement('button');
    button.className = 'btn';
    button.setAttribute('aria-label', `${count} pieces`);
    const unfinished = saved[`${picture.key}:${index}`];
    button.innerHTML = `${count}${index < stars ? `<span class="done">${Icons.svg('star')}</span>` : ''}`
      + (unfinished ? `<span class="resume"><i style="width: ${unfinished.placed.length / count * 100}%"></i></span>` : '');
    button.onclick = () => play(picture, index);
    buttons.append(button);
  });
  $('levels').hidden = false;
}

// Phones that allow it go full screen from the browser; iPhones need the home screen icon instead.
function goFullScreen() {
  if (!matchMedia('(pointer: coarse)').matches || document.fullscreenElement) return;
  const page = document.documentElement;
  const request = page.requestFullscreen || page.webkitRequestFullscreen;
  if (request) Promise.resolve(request.call(page)).catch(() => {});
}

// A comic-style swipe across the screen. Resolves once the screen is covered.
function wipe() {
  if (CALM) return Promise.resolve();
  const el = $('wipe');
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
  Sfx.play('pop');
  return wait(300);
}

function showScore() {
  $('score').textContent = run.score.toLocaleString();
  const el = $('score');
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function saveRun() {
  const saved = load(SAVED_KEY);
  saved[run.key] = { seed: run.seed, placed: run.placed, score: run.score };
  save(SAVED_KEY, saved);
}

function forgetRun(key) {
  const saved = load(SAVED_KEY);
  delete saved[key];
  save(SAVED_KEY, saved);
}

function onSnap({ done, total, combo, index }) {
  run.score += 100 * (run.level + 1) * Math.min(combo, 5);
  run.placed.push(index);
  if (done < total) saveRun();
  showScore();
  $('count').textContent = `${done} / ${total}`;
  $('progress-fill').style.width = `${done / total * 100}%`;
}

async function play(picture, level) {
  Sfx.play('tap');
  goFullScreen();
  celebration++;
  chosen = picture;
  chosenLevel = level;
  Sfx.music(false);

  const [canvas] = await Promise.all([pictureCanvas(picture), wipe()]);
  $('levels').hidden = true;
  $('won').hidden = true;
  $('gallery').hidden = true;
  $('play').hidden = false;
  if (game) game.stop();

  let { cols, rows } = LEVELS[level];
  if (canvas.height > canvas.width) [cols, rows] = [rows, cols];
  const total = cols * rows;

  const key = `${picture.key}:${level}`;
  const unfinished = load(SAVED_KEY)[key];
  run = {
    key,
    level,
    total,
    seed: unfinished ? unfinished.seed : Math.floor(Math.random() * 2 ** 31),
    placed: unfinished ? unfinished.placed : [],
    score: unfinished ? unfinished.score : 0,
  };
  $('score').textContent = run.score.toLocaleString();
  $('count').textContent = `${run.placed.length} / ${total}`;
  $('progress-fill').style.width = `${run.placed.length / total * 100}%`;

  game = Jigsaw.start({
    canvas: $('board'),
    picture: canvas,
    cols,
    rows,
    ghost: LEVELS[level].ghost,
    seed: run.seed,
    placed: run.placed,
    onStart() { Sfx.music(true); },
    onSnap,
    onWin: result => finishRun(picture, level, result),
  });
}

function finishRun(picture, level, { bestCombo }) {
  Sfx.music(false);
  forgetRun(run.key);
  const score = run.score;

  const stars = load(STARS_KEY);
  const rankBefore = rankFor(totalStars());
  stars[picture.key] = Math.max(stars[picture.key] || 0, level + 1);
  save(STARS_KEY, stars);
  const rankAfter = rankFor(totalStars());

  const best = load(BEST_KEY);
  const key = `${picture.key}:${level}`;
  const newRecord = Boolean(best[key]) && score > best[key].score;
  if (!best[key] || score > best[key].score) {
    best[key] = { score };
    save(BEST_KEY, best);
  }

  syncProgress();
  celebrate({ score, bestCombo, starCount: stars[picture.key], newRecord, rankUp: rankAfter > rankBefore ? RANKS[rankAfter].icon : '' });
}

async function celebrate({ score, bestCombo, starCount, newRecord, rankUp }) {
  const mine = ++celebration;
  const still = () => mine === celebration;

  $('won-stars').innerHTML = LEVELS.map(() => `<span class="star">${Icons.svg('star')}</span>`).join('');
  $('won-score').textContent = '0';
  $('won-combo').textContent = bestCombo;
  $('won-record').hidden = true;
  $('won-rank').hidden = true;
  $('harder').hidden = chosenLevel === LEVELS.length - 1;
  $('won').hidden = false;

  await wait(350);
  const stars = $('won-stars').children;
  for (let i = 0; i < starCount && still(); i++) {
    stars[i].classList.add('on');
    Sfx.play('star', i);
    await wait(210);
  }

  const steps = CALM ? 1 : 24;
  for (let i = 1; i <= steps && still(); i++) {
    $('won-score').textContent = Math.round(score * i / steps).toLocaleString();
    if (i % 2) Sfx.play('count');
    await wait(28);
  }

  if (newRecord && still()) {
    $('won-record').hidden = false;
    Sfx.play('badge');
    await wait(380);
  }
  if (rankUp && still()) {
    $('won-rank').innerHTML = Icons.svg('keyboard_double_arrow_up') + Icons.svg(rankUp);
    $('won-rank').hidden = false;
    Sfx.play('badge');
    Sfx.buzz([20, 30, 40]);
    await wait(500);
  }
  if (still()) Arcade.reward();
}

async function backToGallery() {
  celebration++;
  Sfx.music(false);
  await wipe();
  if (game) game.stop();
  game = null;
  $('won').hidden = true;
  $('play').hidden = true;
  $('gallery').hidden = false;
  buildGallery();
}

// Holding the rank badge shows the add and remove buttons, so a child can't delete pictures by accident.
function setUpParentMode() {
  const badge = document.querySelector('.rank');
  let timer = 0;
  const cancel = () => { clearTimeout(timer); badge.classList.remove('holding'); };
  badge.addEventListener('pointerdown', () => {
    badge.classList.add('holding');
    timer = setTimeout(() => {
      badge.classList.remove('holding');
      document.body.classList.toggle('parent');
      Sfx.play('badge');
    }, PARENT_HOLD_MS);
  });
  for (const type of ['pointerup', 'pointerleave', 'pointercancel']) badge.addEventListener(type, cancel);
  badge.addEventListener('contextmenu', event => event.preventDefault());
}

$('quit').onclick = () => { Sfx.play('tap'); backToGallery(); };
$('peek').onclick = () => { Sfx.play('tap'); if (game) game.peek(); };
$('hint').onclick = () => { Sfx.play('tap'); if (game) game.hint(); };
$('levels-close').onclick = () => { Sfx.play('tap'); $('levels').hidden = true; };
$('again').onclick = () => { Sfx.play('tap'); backToGallery(); };
$('harder').onclick = () => play(chosen, chosenLevel + 1);
$('next').onclick = () => {
  const index = pictures.indexOf(chosen);
  play(pictures[(index + 1) % pictures.length], chosenLevel);
};
$('remove-no').onclick = () => { Sfx.play('tap'); $('confirm-remove').hidden = true; };
$('remove-yes').onclick = async () => {
  Sfx.play('tap');
  $('confirm-remove').hidden = true;
  await ownPictures.remove(removing.ownId);
  buildGallery();
};
$('file').onchange = event => { addFiles(event.target.files); event.target.value = ''; };
$('folder').onchange = event => { addFiles(event.target.files); event.target.value = ''; };

window.addEventListener('paste', event => addFiles(event.clipboardData.files));
window.addEventListener('dragover', event => {
  event.preventDefault();
  document.body.classList.add('dropping');
});
window.addEventListener('dragleave', () => document.body.classList.remove('dropping'));
window.addEventListener('drop', event => {
  event.preventDefault();
  document.body.classList.remove('dropping');
  addFiles(event.dataTransfer.files);
});

Icons.fill();
Arcade.soundButton($('sound'));
setUpParentMode();
buildGallery();
