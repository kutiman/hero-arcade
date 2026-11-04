// The built-in puzzle pictures, painted in code: an original hero with a purple suit,
// gold visor and orange scarf, plus the spider-bot sidekicks.
window.Art = (() => {
  const W = 1200, H = 900;
  const INK = '#14102b';
  const SUIT = '#7c3aed', SUIT_DARK = '#4c1d95', LIME = '#a3e635', GOLD = '#fbbf24', SCARF = '#f97316';
  const rad = d => d * Math.PI / 180;

  function random(seed) {
    return () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
  }

  function sky(c, stops) {
    const g = c.createLinearGradient(0, 0, 0, H);
    stops.forEach(([at, color]) => g.addColorStop(at, color));
    c.fillStyle = g;
    c.fillRect(0, 0, W, H);
  }

  function stars(c, r, count, maxY) {
    c.fillStyle = '#fff8e7';
    for (let i = 0; i < count; i++) {
      c.globalAlpha = .4 + r() * .6;
      c.beginPath();
      c.arc(r() * W, r() * maxY, 1 + r() * 2.4, 0, 7);
      c.fill();
    }
    c.globalAlpha = 1;
  }

  function moon(c, x, y, radius) {
    c.fillStyle = 'rgba(254, 240, 138, .18)';
    c.beginPath(); c.arc(x, y, radius * 1.35, 0, 7); c.fill();
    c.fillStyle = '#fef3c7';
    c.beginPath(); c.arc(x, y, radius, 0, 7); c.fill();
    c.fillStyle = '#fde68a';
    [[-.4, -.3, .22], [.3, .1, .3], [-.2, .5, .16], [.5, -.5, .12]].forEach(([dx, dy, size]) => {
      c.beginPath(); c.arc(x + dx * radius, y + dy * radius, size * radius, 0, 7); c.fill();
    });
  }

  function cloud(c, x, y, s, color) {
    c.fillStyle = color;
    [[0, 0, 60], [70, -24, 74], [150, 0, 62], [220, 10, 44], [-60, 12, 40]].forEach(([dx, dy, size]) => {
      c.beginPath(); c.arc(x + dx * s, y + dy * s, size * s, 0, 7); c.fill();
    });
    c.fillRect(x - 60 * s, y + 10 * s, 280 * s, 44 * s);
  }

  function skyline(c, r, { base, min, max, wMin, wMax, color, lit, litColor, outline }) {
    let x = -30;
    while (x < W + 30) {
      const w = wMin + r() * (wMax - wMin);
      const h = min + r() * (max - min);
      const top = base - h;
      c.fillStyle = color;
      c.fillRect(x, top, w, H - top);
      if (outline) {
        c.strokeStyle = INK; c.lineWidth = 5;
        c.strokeRect(x, top, w, H - top);
      }
      const roof = r();
      if (roof < .3) {
        c.fillRect(x + w / 2 - 3, top - 54, 6, 54);
        c.fillStyle = '#f43f5e';
        c.beginPath(); c.arc(x + w / 2, top - 56, 5, 0, 7); c.fill();
      } else if (roof < .55) {
        c.fillRect(x + w * .2, top - 26, w * .6, 26);
      }
      const size = 12, gap = 11;
      for (let wy = top + 16; wy < H; wy += size + gap + 5) {
        for (let wx = x + 11; wx < x + w - size - 6; wx += size + gap) {
          if (r() < lit) {
            c.fillStyle = litColor;
            c.fillRect(wx, wy, size, size + 5);
          }
        }
      }
      x += w + r() * 10;
    }
  }

  function halftone(c, x0, y0, x1, y1, step, color, sizeAt) {
    c.fillStyle = color;
    c.beginPath();
    for (let y = y0, row = 0; y < y1; y += step, row++) {
      for (let x = x0 + (row % 2) * step / 2; x < x1; x += step) {
        const size = sizeAt(x, y);
        if (size > .4) { c.moveTo(x + size, y); c.arc(x, y, size, 0, 7); }
      }
    }
    c.fill();
  }

  function speedLines(c, r, x, y, inner, count, color) {
    c.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const a = r() * Math.PI * 2;
      const spread = .012 + r() * .018;
      const start = inner + r() * 80;
      c.beginPath();
      c.moveTo(x + Math.cos(a) * start, y + Math.sin(a) * start);
      c.lineTo(x + Math.cos(a - spread) * 1200, y + Math.sin(a - spread) * 1200);
      c.lineTo(x + Math.cos(a + spread) * 1200, y + Math.sin(a + spread) * 1200);
      c.fill();
    }
  }

  function burst(c, x, y, inner, outer, points, fill, tilt = 0) {
    c.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = tilt + i * Math.PI / points;
      const size = i % 2 ? inner : outer * (.82 + .18 * Math.sin(i * 12.9));
      c.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
    }
    c.closePath();
    c.fillStyle = fill;
    c.fill();
    c.strokeStyle = INK; c.lineWidth = 7; c.lineJoin = 'round';
    c.stroke();
  }

  function comicWord(c, text, x, y, size, tilt, fill) {
    c.save();
    c.translate(x, y);
    c.rotate(rad(tilt));
    c.transform(1, 0, -.12, 1, 0, 0);
    c.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineJoin = 'round';
    c.strokeStyle = INK; c.lineWidth = size * .2;
    c.strokeText(text, size * .05, size * .06);
    c.strokeText(text, 0, 0);
    c.fillStyle = fill;
    c.fillText(text, 0, 0);
    c.restore();
  }

  function webLine(c, from, to) {
    c.lineCap = 'round';
    [[20, 'rgba(163, 230, 53, .25)'], [8, LIME], [3, '#f7fee7']].forEach(([width, color]) => {
      c.strokeStyle = color; c.lineWidth = width;
      c.beginPath(); c.moveTo(from.x, from.y); c.lineTo(to.x, to.y); c.stroke();
    });
  }

  function cornerWeb(c, x, y, size, startDeg, endDeg, color) {
    c.strokeStyle = color; c.lineWidth = 3; c.lineCap = 'round';
    const spokes = 7;
    const point = (i, d) => {
      const a = rad(startDeg + (endDeg - startDeg) * i / (spokes - 1));
      return [x + Math.cos(a) * d, y + Math.sin(a) * d];
    };
    for (let i = 0; i < spokes; i++) {
      c.beginPath(); c.moveTo(x, y); c.lineTo(...point(i, size)); c.stroke();
    }
    for (let ring = 1; ring <= 5; ring++) {
      const d = size * ring / 5.4;
      c.beginPath(); c.moveTo(...point(0, d));
      for (let i = 1; i < spokes; i++) {
        const mid = point(i - .5, d * .84);
        c.quadraticCurveTo(mid[0], mid[1], ...point(i, d));
      }
      c.stroke();
    }
  }

  function limb(c, x, y, a1, l1, a2, l2, width) {
    const kneeX = x + Math.cos(rad(a1)) * l1, kneeY = y + Math.sin(rad(a1)) * l1;
    const endX = kneeX + Math.cos(rad(a2)) * l2, endY = kneeY + Math.sin(rad(a2)) * l2;
    const tipX = kneeX + (endX - kneeX) * .5, tipY = kneeY + (endY - kneeY) * .5;
    const stroke = (color, w, points) => {
      c.strokeStyle = color; c.lineWidth = w;
      c.beginPath();
      points.forEach(([px, py], i) => (i ? c.lineTo(px, py) : c.moveTo(px, py)));
      c.stroke();
    };
    c.lineCap = c.lineJoin = 'round';
    const all = [[x, y], [kneeX, kneeY], [endX, endY]];
    const tip = [[tipX, tipY], [endX, endY]];
    stroke(INK, width + 10, all);
    stroke(SUIT, width, all);
    stroke(INK, width + 15, tip);
    stroke(LIME, width + 5, tip);
  }

  function ribbon(c, angle, length, wave) {
    const ux = Math.cos(rad(angle)), uy = Math.sin(rad(angle));
    const edge = side => {
      const out = [];
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const sway = Math.sin(t * 6 + wave) * 26 * t + side * (15 - t * 9);
        out.push([-4 + ux * length * t - uy * sway, -54 + uy * length * t + ux * sway]);
      }
      return out;
    };
    c.beginPath();
    edge(1).forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    edge(-1).reverse().forEach(([x, y]) => c.lineTo(x, y));
    c.closePath();
    c.fillStyle = SCARF; c.fill();
    c.strokeStyle = INK; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
  }

  const SHOULDER_F = [26, -44], SHOULDER_B = [-26, -44], HIP_F = [15, 44], HIP_B = [-15, 44];

  function hero(c, o) {
    const s = o.s || 1;
    c.save();
    c.translate(o.x, o.y);
    c.rotate(rad(o.rot || 0));
    c.scale(o.flip ? -s : s, s);

    ribbon(c, o.scarf ? o.scarf[0] : 170, o.scarf ? o.scarf[1] : 190, o.scarf ? o.scarf[2] : 0);
    limb(c, ...SHOULDER_B, ...o.armB, 25);
    limb(c, ...HIP_B, ...o.legB, 31);

    c.beginPath();
    c.moveTo(-40, -54);
    c.quadraticCurveTo(0, -66, 40, -54);
    c.quadraticCurveTo(38, -8, 28, 34);
    c.lineTo(30, 58);
    c.lineTo(-30, 58);
    c.lineTo(-28, 34);
    c.quadraticCurveTo(-38, -8, -40, -54);
    c.closePath();
    c.fillStyle = SUIT; c.fill();
    c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
    c.fillStyle = SUIT_DARK;
    c.beginPath();
    c.moveTo(-37, -40); c.quadraticCurveTo(-32, 0, -26, 32); c.lineTo(-12, 32); c.quadraticCurveTo(-22, -10, -22, -52);
    c.closePath(); c.fill();
    c.fillStyle = GOLD;
    c.fillRect(-29, 30, 58, 13);
    c.strokeStyle = INK; c.lineWidth = 4; c.strokeRect(-29, 30, 58, 13);
    c.fillStyle = LIME;
    c.fillRect(-8, 28, 16, 17);
    c.strokeRect(-8, 28, 16, 17);

    c.strokeStyle = LIME; c.lineWidth = 4.5; c.lineCap = 'round';
    [[-1, -24], [-1, -12], [-1, 2], [-1, 14], [1, -24], [1, -12], [1, 2], [1, 14]].forEach(([side, y]) => {
      c.beginPath();
      c.moveTo(side * 6, -12 + y * .2);
      c.lineTo(side * 18, -14 + y * .55);
      c.lineTo(side * 25, -12 + y * 1.05);
      c.stroke();
    });
    c.fillStyle = LIME;
    c.beginPath(); c.ellipse(0, -12, 9, 15, 0, 0, 7); c.fill();

    limb(c, ...HIP_F, ...o.legF, 33);

    c.save();
    c.translate(2, -92);
    c.rotate(rad(o.head || 0));
    c.strokeStyle = INK; c.lineWidth = 6; c.lineCap = 'round';
    [[-14, -33, -28, -60], [14, -33, 24, -62]].forEach(([x0, y0, x1, y1]) => {
      c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      c.fillStyle = LIME;
      c.beginPath(); c.arc(x1, y1, 7, 0, 7); c.fill(); c.lineWidth = 4; c.stroke(); c.lineWidth = 6;
    });
    c.beginPath(); c.arc(0, 0, 38, 0, 7);
    c.fillStyle = SUIT; c.fill(); c.stroke();
    c.fillStyle = LIME;
    c.beginPath(); c.moveTo(-8, -37); c.lineTo(8, -37); c.lineTo(6, -14); c.lineTo(-6, -14); c.closePath(); c.fill();
    c.beginPath();
    c.moveTo(-22, 2);
    c.quadraticCurveTo(-20, -18, 8, -17);
    c.lineTo(36, -13);
    c.quadraticCurveTo(44, 2, 34, 15);
    c.quadraticCurveTo(4, 24, -22, 2);
    c.closePath();
    c.fillStyle = GOLD; c.fill(); c.stroke();
    c.fillStyle = '#fef9c3';
    c.beginPath(); c.ellipse(10, -6, 14, 5, -.1, 0, 7); c.fill();
    c.fillStyle = LIME;
    c.beginPath(); c.moveTo(-14, 28); c.quadraticCurveTo(10, 42, 30, 25); c.lineTo(22, 20); c.quadraticCurveTo(6, 30, -10, 21); c.closePath(); c.fill();
    c.restore();

    limb(c, ...SHOULDER_F, ...o.armF, 27);
    c.restore();
  }

  function handOf(o) {
    const s = o.s || 1;
    const [a1, l1, a2, l2] = o.armF;
    let hx = SHOULDER_F[0] + Math.cos(rad(a1)) * l1 + Math.cos(rad(a2)) * l2;
    const hy = SHOULDER_F[1] + Math.sin(rad(a1)) * l1 + Math.sin(rad(a2)) * l2;
    if (o.flip) hx = -hx;
    const a = rad(o.rot || 0);
    return {
      x: o.x + s * (hx * Math.cos(a) - hy * Math.sin(a)),
      y: o.y + s * (hx * Math.sin(a) + hy * Math.cos(a)),
    };
  }

  function bot(c, x, y, s, color, look = 1) {
    c.save();
    c.translate(x, y);
    c.scale(s, s);
    c.lineCap = c.lineJoin = 'round';
    [-1, 1].forEach(side => {
      [[-34, -30], [-12, -46], [12, -46], [34, -30]].forEach(([dy, up], i) => {
        c.strokeStyle = INK; c.lineWidth = 10;
        const line = () => {
          c.beginPath();
          c.moveTo(side * 34, dy * .4);
          c.lineTo(side * (66 + i * 3), dy * .4 + up * .9);
          c.lineTo(side * (92 + i * 3), 44 - i * 7);
        };
        line(); c.stroke();
        c.strokeStyle = '#cbd5e1'; c.lineWidth = 4;
        line(); c.stroke();
      });
    });
    c.beginPath(); c.ellipse(0, 0, 50, 42, 0, 0, 7);
    c.fillStyle = color; c.fill();
    c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
    c.fillStyle = 'rgba(255, 255, 255, .35)';
    c.beginPath(); c.ellipse(-16, -20, 16, 8, -.4, 0, 7); c.fill();
    [-18, 18].forEach(dx => {
      c.fillStyle = '#fff';
      c.beginPath(); c.arc(dx, -2, 14, 0, 7); c.fill();
      c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      c.fillStyle = INK;
      c.beginPath(); c.arc(dx + look * 5, -1, 6.5, 0, 7); c.fill();
    });
    c.strokeStyle = INK; c.lineWidth = 4;
    c.beginPath(); c.arc(0, 15, 12, .25, Math.PI - .25); c.stroke();
    c.restore();
  }

  function mechLeg(c, x, y, a1, l1, a2, l2) {
    const kneeX = x + Math.cos(rad(a1)) * l1, kneeY = y + Math.sin(rad(a1)) * l1;
    const endX = kneeX + Math.cos(rad(a2)) * l2, endY = kneeY + Math.sin(rad(a2)) * l2;
    c.lineCap = 'butt'; c.lineJoin = 'miter';
    const line = () => { c.beginPath(); c.moveTo(x, y); c.lineTo(kneeX, kneeY); c.lineTo(endX, endY); };
    c.strokeStyle = INK; c.lineWidth = 36; line(); c.stroke();
    c.strokeStyle = '#64748b'; c.lineWidth = 24; line(); c.stroke();
    c.strokeStyle = '#94a3b8'; c.lineWidth = 6; line(); c.stroke();
    c.fillStyle = '#f59e0b'; c.strokeStyle = INK; c.lineWidth = 6;
    c.beginPath(); c.arc(kneeX, kneeY, 22, 0, 7); c.fill(); c.stroke();
    c.fillStyle = INK;
    c.beginPath(); c.arc(kneeX, kneeY, 7, 0, 7); c.fill();
  }

  function mech(c, x, y) {
    [[-140, 40, 200, 170, 120, 250], [-110, 10, 230, 200, 150, 280], [-70, 0, 245, 160, 170, 240],
     [140, 40, -20, 170, 60, 250], [110, 10, -50, 200, 30, 280], [70, 0, -65, 160, 10, 240]].forEach(
      ([dx, dy, a1, l1, a2, l2]) => mechLeg(c, x + dx, y + dy, a1, l1, a2, l2));

    c.beginPath(); c.ellipse(x, y, 210, 130, 0, 0, 7);
    c.fillStyle = '#334155'; c.fill();
    c.strokeStyle = INK; c.lineWidth = 8; c.stroke();
    c.save();
    c.clip();
    c.fillStyle = '#475569';
    c.fillRect(x - 220, y - 140, 440, 110);
    for (let i = -6; i < 8; i++) {
      c.fillStyle = i % 2 ? '#facc15' : INK;
      c.beginPath();
      c.moveTo(x + i * 36, y + 40); c.lineTo(x + i * 36 + 36, y + 40);
      c.lineTo(x + i * 36 + 6, y + 76); c.lineTo(x + i * 36 - 30, y + 76);
      c.fill();
    }
    c.restore();
    c.strokeStyle = INK; c.lineWidth = 8;
    c.beginPath(); c.ellipse(x, y, 210, 130, 0, 0, 7); c.stroke();
    [[-150, -30], [-90, -86], [0, -104], [90, -86], [150, -30]].forEach(([dx, dy]) => {
      c.fillStyle = '#cbd5e1';
      c.beginPath(); c.arc(x + dx, y + dy, 7, 0, 7); c.fill();
      c.lineWidth = 3; c.stroke();
    });

    c.lineWidth = 7;
    c.beginPath(); c.ellipse(x - 30, y + 18, 100, 78, 0, 0, 7);
    c.fillStyle = '#1e293b'; c.fill(); c.stroke();
    [[-74, 0, 26], [-16, -8, 30], [38, 8, 20], [-44, 42, 15], [4, 44, 15]].forEach(([dx, dy, size]) => {
      c.fillStyle = 'rgba(244, 63, 94, .3)';
      c.beginPath(); c.arc(x - 30 + dx + 30, y + 18 + dy, size * 1.5, 0, 7); c.fill();
      c.fillStyle = '#f43f5e';
      c.beginPath(); c.arc(x - 30 + dx + 30, y + 18 + dy, size, 0, 7); c.fill();
      c.strokeStyle = INK; c.lineWidth = 4; c.stroke();
      c.fillStyle = '#fecdd3';
      c.beginPath(); c.arc(x - 30 + dx + 24, y + 12 + dy, size * .3, 0, 7); c.fill();
    });
  }

  const scenes = {
    nightSwing(c) {
      const r = random(11);
      sky(c, [[0, '#1e0a4c'], [.5, '#6d28d9'], [.78, '#ec4899'], [1, '#fb923c']]);
      stars(c, r, 130, 480);
      moon(c, 900, 200, 125);
      cloud(c, 90, 180, .8, 'rgba(255, 255, 255, .09)');
      cloud(c, 640, 400, 1, 'rgba(255, 255, 255, .08)');
      skyline(c, r, { base: 900, min: 280, max: 500, wMin: 70, wMax: 130, color: '#5b21b6', lit: .3, litColor: '#c4b5fd' });
      skyline(c, r, { base: 900, min: 150, max: 340, wMin: 90, wMax: 170, color: '#2e1065', lit: .45, litColor: '#fde047', outline: true });
      speedLines(c, r, 440, 440, 230, 34, 'rgba(255, 255, 255, .14)');
      const pose = {
        x: 440, y: 440, s: 1.4, rot: 22,
        armF: [-62, 58, -74, 58], armB: [165, 54, 120, 50],
        legF: [62, 64, 128, 64], legB: [125, 66, 175, 62],
        scarf: [190, 230, .6], head: -10,
      };
      webLine(c, handOf(pose), { x: 990, y: -30 });
      hero(c, pose);
      webLine(c, { x: 1040, y: 470 }, { x: 1040, y: -30 });
      bot(c, 1040, 510, .9, '#f97316', -1);
      cornerWeb(c, 0, 0, 300, 0, 90, 'rgba(255, 255, 255, .45)');
    },

    rooftop(c) {
      const r = random(27);
      sky(c, [[0, '#7c2d92'], [.4, '#f43f5e'], [.7, '#fb923c'], [1, '#fde047']]);
      c.fillStyle = '#fef3c7';
      c.beginPath(); c.arc(330, 470, 120, 0, 7); c.fill();
      cloud(c, 640, 150, 1.1, 'rgba(255, 237, 213, .55)');
      cloud(c, 80, 240, .7, 'rgba(255, 237, 213, .4)');
      skyline(c, r, { base: 760, min: 170, max: 400, wMin: 60, wMax: 120, color: '#9d174d', lit: .25, litColor: '#fecaca' });
      skyline(c, r, { base: 790, min: 90, max: 260, wMin: 80, wMax: 150, color: '#581c87', lit: .35, litColor: '#fde047' });

      c.fillStyle = INK;
      [[220, 150], [270, 120], [320, 165], [150, 110]].forEach(([x, y]) => {
        c.beginPath();
        c.moveTo(x - 20, y - 8); c.quadraticCurveTo(x - 8, y - 14, x, y); c.quadraticCurveTo(x + 8, y - 14, x + 20, y - 8);
        c.quadraticCurveTo(x + 8, y - 6, x, y + 5); c.quadraticCurveTo(x - 8, y - 6, x - 20, y - 8);
        c.fill();
      });

      c.fillStyle = '#312e81';
      c.fillRect(0, 690, W, 210);
      c.fillStyle = '#4338ca';
      c.fillRect(0, 672, W, 26);
      c.strokeStyle = INK; c.lineWidth = 6;
      c.strokeRect(-10, 672, W + 20, 26);
      c.strokeStyle = 'rgba(20, 16, 43, .5)'; c.lineWidth = 3;
      for (let y = 725; y < H; y += 34) {
        c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
        for (let x = (y % 68 ? 0 : 40); x < W; x += 80) {
          c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 34); c.stroke();
        }
      }

      c.lineCap = 'butt'; c.strokeStyle = INK; c.lineWidth = 12;
      [[90, 672, 110, 500], [250, 672, 230, 500], [130, 672, 210, 560], [210, 672, 130, 560]].forEach(([x0, y0, x1, y1]) => {
        c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.stroke();
      });
      c.fillStyle = '#b45309';
      c.beginPath();
      c.moveTo(90, 500); c.lineTo(90, 330); c.lineTo(170, 270); c.lineTo(250, 330); c.lineTo(250, 500);
      c.closePath(); c.fill();
      c.strokeStyle = INK; c.lineWidth = 7; c.lineJoin = 'round'; c.stroke();
      c.lineWidth = 4;
      [130, 170, 210].forEach(x => { c.beginPath(); c.moveTo(x, 330); c.lineTo(x, 500); c.stroke(); });
      [380, 440].forEach(y => { c.beginPath(); c.moveTo(90, y); c.lineTo(250, y); c.stroke(); });

      hero(c, {
        x: 800, y: 500, s: 1.45, rot: 8,
        armF: [70, 52, 120, 50], armB: [120, 52, 70, 50],
        legF: [-8, 66, 100, 70], legB: [170, 62, 95, 72],
        scarf: [-14, 270, 1.8], head: 8, flip: true,
      });
      bot(c, 1085, 640, .62, '#38bdf8', -1);
      cornerWeb(c, W, 0, 280, 90, 180, 'rgba(255, 255, 255, .5)');
    },

    robot(c) {
      const r = random(53);
      sky(c, [[0, '#0f766e'], [.55, '#5eead4'], [1, '#fef08a']]);
      halftone(c, 0, 0, W, 620, 20, 'rgba(255, 255, 255, .22)', (x, y) => 7 * (1 - y / 620));
      skyline(c, r, { base: 700, min: 220, max: 520, wMin: 90, wMax: 160, color: '#115e59', lit: .35, litColor: '#a7f3d0' });
      skyline(c, r, { base: 760, min: 110, max: 290, wMin: 100, wMax: 190, color: '#134e4a', lit: .4, litColor: '#fde047', outline: true });
      c.fillStyle = '#334155';
      c.fillRect(0, 760, W, 140);
      c.fillStyle = '#1e293b';
      c.fillRect(0, 760, W, 16);
      c.fillStyle = '#fde047';
      for (let x = -30; x < W; x += 170) c.fillRect(x, 830, 96, 13);

      mech(c, 790, 400);

      burst(c, 590, 390, 74, 170, 11, GOLD, .2);
      burst(c, 590, 390, 36, 92, 9, '#fff8e7', .5);
      const pose = {
        x: 350, y: 300, s: 1.35, rot: 58,
        armF: [20, 56, -30, 54], armB: [160, 54, 200, 50],
        legF: [-2, 70, 6, 72], legB: [120, 62, 40, 62],
        scarf: [120, 250, 2.4], head: -44,
      };
      hero(c, pose);
      comicWord(c, 'KA-BOOM', 340, 112, 96, -7, '#f43f5e');
      bot(c, 120, 690, .72, '#a3e635', 1);
    },

    zap(c) {
      const r = random(71);
      c.fillStyle = GOLD;
      c.fillRect(0, 0, W, H);
      const cx = 640, cy = 430;
      c.fillStyle = SCARF;
      for (let i = 0; i < 18; i++) {
        const a = i * Math.PI / 9;
        c.beginPath();
        c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(a) * 1300, cy + Math.sin(a) * 1300);
        c.lineTo(cx + Math.cos(a + Math.PI / 18) * 1300, cy + Math.sin(a + Math.PI / 18) * 1300);
        c.fill();
      }
      halftone(c, 0, 0, W, H, 22, 'rgba(236, 72, 153, .55)', (x, y) => Math.min(9, Math.hypot(x - cx, y - cy) / 72));
      speedLines(c, r, cx, cy, 340, 30, 'rgba(255, 255, 255, .5)');

      burst(c, 300, 250, 170, 320, 13, '#ec4899', .1);
      comicWord(c, 'ZAP!', 300, 250, 170, -10, '#fff8e7');

      const pose = {
        x: 720, y: 420, s: 1.75, rot: -8,
        armF: [-178, 88, 196, 92], armB: [58, 60, 10, 54],
        legF: [52, 72, 118, 72], legB: [128, 76, 62, 70],
        scarf: [-16, 300, 1], head: 0, flip: false,
      };
      hero(c, Object.assign({}, pose));
      const hand = handOf(pose);
      burst(c, hand.x - 30, hand.y, 44, 104, 9, '#a3e635', .3);
      burst(c, hand.x - 30, hand.y, 20, 54, 7, '#fff8e7', .1);

      c.strokeStyle = INK; c.lineWidth = 20;
      c.strokeRect(10, 10, W - 20, H - 20);
      bot(c, 1020, 770, .8, '#38bdf8', -1);
      comicWord(c, 'POW', 215, 770, 92, 8, '#a3e635');
    },

    storm(c) {
      const r = random(97);
      sky(c, [[0, '#0b1026'], [.55, '#1e3a8a'], [1, '#155e75']]);
      cloud(c, -40, 90, 1.5, '#1e293b');
      cloud(c, 380, 60, 1.8, '#27304f');
      cloud(c, 840, 110, 1.5, '#1e293b');
      cloud(c, 170, 170, 1.1, '#334155');
      cloud(c, 690, 200, 1, '#334155');

      c.lineJoin = 'miter';
      [[980, 180, 1], [180, 230, -.7]].forEach(([x, y, s]) => {
        c.beginPath();
        c.moveTo(x, y); c.lineTo(x - 60 * s, y + 150); c.lineTo(x + 6 * s, y + 140);
        c.lineTo(x - 70 * s, y + 330); c.lineTo(x + 34 * s, y + 120); c.lineTo(x - 26 * s, y + 130);
        c.lineTo(x + 40 * s, y);
        c.closePath();
        c.fillStyle = '#fef08a'; c.shadowColor = '#fef08a'; c.shadowBlur = 40; c.fill();
        c.shadowBlur = 0;
        c.strokeStyle = '#fff'; c.lineWidth = 4; c.stroke();
      });

      skyline(c, r, { base: 660, min: 80, max: 240, wMin: 60, wMax: 120, color: '#1e3a5f', lit: .3, litColor: '#7dd3fc' });

      c.fillStyle = '#0e7490';
      c.fillRect(0, 640, W, 260);
      c.strokeStyle = 'rgba(165, 243, 252, .5)'; c.lineWidth = 4; c.lineCap = 'round';
      for (let i = 0; i < 46; i++) {
        const x = r() * W, y = 660 + r() * 240;
        c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 24, y - 10, x + 48, y); c.stroke();
      }

      const towers = [230, 960];
      c.strokeStyle = '#fb7185'; c.lineWidth = 8;
      c.beginPath();
      c.moveTo(-100, 330);
      c.quadraticCurveTo(80, 560, 230, 240);
      c.quadraticCurveTo(595, 800, 960, 240);
      c.quadraticCurveTo(1110, 560, 1300, 330);
      c.stroke();
      c.lineWidth = 4;
      for (let x = 270; x < 950; x += 46) {
        const t = (x - 230) / 730;
        const y = (1 - t) * (1 - t) * 240 + 2 * (1 - t) * t * 800 + t * t * 240;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x, 640); c.stroke();
      }
      towers.forEach(x => {
        c.fillStyle = '#e11d48'; c.strokeStyle = INK; c.lineWidth = 6;
        c.fillRect(x - 40, 240, 22, 560); c.strokeRect(x - 40, 240, 22, 560);
        c.fillRect(x + 18, 240, 22, 560); c.strokeRect(x + 18, 240, 22, 560);
        [260, 390, 520].forEach(y => { c.fillRect(x - 40, y, 80, 26); c.strokeRect(x - 40, y, 80, 26); });
      });
      c.fillStyle = '#be123c';
      c.fillRect(-10, 640, W + 20, 36);
      c.strokeStyle = INK; c.lineWidth = 6; c.strokeRect(-10, 640, W + 20, 36);
      c.fillStyle = '#fde047';
      for (let x = 20; x < W; x += 60) c.fillRect(x, 654, 26, 8);

      const pose = {
        x: 610, y: 380, s: 1.35, rot: 12,
        armF: [-20, 58, -35, 58], armB: [190, 56, 165, 52],
        legF: [40, 66, 110, 66], legB: [135, 64, 200, 62],
        scarf: [176, 250, 3.4], head: -6,
      };
      webLine(c, handOf(pose), { x: 945, y: 244 });
      hero(c, pose);

      c.strokeStyle = 'rgba(186, 230, 253, .55)'; c.lineWidth = 3;
      for (let i = 0; i < 150; i++) {
        const x = r() * (W + 100), y = r() * H;
        c.beginPath(); c.moveTo(x, y); c.lineTo(x - 13, y + 38); c.stroke();
      }
    },

    buddies(c) {
      const r = random(131);
      sky(c, [[0, '#38bdf8'], [.7, '#bae6fd'], [1, '#fef9c3']]);
      c.fillStyle = 'rgba(254, 240, 138, .5)';
      c.beginPath(); c.arc(960, 130, 130, 0, 7); c.fill();
      c.fillStyle = '#fde047';
      c.beginPath(); c.arc(960, 130, 86, 0, 7); c.fill();
      cloud(c, 390, 130, 1, '#fff');
      cloud(c, 690, 260, .7, '#fff');

      skyline(c, r, { base: 820, min: 120, max: 300, wMin: 80, wMax: 150, color: '#7dd3fc', lit: .35, litColor: '#e0f2fe' });
      c.fillStyle = '#4ade80';
      c.beginPath();
      c.moveTo(0, 790); c.quadraticCurveTo(300, 700, 600, 780); c.quadraticCurveTo(900, 850, W, 760);
      c.lineTo(W, H); c.lineTo(0, H); c.closePath();
      c.fill();
      c.strokeStyle = INK; c.lineWidth = 6; c.stroke();
      [[190, 800], [980, 830], [620, 840], [400, 850], [820, 860]].forEach(([x, y], i) => {
        c.fillStyle = ['#f43f5e', '#fbbf24', '#ec4899', '#fff', '#f97316'][i];
        for (let a = 0; a < 5; a++) {
          c.beginPath(); c.arc(x + Math.cos(a * 1.26) * 13, y + Math.sin(a * 1.26) * 13, 9, 0, 7); c.fill();
        }
        c.fillStyle = '#fef08a';
        c.beginPath(); c.arc(x, y, 8, 0, 7); c.fill();
      });

      [[100, '#a16207'], [1100, '#a16207']].forEach(([x, color]) => {
        c.fillStyle = color;
        c.fillRect(x - 30, 200, 60, 700);
        c.strokeStyle = INK; c.lineWidth = 6;
        c.strokeRect(x - 30, 200, 60, 700);
        [[-90, 170, 110], [0, 90, 130], [90, 170, 110], [0, 220, 130]].forEach(([dx, y, size]) => {
          c.fillStyle = '#16a34a';
          c.beginPath(); c.arc(x + dx, y, size, 0, 7); c.fill();
          c.stroke();
        });
        [[-60, 150, 70], [40, 120, 74], [0, 230, 70]].forEach(([dx, y, size]) => {
          c.fillStyle = '#22c55e';
          c.beginPath(); c.arc(x + dx, y, size, 0, 7); c.fill();
        });
      });

      c.strokeStyle = '#fff'; c.lineWidth = 7; c.lineCap = 'round';
      const strand = (sag) => {
        c.beginPath(); c.moveTo(110, 380); c.quadraticCurveTo(600, sag, 1090, 380); c.stroke();
      };
      [760, 800, 840, 880].forEach(strand);
      c.lineWidth = 4;
      for (let x = 240; x < 1000; x += 70) {
        const t = (x - 110) / 980;
        const y0 = (1 - t) * (1 - t) * 380 + 2 * (1 - t) * t * 760 + t * t * 380;
        const y1 = (1 - t) * (1 - t) * 380 + 2 * (1 - t) * t * 880 + t * t * 380;
        c.beginPath(); c.moveTo(x, y0); c.lineTo(x + 16, y1); c.stroke();
      }

      hero(c, {
        x: 560, y: 410, s: 1.15, rot: -62,
        armF: [130, 54, -160, 50], armB: [80, 40, 170, 44],
        legF: [8, 70, 20, 70], legB: [30, 70, 92, 62],
        scarf: [78, 150, 1], head: 58,
      });

      bot(c, 300, 500, .78, '#f97316', 1);
      bot(c, 850, 500, .82, '#ec4899', -1);
      bot(c, 985, 420, .62, '#a3e635', -1);
      webLine(c, { x: 460, y: -30 }, { x: 460, y: 170 });
      bot(c, 460, 205, .66, '#fbbf24', 1);
    },
  };

  const pictures = [
    { id: 'nightSwing', title: 'Night Swing' },
    { id: 'zap', title: 'ZAP!' },
    { id: 'robot', title: 'Robot Attack' },
    { id: 'rooftop', title: 'Rooftop Lookout' },
    { id: 'storm', title: 'Storm Bridge' },
    { id: 'buddies', title: 'Bot Buddies' },
  ];

  function render(id, width) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(width * H / W);
    const c = canvas.getContext('2d');
    c.scale(width / W, width / W);
    scenes[id](c);
    return canvas;
  }

  return { pictures, render };
})();
