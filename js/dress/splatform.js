// ─── dressing for the splatform room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// An artist's studio: a spin-art bench and a giant paint can down the right, a pigment shelf,
// a taboret and a washing line of painted components down the left, lamps swinging overhead.
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
  const { THREE, g, put, paint, tap, live, free, claim, rb, canvasTex, HAND, SCRIPT, INKC, D, PAL, kit: sub, now, shadow } = kit;
  const S = bag(THREE, rb), L = bag(THREE, rb);
  const COLS = [0xe8604c, 0xe4b84f, 0x7fb3a8, 0x8f7ae8, 0x5f8cc8, 0xdc6a9a];
  const CSS = ['#e8604c', '#e4b84f', '#7fb3a8', '#8f7ae8', '#5f8cc8', '#dc6a9a'];
  const wood = paint(0x8a6448), bark = paint(PAL.bark), tin = paint(0xc9ccd6), dark = paint(0x2a2230, { hatch: 0 }), cream = paint(0xfdf8ec);
  const opaque = (w, h, draw) => paint(0xffffff, { map: canvasTex(w, h, draw), hatch: 0, unique: true });
  const plane = (w, h, mat, x, y, z, rot) => { const m = put(new THREE.PlaneGeometry(w, h), mat, x, y, z, rot); m.userData.noInk = true; return m; };
  const since = (t0) => now() - t0;
  const LW = -4 + 0.06, RW = 4 - 0.06, BW = -D + 0.5;
  const blob = (c, x, y, r, col, seed = 1) => {
    c.fillStyle = col; c.beginPath();
    for (let a = 0; a < 6.4; a += 0.35) { const rr = r * (0.7 + 0.35 * Math.abs(Math.sin(a * 2.7 + seed))); c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    c.closePath(); c.fill();
    for (let d = 0; d < 5; d++) { const a = d * 1.3 + seed; c.beginPath(); c.arc(x + Math.cos(a) * r * 1.35, y + Math.sin(a) * r * 1.35, 1.5 + (d % 3) * 1.5, 0, 7); c.fill(); }
  };
  // a splattered look for wooden things
  const splWood = (base) => paint(0xffffff, { map: canvasTex(128, 128, (c, w, h) => { c.fillStyle = base; c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) blob(c, (i * 47) % w, (i * 31) % h, 3 + (i % 4) * 2, CSS[i % 6], i); }), unique: true });
  const benchWood = splWood('#a07a58');
  const { fx, say, onExit, games, quiz, shuffle } = kit;
  const WHITE = canvasTex(4, 4, (c) => { c.fillStyle = '#fff'; c.fillRect(0, 0, 4, 4); });
  // a material that keeps its own colour whatever medium the room is redrawn in (it carries a map)
  const tintable = (hex) => paint(hex, { map: WHITE, hatch: 0, unique: true });
  const showAll = (o, v) => o.traverse(q => { q.visible = v; });      // hidden things mustn't catch taps

  // ── THE MEDIUM the whole studio is drawn in: Splatform's one attribute, applied to a room ──
  const MEDIA = [
    ['watercolor', 'watercolour', 'saturate(0.9) brightness(1.06) blur(0.4px)'],
    ['sketch', 'pencil', 'saturate(0.8)'],
    ['comic', 'comic ink', 'contrast(1.15) saturate(1.35)'],
    ['flat', 'flat vector', ''],
    ['pixel', 'pixel art', 'contrast(1.1) saturate(1.2)'],
    ['gouache', 'gouache', ''],
  ];
  const label = (n) => MEDIA.find(m => m[0] === n)?.[1] ?? n;
  let medium = 'gouache';
  const onMedium = [];
  const setMedium = (name) => {
    if (name === medium) return;
    medium = name; fx.style(name); fx.filter(MEDIA.find(m => m[0] === name)?.[2] || '');
    onMedium.forEach(f => f(name));
  };
  onExit(() => { if (medium !== 'gouache') { medium = 'gouache'; fx.style('gouache'); onMedium.forEach(f => f('gouache')); } });

  // ══ RIGHT: the spin-art bench (tap: squirt paint) ══
  {
    const x = 3.5, z = -1.75;
    claim(x, z + 0.3, 0.35); claim(x, z - 0.3, 0.35);
    S.box(0.62, 0.06, 1.1, benchWood, x, 0.8, z, 0.02);
    for (const [dx, dz] of [[-0.26, -0.5], [0.26, -0.5], [-0.26, 0.5], [0.26, 0.5]]) S.box(0.06, 0.77, 0.06, bark, x + dx, 0.385, z + dz, 0.015);
    S.box(0.56, 0.04, 1.0, bark, x, 0.2, z, 0.01);                          // the low shelf
    for (let i = 0; i < 4; i++) S.put(new THREE.CylinderGeometry(0.08, 0.08, 0.14, 12), tin, x - 0.1 + (i % 2) * 0.2, 0.29, z - 0.35 + i * 0.22);
    for (let i = 0; i < 4; i++) S.put(new THREE.CylinderGeometry(0.07, 0.07, 0.015, 12), paint(COLS[i + 1]), x - 0.1 + (i % 2) * 0.2, 0.365, z - 0.35 + i * 0.22);
    // the machine: a tub with a spinning card in it, a squeeze bottle on an arm above
    const mx = x - 0.02, mz = z - 0.25, top = 0.83;
    S.box(0.34, 0.08, 0.34, paint(0x5f8cc8), mx, top + 0.04, mz, 0.03);
    S.put(new THREE.CylinderGeometry(0.2, 0.18, 0.14, 24, 1, true), paint(0xf6eedb, { side: THREE.DoubleSide }), mx, top + 0.15, mz);
    S.put(new THREE.TorusGeometry(0.2, 0.012, 6, 28).rotateX(Math.PI / 2), paint(0x5f8cc8), mx, top + 0.22, mz);
    const arm = new THREE.CatmullRomCurve3([new THREE.Vector3(mx + 0.15, top + 0.08, mz + 0.15), new THREE.Vector3(mx + 0.2, top + 0.45, mz + 0.18), new THREE.Vector3(mx + 0.05, top + 0.55, mz + 0.05)]);
    S.put(new THREE.TubeGeometry(arm, 12, 0.012, 6), tin);
    const cv = document.createElement('canvas'); cv.width = cv.height = 256;
    const cc = cv.getContext('2d'); cc.fillStyle = '#fdf8ec'; cc.fillRect(0, 0, 256, 256);
    const spinSplat = (col) => {             // paint hits a spinning card: it flies out in curved streaks
      cc.save(); cc.translate(128, 128);
      const r0 = 10 + Math.random() * 40, a0 = Math.random() * 6.28;
      for (let k = 0; k < 9; k++) {
        cc.strokeStyle = col; cc.lineWidth = 3 + Math.random() * 6; cc.beginPath();
        for (let s = 0; s < 1; s += 0.05) { const r = r0 + s * (110 - r0), a = a0 + k * 0.7 + s * 1.6; cc.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
        cc.stroke();
      }
      cc.fillStyle = col; cc.beginPath(); cc.arc(Math.cos(a0) * r0, Math.sin(a0) * r0, 10, 0, 7); cc.fill();
      cc.restore(); tex.needsUpdate = true;
    };
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 4; i++) spinSplat(CSS[i * 2 % 6]);
    const disc = new THREE.Group(); disc.position.set(mx, top + 0.12, mz); g.add(disc);
    const card = sub(disc).put(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 28), [paint(0xf6eedb), paint(0xffffff, { map: tex, hatch: 0, unique: true }), paint(0xf6eedb)]);
    const bottle = new THREE.Group(); bottle.position.set(mx + 0.05, top + 0.52, mz + 0.05); g.add(bottle);   // hangs from the arm's tip
    const BK = sub(bottle), bm = tintable(0xe8604c);
    BK.put(new THREE.CapsuleGeometry(0.045, 0.1, 4, 10).translate(0, -0.08, 0), bm);
    BK.put(new THREE.ConeGeometry(0.02, 0.06, 8).rotateX(Math.PI).translate(0, -0.2, 0), paint(0xf6eedb));
    const drop = put(new THREE.SphereGeometry(0.022, 8, 6), bm, 0, 0, 0); drop.userData.noInk = true; drop.visible = false;
    let t0 = -9, ang = 0, squirted = true, col = 0;
    live((t, dt) => {
      const s = since(t0);
      ang += dt * (2.5 + (s < 3 ? 14 * (1 - s / 3) : 0)); disc.rotation.y = ang;
      bottle.scale.set(s < 0.35 ? 1 - Math.sin(s / 0.35 * Math.PI) * 0.3 : 1, 1, s < 0.35 ? 1 - Math.sin(s / 0.35 * Math.PI) * 0.3 : 1);
      if (s > 0.15 && s < 0.55) { drop.visible = true; drop.position.set(mx + 0.05, top + 0.31 - (s - 0.15) / 0.4 * 0.17, mz + 0.05); }
      else drop.visible = false;
      if (s >= 0.55 && !squirted) { squirted = true; spinSplat(CSS[col]); }
    });
    tap(bottle, 'squirt the spin-art', (sfx) => {
      t0 = now(); squirted = false; col = (col + 1) % 6; bm.color.set(COLS[col]);
      sfx([[200, 0.08], [400, 0.06], [800, 0.05], [1200, 0.05], [1600, 0.2]], 'sawtooth', 0.15);
    });

    // a fat paint tube on the bench (tap: squeeze it)
    const tube = new THREE.Group(); tube.position.set(x - 0.05, top + 0.035, z + 0.2); tube.rotation.y = 0.5; g.add(tube);   // origin at the crimped end
    const TK = sub(tube);
    TK.put(new THREE.CylinderGeometry(0.045, 0.045, 0.24, 14).rotateZ(Math.PI / 2).translate(0.14, 0, 0), paint(0xf6eedb));
    TK.put(new THREE.CylinderGeometry(0.046, 0.046, 0.1, 14).rotateZ(Math.PI / 2).translate(0.15, 0, 0), paint(0x8f7ae8));
    TK.box(0.04, 0.012, 0.1, tin, 0.01, 0, 0, 0.004);
    TK.put(new THREE.CylinderGeometry(0.02, 0.03, 0.04, 10).rotateZ(Math.PI / 2).translate(0.28, 0, 0), tin);
    const worm = new THREE.Group(); worm.position.set(0.3, -0.01, 0); tube.add(worm);
    const wm = sub(worm).put(new THREE.CapsuleGeometry(0.018, 0.08, 4, 8).rotateZ(Math.PI / 2).translate(0.05, 0, 0), paint(0x8f7ae8));
    let tt0 = -9;
    live(() => {
      const s = since(tt0), sq = s < 0.6 ? Math.sin(s / 0.6 * Math.PI) : 0;
      tube.scale.set(1, 1 - sq * 0.45, 1 + sq * 0.25);
      worm.scale.setScalar(s < 3 ? Math.min(1, s / 0.5) : Math.max(0.001, 1 - (s - 3) / 0.4)); worm.visible = s < 3.4;
      worm.rotation.z = -Math.min(1, s) * 0.3;
    });
    tap(tube, 'squeeze the paint tube', (sfx) => { tt0 = now(); sfx([[160, 0.1], [120, 0.15]], 'sine', 0.6); });

    // a water jar, swirling with whatever was rinsed in it last (tap: rinse)
    const jx = x - 0.12, jz = z + 0.42;
    S.put(new THREE.CylinderGeometry(0.075, 0.07, 0.2, 14, 1, true), paint(0xcfe6ef, { opacity: 0.45, hatch: 0, side: THREE.DoubleSide }), jx, top + 0.1, jz);
    const wcv = canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#9fc8d8'; c.fillRect(0, 0, w, h); for (let i = 0; i < 6; i++) { c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 5; c.beginPath(); for (let x2 = 0; x2 <= w; x2 += 8) c.lineTo(x2, h * (i / 6) + Math.sin(x2 / w * Math.PI * 2 + i) * 6); c.stroke(); } });
    wcv.wrapS = THREE.RepeatWrapping;
    const wM = paint(0xffffff, { map: wcv, hatch: 0, unique: true });
    const water = put(new THREE.CylinderGeometry(0.065, 0.062, 0.15, 14), wM, jx, top + 0.08, jz); water.userData.noInk = true;
    const brush = new THREE.Group(); brush.position.set(jx, top + 0.17, jz); g.add(brush);   // pivots where it leans on the rim
    const BR = sub(brush);
    BR.put(new THREE.CylinderGeometry(0.008, 0.01, 0.3, 6).translate(0, 0.05, 0), bark);
    BR.put(new THREE.ConeGeometry(0.013, 0.05, 6).rotateX(Math.PI).translate(0, -0.12, 0), paint(0xe8604c));
    brush.rotation.z = 0.25;
    let wt0 = -9, wcol = 0;
    live((t) => {
      wcv.offset.x = (t * 0.15) % 1;
      const s = since(wt0); brush.rotation.z = 0.25 + (s < 1.5 ? Math.sin(s * 12) * 0.25 * (1 - s / 1.5) : 0);
      brush.position.y = top + 0.17 - (s < 1.5 ? Math.abs(Math.sin(s * 6)) * 0.05 : 0);
    });
    tap(brush, 'rinse the brush', (sfx) => { wt0 = now(); wcol = (wcol + 1) % 6; wM.color.set(new THREE.Color(COLS[wcol]).lerp(new THREE.Color(0xffffff), 0.45)); sfx([[300, 0.06], [360, 0.06], [300, 0.06], [420, 0.1]], 'sine', 0.4); });
    g.add(shadow(0.6).translateX(x).translateZ(z));
  }

  // ══ RIGHT WALL: a colour wheel (tap: spin it), a media swatch chart, spray cans ══
  {
    const wheel = new THREE.Group(); wheel.position.set(RW - 0.02, 1.52, -0.95); wheel.rotation.y = -Math.PI / 2; g.add(wheel);
    S.put(new THREE.CylinderGeometry(0.03, 0.03, 0.05, 8).rotateZ(Math.PI / 2), tin, RW - 0.0, 1.52, -0.95);
    const cw = canvasTex(256, 256, (c, w, h) => {
      for (let k = 0; k < 12; k++) {
        const a0 = k / 12 * Math.PI * 2, a1 = (k + 1) / 12 * Math.PI * 2;
        c.fillStyle = `hsl(${k * 30}, 70%, 58%)`; c.beginPath(); c.moveTo(w / 2, h / 2); c.arc(w / 2, h / 2, w / 2 - 4, a0, a1); c.closePath(); c.fill();
        c.fillStyle = `hsl(${k * 30}, 55%, 78%)`; c.beginPath(); c.moveTo(w / 2, h / 2); c.arc(w / 2, h / 2, w * 0.28, a0, a1); c.closePath(); c.fill();
      }
      c.fillStyle = '#fdf8ec'; c.beginPath(); c.arc(w / 2, h / 2, 26, 0, 7); c.fill();
      c.strokeStyle = INKC; c.lineWidth = 4; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.stroke(); c.beginPath(); c.arc(w / 2, h / 2, 26, 0, 7); c.stroke();
    });
    const wm = paint(0xffffff, { map: cw, hatch: 0, unique: true, side: THREE.DoubleSide }); wm.transparent = true; wm.alphaTest = 0.5;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.34, 40), wm); disc.position.z = 0.012; disc.userData.noInk = true; wheel.add(disc);
    sub(wheel).put(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 40).rotateX(Math.PI / 2), paint(0xf6eedb), 0, 0, 0);
    let t0 = -9;
    live((t, dt) => { const s = since(t0); disc.rotation.z -= dt * (0.15 + (s < 4 ? 9 * Math.exp(-s * 1.1) : 0)); });
    const taps = []; let vt0 = -9;
    live((t) => {
      const s = since(vt0);
      if (s < 6) fx.filter(`hue-rotate(${Math.round(s * 240)}deg) saturate(1.6)`);
      else if (vt0 > 0) { vt0 = -9; fx.filter(MEDIA.find(q => q[0] === medium)?.[2] || ''); }
    });
    tap(wheel, 'spin the colour wheel', (sfx) => {
      taps.push(now()); while (taps.length && now() - taps[0] > 4) taps.shift();
      if (taps.length >= 5) { taps.length = 0; vt0 = now(); say('Secret medium unlocked: VIBES. (It is not in the docs.)'); sfx([[262, 0.1], [330, 0.1], [392, 0.1], [523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.4]], 'sawtooth', 0.12); }
      t0 = now(); sfx([[523, 0.08], [587, 0.08], [659, 0.08], [698, 0.08], [784, 0.08], [880, 0.08], [988, 0.08], [1047, 0.2]], 'triangle', 0.35); });

    // a swatch chart: the same stroke in five media
    const sw = opaque(300, 200, (c, w, h) => {
      c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h);
      c.fillStyle = INKC; c.font = `700 30px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('five media, one button', w / 2, 32); c.font = `400 13px ${HAND}`; c.fillStyle = '#8a7e8e'; c.fillText('(and zero clean shirts)', w / 2, h - 3);
      const names = ['watercolor', 'acrylic', 'charcoal', 'torn paper', 'marker'];
      names.forEach((n, i) => {
        const y = 50 + i * 29;
        if (i === 0) { for (let k = 0; k < 4; k++) { c.fillStyle = 'rgba(95,140,200,0.3)'; c.beginPath(); c.ellipse(90 + k * 4, y + 12, 60 - k * 6, 11, 0, 0, 7); c.fill(); } }
        if (i === 1) { c.fillStyle = '#e8604c'; c.beginPath(); c.roundRect(30, y + 2, 120, 22, 8); c.fill(); c.strokeStyle = 'rgba(255,220,200,0.6)'; c.lineWidth = 2; for (let x2 = 36; x2 < 146; x2 += 7) { c.beginPath(); c.moveTo(x2, y + 4); c.lineTo(x2 + 3, y + 22); c.stroke(); } }
        if (i === 2) { for (let k = 0; k < 500; k++) { c.fillStyle = `rgba(40,36,44,${Math.random() * 0.5})`; c.fillRect(30 + Math.random() * 120, y + 2 + Math.random() * 22, 2, 2); } }
        if (i === 3) { c.fillStyle = '#f3dfa8'; c.beginPath(); c.moveTo(30, y + 2); for (let x2 = 30; x2 <= 150; x2 += 6) c.lineTo(x2, y + 2 + Math.random() * 4); for (let x2 = 150; x2 >= 30; x2 -= 6) c.lineTo(x2, y + 22 + Math.random() * 4); c.fill(); }
        if (i === 4) { c.strokeStyle = 'rgba(228,184,79,0.85)'; c.lineWidth = 12; c.lineCap = 'round'; c.beginPath(); c.moveTo(38, y + 9); c.lineTo(142, y + 8); c.moveTo(38, y + 18); c.lineTo(142, y + 18); c.stroke(); }
        c.fillStyle = INKC; c.font = `400 20px ${HAND}`; c.textAlign = 'left'; c.fillText(n, 170, y + 20);
      });
    });
    S.box(0.04, 0.6, 0.86, wood, RW + 0.0, 1.25, -4.35, 0.015);
    plane(0.8, 0.54, sw, RW - 0.025, 1.25, -4.35, [0, -Math.PI / 2, 0]);
    // a shelf of spray cans above it (tap one: psst!)
    S.box(0.24, 0.04, 0.86, wood, RW - 0.11, 1.68, -4.35, 0.01);
    plane(0.6, 0.05, opaque(256, 24, (c, w, h) => { c.fillStyle = '#f6eedb'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `400 18px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('matte · gloss · satin · oops', w / 2, h / 2 + 1); }), RW - 0.235, 1.68, -4.35, [0, -Math.PI / 2, 0]);
    for (const dz of [-0.35, 0.35]) S.box(0.18, 0.1, 0.03, bark, RW - 0.08, 1.62, -4.35 + dz, 0.01, [0, 0, 0.6]);
    const sprays = [];
    for (let i = 0; i < 5; i++) {
      const sp = new THREE.Group(); sp.position.set(RW - 0.11, 1.7, -4.68 + i * 0.165); g.add(sp);
      const SK = sub(sp);
      SK.put(new THREE.CylinderGeometry(0.045, 0.045, 0.2, 12).translate(0, 0.1, 0), paint(COLS[i]));
      SK.put(new THREE.SphereGeometry(0.045, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 0.2, 0), paint(COLS[i]));
      SK.put(new THREE.CylinderGeometry(0.015, 0.015, 0.03, 8).translate(0, 0.255, 0), cream);
      const puff = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), new THREE.MeshBasicMaterial({ color: COLS[i], transparent: true, opacity: 0, depthWrite: false })); puff.userData.noInk = true; sp.add(puff);
      sprays.push({ sp, puff, t0: -9 });
    }
    const sprayRoot = new THREE.Group(); g.add(sprayRoot); sprays.forEach(o => sprayRoot.add(o.sp));
    let next = 0;
    live(() => sprays.forEach(o => {
      const s = since(o.t0);
      o.puff.visible = s < 1.2; o.puff.material.opacity = s < 1.2 ? 0.7 * (1 - s / 1.2) : 0;
      const u = Math.min(s, 1.2); o.puff.position.set(-0.08 - u * 0.35, 0.26 + u * 0.05, 0); o.puff.scale.setScalar(0.5 + u * 2.5);
      o.sp.position.y = 1.7 + (s < 0.25 ? Math.sin(s / 0.25 * Math.PI) * 0.03 : 0);
    }));
    tap(sprayRoot, 'psst! a spray can', (sfx) => { sprays[next].t0 = now(); next = (next + 1) % sprays.length; sfx(Array.from({ length: 6 }, (_, i) => [2000 + (i % 2) * 600, 0.04]), 'sawtooth', 0.08); });
  }

  // ══ RIGHT FRONT: the giant Splatform paint can (tap: pop the lid) ══
  {
    const x = 3.42, z = -0.5;
    claim(x, z, 0.3);
    const lab = opaque(512, 128, (c, w, h) => {
      c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 9; i++) blob(c, 20 + i * 60, 18 + (i % 2) * 90, 12, CSS[i % 6], i);
      c.fillStyle = INKC; c.font = `700 62px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Splatform', w / 2, h / 2 - 4);
      c.font = `400 20px ${HAND}`; c.fillText('one attribute · any medium', w / 2, h - 16);
    });
    S.put(new THREE.CylinderGeometry(0.28, 0.28, 0.52, 28, 1, true), tin, x, 0.26, z);
    S.put(new THREE.CylinderGeometry(0.281, 0.281, 0.3, 28, 1, true), lab, x, 0.26, z, [0, -2.3, 0]);
    for (const y of [0.02, 0.5]) S.put(new THREE.TorusGeometry(0.28, 0.015, 6, 28).rotateX(Math.PI / 2), tin, x, y, z);
    S.put(new THREE.CylinderGeometry(0.27, 0.27, 0.01, 24), paint(0xdc6a9a), x, 0.49, z);       // the paint inside
    const handle = new THREE.Group(); handle.position.set(x, 0.42, z); g.add(handle);
    sub(handle).put(new THREE.TorusGeometry(0.29, 0.008, 4, 24, Math.PI), dark, 0, 0, 0, [0, 0.6, 0]);
    const lid = new THREE.Group(); lid.position.set(x - 0.28, 0.52, z); g.add(lid);
    const LK = sub(lid);
    LK.put(new THREE.CylinderGeometry(0.29, 0.29, 0.03, 28).translate(0.28, 0.015, 0), tin);
    LK.put(new THREE.CylinderGeometry(0.2, 0.2, 0.005, 20).translate(0.28, 0.032, 0), paint(0xdc6a9a));
    const pop = new THREE.Group(); pop.position.set(x, 0.5, z); g.add(pop);
    const pb = sub(pop).put(new THREE.SphereGeometry(0.1, 12, 10), tintable(0xdc6a9a)); showAll(pop, false);
    let t0 = -9, pending = false;
    const LINES = {
      watercolor: 'Splat! The whole studio is watercolour now. One attribute, every component.',
      sketch: 'Splat! Pencil. Everything is a sketch, which is how most of my projects start.',
      comic: 'KA-SPLAT! Comic ink: halftone dots and very confident outlines.',
      flat: 'Splat! Flat vector. Very clean. Suspiciously clean, for a painter.',
      pixel: 'Splat! Pixel art. Mind the jaggies.',
      gouache: 'Splat! Back to gouache, the house medium.',
    };
    live(() => {
      const s = since(t0);
      if (pending && s > 0.55) {                 // the blob lands: the room is repainted
        pending = false;
        const i = MEDIA.findIndex(m => m[0] === medium), next = MEDIA[(i + 1) % MEDIA.length][0];
        setMedium(next); say(LINES[next]);
      }
      lid.rotation.z = s < 0.2 ? s / 0.2 * 2.2 : s < 1.8 ? 2.2 + Math.sin((s - 0.2) * 12) * 0.08 * (1.8 - s) : s < 2.1 ? 2.2 * (1 - (s - 1.8) / 0.3) : 0;
      if (pop.visible !== s < 1.5) showAll(pop, s < 1.5);
      const u = Math.min(1, s / 1.2);
      pop.position.y = 0.5 + Math.sin(u * Math.PI) * 0.6;
      const st = 1 + Math.sin(s * 14) * 0.15 * (1 - u); pop.scale.set(1 / st, st, 1 / st);
    });
    tap(lid, 'splat the room in a new medium', (sfx) => { if (since(t0) < 2.1) return; t0 = now(); pending = true; sfx([[180, 0.05], [900, 0.06], [600, 0.1], [300, 0.25]], 'sine', 0.6); });
    g.add(shadow(0.38).translateX(x).translateZ(z));
  }

  // ══ RIGHT BACK: a rack of canvases drying ══
  {
    const x = 3.7, z = -4.55;
    claim(x, z, 0.2);
    S.box(0.36, 0.04, 0.6, bark, x, 0.02, z, 0.01);
    for (const dz of [-0.28, 0.28]) S.box(0.36, 0.5, 0.03, bark, x, 0.27, z + dz, 0.01);
    for (let i = 0; i < 4; i++) {
      const dz = -0.18 + i * 0.12;
      S.box(0.02, 0.42 - (i % 2) * 0.08, 0.32, cream, x - 0.12 + i * 0.07, 0.26 - (i % 2) * 0.04, z + dz * 0.3, 0.005, [0, Math.PI / 2, 0.06 * (i - 1.5)]);
    }
  }

  // ══ LEFT WALL: a pigment shelf ══
  {
    const z = -1.1;
    for (const y of [0.97, 1.27, 1.57]) S.box(0.26, 0.04, 1.0, wood, LW + 0.12, y, z, 0.01);
    for (const dz of [-0.5, 0.5]) S.box(0.26, 0.66, 0.03, bark, LW + 0.12, 1.29, z + dz, 0.01);
    [0.97, 1.27, 1.57].forEach((y, r) => {
      for (let i = 0; i < 6; i++) {
        const col = COLS[(i + r * 2) % 6], dz = -0.38 + i * 0.152, h = 0.12 + ((i + r) % 3) * 0.025;
        S.put(new THREE.CylinderGeometry(0.055, 0.055, h, 12), paint(0xcfe6ef, { hatch: 0 }), LW + 0.12, y + 0.02 + h / 2, z + dz);
        S.put(new THREE.CylinderGeometry(0.048, 0.048, h * 0.75, 12), paint(col), LW + 0.12, y + 0.02 + h * 0.38, z + dz);
        S.put(new THREE.CylinderGeometry(0.058, 0.058, 0.03, 12), paint(r % 2 ? 0x2a2230 : col), LW + 0.12, y + 0.035 + h, z + dz);
      }
    });
    // one jar has tipped: a drip runs off the shelf edge, drop by drop, into a puddle
    const dx = LW + 0.24, dzz = z + 0.38;
    const puddleT = canvasTex(64, 64, (c) => blob(c, 32, 32, 18, CSS[5], 3));
    const pud = plane(0.3, 0.3, paint(0xffffff, { map: puddleT, hatch: 0, unique: true }), dx, 0.014, dzz, [-Math.PI / 2, 0, 0]); pud.material.transparent = true; pud.renderOrder = 2;
    const dr = put(new THREE.SphereGeometry(0.02, 8, 6), paint(COLS[5]), dx, 1.0, dzz); dr.userData.noInk = true;
    const lip = put(new THREE.CapsuleGeometry(0.012, 0.06, 3, 6), paint(COLS[5]), dx, 0.94, dzz); lip.userData.noInk = true;
    live((t) => { const s = (t * 0.55) % 1; const y = 0.93 - s * s * 0.92; dr.position.y = y; dr.scale.set(1, 1 + s * 0.6, 1); pud.scale.setScalar(1 + Math.max(0, 0.05 - Math.abs(s - 0.99)) * 3); });
  }

  // ══ LEFT FRONT: a bucket of brushes and canvases leaning on the wall ══
  {
    const x = -3.5, z = -0.45;
    claim(x, z, 0.2);
    S.put(new THREE.CylinderGeometry(0.17, 0.14, 0.32, 16, 1, true), paint(0xe4b84f, { side: THREE.DoubleSide }), x, 0.16, z);
    S.put(new THREE.CylinderGeometry(0.14, 0.14, 0.02, 16), paint(0x9a7a30), x, 0.01, z);
    S.put(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14), paint(0x7fb3a8), x, 0.27, z);
    for (let i = 0; i < 7; i++) {
      const a = i * 0.9, lean = 0.15 + (i % 3) * 0.08, len = 0.45 + (i % 3) * 0.12;
      const bx = x + Math.cos(a) * 0.07, bz = z + Math.sin(a) * 0.07;
      S.put(new THREE.CylinderGeometry(0.01, 0.013, len, 6).translate(0, len / 2, 0), bark, bx, 0.12, bz, [Math.sin(a) * lean, 0, -Math.cos(a) * lean]);
      const tip = new THREE.Vector3(0, len + 0.03, 0).applyEuler(new THREE.Euler(Math.sin(a) * lean, 0, -Math.cos(a) * lean));
      S.put(new THREE.ConeGeometry(0.02, 0.07, 6).translate(0, -0.03, 0).rotateX(Math.PI), paint(COLS[i % 6]), bx + tip.x, 0.12 + tip.y, bz + tip.z, [Math.sin(a) * lean, 0, -Math.cos(a) * lean]);
    }
    g.add(shadow(0.26).translateX(x).translateZ(z));
    // leaning canvases
    const cz = -1.35;
    [[0.75, 0.6, 0xfdf8ec, 0], [0.6, 0.5, 0xe8d8c0, 0.12], [0.45, 0.35, 0xfdf8ec, 0.22]].forEach(([w, h, col, off], i) => {
      const art = opaque(128, 100, (c, cw, ch) => { c.fillStyle = '#' + new THREE.Color(col).getHexString(); c.fillRect(0, 0, cw, ch); for (let k = 0; k < 4; k++) blob(c, 20 + k * 30, 30 + (k % 2) * 35, 14, CSS[(k + i * 2) % 6], k + i); });
      const cg = new THREE.Group(); cg.position.set(LW + 0.05 + off * 0.5, 0, cz + (i - 1) * 0.12); cg.rotation.set(0, Math.PI / 2, 0); g.add(cg);
      const CK = sub(cg);
      const lean = 0.18;
      CK.box(w, h, 0.03, bark, 0, h / 2 * Math.cos(lean), 0.04 + h / 2 * Math.sin(lean), 0.008, [-lean, 0, 0]);
      const f = CK.put(new THREE.PlaneGeometry(w - 0.04, h - 0.04), paint(0xffffff, { map: art.map, hatch: 0, unique: true }), 0, h / 2 * Math.cos(lean) + 0.022 * Math.sin(lean), 0.04 + h / 2 * Math.sin(lean) + 0.022 * Math.cos(lean), [-lean, 0, 0]);
      f.userData.noInk = true;
    });
    claim(-3.8, cz, 0.15);
  }

  // ══ LEFT BACK: the taboret on its casters (tap: open a drawer) ══
  {
    const x = -3.55, z = -4.0, ry = Math.PI / 2;
    claim(x, z, 0.3);
    const T = S.at(x, 0, z, ry), red = paint(0xe8604c);
    T.box(0.56, 0.7, 0.44, red, 0, 0.42, 0, 0.03);
    T.box(0.6, 0.04, 0.48, benchWood, 0, 0.79, 0, 0.015);
    for (const [cx, cz] of [[-0.22, -0.16], [0.22, -0.16], [-0.22, 0.16], [0.22, 0.16]]) { T.put(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 8).rotateZ(Math.PI / 2), dark, cx, 0.035, cz); T.box(0.04, 0.05, 0.04, tin, cx, 0.07, cz, 0.008); }
    for (let k = 0; k < 2; k++) { T.box(0.5, 0.18, 0.02, paint(0xf09080), 0, 0.27 + k * 0.2, 0.225, 0.01); T.box(0.12, 0.025, 0.03, tin, 0, 0.27 + k * 0.2, 0.245, 0.008); }
    // things on top: a jar of pencils, a stack of sketchbooks, a stone palette
    T.put(new THREE.CylinderGeometry(0.06, 0.06, 0.14, 12), tin, -0.18, 0.88, -0.1);
    for (let i = 0; i < 6; i++) T.put(new THREE.CylinderGeometry(0.008, 0.008, 0.22, 6), paint(COLS[i]), -0.18 + Math.cos(i) * 0.03, 0.98, -0.1 + Math.sin(i) * 0.03, [Math.sin(i) * 0.15, 0, Math.cos(i) * 0.15]);
    [[0x5f8cc8, 0], [0xe4b84f, 0.04], [0x7fb3a8, 0.08]].forEach(([c2, y], i) => T.box(0.26, 0.035, 0.2, paint(c2), 0.12, 0.83 + y, 0.02, 0.008, [0, i * 0.25, 0]));
    // the top drawer slides out
    const tab = new THREE.Group(); tab.position.set(x, 0, z); tab.rotation.y = ry; g.add(tab);
    const drawer = new THREE.Group(); drawer.position.set(0, 0.67, 0.0); tab.add(drawer);
    const DK = sub(drawer);
    DK.box(0.5, 0.18, 0.02, paint(0xf09080), 0, 0, 0.225, 0.01);
    DK.box(0.12, 0.025, 0.03, tin, 0, 0, 0.245, 0.008);
    DK.box(0.48, 0.02, 0.4, paint(0xc07060), 0, -0.08, 0.02, 0.005);
    DK.put(new THREE.PlaneGeometry(0.2, 0.1), opaque(160, 80, (c, w, h) => { c.fillStyle = '#fffaf0'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `700 30px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('2B or not 2B', w / 2, 46); c.font = `400 14px ${HAND}`; c.fillText('that is the pencil', w / 2, 68); }), 0.08, -0.038, 0.06, [-Math.PI / 2, 0, 0.2]).userData.noInk = true;
    for (let i = 0; i < 8; i++) DK.put(new THREE.CylinderGeometry(0.012, 0.012, 0.3, 6).rotateZ(Math.PI / 2), paint(COLS[i % 6]), 0, -0.055, -0.12 + i * 0.035);
    let t0 = -9;
    live(() => { const s = since(t0); drawer.position.z = s < 0.3 ? s / 0.3 * 0.28 : s < 2.5 ? 0.28 : s < 2.8 ? 0.28 * (1 - (s - 2.5) / 0.3) : 0; });
    tap(drawer, 'open a drawer', (sfx) => { t0 = now(); sfx([[260, 0.12], [330, 0.08]], 'triangle', 0.4); setTimeout(() => sfx([[200, 0.06]], 'square', 0.2), 2500); });
    g.add(shadow(0.38).translateX(x).translateZ(z));
  }

  // ══ a washing line down the left wall, pegged with painted components (tap: flip one) ══
  {
    const a = new THREE.Vector3(LW + 0.12, 2.28, -0.35), b = new THREE.Vector3(LW + 0.12, 2.28, -4.85);
    const line = new THREE.QuadraticBezierCurve3(a, new THREE.Vector3(LW + 0.14, 2.12, -2.6), b);
    L.put(new THREE.TubeGeometry(line, 30, 0.005, 4), dark);
    for (const p of [a, b]) S.box(0.14, 0.04, 0.04, tin, LW + 0.06, p.y, p.z, 0.01);
    const COMP = [
      ['button', (c, w, h) => { c.fillStyle = 'rgba(95,140,200,0.4)'; for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(w / 2, h / 2, 44 - k * 4, 18, 0, 0, 7); c.fill(); } c.fillStyle = '#2f5a8a'; c.font = `700 22px ${SCRIPT}`; c.fillText('button', w / 2, h / 2 + 7); }],
      ['toggle', (c, w, h) => { c.fillStyle = '#e8604c'; c.beginPath(); c.roundRect(w / 2 - 34, h / 2 - 16, 68, 32, 16); c.fill(); c.fillStyle = '#fdf8ec'; c.beginPath(); c.arc(w / 2 + 16, h / 2, 12, 0, 7); c.fill(); }],
      ['card', (c, w, h) => { c.strokeStyle = 'rgba(42,34,48,0.8)'; c.lineWidth = 4; for (let k = 0; k < 300; k++) { c.fillStyle = `rgba(40,36,44,${Math.random() * 0.3})`; c.fillRect(18 + Math.random() * (w - 36), 18 + Math.random() * 20, 2, 2); } c.strokeRect(16, 14, w - 32, h - 28); c.beginPath(); c.moveTo(24, 60); c.lineTo(w - 30, 60); c.moveTo(24, 74); c.lineTo(w - 50, 74); c.stroke(); }],
      ['slider', (c, w, h) => { c.strokeStyle = 'rgba(228,184,79,0.9)'; c.lineWidth = 10; c.lineCap = 'round'; c.beginPath(); c.moveTo(18, h / 2); c.lineTo(w - 18, h / 2); c.stroke(); c.fillStyle = '#8f7ae8'; c.beginPath(); c.arc(w * 0.62, h / 2, 13, 0, 7); c.fill(); }],
      ['input', (c, w, h) => { c.fillStyle = '#f3dfa8'; c.beginPath(); c.moveTo(14, h / 2 - 16); for (let x2 = 14; x2 <= w - 14; x2 += 6) c.lineTo(x2, h / 2 - 16 + Math.random() * 4); for (let x2 = w - 14; x2 >= 14; x2 -= 6) c.lineTo(x2, h / 2 + 16 + Math.random() * 4); c.fill(); c.fillStyle = 'rgba(127,179,168,0.8)'; c.fillRect(8, h / 2 - 24, 30, 12); c.fillStyle = INKC; c.fillRect(24, h / 2 - 8, 2, 18); }],
      ['checkbox', (c, w, h) => { c.strokeStyle = '#2a2230'; c.lineWidth = 5; c.strokeRect(w / 2 - 18, h / 2 - 18, 36, 36); c.strokeStyle = '#dc6a9a'; c.lineWidth = 8; c.beginPath(); c.moveTo(w / 2 - 12, h / 2); c.lineTo(w / 2 - 2, h / 2 + 12); c.lineTo(w / 2 + 20, h / 2 - 20); c.stroke(); }],
      ['badge', (c, w, h) => { c.fillStyle = '#7fb3a8'; c.beginPath(); c.roundRect(w / 2 - 38, h / 2 - 14, 76, 28, 14); c.fill(); c.fillStyle = '#fdf8ec'; c.font = `700 18px ${HAND}`; c.fillText('new!', w / 2, h / 2 + 6); }],
    ];
    const sheets = [], line$ = new THREE.Group(); g.add(line$);
    COMP.forEach(([name, draw], i) => {
      const u = (i + 0.8) / (COMP.length + 0.6), p = line.getPoint(u);
      const front = opaque(128, 112, (c, w, h) => { c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; draw(c, w, h); c.fillStyle = '#8a7e8e'; c.font = `400 14px ${HAND}`; c.fillText(name, w / 2, h - 8); });
      front.side = THREE.DoubleSide;
      const sh = new THREE.Group(); sh.position.copy(p); sh.rotation.y = Math.PI / 2; line$.add(sh);   // hangs from its peg on the line
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.35).translate(0, -0.185, 0), front); m.userData.noInk = true; sh.add(m);
      for (const s of [-1, 1]) sub(sh).box(0.02, 0.06, 0.02, paint(COLS[(i + (s > 0 ? 1 : 3)) % 6]), s * 0.12, -0.015, 0.008, 0.005);
      sheets.push({ sh, t0: -9, i });
    });
    // the lost page is pegged at the far end, drawn in invisible ink: it only shows in pencil
    const pg = kit.page();
    if (!pg.collected) {
      const pp = line.getPoint(0.968);
      pg.position.set(pp.x + 0.01, pp.y - 0.165, pp.z); pg.rotation.y = Math.PI / 2; g.add(pg);
      let got = false; const poke = pg.userData.toy.poke;
      pg.userData.toy.poke = (sfx) => { got = true; poke(sfx); say('Found it, hiding in plain pencil.'); };
      showAll(pg, false);
      onMedium.push((n) => { if (!got) showAll(pg, n === 'sketch'); if (!got && n === 'sketch') setTimeout(() => { if (!got && medium === 'sketch') say('Pencil shows everything. Even things pegged on washing lines…'); }, 3500); });
    }
    let nx = 0;
    live((t) => sheets.forEach(o => {
      const s = since(o.t0);
      o.sh.rotation.x = Math.sin(t * 1.1 + o.i * 1.3) * 0.12 + (s < 1.4 ? Math.sin(s / 1.4 * Math.PI * 2) * (1 - s / 1.4) * 1.2 : 0);
      o.sh.rotation.z = Math.sin(t * 0.7 + o.i) * 0.04;
    }));
    tap(line$, 'flap the washing line', (sfx) => { sheets.forEach((o, k) => { o.t0 = now() + k * 0.08; }); nx++; sfx([[440, 0.06], [554, 0.06], [659, 0.06], [880, 0.12]], 'triangle', 0.3); });
  }

  // ══ lamps swinging from brackets at the top of the side walls ══
  {
    const lamps = [];
    for (const [s, zz, col] of [[-1, -2.45, 0xe4b84f], [1, -3.05, 0x7fb3a8], [-1, -4.55, 0xe8604c]]) {
      const wx = s * (4 - 0.06);
      S.box(0.5, 0.04, 0.04, dark, wx - s * 0.25, 2.6, zz, 0.01);
      S.box(0.04, 0.2, 0.04, dark, wx - s * 0.01, 2.52, zz, 0.01);
      const lp = new THREE.Group(); lp.position.set(wx - s * 0.46, 2.6, zz); g.add(lp);      // swings from where its cord meets the bracket
      const LK = sub(lp);
      const cord = LK.put(new THREE.CylinderGeometry(0.005, 0.005, 0.42, 4).translate(0, -0.21, 0), dark); cord.userData.noInk = true;
      LK.put(new THREE.ConeGeometry(0.15, 0.16, 16, 1, true).translate(0, -0.5, 0), paint(col, { side: THREE.DoubleSide }));
      LK.put(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 8).translate(0, -0.42, 0), dark);
      const bulb = LK.put(new THREE.SphereGeometry(0.045, 10, 8).translate(0, -0.57, 0), new THREE.MeshBasicMaterial({ color: 0xfff1b0 })); bulb.userData.noInk = true;
      lamps.push(lp);
    }
    live((t) => lamps.forEach((lp, i) => { lp.rotation.z = Math.sin(t * 0.9 + i * 2.1) * 0.06; lp.rotation.x = Math.sin(t * 0.7 + i) * 0.05; }));
  }

  // ══ back wall, upper left: a framed "medium of the day" sign ══
  {
    const sg = opaque(300, 130, () => {});
    const drawSign = (name) => {
      const c = sg.map.image.getContext('2d'), w = 300, h = 130;
      c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) blob(c, 30 + i * 60, 108, 14, CSS[i], i);
      c.fillStyle = INKC; c.font = `400 20px ${HAND}`; c.textAlign = 'center'; c.fillText('today’s medium', w / 2, 30);
      c.font = `700 50px ${SCRIPT}`; c.fillText(label(name), w / 2, 78);
      sg.map.needsUpdate = true;
    };
    drawSign('gouache'); onMedium.push(drawSign);
    S.box(0.84, 0.4, 0.03, wood, -3.25, 1.92, BW + 0.03, 0.01);
    plane(0.78, 0.34, sg, -3.25, 1.92, BW + 0.05);
    // a sticky note beside it: the hunt's clue
    const note = opaque(128, 128, (c, w, h) => {
      c.fillStyle = '#f6e27a'; c.fillRect(0, 0, w, h);
      c.fillStyle = INKC; c.textAlign = 'center'; c.font = `700 22px ${SCRIPT}`; c.fillText('LOST:', w / 2, 26);
      c.font = `400 15px ${HAND}`; ['one page of a', 'guest list.', 'last seen', 'in pencil.'].forEach((l, i) => c.fillText(l, w / 2, 50 + i * 19));
    });
    plane(0.2, 0.2, note, -2.66, 2.02, BW + 0.05, [0, 0, -0.08]);
  }


  // ══ FLOOR CLUTTER, off the walkways ══
  // find a clear spot near (x, z): the exact one if it's free, else the nearest nudge that is
  const spot = (x, z, r) => {
    if (free(x, z, r)) return [x, z];
    for (let d = 0.05; d <= 0.4; d += 0.05) for (let k = 0; k < 8; k++) {
      const a = k / 8 * Math.PI * 2, nx = x + Math.cos(a) * d, nz = z + Math.sin(a) * d;
      if (free(nx, nz, r)) return [nx, nz];
    }
    return null;
  };
  // drop cloths, walked over in paint
  const cloth = (w, h, x, z, rz, seed) => {
    const m = opaque(256, Math.round(256 * h / w), (c, cw, ch) => {
      c.fillStyle = '#ece3cf'; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = 'rgba(150,130,100,0.25)'; c.lineWidth = 3;
      for (let k = 0; k < 6; k++) { c.beginPath(); c.moveTo(0, (k + 0.5) * ch / 6 + Math.sin(k + seed) * 6); c.quadraticCurveTo(cw / 2, (k + 0.5) * ch / 6 + 14, cw, (k + 0.5) * ch / 6 - 4); c.stroke(); }
      for (let i = 0; i < 12; i++) blob(c, ((i * 67 + seed * 31) % cw), ((i * 43 + seed * 17) % ch), 6 + (i % 4) * 4, CSS[(i + seed) % 6], i + seed);
      c.fillStyle = 'rgba(220,106,154,0.8)';                 // footprints wandering across it
      for (let k = 0; k < 7; k++) { const fx = cw * 0.12 + k * cw * 0.12, fy = ch * 0.5 + Math.sin(k * 0.9 + seed) * ch * 0.18 + (k % 2 ? 12 : -12); c.beginPath(); c.ellipse(fx, fy, 10, 6, 0.1, 0, 7); c.fill(); c.beginPath(); c.ellipse(fx - 13, fy, 5, 5, 0, 0, 7); c.fill(); }
    });
    const p = plane(w, h, m, x, 0.011, z, [-Math.PI / 2, 0, rz]); p.renderOrder = 1;
  };
  cloth(1.7, 1.2, -2.45, -3.85, 0.12, 2);
  cloth(1.3, 1.5, 2.45, -1.75, -0.1, 5);
  cloth(0.9, 0.7, -1.9, -0.55, 0.3, 8);

  // ── a big easel with a giant button half-painted on it (tap: add a stroke) ──
  {
    const at = spot(-2.35, -3.95, 0.36);
    if (at) {
      const [x, z] = at; claim(x, z, 0.36);
      const eg = new THREE.Group(); eg.position.set(x, 0, z); eg.rotation.y = 0.3; g.add(eg);
      const E = sub(eg);
      for (const s of [-1, 1]) E.box(0.06, 2.0, 0.06, bark, s * 0.36, 0.98, 0.05, 0.015, [-0.06, 0, -s * 0.15]);
      E.box(0.06, 1.95, 0.06, bark, 0, 0.93, -0.36, 0.015, [-0.36, 0, 0]);
      E.box(0.92, 0.06, 0.14, bark, 0, 0.62, 0.11, 0.015);                                  // the ledge
      E.box(0.86, 0.05, 0.06, bark, 0, 1.69, 0.1, 0.015);                                    // the top clamp
      E.box(1.24, 0.98, 0.05, cream, 0, 1.17, 0.14, 0.01, [-0.06, 0, 0]);
      const cv = document.createElement('canvas'); cv.width = 320; cv.height = 256;
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      let stage = 2;
      const draw = () => {
        const c = cv.getContext('2d'), w = cv.width, h = cv.height;
        c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(60,55,65,0.55)'; c.lineWidth = 2; c.setLineDash([6, 5]);
        c.beginPath(); c.roundRect(w * 0.1, h * 0.3, w * 0.8, h * 0.4, 50); c.stroke(); c.setLineDash([]);
        const f = Math.min(1, stage / 5);
        c.save(); c.beginPath(); c.roundRect(w * 0.1, h * 0.3, w * 0.8, h * 0.4, 50); c.clip();
        for (let k = 0; k < 40 * f; k++) { c.strokeStyle = k % 3 ? '#e8604c' : '#f08a6a'; c.lineWidth = 16; c.lineCap = 'round'; const x0 = w * 0.08 + (k * 9) % (w * 0.8 * f + 1); c.beginPath(); c.moveTo(x0, h * 0.28); c.quadraticCurveTo(x0 + 10, h / 2, x0 - 4, h * 0.72); c.stroke(); }
        c.restore();
        if (stage >= 5) { c.fillStyle = '#fff'; c.font = `700 64px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('button', w / 2, h / 2 + 4); }
        c.fillStyle = '#8a7e8e'; c.font = `400 20px ${HAND}`; c.textAlign = 'center'; c.fillText(stage >= 5 ? 'acrylic · done!' : `acrylic · coat ${stage} of 5`, w / 2, h * 0.9);
        tex.needsUpdate = true;
      };
      draw();
      const face = E.put(new THREE.PlaneGeometry(1.18, 0.92), paint(0xffffff, { map: tex, hatch: 0, unique: true }), 0, 1.17, 0.167, [-0.06, 0, 0]); face.userData.noInk = true;
      // brushes and a rag on the ledge
      for (let i = 0; i < 3; i++) E.put(new THREE.CylinderGeometry(0.01, 0.012, 0.32, 6).rotateZ(Math.PI / 2), paint(COLS[i * 2]), -0.2 + i * 0.05, 0.665, 0.18 + i * 0.008);
      E.put(new THREE.SphereGeometry(0.07, 8, 6).scale(1.3, 0.5, 1), paint(0xdc6a9a), 0.3, 0.67, 0.17);
      let t0 = -9;
      live(() => { const s = since(t0); eg.rotation.z = s < 0.8 ? Math.sin(s * 18) * 0.02 * (1 - s / 0.8) : 0; });
      tap(eg, 'paint another coat', (sfx) => { t0 = now(); stage = stage >= 5 ? 1 : stage + 1; draw(); sfx(stage >= 5 ? [[523, 0.1], [659, 0.1], [784, 0.1], [1047, 0.3]] : [[300, 0.05], [340, 0.08]], stage >= 5 ? 'triangle' : 'sine', 0.4); });
      g.add(shadow(0.5).translateX(x).translateZ(z));
    }
  }

  // ── an oversized brush standing in a bucket, back-left corner ──
  {
    const at = spot(-3.3, -4.9, 0.22);
    if (at) {
      const [x, z] = at; claim(x, z, 0.22);
      S.put(new THREE.CylinderGeometry(0.22, 0.18, 0.38, 18, 1, true), paint(0x5f8cc8, { side: THREE.DoubleSide }), x, 0.19, z);
      S.put(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 16), paint(0x3f6aa0), x, 0.01, z);
      S.put(new THREE.CylinderGeometry(0.205, 0.205, 0.02, 16), paint(0x7fb3a8), x, 0.33, z);
      S.put(new THREE.TorusGeometry(0.22, 0.015, 6, 20).rotateX(Math.PI / 2), tin, x, 0.38, z);
      const B = S.at(x, 0.1, z, 0.4, 0, 0.18);           // leaning a little against the rim
      B.put(new THREE.CylinderGeometry(0.04, 0.05, 1.25, 10).translate(0, 0.62, 0), paint(0xc23f36));
      B.put(new THREE.CylinderGeometry(0.075, 0.06, 0.2, 12).translate(0, 1.32, 0), tin);
      B.put(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 12).translate(0, 1.53, 0), paint(0xe8d0a0));
      B.put(new THREE.ConeGeometry(0.06, 0.12, 12).translate(0, 1.7, 0), paint(0xe4b84f));
    }
  }

  // ── a crate of rolled canvases ──
  {
    const at = spot(-3.35, -3.38, 0.22);
    if (at) {
      const [x, z] = at; claim(x, z, 0.22);
      const C = S.at(x, 0, z, 0.3), slat = paint(0xc8a47c);
      for (const y of [0.06, 0.2, 0.34]) for (const s of [-1, 1]) { C.box(0.42, 0.08, 0.025, slat, 0, y, s * 0.19, 0.008); C.box(0.025, 0.08, 0.4, slat, s * 0.2, y, 0, 0.008); }
      for (const [dx, dz] of [[-0.19, -0.18], [0.19, -0.18], [-0.19, 0.18], [0.19, 0.18]]) C.box(0.04, 0.42, 0.04, bark, dx, 0.21, dz, 0.008);
      [[-0.08, -0.07, 0xfdf8ec, 0.15], [0.07, -0.08, 0xe8d8c0, -0.12], [-0.06, 0.08, 0xfdf8ec, -0.08], [0.08, 0.07, 0xf3dfa8, 0.18], [0, 0, 0xfdf8ec, 0.02]].forEach(([dx, dz, col, lean], i) => {
        const len = 0.7 + (i % 3) * 0.1;
        C.put(new THREE.CylinderGeometry(0.045, 0.045, len, 12).translate(0, len / 2, 0), paint(col), dx, 0.03, dz, [lean, 0, -lean * 0.8]);
        C.put(new THREE.TorusGeometry(0.046, 0.008, 4, 12).rotateX(Math.PI / 2).translate(0, len * 0.6, 0), paint(COLS[i]), dx, 0.03, dz, [lean, 0, -lean * 0.8]);
      });
    }
  }

  // ── a giant squishy paint-blob beanbag (tap: flop on it) ──
  {
    const at = spot(-1.55, -2.95, 0.34);
    if (at) {
      const [x, z] = at; claim(x, z, 0.32);
      // a gallery placard, on a stake behind it
      const px = x - 0.34, pz = z - 0.3;
      S.put(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 6), bark, px, 0.25, pz);
      const pl = new THREE.Group(); pl.position.set(px, 0.5, pz); pl.rotation.set(-0.3, 0.5, 0); g.add(pl);
      sub(pl).box(0.32, 0.2, 0.02, paint(0xfdf8ec), 0, 0, 0, 0.005);
      sub(pl).put(new THREE.PlaneGeometry(0.3, 0.18), opaque(192, 112, (c, w, h) => { c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.textAlign = 'center'; c.font = `700 20px ${HAND}`; c.fillText('“Blob, No. 7”', w / 2, 24); c.font = `400 15px ${HAND}`; ['Please do not sit', 'on the art.', '(It is a beanbag.)', '(It is also art.)'].forEach((l, i) => c.fillText(l, w / 2, 46 + i * 17)); }), 0, 0, 0.012).userData.noInk = true;
      const geo = new THREE.SphereGeometry(0.36, 28, 18), pos = geo.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const n = 1 + 0.08 * Math.sin(v.x * 14 + v.z * 9) + 0.06 * Math.sin(v.z * 17 - v.y * 6);
        v.multiplyScalar(n); v.y = v.y < 0 ? v.y * 0.25 : v.y * 0.75;
        pos.setXYZ(i, v.x, v.y, v.z);
      }
      geo.computeVertexNormals(); geo.translate(0, 0.09, 0);
      const bb = new THREE.Group(); bb.position.set(x, 0, z); g.add(bb);
      const BK = sub(bb), pink = paint(0xdc6a9a, { hatch: 0.5 });
      BK.put(geo, pink);
      for (let k = 0; k < 5; k++) { const a = k * 1.25 + 0.3; BK.put(new THREE.SphereGeometry(0.06 + (k % 2) * 0.03, 10, 6).scale(1, 0.3, 1), pink, Math.cos(a) * 0.42, 0.015, Math.sin(a) * 0.42); }
      BK.put(new THREE.SphereGeometry(0.05, 10, 8), paint(0xffffff, { hatch: 0 }), -0.1, 0.33, 0.14).userData.noInk = true;   // a glossy highlight
      let t0 = -9;
      live((t) => {
        const s = since(t0), k = s < 1.6 ? Math.cos(s * 10) * Math.exp(-s * 2.4) : 0.03 * Math.sin(t * 1.6);
        bb.scale.set(1 + k * 0.25, 1 - k * 0.4, 1 + k * 0.25);
      });
      tap(bb, 'flop on the paint blob', (sfx) => { t0 = now(); sfx([[140, 0.1], [110, 0.18], [90, 0.2]], 'sine', 0.6); });
      g.add(shadow(0.5).translateX(x).translateZ(z));
    }
  }

  // ── a stool with a palette on it ──
  {
    const at = spot(-1.75, -3.7, 0.2);
    if (at) {
      const [x, z] = at; claim(x, z, 0.2);
      S.put(new THREE.CylinderGeometry(0.19, 0.19, 0.05, 18), benchWood, x, 0.55, z);
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2 + 0.4; S.put(new THREE.CylinderGeometry(0.02, 0.025, 0.56, 6), bark, x + Math.cos(a) * 0.12, 0.27, z + Math.sin(a) * 0.12, [Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12]); }
      S.put(new THREE.TorusGeometry(0.13, 0.012, 4, 16).rotateX(Math.PI / 2), bark, x, 0.22, z);
      S.put(new THREE.CylinderGeometry(0.17, 0.17, 0.018, 20), paint(0xe2c79a), x, 0.585, z, null, [1.15, 1, 0.85]);
      [[-0.09, -0.05], [-0.01, -0.1], [0.08, -0.06], [0.1, 0.04], [-0.06, 0.07]].forEach(([dx, dz], i) => S.put(new THREE.SphereGeometry(0.03, 8, 6), paint(COLS[i]), x + dx, 0.598, z + dz, null, [1, 0.4, 1]));
    }
  }

  // ── RIGHT MIDDLE: a stepladder with a can on top (tap: kick the ladder) ──
  {
    const at = spot(2.5, -2.05, 0.34);
    if (at) {
      const [x, z] = at; claim(x, z, 0.34);
      const lad = new THREE.Group(); lad.position.set(x, 0, z - 0.34); lad.rotation.y = -0.3; g.add(lad);   // pivots on its back feet
      const inner = new THREE.Group(); inner.position.z = 0.09; lad.add(inner);
      const LK = sub(inner), alu = paint(0xb8bcc6);
      for (const s of [-1, 1]) {
        LK.box(0.05, 1.32, 0.04, alu, s * 0.22, 0.64, 0.24, 0.01, [-0.17, 0, 0]);       // front rails
        LK.box(0.04, 1.3, 0.035, alu, s * 0.2, 0.63, 0.02, 0.01, [0.17, 0, 0]);        // back legs
      }
      for (let k = 0; k < 4; k++) { const y = 0.28 + k * 0.28; LK.box(0.44, 0.03, 0.1, alu, 0, y, 0.24 - (y - 0.64) * Math.tan(0.17), 0.008); }
      LK.box(0.46, 0.05, 0.3, paint(0xe8604c), 0, 1.3, 0.13, 0.015);                 // the top
      const can = new THREE.Group(); can.position.set(0.05, 1.325, 0.13); inner.add(can);   // wobbles on its base
      const CK = sub(can);
      CK.put(new THREE.CylinderGeometry(0.1, 0.1, 0.18, 14).translate(0, 0.09, 0), tin);
      CK.put(new THREE.CylinderGeometry(0.095, 0.095, 0.01, 14).translate(0, 0.18, 0), paint(0x7fb3a8));
      CK.put(new THREE.CapsuleGeometry(0.012, 0.08, 3, 6).translate(0.098, 0.13, 0), paint(0x7fb3a8)).userData.noInk = true;
      CK.put(new THREE.TorusGeometry(0.1, 0.006, 4, 14, Math.PI), dark, 0, 0.18, 0);
      let t0 = -9;
      live(() => {
        const s = since(t0), k = s < 2 ? Math.sin(s * 11) * Math.exp(-s * 2) : 0;
        lad.rotation.x = -Math.abs(k) * 0.06;
        can.rotation.z = k * 0.3; can.rotation.x = Math.sin(s * 8) * Math.exp(-s * 2) * (s < 2 ? 0.15 : 0);
      });
      tap(lad, 'kick the stepladder', (sfx) => { t0 = now(); sfx([[180, 0.04], [1200, 0.03], [900, 0.05], [1100, 0.03], [800, 0.08]], 'square', 0.2); });
      g.add(shadow(0.45).translateX(x).translateZ(z));
    }
  }

  // ── a stack of paint cans ──
  {
    const at = spot(2.35, -1.2, 0.28);
    if (at) {
      const [x, z] = at; claim(x, z, 0.28);
      const P = S.at(x, 0, z, 0.4);
      [[-0.13, 0, 0], [0.13, 0, 0], [0, 0, -0.2], [-0.065, 1, -0.07], [0.065, 1, -0.07], [0, 2, -0.035]].forEach(([dx, row, dz], i) => {
        const y = 0.1 + row * 0.205;
        P.put(new THREE.CylinderGeometry(0.11, 0.11, 0.2, 14), tin, dx * (row ? 1 : 1), y, dz);
        P.put(new THREE.CylinderGeometry(0.104, 0.104, 0.012, 14), paint(COLS[(i + 2) % 6]), dx, y + 0.104, dz);
        P.put(new THREE.CylinderGeometry(0.112, 0.112, 0.08, 14, 1, true), paint(COLS[(i + 2) % 6]), dx, y, dz);
      });
    }
  }

  // ── a paint-roller tray by the door (tap: roll a stripe) ──
  {
    const at = spot(1.45, -0.4, 0.22);
    if (at) {
      const [x, z] = at; claim(x, z, 0.2);
      S.box(0.3, 0.04, 0.4, paint(0x93abc0), x, 0.03, z, 0.01, [0.12, 0, 0]);
      const well = plane(0.24, 0.16, tintable(0x8f7ae8), x, 0.06, z + 0.1, [-Math.PI / 2 + 0.12, 0, 0]);
      const stripes = [], N = 4;
      for (let k = 0; k < N; k++) {
        const m = plane(1, 0.15, tintable(COLS[k]), x + 0.25, 0.013 + k * 0.0005, z + 0.25 - k * 0.17, [-Math.PI / 2, 0, 0]);
        m.material.transparent = true; m.material.opacity = 0.9; m.renderOrder = 2; m.visible = false; stripes.push(m);
      }
      const roll = new THREE.Group(); g.add(roll);             // the roller's axle
      const RK = sub(roll);
      RK.put(new THREE.CylinderGeometry(0.045, 0.045, 0.16, 12).rotateX(Math.PI / 2), tintable(0x8f7ae8));
      RK.put(new THREE.CylinderGeometry(0.008, 0.008, 0.2, 6).rotateX(Math.PI / 2), tin);
      const handle = new THREE.Group(); roll.add(handle);      // the handle doesn't spin with the roller
      const HK = sub(handle);
      HK.put(new THREE.CylinderGeometry(0.008, 0.008, 0.07, 6).translate(0, 0.03, -0.1), tin);                     // the yoke, up from the axle's end
      HK.put(new THREE.CylinderGeometry(0.008, 0.008, 0.25, 6).rotateZ(0.9).translate(-0.098, 0.138, -0.1), tin);
      HK.put(new THREE.CylinderGeometry(0.02, 0.02, 0.14, 8).rotateZ(0.9).translate(-0.25, 0.258, -0.1), paint(0xe4b84f));
      const rollM = roll.children[0].material;
      let t0 = -9, n = 0, lane = 0;
      const home = () => [x - 0.02, z + 0.08];
      live(() => {
        const s = since(t0), [hx, hz] = home();
        const lz = z + 0.25 - lane * 0.17;
        let px = hx, pz = hz;
        if (s < 2.6) {
          const u = s < 0.3 ? s / 0.3 : s < 1.6 ? 1 + (s - 0.3) / 1.3 : 2 + (s - 1.6) / 1.0;   // to the lane, along it, back home
          if (u < 1) { px = hx + (x + 0.25 - hx) * u; pz = hz + (lz - hz) * u; }
          else if (u < 2) { px = x + 0.25 + (u - 1); pz = lz; stripes[lane].visible = true; stripes[lane].scale.x = Math.max(0.01, u - 1); stripes[lane].position.x = x + 0.25 + (u - 1) / 2; }
          else { const v = u - 2; px = x + 1.25 + (hx - x - 1.25) * v; pz = lz + (hz - lz) * v; }
        }
        roll.position.set(px, 0.045, pz);
        roll.children[0].rotation.z = roll.children[1].rotation.z = -(px - hx) / 0.045;
      });
      tap(roll, 'roll a stripe', (sfx) => {
        if (since(t0) < 2.6) return;
        lane = n % N; n++; rollM.color.set(COLS[lane]); well.material.color.set(COLS[lane]);
        stripes[lane].material.color.set(COLS[lane]); stripes[lane].scale.x = 0.01; t0 = now();
        sfx([[220, 0.3], [247, 0.3], [262, 0.4]], 'sine', 0.3);
      });
    }
  }

  games.replace('name the medium', (m) => {
    const keys = ['watercolor', 'sketch', 'comic', 'pixel', 'flat'], names = keys.map(label);
    const tells = { watercolor: 'soft washes, cool shadows, a watery line', sketch: 'pencil hatching on paper', comic: 'halftone dots and bold black lines', pixel: 'chunky hard tones and jaggy edges', flat: 'clean colour and no outlines at all' };
    const rounds = shuffle(keys).slice(0, 3).map(k => ({
      q: 'Look at the room, not this panel: what medium is the whole studio drawn in now?',
      show: () => setMedium(k), choices: names, answer: keys.indexOf(k),
      why: `${label(k)[0].toUpperCase() + label(k).slice(1)}: ${tells[k]}. On a Splatform site, that's one attribute.`,
    }));
    rounds.push({ q: 'Back to gouache. On the washing line by the left wall, which component is drawn in gritty, smudged charcoal?', show: () => setMedium('gouache'),
      choices: ['the button', 'the toggle', 'the card', 'the slider'], answer: 2, why: 'The card: grey grit like charcoal dust. The button is watercolour, the slider marker.' });
    rounds.push({ q: 'Peek into the giant Splatform can by the door. What colour is the paint inside?',
      choices: ['pink', 'blue', 'yellow', 'green'], answer: 0, why: 'Pink. The pink footprints all over the floor were a clue.' });
    quiz(m.game, 'What medium is the room?', rounds, {
      end: (sc, n) => `${sc} of ${n}. ${sc === n ? 'A painter’s eye. You noticed everything.' : 'Same room, five media: Splatform repaints a whole site like that.'} (Tap the giant can to do it yourself.)`,
      onClose: () => setMedium('gouache'),
    });
  }, 'what medium is the room?');

  // ══ WALK-OVER FLOOR: flat painted rugs, runners and scraps a few millimetres up — you walk
  // straight across them, so they can go anywhere, walkways included (just not on a game ring) ══
  let decalN = 0;
  const decal = (w, h, draw, x, z, rot = 0, { y, px = 150 } = {}) => {
    const cw = Math.min(512, Math.max(32, Math.round(w * px))), ch = Math.min(1024, Math.max(32, Math.round(h * px)));
    const m = paint(0xffffff, { map: canvasTex(cw, ch, draw), hatch: 0, unique: true });
    m.transparent = true; m.alphaTest = 0.35; m.depthWrite = false;
    const k = decalN++;
    const p = plane(w, h, m, x, y ?? 0.004 + (k % 12) * 0.001, z, [-Math.PI / 2, 0, rot]); p.renderOrder = 1 + k * 0.01;
    return p;
  };
  const firstFree = (list, r) => list.find(([x, z]) => free(x, z, r));
  const curl = (c, x, y, len, col, seed, lw = 3) => {          // a snipped end of yarn
    c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y);
    for (let i = 1; i <= 12; i++) { const t = i / 12; c.lineTo(x + Math.cos(seed + t * 5) * len * t + Math.sin(t * 9 + seed) * 6, y + Math.sin(seed * 1.3 + t * 4) * len * 0.6 * t + Math.cos(t * 11) * 5); }
    c.stroke();
  };
  {
    // a big painted mural on the floor in the middle of the studio: one brushy "splat!"
    decal(2.7, 1.8, (c, w, h) => {
      const sw = (pts, col, lw) => { c.strokeStyle = col; c.lineWidth = lw; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(x * w, y * h) : c.moveTo(x * w, y * h)); c.stroke(); };
      c.globalAlpha = 0.85;
      sw([[0.08, 0.7], [0.25, 0.35], [0.45, 0.6], [0.62, 0.25], [0.9, 0.5]], '#8f7ae8', 46);
      sw([[0.1, 0.45], [0.3, 0.75], [0.5, 0.4], [0.75, 0.75], [0.92, 0.3]], '#e4b84f', 30);
      sw([[0.2, 0.2], [0.4, 0.15], [0.6, 0.85], [0.85, 0.85]], '#7fb3a8', 22);
      for (let i = 0; i < 18; i++) blob(c, w * (0.08 + ((i * 37) % 84) / 100), h * (0.1 + ((i * 53) % 80) / 100), 6 + (i % 4) * 5, CSS[i % 6], i);
      c.globalAlpha = 1; c.fillStyle = '#fdf8ec'; c.strokeStyle = INKC; c.lineWidth = 6; c.font = `700 ${Math.round(h * 0.3)}px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.strokeText('splat!', w / 2, h / 2); c.fillText('splat!', w / 2, h / 2);
    }, -0.15, -3.55, 0.08, { px: 110 });
    // purple footprints walking from the spilt can out to the door
    decal(0.6, 2.9, (c, w, h) => {
      c.fillStyle = 'rgba(143,122,232,0.85)';
      for (let k = 0; k < 9; k++) { const x = w / 2 + (k % 2 ? 16 : -16), y = h - 30 - k * (h - 60) / 8; c.globalAlpha = 0.3 + k * 0.08; c.beginPath(); c.ellipse(x, y, 11, 18, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(x, y + 26, 8, 9, 0, 0, 7); c.fill(); }
    }, -0.75, -1.05, 0.42);
    // more drop cloths
    cloth(1.3, 0.9, 1.05, -0.75, -0.25, 11);
    cloth(1.2, 0.95, 1.25, -3.75, 0.2, 14);
    // a taped-off square of wet paint by the door, right
    decal(0.85, 0.85, (c, w, h) => {
      c.fillStyle = 'rgba(95,140,200,0.55)'; c.fillRect(24, 24, w - 48, h - 48);
      c.strokeStyle = '#e4b84f'; c.lineWidth = 12; c.strokeRect(16, 16, w - 32, h - 32);
      c.fillStyle = '#fdf8ec'; c.fillRect(w / 2 - 42, h / 2 - 14, 84, 28); c.fillStyle = '#c23f36'; c.font = `700 18px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('WET PAINT', w / 2, h / 2 + 1);
      c.fillStyle = 'rgba(143,122,232,0.85)'; c.beginPath(); c.ellipse(w * 0.72, h * 0.3, 9, 15, 0.3, 0, 7); c.fill();   // (somebody did anyway)
    }, 2.35, -0.55, 0.12);
    // a stencilled arrow toward the game, and one by the door you can spin (tap it)
    const arrowDraw = (txt, col) => (c, w, h) => {
      c.fillStyle = col; c.beginPath(); c.moveTo(w * 0.1, h * 0.38); c.lineTo(w * 0.62, h * 0.38); c.lineTo(w * 0.62, h * 0.18); c.lineTo(w * 0.95, h * 0.5); c.lineTo(w * 0.62, h * 0.82); c.lineTo(w * 0.62, h * 0.62); c.lineTo(w * 0.1, h * 0.62); c.closePath(); c.fill();
      c.fillStyle = '#fdf8ec'; c.font = `700 ${Math.round(h * 0.17)}px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w * 0.42, h * 0.5);
    };
    decal(0.9, 0.36, arrowDraw('paint here', '#e8604c'), -1.65, -1.45, Math.atan2(0.6, -1.25));
    const arr = new THREE.Group(); arr.position.set(0.55, 0, -0.45); g.add(arr);
    const am = paint(0xffffff, { map: canvasTex(192, 80, arrowDraw('this way', '#5f8cc8')), hatch: 0, unique: true }); am.transparent = true; am.alphaTest = 0.35; am.depthWrite = false;
    const ap = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.33).rotateX(-Math.PI / 2), am); ap.position.y = 0.014; ap.renderOrder = 1.6; ap.userData.noInk = true; arr.add(ap);
    arr.rotation.y = Math.PI / 2;                    // pointing into the room
    const WAYS = [['to the paint', [-2.9, -2.05]], ['to more paint', [3.5, -1.75]], ['to the exit (also paint)', [0, 1]], ['to the giant can', [3.42, -0.5]], ['to whoever made these footprints', [-0.75, -1.6]], ['to the screen, where the paint is on purpose', [0, -5]]];
    let a0 = Math.PI / 2, a1 = a0, at0 = -9, w = 0;
    live(() => { const s = since(at0); if (s > 1.4) return; const u = Math.min(1, s / 1.3), e = 1 - Math.pow(1 - u, 3); arr.rotation.y = a0 + (a1 - a0) * e; ap.position.y = 0.014 + Math.sin(u * Math.PI) * 0.03; });
    tap(arr, 'spin the floor arrow', (sfx) => {
      if (since(at0) < 1.4) return;
      at0 = now(); w = (w + 1) % WAYS.length; a0 = arr.rotation.y; const [tx, tz] = WAYS[w][1]; a1 = Math.atan2(-(tz - arr.position.z), tx - arr.position.x); while (a1 < a0 + Math.PI) a1 += Math.PI * 2;
      say(`This way: ${WAYS[w][0]}.`); sfx([[300, 0.04], [400, 0.04], [500, 0.04], [600, 0.04], [800, 0.1]], 'triangle', 0.15);
    });
    // more solid clutter where it fits: a stack of blank canvases, a bucket of rollers
    const stack = firstFree([[1.9, -4.85], [-1.45, -4.9], [2.0, -3.3], [-0.9, -4.95], [3.55, -2.7]], 0.25);
    if (stack) {
      const [x, z] = stack; claim(x, z, 0.25);
      for (let i = 0; i < 5; i++) S.box(0.5 - i * 0.03, 0.05, 0.4 - i * 0.02, i % 2 ? cream : paint(0xe8d8c0), x + Math.sin(i * 2) * 0.02, 0.025 + i * 0.05, z + Math.cos(i * 3) * 0.02, 0.008, [0, i * 0.12, 0]);
      S.put(new THREE.CylinderGeometry(0.05, 0.05, 0.12, 12), paint(0xdc6a9a), x + 0.08, 0.31, z);
    }
    const buck = firstFree([[-1.45, -4.9], [2.0, -3.3], [1.9, -4.85], [3.55, -2.7], [-0.9, -4.95]].filter(p => !stack || Math.hypot(p[0] - stack[0], p[1] - stack[1]) > 0.55), 0.2);
    if (buck) {
      const [x, z] = buck; claim(x, z, 0.2);
      S.put(new THREE.CylinderGeometry(0.18, 0.15, 0.32, 16, 1, true), paint(0x7fb3a8, { side: THREE.DoubleSide }), x, 0.16, z);
      S.put(new THREE.CylinderGeometry(0.15, 0.15, 0.02, 14), paint(0x5f9a90), x, 0.01, z);
      for (let i = 0; i < 2; i++) { const a = i * 2.5; S.put(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 6).translate(0, 0.25, 0), tin, x + Math.cos(a) * 0.06, 0.1, z + Math.sin(a) * 0.06, [Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25]); }
      const tip = (a) => new THREE.Vector3(0, 0.6, 0).applyEuler(new THREE.Euler(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25));
      for (let i = 0; i < 2; i++) { const a = i * 2.5, t = tip(a); S.put(new THREE.CylinderGeometry(0.04, 0.04, 0.16, 12).rotateZ(Math.PI / 2), paint(COLS[i * 3]), x + Math.cos(a) * 0.06 + t.x, 0.1 + t.y, z + Math.sin(a) * 0.06 + t.z, [Math.sin(a) * 0.25, a, -Math.cos(a) * 0.25]); }
    }
  }

  S.flush(g); L.flush(g, true);
}
