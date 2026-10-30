// ─── INSIDE THE SHOPS ───────────────────────────────────────────────────────
// Each app gets a little dollhouse room, built far behind the street and
// reached by its shop door. Open front (the camera looks in over it), a back
// wall with the real app framed on it, a plaque that tells its story, a
// counter that opens the live site, and props from the thing itself.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { PAL, paint, ink, blobShadow } from './style.js';
import { APPS, LIBRARY, PLACES } from './apps.js';
import { bush } from './props.js';

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
const LIVE = [];                            // per-frame animations: f(t), local room coords
export function tickInteriors(t) {
  for (const f of LIVE) f(t);
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
    // the decision board: the charter pinned in the middle, today's competitor moves
    // around it, each stamped with its verdict and strung back to the charter
    K.flat(1.7, 1.1, texMat(512, 330, (c, w, h) => {
      c.fillStyle = '#caa87c'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a6448'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
      const V = { ADOPT: '#3f8f5a', MONITOR: '#c08a2a', REJECT: '#8a8494', PIVOT: '#7a5bb5' };
      const cards = [[40, 34, 'ADOPT'], [190, 34, 'MONITOR'], [360, 34, 'ADOPT'], [40, 200, 'REJECT'], [360, 200, 'PIVOT']];
      const cx = 256, cy = 190;
      c.strokeStyle = '#e8604c'; c.lineWidth = 3;
      for (const [x, y] of cards) { c.beginPath(); c.moveTo(x + 55, y + 45); c.lineTo(cx, cy); c.stroke(); }
      for (const [x, y, v] of cards) {
        c.fillStyle = '#f6efdf'; c.fillRect(x, y, 110, 90);
        c.strokeStyle = INKC; c.lineWidth = 2; c.strokeRect(x, y, 110, 90);
        c.strokeStyle = '#b9b2a4'; for (let l = 0; l < 3; l++) { c.beginPath(); c.moveTo(x + 10, y + 46 + l * 13); c.lineTo(x + 100 - l * 18, y + 46 + l * 13); c.stroke(); }
        c.fillStyle = V[v]; c.fillRect(x + 8, y + 10, 66, 20);
        c.font = `700 14px ${HAND}`; c.fillStyle = '#fff'; c.fillText(v, x + 12, y + 25);
      }
      c.fillStyle = '#fff8e6'; c.fillRect(cx - 62, cy - 34, 124, 68);
      c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(cx - 62, cy - 34, 124, 68);
      c.font = `700 22px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center';
      c.fillText('our charter', cx, cy - 6); c.font = `400 14px ${HAND}`; c.fillStyle = '#5a4e5e';
      c.fillText('goals · anti-goals', cx, cy + 18);
      c.fillStyle = '#e8604c'; c.beginPath(); c.arc(cx, cy - 34, 6, 0, 7); c.fill();
    }), -2.4, 1.35, -D + 0.56, [0, 0.0, 0]);
    // a brass telescope on a tripod, trained on the competition
    const scope = new THREE.Group(); scope.position.set(2.9, 0, -D + 1.3); scope.rotation.y = -0.7;
    const Sk = kit(scope), wood = paint(0x6b4a34), brass = paint(PAL.gold);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; Sk.box(0.04, 1.05, 0.04, wood, Math.sin(a) * 0.2, 0.5, Math.cos(a) * 0.2, 0.012, [Math.cos(a) * 0.2, 0, -Math.sin(a) * 0.2]); }
    Sk.put(new THREE.CylinderGeometry(0.045, 0.07, 0.7, 14), brass, 0, 1.08, 0.05, [1.25, 0, 0]);
    Sk.put(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 16), brass, 0, 1.19, 0.38, [1.25, 0, 0]);
    Sk.put(new THREE.SphereGeometry(0.05, 10, 8), wood, 0, 1.02, 0);
    ink(scope, 'fine');
    K.g.add(scope);
    // a stack of yesterday's digests
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
  },
};

// ─── THE FUN LAYER: every room gets life ────────────────────────────────────
// Small looping animations in room-local coordinates, registered in LIVE.

// a little toon cat, facing +z. Returns the pieces the animations drive.
function makeCat(colA, colB = colA) {
  const g = new THREE.Group(), C = kit(g);
  const fur = paint(colA, { hatch: 0.4 }), fur2 = paint(colB, { hatch: 0.4 });
  // the side profile carries the cat: a chest mass blending into the head, a
  // round rump the tail grows from, and legs that emerge from those masses
  // instead of hanging off a bare box like pins
  C.box(0.28, 0.15, 0.14, fur, 0, 0.165, 0, 0.055);
  C.put(new THREE.SphereGeometry(0.095, 12, 10).scale(1, 0.95, 1), fur, 0, 0.17, 0.09);   // chest/shoulders
  C.put(new THREE.SphereGeometry(0.09, 12, 10).scale(1, 1, 1.05), fur, 0, 0.17, -0.09);   // haunches
  C.put(new THREE.SphereGeometry(0.088, 12, 10), fur2, 0, 0.27, 0.16);
  for (const s of [-1, 1]) C.put(new THREE.ConeGeometry(0.032, 0.065, 6), fur2, s * 0.052, 0.355, 0.15);
  const dark = paint(0x2a2230, { hatch: 0 });
  for (const s of [-1, 1]) C.put(new THREE.SphereGeometry(0.013, 6, 5), dark, s * 0.036, 0.285, 0.238);
  C.put(new THREE.SphereGeometry(0.011, 6, 5), paint(0xdc9e9a, { hatch: 0 }), 0, 0.255, 0.245);
  const legs = [];
  // legs pivot at the hip/shoulder (geometry hangs below its origin), so a
  // swing or a batting paw hinges where it attaches instead of orbiting its
  // own middle and tearing off the body; a paw at the foot grounds the profile
  const legGeo = rb(0.06, 0.15, 0.06, 0.02);
  legGeo.translate(0, -0.075, 0);
  const pawGeo = rb(0.065, 0.045, 0.08, 0.018);
  pawGeo.translate(0, -0.128, 0.012);
  for (const [lx, lz] of [[-0.08, 0.09], [0.08, 0.09], [-0.08, -0.09], [0.08, -0.09]]) {
    const leg = C.put(legGeo, fur, lx, 0.15, lz);
    leg.add(new THREE.Mesh(pawGeo, fur2));
    legs.push(leg);
  }
  // one connected curved tail (jointed boxes read as broken-off sticks)
  const tailG = new THREE.Group(); tailG.position.set(0, 0.2, -0.15);
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0.02), new THREE.Vector3(0, 0.03, -0.1),
    new THREE.Vector3(0.015, 0.14, -0.17), new THREE.Vector3(0.02, 0.26, -0.15),
  ]);
  tailG.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.02, 6), fur2));
  g.add(tailG);
  ink(g, 'fine');
  g.add(blobShadow(0.15));
  return { g, legs, tail: tailG };
}
// drive a cat along a position + heading, legs trotting
function catMove(cat, x, z, dx, dz, t, pace = 9) {
  cat.g.position.set(x, Math.abs(Math.sin(t * pace)) * 0.025, z);
  cat.g.rotation.y = Math.atan2(dx, dz);
  cat.legs.forEach((l, i) => { l.rotation.x = Math.sin(t * pace + (i % 2) * Math.PI + Math.floor(i / 2) * 1.3) * 0.55; });
  cat.tail.rotation.y = Math.sin(t * 2.7) * 0.35;
  cat.tail.rotation.x = Math.sin(t * 1.9) * 0.15;
}

const EXTRA = {
  yarnflow(K) {
    // ── yarn EVERYWHERE ──
    const cols = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0xdc9e9a, 0x8f7ae8, 0xa8b994, 0x93abc0];
    const spots = [[-3.2, -1.1], [-2.2, -2.9], [-0.9, -4.3], [2.1, -1.2], [3.1, -3.2], [-1.6, -0.7], [3.4, -4.6], [0.6, -4.8], [-3.5, -4.6], [2.8, -0.6]];
    spots.forEach(([x, z], i) => {
      const r = 0.1 + (i % 3) * 0.03;
      K.put(new THREE.SphereGeometry(r, 10, 8), paint(cols[i % cols.length]), x, r, z);
      const w = K.put(new THREE.TorusGeometry(r, 0.014, 6, 16), paint(cols[(i + 3) % cols.length]), x, r, z, [0.6 + i, i * 0.8, 0]);
      w.userData.noInk = true;
    });
    // loose strands trailing across the floor between the balls
    for (let s = 0; s < 4; s++) {
      const pts = [spots[s], spots[s + 3], spots[s + 6 < spots.length ? s + 6 : s + 1]].map(([x, z], j) =>
        new THREE.Vector3(x, 0.02, z).add(new THREE.Vector3(Math.sin(s * 3 + j) * 0.4, 0, Math.cos(s * 5 + j) * 0.4)));
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.013, 5), paint(cols[(s * 2 + 1) % cols.length]));
      tube.userData.noInk = true;
      K.g.add(tube);
    }
    // ── the cats ──
    // Pickle chases a runaway ball round the room
    const pickle = makeCat(0xe09a52, 0xd98a40);
    const ball = K.put(new THREE.SphereGeometry(0.11, 10, 8), paint(0xe8604c), 0, 0.11, -2);
    const bw = K.put(new THREE.TorusGeometry(0.11, 0.015, 6, 16), paint(0xe4b84f), 0, 0.11, -2);
    bw.userData.noInk = true;
    K.g.add(pickle.g);
    const orbit = (tt) => { const a = tt * 0.62; return [Math.cos(a) * 2.1, -2.1 + Math.sin(a) * 1.15, a]; };
    LIVE.push((t) => {
      const [bx, bz, a] = orbit(t);
      ball.position.set(bx, 0.11, bz); bw.position.set(bx, 0.11, bz);
      ball.rotation.z -= 0.08; bw.rotation.y = a;
      const [cx, cz] = orbit(t - 0.55), [nx, nz] = orbit(t - 0.5);
      catMove(pickle, cx, cz, nx - cx, nz - cz, t);
    });
    // Mochi sits on her haunches under the shelf, batting at a strand
    const mochi = makeCat(0x9a9490, 0xb8b2ac);
    mochi.g.position.set(-2.0, 0.03, -4.05);
    mochi.g.rotation.order = 'YXZ';
    mochi.g.rotation.y = -2.3;                 // facing the hanging strand
    mochi.g.rotation.x = -0.5;                 // up on her haunches, nose to the toy
    mochi.legs[0].rotation.x = 0.5;            // front legs stay planted under her
    mochi.legs[2].rotation.x = 0.95;           // hind legs tucked beneath
    mochi.legs[3].rotation.x = 0.95;
    K.g.add(mochi.g);
    const strandG = new THREE.Group(); strandG.position.set(-2.35, 1.3, -4.4);
    const strand = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, -0.45, 0.05), new THREE.Vector3(-0.02, -0.9, 0.02),
    ]), 12, 0.013, 5), paint(0x8f7ae8));
    strand.userData.noInk = true;
    strandG.add(strand);
    const strandBall = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 7), paint(0x8f7ae8));
    strandBall.position.set(-0.02, -0.95, 0.02);
    strandG.add(strandBall);
    K.g.add(strandG);
    LIVE.push((t) => {
      strandG.rotation.z = Math.sin(t * 2.3) * 0.3;
      strandG.rotation.x = Math.cos(t * 1.7) * 0.15;
      // the batting paw hinges at the shoulder: planted (0.5) up to a raised swipe
      mochi.legs[1].rotation.x = 0.5 - Math.max(0, Math.sin(t * 2.3 + 0.6)) * 1.3;
      mochi.tail.rotation.y = Math.sin(t * 3.1) * 0.5;
    });
    // Biscuit does zoomies along the front of the room
    const biscuit = makeCat(0x2a2230, 0x3a3240);
    K.g.add(biscuit.g);
    LIVE.push((t) => {
      const x = Math.sin(t * 0.9) * 2.7, dx = Math.cos(t * 0.9);
      catMove(biscuit, x, -0.9 + Math.sin(t * 1.8) * 0.2, dx, Math.cos(t * 1.8) * 0.2, t, 13);
      biscuit.g.scale.z = 1 + Math.abs(dx) * 0.12;        // stretch along her OWN length (local z is her nose-to-tail axis)
    });
  },

  charterscope(K) {
    // the radar on its console: a sweep goes round and competitor blips light up as it passes
    const con = kit(new THREE.Group()); con.g.position.set(1.9, 0, -1.7);
    con.box(1.0, 0.6, 0.7, paint(0x5a6a7a), 0, 0.3, 0, 0.04);
    con.put(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 32), paint(0x2a2230, { hatch: 0 }), 0, 0.62, 0);
    ink(con.g, 'fine');
    K.g.add(con.g);
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.36, 40), new THREE.MeshBasicMaterial({ color: 0x1f4a3a }));
    glass.rotation.x = -Math.PI / 2; glass.position.set(1.9, 0.652, -1.7); K.g.add(glass);
    const rings = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.18, 40), new THREE.MeshBasicMaterial({ color: 0x5fd39a }));
    rings.rotation.x = -Math.PI / 2; rings.position.set(1.9, 0.654, -1.7); K.g.add(rings);
    const sweep = new THREE.Mesh(new THREE.CircleGeometry(0.35, 24, 0, 0.6), new THREE.MeshBasicMaterial({ color: 0x5fd39a, transparent: true, opacity: 0.55 }));
    sweep.rotation.x = -Math.PI / 2; sweep.position.set(1.9, 0.656, -1.7); K.g.add(sweep);
    const blips = [[0.22, 0.6], [0.12, 2.1], [0.28, 3.4], [0.18, 4.6], [0.3, 5.5]].map(([r, a]) => {
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.022, 12), new THREE.MeshBasicMaterial({ color: 0xc8ffd8, transparent: true }));
      m.rotation.x = -Math.PI / 2; m.position.set(1.9 + Math.cos(a) * r, 0.658, -1.7 - Math.sin(a) * r); K.g.add(m);
      return { m, a };
    });
    LIVE.push((t) => {
      const ang = (t * 1.6) % (Math.PI * 2);
      sweep.rotation.z = ang;
      for (const b of blips) {
        const since = ((ang - b.a) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        b.m.material.opacity = Math.max(0.08, 1 - since / 2.5);
      }
    });
    // verdict notes taped to the side walls
    for (const [x, y, z, ry, tilt, v, col] of [[-W / 2 + 0.06, 1.7, -2.2, Math.PI / 2, 0.08, 'ADOPT', '#3f8f5a'], [-W / 2 + 0.06, 1.3, -1.5, Math.PI / 2, -0.06, 'MONITOR', '#c08a2a'], [W / 2 - 0.06, 1.8, -3.4, -Math.PI / 2, 0.1, 'REJECT', '#8a8494']]) {
      const memo = K.flat(0.5, 0.62, texMat(128, 160, (c, w, h) => {
        c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#b9b2a4'; c.lineWidth = 2;
        for (let l = 0; l < 5; l++) { c.beginPath(); c.moveTo(12, 64 + l * 16); c.lineTo(w - 12, 64 + l * 16); c.stroke(); }
        c.fillStyle = col; c.fillRect(10, 14, w - 20, 34);
        c.fillStyle = '#fff'; c.font = `700 20px ${HAND}`; c.textAlign = 'center';
        c.fillText(v, w / 2, 39);
      }), x, y, z, [0, ry, tilt]);
      memo.renderOrder = 1;
    }
  },

  'inbox-zero'(K) {
    // letters on the wing: a relay of envelopes flying chute → out-basket
    const basket = kit(new THREE.Group()); basket.g.position.set(-0.6, 0, -4.4);
    basket.put(new THREE.CylinderGeometry(0.3, 0.24, 0.3, 12, 1, true), paint(0xc8a47c, { side: THREE.DoubleSide }), 0, 0.16, 0);
    for (let i = 0; i < 4; i++) basket.box(0.26, 0.02, 0.18, paint(0xf6eedb), (i % 2) * 0.06 - 0.03, 0.3 + i * 0.022, 0, 0.006, [0, i * 0.8, 0.06]);
    K.g.add(basket.g); ink(basket.g, 'fine');
    const from = new THREE.Vector3(3.4, 2.1, -4.9), to = new THREE.Vector3(-0.6, 0.45, -4.4);
    const env = () => {
      const g = new THREE.Group(), E = kit(g);
      E.box(0.3, 0.2, 0.02, paint(0xf6eedb), 0, 0, 0, 0.006);
      const fl = new THREE.Shape([[-0.14, 0.09], [0.14, 0.09], [0, -0.02]].map(([a, b2]) => new THREE.Vector2(a, b2)));
      E.put(new THREE.ExtrudeGeometry(fl, { depth: 0.004, bevelEnabled: false }), paint(0xe6d9bc), 0, 0, 0.012);
      E.put(new THREE.CylinderGeometry(0.03, 0.03, 0.008, 10), paint(PAL.accent), 0, 0, 0.02, [Math.PI / 2, 0, 0]);
      ink(g, 'fine');
      K.g.add(g);
      return g;
    };
    const flyers = [env(), env(), env()];
    LIVE.push((t) => {
      flyers.forEach((g, i) => {
        const s = ((t * 0.3 + i / 3) % 1);
        g.position.lerpVectors(from, to, s);
        g.position.y += Math.sin(s * Math.PI) * 1.1;        // a nice lob
        g.rotation.set(s * 7 + i, i * 2.1, Math.sin(t * 3 + i) * 0.4);
        g.visible = s > 0.02 && s < 0.97;
      });
    });
    // a drift of unsorted post on the floor
    for (let i = 0; i < 9; i++) {
      const x = -3.3 + (i * 0.73) % 2.2, z = -4.9 + (i * 1.17) % 1.3;
      K.box(0.28, 0.015, 0.19, paint(i % 3 ? 0xf6eedb : 0xefe4cc), x, 0.012 + (i % 3) * 0.013, z, 0.005, [0, i * 1.3, 0]);
    }
    // the mailroom clock, running fast (deadline energy)
    const clockG = new THREE.Group(); clockG.position.set(W / 2 - 0.06, 2.1, -3.2); clockG.rotation.y = -Math.PI / 2;
    const CK = kit(clockG);
    CK.put(new THREE.CylinderGeometry(0.3, 0.3, 0.04, 20), paint(0xf6eedb), 0, 0, 0, [Math.PI / 2, 0, 0]);
    CK.put(new THREE.TorusGeometry(0.3, 0.028, 8, 24), paint(0xc23f36), 0, 0, 0);
    const hourH = CK.box(0.035, 0.15, 0.015, paint(0x2a2230, { hatch: 0 }), 0, 0.06, 0.028, 0.005);
    const minH = CK.box(0.025, 0.24, 0.015, paint(0x2a2230, { hatch: 0 }), 0, 0.1, 0.032, 0.005);
    hourH.geometry = hourH.geometry.clone(); hourH.geometry.translate(0, -0.06, 0); hourH.position.y = 0;
    minH.geometry = minH.geometry.clone(); minH.geometry.translate(0, -0.1, 0); minH.position.y = 0;
    ink(clockG, 'fine');
    K.g.add(clockG);
    LIVE.push((t) => { minH.rotation.z = -t * 0.9; hourH.rotation.z = -t * 0.075; });
  },

  deckgpt(K) {
    // the projector beam, flickering like real celluloid
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.85, 3.6, 18, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xfff2c0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.userData.noInk = true;
    beam.position.set(1.35, 1.25, -4.05);
    beam.lookAt(new THREE.Vector3(0, 1.35, -5.4));
    beam.rotateX(-Math.PI / 2);
    K.g.add(beam);
    LIVE.push((t) => { beam.material.opacity = 0.08 + 0.035 * Math.sin(t * 17) * Math.sin(t * 5.1); });
    // slides mid-generation, spiralling up into the screen
    const cards = [];
    for (let i = 0; i < 4; i++) {
      const card = K.flat(0.3, 0.2, texMat(96, 64, (c, w, h) => {
        c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h);
        c.strokeStyle = '#2a2230'; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4);
        c.fillStyle = ['#e8604c', '#7fb3a8', '#e4b84f', '#8f7ae8'][i]; c.fillRect(8, 8, w - 16, 14);
        c.strokeStyle = '#b9b2a4'; c.lineWidth = 2;
        for (let l = 0; l < 2; l++) { c.beginPath(); c.moveTo(10, 36 + l * 10); c.lineTo(w - 10 - l * 20, 36 + l * 10); c.stroke(); }
      }), 0, 0, 0);
      cards.push(card);
    }
    LIVE.push((t) => {
      cards.forEach((card, i) => {
        const s = ((t * 0.22 + i / 4) % 1);
        const a = s * Math.PI * 4 + i;
        card.position.set(2.6 + Math.cos(a) * (0.5 - s * 0.3) - s * 2.6, 1.5 + s * 0.9, -2.6 + Math.sin(a) * (0.4 - s * 0.25) - s * 2.5);
        card.rotation.set(Math.sin(a) * 0.4, a * 0.5, Math.cos(a) * 0.3);
        const f = Math.min(1, (1 - s) * 6);
        card.scale.setScalar(Math.max(0.001, f));
      });
    });
    // popcorn: a tub on a seat, pieces everywhere
    const tub = kit(new THREE.Group()); tub.g.position.set(0.65, 0.42, -3.7);
    tub.put(new THREE.CylinderGeometry(0.11, 0.08, 0.2, 12), paint(0xffffff, { map: canvasTex(64, 64, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#c23f36' : '#f6eedb'; c.fillRect(i * 8, 0, 8, h); } }), hatch: 0 }), 0, 0, 0);
    for (let i = 0; i < 5; i++) tub.put(new THREE.SphereGeometry(0.035, 7, 6), paint(0xf3e3b8), Math.sin(i * 2.4) * 0.05, 0.11 + (i % 2) * 0.02, Math.cos(i * 2.4) * 0.05);
    ink(tub.g, 'fine');
    K.g.add(tub.g);
    for (let i = 0; i < 14; i++) {
      const p = K.put(new THREE.SphereGeometry(0.028, 6, 5), paint(0xf3e3b8), -1.4 + (i * 0.67) % 3.1, 0.03, -1.9 - (i * 0.41) % 1.6);
      p.userData.noInk = true;
    }
  },

  splatform(K) {
    // paint EVERYWHERE: wall splats, a tipped can mid-spill, a busy brush
    const blobby2 = (c, x, y, r, col) => {
      c.fillStyle = col; c.beginPath();
      for (let a = 0; a < 6.4; a += 0.4) { const rr = r * (0.65 + 0.45 * Math.abs(Math.sin(a * 3.1 + x))); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      c.closePath(); c.fill();
      for (let d = 0; d < 6; d++) { const a = d * 1.1 + y; c.beginPath(); c.arc(x + Math.cos(a) * r * 1.4, y + Math.sin(a) * r * 1.4, 2 + (d % 3) * 2, 0, 7); c.fill(); }
    };
    const wallSplat = (x, y, z, ry, draw) => {
      const s = K.flat(0.9, 0.8, texMat(200, 180, draw), x, y, z, [0, ry, 0]);
      s.renderOrder = 2;
    };
    wallSplat(-2.2, 1.6, -D + 0.545, 0, (c) => blobby2(c, 100, 90, 42, 'rgba(143,122,232,0.85)'));
    wallSplat(-W / 2 + 0.055, 1.3, -3.2, Math.PI / 2, (c) => { blobby2(c, 90, 80, 36, 'rgba(232,96,76,0.85)'); blobby2(c, 150, 120, 20, 'rgba(228,184,79,0.85)'); });
    wallSplat(W / 2 - 0.055, 1.8, -2.4, -Math.PI / 2, (c) => blobby2(c, 100, 90, 38, 'rgba(127,179,168,0.85)'));
    // the tipped can and its puddle
    K.put(new THREE.CylinderGeometry(0.13, 0.12, 0.24, 14), paint(0xc9ccd6), -1.3, 0.12, -2.3, [0, 0.4, Math.PI / 2 - 0.08]);
    const puddle = K.flat(1.0, 0.7, texMat(200, 140, (c) => blobby2(c, 100, 70, 44, 'rgba(143,122,232,0.9)')), -1.75, 0.014, -2.35, [-Math.PI / 2, 0, 0.5]);
    puddle.renderOrder = 2;
    // a brush hard at work over the middle easel, never quite done
    const brushG = new THREE.Group(); K.g.add(brushG);
    const B = kit(brushG);
    B.put(new THREE.CylinderGeometry(0.02, 0.025, 0.3, 8), paint(0x8a6448), 0, 0.15, 0);
    B.put(new THREE.CylinderGeometry(0.028, 0.02, 0.06, 8), paint(0xc9ccd6), 0, -0.02, 0);
    B.put(new THREE.ConeGeometry(0.03, 0.09, 8), paint(0xe8604c), 0, -0.09, 0, [Math.PI, 0, 0]);
    ink(brushG, 'fine');
    LIVE.push((t) => {
      const s = Math.sin(t * 1.4);
      brushG.position.set(-0.5 + s * 0.28, 1.12 + Math.abs(Math.cos(t * 2.8)) * 0.06, -D + 2.0);
      brushG.rotation.z = 0.5 + s * 0.3;
      brushG.rotation.x = -0.25;
    });
    // paint drops hopping between the cans
    const drop = K.put(new THREE.SphereGeometry(0.045, 8, 7), paint(0xe4b84f), 2.9, 0.3, -3.4);
    LIVE.push((t) => {
      const s = (t * 0.7) % 1;
      drop.position.set(2.9 - s * 0.68, 0.28 + Math.sin(s * Math.PI) * 0.5, -3.4 + s * 0.3);
      drop.scale.y = 1 - Math.sin(s * Math.PI) * 0.25;
    });
  },

  'borrowed-eyes'(K) {
    // the menagerie is IN: frog, bee, goldfish, and a bat on the rail
    // the frog, hopping a lazy circuit
    const frogG = new THREE.Group(); K.g.add(frogG);
    const F = kit(frogG), green = paint(0x6f9a4c, { hatch: 0.4 });
    F.put(new THREE.SphereGeometry(0.1, 10, 8).scale(1.15, 0.8, 1.3), green, 0, 0.09, 0);
    for (const s of [-1, 1]) {
      F.put(new THREE.SphereGeometry(0.035, 8, 6), green, s * 0.055, 0.17, 0.06);
      F.put(new THREE.SphereGeometry(0.016, 6, 5), paint(0x2a2230, { hatch: 0 }), s * 0.055, 0.18, 0.085);
      F.put(new THREE.SphereGeometry(0.045, 7, 6).scale(1.4, 0.6, 1), green, s * 0.1, 0.045, -0.04);
    }
    ink(frogG, 'fine');
    frogG.add(blobShadow(0.12));
    LIVE.push((t) => {
      const s = (t * 0.35) % 1, a = Math.floor(t * 0.35) * 1.3;
      const hop = Math.max(0, Math.sin(s * Math.PI * 3)) * 0.22;
      frogG.position.set(-1.6 + Math.cos(a) * 1.1 + Math.cos(a + 1.3) * s * 0.9, hop, -2.1 + Math.sin(a) * 0.9 + Math.sin(a + 1.3) * s * 0.7);
      frogG.rotation.y = a + 1.3 + Math.PI / 2;
      frogG.scale.y = 1 - (hop > 0.01 ? 0 : Math.abs(Math.sin(t * 6)) * 0.1);
    });
    // the bee, figure-eighting round the room
    const beeG = new THREE.Group(); K.g.add(beeG);
    const BB = kit(beeG);
    BB.put(new THREE.SphereGeometry(0.05, 8, 7).scale(1.4, 1, 1), paint(0xe4b84f, { hatch: 0 }), 0, 0, 0);
    BB.box(0.02, 0.09, 0.09, paint(0x2a2230, { hatch: 0 }), 0.01, 0, 0, 0.006);
    BB.box(0.02, 0.09, 0.09, paint(0x2a2230, { hatch: 0 }), -0.035, 0, 0, 0.006);
    const wingL = BB.put(new THREE.CircleGeometry(0.05, 8), paint(0xffffff, { hatch: 0, opacity: 0.6 }), 0, 0.05, 0.03, [0.5, 0, 0]);
    const wingR = BB.put(new THREE.CircleGeometry(0.05, 8), paint(0xffffff, { hatch: 0, opacity: 0.6 }), 0, 0.05, -0.03, [-0.5, 0, 0]);
    wingL.userData.noInk = wingR.userData.noInk = true;
    ink(beeG, 'fine');
    LIVE.push((t) => {
      const a = t * 0.8;
      beeG.position.set(Math.sin(a) * 2.4, 1.3 + Math.sin(t * 2.3) * 0.25, -2.6 + Math.sin(a * 2) * 1.3);
      beeG.rotation.y = Math.atan2(Math.cos(a) * 2.4, Math.cos(a * 2) * 2.6) + Math.PI / 2;
      wingL.rotation.x = 0.5 + Math.sin(t * 40) * 0.5;
      wingR.rotation.x = -0.5 - Math.sin(t * 40) * 0.5;
    });
    // the goldfish bowl on its own stand
    const standG = kit(new THREE.Group()); standG.g.position.set(-3.2, 0, -1.3);
    standG.put(new THREE.CylinderGeometry(0.12, 0.16, 0.8, 10), paint(PAL.bark), 0, 0.4, 0);
    standG.put(new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0.6, Math.PI - 0.6).scale(1, 0.9, 1), paint(0xcfe6ef, { opacity: 0.4, hatch: 0 }), 0, 1.05, 0).userData.noInk = true;
    standG.put(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 16), paint(0x8fc3c9, { opacity: 0.75, hatch: 0 }), 0, 1.1, 0).userData.noInk = true;
    ink(standG.g, 'fine');
    K.g.add(standG.g);
    const fish = kit(new THREE.Group());
    fish.put(new THREE.SphereGeometry(0.05, 8, 7).scale(1.5, 1, 0.8), paint(0xf0a040, { hatch: 0 }), 0, 0, 0);
    fish.put(new THREE.ConeGeometry(0.035, 0.07, 6), paint(0xe8604c, { hatch: 0 }), -0.09, 0, 0, [0, 0, Math.PI / 2]);
    ink(fish.g, 'fine');
    K.g.add(fish.g);
    LIVE.push((t) => {
      const a = t * 1.6;
      fish.g.position.set(-3.2 + Math.cos(a) * 0.14, 1.03 + Math.sin(t * 2.7) * 0.04, -1.3 + Math.sin(a) * 0.14);
      fish.g.rotation.y = -a;
    });
    // the bat, asleep on the picture rail (it stretches now and then)
    const batG = new THREE.Group(); batG.position.set(2.2, 2.05, -D + 0.6);
    const BT = kit(batG);
    BT.put(new THREE.SphereGeometry(0.07, 8, 7).scale(0.9, 1.3, 0.9), paint(0x4a4258, { hatch: 0.4 }), 0, -0.1, 0);
    for (const s of [-1, 1]) BT.put(new THREE.ConeGeometry(0.02, 0.05, 5), paint(0x4a4258), s * 0.03, -0.2, 0, [Math.PI, 0, 0]);
    const wings = [];
    for (const s of [-1, 1]) {
      const wg = BT.box(0.12, 0.16, 0.015, paint(0x3a3448, { hatch: 0.4 }), s * 0.085, -0.08, 0, 0.005, [0, 0, s * 0.5]);
      wings.push([wg, s]);
    }
    ink(batG, 'fine');
    K.g.add(batG);
    LIVE.push((t) => {
      const stretch = Math.max(0, Math.sin(t * 0.4) - 0.92) * 12;
      for (const [wg, s] of wings) wg.rotation.z = s * (0.5 - stretch * 0.45);
      batG.scale.y = 1 + Math.sin(t * 1.1) * 0.02;        // breathing
    });
  },

  library(K) {
    // the stacks overflow: book piles, an open book, the shop cat asleep
    const tagCols2 = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0x93abc0, 0xa8b994];
    for (const [px, pz, n] of [[-3.3, -2.0, 5], [3.3, -3.3, 4], [0.5, -1.1, 3]]) {
      for (let i = 0; i < n; i++)
        K.box(0.34 - i * 0.02, 0.07, 0.26, paint(tagCols2[(i + Math.abs(Math.round(px * 3))) % tagCols2.length]), px + Math.sin(i * 9 + px) * 0.03, 0.035 + i * 0.072, pz, 0.012, [0, i * 0.4 - 0.4, 0]);
    }
    // an open book, face up mid-read
    for (const s of [-1, 1]) K.box(0.2, 0.015, 0.3, paint(0xfbf6ea), -0.6 + s * 0.1, 0.03, -2.6, 0.005, [0, 0.9, s * 0.12]);
    K.box(0.42, 0.012, 0.32, paint(0x8e2f3a), -0.6, 0.016, -2.6, 0.005, [0, 0.9, 0]);
    // the library cat, curled on the middle shelf, fast asleep
    const catG = new THREE.Group(); catG.position.set(0.55, 1.12, -D + 0.75);
    const LC = kit(catG), fur = paint(0xe09a52, { hatch: 0.4 });
    LC.put(new THREE.SphereGeometry(0.13, 12, 10).scale(1.25, 0.65, 1.1), fur, 0, 0.08, 0);
    LC.put(new THREE.SphereGeometry(0.075, 10, 8), paint(0xd98a40, { hatch: 0.4 }), 0.12, 0.1, 0.05);
    for (const s of [-1, 1]) LC.put(new THREE.ConeGeometry(0.025, 0.05, 6), paint(0xd98a40), 0.12 + s * 0.04, 0.17, 0.04);
    const tail2 = LC.put(new THREE.TorusGeometry(0.1, 0.022, 6, 14, Math.PI * 1.3), paint(0xd98a40, { hatch: 0.4 }), -0.05, 0.03, 0.06, [Math.PI / 2, 0, 0.5]);
    ink(catG, 'fine');
    K.g.add(catG);
    // zzz rising off the cat
    const zs = [];
    for (let i = 0; i < 3; i++) {
      const z = K.flat(0.1 + i * 0.03, 0.1 + i * 0.03, texMat(48, 48, (c, w, h) => {
        c.strokeStyle = '#5a4e5e'; c.lineWidth = 6; c.lineJoin = 'round';
        c.beginPath(); c.moveTo(8, 10); c.lineTo(w - 8, 10); c.lineTo(8, h - 10); c.lineTo(w - 8, h - 10); c.stroke();
      }), 0, 0, 0);
      zs.push(z);
    }
    LIVE.push((t) => {
      catG.scale.y = 1 + Math.sin(t * 1.3) * 0.03;
      zs.forEach((z, i) => {
        const s = ((t * 0.25 + i / 3) % 1);
        z.position.set(0.75 + s * 0.25, 1.35 + s * 0.55, -D + 0.85);
        z.material.opacity = 1 - s;
        z.material.transparent = true;
        z.rotation.z = Math.sin(t + i) * 0.2;
      });
    });
    // the rolling ladder actually rolls now — rebuilt here so it can move
    const lad2 = kit(new THREE.Group()); lad2.g.rotation.z = 0.18;
    const wood2 = paint(0x8a6448);
    for (const s of [-1, 1]) lad2.box(0.05, 2.3, 0.05, wood2, s * 0.2, 1.15, 0, 0.012);
    for (let r = 0; r < 6; r++) lad2.box(0.4, 0.04, 0.04, wood2, 0, 0.3 + r * 0.36, 0, 0.01);
    ink(lad2.g, 'fine');
    K.g.add(lad2.g);
    LIVE.push((t) => { lad2.g.position.set(-1.4 + Math.sin(t * 0.22) * 1.7, 0, -D + 1.05); });
  },
};

// ─── FURNISHING: every room reads as a lived-in shop, not a bare box ────────
const ACCENT = {
  charterscope: 0x3f5872, 'inbox-zero': 0xc23f36, yarnflow: 0x8f7ae8, deckgpt: 0xb03a30,
  splatform: 0xe8604c, 'borrowed-eyes': 0x2f5a52, gallery: 0x6a4a8a, library: 0x8e2f3a,
};
function furnish(K, id, wallHex) {
  const acc = ACCENT[id] ?? 0x8a6448, trim = paint(0xfffaf0);
  const panel = paint(new THREE.Color(wallHex).multiplyScalar(0.84).getHex(), { hatch: 0.5 });
  // wainscot: a darker lower panel and a chair rail round all three walls
  K.box(W - 0.1, 0.9, 0.03, panel, 0, 0.45, -D + 0.52, 0.01);
  K.box(W - 0.1, 0.05, 0.06, trim, 0, 0.92, -D + 0.54, 0.015);
  for (const s of [-1, 1]) {
    K.box(0.03, 0.9, D - 0.1, panel, s * (W / 2 - 0.02), 0.45, -D / 2 + 0.5, 0.01);
    K.box(0.06, 0.05, D - 0.1, trim, s * (W / 2 - 0.04), 0.92, -D / 2 + 0.5, 0.015);
  }
  // two pendant lamps over the floor
  const cord = paint(0x2a2230, { hatch: 0 }), shade = paint(acc), bulb = paint(0xfff1c8, { emissive: 0xffd98a, hatch: 0 });
  for (const x of [-1.7, 1.7]) {
    K.put(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6), cord, x, 2.95, -2.0).userData.noInk = true;
    const sh = K.put(new THREE.LatheGeometry([[0.03, 0], [0.06, 0.02], [0.2, -0.16], [0.22, -0.2], [0.03, 0.0]].map(([a, b]) => new THREE.Vector2(a, b)), 20), shade, x, 2.7, -2.0);
    sh.material = paint(acc, { side: THREE.DoubleSide });
    K.put(new THREE.SphereGeometry(0.06, 12, 10), bulb, x, 2.53, -2.0).userData.noInk = true;
  }
  // potted plants in the front corners
  const pot = paint(PAL.terracotta);
  for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.45), z = -0.25;
    K.put(new THREE.LatheGeometry([[0.001, 0], [0.18, 0], [0.24, 0.36], [0.27, 0.38], [0.001, 0.38]].map(([a, b]) => new THREE.Vector2(a, b)), 18), pot, x, 0, z);
    const b = bush(0.55); b.position.set(x, 0.32, z); K.g.add(b);
    K.cols.push({ x0: x - 0.3, x1: x + 0.3, z0: z - 0.3, z1: z + 0.3 });
  }
  // a wall shelf of knick-knacks on each side wall, toward the back
  if (id !== 'gallery') for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.13), z = -4.55, y = 1.35, wood = paint(0x8a6448);
    K.box(0.24, 0.04, 1.0, wood, x, y, z, 0.01);
    for (const dz of [-0.4, 0.4]) K.box(0.18, 0.12, 0.03, wood, x + s * 0.02, y - 0.08, z + dz, 0.008);
    const cols = [acc, PAL.gold, PAL.teal, PAL.rose, 0xf6eedb];
    for (let i = 0; i < 3; i++) K.box(0.14, 0.2 + (i % 2) * 0.04, 0.05, paint(cols[i]), x, y + 0.12 + (i % 2) * 0.02, z - 0.38 + i * 0.06, 0.01);
    K.put(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 12), paint(0xcfe6ef, { opacity: 0.85, hatch: 0 }), x, y + 0.09, z + 0.05);
    K.put(new THREE.LatheGeometry([[0.001, 0], [0.05, 0], [0.065, 0.1], [0.001, 0.1]].map(([a, b]) => new THREE.Vector2(a, b)), 12), pot, x, y + 0.02, z + 0.32);
    const sp = bush(0.14); sp.position.set(x, y + 0.11, z + 0.32); K.g.add(sp);
  }
  // a small framed print by the door on each side wall
  if (id !== 'gallery') for (const s of [-1, 1]) {
    const x = s * (W / 2 - 0.05), ry = -s * Math.PI / 2;
    const fr = new THREE.Group(); fr.position.set(x, 1.55, -0.6); fr.rotation.y = ry;
    const F = kit(fr), gold = paint(PAL.gold);
    F.box(0.52, 0.04, 0.03, gold, 0, 0.32, 0); F.box(0.52, 0.04, 0.03, gold, 0, -0.32, 0);
    F.box(0.04, 0.64, 0.03, gold, -0.25, 0, 0); F.box(0.04, 0.64, 0.03, gold, 0.25, 0, 0);
    F.flat(0.46, 0.6, texMat(120, 156, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#' + new THREE.Color(acc).getHexString(); c.globalAlpha = 0.8;
      c.beginPath(); c.arc(w * (s < 0 ? 0.4 : 0.6), h * 0.42, w * 0.28, 0, 7); c.fill();
      c.globalAlpha = 0.6; c.fillStyle = '#e4b84f'; c.fillRect(w * 0.15, h * 0.68, w * 0.7, h * 0.12);
    }), 0, 0, 0.018);
    K.g.add(fr);
  }
}

// one centrepiece per room in the open floor, tied to what the app does
const CENTER = {
  charterscope(K) {     // a globe on a reading table: the competition, worldwide
    const x = -2.0, z = -1.7, wood = paint(0x6b4a34);
    K.put(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 24), wood, x, 0.72, z);
    K.put(new THREE.CylinderGeometry(0.05, 0.08, 0.7, 10), wood, x, 0.36, z);
    K.put(new THREE.CylinderGeometry(0.22, 0.26, 0.04, 16), wood, x, 0.02, z);
    const globe = new THREE.Group(); globe.position.set(x, 1.05, z); globe.rotation.z = 0.4; K.g.add(globe);
    const sea = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), paint(0xffffff, { map: canvasTex(128, 64, (c, w, h) => {
      c.fillStyle = '#8fc3c9'; c.fillRect(0, 0, w, h); c.fillStyle = '#a8b994';
      for (const [px, py, r] of [[20, 22, 12], [40, 40, 9], [70, 18, 14], [95, 34, 11], [110, 50, 6], [60, 50, 7]]) { c.beginPath(); c.ellipse(px, py, r, r * 0.7, 0.3, 0, 7); c.fill(); }
    }), hatch: 0 }));
    globe.add(sea);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.012, 6, 32, Math.PI * 1.4), paint(PAL.gold)); ring.rotation.z = -0.9; globe.add(ring);
    K.put(new THREE.CylinderGeometry(0.03, 0.06, 0.12, 10), paint(PAL.gold), x, 0.8, z);
    LIVE.push((t) => { sea.rotation.y = t * 0.4; });
    K.cols.push({ x0: x - 0.45, x1: x + 0.45, z0: z - 0.45, z1: z + 0.45 });
  },
  'inbox-zero'(K) {     // the sorting table: todo / waiting / done trays, letters in each
    const x = 2.3, z = -1.55, wood = paint(0x8a6448);
    K.box(1.5, 0.06, 0.7, wood, x, 0.75, z, 0.02);
    for (const [dx, dz] of [[-0.68, -0.3], [0.68, -0.3], [-0.68, 0.3], [0.68, 0.3]]) K.box(0.06, 0.74, 0.06, wood, x + dx, 0.37, z + dz, 0.015);
    [['todo', 0xe8604c, 4], ['waiting', 0xe4b84f, 2], ['done', 0x7fb3a8, 5]].forEach(([label, col, n], i) => {
      const tx = x - 0.48 + i * 0.48;
      K.box(0.4, 0.06, 0.5, paint(col), tx, 0.81, z, 0.01);
      for (let k = 0; k < n; k++) K.box(0.3, 0.012, 0.2, paint(0xf6eedb), tx, 0.85 + k * 0.014, z + 0.04, 0.003, [0, (k % 3 - 1) * 0.12, 0]);
      K.flat(0.36, 0.09, texMat(128, 32, (c, w, h) => { c.fillStyle = '#' + new THREE.Color(col).getHexString(); c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `700 22px ${HAND}`; c.textAlign = 'center'; c.fillText(label, w / 2, 24); }), tx, 0.8, z + 0.256);
    });
    K.cols.push({ x0: x - 0.8, x1: x + 0.8, z0: z - 0.4, z1: z + 0.4 });
  },
  deckgpt(K) {          // a popcorn cart by the door
    const x = -2.9, z = -1.3;
    K.box(0.7, 0.75, 0.5, paint(0xb03a30), x, 0.45, z, 0.04);
    K.box(0.76, 0.05, 0.56, paint(PAL.gold), x, 0.85, z, 0.015);
    K.box(0.6, 0.45, 0.42, paint(0xcfe6ef, { opacity: 0.5, hatch: 0 }), x, 1.1, z, 0.03).userData.noInk = true;
    for (let i = 0; i < 18; i++) K.put(new THREE.SphereGeometry(0.035, 7, 6), paint(0xf3e3b8), x - 0.22 + (i % 6) * 0.09, 0.92 + Math.floor(i / 6) * 0.05, z - 0.12 + (i % 3) * 0.1).userData.noInk = true;
    K.box(0.76, 0.06, 0.56, paint(0xb03a30), x, 1.36, z, 0.02);
    for (const sx of [-0.25, 0.25]) K.put(new THREE.TorusGeometry(0.1, 0.025, 8, 16), paint(0x2a2230, { hatch: 0 }), x + sx, 0.1, z + 0.27);
    K.cols.push({ x0: x - 0.4, x1: x + 0.4, z0: z - 0.3, z1: z + 0.3 });
  },
  splatform(K) {        // the artist's palette table, brushes in a jar
    const x = 0.9, z = -1.7, wood = paint(0x8a6448);
    K.put(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 24), wood, x, 0.7, z);
    K.put(new THREE.CylinderGeometry(0.05, 0.08, 0.68, 10), wood, x, 0.34, z);
    const pal = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.025, 28), paint(0xe2c79a)); pal.scale.set(1.2, 1, 0.85); pal.position.set(x, 0.74, z); K.g.add(pal);
    [[0xe8604c, -0.2, -0.1], [0xe4b84f, -0.05, -0.17], [0x7fb3a8, 0.12, -0.14], [0x8f7ae8, 0.22, 0.02], [0x5f8cc8, 0.05, 0.12]].forEach(([col, dx, dz]) => {
      const d = K.put(new THREE.SphereGeometry(0.05, 10, 8), paint(col), x + dx, 0.755, z + dz); d.scale.y = 0.4; d.userData.noInk = true;
    });
    K.put(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 12), paint(0xcfe6ef, { opacity: 0.8, hatch: 0 }), x - 0.25, 0.81, z + 0.15).userData.noInk = true;
    for (let i = 0; i < 4; i++) K.put(new THREE.CylinderGeometry(0.008, 0.01, 0.32, 6), paint(PAL.bark), x - 0.25 + (i - 1.5) * 0.02, 0.92, z + 0.15, [0, 0, (i - 1.5) * 0.15]);
    K.cols.push({ x0: x - 0.45, x1: x + 0.45, z0: z - 0.45, z1: z + 0.45 });
  },
  'borrowed-eyes'(K) {  // a giant eye under a glass dome, looking around the room
    const x = 1.6, z = -1.8, wood = paint(0x4a4258);
    K.put(new THREE.CylinderGeometry(0.22, 0.28, 0.8, 16), wood, x, 0.4, z);
    K.put(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 20), paint(PAL.gold), x, 0.82, z);
    const eye = new THREE.Group(); eye.position.set(x, 1.05, z); K.g.add(eye);
    eye.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 24, 18), paint(0xfbf8f1, { hatch: 0 })));
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 14), paint(0x5f9a6a, { hatch: 0 })); iris.scale.z = 0.4; iris.position.z = 0.15; iris.userData.noInk = true; eye.add(iris);
    const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.045, 14, 10), paint(0x111014, { hatch: 0 })); pupil.scale.z = 0.4; pupil.position.z = 0.175; pupil.userData.noInk = true; eye.add(pupil);
    const dome = K.put(new THREE.SphereGeometry(0.26, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xdff0f6, { opacity: 0.28, hatch: 0, side: THREE.DoubleSide }), x, 0.85, z); dome.userData.noInk = true;
    LIVE.push((t) => { eye.rotation.y = 0.9 * Math.sin(t * 0.5) + 0.25 * Math.sin(t * 1.7); eye.rotation.x = 0.25 * Math.sin(t * 0.8); });
    K.cols.push({ x0: x - 0.35, x1: x + 0.35, z0: z - 0.35, z1: z + 0.35 });
  },
  gallery(K) {          // a museum bench to sit and look
    const x = -1.2, z = -1.6;
    K.box(1.4, 0.12, 0.45, paint(0x6a4a8a), x, 0.44, z, 0.05);
    K.box(1.3, 0.3, 0.38, paint(0x2a2230, { hatch: 0 }), x, 0.2, z, 0.03);
    K.cols.push({ x0: x - 0.75, x1: x + 0.75, z0: z - 0.3, z1: z + 0.3 });
  },
  library(K) {          // a reading table with a green banker's lamp and a chair
    const x = 2.2, z = -1.5, wood = paint(0x6b4a34);
    K.box(1.1, 0.06, 0.65, wood, x, 0.74, z, 0.02);
    for (const [dx, dz] of [[-0.5, -0.27], [0.5, -0.27], [-0.5, 0.27], [0.5, 0.27]]) K.box(0.06, 0.72, 0.06, wood, x + dx, 0.36, z + dz, 0.015);
    K.put(new THREE.CylinderGeometry(0.07, 0.09, 0.03, 12), paint(PAL.gold), x - 0.3, 0.79, z - 0.12);
    K.put(new THREE.CylinderGeometry(0.012, 0.012, 0.25, 6), paint(PAL.gold), x - 0.3, 0.92, z - 0.12);
    const sh = K.put(new THREE.CylinderGeometry(0.12, 0.12, 0.24, 16, 1, false, 0, Math.PI), paint(0x2f6f4a, { side: THREE.DoubleSide }), x - 0.3, 1.06, z - 0.12, [0, 0, Math.PI / 2]);
    K.put(new THREE.SphereGeometry(0.04, 10, 8), paint(0xfff1c8, { emissive: 0xffd98a, hatch: 0 }), x - 0.3, 1.02, z - 0.12).userData.noInk = true;
    for (const s of [-1, 1]) K.box(0.18, 0.012, 0.26, paint(0xfbf6ea), x + 0.12 + s * 0.09, 0.78, z + 0.05, 0.004, [0, 0, s * 0.12]);
    K.box(0.42, 0.06, 0.4, paint(0x8e2f3a), x, 0.46, z + 0.62, 0.03);
    K.box(0.42, 0.45, 0.06, paint(0x8e2f3a), x, 0.72, z + 0.82, 0.03);
    for (const [dx, dz] of [[-0.18, 0.45], [0.18, 0.45], [-0.18, 0.8], [0.18, 0.8]]) K.box(0.04, 0.44, 0.04, wood, x + dx, 0.22, z + dz, 0.01);
    K.cols.push({ x0: x - 0.6, x1: x + 0.6, z0: z - 0.35, z1: z + 0.85 });
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
    K.cols = [];
    roomShell(K, ROOM_WALL[place.id] ?? 0xe8ddc2, place);
    furnish(K, place.id, ROOM_WALL[place.id] ?? 0xe8ddc2);
    CENTER[place.id]?.(K);
    EXTRA[place.id]?.(K);
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
        ...K.cols.map(c => ({ x0: ox + c.x0, x1: ox + c.x1, z0: oz + c.z0, z1: oz + c.z1 })),
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
