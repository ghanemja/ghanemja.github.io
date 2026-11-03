// ─── dressing for the yarnflow room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// A cosy haberdashery: a spinning wheel and an armchair down the left, a ball winder, a basket
// and a shelf of crochet treats down the right, hanks on a pegboard, planters hanging from the top.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// static pieces collected per material and merged into one mesh each
function bag(THREE, rb) {
  const bins = new Map();
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), P = new THREE.Vector3(), Sc = new THREE.Vector3();
  const add = (geo, mat, m) => {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    g.clearGroups(); g.applyMatrix4(m);
    if (!bins.has(mat)) bins.set(mat, []);
    bins.get(mat).push(g);
  };
  const frame = (base) => {
    const put = (geo, mat, x = 0, y = 0, z = 0, rot = null, s = 1) => {
      E.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0);
      M.compose(P.set(x, y, z), Q.setFromEuler(E), typeof s === 'number' ? Sc.set(s, s, s) : Sc.set(s[0], s[1], s[2]));
      add(geo, mat, base ? M.clone().premultiply(base) : M.clone());
    };
    return {
      put,
      box: (w, h, d, mat, x, y, z, r = 0.03, rot) => put(rb(w, h, d, r), mat, x, y, z, rot),
      at: (x, y, z, ry = 0, rx = 0, rz = 0) => frame(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1)).premultiply(base || new THREE.Matrix4())),
    };
  };
  return {
    ...frame(null),
    flush(parent, noInk = false) {
      for (const [mat, list] of bins) { const m = new THREE.Mesh(mergeGeometries(list), mat); m.userData.noInk = noInk; parent.add(m); }
      bins.clear();
    },
  };
}

