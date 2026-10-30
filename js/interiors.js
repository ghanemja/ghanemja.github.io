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
const LIVE = [];                            // per-frame animations: f(t), local room coords
export function tickInteriors(t) {
  for (const f of LIVE) f(t);
}
function shotMat(url, clip, aspect = 1.6) {
  const crop = (tex, iw, ih) => {
    const ia = iw / ih;
    if (ia > aspect) { tex.repeat.set(aspect / ia, 1); tex.offset.set((1 - aspect / ia) / 2, 0); }
    else { tex.repeat.set(1, ia / aspect); tex.offset.set(0, 1 - ia / aspect); }     // keep the top of the page
  };
  const t = _loader.load(url, (tx) => crop(tx, tx.image.width, tx.image.height));
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  const m = new THREE.MeshBasicMaterial({ map: t, toneMapped: false });
  if (clip) {
    const v = document.createElement('video');
    v.muted = true; v.loop = true; v.playsInline = true; v.autoplay = true;
    v.src = clip; v.crossOrigin = 'anonymous';
    const swap = () => {
      const vt = new THREE.VideoTexture(v);
      vt.colorSpace = THREE.SRGBColorSpace;
      crop(vt, v.videoWidth, v.videoHeight);
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
  F.box(w + 0.06, h + 0.06, 0.03, paint(0x2a2230, { hatch: 0 }), 0, 0, -0.01, 0.01);
  F.flat(w, h, shotMat(url, clip, w / h), 0, 0, 0.012);
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
// the app's screen fills the middle of the back wall
const SCR_W = 3.44, SCR_H = 2.15, SCR_Y = 1.15;
// the plaque and the counter stand off to the sides, out of its way
const PLQ_X = -2.9, CTR_X = 2.9;
function roomShell(K, wallHex, place, theme) {
  const wall = paint(wallHex, { hatch: 0.6 }), trim = paint(0xfffaf0);
  const tm = themeMats(theme, place.id);
  const floor = K.flat(W, D, tm?.floor || plankMat(), 0, 0, -D / 2 + 0.5, [-Math.PI / 2, 0, 0]);
  floor.userData.noInk = true;
  // walls: single-sided planes, invisible from outside so the camera roams free
  K.flat(W, H, tm?.walls[0] || wall, 0, H / 2, -D + 0.5);                                    // back
  K.flat(D, H, tm?.walls[1] || wall, -W / 2, H / 2, -D / 2 + 0.5, [0, Math.PI / 2, 0]);      // west
  K.flat(D, H, tm?.walls[2] || wall, W / 2, H / 2, -D / 2 + 0.5, [0, -Math.PI / 2, 0]);      // east
  // skirting + picture rail, real boxes so they take ink
  if (!theme?.bare) {
    K.box(W, 0.12, 0.05, trim, 0, 0.06, -D + 0.53);
    for (const s of [-1, 1]) K.box(0.05, 0.12, D, trim, s * (W / 2 - 0.026), 0.06, -D / 2 + 0.5);
    K.box(W, 0.045, 0.04, trim, 0, 2.08, -D + 0.53);
  }
  // the shop's name over the back wall
  K.flat(2.1, 0.35, texMat(768, 128, (c, w, h) => {
    // a paper banner behind the lettering, so it reads on any wallpaper
    c.fillStyle = '#f6efdf'; c.strokeStyle = INKC; c.lineWidth = 5;
    c.beginPath(); c.roundRect(w * 0.12, 6, w * 0.76, h - 12, 22); c.fill(); c.stroke();
    c.font = `700 ${h * 0.62}px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(place.title, w / 2, h * 0.38);
    c.font = `400 ${h * 0.26}px ${HAND}`; c.fillStyle = '#5a4e5e';
    c.fillText('— ' + place.trade + ' —', w / 2, h * 0.8);
  }), 0, 2.4, -D + 0.68);
  // a rug
  if (theme?.rug !== false) {
  const rug = K.flat(2.6, 1.7, texMat(256, 160, (c, w, h) => {
    const base = new THREE.Color(wallHex).lerp(new THREE.Color(0x8a6448), 0.35);
    c.fillStyle = '#' + base.getHexString(); c.fillRect(0, 0, w, h);
    c.strokeStyle = '#fffaf0'; c.lineWidth = 6; c.strokeRect(12, 12, w - 24, h - 24);
    c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6);
  }), 0, 0.015, -D / 2 + 0.35, [-Math.PI / 2, 0, 0]);
  rug.renderOrder = 1;
  }
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
    K.flat(1.6, 1.03, texMat(512, 330, (c, w, h) => {
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
    }), -3.05, 1.8, -D + 0.56, [0, 0.0, 0]);
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
    K.flat(1.75, 1.06, texMat(560, 340, (c, w, h) => {
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
    }), 3.0, 1.85, -D + 0.56);
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
    }), 3.05, 1.85, -D + 0.56);
    // a basket with needles
    K.put(new THREE.CylinderGeometry(0.3, 0.22, 0.3, 12, 1, true), paint(0xc8a47c, { side: THREE.DoubleSide }), 1.1, 0.15, -D + 1.1);
    for (const a of [-0.3, 0.1, 0.5]) K.box(0.025, 0.85, 0.025, paint(0x6b4a34), 1.1 + a * 0.3, 0.5, -D + 1.1, 0.008, [0, 0, a]);
  },
  deckgpt(K) {
    // the silver screen, playing the app
    K.box(SCR_W + 0.3, SCR_H + 0.2, 0.08, paint(0x2a2230, { hatch: 0 }), 0, SCR_Y, -D + 0.62, 0.03);
    K.flat(SCR_W, SCR_H, shotMat('screenshots/pptgpt.png', null, SCR_W / SCR_H), 0, SCR_Y, -D + 0.67);
    // red curtains either side
    for (const s of [-1, 1]) {
      const cur = K.put(new THREE.CylinderGeometry(0.22, 0.26, 2.2, 10), paint(0xb03a30), s * (SCR_W / 2 + 0.3), 1.25, -D + 0.68);
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
      const x = [-2.6, -1.9, 2.6][i], z = -D + (i === 1 ? 3.0 : 1.0);
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
      const x = [-3.45, -2.55, 3.05][i], y = 1.9;
      K.put(new THREE.TorusGeometry(0.34, 0.045, 10, 28), paint(PAL.gold), x, y, -D + 0.58, [0, 0, 0]);
      const face = K.flat(0.8, 0.66, texMat(200, 164, draw), x, y, -D + 0.57);
      face.geometry = new THREE.CircleGeometry(0.32, 28);
      K.flat(0.7, 0.18, texMat(256, 64, (c, w, h) => {
        c.font = `400 ${h * 0.62}px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.fillText('the ' + name + "'s", w / 2, h / 2);
      }), x, y - 0.47, -D + 0.57);
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
    hang('a2', 0.9, 2.65, 2.05, -D + 0.56, 0, 0.06);
    hang('a9', 1.1, 2.75, 1.05, -D + 0.56, 0, -0.04);
    hang('a11', 0.55, 3.62, 1.95, -D + 0.56, 0, 0.09);
    hang('a5', 0.85, -2.75, 2.05, -D + 0.56, 0, -0.07);
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
      brushG.position.set(-1.9 + s * 0.28, 1.12 + Math.abs(Math.cos(t * 2.8)) * 0.06, -D + 3.1);
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
function furnish(K, id, wallHex, theme) {
  if (theme?.bare) return;
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
    const x = 1.6, z = -1.8, wood = paint(0x7a5a40, { hatch: 0.6 });   // a tree stump
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

// ─── THEMES: every room gets its own walls and floor, not one shop fitted out eight ways ───
// wallpaper/floor painters draw one seamless tile (or a whole mural) onto a canvas;
// `env` builds what makes the room a place — a forest, a cinema, a post office.
const rng = (s) => () => ((s = (s * 16807) % 2147483647) / 2147483647);
// draw a scattered element so it wraps across the tile edges seamlessly
const wrap9 = (w, h, fn) => { for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) fn(ox, oy); };
function splat(c, x, y, r, col, R) {
  c.fillStyle = col;
  c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
  for (let i = 0; i < 9; i++) {
    const a = R() * 7, d = r * (0.9 + R() * 1.4), rr = r * (0.08 + R() * 0.28);
    c.beginPath(); c.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, rr, 0, 7); c.fill();
  }
}
function planksDraw(c, w, h, cols, n, seam = 'rgba(40,24,16,0.4)') {
  const ph = h / n;
  for (let i = 0; i < n; i++) {
    c.fillStyle = cols[i % cols.length]; c.fillRect(0, i * ph, w, ph);
    c.strokeStyle = seam; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, i * ph + ph - 1); c.lineTo(w, i * ph + ph - 1); c.stroke();
    const off = (i % 2) * w / 2 + w / 4;
    c.beginPath(); c.moveTo(off % w, i * ph); c.lineTo(off % w, i * ph + ph); c.stroke();
    c.strokeStyle = 'rgba(40,24,16,0.12)'; c.lineWidth = 1;
    for (let k = 0; k < 3; k++) { const y = i * ph + ph * (0.25 + k * 0.25); c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + 3, w * 0.6, y - 3, w, y); c.stroke(); }
  }
}
function basketweave(c, w, h, cols) {
  const cell = w / 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
    const vert = (i + j) % 2, x = i * cell, y = j * cell;
    for (let k = 0; k < 3; k++) {
      c.fillStyle = cols[(i * 3 + j * 5 + k) % cols.length];
      if (vert) c.fillRect(x + k * cell / 3, y, cell / 3, cell); else c.fillRect(x, y + k * cell / 3, cell, cell / 3);
      c.strokeStyle = 'rgba(40,24,16,0.35)'; c.lineWidth = 1.5;
      if (vert) c.strokeRect(x + k * cell / 3, y, cell / 3, cell); else c.strokeRect(x, y + k * cell / 3, cell, cell / 3);
    }
  }
}
// the forest painted round the walls: sky, three layers of trees, big leaves in front
function forestMural(c, w, h, seed) {
  const R = rng(seed);
  const sky = c.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#fbeec0'); sky.addColorStop(0.45, '#e3efc9'); sky.addColorStop(1, '#b9d6a8');
  c.fillStyle = sky; c.fillRect(0, 0, w, h);
  // sun haze
  const sun = c.createRadialGradient(w * (0.3 + R() * 0.4), h * 0.12, 4, w * 0.5, h * 0.12, w * 0.4);
  sun.addColorStop(0, 'rgba(255,248,214,0.9)'); sun.addColorStop(1, 'rgba(255,248,214,0)');
  c.fillStyle = sun; c.fillRect(0, 0, w, h);
  const layers = [['#a7c9a0', 0.42, 0.09], ['#7eaf7f', 0.55, 0.12], ['#5a8f63', 0.7, 0.15]];
  layers.forEach(([col, base, rad], L) => {
    // trunks
    c.fillStyle = ['#a99c86', '#8a7a62', '#6b5a44'][L];
    for (let x = R() * 60; x < w; x += 70 + R() * 90) c.fillRect(x, h * (base - 0.05), 6 + L * 5, h);
    c.fillStyle = col;
    for (let x = -20; x < w + 40; x += h * rad * (0.7 + R() * 0.6)) {
      const r = h * rad * (0.7 + R() * 0.7), y = h * base - R() * h * 0.1;
      c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      c.strokeStyle = 'rgba(42,34,48,0.18)'; c.lineWidth = 2;
      c.beginPath(); c.arc(x, y, r, Math.PI * 1.05, Math.PI * 1.9); c.stroke();
    }
    c.fillRect(0, h * base, w, h);
  });
  // light shafts
  c.fillStyle = 'rgba(255,250,220,0.22)';
  for (let i = 0; i < 4; i++) { const x = R() * w; c.beginPath(); c.moveTo(x, 0); c.lineTo(x + 40, 0); c.lineTo(x + 160, h); c.lineTo(x + 70, h); c.fill(); }
  // big foreground leaves along the bottom
  for (let x = -30; x < w + 30; x += 26 + R() * 30) {
    const len = h * (0.18 + R() * 0.22), a = -Math.PI / 2 + (R() - 0.5) * 1.3;
    c.save(); c.translate(x, h + 6); c.rotate(a + Math.PI / 2);
    c.fillStyle = ['#3f7a4c', '#4f8f58', '#2f6a44', '#5e9d5e'][Math.floor(R() * 4)];
    c.beginPath(); c.ellipse(0, -len / 2, len * 0.22, len / 2, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(230,245,210,0.5)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -len * 0.95); c.stroke();
    c.restore();
  }
  // flowers dotted in the undergrowth
  for (let i = 0; i < 40; i++) {
    const x = R() * w, y = h * (0.72 + R() * 0.25), r = 3 + R() * 4;
    c.fillStyle = ['#f29bb4', '#f6c453', '#ffffff', '#e8604c', '#b7a3e6'][i % 5];
    for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.26) * r, y + Math.sin(p * 1.26) * r, r * 0.7, 0, 7); c.fill(); }
    c.fillStyle = '#f6d36b'; c.beginPath(); c.arc(x, y, r * 0.5, 0, 7); c.fill();
  }
}
function forestFloor(c, w, h) {
  const R = rng(7);
  c.fillStyle = '#86ad62'; c.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = ['rgba(70,120,60,0.35)', 'rgba(170,200,110,0.35)', 'rgba(110,150,70,0.3)'][i % 3];
    c.beginPath(); c.ellipse(R() * w, R() * h, 30 + R() * 70, 20 + R() * 40, R() * 3, 0, 7); c.fill();
  }
  // grass blades
  for (let i = 0; i < 2600; i++) {
    const x = R() * w, y = R() * h, l = 6 + R() * 9;
    c.strokeStyle = R() < 0.5 ? 'rgba(60,110,50,0.55)' : 'rgba(190,220,130,0.55)'; c.lineWidth = 1.6;
    c.beginPath(); c.moveTo(x, y); c.lineTo(x + (R() - 0.5) * 5, y - l); c.stroke();
  }
  // a dirt path winding from the door (bottom) to the counter (top)
  const path = [[0.5, 1.02], [0.44, 0.85], [0.56, 0.68], [0.47, 0.52], [0.5, 0.36]];
  c.strokeStyle = '#c9ad7f'; c.lineWidth = w * 0.11; c.lineCap = 'round';
  c.beginPath(); c.moveTo(path[0][0] * w, path[0][1] * h);
  for (let i = 1; i < path.length; i++) c.lineTo(path[i][0] * w, path[i][1] * h);
  c.stroke();
  c.strokeStyle = 'rgba(120,90,50,0.25)'; c.lineWidth = w * 0.11 + 8; c.globalCompositeOperation = 'destination-over'; c.stroke(); c.globalCompositeOperation = 'source-over';
  // stepping stones along it
  for (let t = 0.05; t < 0.98; t += 0.08) {
    const s = t * (path.length - 1), i = Math.floor(s), f = s - i, a = path[i], b = path[Math.min(i + 1, path.length - 1)];
    const x = (a[0] + (b[0] - a[0]) * f) * w + (R() - 0.5) * 16, y = (a[1] + (b[1] - a[1]) * f) * h;
    c.fillStyle = '#bdb6a8'; c.beginPath(); c.ellipse(x, y, 22 + R() * 8, 15 + R() * 5, R(), 0, 7); c.fill();
    c.strokeStyle = 'rgba(42,34,48,0.5)'; c.lineWidth = 2; c.stroke();
  }
  // clover, daisies, buttercups
  for (let i = 0; i < 220; i++) {
    const x = R() * w, y = R() * h, k = i % 4;
    if (k === 0) { c.fillStyle = 'rgba(70,130,60,0.8)'; for (let p = 0; p < 3; p++) { c.beginPath(); c.arc(x + Math.cos(p * 2.1) * 3, y + Math.sin(p * 2.1) * 3, 3, 0, 7); c.fill(); } }
    else { c.fillStyle = ['#ffffff', '#f6c453', '#f29bb4'][k - 1]; for (let p = 0; p < 5; p++) { c.beginPath(); c.arc(x + Math.cos(p * 1.26) * 3, y + Math.sin(p * 1.26) * 3, 2.2, 0, 7); c.fill(); } c.fillStyle = '#e4a83f'; c.beginPath(); c.arc(x, y, 1.6, 0, 7); c.fill(); }
  }
}

