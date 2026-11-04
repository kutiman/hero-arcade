// The jigsaw engine: cuts a picture into pieces and runs the drag-and-snap game on a canvas.
// Every coordinate on a piece is in picture pixels; `view` maps them onto the screen.
window.Jigsaw = (() => {
  const TAB = .1;
  const SHOW_MS = 1100;
  const SCATTER_MS = 720;
  const STAGGER_MS = 260;
  const LOCK_MS = 110;
  const IDLE_MS = 15000;
  const HINT_MS = 2600;
  const FINALE_MS = 3000;
  const WIN_PANEL_MS = 2100;
  const COLORS = ['#ffe14d', '#58c6ff', '#ff6a4d', '#e3261c', '#ffffff'];
  const CALM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const clamp = (value, low, high) => Math.min(Math.max(value, low), high);
  const easeOutBack = t => 1 + 2.4 * Math.pow(t - 1, 3) + 1.4 * Math.pow(t - 1, 2);

  // Moves o[key] toward target with some bounce. Returns true while still moving.
  function spring(o, key, target, stiffness, damping, f) {
    const speed = key + 'Speed';
    o[speed] = (o[speed] + (target - o[key]) * stiffness * f) * Math.pow(damping, f);
    o[key] += o[speed] * f;
    if (Math.abs(o[speed]) > .0006 || Math.abs(target - o[key]) > .0006) return true;
    o[key] = target;
    o[speed] = 0;
    return false;
  }

  function addEdge(path, x0, y0, x1, y1, sign, depth) {
    if (!sign) { path.lineTo(x1, y1); return; }
    const length = Math.hypot(x1 - x0, y1 - y0);
    const ux = (x1 - x0) / length, uy = (y1 - y0) / length;
    const at = (u, v) => [
      x0 + ux * length * u + uy * depth * v * sign,
      y0 + uy * length * u - ux * depth * v * sign,
    ];
    const tu = TAB * depth / length;
    path.bezierCurveTo(...at(.2, 0), ...at(.5, -TAB), ...at(.5 - tu, TAB));
    path.bezierCurveTo(...at(.5 - 2 * tu, 3 * TAB), ...at(.5 + 2 * tu, 3 * TAB), ...at(.5 + tu, TAB));
    path.bezierCurveTo(...at(.5, -TAB), ...at(.8, 0), x1, y1);
  }

  function seededRandom(seed) {
    return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  }

  // The same seed always cuts the same shapes, which is what lets a saved puzzle resume.
  function cutPieces(picture, cols, rows, seed) {
    const cw = picture.width / cols, ch = picture.height / rows;
    const depth = Math.min(cw, ch);
    const pad = Math.ceil(depth * .32);
    const bevel = Math.max(2, depth * .022);
    const random = seededRandom(seed);
    const coin = () => (random() < .5 ? 1 : -1);
    const right = [], bottom = [];
    for (let r = 0; r < rows; r++) {
      right.push(Array.from({ length: cols }, coin));
      bottom.push(Array.from({ length: cols }, coin));
    }

    const pieces = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const top = r ? -bottom[r - 1][c] : 0;
        const rightSign = c < cols - 1 ? right[r][c] : 0;
        const bottomSign = r < rows - 1 ? bottom[r][c] : 0;
        const left = c ? -right[r][c - 1] : 0;

        const path = new Path2D();
        path.moveTo(0, 0);
        addEdge(path, 0, 0, cw, 0, top, depth);
        addEdge(path, cw, 0, cw, ch, rightSign, depth);
        addEdge(path, cw, ch, 0, ch, bottomSign, depth);
        addEdge(path, 0, ch, 0, 0, left, depth);
        path.closePath();

        const sprite = document.createElement('canvas');
        sprite.width = Math.ceil(cw + pad * 2);
        sprite.height = Math.ceil(ch + pad * 2);
        const s = sprite.getContext('2d');
        s.translate(pad, pad);
        s.save();
        s.clip(path);
        s.drawImage(picture, -c * cw, -r * ch);
        // A light edge on one side and a dark one on the other makes the piece look raised.
        s.lineWidth = bevel * 2;
        s.save();
        s.translate(bevel * .7, bevel * .7);
        s.strokeStyle = 'rgba(255, 255, 255, .4)';
        s.stroke(path);
        s.restore();
        s.translate(-bevel * .7, -bevel * .7);
        s.strokeStyle = 'rgba(0, 0, 0, .34)';
        s.stroke(path);
        s.restore();
        s.strokeStyle = 'rgba(20, 16, 43, .6)';
        s.lineWidth = Math.max(1.5, picture.width / 600);
        s.stroke(path);

        const homeX = c * cw, homeY = r * ch;
        pieces.push({
          path, sprite, homeX, homeY, x: homeX, y: homeY,
          fromX: 0, fromY: 0, toX: 0, toY: 0, delay: 0, spin: 0,
          scale: 1, scaleSpeed: 0, tilt: 0, tiltSpeed: 0, glow: 0, glowSpeed: 0,
          flash: 0, locked: false, lockStart: 0, lockFromX: 0, lockFromY: 0, rippleAt: 0, hintUntil: 0,
        });
      }
    }
    return { pieces, cw, ch, depth, pad };
  }

  function start({ canvas, picture, cols, rows, ghost = .2, seed, placed = [], onStart, onSnap, onWin }) {
    const ctx = canvas.getContext('2d');
    const hitTest = document.createElement('canvas').getContext('2d');
    const PW = picture.width, PH = picture.height;
    const { pieces, cw, ch, depth, pad } = cutPieces(picture, cols, rows, seed);
    for (const index of placed) pieces[index].locked = true;
    const snapDistance = depth * .3;
    const unit = PW / 40;

    const boardLayer = document.createElement('canvas');
    boardLayer.width = PW;
    boardLayer.height = PH;
    const board = boardLayer.getContext('2d');
    board.fillStyle = '#0d1c5c';
    board.fillRect(0, 0, PW, PH);
    board.globalAlpha = ghost;
    board.drawImage(picture, 0, 0);
    board.globalAlpha = 1;
    board.strokeStyle = 'rgba(255, 255, 255, .1)';
    board.lineWidth = Math.max(1.5, PW / 700);
    for (const p of pieces) {
      board.save();
      board.translate(p.homeX, p.homeY);
      board.stroke(p.path);
      board.restore();
    }

    const view = { width: 0, height: 0, dpr: 1, scale: 1, x: 0, y: 0 };
    const held = new Map();
    let loose = pieces.filter(p => !p.locked);
    let landing = [];
    let sparks = [];
    let rings = [];
    let words = [];
    let phase = 'show';
    let phaseStart = performance.now();
    let started = false;
    let lastFrame = phaseStart;
    let lastAction = phaseStart;
    let combo = 0;
    let bestCombo = 0;
    let shake = 0;
    let whiteFlash = 0;
    let reveal = 0;
    let revealAt = 0;
    let peek = { amount: 0, amountSpeed: 0, until: 0 };
    let finaleUntil = 0;
    let nextFirework = 0;
    let dirty = true;
    let frame = 0;
    let wide = null;

    function layout() {
      const box = canvas.getBoundingClientRect();
      view.width = box.width;
      view.height = box.height;
      view.dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(box.width * view.dpr);
      canvas.height = Math.round(box.height * view.dpr);

      const aspect = PW / PH;
      const wasWide = wide;
      wide = view.width / view.height > 1.1;
      let w, h;
      if (wide) {
        h = view.height * .9;
        w = h * aspect;
        if (w > view.width * .56) { w = view.width * .56; h = w / aspect; }
        view.y = (view.height - h) / 2;
      } else {
        w = view.width * .92;
        h = w / aspect;
        if (h > view.height * .55) { h = view.height * .55; w = h * aspect; }
        view.y = view.height * .02;
      }
      view.x = (view.width - w) / 2;
      view.scale = w / PW;

      for (const p of loose) {
        const c = clampToStage(p.x, p.y);
        p.x = c.x; p.y = c.y;
      }
      // Turning the tablet leaves the pieces in the wrong places, so deal them out again.
      if ((phase === 'play' || phase === 'scatter') && wasWide !== wide) {
        held.clear();
        startScatter(performance.now());
      }
      // Resizing wipes the canvas, so repaint now rather than flash blank for a frame.
      draw(performance.now());
    }

    function stage() {
      return {
        left: -view.x / view.scale,
        top: -view.y / view.scale,
        right: (view.width - view.x) / view.scale,
        bottom: (view.height - view.y) / view.scale,
      };
    }

    function clampToStage(x, y) {
      const s = stage();
      return {
        x: clamp(x, s.left - cw * .4, s.right - cw * .6),
        y: clamp(y, s.top - ch * .4, s.bottom - ch * .6),
      };
    }

    // Spread pieces out: for each one, keep the random spot farthest from the others and off the board.
    function chooseScatter() {
      const s = stage();
      const placed = [];
      loose.sort(() => Math.random() - .5);
      for (const p of loose) {
        let best = null, bestScore = -Infinity;
        for (let i = 0; i < 40; i++) {
          const x = s.left + pad * .3 + Math.random() * Math.max(1, s.right - s.left - cw - pad * .6);
          const y = s.top + pad * .3 + Math.random() * Math.max(1, s.bottom - s.top - ch - pad * .6);
          const overlapX = Math.max(0, Math.min(x + cw, PW) - Math.max(x, 0));
          const overlapY = Math.max(0, Math.min(y + ch, PH) - Math.max(y, 0));
          const overlap = overlapX * overlapY / (cw * ch);
          let nearest = depth * 6;
          for (const q of placed) nearest = Math.min(nearest, Math.hypot(q.x - x, q.y - y));
          const score = nearest * (1 - overlap) - overlap * depth * 4;
          if (score > bestScore) { bestScore = score; best = { x, y }; }
        }
        placed.push(best);
        p.fromX = p.x; p.fromY = p.y;
        p.toX = best.x; p.toY = best.y;
        p.delay = Math.random() * STAGGER_MS;
        p.spin = (Math.random() - .5) * (CALM ? 0 : 3);
      }
    }

    function startScatter(now) {
      chooseScatter();
      phase = 'scatter';
      phaseStart = now;
    }

    function toPicture(event) {
      const box = canvas.getBoundingClientRect();
      return {
        x: (event.clientX - box.left - view.x) / view.scale,
        y: (event.clientY - box.top - view.y) / view.scale,
      };
    }

    function pieceAt(x, y) {
      const free = loose.filter(p => ![...held.values()].some(h => h.piece === p));
      for (let i = free.length - 1; i >= 0; i--) {
        if (hitTest.isPointInPath(free[i].path, x - free[i].x, y - free[i].y)) return free[i];
      }
      // Small fingers miss: fall back to the nearest piece within reach.
      let nearest = null, reach = depth * .7;
      for (const p of free) {
        const d = Math.hypot(p.x + cw / 2 - x, p.y + ch / 2 - y);
        if (d < reach) { reach = d; nearest = p; }
      }
      return nearest;
    }

    function burst(x, y, count, speed, size) {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const force = speed * (.35 + Math.random() * .65);
        sparks.push({
          x, y,
          vx: Math.cos(angle) * force, vy: Math.sin(angle) * force,
          gravity: speed * .025, drag: .96, life: 1, fade: .022 + Math.random() * .012,
          size: size * (.6 + Math.random() * .8), turn: Math.random() * 6, turnSpeed: (Math.random() - .5) * .5,
          color: COLORS[i % COLORS.length],
        });
      }
    }

    function popIcons(name, count, x, y, size, color) {
      words.push({ path: Icons.path(name), count, x, y, size, color, born: performance.now(), tilt: (Math.random() - .5) * .3 });
    }

    function lock(p, now) {
      p.lockFromX = p.x;
      p.lockFromY = p.y;
      p.lockStart = now;
      p.locked = true;
      p.tilt = 0;
      p.tiltSpeed = 0;
      loose = loose.filter(q => q !== p);
      landing.push(p);
    }

    function land(p, now) {
      p.x = p.homeX;
      p.y = p.homeY;
      p.flash = 1;
      p.scale = 1.14;
      p.scaleSpeed = 0;
      p.hintUntil = 0;
      landing = landing.filter(q => q !== p);

      combo++;
      bestCombo = Math.max(bestCombo, combo);
      lastAction = now;

      const cx = p.x + cw / 2, cy = p.y + ch / 2;
      if (!CALM) shake = Math.min(10, 3 + combo);
      rings.push({ x: cx, y: cy, radius: depth * .25, grow: depth * .05, life: 1 });
      burst(cx, cy, 14 + Math.min(combo, 6) * 3, depth * .075, unit * .28);
      Sfx.play('snap', combo);
      Sfx.buzz(14);

      const done = pieces.filter(q => q.locked && !landing.includes(q)).length;
      if (combo >= 2 && done < pieces.length) popIcons('star', Math.min(combo, 5), cx, cy, 40, '#ffe14d');
      onSnap({ done, total: pieces.length, combo, index: pieces.indexOf(p) });
      if (done === pieces.length) finish(p, now);
    }

    function finish(last, now) {
      phase = 'won';
      phaseStart = now;
      for (const p of pieces) {
        p.rippleAt = now + Math.hypot(p.homeX - last.homeX, p.homeY - last.homeY) / PW * 620;
      }
      revealAt = now + 640;
      finaleUntil = now + FINALE_MS;
      nextFirework = now + 300;
      Sfx.play('win');
      Sfx.buzz([24, 40, 24, 40, 60]);
      setTimeout(() => { if (frame) onWin({ bestCombo }); }, WIN_PANEL_MS);
    }

    function showHint(now) {
      const free = loose.filter(p => ![...held.values()].some(h => h.piece === p));
      if (!free.length || phase !== 'play') return;
      const p = free[Math.floor(Math.random() * free.length)];
      p.hintUntil = now + HINT_MS;
      p.tiltSpeed = .08;
      p.scale = 1.1;
      loose = loose.filter(q => q !== p).concat(p);
      lastAction = now;
      dirty = true;
    }

    function onDown(event) {
      if (phase !== 'play') return;
      const at = toPicture(event);
      const piece = pieceAt(at.x, at.y);
      if (!piece) return;
      canvas.setPointerCapture(event.pointerId);
      // Lift the piece above a fingertip so it stays visible while dragging.
      const lift = event.pointerType === 'touch' ? depth * .45 : 0;
      held.set(event.pointerId, {
        piece, near: false,
        dx: at.x - piece.x, dy: at.y - piece.y + lift,
        targetX: piece.x, targetY: piece.y - lift,
      });
      loose = loose.filter(p => p !== piece).concat(piece);
      lastAction = performance.now();
      Sfx.play('pick');
      Sfx.buzz(6);
      dirty = true;
    }

    function onMove(event) {
      const hold = held.get(event.pointerId);
      if (!hold) return;
      const at = toPicture(event);
      const c = clampToStage(at.x - hold.dx, at.y - hold.dy);
      hold.targetX = c.x;
      hold.targetY = c.y;
      dirty = true;
    }

    function onUp(event) {
      const hold = held.get(event.pointerId);
      if (!hold) return;
      held.delete(event.pointerId);
      const p = hold.piece;
      const now = performance.now();
      lastAction = now;
      if (Math.hypot(hold.targetX - p.homeX, hold.targetY - p.homeY) < snapDistance) {
        lock(p, now);
      } else {
        p.x = hold.targetX;
        p.y = hold.targetY;
        // The streak only ends on a try that missed, never by taking a while.
        const centerX = p.x + cw / 2, centerY = p.y + ch / 2;
        if (centerX > 0 && centerX < PW && centerY > 0 && centerY < PH) combo = 0;
        p.scaleSpeed = -.03;
        p.tiltSpeed = (Math.random() < .5 ? -1 : 1) * .05;
        Sfx.play('drop');
      }
      dirty = true;
    }

    function updateHeld(f) {
      for (const hold of held.values()) {
        const p = hold.piece;
        const distance = Math.hypot(hold.targetX - p.homeX, hold.targetY - p.homeY);
        const range = snapDistance * 1.7;
        const near = distance < range;
        // Near its home the piece feels pulled in, like a magnet.
        const pull = near ? (1 - distance / range) * .5 : 0;
        const wantX = hold.targetX + (p.homeX - hold.targetX) * pull;
        const wantY = hold.targetY + (p.homeY - hold.targetY) * pull;
        const before = p.x;
        const follow = Math.min(1, .55 * f);
        p.x += (wantX - p.x) * follow;
        p.y += (wantY - p.y) * follow;
        hold.lean = clamp((p.x - before) / depth * 1.4, -.26, .26);
        if (near && !hold.near) { Sfx.play('near'); Sfx.buzz(5); }
        hold.near = near;
        dirty = true;
      }
    }

    function updatePieces(now, f) {
      const heldBy = new Map([...held.values()].map(h => [h.piece, h]));
      for (const p of pieces) {
        const hold = heldBy.get(p);
        const scaleTarget = hold ? 1.1 : 1;
        if (spring(p, 'scale', scaleTarget, .2, .72, f)) dirty = true;
        if (phase !== 'scatter' && spring(p, 'tilt', hold ? hold.lean : 0, .2, .74, f)) dirty = true;
        const glowing = (hold && hold.near) || now < p.hintUntil;
        if (spring(p, 'glow', glowing ? 1 : 0, .16, .7, f)) dirty = true;
        if (now < p.hintUntil) dirty = true;
        if (p.flash > 0) { p.flash = Math.max(0, p.flash - .045 * f); dirty = true; }
        if (p.rippleAt && now >= p.rippleAt) {
          p.rippleAt = 0;
          p.scale = 1.09;
          p.flash = .7;
          dirty = true;
        }
      }
    }

    function updateEffects(now, f) {
      const s = stage();
      if (now < finaleUntil) {
        const rain = CALM ? 1 : 5;
        for (let i = 0; i < rain && sparks.length < 420; i++) {
          sparks.push({
            x: s.left + Math.random() * (s.right - s.left), y: s.top - 30,
            vx: (Math.random() - .5) * unit * .25, vy: unit * (.2 + Math.random() * .3),
            gravity: unit * .004, drag: .995, life: 1, fade: .006,
            size: unit * (.28 + Math.random() * .28), turn: Math.random() * 6, turnSpeed: (Math.random() - .5) * .4,
            color: COLORS[(Math.random() * COLORS.length) | 0],
          });
        }
        if (now > nextFirework && !CALM) {
          nextFirework = now + 240 + Math.random() * 260;
          const x = s.left + (s.right - s.left) * (.12 + Math.random() * .76);
          const y = s.top + (s.bottom - s.top) * (.1 + Math.random() * .5);
          burst(x, y, 34, unit * .55, unit * .3);
          rings.push({ x, y, radius: unit, grow: unit * .5, life: 1 });
          Sfx.play('pop');
        }
        dirty = true;
      }
      if (sparks.length) {
        for (const p of sparks) {
          p.vx *= Math.pow(p.drag, f);
          p.vy = p.vy * Math.pow(p.drag, f) + p.gravity * f;
          p.x += p.vx * f; p.y += p.vy * f;
          p.turn += p.turnSpeed * f;
          p.life -= p.fade * f;
        }
        sparks = sparks.filter(p => p.life > 0);
        dirty = true;
      }
      if (rings.length) {
        for (const r of rings) { r.radius += r.grow * f; r.grow *= Math.pow(.93, f); r.life -= .05 * f; }
        rings = rings.filter(r => r.life > 0);
        dirty = true;
      }
      if (words.length) {
        words = words.filter(w => now - w.born < 950);
        dirty = true;
      }
      if (shake > .1) { shake *= Math.pow(.82, f); dirty = true; } else shake = 0;
      if (whiteFlash > 0) { whiteFlash = Math.max(0, whiteFlash - .05 * f); dirty = true; }
    }

    function update(now) {
      const f = Math.min(2.5, (now - lastFrame) / 16.67);
      lastFrame = now;

      if (phase === 'show' && now - phaseStart > SHOW_MS) {
        startScatter(now);
        whiteFlash = CALM ? 0 : .8;
        if (!CALM) shake = 12;
        Sfx.play('whoosh');
        Sfx.buzz(30);
      }
      if (phase === 'scatter') {
        let moving = false;
        for (const p of loose) {
          const t = clamp((now - phaseStart - p.delay) / SCATTER_MS, 0, 1);
          const ease = easeOutBack(t);
          p.x = p.fromX + (p.toX - p.fromX) * ease;
          p.y = p.fromY + (p.toY - p.fromY) * ease;
          p.tilt = p.spin * (1 - t);
          if (t < 1) moving = true;
        }
        dirty = true;
        if (!moving) {
          phase = 'play';
          lastAction = now;
          if (!started) {
            started = true;
            popIcons('rocket_launch', 1, PW / 2, PH / 2, 120, '#ff6a4d');
            Sfx.play('go');
            onStart();
          }
        }
      }
      for (const p of landing.slice()) {
        const t = clamp((now - p.lockStart) / LOCK_MS, 0, 1);
        p.x = p.lockFromX + (p.homeX - p.lockFromX) * t * t;
        p.y = p.lockFromY + (p.homeY - p.lockFromY) * t * t;
        dirty = true;
        if (t === 1) land(p, now);
      }
      if (phase === 'play' && now - lastAction > IDLE_MS && !held.size) showHint(now);
      if (phase === 'won' && now > revealAt && reveal < 1) {
        if (!reveal) whiteFlash = CALM ? 0 : .7;
        reveal = Math.min(1, reveal + .05 * f);
        dirty = true;
      }

      updateHeld(f);
      updatePieces(now, f);
      updateEffects(now, f);

      const peeking = now < peek.until;
      if (spring(peek, 'amount', peeking ? 1 : 0, .16, .68, f)) dirty = true;
    }

    function drawOutline(p, x, y, color, width) {
      ctx.save();
      ctx.translate(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke(p.path);
      ctx.restore();
    }

    function drawPiece(p, lifted, now) {
      ctx.save();
      ctx.translate(p.x + cw / 2, p.y + ch / 2);
      ctx.rotate(p.tilt);
      ctx.scale(p.scale, p.scale);
      if (lifted) {
        ctx.shadowColor = 'rgba(0, 0, 0, .6)';
        ctx.shadowBlur = 26 * view.dpr;
        ctx.shadowOffsetY = 16 * view.dpr;
      }
      ctx.drawImage(p.sprite, -cw / 2 - pad, -ch / 2 - pad);
      ctx.shadowColor = 'transparent';
      ctx.translate(-cw / 2, -ch / 2);
      if (p.flash) {
        ctx.fillStyle = `rgba(255, 255, 255, ${p.flash * .55})`;
        ctx.fill(p.path);
        ctx.strokeStyle = `rgba(255, 225, 77, ${p.flash})`;
        ctx.lineWidth = depth * .05;
        ctx.stroke(p.path);
      }
      if (now < p.hintUntil) {
        ctx.strokeStyle = `rgba(251, 191, 36, ${.55 + .45 * Math.sin(now / 110)})`;
        ctx.lineWidth = depth * .05;
        ctx.stroke(p.path);
      }
      ctx.restore();
    }

    function drawSlotGlow(p, now) {
      if (p.glow < .02) return;
      const pulse = .6 + .4 * Math.sin(now / 90);
      ctx.save();
      ctx.translate(p.homeX, p.homeY);
      ctx.fillStyle = `rgba(255, 225, 77, ${p.glow * .22 * pulse})`;
      ctx.fill(p.path);
      ctx.restore();
      drawOutline(p, p.homeX, p.homeY, `rgba(255, 225, 77, ${p.glow * pulse})`, depth * .04);
    }

    function drawSparks() {
      for (const s of sparks) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, s.life * 1.6);
        ctx.translate(s.x, s.y);
        ctx.rotate(s.turn);
        ctx.scale(1, Math.abs(Math.cos(s.turn * 1.7)) * .8 + .2);
        ctx.fillStyle = s.color;
        ctx.fillRect(-s.size / 2, -s.size / 2, s.size, s.size);
        ctx.restore();
      }
      for (const r of rings) {
        ctx.strokeStyle = `rgba(255, 248, 231, ${r.life * .9})`;
        ctx.lineWidth = unit * .24 * r.life;
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, 7);
        ctx.stroke();
      }
    }

    function drawWords(now) {
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
      for (const w of words) {
        const age = (now - w.born) / 950;
        const pop = easeOutBack(Math.min(1, age / .2));
        const x = clamp(view.x + w.x * view.scale, 70, view.width - 70);
        const y = clamp(view.y + w.y * view.scale, 40, view.height - 40) - age * 44;
        ctx.save();
        ctx.globalAlpha = age > .7 ? (1 - age) / .3 : 1;
        ctx.translate(x, y);
        ctx.rotate(w.tilt);
        ctx.scale(pop, pop);
        const step = w.size * .86;
        const k = w.size / 960;
        for (let i = 0; i < w.count; i++) {
          ctx.save();
          ctx.translate((i - (w.count - 1) / 2) * step - w.size / 2, w.size / 2);
          ctx.scale(k, k);
          ctx.lineJoin = 'round';
          ctx.lineWidth = 130;
          ctx.strokeStyle = '#111111';
          ctx.stroke(w.path);
          ctx.fillStyle = w.color;
          ctx.fill(w.path);
          ctx.restore();
        }
        ctx.restore();
      }
    }

    function draw(now) {
      const k = view.dpr * view.scale;
      const shakeX = shake ? (Math.random() - .5) * 2 * shake : 0;
      const shakeY = shake ? (Math.random() - .5) * 2 * shake : 0;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, (view.x + shakeX) * view.dpr, (view.y + shakeY) * view.dpr);

      const border = 6 / view.scale;
      ctx.fillStyle = '#111111';
      ctx.fillRect(-border, -border, PW + border * 2, PH + border * 2);
      ctx.drawImage(boardLayer, 0, 0);

      for (const p of pieces) if (p.locked && !landing.includes(p)) drawPiece(p, false, now);
      for (const p of pieces) if (!p.locked) drawSlotGlow(p, now);

      const lifted = new Set([...held.values()].map(h => h.piece));
      for (const p of loose) if (!lifted.has(p)) drawPiece(p, false, now);
      for (const p of landing) drawPiece(p, false, now);
      for (const p of lifted) drawPiece(p, true, now);

      if (reveal) {
        ctx.globalAlpha = reveal;
        ctx.drawImage(picture, 0, 0);
        ctx.globalAlpha = 1;
      }
      if (peek.amount > .01) {
        ctx.globalAlpha = Math.min(.96, peek.amount);
        ctx.drawImage(picture, 0, 0);
        ctx.globalAlpha = 1;
      }
      drawSparks();

      if (whiteFlash) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.fillStyle = `rgba(255, 255, 255, ${whiteFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      drawWords(now);
    }

    function tick(now) {
      if (!frame) return;
      update(now);
      if (dirty) { dirty = false; draw(now); }
      frame = requestAnimationFrame(tick);
    }

    const resizer = new ResizeObserver(layout);
    resizer.observe(canvas);
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    layout();
    frame = requestAnimationFrame(tick);

    return {
      pieces,
      view,
      get phase() { return phase; },
      peek() { peek.until = performance.now() + 2500; dirty = true; },
      hint() { showHint(performance.now()); },
      stop() {
        cancelAnimationFrame(frame);
        frame = 0;
        resizer.disconnect();
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
      },
    };
  }

  return { start };
})();
