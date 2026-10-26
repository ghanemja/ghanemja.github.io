// ─── INSIDE THE SHOPS ───────────────────────────────────────────────────────
// Each app gets a little dollhouse room, built far behind the street and
// reached by its shop door. Open front (the camera looks in over it), a back
// wall with the real app framed on it, a plaque that tells its story, a
// counter that opens the live site, and props from the thing itself.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, paint, ink, blobShadow } from './style.js';
import { APPS, LIBRARY, PLACES } from './apps.js';

const INKC = '#2a2230';
const HAND = '"Patrick Hand", "Comic Sans MS", cursive', SCRIPT = '"Caveat", "Patrick Hand", cursive';

const rb = (w, h, d, r = 0.03) => new RoundedBoxGeometry(w, h, d, Math.min(w, h, d) > 0.6 ? 2 : 1, Math.max(1e-3, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3)));
function kit(g = new THREE.Group()) {
  const put = (geo, mat, x = 0, y = 0, z = 0, rot = null) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    g.add(m); return m;
  };
  const box = (w, h, d, mat, x, y, z, r = 0.03, rot) => put(rb(w, h, d, r), mat, x, y, z, rot);
  const flat = (w, h, mat, x, y, z, rot) => { const m = put(new THREE.PlaneGeometry(w, h), mat, x, y, z, rot); m.userData.noInk = true; return m; };
  return { g, put, box, flat };
}
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const c = cv.getContext('2d'); c.lineJoin = c.lineCap = 'round';
  draw(c, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const texMat = (w, h, draw) => {
  const m = paint(0xffffff, { map: canvasTex(w, h, draw), hatch: 0, unique: true });
  m.transparent = true;                   // bg-less lettering floats on the wall
  return m;
};
// shrink a line until it fits the canvas
function fitLine(c, text, px, font, maxW) {
  let s = px;
  do { c.font = `700 ${s}px ${font}`; s -= 2; } while (c.measureText(text).width > maxW && s > 8);
}
const css = (hex) => '#' + new THREE.Color(hex).getHexString();

const _loader = new THREE.TextureLoader();
// every framed screen drifts gently (a slow Ken Burns pan) so it reads as a
// living picture, not a poster; frames with a recorded clip play real footage
const ANIM = [];
export function tickInteriors(t) {
  for (const a of ANIM) {
    const tex = a.mat.map;
    if (!tex) continue;
    if (tex.isVideoTexture) continue;                  // footage moves by itself
    const z = 1 - 0.045 * (0.5 + 0.5 * Math.sin(t * 0.21 + a.ph));
    tex.repeat.set(z, z);
    tex.offset.set(
      (1 - z) * (0.5 + 0.28 * Math.sin(t * 0.13 + a.ph * 2)),
      (1 - z) * (0.5 + 0.28 * Math.cos(t * 0.17 + a.ph)),
    );
  }
}
function shotMat(url, clip) {
  const t = _loader.load(url);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const m = paint(0xffffff, { map: t, hatch: 0, unique: true });
  ANIM.push({ mat: m, ph: ANIM.length * 2.4 });
  if (clip) {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.src = clip; v.crossOrigin = 'anonymous';
    const swap = () => {
      const vt = new THREE.VideoTexture(v);
      vt.colorSpace = THREE.SRGBColorSpace;
      m.map = vt; m.needsUpdate = true;
    };
    v.addEventListener('playing', swap, { once: true });
    v.play().catch(() => {
      // autoplay refused: start on the first interaction instead
      addEventListener('pointerdown', () => v.play().catch(() => {}), { once: true });
      addEventListener('keydown', () => v.play().catch(() => {}), { once: true });
    });
  }
  return m;
}

// a gilt-framed picture: the app's screenshot behind glass glints
function framedShot(K, url, w, h, x, y, z, rot, clip) {
  const fr = paint(PAL.gold);
  const grp = new THREE.Group(); grp.position.set(x, y, z); if (rot) grp.rotation.set(...rot);
  const F = kit(grp);
  F.box(w + 0.14, 0.07, 0.06, fr, 0, h / 2 + 0.035, 0);
  F.box(w + 0.14, 0.07, 0.06, fr, 0, -h / 2 - 0.035, 0);
  F.box(0.07, h, 0.06, fr, -w / 2 - 0.035, 0, 0);
  F.box(0.07, h, 0.06, fr, w / 2 + 0.035, 0, 0);
  F.flat(w, h, shotMat(url, clip), 0, 0, 0.012);
  K.g.add(grp);
  return grp;
}

// floor planks, drawn once and shared
let _planks = null;
function plankMat() {
  if (_planks) return _planks;
  const t = canvasTex(256, 256, (c, w, h) => {
    c.fillStyle = '#caa87c'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 32) {
      c.fillStyle = ['#c49f72', '#d0ad80', '#bd9a6e', '#c7a476'][Math.floor(y / 32) % 4];
      c.fillRect(0, y, w, 30);
      c.strokeStyle = 'rgba(90,60,40,0.35)'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(0, y + 31); c.lineTo(w, y + 31); c.stroke();
      const off = ((y / 32) % 2) * 128;
      c.beginPath(); c.moveTo((off + 64) % w, y); c.lineTo((off + 64) % w, y + 30); c.stroke();
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 2.4);
  return (_planks = paint(0xffffff, { map: t, hatch: 0.4 }));
}

// ── one room: origin at the middle of the OPEN front edge, inside is −z ──
const W = 8, D = 6, H = 2.7;
function roomShell(K, wallHex, place) {
  const wall = paint(wallHex, { hatch: 0.6 }), trim = paint(0xfffaf0);
  const floor = K.flat(W, D, plankMat(), 0, 0, -D / 2 + 0.5, [-Math.PI / 2, 0, 0]);
  floor.userData.noInk = true;
  // walls: single-sided planes, invisible from outside so the camera roams free
  K.flat(W, H, wall, 0, H / 2, -D + 0.5);                                    // back
  K.flat(D, H, wall, -W / 2, H / 2, -D / 2 + 0.5, [0, Math.PI / 2, 0]);      // west
  K.flat(D, H, wall, W / 2, H / 2, -D / 2 + 0.5, [0, -Math.PI / 2, 0]);      // east
  // skirting + picture rail, real boxes so they take ink
  K.box(W, 0.12, 0.05, trim, 0, 0.06, -D + 0.53);
  for (const s of [-1, 1]) K.box(0.05, 0.12, D, trim, s * (W / 2 - 0.026), 0.06, -D / 2 + 0.5);
  K.box(W, 0.045, 0.04, trim, 0, 2.08, -D + 0.53);
  // the shop's name over the back wall
  K.flat(2.6, 0.42, texMat(768, 128, (c, w, h) => {
    c.font = `700 ${h * 0.62}px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(place.title, w / 2, h * 0.38);
    c.font = `400 ${h * 0.26}px ${HAND}`; c.fillStyle = '#5a4e5e';
    c.fillText('— ' + place.trade + ' —', w / 2, h * 0.8);
  }), 0, 2.38, -D + 0.54);
  // a rug
  const rug = K.flat(2.6, 1.7, texMat(256, 160, (c, w, h) => {
    const base = new THREE.Color(wallHex).lerp(new THREE.Color(0x8a6448), 0.35);
    c.fillStyle = '#' + base.getHexString(); c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fffaf0'; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24);
    c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6);
  }), 0, 0.015, -D / 2 + 0.35, [-Math.PI / 2, 0, 0]);
  rug.renderOrder = 1;
  // the way out: just a mat at the open front (a doorframe only blocks the camera)
  K.flat(0.9, 0.5, texMat(192, 96, (c, w, h) => {
    c.fillStyle = '#b8a07c'; c.fillRect(0, 0, w, h);
    c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8);
    c.font = `400 ${h * 0.44}px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('back out', w / 2, h / 2);
  }), 0, 0.016, 0.52, [-Math.PI / 2, 0, 0]);
}

// the plaque: a lectern with the story on it
function plaque(K, x, z) {
  const wood = paint(PAL.bark);
  K.put(new THREE.CylinderGeometry(0.09, 0.13, 0.95, 10), wood, x, 0.48, z);
  K.box(0.62, 0.42, 0.05, wood, x, 1.08, z, 0.02, [-0.45, 0, 0]);
  K.flat(0.54, 0.34, texMat(256, 160, (c, w, h) => {
    c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
    c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(4, 4, w - 8, h - 8);
    c.font = `700 ${h * 0.3}px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('about this one', w / 2, h * 0.38);
    c.font = `400 ${h * 0.17}px ${HAND}`; c.fillStyle = '#5a4e5e';
    c.fillText('(press E)', w / 2, h * 0.7);
  }), x, 1.095, z + 0.033, [-0.45, 0, 0]);
}

// the counter: a till and a glowing OPEN sign that launches the real app
function counter(K, x, z, accent) {
  const wood = paint(PAL.bark), top = paint(0xe8dcc0);
  K.box(1.5, 0.78, 0.55, wood, x, 0.39, z);
  K.box(1.62, 0.07, 0.65, top, x, 0.8, z);
  K.box(0.3, 0.24, 0.26, paint(0x6f7d92), x - 0.45, 0.95, z, 0.03);     // the till
  K.box(0.32, 0.05, 0.28, paint(PAL.gold), x - 0.45, 0.84, z, 0.015);
  const sign = K.box(0.86, 0.4, 0.06, paint(0x2a2230, { hatch: 0 }), x + 0.25, 1.32, z, 0.02);
  K.flat(0.78, 0.32, paint(0xffffff, { hatch: 0, emissive: 0xffd98a, map: canvasTex(384, 160, (c, w, h) => {
    c.fillStyle = '#2a2230'; c.fillRect(0, 0, w, h);
    fitLine(c, 'OPEN the real one →', h * 0.42, SCRIPT, w * 0.9);
    c.fillStyle = '#ffd98a'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('OPEN the real one →', w / 2, h / 2);
  }) }), x + 0.25, 1.32, z + 0.034);
  return sign;
}

// ── per-app set dressing ────────────────────────────────────────────────────
const SETS = {
  charterscope(K) {
    // the clause board: a chart of the fleet, red string to the odd clauses
    K.flat(1.7, 1.1, texMat(512, 330, (c, w, h) => {
      c.fillStyle = '#caa87c'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a6448'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
      for (let i = 0; i < 6; i++) {
        const x = 40 + (i % 3) * 150, y = 40 + Math.floor(i / 3) * 140;
        c.fillStyle = '#f6efdf'; c.fillRect(x, y, 110, 90);
        c.strokeStyle = INKC; c.lineWidth = 2; c.strokeRect(x, y, 110, 90);
        c.strokeStyle = '#b9b2a4'; for (let l = 0; l < 4; l++) { c.beginPath(); c.moveTo(x + 10, y + 28 + l * 14); c.lineTo(x + 100, y + 28 + l * 14); c.stroke(); }
        c.font = `700 16px ${SCRIPT}`; c.fillStyle = INKC; c.fillText('clause ' + (i + 7), x + 10, y + 16);
        if (i === 1 || i === 5) { c.strokeStyle = '#e8604c'; c.lineWidth = 4; c.beginPath(); c.ellipse(x + 55, y + 45, 62, 52, 0, 0, Math.PI * 2); c.stroke(); }
      }
      c.strokeStyle = '#e8604c'; c.lineWidth = 3;
      c.beginPath(); c.moveTo(150, 85); c.lineTo(340, 225); c.stroke();
      c.beginPath(); c.moveTo(395, 85); c.lineTo(340, 225); c.stroke();
      c.fillStyle = '#e8604c'; c.beginPath(); c.arc(340, 225, 8, 0, 7); c.fill();
    }), -2.4, 1.35, -D + 0.56, [0, 0.0, 0]);
    // a ship's wheel by the window
    const wheel = new THREE.Group(); wheel.position.set(2.9, 0.95, -D + 1.1);
    const Wk = kit(wheel), dark = paint(0x6b4a34);
    Wk.put(new THREE.TorusGeometry(0.42, 0.05, 10, 24), dark, 0, 0, 0);
    for (let i = 0; i < 4; i++) Wk.box(0.055, 1.12, 0.055, dark, 0, 0, 0, 0.02, [0, 0, i * Math.PI / 4]);
    Wk.put(new THREE.CylinderGeometry(0.09, 0.09, 0.1, 12), paint(PAL.gold), 0, 0, 0, [Math.PI / 2, 0, 0]);
    Wk.box(0.12, 0.95, 0.12, dark, 0, -0.48, -0.1);
    K.g.add(wheel);
    // a leaning stack of contracts
    for (let i = 0; i < 7; i++) K.box(0.52, 0.035, 0.38, paint(i % 2 ? 0xf6efdf : 0xefe4cc), -3.1 + i * 0.012, 0.12 + i * 0.037, -D + 1.2, 0.006, [0, (i % 3 - 1) * 0.12, 0]);
  },
  'inbox-zero'(K) {
    // the pigeonholes, some stuffed with letters
    const ph = kit(new THREE.Group()); ph.g.position.set(-2.9, 0, -D + 0.75);
    const wood = paint(0x8a6448);
    for (let r = 0; r < 4; r++) ph.box(1.7, 0.05, 0.42, wood, 0, 0.55 + r * 0.38, 0);
    for (let cI = 0; cI < 5; cI++) ph.box(0.05, 1.2, 0.42, wood, -0.85 + cI * 0.425, 1.12, 0);
    for (let i = 0; i < 8; i++) {
      const cI = i % 4, r = (i * 7) % 3;
      ph.box(0.26, 0.2, 0.03, paint(0xf6eedb), -0.64 + cI * 0.425, 0.72 + r * 0.38, 0.19, 0.008, [0, 0, (i % 3 - 1) * 0.15]);
    }
    ph.box(1.8, 0.1, 0.5, wood, 0, 0.45, 0);
    ph.box(1.8, 0.4, 0.44, paint(0xc23f36), 0, 0.22, 0);
    K.g.add(ph.g); ink(ph.g, 'fine');
    // the kanban board itself: todo / waiting / done
    K.flat(1.9, 1.15, texMat(560, 340, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
      c.strokeStyle = INKC; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      const cols = [['todo', '#e8604c', 4], ['waiting', '#e4b84f', 2], ['done', '#7fb3a8', 5]];
      cols.forEach(([name, col, n], i) => {
        const x = 20 + i * 180;
        c.fillStyle = col; c.fillRect(x, 16, 160, 34);
        c.font = `700 24px ${SCRIPT}`; c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(name, x + 80, 40);
        for (let k = 0; k < n; k++) {
          c.fillStyle = '#fffaf0'; c.fillRect(x + 8, 62 + k * 52, 144, 42);
          c.strokeStyle = INKC; c.lineWidth = 2; c.strokeRect(x + 8, 62 + k * 52, 144, 42);
          c.strokeStyle = '#b9b2a4'; c.beginPath(); c.moveTo(x + 18, 80 + k * 52); c.lineTo(x + 140, 80 + k * 52); c.stroke();
          c.beginPath(); c.moveTo(x + 18, 92 + k * 52); c.lineTo(x + 110, 92 + k * 52); c.stroke();
        }
      });
    }), 2.3, 1.3, -D + 0.56);
    // parcels waiting to go out
    for (const [x, y, z, s] of [[0.4, 0.19, -D + 1.0, 0.38], [0.75, 0.16, -D + 1.15, 0.32], [0.55, 0.5, -D + 1.05, 0.3]])
      K.box(s, s * 0.8, s, paint(0xc8a47c), x, y, z, 0.02, [0, x * 2, 0]);
  },
  yarnflow(K) {
    // cubbies of yarn, every colour in the palette
    const sh = kit(new THREE.Group()); sh.g.position.set(-2.8, 0, -D + 0.75);
    const wood = paint(0x9a7c5c);
    for (let r = 0; r < 4; r++) sh.box(1.9, 0.05, 0.45, wood, 0, 0.42 + r * 0.42, 0);
    for (const s of [-1, 1]) sh.box(0.06, 1.75, 0.45, wood, s * 0.95, 0.9, 0);
    const cols = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0xdc9e9a, 0x93abc0, 0xf1e4c8, 0x8f7ae8, 0xa8b994];
    for (let i = 0; i < 12; i++) {
      const r = Math.floor(i / 4), cI = i % 4;
      const ball = sh.put(new THREE.SphereGeometry(0.14, 12, 10), paint(cols[i % cols.length]), -0.68 + cI * 0.45, 0.6 + r * 0.42, 0);
      const wrap = sh.put(new THREE.TorusGeometry(0.14, 0.018, 6, 18), paint(cols[(i + 3) % cols.length]), -0.68 + cI * 0.45, 0.6 + r * 0.42, 0, [0.6 + i, 0.4 * i, 0]);
      wrap.userData.noInk = true;
    }
    K.g.add(sh.g); ink(sh.g, 'fine');
    // a giant granny square on the wall
    K.flat(1.35, 1.35, texMat(300, 300, (c, w, h) => {
      const ring = ['#8f7ae8', '#dc9e9a', '#e4b84f', '#7fb3a8', '#f6eedb'];
      ring.forEach((col, i) => {
        const m = 10 + i * 28;
        c.strokeStyle = col; c.lineWidth = 22;
        c.setLineDash([16, 7]);
        c.strokeRect(m, m, w - 2 * m, h - 2 * m);
      });
      c.setLineDash([]);
      c.fillStyle = '#e8604c'; c.beginPath(); c.arc(w / 2, h / 2, 26, 0, 7); c.fill();
      c.strokeStyle = INKC; c.lineWidth = 3; c.stroke();
    }), 2.95, 1.45, -D + 0.56);
    // a basket with needles
    K.put(new THREE.CylinderGeometry(0.3, 0.22, 0.3, 12, 1, true), paint(0xc8a47c, { side: THREE.DoubleSide }), 1.1, 0.15, -D + 1.1);
    for (const a of [-0.3, 0.1, 0.5]) K.box(0.025, 0.85, 0.025, paint(0x6b4a34), 1.1 + a * 0.3, 0.5, -D + 1.1, 0.008, [0, 0, a]);
  },
  deckgpt(K) {
    // the silver screen, playing the app
    K.box(3.3, 2.0, 0.08, paint(0x2a2230, { hatch: 0 }), 0, 1.35, -D + 0.62, 0.03);
    K.flat(3.0, 1.78, shotMat('screenshots/pptgpt.png'), 0, 1.35, -D + 0.67);
    // red curtains either side
    for (const s of [-1, 1]) {
      const cur = K.put(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 10), paint(0xb03a30), s * 1.9, 1.25, -D + 0.68);
      cur.scale.z = 0.55;
    }
    // two rows of seats
    const seat = paint(0x8e2f3a);
    for (let r = 0; r < 2; r++) for (let cI = 0; cI < 4; cI++) {
      const x = -0.75 + cI * 0.7, z = -D + 2.3 + r * 0.8;
      K.box(0.5, 0.12, 0.45, seat, x, 0.3, z);
      K.box(0.5, 0.55, 0.12, seat, x, 0.55, z + 0.21, 0.03, [0.15, 0, 0]);
      K.box(0.08, 0.3, 0.4, paint(0x6b2730), x - 0.27, 0.32, z);
      K.box(0.08, 0.3, 0.4, paint(0x6b2730), x + 0.27, 0.32, z);
    }
    // the projector on its stand
    const pj = kit(new THREE.Group()); pj.g.position.set(2.6, 0, -D + 3.4);
    pj.box(0.1, 1.0, 0.1, paint(PAL.ink, { hatch: 0 }), 0, 0.5, 0);
    pj.box(0.44, 0.3, 0.3, paint(0x6f7d92), 0, 1.1, 0);
    pj.put(new THREE.CylinderGeometry(0.09, 0.11, 0.16, 12), paint(0x2a2230), 0, 1.1, -0.22, [Math.PI / 2, 0, 0]);
    for (const dy of [0.18, 0.18]) pj.put(new THREE.CylinderGeometry(0.14, 0.14, 0.05, 14), paint(0x2a2230), 0, 1.32, 0.06, [0, 0, Math.PI / 2]);
    K.g.add(pj.g); ink(pj.g, 'fine');
  },
  splatform(K) {
    // three easels: a button, a card, an input — each painted in a medium
    const comps = [
      (c, w, h) => {   // watercolor button
        c.fillStyle = '#eef3f6'; c.fillRect(0, 0, w, h);
        const g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.42);
        g.addColorStop(0, 'rgba(95,140,200,0.85)'); g.addColorStop(0.75, 'rgba(95,140,200,0.4)'); g.addColorStop(1, 'rgba(60,100,170,0.75)');
        c.fillStyle = g;
        c.beginPath(); c.roundRect(w * 0.14, h * 0.32, w * 0.72, h * 0.36, 26); c.fill();
        c.font = `700 ${h * 0.17}px ${SCRIPT}`; c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('button', w / 2, h / 2);
      },
      (c, w, h) => {   // marker card
        c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(232,96,76,0.8)'; c.lineWidth = 14;
        c.strokeRect(w * 0.12, h * 0.14, w * 0.76, h * 0.72);
        c.strokeStyle = 'rgba(228,184,79,0.65)'; c.lineWidth = 18;
        c.beginPath(); c.moveTo(w * 0.2, h * 0.36); c.lineTo(w * 0.8, h * 0.34); c.stroke();
        c.strokeStyle = 'rgba(42,34,48,0.75)'; c.lineWidth = 6;
        for (const y of [0.52, 0.64, 0.76]) { c.beginPath(); c.moveTo(w * 0.2, h * y); c.lineTo(w * (0.55 + y * 0.3), h * y); c.stroke(); }
      },
      (c, w, h) => {   // charcoal input
        c.fillStyle = '#efece4'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(50,45,55,0.9)'; c.lineWidth = 7;
        c.beginPath();
        c.moveTo(w * 0.12, h * 0.4); c.lineTo(w * 0.88, h * 0.42); c.lineTo(w * 0.87, h * 0.62); c.lineTo(w * 0.13, h * 0.6); c.closePath(); c.stroke();
        c.strokeStyle = 'rgba(50,45,55,0.4)'; c.lineWidth = 3;
        for (let i = 0; i < 14; i++) { const x = w * (0.16 + i * 0.05); c.beginPath(); c.moveTo(x, h * 0.44); c.lineTo(x + 8, h * 0.58); c.stroke(); }
        c.fillStyle = 'rgba(50,45,55,0.8)'; c.fillRect(w * 0.17, h * 0.46, 4, h * 0.12);
      },
    ];
    comps.forEach((draw, i) => {
      const x = [-2.6, -0.5, 2.6][i], z = -D + (i === 1 ? 1.9 : 1.0);
      const E = kit(new THREE.Group()); E.g.position.set(x, 0, z); E.g.rotation.y = (1 - i) * 0.25;
      const wood = paint(PAL.bark);
      for (const s of [-1, 1]) E.box(0.045, 1.5, 0.045, wood, s * 0.24, 0.75, 0, 0.012, [0, 0, -s * 0.22]);
      E.box(0.045, 1.45, 0.045, wood, 0, 0.72, -0.26, 0.012, [-0.3, 0, 0]);
      E.box(0.66, 0.05, 0.1, wood, 0, 0.62, 0.05);
      E.box(0.78, 0.6, 0.035, paint(0xfffaf0), 0, 0.95, 0.03, 0.01, [-0.06, 0, 0]);
      E.flat(0.72, 0.54, texMat(256, 192, draw), 0, 0.95, 0.053, [-0.06, 0, 0]);
      K.g.add(E.g); ink(E.g, 'fine');
    });
    // paint cans and splats
    const cols = [0xe8604c, 0xe4b84f, 0x7fb3a8];
    cols.forEach((col, i) => {
      K.put(new THREE.CylinderGeometry(0.14, 0.13, 0.26, 14), paint(0xc9ccd6), 2.9 - i * 0.34, 0.13, -D + 2.6 + (i % 2) * 0.3);
      K.put(new THREE.CylinderGeometry(0.11, 0.11, 0.02, 12), paint(col), 2.9 - i * 0.34, 0.27, -D + 2.6 + (i % 2) * 0.3);
    });
    const splat = K.flat(1.1, 0.9, texMat(220, 180, (c, w, h) => {
      for (const [x, y, r, col] of [[70, 80, 46, 'rgba(232,96,76,0.8)'], [140, 100, 34, 'rgba(127,179,168,0.8)'], [110, 50, 26, 'rgba(228,184,79,0.85)']]) {
        c.fillStyle = col;
        c.beginPath();
        for (let a = 0; a < 6.28; a += 0.5) { const rr = r * (0.7 + 0.45 * Math.sin(a * 3 + x)); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
        c.closePath(); c.fill();
      }
    }), -2.2, 0.018, -D + 2.6, [-Math.PI / 2, 0, 0]);
    splat.material.transparent = true;
  },
  'borrowed-eyes'(K) {
    // a wall of eyes: cow, honeybee, owl — each sees you differently
    const eyes = [
      ['cow', (c, w, h) => { c.fillStyle = '#b48a62'; c.fillRect(0, 0, w, h); c.fillStyle = '#f0e6d4'; c.beginPath(); c.ellipse(w / 2, h / 2, 70, 44, 0, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 4; c.stroke(); c.fillStyle = '#3b2e24'; c.beginPath(); c.ellipse(w / 2, h / 2, 26, 40, 0, 0, 7); c.fill(); c.fillStyle = '#111'; c.fillRect(w / 2 - 20, h / 2 - 7, 40, 14); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2 - 12, h / 2 - 14, 7, 0, 7); c.fill(); }],
      ['honeybee', (c, w, h) => { c.fillStyle = '#e4b84f'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2230'; c.beginPath(); c.ellipse(w / 2, h / 2, 62, 52, 0, 0, 7); c.fill(); c.strokeStyle = '#8f7ae8'; c.lineWidth = 2; for (let y = -48; y < 50; y += 11) for (let x = -58; x < 60; x += 12) { const dx = x + (Math.abs(y) % 22 < 11 ? 6 : 0); if (dx * dx / 3600 + y * y / 2500 < 1) { c.beginPath(); c.arc(w / 2 + dx, h / 2 + y, 5, 0, 7); c.stroke(); } } }],
      ['owl', (c, w, h) => { c.fillStyle = '#4a4258'; c.fillRect(0, 0, w, h); c.fillStyle = '#e4b84f'; c.beginPath(); c.arc(w / 2, h / 2, 52, 0, 7); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke(); c.fillStyle = '#111'; c.beginPath(); c.arc(w / 2, h / 2, 30, 0, 7); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(w / 2 - 11, h / 2 - 11, 9, 0, 7); c.fill(); }],
    ];
    eyes.forEach(([name, draw], i) => {
      const x = [-3.05, -1.95, 3.05][i];
      K.put(new THREE.TorusGeometry(0.42, 0.05, 10, 28), paint(PAL.gold), x, 1.5, -D + 0.58, [0, 0, 0]);
      const face = K.flat(0.8, 0.66, texMat(200, 164, draw), x, 1.5, -D + 0.57);
      face.geometry = new THREE.CircleGeometry(0.4, 28);
      K.flat(0.7, 0.18, texMat(256, 64, (c, w, h) => {
        c.font = `400 ${h * 0.62}px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('the ' + name + "'s", w / 2, h / 2);
      }), x, 0.95, -D + 0.57);
    });
    // the field camera on its tripod
    const cam = kit(new THREE.Group()); cam.g.position.set(2.7, 0, -D + 1.6); cam.g.rotation.y = -0.6;
    const dk = paint(PAL.ink, { hatch: 0 });
    for (let i = 0; i < 3; i++) cam.box(0.045, 1.15, 0.045, paint(PAL.bark), Math.sin(i * 2.1) * 0.3, 0.55, Math.cos(i * 2.1) * 0.3, 0.012, [Math.cos(i * 2.1) * 0.5, 0, -Math.sin(i * 2.1) * 0.5]);
    cam.box(0.4, 0.3, 0.24, dk, 0, 1.2, 0);
    cam.put(new THREE.CylinderGeometry(0.1, 0.12, 0.18, 14), dk, 0, 1.2, 0.2, [Math.PI / 2, 0, 0]);
    cam.put(new THREE.CylinderGeometry(0.035, 0.035, 0.05, 10), paint(PAL.accent), 0.12, 1.38, 0);
    K.g.add(cam.g); ink(cam.g, 'fine');
  },
  gallery(K) {
    // ── the collection, rehung in a hurry after the heist ──
    // Janelle's real paintings crowd every wall, frames crooked, two leaning
    // on the floor, one flat on its back; paint splattered where crates spilled.
    const AR = { a1: 1.375, a2: 1.236, a3: 1.261, a4: 1.023, a5: 1.279, a6: 1.272, a7: 1.333, a8: 1.81, a9: 2.066, a10: 1.333, a11: 0.75, a12: 0.75 };
    const gilt = paint(PAL.gold);
    const artMat = (name) => {
      const t = _loader.load('artworks/' + name + '.jpg');
      t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
      return paint(0xffffff, { map: t, hatch: 0, unique: true });
    };
    const hang = (name, w, x, y, z, ry = 0, tilt = 0, lean = 0) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      g.rotation.order = 'YXZ';                      // face the wall first, then lean/tilt
      g.rotation.set(lean, ry, tilt);
      const F = kit(g), h = w / AR[name];
      F.box(w + 0.08, 0.05, 0.045, gilt, 0, h / 2 + 0.025, 0, 0.012);
      F.box(w + 0.08, 0.05, 0.045, gilt, 0, -h / 2 - 0.025, 0, 0.012);
      F.box(0.05, h, 0.045, gilt, -w / 2 - 0.025, 0, 0, 0.012);
      F.box(0.05, h, 0.045, gilt, w / 2 + 0.025, 0, 0, 0.012);
      F.flat(w, h, artMat(name), 0, 0, 0.012);
      K.g.add(g);
      return g;
    };
    const HPI = Math.PI / 2;
    // back wall, salon-hung around the footage frame
    hang('a2', 0.9, 2.0, 2.1, -D + 0.56, 0, 0.06);
    hang('a9', 1.1, 2.65, 1.15, -D + 0.56, 0, -0.04);
    hang('a11', 0.55, 1.5, 1.05, -D + 0.56, 0, 0.09);
    hang('a5', 0.85, -1.65, 2.25, -D + 0.56, 0, -0.07);
    hang('a12', 0.52, -3.55, 2.05, -D + 0.56, 0, 0.05);
    // the side walls got the overflow
    hang('a3', 0.95, -W / 2 + 0.06, 1.6, -4.3, HPI, -0.08);
    hang('a7', 0.8, -W / 2 + 0.06, 1.85, -2.95, HPI, 0.05);
    hang('a8', 1.0, -W / 2 + 0.06, 0.95, -3.55, HPI, 0.1);
    hang('a6', 0.9, W / 2 - 0.06, 1.7, -4.2, -HPI, 0.07);
    hang('a10', 0.85, W / 2 - 0.06, 1.5, -2.9, -HPI, -0.09);
    // two never made it back up, one is flat on its back
    hang('a1', 0.9, -3.15, 0.34, -D + 0.66, 0, 0.02, -0.3);
    hang('a4', 0.78, W / 2 - 0.22, 0.4, -1.75, -HPI, 0.03, -0.3);
    {   // one fell flat on its face — canvas back and stretcher bars up
      const g = new THREE.Group(); g.position.set(1.15, 0.03, -2.1); g.rotation.y = 0.5;
      const F = kit(g), canvas = paint(0xd9c8a8), bar = paint(0xb09a74);
      F.box(0.66, 0.035, 0.52, canvas, 0, 0, 0, 0.01);
      F.box(0.66, 0.02, 0.07, bar, 0, 0.025, -0.22); F.box(0.66, 0.02, 0.07, bar, 0, 0.025, 0.22);
      F.box(0.07, 0.02, 0.5, bar, -0.29, 0.025, 0); F.box(0.07, 0.02, 0.5, bar, 0.29, 0.025, 0);
      K.g.add(g);
    }
    // paint splattered where the crates spilled open
    const splat = (w, h, x, z, yaw, draw) => {
      const s = K.flat(w, h, texMat(256, 200, draw), x, 0.013 + Math.random() * 0.004, z, [-HPI, 0, yaw]);
      s.renderOrder = 2;
      return s;
    };
    const blobby = (c, x, y, r, col) => {
      c.fillStyle = col; c.beginPath();
      for (let a = 0; a < 6.4; a += 0.35) { const rr = r * (0.6 + 0.5 * Math.abs(Math.sin(a * 2.7 + x))); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill();
      for (let d = 0; d < 7; d++) { const a = d * 0.9 + y; const dd = r * (1.15 + (d % 3) * 0.35); c.beginPath(); c.arc(x + Math.cos(a) * dd, y + Math.sin(a) * dd, r * 0.09 + (d % 2) * 2, 0, 7); c.fill(); }
    };
    splat(1.5, 1.2, -1.2, -D + 1.6, 0.4, (c) => { blobby(c, 110, 100, 52, 'rgba(176,58,48,0.85)'); blobby(c, 185, 130, 26, 'rgba(228,184,79,0.85)'); });
    splat(1.2, 1.0, 2.2, -D + 2.9, -0.8, (c) => { blobby(c, 120, 90, 44, 'rgba(127,179,168,0.85)'); blobby(c, 70, 140, 22, 'rgba(143,122,232,0.8)'); });
    splat(1.0, 0.9, -2.9, -D + 3.3, 1.7, (c) => { blobby(c, 110, 100, 38, 'rgba(228,184,79,0.85)'); blobby(c, 160, 70, 18, 'rgba(176,58,48,0.8)'); });
    // one hit the wall and dripped
    const drip = K.flat(1.0, 1.1, texMat(220, 240, (c, w, h) => {
      blobby(c, 110, 70, 40, 'rgba(176,58,48,0.9)');
      c.strokeStyle = 'rgba(176,58,48,0.9)'; c.lineCap = 'round';
      for (const [dx, len, lw] of [[-22, 90, 7], [2, 130, 9], [26, 70, 6], [44, 100, 5]]) {
        c.lineWidth = lw; c.beginPath(); c.moveTo(110 + dx, 85); c.lineTo(110 + dx, 85 + len); c.stroke();
        c.beginPath(); c.arc(110 + dx, 85 + len, lw * 0.8, 0, 7); c.fillStyle = 'rgba(176,58,48,0.9)'; c.fill();
      }
    }), 3.1, 0.75, -D + 0.545);
    drip.renderOrder = 2;
    // loose sketches scattered underfoot
    for (const [sx, sz, yaw] of [[0.3, -3.3, 0.5], [0.75, -3.05, -0.9], [-0.5, -1.4, 2.2], [-2.2, -2.5, 1.1], [1.9, -1.6, -0.4]]) {
      K.flat(0.34, 0.44, texMat(96, 128, (c, w, h) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(42,34,48,0.65)'; c.lineWidth = 2;
        c.strokeRect(1, 1, w - 2, h - 2);
        c.beginPath(); c.ellipse(w / 2, h * 0.4, w * 0.26, h * 0.2, 0.4, 0, 7); c.stroke();
        for (let l = 0; l < 3; l++) { c.beginPath(); c.moveTo(12, h * 0.7 + l * 12); c.lineTo(w - 12 - l * 14, h * 0.7 + l * 12); c.stroke(); }
      }), sx, 0.02 + Math.random() * 0.004, sz, [-HPI, 0, yaw]).renderOrder = 2;
    }
    // a stanchion went over in the scramble
    const brass2 = paint(PAL.gold);
    K.put(new THREE.CylinderGeometry(0.11, 0.14, 0.06, 12), brass2, 0.4, 0.05, -D + 2.05, [0, 0, 1.45]);
    K.box(0.035, 0.85, 0.035, brass2, 0.86, 0.058, -D + 2.1, 0.01, [0, 0.2, HPI]);
    K.put(new THREE.SphereGeometry(0.055, 10, 8), brass2, 1.3, 0.06, -D + 2.19);
    // the famous empty frame, still missing
    const fr = kit(new THREE.Group()); fr.g.position.set(-2.3, 0, -D + 0.62);
    const gold = paint(PAL.gold);
    fr.box(1.3, 0.12, 0.09, gold, 0, 2.0, 0); fr.box(1.3, 0.12, 0.09, gold, 0, 0.95, 0);
    fr.box(0.12, 1.0, 0.09, gold, -0.6, 1.47, 0); fr.box(0.12, 1.0, 0.09, gold, 0.6, 1.47, 0);
    for (const [sx, sy] of [[-0.6, 2.0], [0.6, 2.0], [-0.6, 0.95], [0.6, 0.95]]) fr.put(new THREE.SphereGeometry(0.07, 10, 8), gold, sx, sy, 0.02);
    fr.flat(0.5, 0.3, texMat(220, 130, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
      c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(3, 3, w - 6, h - 6);
      c.font = `700 ${h * 0.34}px ${SCRIPT}`; c.fillStyle = '#e8604c'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('STOLEN', w / 2, h * 0.32);
      c.font = `400 ${h * 0.2}px ${HAND}`; c.fillStyle = '#5a4e5e';
      c.fillText('play the game,', w / 2, h * 0.6);
      c.fillText('catch the thief', w / 2, h * 0.8);
    }), 0, 1.45, 0.02);
    K.g.add(fr.g); ink(fr.g, 'fine');
    // red rope on brass stanchions
    const brass = paint(PAL.gold);
    for (const x of [-3.3, -1.3]) {
      K.put(new THREE.CylinderGeometry(0.11, 0.14, 0.06, 12), brass, x, 0.03, -D + 1.7);
      K.box(0.035, 0.85, 0.035, brass, x, 0.46, -D + 1.7, 0.01);
      K.put(new THREE.SphereGeometry(0.055, 10, 8), brass, x, 0.9, -D + 1.7);
    }
    const rope = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(-3.3, 0.88, -D + 1.7), new THREE.Vector3(-2.3, 0.62, -D + 1.72), new THREE.Vector3(-1.3, 0.88, -D + 1.7),
    ]), 16, 0.035, 8), paint(0xb03a30));
    K.g.add(rope);
  },
  library(K) {
    // the stacks: every repo is a book
    const wood = paint(0x8a6448);
    const tagCols = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0x93abc0, 0xa8b994, 0xdc9e9a, 0x8f7ae8];
    for (const bx of [-2.6, 0, 2.6]) {
      const sh = kit(new THREE.Group()); sh.g.position.set(bx, 0, -D + 0.78);
      sh.box(2.2, 0.06, 0.4, wood, 0, 0.04, 0);
      for (let r = 0; r < 4; r++) sh.box(2.2, 0.05, 0.4, wood, 0, 0.52 + r * 0.5, 0);
      for (const s of [-1, 1]) sh.box(0.08, 2.15, 0.42, wood, s * 1.1, 1.06, 0);
      sh.box(2.2, 0.12, 0.06, wood, 0, 2.2, -0.17);
      let seed = bx * 7 + 13;
      const rndL = () => { seed = (seed * 16807) % 2147483647; return (seed < 0 ? -seed : seed) / 2147483647; };
      for (let r = 0; r < 4; r++) {
        let bxx = -1.0;
        while (bxx < 0.95) {
          const bw = 0.07 + rndL() * 0.09, bh = 0.3 + rndL() * 0.12;
          sh.box(bw, bh, 0.3, paint(tagCols[Math.floor(rndL() * tagCols.length)]), bxx + bw / 2, 0.07 + r * 0.5 + bh / 2 + (r === 0 ? 0 : 0.48 - 0.48) , -0.02, 0.012, [0, 0, rndL() < 0.12 ? 0.1 : 0]);
          bxx += bw + 0.012;
        }
      }
      K.g.add(sh.g); ink(sh.g, 'fine');
    }
    // the card catalogue + a ladder
    K.box(0.6, 0.9, 0.45, wood, 2.6, 0.45, -D + 2.2);
    for (let r = 0; r < 3; r++) for (let cI = 0; cI < 2; cI++) {
      K.box(0.22, 0.2, 0.03, paint(0xa07850), 2.46 + cI * 0.28, 0.2 + r * 0.26, -D + 2.43, 0.008);
      K.put(new THREE.SphereGeometry(0.02, 8, 6), paint(PAL.gold), 2.46 + cI * 0.28, 0.2 + r * 0.26, -D + 2.46);
    }
    const lad = kit(new THREE.Group()); lad.g.position.set(-1.4, 0, -D + 1.05); lad.g.rotation.z = 0.18;
    for (const s of [-1, 1]) lad.box(0.05, 2.3, 0.05, wood, s * 0.2, 1.15, 0, 0.012);
    for (let r = 0; r < 6; r++) lad.box(0.4, 0.04, 0.04, wood, 0, 0.3 + r * 0.36, 0, 0.01);
    K.g.add(lad.g); ink(lad.g, 'fine');
  },
};