// one crochet stitch: a plump loop standing up from its base, with the V of its top
function stitch(c, x, y, ang, len, wid, col) {
  c.save(); c.translate(x, y); c.rotate(ang);
  c.fillStyle = col; c.strokeStyle = 'rgba(50,25,40,0.55)'; c.lineWidth = 1.4;
  c.beginPath(); c.roundRect(-wid / 2, 0, wid, len, wid / 2); c.fill(); c.stroke();
  c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.2;
  c.beginPath(); c.moveTo(-wid * 0.15, len * 0.2); c.lineTo(-wid * 0.15, len * 0.75); c.stroke();
  c.strokeStyle = 'rgba(50,25,40,0.45)';
  c.beginPath(); c.moveTo(-wid * 0.4, len * 0.82); c.lineTo(0, len * 0.95); c.lineTo(wid * 0.4, len * 0.82); c.stroke();
  c.restore();
}
// a granny square: a ring in the middle, then rounds of three-stitch clusters with
// chain gaps between them, two clusters at each corner, and a single-crochet border
function grannySquare(c, x0, y0, s, cols) {
  const cx = x0 + s / 2, cy = y0 + s / 2, L = s * 0.11, Wd = s * 0.045;
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; stitch(c, cx + Math.cos(a) * s * 0.025, cy + Math.sin(a) * s * 0.025, a - Math.PI / 2, s * 0.06, Wd, cols[0]); }
  const cluster = (x, y, ang, col) => {
    for (const d of [-1, 0, 1]) stitch(c, x + Math.cos(ang) * d * Wd * 0.95, y + Math.sin(ang) * d * Wd * 0.95, ang - Math.PI / 2 + d * 0.12, L, Wd, col);
  };
  for (let k = 1; k <= 3; k++) {
    const r = s * (0.02 + k * 0.115), col = cols[k % cols.length];
    for (let side = 0; side < 4; side++) {
      const out = side * Math.PI / 2;                              // outward normal of this side
      const nx = Math.cos(out), ny = Math.sin(out), tx = -ny, ty = nx;
      // clusters along the side, between the corners
      for (let q = 0; q < k - 1; q++) {
        const u = (-1 + (2 * q + 2) / k) * r * 0.82;
        cluster(cx + nx * r + tx * u, cy + ny * r + ty * u, out + Math.PI / 2, col);
      }
      // the corner: two clusters fanned round it
      const ca = out + Math.PI / 4, cr = r * 1.3;
      for (const f of [-0.32, 0.32]) cluster(cx + Math.cos(ca + f * 0.6) * cr * 0.92, cy + Math.sin(ca + f * 0.6) * cr * 0.92, ca + f + Math.PI / 2, col);
    }
  }
  // a border round of single crochet, then the seam it's whipped to its neighbours with
  const b = s * 0.035, n = 26, edge = cols[3] || '#f6eedb';
  for (let side = 0; side < 4; side++) for (let q = 0; q <= n; q++) {
    const u = b + (s - 2 * b) * q / n;
    const [x, y, ang] = [[x0 + u, y0 + b * 0.4, 0], [x0 + s - b * 0.4, y0 + u, Math.PI / 2], [x0 + s - u, y0 + s - b * 0.4, Math.PI], [x0 + b * 0.4, y0 + s - u, -Math.PI / 2]][side];
    stitch(c, x, y, ang, b * 1.25, s / n * 0.95, edge);
  }
  c.strokeStyle = 'rgba(60,40,50,0.6)'; c.lineWidth = 2; c.setLineDash([5, 4]);
  c.strokeRect(x0 + 1, y0 + 1, s - 2, s - 2); c.setLineDash([]);
}

