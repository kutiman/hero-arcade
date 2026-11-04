// Things every minigame shares: the sound button, confetti and the sticker reward.
window.Arcade = (() => {
  const STICKERS_KEY = 'hero-arcade.stickers';
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const COLORS = ['#ffe14d', '#58c6ff', '#ff6a4d', '#e3261c', '#ffffff'];
  const STICKERS = [
    ['star', '#ffe14d'], ['bolt', '#58c6ff'], ['favorite', '#e3261c'], ['rocket_launch', '#ff6a4d'],
    ['pets', '#c98a4b'], ['sports_soccer', '#ffffff'], ['directions_car', '#e3261c'], ['flight', '#58c6ff'],
    ['sailing', '#ffffff'], ['cake', '#ff9ec4'], ['icecream', '#ffd1a1'], ['sunny', '#ffe14d'],
    ['nightlight', '#b9c6ff'], ['forest', '#4cc47a'], ['palette', '#ff6a4d'], ['music_note', '#ff9ec4'],
    ['diamond', '#58c6ff'], ['shield', '#ffe14d'], ['pest_control', '#4cc47a'], ['local_fire_department', '#ff6a4d'],
    ['crown', '#ffe14d'], ['trophy', '#ffe14d'], ['eco', '#4cc47a'], ['workspace_premium', '#58c6ff'],
  ].map(([icon, color]) => ({ icon, color }));

  let canvas = null;
  let bits = [];
  let rainUntil = 0;
  let drawing = false;

  function addBit(x, y, vx, vy) {
    bits.push({
      x, y, vx, vy, life: 1, turn: Math.random() * 6,
      size: 7 + Math.random() * 7, color: COLORS[bits.length % COLORS.length],
    });
  }

  function animate(now) {
    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(innerWidth * dpr)) {
      canvas.width = Math.round(innerWidth * dpr);
      canvas.height = Math.round(innerHeight * dpr);
    }
    const c = canvas.getContext('2d');
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, innerWidth, innerHeight);
    if (now < rainUntil) {
      for (let i = 0; i < 4; i++) addBit(Math.random() * innerWidth, -20, (Math.random() - .5) * 3, 3 + Math.random() * 4);
    }
    for (const bit of bits) {
      bit.x += bit.vx; bit.y += bit.vy; bit.vy += .12; bit.turn += .2; bit.life -= .009;
      c.save();
      c.globalAlpha = Math.min(1, bit.life * 2);
      c.translate(bit.x, bit.y);
      c.rotate(bit.turn);
      c.fillStyle = bit.color;
      c.fillRect(-bit.size / 2, -bit.size / 2, bit.size, bit.size * .6);
      c.restore();
    }
    bits = bits.filter(bit => bit.life > 0 && bit.y < innerHeight + 30);
    if (bits.length || now < rainUntil) requestAnimationFrame(animate);
    else drawing = false;
  }

  function startDrawing() {
    if (CALM) return;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.className = 'confetti';
      document.body.append(canvas);
    }
    if (drawing) return;
    drawing = true;
    requestAnimationFrame(animate);
  }

  function localStickers() {
    try { return Number(localStorage.getItem(STICKERS_KEY)) || 0; } catch (e) { return 0; }
  }

  function saveStickers(count) {
    try { localStorage.setItem(STICKERS_KEY, count); } catch (e) {}
  }

  // Brings this device up to date with the others and returns how many stickers are earned.
  async function syncStickers(count = localStickers()) {
    const merged = await ownPictures.syncProgress({ stickers: count });
    const total = merged ? Math.max(count, merged.stickers || 0) : count;
    saveStickers(total);
    return total;
  }

  function showSticker(sticker) {
    const pop = document.createElement('button');
    pop.className = 'sticker-pop';
    pop.setAttribute('aria-label', 'New sticker');
    pop.innerHTML = `<span class="sticker big" style="--sticker: ${sticker.color}">${Icons.svg(sticker.icon)}</span>`;
    pop.onclick = () => pop.remove();
    document.body.append(pop);
    Sfx.play('badge');
    Sfx.buzz([20, 30, 40]);
    setTimeout(() => pop.remove(), 2600);
  }

  return {
    STICKERS,
    syncStickers,

    burst(...elements) {
      for (const el of elements) {
        const box = el.getBoundingClientRect();
        for (let i = 0; i < 16; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 5;
          addBit(box.left + box.width / 2, box.top + box.height / 2, Math.cos(angle) * speed, Math.sin(angle) * speed - 2);
        }
      }
      startDrawing();
    },

    rain(ms = 2800) {
      rainUntil = performance.now() + ms;
      startDrawing();
    },

    // One new sticker per finished game, until the book is full.
    async reward() {
      const earned = await syncStickers();
      if (earned >= STICKERS.length) return;
      await syncStickers(earned + 1);
      showSticker(STICKERS[earned]);
    },

    soundButton(button) {
      const show = () => { button.innerHTML = Icons.svg(Sfx.muted ? 'volume_off' : 'volume_up'); };
      button.onclick = () => { Sfx.toggle(); show(); Sfx.play('tap'); };
      show();
    },

    // A row of stars for games played in rounds; `done` of them are lit.
    showRounds(el, total, done) {
      el.innerHTML = Array.from({ length: total }, (item, index) =>
        `<span class="${index < done ? 'on' : ''}">${Icons.svg('star')}</span>`).join('');
    },

    // The shared ending: fanfare and confetti, then the panel, then a new sticker.
    async finish(panel) {
      Sfx.music(false);
      Sfx.play('win');
      Sfx.buzz([24, 40, 24, 40, 60]);
      this.rain();
      await new Promise(resolve => setTimeout(resolve, 1500));
      panel.hidden = false;
      await new Promise(resolve => setTimeout(resolve, 800));
      await this.reward();
    },

    shuffled(list) {
      const copy = list.slice();
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    },
  };
})();
