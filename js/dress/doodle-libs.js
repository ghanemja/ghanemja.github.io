// ─── dressing for the doodle-libs room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// A notebook come to life: a writer's desk with a typewriter and a pencil that writes by
// itself, giant pencils, a sharpener and an eraser, an overflowing wastebasket, word dice,
// the AI robot and the dancing tree from the cartoons, a cardboard rocket, KA-BOOM!, doodles
// pegged on a clothesline, sticky notes, paper clouds and a sun, and a paper plane looping.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function baker(THREE) {
  const lists = new Map(), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const add = (mat, geo, x = 0, y = 0, z = 0, rot, sc) => {
    e.set(...(rot || [0, 0, 0])); q.setFromEuler(e);
    const s = sc == null ? [1, 1, 1] : typeof sc === 'number' ? [sc, sc, sc] : sc;
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(...s));
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m4);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    if (!lists.has(mat)) lists.set(mat, []);
    lists.get(mat).push(g);
  };
  const flush = (parent) => {
    const out = [];
    for (const [mat, l] of lists) { const m = new THREE.Mesh(mergeGeometries(l), mat); parent.add(m); out.push(m); }
    lists.clear();
    return out;
  };
  return { add, flush };
}

export default function dress(K) {
  const { THREE, g: G, paint, tap, live, free, claim, rb, canvasTex, texMat, HAND, SCRIPT, INKC, now } = K;
  const B = baker(THREE);
  const grp = (x = 0, y = 0, z = 0, parent = G) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, rot) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m); return m;
  };
  const decal = (w, h, draw, pw, ph, parent, x, y, z, rot) => {
    const m = mesh(new THREE.PlaneGeometry(w, h), texMat(pw, ph, draw), parent, x, y, z, rot);
    m.userData.noInk = true; m.renderOrder = 2; return m;
  };
  // a paper cut-out: drawn on a canvas, cut round its edge, both sides showing
  const cutout = (w, h, pw, ph, draw) => {
    const m = paint(0xffffff, { map: canvasTex(pw, ph, draw), hatch: 0, side: THREE.DoubleSide, unique: true });
    m.alphaTest = 0.5;
    const me = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); me.userData.noInk = true; return me;
  };
  const solid = (x, z, r) => { if (!free(x, z, r)) console.warn('[doodle-libs] crowded spot', x, z, r); claim(x, z, r); };
  const smooth = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  const HPI = Math.PI / 2;
  const glowTex = canvasTex(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const puffMat = (col) => new THREE.SpriteMaterial({ map: glowTex, color: col, depthWrite: false, transparent: true, opacity: 0 });
  const inkLine = (c, lw = 5) => { c.strokeStyle = INKC; c.lineWidth = lw; c.lineJoin = c.lineCap = 'round'; };
  const wood = paint(0x9a7c5c), woodDk = paint(0x7a5e44), dark = paint(0x2a2230, { hatch: 0 });
  const paper = paint(0xfffdf6, { hatch: 0.3 }), metal = paint(0xb8bec8);

  // a pencil standing on its eraser end, length L, built along +y from 0
  const pencil = (bk, col, L, r, x, y, z, rot) => {
    const g = new THREE.Group(); const parts = [];
    parts.push([paint(0xef8fa8), new THREE.CylinderGeometry(r, r, 0.08 * L / 1.4, 10), 0.04 * L / 1.4]);
    parts.push([metal, new THREE.CylinderGeometry(r * 1.05, r * 1.05, 0.07 * L / 1.4, 10), 0.115 * L / 1.4]);
    const body = L * 0.72;
    parts.push([paint(col), new THREE.CylinderGeometry(r, r, body, 6), 0.15 * L / 1.4 + body / 2]);
    const tip0 = 0.15 * L / 1.4 + body, cone = L - tip0;
    parts.push([paint(0xe8c89a), new THREE.CylinderGeometry(r * 0.28, r, cone * 0.75, 6), tip0 + cone * 0.375]);
    parts.push([dark, new THREE.ConeGeometry(r * 0.28, cone * 0.25, 6), tip0 + cone * 0.875]);
    const m4 = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rot || [0, 0, 0]))), new THREE.Vector3(1, 1, 1));
    for (const [mat, geo, cy] of parts) { geo.translate(0, cy, 0); geo.applyMatrix4(m4); bk.add(mat, geo); }
    return g;
  };

  // ── 1. the writer's desk, back-left: typewriter, pencil pot, a pencil writing by itself ──
  const DX = -2.75, DZ = -4.95, TOP = 0.75;
  solid(DX, DZ, 0.55);
  B.add(wood, rb(1.25, 0.05, 0.55, 0.015), DX, TOP - 0.025, DZ);
  for (const [dx, dz] of [[-0.57, -0.22], [0.57, -0.22], [-0.57, 0.22], [0.57, 0.22]]) B.add(woodDk, rb(0.05, 0.73, 0.05, 0.012), DX + dx, 0.365, DZ + dz);
  B.add(woodDk, rb(0.4, 0.14, 0.48, 0.015), DX - 0.36, TOP - 0.12, DZ);            // a drawer under the top
  B.add(paint(0xf6c445), rb(0.06, 0.025, 0.02, 0.006), DX - 0.36, TOP - 0.12, DZ + 0.245);
  // the typewriter
  const TW = grp(DX + 0.32, TOP, DZ + 0.02); TW.rotation.y = -0.12;
  const twCol = paint(0x3f8a8a), tb = baker(THREE);
  tb.add(twCol, rb(0.44, 0.1, 0.32, 0.03), 0, 0.05, 0);
  tb.add(twCol, rb(0.44, 0.08, 0.12, 0.025), 0, 0.12, -0.1);
  tb.flush(TW);
  const kb = baker(THREE), keyM = paint(0xfffaf0, { hatch: 0 });
  for (let row = 0; row < 3; row++) for (let i = 0; i < 9; i++) kb.add(keyM, new THREE.CylinderGeometry(0.014, 0.014, 0.012, 8), -0.17 + i * 0.042 + row * 0.01, 0.105 + row * 0.012, 0.11 - row * 0.04);
  kb.add(keyM, rb(0.2, 0.012, 0.03, 0.005), 0, 0.1, 0.145);
  kb.flush(TW);
  const carriage = grp(0, 0.18, -0.1, TW);
  mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.46, 14), dark, carriage, 0, 0, 0, [0, 0, HPI]);
  for (const s of [-1, 1]) mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), paint(0xe8466b), carriage, s * 0.25, 0, 0, [0, 0, HPI]);
  mesh(rb(0.02, 0.02, 0.07, 0.005), metal, carriage, -0.26, 0.035, 0.03);
  const sheetM = paint(0xffffff, { hatch: 0, side: THREE.DoubleSide, map: canvasTex(192, 224, (c, w, h) => {
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(76,155,232,0.4)'; c.lineWidth = 2; for (let y = 30; y < h; y += 22) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.font = `22px "Courier New", monospace`; c.fillStyle = INKC;
    ['Once upon a', 'time, a', '_______ began', 'to _____!'].forEach((l, i) => c.fillText(l, 12, 50 + i * 26));
    c.font = `15px ${HAND}`; c.fillStyle = '#e8466b'; c.fillText('(noun)', 22, 148); c.fillText('(verb)', 40, 174);
  }) });
  const sheet = mesh(new THREE.PlaneGeometry(0.24, 0.28).translate(0, 0.14, 0), sheetM, carriage, 0, 0.01, -0.02, [-0.3, 0, 0]);
  sheet.userData.noInk = true;
  const bellArm = mesh(new THREE.SphereGeometry(0.015, 8, 6), paint(0xf6c445), TW, 0.2, 0.19, -0.04);
  let tType = -99;
  tap(TW, 'type a word', (sfx) => {
    tType = now();
    const n = []; for (let i = 0; i < 8; i++) n.push([1800 + (i % 3) * 200, 0.05], [60, 0.06]);
    n.push([2637, 0.35]);
    sfx(n, 'square', 0.025);
  });
  // a pencil pot and a stack of notebooks
  B.add(paint(0xe8466b), new THREE.CylinderGeometry(0.065, 0.06, 0.15, 14, 1, true), DX - 0.45, TOP + 0.075, DZ - 0.12);
  B.add(dark, new THREE.CircleGeometry(0.06, 14), DX - 0.45, TOP + 0.12, DZ - 0.12, [-HPI, 0, 0]);
  [[0xf6c445, 0.15, -0.02], [0x5f8cc8, -0.12, 0.02], [0x7fb3a8, 0.05, 0.03]].forEach(([col, rz, dx], i) => pencil(B, col, 0.32, 0.012, DX - 0.45 + dx, TOP + 0.02, DZ - 0.12 + (i - 1) * 0.02, [0.1 * (i - 1), 0, rz]));
  [[0xe8466b, 0.0], [0x2a78d6, 0.25], [0xf6c445, -0.15]].forEach(([col, ry], i) => B.add(paint(col), rb(0.26, 0.035, 0.2, 0.008), DX - 0.4, TOP + 0.018 + i * 0.036, DZ + 0.13, [0, ry, 0]));
  // the drawing pad, and the pencil that draws on it by itself
  const padX = DX - 0.12, padZ = DZ + 0.15;
  decal(0.22, 0.16, (c, w, h) => {
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h);
    inkLine(c, 3); c.beginPath(); c.arc(60, 50, 18, 0, 7); c.stroke();
    c.beginPath(); c.moveTo(60, 68); c.lineTo(60, 110); c.moveTo(60, 110); c.lineTo(46, 140); c.moveTo(60, 110); c.lineTo(74, 140); c.moveTo(60, 82); c.lineTo(36, 70); c.moveTo(60, 82); c.lineTo(86, 64); c.stroke();
    c.beginPath(); for (let a = 0; a < 18; a += 0.2) c.lineTo(150 + Math.cos(a) * a * 2.2, 80 + Math.sin(a) * a * 2.2); c.stroke();
  }, 220, 160, G, padX, TOP + 0.002, padZ, [-HPI, 0, 0.1]);
  const SP = grp(padX, TOP + 0.003, padZ);               // the pencil's point is its pivot
  const spB = baker(THREE);
  pencil(spB, 0xf6c445, 0.3, 0.011, 0, 0, 0, [Math.PI, 0, 0]);
  const spG = grp(0, 0, 0, SP); spB.flush(spG); spG.rotation.set(-0.55, 0, 0.35);
  live((t) => {
    const lift = Math.max(0, Math.sin(t * 0.9)) > 0.97 ? 0.015 : 0;
    SP.position.set(padX + Math.sin(t * 1.7) * 0.055 + Math.sin(t * 4.3) * 0.012, TOP + 0.003 + lift, padZ + Math.sin(t * 2.3) * 0.035);
    spG.rotation.z = 0.35 + Math.sin(t * 4.3) * 0.06;
    // the typewriter: carriage steps left as it types, the bell dings, it slides home
    const k = t - tType;
    let cx = 0.08;
    if (k >= 0 && k < 1.2) cx = 0.08 - Math.floor(k / 0.15) * 0.02;
    else if (k >= 1.2 && k < 1.6) cx = -0.08 + smooth((k - 1.2) / 0.4) * 0.16;
    carriage.position.x = cx;
    bellArm.position.y = 0.19 + (k > 1.15 && k < 1.35 ? 0.02 : 0);
    sheet.scale.y = 1 + (k >= 0 && k < 1.6 ? Math.min(1, k / 1.2) * 0.15 : 0);
  });
  // the writer's chair
  {
    const cx = DX + 0.1, cz = DZ + 0.6;
    claim(cx, cz, 0.22);
    const cb = baker(THREE);
    for (const [dx, dz] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) cb.add(woodDk, rb(0.04, 0.44, 0.04, 0.01), cx + dx, 0.22, cz + dz);
    cb.add(wood, rb(0.42, 0.04, 0.42, 0.012), cx, 0.46, cz);
    for (const dx of [-0.17, 0.17]) cb.add(woodDk, rb(0.04, 0.45, 0.04, 0.01), cx + dx, 0.7, cz + 0.17);
    cb.add(wood, rb(0.38, 0.14, 0.03, 0.01), cx, 0.85, cz + 0.17);
    cb.flush(G);
  }

  // ── 2. giant pencils leaning on the west wall ──
  [[0xf6c445, -2.6, 1.55], [0x2a78d6, -2.85, 1.35], [0xe8466b, -3.1, 1.5]].forEach(([col, z, L]) => {
    const lean = 0.2 / L;
    pencil(B, col, L, 0.05, -3.74, 0.0, z, [0, 0, lean]);
  });
  claim(-3.76, -2.85, 0.3);

  // ── 3. the wastebasket, overflowing with crumpled tries ──
  const crumple = (r, seed) => {
    const g = new THREE.IcosahedronGeometry(r, 1), p = g.attributes.position, R = K.mkRng(seed);
    const seen = new Map();
    for (let i = 0; i < p.count; i++) {
      const key = `${p.getX(i).toFixed(3)},${p.getY(i).toFixed(3)},${p.getZ(i).toFixed(3)}`;
      if (!seen.has(key)) seen.set(key, 0.75 + R() * 0.45);
      const f = seen.get(key); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
    g.computeVertexNormals(); return g;
  };
  const WBx = -3.45, WBz = -3.75;
  solid(WBx, WBz, 0.22);
  const binM = paint(0x93abc0, { side: THREE.DoubleSide });
  B.add(binM, new THREE.CylinderGeometry(0.2, 0.16, 0.36, 16, 1, true), WBx, 0.18, WBz);
  B.add(binM, new THREE.CircleGeometry(0.16, 16), WBx, 0.005, WBz, [-HPI, 0, 0]);
  B.add(paint(0x5f7a90), new THREE.TorusGeometry(0.2, 0.012, 6, 24), WBx, 0.36, WBz, [HPI, 0, 0]);
  [[0.05, 0.38, 0.02, 0.09], [-0.07, 0.37, -0.05, 0.08], [0.02, 0.43, -0.07, 0.07], [0.3, 0.07, 0.18, 0.07], [0.42, 0.06, -0.05, 0.06], [0.55, 0.065, 0.35, 0.065]].forEach(([dx, y, dz, r], i) => B.add(paper, crumple(r, i + 3), WBx + dx, y, WBz + dz, [i, i * 2, 0]));
  const jumper = mesh(crumple(0.075, 11), paper, G, WBx, 0.38, WBz + 0.06);
  let tBin = -99;
  tap(jumper, 'rummage in the wastebasket', (sfx) => { tBin = now(); sfx([[200, 0.06], [400, 0.08], [700, 0.1], [500, 0.1], [300, 0.15]], 'sine', 0.06); });
  live((t) => {
    const k = t - tBin;
    if (k >= 0 && k < 1.3) {
      const u = k / 1.0, h = u < 1 ? 4 * u * (1 - u) * 0.9 : Math.abs(Math.sin((k - 1) * 18)) * 0.04 * (1.3 - k) * 3;
      jumper.position.set(WBx + Math.sin(Math.min(1, u) * Math.PI) * 0.15, 0.38 + h, WBz + 0.06);
      jumper.rotation.set(k * 9, k * 5, 0);
    } else jumper.position.set(WBx, 0.38, WBz + 0.06);
  });

  // ── 4. a giant sharpener (with a pencil in it, being cranked) and an eraser, front-left ──
  {
    const sx = -3.4, sz = -0.5;
    solid(sx, sz, 0.32);
    B.add(metal, rb(0.36, 0.34, 0.36, 0.04), sx, 0.17, sz);
    B.add(paint(0x8a93a0), rb(0.38, 0.05, 0.38, 0.02), sx, 0.025, sz);
    mesh(new THREE.CircleGeometry(0.055, 16), dark, G, sx + 0.181, 0.2, sz, [0, HPI, 0]).userData.noInk = true;
    // the pencil, pushed in through the hole along +x; it turns as the crank turns
    const PG = grp(sx + 0.17, 0.2, sz);
    const pb = baker(THREE); pencil(pb, 0x8fc35a, 0.6, 0.045, 0.45, 0, 0, [0, 0, HPI]); pb.flush(PG);
    const crank = grp(sx, 0.2, sz - 0.19);                // the crank's axle comes out of the side
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.04, 8), metal, crank, 0, 0, -0.02, [HPI, 0, 0]);
    mesh(rb(0.04, 0.2, 0.025, 0.01), paint(0x8a93a0), crank, 0, 0.09, -0.04);
    mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.08, 8), paint(0xe8466b), crank, 0, 0.18, -0.08, [HPI, 0, 0]);
    const shav = [0, 1, 2, 3, 4].map((i) => {
      const m = mesh(new THREE.TorusGeometry(0.025, 0.007, 4, 10, Math.PI * 1.5), paint(i % 2 ? 0x8fc35a : 0xe8c89a), G, 0, -5, 0); m.userData.noInk = true; return m;
    });
    let tSharp = -99, sp = 0.6;
    tap(crank, 'crank the sharpener', (sfx) => { tSharp = now(); sp = 14; const n = []; for (let i = 0; i < 12; i++) n.push([90 + (i % 2) * 40, 0.06]); sfx(n, 'sawtooth', 0.03); });
    live((t, dt) => {
      sp += (0.6 - sp) * Math.min(1, dt * 0.9);
      crank.rotation.z -= sp * dt;
      PG.rotation.x = crank.rotation.z;
      PG.position.x = sx + 0.17 + Math.sin(t * 0.3) * 0.004;
      const k = t - tSharp;
      shav.forEach((m, i) => {
        const kk = k - i * 0.12;
        if (kk < 0 || kk > 1.2) { m.position.y = -5; return; }
        m.position.set(sx + 0.24 + kk * 0.25 + i * 0.03, 0.2 + Math.sin(kk / 1.2 * Math.PI) * 0.18 - kk * 0.12, sz + (i - 2) * 0.06);
        m.rotation.set(kk * 6 + i, kk * 4, 0);
      });
    });
    // the eraser, with crumbs
    const ex = -2.7, ez = -0.15;
    solid(ex, ez, 0.26);
    B.add(paint(0xef8fa8), rb(0.46, 0.2, 0.26, 0.05), ex, 0.1, ez, [0, 0.35, 0]);
    B.add(paint(0x5f8cc8), rb(0.2, 0.205, 0.265, 0.03), ex + 0.12 * Math.cos(0.35), 0.1, ez - 0.12 * Math.sin(0.35), [0, 0.35, 0]);
    for (let i = 0; i < 8; i++) B.add(paint(0xef8fa8), crumple(0.018, 40 + i), ex - 0.28 + (i % 4) * 0.07, 0.012, ez + 0.2 + Math.floor(i / 4) * 0.05);
  }

  // ── 5. word dice on the floor: roll them for a new story ──
  {
    const WORDS = [['noun', '#2a78d6'], ['verb', '#e8466b'], ['adjective', '#3fae5a'], ['a pickle', '#7fae3a'], ['DANCE!', '#eb6834'], ['magnetic', '#8f7ae8']];
    const faces = WORDS.map(([w, col]) => paint(0xffffff, { hatch: 0.3, unique: true, map: canvasTex(128, 128, (c, cw, ch) => {
      c.fillStyle = '#fffdf6'; c.fillRect(0, 0, cw, ch);
      c.strokeStyle = col; c.lineWidth = 8; c.strokeRect(6, 6, cw - 12, ch - 12);
      c.fillStyle = col; c.textAlign = 'center'; c.textBaseline = 'middle';
      let s = 44; do { c.font = `700 ${s}px ${HAND}`; s -= 2; } while (c.measureText(w).width > cw - 24);
      c.fillText(w, cw / 2, ch / 2);
    }) }));
    const dice = [[-0.95, -3.15, 0.3], [-1.38, -3.5, 1.1]].map(([x, z, ry]) => {
      solid(x, z, 0.19);
      const d = grp(x, 0.13, z);
      mesh(new THREE.BoxGeometry(0.26, 0.26, 0.26), faces, d);
      d.rotation.y = ry;
      return { d, x, z, from: new THREE.Euler(0, ry, 0), to: new THREE.Euler(0, ry, 0) };
    });
    let tRoll = -99;
    const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
    tap(dice[0].d, 'roll the word dice', (sfx) => {
      tRoll = now();
      for (const D of dice) { D.from.copy(D.d.rotation); D.to.set(Math.floor(Math.random() * 4) * HPI, D.d.rotation.y + (Math.random() - 0.5) * 1.5, Math.floor(Math.random() * 4) * HPI); }
      sfx([[300, 0.05], [500, 0.05], [350, 0.05], [600, 0.05], [420, 0.05], [800, 0.15]], 'triangle', 0.06);
    });
    dice[1].d.userData.toy = dice[0].d.userData.toy;
    live(() => {
      const k = now() - tRoll;
      dice.forEach((D, i) => {
        const kk = k - i * 0.08;
        if (kk < 0 || kk > 1.1) return;
        const u = Math.min(1, kk / 0.8);
        D.d.position.y = 0.13 + 4 * u * (1 - u) * 0.45 + (kk > 0.8 ? Math.abs(Math.sin((kk - 0.8) * 20)) * 0.03 * (1.1 - kk) * 3 : 0);
        q0.setFromEuler(D.from); q1.setFromEuler(D.to);
        // tumble an extra full turn on the way
        D.d.quaternion.slerpQuaternions(q0, q1, smooth(u));
        D.d.rotateX(Math.sin(u * Math.PI) * Math.PI);
      });
    });
  }

  // ── 6. the AI robot from the Turing test, back-right ──
  {
    const rx = 3.3, rz = -3.6;
    solid(rx, rz, 0.3);
    const RB = grp(rx, 0, rz); RB.rotation.y = -0.6;
    const steel = paint(0xa8b0c0), deep = paint(0x5a6070);
    const rbB = baker(THREE);
    for (const s of [-1, 1]) { rbB.add(deep, rb(0.1, 0.33, 0.11, 0.02), s * 0.1, 0.165 + 0.04, 0); rbB.add(deep, rb(0.15, 0.06, 0.18, 0.02), s * 0.1, 0.03, 0.025); }
    rbB.add(steel, rb(0.42, 0.42, 0.3, 0.05), 0, 0.55, 0);
    rbB.add(deep, new THREE.CylinderGeometry(0.045, 0.05, 0.06, 10), 0, 0.78, 0);
    rbB.flush(RB);
    mesh(new THREE.SphereGeometry(0.02, 8, 6), paint(0xe8604c, { hatch: 0 }), RB, -0.06, 0.4, 0.151);
    mesh(new THREE.SphereGeometry(0.02, 8, 6), paint(0x3fae5a, { hatch: 0 }), RB, 0.0, 0.4, 0.151);
    const scrTex = (txt) => canvasTex(128, 88, (c, w, h) => {
      c.fillStyle = '#5fc6ef'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(8, 8, w * 0.5, 10);
      c.fillStyle = '#123a5a'; c.font = `700 46px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, w / 2, h / 2 + 4);
    });
    const scrA = scrTex('AI'), scrQ = scrTex('?!'), scrM = new THREE.MeshBasicMaterial({ map: scrA });
    const scr = mesh(new THREE.PlaneGeometry(0.26, 0.17), scrM, RB, 0, 0.6, 0.152); scr.userData.noInk = true;
    const head = grp(0, 0.8, 0, RB);                         // the neck joint
    mesh(rb(0.32, 0.24, 0.26, 0.05), steel, head, 0, 0.13, 0);
    for (const s of [-1, 1]) {
      mesh(new THREE.CircleGeometry(0.04, 16), paint(0xffffff, { hatch: 0 }), head, s * 0.07, 0.14, 0.131).userData.noInk = true;
      mesh(new THREE.CircleGeometry(0.018, 12), dark, head, s * 0.07, 0.135, 0.133).userData.noInk = true;
      mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 10), deep, head, s * 0.17, 0.13, 0, [0, 0, HPI]);
    }
    mesh(rb(0.1, 0.018, 0.01, 0.005), dark, head, 0, 0.06, 0.132);
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.12, 6), deep, head, 0, 0.31, 0);
    const antM = paint(0xff4a3a, { emissive: 0xff3a2a, hatch: 0, unique: true });
    mesh(new THREE.SphereGeometry(0.028, 10, 8), antM, head, 0, 0.385, 0);
    const arms = [-1, 1].map(s => {
      const sh = grp(s * 0.235, 0.7, 0, RB);                 // shoulder joint
      mesh(new THREE.SphereGeometry(0.04, 10, 8), deep, sh);
      mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.28, 8).translate(0, -0.15, 0), steel, sh);
      mesh(new THREE.SphereGeometry(0.045, 10, 8), deep, sh, 0, -0.32, 0);
      return [sh, s];
    });
    let tBot = -99;
    tap(RB, 'say hi to the robot', (sfx) => { tBot = now(); sfx([[880, 0.08], [660, 0.08], [990, 0.08], [520, 0.1], [1320, 0.18]], 'square', 0.03); });
    live((t) => {
      const k = t - tBot, on = k >= 0 && k < 2.2;
      head.rotation.y = on ? smooth(k / 0.9) * Math.PI * 2 : Math.sin(t * 0.5) * 0.35;
      head.rotation.z = on ? 0 : Math.sin(t * 0.7) * 0.05;
      scrM.map = on && k < 1.8 ? scrQ : scrA;
      antM.emissiveIntensity = on ? ((k * 10) % 1 < 0.5 ? 1.6 : 0.2) : 0.4 + 0.5 * Math.max(0, Math.sin(t * 3));
      for (const [sh, s] of arms) {
        const wave = s > 0 ? Math.max(0, Math.sin(t * 0.4)) : 0;
        const idle = s * (0.12 + wave * (1.9 + Math.sin(t * 6) * 0.3));
        sh.rotation.z = on ? s * (2.4 + Math.sin(k * 14) * 0.25) * smooth(k / 0.3) * (1 - smooth((k - 1.8) / 0.4)) + idle * (1 - smooth(k / 0.3)) + idle * smooth((k - 1.8) / 0.4) : idle;
      }
      RB.position.y = on ? Math.abs(Math.sin(k * 7)) * 0.03 : 0;
    });
  }

  // ── 7. the dancing tree from the cartoons, a cardboard stand-up ──
  {
    const tx = 3.42, tz = -2.2;
    solid(tx, tz, 0.3);
    const T = grp(tx, 0, tz); T.rotation.y = -0.75;
    B.add(woodDk, rb(0.4, 0.05, 0.16, 0.01), tx, 0.025, tz, [0, -0.75, 0]);
    const dance = grp(0, 0.05, 0, T);                         // rocks on its foot
    const card = cutout(0.8, 1.45, 256, 464, (c, w, h) => {
      inkLine(c, 7);
      c.fillStyle = '#8a5a3a'; c.beginPath(); c.moveTo(w * 0.42, h); c.lineTo(w * 0.45, h * 0.5); c.lineTo(w * 0.55, h * 0.5); c.lineTo(w * 0.58, h); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(w * 0.47, h * 0.62); c.lineTo(w * 0.3, h * 0.52); c.stroke();
      c.fillStyle = '#6fbf5a'; c.beginPath(); c.arc(w / 2, h * 0.3, w * 0.42, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#5aa84a'; for (const [x, y] of [[0.32, 0.2], [0.7, 0.24], [0.4, 0.42]]) { c.beginPath(); c.arc(w * x, h * y, 14, 0, 7); c.fill(); }
      c.fillStyle = '#fff'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * 30, h * 0.27, 17, 0, 7); c.fill(); c.stroke(); }
      c.fillStyle = INKC; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * 30 + 4, h * 0.275, 8, 0, 7); c.fill(); }
      c.fillStyle = '#e8466b'; c.beginPath(); c.arc(w / 2, h * 0.34, 26, 0.1, Math.PI - 0.1); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(232,70,107,0.4)'; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * 62, h * 0.33, 12, 0, 7); c.fill(); }
    });
    card.position.y = 0.725; dance.add(card);
    mesh(rb(0.04, 0.85, 0.03, 0.008), paint(0xc9a06a), dance, 0, 0.42, -0.12, [0.28, 0, 0]);   // the strut behind
    const noteTex = canvasTex(64, 64, (c, w, h) => { c.fillStyle = INKC; c.font = `700 52px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('♪', w / 2, h / 2); });
    const notes = [0, 1, 2].map(() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: noteTex, transparent: true, depthWrite: false, opacity: 0 })); s.scale.setScalar(0.14); G.add(s); return s; });
    let tTree = -99;
    tap(T, 'make the tree dance', (sfx) => { tTree = now(); sfx([[523, 0.12], [659, 0.12], [784, 0.12], [659, 0.12], [523, 0.12], [784, 0.12], [1046, 0.25]], 'triangle', 0.06); });
    live((t) => {
      const k = t - tTree, on = k >= 0 && k < 3;
      const e = on ? smooth(k / 0.2) * (1 - smooth((k - 2.5) / 0.5)) : 0;
      dance.rotation.z = Math.sin(t * 1.1) * 0.04 + Math.sin(k * 9) * 0.22 * e;
      dance.position.y = 0.05 + Math.abs(Math.sin(k * 9)) * 0.07 * e;
      dance.scale.set(1 + Math.sin(k * 18) * 0.04 * e, 1 - Math.sin(k * 18) * 0.04 * e, 1);
      notes.forEach((s, i) => {
        const u = ((t * (on ? 0.8 : 0.25)) + i / 3) % 1;
        s.position.set(tx - 0.35 + Math.sin(u * 6 + i) * 0.1, 1.2 + u * 0.8, tz + 0.25 + i * 0.05);
        s.material.opacity = (on ? 1 : 0.55) * Math.sin(u * Math.PI);
      });
    });
  }

  // ── 8. a cardboard rocket on its pad, front-right: tap for lift-off ──
  {
    const kx = 3.05, kz = -0.55;
    solid(kx, kz, 0.3);
    B.add(paint(0x8a93a0), new THREE.CylinderGeometry(0.27, 0.3, 0.06, 18), kx, 0.03, kz);
    decal(0.5, 0.5, (c, w, h) => {
      c.fillStyle = '#f6c445'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 4, 0, 7); c.fill();
      c.fillStyle = INKC; for (let a = 0; a < 8; a++) { c.beginPath(); c.moveTo(w / 2, h / 2); c.arc(w / 2, h / 2, w / 2 - 4, a * Math.PI / 4, a * Math.PI / 4 + 0.35); c.fill(); }
      c.fillStyle = '#8a93a0'; c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, 7); c.fill();
    }, 128, 128, G, kx, 0.062, kz, [-HPI, 0, 0]);
    const R = grp(kx, 0.06, kz);
    const prof = [[0.001, 0], [0.08, 0], [0.12, 0.12], [0.125, 0.45], [0.1, 0.62]].map(([r, y]) => new THREE.Vector2(r, y));
    mesh(new THREE.LatheGeometry(prof, 18), paint(0xfffdf6, { hatch: 0.4 }), R, 0, 0.06, 0);
    mesh(new THREE.ConeGeometry(0.1, 0.26, 18), paint(0xe8466b), R, 0, 0.81, 0);
    const fb = baker(THREE), finM = paint(0xe8466b);
    for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3 + 0.5; fb.add(finM, rb(0.014, 0.2, 0.13, 0.005), Math.sin(a) * 0.14, 0.13, Math.cos(a) * 0.14, [0, a, 0.0]); }
    fb.add(dark, new THREE.CylinderGeometry(0.06, 0.08, 0.07, 12), 0, 0.03, 0);
    fb.flush(R);
    mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 16), paint(0x8a93a0), R, 0, 0.45, 0.115, [-0.08, 0, 0]);
    mesh(new THREE.CircleGeometry(0.042, 14), paint(0x5fc6ef, { hatch: 0 }), R, 0, 0.45, 0.116, [-0.08, 0, 0]).userData.noInk = true;
    const flameM = paint(0xffb84a, { emissive: 0xff8a2a, hatch: 0, unique: true });
    const flame = mesh(new THREE.ConeGeometry(0.065, 0.24, 10).rotateX(Math.PI).translate(0, -0.12, 0), flameM, R, 0, 0, 0); flame.userData.noInk = true;
    const smoke = [0, 1, 2, 3, 4, 5].map(() => { const s = new THREE.Sprite(puffMat(0xf4efe4)); s.scale.setScalar(0.2); G.add(s); return s; });
    let tLaunch = -99;
    tap(R, 'launch the rocket', (sfx) => { tLaunch = now(); sfx([[440, 0.12], [0, 0.25], [440, 0.12], [0, 0.25], [880, 0.2], [120, 0.6], [90, 0.8]], 'square', 0.03); });
    live((t) => {
      const k = t - tLaunch;
      let y = 0, burn = 0, shake = 0;
      if (k >= 0 && k < 5) {
        if (k < 0.9) { shake = k / 0.9; burn = k > 0.6 ? 0.5 : 0; }
        else if (k < 2.3) { const u = (k - 0.9) / 1.4; y = u * u * 1.45; burn = 1; }
        else if (k < 3.2) { y = 1.45 + Math.sin((k - 2.3) * 5) * 0.04; burn = 0.6; }
        else if (k < 4.6) { const u = (k - 3.2) / 1.4; y = 1.45 * (1 - smooth(u)); burn = 0.7; }
        else burn = 0;
      }
      R.position.set(kx + Math.sin(t * 60) * 0.006 * shake, 0.06 + y, kz);
      R.rotation.z = y > 0 ? Math.sin(k * 3) * 0.06 : 0;
      flame.visible = burn > 0; flame.scale.set(1, burn * (0.8 + Math.sin(t * 40) * 0.2), 1); flameM.emissiveIntensity = 1.2;
      smoke.forEach((s, i) => {
        const kk = k - 0.6 - i * 0.18;
        if (kk < 0 || kk > 2.2 || k > 5) { s.material.opacity = 0; return; }
        const a = i * 2.4;
        s.position.set(kx + Math.cos(a) * (0.15 + kk * 0.2), 0.12 + kk * 0.12, kz + Math.sin(a) * (0.12 + kk * 0.15));
        s.scale.setScalar(0.18 + kk * 0.22); s.material.opacity = 0.85 * (1 - kk / 2.2);
      });
    });
  }

  // ── 9. KA-BOOM! on the west wall: tap it and it goes off ──
  {
    const KB = grp(-3.97, 1.52, -1.95); KB.rotation.y = HPI;
    const burst = cutout(0.95, 0.62, 300, 196, (c, w, h) => {
      c.beginPath();
      for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2, r = i % 2 ? 0.62 : 1; c.lineTo(w / 2 + Math.cos(a) * (w / 2 - 6) * r, h / 2 + Math.sin(a) * (h / 2 - 6) * r); }
      c.closePath(); c.fillStyle = '#ffe24a'; c.fill(); inkLine(c, 6); c.stroke();
      c.font = `700 64px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = 10; c.strokeStyle = '#fff'; c.strokeText('KA-BOOM!', w / 2, h / 2 + 4);
      c.fillStyle = '#e8463a'; c.fillText('KA-BOOM!', w / 2, h / 2 + 4);
    });
    burst.position.z = 0.01; burst.renderOrder = 2; KB.add(burst);
    const stars = [0, 1, 2, 3, 4, 5].map(() => { const s = new THREE.Sprite(puffMat(0xffe24a)); s.scale.setScalar(0.1); G.add(s); return s; });
    let tBoom = -99;
    tap(KB, 'set off the KA-BOOM', (sfx) => { tBoom = now(); sfx([[110, 0.1], [70, 0.4], [55, 0.5]], 'square', 0.06); });
    live((t) => {
      const k = t - tBoom, on = k >= 0 && k < 1.2;
      const pop = on ? (k < 0.12 ? 1 + k / 0.12 * 0.45 : 1 + 0.45 * Math.exp(-(k - 0.12) * 6) * Math.cos((k - 0.12) * 20)) : 1 + Math.sin(t * 2) * 0.015;
      KB.scale.setScalar(pop);
      KB.rotation.x = on ? Math.sin(k * 40) * 0.05 * (1 - k / 1.2) : 0;
      stars.forEach((s, i) => {
        const a = i * 1.05;
        if (!on) { s.material.opacity = 0; return; }
        s.position.set(-3.85 + k * 0.3, 1.52 + Math.sin(a) * (0.3 + k * 0.5), -1.95 + Math.cos(a) * (0.45 + k * 0.6));
        s.material.opacity = 1 - k / 1.2;
      });
    });
  }

  // ── 10. doodles pegged on a clothesline along the west wall, fluttering ──
  {
    const z0 = -4.6, z1 = -0.55, y0 = 2.36, sagD = 0.14, wx = -3.93;
    const cv = new THREE.CatmullRomCurve3([new THREE.Vector3(wx, y0, z0), new THREE.Vector3(wx, y0 - sagD, (z0 + z1) / 2), new THREE.Vector3(wx, y0, z1)]);
    const line = mesh(new THREE.TubeGeometry(cv, 24, 0.005, 4), dark, G); line.userData.noInk = true;
    for (const z of [z0, z1]) B.add(dark, new THREE.CylinderGeometry(0.012, 0.012, 0.05, 6), wx - 0.02, y0, z, [0, 0, HPI]);
    const DRAW = [
      (c, w, h) => { c.fillStyle = '#e8463a'; c.beginPath(); c.ellipse(w * 0.5, h * 0.6, 40, 24, 0, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.arc(w * 0.8, h * 0.4, 16, 0, 7); c.fill(); c.stroke(); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(w * 0.3 + i * 14, h * 0.45); c.lineTo(w * 0.34 + i * 14, h * 0.3); c.lineTo(w * 0.38 + i * 14, h * 0.45); c.fillStyle = '#f6a53b'; c.fill(); c.stroke(); } c.beginPath(); c.moveTo(w * 0.3, h * 0.8); c.lineTo(w * 0.3, h * 0.92); c.moveTo(w * 0.6, h * 0.8); c.lineTo(w * 0.6, h * 0.92); c.stroke(); },
      (c, w, h) => { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(w / 2, h * 0.15); c.quadraticCurveTo(w * 0.75, h * 0.45, w * 0.65, h * 0.8); c.lineTo(w * 0.35, h * 0.8); c.quadraticCurveTo(w * 0.25, h * 0.45, w / 2, h * 0.15); c.fill(); c.stroke(); c.fillStyle = '#5fc6ef'; c.beginPath(); c.arc(w / 2, h * 0.45, 11, 0, 7); c.fill(); c.stroke(); c.fillStyle = '#e8463a'; c.beginPath(); c.moveTo(w * 0.4, h * 0.8); c.lineTo(w / 2, h * 0.95); c.lineTo(w * 0.6, h * 0.8); c.fill(); },
      (c, w, h) => { c.fillStyle = '#ffe24a'; c.beginPath(); c.arc(w / 2, h / 2, 30, 0, 7); c.fill(); c.stroke(); for (let a = 0; a < 6.28; a += 0.785) { c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 38, h / 2 + Math.sin(a) * 38); c.lineTo(w / 2 + Math.cos(a) * 52, h / 2 + Math.sin(a) * 52); c.stroke(); } },
      (c, w, h) => { c.beginPath(); c.arc(w / 2, h * 0.25, 13, 0, 7); c.stroke(); c.beginPath(); c.moveTo(w / 2, h * 0.33); c.lineTo(w / 2, h * 0.65); c.lineTo(w * 0.35, h * 0.9); c.moveTo(w / 2, h * 0.65); c.lineTo(w * 0.65, h * 0.9); c.moveTo(w / 2, h * 0.42); c.lineTo(w * 0.3, h * 0.3); c.moveTo(w / 2, h * 0.42); c.lineTo(w * 0.72, h * 0.3); c.stroke(); c.font = `700 22px ${HAND}`; c.fillStyle = '#e8466b'; c.fillText('♪', w * 0.75, h * 0.2); },
      (c, w, h) => { c.font = `700 70px ${HAND}`; c.fillStyle = '#e8466b'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', w / 2, h / 2); },
      (c, w, h) => { c.fillStyle = '#fff'; for (const [x, y, r] of [[0.35, 0.55, 22], [0.55, 0.45, 28], [0.72, 0.58, 20]]) { c.beginPath(); c.arc(w * x, h * y, r, 0, 7); c.fill(); c.stroke(); } c.fillStyle = '#fff'; c.fillRect(w * 0.3, h * 0.55, w * 0.45, 18); },
      (c, w, h) => { c.font = `700 30px ${HAND}`; c.fillStyle = '#2a78d6'; c.textAlign = 'center'; c.fillText('zap!', w / 2, h * 0.4); c.strokeStyle = '#f6c445'; c.lineWidth = 6; c.beginPath(); c.moveTo(w * 0.4, h * 0.5); c.lineTo(w * 0.6, h * 0.62); c.lineTo(w * 0.42, h * 0.72); c.lineTo(w * 0.62, h * 0.9); c.stroke(); },
    ];
    const pinM = paint(0xc9a06a);
    const pages = DRAW.map((draw, i) => {
      const z = z0 + 0.35 + i * (z1 - z0 - 0.6) / (DRAW.length - 1);
      const p = cv.getPoint((z - z0) / (z1 - z0));
      const P = grp(wx + 0.01, p.y, z);                       // hinged at its peg on the line
      const pg = mesh(new THREE.PlaneGeometry(0.26, 0.34).translate(0, -0.17, 0), texMat(130, 170, (c, w, h) => {
        c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(76,155,232,0.35)'; c.lineWidth = 1.5; for (let y = 20; y < h; y += 14) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
        inkLine(c, 3); draw(c, w, h);
      }), P, 0, 0, 0, [0, HPI, 0]);
      pg.userData.noInk = true; pg.material.side = THREE.DoubleSide;
      mesh(rb(0.02, 0.07, 0.018, 0.005), pinM, P, 0.008, -0.01, 0);
      return [P, i];
    });
    live((t) => { for (const [P, i] of pages) P.rotation.z = 0.06 + 0.05 * Math.sin(t * 1.3 + i * 0.9) + 0.03 * Math.sin(t * 3.1 + i); });
  }

  // ── 11. the east wall: a parts-of-speech poster, sticky notes, and a pennant string ──
  decal(0.8, 0.62, (c, w, h) => {
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); inkLine(c, 6); c.strokeRect(4, 4, w - 8, h - 8);
    c.font = `700 34px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('fill in the blank!', w / 2, 42);
    [['NOUN', 'a thing → a doodle', '#2a78d6'], ['VERB', 'an action → it moves', '#e8466b'], ['ADJECTIVE', 'a look → it changes', '#3fae5a']].forEach(([a, b, col], i) => {
      const y = 80 + i * 56;
      c.fillStyle = col; c.beginPath(); c.roundRect(24, y, 120, 38, 10); c.fill();
      c.fillStyle = '#fff'; c.font = `700 20px ${HAND}`; c.fillText(a, 84, y + 26);
      c.fillStyle = INKC; c.font = `400 20px ${HAND}`; c.textAlign = 'left'; c.fillText(b, 158, y + 26); c.textAlign = 'center';
    });
  }, 320, 248, G, 3.975, 1.55, -1.15, [0, -HPI, 0]);
  {
    const notes = [];
    const NOTE = [['banana', '#ffe26a'], ['tickle', '#ffb0c8'], ['sparkly', '#b8f0b0'], ['lava', '#ffd27a'], ['moonwalk', '#bfe0f0'], ['DOUGH', '#ffe26a']];
    NOTE.forEach(([w, col], i) => {
      const z = -4.3 + (i % 3) * 0.26, y = 1.85 - Math.floor(i / 3) * 0.28;
      const N = grp(3.965, y, z);                                 // stuck on along its top edge
      const m = mesh(new THREE.PlaneGeometry(0.22, 0.22).translate(0, -0.11, 0), texMat(96, 96, (c, cw, ch) => {
        c.fillStyle = col; c.fillRect(0, 0, cw, ch); c.fillStyle = 'rgba(0,0,0,0.08)'; c.fillRect(0, 0, cw, 14);
        c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle';
        let s = 30; do { c.font = `700 ${s}px ${HAND}`; s -= 2; } while (c.measureText(w).width > cw - 12);
        c.fillText(w, cw / 2, ch / 2 + 6);
      }), N, 0, 0, 0, [0, -HPI, 0]);
      m.userData.noInk = true; m.material.side = THREE.DoubleSide;
      N.rotation.y = (i % 2 ? 0.04 : -0.05);
      notes.push([N, i]);
    });
    live((t) => { for (const [N, i] of notes) N.rotation.z = -(0.04 + 0.06 * Math.max(0, Math.sin(t * 0.9 + i * 1.7))); });
    decal(0.5, 0.12, (c, w, h) => { c.font = `700 34px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('word bank', w / 2, h / 2); }, 200, 48, G, 3.975, 2.08, -4.04, [0, -HPI, 0]);
    // pennants spelling it out along the top of the east wall
    const word = 'DOODLE LIBS'.replace(' ', ''), cols = ['#e8466b', '#2a78d6', '#f6c445', '#3fae5a', '#8f7ae8'];
    const pz0 = -4.8, pz1 = -0.6, py = 2.5;
    const pc = new THREE.CatmullRomCurve3([new THREE.Vector3(3.94, py, pz0), new THREE.Vector3(3.94, py - 0.18, (pz0 + pz1) / 2), new THREE.Vector3(3.94, py, pz1)]);
    const pl = mesh(new THREE.TubeGeometry(pc, 24, 0.005, 4), dark, G); pl.userData.noInk = true;
    const flags = [];
    [...word].forEach((ch, i) => {
      const u = (i + 0.5) / word.length, p = pc.getPoint(u);
      const F = grp(3.935, p.y, p.z);
      const f = mesh(new THREE.PlaneGeometry(0.24, 0.3).translate(0, -0.15, 0), texMat(80, 100, (c, w, h) => {
        c.fillStyle = cols[i % cols.length]; c.beginPath(); c.moveTo(2, 2); c.lineTo(w - 2, 2); c.lineTo(w / 2, h - 2); c.closePath(); c.fill(); inkLine(c, 3); c.stroke();
        c.fillStyle = '#fff'; c.font = `700 40px ${HAND}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(ch, w / 2, h * 0.36);
      }), F, 0, 0, 0, [0, -HPI, 0]);
      f.userData.noInk = true; f.material.side = THREE.DoubleSide;
      flags.push([F, i]);
    });
    live((t) => { for (const [F, i] of flags) F.rotation.z = -(0.05 + 0.05 * Math.sin(t * 1.6 + i * 0.7)); });
  }

  // ── 12. paper clouds and a sun hanging in the back corners, and a paper plane looping ──
  {
    const strM = paint(0x2a2230, { hatch: 0 });
    const hang = (x, y, z, len, obj) => {
      const P = grp(x, 2.7, z);                               // hung from the top edge of the wall
      B.add(strM, new THREE.CylinderGeometry(0.003, 0.003, 2.7 - y, 4), x, (2.7 + y) / 2, z);
      obj.position.set(0, y - 2.7 - len / 2, 0); P.add(obj); return P;
    };
    const cloud = (w) => cutout(w, w * 0.55, 200, 110, (c, cw, ch) => {
      c.fillStyle = '#fff'; inkLine(c, 6);
      c.beginPath(); c.arc(cw * 0.3, ch * 0.62, 30, Math.PI * 0.5, Math.PI * 1.5); c.arc(cw * 0.45, ch * 0.38, 34, Math.PI, Math.PI * 1.9); c.arc(cw * 0.68, ch * 0.45, 30, Math.PI * 1.3, Math.PI * 0.4); c.closePath(); c.fill(); c.stroke();
    });
    const sun = cutout(0.5, 0.5, 160, 160, (c, w, h) => {
      inkLine(c, 6); c.fillStyle = '#ffe24a';
      for (let a = 0; a < 6.28; a += 0.524) { c.beginPath(); c.moveTo(w / 2 + Math.cos(a) * 52, h / 2 + Math.sin(a) * 52); c.lineTo(w / 2 + Math.cos(a) * 74, h / 2 + Math.sin(a) * 74); c.stroke(); }
      c.beginPath(); c.arc(w / 2, h / 2, 46, 0, 7); c.fill(); c.stroke();
      c.fillStyle = INKC; for (const s of [-1, 1]) { c.beginPath(); c.arc(w / 2 + s * 15, h / 2 - 6, 5, 0, 7); c.fill(); }
      c.beginPath(); c.arc(w / 2, h / 2 + 4, 18, 0.2, Math.PI - 0.2); c.stroke();
    });
    const hs = [hang(3.25, 2.25, -5.3, 0.5, sun), hang(-2.55, 2.32, -5.32, 0.33, cloud(0.6)), hang(-3.45, 2.12, -5.3, 0.27, cloud(0.5)), hang(2.45, 2.45, -5.34, 0.22, cloud(0.4))];
    live((t) => {
      sun.rotation.z = t * 0.25;
      hs.forEach((P, i) => { P.rotation.z = Math.sin(t * 0.7 + i * 1.3) * 0.04; P.position.y = 2.7 + Math.sin(t * 1.1 + i) * 0.015; });
    });
    // the paper plane: a nose, two wings and a keel, folded from one sheet
    const pg = new THREE.BufferGeometry();
    const v = [0, 0, 0.2, -0.13, 0.01, -0.1, 0, 0, -0.1, 0, 0, 0.2, 0, 0, -0.1, 0.13, 0.01, -0.1, 0, 0, 0.2, 0, -0.045, -0.1, 0, 0, -0.1];
    pg.setAttribute('position', new THREE.Float32BufferAttribute(v, 3)); pg.computeVertexNormals();
    const plane = grp(0, 2.2, -2.6);
    mesh(pg, paint(0xfffdf6, { side: THREE.DoubleSide, hatch: 0.2 }), plane);
    live((t) => {
      const a = t * 0.45;
      const x = Math.sin(a) * 2.5, z = -2.75 + Math.cos(a) * 1.5, dx = Math.cos(a) * 2.5, dz = -Math.sin(a) * 1.5;
      plane.position.set(x, 2.3 + Math.sin(a * 2) * 0.12, z);
      plane.rotation.set(0, Math.atan2(dx, dz), 0);
      plane.rotateZ(-0.35 + Math.sin(a * 2) * 0.1);
      plane.rotateX(-Math.cos(a * 2) * 0.12);
    });
  }

  // ── 13. a fill-in-the-blank written across the floor ──
  decal(3.0, 1.5, (c, w, h) => {
    c.strokeStyle = 'rgba(42,34,48,0.55)'; c.fillStyle = 'rgba(42,34,48,0.55)'; c.lineWidth = 5; c.lineCap = 'round';
    c.font = `700 70px ${HAND}`; c.textAlign = 'left';
    c.fillText('The', 40, 120); c.beginPath(); c.moveTo(190, 124); c.lineTo(470, 124); c.stroke();
    c.fillText('began to', 500, 120);
    c.fillStyle = 'rgba(232,70,107,0.75)'; c.font = `700 84px ${HAND}`; c.fillText('DANCE!', 300, 240);
    c.fillStyle = 'rgba(42,34,48,0.45)'; c.font = `400 34px ${HAND}`; c.fillText('(noun)', 280, 168);
    c.strokeStyle = 'rgba(42,118,214,0.5)'; c.beginPath(); for (let a = 0; a < 14; a += 0.2) c.lineTo(110 + Math.cos(a) * a * 3, 240 + Math.sin(a) * a * 3); c.stroke();
    c.strokeStyle = 'rgba(246,196,69,0.8)'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = i * Math.PI / 5 - HPI, r = i % 2 ? 18 : 42; c.lineTo(690 + Math.cos(a) * r, 240 + Math.sin(a) * r); } c.closePath(); c.stroke();
  }, 800, 300, G, 0.9, 0.018, -2.55, [-HPI, 0, 0.08]);

  B.flush(G);
}