const THEMES = {
  'borrowed-eyes': { mural: forestMural, floor: forestFloor, bare: true, rug: false },
  charterscope: {
    tile: [512, 2.0, (c, w, h) => {             // an old sea chart
      c.fillStyle = '#eadcb4'; c.fillRect(0, 0, w, h);
      const R = rng(3);
      for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(150,120,70,${R() * 0.08})`; c.beginPath(); c.arc(R() * w, R() * h, 4 + R() * 20, 0, 7); c.fill(); }
      c.strokeStyle = 'rgba(80,110,140,0.25)'; c.lineWidth = 1;
      for (let i = 0; i <= w; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
      // coastlines
      c.fillStyle = '#d6c595'; c.strokeStyle = 'rgba(90,70,50,0.7)'; c.lineWidth = 2;
      for (const [cx, cy, r] of [[90, 380, 70], [400, 120, 55], [330, 430, 35]]) {
        c.beginPath();
        for (let a = 0; a <= 6.3; a += 0.3) { const rr = r * (0.7 + R() * 0.5); a === 0 ? c.moveTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr) : c.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); }
        c.closePath(); c.fill(); c.stroke();
      }
      // rhumb lines and a compass rose
      const ox = 230, oy = 260;
      c.strokeStyle = 'rgba(160,60,50,0.25)';
      for (let k = 0; k < 16; k++) { const a = k * Math.PI / 8; c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a) * 400, oy + Math.sin(a) * 400); c.stroke(); }
      for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4, l = k % 2 ? 26 : 50;
        c.fillStyle = k % 2 ? '#4a6a8a' : '#2a2230';
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a - 0.3) * 10, oy + Math.sin(a - 0.3) * 10); c.lineTo(ox + Math.cos(a) * l, oy + Math.sin(a) * l); c.closePath(); c.fill();
      }
      c.strokeStyle = '#2a2230'; c.lineWidth = 2; c.beginPath(); c.arc(ox, oy, 34, 0, 7); c.stroke();
      // a dotted route
      c.setLineDash([6, 8]); c.strokeStyle = 'rgba(200,80,60,0.6)'; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(0, 470); c.bezierCurveTo(150, 330, 300, 380, 512, 200); c.stroke(); c.setLineDash([]);
    }],
    floor: (c, w, h) => {
      planksDraw(c, w, h, ['#6b4a34', '#74513a', '#62432f', '#7a573e'], 24);
      // a brass compass rose inlaid between the globe and the radar
      const ox = w / 2, oy = h * 0.6, r = h * 0.2;
      c.fillStyle = '#e9dcb4'; c.beginPath(); c.arc(ox, oy, r, 0, 7); c.fill();
      c.strokeStyle = '#c9a24a'; c.lineWidth = 8; c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(ox, oy, r * 0.82, 0, 7); c.stroke();
      for (let k = 0; k < 16; k++) {
        const a = k * Math.PI / 8 - Math.PI / 2, l = r * (k % 4 === 0 ? 0.95 : k % 2 ? 0.45 : 0.68);
        c.fillStyle = k % 2 ? '#3f5872' : (k % 4 ? '#c9a24a' : '#2a2230');
        c.beginPath(); c.moveTo(ox, oy); c.lineTo(ox + Math.cos(a - 0.2) * r * 0.16, oy + Math.sin(a - 0.2) * r * 0.16); c.lineTo(ox + Math.cos(a) * l, oy + Math.sin(a) * l); c.lineTo(ox + Math.cos(a + 0.2) * r * 0.16, oy + Math.sin(a + 0.2) * r * 0.16); c.closePath(); c.fill();
      }
      c.fillStyle = '#2a2230'; c.font = `700 ${r * 0.2}px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('N', ox, oy - r * 1.08 + r * 0.2);
    },
    rug: false,
  },
  'inbox-zero': {
    tile: [256, 0.8, (c, w, h) => {             // envelopes and stamps
      c.fillStyle = '#f3dfc2'; c.fillRect(0, 0, w, h);
      const R = rng(11);
      for (let i = 0; i < 6; i++) {
        const x = (i % 3) * w / 3 + 20 + R() * 20, y = Math.floor(i / 3) * h / 2 + 30 + R() * 30, rot = (R() - 0.5) * 0.5;
        wrap9(w, h, (ox, oy) => {
          c.save(); c.translate(x + ox, y + oy); c.rotate(rot);
          if (i % 2) {
            c.fillStyle = '#fbf6ea'; c.fillRect(-26, -16, 52, 32);
            c.strokeStyle = 'rgba(42,34,48,0.55)'; c.lineWidth = 1.5; c.strokeRect(-26, -16, 52, 32);
            c.beginPath(); c.moveTo(-26, -16); c.lineTo(0, 3); c.lineTo(26, -16); c.stroke();
            for (let k = -26; k < 26; k += 8) { c.fillStyle = (k / 8) % 2 ? '#c23f36' : '#3f5aa8'; c.fillRect(k, 13, 4, 3); }
          } else {
            c.fillStyle = '#fff'; c.fillRect(-14, -17, 28, 34);
            c.fillStyle = ['#e8604c', '#7fb3a8', '#e4b84f'][i % 3]; c.fillRect(-10, -13, 20, 22);
            c.fillStyle = 'rgba(255,255,255,0.7)'; c.beginPath(); c.arc(0, -3, 5, 0, 7); c.fill();
            c.strokeStyle = 'rgba(42,34,48,0.4)'; c.lineWidth = 1.2; c.beginPath(); c.arc(12, 8, 12, 0, 7); c.stroke();
          }
          c.restore();
        });
      }
    }],
    floor: (c, w, h) => {                      // post-office checker tiles
      const n = 16;
      for (let i = 0; i < n; i++) for (let j = 0; j < n * 0.75; j++) {
        c.fillStyle = (i + j) % 2 ? '#2f2a36' : '#f1ebdf'; c.fillRect(i * w / n, j * w / n, w / n, w / n);
      }
      c.strokeStyle = 'rgba(120,110,100,0.4)'; c.lineWidth = 1;
      for (let i = 0; i <= n; i++) { c.beginPath(); c.moveTo(i * w / n, 0); c.lineTo(i * w / n, h); c.stroke(); c.beginPath(); c.moveTo(0, i * w / n); c.lineTo(w, i * w / n); c.stroke(); }
    },
    rug: false,
  },
  yarnflow: {
    tile: [128, 0.36, (c, w, h) => {             // knitted stockinette: rows of little Vs
      c.fillStyle = '#e9c8c3'; c.fillRect(0, 0, w, h);
      const sw = w / 8, sh = h / 8;
      for (let j = 0; j < 8; j++) for (let i = 0; i < 8; i++) {
        const x = i * sw + sw / 2, y = j * sh + sh / 2;
        const band = j < 2 ? '#d9a9b8' : j === 5 ? '#f3dfa8' : '#f2d9d6';
        for (const s of [-1, 1]) {
          c.fillStyle = band; c.beginPath(); c.ellipse(x + s * sw * 0.22, y, sw * 0.24, sh * 0.5, s * -0.5, 0, 7); c.fill();
          c.strokeStyle = 'rgba(120,70,80,0.35)'; c.lineWidth = 1.2; c.stroke();
        }
      }
    }],
    floor: (c, w, h) => {                      // a crocheted floor: granny squares, stitch by stitch
      const pal = [['#e8604c', '#e4b84f', '#7fb3a8', '#f6eedb'], ['#8f7ae8', '#f6eedb', '#dc9e9a', '#e4b84f'], ['#7fb3a8', '#e8604c', '#f3dfa8', '#93abc0'], ['#dc9e9a', '#a8b994', '#8f7ae8', '#f6eedb']];
      c.fillStyle = '#7a6670'; c.fillRect(0, 0, w, h);          // the shadow showing through the holes
      const s = w / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) grannySquare(c, i * s, j * s, s, pal[i * 2 + j]);
    },
    floorTile: 1.8, floorPx: 512,
    rug: false,
  },
  deckgpt: {
    tile: [128, 0.7, (c, w, h) => {              // red velvet curtain folds, floor to ceiling
      const g = c.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, '#5e1621'); g.addColorStop(0.3, '#a8303a'); g.addColorStop(0.55, '#c4434a'); g.addColorStop(0.8, '#8a2230'); g.addColorStop(1, '#5e1621');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,220,200,0.08)'; c.fillRect(w * 0.42, 0, 6, h);
    }, 2.7],
    floor: (c, w, h) => {                      // the cinema carpet
      c.fillStyle = '#5a1a28'; c.fillRect(0, 0, w, h);
      const n = 12, s = w / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
        const x = i * s + s / 2, y = j * s + s / 2;
        c.strokeStyle = '#c9a24a'; c.lineWidth = 2;
        c.beginPath(); c.moveTo(x, y - s * 0.42); c.lineTo(x + s * 0.42, y); c.lineTo(x, y + s * 0.42); c.lineTo(x - s * 0.42, y); c.closePath(); c.stroke();
        c.fillStyle = (i + j) % 2 ? '#2a3a5e' : '#c9a24a';
        c.beginPath(); c.arc(x, y, s * 0.1, 0, 7); c.fill();
        c.fillStyle = 'rgba(201,162,74,0.5)';
        for (const [dx, dy] of [[0.5, 0], [-0.5, 0], [0, 0.5], [0, -0.5]]) { c.beginPath(); c.arc(x + dx * s, y + dy * s, s * 0.05, 0, 7); c.fill(); }
      }
    },
    rug: false,
  },
  splatform: {
    tile: [512, 2.2, (c, w, h) => {             // a drop cloth that's seen some things
      c.fillStyle = '#f2e9d6'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(160,140,110,0.12)'; c.lineWidth = 1;
      for (let i = 0; i < w; i += 4) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
      const R = rng(5), cols = ['#e8604c', '#e4b84f', '#7fb3a8', '#8f7ae8', '#5f8cc8', '#dc6a9a', '#2a2230'];
      for (let i = 0; i < 26; i++) {
        const x = R() * w, y = R() * h, r = 6 + R() * 26, col = cols[i % cols.length];
        wrap9(w, h, (ox, oy) => {
          splat(c, x + ox, y + oy, r, col, rng(i + 40));
          if (i % 3 === 0) { c.fillStyle = col; c.fillRect(x + ox - r * 0.15, y + oy, r * 0.3, r * 3 + R() * 60); c.beginPath(); c.arc(x + ox, y + oy + r * 3 + 40, r * 0.25, 0, 7); c.fill(); }
        });
      }
    }],
    floor: (c, w, h) => {                      // concrete studio floor, paint everywhere
      c.fillStyle = '#cfc6b6'; c.fillRect(0, 0, w, h);
      const R = rng(9), cols = ['#e8604c', '#e4b84f', '#7fb3a8', '#8f7ae8', '#5f8cc8', '#dc6a9a'];
      for (let i = 0; i < 160; i++) { c.fillStyle = `rgba(${R() < 0.5 ? '120,110,100' : '230,225,215'},${R() * 0.18})`; c.beginPath(); c.arc(R() * w, R() * h, 6 + R() * 40, 0, 7); c.fill(); }
      for (let i = 0; i < 36; i++) splat(c, R() * w, R() * h, 8 + R() * 30, cols[i % cols.length], rng(i + 90));
      // footprints in pink, walking off toward the counter
      c.fillStyle = 'rgba(220,106,154,0.75)';
      for (let k = 0; k < 9; k++) { const x = w * 0.42 + (k % 2) * 30 + k * 12, y = h * 0.95 - k * 45; c.beginPath(); c.ellipse(x, y, 9, 15, 0.2, 0, 7); c.fill(); c.beginPath(); c.ellipse(x + 2, y + 22, 7, 8, 0, 0, 7); c.fill(); }
    },
    rug: false,
  },
  gallery: {
    tile: [256, 0.75, (c, w, h) => {             // museum damask
      c.fillStyle = '#c7b9d8'; c.fillRect(0, 0, w, h);
      const motif = (x, y) => {
        c.fillStyle = 'rgba(110,80,140,0.28)';
        c.beginPath(); c.ellipse(x, y, 18, 42, 0, 0, 7); c.fill();
        for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 26, y + 10, 10, 26, s * 0.6, 0, 7); c.fill(); c.beginPath(); c.arc(x + s * 14, y - 40, 8, 0, 7); c.fill(); }
        c.fillStyle = 'rgba(228,184,79,0.35)'; c.beginPath(); c.arc(x, y, 6, 0, 7); c.fill();
      };
      wrap9(w, h, (ox, oy) => { motif(w * 0.25 + ox, h * 0.25 + oy); motif(w * 0.75 + ox, h * 0.75 + oy); });
    }],
    floor: (c, w, h) => basketweave(c, w, h, ['#b58a5e', '#a77c52', '#c09468', '#9c7048']),
    floorTile: 1.2,
  },
  library: {
    tile: [256, 0.55, (c, w, h) => {             // deep green with little gold fleurs
      c.fillStyle = '#4c6a55'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(30,50,36,0.35)'; c.lineWidth = 6;
      for (let x = 0; x <= w; x += w / 4) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      const fleur = (x, y) => {
        c.fillStyle = 'rgba(228,184,79,0.6)';
        c.beginPath(); c.ellipse(x, y - 8, 4, 10, 0, 0, 7); c.fill();
        for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 8, y - 3, 3, 8, s * 0.8, 0, 7); c.fill(); }
        c.fillRect(x - 7, y + 2, 14, 3);
      };
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) fleur(i * w / 4 + w / 8, j * h / 4 + h / 8 + (i % 2) * h / 8);
    }],
    floor: (c, w, h) => basketweave(c, w, h, ['#6b4a34', '#5e412e', '#77543b', '#664631']),
    floorTile: 1.0,
  },
};

