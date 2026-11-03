// ─── dressing for the behaviors room: the proving ground ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// A physics lab where every object gets the same pokes: a rack of SimReady-ish test objects
// sorted by how they behaved, a marble run on a pegboard, a Newton's cradle, a bounce tube,
// a stacking tower that topples, a self-righting wobbler and a bin of bouncy balls.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default function dress(kit) {
  const { THREE, put, paint, rb, tap, live, block, claim, texMat, canvasTex, HAND, SCRIPT, INKC, D, g: G, shadow } = kit;
  const sub = kit.kit;
  const BACK = -D + 0.5;                                   // the back wall's inner face (z)
  const PI = Math.PI;

  // ── static pieces are batched per material and merged into one mesh each ──
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
    steel: paint(0x6f7d92), dark: paint(0x2a2230, { hatch: 0 }), post: paint(0x3f5872), beam: paint(0xe8604c),
    cream: paint(0xf6efdf), card: paint(0xc8a47c), red: paint(0xe8604c), teal: paint(0x7fb3a8), gold: paint(0xe4b84f),
    lilac: paint(0x8f7ae8), blue: paint(0x5f8cc8), green: paint(0x5fae7f), glass: paint(0x9fd0d8), wood: paint(0xb98d62),
    orange: paint(0xf07a3a), white: paint(0xfffaf0), rubber: paint(0x3a3440),
  };
  // ── the room's big trick: pull the lever and the whole lab tilts; everything loose reacts
  //    the way its behaviour class says (roll / slide / tip / hold), then the results come down ──
  const tilt = { t0: -99 }, onTilt = [];
  const TH = 0.1;                                          // how far it tilts (rad, right side down)
  const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  // 0→1 while the room is tilted; the props' own clocks run off tilt.t0
  const tiltEnv = (k) => (k < 0 ? 0 : k < 0.8 ? ease(k / 0.8) : k < 4.4 ? 1 : 1 - ease((k - 4.4) / 1.0));
  const rewind = (k) => (k < 4.4 ? 1 : 1 - ease((k - 4.4) / 1.2));
  const CAT = [['slides', '1,488', '#3f7fd6'], ['tips if pushed high', '358', '#f07a3a'], ['tips easily', '126', '#2fae7f'], ['rolls', '194', '#e9b23a']];

  // a flat canvas picture on a backing board; face: 'back' | 'left' | 'right'
  const poster = (w, h, px, draw, x, y, z, face, { board = 0x2a2230, tilt = 0 } = {}) => {
    const ry = face === 'left' ? PI / 2 : face === 'right' ? -PI / 2 : 0;
    const nx = face === 'left' ? 1 : face === 'right' ? -1 : 0, nz = face === 'back' ? 1 : 0;
    const pic = kit.flat(w, h, texMat(px, Math.round(px * h / w), (c, cw, ch) => draw(c, cw, ch)), x + nx * 0.012, y, z + nz * 0.012, [0, ry, tilt]);
    pic.renderOrder = 2;
    SB(face === 'back' ? w + 0.04 : 0.012, h + 0.04, face === 'back' ? 0.012 : w + 0.04, paint(board, { hatch: 0 }), x, y, z, 0.004, [tilt * (face === 'back' ? 0 : nx), 0, face === 'back' ? tilt : 0]);
    return pic;
  };
  const font = (c, px, f = HAND, wt = 700) => { c.font = `${wt} ${px}px ${f}`; };

  // ════════ 1. the test-object rack along the right wall, one bay per behaviour ════════
  {
    const x0 = 3.5, x1 = 3.9, xc = (x0 + x1) / 2, za = -5.35, zb = -2.6, L = zb - za, bay = L / 4;
    const lv = [0.12, 0.62, 1.12, 1.62, 2.02];
    for (let i = 0; i <= 4; i++) for (const px of [x0 + 0.02, x1 - 0.02]) SB(0.04, 2.08, 0.04, M.post, px, 1.04, za + i * bay, 0.008);
    for (const y of lv) {
      SB(0.42, 0.03, L + 0.04, M.cream, xc, y, (za + zb) / 2, 0.006);
      for (const px of [x0 + 0.01, x1 - 0.01]) SB(0.02, 0.06, L + 0.04, M.beam, px, y - 0.02, (za + zb) / 2, 0.006);
    }
    // feet
    for (let i = 0; i <= 4; i++) SB(0.44, 0.03, 0.08, M.dark, xc, 0.015, za + i * bay, 0.008);
    block(x0 - 0.02, 3.96, za - 0.05, zb + 0.05);
    // the objects, sorted by how they reacted
    const R = kit.rng;
    const bottle = (x, y, z, mat, h = 0.18) => {
      S(new THREE.CylinderGeometry(0.04, 0.042, h, 12), mat, x, y + h / 2, z);
      S(new THREE.CylinderGeometry(0.016, 0.034, 0.06, 10), mat, x, y + h + 0.03, z);
      S(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 10), M.dark, x, y + h + 0.07, z);
    };
    const vase = (x, y, z, mat) => S(new THREE.LatheGeometry([[0.001, 0], [0.05, 0.01], [0.065, 0.08], [0.03, 0.18], [0.04, 0.24], [0.001, 0.24]].map(p => new THREE.Vector2(p[0], p[1])), 14), mat, x, y, z);
    const cone = (x, y, z, mat, h = 0.2) => { S(new THREE.ConeGeometry(0.06, h, 14), mat, x, y + h / 2, z); SB(0.13, 0.02, 0.13, M.white, x, y + 0.01, z, 0.004); };
    const stick = (x, y, z, mat) => { S(new THREE.CylinderGeometry(0.045, 0.05, 0.02, 12), mat, x, y + 0.01, z); S(new THREE.CylinderGeometry(0.014, 0.014, 0.26, 8), mat, x, y + 0.14, z); S(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), M.cream, x, y + 0.295, z); };
    const ball = (x, y, z, mat, r = 0.07) => S(new THREE.SphereGeometry(r, 14, 10), mat, x, y + r, z);
    const can = (x, y, z, mat) => S(new THREE.CylinderGeometry(0.048, 0.048, 0.15, 14), mat, x, y + 0.048, z, [PI / 2, 0, 0]);
    const wheel = (x, y, z) => { S(new THREE.TorusGeometry(0.07, 0.028, 8, 18), M.rubber, x, y + 0.098, z, [0, PI / 2, 0]); S(new THREE.CylinderGeometry(0.04, 0.04, 0.04, 12), M.steel, x, y + 0.098, z, [0, 0, PI / 2]); };
    const crate = (x, y, z, mat, w = 0.16, h = 0.15, d = 0.2) => { SB(d, h, w, mat, x, y + h / 2, z, 0.012); SB(d + 0.006, 0.025, w + 0.006, M.wood, x, y + h * 0.5, z, 0.004); };
    const books = (x, y, z) => { const cs = [M.red, M.blue, M.gold, M.teal]; for (let k = 0; k < 3; k++) SB(0.18 - k * 0.02, 0.04, 0.16 - k * 0.02, cs[(k + Math.floor(R() * 4)) % 4], x, y + 0.02 + k * 0.042, z, 0.006, [0, (R() - 0.5) * 0.3, 0]); };
    const mats = [M.red, M.teal, M.gold, M.lilac, M.blue, M.green, M.glass, M.orange];
    const pick = () => mats[Math.floor(R() * mats.length)];
    const fill = [
      (x, y, z, k) => [crate, books, crate][k](x, y, z, k === 2 ? M.card : pick()),
      (x, y, z, k) => [bottle, vase, bottle][k](x, y, z, pick()),
      (x, y, z, k) => [cone, stick, cone][k](x, y, z, k ? M.cream : M.orange),
      (x, y, z, k) => [ball, can, wheel][k](x, y, z, pick()),
    ];
    for (let b = 0; b < 4; b++) {
      const zc = za + (b + 0.5) * bay;
      for (let l = 0; l < 4; l++) for (let k = 0; k < 3; k++) {
        if ((b * 4 + l * 3 + k) % 7 === 5) continue;              // a few gaps, like a real shelf
        if (b === 1 && l === 2 && k === 1) continue;               // room for the metronome
        if (l === 1 && k === 1) continue;                          // the slot a misfit can sit in
        fill[b](xc + (R() - 0.5) * 0.08, lv[l] + 0.015, zc + (k - 1) * 0.2, k);
      }
    }
    // boxes on top, the archive of every run
    for (let k = 0; k < 6; k++) if (k !== 4) { const h = 0.1 + (k % 3) * 0.04; SB(0.3, h, 0.34, M.card, xc, 2.035 + h / 2, za + 0.22 + k * 0.45, 0.012, [0, (R() - 0.5) * 0.2, 0]); }
    // the bay signs: one strip above the rack, a colour chip per behaviour
    const strip = kit.flat(L, 0.22, texMat(1024, 82, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
      c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(2, 2, w - 4, h - 4);
      CAT.forEach(([name, n, col], i) => {
        const x = (i + 0.5) * w / 4;
        c.fillStyle = col; c.beginPath(); c.arc(x - w / 8 + 26, h / 2, 14, 0, 7); c.fill(); c.stroke();
        font(c, 30); c.fillStyle = INKC; c.textAlign = 'left'; c.textBaseline = 'middle';
        let s = 30; while (c.measureText(name).width > w / 4 - 110 && s > 14) font(c, s -= 2);
        c.fillText(name, x - w / 8 + 48, h / 2);
        font(c, 22, HAND, 400); c.fillStyle = '#6a6070'; c.textAlign = 'right'; c.fillText(n, x + w / 8 - 10, h / 2 + 2);
        if (i) { c.fillStyle = INKC; c.fillRect(i * w / 4 - 1, 6, 3, h - 12); }
      });
    }), 3.985, 2.4, (za + zb) / 2, [0, -PI / 2, 0]);
    strip.renderOrder = 2;
    // ── the misfit: one object shelved in the wrong bay (the puzzle station asks which) ──
    {
      const slot = (b) => new THREE.Vector3(xc, lv[1] + 0.015, za + (b + 0.5) * bay);
      const mk = [
        (Q) => { Q.box(0.2, 0.15, 0.16, M.card, 0, 0.075, 0, 0.012); Q.box(0.206, 0.025, 0.166, M.wood, 0, 0.075, 0, 0.004); },
        (Q) => { Q.put(new THREE.CylinderGeometry(0.04, 0.042, 0.2, 12), M.lilac, 0, 0.1, 0); Q.put(new THREE.CylinderGeometry(0.016, 0.034, 0.06, 10), M.lilac, 0, 0.23, 0); Q.put(new THREE.CylinderGeometry(0.018, 0.018, 0.025, 10), M.dark, 0, 0.272, 0); },
        (Q) => { Q.put(new THREE.ConeGeometry(0.06, 0.22, 14), M.orange, 0, 0.11, 0); },
        (Q) => { Q.put(new THREE.SphereGeometry(0.075, 14, 10), M.teal, 0, 0.075, 0); },
      ].map((f) => { const q = new THREE.Group(); f(sub(q)); q.visible = false; G.add(q); return q; });
      const mis = { kind: 0, bay: 1, t0: -9, from: new THREE.Vector3(), to: new THREE.Vector3() };
      mis.shuffle = () => {
        mk.forEach(q => { q.visible = false; });
        mis.kind = Math.floor(Math.random() * 4);
        do mis.bay = Math.floor(Math.random() * 4); while (mis.bay === mis.kind);
        mk[mis.kind].visible = true; mk[mis.kind].position.copy(slot(mis.bay)); mis.t0 = -9;
      };
      mis.fix = () => { mis.from.copy(slot(mis.bay)); mis.to.copy(slot(mis.kind)); mis.t0 = kit.now(); mis.bay = mis.kind; };
      live((t) => {
        const k = (t - mis.t0) / 1.1; if (k < 0 || k > 1.05) return;
        const q = mk[mis.kind], e = ease(k);
        q.position.lerpVectors(mis.from, mis.to, e); q.position.x -= Math.sin(e * PI) * 0.25;    // hops out, along, and back in
        q.position.y += Math.sin(e * PI) * 0.18;
      });
      mis.shuffle();
      // the puzzle: look at the rack and find the one that doesn't belong
      const NAMES = ['the slides bay', 'the tips-if-pushed-high bay', 'the tips-easily bay', 'the rolls bay'];
      const WHAT = ['a crate', 'a tall bottle', 'a traffic cone', 'a ball'];
      const WHY = ['slides: low and wide, so a push just shoves it along', 'tips if pushed high: tall, so a high push topples it', 'tips easily: narrow and top-heavy', 'rolls: round, so it never waits'];
      kit.games.replace('predict the ramp', (m) => {
        mis.shuffle();
        kit.quiz(m.game, 'Spot the misfit', [
          { q: 'Somebody shelved one object in the wrong bay of the test rack (on the right wall, sorted by how things move). Go and look: which bay has the misfit?',
            choices: NAMES.map(n => n[0].toUpperCase() + n.slice(1)), answer: mis.bay, why: `It's ${WHAT[mis.kind]}, sitting in ${NAMES[mis.bay]}.` },
          { q: `So where should ${WHAT[mis.kind]} live?`, choices: NAMES.map(n => n[0].toUpperCase() + n.slice(1)), answer: mis.kind,
            why: `${WHAT[mis.kind][0].toUpperCase() + WHAT[mis.kind].slice(1)} ${WHY[mis.kind]}. Watch: it's filing itself.`, reveal: (ok) => { if (ok) mis.fix(); } },
        ], { intro: 'Behavior Search files every object by how it moved, not how it looks. Somebody on the night shift got careless.', end: (s, n) => (s === n ? 'Perfect filing. You would make a fine search index.' : 'Close! Have another look at the rack.'), onClose: () => {} });
      }, 'spot the misfit');
    }
    // a metronome on the shelf: its arm pivots at the bottom
    {
      const mx = xc, my = lv[2] + 0.015, mz = za + 1.5 * bay;
      S(new THREE.CylinderGeometry(0.03, 0.08, 0.24, 4, 1, false, PI / 4), M.wood, mx, my + 0.12, mz, [0, PI / 2, 0]);
      const arm = new THREE.Group(); arm.position.set(mx - 0.06, my + 0.04, mz); G.add(arm);
      const A = sub(arm);
      A.box(0.01, 0.26, 0.012, M.dark, 0, 0.13, 0, 0.004);
      A.box(0.03, 0.03, 0.03, M.gold, 0, 0.19, 0, 0.006);
      live((t) => { arm.rotation.x = Math.sin(t * PI * 1.2) * 0.42; });
    }
    // a gyroscope spinning on top of the rack
    {
      const gx = xc, gy = 2.035, gz = za + 4 * 0.45 + 0.22;
      const gyro = new THREE.Group(); gyro.position.set(gx, gy, gz); G.add(gyro);   // pivot on its stand's point
      const tilt = new THREE.Group(); gyro.add(tilt);
      const Gk = sub(tilt);
      Gk.put(new THREE.TorusGeometry(0.09, 0.008, 6, 24), M.steel, 0, 0.11, 0);
      Gk.put(new THREE.TorusGeometry(0.09, 0.008, 6, 24), M.steel, 0, 0.11, 0, [0, PI / 2, 0]);
      const spin = new THREE.Group(); spin.position.y = 0.11; tilt.add(spin);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.025, 20), M.red); spin.add(disc);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 8), M.gold); rim.position.set(0.05, 0, 0); spin.add(rim);
      Gk.put(new THREE.CylinderGeometry(0.006, 0.006, 0.22, 6), M.dark, 0, 0.11, 0);
      S(new THREE.ConeGeometry(0.03, 0.02, 10), M.dark, gx, gy + 0.01, gz);
      live((t) => { spin.rotation.y = t * 14; tilt.rotation.z = 0.32; gyro.rotation.y = t * 0.9; });
    }
  }

  // ════════ 2. the bounce tube beside the rack: tap to launch the ball ════════
  {
    const x = 3.68, z = -2.22, top = 1.75;
    S(new THREE.CylinderGeometry(0.16, 0.18, 0.06, 20), M.post, x, 0.03, z);
    SB(0.3, 0.02, 0.3, M.gold, x, 0.07, z, 0.006);
    const tube = put(new THREE.CylinderGeometry(0.11, 0.11, top - 0.08, 22, 1, true), paint(0xcfeef2, { opacity: 0.28, side: THREE.DoubleSide, hatch: 0 }), x, 0.08 + (top - 0.08) / 2, z);
    tube.userData.noInk = true;
    for (const y of [0.09, 0.9, top]) S(new THREE.TorusGeometry(0.112, 0.012, 6, 22), M.steel, x, y, z, [PI / 2, 0, 0]);
    SB(0.03, top, 0.03, M.steel, x + 0.14, top / 2, z, 0.006);
    // a ruler strip on the wall behind
    poster(0.12, 0.8, 32, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h); c.fillStyle = INKC;
      for (let k = 0; k <= 20; k++) c.fillRect(0, h - k * h / 20 - 1, k % 5 ? w * 0.4 : w * 0.8, 2);
    }, 3.99, 1.35, z, 'right');
    const tg = new THREE.Group(); tg.position.set(x, 0, z); G.add(tg); tg.add(tube); tube.position.set(0, tube.position.y, 0);
    const hop = new THREE.Group(); hop.position.set(0, 0.08, 0); tg.add(hop);      // pivot at the contact point
    const r = 0.075;
    const bm = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 12), paint(0xdc6a9a)); bm.position.y = r; hop.add(bm);
    const band = new THREE.Mesh(new THREE.TorusGeometry(r * 1.005, 0.012, 6, 20), M.white); band.position.y = r; band.rotation.x = PI / 2; hop.add(band);
    let y = 0, vy = 0, idle = 0;
    tap(tg, 'drop-test the ball', (sfx) => { vy = 5.4; sfx([[392, 0.06], [784, 0.14]], 'sine'); });
    live((t, dt) => {
      idle += dt;
      if (vy === 0 && y === 0 && idle > 5) { vy = 2.0; idle = 0; }
      if (vy !== 0 || y > 0) {
        vy -= 9.8 * dt; y += vy * dt;
        if (y + 2 * r > top - 0.1) { y = top - 0.1 - 2 * r; vy = -Math.abs(vy) * 0.6; }
        if (y < 0) { y = 0; vy = Math.abs(vy) > 0.5 ? -vy * 0.72 : 0; idle = 0; }
      }
      const sq = y < 0.012 && Math.abs(vy) > 0.3 ? 0.78 : 1;
      hop.position.y = 0.08 + y; hop.scale.set(1 / Math.sqrt(sq), sq, 1 / Math.sqrt(sq));
      bm.rotation.z += vy * dt * 0.6;
    });
    claim(x, z, 0.2);
  }

  // ════════ 3. the marble run on a pegboard along the left wall ════════
  {
    const RX = -3.8, zf = -1.05, zb = -3.4, zl = -0.55;
    const V = (z, y) => new THREE.Vector3(RX, y, z);
    // the pegboard behind it
    poster(3.5, 1.5, 512, (c, w, h) => {
      c.fillStyle = '#c9a77d'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(70,45,25,0.55)';
      for (let i = 8; i < w; i += 16) for (let j = 8; j < h; j += 16) { c.beginPath(); c.arc(i, j, 2.6, 0, 7); c.fill(); }
    }, -3.995, 1.75, -2.12, 'left', { board: 0x8a6448 });
    const ys = [[2.36, 2.16], [1.98, 1.78], [1.6, 1.4], [1.22, 1.04]];
    const path = new THREE.CurvePath();
    path.add(new THREE.QuadraticBezierCurve3(V(zl, 2.44), V(zl, 2.54), V(zf, ys[0][0])));
    ys.forEach(([y0, y1], i) => {
      const a = i % 2 ? zb : zf, b = i % 2 ? zf : zb;
      path.add(new THREE.LineCurve3(V(a, y0), V(b, y1)));
      if (i < 3) path.add(new THREE.QuadraticBezierCurve3(V(b, y1), V(i % 2 ? zf + 0.28 : zb - 0.28, (y1 + ys[i + 1][0]) / 2), V(b, ys[i + 1][0])));
      // brackets holding each rail to the board
      for (const f of [0.08, 0.5, 0.92]) { const zz = a + (b - a) * f, yy = y0 + (y1 - y0) * f; SB(0.18, 0.025, 0.025, M.steel, -3.905, yy - 0.05, zz, 0.006); }
    });
    path.add(new THREE.QuadraticBezierCurve3(V(zf, ys[3][1]), V(zl + 0.02, ys[3][1] - 0.01), V(zl, 1.0)));
    const runLen = path.getLength();
    const railG = new THREE.TubeGeometry(path, 420, 0.009, 5, false);
    for (const dx of [-0.022, 0.022]) S(railG, M.red, dx, -0.036, 0);
    // the lift: a clear tube that carries the marbles back up
    const lift = put(new THREE.CylinderGeometry(0.052, 0.052, 1.5, 16, 1, true), paint(0xcfeef2, { opacity: 0.3, side: THREE.DoubleSide, hatch: 0 }), RX, 1.73, zl);
    lift.userData.noInk = true;
    for (const y of [0.98, 1.6, 2.1, 2.48]) S(new THREE.TorusGeometry(0.056, 0.012, 6, 16), M.steel, RX, y, zl, [PI / 2, 0, 0]);
    SB(0.19, 0.03, 0.03, M.steel, -3.905, 0.98, zl, 0.006); SB(0.19, 0.03, 0.03, M.steel, -3.905, 2.48, zl, 0.006);
    S(new THREE.CylinderGeometry(0.06, 0.05, 0.05, 14), M.post, RX, 0.96, zl);
    // the crank wheel that drives the lift, turning
    const crank = new THREE.Group(); crank.position.set(-3.93, 1.12, zl + 0.16); G.add(crank);
    const Ck = sub(crank);
    Ck.put(new THREE.TorusGeometry(0.075, 0.012, 6, 18), M.gold, 0.02, 0, 0, [0, PI / 2, 0]);
    for (let k = 0; k < 3; k++) Ck.box(0.012, 0.15, 0.014, M.gold, 0.02, 0, 0, 0.004, [k * PI / 3, 0, 0]);
    Ck.put(new THREE.CylinderGeometry(0.02, 0.02, 0.07, 10), M.dark, 0.02, 0, 0, [0, 0, PI / 2]);
    // a little bell the marbles ring at the bottom, hung from its top
    const bell = new THREE.Group(); bell.position.set(-3.86, 1.2, zf + 0.12); G.add(bell);
    sub(bell).put(new THREE.CylinderGeometry(0.02, 0.045, 0.06, 14, 1, true), paint(0xe4b84f, { side: THREE.DoubleSide }), 0, -0.04, 0);
    SB(0.13, 0.015, 0.015, M.steel, -3.93, 1.205, zf + 0.12, 0.004);
    // the marbles
    const liftLen = 2.44 - 1.0, vRun = 0.55, vLift = 0.32, T = runLen / vRun + liftLen / vLift, N = 6;
    const cols = [0x3f7fd6, 0xf07a3a, 0x2fae7f, 0xe9b23a, 0xdc6a9a, 0x8f7ae8];
    const hit = new THREE.Group(); hit.position.set(RX, 1.7, -2.1); G.add(hit);
    const marbles = cols.map((c) => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), paint(c)); hit.add(m); return m; });
    let clock = 0, boost = 0, ring = 0;
    onTilt.push(() => { boost = 4; });
    const P = new THREE.Vector3();
    live((t, dt) => {
      boost = Math.max(0, boost - dt);
      const k = boost > 0 ? 3 : 1;
      clock += dt * k;
      crank.rotation.x -= dt * k * 2.2;
      marbles.forEach((m, i) => {
        const s = (clock + i * T / N) % T, tr = runLen / vRun;
        if (s < tr) { path.getPointAt(s / tr, P); m.rotation.x = -s * vRun / 0.034; if (s / tr > 0.985) ring = 0.6; }
        else { P.set(RX, 1.0 + (s - tr) * vLift, zl); m.rotation.x += dt; }
        m.position.copy(P).sub(hit.position);
      });
      ring = Math.max(0, ring - dt);
      bell.rotation.x = Math.sin(ring * 30) * ring * 0.8;
    });
    // tap the run: wind the crank hard and the marbles race
    hit.add(lift); lift.position.sub(hit.position);
    hit.add(crank); crank.position.sub(hit.position);
    tap(hit, 'race the marbles', (sfx) => { boost = 3; sfx([[523, 0.07], [587, 0.07], [659, 0.07], [784, 0.07], [880, 0.07], [1046, 0.2]], 'sine', 0.06); });
    // something under it: three tote bins of test objects
    for (let k = 0; k < 3; k++) {
      const z = -2.95 + k * 0.5, mat = [M.blue, M.teal, M.gold][k];
      SB(0.42, 0.3, 0.44, mat, -3.72, 0.15, z, 0.03);
      SB(0.38, 0.02, 0.4, M.dark, -3.72, 0.29, z, 0.006);
      SB(0.02, 0.06, 0.16, M.white, -3.505, 0.2, z, 0.006);
    }
    const peek = [[-3.78, -2.98, 'b'], [-3.65, -2.88, 'c'], [-3.7, -2.46, 'bt'], [-3.8, -2.4, 'bt'], [-3.68, -1.98, 'cn'], [-3.78, -1.9, 'b']];
    for (const [x, z, k] of peek) {
      if (k === 'b') S(new THREE.SphereGeometry(0.07, 12, 8), M.red, x, 0.32, z);
      if (k === 'c') SB(0.14, 0.12, 0.12, M.card, x, 0.33, z, 0.01, [0.2, 0.4, 0]);
      if (k === 'bt') { S(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 10), M.glass, x, 0.34, z, [0.25, 0, 0.2]); }
      if (k === 'cn') S(new THREE.ConeGeometry(0.06, 0.18, 12), M.orange, x, 0.36, z, [0, 0, 0.3]);
    }
    block(-3.95, -3.48, -3.2, -1.48);
  }

  // ════════ 4. a Newton's cradle on a stool, front left ════════
  {
    const x = -3.42, z = -0.12, ty = 0.56;
    SB(0.62, 0.04, 0.44, M.wood, x, ty, z, 0.012);
    for (const [dx, dz] of [[-0.26, -0.17], [0.26, -0.17], [-0.26, 0.17], [0.26, 0.17]]) SB(0.04, ty, 0.04, M.dark, x + dx, ty / 2, z + dz, 0.008);
    SB(0.5, 0.03, 0.36, M.dark, x, ty * 0.35, z, 0.008);
    const base = ty + 0.02, top = base + 0.34, Lr = 0.25;
    SB(0.46, 0.03, 0.24, M.dark, x, base + 0.015, z, 0.01);
    for (const dz of [-0.1, 0.1]) {
      for (const dx of [-0.2, 0.2]) S(new THREE.CylinderGeometry(0.009, 0.009, 0.34, 8), M.steel, x + dx, base + 0.17, z + dz);
      S(new THREE.CylinderGeometry(0.009, 0.009, 0.4, 8), M.steel, x, top, z + dz, [0, 0, PI / 2]);
    }
    const rope = paint(0x2a2230, { hatch: 0 }), chrome = paint(0xd5dae2);
    const balls = [];
    const hit = new THREE.Group(); hit.position.set(x, top, z); G.add(hit);
    for (let i = 0; i < 5; i++) {
      const pv = new THREE.Group(); pv.position.set((i - 2) * 0.072, 0, 0); hit.add(pv);    // hung from the bars
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 12), chrome); b.position.y = -Lr; pv.add(b);
      for (const dz of [-0.1, 0.1]) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.0025, 0.0025, Math.hypot(Lr, 0.1), 4), rope);
        s.position.set(0, -Lr / 2, dz / 2); s.rotation.x = Math.atan2(dz, Lr); s.userData.noInk = true; pv.add(s);
      }
      balls.push(pv);
    }
    let amp = 0.22, ph = 0, clacks = 0;
    onTilt.push(() => { amp = 0.8; });
    tap(hit, "swing Newton's cradle", (sfx) => { amp = 0.75; sfx([[1900, 0.03], [0, 0.45], [1900, 0.03], [0, 0.45], [1800, 0.03], [0, 0.45], [1700, 0.03]], 'square', 0.03); });
    live((t, dt) => {
      amp += (0.22 - amp) * Math.min(1, dt * 0.35);
      ph += dt * Math.sqrt(9.8 / Lr);
      const s = Math.sin(ph) * amp;
      balls.forEach((pv, i) => { pv.rotation.z = i === 0 && s < 0 ? s : i === 4 && s > 0 ? s : 0; });
      clacks = s;
    });
    claim(x, z, 0.32);
  }

  // ════════ 5. the stacking tower, back left corner: tap and it topples ════════
  {
    const x = -3.55, z = -5.12;
    const piv = new THREE.Group(); piv.position.set(x + 0.15, 0, z); G.add(piv);   // its far bottom edge
    const T = sub(piv);
    const parts = [];
    let y = 0;
    const stack = [[0.3, 0.3, 0.3, M.card], [0.26, 0.22, 0.26, M.teal], [0.28, 0.1, 0.22, M.gold], [0.2, 0.2, 0.2, M.red], [0.16, 0.14, 0.16, M.lilac]];
    stack.forEach(([w, h, d, mat], k) => {
      const blk = new THREE.Group(); blk.position.set(-0.15, y, 0); piv.add(blk);   // each sits on the one below
      const m = new THREE.Mesh(rb(w, h, d, 0.02), mat); m.position.y = h / 2; blk.add(m);
      if (k === 0) { const s = new THREE.Mesh(rb(w + 0.006, 0.03, d + 0.006, 0.006), M.wood); s.position.y = h * 0.5; blk.add(s); }
      parts.push(blk); y += h;
    });
    const topBall = new THREE.Mesh(new THREE.SphereGeometry(0.07, 14, 10), M.blue); topBall.position.y = 0.07; const tb = new THREE.Group(); tb.position.set(-0.15, y, 0); tb.add(topBall); piv.add(tb); parts.push(tb);
    const rest = parts.map(p => p.position.y);
    kit.g.add(shadow(0.3).translateX(x).translateZ(z));
    let t0 = -99;
    onTilt.push(() => { if (kit.now() - t0 > 4.5) t0 = kit.now() + 0.5; });       // tall and thin: it tips
    tap(piv, 'topple the tower', (sfx) => { if (kit.now() - t0 > 4.5) { t0 = kit.now(); sfx([[330, 0.1], [0, 0.35], [140, 0.12], [110, 0.18]], 'triangle', 0.08); } });
    live((t) => {
      const k = t - t0;
      let a = 0, spread = 0;
      if (k < 0.75) { const f = k / 0.75; a = f * f * PI / 2; spread = f * f; }
      else if (k < 2.8) { const b = k - 0.75; a = PI / 2 - Math.abs(Math.sin(b * 9)) * 0.12 * Math.exp(-b * 4); spread = 1; }
      else if (k < 4.2) { const f = (k - 2.8) / 1.4, e = f * f * (3 - 2 * f); a = (1 - e) * PI / 2; spread = 1 - e; }
      piv.rotation.z = -a;
      parts.forEach((p, i) => { p.position.y = rest[i] + spread * i * 0.05; p.rotation.z = -spread * i * 0.08; p.position.x = -0.15 + spread * i * 0.02; });
    });
    claim(x, z, 0.22);
  }

  // ════════ 6. a bin of bouncy balls, front left: tap and they pop like popcorn ════════
  {
    const x = -1.4, z = -0.12;
    const bin = paint(0x5f8cc8, { side: THREE.DoubleSide });
    const wall = put(new THREE.CylinderGeometry(0.25, 0.21, 0.24, 22, 1, true), bin, x, 0.12, z);
    wall.userData.noInk = true;
    S(new THREE.TorusGeometry(0.25, 0.018, 6, 24), M.white, x, 0.24, z, [PI / 2, 0, 0]);
    S(new THREE.CylinderGeometry(0.21, 0.21, 0.02, 22), M.dark, x, 0.01, z);
    kit.g.add(shadow(0.32).translateX(x).translateZ(z));
    const cols = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0x8f7ae8, 0xdc6a9a, 0x5fae7f, 0xf07a3a, 0x3f7fd6, 0xf6efdf];
    const R = kit.mkRng(77);
    const bs = cols.map((c, i) => {
      const a = i * 2.4, rr = i ? 0.06 + (i % 3) * 0.035 : 0, r = 0.055 + R() * 0.02;
      const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), paint(c));
      const ry = 0.08 + (i % 3) * 0.06 + (i ? 0.08 : 0.14);
      m.position.set(Math.cos(a) * rr, ry - 0.12, Math.sin(a) * rr);
      return { m, x: m.position.x, y: m.position.y, z: m.position.z, vy: 0, h: 0, dx: (R() - 0.5) * 0.4, dz: (R() - 0.5) * 0.4, t: 9, v0: 0 };
    });
    const hit = new THREE.Group(); hit.position.set(x, 0.12, z); G.add(hit); hit.add(wall); wall.position.set(0, 0, 0);
    for (const b of bs) hit.add(b.m);
    tap(hit, 'pop the bouncy balls', (sfx) => {
      bs.forEach((b, i) => { b.t = -i * 0.05; b.v0 = 2.6 + R() * 1.6; });
      sfx([[600, 0.05], [900, 0.05], [700, 0.05], [1100, 0.05], [800, 0.08]], 'square', 0.03);
    });
    onTilt.push(() => bs.forEach((b, i) => { b.t = -0.4 - i * 0.04; b.v0 = 1.0 + R() * 0.8; }));
    live((t, dt) => {
      for (const b of bs) {
        b.t += dt;
        if (b.t < 0 || b.t > 4) continue;
        const T1 = 2 * b.v0 / 9.8, k = b.t;
        let h = 0, f = Math.min(1, k / T1);
        if (k < T1) h = b.v0 * k - 4.9 * k * k;
        else { const k2 = k - T1, v2 = b.v0 * 0.3, T2 = 2 * v2 / 9.8; h = k2 < T2 ? v2 * k2 - 4.9 * k2 * k2 : 0; }
        const out = Math.sin(f * PI);                     // drifts out and lands back in its place
        b.m.position.set(b.x + b.dx * out, b.y + h, b.z + b.dz * out);
        b.m.rotation.x += dt * 6 * (h > 0 ? 1 : 0);
      }
    });
    claim(x, z, 0.27);
  }

  // ════════ 7. a self-righting wobbler, front right: it rolls on its round bottom ════════
  {
    const x = 1.4, z = 0.0, r = 0.13;
    const wob = new THREE.Group(); wob.position.set(x, r, z); G.add(wob);   // centre of its round base
    const Wk = sub(wob);
    Wk.put(new THREE.SphereGeometry(r, 20, 12, 0, PI * 2, PI / 2, PI / 2), M.red);
    Wk.put(new THREE.CylinderGeometry(r * 0.75, r, 0.14, 20, 1, true), M.cream, 0, 0.07, 0);
    Wk.put(new THREE.SphereGeometry(r * 0.75, 18, 10, 0, PI * 2, 0, PI / 2), M.cream, 0, 0.14, 0);
    Wk.put(new THREE.TorusGeometry(r * 0.99, 0.012, 6, 24), M.dark, 0, 0, 0, [PI / 2, 0, 0]);
    Wk.put(new THREE.SphereGeometry(0.025, 10, 8), M.gold, 0, 0.255, 0);
    // the crash-test centre-of-mass sticker, front and back
    const com = texMat(64, 64, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.beginPath(); c.arc(32, 32, 30, 0, 7); c.fill();
      c.fillStyle = '#2a2230'; c.beginPath(); c.moveTo(32, 32); c.arc(32, 32, 30, 0, PI / 2); c.fill(); c.beginPath(); c.moveTo(32, 32); c.arc(32, 32, 30, PI, PI * 1.5); c.fill();
      c.strokeStyle = '#2a2230'; c.lineWidth = 3; c.beginPath(); c.arc(32, 32, 29, 0, 7); c.stroke();
    });
    for (const s of [-1, 1]) { const m = Wk.flat(0.08, 0.08, com, 0, 0.06, s * (r * 0.89 + 0.008), [0, s < 0 ? PI : 0, 0]); m.renderOrder = 2; }
    kit.g.add(shadow(0.22).translateX(x).translateZ(z));
    let A = 0, t0 = 0, pokes = [], flop = -99;
    tap(wob, 'push the wobbler', (sfx) => {
      const now = kit.now(); pokes = pokes.filter(p => now - p < 4); pokes.push(now);
      if (pokes.length >= 5 && now - flop > 5) {                     // the secret: poke it five times and it gives up
        flop = now; pokes = []; sfx([[400, 0.1], [300, 0.1], [200, 0.3]], 'triangle', 0.07);
        kit.say("Behaviour updated: “self-righting”, except after five pokes. It needs a minute.");
        return;
      }
      A = 0.7; t0 = now; sfx([[300, 0.08], [400, 0.08], [300, 0.08], [400, 0.12]], 'sine', 0.06);
    });
    live((t) => {
      const k = t - t0, f = t - flop;
      let th = A * Math.exp(-k * 0.9) * Math.cos(k * 6.5) + 0.03 * Math.sin(t * 1.3);
      if (f < 4) th = f < 0.5 ? (PI / 2) * ease(f / 0.5) : f < 3.3 ? PI / 2 + Math.sin(f * 3) * 0.02 : (PI / 2) * (1 - ease((f - 3.3) / 0.7)) * Math.cos((f - 3.3) * 9);
      const kk = t - tilt.t0, roll = 0.3 * ease((kk - 0.3) / 1.2) * rewind(kk);    // round bottom: it rolls downhill
      wob.position.x = x + r * th + roll; wob.rotation.z = -th - roll / r;     // rolling without slipping
    });
    claim(x, z, 0.2);
  }

  // ════════ 8. a stopwatch on the back wall: tap the crown for a lap ════════
  {
    const x = 3.22, y = 2.16, z = BACK + 0.075;
    const sw = new THREE.Group(); sw.position.set(x, y, z); G.add(sw);
    const Sk = sub(sw);
    Sk.put(new THREE.CylinderGeometry(0.2, 0.2, 0.04, 28), M.steel, 0, 0, 0, [PI / 2, 0, 0]);
    const face = Sk.flat(0.36, 0.36, texMat(128, 128, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(64, 64, 63, 0, 7); c.fill();
      c.fillStyle = INKC;
      for (let k = 0; k < 60; k++) { c.save(); c.translate(64, 64); c.rotate(k * PI / 30); c.fillRect(-1, -60, k % 5 ? 2 : 3, k % 5 ? 6 : 12); c.restore(); }
      font(c, 16); c.textAlign = 'center'; c.fillText('0 GPUs', 64, 92);
      c.fillStyle = '#e8604c'; c.fillRect(44, 36, 40, 3);
    }), 0, 0, 0.022);
    face.renderOrder = 2;
    const crown = new THREE.Group(); crown.position.y = 0.2; sw.add(crown);
    sub(crown).put(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 12), M.dark, 0, 0.025, 0);
    sub(crown).put(new THREE.TorusGeometry(0.035, 0.01, 6, 14), M.steel, 0, 0.07, 0);
    const hand = new THREE.Group(); hand.position.z = 0.03; sw.add(hand);       // pivots at the centre pin
    sub(hand).box(0.012, 0.16, 0.006, M.red, 0, 0.06, 0, 0.002);
    sub(hand).put(new THREE.CylinderGeometry(0.016, 0.016, 0.012, 10), M.dark, 0, 0, 0, [PI / 2, 0, 0]);
    let t0 = 0, press = 0;
    tap(sw, 'lap the stopwatch', (sfx) => { t0 = kit.now(); press = 0.25; sfx([[1568, 0.05], [0, 0.08], [1568, 0.12]], 'square', 0.03); });
    live((t, dt) => {
      press = Math.max(0, press - dt);
      crown.position.y = 0.2 - (press > 0 ? 0.025 : 0);
      hand.rotation.z = -Math.floor((t - t0) * 4) / 4 * (PI * 2 / 10);         // ticks round once every 10 s
    });
    // a clipboard of results under it
    poster(0.4, 0.55, 160, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
      font(c, 22, SCRIPT); c.fillStyle = INKC; c.fillText('results', 12, 26);
      font(c, 15, HAND, 400);
      const L = ['R² unseen probes', 'behavior  0.53', 'looks       0.16', '', '106,757 runs', 'MuJoCo + PhysX'];
      L.forEach((s, i) => c.fillText(s, 12, 52 + i * 21));
      c.strokeStyle = '#e8604c'; c.lineWidth = 3; c.beginPath(); c.ellipse(70, 73, 54, 12, 0, 0, 7); c.stroke();
    }, x, 1.38, BACK + 0.02, 'back', { board: 0x8a6448 });
    SB(0.14, 0.04, 0.03, M.steel, x, 1.66, BACK + 0.04, 0.008);
  }

  // ════════ 9. posters and signs ════════
  // the four pokes, on the left wall by the drop rig
  poster(1.0, 0.95, 400, (c, w, h) => {
    c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
    font(c, 40, SCRIPT); c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('the same four pokes', w / 2, 44);
    const cell = (i, j, title, fn) => {
      const x0 = 14 + i * (w - 28) / 2, y0 = 64 + j * (h - 76) / 2, cw = (w - 28) / 2 - 8, ch = (h - 76) / 2 - 8;
      c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(x0, y0, cw, ch);
      font(c, 20); c.fillStyle = INKC; c.textAlign = 'left'; c.fillText(title, x0 + 8, y0 + 24);
      c.fillStyle = '#c3c8ca'; c.fillRect(x0 + 8, y0 + ch - 22, cw - 16, 6);
      fn(x0 + cw / 2, y0 + ch - 22, cw, ch);
    };
    const arrow = (x, y, dx) => { c.strokeStyle = '#e8604c'; c.lineWidth = 6; c.beginPath(); c.moveTo(x - dx, y); c.lineTo(x, y); c.stroke(); c.fillStyle = '#e8604c'; c.beginPath(); c.moveTo(x + 12, y); c.lineTo(x - 2, y - 9); c.lineTo(x - 2, y + 9); c.fill(); };
    cell(0, 0, 'push low', (x, y) => { c.fillStyle = '#e4b84f'; c.fillRect(x - 10, y - 60, 40, 60); arrow(x - 16, y - 12, 40); });
    cell(1, 0, 'push high', (x, y) => { c.fillStyle = '#7fb3a8'; c.save(); c.translate(x + 20, y); c.rotate(0.35); c.fillRect(-24, -90, 22, 90); c.restore(); arrow(x - 20, y - 74, 40); });
    cell(0, 1, 'tilt', (x, y, cw) => { c.fillStyle = '#c8a47c'; c.beginPath(); c.moveTo(x - cw / 2 + 14, y); c.lineTo(x + cw / 2 - 14, y); c.lineTo(x + cw / 2 - 14, y - 56); c.fill(); c.fillStyle = '#e8604c'; c.save(); c.translate(x + 10, y - 30); c.rotate(-0.4); c.fillRect(-14, -30, 28, 28); c.restore(); font(c, 18); c.fillStyle = INKC; c.fillText('19°', x - cw / 2 + 40, y - 6); });
    cell(1, 1, 'drop', (x, y) => { c.fillStyle = '#8f7ae8'; c.fillRect(x - 48, y - 100, 26, 26); c.setLineDash([5, 5]); c.strokeStyle = '#e8604c'; c.lineWidth = 3; c.beginPath(); c.moveTo(x - 35, y - 72); c.quadraticCurveTo(x - 30, y, x - 20, y); c.quadraticCurveTo(x, y - 40, x + 14, y); c.quadraticCurveTo(x + 24, y - 20, x + 34, y); c.stroke(); c.setLineDash([]); });
  }, -3.995, 1.62, -4.88, 'left');
  // the behaviour map, on the right wall
  poster(1.5, 1.0, 480, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
    font(c, 26); c.fillStyle = INKC; c.textAlign = 'left'; c.fillText('BEHAVIOR MAP', 20, 36);
    font(c, 18, HAND, 400); c.fillStyle = '#7a7080'; c.fillText('2,166 objects, placed by how they moved', 190, 36);
    c.fillStyle = '#f1effa'; c.beginPath(); c.roundRect(16, 50, w - 32, h - 100, 14); c.fill();
    const R = kit.mkRng(9);
    const blob = (cx, cy, rx, ry, n, col) => { for (let k = 0; k < n; k++) { const a = R() * 7, d = Math.sqrt(R()); c.fillStyle = col; c.beginPath(); c.arc(cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d, 4.5, 0, 7); c.fill(); c.strokeStyle = 'rgba(42,34,48,0.6)'; c.lineWidth = 1; c.stroke(); } };
    blob(150, 150, 120, 80, 260, '#3f7fd6'); blob(90, 230, 50, 30, 40, '#3f7fd6');
    blob(340, 110, 70, 40, 60, '#e9b23a'); blob(380, 150, 40, 30, 30, '#2fae7f');
    blob(330, 230, 70, 30, 70, '#f07a3a'); blob(420, 90, 25, 20, 20, '#f07a3a');
    c.strokeStyle = '#f07a3a'; c.lineWidth = 4; c.beginPath(); c.arc(240, 70, 12, 0, 7); c.stroke();
    CAT.forEach(([name, , col], i) => {
      const x = 22 + i * 112, y = h - 30;
      c.fillStyle = col; c.beginPath(); c.arc(x + 8, y, 8, 0, 7); c.fill();
      font(c, 15, HAND, 400); c.fillStyle = INKC; c.fillText(name, x + 20, y + 5);
    });
  }, 3.995, 1.65, -1.38, 'right', { board: 0x2a2230 });
  // the search bar sign over the drop rig, and the numbers under it
  poster(1.6, 0.34, 512, (c, w, h) => {
    c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(4, 4, w - 8, h - 8, h / 2 - 4); c.fill();
    c.strokeStyle = '#f07a3a'; c.lineWidth = 6; c.stroke();
    let fs = 44; font(c, fs); while (c.measureText('search objects by how they move').width > w - 90 && fs > 16) font(c, fs -= 2);
    c.fillStyle = INKC; c.textAlign = 'left'; c.textBaseline = 'middle';
    c.fillText('search objects by', 40, h / 2 + 2);
    const x2 = 40 + c.measureText('search objects by ').width;
    c.fillStyle = '#f6d36b'; c.fillRect(x2 - 6, 26, c.measureText('how they move').width + 12, h - 52);
    c.fillStyle = INKC; c.fillText('how they move', x2, h / 2 + 2);
  }, -3.06, 2.3, BACK + 0.01, 'back', { board: 0xf07a3a });
  [['2,166', 'rigid assets', -3.6, 0.05], ['106,757', 'probe runs', -3.04, -0.04], ['0', 'GPUs used', -2.5, 0.06]].forEach(([n, s, x, tilt]) => {
    poster(0.46, 0.32, 160, (c, w, h) => {
      c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h);
      font(c, 44); c.fillStyle = INKC; c.textAlign = 'left'; c.fillText(n, 12, 52);
      font(c, 18, HAND, 400); c.fillStyle = '#6a6070'; c.fillText(s, 12, 84);
    }, x, 1.55, BACK + 0.01, 'back', { tilt });
    S(new THREE.SphereGeometry(0.018, 8, 6), M.red, x, 1.69, BACK + 0.03);
  });

  // ════════ 10. lamps hung off the walls on arms, swaying; tap to flick one ════════
  [[3.25, -4.3, 1], [3.3, -1.5, 1], [-3.3, -4.88, -1]].forEach(([x, z, side], i) => {
    const wx = side * 3.98, ay = 2.56;
    SB(Math.abs(wx - x) + 0.04, 0.03, 0.03, M.dark, (wx + x) / 2, ay, z, 0.006);
    SB(0.03, 0.08, 0.1, M.dark, wx - side * 0.015, ay, z, 0.006);
    const pv = new THREE.Group(); pv.position.set(x, ay, z); G.add(pv);        // swings from the arm
    const Lk = sub(pv);
    const cord = Lk.put(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 4), M.dark, 0, -0.09, 0); cord.userData.noInk = true;
    Lk.put(new THREE.CylinderGeometry(0.03, 0.14, 0.13, 18, 1, true), paint(0x3f5872, { side: THREE.DoubleSide }), 0, -0.24, 0);
    Lk.put(new THREE.CylinderGeometry(0.03, 0.03, 0.04, 10), M.dark, 0, -0.17, 0);
    const bulbM = paint(0xfff2c0, { emissive: 0xffd77a, hatch: 0, unique: true });
    const bulb = Lk.put(new THREE.SphereGeometry(0.045, 12, 8), bulbM, 0, -0.29, 0); bulb.userData.noInk = true;
    let kick = 0, t0 = -9;
    onTilt.push(() => { kick = 0.45; });
    tap(pv, 'flick the lamp', (sfx) => { kick = 0.5; t0 = kit.now(); sfx([[1200, 0.03], [0, 0.1], [1200, 0.03]], 'square', 0.025); });
    live((t, dt) => {
      kick *= Math.exp(-dt * 0.6);
      pv.rotation.x = Math.sin(t * 2.2 + i) * (0.03 + kick);
      pv.rotation.z = Math.cos(t * 1.7 + i * 2) * 0.02;
      const k = t - t0, on = k > 0.6 || (k > 0.15 && k < 0.3);
      bulbM.emissiveIntensity = on ? 1 : 0.05;
    });
  });

  // ════════ 11. floor clutter round the edges ════════
  // traffic cones and a hand truck with crates, front right
  for (const [x, z, s] of [[-3.75, -3.5, 0.8], [3.72, -0.95, 1], [3.62, -1.3, 0.8]]) {
    S(new THREE.ConeGeometry(0.1 * s, 0.32 * s, 14), M.orange, x, 0.03 + 0.16 * s, z);
    S(new THREE.CylinderGeometry(0.062 * s, 0.074 * s, 0.05 * s, 14), M.white, x, 0.03 + 0.12 * s, z);
    SB(0.24 * s, 0.03, 0.24 * s, M.orange, x, 0.015, z, 0.006);
  }
  {
    const x = 3.55, z = -0.3;
    SB(0.42, 0.03, 0.3, M.dark, x, 0.02, z, 0.006);
    SB(0.04, 0.9, 0.04, M.dark, x + 0.19, 0.47, z - 0.12, 0.008, [0, 0, -0.18]);
    SB(0.04, 0.9, 0.04, M.dark, x + 0.19, 0.47, z + 0.12, 0.008, [0, 0, -0.18]);
    S(new THREE.TorusGeometry(0.06, 0.025, 6, 14), M.rubber, x + 0.16, 0.07, z - 0.17);
    S(new THREE.TorusGeometry(0.06, 0.025, 6, 14), M.rubber, x + 0.16, 0.07, z + 0.17);
    SB(0.32, 0.26, 0.28, M.card, x - 0.02, 0.165, z, 0.015);
    SB(0.26, 0.2, 0.24, M.card, x - 0.03, 0.4, z, 0.015, [0, 0.12, 0]);
    SB(0.33, 0.04, 0.012, paint(0xd9c29a), x - 0.02, 0.2, z + 0.145, 0.004);
    claim(x, z, 0.25);
  }
  // a crate of sandbags by the drop rig
  for (let k = 0; k < 3; k++) S(new THREE.CapsuleGeometry(0.06, 0.16, 4, 10), paint(0xd9c29a), -2.2, 0.06 + k * 0.1, -5.25, [0, 0, PI / 2 + (k - 1) * 0.12]);
  claim(-2.2, -5.25, 0.15);

  // ════════ 12. THE TRICK: the tilt lever, a lineup of loose objects, the whole lab tilting ════════
  {
    // the lineup along the front: each object knows its behaviour
    const loose = [];
    const add = (x, z, kind, build, { travel = 0, hw = 0, r = 0 } = {}) => {
      const g = new THREE.Group(); g.position.set(kind === 'tip' ? x + hw : x, 0, z); G.add(g);   // tippers pivot on their downhill edge
      const inner = new THREE.Group(); inner.position.x = kind === 'tip' ? -hw : 0; g.add(inner);
      build(sub(inner));
      kit.g.add(shadow(Math.max(0.12, hw * 2.2 || r * 2.2 || 0.15)).translateX(x).translateZ(z));
      loose.push({ g, inner, kind, x0: g.position.x, travel, r });
      return g;
    };
    add(-2.75, 0.25, 'slide', (Q) => { Q.box(0.24, 0.16, 0.2, M.card, 0, 0.08, 0, 0.015); Q.box(0.246, 0.03, 0.206, M.wood, 0, 0.08, 0, 0.004); }, { travel: 0.18 });
    add(-2.35, 0.25, 'tip', (Q) => {
      Q.put(new THREE.CylinderGeometry(0.045, 0.048, 0.3, 14), M.glass, 0, 0.15, 0);
      Q.put(new THREE.CylinderGeometry(0.018, 0.04, 0.08, 12), M.glass, 0, 0.34, 0);
      Q.put(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10), M.red, 0, 0.395, 0);
    }, { hw: 0.048 });
    add(-1.85, 0.25, 'roll', (Q) => { Q.put(new THREE.SphereGeometry(0.09, 16, 12), M.gold, 0, 0.09, 0); Q.put(new THREE.TorusGeometry(0.091, 0.014, 6, 20), M.white, 0, 0.09, 0); }, { travel: 0.5, r: 0.09 });
    add(-0.95, 0.23, 'hold', (Q) => {                                                       // the anvil
      Q.box(0.26, 0.06, 0.14, M.dark, 0, 0.03, 0, 0.01); Q.box(0.1, 0.08, 0.1, M.dark, 0, 0.1, 0, 0.01);
      Q.box(0.3, 0.07, 0.15, M.dark, 0.02, 0.17, 0, 0.012); Q.put(new THREE.ConeGeometry(0.06, 0.14, 8), M.dark, -0.18, 0.17, 0, [0, 0, PI / 2]);
      Q.flat(0.16, 0.05, texMat(96, 30, (c, w, h) => { c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h); c.font = `700 22px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('100 kg', w / 2, 23); }), 0.02, 0.17, 0.077).renderOrder = 2;
    });
    add(0.95, 0.25, 'roll', (Q) => { Q.put(new THREE.CylinderGeometry(0.05, 0.05, 0.15, 16), M.red, 0, 0.05, 0, [PI / 2, 0, 0]); Q.put(new THREE.CylinderGeometry(0.051, 0.051, 0.06, 16), M.white, 0, 0.05, 0, [PI / 2, 0, 0]); }, { travel: 0.7, r: 0.05 });
    add(1.85, 0.25, 'tip', (Q) => { Q.put(new THREE.ConeGeometry(0.075, 0.32, 14), M.orange, 0, 0.16, 0); Q.put(new THREE.CylinderGeometry(0.046, 0.055, 0.045, 14), M.white, 0, 0.13, 0); }, { hw: 0.075 });
    add(2.4, 0.25, 'slide', (Q) => { const cs = [M.blue, M.red, M.gold]; for (let k = 0; k < 3; k++) Q.box(0.2 - k * 0.015, 0.04, 0.15, cs[k], 0, 0.02 + k * 0.041, 0, 0.006, [0, (k - 1) * 0.1, 0]); }, { travel: 0.1 });
    live((t) => {
      const k = t - tilt.t0, rw = rewind(k);
      for (const o of loose) {
        if (o.kind === 'roll') {                    // round: it goes at once and keeps going
          const d = Math.min(o.travel, 0.9 * Math.max(0, k - 0.25) ** 2) * rw;
          o.g.position.x = o.x0 + d; o.inner.rotation.z = -d / o.r;
        } else if (o.kind === 'slide') {            // low and wide: friction holds it, then it creeps
          const d = Math.min(o.travel, 0.25 * Math.max(0, k - 0.9) ** 2) * rw;
          o.g.position.x = o.x0 + d;
        } else if (o.kind === 'tip') {              // tall and thin: it falls over its downhill edge
          const f = Math.max(0, k - 0.45) / 0.55;
          let a = f < 1 ? (PI / 2) * f * f : PI / 2 - Math.abs(Math.sin((f - 1) * 7)) * 0.12 * Math.exp(-(f - 1) * 5);
          o.g.rotation.z = -a * rw;
        } else {                                    // heavy: it holds, and looks smug about it
          o.g.rotation.z = k > 0.3 && k < 4.4 ? Math.sin(k * 30) * 0.004 : 0;
        }
      }
    });

    // the lever: a big handle on a hazard-striped box, front right
    const lx = 2.78, lz = 0.1;
    const base = new THREE.Group(); base.position.set(lx, 0, lz); G.add(base);
    const Lb = sub(base);
    const stripes = paint(0xffffff, { map: canvasTex(64, 64, (c, w, h) => { c.fillStyle = '#e4b84f'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2230'; for (let x = -h; x < w; x += 20) { c.beginPath(); c.moveTo(x, h); c.lineTo(x + 10, h); c.lineTo(x + 10 + h, 0); c.lineTo(x + h, 0); c.fill(); } }) });
    Lb.box(0.3, 0.26, 0.24, stripes, 0, 0.13, 0, 0.02);
    Lb.box(0.2, 0.03, 0.06, M.dark, 0, 0.27, 0, 0.008);
    Lb.flat(0.26, 0.09, texMat(128, 44, (c, w, h) => { c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(2, 2, w - 4, h - 4); c.font = `700 26px ${HAND}`; c.fillStyle = '#d2483e'; c.textAlign = 'center'; c.fillText('DO NOT TILT', w / 2, 31); }), 0, 0.15, 0.122).renderOrder = 2;
    const arm = new THREE.Group(); arm.position.set(0, 0.27, 0); base.add(arm);          // hinged at the box top
    const Ar = sub(arm);
    Ar.put(new THREE.CylinderGeometry(0.018, 0.018, 0.55, 10), M.steel, 0, 0.275, 0);
    Ar.put(new THREE.SphereGeometry(0.06, 14, 10), M.red, 0, 0.58, 0);
    Ar.put(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 12), M.dark, 0, 0, 0, [0, 0, PI / 2]);
    Ar.flat(0.14, 0.06, texMat(80, 34, (c, w, h) => { c.fillStyle = '#e8604c'; c.fillRect(0, 0, w, h); c.font = `700 26px ${HAND}`; c.fillStyle = '#fffaf0'; c.textAlign = 'center'; c.fillText('TILT', w / 2, 26); }), 0, 0.42, 0.02).renderOrder = 2;
    claim(lx, lz, 0.18);
    const LINES = ['Same tilt, four behaviours. Sorted by how they moved: that’s Behavior Search.',
      'Tilt probe logged. 106,758 runs now. Still no GPUs.', 'The anvil would like it noted that it did not move.',
      'Please stop tilting the lab. — Management'];
    let pulls = 0, O = null, P = { x: 0, z: -2.5 };
    tap(base, 'pull the TILT lever', (sfx) => {
      const now = kit.now();
      if (now - tilt.t0 < 6) return;
      tilt.t0 = now; P = kit.player() || { x: 0, z: -2.5 };
      for (const f of onTilt) f();
      sfx([[160, 0.25], [120, 0.35], [0, 0.4], [880, 0.08], [660, 0.08], [990, 0.08], [520, 0.2]], 'triangle', 0.07);
      const line = LINES[Math.min(pulls++, LINES.length - 1)];
      setTimeout(() => kit.say(line), 2600);
    });
    live((t) => {
      const k = t - tilt.t0, env = tiltEnv(k);
      arm.rotation.x = k < 0.3 ? -0.6 + 1.2 * ease(k / 0.3) : k < 5.4 ? 0.6 : 0.6 - 1.2 * ease((k - 5.4) / 0.4);
      if (k > 6) arm.rotation.x = -0.6;
      if (!O) O = G.position.clone();
      const th = -TH * env, c = Math.cos(th), s = Math.sin(th);
      G.rotation.z = th;                       // rotate the whole lab about an axis through the player's feet
      G.position.set(O.x + P.x - P.x * c, O.y - P.x * s, O.z);
    });

    // the results come down over the behaviour map like a roller blind
    const blind = new THREE.Group(); blind.position.set(3.965, 2.17, -1.38); blind.rotation.y = -PI / 2; G.add(blind);  // hangs from its roller
    const roller = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.56, 12), M.steel); roller.rotation.z = PI / 2; roller.position.z = 0.02; blind.add(roller);
    const sheetM = texMat(480, 320, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = INKC; font(c, 30); c.textAlign = 'center'; c.fillText('TILT PROBE: RESULTS', w / 2, 40);
      const cols = [['ROLLED', '#e9b23a', ['ball', 'can', 'wobbler', 'marbles']], ['SLID', '#3f7fd6', ['crate', 'books']], ['TIPPED', '#2fae7f', ['bottle', 'cone', 'tower']], ['HELD', '#6f7d92', ['anvil (smug)']]];
      cols.forEach(([name, col, items], i) => {
        const x = 20 + i * (w - 40) / 4, cw = (w - 40) / 4 - 10;
        c.fillStyle = col; c.beginPath(); c.roundRect(x, 58, cw, 36, 10); c.fill();
        c.fillStyle = '#fffaf0'; font(c, 22); c.fillText(name, x + cw / 2, 84);
        font(c, 19, HAND, 400); c.fillStyle = INKC;
        items.forEach((it, j) => c.fillText(it, x + cw / 2, 124 + j * 30));
      });
      font(c, 22, SCRIPT); c.fillStyle = '#d2483e'; c.fillText('same tilt · sorted by how they moved, not how they look', w / 2, h - 22);
    });
    const sheet = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.0).translate(0, -0.5, 0), sheetM); sheet.position.z = 0.03; sheet.userData.noInk = true; sheet.renderOrder = 3; blind.add(sheet);
    live((t) => { const k = t - tilt.t0, d = k < 2.6 ? 0 : k < 3.4 ? ease((k - 2.6) / 0.8) : k < 13 ? 1 : 1 - ease((k - 13) / 0.8); sheet.scale.y = Math.max(0.001, d); sheet.visible = d > 0.002; });

    // Vivi's page: tucked under the blue tote, a corner showing. Tilt the room and it slides out.
    const pg = kit.page();
    if (!pg.collected) {
      pg.rotation.set(-PI / 2, 0, 0.3); G.add(pg);
      const A = new THREE.Vector3(-3.48, 0.004, -2.78), B = new THREE.Vector3(-3.28, 0.004, -2.98);
      let out = 0, taken = false;
      const poke = pg.userData.toy.poke; pg.userData.toy.poke = (sfx) => { taken = true; poke(sfx); };
      onTilt.push(() => { out = Math.max(out, 0.001); });
      live((t, dt) => {
        if (taken) return;
        const k = t - tilt.t0;
        if (out > 0 && out < 1 && k > 0.6) out = Math.min(1, out + dt / 1.3);
        const e = ease(out);
        pg.position.lerpVectors(A, B, e); pg.position.y += Math.sin(e * PI) * 0.12;
        pg.rotation.z = 0.3 + e * 2.2;
      });
    }
  }

  // ════════ 13. jokes: the lost & found of objects that misbehaved, and the employee of the month ════════
  {
    const x = -3.62, z = -0.82;
    SB(0.42, 0.26, 0.36, M.card, x, 0.13, z, 0.015);
    SB(0.43, 0.03, 0.37, M.wood, x, 0.26, z, 0.006);
    S(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6), M.wood, x - 0.12, 0.45, z - 0.12);
    poster(0.34, 0.2, 170, (c, w, h) => { c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); font(c, 22); c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('LOST & FOUND', w / 2, 30); font(c, 15, HAND, 400); c.fillText('objects that', w / 2, 56); c.fillText('misbehaved', w / 2, 76); }, x - 0.12, 0.72, z - 0.11, 'back', { board: 0x8a6448 });
    // a square wheel (it "rolls"), a cube ball, and a ball-shaped crate
    const wheel = new THREE.Group(); wheel.position.set(x + 0.05, 0.34, z + 0.02); G.add(wheel);       // turns on its axle
    const Wh = sub(wheel);
    Wh.box(0.16, 0.16, 0.05, M.rubber, 0, 0, 0, 0.012);
    Wh.put(new THREE.CylinderGeometry(0.03, 0.03, 0.07, 10), M.steel, 0, 0, 0, [PI / 2, 0, 0]);
    SB(0.1, 0.1, 0.1, M.red, x - 0.1, 0.32, z + 0.05, 0.01, [0.3, 0.5, 0]);
    S(new THREE.SphereGeometry(0.06, 12, 8), M.card, x + 0.12, 0.3, z - 0.08);
    S(new THREE.TorusGeometry(0.061, 0.01, 6, 14), M.wood, x + 0.12, 0.3, z - 0.08, [PI / 2, 0, 0]);
    let t0 = -9;
    const quips = ['Square wheel. Filed under “slides”. Deeply disappointing.', 'The cube ball refuses to roll on principle.', 'The round crate rolled away twice. It’s on probation.'];
    let qi = 0;
    tap(wheel, 'poke the lost & found', (sfx) => { t0 = kit.now(); sfx([[200, 0.08], [0, 0.12], [200, 0.08], [0, 0.12], [150, 0.15]], 'square', 0.04); kit.say(quips[qi++ % quips.length]); });
    live((t) => { const k = t - t0; wheel.rotation.z = k < 1.2 ? -(Math.floor(k / 0.3) + ease((k % 0.3) / 0.3)) * PI / 2 : 0; wheel.position.y = 0.34 + (k < 1.2 ? Math.abs(Math.sin(k / 0.3 * PI)) * 0.03 : 0); });
    claim(x, z, 0.24);
  }
  poster(0.38, 0.46, 160, (c, w, h) => {
    c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
    font(c, 15); c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('EMPLOYEE OF THE MONTH', w / 2, 22);
    c.fillStyle = '#e6edf0'; c.fillRect(20, 32, w - 40, 110);
    c.fillStyle = '#c8a47c'; c.fillRect(48, 62, w - 96, 70); c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(48, 62, w - 96, 70);
    c.strokeStyle = '#8a6448'; c.beginPath(); c.moveTo(48, 97); c.lineTo(w - 48, 97); c.stroke();
    c.fillStyle = '#e4b84f'; c.beginPath(); c.arc(w - 40, 150, 14, 0, 7); c.fill();
    font(c, 17, SCRIPT); c.fillStyle = INKC; c.fillText('the crate', w / 2, 166); font(c, 12, HAND, 400); c.fillText('never once moved', w / 2, 184);
  }, -3.99, 1.62, -4.12, 'left', { board: 0xe4b84f });

  bake();
}
