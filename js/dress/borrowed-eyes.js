// ─── dressing for the borrowed-eyes room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// A field station in the forest: a naturalist's camp table under a field-notes board,
// a weather mast, a hollow log with something looking out, a hive, a trail camera,
// a birdhouse, glow-cap mushrooms, ultraviolet flowers and fairy lights in the canopy.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// static pieces that share a material get baked into one mesh (one draw, one outline)
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
  const { THREE, g: G, paint, PAL, tap, live, free, claim, rb, canvasTex, texMat, HAND, SCRIPT, INKC, now } = K;
  const B = baker(THREE);
  const grp = (x = 0, y = 0, z = 0, parent = G) => { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; };
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, rot) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m); return m;
  };
  const solid = (x, z, r) => { if (!free(x, z, r)) console.error('[borrowed-eyes] crowded spot', x, z, r); claim(x, z, r); };
  const smooth = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };
  const glowTex = canvasTex(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 1, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,235,1)'); g.addColorStop(0.3, 'rgba(255,240,170,0.7)'); g.addColorStop(1, 'rgba(255,220,120,0)');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
  });
  const glow = (col, s, parent = G) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    sp.scale.setScalar(s); parent.add(sp); return sp;
  };

  const wood = paint(0x9a7a56), woodDk = paint(0x6e5238), metal = paint(0x8a93a0), dark = paint(0x2a2230, { hatch: 0 });
  const canvasCol = paint(0xc9b88a), brass = paint(PAL.gold), moss = paint(0x6f9a4c, { hatch: 0.5 });

  // ── 1. the naturalist's camp table, back-left, under the field-notes board ──
  const TX = -2.55, TZ = -3.95, TOP = 0.745;
  solid(TX, TZ, 0.52);
  B.add(wood, rb(1.0, 0.05, 0.55, 0.015), TX, 0.72, TZ);
  for (const [dx, dz] of [[-0.45, -0.22], [0.45, -0.22], [-0.45, 0.22], [0.45, 0.22]]) B.add(woodDk, rb(0.045, 0.7, 0.045, 0.01), TX + dx, 0.35, TZ + dz);
  B.add(woodDk, rb(0.9, 0.03, 0.03, 0.008), TX, 0.18, TZ - 0.22);                  // a stretcher between the back legs
  // the open field notebook, a compound eye sketched across both pages
  B.add(paint(0x4a6a52), rb(0.36, 0.012, 0.25, 0.004), TX - 0.3, TOP + 0.006, TZ + 0.06, [0, 0.18, 0]);
  const pages = mesh(new THREE.PlaneGeometry(0.34, 0.23), texMat(256, 174, (c, w, h) => {
    c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 2; c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.stroke();
    c.strokeStyle = 'rgba(76,155,232,0.35)'; c.lineWidth = 1;
    for (let y = 22; y < h; y += 16) { c.beginPath(); c.moveTo(6, y); c.lineTo(w - 6, y); c.stroke(); }
    c.strokeStyle = INKC; c.lineWidth = 1.6;                        // hexagon facets of a bee's eye
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const cx = 30 + i * 18 + (j % 2) * 9, cy = 42 + j * 16;
      c.beginPath(); for (let k = 0; k < 7; k++) { const a = k * Math.PI / 3; c.lineTo(cx + Math.cos(a) * 9, cy + Math.sin(a) * 9); } c.stroke();
    }
    c.font = `700 18px ${HAND}`; c.fillStyle = INKC; c.fillText('bee: 6,900 eyes!', 14, 22);
    c.beginPath(); c.ellipse(w * 0.75, h * 0.42, 40, 26, 0, 0, 7); c.stroke();     // an owl's tube eye
    c.beginPath(); c.arc(w * 0.75, h * 0.42, 14, 0, 7); c.fillStyle = '#e4b84f'; c.fill(); c.stroke();
    c.beginPath(); c.arc(w * 0.75, h * 0.42, 7, 0, 7); c.fillStyle = INKC; c.fill();
    c.font = `700 17px ${HAND}`; c.fillText('owl: tubes, not balls', w / 2 + 10, h - 30);
  }), G, TX - 0.3, TOP + 0.014, TZ + 0.06, [-Math.PI / 2, 0, 0.18]);
  pages.rotation.order = 'YXZ'; pages.rotation.set(-Math.PI / 2, 0.18, 0);
  pages.userData.noInk = true;
  // a pencil across the notebook
  B.add(paint(0xf6c445), new THREE.CylinderGeometry(0.007, 0.007, 0.17, 6), TX - 0.22, TOP + 0.02, TZ + 0.16, [0, 0.4, Math.PI / 2]);
  // specimen jars: a leaf, a beetle, a red feather
  const glass = paint(0xdff0f6, { opacity: 0.32, hatch: 0 });
  [[0x6fae66, 'leaf'], [0x3f5aa8, 'beetle'], [0xe8604c, 'feather']].forEach(([col, kind], i) => {
    const jx = TX + 0.24 + i * 0.105, jz = TZ - 0.16;
    mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.15, 14), glass, G, jx, TOP + 0.075, jz).userData.noInk = true;
    B.add(paint(0xb48a62), new THREE.CylinderGeometry(0.052, 0.052, 0.03, 14), jx, TOP + 0.165, jz);
    const geo = kind === 'leaf' ? new THREE.SphereGeometry(0.03, 8, 6).scale(0.5, 1.4, 0.2) : kind === 'beetle' ? new THREE.SphereGeometry(0.025, 8, 6).scale(1, 0.7, 1.3) : new THREE.ConeGeometry(0.014, 0.1, 6).scale(1, 1, 0.3);
    B.add(paint(col), geo, jx, TOP + 0.06, jz, [0, i, 0.2]);
  });
  // a magnifying glass and binoculars
  B.add(brass, new THREE.TorusGeometry(0.045, 0.008, 6, 18), TX + 0.16, TOP + 0.008, TZ + 0.13, [Math.PI / 2, 0, 0]);
  mesh(new THREE.CircleGeometry(0.042, 16), paint(0xcfe6ef, { opacity: 0.45, hatch: 0 }), G, TX + 0.16, TOP + 0.009, TZ + 0.13, [-Math.PI / 2, 0, 0]).userData.noInk = true;
  B.add(woodDk, new THREE.CylinderGeometry(0.01, 0.012, 0.09, 6), TX + 0.16, TOP + 0.008, TZ + 0.21, [Math.PI / 2, 0, 0.5]);
  for (const s of [-1, 1]) B.add(dark, new THREE.CylinderGeometry(0.024, 0.028, 0.1, 10), TX + 0.37 + s * 0.032, TOP + 0.028, TZ + 0.13, [Math.PI / 2, 0, 0]);
  B.add(dark, rb(0.04, 0.02, 0.04, 0.006), TX + 0.37, TOP + 0.03, TZ + 0.13);
  // the microscope: tap it and the stage lights up while the tube racks down to focus
  const MS = grp(TX - 0.04, TOP, TZ - 0.1); MS.rotation.y = 0.35;
  const msBody = paint(0x3f5872);
  mesh(rb(0.16, 0.03, 0.2, 0.01), msBody, MS, 0, 0.015, 0);
  mesh(rb(0.035, 0.24, 0.04, 0.008), msBody, MS, 0, 0.14, -0.07);
  mesh(rb(0.13, 0.014, 0.11, 0.004), dark, MS, 0, 0.1, 0.0);
  const stageMat = paint(0xfff1c8, { emissive: 0xfff1a0, hatch: 0, unique: true }); stageMat.emissiveIntensity = 0.2;
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.006, 12), stageMat, MS, 0, 0.109, 0.0).userData.noInk = true;
  mesh(rb(0.06, 0.004, 0.025, 0.001), paint(0xdff0f6, { hatch: 0 }), MS, 0, 0.11, 0.02).userData.noInk = true;   // the slide
  const tubeG = grp(0, 0.25, -0.045, MS); tubeG.rotation.x = -0.35;                     // pivot where the tube clamps to the arm
  mesh(rb(0.04, 0.035, 0.07, 0.008), msBody, MS, 0, 0.245, -0.06);
  mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.16, 12), msBody, tubeG, 0, 0.0, 0.035);
  mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 10), metal, tubeG, 0, -0.1, 0.035);
  mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.035, 10), dark, tubeG, 0, 0.095, 0.035);
  const knob = mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.075, 12), metal, MS, 0, 0.17, -0.07, [0, 0, Math.PI / 2]);
  let tScope = -99;
  tap(MS, 'peek through the microscope', (sfx) => { tScope = now(); sfx([[392, 0.08], [523, 0.08], [784, 0.25]], 'sine', 0.06); });
  live((t) => {
    const k = t - tScope, on = k >= 0 && k < 2.6;
    const u = on ? Math.sin(Math.min(1, k / 2.6) * Math.PI) : 0;
    tubeG.position.y = 0.25 - u * 0.025 + (on ? Math.sin(k * 9) * 0.004 * u : 0);
    knob.rotation.x = on ? k * 6 * (1 - k / 2.6) : knob.rotation.x;
    stageMat.emissiveIntensity = 0.2 + u * 1.6;
  });
  // a folding camp stool beside the table
  {
    const sx = TX + 0.15, sz = TZ + 0.75;
    solid(sx, sz, 0.2);
    for (const s of [-1, 1]) for (const r of [-1, 1]) B.add(woodDk, rb(0.03, 0.52, 0.03, 0.008), sx + s * 0.13, 0.23, sz, [r * 0.42, 0, 0]);
    B.add(canvasCol, rb(0.32, 0.03, 0.3, 0.01), sx, 0.45, sz);
    // a field guide left on the seat
    B.add(paint(0xe8604c), rb(0.15, 0.03, 0.2, 0.006), sx + 0.02, 0.48, sz, [0, 0.3, 0]);
  }
  // a butterfly net leaning on the end of the table
  {
    const ng = grp(TX + 0.72, 0, TZ + 0.18); ng.rotation.z = 0.3;
    mesh(new THREE.CylinderGeometry(0.012, 0.014, 1.25, 8), wood, ng, 0, 0.625, 0);
    const hoop = grp(0, 1.25, 0, ng);
    mesh(new THREE.TorusGeometry(0.13, 0.01, 6, 22), metal, hoop, 0, 0.13, 0, [0, Math.PI / 2, 0]);
    mesh(new THREE.ConeGeometry(0.125, 0.3, 14, 1, true).rotateX(Math.PI / 2).translate(0, 0.13, 0.15), paint(0xffffff, { opacity: 0.4, hatch: 0, side: THREE.DoubleSide }), hoop, 0, 0, 0, [0, Math.PI / 2, 0]).userData.noInk = true;
  }
  // a rucksack slumped against the front leg
  B.add(paint(0x8a6a3a), rb(0.3, 0.36, 0.18, 0.07), TX - 0.72, 0.18, TZ + 0.47, [0.0, 0.5, 0.0]);
  B.add(paint(0x6e5238), rb(0.31, 0.12, 0.2, 0.04), TX - 0.71, 0.33, TZ + 0.48, [0.2, 0.5, 0.0]);
  solid(TX - 0.72, TZ + 0.47, 0.15);

  // ── 2. the field-notes board on the west wall, above the table ──
  {
    const bz = -4.1, by = 1.58, bw = 1.15, bh = 0.72;
    const board = mesh(new THREE.PlaneGeometry(bw, bh), texMat(460, 288, (c, w, h) => {
      c.fillStyle = '#c69a62'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 500; i++) { c.fillStyle = `rgba(${90 + (i % 5) * 20},60,30,0.25)`; c.fillRect((i * 97) % w, (i * 53) % h, 2, 2); }
      const pol = (x, y, rot, draw, cap) => {
        c.save(); c.translate(x, y); c.rotate(rot);
        c.fillStyle = '#fbf6ea'; c.fillRect(-46, -50, 92, 104); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.strokeRect(-46, -50, 92, 104);
        c.save(); c.beginPath(); c.rect(-40, -44, 80, 74); c.clip(); draw(c); c.restore();
        c.font = `700 15px ${HAND}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText(cap, 0, 47);
        c.fillStyle = '#e8604c'; c.beginPath(); c.arc(0, -46, 6, 0, 7); c.fill();
        c.restore();
      };
      pol(70, 80, -0.08, (c) => { c.fillStyle = '#e4b84f'; c.fillRect(-40, -44, 80, 74); c.strokeStyle = '#2a2230'; c.lineWidth = 1.5; for (let i = -3; i < 4; i++) for (let j = -3; j < 3; j++) { c.beginPath(); c.arc(i * 12 + (j % 2) * 6, j * 11, 6, 0, 7); c.stroke(); } }, 'bee, UV');
      pol(180, 72, 0.06, (c) => { const g = c.createRadialGradient(0, -6, 4, 0, -6, 44); g.addColorStop(0, '#fff36a'); g.addColorStop(0.4, '#e8604c'); g.addColorStop(1, '#3a2a7a'); c.fillStyle = g; c.fillRect(-40, -44, 80, 74); }, 'viper, heat');
      pol(292, 84, -0.04, (c) => { c.fillStyle = '#1e2a3a'; c.fillRect(-40, -44, 80, 74); c.fillStyle = '#e4b84f'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 15, -8, 11, 0, 7); c.fill(); } c.fillStyle = '#111'; for (const s of [-1, 1]) { c.beginPath(); c.arc(s * 15, -8, 5, 0, 7); c.fill(); } }, 'owl, night');
      pol(400, 78, 0.09, (c) => { c.fillStyle = '#d8d8d8'; c.fillRect(-40, -44, 80, 74); c.strokeStyle = '#333'; c.lineWidth = 2; for (let r = 8; r < 50; r += 10) { c.beginPath(); c.arc(-30, -10, r, -0.7, 0.7); c.stroke(); } }, 'bat, echo');
      // a hand-drawn trail map with a red dotted route
      c.save(); c.translate(150, 205); c.rotate(-0.03);
      c.fillStyle = '#efe3c4'; c.fillRect(-120, -55, 240, 110); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.strokeRect(-120, -55, 240, 110);
      c.strokeStyle = '#7fb8c0'; c.lineWidth = 5; c.beginPath(); c.moveTo(-110, 30); c.bezierCurveTo(-60, -10, 0, 50, 110, 0); c.stroke();
      c.fillStyle = '#5e9d5e'; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-90 + i * 22, -10 - (i % 3) * 8); c.lineTo(-82 + i * 22, -30 - (i % 3) * 8); c.lineTo(-74 + i * 22, -10 - (i % 3) * 8); c.fill(); }
      c.strokeStyle = '#e8604c'; c.lineWidth = 3; c.setLineDash([6, 6]); c.beginPath(); c.moveTo(-100, 40); c.lineTo(-30, 20); c.lineTo(40, 30); c.lineTo(90, -30); c.stroke(); c.setLineDash([]);
      c.font = `700 26px ${HAND}`; c.fillStyle = '#e8604c'; c.fillText('✕', 82, -22);
      c.restore();
      c.font = `700 30px ${SCRIPT}`; c.fillStyle = INKC; c.fillText('14 to find!', 300, 205);
      c.font = `400 18px ${HAND}`; c.fillText('✓ cow   ✓ bee', 304, 232); c.fillText('□ fox   □ owl', 304, 254);
    }), G, -3.975, by, bz, [0, Math.PI / 2, 0]);
    board.userData.noInk = true; board.renderOrder = 2;
    const fw = paint(0x7a5a40);
    B.add(fw, rb(0.04, 0.05, bw + 0.08, 0.01), -3.97, by + bh / 2 + 0.02, bz);
    B.add(fw, rb(0.04, 0.05, bw + 0.08, 0.01), -3.97, by - bh / 2 - 0.02, bz);
    for (const s of [-1, 1]) B.add(fw, rb(0.04, bh, 0.05, 0.01), -3.97, by, bz + s * (bw / 2 + 0.02));
  }
  // ── 3. the east wall: who sees what, a spectrum chart ──
  {
    const cz = -3.75, cy = 1.5, cw = 0.95, ch = 0.66;
    const chart = mesh(new THREE.PlaneGeometry(cw, ch), texMat(380, 264, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
      c.strokeStyle = INKC; c.lineWidth = 5; c.strokeRect(3, 3, w - 6, h - 6);
      c.font = `700 30px ${SCRIPT}`; c.fillStyle = INKC; c.textAlign = 'center'; c.fillText('who sees what?', w / 2, 38);
      const rows = [['you', 0.22, 0.78, ['#8f3ae8', '#2a78d6', '#3fae5a', '#f6c445', '#e8604c']], ['bee', 0.06, 0.66, ['#c06aff', '#8f3ae8', '#2a78d6', '#3fae5a']], ['viper', 0.3, 0.98, ['#2a78d6', '#3fae5a', '#e8604c', '#ff3a1a']], ['owl', 0.3, 0.7, ['#555', '#888', '#aaa']]];
      rows.forEach(([who, a, b, cols], i) => {
        const y = 62 + i * 46, x0 = 80, x1 = w - 20, L = x1 - x0;
        c.font = `700 20px ${HAND}`; c.textAlign = 'right'; c.fillStyle = INKC; c.fillText(who, x0 - 10, y + 22);
        const g = c.createLinearGradient(x0 + a * L, 0, x0 + b * L, 0); cols.forEach((cc, k) => g.addColorStop(k / (cols.length - 1), cc));
        c.fillStyle = g; c.beginPath(); c.roundRect(x0 + a * L, y + 6, (b - a) * L, 22, 9); c.fill(); c.lineWidth = 2.5; c.stroke();
      });
      c.font = `400 16px ${HAND}`; c.textAlign = 'left'; c.fillStyle = '#5a4e5e'; c.fillText('ultraviolet', 82, h - 14); c.textAlign = 'right'; c.fillText('heat', w - 22, h - 14);
    }), G, 3.975, cy, cz, [0, -Math.PI / 2, 0]);
    chart.userData.noInk = true; chart.renderOrder = 2;
    const fw = paint(0x7a5a40);
    B.add(fw, rb(0.04, 0.04, cw + 0.06, 0.01), 3.97, cy + ch / 2 + 0.015, cz);
    B.add(fw, rb(0.04, 0.04, cw + 0.06, 0.01), 3.97, cy - ch / 2 - 0.015, cz);
  }

  // ── 4. the weather mast, back-right: cups spin, the vane noses about ──
  {
    const wx = 3.6, wz = -4.9;
    solid(wx, wz, 0.18);
    const pole = paint(0xb8bec8);
    B.add(pole, new THREE.CylinderGeometry(0.025, 0.03, 2.0, 10), wx, 1.0, wz);
    B.add(dark, new THREE.CylinderGeometry(0.12, 0.14, 0.05, 12), wx, 0.025, wz);
    B.add(paint(0xf1e4c8), rb(0.16, 0.2, 0.1, 0.02), wx - 0.0, 0.95, wz + 0.07);            // the data logger
    B.add(pole, rb(0.03, 0.03, 0.34, 0.008), wx, 1.72, wz);                                // a crossbar
    B.add(paint(0x2f5ea8), rb(0.26, 0.015, 0.2, 0.005), wx - 0.06, 1.38, wz + 0.1, [0.6, 0, 0]);   // solar panel
    B.add(pole, rb(0.02, 0.1, 0.02, 0.005), wx - 0.06, 1.33, wz + 0.05);
    const ledMat = paint(0x5cff7a, { emissive: 0x3cff5a, hatch: 0, unique: true });
    mesh(new THREE.SphereGeometry(0.012, 6, 5), ledMat, G, wx + 0.045, 1.0, wz + 0.122).userData.noInk = true;
    const ane = grp(wx, 2.02, wz);
    mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.05, 8), pole, ane, 0, 0, 0);
    const cupGeo = new THREE.SphereGeometry(0.045, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(Math.PI / 2);
    const cupB = baker(THREE);
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      cupB.add(pole, new THREE.CylinderGeometry(0.006, 0.006, 0.2, 5), Math.cos(a) * 0.1, 0, Math.sin(a) * 0.1, [0, -a, Math.PI / 2]);
      // each cup's open side faces the same way round the circle
      cupB.add(paint(0xe8604c), cupGeo, Math.cos(a) * 0.2, 0, Math.sin(a) * 0.2, [0, -a - Math.PI / 2, 0]);
    }
    cupB.flush(ane);
    const vane = grp(wx, 1.72, wz + 0.16);            // pivots on the end of the crossbar
    mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.1, 6), pole, vane, 0, 0.05, 0);
    const vb = baker(THREE);
    vb.add(dark, new THREE.CylinderGeometry(0.006, 0.006, 0.34, 5), 0, 0.1, 0, [0, 0, Math.PI / 2]);
    vb.add(dark, new THREE.ConeGeometry(0.025, 0.07, 8), 0.19, 0.1, 0, [0, 0, -Math.PI / 2]);
    vb.add(dark, rb(0.1, 0.07, 0.008, 0.002), -0.16, 0.12, 0);
    vb.flush(vane);
    let tSpin = -99, spin = 2;
    tap(ane, 'spin the anemometer', (sfx) => { tSpin = now(); spin = 28; sfx([[300, 0.1], [420, 0.1], [560, 0.1], [700, 0.2]], 'sine', 0.05); });
    live((t, dt) => {
      spin += (2.2 + Math.sin(t * 0.3) * 1.2 - spin) * Math.min(1, dt * 0.6);
      ane.rotation.y += spin * dt;
      vane.rotation.y = 0.6 + Math.sin(t * 0.7) * 0.35 + Math.sin(t * 2.3) * 0.08 + (t - tSpin < 3 ? Math.sin((t - tSpin) * 7) * 0.5 * (1 - (t - tSpin) / 3) : 0);
      ledMat.emissiveIntensity = (t % 1.4) < 0.12 ? 1.4 : 0.1;
    });
  }

  // ── 5. a hollow log, front-left: something inside blinks back at you ──
  {
    const lx = -2.15, lz = -0.55;
    solid(lx, lz, 0.45);
    const L = grp(lx, 0.23, lz); L.rotation.y = 0.45;       // its open end faces the room's front-right
    const bark = paint(0x7a5a40, { hatch: 0.6 }), barkLt = paint(0xb08a62), hollow = paint(0x2a1e18, { hatch: 0, side: THREE.BackSide });
    mesh(new THREE.CylinderGeometry(0.23, 0.25, 0.95, 16, 1, true).rotateX(Math.PI / 2), bark, L);
    mesh(new THREE.CylinderGeometry(0.19, 0.2, 0.95, 16, 1, true).rotateX(Math.PI / 2), hollow, L).userData.noInk = true;
    mesh(new THREE.TorusGeometry(0.21, 0.026, 8, 22), barkLt, L, 0, 0, 0.475);
    mesh(new THREE.CircleGeometry(0.235, 16), paint(0xb08a62), L, 0, 0, -0.474, [0, Math.PI, 0]);
    mesh(new THREE.CircleGeometry(0.2, 16), paint(0x140e0c, { hatch: 0 }), L, 0, 0, -0.2).userData.noInk = true;
    const lb = baker(THREE);
    for (const [dz, s, dx] of [[-0.28, 1, 0.02], [-0.05, 0.75, -0.06], [0.12, 0.85, 0.05], [0.32, 1.05, -0.02]]) lb.add(moss, new THREE.IcosahedronGeometry(0.085 * s, 1), dx, 0.2, dz, [s, s * 2, 0], [1.3, 0.75, 1.15]);
    // shelf fungi on the side
    for (const [dz, dy] of [[-0.1, 0.05], [0.08, -0.03], [-0.3, -0.06]]) lb.add(paint(0xe4b84f), new THREE.CylinderGeometry(0.06, 0.06, 0.02, 12, 1, false, 0, Math.PI), 0.225, dy, dz);
    lb.flush(L);
    // the eyes: a pair of glowing lamps in the dark
    const eyes = grp(0, 0.02, -0.05, L);
    const eyeMat = paint(0xfff6a8, { emissive: 0xf6e46a, hatch: 0, unique: true });
    for (const s of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.03, 10, 8), eyeMat, eyes, s * 0.05, 0, 0).userData.noInk = true;
      mesh(new THREE.SphereGeometry(0.014, 8, 6).scale(0.55, 1, 0.5), paint(0x111014, { hatch: 0 }), eyes, s * 0.05, 0, 0.026).userData.noInk = true;
    }
    let tPeek = -99;
    tap(L, 'peek in the hollow log', (sfx) => { tPeek = now(); sfx([[1400, 0.05], [1800, 0.06], [1100, 0.08]], 'square', 0.03); });
    live((t) => {
      const k = t - tPeek;
      // blink every few seconds; look about
      const bl = (t % 3.7) < 0.14 ? 0.1 : 1;
      let hide = 0, wide = 1;
      if (k >= 0 && k < 3.4) { wide = k < 0.35 ? 1 + k * 1.4 : 1.5; hide = smooth((k - 0.35) / 0.4) * (1 - smooth((k - 2.6) / 0.8)); }
      eyes.scale.set(wide, bl * wide * (1 - hide * 0.9), wide);
      eyes.position.set(Math.sin(t * 0.6) * 0.04, 0.02 + Math.sin(t * 0.9) * 0.01, -0.05 - hide * 0.12);
      eyeMat.emissiveIntensity = 1 - hide * 0.9;
    });
  }

  // ── 6. ultraviolet flowers, front-right: tap and see them the way a bee does ──
  {
    const fx = 2.35, fz = -0.55;
    solid(fx, fz, 0.38);
    const leafM = paint(0x4f8f58, { hatch: 0.5 });
    const lb = baker(THREE);
    for (let i = 0; i < 7; i++) { const a = i * 0.9; lb.add(leafM, new THREE.SphereGeometry(0.1, 8, 6), fx + Math.cos(a) * 0.2, 0.04, fz + Math.sin(a) * 0.18, [0, -a, 0.35], [1.6, 0.25, 0.6]); }
    for (let i = 0; i < 9; i++) { const a = i * 0.7 + 0.3; lb.add(paint(0xa89f90), new THREE.SphereGeometry(0.06 + (i % 3) * 0.015, 7, 5), fx + Math.cos(a) * 0.36, 0.025, fz + Math.sin(a) * 0.3, null, [1.3, 0.5, 1]); }
    lb.flush(G);
    const UV = new THREE.Color(0xb050ff), stemM = paint(0x3f7a4c);
    const bed = grp(fx, 0, fz);
    const flowers = [[-0.12, 0.05, 0.62, 0xf6c445, 0.0], [0.13, -0.08, 0.8, 0xf29bb4, 1.3], [0.05, 0.14, 0.5, 0xffffff, 2.4]].map(([dx, dz, h, col, ph]) => {
      const base = grp(dx, 0, dz, bed);                    // the whole plant nods about its root
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.03, h * 0.5, 0.02), new THREE.Vector3(0, h, 0.05)]);
      mesh(new THREE.TubeGeometry(curve, 8, 0.012, 5), stemM, base).userData.noInk = true;
      const head = grp(0, h, 0.05, base); head.rotation.x = 0.7;  // facing up and out to the camera
      const petM = paint(col, { unique: true }), orig = new THREE.Color(col);
      const ctrM = paint(0xe4a02a, { emissive: 0xffe24a, hatch: 0, unique: true }); ctrM.emissiveIntensity = 0;
      mesh(new THREE.SphereGeometry(0.035, 10, 8).scale(1, 0.5, 1), ctrM, head, 0, 0.01, 0);
      const pets = [];
      for (let p = 0; p < 6; p++) {
        const pv = grp(0, 0, 0, head); pv.rotation.y = p * Math.PI / 3;     // each petal hinged at the flower's centre
        const pm = mesh(new THREE.SphereGeometry(0.06, 8, 6).scale(1, 0.25, 0.55).translate(0.06, 0, 0), petM, pv);
        pm.rotation.z = 0.25; pets.push(pm);
      }
      return { base, head, pets, petM, orig, ctrM, ph };
    });
    let tUV = -99;
    tap(bed, 'see the flowers like a bee', (sfx) => { tUV = now(); sfx([[880, 0.1], [1175, 0.1], [1568, 0.3]], 'sine', 0.05); });
    const tmp = new THREE.Color();
    live((t) => {
      const k = t - tUV, u = k >= 0 && k < 4 ? smooth(k / 0.4) * (1 - smooth((k - 3) / 1)) : 0;
      for (const f of flowers) {
        f.base.rotation.z = Math.sin(t * 0.9 + f.ph) * 0.06;
        f.base.rotation.x = Math.cos(t * 0.7 + f.ph) * 0.04;
        f.petM.color.copy(tmp.copy(f.orig).lerp(UV, u));
        f.ctrM.emissiveIntensity = u * 1.3;
        for (const p of f.pets) p.rotation.z = 0.25 - u * 0.4;                // they open wide
        f.head.scale.setScalar(1 + u * 0.15);
      }
    });
  }

  // ── 7. the hive, hanging from the right-hand tree's branch ──
  {
    // the tree's branch (angle 2.6 at y 1.85 in tree()): halfway along it
    const a = 2.6, bx = 3.45 + Math.cos(a) * 0.42, bz = -2.0 + Math.sin(a) * 0.3, by = 2.08;
    const H = grp(bx, by, bz);
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.12, 4), dark, H, 0, -0.06, 0);
    const skep = paint(0xd9a54a, { hatch: 0.6 }), hb = baker(THREE);
    for (let i = 0; i < 5; i++) { const r = 0.15 * Math.sqrt(1 - (i / 5.3) ** 2); hb.add(skep, new THREE.TorusGeometry(r, 0.035, 8, 20), 0, -0.36 + i * 0.055, 0, [Math.PI / 2, 0, 0]); }
    hb.add(skep, new THREE.SphereGeometry(0.06, 10, 8), 0, -0.1, 0, null, [1, 0.6, 1]);
    hb.flush(H);
    mesh(new THREE.CircleGeometry(0.035, 12), paint(0x2a1e18, { hatch: 0 }), H, 0, -0.345, 0.188).userData.noInk = true;
    mesh(new THREE.CircleGeometry(0.15, 16), paint(0x8a6a3a), H, 0, -0.37, 0, [Math.PI / 2, 0, 0]);
    const stripes = canvasTex(16, 32, (c, w, h) => { c.fillStyle = '#e4b84f'; c.fillRect(0, 0, w, h); c.fillStyle = '#2a2230'; for (let y = 6; y < h; y += 10) c.fillRect(0, y, w, 4); });
    const beeM = paint(0xffffff, { map: stripes, hatch: 0 }), wingM = paint(0xffffff, { opacity: 0.6, hatch: 0, side: THREE.DoubleSide });
    const bees = [0, 1, 2, 3].map((i) => {
      const b = grp(0, 0, 0, H);
      mesh(new THREE.SphereGeometry(0.018, 8, 6).scale(1, 1.5, 1).rotateZ(Math.PI / 2), beeM, b);
      mesh(new THREE.PlaneGeometry(0.035, 0.02).rotateX(-Math.PI / 2), wingM, b, 0, 0.016, 0).userData.noInk = true;
      return [b, i * 1.57];
    });
    let tHive = -99;
    tap(H, 'knock on the beehive', (sfx) => { tHive = now(); sfx([[180, 0.3], [200, 0.3], [190, 0.4]], 'sawtooth', 0.025); });
    live((t) => {
      const k = t - tHive, on = k >= 0 && k < 3.5, e = on ? 1 - k / 3.5 : 0;
      H.rotation.z = Math.sin(t * 1.1) * 0.03 + (on ? Math.sin(k * 7) * 0.35 * e : 0);
      H.rotation.x = Math.cos(t * 0.8) * 0.02;
      for (const [b, ph] of bees) {
        const r = 0.24 + e * 0.35, sp = 2.2 + e * 5;
        const an = t * sp + ph;
        b.position.set(Math.cos(an) * r, -0.25 + Math.sin(t * 3 + ph) * 0.07 + e * Math.sin(an * 2) * 0.15, Math.sin(an) * r * 0.8 + 0.05);
        b.rotation.y = -an;
        b.children[1].rotation.x = Math.sin(t * 50 + ph) * 0.6;
      }
    });
  }

  // ── 8. a trail camera strapped to the left-hand tree ──
  {
    const tx = -3.45 + 0.08, ty = 0.88, tz = -2.35, th = 0.35;
    B.add(paint(0x4a4a3a), new THREE.TorusGeometry(0.205, 0.014, 6, 22), tx, ty, tz, [Math.PI / 2, 0, 0]);
    const C = grp(tx + Math.cos(th) * 0.245, ty, tz + Math.sin(th) * 0.245); C.rotation.y = Math.atan2(Math.cos(th), Math.sin(th));
    const camo = paint(0x5a6a3a, { hatch: 0.6 });
    mesh(rb(0.13, 0.18, 0.09, 0.025), camo, C);
    mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.03, 12), dark, C, 0, 0.035, 0.05, [Math.PI / 2, 0, 0]);
    const lensMat = paint(0x6f8aa8, { emissive: 0xffffff, hatch: 0, unique: true }); lensMat.emissiveIntensity = 0;
    mesh(new THREE.CircleGeometry(0.018, 12), lensMat, C, 0, 0.035, 0.066).userData.noInk = true;
    mesh(rb(0.08, 0.04, 0.01, 0.004), paint(0x1a1418, { hatch: 0 }), C, 0, -0.04, 0.046);
    const led = paint(0xff3a2a, { emissive: 0xff2a1a, hatch: 0, unique: true });
    mesh(new THREE.SphereGeometry(0.009, 6, 5), led, C, 0.045, 0.072, 0.045).userData.noInk = true;
    const flash = glow(0xffffff, 0.9, C); flash.position.set(0, 0.035, 0.12);
    let tSnap = -99;
    tap(C, 'set off the trail camera', (sfx) => { tSnap = now(); sfx([[2200, 0.03], [1200, 0.05], [600, 0.08]], 'square', 0.035); });
    live((t) => {
      const k = t - tSnap;
      led.emissiveIntensity = (t % 2) < 0.1 ? 1.5 : 0.15;
      const f = k >= 0 && k < 0.8 ? Math.max(0, 1 - k / 0.5) : 0;
      flash.material.opacity = f; flash.scale.setScalar(0.5 + f * 1.4);
      lensMat.emissiveIntensity = f * 2;
      C.position.y = ty + (k >= 0 && k < 0.3 ? Math.sin(k / 0.3 * Math.PI) * 0.01 : 0);
    });
  }

  // ── 9. a birdhouse swinging from the canopy on the west wall ──
  {
    const P = grp(-3.62, 2.56, -0.95);
    mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.36, 4), dark, P, 0, -0.18, 0);
    const house = grp(0, -0.36, 0, P); house.rotation.y = 0.9;           // its door faces into the room
    const hb = baker(THREE), body = paint(0xe8b0a0), roof = paint(0x3f6a8a);
    hb.add(body, rb(0.2, 0.22, 0.18, 0.02), 0, -0.13, 0);
    const gable = new THREE.Shape([new THREE.Vector2(-0.1, 0), new THREE.Vector2(0.1, 0), new THREE.Vector2(0, 0.068)]);
    hb.add(body, new THREE.ExtrudeGeometry(gable, { depth: 0.17, bevelEnabled: false }).translate(0, 0, -0.085), 0, -0.022, 0);
    for (const s of [-1, 1]) hb.add(roof, rb(0.14, 0.02, 0.24, 0.006), s * 0.06, -0.0 + 0.005, 0, [0, 0, -s * 0.62]);
    hb.add(paint(0x8a6448), new THREE.CylinderGeometry(0.008, 0.008, 0.07, 5), 0, -0.19, 0.115, [Math.PI / 2, 0, 0]);
    hb.flush(house);
    mesh(new THREE.CircleGeometry(0.035, 14), paint(0x2a1e18, { hatch: 0 }), house, 0, -0.11, 0.091).userData.noInk = true;
    // the tenant, who pops their head out when knocked
    const bird = grp(0, -0.11, 0.0, house);
    mesh(new THREE.SphereGeometry(0.032, 10, 8), paint(0x5f8cc8), bird);
    mesh(new THREE.ConeGeometry(0.011, 0.03, 6).rotateX(Math.PI / 2), paint(0xf0a040), bird, 0, -0.004, 0.038);
    for (const s of [-1, 1]) mesh(new THREE.SphereGeometry(0.006, 5, 4), paint(0x111014, { hatch: 0 }), bird, s * 0.017, 0.01, 0.024).userData.noInk = true;
    bird.visible = false;
    let tBird = -99;
    tap(P, 'knock on the birdhouse', (sfx) => { tBird = now(); sfx([[2600, 0.06], [3100, 0.05], [2600, 0.06], [3300, 0.08]], 'sine', 0.05); });
    live((t) => {
      const k = t - tBird, on = k >= 0 && k < 3.2;
      P.rotation.z = Math.sin(t * 1.3) * 0.04 + (on ? Math.sin(k * 6) * 0.22 * (1 - k / 3.2) : 0);
      P.rotation.x = Math.cos(t * 0.9) * 0.03;
      const out = on ? smooth(k / 0.25) * (1 - smooth((k - 2.4) / 0.6)) : 0;
      bird.visible = out > 0.02;
      bird.position.z = -0.02 + out * 0.105;
      bird.rotation.y = Math.sin(k * 5) * 0.4 * out;
    });
  }

  // ── 10. a fairy ring of glow-caps by the path: tap and they bounce in turn, puffing spores ──
  {
    const mx = 1.05, mz = -0.32, n = 7;
    if (!free(mx, mz, 0.28)) console.error('[borrowed-eyes] crowded spot', mx, mz);
    const stemM = paint(0xf6eedb), capM = paint(0x9fe8d8, { emissive: 0x5fe0c8, hatch: 0, unique: true });
    const ms = [];
    for (let i = 0; i < n; i++) {
      const a = i / n * Math.PI * 2, s = 0.7 + (i % 3) * 0.25;
      const m = grp(mx + Math.cos(a) * 0.24, 0, mz + Math.sin(a) * 0.2);     // pivot at the foot, for squash and stretch
      mesh(new THREE.CylinderGeometry(0.018 * s, 0.024 * s, 0.1 * s, 7).translate(0, 0.05 * s, 0), stemM, m);
      mesh(new THREE.SphereGeometry(0.05 * s, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), capM, m, 0, 0.095 * s, 0);
      ms.push(m);
    }
    const spores = [0, 1, 2, 3, 4, 5].map(() => glow(0x9fffe8, 0.08));
    let tRing = -99;
    const hit = grp(mx, 0.05, mz); mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 10), paint(0xffffff, { opacity: 0, hatch: 0 }), hit).visible = true;
    hit.children[0].material.transparent = true; hit.children[0].material.depthWrite = false;
    tap(hit, 'bounce the glow-caps', (sfx) => { tRing = now(); sfx([[523, 0.09], [587, 0.09], [659, 0.09], [784, 0.09], [880, 0.09], [988, 0.09], [1046, 0.2]], 'sine', 0.05); });
    live((t) => {
      const k = t - tRing;
      capM.emissiveIntensity = 0.35 + 0.25 * Math.sin(t * 1.3);
      ms.forEach((m, i) => {
        const kk = k - i * 0.09, b = kk >= 0 && kk < 0.45 ? Math.sin(kk / 0.45 * Math.PI) : 0;
        m.scale.set(1 - b * 0.15, 1 + b * 0.35, 1 - b * 0.15);
      });
      spores.forEach((s, i) => {
        const kk = k - i * 0.1;
        if (kk < 0 || kk > 2) { s.material.opacity = 0; return; }
        const a = i * 1.05;
        s.position.set(mx + Math.cos(a) * (0.15 + kk * 0.15), 0.15 + kk * 0.45, mz + Math.sin(a) * (0.12 + kk * 0.1));
        s.material.opacity = 0.9 * (1 - kk / 2);
      });
    });
  }

  // ── 11. a shepherd's-hook lantern lighting the camp corner ──
  {
    const px = -3.55, pz = -4.85;
    solid(px, pz, 0.12);
    const iron = paint(0x3a3448);
    const hook = new THREE.CatmullRomCurve3([new THREE.Vector3(px, 0, pz), new THREE.Vector3(px, 1.45, pz), new THREE.Vector3(px + 0.08, 1.62, pz + 0.04), new THREE.Vector3(px + 0.22, 1.6, pz + 0.1), new THREE.Vector3(px + 0.28, 1.52, pz + 0.13)]);
    B.add(iron, new THREE.TubeGeometry(hook, 24, 0.014, 6));
    const LP = grp(px + 0.28, 1.52, pz + 0.13);
    const lb = baker(THREE);
    lb.add(iron, new THREE.TorusGeometry(0.025, 0.005, 5, 12), 0, -0.02, 0);
    lb.add(iron, new THREE.ConeGeometry(0.07, 0.06, 6), 0, -0.07, 0);
    lb.add(iron, new THREE.CylinderGeometry(0.06, 0.065, 0.02, 6), 0, -0.23, 0);
    for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.4; lb.add(iron, rb(0.01, 0.13, 0.01, 0.003), Math.cos(a) * 0.052, -0.165, Math.sin(a) * 0.052); }
    lb.flush(LP);
    const flame = paint(0xfff1c8, { emissive: 0xffc860, hatch: 0, unique: true });
    mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.12, 6), flame, LP, 0, -0.165, 0).userData.noInk = true;
    const halo = glow(0xffd98a, 0.55, LP); halo.position.y = -0.165;
    live((t) => {
      LP.rotation.z = Math.sin(t * 0.8) * 0.05; LP.rotation.x = Math.sin(t * 0.6 + 1) * 0.04;
      const fl = 0.85 + Math.sin(t * 9) * 0.06 + Math.sin(t * 23) * 0.05;
      flame.emissiveIntensity = fl; halo.material.opacity = 0.55 * fl;
    });
  }

  // ── 12. a dragonfly patrolling the pond, and rings spreading on the water ──
  {
    const px = -1.6, pz = -2.1;
    const DF = grp(px, 0.6, pz), body = paint(0x2f8fa0, { hatch: 0 });
    const db = baker(THREE);
    db.add(body, new THREE.CapsuleGeometry(0.011, 0.15, 3, 6), -0.06, 0, 0, [0, 0, Math.PI / 2]);
    db.add(body, new THREE.SphereGeometry(0.02, 8, 6), 0.04, 0, 0, null, [1.4, 1, 1]);
    db.add(paint(0x1a4a6a, { hatch: 0 }), new THREE.SphereGeometry(0.016, 8, 6), 0.07, 0.006, 0, null, [1, 1, 1.6]);
    db.flush(DF);
    const wingM = paint(0xe8f6ff, { opacity: 0.45, hatch: 0, side: THREE.DoubleSide });
    const wings = [];
    for (const dx of [0.035, 0.0]) for (const s of [-1, 1]) {
      const hinge = grp(dx, 0.012, 0, DF);                          // hinged on the thorax
      const w = mesh(new THREE.PlaneGeometry(0.035, 0.13).rotateX(-Math.PI / 2).translate(0, 0, s * 0.068), wingM, hinge); w.userData.noInk = true;
      wings.push([hinge, s, dx]);
    }
    const spotsD = [[-0.3, 0.55, 0.1], [0.25, 0.7, -0.2], [0.1, 0.45, 0.3], [-0.15, 0.8, -0.3]];
    const ripM = [0, 1, 2].map(() => new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false }));
    const rips = ripM.map((m) => { const r = mesh(new THREE.RingGeometry(0.9, 1, 28), m, G, px, 0.036, pz, [-Math.PI / 2, 0, 0]); r.userData.noInk = true; return r; });
    const ripAt = [[0.15, -0.1], [-0.25, 0.2], [0.1, 0.3]];
    live((t) => {
      const seg = Math.floor(t / 2.2), u = (t / 2.2) % 1;
      const A = spotsD[seg % 4], Bp = spotsD[(seg + 1) % 4], m = smooth((u - 0.7) / 0.3);
      DF.position.set(px + A[0] + (Bp[0] - A[0]) * m, A[1] + (Bp[1] - A[1]) * m + Math.sin(t * 3) * 0.015, pz + A[2] + (Bp[2] - A[2]) * m);
      DF.rotation.y = Math.atan2(-(Bp[2] - A[2]), Bp[0] - A[0]) * (u > 0.6 ? 1 : 0.6) + Math.sin(t * 0.8) * 0.2;
      for (const [h, s, dx] of wings) h.rotation.x = s * (0.15 + Math.sin(t * 60 + dx * 40) * 0.5);
      rips.forEach((r, i) => {
        const k = (t * 0.4 + i / 3) % 1;
        r.scale.setScalar(0.03 + k * 0.22);
        r.position.set(px + ripAt[i][0], 0.036, pz + ripAt[i][1]);
        ripM[i].opacity = 0.6 * (1 - k);
      });
    });
  }

  // ── 13. fairy lights swagged along both side walls, twinkling ──
  {
    const pts = [];
    const swag = (a, b, n, dip) => {                    // scallops between a and b
      const out = [];
      for (let i = 0; i <= n * 8; i++) {
        const u = i / (n * 8), f = (u * n) % 1;
        out.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u - Math.sin(f * Math.PI) * dip, a[2] + (b[2] - a[2]) * u));
      }
      return out;
    };
    const strings = [swag([-3.93, 2.42, -5.3], [-3.93, 2.42, -0.2], 4, 0.2), swag([3.93, 2.42, -5.3], [3.93, 2.42, -0.2], 4, 0.2),
      swag([-3.9, 2.42, -5.42], [-2.05, 2.42, -5.42], 2, 0.16), swag([2.05, 2.42, -5.42], [3.9, 2.42, -5.42], 2, 0.16)];
    const wire = baker(THREE), wireM = paint(0x2a2230, { hatch: 0 });
    for (const s of strings) {
      const c = new THREE.CatmullRomCurve3(s);
      wire.add(wireM, new THREE.TubeGeometry(c, s.length * 2, 0.005, 4));
      const n = Math.round(c.getLength() / 0.22);
      for (let i = 1; i < n; i++) pts.push(c.getPoint(i / n));
    }
    wire.flush(G).forEach(m => { m.userData.noInk = true; });
    const im = new THREE.InstancedMesh(new THREE.SphereGeometry(0.028, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), pts.length);
    im.userData.noInk = true; im.frustumCulled = false;
    const cols = [0xfff1a0, 0xffb0c8, 0xb8ffb0, 0xffd27a].map(c => new THREE.Color(c)), m4 = new THREE.Matrix4(), cc = new THREE.Color();
    pts.forEach((p, i) => { m4.makeTranslation(p.x, p.y - 0.03, p.z); im.setMatrixAt(i, m4); im.setColorAt(i, cols[i % 4]); });
    G.add(im);
    live((t) => {
      for (let i = 0; i < pts.length; i++) { const b = 0.55 + 0.45 * Math.max(0, Math.sin(t * 1.7 + i * 1.9)); im.setColorAt(i, cc.copy(cols[i % 4]).multiplyScalar(b)); }
      im.instanceColor.needsUpdate = true;
    });
  }

  // ── 14. ground clutter: pebbles, paw prints crossing the path, a fallen branch ──
  {
    const stone = paint(0xb8ab98), sb = baker(THREE);
    for (const [x, z, s] of [[-0.9, -4.95, 1], [-0.75, -5.05, 0.6], [0.7, -5.1, 0.8], [1.8, -5.2, 1.1], [-3.0, -5.15, 0.9], [3.0, -0.95, 0.8], [-2.7, -1.0, 0.7], [-3.65, -2.95, 0.9], [2.85, -3.9, 0.7]]) {
      sb.add(stone, new THREE.DodecahedronGeometry(0.08 * s, 0), x, 0.03 * s, z, [s, s * 2, 0], [1.3, 0.6, 1]);
    }
    // a fallen mossy branch along the back-left
    const br = new THREE.CatmullRomCurve3([new THREE.Vector3(-1.95, 0.04, -5.15), new THREE.Vector3(-2.4, 0.06, -5.05), new THREE.Vector3(-2.9, 0.05, -5.2)]);
    sb.add(paint(0x7a5a40, { hatch: 0.6 }), new THREE.TubeGeometry(br, 10, 0.04, 6));
    sb.add(moss, new THREE.IcosahedronGeometry(0.05, 1), -2.4, 0.09, -5.05, null, [1.6, 0.5, 1]);
    sb.flush(G);
    const prints = mesh(new THREE.PlaneGeometry(2.2, 1.0), texMat(440, 200, (c, w, h) => {
      c.fillStyle = 'rgba(92,70,48,0.55)';
      for (let i = 0; i < 8; i++) {
        const x = 30 + i * 52, y = h / 2 + Math.sin(i * 0.9) * 30 + (i % 2 ? 16 : -16);
        c.beginPath(); c.ellipse(x, y, 9, 8, 0, 0, 7); c.fill();
        for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x + 12, y - 9 + k * 6, 3, 0, 7); c.fill(); }
      }
    }), G, -0.85, 0.021, -3.35, [-Math.PI / 2, 0, 0.5]);
    prints.userData.noInk = true; prints.renderOrder = 2;
  }

  B.flush(G);
}