// wall/floor materials for a theme (null = the old plain paint / planks)
function themeMats(theme, id) {
  if (!theme) return null;
  const out = { walls: [null, null, null], floor: null };
  const lens = [W, D, D];
  if (theme.mural) {
    out.walls = lens.map((len, i) => paint(0xffffff, { map: canvasTex(Math.round(384 * len / H), 384, (c, w, h) => theme.mural(c, w, h, 17 + i * 31)), hatch: 0.25, unique: true }));
  } else if (theme.tile) {
    const [px, tw, draw, th = tw] = theme.tile;
    const base = canvasTex(px, Math.round(px * th / tw), draw);
    out.walls = lens.map((len) => {
      const t = base.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(len / tw, H / th); t.needsUpdate = true;
      return paint(0xffffff, { map: t, hatch: 0.3, unique: true });
    });
  }
  if (theme.floor) {
    const ft = theme.floorTile;
    const t = ft ? canvasTex(theme.floorPx || 256, theme.floorPx || 256, theme.floor) : canvasTex(1024, 768, theme.floor);
    if (ft) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(W / ft, D / ft); }
    out.floor = paint(0xffffff, { map: t, hatch: 0.3, unique: true });
  }
  return out;
}

// ─── ENVIRONMENTS: what turns a themed room into a place ───
// a leaf texture shared by every fern, vine and canopy
let _leafTex = null;
function leafTex() {
  if (_leafTex) return _leafTex;
  return (_leafTex = canvasTex(64, 128, (c, w, h) => {
    c.fillStyle = '#4f8f58'; c.beginPath(); c.moveTo(w / 2, h - 2); c.bezierCurveTo(-4, h * 0.6, w * 0.2, h * 0.1, w / 2, 2); c.bezierCurveTo(w * 0.8, h * 0.1, w + 4, h * 0.6, w / 2, h - 2); c.fill();
    c.strokeStyle = '#2a2230'; c.lineWidth = 2.5; c.stroke();
    c.strokeStyle = 'rgba(220,240,200,0.7)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, h - 4); c.lineTo(w / 2, 8); c.stroke();
  }));
}
let _frondTex = null;
function frondTex() {
  if (_frondTex) return _frondTex;
  return (_frondTex = canvasTex(64, 256, (c, w, h) => {
    c.strokeStyle = '#2f6a44'; c.lineWidth = 3; c.beginPath(); c.moveTo(w / 2, h); c.lineTo(w / 2, 4); c.stroke();
    for (let y = h - 14; y > 8; y -= 11) {
      const l = (w / 2 - 4) * Math.sin(Math.PI * (1 - y / h) * 0.95 + 0.1);
      for (const s of [-1, 1]) {
        c.fillStyle = (y / 11) % 2 ? '#4f8f58' : '#5e9d5e';
        c.beginPath(); c.ellipse(w / 2 + s * l / 2, y - 3, l / 2, 4, s * -0.35, 0, 7); c.fill();
      }
    }
  }));
}
const cutout = (tex, col = 0xffffff) => { const m = paint(col, { map: tex, hatch: 0, side: THREE.DoubleSide, unique: true }); m.alphaTest = 0.5; return m; };

