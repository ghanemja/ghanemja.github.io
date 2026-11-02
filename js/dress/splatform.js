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
  const warn = (what, x, z, r) => { if (!free(x, z, r)) (window.__dressWarn ??= []).push(`splatform: ${what} at ${x},${z}`); };
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

  // ══ RIGHT: the spin-art bench (tap: squirt paint) ══
  {
    const x = 3.5, z = -1.75;
    warn('bench a', x - 0.05, z + 0.3, 0.3); warn('bench b', x - 0.05, z - 0.3, 0.3);
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
    const BK = sub(bottle), bm = paint(0xe8604c, { unique: true });
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
    tap(wheel, 'spin the colour wheel', (sfx) => { t0 = now(); sfx([[523, 0.08], [587, 0.08], [659, 0.08], [698, 0.08], [784, 0.08], [880, 0.08], [988, 0.08], [1047, 0.2]], 'triangle', 0.35); });

    // a swatch chart: the same stroke in five media
    const sw = opaque(300, 200, (c, w, h) => {
      c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h);
      c.fillStyle = INKC; c.font = `700 30px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('five media, one button', w / 2, 32);
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
    warn('bigcan', x, z, 0.3); claim(x, z, 0.3);
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
    const pb = sub(pop).put(new THREE.SphereGeometry(0.1, 12, 10), paint(0xdc6a9a)); pop.visible = false;
    let t0 = -9;
    live(() => {
      const s = since(t0);
      lid.rotation.z = s < 0.2 ? s / 0.2 * 2.2 : s < 1.8 ? 2.2 + Math.sin((s - 0.2) * 12) * 0.08 * (1.8 - s) : s < 2.1 ? 2.2 * (1 - (s - 1.8) / 0.3) : 0;
      pop.visible = s < 1.5;
      const u = Math.min(1, s / 1.2);
      pop.position.y = 0.5 + Math.sin(u * Math.PI) * 0.6;
      const st = 1 + Math.sin(s * 14) * 0.15 * (1 - u); pop.scale.set(1 / st, st, 1 / st);
    });
    tap(lid, 'pop the big paint can', (sfx) => { t0 = now(); sfx([[180, 0.05], [900, 0.06], [600, 0.1], [300, 0.25]], 'sine', 0.6); });
    g.add(shadow(0.38).translateX(x).translateZ(z));
  }

  // ══ RIGHT BACK: a rack of canvases drying ══
  {
    const x = 3.7, z = -4.55;
    warn('rack', x, z, 0.2); claim(x, z, 0.2);
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
    warn('bucket', x, z, 0.2); claim(x, z, 0.2);
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
    warn('canvases', -3.78, cz, 0.12);
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
    warn('taboret', x, z, 0.3); claim(x, z, 0.3);
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
    const sg = opaque(300, 130, (c, w, h) => {
      c.fillStyle = '#fdf8ec'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) blob(c, 30 + i * 60, 108, 14, CSS[i], i);
      c.fillStyle = INKC; c.font = `400 20px ${HAND}`; c.textAlign = 'center'; c.fillText('today’s medium', w / 2, 30);
      c.font = `700 52px ${SCRIPT}`; c.fillText('gouache', w / 2, 78);
    });
    S.box(0.84, 0.4, 0.03, wood, -3.25, 1.92, BW + 0.03, 0.01);
    plane(0.78, 0.34, sg, -3.25, 1.92, BW + 0.05);
  }

  S.flush(g); L.flush(g, true);
}
