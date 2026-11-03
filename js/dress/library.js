// ─── dressing for the library room ───
// The stacks go all the way round: tall bookcases on both side walls (the middle shelves
// carry real repository names), a rolling book cart, a reading nook with a wingback chair,
// a grandfather clock, a globe, a lectern with a big open book, brass lamps hanging off
// the walls, and a shaft of light with dust drifting in it.
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { APPS } from '../apps.js';

export default function dress(kit) {
  const { THREE, g, put, rb, paint, tap, live, free, claim, block, canvasTex, texMat, HAND, SCRIPT, INKC, D } = kit;
  const BACK = -D + 0.5, EW = 3.96;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ── batching: static pieces merge per material ──
  const _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const noInkMats = new Set();
  const batch = (target) => {
    const bins = new Map();
    const add = (geo, mat, x = 0, y = 0, z = 0, rot = null, scl = null, base = null) => {
      _e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0);
      if (typeof scl === 'number') _s.set(scl, scl, scl); else if (scl) _s.set(scl[0], scl[1], scl[2]); else _s.set(1, 1, 1);
      const m = new THREE.Matrix4().compose(_p.set(x, y, z), _q.setFromEuler(_e), _s);
      if (base) m.premultiply(base);
      const gg = geo.index ? geo.toNonIndexed() : geo.clone();
      gg.applyMatrix4(m);
      for (const k of Object.keys(gg.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') gg.deleteAttribute(k);
      if (!bins.has(mat)) bins.set(mat, []);
      bins.get(mat).push(gg);
    };
    const box = (w, h, d, mat, x, y, z, r = 0.02, rot, base) => add(rb(w, h, d, r), mat, x, y, z, rot, null, base);
    const flush = () => {
      for (const [mat, list] of bins) {
        const m = new THREE.Mesh(mergeGeometries(list, false), mat);
        if (noInkMats.has(mat)) m.userData.noInk = true;
        target.add(m);
      }
      bins.clear();
    };
    return { add, box, flush };
  };
  const S = batch(g), add = S.add, addBox = S.box;
  const grp = (x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, rot = null) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m); return m;
  };
  const lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  const wood = paint(0x8a6448), woodDk = paint(0x6b4a34), brass = paint(0xc9a24a), red = paint(0x8e2f3a), green = paint(0x2f6f4a);
  const cream = paint(0xfbf6ea);
  const BOOKC = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0x93abc0, 0xa8b994, 0xdc9e9a, 0x8f7ae8, 0x8e2f3a, 0x2f5a52, 0x3f5872];
  const bookM = BOOKC.map(c => paint(c));
  const R = kit.mkRng(4242);

  // ── repository names for the titled spines (an atlas: one texture, one merged mesh) ──
  const NAMES = [...new Set([
    ...APPS.map(a => (a.repo || '').match(/github\.com\/ghanemja\/([^/]+)/)?.[1]).filter(Boolean),
    'whiteboard', 'equalizer', 'citizen-maker', 'adapter-portability', 'RL_Tutorial', 'ros2_depth_camera_tutorial', 'art-heist',
  ])].slice(0, 16);
  const AT = 16, atlas = canvasTex(64 * AT, 512, (c, w, h) => {
    NAMES.forEach((n, i) => {
      const x0 = i * 64;
      c.fillStyle = ['#8e2f3a', '#2f5a52', '#3f5872', '#5c4030', '#6a4a8a', '#2a2230'][i % 6]; c.fillRect(x0, 0, 64, h);
      c.fillStyle = '#e4b84f'; c.fillRect(x0 + 6, 26, 52, 6); c.fillRect(x0 + 6, h - 32, 52, 6);
      c.save(); c.translate(x0 + 32, h / 2); c.rotate(-Math.PI / 2);
      c.fillStyle = '#f6e7c0'; c.textAlign = 'center'; c.textBaseline = 'middle';
      let s = 34; do { c.font = `700 ${s}px ${HAND}`; s -= 2; } while (c.measureText(n).width > h - 90 && s > 10);
      c.fillText(n, 0, 2); c.restore();
    });
  });
  const titledM = paint(0xffffff, { map: atlas, hatch: 0.3, unique: true });
  let titleI = 0;

  // ═════════════ 1. tall bookcases on both side walls ═════════════
  // `sx` is the wall (−1 west, +1 east); the case runs along z and opens toward the room.
  const bookcase = (sx, z0, z1, H = 2.25, gap = null) => {
    const DP = 0.38, xb = sx * EW, xc = xb - sx * DP / 2, xf = xb - sx * DP;   // back, centre, front
    const L = z1 - z0, zc = (z0 + z1) / 2;
    block(Math.min(xb, xf) - 0.02, Math.max(xb, xf) + 0.02, z0 - 0.02, z1 + 0.02);
    addBox(0.03, H, L, woodDk, xb - sx * 0.015, H / 2, zc, 0.008);
    for (const z of [z0, z1]) addBox(DP, H, 0.06, wood, xc, H / 2, z, 0.012);
    addBox(DP + 0.06, 0.08, L + 0.1, wood, xc + sx * 0.0, H + 0.04, zc, 0.015);           // the cornice
    addBox(0.05, 0.12, L + 0.1, wood, xf - sx * 0.01, H - 0.02, zc, 0.01);
    addBox(DP, 0.1, L, woodDk, xc, 0.05, zc, 0.01);                                       // the plinth
    const rows = [0.1, 0.52, 0.94, 1.36, 1.78];
    for (const y of rows.slice(1)) addBox(DP, 0.035, L - 0.04, wood, xc, y, zc, 0.008);
    rows.forEach((y0, r) => {
      let z = z0 + 0.06;
      const titled = r === 2 || r === 3;
      while (z < z1 - 0.1) {
        if (gap && r === gap[0] && z + 0.12 > gap[1] && z < gap[2]) { z = gap[2]; continue; }
        const roll = R();
        if (roll < 0.06 && z < z1 - 0.4) {                                                  // a lying stack, and a little gap
          let yy = y0 + 0.018;
          for (let k = 0; k < 3 + Math.floor(R() * 3); k++) { const h = 0.04 + R() * 0.02; addBox(0.26 - k * 0.01, h, 0.24 - k * 0.012, bookM[Math.floor(R() * bookM.length)], xc - sx * 0.02, yy + h / 2, z + 0.14, 0.008, [0, R() * 0.2, 0]); yy += h; }
          z += 0.34; continue;
        }
        const bw = 0.045 + R() * 0.06, bh = 0.25 + R() * 0.12, bd = 0.24 + R() * 0.06;
        const lean = roll > 0.95 ? sx * 0.18 : 0;
        const mat = bookM[Math.floor(R() * bookM.length)];
        const xx = xb - sx * (0.04 + bd / 2);
        if (titled && titleI < NAMES.length * 2 && R() < 0.4 && !lean) {
          // a fat titled spine: a box with the atlas strip on its face
          const tw = 0.085, th = 0.34;
          addBox(bd, th, tw, paint(0x5c4030), xx, y0 + 0.018 + th / 2, z + tw / 2, 0.006);
          const pl = new THREE.PlaneGeometry(tw * 0.9, th * 0.96);
          const i = titleI % NAMES.length, uv = pl.attributes.uv;
          for (let k = 0; k < uv.count; k++) uv.setX(k, (i + uv.getX(k)) / AT);
          add(pl, titledM, xx - sx * (bd / 2 + 0.002), y0 + 0.018 + th / 2, z + tw / 2, [0, -sx * Math.PI / 2, 0]);
          titleI++; z += tw + 0.006; continue;
        }
        addBox(bd, bh, bw, mat, xx, y0 + 0.018 + bh / 2 - (lean ? 0.01 : 0), z + bw / 2 + (lean ? 0.04 : 0), 0.008, [lean, 0, 0]);
        if (R() < 0.35) addBox(0.006, 0.02, bw * 0.8, brass, xx - sx * (bd / 2 + 0.001), y0 + 0.018 + bh * 0.8, z + bw / 2, 0.002, [lean, 0, 0]);
        z += bw + 0.004 + (lean ? 0.06 : 0);
      }
    });
    // a few things on top of the case
    for (let k = 0; k < 3; k++) {
      const z = z0 + 0.3 + k * (L - 0.6) / 2;
      if (k === 1) {                                                                          // a little potted fern
        add(new THREE.CylinderGeometry(0.09, 0.07, 0.14, 12), paint(0xc0703a), xc, H + 0.15, z);
        for (let j = 0; j < 7; j++) { const a = j / 7 * Math.PI * 2; add(new THREE.ConeGeometry(0.03, 0.28, 5), paint(0x5f8f3e), xc + Math.cos(a) * 0.05, H + 0.32, z + Math.sin(a) * 0.05, [Math.sin(a) * 0.7, 0, -Math.cos(a) * 0.7]); }
      } else {
        let yy = H + 0.08;
        for (let j = 0; j < 4; j++) { const h = 0.05; addBox(0.3 - j * 0.02, h, 0.22 - j * 0.01, bookM[(k * 4 + j * 3) % bookM.length], xc, yy + h / 2, z, 0.008, [0, j * 0.3, 0]); yy += h; }
      }
    }
  };
  bookcase(-1, -4.85, -2.3);
  bookcase(1, -4.85, -2.85, 2.25, [2, -4.1, -3.3]);

  // a library ladder leaning on the west case
  {
    const z = -3.3, x0 = -3.12, x1 = -3.55, y1 = 2.15;
    const ang = Math.atan2(x0 - x1, y1), len = Math.hypot(x0 - x1, y1);
    const lad = grp(x0, 0, z); lad.rotation.z = ang;                                       // feet on the floor, top against the case
    const LB = batch(lad);
    for (const s of [-1, 1]) LB.box(0.045, len, 0.045, wood, 0, len / 2, s * 0.2, 0.01);
    for (let k = 0; k < 7; k++) LB.box(0.035, 0.035, 0.4, woodDk, 0, 0.25 + k * 0.3, 0, 0.008);
    LB.flush();
    claim(x0 + 0.05, z, 0.12);
  }

  // ═════════════ 2. the reading nook (west front): wingback chair, side table, floor lamp ═════════════
  {
    put(new THREE.CircleGeometry(0.85, 36).rotateX(-Math.PI / 2), texMat(256, 256, (c, w, h) => {
      c.fillStyle = '#8e2f3a'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
      c.strokeStyle = '#e4b84f'; c.lineWidth = 8; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 14, 0, 7); c.stroke();
      c.strokeStyle = 'rgba(228,184,79,0.6)'; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 40, 0, 7); c.stroke();
      c.fillStyle = 'rgba(228,184,79,0.5)'; for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; c.beginPath(); c.arc(w / 2 + Math.cos(a) * 70, h / 2 + Math.sin(a) * 70, 9, 0, 7); c.fill(); }
    }), -3.0, 0.012, -0.75).userData.noInk = true;
    const CX = -3.3, CZ = -0.85, ry = Math.PI / 2 - 0.45;                                    // faces the room, a little toward the front
    if (free(CX, CZ, 0.42)) {
      claim(CX, CZ, 0.4);
      const ch = grp(CX, 0, CZ); ch.rotation.y = ry;                                        // local +z = the way it faces
      const CB = batch(ch), up = paint(0x2f5a52, { hatch: 0.6 }), upDk = paint(0x24493f, { hatch: 0.6 });
      CB.box(0.66, 0.2, 0.62, upDk, 0, 0.22, 0, 0.05);
      CB.box(0.56, 0.12, 0.52, up, 0, 0.38, 0.03, 0.05);                                    // the seat cushion
      CB.box(0.66, 0.78, 0.16, up, 0, 0.7, -0.26, 0.07, [-0.08, 0, 0]);                     // the tall back
      for (const s of [-1, 1]) {
        CB.box(0.1, 0.3, 0.56, up, s * 0.3, 0.45, 0.0, 0.05);                               // arms
        CB.box(0.14, 0.42, 0.14, up, s * 0.27, 0.86, -0.2, 0.06, [0, s * 0.5, 0]);          // the wings
        for (const dz of [-0.25, 0.25]) CB.add(new THREE.CylinderGeometry(0.025, 0.02, 0.12, 8), woodDk, s * 0.28, 0.06, dz);
      }
      CB.box(0.3, 0.2, 0.08, red, 0.0, 0.55, -0.15, 0.04, [-0.2, 0, 0]);                     // a cushion
      // an open book left face-down on the arm
      CB.add(new THREE.CylinderGeometry(0.09, 0.09, 0.14, 10, 1, false, 0, Math.PI), paint(0xe4b84f, { side: THREE.DoubleSide }), 0.3, 0.6, 0.06, [0, 0, 0], [1, 0.25, 1]);
      CB.flush();
    }
    // side table with a stack, a teacup and a candle
    const TX = -3.6, TZ = -0.08;
    if (free(TX, TZ, 0.22)) {
      claim(TX, TZ, 0.2);
      add(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 18), woodDk, TX, 0.55, TZ);
      add(new THREE.CylinderGeometry(0.025, 0.03, 0.54, 8), woodDk, TX, 0.27, TZ);
      add(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 14), woodDk, TX, 0.015, TZ);
      let yy = 0.565;
      for (let j = 0; j < 3; j++) { const h = 0.045; addBox(0.2 - j * 0.02, h, 0.15, bookM[j * 4 % bookM.length], TX - 0.03, yy + h / 2, TZ - 0.03, 0.006, [0, 0.3 + j * 0.25, 0]); yy += h; }
      add(lathe([[0.001, 0], [0.03, 0], [0.036, 0.045], [0.032, 0.045], [0.026, 0.006], [0.001, 0.006]], 14), cream, TX + 0.1, 0.565, TZ + 0.08);
    }
    // a floor lamp (tap it: click, on and off)
    const LX = -3.68, LZ = -1.72;
    if (free(LX, LZ, 0.17)) {
      claim(LX, LZ, 0.15);
      const lamp = grp(LX, 0, LZ);
      mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.03, 16), brass, lamp, 0, 0.015, 0);
      mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 8), brass, lamp, 0, 0.74, 0);
      const shadeM = paint(0xf3d9a0, { side: THREE.DoubleSide, emissive: 0xffc46a, hatch: 0.3 }); shadeM.emissiveIntensity = 0.55;
      mesh(new THREE.CylinderGeometry(0.11, 0.19, 0.24, 18, 1, true), shadeM, lamp, 0, 1.5, 0);
      const bulb = mesh(new THREE.SphereGeometry(0.04, 10, 8), paint(0xfff1c8, { emissive: 0xffd98a, hatch: 0 }), lamp, 0, 1.43, 0); bulb.userData.noInk = true;
      const pull = grp(0.06, 1.42, 0, lamp);
      mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.14, 4).translate(0, -0.07, 0), brass, pull).userData.noInk = true;
      mesh(new THREE.SphereGeometry(0.012, 6, 4), brass, pull, 0, -0.14, 0);
      let on = true, yank = 0;
      live((t, dt) => {
        yank = Math.max(0, yank - dt * 2);
        pull.rotation.z = Math.sin(t * 9) * yank * 0.5;
        shadeM.emissiveIntensity = on ? 0.55 : 0.0; bulb.visible = on;
      });
      tap(lamp, 'reading lamp', (sfx) => { on = !on; yank = 1; sfx([[1800, 0.02], [900, 0.03]], 'square', 0.03); });
    }
    // a "quiet please" sign above the nook
    put(new THREE.PlaneGeometry(0.78, 0.3), texMat(312, 120, (c, w, h) => {
      c.fillStyle = '#1e3a2a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e4b84f'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = '#f6e7c0'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 44px ${SCRIPT}`; c.fillText('quiet please', w / 2, h / 2 - 6);
      c.font = `20px ${HAND}`; c.fillText('(the books are thinking)', w / 2, h - 24);
    }), -EW + 0.03, 1.75, -0.95, [0, Math.PI / 2, 0]).userData.noInk = true;
    addBox(0.03, 0.34, 0.82, woodDk, -EW + 0.012, 1.75, -0.95, 0.008);
  }

  // ═════════════ 3. the grandfather clock (east wall, after the case) ═════════════
  {
    const X = EW - 0.18, Z = -2.42;
    block(X - 0.18, EW, Z - 0.27, Z + 0.27);
    const clock = grp(X, 0, Z); clock.rotation.y = -Math.PI / 2;                          // faces the room (−x)
    const CB = batch(clock);
    CB.box(0.5, 0.42, 0.32, woodDk, 0, 0.21, 0, 0.02);
    CB.box(0.4, 1.12, 0.26, woodDk, 0, 0.98, 0, 0.02);
    CB.box(0.5, 0.48, 0.32, woodDk, 0, 1.78, 0, 0.02);
    CB.box(0.56, 0.08, 0.36, wood, 0, 2.06, 0, 0.015);
    CB.add(new THREE.CylinderGeometry(0.15, 0.15, 0.36, 18, 1, false, 0, Math.PI), wood, 0, 2.1, 0, [0, 0, Math.PI / 2], [1, 0.6, 1]);
    CB.box(0.44, 0.04, 0.3, wood, 0, 0.44, 0, 0.01);
    CB.flush();
    const face = mesh(new THREE.CircleGeometry(0.17, 28), texMat(160, 160, (c, w, h) => {
      c.fillStyle = '#fbf3df'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
      c.strokeStyle = '#c9a24a'; c.lineWidth = 6; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.stroke();
      c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 18px ${HAND}`;
      const RN = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
      RN.forEach((n, k) => { const a = k / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(n, w / 2 + Math.cos(a) * 58, h / 2 + Math.sin(a) * 58); });
    }), clock, 0, 1.8, 0.162); face.userData.noInk = true;
    const hands = [];
    for (const [len, wd] of [[0.09, 0.014], [0.13, 0.009]]) { const hnd = grp(0, 1.8, 0.168, clock); mesh(new THREE.PlaneGeometry(wd, len).translate(0, len / 2, 0), paint(0x2a2230, { hatch: 0 }), hnd).userData.noInk = true; hands.push(hnd); }
    // the glass door over the pendulum
    // the case's dark inside, the pendulum in front of it, a faint glass door over both
    const inside = mesh(new THREE.PlaneGeometry(0.28, 0.9), paint(0x2a1c18, { hatch: 0 }), clock, 0, 0.98, 0.131); inside.userData.noInk = true;
    const glass = mesh(new THREE.PlaneGeometry(0.28, 0.9), paint(0xcfe0e6, { hatch: 0, opacity: 0.18 }), clock, 0, 0.98, 0.17); glass.userData.noInk = true;
    for (const s of [-1, 1]) mesh(rb(0.04, 0.94, 0.03, 0.008), wood, clock, s * 0.16, 0.98, 0.15);
    const pend = grp(0, 1.5, 0.145, clock);                                                // pivot at the top of the rod
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.72, 4).translate(0, -0.36, 0), brass, pend).userData.noInk = true;
    mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.015, 18).rotateX(Math.PI / 2).translate(0, -0.74, 0), brass, pend);
    let bong = 0;
    live((t, dt) => {
      bong = Math.max(0, bong - dt * 0.5);
      pend.rotation.z = Math.sin(t * Math.PI * 0.8) * 0.11 * (1 + bong * 0.3);
      const now = new Date(), m = now.getMinutes() + now.getSeconds() / 60, hr = (now.getHours() % 12) + m / 60;
      hands[0].rotation.z = -hr / 12 * Math.PI * 2; hands[1].rotation.z = -m / 60 * Math.PI * 2 - bong * Math.PI * 4;
      clock.rotation.z = Math.sin(t * 30) * bong * 0.006;
    });
    tap(clock, 'grandfather clock', (sfx) => {
      bong = 1;
      sfx([[392, 0.8], [330, 0.8], [349, 0.8], [262, 1.4]], 'sine', 0.09);
      kit.say(kit.anyOf(['BONG. It is HEAD o’clock.', 'BONG. Time to commit.', 'BONG. (It is always five minutes to the deadline in here.)', 'BONG. The cat did not wake up. The cat never wakes up.']));
    });
  }

  // ═════════════ 4. the globe on its stand (east front corner) ═════════════
  {
    const X = 3.42, Z = -0.22;
    if (free(X, Z, 0.3)) {
      claim(X, Z, 0.28);
      add(new THREE.CylinderGeometry(0.2, 0.24, 0.04, 18), woodDk, X, 0.02, Z);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; addBox(0.04, 0.64, 0.04, woodDk, X + Math.cos(a) * 0.2, 0.34, Z + Math.sin(a) * 0.2, 0.01, [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]); }
      add(new THREE.CylinderGeometry(0.022, 0.03, 0.58, 10), woodDk, X, 0.33, Z);                        // the centre post up to the globe
      add(new THREE.TorusGeometry(0.3, 0.02, 6, 36), woodDk, X, 0.66, Z, [Math.PI / 2, 0, 0]);      // the horizon ring
      const tilt = grp(X, 0.86, Z); tilt.rotation.z = 0.41;
      mesh(new THREE.TorusGeometry(0.27, 0.01, 5, 36, Math.PI * 1.2), brass, tilt, 0, 0, 0, [0, Math.PI / 2, -Math.PI * 0.1]);   // the meridian
      const spin = grp(0, 0, 0, tilt);
      const tex = canvasTex(512, 256, (c, w, h) => {
        c.fillStyle = '#7fb3c8'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1;
        for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(0, k * h / 8); c.lineTo(w, k * h / 8); c.stroke(); c.beginPath(); c.moveTo(k * w / 8, 0); c.lineTo(k * w / 8, h); c.stroke(); }
        c.fillStyle = '#d9c48a'; c.strokeStyle = '#6b4a34'; c.lineWidth = 2;
        for (const pts of [[[60, 60], [130, 50], [150, 90], [120, 130], [90, 120], [70, 90]], [[110, 140], [150, 150], [140, 210], [115, 220]], [[230, 50], [300, 45], [320, 80], [280, 100], [250, 90]], [[240, 105], [290, 110], [300, 170], [260, 190], [245, 150]], [[320, 50], [430, 55], [450, 100], [380, 120], [340, 100]], [[400, 160], [450, 165], [445, 195], [405, 190]]]) {
          c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y)); c.closePath(); c.fill(); c.stroke();
        }
      });
      mesh(new THREE.SphereGeometry(0.24, 24, 16), paint(0xffffff, { map: tex, hatch: 0.3, unique: true }), spin);
      mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.58, 6), brass, tilt);
      let vel = 0.25, flat = 0, flatUntil = -1, gtaps = [];
      live((t, dt) => {
        vel += (0.25 - vel) * Math.min(1, dt * 0.5); spin.rotation.y += vel * dt;
        flat += ((t < flatUntil ? 1 : 0) - flat) * Math.min(1, dt * 4);
        spin.scale.set(1 + flat * 0.25, 1 - flat * 0.8, 1 + flat * 0.25);
      });
      tap(tilt, 'globe', (sfx) => {
        const now = kit.now(); gtaps = gtaps.filter(q => now - q < 4); gtaps.push(now);
        vel = 9; sfx([[600, 0.05], [500, 0.05], [420, 0.05], [360, 0.05], [320, 0.08]], 'triangle', 0.03);
        if (gtaps.length >= 5) { gtaps = []; flatUntil = now + 5; setTimeout(() => kit.say('You spun it flat. Please open an issue: “globe.js — world no longer round (regression)”.'), 500); }
      });
    }
    // a "new arrivals" chalkboard above it
    addBox(0.03, 0.62, 0.72, woodDk, EW - 0.012, 1.55, -0.55, 0.01);
    put(new THREE.PlaneGeometry(0.64, 0.54), texMat(256, 216, (c, w, h) => {
      c.fillStyle = '#2c3a33'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#f2efe4'; c.textAlign = 'left'; c.font = `700 30px ${SCRIPT}`; c.fillText('New arrivals', 16, 36);
      c.font = `20px ${HAND}`;
      NAMES.slice(0, 6).forEach((n, i) => { c.fillStyle = ['#f2efe4', '#f2d27a', '#a8d8c8'][i % 3]; fitLine(c, '· ' + n, 20, HAND, w - 30); c.fillText('· ' + n, 18, 70 + i * 24); });
    }), EW - 0.03, 1.55, -0.55, [0, -Math.PI / 2, 0]).userData.noInk = true;
  }
  function fitLine(c, text, px, font, maxW) { let s = px; do { c.font = `${s}px ${font}`; s -= 1; } while (c.measureText(text).width > maxW && s > 8); }

  // ═════════════ 5. the book cart, half unloaded ═════════════
  {
    const X = -2.55, Z = -2.45;
    if (free(X, Z, 0.38)) {
      claim(X, Z, 0.36);
      const cart = grp(X, 0, Z); cart.rotation.y = 0.25;
      const CB = batch(cart);
      for (const y of [0.18, 0.5, 0.82]) CB.box(0.8, 0.03, 0.36, wood, 0, y, 0, 0.008);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) CB.box(0.035, 0.86, 0.035, woodDk, sx * 0.38, 0.5, sz * 0.16, 0.008);
      for (const sx of [-1, 1]) CB.add(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6), brass, sx * 0.46, 0.84, 0, [Math.PI / 2, 0, 0]);
      CB.box(0.035, 0.035, 0.1, brass, -0.42, 0.84, -0.15, 0.006); CB.box(0.035, 0.035, 0.1, brass, -0.42, 0.84, 0.15, 0.006);
      // books on both shelves, standing and lying
      for (const y of [0.195, 0.515]) {
        let x = -0.36;
        while (x < 0.34) { const bw = 0.04 + R() * 0.04, bh = 0.2 + R() * 0.07; CB.box(bw, bh, 0.22, bookM[Math.floor(R() * bookM.length)], x + bw / 2, y + bh / 2, 0, 0.006, [0, 0, x > 0.25 ? -0.3 : 0]); x += bw + 0.005; }
      }
      let yy = 0.835;
      for (let j = 0; j < 4; j++) { const h = 0.05; CB.box(0.26, h, 0.2, bookM[(j * 3 + 1) % bookM.length], 0.1, yy + h / 2, 0, 0.006, [0, j * 0.2, 0]); yy += h; }
      CB.flush();
      const wheels = [];
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const w = mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.03, 12).rotateX(Math.PI / 2), paint(0x2a2230), cart, sx * 0.36, 0.05, sz * 0.18);
        wheels.push(w);
      }
      let roll = 0, rt = -1;
      live((t, dt) => {
        if (rt < 0) return;
        rt += dt;
        const k = rt < 1.2 ? Math.sin(rt / 1.2 * Math.PI) : 0;
        const off = k * 0.12;
        cart.position.x = X + Math.cos(0.25) * off; cart.position.z = Z - Math.sin(0.25) * off;
        roll = off / 0.05; wheels.forEach(w => { w.rotation.z = -roll; });
        if (rt > 1.2) rt = -1;
      });
      tap(cart, 'book cart', (sfx) => { if (rt < 0) rt = 0; sfx([[220, 0.08], [247, 0.08], [220, 0.08], [196, 0.12]], 'triangle', 0.04); });
    }
  }

  // ═════════════ 6. the lectern with a big open book (front, by the door) ═════════════
  {
    const X = -1.05, Z = -0.35;
    if (free(X, Z, 0.26)) {
      claim(X, Z, 0.24);
      add(new THREE.CylinderGeometry(0.2, 0.24, 0.05, 16), woodDk, X, 0.025, Z);
      add(lathe([[0.06, 0], [0.04, 0.25], [0.05, 0.5], [0.04, 0.78], [0.001, 0.78]], 12), woodDk, X, 0.05, Z);
      const deskA = 0.55;
      const desk = grp(X, 0.88, Z); desk.rotation.x = deskA;                               // the sloped desk, facing the room (+z)
      mesh(rb(0.56, 0.035, 0.42, 0.01), wood, desk, 0, 0, 0);
      mesh(rb(0.56, 0.04, 0.03, 0.008), woodDk, desk, 0, 0.03, 0.2);
      // the open book: two page blocks and a stack of loose leaves that turn about the spine (local x = 0)
      const BK = grp(0, 0.03, -0.01, desk);
      mesh(rb(0.48, 0.012, 0.34, 0.004), red, BK, 0, 0, 0);
      for (const s of [-1, 1]) mesh(rb(0.22, 0.03, 0.32, 0.008), cream, BK, s * 0.115, 0.02, 0, [0, 0, s * 0.04]);
      const pageM = paint(0xfffaf0, { side: THREE.DoubleSide, hatch: 0.2 }), lineM = texMat(128, 192, (c, w, h) => {
        c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(60,50,60,0.45)';
        for (let y = 20; y < h - 16; y += 11) c.fillRect(12, y, w - 24 - ((y * 7) % 30), 3);
        c.fillStyle = '#8e2f3a'; c.font = `700 22px ${SCRIPT}`; c.fillText('README', 14, 18);
      });
      lineM.side = THREE.DoubleSide;
      for (const s of [-1, 1]) { const tx = mesh(new THREE.PlaneGeometry(0.2, 0.3).rotateX(-Math.PI / 2), lineM, BK, s * 0.115, 0.037, 0, [0, 0, s * 0.04]); tx.userData.noInk = true; }
      const leaves = [];
      for (let k = 0; k < 4; k++) {
        const lf = grp(0, 0.04 + k * 0.002, 0, BK);
        const pg = mesh(new THREE.PlaneGeometry(0.21, 0.3).rotateX(-Math.PI / 2).translate(0.105, 0, 0), pageM, lf);   // hinged at the spine
        pg.userData.noInk = true;
        lf.rotation.z = 0.04; leaves.push({ lf, t0: -9 });
      }
      const ribbon = mesh(rb(0.014, 0.003, 0.1, 0.001), paint(0xe4b84f), BK, 0.01, 0.038, 0.19); ribbon.userData.noInk = true;
      const flip = (k, t) => { leaves[k].t0 = t; };
      let nextBreeze = 6;
      live((t) => {
        if (t > nextBreeze) { nextBreeze = t + 7 + Math.random() * 6; flip(Math.floor(Math.random() * 4), t); }
        leaves.forEach(L => {
          const u = Math.min(1, Math.max(0, (t - L.t0) / 0.9));
          const back = Math.min(1, Math.max(0, (t - L.t0 - 2.5) / 0.9));
          const a = 0.04 + (Math.PI - 0.08) * (u * u * (3 - 2 * u)) * (1 - back * back * (3 - 2 * back));
          L.lf.rotation.z = a;
          L.lf.children[0].rotation.x = Math.sin(u * Math.PI) * 0.15;
        });
      });
      tap(desk, 'big open book', (sfx) => {
        const now = kit.now();
        leaves.forEach((L, k) => flip(k, now + k * 0.15));
        kit.say(kit.anyOf(['README, step 1: clone it. Step 2: install it. Step 3: “works on my machine”.', 'README: “This project is a work in progress.” (Since 2019.)',
          'README: “Contributions welcome!” (Please, anyone.)', 'README: “For the full docs, see the code.”', 'README: “TODO: write README.”']));
        sfx([[2600, 0.03], [2200, 0.03], [2800, 0.03], [2400, 0.03]], 'square', 0.01);
      });
    }
  }

  // ═════════════ 7. brass lamps hanging off the side walls ═════════════
  let shushT = -9;                                                                   // (the desk bell's secret makes them flicker)
  {
    const lamps = [];
    for (const [sx, z] of [[-1, -4.1], [-1, -2.9], [1, -4.1], [1, -3.2]]) {
      const ax = sx * (EW - 0.62);
      addBox(0.64, 0.035, 0.035, brass, sx * (EW - 0.31), 2.6, z, 0.008);
      add(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), brass, sx * (EW - 0.02), 2.6, z, [0, 0, Math.PI / 2]);
      const L = grp(ax, 2.6, z);                                                          // hangs from the bracket tip
      mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.18, 4).translate(0, -0.09, 0), paint(0x2a2230, { hatch: 0 }), L).userData.noInk = true;
      mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), brass, L, 0, -0.19, 0);
      mesh(new THREE.SphereGeometry(0.13, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), paint(0x2f6f4a, { side: THREE.DoubleSide }), L, 0, -0.33, 0).scale.y = 0.9;
      const bm = paint(0xfff1c8, { emissive: 0xffd98a, hatch: 0 });
      const b = mesh(new THREE.SphereGeometry(0.045, 10, 8), bm, L, 0, -0.33, 0); b.userData.noInk = true;
      lamps.push({ L, b, t0: -9, k: lamps.length });
      tap(L, 'hanging lamp', (sfx) => { lamps.forEach(l => { if (l.L === L) l.t0 = kit.now(); }); sfx([[880, 0.15], [1320, 0.3]], 'sine', 0.04); });
    }
    live((t) => lamps.forEach(l => {
      const s = t - l.t0, kick = s > 0 && s < 6 ? Math.exp(-s * 0.8) * Math.sin(s * 3.5) * 0.35 : 0;
      l.L.rotation.x = Math.sin(t * 0.6 + l.k) * 0.03 + kick;
      l.L.rotation.z = Math.cos(t * 0.5 + l.k * 2) * 0.02;
      l.b.scale.setScalar(1 + (s > 0 && s < 1 ? (1 - s) * 0.5 : 0));
      const sh = t - shushT; l.b.visible = !(sh > 0 && sh < 1.6 && Math.sin(sh * 40 + l.k * 2) > 0.2);
    }));
  }

  // ═════════════ 8. a desk bell on the counter ═════════════
  {
    const X = 2.28, Y = 0.835, Z = -3.48;
    const bell = grp(X, Y, Z);
    mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.02, 16), woodDk, bell, 0, 0.01, 0);
    const dome = grp(0, 0.02, 0, bell);
    mesh(new THREE.SphereGeometry(0.06, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), brass, dome);
    const btn = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.03, 6), brass, dome, 0, 0.07, 0);
    let ring = 0;
    live((t, dt) => {
      ring = Math.max(0, ring - dt * 1.6);
      btn.position.y = 0.07 - (ring > 0.85 ? 0.012 : 0);
      dome.scale.set(1 + Math.sin(t * 60) * 0.03 * ring, 1 - Math.sin(t * 60) * 0.03 * ring, 1 + Math.sin(t * 60) * 0.03 * ring);
    });
    const shh = mesh(new THREE.PlaneGeometry(0.7, 0.3), texMat(280, 120, (c, w, h) => {
      c.fillStyle = '#fffdf6'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 30, 20); c.fill(); c.strokeStyle = INKC; c.lineWidth = 5; c.stroke();
      c.beginPath(); c.moveTo(60, h - 27); c.lineTo(50, h - 4); c.lineTo(90, h - 27); c.fill();
      c.fillStyle = '#c0392b'; c.font = `700 56px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('SHHHH!', w / 2, 66);
    }), bell, 0.1, 0.5, 0.05); shh.userData.noInk = true; shh.visible = false;
    let btaps = [], shhT = -9;
    live((t) => { const k = t - shhT; shh.visible = k > 0 && k < 2.4; const s = Math.min(1, k * 5); shh.scale.setScalar(Math.max(0.01, s * (1 + Math.sin(k * 20) * 0.04))); });
    tap(bell, 'desk bell', (sfx) => {
      ring = 1; sfx([[2093, 0.9]], 'sine', 0.06); setTimeout(() => sfx([[4186, 0.5]], 'sine', 0.015), 10);
      const now = kit.now(); btaps = btaps.filter(q => now - q < 4); btaps.push(now);
      if (btaps.length >= 5) {
        btaps = []; shhT = now; shushT = now;
        setTimeout(() => sfx(Array.from({ length: 10 }, () => [5200 + Math.random() * 1800, 0.05]), 'sawtooth', 0.012), 200);
        kit.say('SHHHHHH! — every book in the library, at once');
      }
    });
  }

  // ═════════════ 9. a shaft of light with dust drifting in it ═════════════
  {
    const top = V3(-1.6, 2.7, -3.2), bot = V3(0.1, 0.0, -2.5);
    const dir = bot.clone().sub(top), len = dir.length();
    const beamM = new THREE.MeshBasicMaterial({ color: 0xffe9b0, transparent: true, opacity: 0.04, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.85, len, 24, 1, true), beamM);
    beam.position.copy(top).addScaledVector(dir, 0.5);
    beam.quaternion.setFromUnitVectors(V3(0, -1, 0), dir.clone().normalize());
    beam.userData.noInk = true; beam.renderOrder = 5; g.add(beam);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(0.85, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffe0a0, transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending }));
    pool.scale.set(1, 1, 0.8); pool.position.set(bot.x, 0.02, bot.z); pool.userData.noInk = true; pool.renderOrder = 5; g.add(pool);
    const N = 70, motes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.008, 5, 4), new THREE.MeshBasicMaterial({ color: 0xfff4d0, transparent: true, opacity: 0.9, depthWrite: false }), N);
    motes.userData.noInk = true; motes.frustumCulled = false; g.add(motes);
    const M = Array.from({ length: N }, () => ({ u: Math.random(), a: Math.random() * 6.28, r: Math.sqrt(Math.random()), s: 0.01 + Math.random() * 0.02, ph: Math.random() * 6.28 }));
    const d = new THREE.Object3D(), nrm = dir.clone().normalize();
    const side1 = V3(0, 0, 1).cross(nrm).normalize(), side2 = nrm.clone().cross(side1).normalize();
    live((t, dt) => {
      beamM.opacity = 0.038 + Math.sin(t * 0.4) * 0.008;
      M.forEach((m, i) => {
        m.u = (m.u + m.s * dt) % 1; m.a += dt * 0.2;
        const rad = (0.45 + 0.4 * m.u) * m.r * 0.85;
        d.position.copy(top).addScaledVector(dir, m.u)
          .addScaledVector(side1, Math.cos(m.a) * rad + Math.sin(t * 0.7 + m.ph) * 0.03)
          .addScaledVector(side2, Math.sin(m.a) * rad);
        d.scale.setScalar(0.6 + 0.6 * Math.abs(Math.sin(t * 1.5 + m.ph)));
        d.updateMatrix(); motes.setMatrixAt(i, d.matrix);
      });
      motes.instanceMatrix.needsUpdate = true;
    });
  }

  // ═════════════ 10. THE SIGNATURE TRICK: books are portals ═════════════
  // Six glowing books on the east case are real repositories. Pull one and it flies to the
  // reading table, falls open, and the repo springs up out of it as a pop-up diorama.
  {
    const PORTALS = [
      ['whiteboard', 'A coding agent draws what it’s doing on a whiteboard: its plan, its decisions and why.', 0x2f5a52],
      ['equalizer', 'Beats from math: every drum and bass line is an equation you can read and tweak.', 0x8f7ae8],
      ['RL_Tutorial', 'Reinforcement learning on a cart-pole: reward design, PPO — and reward hacking.', 0xe8604c],
      ['ros2_depth_camera_tutorial', 'Stream a RealSense depth camera over HTTP from your own ROS2 nodes.', 0x3f5872],
      ['adapter-portability', 'Move a LoRA fine-tune onto the next version of its base model without retraining it.', 0xe4b84f],
      ['art-heist', 'The Vanishing Gallery: the detective game this whole street borrows its look from.', 0x8e2f3a],
    ];
    const TX = 2.38, TY = 0.775, TZ = -1.45;                                       // where books open: the reading table
    const books = PORTALS.map(([name, blurb, col], i) => {
      const z = -4.02 + i * 0.115, home = V3(3.79, 1.118, z);
      const b = grp(home.x, home.y, home.z);
      const BB = batch(b);
      BB.box(0.26, 0.32, 0.085, paint(col), 0, 0, 0, 0.01);
      BB.box(0.25, 0.3, 0.07, cream, 0.008, 0, 0, 0.004);                          // the page block, set in from the covers
      BB.box(0.005, 0.03, 0.088, brass, -0.131, 0.11, 0, 0.002); BB.box(0.005, 0.03, 0.088, brass, -0.131, -0.11, 0, 0.002);
      BB.flush();
      const spine = mesh(new THREE.PlaneGeometry(0.075, 0.2), texMat(48, 128, (c, w, h) => {
        c.save(); c.translate(w / 2, h / 2); c.rotate(-Math.PI / 2); c.fillStyle = '#fbe7b0'; c.textAlign = 'center'; c.textBaseline = 'middle';
        let s = 22; do { c.font = `700 ${s}px ${HAND}`; s -= 1; } while (c.measureText(name).width > h - 8 && s > 8); c.fillText(name, 0, 1); c.restore();
      }), b, -0.1315, 0, 0, [0, -Math.PI / 2, 0]); spine.userData.noInk = true;
      const glow = mesh(new THREE.PlaneGeometry(0.09, 0.34), new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.3, depthWrite: false, blending: THREE.AdditiveBlending }), b, -0.134, 0, 0, [0, -Math.PI / 2, 0]);
      glow.userData.noInk = true;
      return { name, blurb, col, b, home, glow, i };
    });
    // the pop-up: one cover stays flat, the other swings open about the spine; the scene rises from the fold
    const P = grp(TX, TY, TZ); P.visible = false;
    const coverM = paint(0x8e2f3a), coverM2 = paint(0x8e2f3a);
    mesh(rb(0.3, 0.02, 0.42, 0.006).translate(0.15, 0.01, 0), coverM, P);
    mesh(rb(0.28, 0.025, 0.4, 0.006).translate(0.145, 0.03, 0), cream, P);
    const lid = grp(0, 0.0, 0, P);
    mesh(rb(0.3, 0.02, 0.42, 0.006).translate(-0.15, 0.01, 0), coverM2, lid);
    mesh(rb(0.28, 0.025, 0.4, 0.006).translate(-0.145, 0.03, 0), cream, lid);
    const stage = grp(0, 0.045, 0, P);                                            // the diorama rises from here

    // ── the six dioramas ──
    const scenes = {};
    const sceneGrp = (name) => { const s = grp(0, 0, 0, stage); s.visible = false; scenes[name] = { g: s, tick: () => {} }; return s; };
    // 1. whiteboard: a little board on an easel; a marker draws the agent's plan, box by box
    {
      const s = sceneGrp('whiteboard');
      for (const sx of [-1, 1]) mesh(rb(0.015, 0.36, 0.015, 0.004), woodDk, s, sx * 0.17, 0.18, -0.05, [-0.1, 0, 0]);
      const bt = canvasTex(256, 176, () => {});
      const board = mesh(rb(0.38, 0.27, 0.012, 0.004), paint(0xffffff, { map: bt, hatch: 0, unique: true }), s, 0, 0.25, -0.04);
      const pen = mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 8), paint(0xe8604c), s, 0, 0.25, -0.02, [0.6, 0, 0.4]);
      const STEPS = [['PLAN', 20, 20], ['read the repo', 20, 62], ['why: tests first', 136, 62], ['DECIDE', 20, 104], ['✓ done', 136, 140]];
      scenes.whiteboard.tick = (t, u) => {
        const c = bt.image.getContext('2d'), k = (u * 1.4) % 1.25;
        c.fillStyle = '#fbfbf6'; c.fillRect(0, 0, 256, 176);
        c.strokeStyle = '#3f5872'; c.fillStyle = '#2a2230'; c.lineWidth = 3; c.font = `700 18px ${HAND}`;
        const n = Math.min(STEPS.length, Math.floor(k * STEPS.length * 1.1));
        STEPS.slice(0, n).forEach(([txt, x, y], j) => {
          c.strokeRect(x, y, 104, 30); c.fillText(txt, x + 6, y + 21);
          if (j) { c.beginPath(); c.moveTo(STEPS[j - 1][1] + 52, STEPS[j - 1][2] + 30); c.lineTo(x + 52, y); c.stroke(); }
        });
        bt.needsUpdate = true;
        const cur = STEPS[Math.min(STEPS.length - 1, n)];
        pen.position.set(-0.19 + (cur[1] + 52 + Math.sin(t * 12) * 40) / 256 * 0.38, 0.385 - (cur[2] + 15) / 176 * 0.27, -0.025);
      };
    }
    // 2. equalizer: bars bouncing to an equation
    {
      const s = sceneGrp('equalizer');
      const bars = [];
      for (let k = 0; k < 9; k++) { const m = mesh(rb(0.035, 1, 0.035, 0.008).translate(0, 0.5, 0), paint(BOOKC[k % BOOKC.length]), s, -0.2 + k * 0.05, 0, 0.02); bars.push(m); }
      const eq = mesh(new THREE.PlaneGeometry(0.36, 0.08), texMat(256, 56, (c, w, h) => { c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `700 26px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('kick = sin(2π·2t)⁸', w / 2, 38); }), s, 0, 0.33, -0.08);
      eq.userData.noInk = true;
      scenes.equalizer.tick = (t) => bars.forEach((m, k) => { const beat = Math.pow(Math.abs(Math.sin(t * Math.PI * 2 + (k < 3 ? 0 : k * 0.7))), k < 3 ? 8 : 2); m.scale.y = 0.02 + beat * (0.25 - Math.abs(k - 4) * 0.015); });
    }
    // 3. RL_Tutorial: a cart-pole, balanced by a little policy (and nudged now and then)
    {
      const s = sceneGrp('RL_Tutorial');
      mesh(rb(0.48, 0.015, 0.03, 0.004), paint(0x6f7d92), s, 0, 0.05, 0.02);
      for (const sx of [-1, 1]) mesh(rb(0.015, 0.05, 0.03, 0.004), paint(0x6f7d92), s, sx * 0.24, 0.025, 0.02);
      const cart = grp(0, 0.075, 0.02, s);
      mesh(rb(0.09, 0.04, 0.06, 0.008), paint(0xe8604c), cart);
      for (const sx of [-1, 1]) mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.065, 10).rotateX(Math.PI / 2), paint(0x2a2230), cart, sx * 0.03, -0.022, 0);
      const pole = grp(0, 0.02, 0.0, cart);                                       // pivot at the hinge on the cart
      mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.26, 6).translate(0, 0.13, 0), paint(0xc9a24a), pole);
      mesh(new THREE.SphereGeometry(0.016, 8, 6), paint(0xc9a24a), pole, 0, 0.26, 0);
      const rt = canvasTex(200, 48, () => {});
      const sign = mesh(new THREE.PlaneGeometry(0.3, 0.07), paint(0xffffff, { map: rt, hatch: 0, unique: true }), s, 0, 0.34, -0.1); sign.userData.noInk = true;
      let th = 0.1, w = 0, x = 0, v = 0, reward = 0, nudge = 2, lastR = -1;
      scenes.RL_Tutorial.tick = (t, u, dt) => {
        const h = Math.min(dt, 0.033);
        nudge -= h; if (nudge < 0) { w += (Math.random() < 0.5 ? -1 : 1) * 3.2; nudge = 2.5 + Math.random() * 2; }
        const a = 18 * th + 4 * w + 1.2 * x + 1.6 * v;                            // the trained policy (a PD controller in a trench coat)
        v += a * h; v *= 0.98; x += v * h; x = Math.max(-0.17, Math.min(0.17, x));
        w += (9.8 / 0.26 * Math.sin(th) - a * Math.cos(th) / 0.26) * h; w *= 0.995; th += w * h;
        if (Math.abs(th) > 1.2) { th = 0.05; w = 0; x = 0; v = 0; reward = 0; }    // fell over: new episode
        reward += h * 30;
        cart.position.x = x; pole.rotation.z = -th;
        if (Math.floor(reward) !== lastR) { lastR = Math.floor(reward); const c = rt.image.getContext('2d'); c.fillStyle = '#fffdf6'; c.fillRect(0, 0, 200, 48); c.fillStyle = INKC; c.font = `700 15px ${HAND}`; c.textAlign = 'center'; c.fillText(`reward: ${lastR}  (+1 per frame upright)`, 100, 30); rt.needsUpdate = true; }
      };
    }
    // 4. ros2_depth_camera_tutorial: a depth camera on a tripod sweeps the blocks; points appear, coloured by depth
    {
      const s = sceneGrp('ros2_depth_camera_tutorial');
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; mesh(rb(0.01, 0.16, 0.01, 0.003), paint(0x2a2230), s, -0.2 + Math.cos(a) * 0.03, 0.075, 0.12 + Math.sin(a) * 0.03, [Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3]); }
      const cam = grp(-0.2, 0.16, 0.12, s);
      mesh(rb(0.09, 0.025, 0.025, 0.006), paint(0x3a3c40), cam);
      for (const dx of [-0.028, 0, 0.028]) mesh(new THREE.CircleGeometry(0.007, 10).rotateY(Math.PI / 2), paint(0x93abc0, { hatch: 0 }), cam, 0.046, 0, 0, [0, 0, 0]).position.z = dx;
      const fanM = new THREE.MeshBasicMaterial({ color: 0x7fd0ff, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
      const fan = new THREE.Mesh(new THREE.CircleGeometry(0.45, 12, -0.3, 0.6).rotateX(-Math.PI / 2), fanM); fan.userData.noInk = true; cam.add(fan);
      const blocks = [[0.05, 0.05, -0.1, 0.1], [0.18, 0.04, 0.0, 0.08], [0.0, 0.07, 0.12, 0.06]];
      for (const [bx, by, bz, r] of blocks) mesh(rb(r * 1.4, by * 2, r * 1.4, 0.006), paint(0xd9c9a3), s, bx, by, bz);
      const NP = 120, pts = new THREE.InstancedMesh(new THREE.BoxGeometry(0.008, 0.008, 0.008), new THREE.MeshBasicMaterial({ color: 0xffffff }), NP);
      pts.userData.noInk = true; s.add(pts);
      const dmy = new THREE.Object3D(), col = new THREE.Color();
      const P0 = Array.from({ length: NP }, (_, k) => { const [bx, by, bz, r] = blocks[k % 3]; const top = Math.random() < 0.5; return [bx + (Math.random() - 0.5) * r * 1.4, top ? by * 2 + 0.005 : Math.random() * by * 2, bz + (top ? (Math.random() - 0.5) * r * 1.4 : r * 0.7 + 0.005)]; });
      P0.forEach((p, k) => { const d = Math.hypot(p[0] + 0.2, p[2] - 0.12); col.setHSL(0.66 * Math.min(1, d / 0.45), 0.9, 0.55); pts.setColorAt(k, col); });
      scenes.ros2_depth_camera_tutorial.tick = (t) => {
        const sweep = Math.sin(t * 1.2) * 0.6;
        cam.rotation.y = -0.25 + sweep;
        P0.forEach((p, k) => {
          const ang = Math.atan2(-(p[2] - 0.12), p[0] + 0.2), seen = Math.abs(ang - (-0.25 + sweep) * -1) < 0.6 || ((t * 1.2) % 6.28) > 3.5;
          dmy.position.set(p[0], p[1], p[2]); dmy.scale.setScalar(seen ? 1 : 0.001); dmy.updateMatrix(); pts.setMatrixAt(k, dmy.matrix);
        });
        pts.instanceMatrix.needsUpdate = true; if (pts.instanceColor) pts.instanceColor.needsUpdate = true;
      };
    }
    // 5. adapter-portability: the LoRA adapter hops from base model v1 to v2 and clicks in
    {
      const s = sceneGrp('adapter-portability');
      const tower = (x, label, col) => {
        for (let k = 0; k < 5; k++) mesh(rb(0.14, 0.035, 0.12, 0.006), paint(k % 2 ? col : 0x93abc0), s, x, 0.02 + k * 0.04, 0);
        const lb = mesh(new THREE.PlaneGeometry(0.14, 0.05), texMat(96, 34, (c, w, h) => { c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `700 22px ${HAND}`; c.textAlign = 'center'; c.fillText(label, w / 2, 25); }), s, x, 0.1, 0.062);
        lb.userData.noInk = true;
      };
      tower(-0.15, 'base v1', 0x5a6f86); tower(0.15, 'base v2', 0x2f5a52);
      const plug = grp(-0.15, 0.22, 0, s);
      mesh(rb(0.08, 0.035, 0.07, 0.008), paint(0xe4b84f, { emissive: 0x806020 }), plug);
      for (const dx of [-0.02, 0.02]) mesh(rb(0.008, 0.025, 0.008, 0.002), brass, plug, dx, -0.028, 0);
      const tag = mesh(new THREE.PlaneGeometry(0.2, 0.05), texMat(150, 36, (c, w, h) => { c.fillStyle = '#e4b84f'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `700 20px ${HAND}`; c.textAlign = 'center'; c.fillText('LoRA · no retraining', w / 2, 24); }), s, 0, 0.34, -0.05);
      tag.userData.noInk = true;
      scenes['adapter-portability'].tick = (t) => {
        const ph = (t * 0.35) % 1, e = Math.min(1, Math.max(0, (ph - 0.2) / 0.5)), k = e * e * (3 - 2 * e);
        plug.position.x = -0.15 + 0.3 * k; plug.position.y = 0.22 + Math.sin(k * Math.PI) * 0.1;
        plug.rotation.z = Math.sin(k * Math.PI) * 0.6;
      };
    }
    // 6. art-heist: a tiny gallery wall; the painting vanishes, a torch sweeps, it's back
    {
      const s = sceneGrp('art-heist');
      mesh(rb(0.46, 0.3, 0.02, 0.004), paint(0x6a4a8a), s, 0, 0.15, -0.12);
      const frame = grp(0, 0.17, -0.105, s);
      for (const [w, h, x, y] of [[0.2, 0.018, 0, 0.075], [0.2, 0.018, 0, -0.075], [0.018, 0.15, -0.09, 0], [0.018, 0.15, 0.09, 0]]) mesh(rb(w, h, 0.015, 0.004), paint(0xd9a640), frame, x, y, 0);
      const art = mesh(new THREE.PlaneGeometry(0.165, 0.13), texMat(96, 76, (c, w, h) => { c.fillStyle = '#7fb3c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#e4b84f'; c.beginPath(); c.arc(70, 22, 10, 0, 7); c.fill(); c.fillStyle = '#5f8f3e'; c.beginPath(); c.moveTo(0, h); c.lineTo(30, 30); c.lineTo(60, h); c.fill(); }), frame, 0, 0, 0.004);
      art.userData.noInk = true;
      const q = mesh(new THREE.PlaneGeometry(0.1, 0.1), texMat(64, 64, (c, w, h) => { c.fillStyle = INKC; c.font = `700 56px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('?', w / 2, 52); }), frame, 0, 0, 0.003);
      q.userData.noInk = true;
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 14, 1, true).translate(0, -0.15, 0).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xfff1a0, transparent: true, opacity: 0.25, depthWrite: false, side: THREE.DoubleSide }));
      beam.userData.noInk = true; beam.position.set(0, 0.2, 0.2); s.add(beam);
      scenes['art-heist'].tick = (t) => {
        const ph = (t * 0.3) % 1, gone = ph > 0.35 && ph < 0.75;
        art.visible = !gone; q.visible = gone;
        beam.visible = gone; beam.rotation.y = Math.sin(t * 2) * 0.5;
      };
    }

    // ── the page of Vivi's list is a bookmark in the art-heist book: its corner pokes out of the top ──
    const heist = books.find(b => b.name === 'art-heist');
    const pg = kit.page();
    const tuck = () => { pg.position.set(0.02, 0.07, 0); pg.rotation.set(0, 0, 0); pg.scale.setScalar(0.55); heist.b.add(pg); };
    if (!pg.collected) tuck();

    // ── the pull: out of the shelf, through the air, open on the table, and back again ──
    let cur = null, state = 'idle', st = 0, queued = null, showT = 0, FAST = 1;
    const qShelf = new THREE.Quaternion(), qTable = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI / 2));
    const OUT = V3(-0.22, 0.02, 0), TABLE = V3(TX + 0.15, TY + 0.045, TZ);
    const pose = (b, k) => {                                                       // k: 0 shelf … 1 table, on an arc
      const from = b.home.clone().add(OUT), p = from.clone().lerp(TABLE, k); p.y += Math.sin(k * Math.PI) * 0.5;
      b.b.position.copy(p); b.b.quaternion.slerpQuaternions(qShelf, qTable, k);
    };
    live((t, dt) => {
      books.forEach(b => { b.glow.material.opacity = 0.22 + 0.14 * Math.sin(t * 3 + b.i); });
      if (state === 'idle') return;
      dt *= FAST; st += dt;
      const b = cur;
      if (state === 'out') { const k = Math.min(1, st / 0.4); b.b.position.copy(b.home).addScaledVector(OUT, k); b.b.rotation.z = Math.sin(k * Math.PI) * 0.05; if (k >= 1) { state = 'fly'; st = 0; } }
      else if (state === 'fly') { const k = Math.min(1, st / 0.9); pose(b, k * k * (3 - 2 * k)); if (k >= 1) { state = 'open'; st = 0; b.b.visible = false; P.visible = true; coverM.color.setHex(b.col); coverM2.color.setHex(b.col); scenes[b.name].g.visible = true; if (b.name === 'art-heist' && !pg.collected && pg.visible !== false) { P.add(pg); pg.position.set(0.2, 0.05, 0.14); pg.rotation.set(0, -0.6, 0); pg.scale.setScalar(1); } kit.say(`${b.name}: ${b.blurb}`); } }
      else if (state === 'open' || state === 'show' || state === 'shut') {
        let k;
        if (state === 'open') { k = Math.min(1, st / 0.8); if (k >= 1) { state = 'show'; st = 0; showT = 0; } }
        else if (state === 'show') { k = 1; showT += dt; if (showT > 16 || queued) { state = 'shut'; st = 0; } }
        else { k = Math.max(0, 1 - st / 0.6); }
        lid.rotation.z = -Math.PI * (1 - Math.min(1, k * 1.15));
        const rise = state === 'open' ? Math.max(0, (k - 0.35) / 0.65) : k;
        const sp = rise >= 1 ? 1 : rise * (1 + Math.sin(rise * Math.PI) * 0.35);    // a little pop-up overshoot
        stage.scale.set(1, Math.max(0.001, sp), 1);
        scenes[b.name].tick(t, st, dt);
        if (state === 'shut' && k <= 0) {
          state = 'back'; st = 0; P.visible = false; scenes[b.name].g.visible = false; b.b.visible = true;
          if (b.name === 'art-heist' && !pg.collected && pg.parent === P) tuck();
        }
      } else if (state === 'back') { const k = Math.min(1, st / 0.9); pose(b, 1 - k * k * (3 - 2 * k)); if (k >= 1) { state = 'in'; st = 0; } }
      else if (state === 'in') { const k = Math.min(1, st / 0.4); b.b.position.copy(b.home).addScaledVector(OUT, 1 - k); b.b.quaternion.identity(); if (k >= 1) { state = 'idle'; cur = null; if (queued) { const q = queued; queued = null; pull(q); } } }
    });
    const pull = (b) => {
      if (state === 'idle') { cur = b; state = 'out'; st = 0; return true; }
      if (cur === b) { if (state === 'show') { state = 'shut'; st = 0; } return false; }     // tap the open one again: it closes
      queued = b; return false;
    };
    books.forEach(b => tap(b.b, `${b.name} (pull me)`, (sfx) => { pull(b); sfx([[330, 0.06], [494, 0.06], [659, 0.12]], 'triangle', 0.04); }));
    tap(P, 'pop-up book (tap to close)', (sfx) => { if (state === 'show') { state = 'shut'; st = 0; sfx([[494, 0.06], [330, 0.1]], 'triangle', 0.04); } });
    // a label on the shelf edge under them
    const lbl = put(new THREE.PlaneGeometry(0.5, 0.06), texMat(250, 30, (c, w, h) => { c.fillStyle = '#e4b84f'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `700 20px ${HAND}`; c.textAlign = 'center'; c.fillText('REFERENCE — pull to open ✦', w / 2, 22); }), 3.575, 0.905, -3.73, [0, -Math.PI / 2, 0]);
    lbl.userData.noInk = true;
    window.__libPortal = { pull: (name) => pull(books.find(b => b.name === name)), fast: (k) => { FAST = k; } };     // (for the check sheet: slow headless frames)
  }

  // ═════════════ 11. THE SMARTER GAME: the librarian's questions (you have to have looked) ═════════════
  {
    const st = kit.K.minis.find(q => q.label === 'guess the book');
    const blurbGame = st?.run;
    const hourWord = (h) => ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven'][((h % 12) + 12) % 12];
    const ASK = () => {
      const now = new Date(), h = now.getHours() + (now.getMinutes() >= 30 ? 1 : 0);
      return [
        { q: 'What time does the grandfather clock show, roughly?', choices: [`about ${hourWord(h)} o’clock`, `about ${hourWord(h + 3)} o’clock`, `about ${hourWord(h + 6)} o’clock`, `about ${hourWord(h - 4)} o’clock`], answer: 0, why: 'It keeps real time — your time.' },
        { q: 'Which repository is chalked first under “New arrivals”?', choices: [NAMES[0], NAMES[3], NAMES[5], 'hello-world'], answer: 0, why: `The chalkboard by the globe starts with ${NAMES[0]}.` },
        { q: 'What does the sign over the wingback chair ask?', choices: ['no running', 'quiet please', 'mind the cat', 'return by Friday'], answer: 1, why: 'Quiet please — the books are thinking.' },
        { q: 'How many brass lamps hang off the side walls?', choices: ['two', 'three', 'four', 'six'], answer: 2, why: 'Four: two on each side.' },
        { q: 'The big book on the lectern is open at…', choices: ['the LICENSE', 'the README', 'the CHANGELOG', 'page 404'], answer: 1, why: 'The README, of course. Nobody reads the LICENSE.' },
        { q: 'Pull “RL_Tutorial” from the glowing shelf. What is the little cart trying to do?', choices: ['win a race', 'keep a pole upright', 'deliver books', 'push the ladder'], answer: 1, why: 'Balance the pole: +1 reward for every frame it stays up.' },
        { q: 'Pull “equalizer”. What makes the bars move?', choices: ['a microphone', 'an equation', 'a hamster', 'the wind'], answer: 1, why: 'Equations: the beats are maths you can read.' },
        { q: 'What is asleep on the middle back shelf?', choices: ['a moth', 'a cat', 'the librarian', 'a laptop'], answer: 1, why: 'The library cat. Do not wake the library cat.' },
      ];
    };
    if (st) kit.games.replace('guess the book', (m) => {
      const g = m.game;
      g.open('The librarian’s questions');
      g.text('A good reader notices things. Four questions about this room — the answers are all around you (some are inside the glowing books).');
      g.next('begin', () => kit.quiz(g, 'The librarian’s questions', kit.shuffle(ASK()).slice(0, 4).map(r => {
        const o = kit.shuffle(r.choices.map((c, i) => i));
        return { q: r.q, choices: o.map(i => r.choices[i]), answer: o.indexOf(r.answer), why: r.why };
      }), { end: (s, n) => `${s} of ${n}. ${s === n ? 'Library card: upgraded to gold.' : 'Have another browse — and pull a few of the glowing books.'}` }));
      if (blurbGame) g.next('or: guess the book from its blurb', () => blurbGame(m));
    }, 'the librarian’s questions');
  }

  // ═════════════ 12. funny bits ═════════════
  {
    // an overdue notice taped to the counter front
    put(new THREE.PlaneGeometry(0.36, 0.26), texMat(180, 130, (c, w, h) => {
      c.fillStyle = '#fff6c8'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0392b'; c.textAlign = 'center'; c.font = `700 24px ${SCRIPT}`; c.fillText('OVERDUE', w / 2, 28);
      c.fillStyle = INKC; c.font = `15px ${HAND}`;
      ['ghanemja.github.io —', '1,204 commits late.', 'Fine: one (1) star', 'per merged PR.'].forEach((l, i) => c.fillText(l, w / 2, 52 + i * 19));
    }), 1.05, 0.5, -3.37).userData.noInk = true;
    // the book cart's sign
    put(new THREE.PlaneGeometry(0.3, 0.1), texMat(150, 50, (c, w, h) => { c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `700 18px ${HAND}`; c.textAlign = 'center'; c.fillText('RETURNS', w / 2, 20); c.font = `14px ${HAND}`; c.fillText('pull requests welcome', w / 2, 40); }), -2.2, 0.68, -2.31, [0, 0.25, 0]).userData.noInk = true;
  }

  // ═════════════ 13. WALK-OVER FLOOR: a long runner, a compass inlay, a side rug, dropped bookmarks, a floor plaque ═════════════
  {
    const decal = (w, d, x, z, ry, draw, { y = 0.008, ppm = 128, ro = 1 } = {}) => {
      const m = put(new THREE.PlaneGeometry(w, d), texMat(Math.round(w * ppm), Math.round(d * ppm), draw), x, y, z, [-Math.PI / 2, 0, ry]);
      m.userData.noInk = true; m.renderOrder = ro; return m;
    };
    // the runner from the door to the reading rug: green, gold fleurs, a red border, fringed ends
    decal(0.85, 2.1, 0, -0.73, 0, (c, w, h) => {
      c.fillStyle = '#8e2f3a'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2f5a42'; c.fillRect(14, 14, w - 28, h - 28);
      c.strokeStyle = '#e4b84f'; c.lineWidth = 3; c.strokeRect(20, 20, w - 40, h - 40);
      c.fillStyle = 'rgba(228,184,79,0.7)';
      for (let y = 50; y < h - 30; y += 52) for (const x of [w * 0.3, w * 0.7]) { c.beginPath(); c.ellipse(x, y - 6, 4, 9, 0, 0, 7); c.fill(); for (const s of [-1, 1]) { c.beginPath(); c.ellipse(x + s * 7, y - 1, 3, 7, s * 0.8, 0, 7); c.fill(); } c.fillRect(x - 6, y + 4, 12, 3); }
      c.fillStyle = '#f1e4c8'; for (let x = 6; x < w; x += 8) { c.fillRect(x, 0, 3, 8); c.fillRect(x, h - 8, 3, 8); }
    });
    // a side rug by the west case, under the ladder's feet
    decal(0.95, 1.5, -2.82, -4.0, 0, (c, w, h) => {
      c.fillStyle = '#3f5872'; c.fillRect(0, 0, w, h); c.strokeStyle = '#e4b84f'; c.lineWidth = 8; c.strokeRect(10, 10, w - 20, h - 20);
      c.strokeStyle = '#dc9e9a'; c.lineWidth = 4; c.strokeRect(24, 24, w - 48, h - 48);
      c.fillStyle = '#e4b84f'; c.save(); c.translate(w / 2, h / 2); for (let k = 0; k < 8; k++) { c.rotate(Math.PI / 4); c.beginPath(); c.ellipse(0, 22, 7, 20, 0, 0, 7); c.fill(); } c.restore();
      c.fillStyle = '#f1e4c8'; for (let x = 6; x < w; x += 8) { c.fillRect(x, 0, 3, 7); c.fillRect(x, h - 7, 3, 7); }
    });
    // a "SILENCE" brass plaque set in the floor by the reading nook
    decal(0.62, 0.26, -1.25, -1.4, 0.15, (c, w, h) => {
      c.fillStyle = '#c9a24a'; c.fillRect(0, 0, w, h); c.strokeStyle = '#7a5a20'; c.lineWidth = 6; c.strokeRect(4, 4, w - 8, h - 8);
      c.fillStyle = '#5a3c10'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 28px ${HAND}`; c.fillText('S I L E N C E', w / 2, h * 0.42);
      c.font = `14px ${HAND}`; c.fillText('(git status: clean)', w / 2, h * 0.78);
      for (const [x, y] of [[12, 12], [w - 12, 12], [12, h - 12], [w - 12, h - 12]]) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
    }, { y: 0.009 });
    // dropped bookmarks, call-number slips and loose pages
    const litter = (seed) => (c, w, h) => {
      const Rr = kit.mkRng(seed), cols = ['#e8604c', '#e4b84f', '#7fb3a8', '#8f7ae8', '#dc9e9a'];
      for (let k = 0; k < 3; k++) {                                             // loose pages
        c.save(); c.translate(Rr() * w, Rr() * h); c.rotate(Rr() * 6);
        c.fillStyle = '#fbf6ea'; c.fillRect(-26, -34, 52, 68); c.strokeStyle = 'rgba(60,50,60,0.25)'; c.lineWidth = 2;
        for (let y = -24; y < 28; y += 7) { c.beginPath(); c.moveTo(-20, y); c.lineTo(14 - (y * 3) % 10, y); c.stroke(); }
        c.restore();
      }
      for (let k = 0; k < 4; k++) {                                             // ribbon bookmarks with tassels
        c.save(); c.translate(Rr() * w, Rr() * h); c.rotate(Rr() * 6);
        c.fillStyle = cols[k % cols.length]; c.fillRect(-5, -26, 10, 52); c.beginPath(); c.moveTo(-5, 26); c.lineTo(0, 20); c.lineTo(5, 26); c.fillStyle = '#5a4030'; c.fill();
        c.restore();
      }
      c.save(); c.translate(Rr() * w * 0.8 + 20, Rr() * h * 0.8 + 20); c.rotate(Rr());                // a call slip
      c.fillStyle = '#fff6c8'; c.fillRect(-30, -14, 60, 28); c.fillStyle = INKC; c.font = `12px ${HAND}`; c.fillText('005.1 GHA', -24, 4); c.restore();
    };
    for (const [x, z, s, sd] of [[0.75, -1.35, 0.6, 2], [-0.65, -3.0, 0.55, 5], [-1.95, -1.15, 0.55, 9], [1.35, -4.45, 0.5, 14], [-2.0, -2.55, 0.5, 17], [0.95, -2.95, 0.5, 23], [-0.55, -0.2, 0.45, 29]]) decal(s, s, x, z, sd, litter(sd), { y: 0.021, ppm: 120, ro: 2 });   // (above the reading rug too)

    // the fun one: a compass rose inlaid in the parquet. Tap it: the needle spins, then points at
    // whatever you're still missing in here (the lost page, while it's lost) — or at the cat
    const CX = 0.95, CZ = -0.62, CR = 0.48;
    decal(CR * 2, CR * 2, CX, CZ, 0, (c, w, h) => {
      const r = w / 2; c.translate(r, r);
      c.fillStyle = '#d9b98a'; c.beginPath(); c.arc(0, 0, r - 2, 0, 7); c.fill();
      c.strokeStyle = '#5c4030'; c.lineWidth = 6; c.beginPath(); c.arc(0, 0, r - 5, 0, 7); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 0.82, 0, 7); c.stroke();
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2, L = k % 4 === 0 ? r * 0.78 : k % 2 ? r * 0.38 : r * 0.55; c.fillStyle = k % 2 ? '#8e2f3a' : '#3f5872'; c.beginPath(); c.moveTo(Math.cos(a) * L, Math.sin(a) * L); c.lineTo(Math.cos(a + 0.18) * r * 0.14, Math.sin(a + 0.18) * r * 0.14); c.lineTo(Math.cos(a - 0.18) * r * 0.14, Math.sin(a - 0.18) * r * 0.14); c.fill(); }
      c.fillStyle = '#5c4030'; c.font = `700 ${Math.round(r * 0.16)}px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      [['N', 0, -1], ['E', 1, 0], ['S', 0, 1], ['W', -1, 0]].forEach(([l, x, y]) => c.fillText(l, x * r * 0.9, y * r * 0.9));
    }, { y: 0.007, ppm: 150 });
    const needle = grp(CX, 0.016, CZ);
    const ng = new THREE.BufferGeometry().setFromPoints([V3(0, 0, -0.4), V3(0.05, 0, 0), V3(0, 0, 0.18), V3(-0.05, 0, 0)]);
    ng.setIndex([0, 2, 1, 0, 3, 2]); ng.computeVertexNormals();
    const nm = mesh(ng, paint(0xc9a24a, { side: THREE.DoubleSide }), needle); nm.userData.noInk = true;
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 12), paint(0x5c4030), needle);
    const target = () => {                                                           // the lost page, if it's still in here; else the cat
      let pg = null; g.traverse(o => { if (o.userData.toy?.label === 'a lost page!' && o.visible) pg = o; });
      const v = new THREE.Vector3();
      if (pg) { pg.getWorldPosition(v); g.worldToLocal(v); return [v, true]; }
      return [V3(0.55, 0, -D + 0.75), false];
    };
    let spinT = -1, from = 0, to = 0;
    live((t, dt) => {
      if (spinT < 0) { needle.rotation.y += Math.sin(t * 0.7) * 0.002; return; }
      spinT += dt;
      const u = Math.min(1, spinT / 2.2), e = 1 - Math.pow(1 - u, 3);
      needle.rotation.y = from + (to + Math.PI * 8 - from) * e;
      if (u >= 1) spinT = -1;
    });
    const hm = paint(0xffffff, { opacity: 0, hatch: 0, unique: true }); hm.depthWrite = false;
    const hit = grp(CX, 0, CZ); mesh(new THREE.CylinderGeometry(CR, CR, 0.04, 16).translate(0, 0.02, 0), hm, hit).userData.noInk = true;
    tap(hit, 'compass rose', (sfx) => {
      if (spinT >= 0) return;
      const [v, isPage] = target();
      from = needle.rotation.y % (Math.PI * 2); to = Math.atan2(-(v.x - CX), -(v.z - CZ));    // the needle's tip is its −z end
      spinT = 0;
      sfx([[880, 0.05], [988, 0.05], [1175, 0.05], [1318, 0.05], [1760, 0.2]], 'triangle', 0.035);
      setTimeout(() => kit.say(isPage ? 'The compass points at what you’re looking for. (Something in the glowing books, perhaps?)' : 'The compass points at the library cat. Everything here does, eventually.'), 2300);
    });

    // and a couple more book piles along the walls, wherever there's still room
    kit.scatter(3, 0.18, (x, z, i) => {
      let yy = 0;
      for (let j = 0; j < 3 + (i % 3); j++) { const h = 0.06; addBox(0.3 - j * 0.02, h, 0.22, bookM[(i * 5 + j * 3) % bookM.length], x, yy + h / 2, z, 0.008, [0, j * 0.35 + i, 0]); yy += h; }
    }, { along: 'walls' });
  }

  S.flush();
}