function fern(K, x, z, s = 1, seed = 1) {
  const R = rng(seed * 97 + 3), m = cutout(frondTex());
  const g = new THREE.Group(); g.position.set(x, 0, z); K.g.add(g);
  for (let i = 0; i < 9; i++) {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(0.22 * s, 0.85 * s).translate(0, 0.42 * s, 0), m);
    p.userData.noInk = true;
    p.rotation.order = 'YXZ'; p.rotation.y = i * 0.7 + R(); p.rotation.x = 0.5 + R() * 0.6;
    g.add(p);
  }
  return g;
}
function bloom(K, x, z, h, col, seed) {          // a tall jungle flower
  const R = rng(seed);
  const stem = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + (R() - 0.5) * 0.15, h * 0.5, z + (R() - 0.5) * 0.15), new THREE.Vector3(x + (R() - 0.5) * 0.2, h, z)]);
  const sm = new THREE.Mesh(new THREE.TubeGeometry(stem, 8, 0.012, 5), paint(0x3f7a4c)); sm.userData.noInk = true; K.g.add(sm);
  const top = stem.getPoint(1), pet = paint(col);
  for (let p = 0; p < 5; p++) {
    const a = p * 1.256;
    const m = K.put(new THREE.SphereGeometry(0.055, 8, 6).scale(1, 0.35, 0.6), pet, top.x + Math.cos(a) * 0.05, top.y, top.z + Math.sin(a) * 0.05, [0, -a, 0.25]);
    m.userData.noInk = true;
  }
  K.put(new THREE.SphereGeometry(0.025, 8, 6), paint(0xf6d36b, { hatch: 0 }), top.x, top.y + 0.015, top.z).userData.noInk = true;
  for (const s of [-1, 1]) {
    const lp = stem.getPoint(0.35 + s * 0.08);
    const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.2).translate(0, 0.1, 0), cutout(leafTex()));
    lf.position.copy(lp); lf.rotation.set(0, R() * 3, s * 0.9); lf.userData.noInk = true; K.g.add(lf);
  }
}
function tree(K, x, z, seed) {                    // a big storybook tree, canopy brushing the ceiling
  const R = rng(seed), bark = paint(0x7a5a40, { hatch: 0.6 });
  const trunk = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + 0.08, 0.9, z), new THREE.Vector3(x - 0.05, 1.7, z + 0.05), new THREE.Vector3(x, 2.2, z)]);
  K.g.add(new THREE.Mesh(new THREE.TubeGeometry(trunk, 16, 0.2, 10), bark));
  // flared roots
  for (let i = 0; i < 5; i++) {
    const a = i * 1.26 + R();
    K.put(new THREE.ConeGeometry(0.1, 0.5, 6), bark, x + Math.cos(a) * 0.22, 0.08, z + Math.sin(a) * 0.22, [Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2]);
  }
  // branches
  for (const [a, y] of [[0.6, 1.6], [2.6, 1.85], [4.4, 1.7]]) {
    const b = new THREE.CatmullRomCurve3([new THREE.Vector3(x, y, z), new THREE.Vector3(x + Math.cos(a) * 0.4, y + 0.25, z + Math.sin(a) * 0.3), new THREE.Vector3(x + Math.cos(a) * 0.75, y + 0.5, z + Math.sin(a) * 0.5)]);
    K.g.add(new THREE.Mesh(new THREE.TubeGeometry(b, 8, 0.06, 6), bark));
  }
  const greens = [0x5e9d5e, 0x4f8f58, 0x6fae66, 0x86a868];
  for (let i = 0; i < 9; i++) {
    const a = i * 0.7 + R(), r = 0.3 + R() * 0.55;
    const p = K.put(new THREE.IcosahedronGeometry(0.38 + R() * 0.2, 1), paint(greens[i % 4], { hatch: 0.5 }), x + Math.cos(a) * r, 2.25 + R() * 0.35, z + Math.sin(a) * r * 0.8);
    p.scale.y = 0.75;
  }
  K.cols.push({ x0: x - 0.32, x1: x + 0.32, z0: z - 0.32, z1: z + 0.32 });
}
function bunting(K, pts, n, make) {               // a sagging string with things hung along it
  const curve = new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.006, 4), paint(0x2a2230, { hatch: 0 }));
  tube.userData.noInk = true; K.g.add(tube);
  n = Math.max(3, Math.round(n * curve.getLength() / 7));        // n is per 7 m of string
  for (let i = 1; i < n; i++) { const t = i / n, p = curve.getPoint(t), tg = curve.getTangent(t); make(p, Math.atan2(-tg.z, tg.x), i); }
}
const sag = (a, b, d = 0.25) => [a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - d, (a[2] + b[2]) / 2], b];
// three strings round the top of the room: along the back wall, then down each side
const topLoops = (y = 2.45) => [
  // (the back wall's string stops either side of the screen)
  sag([-W / 2 + 0.1, y, -D + 0.62], [-SCR_W / 2 - 0.15, y, -D + 0.62], 0.2),
  sag([SCR_W / 2 + 0.15, y, -D + 0.62], [W / 2 - 0.1, y, -D + 0.62], 0.2),
  sag([-W / 2 + 0.08, y, -D + 0.7], [-W / 2 + 0.08, y, -0.2], 0.3),
  sag([W / 2 - 0.08, y, -D + 0.7], [W / 2 - 0.08, y, -0.2], 0.3),
];

