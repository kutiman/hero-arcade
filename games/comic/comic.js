// Comic Maker: draw and put stickers on a picture, then save it so it joins the arcade's pictures.
const MAX_SIZE = 1600;
const COLORS = ['#e3261c', '#ffe14d', '#58c6ff', '#ffffff', '#111111'];
const STARTER_STICKERS = 6;

const $ = id => document.getElementById(id);
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

const canvas = $('page');
const paint = canvas.getContext('2d');

let base = null;
let marks = [];
let color = COLORS[0];
let brush = 0;
let stickerSize = 0;
let drawing = null;
let moving = null;
let saving = false;

function drawSticker(c, mark) {
  const k = mark.size / 960;
  c.save();
  c.translate(mark.x - mark.size / 2, mark.y + mark.size / 2);
  c.scale(k, k);
  c.lineJoin = 'round';
  c.lineWidth = 90;
  c.strokeStyle = '#111111';
  const path = Icons.path(mark.icon);
  c.stroke(path);
  c.fillStyle = mark.color;
  c.fill(path);
  c.restore();
}

function drawStroke(c, mark) {
  c.strokeStyle = mark.color;
  c.lineWidth = mark.width;
  c.lineCap = c.lineJoin = 'round';
  c.beginPath();
  mark.points.forEach(([x, y], index) => (index ? c.lineTo(x, y) : c.moveTo(x, y)));
  if (mark.points.length === 1) c.lineTo(mark.points[0][0] + .1, mark.points[0][1]);
  c.stroke();
}

function render() {
  paint.drawImage(base, 0, 0, canvas.width, canvas.height);
  for (const mark of marks) (mark.icon ? drawSticker : drawStroke)(paint, mark);
}

function fitPage() {
  if (!base) return;
  const box = $('desk').getBoundingClientRect();
  const scale = Math.min(box.width / canvas.width, box.height / canvas.height);
  canvas.style.width = `${Math.floor(canvas.width * scale)}px`;
  canvas.style.height = `${Math.floor(canvas.height * scale)}px`;
}

function spot(event) {
  const box = canvas.getBoundingClientRect();
  return [(event.clientX - box.left) * canvas.width / box.width, (event.clientY - box.top) * canvas.height / box.height];
}

function stickerAt(x, y) {
  for (let i = marks.length - 1; i >= 0; i--) {
    const mark = marks[i];
    if (mark.icon && Math.hypot(mark.x - x, mark.y - y) < mark.size * .6) return mark;
  }
  return null;
}

canvas.addEventListener('pointerdown', event => {
  canvas.setPointerCapture(event.pointerId);
  const [x, y] = spot(event);
  moving = stickerAt(x, y);
  if (moving) {
    marks = marks.filter(mark => mark !== moving).concat(moving);
    Sfx.play('pick');
    return;
  }
  drawing = { color, width: brush, points: [[x, y]] };
  marks.push(drawing);
  render();
});
canvas.addEventListener('pointermove', event => {
  const [x, y] = spot(event);
  if (moving) { moving.x = x; moving.y = y; render(); }
  if (drawing) { drawing.points.push([x, y]); render(); }
});
function stopTouch() {
  if (moving) Sfx.play('drop');
  moving = null;
  drawing = null;
}
canvas.addEventListener('pointerup', stopTouch);
canvas.addEventListener('pointercancel', stopTouch);

async function open(picture) {
  Sfx.play('tap');
  const image = new Image();
  image.src = picture.url;
  await image.decode();
  const scale = Math.min(1, MAX_SIZE / Math.max(image.naturalWidth, image.naturalHeight));
  canvas.width = Math.round(image.naturalWidth * scale);
  canvas.height = Math.round(image.naturalHeight * scale);
  base = image;
  marks = [];
  brush = canvas.width / 70;
  stickerSize = canvas.width / 5;
  $('pick').hidden = true;
  $('studio').hidden = false;
  fitPage();
  render();
}

function showColors() {
  $('colors').replaceChildren(...COLORS.map((choice, index) => {
    const button = document.createElement('button');
    button.className = choice === color ? 'swatch on' : 'swatch';
    button.style.background = choice;
    button.setAttribute('aria-label', `Color ${index + 1}`);
    button.onclick = () => { Sfx.play('tap'); color = choice; showColors(); };
    return button;
  }));
}

async function showTray() {
  Sfx.play('tap');
  const earned = await Arcade.syncStickers();
  const open = Arcade.STICKERS.slice(0, Math.max(STARTER_STICKERS, earned));
  $('sticker-choices').replaceChildren(...open.map(sticker => {
    const button = document.createElement('button');
    button.className = 'sticker';
    button.style.setProperty('--sticker', sticker.color);
    button.setAttribute('aria-label', 'Add this sticker');
    button.innerHTML = Icons.svg(sticker.icon);
    button.onclick = () => {
      Sfx.play('snap');
      marks.push({ ...sticker, x: canvas.width / 2, y: canvas.height / 2, size: stickerSize });
      $('tray').hidden = true;
      render();
    };
    return button;
  }));
  $('tray').hidden = false;
}

async function saveComic() {
  if (saving || !marks.length) { Sfx.play('drop'); return; }
  saving = true;
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .9));
  await ownPictures.add(blob, 'My comic');
  Sfx.play('win');
  Arcade.rain(1800);
  await wait(1400);
  await Arcade.reward();
  await wait(900);
  saving = false;
  backToPictures();
}

async function backToPictures() {
  $('studio').hidden = true;
  $('pick').hidden = false;
  await showPictures();
}

async function showPictures() {
  let pictures = [];
  try { pictures = await ownPictures.list(); } catch (e) {}
  $('need-pictures').hidden = pictures.length > 0;
  $('tiles').replaceChildren(...pictures.map((picture, index) => {
    const button = document.createElement('button');
    button.className = 'pick-tile';
    button.setAttribute('aria-label', `Picture ${index + 1}`);
    button.innerHTML = `<img alt="" loading="lazy" decoding="async" draggable="false" src="${picture.thumb}">`;
    button.onclick = () => open(picture);
    return button;
  }));
}

$('leave').onclick = () => { Sfx.play('tap'); backToPictures(); };
$('undo').onclick = () => { Sfx.play('tap'); marks.pop(); render(); };
$('save').onclick = saveComic;
$('open-stickers').onclick = showTray;
$('tray').onclick = event => { if (event.target === $('tray')) $('tray').hidden = true; };
new ResizeObserver(fitPage).observe($('desk'));

Icons.fill();
showColors();
showPictures();