const ROOM_WALL = {
  charterscope: 0xcfdbe4, 'inbox-zero': 0xf3dfc2, yarnflow: 0xf2d9d6, deckgpt: 0x4a3a50,
  splatform: 0xf6eedb, 'borrowed-eyes': 0xdbe8dd, gallery: 0xcfc3dc, library: 0xe8ddc2,
};

export function buildInteriors(scene) {
  const rooms = {};
  PLACES.forEach((place, i) => {
    const ox = -105 + i * 30, oz = -45;
    const g = new THREE.Group(); g.position.set(ox, 0, oz);
    const K = kit(g);
    roomShell(K, ROOM_WALL[place.id] ?? 0xe8ddc2, place);
    if (place.id !== 'deckgpt' && place.id !== 'library' && place.shot)
      framedShot(K, place.shot, 1.9, 1.19, 0, 1.45, -D + 0.6, null, place.clip);
    plaque(K, -1.25, -D + 2.1);
    counter(K, 1.6, -D + 2.3, 0);
    SETS[place.id]?.(K);
    // a soft pool of light on the floor
    g.add(blobShadow(0.001));            // (keeps the group non-empty before ink)
    ink(g, 'mid');
    scene.add(g);
    rooms[place.id] = {
      origin: { x: ox, z: oz },
      spawn: { x: ox, z: oz - 0.9, yaw: Math.PI },     // just inside, facing the room
      bounds: { x0: ox - W / 2 + 0.25, x1: ox + W / 2 - 0.25, z0: oz - D + 0.8, z1: oz + 0.42 },
      colliders: [
        { x0: ox - 2.0, x1: ox - 0.6, z0: oz - D + 1.75, z1: oz - D + 2.45 },   // plaque
        { x0: ox + 0.7, x1: ox + 2.5, z0: oz - D + 1.95, z1: oz - D + 2.65 },   // counter
      ],
      interact: [
        { x: ox - 1.25, z: oz - D + 2.55, r: 1.0, label: 'read the plaque', act: { type: 'card', place } },
        { x: ox + 1.6, z: oz - D + 2.75, r: 1.1, label: `open ${place.title} →`, act: { type: 'visit', url: place.url, place } },
        { x: ox, z: oz + 0.1, r: 1.0, label: 'back to the street', act: { type: 'exit' } },
      ],
    };
  });
  return rooms;
}