const ENV = {
  'borrowed-eyes'(K) {
    // ── a forest paradise: trees, ferns, vines, a pond, fireflies, butterflies ──
    tree(K, -3.45, -2.35, 5);
    tree(K, 3.45, -2.0, 9);
    // a leafy canopy along the top of every wall
    const greens = [0x5e9d5e, 0x4f8f58, 0x6fae66, 0x86a868, 0x3f7a4c];
    const canopyAt = (x, z, i) => { const p = K.put(new THREE.IcosahedronGeometry(0.28 + (i % 3) * 0.07, 1), paint(greens[i % 5], { hatch: 0.5 }), x, 2.62 + (i % 2) * 0.08, z); p.scale.y = 0.7; };
    for (let i = 0, x = -W / 2 + 0.2; x <= W / 2 - 0.2; x += 0.42, i++) canopyAt(x, -D + 0.75, i);
    for (const s of [-1, 1]) for (let i = 0, z = -D + 1.1; z <= -0.4; z += 0.45, i++) canopyAt(s * (W / 2 - 0.22), z, i + 2);
    // vines hanging from the canopy, swaying
    const leafM = cutout(leafTex()), vineM = paint(0x3f6a3c), vines = [];
    const vr = rng(23);
    const vineSpots = [];
    for (let x = -3.6; x <= 3.6; x += 0.45) if (Math.abs(x) > SCR_W / 2 + 0.15) vineSpots.push([x + vr() * 0.2, -D + 0.75]);
    for (const s of [-1, 1]) for (let z = -4.6; z <= -0.6; z += 0.6) vineSpots.push([s * (W / 2 - 0.25), z + vr() * 0.2]);
    vineSpots.forEach(([x, z], i) => {
      const len = 0.5 + vr() * 1.0, g = new THREE.Group(); g.position.set(x, 2.6, z); K.g.add(g);
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, -len * 0.5, 0.04), new THREE.Vector3(-0.03, -len, 0.02)]);
      const v = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.01, 4), vineM); v.userData.noInk = true; g.add(v);
      for (let k = 1; k <= Math.floor(len * 9); k++) {
        const p = curve.getPoint(k / Math.floor(len * 9 + 1));
        const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.07, 0.13).translate(0, -0.06, 0), leafM);
        lf.position.copy(p); lf.rotation.set(0, vr() * 6, (k % 2 ? 1 : -1) * 0.8); lf.userData.noInk = true; g.add(lf);
      }
      if (i % 4 === 0) {                     // a few vines flower at the tip
        const f = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), paint([0xf29bb4, 0xe8604c, 0xf6c453][i % 3]));
        f.position.copy(curve.getPoint(1)); f.userData.noInk = true; g.add(f);
      }
      vines.push([g, vr() * 6]);
    });
    LIVE.push((t) => { for (const [g, ph] of vines) { g.rotation.z = Math.sin(t * 0.7 + ph) * 0.05; g.rotation.x = Math.cos(t * 0.5 + ph) * 0.04; } });
    // ferns and flowers in the undergrowth, out of the walkway
    [[-3.6, -0.3, 1.2], [3.6, -0.3, 1.2], [-3.6, -3.4, 0.9], [3.6, -3.0, 0.8], [-2.4, -4.9, 0.9], [0.9, -5.0, 0.7], [-0.6, -5.0, 0.6], [2.2, -5.1, 0.8], [-3.6, -4.9, 1.0], [3.6, -4.9, 1.1]]
      .forEach(([x, z, s], i) => fern(K, x, z, s, i + 1));
    for (const s of [-1, 1]) K.cols.push({ x0: s * 3.6 - 0.45, x1: s * 3.6 + 0.45, z0: -0.75, z1: 0.2 });
    [[-3.75, -1.4, 0.9, 0xf29bb4], [-3.7, -3.2, 0.7, 0xe8604c], [3.75, -2.8, 0.85, 0xf6c453], [3.7, -1.2, 0.65, 0xb7a3e6], [-1.6, -5.2, 0.75, 0xe8604c], [1.4, -5.2, 0.9, 0xf29bb4], [-3.75, -4.2, 0.95, 0xf6c453], [3.75, -4.3, 0.75, 0xe8604c]]
      .forEach(([x, z, h, col], i) => bloom(K, x, z, h, col, i * 13 + 5));
    // mushrooms at the tree roots
    for (const [x, z, s] of [[-2.95, -2.1, 1], [-3.05, -2.75, 0.7], [3.0, -1.6, 0.9], [2.95, -2.35, 0.6], [-0.2, -1.1, 0.5]]) {
      K.put(new THREE.CylinderGeometry(0.03 * s, 0.04 * s, 0.12 * s, 8), paint(0xf6eedb), x, 0.06 * s, z);
      const cap = K.put(new THREE.SphereGeometry(0.08 * s, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xd2483e), x, 0.11 * s, z);
      for (let k = 0; k < 4; k++) K.put(new THREE.SphereGeometry(0.012 * s, 6, 5), paint(0xffffff, { hatch: 0 }), x + Math.cos(k * 1.6) * 0.05 * s, 0.11 * s + 0.055 * s, z + Math.sin(k * 1.6) * 0.05 * s).userData.noInk = true;
    }
    // a lily pond the frog hops round
    const px = -1.6, pz = -2.1;
    const pond = K.put(new THREE.CircleGeometry(0.62, 32), paint(0xffffff, { hatch: 0, map: canvasTex(128, 128, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
      g.addColorStop(0, '#4f8fa0'); g.addColorStop(0.8, '#7fb8c0'); g.addColorStop(1, '#a8d4cf');
      c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 2;
      for (const [x, y, r] of [[40, 50, 10], [80, 70, 14], [60, 90, 7]]) { c.beginPath(); c.arc(x, y, r, 0.3, 2.6); c.stroke(); }
    }) }), px, 0.02, pz, [-Math.PI / 2, 0, 0]);
    pond.userData.noInk = true;
    for (let i = 0; i < 14; i++) {
      const a = i * 0.45;
      K.put(new THREE.SphereGeometry(0.07 + (i % 3) * 0.02, 8, 6).scale(1.3, 0.55, 1), paint(i % 2 ? 0xbdb6a8 : 0xa89f90), px + Math.cos(a) * 0.66, 0.03, pz + Math.sin(a) * 0.66);
    }
    const pads = [];
    for (const [dx, dz, r] of [[-0.2, 0.1, 0.12], [0.18, -0.15, 0.1], [0.05, 0.25, 0.09], [0.25, 0.18, 0.08]]) {
      const pad = K.put(new THREE.CircleGeometry(r, 16, 0.3, Math.PI * 2 - 0.6), paint(0x6f9a4c, { side: THREE.DoubleSide }), px + dx, 0.03, pz + dz, [-Math.PI / 2, 0, 0]);
      pad.userData.noInk = true; pads.push([pad, dx * 9]);
    }
    const lotus = new THREE.Group(); lotus.position.set(px - 0.2, 0.04, pz + 0.1); K.g.add(lotus);
    for (let p = 0; p < 7; p++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6).scale(0.5, 1, 0.25).translate(0, 0.05, 0), paint(0xf4b6c8));
      m.rotation.set(0.5, p * 0.9, 0, 'YXZ'); m.userData.noInk = true; lotus.add(m);
    }
    LIVE.push((t) => { for (const [pad, ph] of pads) pad.position.y = 0.03 + Math.sin(t * 1.2 + ph) * 0.004; lotus.rotation.y = t * 0.1; });
    K.cols.push({ x0: px - 0.6, x1: px + 0.6, z0: pz - 0.6, z1: pz + 0.6 });
    // sunbeams slanting down through the canopy
    const beamTex = canvasTex(64, 256, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, 'rgba(255,246,200,0.9)'); g.addColorStop(1, 'rgba(255,246,200,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
      const s = c.createLinearGradient(0, 0, w, 0); s.addColorStop(0, 'rgba(0,0,0,1)'); s.addColorStop(0.5, 'rgba(0,0,0,0)'); s.addColorStop(1, 'rgba(0,0,0,1)');
      c.globalCompositeOperation = 'destination-out'; c.fillStyle = s; c.fillRect(0, 0, w, h);
    });
    const beams = [];
    for (const [x, z, w, r] of [[-0.6, -3.6, 0.7, 0.35], [1.2, -2.6, 0.55, 0.3], [2.6, -4.2, 0.6, 0.38], [-2.4, -1.8, 0.5, 0.3]]) {
      const m = new THREE.MeshBasicMaterial({ map: beamTex, transparent: true, opacity: 0.45, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const b = new THREE.Mesh(new THREE.PlaneGeometry(w, 2.8), m);
      b.position.set(x, 1.3, z); b.rotation.set(0, 0, r); b.userData.noInk = true; K.g.add(b); beams.push([m, x]);
    }
    LIVE.push((t) => { for (const [m, ph] of beams) m.opacity = 0.32 + Math.sin(t * 0.4 + ph) * 0.12; });
    // fireflies drifting through the undergrowth
    const glowTex = canvasTex(64, 64, (c, w, h) => {
      const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,220,1)'); g.addColorStop(0.25, 'rgba(240,255,140,0.8)'); g.addColorStop(1, 'rgba(200,255,100,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    const flies = [], fr = rng(31);
    for (let i = 0; i < 34; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      s.scale.setScalar(0.09 + fr() * 0.05); K.g.add(s);
      flies.push({ s, x: (fr() - 0.5) * 7, z: -0.6 - fr() * 4.6, y: 0.3 + fr() * 1.9, ph: fr() * 6, sp: 0.3 + fr() * 0.5 });
    }
    LIVE.push((t) => {
      for (const f of flies) {
        f.s.position.set(f.x + Math.sin(t * f.sp + f.ph) * 0.35, f.y + Math.sin(t * f.sp * 1.7 + f.ph) * 0.18, f.z + Math.cos(t * f.sp * 0.8 + f.ph) * 0.3);
        f.s.material.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(t * 1.9 + f.ph * 3));
      }
    });
    // butterflies flitting about
    const wingTex = (a, b) => canvasTex(64, 64, (c, w, h) => {
      c.fillStyle = a; c.beginPath(); c.ellipse(w * 0.5, h * 0.32, w * 0.42, h * 0.28, -0.3, 0, 7); c.fill();
      c.fillStyle = b; c.beginPath(); c.ellipse(w * 0.4, h * 0.72, w * 0.3, h * 0.22, 0.4, 0, 7); c.fill();
      c.strokeStyle = '#2a2230'; c.lineWidth = 3; c.stroke();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(w * 0.6, h * 0.3, 4, 0, 7); c.fill();
    });
    [['#5fa8e8', '#2a5aa8'], ['#f6a53b', '#e8604c'], ['#f29bb4', '#b7a3e6']].forEach(([a, b], i) => {
      const bf = new THREE.Group(); K.g.add(bf);
      const m = cutout(wingTex(a, b));
      const ws = [-1, 1].map(s => {
        const pv = new THREE.Group(); bf.add(pv);
        const wg = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.12).translate(0.06, 0, 0), m); wg.rotation.x = -Math.PI / 2; wg.userData.noInk = true;
        pv.add(wg); pv.scale.x = s; return pv;
      });
      bf.add(new THREE.Mesh(new THREE.CapsuleGeometry(0.008, 0.06, 2, 6).rotateX(Math.PI / 2), paint(0x2a2230, { hatch: 0 })));
      LIVE.push((t) => {
        const a2 = t * (0.35 + i * 0.08) + i * 2;
        bf.position.set(Math.sin(a2) * (1.6 + i * 0.6), 1.1 + i * 0.25 + Math.sin(t * 1.3 + i) * 0.3, -2.6 + Math.cos(a2 * 1.3) * 1.6);
        bf.rotation.y = -a2 + Math.PI;
        const flap = Math.sin(t * 16 + i) * 0.9;
        ws[0].rotation.z = flap; ws[1].rotation.z = flap;
      });
    });
    // leaves drifting down from the canopy
    const fall = [], lr = rng(41);
    for (let i = 0; i < 10; i++) {
      const lf = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.14), leafM); lf.userData.noInk = true; K.g.add(lf);
      fall.push({ lf, x: (lr() - 0.5) * 7, z: -0.8 - lr() * 4.4, ph: lr(), sp: 0.05 + lr() * 0.05 });
    }
    LIVE.push((t) => {
      for (const f of fall) {
        const s = (t * f.sp + f.ph) % 1;
        f.lf.position.set(f.x + Math.sin(s * 12) * 0.25, 2.5 - s * 2.5, f.z);
        f.lf.rotation.set(Math.sin(s * 9) * 1.2, s * 6, Math.cos(s * 11) * 0.8);
      }
    });
  },
  yarnflow(K) {
    // pom-pom garlands strung round the room
    const cols = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0xdc9e9a, 0x8f7ae8];
    for (const pts of topLoops()) bunting(K, pts, 14, (p, a, i) => {
      const pm = K.put(new THREE.IcosahedronGeometry(0.06, 1), paint(cols[i % cols.length], { hatch: 0.6 }), p.x, p.y - 0.06, p.z);
      pm.userData.noInk = i % 2 === 0;
    });
  },
  'inbox-zero'(K) {
    // envelope bunting: little letters pegged on a line
    for (const pts of topLoops()) bunting(K, pts, 13, (p, a, i) => {
      const e = K.flat(0.22, 0.14, texMat(88, 56, (c, w, h) => {
        c.fillStyle = i % 3 === 1 ? '#f6e7c0' : '#fbf6ea'; c.fillRect(0, 0, w, h);
        c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(1.5, 1.5, w - 3, h - 3);
        c.beginPath(); c.moveTo(2, 2); c.lineTo(w / 2, h * 0.55); c.lineTo(w - 2, 2); c.stroke();
        c.fillStyle = ['#e8604c', '#7fb3a8', '#e4b84f'][i % 3]; c.fillRect(w - 20, 8, 12, 14);
      }), p.x, p.y - 0.08, p.z, [0, a, (i % 2 ? 0.08 : -0.08)]);
      e.material.side = THREE.DoubleSide;
    });
  },
  deckgpt(K) {
    // marquee bulbs chasing round the top of the walls
    const bulbs = [], on = new THREE.MeshBasicMaterial({ color: 0xfff1b0 }), off = new THREE.MeshBasicMaterial({ color: 0x9a7a40 });
    const geo = new THREE.SphereGeometry(0.035, 8, 6);
    const add = (x, y, z) => { const b = new THREE.Mesh(geo, on); b.position.set(x, y, z); b.userData.noInk = true; K.g.add(b); bulbs.push(b); };
    for (let x = -W / 2 + 0.2; x <= W / 2 - 0.2; x += 0.22) add(x, 2.62, -D + 0.56);
    for (const s of [-1, 1]) for (let z = -D + 0.75; z <= 0.2; z += 0.22) add(s * (W / 2 - 0.04), 2.62, z);
    LIVE.push((t) => { const k = Math.floor(t * 6); bulbs.forEach((b, i) => { b.material = (i + k) % 3 === 0 ? off : on; }); });
    // a gold proscenium band under the bulbs
    K.box(W - 0.1, 0.14, 0.04, paint(PAL.gold), 0, 2.48, -D + 0.54, 0.01);
    for (const s of [-1, 1]) K.box(0.04, 0.14, D - 0.1, paint(PAL.gold), s * (W / 2 - 0.03), 2.48, -D / 2 + 0.5, 0.01);
  },
  charterscope(K) {
    // signal flags strung across the room
    const fl = ['#e8604c', '#e4b84f', '#3f5872', '#f6eedb', '#3f8f5a'];
    for (const pts of topLoops()) bunting(K, pts, 12, (p, a, i) => {
      const f = K.flat(0.18, 0.2, texMat(64, 72, (c, w, h) => {
        c.fillStyle = fl[i % 5]; c.beginPath(); c.moveTo(2, 2); c.lineTo(w - 2, 2); c.lineTo(w / 2, h - 2); c.closePath(); c.fill();
        c.strokeStyle = INKC; c.lineWidth = 3; c.stroke();
        if (i % 2) { c.fillStyle = fl[(i + 2) % 5]; c.beginPath(); c.arc(w / 2, h * 0.3, 8, 0, 7); c.fill(); }
      }), p.x, p.y - 0.1, p.z, [0, a, 0]);
      f.material.side = THREE.DoubleSide;
    });
  },
  splatform(K) {
    // paint dripping off the top of every wall
    const cols = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0x8f7ae8, 0x5f8cc8, 0xdc6a9a], R = rng(77);
    const drip = (x, z, ry, i) => {
      const len = 0.2 + R() * 0.7, col = paint(cols[i % cols.length], { hatch: 0 });
      const g = new THREE.Group(); g.position.set(x, H, z); g.rotation.y = ry; K.g.add(g);
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, len, 3, 8).translate(0, -len / 2, 0), col); m.userData.noInk = true; g.add(m);
      const d = new THREE.Mesh(new THREE.SphereGeometry(0.04, 10, 8), col); d.position.y = -len - 0.03; d.userData.noInk = true; g.add(d);
      const lip = K.box(0.18 + R() * 0.3, 0.06, 0.02, col, x, H - 0.02, z); lip.rotation.y = ry;
    };
    for (let x = -3.8, i = 0; x < 3.8; x += 0.3 + R() * 0.3, i++) drip(x, -D + 0.52, 0, i);
    for (const s of [-1, 1]) for (let z = -5.2, i = 0; z < -0.3; z += 0.35 + R() * 0.3, i++) drip(s * (W / 2 - 0.02), z, Math.PI / 2, i + 3);
  },
};