export default function dress(kit) {
  const { THREE, g, put, box, paint, tap, live, free, claim, rb, canvasTex, HAND, SCRIPT, INKC, D, kit: sub, now, shadow } = kit;
  const S = bag(THREE, rb), L = bag(THREE, rb);           // S: inked statics; L: fine strands, no ink
  const { fx, say, onExit, games, shuffle } = kit;
  const showAll = (o, v) => o.traverse(q => { q.visible = v; });      // hidden things mustn't catch taps
  const tapsWithin = (arr, n, secs) => { arr.push(now()); while (arr.length && now() - arr[0] > secs) arr.shift(); if (arr.length >= n) { arr.length = 0; return true; } return false; };
  const COLS = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0xdc9e9a, 0x8f7ae8, 0xa8b994, 0x93abc0];
  const wood = paint(0x9a7c5c), dark = paint(0x6b4a34), cream = paint(0xf6eedb), brass = paint(0xd8b25a);
  const opaque = (w, h, draw) => paint(0xffffff, { map: canvasTex(w, h, draw), hatch: 0, unique: true });
  const plane = (w, h, mat, x, y, z, rot) => { const m = put(new THREE.PlaneGeometry(w, h), mat, x, y, z, rot); m.userData.noInk = true; return m; };
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const since = (t0) => now() - t0;
  const LW = -4 + 0.06;                 // left wall face (past the chair rail)
  const RW = 4 - 0.06;

  // a twisted hank of yarn, hanging down from (0,0,0): two strands wound round each other
  const hankGeo = (len = 0.36, r = 0.028) => {
    const gs = [];
    for (const ph of [0, Math.PI]) {
      const pts = [];
      for (let i = 0; i <= 16; i++) { const t = i / 16, a = t * Math.PI * 4 + ph, w = 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 0.008; pts.push(new THREE.Vector3(Math.cos(a) * w, -0.02 - t * len, Math.sin(a) * w)); }
      gs.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, r, 6));
    }
    gs.push(new THREE.TorusGeometry(0.035, 0.018, 6, 12).translate(0, -len - 0.04, 0));
    return mergeGeometries(gs.map(q => q.index ? q.toNonIndexed() : q));
  };

  // ══ LEFT SIDE ══════════════════════════════════════════════════════════════
  // ── the spinning wheel (taps: spin it up) ──
  {
    const x = -3.2, z = -2.4, ry = 0.75;
    claim(x, z, 0.42);
    const W0 = new THREE.Group(); W0.position.set(x, 0, z); W0.rotation.y = ry; g.add(W0);
    const B = S.at(x, 0, z, ry);
    B.box(0.95, 0.06, 0.26, wood, 0, 0.32, 0, 0.02);                         // the bench
    for (const [lx, lz] of [[-0.43, -0.13], [-0.43, 0.13], [0.4, 0]]) B.put(new THREE.CylinderGeometry(0.022, 0.03, 0.31, 8), dark, lx, 0.155, lz);
    for (const pz of [-0.065, 0.065]) B.put(new THREE.CylinderGeometry(0.02, 0.024, 0.46, 8), wood, -0.15, 0.57, pz);   // wheel uprights
    B.put(new THREE.CylinderGeometry(0.024, 0.028, 0.32, 8), wood, 0.32, 0.5, 0);                                     // the maiden
    B.box(0.32, 0.05, 0.07, wood, 0.3, 0.66, 0, 0.015);                                                               // mother-of-all
    for (const pz of [-0.03, 0.03]) B.put(new THREE.SphereGeometry(0.022, 8, 6), brass, -0.15, 0.8, pz * 3.2);       // axle caps
    // the drive band, wheel rim to the flyer's whorl
    const band = new THREE.CatmullRomCurve3([[-0.15, 1.18, 0], [0.19, 0.795, 0], [0.19, 0.745, 0], [-0.15, 0.42, 0], [-0.53, 0.8, 0]].map(p => new THREE.Vector3(...p)), true);
    L.at(x, 0, z, ry).put(new THREE.TubeGeometry(band, 40, 0.004, 4, true), paint(0xf1e4c8));
    // the wheel: rim, spokes, hub — turning about its axle
    const wheel = new THREE.Group(); wheel.position.set(-0.15, 0.8, 0); W0.add(wheel);
    const WK = sub(wheel);
    WK.put(new THREE.TorusGeometry(0.36, 0.022, 6, 32), wood);
    const sp = [];
    for (let i = 0; i < 8; i++) sp.push(new THREE.CylinderGeometry(0.009, 0.012, 0.36, 5).translate(0, 0.18, 0).rotateZ(i / 8 * Math.PI * 2).toNonIndexed());
    sp.push(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 10).rotateX(Math.PI / 2).toNonIndexed());
    sp.push(new THREE.SphereGeometry(0.018, 6, 5).translate(0.06, 0, 0.06).toNonIndexed());         // the crank pin
    WK.put(mergeGeometries(sp), dark);
    // the flyer and its bobbin of pink yarn, whirling about the long axis
    const flyer = new THREE.Group(); flyer.position.set(0.3, 0.77, 0); W0.add(flyer);
    const FK = sub(flyer);
    FK.put(new THREE.CylinderGeometry(0.045, 0.045, 0.14, 12).rotateZ(Math.PI / 2), paint(0xdc9e9a));
    FK.put(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10).rotateZ(Math.PI / 2), wood, -0.11, 0, 0);
    FK.put(new THREE.TorusGeometry(0.075, 0.009, 4, 12, Math.PI), dark);
    // the treadle, hinged at its back edge, and the footman up to the crank
    const tre = new THREE.Group(); tre.position.set(-0.5, 0.05, 0); W0.add(tre);
    sub(tre).box(0.48, 0.03, 0.16, dark, 0.24, 0, 0, 0.01);
    S.at(x, 0, z, ry).box(0.06, 0.05, 0.22, dark, -0.5, 0.025, 0, 0.01);
    const foot = put(new THREE.CylinderGeometry(0.008, 0.008, 1, 5).translate(0, 0.5, 0), dark, 0, 0, 0); W0.add(foot);
    foot.userData.noInk = true;
    let w = 1.1, ang = 0, t0 = -9;
    const pin = new THREE.Vector3(), tip = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    live((t, dt) => {
      const boost = since(t0) < 4 ? 9 * (1 - since(t0) / 4) : 0;
      ang -= (w + boost) * dt;
      wheel.rotation.z = ang; flyer.rotation.x += (w + boost) * dt * 4;
      pin.set(-0.15 + Math.cos(ang) * 0.06, 0.8 + Math.sin(ang) * 0.06, 0.06);
      tre.rotation.z = (pin.y - 0.8) * 1.2;
      tip.set(-0.5 + Math.cos(tre.rotation.z) * 0.36, 0.05 + Math.sin(tre.rotation.z) * 0.36 + 0.015, 0.06);
      foot.position.copy(tip);
      const d = pin.clone().sub(tip); foot.scale.set(1, d.length(), 1); foot.quaternion.setFromUnitVectors(up, d.normalize());
    });
    const wt = [];
    tap(W0, 'spin the wheel', (sfx) => { if (tapsWithin(wt, 4, 5)) say('Spinning straw into gold is the shop next door. This one only does wool.'); t0 = now(); sfx([[220, 0.12], [262, 0.12], [330, 0.12], [392, 0.3]], 'triangle', 0.5); });
    g.add(shadow(0.55).translateX(x).translateZ(z));
  }

  // ── the reading armchair, granny blanket over the back, knitting on the seat ──
  {
    const x = -3.36, z = -3.6, ry = Math.PI / 2;
    claim(x, z, 0.4);
    const C = S.at(x, 0, z, ry), seat = paint(0x7fb3a8), seatD = paint(0x5f9a90);
    C.box(0.78, 0.18, 0.62, seat, 0, 0.36, 0.02, 0.06);
    C.box(0.78, 0.7, 0.18, seat, 0, 0.72, -0.24, 0.07, [-0.12, 0, 0]);
    for (const s of [-1, 1]) { C.box(0.15, 0.3, 0.66, seatD, s * 0.38, 0.5, 0.0, 0.06); C.put(new THREE.CylinderGeometry(0.03, 0.022, 0.27, 8), dark, s * 0.32, 0.135, 0.24); C.put(new THREE.CylinderGeometry(0.03, 0.022, 0.27, 8), dark, s * 0.32, 0.135, -0.24); }
    C.box(0.6, 0.12, 0.5, paint(0xf1e4c8), 0, 0.5, 0.05, 0.05);                 // the cushion
    const chair = new THREE.Group(); chair.position.set(x, 0, z); chair.rotation.y = ry; g.add(chair);
    const CK = sub(chair);
    // the blanket: a granny square throw draped over the back
    const gm = opaque(256, 256, (c, w, h) => {
      c.fillStyle = '#f6eedb'; c.fillRect(0, 0, w, h);
      const pal = ['#e8604c', '#e4b84f', '#8f7ae8', '#dc9e9a', '#a8b994'];
      for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
        const s = w / 4, x0 = i * s, y0 = j * s;
        for (let k = 0; k < 4; k++) { c.strokeStyle = pal[(i + j + k) % pal.length]; c.lineWidth = 7; c.setLineDash([9, 4]); c.strokeRect(x0 + 6 + k * 7, y0 + 6 + k * 7, s - 12 - k * 14, s - 12 - k * 14); }
      }
    });
    CK.put(rb(0.62, 0.62, 0.03, 0.01), gm, 0.05, 0.78, -0.135, [-0.12, 0, 0.06]);
    CK.put(rb(0.4, 0.03, 0.22, 0.01), gm, 0.13, 0.565, -0.05, [0, 0, 0.05]);
    // knitting: two needles crossed through a swatch, clicking
    const sw = CK.box(0.2, 0.012, 0.12, paint(0xdc9e9a, { hatch: 0.7 }), -0.12, 0.575, 0.15, 0.005);
    const needles = [];
    for (const s of [-1, 1]) {
      const n = new THREE.Group(); n.position.set(-0.12, 0.6, 0.2); chair.add(n);
      const nk = sub(n);
      nk.put(new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5).rotateZ(Math.PI / 2).translate(0, 0, 0), paint(0xd8b25a), 0, 0, 0);
      nk.put(new THREE.SphereGeometry(0.014, 6, 5), paint(0xe8604c), s * 0.17, 0, 0);
      n.rotation.y = s * 0.45; needles.push(n);
    }
    CK.put(new THREE.SphereGeometry(0.075, 10, 8), paint(0xdc9e9a), 0.2, 0.635, 0.14);
    live((t) => { const k = Math.abs(Math.sin(t * 5)); needles.forEach((n, i) => { n.rotation.y = (i ? 1 : -1) * (0.35 + k * 0.2); n.rotation.z = (i ? 1 : -1) * k * 0.08; }); });
  }

  // ── the standard lamp with a fringed shade (taps: pull the chain) ──
  {
    const x = -3.55, z = -4.4;
    claim(x, z, 0.18);
    S.put(new THREE.CylinderGeometry(0.16, 0.19, 0.05, 16), dark, x, 0.025, z);
    S.put(new THREE.CylinderGeometry(0.02, 0.025, 1.55, 8), brass, x, 0.8, z);
    const shadeM = paint(0xe8604c, { side: THREE.DoubleSide, emissive: 0x5a2010 });
    S.put(new THREE.CylinderGeometry(0.14, 0.26, 0.26, 16, 1, true), shadeM, x, 1.66, z);
    const bulb = put(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshBasicMaterial({ color: 0xfff1b0 }), x, 1.58, z); bulb.userData.noInk = true;
    // the fringe, swaying in the draught
    const fringe = new THREE.Group(); fringe.position.set(x, 1.53, z); g.add(fringe);
    const fr = [];
    for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; fr.push(new THREE.CylinderGeometry(0.005, 0.005, 0.08, 3).translate(Math.cos(a) * 0.255, -0.04, Math.sin(a) * 0.255).toNonIndexed()); }
    const frM = put(mergeGeometries(fr), paint(0xe4b84f, { hatch: 0 }), 0, 0, 0); fringe.add(frM); frM.userData.noInk = true;
    const chain = new THREE.Group(); chain.position.set(x + 0.12, 1.55, z + 0.12); g.add(chain);
    const ck = sub(chain);
    const cg = []; for (let i = 0; i < 7; i++) cg.push(new THREE.SphereGeometry(0.008, 5, 4).translate(0, -0.02 - i * 0.025, 0).toNonIndexed());
    ck.put(mergeGeometries(cg), brass).userData.noInk = true;
    ck.put(new THREE.SphereGeometry(0.02, 8, 6), brass, 0, -0.2, 0);
    let on = true, t0 = -9;
    live((t) => {
      fringe.rotation.y = Math.sin(t * 0.7) * 0.15;
      fringe.rotation.z = Math.sin(t * 1.3) * 0.03;
      const s = since(t0); chain.rotation.z = s < 3 ? Math.sin(s * 9) * 0.5 * Math.exp(-s * 1.5) : Math.sin(t * 1.1) * 0.04;
      chain.rotation.x = s < 3 ? Math.cos(s * 7) * 0.3 * Math.exp(-s * 1.5) : 0;
    });
    const lt = []; let rave = -9;
    live((t) => {
      const s = since(rave);
      if (s < 6) { fx.filter(`hue-rotate(${Math.round(s * 300)}deg) saturate(1.5)`); fringe.rotation.y += 0.3; bulb.material.color.setHSL((t * 2) % 1, 0.8, 0.65); }
      else if (rave > 0) { rave = -9; fx.filter(''); bulb.material.color.set(on ? 0xfff1b0 : 0x8a7a60); }
    });
    tap(chain, 'pull the lamp chain', (sfx) => {
      if (tapsWithin(lt, 5, 4)) { rave = now(); say('Yarn rave! (Five pulls of the chain. The cats are unimpressed.)'); sfx([[392, 0.08], [523, 0.08], [392, 0.08], [659, 0.08], [392, 0.08], [784, 0.2]], 'square', 0.12); }
      t0 = now(); on = !on;
      bulb.material.color.set(on ? 0xfff1b0 : 0x8a7a60); shadeM.emissive.set(on ? 0x5a2010 : 0x000000);
      sfx([[1400, 0.03], [900, 0.04]], 'square', 0.25);
    });
    g.add(shadow(0.25).translateX(x).translateZ(z));
  }

  // ── the skein tree by the shelf: it's what Mochi's dangling strand hangs from ──
  {
    const x = -2.62, z = -4.7;
    claim(x, z, 0.16);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.3; S.box(0.3, 0.05, 0.06, dark, x + Math.cos(a) * 0.13, 0.025, z + Math.sin(a) * 0.13, 0.015, [0, -a, 0]); }
    S.put(new THREE.CylinderGeometry(0.025, 0.035, 1.5, 8), wood, x, 0.75, z);
    S.put(new THREE.SphereGeometry(0.045, 8, 6), wood, x, 1.52, z);
    // the arm reaching out to the strand's top (the strand hangs at -2.35, 1.3, -4.4)
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 1.3, z), new THREE.Vector3(x + 0.1, 1.38, z + 0.15), new THREE.Vector3(-2.35, 1.34, -4.4), new THREE.Vector3(-2.33, 1.3, -4.38)]);
    S.put(new THREE.TubeGeometry(arm, 12, 0.016, 6), wood);
    // pegs with hanks
    [[-1, 0.95, 4], [1, 1.1, 0], [-1, 1.2, 5]].forEach(([s, y, ci], i) => {
      const a = i * 2.1 + 2.4, px = x + Math.cos(a) * 0.1, pz = z + Math.sin(a) * 0.1;
      S.put(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6).rotateZ(Math.PI / 2).rotateY(-a), dark, px, y, pz);
      S.put(hankGeo(0.32, 0.024), paint(COLS[ci], { hatch: 0.7 }), x + Math.cos(a) * 0.17, y + 0.01, z + Math.sin(a) * 0.17);
    });
  }

  // ── a crocheted pouf by the door (taps: plop on it) ──
  {
    const x = -3.4, z = -0.45;
    claim(x, z, 0.28);
    const pouf = new THREE.Group(); pouf.position.set(x, 0, z); g.add(pouf);
    const pm = opaque(256, 64, (c, w, h) => {
      const pal = ['#8f7ae8', '#f6eedb', '#e4b84f', '#f6eedb', '#7fb3a8', '#f6eedb'];
      for (let j = 0; j < 6; j++) { c.fillStyle = pal[j]; c.fillRect(0, j * h / 6, w, h / 6); }
      c.strokeStyle = 'rgba(80,50,60,0.35)'; c.lineWidth = 2;
      for (let j = 0; j < 12; j++) for (let i = 0; i < 32; i++) { c.beginPath(); c.moveTo(i * 8, j * 5.3); c.lineTo(i * 8 + 4, j * 5.3 + 5); c.lineTo(i * 8 + 8, j * 5.3); c.stroke(); }
    });
    const body = put(new THREE.SphereGeometry(0.3, 20, 12).scale(1, 0.55, 1).translate(0, 0.165, 0), pm, 0, 0, 0); pouf.add(body);
    sub(pouf).put(new THREE.TorusGeometry(0.1, 0.035, 8, 20).rotateX(Math.PI / 2), paint(0xe8604c), 0, 0.33, 0);
    let t0 = -9;
    live(() => { const s = since(t0); const k = s < 1.6 ? Math.cos(s * 11) * Math.exp(-s * 2.6) : 0; pouf.scale.set(1 + k * 0.25, 1 - k * 0.4, 1 + k * 0.25); });
    tap(pouf, 'plop on the pouf', (sfx) => { t0 = now(); sfx([[180, 0.08], [140, 0.16]], 'sine', 0.6); });
    g.add(shadow(0.38).translateX(x).translateZ(z));
  }

  // ── the left wall: a pegboard of hanks, a framed pattern, a ruler of hooks ──
  {
    const z0 = -2.15;
    const pb = opaque(320, 200, (c, w, h) => {
      c.fillStyle = '#d8b892'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(90,60,40,0.55)';
      for (let y = 10; y < h; y += 20) for (let x = 10; x < w; x += 20) { c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
      c.strokeStyle = '#9a7c5c'; c.lineWidth = 8; c.strokeRect(4, 4, w - 8, h - 8);
    });
    put(rb(0.03, 1.0, 1.6, 0.01), pb, LW + 0.02, 1.72, z0);
    const hangers = [];
    for (let i = 0; i < 10; i++) {
      const row = i < 5 ? 0 : 1, zz = z0 - 0.64 + (i % 5) * 0.32 + row * 0.16, y = row ? 1.62 : 2.12;
      if (row && i % 5 === 4) continue;
      S.put(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6).rotateZ(Math.PI / 2), dark, LW + 0.09, y, zz);
      if (i % 3 === 1) {             // these few sway when the door draught catches them
        const hg = new THREE.Group(); hg.position.set(LW + 0.14, y + 0.01, zz); g.add(hg);
        sub(hg).put(hankGeo(0.34, 0.026), paint(COLS[i % COLS.length], { hatch: 0.7 }));
        hangers.push(hg);
      } else S.put(hankGeo(0.34, 0.026), paint(COLS[i % COLS.length], { hatch: 0.7 }), LW + 0.14, y + 0.01, zz);
    }
    live((t) => hangers.forEach((h, i) => { h.rotation.z = Math.sin(t * 1.3 + i * 1.7) * 0.12; h.rotation.x = Math.sin(t * 0.9 + i) * 0.08; }));
    // a framed pattern chart above the armchair
    const chart = opaque(256, 300, (c, w, h) => {
      c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h);
      c.fillStyle = INKC; c.font = `700 34px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('Granny Square', w / 2, 40);
      c.font = `400 18px ${HAND}`; c.fillText('rounds 1 – 4', w / 2, 62);
      const cx = w / 2, cy = 170, pal = ['#e8604c', '#e4b84f', '#7fb3a8', '#8f7ae8'];
      for (let r = 0; r < 4; r++) {
        c.strokeStyle = pal[r]; c.lineWidth = 3;
        const s = 22 + r * 22;
        for (let k = 0; k < 4; k++) {
          for (let j = -1; j <= 1; j++) {           // clusters of three "T" stitch symbols on each side
            c.save(); c.translate(cx, cy); c.rotate(k * Math.PI / 2); c.translate(j * s * 0.5, -s);
            c.beginPath(); c.moveTo(0, 8); c.lineTo(0, -8); c.moveTo(-5, -8); c.lineTo(5, -8); c.moveTo(-3, 0); c.lineTo(3, -3); c.stroke(); c.restore();
          }
        }
      }
      c.fillStyle = '#e8604c'; c.beginPath(); c.arc(cx, cy, 8, 0, 7); c.fill();
      c.fillStyle = INKC; c.font = `400 16px ${HAND}`; c.fillText('ch 4, join · 3 dc clusters · ch 2 corners', w / 2, h - 16);
    });
    S.box(0.04, 0.82, 0.7, wood, LW + 0.01, 1.68, -3.6, 0.015);
    plane(0.6, 0.72, chart, LW + 0.035, 1.68, -3.6, [0, Math.PI / 2, 0]);
    // a ruler of crochet hooks, 2 mm to 10 mm
    S.box(0.03, 0.08, 0.7, wood, LW + 0.015, 1.95, -4.62, 0.01);
    for (let i = 0; i < 7; i++) {
      const zz = -4.9 + i * 0.095, len = 0.22 + i * 0.03, r = 0.007 + i * 0.0025;
      S.put(new THREE.CylinderGeometry(r, r, len, 6), paint(COLS[i % COLS.length]), LW + 0.05, 1.95 - len / 2 + 0.05, zz);
      S.put(new THREE.SphereGeometry(r * 1.2, 6, 5), paint(0x6f7d92), LW + 0.05, 1.95 - len + 0.05, zz);
    }
  }

  // ══ RIGHT SIDE ═════════════════════════════════════════════════════════════
  // ── a side table with an umbrella swift feeding a ball winder (taps: crank it) ──
  {
    const x = 3.42, z = -1.5;
    claim(x, z, 0.3);
    S.put(new THREE.CylinderGeometry(0.32, 0.32, 0.045, 20), wood, x, 0.7, z);
    for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.5; S.put(new THREE.CylinderGeometry(0.02, 0.026, 0.68, 6), dark, x + Math.cos(a) * 0.22, 0.34, z + Math.sin(a) * 0.22, [Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1]); }
    // the swift: a clamp, a post, and the umbrella ribs with a hank stretched round them
    const sx = x + 0.14, sz = z - 0.08;
    S.put(new THREE.CylinderGeometry(0.02, 0.02, 0.18, 8), wood, sx, 0.81, sz);
    const swift = new THREE.Group(); swift.position.set(sx, 0.98, sz); g.add(swift);
    const sk = sub(swift), ribs = [];
    const seg = (a, b, r) => { const d = b.clone().sub(a), q = new THREE.CylinderGeometry(r, r, d.length(), 4).translate(0, d.length() / 2, 0); q.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize())); return q.translate(a.x, a.y, a.z).toNonIndexed(); };
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, rim = new THREE.Vector3(Math.cos(a) * 0.18, 0.015, Math.sin(a) * 0.18); ribs.push(seg(new THREE.Vector3(0, 0.1, 0), rim, 0.006), seg(new THREE.Vector3(0, -0.09, 0), rim, 0.006)); }
    ribs.push(new THREE.CylinderGeometry(0.014, 0.014, 0.22, 6).toNonIndexed(), new THREE.SphereGeometry(0.022, 6, 5).translate(0, 0.11, 0).toNonIndexed());
    sk.put(mergeGeometries(ribs), wood).userData.noInk = true;
    sk.put(new THREE.TorusGeometry(0.18, 0.018, 6, 24).rotateX(Math.PI / 2), paint(0xb7a3c6, { hatch: 0.7 }));
    sk.put(new THREE.TorusGeometry(0.175, 0.016, 6, 24).rotateX(Math.PI / 2), paint(0xb7a3c6, { hatch: 0.7 }), 0, 0.03, 0);
    // the winder and its growing cake
    const wx = x - 0.15, wz = z + 0.12;
    S.box(0.1, 0.08, 0.1, paint(0x93abc0), wx, 0.76, wz, 0.015);
    const cake = new THREE.Group(); cake.position.set(wx, 0.8, wz); g.add(cake);
    const cg = sub(cake);
    cg.put(new THREE.CylinderGeometry(0.07, 0.08, 0.11, 12).translate(0, 0.055, 0), paint(0xb7a3c6, { hatch: 0.7 }));
    cg.put(new THREE.CylinderGeometry(0.012, 0.012, 0.16, 6).translate(0, 0.08, 0), paint(0xf6eedb));
    const crank = new THREE.Group(); crank.position.set(wx + 0.05, 0.76, wz); g.add(crank);
    const crk = sub(crank);
    crk.put(new THREE.CylinderGeometry(0.008, 0.008, 0.08, 5).translate(0.008, 0.04, 0), dark);
    crk.put(new THREE.CylinderGeometry(0.015, 0.015, 0.05, 6).rotateZ(Math.PI / 2).translate(0.033, 0.08, 0), paint(0xe8604c));
    // the strand from swift to cake
    const str = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 4).translate(0, 0.5, 0), paint(0xb7a3c6, { hatch: 0 })); str.userData.noInk = true; g.add(str);
    const uL = Math.hypot(wx - sx, wz - sz), ux = (wx - sx) / uL, uz = (wz - sz) / uL;
    const A = new THREE.Vector3(), Bv = new THREE.Vector3(), upv = new THREE.Vector3(0, 1, 0);
    let t0 = -9, a = 0;
    live((t, dt) => {
      const sp = 1.2 + (since(t0) < 3 ? 10 * (1 - since(t0) / 3) : 0);
      a += sp * dt;
      swift.rotation.y = -a * 0.7; cake.rotation.y = a * 2; crank.rotation.x = a * 2;
      const cs = 1 + 0.1 * Math.sin(t * 0.2); cake.scale.set(cs, 1, cs);
      A.set(sx + ux * 0.175, 0.99, sz + uz * 0.175);
      Bv.set(wx - ux * 0.06, 0.86 + Math.sin(t * 3) * 0.03, wz - uz * 0.06);
      str.position.copy(Bv); const d = A.clone().sub(Bv); str.scale.set(1, d.length(), 1); str.quaternion.setFromUnitVectors(upv, d.normalize());
    });
    tap(crank, 'crank the ball winder', (sfx) => { t0 = now(); sfx([[600, 0.05], [700, 0.05], [800, 0.05], [900, 0.05], [1000, 0.1]], 'square', 0.2); });
    g.add(shadow(0.4).translateX(x).translateZ(z));
  }

  // ── a big basket of yarn balls by the door (taps: one hops out) ──
  {
    const x = 3.42, z = -0.55;
    claim(x, z, 0.32);
    const bm = opaque(256, 64, (c, w, h) => {
      c.fillStyle = '#c8a47c'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8a6448'; c.lineWidth = 3;
      for (let j = 0; j < 6; j++) for (let i = 0; i < 16; i++) { const y = j * 11 + 5, xx = i * 16 + (j % 2) * 8; c.beginPath(); c.ellipse(xx + 8, y, 8, 5, 0, 0, 7); c.stroke(); }
    });
    S.put(new THREE.CylinderGeometry(0.34, 0.28, 0.36, 18, 1, true), paint(0xffffff, { map: bm.map, side: THREE.DoubleSide, hatch: 0 }), x, 0.18, z);
    S.put(new THREE.CylinderGeometry(0.28, 0.28, 0.02, 18), paint(0x8a6448), x, 0.02, z);
    S.put(new THREE.TorusGeometry(0.34, 0.025, 6, 24).rotateX(Math.PI / 2), paint(0x8a6448), x, 0.36, z);
    for (const s of [-1, 1]) S.put(new THREE.TorusGeometry(0.08, 0.018, 5, 10, Math.PI), paint(0x8a6448), x + s * 0.3, 0.38, z, [0, Math.PI / 2, 0]);
    const spots = [[-0.12, 0.1], [0.12, 0.08], [0, -0.14], [-0.15, -0.1], [0.15, -0.12], [0.02, 0.02]];
    spots.forEach(([dx, dz], i) => { if (i === 5) return; const r = 0.12; S.put(new THREE.SphereGeometry(r, 10, 8), paint(COLS[(i * 3) % COLS.length]), x + dx, 0.32 + (i % 2) * 0.03, z + dz); L.put(new THREE.TorusGeometry(r, 0.012, 5, 14), paint(COLS[(i * 3 + 2) % COLS.length]), x + dx, 0.32 + (i % 2) * 0.03, z + dz, [i, i * 0.7, 0]); });
    const hop = new THREE.Group(); hop.position.set(x + 0.02, 0.4, z + 0.02); g.add(hop);
    const hk = sub(hop);
    hk.put(new THREE.SphereGeometry(0.13, 12, 10), paint(0xe8604c));
    hk.put(new THREE.TorusGeometry(0.13, 0.014, 5, 16), paint(0xe4b84f), 0, 0, 0, [0.6, 0, 0.4]).userData.noInk = true;
    hk.put(new THREE.TorusGeometry(0.13, 0.014, 5, 16), paint(0xe4b84f), 0, 0, 0, [1.6, 0.8, 0]).userData.noInk = true;
    let t0 = -9;
    live(() => {
      const s = since(t0), T = 1.1;
      const k = s < T ? s / T : 1;
      hop.position.y = 0.4 + Math.sin(k * Math.PI) * 0.45;
      hop.rotation.x = k * Math.PI * 4;
      const sq = s > T && s < T + 0.4 ? Math.sin((s - T) / 0.4 * Math.PI) * 0.25 : 0;
      hop.scale.set(1 + sq * 0.6, 1 - sq, 1 + sq * 0.6);
    });
    tap(hop, 'toss a ball of yarn', (sfx) => { t0 = now(); sfx([[330, 0.08], [494, 0.08], [659, 0.18]], 'sine', 0.5); });
    g.add(shadow(0.42).translateX(x).translateZ(z));
  }

  // ── a tower of yarn cones under the shelves ──
  {
    const x = 3.66, z = -4.0;
    claim(x, z, 0.2);
    S.box(0.36, 0.06, 0.36, wood, x, 0.03, z, 0.015);
    [[0, 0, 0x8f7ae8], [-0.09, 0.1, 0xe4b84f], [0.09, -0.09, 0x7fb3a8], [0.08, 0.09, 0xe8604c]].forEach(([dx, dz, col], i) => {
      S.put(new THREE.CylinderGeometry(0.05, 0.075, 0.26, 12), paint(col, { hatch: 0.7 }), x + dx, 0.19, z + dz);
      S.put(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8), paint(0xf6eedb), x + dx, 0.2, z + dz);
    });
    S.put(new THREE.CylinderGeometry(0.05, 0.075, 0.26, 12), paint(0xdc9e9a, { hatch: 0.7 }), x, 0.46, z);
    S.put(new THREE.CylinderGeometry(0.02, 0.03, 0.3, 8), paint(0xf6eedb), x, 0.47, z);
  }

  // ── the giant-hook jar in the back corner (taps: rattle) ──
  {
    const x = 3.62, z = -5.12;
    claim(x, z, 0.17);
    S.put(new THREE.CylinderGeometry(0.15, 0.13, 0.42, 16, 1, true), paint(0xcfe6ef, { side: THREE.DoubleSide, hatch: 0 }), x, 0.21, z);
    S.put(new THREE.CylinderGeometry(0.13, 0.13, 0.02, 16), paint(0xcfe6ef, { hatch: 0 }), x, 0.01, z);
    S.put(new THREE.TorusGeometry(0.15, 0.015, 5, 20).rotateX(Math.PI / 2), paint(0xe4b84f), x, 0.42, z);
    const jar = new THREE.Group(); jar.position.set(x, 0.04, z); g.add(jar);
    const hooks = [];
    [[0xe8604c, -0.05, 0.03, 0.12], [0x7fb3a8, 0.05, -0.03, -0.15], [0x8f7ae8, 0, 0.06, 0.05], [0xe4b84f, 0.04, 0.05, -0.05]].forEach(([col, dx, dz, lean], i) => {
      const h = new THREE.Group(); h.position.set(dx, 0, dz); h.rotation.z = lean; h.rotation.x = -lean * 0.6; jar.add(h);
      const hk = sub(h), len = 0.9 + i * 0.12;
      hk.put(new THREE.CylinderGeometry(0.018, 0.018, len, 8).translate(0, len / 2, 0), paint(col));
      hk.put(new THREE.TorusGeometry(0.025, 0.012, 5, 10, Math.PI * 1.3).translate(0.025, 0, 0).rotateZ(Math.PI * 0.35), paint(col), 0, len, 0);
      hk.put(rb(0.045, 0.1, 0.02, 0.008), cream, 0, len * 0.55, 0);
      if (i === 3) { hk.put(new THREE.PlaneGeometry(0.16, 0.07), opaque(128, 56, (c, w, h) => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `400 15px ${HAND}`; c.textAlign = 'center'; c.fillText('crochet hooks.', w / 2, 22); c.fillText('NOT for pirates.', w / 2, 44); }), 0.0, len * 0.78, 0.022).userData.noInk = true; }
      hooks.push([h, lean]);
    });
    let t0 = -9;
    live(() => { const s = since(t0); const k = s < 2 ? Math.sin(s * 16 + 1) * Math.exp(-s * 1.6) : 0; hooks.forEach(([h, lean], i) => { h.rotation.z = lean + k * 0.22 * (i % 2 ? 1 : -1); h.rotation.x = -lean * 0.6 + k * 0.16 * (i % 3 - 1); h.position.y = s < 0.4 ? Math.sin(s / 0.4 * Math.PI) * 0.06 * (i % 2 + 0.5) : 0; }); });
    tap(jar, 'rattle the hook jar', (sfx) => { t0 = now(); sfx([[1800, 0.03], [2100, 0.03], [1600, 0.03], [2400, 0.03], [1900, 0.05]], 'square', 0.15); });
  }

  // ── the right wall: two shelves of crochet treats and notions, a stitch chart ──
  {
    const z = -4.25;
    for (const y of [1.3, 1.85]) {
      S.box(0.28, 0.04, 1.3, wood, RW - 0.13, y, z, 0.01);
      for (const dz of [-0.5, 0.5]) S.box(0.22, 0.12, 0.03, dark, RW - 0.1, y - 0.07, z + dz, 0.01, [0, 0, 0.6]);
    }
    const Y1 = 1.32, Y2 = 1.87;
    // lower shelf: button jars, a pincushion, a stack of skeins
    [[-0.5, 0xe8604c], [-0.32, 0x7fb3a8], [-0.14, 0xe4b84f]].forEach(([dz, col]) => {
      S.put(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 12), paint(0xcfe6ef, { hatch: 0 }), RW - 0.14, Y1 + 0.08, z + dz);
      S.put(new THREE.CylinderGeometry(0.06, 0.06, 0.1, 10), paint(col), RW - 0.14, Y1 + 0.06, z + dz);
      S.put(new THREE.CylinderGeometry(0.074, 0.074, 0.03, 12), brass, RW - 0.14, Y1 + 0.175, z + dz);
    });
    S.put(new THREE.SphereGeometry(0.08, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint(0xe8604c), RW - 0.14, Y1, z + 0.12);
    for (let i = 0; i < 5; i++) S.put(new THREE.SphereGeometry(0.012, 6, 4), paint(COLS[i]), RW - 0.14 + Math.cos(i * 1.3) * 0.04, Y1 + 0.075, z + 0.12 + Math.sin(i * 1.3) * 0.04);
    for (let i = 0; i < 3; i++) S.put(new THREE.CapsuleGeometry(0.045, 0.14, 4, 10).rotateX(Math.PI / 2), paint(COLS[i + 4], { hatch: 0.7 }), RW - 0.14, Y1 + 0.05 + i * 0.09, z + 0.42);
    // upper shelf: a crochet mushroom, a strawberry, and a cactus in a pot that wobbles when tapped
    const mush = S.at(RW - 0.14, Y2, z - 0.45);
    mush.put(new THREE.CylinderGeometry(0.035, 0.045, 0.1, 10), cream, 0, 0.05, 0);
    mush.put(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, 0.75, 1), paint(0xe8604c), 0, 0.09, 0);
    for (let i = 0; i < 5; i++) mush.put(new THREE.SphereGeometry(0.014, 6, 4), cream, Math.cos(i * 1.26) * 0.055, 0.14, Math.sin(i * 1.26) * 0.055);
    const straw = S.at(RW - 0.14, Y2, z - 0.15);
    straw.put(new THREE.SphereGeometry(0.07, 12, 10).scale(1, 1.15, 1), paint(0xe8604c), 0, 0.075, 0);
    straw.put(new THREE.ConeGeometry(0.05, 0.03, 6), paint(0x7aa86a), 0, 0.16, 0);
    const pot = new THREE.Group(); pot.position.set(RW - 0.14, Y2 + 0.02, z + 0.25); g.add(pot);
    const pk = sub(pot);
    pk.put(new THREE.CylinderGeometry(0.07, 0.055, 0.1, 12).translate(0, 0.05, 0), paint(0xd07a5a));
    pk.put(new THREE.CapsuleGeometry(0.05, 0.12, 4, 10).translate(0, 0.17, 0), paint(0x7aa86a, { hatch: 0.6 }));
    pk.put(new THREE.CapsuleGeometry(0.028, 0.06, 4, 8).rotateZ(-0.9).translate(0.07, 0.19, 0), paint(0x7aa86a, { hatch: 0.6 }));
    pk.put(new THREE.CapsuleGeometry(0.025, 0.05, 4, 8).rotateZ(0.9).translate(-0.065, 0.15, 0), paint(0x7aa86a, { hatch: 0.6 }));
    pk.put(new THREE.SphereGeometry(0.025, 8, 6), paint(0xdc6a9a), 0, 0.28, 0);
    let pt0 = -9;
    live(() => { const s = since(pt0); const k = s < 2 ? Math.sin(s * 12 + 1) * Math.exp(-s * 1.8) : 0; pot.rotation.x = k * 0.5; pot.rotation.z = k * 0.3; pot.position.y = Y2 + 0.02 + (s < 0.5 ? Math.sin(s / 0.5 * Math.PI) * 0.12 : 0); });
    tap(pot, 'boop the crochet cactus', (sfx) => { pt0 = now(); sfx([[523, 0.07], [784, 0.07], [1047, 0.14]], 'triangle', 0.4); });
    // more stacked skeins in the corner by the shelf top
    for (let i = 0; i < 3; i++) S.put(new THREE.CapsuleGeometry(0.045, 0.13, 4, 10).rotateX(Math.PI / 2), paint(COLS[i], { hatch: 0.7 }), RW - 0.14, Y2 + 0.05 + (i === 2 ? 0.085 : 0), z + 0.5 - (i === 2 ? 0.05 : i * 0.1));
    // the stitch chart, like the app's pattern panel
    const st = opaque(320, 260, (c, w, h) => {
      c.fillStyle = '#fbf8f1'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#9ccbe8'; c.fillRect(0, 0, w, 78);
      c.fillStyle = INKC; c.font = `700 56px ${HAND}`; c.fillText('dc', 16, 60); c.font = `400 12px ${HAND}`; c.fillText('(not the capital)', 222, 72);
      c.font = `400 22px ${HAND}`; c.fillText('Double crochet', 86, 58);
      const rows = [['ch ×14', '#f3dfa8'], ['sc ×13', '#f2b8c6'], ['sc ×13', '#f2b8c6'], ['hdc ×13', '#a8dcc6'], ['dc ×13', '#9ccbe8']];
      rows.forEach(([s, col], i) => {
        const y = 96 + i * 32;
        c.fillStyle = '#6a6070'; c.font = `400 18px ${HAND}`; c.fillText(`Row ${i + 1}`, 18, y + 20);
        c.fillStyle = col; c.beginPath(); c.roundRect(96, y + 2, 110, 24, 12); c.fill(); c.strokeStyle = INKC; c.lineWidth = 1.5; c.stroke();
        c.fillStyle = INKC; c.font = `400 17px monospace`; c.fillText(s, 110, y + 20);
        c.strokeStyle = '#4f9a6a'; c.lineWidth = 3; c.beginPath(); c.moveTo(270, y + 14); c.lineTo(278, y + 22); c.lineTo(292, y + 6); c.stroke();
      });
    });
    S.box(0.04, 0.82, 1.0, paint(0x8f7ae8), RW - 0.01, 1.78, -2.25, 0.015);
    plane(0.92, 0.75, st, RW - 0.035, 1.78, -2.25, [0, -Math.PI / 2, 0]);
  }

  // ── a corkboard of finished makes, the app's Community wall ──
  {
    const cb = opaque(320, 256, (c, w, h) => {
      c.fillStyle = '#c99a68'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(120,80,40,0.35)'; for (let i = 0; i < 900; i++) c.fillRect((i * 97) % w, (i * 57) % h, 2, 2);
      c.fillStyle = INKC; c.font = `700 30px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('made with YarnFlow', w / 2, 32);
      const items = [['scarf', '#f2b8c6'], ['coaster', '#e4b84f'], ['amigurumi', '#7fb3a8'], ['beanie', '#8f7ae8'], ['granny', '#e8604c'], ['cat (accidental)', '#e09a52']];
      items.forEach(([n, col], i) => {
        const x = 18 + (i % 3) * 100, y = 48 + Math.floor(i / 3) * 102, rot = ((i * 37) % 7 - 3) * 0.03;
        c.save(); c.translate(x + 42, y + 46); c.rotate(rot);
        c.fillStyle = '#fffaf0'; c.fillRect(-42, -46, 84, 94);
        c.fillStyle = col; c.fillRect(-35, -39, 70, 62);
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 3; for (let k = -30; k < 30; k += 9) { c.beginPath(); c.moveTo(-30, k); c.lineTo(30, k + 4); c.stroke(); }
        c.fillStyle = INKC; c.font = `400 15px ${HAND}`; c.fillText(n, 0, 40);
        c.fillStyle = ['#e8604c', '#5f8cc8', '#e4b84f'][i % 3]; c.beginPath(); c.arc(0, -42, 5, 0, 7); c.fill();
        c.restore();
      });
    });
    S.box(0.04, 0.72, 0.9, wood, RW - 0.01, 1.72, -0.75, 0.015);
    plane(0.84, 0.66, cb, RW - 0.035, 1.72, -0.75, [0, -Math.PI / 2, 0]);
  }

  // ══ BACK WALL ══════════════════════════════════════════════════════════════
  // a hand-lettered shop sign over the cubbies
  {
    const sg = opaque(400, 90, (c, w, h) => {
      c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#8f7ae8'; c.lineWidth = 6; c.setLineDash([10, 5]); c.strokeRect(6, 6, w - 12, h - 12); c.setLineDash([]);
      c.fillStyle = INKC; c.font = `700 46px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('yarn · hooks · notions', w / 2, h / 2 + 2);
    });
    S.box(1.42, 0.3, 0.03, wood, -2.8, 1.97, -D + 0.53, 0.01);
    plane(1.36, 0.25, sg, -2.8, 1.97, -D + 0.552);
  }
  // ══ HANGING FROM THE TOP ═══════════════════════════════════════════════════
  // macramé planters swinging off brackets on both side walls
  const planters = [];
  for (const [s, zz, leaf] of [[-1, -0.85, 0x6fae66], [1, -2.95, 0x5e9d5e], [-1, -4.75, 0x86a868]]) {
    const wx = s * (4 - 0.06);
    S.box(0.36, 0.04, 0.04, dark, wx - s * 0.17, 2.55, zz, 0.01);
    S.box(0.04, 0.16, 0.04, dark, wx - s * 0.01, 2.48, zz, 0.01);
    const p = new THREE.Group(); p.position.set(wx - s * 0.32, 2.53, zz); g.add(p);
    const pk = sub(p), cord = paint(0xf1e4c8);
    const cords = [];
    for (let k = 0; k < 4; k++) {
      const a = k / 4 * Math.PI * 2 + 0.4;
      const pts = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 0.05, -0.3, Math.sin(a) * 0.05), new THREE.Vector3(Math.cos(a + 0.6) * 0.09, -0.5, Math.sin(a + 0.6) * 0.09), new THREE.Vector3(Math.cos(a) * 0.12, -0.62, Math.sin(a) * 0.12), new THREE.Vector3(0, -0.76, 0)];
      cords.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, 0.007, 4));
    }
    const cm = pk.put(mergeGeometries(cords), cord); cm.userData.noInk = true;
    pk.put(new THREE.SphereGeometry(0.022, 8, 6), cord, 0, -0.35, 0);
    pk.put(new THREE.CylinderGeometry(0.11, 0.08, 0.13, 12), paint(0xd07a5a), 0, -0.64, 0);
    const lf = [];
    for (let k = 0; k < 7; k++) { const a = k * 0.9; lf.push(new THREE.SphereGeometry(0.06, 7, 5).scale(0.6, 0.3, 1.2).rotateX(0.5).rotateY(a).translate(Math.cos(a) * 0.06, -0.55 + (k % 2) * 0.04, -Math.sin(a) * 0.06).toNonIndexed()); }
    for (let k = 0; k < 3; k++) { const a = k * 2.1 + 0.5; lf.push(new THREE.CapsuleGeometry(0.012, 0.25, 2, 4).translate(0, -0.125, 0).rotateX(-0.2).translate(Math.cos(a) * 0.1, -0.6, Math.sin(a) * 0.1).toNonIndexed()); }
    pk.put(mergeGeometries(lf.map(q => { for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k); return q; })), paint(leaf, { hatch: 0.5 }));
    planters.push(p);
  }
  live((t) => planters.forEach((p, i) => { p.rotation.z = Math.sin(t * 0.8 + i * 2) * 0.05; p.rotation.x = Math.sin(t * 0.6 + i) * 0.04; p.rotation.y = Math.sin(t * 0.3 + i) * 0.3; }));

  // ── a small round rug by the door ──
  {
    const rug = opaque(256, 256, (c, w, h) => {
      const pal = ['#f6eedb', '#e4b84f', '#dc9e9a', '#7fb3a8', '#8f7ae8', '#f6eedb'];
      for (let k = pal.length - 1; k >= 0; k--) { c.fillStyle = pal[k]; c.beginPath(); c.arc(w / 2, h / 2, (k + 1) * w / 12.5, 0, 7); c.fill(); }
    });
    rug.transparent = true; rug.alphaTest = 0.5;
    plane(1.1, 1.1, rug, 1.55, 0.012, -0.55, [-Math.PI / 2, 0, 0.5]).renderOrder = 1;
  }

  // ══ THE SIGNATURE TRICK: pull the loose thread and the big rug is frogged (unravelled)
  // round by round into a ball, then crocheted back stitch by stitch: a pattern, played ══
  {
    const X0 = -1.7, Z0 = -3.15, SZ = 1.5, NR = 6;
    const PAL = ['#e8604c', '#e4b84f', '#dc9e9a', '#7fb3a8', '#8f7ae8', '#f6eedb'];
    const STEP = ['ch 4, join', '12 dc', '24 dc', '36 dc', '48 dc', '60 sc, fasten off'];
    const rugM = opaque(256, 256, () => {}); rugM.transparent = true; rugM.alphaTest = 0.5;
    const cv = rugM.map.image, cc = cv.getContext('2d');
    // P: how much is crocheted, in rounds (0..6); round k is whole when P >= k
    const drawRug = (P) => {
      const w = 256, rw = w / 2 / (NR + 0.3);
      cc.clearRect(0, 0, w, w);
      for (let k = 1; k <= NR; k++) {
        const f = Math.max(0, Math.min(1, P - (k - 1)));
        if (f <= 0) break;
        const r0 = (k - 1) * rw, r1 = k * rw, a1 = f * Math.PI * 2;
        cc.fillStyle = PAL[(k - 1) % PAL.length];
        cc.beginPath(); cc.arc(w / 2, w / 2, r1, 0, a1); if (r0 > 0) cc.arc(w / 2, w / 2, r0, a1, 0, true); else cc.lineTo(w / 2, w / 2); cc.closePath(); cc.fill();
        cc.strokeStyle = 'rgba(90,60,70,0.35)'; cc.lineWidth = 2;
        const n = 6 * k;
        for (let s = 0; s < n * f; s++) { const a = (s + 0.5) / n * Math.PI * 2, r = (r0 + r1) / 2; cc.beginPath(); cc.ellipse(w / 2 + Math.cos(a) * r, w / 2 + Math.sin(a) * r, 3, rw * 0.35, a, 0, 7); cc.stroke(); }
      }
      rugM.map.needsUpdate = true;
      return rw;
    };
    const RW_ = drawRug(NR);
    const rug = plane(SZ, SZ, rugM, X0, 0.013, Z0, [-Math.PI / 2, 0, 0]); rug.renderOrder = 1;
    const toWorld = (P) => {                               // where the stitch being worked sits
      const k = Math.max(1, Math.min(NR, Math.ceil(P))), f = P - (k - 1), r = ((k - 0.5) * RW_) / 128 * (SZ / 2), a = f * Math.PI * 2;
      return [X0 + Math.cos(a) * r, Z0 + Math.sin(a) * r];
    };
    // the loose thread end, curling off the rug's edge with a little tassel
    const tail = new THREE.Group(); g.add(tail);
    const tc = new THREE.CatmullRomCurve3([new THREE.Vector3(X0 + 0.7, 0.02, Z0), new THREE.Vector3(X0 + 0.85, 0.02, Z0 + 0.1), new THREE.Vector3(X0 + 0.95, 0.02, Z0 - 0.05), new THREE.Vector3(X0 + 1.08, 0.03, Z0 + 0.06)]);
    tail.add(put(new THREE.TubeGeometry(tc, 16, 0.014, 6), paint(0xf6eedb), 0, 0, 0));
    tail.add(put(new THREE.ConeGeometry(0.035, 0.08, 8).rotateZ(Math.PI / 2), paint(0xe8604c), X0 + 1.12, 0.035, Z0 + 0.06));
    // the ball it winds into, and the hook that crochets it back
    const ball = new THREE.Group(); ball.position.set(X0 + 0.85, 0, Z0 - 0.75); g.add(ball);
    const bm = sub(ball).put(new THREE.SphereGeometry(0.16, 14, 10), paint(0xe8604c)); bm.position.y = 0.16;
    sub(ball).put(new THREE.TorusGeometry(0.16, 0.012, 5, 18), paint(0xe4b84f), 0, 0.16, 0, [0.7, 0.3, 0]).userData.noInk = true;
    showAll(ball, false);
    const str = put(new THREE.CylinderGeometry(0.006, 0.006, 1, 4).translate(0, 0.5, 0), paint(0xe8604c, { hatch: 0 }), 0, 0, 0); str.userData.noInk = true; str.visible = false;
    const hook = new THREE.Group(); g.add(hook);
    const HK = sub(hook);
    HK.put(new THREE.CylinderGeometry(0.016, 0.016, 0.5, 8).translate(0, 0.25, 0), paint(0x8f7ae8));
    HK.put(new THREE.TorusGeometry(0.022, 0.01, 5, 10, Math.PI * 1.3).rotateZ(Math.PI * 0.3), paint(0x8f7ae8), 0.02, 0.0, 0);
    HK.put(rb(0.06, 0.12, 0.03, 0.01), paint(0xf6eedb), 0, 0.3, 0);
    showAll(hook, false);
    // the lost page was under the rug all along
    const pg = kit.page(); let pgOut = pg.collected;
    if (!pg.collected) { pg.position.set(X0 - 0.05, 0.015, Z0 + 0.02); pg.rotation.y = 0.4; g.add(pg); showAll(pg, false); const poke = pg.userData.toy.poke; pg.userData.toy.poke = (sfx) => { poke(sfx); say('A page of Vivi’s guest list! It was under the rug the whole time.'); }; }
    const A = new THREE.Vector3(), B = new THREE.Vector3(), UP = new THREE.Vector3(0, 1, 0);
    const T_UN = 6, T_REST = 3, T_RE = 10;
    let t0 = -99, lastK = 0, busy = false;
    onExit(() => { if (busy) { t0 = -99; busy = false; drawRug(NR); showAll(ball, false); showAll(hook, false); str.visible = false; showAll(tail, true); } });
    live((t) => {
      if (!busy) return;
      const s = since(t0);
      let P, phase;
      if (s < T_UN) { phase = 0; P = NR * (1 - s / T_UN); }
      else if (s < T_UN + T_REST) { phase = 1; P = 0; }
      else if (s < T_UN + T_REST + T_RE) { phase = 2; P = NR * (s - T_UN - T_REST) / T_RE; }
      else { busy = false; P = NR; drawRug(NR); showAll(ball, false); showAll(hook, false); str.visible = false; showAll(tail, true); say('Stitch by stitch, round by round: that’s how YarnFlow plays a pattern.'); return; }
      drawRug(P);
      if (!pgOut && P < 0.6) { pgOut = true; showAll(pg, true); say('Fully frogged… and there’s something under where the rug was!'); }
      // the ball fattens as the rug unravels, and slims as it's crocheted back
      const r = 0.05 + 0.13 * (1 - P / NR); bm.scale.setScalar(r / 0.16); bm.position.y = r;
      ball.rotation.y += phase === 0 ? 0.2 : phase === 2 ? -0.1 : 0;
      const [sx, sz] = toWorld(Math.max(0.05, P));
      A.set(sx, 0.02, sz); B.set(ball.position.x, r * 2 - 0.02, ball.position.z);
      str.position.copy(A); const d = B.clone().sub(A); str.scale.set(1, d.length(), 1); str.quaternion.setFromUnitVectors(UP, d.normalize()); str.visible = P > 0.02;
      // the hook works each stitch as it comes back
      if (phase === 2) {
        if (!hook.visible) showAll(hook, true);
        const dip = Math.abs(Math.sin(t * 14));
        hook.position.set(sx, 0.02 + dip * 0.06, sz); hook.rotation.set(0.5 + dip * 0.3, -Math.atan2(sz - Z0, sx - X0), 0.25);
        const k = Math.max(1, Math.ceil(P));
        if (k !== lastK) { lastK = k; say(`Round ${k} of ${NR} · ${STEP[k - 1]}`); kit.sfx([[392 + k * 60, 0.08]], 'triangle', 0.1); }
      } else if (hook.visible) showAll(hook, false);
    });
    tap(tail, 'pull the loose thread', (sfx) => {
      if (busy) return;
      busy = true; t0 = now(); lastK = 0; showAll(tail, false); showAll(ball, true);
      say('Frogging! (Rip it, rip it: that’s what crocheters call unravelling.)');
      sfx([[700, 0.05], [600, 0.05], [500, 0.05], [400, 0.05], [300, 0.1]], 'sawtooth', 0.12);
    });
  }

  // ══ THE SMARTER GAME: a pattern detective. Every answer is somewhere in this room. ══
  {
    const Q = [
      { q: 'The stitch chart on the right wall: which stitch is Row 4 worked in?', look: 'the chart on the right wall', choices: ['chain', 'single crochet', 'half double', 'double crochet'], answer: 2, why: 'Row 4 is hdc × 13: half double crochet.' },
      { q: 'How many hanks of yarn hang on the pegboard behind the spinning wheel?', look: 'the pegboard on the left wall', choices: ['7', '9', '10', '12'], answer: 1, why: 'Nine twisted hanks: five on the top row, four below.' },
      { q: 'Which of these is NOT on the shelf of crochet treats?', look: 'the shelves on the right wall', choices: ['a mushroom', 'a strawberry', 'a cactus', 'a teapot'], answer: 3, why: 'Mushroom, strawberry, cactus: no teapot (yet).' },
      { q: 'On the “made with YarnFlow” board, what did somebody make by accident?', look: 'the corkboard by the door, right wall', choices: ['a scarf', 'a cat', 'a beanie', 'a sock'], answer: 1, why: 'A cat. To be fair, the shop has several.' },
      { q: 'The framed granny square chart over the armchair: how many rounds does it show?', look: 'the chart above the armchair', choices: ['3', '4', '5', '6'], answer: 1, why: 'Rounds 1 to 4. The rug is a six-rounder.' },
    ];
    let runId = 0;
    onExit(() => { runId++; });
    const spotAt = (() => { for (const [x, z] of [[-2.15, -1.55], [-2.3, -1.4], [-1.9, -1.7], [-2.4, -1.75]]) if (free(x, z, 0.55)) return [x, z]; return [-2.15, -1.55]; })();
    games.add(spotAt[0], spotAt[1], 'pattern detective', (m) => {
      const G = m.game, id = ++runId, rounds = shuffle(Q).slice(0, 4);
      let r = 0, score = 0, stepping = false;
      const panel = () => { G.open('Pattern detective', { onClose: () => { if (!stepping) runId++; } }); G.score(`${r + 1} of ${rounds.length} · ★ ${score}`); };
      const ask = () => {
        panel(); const R = rounds[r]; G.note(''); G.text(R.q);
        G.choices(R.choices, (i) => {
          const ok = i === R.answer; if (ok) score++;
          G.choices(R.choices, () => {}); G.lock(i, R.answer);          // (rebuilt: drops the look button)
          if (ok) G.good(`Yes! ${R.why}`); else G.bad(`Not quite. ${R.why}`);
          G.score(`${r + 1} of ${rounds.length} · ★ ${score}`);
          G.next(r + 1 < rounds.length ? 'next clue →' : 'case closed?', () => { r++; r < rounds.length ? ask() : finish(); });
        });
        G.next('let me look (8 s)', () => {
          stepping = true; G.close(); stepping = false;
          say(`Have a look at ${R.look}…`);
          setTimeout(() => { if (id === runId && kit.player()) ask(); }, 8000);
        });
      };
      const finish = () => {
        G.score(`★ ${score} of ${rounds.length}`); G.note('');
        G.text(`${score} of ${rounds.length}. ${score === rounds.length ? 'Case closed: you read a room like a pattern.' : 'Patterns are all about noticing. YarnFlow shows you every stitch so you don’t have to squint.'}`);
        if (score >= 3) G.cheer();
        G.choices([], () => {});
        G.next('another case', () => { r = 0; score = 0; rounds.splice(0, rounds.length, ...shuffle(Q).slice(0, 4)); ask(); });
        G.next('done', () => G.close());
      };
      ask();
    });
  }

  S.flush(g); L.flush(g, true);
}
