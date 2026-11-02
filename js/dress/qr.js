// ─── dressing for the qr room: the map room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// An explorer's map room for a map of companies that turn into QR codes: a globe and a
// ship's compass, a flat-file map cabinet, a wall of tiles that flip between a company and
// its code, a shelf of little company models (a pumpjack nods, a turbine turns, a factory
// puffs, a rocket launches), floating hot-air balloons, clocks for three time zones.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default function dress(kit) {
  const { THREE, put, paint, rb, tap, live, block, claim, texMat, canvasTex, HAND, SCRIPT, INKC, D, g: G, shadow } = kit;
  const sub = kit.kit;
  const BACK = -D + 0.5;
  const PI = Math.PI;

  // ── static pieces batched per material, merged into one mesh each ──
  const bag = new Map();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const S = (geo, mat, x = 0, y = 0, z = 0, rot, sc) => {
    const gg = geo.index ? geo.toNonIndexed() : geo.clone();
    _e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), sc ? _s.set(sc[0], sc[1], sc[2]) : _s.set(1, 1, 1));
    gg.applyMatrix4(_m);
    for (const k of Object.keys(gg.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') gg.deleteAttribute(k);
    if (!bag.has(mat)) bag.set(mat, []);
    bag.get(mat).push(gg);
  };
  const SB = (w, h, d, mat, x, y, z, r = 0.015, rot) => S(rb(w, h, d, r), mat, x, y, z, rot);
  const bake = () => { for (const [mat, list] of bag) put(mergeGeometries(list), mat); bag.clear(); };

  const M = {
    wood: paint(0x6b4a34), woodL: paint(0x9a6e4a), brass: paint(0xd9a84a), dark: paint(0x2a2230, { hatch: 0 }),
    paper: paint(0xf6efdf), red: paint(0xe8604c), teal: paint(0x7fb3a8), gold: paint(0xe4b84f), blue: paint(0x3f5aa8),
    sage: paint(0xa8b994), rose: paint(0xdc9e9a), lilac: paint(0xb7a3c6), cream: paint(0xfffaf0), steel: paint(0x8a93a6),
    green: paint(0x6f9a7c), terra: paint(0xd58b63),
  };
  const font = (c, px, f = HAND, wt = 700) => { c.font = `${wt} ${px}px ${f}`; };
  // a QR-ish pattern with three finder squares
  const qrDraw = (c, x0, y0, s, seed, n = 13) => {
    const R = kit.mkRng(seed), m = s / n;
    c.fillStyle = '#f6efdf'; c.fillRect(x0 - m, y0 - m, s + 2 * m, s + 2 * m);
    c.fillStyle = INKC;
    const fd = (i, j) => (i === 0 || i === 4 || j === 0 || j === 4) || (i >= 2 && i <= 2 && j >= 2 && j <= 2) || (i > 1 && i < 3 && j > 1 && j < 3);
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      let on;
      if (i < 5 && j < 5) on = fd(i, j); else if (i >= n - 5 && j < 5) on = fd(i - (n - 5), j); else if (i < 5 && j >= n - 5) on = fd(i, j - (n - 5));
      else if ((i === 5 || j === 5) && (i < 6 || j < 6)) on = false;
      else on = R() < 0.5;
      if (on) c.fillRect(x0 + i * m, y0 + j * m, m + 0.5, m + 0.5);
    }
  };
  const poster = (w, h, px, draw, x, y, z, face, { board = 0x6b4a34, thick = 0.03 } = {}) => {
    const ry = face === 'left' ? PI / 2 : face === 'right' ? -PI / 2 : 0;
    const nx = face === 'left' ? 1 : face === 'right' ? -1 : 0, nz = face === 'back' ? 1 : 0;
    const pic = kit.flat(w, h, texMat(px, Math.round(px * h / w), draw), x + nx * (thick / 2 + 0.003), y, z + nz * (thick / 2 + 0.003), [0, ry, 0]);
    pic.renderOrder = 2;
    SB(face === 'back' ? w + 0.06 : thick, h + 0.06, face === 'back' ? thick : w + 0.06, paint(board), x, y, z, 0.008);
    return pic;
  };

  // ════════ 1. the globe in the back left corner: tap to spin it ════════
  {
    const x = -3.45, z = -4.98, cy = 1.0, r = 0.27;
    S(new THREE.CylinderGeometry(0.22, 0.26, 0.05, 20), M.wood, x, 0.025, z);
    S(new THREE.LatheGeometry([[0.001, 0], [0.06, 0], [0.04, 0.1], [0.07, 0.3], [0.035, 0.5], [0.05, 0.62], [0.001, 0.62]].map(p => new THREE.Vector2(p[0], p[1])), 14), M.woodL, x, 0.05, z);
    // the meridian ring: a half hoop held at the axis ends, the whole thing tilted 23°
    const tilt = new THREE.Group(); tilt.position.set(x, cy, z); tilt.rotation.z = 0.41; G.add(tilt);
    const Tk = sub(tilt);
    Tk.put(new THREE.TorusGeometry(r + 0.04, 0.014, 6, 40), M.brass, 0, 0, 0);
    for (const s of [-1, 1]) Tk.put(new THREE.CylinderGeometry(0.012, 0.012, 0.06, 8), M.brass, 0, s * (r + 0.02), 0);
    S(new THREE.CylinderGeometry(0.025, 0.03, 0.06, 10), M.brass, x, cy - (r + 0.04) - 0.02, z);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), paint(0xffffff, { hatch: 0.3, unique: true, map: canvasTex(512, 256, (c, w, h) => {
      c.fillStyle = '#8fc3c9'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(42,34,48,0.25)'; c.lineWidth = 1.5;
      for (let i = 1; i < 12; i++) { c.beginPath(); c.moveTo(i * w / 12, 0); c.lineTo(i * w / 12, h); c.stroke(); }
      for (let j = 1; j < 6; j++) { c.beginPath(); c.moveTo(0, j * h / 6); c.lineTo(w, j * h / 6); c.stroke(); }
      const land = [[90, 80, 70, 45, '#e1b95c'], [120, 150, 30, 50, '#a8b994'], [270, 70, 55, 30, '#dc9e9a'], [280, 140, 35, 50, '#d58b63'], [380, 80, 90, 40, '#e8d77a'], [430, 175, 35, 22, '#b7a3c6']];
      for (const [lx, ly, rx, ry, col] of land) {
        c.fillStyle = col; c.beginPath();
        for (let a = 0; a <= 6.3; a += 0.3) { const rr = 1 + 0.25 * Math.sin(a * 3 + lx) + 0.12 * Math.sin(a * 7); a === 0 ? c.moveTo(lx + Math.cos(a) * rx * rr, ly + Math.sin(a) * ry * rr) : c.lineTo(lx + Math.cos(a) * rx * rr, ly + Math.sin(a) * ry * rr); }
        c.closePath(); c.fill(); c.strokeStyle = INKC; c.lineWidth = 2; c.stroke();
      }
      for (const [px, py] of [[80, 80], [110, 70], [270, 66], [400, 80]]) { c.fillStyle = '#e8604c'; c.beginPath(); c.arc(px, py, 5, 0, 7); c.fill(); }
    }) }));
    tilt.add(globe);
    let w = 0.25;
    tap(tilt, 'spin the globe', (sfx) => { w = 9; sfx([[330, 0.05], [392, 0.05], [494, 0.05], [587, 0.05], [659, 0.18]], 'sine', 0.05); });
    live((t, dt) => { w += (0.25 - w) * Math.min(1, dt * 0.5); globe.rotation.y += w * dt; });
    claim(x, z, 0.3);
  }

  // ════════ 2. a cork board of company cards on the back wall ════════
  poster(0.92, 0.78, 384, (c, w, h) => {
    c.fillStyle = '#c79a66'; c.fillRect(0, 0, w, h);
    const R = kit.mkRng(4);
    for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(${90 + R() * 60},${60 + R() * 30},30,0.35)`; c.fillRect(R() * w, R() * h, 2, 2); }
    const cards = [[60, 70, 'Walmart', 1], [200, 60, 'Apple', 2], [320, 90, 'Exxon', 3], [90, 210, 'Boeing', 4], [240, 190, 'Ford', 5], [330, 250, 'Tesla', 6]];
    c.strokeStyle = '#d2483e'; c.lineWidth = 2.5; c.beginPath();
    cards.forEach(([x, y], i) => (i ? c.lineTo(x, y - 30) : c.moveTo(x, y - 30))); c.stroke();
    for (const [x, y, name, seed] of cards) {
      c.save(); c.translate(x, y); c.rotate((R() - 0.5) * 0.25);
      c.fillStyle = '#fbf6ea'; c.fillRect(-48, -36, 96, 92); c.strokeStyle = INKC; c.lineWidth = 2; c.strokeRect(-48, -36, 96, 92);
      qrDraw(c, -26, -26, 52, seed, 11);
      font(c, 16); c.fillStyle = INKC; c.textAlign = 'center'; c.fillText(name, 0, 48);
      c.restore();
      c.fillStyle = '#d2483e'; c.beginPath(); c.arc(x, y - 30, 6, 0, 7); c.fill();
    }
  }, -2.62, 1.48, BACK + 0.015, 'back', { board: 0x6b4a34, thick: 0.025 });

  // ════════ 3. the map on the left wall, and the flat-file map cabinet under it ════════
  poster(1.7, 0.9, 512, (c, w, h) => {
    c.fillStyle = '#e9dfc2'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#9fc7cb'; c.fillRect(10, 10, w - 20, h - 20);
    // a chunky USA in seven regions
    const regs = [['#a8b994', [[40, 60], [130, 50], [140, 150], [50, 140]]], ['#e1b95c', [[50, 140], [140, 150], [150, 250], [70, 230]]],
      ['#dc9e9a', [[130, 50], [240, 55], [235, 160], [140, 150]]], ['#d58b63', [[140, 150], [235, 160], [250, 265], [150, 250]]],
      ['#e8d77a', [[240, 55], [350, 70], [345, 170], [235, 160]]], ['#e8a0a0', [[235, 160], [345, 170], [360, 260], [250, 265]]],
      ['#b7a3c6', [[350, 70], [470, 60], [460, 200], [345, 170]]]];
    for (const [col, pts] of regs) {
      c.fillStyle = col; c.beginPath(); pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fill();
      c.strokeStyle = INKC; c.lineWidth = 3; c.stroke();
    }
    c.fillStyle = '#e8d77a'; c.beginPath(); c.moveTo(345, 170); c.lineTo(420, 210); c.lineTo(410, 280); c.lineTo(360, 260); c.closePath(); c.fill(); c.stroke();
    font(c, 36, SCRIPT); c.fillStyle = INKC; c.fillText('where the big companies live', 30, h - 16);
    // a compass rose in the corner
    c.save(); c.translate(w - 50, h - 50); c.fillStyle = INKC;
    for (let k = 0; k < 4; k++) { c.rotate(PI / 2); c.beginPath(); c.moveTo(0, -34); c.lineTo(7, 0); c.lineTo(-7, 0); c.fill(); }
    font(c, 16); c.textAlign = 'center'; c.fillText('N', 0, -38); c.restore();
  }, -3.985, 1.5, -3.6, 'left', { board: 0x6b4a34 });
  for (const [z, y, col] of [[-4.1, 1.62, M.red], [-3.82, 1.72, M.blue], [-3.42, 1.45, M.gold], [-3.05, 1.7, M.red], [-3.2, 1.25, M.blue]]) {
    S(new THREE.CylinderGeometry(0.004, 0.004, 0.05, 4), M.dark, -3.94, y, z, [0, 0, PI / 2]);
    S(new THREE.SphereGeometry(0.022, 8, 6), col, -3.915, y, z);
  }
  {
    const x = -3.68, z = -3.6, w = 0.9, d = 0.5, h = 0.82;
    SB(d, h, w, M.wood, x, h / 2, z, 0.02);
    SB(d + 0.04, 0.04, w + 0.04, M.woodL, x, h + 0.02, z, 0.01);
    const nD = 5, dh = (h - 0.1) / nD;
    let drawer = null;
    for (let k = 0; k < nD; k++) {
      const y = 0.06 + dh * (k + 0.5);
      if (k === nD - 1) {
        drawer = new THREE.Group(); drawer.position.set(x + d / 2, y, z); G.add(drawer);    // slides out on its runners
        const Dk = sub(drawer);
        Dk.box(0.02, dh - 0.02, w - 0.06, M.woodL, 0.01, 0, 0, 0.006);
        Dk.box(0.04, 0.025, 0.14, M.brass, 0.03, 0, 0, 0.006);
        Dk.box(d - 0.06, 0.02, w - 0.1, M.wood, -(d - 0.06) / 2, -dh / 2 + 0.03, 0, 0.004);
        const map = Dk.flat(d - 0.12, w - 0.16, texMat(128, 220, (c, cw, ch) => {
          c.fillStyle = '#e9dfc2'; c.fillRect(0, 0, cw, ch); c.strokeStyle = 'rgba(60,110,100,0.6)'; c.lineWidth = 2;
          for (let k2 = 0; k2 < 6; k2++) { c.beginPath(); c.ellipse(64, 110, 20 + k2 * 9, 30 + k2 * 13, 0.3, 0, 7); c.stroke(); }
          c.fillStyle = '#e8604c'; c.beginPath(); c.arc(64, 110, 7, 0, 7); c.fill();
        }), -(d - 0.06) / 2, -dh / 2 + 0.045, 0, [-PI / 2, 0, 0]);
        map.renderOrder = 2;
      } else {
        SB(0.02, dh - 0.02, w - 0.06, M.woodL, x + d / 2 + 0.01, y, z, 0.006);
        SB(0.04, 0.025, 0.14, M.brass, x + d / 2 + 0.03, y, z, 0.006);
      }
    }
    let open = 0, t0 = -9;
    tap(drawer, 'open the map drawer', (sfx) => { t0 = kit.now(); sfx([[180, 0.12], [240, 0.1], [0, 0.6], [660, 0.1], [880, 0.2]], 'triangle', 0.06); });
    live((t) => {
      const k = t - t0;
      const target = k < 3.2 ? 1 : 0;
      open += (target - open) * 0.12;
      drawer.position.x = x + d / 2 + open * 0.34;
    });
    // a rolled map and a magnifier lying on top
    S(new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12), M.paper, x + 0.05, h + 0.08, z - 0.08, [PI / 2, 0, 0]);
    S(new THREE.TorusGeometry(0.041, 0.008, 6, 14), M.red, x + 0.05, h + 0.08, z - 0.18, [0, 0, 0]);
    S(new THREE.TorusGeometry(0.06, 0.012, 6, 18), M.brass, x - 0.05, h + 0.053, z + 0.26, [PI / 2, 0, 0]);
    SB(0.025, 0.02, 0.16, M.wood, x - 0.05, h + 0.053, z + 0.4, 0.006);
    block(x - d / 2, x + d / 2 + 0.05, z - w / 2, z + w / 2);
  }

  // ════════ 4. the shelf of company models, left wall ════════
  {
    const sx = -3.87, za = -2.38, zb = -0.48, L = zb - za;
    for (const y of [1.2, 1.62]) {
      SB(0.26, 0.03, L, M.woodL, sx, y, (za + zb) / 2, 0.008);
      for (const z of [za + 0.15, zb - 0.15]) SB(0.03, 0.14, 0.03, M.wood, -3.975, y - 0.08, z, 0.006, [0, 0, 0]);
    }
    const qrTile = paint(0xffffff, { hatch: 0, map: canvasTex(64, 64, (c) => qrDraw(c, 4, 4, 56, 12, 11)) });
    const base = (z, y) => { const m = kit.flat(0.17, 0.17, qrTile, sx, y + 0.017, z, [-PI / 2, 0, 0]); m.renderOrder = 2; };
    const at = (k, top) => za + 0.2 + k * (L - 0.4) / 3;     // four spots a shelf
    // — lower shelf —
    const y1 = 1.215;
    // the pumpjack: its walking beam rocks on the samson post (the real pivot)
    {
      const z = at(0); base(z, y1);
      for (const s of [-1, 1]) SB(0.015, 0.16, 0.015, M.dark, sx + s * 0.03, y1 + 0.08, z, 0.004, [s * 0.18, 0, 0]);
      SB(0.12, 0.015, 0.14, M.dark, sx, y1 + 0.01, z, 0.004);
      const beam = new THREE.Group(); beam.position.set(sx, y1 + 0.16, z); G.add(beam);
      const Bk = sub(beam);
      Bk.box(0.025, 0.02, 0.2, M.gold, 0, 0, 0, 0.005);
      Bk.box(0.04, 0.06, 0.03, M.gold, 0, -0.02, -0.105, 0.006);                 // the horse head
      const rod = Bk.put(new THREE.CylinderGeometry(0.003, 0.003, 0.12, 4), M.dark, 0, -0.08, -0.115); rod.userData.noInk = true;
      const crank = new THREE.Group(); crank.position.set(sx, y1 + 0.06, z + 0.07); G.add(crank);
      sub(crank).box(0.02, 0.05, 0.04, M.red, 0, 0.02, 0, 0.006);
      live((t) => { beam.rotation.x = Math.sin(t * 1.6) * 0.28; crank.rotation.x = t * 1.6; });
    }
    // the factory: its chimney puffs smoke rings that rise and fade
    const puffs = [];
    {
      const z = at(1); base(z, y1);
      SB(0.13, 0.08, 0.15, M.red, sx, y1 + 0.055, z, 0.008);
      for (let k = 0; k < 3; k++) SB(0.13, 0.04, 0.04, M.red, sx, y1 + 0.095, z - 0.045 + k * 0.045, 0.004, [PI / 4, 0, 0]);
      S(new THREE.CylinderGeometry(0.014, 0.018, 0.13, 10), M.terra, sx + 0.02, y1 + 0.16, z + 0.055);
      for (let k = 0; k < 3; k++) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), paint(0xf2efe8, { hatch: 0, opacity: 0.9, unique: true }));
        m.userData.noInk = true; G.add(m); puffs.push([m, k / 3, sx + 0.02, y1 + 0.235, z + 0.055]);
      }
      live((t) => { for (const [m, ph, px, py, pz] of puffs) { const s = (t * 0.35 + ph) % 1; m.position.set(px + s * 0.03, py + s * 0.22, pz - s * 0.04); m.scale.setScalar(0.6 + s * 1.6); m.material.opacity = 0.9 * (1 - s); } });
    }
    // a skyscraper and a little car
    {
      const z = at(2); base(z, y1);
      SB(0.08, 0.26, 0.08, M.blue, sx, y1 + 0.145, z - 0.02, 0.006);
      SB(0.06, 0.06, 0.06, M.teal, sx, y1 + 0.3, z - 0.02, 0.006);
      S(new THREE.ConeGeometry(0.008, 0.06, 6), M.dark, sx, y1 + 0.36, z - 0.02);
      SB(0.07, 0.14, 0.06, M.lilac, sx, y1 + 0.085, z + 0.05, 0.006);
    }
    {
      const z = at(3); base(z, y1);
      SB(0.08, 0.04, 0.15, M.red, sx, y1 + 0.045, z, 0.012);
      SB(0.07, 0.035, 0.08, M.paper, sx, y1 + 0.08, z - 0.01, 0.01);
      for (const dz of [-0.045, 0.045]) for (const dx of [-0.04, 0.04]) S(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 10), M.dark, sx + dx, y1 + 0.022, z + dz, [0, 0, PI / 2]);
    }
    // — upper shelf —
    const y2 = 1.635;
    // a wind turbine, turning
    {
      const z = at(0); base(z, y2);
      S(new THREE.CylinderGeometry(0.006, 0.012, 0.2, 8), M.cream, sx, y2 + 0.1, z);
      const hub = new THREE.Group(); hub.position.set(sx + 0.025, y2 + 0.2, z); G.add(hub);   // the rotor turns on its hub
      const Hk = sub(hub);
      Hk.put(new THREE.SphereGeometry(0.012, 8, 6), M.cream, 0, 0, 0);
      for (let k = 0; k < 3; k++) { const bl = new THREE.Group(); bl.rotation.x = k * PI * 2 / 3; hub.add(bl); const m = new THREE.Mesh(rb(0.006, 0.09, 0.016, 0.003).translate(0, 0.05, 0), M.cream); bl.add(m); }
      S(new THREE.CapsuleGeometry(0.01, 0.025, 3, 8), M.cream, sx - 0.005, y2 + 0.2, z, [0, 0, PI / 2]);
      live((t) => { hub.rotation.x = t * 2.4; });
    }
    // a rocket: tap and it lifts off its pad, then settles back
    {
      const z = at(1); base(z, y2);
      const rk = new THREE.Group(); rk.position.set(sx, y2 + 0.017, z); G.add(rk);
      const Rk = sub(rk);
      Rk.put(new THREE.CylinderGeometry(0.025, 0.025, 0.14, 12), M.cream, 0, 0.1, 0);
      Rk.put(new THREE.ConeGeometry(0.025, 0.06, 12), M.red, 0, 0.2, 0);
      for (let k = 0; k < 3; k++) Rk.box(0.006, 0.05, 0.04, M.red, Math.cos(k * 2.09) * 0.025, 0.045, Math.sin(k * 2.09) * 0.025, 0.002, [0, -k * 2.09, 0]);
      Rk.put(new THREE.CylinderGeometry(0.01, 0.01, 0.005, 10), M.blue, 0.026, 0.13, 0, [0, 0, PI / 2]);
      const flame = Rk.put(new THREE.ConeGeometry(0.018, 0.06, 10).rotateX(PI), paint(0xf6a53b, { emissive: 0xf08a2a, hatch: 0 }), 0, 0.0, 0);
      flame.userData.noInk = true; flame.visible = false;
      let t0 = -9;
      tap(rk, 'launch the rocket', (sfx) => { t0 = kit.now(); sfx([[110, 0.3], [160, 0.2], [240, 0.2], [400, 0.2], [700, 0.3]], 'sawtooth', 0.03); });
      live((t) => {
        const k = t - t0;
        const h = k < 1.2 ? 0.12 * Math.sin(k / 1.2 * PI / 2) : k < 2.6 ? 0.12 * (1 - Math.pow((k - 1.2) / 1.4, 2)) : 0;
        rk.position.y = y2 + 0.017 + Math.max(0, h);
        flame.visible = k < 2.6; flame.scale.y = 0.8 + Math.sin(t * 40) * 0.3;
        rk.rotation.y = k < 2.6 ? k * 2 : 0;
      });
    }
    // a diner with a striped awning, and a cargo ship
    {
      const z = at(2); base(z, y2);
      SB(0.1, 0.08, 0.14, M.cream, sx, y2 + 0.057, z, 0.006);
      SB(0.04, 0.012, 0.15, M.red, sx + 0.06, y2 + 0.09, z, 0.004, [0, 0, -0.5]);
      S(new THREE.CylinderGeometry(0.03, 0.03, 0.012, 14), M.gold, sx, y2 + 0.13, z, [0, 0, PI / 2]);
      SB(0.004, 0.05, 0.004, M.dark, sx, y2 + 0.105, z, 0.001);
    }
    {
      const z = at(3); base(z, y2);
      SB(0.06, 0.04, 0.16, M.blue, sx, y2 + 0.04, z, 0.012);
      const cc = [M.red, M.gold, M.teal, M.sage];
      for (let k = 0; k < 4; k++) SB(0.045, 0.025, 0.03, cc[k], sx, y2 + 0.075, z - 0.05 + k * 0.032, 0.004);
      SB(0.04, 0.05, 0.03, M.cream, sx, y2 + 0.085, z + 0.06, 0.004);
    }
    // a little brass label on each shelf
    poster(0.5, 0.09, 256, (c, w, h) => { c.fillStyle = '#d9a84a'; c.fillRect(0, 0, w, h); font(c, 30); c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('FORTUNE 500', w / 2, h / 2 + 2); }, -3.985, 1.12, (za + zb) / 2, 'left', { board: 0x6b4a34, thick: 0.01 });
  }

  // ════════ 5. the flip wall: each tile turns between a company and its code ════════
  {
    const cols = 4, rows = 3, tw = 0.32, th = 0.24, z0 = -1.5, y0 = 1.48, x = 3.955;
    SB(0.02, rows * 0.29 + 0.08, cols * 0.38 + 0.08, M.wood, 3.985, y0, z0, 0.006);
    const logos = [['#e8604c', 'rocket'], ['#3f5aa8', 'bolt'], ['#e4b84f', 'star'], ['#7fb3a8', 'leaf'], ['#dc6a9a', 'heart'], ['#8f7ae8', 'cube'], ['#d58b63', 'cup'], ['#5fae7f', 'tree'], ['#e8604c', 'house'], ['#3f5aa8', 'drop'], ['#e4b84f', 'sun'], ['#2a2230', 'gear']];
    const icon = (c, w, h, kind) => {
      c.fillStyle = '#fbf6ea'; c.save(); c.translate(w / 2, h / 2);
      const s = h * 0.32;
      c.beginPath();
      if (kind === 'star' || kind === 'sun') for (let k = 0; k < 10; k++) { const a = k * PI / 5 - PI / 2, r = k % 2 ? s * 0.45 : s; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
      else if (kind === 'heart') { c.moveTo(0, s * 0.8); c.bezierCurveTo(-s * 1.4, -s * 0.2, -s * 0.5, -s * 1.2, 0, -s * 0.35); c.bezierCurveTo(s * 0.5, -s * 1.2, s * 1.4, -s * 0.2, 0, s * 0.8); }
      else if (kind === 'bolt') { c.moveTo(s * 0.2, -s); c.lineTo(-s * 0.5, s * 0.1); c.lineTo(0, s * 0.1); c.lineTo(-s * 0.2, s); c.lineTo(s * 0.5, -s * 0.1); c.lineTo(0, -s * 0.1); }
      else if (kind === 'house') { c.moveTo(-s, 0); c.lineTo(0, -s); c.lineTo(s, 0); c.lineTo(s * 0.7, 0); c.lineTo(s * 0.7, s); c.lineTo(-s * 0.7, s); c.lineTo(-s * 0.7, 0); }
      else if (kind === 'drop' || kind === 'leaf') { c.moveTo(0, -s); c.quadraticCurveTo(s, s * 0.3, 0, s); c.quadraticCurveTo(-s, s * 0.3, 0, -s); }
      else if (kind === 'tree' || kind === 'rocket') { c.moveTo(0, -s); c.lineTo(s * 0.7, s * 0.6); c.lineTo(-s * 0.7, s * 0.6); }
      else c.arc(0, 0, s, 0, 7);
      c.fill(); c.restore();
    };
    const tiles = [];
    for (let r = 0; r < rows; r++) for (let cI = 0; cI < cols; cI++) {
      const i = r * cols + cI, [col, kind] = logos[i];
      const tg = new THREE.Group(); tg.position.set(x, y0 + (1 - r) * 0.29, z0 + (cI - 1.5) * 0.38); tg.rotation.y = -PI / 2; G.add(tg);   // spins on its own centre axle
      const T = sub(tg);
      T.box(tw, th, 0.02, M.dark, 0, 0, 0, 0.006);
      const front = T.flat(tw - 0.02, th - 0.02, texMat(96, 72, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); icon(c, w, h, kind); }), 0, 0, 0.0115);
      const back = T.flat(tw - 0.02, th - 0.02, texMat(96, 72, (c, w, h) => { c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h); qrDraw(c, (w - 60) / 2, 6, 60, 30 + i, 11); }), 0, 0, -0.0115, [0, PI, 0]);
      front.renderOrder = back.renderOrder = 2;
      tiles.push({ tg, a: 0, to: 0 });
    }
    let next = 0;
    const wall = new THREE.Group(); G.add(wall);
    wall.position.set(x, y0, z0);
    for (const t of tiles) { wall.add(t.tg); t.tg.position.sub(wall.position); }
    tap(wall, 'flip the company codes', (sfx) => {
      tiles.forEach((t, i) => { t.wait = (i % cols + Math.floor(i / cols)) * 0.08; t.to = t.to ? 0 : PI; });
      sfx([[880, 0.04], [988, 0.04], [1046, 0.04], [1175, 0.04], [1319, 0.12]], 'square', 0.025);
    });
    live((t, dt) => {
      if (t > next) { const k = tiles[Math.floor(Math.random() * tiles.length)]; k.to = k.to ? 0 : PI; k.wait = 0; next = t + 1.4; }
      for (const k of tiles) {
        if (k.wait > 0) { k.wait -= dt; continue; }
        k.a += (k.to - k.a) * Math.min(1, dt * 7);
        k.tg.rotation.y = -PI / 2 + k.a;
      }
    });
  }

  // ════════ 6. the ship's compass on its binnacle: tap and the card swings round to north ════════
  {
    const x = 3.38, z = -3.3;
    poster(0.86, 0.86, 256, (c, w, h) => {
      c.fillStyle = '#e9dfc2'; c.fillRect(0, 0, w, h);
      c.save(); c.translate(w / 2, h / 2);
      c.strokeStyle = INKC; c.lineWidth = 2; for (const r of [100, 80]) { c.beginPath(); c.arc(0, 0, r, 0, 7); c.stroke(); }
      for (let k = 0; k < 16; k++) { c.save(); c.rotate(k * PI / 8); c.fillStyle = k % 2 ? '#d58b63' : INKC; const L = k % 4 === 0 ? 110 : k % 2 ? 60 : 85; c.beginPath(); c.moveTo(0, -L); c.lineTo(10, 0); c.lineTo(-10, 0); c.fill(); c.restore(); }
      font(c, 26, SCRIPT); c.fillStyle = INKC; c.textAlign = 'center';
      c.fillText('N', 0, -112 + 4); c.fillText('S', 0, 126); c.fillText('E', 120, 8); c.fillText('W', -120, 8);
      c.restore();
    }, 3.985, 1.5, z, 'right', { board: 0x6b4a34 });
    S(new THREE.CylinderGeometry(0.22, 0.26, 0.06, 18), M.wood, x, 0.03, z);
    S(new THREE.LatheGeometry([[0.001, 0], [0.14, 0], [0.1, 0.1], [0.09, 0.6], [0.14, 0.78], [0.001, 0.78]].map(p => new THREE.Vector2(p[0], p[1])), 16), M.woodL, x, 0.06, z);
    S(new THREE.CylinderGeometry(0.17, 0.15, 0.08, 22), M.brass, x, 0.88, z);
    for (const s of [-1, 1]) S(new THREE.SphereGeometry(0.06, 12, 8), s < 0 ? M.red : M.green, x, 0.9, z + s * 0.25);
    for (const s of [-1, 1]) SB(0.03, 0.03, 0.08, M.brass, x, 0.9, z + s * 0.19, 0.006);
    const card = new THREE.Group(); card.position.set(x, 0.925, z); G.add(card);      // turns on its jewel pivot
    const face = sub(card).flat(0.28, 0.28, texMat(128, 128, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(64, 64, 63, 0, 7); c.fill();
      c.translate(64, 64);
      for (let k = 0; k < 8; k++) { c.save(); c.rotate(k * PI / 4); c.fillStyle = k === 0 ? '#e8604c' : k % 2 ? '#d9a84a' : INKC; const L = k % 2 ? 32 : 54; c.beginPath(); c.moveTo(0, -L); c.lineTo(7, 0); c.lineTo(-7, 0); c.fill(); c.restore(); }
      c.fillStyle = INKC; c.font = `700 14px ${HAND}`; c.textAlign = 'center'; c.fillText('QR', 0, 5);
    }), 0, 0, 0, [-PI / 2, 0, 0]);
    face.renderOrder = 2;
    const dome = put(new THREE.SphereGeometry(0.155, 20, 10, 0, PI * 2, 0, PI / 2), paint(0xcfeef2, { opacity: 0.3, hatch: 0 }), x, 0.92, z);
    dome.userData.noInk = true; dome.material.depthWrite = false; dome.renderOrder = 3;
    S(new THREE.TorusGeometry(0.16, 0.014, 6, 24), M.brass, x, 0.925, z, [PI / 2, 0, 0]);
    const hit = new THREE.Group(); hit.position.set(x, 0.9, z); G.add(hit); hit.add(card, dome); card.position.set(0, 0.025, 0); dome.position.set(0, 0.02, 0);
    let a = 0, v = 0;
    const north = PI / 2;                          // where the card settles: N toward the map on the screen
    tap(hit, 'swing the compass', (sfx) => { v = 14 + Math.random() * 6; sfx([[523, 0.06], [494, 0.06], [440, 0.06], [392, 0.06], [784, 0.25]], 'sine', 0.05); });
    live((t, dt) => {
      v += (-(a - north - 0.04 * Math.sin(t * 0.7)) * 6 - v * 1.6) * dt;
      a += v * dt;
      card.rotation.y = a;
    });
    claim(x, z, 0.28);
  }

  // ════════ 7. a brass telescope on a tripod, back right corner ════════
  {
    const x = 3.55, z = -5.08, hy = 1.12;
    const legM = M.woodL;
    for (let k = 0; k < 3; k++) {
      const ang = k * 2.09 + 0.5, fx = Math.cos(ang) * 0.24, fz = Math.sin(ang) * 0.24;
      const len = Math.hypot(fx, hy, fz);
      // each leg runs from the floor foot to the head, so they meet
      const leg = rb(0.03, len, 0.03, 0.008);
      const dir = new THREE.Vector3(-fx, hy, -fz).normalize();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir), eul = new THREE.Euler().setFromQuaternion(q);
      S(leg, legM, x + fx / 2, hy / 2, z + fz / 2, [eul.x, eul.y, eul.z]);
    }
    S(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 12), M.brass, x, hy, z);
    const head = new THREE.Group(); head.position.set(x, hy + 0.04, z); G.add(head);          // pans on the mount
    const tilt = new THREE.Group(); head.add(tilt);                                            // tilts on the yoke
    const Tk = sub(tilt);
    Tk.put(new THREE.CylinderGeometry(0.045, 0.035, 0.6, 16), M.brass, 0, 0, 0.05, [PI / 2, 0, 0]);
    Tk.put(new THREE.CylinderGeometry(0.055, 0.055, 0.08, 16), M.wood, 0, 0, 0.33, [PI / 2, 0, 0]);
    Tk.put(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 10), M.dark, 0, 0, -0.27, [PI / 2, 0, 0]);
    Tk.put(new THREE.TorusGeometry(0.047, 0.008, 6, 16), M.wood, 0, 0, -0.1);
    let t0 = -9;
    tap(head, 'look through the telescope', (sfx) => { t0 = kit.now(); sfx([[659, 0.08], [784, 0.08], [988, 0.2]], 'sine', 0.05); });
    live((t) => {
      const k = t - t0, look = k < 3 ? Math.sin(Math.min(1, k / 0.6) * PI / 2) : Math.max(0, 1 - (k - 3) / 1.2);
      head.rotation.y = -0.9 + Math.sin(t * 0.25) * 0.35 * (1 - look) - look * 0.66;      // pans the room; tapped, it finds the globe
      tilt.rotation.x = -0.35 + Math.sin(t * 0.33) * 0.08 + look * 0.25;
    });
    claim(x, z, 0.22);
  }

  // ════════ 8. three clocks for three time zones, back wall right ════════
  [['SF', -3, 3.1], ['CHI', -1, 3.45], ['NY', 0, 3.8]].forEach(([name, off, x]) => {
    const y = 1.86, z = BACK + 0.03;
    const ck = new THREE.Group(); ck.position.set(x, y, z); G.add(ck);
    const Ck = sub(ck);
    Ck.put(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 24), M.brass, 0, 0, 0, [PI / 2, 0, 0]);
    Ck.flat(0.22, 0.22, texMat(96, 96, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(48, 48, 47, 0, 7); c.fill(); c.fillStyle = INKC;
      for (let k = 0; k < 12; k++) { c.save(); c.translate(48, 48); c.rotate(k * PI / 6); c.fillRect(-1.5, -44, 3, k % 3 ? 5 : 10); c.restore(); }
      c.font = `700 16px ${HAND}`; c.textAlign = 'center'; c.fillText(name, 48, 70);
    }), 0, 0, 0.017).renderOrder = 2;
    const hr = new THREE.Group(), mn = new THREE.Group(); hr.position.z = mn.position.z = 0.022; ck.add(hr, mn);   // both turn on the centre pin
    sub(hr).box(0.012, 0.06, 0.004, M.dark, 0, 0.025, 0, 0.002);
    sub(mn).box(0.008, 0.09, 0.004, M.red, 0, 0.04, 0.004, 0.002);
    live((t) => { const m = t * 0.5; mn.rotation.z = -m; hr.rotation.z = -(m / 12 + (off + 10) * PI / 6); });
  });

  // ════════ 9. hot-air balloons floating up near the walls ════════
  const envelope = (cA, cB) => paint(0xffffff, { unique: true, hatch: 0.4, map: canvasTex(128, 64, (c, w, h) => { for (let k = 0; k < 8; k++) { c.fillStyle = k % 2 ? cA : cB; c.fillRect(k * w / 8, 0, w / 8 + 1, h); } c.fillStyle = 'rgba(42,34,48,0.25)'; c.fillRect(0, h * 0.62, w, 3); }) });
  [[-3.05, 2.05, -4.0, '#e8604c', '#f6efdf', 0], [3.1, 2.0, -2.55, '#3f5aa8', '#e4b84f', 1], [-3.15, 2.12, -1.35, '#7fb3a8', '#f6efdf', 2]].forEach(([x, y, z, cA, cB, i]) => {
    const bal = new THREE.Group(); bal.position.set(x, y, z); G.add(bal);
    const pts = [];
    for (let k = 0; k <= 16; k++) { const a = k / 16; pts.push(new THREE.Vector2(Math.max(0.001, 0.125 * Math.sin(Math.pow(a, 1.6) * PI) + 0.035 * (1 - a)), -0.1 + a * 0.32)); }
    const env = new THREE.Mesh(new THREE.LatheGeometry(pts, 18), envelope(cA, cB)); bal.add(env);
    const B = sub(bal);
    B.box(0.07, 0.05, 0.07, M.woodL, 0, -0.2, 0, 0.012);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const rope = B.put(new THREE.CylinderGeometry(0.002, 0.002, 0.1, 3), M.dark, dx * 0.03, -0.14, dz * 0.03, [dz * 0.05, 0, -dx * 0.05]);
      rope.userData.noInk = true;
    }
    const flame = B.put(new THREE.ConeGeometry(0.018, 0.06, 8), paint(0xf6a53b, { emissive: 0xf08a2a, hatch: 0 }), 0, -0.13, 0);
    flame.userData.noInk = true; flame.visible = false;
    let t0 = -9;
    tap(bal, 'fire the balloon burner', (sfx) => { t0 = kit.now(); sfx([[90, 0.4], [110, 0.3]], 'sawtooth', 0.035); });
    live((t) => {
      const k = t - t0, lift = k < 1 ? k * 0.18 : Math.max(0, 0.18 - (k - 1) * 0.06);
      bal.position.y = y + Math.sin(t * 0.7 + i * 2) * 0.05 + lift;
      bal.position.x = x + Math.sin(t * 0.3 + i) * 0.04;
      bal.rotation.y = t * 0.15 + i;
      flame.visible = k < 1.1; flame.scale.y = 0.8 + Math.sin(t * 37) * 0.3;
    });
  });

  // ════════ 10. floor things round the edges ════════
  // a basket of rolled maps, front left: tap and they hop
  {
    const x = -3.5, z = -0.2;
    const bk = new THREE.Group(); bk.position.set(x, 0, z); G.add(bk);
    const Bk = sub(bk);
    const wall = Bk.put(new THREE.CylinderGeometry(0.2, 0.17, 0.36, 18, 1, true), paint(0xb98d62, { side: THREE.DoubleSide }), 0, 0.18, 0);
    wall.userData.noInk = true;
    Bk.put(new THREE.TorusGeometry(0.2, 0.016, 6, 22), M.wood, 0, 0.36, 0, [PI / 2, 0, 0]);
    Bk.put(new THREE.TorusGeometry(0.18, 0.012, 6, 22), M.wood, 0, 0.12, 0, [PI / 2, 0, 0]);
    Bk.put(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 18), M.wood, 0, 0.01, 0);
    const papers = [0xf6efdf, 0xe9dfc2, 0xdfe9df, 0xf3e1c8, 0xe6e3f0];
    const rolls = papers.map((col, k) => {
      const a = k * 1.26, r = k ? 0.08 : 0, h = 0.55 + (k % 3) * 0.1;
      const g = new THREE.Group(); g.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); g.rotation.set(Math.sin(a) * 0.15 * (k ? 1 : 0), 0, -Math.cos(a) * 0.15 * (k ? 1 : 0)); bk.add(g);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, h, 12), paint(col)); m.position.y = h / 2; g.add(m);
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.007, 6, 12), [M.red, M.blue, M.gold][k % 3]); tie.position.y = h * 0.7; tie.rotation.x = PI / 2; g.add(tie);
      return { g, y0: 0.02, d: k * 0.07 };
    });
    let t0 = -9;
    tap(bk, 'rummage the map basket', (sfx) => { t0 = kit.now(); sfx([[300, 0.05], [450, 0.05], [380, 0.05], [520, 0.08]], 'triangle', 0.05); });
    live((t) => { for (const r of rolls) { const k = t - t0 - r.d; r.g.position.y = r.y0 + (k > 0 && k < 0.5 ? Math.sin(k / 0.5 * PI) * 0.18 : 0); } });
    kit.g.add(shadow(0.26).translateX(x).translateZ(z));
    claim(x, z, 0.24);
  }
  // a stack of atlases, left wall
  for (let k = 0; k < 4; k++) SB(0.34 - k * 0.02, 0.07, 0.26 - k * 0.01, [M.red, M.blue, M.sage, M.terra][k], -3.7, 0.035 + k * 0.072, -1.15, 0.01, [0, (k % 2 ? 0.2 : -0.1), 0]);
  claim(-3.7, -1.15, 0.2);
  // shipping crates stamped with codes, left wall between the cabinet and the shelf
  {
    const crateTex = paint(0xffffff, { map: canvasTex(64, 64, (c) => { c.fillStyle = '#b98d62'; c.fillRect(0, 0, 64, 64); c.strokeStyle = '#6b4a34'; c.lineWidth = 4; c.strokeRect(2, 2, 60, 60); c.beginPath(); c.moveTo(2, 2); c.lineTo(62, 62); c.stroke(); qrDraw(c, 22, 22, 22, 50, 9); }) });
    SB(0.42, 0.4, 0.42, crateTex, -3.7, 0.2, -2.72, 0.01);
    SB(0.32, 0.3, 0.32, crateTex, -3.72, 0.55, -2.74, 0.01, [0, 0.25, 0]);
    claim(-3.7, -2.72, 0.24);
    SB(0.4, 0.36, 0.4, crateTex, 3.62, 0.18, -0.95, 0.01, [0, 0.15, 0]);
    SB(0.28, 0.24, 0.28, crateTex, 3.6, 0.48, -0.97, 0.01, [0, -0.2, 0]);
    claim(3.62, -0.95, 0.24);
  }
  // a potted fern by the flip wall
  {
    const x = 3.6, z = -1.95;
    S(new THREE.CylinderGeometry(0.17, 0.13, 0.3, 16), M.terra, x, 0.15, z);
    S(new THREE.TorusGeometry(0.17, 0.02, 6, 18), M.terra, x, 0.3, z, [PI / 2, 0, 0]);
    kit.fern(x, z, 0.75, 5).position.y = 0.28;
    claim(x, z, 0.2);
  }
  // a scanner phone on a side table, front right: tap it to read a code
  {
    const x = 3.5, z = -0.25;
    S(new THREE.CylinderGeometry(0.22, 0.22, 0.03, 20), M.woodL, x, 0.56, z);
    S(new THREE.CylinderGeometry(0.025, 0.03, 0.54, 10), M.wood, x, 0.28, z);
    S(new THREE.CylinderGeometry(0.15, 0.17, 0.03, 16), M.wood, x, 0.015, z);
    const card = kit.flat(0.12, 0.12, paint(0xffffff, { hatch: 0, map: canvasTex(64, 64, (c) => qrDraw(c, 5, 5, 54, 77, 11)) }), x - 0.04, 0.577, z + 0.05, [-PI / 2, 0, 0.3]);
    card.renderOrder = 2;
    const ph = new THREE.Group(); ph.position.set(x + 0.06, 0.575, z - 0.04); ph.rotation.y = -0.6; G.add(ph);     // leaning on its stand
    SB(0.1, 0.012, 0.06, M.dark, x + 0.06, 0.581, z - 0.04, 0.004);
    const body = new THREE.Group(); body.rotation.x = -0.35; ph.add(body);
    sub(body).box(0.09, 0.17, 0.012, M.dark, 0, 0.085, 0, 0.012);
    const okM = texMat(64, 112, (c, w, h) => { c.fillStyle = '#5fae7f'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fbf6ea'; c.lineWidth = 8; c.beginPath(); c.moveTo(14, 58); c.lineTo(28, 74); c.lineTo(50, 40); c.stroke(); });
    const scanM = texMat(64, 112, (c, w, h) => { c.fillStyle = '#2f3a4a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#fbf6ea'; c.lineWidth = 3; for (const [x0, y0, dx, dy] of [[10, 30, 1, 1], [54, 30, -1, 1], [10, 82, 1, -1], [54, 82, -1, -1]]) { c.beginPath(); c.moveTo(x0, y0 + dy * 10); c.lineTo(x0, y0); c.lineTo(x0 + dx * 10, y0); c.stroke(); } });
    const screen = sub(body).flat(0.075, 0.145, scanM, 0, 0.088, 0.007);
    screen.renderOrder = 2;
    const beam = sub(body).box(0.07, 0.006, 0.004, paint(0xe8604c, { emissive: 0xe8604c, hatch: 0 }), 0, 0.08, 0.009, 0.002);
    beam.userData.noInk = true;
    let t0 = -9;
    tap(ph, 'scan the code', (sfx) => { t0 = kit.now(); sfx([[1760, 0.08], [0, 0.05], [2093, 0.15]], 'square', 0.03); });
    live((t) => {
      const k = t - t0, ok = k > 0.5 && k < 2.6;
      screen.material = ok ? okM : scanM;
      beam.visible = !ok; beam.position.y = 0.088 + Math.sin(t * 3) * 0.06;
      body.position.y = k < 0.3 ? Math.sin(k / 0.3 * PI) * 0.02 : 0;
    });
    claim(x, z, 0.24);
  }

  bake();
}