const ROOM_WALL = {
  charterscope: 0x8a7358, 'inbox-zero': 0xb8574d, yarnflow: 0xf2d9d6, deckgpt: 0x4a3a50,
  splatform: 0xf6eedb, 'borrowed-eyes': 0xdbe8dd, gallery: 0x8a6a9a, library: 0x8a6a4a,
};

export function buildInteriors(scene) {
  const rooms = {};
  PLACES.forEach((place, i) => {
    const ox = -105 + i * 30, oz = -45;
    const g = new THREE.Group(); g.position.set(ox, 0, oz);
    const K = kit(g);
    K.cols = [];
    const theme = THEMES[place.id];
    roomShell(K, ROOM_WALL[place.id] ?? 0xe8ddc2, place, theme);
    furnish(K, place.id, ROOM_WALL[place.id] ?? 0xe8ddc2, theme);
    ENV[place.id]?.(K);
    CENTER[place.id]?.(K);
    EXTRA[place.id]?.(K);
    if (place.id !== 'deckgpt' && place.id !== 'library' && place.shot)
      framedShot(K, place.shot, SCR_W, SCR_H, 0, SCR_Y, -D + 0.6, null, place.clip);
    plaque(K, PLQ_X, -D + 2.1);
    counter(K, CTR_X, -D + 2.3, 0);
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
        { x0: ox + PLQ_X - 0.4, x1: ox + PLQ_X + 0.4, z0: oz - D + 1.75, z1: oz - D + 2.45 },   // plaque
        { x0: ox + CTR_X - 0.9, x1: ox + CTR_X + 0.9, z0: oz - D + 1.95, z1: oz - D + 2.65 },   // counter
        ...K.cols.map(c => ({ x0: ox + c.x0, x1: ox + c.x1, z0: oz + c.z0, z1: oz + c.z1 })),
      ],
      interact: [
        { x: ox + PLQ_X, z: oz - D + 2.55, r: 1.0, label: 'read the plaque', act: { type: 'card', place } },
        { x: ox + CTR_X, z: oz - D + 2.75, r: 1.1, label: `open ${place.title} →`, act: { type: 'visit', url: place.url, place } },
        { x: ox, z: oz + 0.1, r: 1.0, label: 'back to the street', act: { type: 'exit' } },
      ],
    };
  });
  return rooms;
}
