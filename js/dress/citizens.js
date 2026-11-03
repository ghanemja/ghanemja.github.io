// ─── dressing for the citizens room ───
// A busy, cosy tailor's & clothes shop: clothes everywhere. Rails and a round rack of hanging
// garments, folded stacks in cubbies and on a nesting table, bolts of cloth, hats on a hat
// tree and wall pegs, scarves draped over things, shoe boxes, a fitting room with a curtain,
// a sewing machine, and a sofa corner with shopping bags. No people: the coordinator adds
// the shoppers at the spots exported on g.userData.shoppers.
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default function dress(kit) {
  const { THREE, g, put, rb, paint, tap, live, free, claim, block, canvasTex, texMat, HAND, SCRIPT, INKC, D, LBL_X } = kit;
  const BACK = -D + 0.5, EW = 3.96;
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ── batching: static pieces merge per material, into the room or into a moving group ──
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
  const M4 = (x, y, z, ry = 0) => new THREE.Matrix4().compose(V3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), V3(1, 1, 1));
  const tube = (pts, r, seg = 24, rs = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), seg, r, rs);
  const lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  // ── palette ──
  const COLS = [0xe8604c, 0x3f5872, 0xe4b84f, 0x7fb3a8, 0xb7a3c6, 0x8e2f3a, 0xf1e4c8, 0x2f5a52, 0xdc9e9a, 0x6f8f4a, 0xf2a7bd, 0x5a6f86, 0xc98a4a, 0x2a2230];
  const C = (i) => paint(COLS[((i % COLS.length) + COLS.length) % COLS.length]);
  const wood = paint(0x8a6448), woodDk = paint(0x5c4030), woodLt = paint(0xc8a47c), metal = paint(0x6f7d92), brass = paint(0xc9a24a);
  const hangerM = paint(0x9a7c5c), cream = paint(0xf6efdf);

  // ── a garment on a hanger. Local frame: hook at the origin, hangs down −y, wide in x, thin in z ──
  const KINDS = ['shirt', 'dress', 'coat', 'trousers', 'shirt', 'skirt', 'coat', 'dress'];
  const garment = (B, kind, mat, base, trim) => {
    B.add(new THREE.TorusGeometry(0.028, 0.005, 5, 10, Math.PI * 1.3), metal, 0, 0.0, 0, [0, 0, 0.2], null, base);   // the hook over the rail
    B.box(0.34, 0.02, 0.025, hangerM, 0, -0.045, 0, 0.006, null, base);
    if (kind === 'shirt') {
      B.box(0.28, 0.42, 0.05, mat, 0, -0.27, 0, 0.025, null, base);
      for (const s of [-1, 1]) B.box(0.08, 0.36, 0.045, mat, s * 0.17, -0.24, 0, 0.02, [0, 0, s * 0.14], base);
      B.box(0.12, 0.04, 0.055, trim, 0, -0.07, 0.003, 0.012, null, base);
    } else if (kind === 'coat') {
      B.box(0.32, 0.72, 0.07, mat, 0, -0.42, 0, 0.03, null, base);
      for (const s of [-1, 1]) B.box(0.09, 0.56, 0.06, mat, s * 0.19, -0.34, 0, 0.025, [0, 0, s * 0.1], base);
      for (const y of [-0.25, -0.4, -0.55]) for (const s of [-1, 1]) B.add(new THREE.SphereGeometry(0.012, 6, 4), trim, s * 0.15 * 0, y, s * 0.037, null, null, base);
      B.box(0.2, 0.06, 0.08, trim, 0, -0.08, 0, 0.02, null, base);
    } else if (kind === 'dress') {
      B.box(0.22, 0.22, 0.05, mat, 0, -0.16, 0, 0.022, null, base);
      B.add(new THREE.CylinderGeometry(0.1, 0.24, 0.5, 14, 1), mat, 0, -0.5, 0, null, [1, 1, 0.3], base);
      B.box(0.23, 0.035, 0.06, trim, 0, -0.27, 0, 0.01, null, base);
    } else if (kind === 'skirt') {
      B.box(0.24, 0.04, 0.035, metal, 0, -0.07, 0, 0.01, null, base);
      B.add(new THREE.CylinderGeometry(0.12, 0.2, 0.36, 14, 1), mat, 0, -0.27, 0, null, [1, 1, 0.3], base);
    } else {                                                     // trousers on a clip hanger
      B.box(0.26, 0.06, 0.05, mat, 0, -0.1, 0, 0.015, null, base);
      for (const s of [-1, 1]) B.box(0.12, 0.6, 0.045, mat, s * 0.066, -0.42, 0, 0.02, [0, 0, s * 0.03], base);
    }
  };

  // ── things for many places: a folded stack, a shoe pair, a draped scarf ──
  const fold = (B, x, y, z, n, c0, w = 0.3, d = 0.22, ry = 0) => {
    let yy = y;
    for (let i = 0; i < n; i++) {
      const h = 0.045 + ((i * 7 + c0) % 3) * 0.008;
      B.box(w - (i % 2) * 0.012, h, d - (i % 3) * 0.008, C(c0 + i * 3), x + Math.sin(i * 2.7 + c0) * 0.008, yy + h / 2, z + Math.cos(i * 1.9) * 0.006, 0.018, [0, ry + Math.sin(i * 3.3) * 0.05, 0]);
      yy += h;
    }
    return yy;
  };
  const shoes = (B, x, y, z, ry, mat) => {
    for (const s of [-1, 1]) {
      const b = M4(x, y, z, ry);
      B.box(0.075, 0.025, 0.2, paint(0x2a2230, { hatch: 0 }), s * 0.05, 0.0125, 0, 0.01, null, b);
      B.box(0.072, 0.05, 0.13, mat, s * 0.05, 0.045, -0.03, 0.025, null, b);
      B.box(0.07, 0.035, 0.08, mat, s * 0.05, 0.035, 0.06, 0.02, null, b);
    }
  };
  const scarf = (B, pts, mat, r = 0.022) => B.add(tube(pts, r, 20, 6), mat, 0, 0, 0, null, [1, 1, 1]);

  // ═════════════ 1. the fitting room in the back east corner ═════════════
  const shoppers = [];
  {
    const X0 = 3.2, X1 = EW, Z0 = BACK + 0.04, Z1 = -4.72, HB = 2.1;
    block(X0 - 0.05, X1, Z0, Z1 + 0.06);
    const panel = paint(0xb98a5e, { hatch: 0.5 });
    addBox(0.05, HB, Z1 - Z0, panel, X0, HB / 2, (Z0 + Z1) / 2, 0.012);
    addBox(0.07, HB + 0.02, 0.07, woodDk, X0, (HB + 0.02) / 2, Z1, 0.015);
    addBox(X1 - X0 + 0.04, 0.2, 0.06, woodDk, (X0 + X1) / 2, HB + 0.08, Z1, 0.015);
    addBox(0.06, HB + 0.02, 0.07, woodDk, X1 - 0.02, (HB + 0.02) / 2, Z1, 0.012);
    put(new THREE.PlaneGeometry(0.62, 0.15), texMat(310, 75, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
      c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 40px ${SCRIPT}`; c.fillText('Fitting Room', w / 2, h / 2 + 3);
    }), (X0 + X1) / 2, HB + 0.08, Z1 + 0.032).userData.noInk = true;
    add(new THREE.CylinderGeometry(0.012, 0.012, X1 - X0, 8), brass, (X0 + X1) / 2, HB - 0.06, Z1 + 0.06, [0, 0, Math.PI / 2]);
    // inside: a stool, a hook with tonight's outfit, a little mirror
    addBox(0.3, 0.04, 0.3, paint(0x8e2f3a), 3.62, 0.45, -5.15, 0.02);
    for (const [dx, dz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]]) addBox(0.03, 0.43, 0.03, woodDk, 3.62 + dx, 0.215, -5.15 + dz, 0.008);
    fold(S, 3.62, 0.47, -5.15, 2, 4, 0.24, 0.2);
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.08, 6), brass, 3.4, 1.7, BACK + 0.08, [Math.PI / 2, 0, 0]);
    garment(S, 'dress', C(10), M4(3.4, 1.72, BACK + 0.12, 0), cream);
    addBox(0.3, 0.6, 0.03, paint(PAL_GOLD()), 3.78, 1.3, BACK + 0.03, 0.01);
    const gl = put(rb(0.24, 0.52, 0.01, 0.004), paint(0xcfe0e6, { hatch: 0, emissive: 0x2a3a40 }), 3.78, 1.3, BACK + 0.05); gl.userData.noInk = true;
    // the curtain: a pleated sheet hung from rings, anchored at the east post; it swishes along the rod
    const CW = X1 - X0 - 0.06, CH = HB - 0.14;
    const cg = new THREE.PlaneGeometry(CW, CH, 28, 4);
    const pos = cg.attributes.position;
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); pos.setZ(i, Math.sin((x / CW) * Math.PI * 10) * 0.025); }
    cg.computeVertexNormals();
    cg.translate(-CW / 2, -CH / 2, 0);                                      // origin = the top of the east edge
    const cur = grp(X1 - 0.03, HB - 0.07, Z1 + 0.06);
    const curM = paint(0x8e2f3a, { side: THREE.DoubleSide, hatch: 0.5 });
    const sheet = mesh(cg, curM, cur); sheet.userData.noInk = true;
    const hem = mesh(rb(CW, 0.04, 0.05, 0.015).translate(-CW / 2, -CH, 0), paint(0xe4b84f), cur); hem.userData.noInk = true;
    const rings = [];
    for (let i = 0; i < 9; i++) { const r = mesh(new THREE.TorusGeometry(0.02, 0.005, 5, 10), brass, cur, -i / 8 * CW, 0.04, 0); r.userData.noInk = true; rings.push(r); }
    let open = 0.3, goal = 0.3, reopenAt = -1;
    const setOpen = (o) => {
      sheet.scale.x = hem.scale.x = Math.max(0.12, o);
      rings.forEach((r, i) => { r.position.x = -i / 8 * CW * Math.max(0.12, o); });
    };
    setOpen(open);
    live((t, dt) => {
      if (reopenAt > 0 && t > reopenAt) { goal = 0.3; reopenAt = -1; }
      open += (goal - open) * Math.min(1, dt * 5);
      setOpen(open);
      sheet.rotation.x = Math.sin(t * 0.9) * 0.012 + (goal - open) * 0.12;
      hem.rotation.x = sheet.rotation.x;
    });
    // the secret: tap the curtain five times quickly and fitting room 1 turns out to be… occupied
    const moth = grp(3.55, -5, -5.0); moth.visible = false;
    const mothM = paint(0xb8a890, { side: THREE.DoubleSide });
    mesh(new THREE.CapsuleGeometry(0.018, 0.07, 4, 8).rotateX(Math.PI / 2), paint(0x7a6a58), moth);
    const wings = [-1, 1].map(s => { const w = grp(s * 0.008, 0.004, 0, moth); const pl = mesh(new THREE.CircleGeometry(0.085, 3, s > 0 ? -0.6 : Math.PI - 0.6 + 0, 1.2).rotateX(-Math.PI / 2), mothM, w); pl.userData.noInk = true; return w; });
    let mothT = -1, ctaps = [];
    live((t, dt) => {
      if (mothT < 0) return;
      mothT += dt;
      const u = mothT / 9, a = mothT * 1.3;
      if (u >= 1) { mothT = -1; moth.visible = false; return; }
      const k = Math.min(1, mothT);                                     // out of the booth, then loops round the shop
      moth.position.set(3.55 + (2.2 + Math.sin(a) * 1.2 - 3.55) * k, 1.3 + (0.3 + Math.sin(a * 2.3) * 0.3) * k, -5.0 + (-3.2 + Math.cos(a) * 1.2 + 5.0) * k);
      moth.rotation.y = a + Math.PI / 2;
      wings.forEach((w, i) => { w.rotation.z = (i ? 1 : -1) * Math.sin(t * 40) * 0.9; });
    });
    tap(cur, 'fitting-room curtain', (sfx) => {
      const now = kit.now(); ctaps = ctaps.filter(q => now - q < 4); ctaps.push(now);
      if (ctaps.length >= 5 && mothT < 0) {
        ctaps = []; goal = 1; reopenAt = now + 4; mothT = 0; moth.visible = true;
        sfx([[300, 0.05], [320, 0.05], [300, 0.05], [340, 0.05], [300, 0.1]], 'square', 0.02);
        setTimeout(() => kit.say('Fitting room 1 was… occupied. By a moth. It says it is “just browsing”.'), 400);
        return;
      }
      goal = goal > 0.6 ? 0.3 : 1; reopenAt = goal > 0.6 ? kit.now() + 3 : -1;
      sfx([[1200, 0.04], [900, 0.05], [700, 0.07], [500, 0.09]], 'triangle', 0.03);
      if (goal > 0.6) setTimeout(() => sfx([[523, 0.1], [659, 0.1], [784, 0.25]], 'triangle', 0.05), 3000);
    });
  }
  function PAL_GOLD() { return 0xd9a640; }

  // ═════════════ 2. the round rack (east middle) ═════════════
  {
    const RX = 2.75, RZ = -2.45, RH = 1.32, RR = 0.4;
    if (free(RX, RZ, 0.5)) {
      claim(RX, RZ, 0.5);
      add(new THREE.CylinderGeometry(0.28, 0.32, 0.05, 20), metal, RX, 0.025, RZ);
      add(new THREE.CylinderGeometry(0.025, 0.025, RH, 10), metal, RX, RH / 2, RZ);
      const spin = grp(RX, 0, RZ);
      const SB = batch(spin);
      SB.add(new THREE.TorusGeometry(RR, 0.016, 6, 36), metal, 0, RH, 0, [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 4; k++) SB.add(new THREE.CylinderGeometry(0.01, 0.01, RR * 2, 6), metal, 0, RH, 0, [0, k * Math.PI / 4, Math.PI / 2]);
      SB.add(new THREE.SphereGeometry(0.04, 10, 8), brass, 0, RH + 0.03, 0);
      const N = 14, swing = [];
      for (let i = 0; i < N; i++) {
        const a = i / N * Math.PI * 2;
        const hold = grp(Math.cos(a) * RR, RH, Math.sin(a) * RR, spin); hold.rotation.y = -a;   // hook on the rail, garment radial
        const GB = batch(hold);
        garment(GB, KINDS[(i * 3) % KINDS.length], C(i * 5 + 1), null, C(i + 6));
        if (i === 0) {                                                  // the lost page, tucked in a shirt pocket, wall side
          GB.box(0.1, 0.09, 0.02, C(i + 6), 0.08, -0.26, 0.032, 0.006);          // a breast pocket on the shirt's face
          const pg = kit.page();
          if (!pg.collected) { pg.position.set(0.08, -0.29, 0.045); pg.rotation.set(0, 0, 0.12); pg.scale.setScalar(0.72); hold.add(pg); }
        }
        GB.flush();
        swing.push(hold);
      }
      SB.flush();
      // a price card on top
      const card = mesh(new THREE.PlaneGeometry(0.3, 0.18), texMat(150, 90, (c, w, h) => {
        c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
        c.fillStyle = '#c0392b'; c.font = `700 40px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('½ off', w / 2, 52);
        c.fillStyle = INKC; c.font = `17px ${HAND}`; c.fillText('this rail only', w / 2, 70); c.fillText('(check the pockets!)', w / 2, 86);
      }), spin, 0, RH + 0.2, 0); card.userData.noInk = true;
      add(new THREE.CylinderGeometry(0.005, 0.005, 0.12, 4), metal, RX, RH + 0.07, RZ);
      let vel = 0;
      live((t, dt) => {
        vel *= Math.exp(-dt * 0.9);
        spin.rotation.y += vel * dt;
        card.rotation.y = -spin.rotation.y + 0.6;                       // the card keeps facing the shop
        swing.forEach((h, i) => { h.rotation.z = Math.sin(t * 1.1 + i) * 0.015 + Math.min(0.35, vel * 0.08); });
      });
      tap(spin, 'round rack', (sfx) => { vel += 4; sfx([[1400, 0.03], [1700, 0.03], [1300, 0.03], [1600, 0.03], [1500, 0.05]], 'triangle', 0.025); });
      // shopper 1 browses the round rack
      const sx = 2.12, sz = -1.82;
      claim(sx, sz, 0.25); shoppers.push([sx, sz, Math.atan2(RX - sx, RZ - sz), 'stand']);
    }
  }

  // ═════════════ 3. the mirror corner (east front): shopper 2, shoes, a hat tree ═════════════
  {
    const sx = 2.62, sz = -1.15;
    claim(sx, sz, 0.25); shoppers.push([sx, sz, Math.PI / 2, 'stand']);   // admiring themselves in the long mirror
    shoes(S, 3.05, 0, -0.55, -0.4, C(0)); shoes(S, 3.3, 0, -0.32, -0.9, C(1));
    addBox(0.34, 0.12, 0.24, paint(0xf1e4c8), 3.62, 0.06, -0.62, 0.01, [0, 0.2, 0]);
    addBox(0.35, 0.03, 0.25, C(5), 3.62, 0.135, -0.62, 0.008, [0, 0.2, 0]);
    // a scarf over the top of the mirror frame
    for (const [dx, len] of [[-0.03, 0.55], [0.035, 0.3]]) addBox(0.015, len, 0.1, C(10), 3.29 + dx, 1.8 - len / 2, -1.6, 0.006, [0, 0, 0.06]);   // a scarf over the mirror frame
    addBox(0.09, 0.02, 0.1, C(10), 3.29, 1.8, -1.6, 0.006, [0, 0, 0.06]);
    // the hat tree: tap and it rocks on its foot, the hats hop
    const HX = 3.58, HZ = -0.08;
    if (free(HX, HZ, 0.22)) {
      claim(HX, HZ, 0.2);
      const tree = grp(HX, 0, HZ);
      const TB = batch(tree);
      TB.add(new THREE.CylinderGeometry(0.2, 0.22, 0.04, 18), woodDk, 0, 0.02, 0);
      TB.add(new THREE.CylinderGeometry(0.025, 0.03, 1.75, 10), woodDk, 0, 0.9, 0);
      TB.add(new THREE.SphereGeometry(0.045, 10, 8), woodDk, 0, 1.79, 0);
      const hats = [];
      [[0, 1.6, 0x3f5872, 'fedora'], [2.1, 1.45, 0xe4b84f, 'sun'], [4.2, 1.5, 0x8e2f3a, 'beret']].forEach(([a, y, col, kind]) => {
        const dx = Math.cos(a), dz = Math.sin(a);
        TB.add(new THREE.CylinderGeometry(0.012, 0.012, 0.22, 6), woodDk, dx * 0.1, y + 0.05, dz * 0.1, [dz * 0.9, 0, -dx * 0.9]);     // a peg, angled up and out
        const hat = grp(dx * 0.19, y + 0.12, dz * 0.19, tree);
        const hm = paint(col);
        if (kind === 'fedora') { mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 20), hm, hat); mesh(new THREE.CylinderGeometry(0.075, 0.09, 0.1, 16), hm, hat, 0, 0.05, 0); mesh(new THREE.CylinderGeometry(0.092, 0.092, 0.025, 16), paint(0x2a2230), hat, 0, 0.015, 0); }
        else if (kind === 'sun') { mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.012, 22), hm, hat); mesh(new THREE.SphereGeometry(0.09, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), hm, hat); mesh(new THREE.CylinderGeometry(0.093, 0.093, 0.03, 16), paint(0xe8604c), hat, 0, 0.015, 0); }
        else { const b = mesh(new THREE.SphereGeometry(0.12, 14, 10), hm, hat, 0, 0.02, 0); b.scale.set(1, 0.32, 1); mesh(new THREE.SphereGeometry(0.015, 6, 4), hm, hat, 0, 0.06, 0); }
        hat.rotation.set(dz * 0.35, 0, -dx * 0.35);
        hats.push(hat); hat.userData.y = hat.position.y;
      });
      // a long striped scarf looped over a peg
      for (const [a, len, c] of [[0.3, 0.62, 0], [3.6, 0.5, 3]]) {                  // scarves hung from the top pegs: one strip down each side
        const bx = Math.cos(a) * 0.05, bz = Math.sin(a) * 0.05;
        TB.box(0.1, len, 0.015, C(c), bx, 1.7 - len / 2, bz, 0.006, [0, -a + Math.PI / 2, 0]);
        TB.box(0.1, len * 0.7, 0.015, C(c), bx * 1.6, 1.7 - len * 0.35, bz * 1.6 + 0.0, 0.006, [0, -a + Math.PI / 2, 0.05]);
      }

      TB.flush();
      let rock = 0;
      live((t, dt) => {
        rock = Math.max(0, rock - dt * 0.9);
        tree.rotation.z = Math.sin(t * 7) * 0.05 * rock;
        tree.rotation.x = Math.cos(t * 6) * 0.03 * rock;
        hats.forEach((h, i) => { const k = Math.max(0, Math.sin((rock * 3 - i * 0.3) * Math.PI)) * (rock > 0.05 ? 1 : 0); h.position.y = h.userData.y + k * 0.06 * rock; });
      });
      tap(tree, 'hat tree', (sfx) => { rock = 1; sfx([[392, 0.08], [494, 0.08], [587, 0.08], [784, 0.15]], 'square', 0.025); });
    }
  }

  // ═════════════ 4. under the spool pegboard: a cubby shelf of cloth bolts, end-on ═════════════
  {
    const X = EW - 0.22, Z = -3.0, L = 1.3, HH = 0.86;
    if (free(X, Z, 0.2)) {
      block(X - 0.22, EW, Z - L / 2, Z + L / 2);
      addBox(0.42, 0.04, L, wood, X, HH, Z, 0.012);
      addBox(0.42, 0.04, L, wood, X, 0.03, Z, 0.012);
      addBox(0.42, 0.03, L, wood, X, HH / 2, Z, 0.01);
      for (let k = 0; k <= 4; k++) addBox(0.42, HH, 0.03, wood, X, HH / 2, Z - L / 2 + k * L / 4, 0.008);
      for (let r = 0; r < 2; r++) for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) for (let m = 0; m < 2; m++) {
        const z = Z - L / 2 + k * L / 4 + 0.06 + j * 0.1, y = 0.05 + r * HH / 2 + 0.05 + m * 0.1;
        add(new THREE.CylinderGeometry(0.05, 0.05, 0.38, 12), C(r * 11 + k * 5 + j * 3 + m * 7), X, y, z, [0, 0, Math.PI / 2]);
      }
      // a tape measure hanging off the pegboard, swaying
      const tp = grp(EW - 0.05, 1.88, -2.38);
      const tpM = paint(0xe4b84f);
      mesh(tube([[0, 0, 0], [-0.04, -0.15, 0.02], [-0.05, -0.38, -0.02], [-0.03, -0.58, 0.01]], 0.01, 16, 5), tpM, tp);
      mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.025, 14), paint(0xe8604c), tp, -0.03, -0.6, 0.01, [Math.PI / 2, 0, 0]);
      live((t) => { tp.rotation.x = Math.sin(t * 1.3) * 0.08; tp.rotation.z = Math.sin(t * 0.9) * 0.05; });
    }
  }

  // ═════════════ 5. a wall clock and a shoe-box tower (east wall, back) ═════════════
  {
    const z = -4.25;
    const clock = grp(EW - 0.05, 2.05, z); clock.rotation.y = -Math.PI / 2;      // faces the room (−x)
    mesh(rb(0.36, 0.7, 0.08, 0.03), woodDk, clock, 0, -0.1, 0);
    const face = mesh(new THREE.CircleGeometry(0.13, 24), texMat(128, 128, (c, w, h) => {
      c.fillStyle = '#fbf6ea'; c.beginPath(); c.arc(w / 2, h / 2, w / 2, 0, 7); c.fill();
      c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 18px ${HAND}`;
      for (let k = 1; k <= 12; k++) { const a = k / 12 * Math.PI * 2 - Math.PI / 2; c.fillText(k, w / 2 + Math.cos(a) * 48, h / 2 + Math.sin(a) * 48); }
    }), clock, 0, 0.08, 0.042); face.userData.noInk = true;
    const hands = [];
    for (const [len, wd] of [[0.075, 0.012], [0.11, 0.008]]) { const hnd = grp(0, 0.08, 0.046, clock); const hm = mesh(new THREE.PlaneGeometry(wd, len).translate(0, len / 2, 0), paint(0x2a2230, { hatch: 0 }), hnd); hm.userData.noInk = true; hands.push(hnd); }
    const win = mesh(new THREE.PlaneGeometry(0.22, 0.3), paint(0x3a3040, { hatch: 0 }), clock, 0, -0.23, 0.041); win.userData.noInk = true;
    const pend = grp(0, -0.1, 0.05, clock);                                         // pivot at the top of the rod
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 4).translate(0, -0.11, 0), brass, pend).userData.noInk = true;
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 14).rotateX(Math.PI / 2).translate(0, -0.23, 0), brass, pend);
    live((t) => {
      pend.rotation.z = Math.sin(t * Math.PI) * 0.3;
      const now = new Date(), m = now.getMinutes() + now.getSeconds() / 60, hr = (now.getHours() % 12) + m / 60;
      hands[0].rotation.z = -hr / 12 * Math.PI * 2; hands[1].rotation.z = -m / 60 * Math.PI * 2;
    });
    // shoe boxes stacked on the floor under it, a pair on top
    const BX = 3.66, BZ = -4.2;
    if (free(BX, BZ, 0.2)) {
      claim(BX, BZ, 0.2);
      let y = 0;
      [[0.42, 0.14, 0.26, 3], [0.4, 0.13, 0.24, 0], [0.38, 0.12, 0.24, 8], [0.36, 0.12, 0.22, 2], [0.34, 0.11, 0.21, 7]].forEach(([w, h, d, c], i) => {
        const ry = Math.sin(i * 2.1) * 0.12 + Math.PI / 2;
        addBox(d, h, w, C(c), BX, y + h / 2, BZ, 0.008, [0, ry - Math.PI / 2, 0]);
        addBox(d + 0.01, 0.025, w + 0.01, i % 2 ? cream : paint(0x2a2230), BX, y + h - 0.01, BZ, 0.006, [0, ry - Math.PI / 2, 0]);
        y += h;
      });
      shoes(S, BX, y, BZ, Math.PI / 2 + 0.3, C(5));
    }
  }

  // ═════════════ 6. the back west: a sideboard of cubbies with a sewing machine, shelves above ═════════════
  {
    const X = -2.63, Z = BACK + 0.22, Wd = 0.84, Hh = 0.8;
    block(X - Wd / 2, X + Wd / 2, BACK, Z + 0.22);
    addBox(Wd, 0.04, 0.42, wood, X, Hh, Z, 0.012);
    addBox(Wd, 0.04, 0.42, wood, X, 0.04, Z, 0.012);
    addBox(Wd - 0.04, 0.03, 0.4, wood, X, Hh / 2 + 0.02, Z, 0.01);
    for (const s of [-1, 0, 1]) addBox(0.03, Hh, 0.42, wood, X + s * (Wd / 2 - 0.015), Hh / 2, Z, 0.008);
    for (let r = 0; r < 2; r++) for (const s of [-1, 1]) fold(S, X + s * Wd / 4, 0.055 + r * (Hh / 2 - 0.02) + 0.005, Z + 0.02, 5 - r, r * 4 + s + 3, 0.3, 0.28);
    // the sewing machine
    const sm = grp(X, Hh + 0.02, Z + 0.02);
    const body = paint(0x2a2230, { hatch: 0.3 }), gold = brass;
    mesh(rb(0.44, 0.05, 0.22, 0.012), woodLt, sm, 0, 0.025, 0);
    mesh(rb(0.09, 0.22, 0.13, 0.03), body, sm, 0.15, 0.16, 0);
    mesh(rb(0.42, 0.08, 0.13, 0.035), body, sm, -0.0, 0.29, 0);
    mesh(rb(0.09, 0.14, 0.12, 0.03), body, sm, -0.17, 0.2, 0);
    mesh(rb(0.3, 0.012, 0.004, 0.002), gold, sm, 0, 0.29, 0.066).userData.noInk = true;
    const needle = grp(-0.17, 0.13, 0.03, sm);
    mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 4).translate(0, -0.04, 0), paint(0xc9ccd6), needle);
    const wheel = grp(0.215, 0.24, 0, sm);
    mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.025, 16).rotateZ(Math.PI / 2), paint(0x5a5060), wheel);
    mesh(rb(0.03, 0.1, 0.012, 0.004), gold, wheel, 0.014, 0.0, 0);
    const spool = grp(0.06, 0.35, 0, sm);
    mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.05, 12), C(0), spool, 0, 0.025, 0);
    const cloth = mesh(rb(0.3, 0.008, 0.18, 0.003), C(3), sm, -0.1, 0.054, 0.02);
    let sew = 0;
    live((t, dt) => {
      sew = Math.max(0, sew - dt / 2);
      const on = sew > 0;
      needle.position.y = 0.13 - (on ? (Math.sin(t * 40) * 0.5 + 0.5) * 0.03 : 0);
      wheel.rotation.x -= (on ? 25 : 0) * dt;
      spool.rotation.y -= (on ? 18 : 0) * dt;
      if (on) cloth.position.x = -0.1 + ((t * 0.06) % 0.06) - 0.03;
    });
    tap(sm, 'sewing machine', (sfx) => { sew = 1; sfx(Array.from({ length: 14 }, (_, i) => [i % 2 ? 140 : 180, 0.06]), 'square', 0.02); });
    // two wall shelves above: hat boxes and folded jumpers
    for (const [y, items] of [[1.45, 'fold'], [1.9, 'hats']]) {
      addBox(Wd + 0.04, 0.04, 0.26, wood, X, y, BACK + 0.13, 0.01);
      for (const s of [-1, 1]) addBox(0.03, 0.12, 0.2, wood, X + s * 0.36, y - 0.08, BACK + 0.11, 0.006);
      if (items === 'fold') { fold(S, X - 0.22, y + 0.02, BACK + 0.14, 4, 2, 0.26, 0.2); fold(S, X + 0.12, y + 0.02, BACK + 0.14, 3, 9, 0.26, 0.2); add(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 12), C(4), X + 0.36, y + 0.07, BACK + 0.14); }
      else {
        add(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 18), paint(0xf2a7bd), X - 0.2, y + 0.12, BACK + 0.14);
        add(new THREE.CylinderGeometry(0.145, 0.145, 0.04, 18), cream, X - 0.2, y + 0.22, BACK + 0.14);
        add(new THREE.CylinderGeometry(0.11, 0.11, 0.15, 18), paint(0x7fb3a8), X + 0.2, y + 0.095, BACK + 0.14);
        add(new THREE.CylinderGeometry(0.115, 0.115, 0.035, 18), paint(0x2f5a52), X + 0.2, y + 0.18, BACK + 0.14);
        add(new THREE.TorusGeometry(0.11, 0.008, 5, 18, Math.PI), paint(0xe8604c), X - 0.2, y + 0.24, BACK + 0.14);
      }
    }
  }

  // ═════════════ 7. the west wall: hats on pegs above the clothes rail, a striped awning edge ═════════════
  {
    const x = -EW + 0.02;
    addBox(0.04, 0.08, 2.2, woodDk, x + 0.02, 2.12, -3.8, 0.012);
    const hatCols = [0x3f5872, 0xe4b84f, 0x8e2f3a, 0x2f5a52, 0xb7a3c6];
    for (let k = 0; k < 5; k++) {
      const z = -4.7 + k * 0.45;
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.14, 6), woodDk, x + 0.08, 2.12, z, [0, 0, -(Math.PI / 2 - 0.35)]);
      const hm = paint(hatCols[k]);
      // each hat hangs on its peg, tipped toward the room
      const b = M4(x + 0.15, 2.08, z, 0);              // the brim against the peg, the crown toward the room
      if (k % 3 === 0) { add(new THREE.CylinderGeometry(0.15, 0.15, 0.012, 20), hm, 0, 0, 0, [0, 0, -1.2], null, b); add(new THREE.CylinderGeometry(0.07, 0.085, 0.1, 16), hm, 0.047, 0.018, 0, [0, 0, -1.2], null, b); }
      else if (k % 3 === 1) { add(new THREE.CylinderGeometry(0.2, 0.2, 0.012, 20), hm, 0, 0, 0, [0, 0, -1.25], null, b); add(new THREE.SphereGeometry(0.085, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), hm, -0.01, 0.0, 0, [0, 0, -1.25], null, b); }
      else { add(new THREE.SphereGeometry(0.11, 12, 8), hm, 0.0, 0, 0, [0, 0, -1.2], [1, 0.33, 1], b); }
    }
    // scarves draped from the rail ends
    for (const [z, c] of [[-4.62, 0], [-2.98, 2]]) for (const [dx, len] of [[-0.028, 0.55], [0.028, 0.4]]) addBox(0.014, len, 0.08, C(c), -3.35 + dx, 1.7 - len / 2, z, 0.006);   // scarves folded over the rail

    // shoes lined up under the rail
    shoes(S, -3.4, 0, -4.4, Math.PI / 2, C(5)); shoes(S, -3.4, 0, -3.95, Math.PI / 2, C(1)); shoes(S, -3.4, 0, -3.5, Math.PI / 2, C(13)); shoes(S, -3.4, 0, -3.1, Math.PI / 2, C(8));
  }

  // ═════════════ 8. the sofa corner (west front): shopper 3 sits; bags and cushions ═════════════
  {
    const X = -3.52, Z = -0.48, LEN = 1.36, DEP = 0.74;
    block(X - DEP / 2, X + DEP / 2, Z - LEN / 2, Z + LEN / 2);
    const sofa = paint(0x7fb3a8, { hatch: 0.6 }), sofaDk = paint(0x5f938a, { hatch: 0.6 });
    addBox(DEP - 0.06, 0.22, LEN - 0.1, sofaDk, X + 0.02, 0.2, Z, 0.05);
    for (const s of [-1, 1]) addBox(0.5, 0.12, LEN / 2 - 0.16, sofa, X + 0.07, 0.37, Z + s * (LEN / 4 - 0.04), 0.05);
    addBox(0.2, 0.52, LEN - 0.12, sofa, X - DEP / 2 + 0.1, 0.55, Z, 0.08);
    for (const s of [-1, 1]) addBox(DEP, 0.46, 0.14, sofa, X, 0.3, Z + s * (LEN / 2 - 0.07), 0.06);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) add(new THREE.CylinderGeometry(0.025, 0.018, 0.09, 8), woodDk, X + dx * (DEP / 2 - 0.08), 0.045, Z + dz * (LEN / 2 - 0.08));
    // cushions on the far seat, a throw over the back
    addBox(0.12, 0.28, 0.3, C(0), X - 0.2, 0.55, Z + 0.37, 0.05, [0, 0.2, 0.2]);
    addBox(0.12, 0.25, 0.26, C(2), X - 0.17, 0.53, Z + 0.12, 0.05, [0, -0.1, 0.25]);
    addBox(0.24, 0.03, 0.42, C(8), X - DEP / 2 + 0.11, 0.82, Z + 0.32, 0.01);              // a knitted throw over the back
    addBox(0.03, 0.32, 0.42, C(8), X - DEP / 2 + 0.215, 0.67, Z + 0.32, 0.01, [0, 0, 0.12]);
    const SEAT = 0.43;
    const sx = X + 0.1, sz = Z - 0.33;
    shoppers.push([sx, sz, Math.PI / 2, 'sit', SEAT]);                         // facing the shop floor (+x)
    // the ottoman / coffee table with a lookbook, tea and a pincushion
    const OX = -2.55, OZ = -0.3;
    if (free(OX, OZ, 0.3)) {
      claim(OX, OZ, 0.28);
      add(new THREE.CylinderGeometry(0.28, 0.28, 0.32, 20), paint(0xe4b84f, { hatch: 0.5 }), OX, 0.2, OZ);
      add(new THREE.CylinderGeometry(0.25, 0.25, 0.04, 20), woodDk, OX, 0.02, OZ);
      add(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 20), woodLt, OX, 0.375, OZ);
      put(new THREE.PlaneGeometry(0.24, 0.17), texMat(160, 112, (c, w, h) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h); c.fillStyle = '#e8604c'; c.fillRect(0, 0, w, 28);
        c.fillStyle = '#fff'; c.font = `700 22px ${SCRIPT}`; c.textAlign = 'center'; c.fillText('LOOKBOOK', w / 2, 21);
        for (let k = 0; k < 4; k++) { c.fillStyle = ['#3f5872', '#e4b84f', '#7fb3a8', '#b7a3c6'][k]; c.fillRect(10 + k * 37, 40, 30, 56); }
      }), OX - 0.04, 0.401, OZ + 0.04, [-Math.PI / 2, 0, 0.4]).userData.noInk = true;
      addBox(0.25, 0.012, 0.18, paint(0xe8604c), OX - 0.04, 0.392, OZ + 0.04, 0.004, [0, 0.4, 0]);
      add(lathe([[0.001, 0], [0.03, 0], [0.036, 0.05], [0.032, 0.05], [0.026, 0.008], [0.001, 0.008]], 14), cream, OX + 0.15, 0.39, OZ - 0.1);
      add(new THREE.SphereGeometry(0.04, 12, 8), paint(0xe8604c), OX - 0.12, 0.41, OZ - 0.14, null, [1, 0.7, 1]);
      for (let k = 0; k < 5; k++) add(new THREE.CylinderGeometry(0.002, 0.002, 0.05, 3), metal, OX - 0.12 + Math.cos(k * 1.3) * 0.02, 0.44, OZ - 0.14 + Math.sin(k * 1.3) * 0.02, [Math.sin(k) * 0.5, 0, Math.cos(k) * 0.5]);
    }
    // a standing lamp at the sofa's back end
    const LX = -3.66, LZ = -1.4;
    if (free(LX, LZ, 0.18)) {
      claim(LX, LZ, 0.16);
      add(new THREE.CylinderGeometry(0.14, 0.16, 0.03, 16), woodDk, LX, 0.015, LZ);
      add(new THREE.CylinderGeometry(0.014, 0.014, 1.5, 8), brass, LX, 0.77, LZ);
      const shade = put(new THREE.CylinderGeometry(0.12, 0.2, 0.24, 18, 1, true), paint(0xf6e3b8, { side: THREE.DoubleSide, emissive: 0x806030 }), LX, 1.55, LZ);
      shade.material.emissiveIntensity = 0.6;
    }
    // shopping bags: tap one and its tissue paper puffs up with a rustle
    const BAGS = [[-3.0, -1.18, 0x8e2f3a, 0.3], [-3.33, -1.4, 0xf1e4c8, -0.4], [-2.08, 0.15, 0x3f5872, 0.7]];
    BAGS.forEach(([x, z, col, ry], i) => {
      if (!free(x, z, 0.13)) return;
      claim(x, z, 0.12);
      const bag = grp(x, 0, z); bag.rotation.y = ry;
      const bm = paint(col);
      mesh(rb(0.26, 0.3, 0.12, 0.012), bm, bag, 0, 0.15, 0);
      for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.05, 0.008, 5, 12, Math.PI), paint(0x2a2230), bag, s * 0.0, 0.3, s * 0.035);
      const lbl = mesh(new THREE.PlaneGeometry(0.16, 0.1), texMat(96, 60, (c, w, h) => {
        c.fillStyle = col === 0xf1e4c8 ? '#8e2f3a' : '#fbf6ea'; c.font = `700 26px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('C·M', w / 2, h / 2);
      }), bag, 0, 0.16, 0.061); lbl.userData.noInk = true;
      const tissue = grp(0, 0.29, 0, bag);
      for (let k = 0; k < 3; k++) { const ts = mesh(new THREE.ConeGeometry(0.05, 0.12, 4), paint([0xf2a7bd, 0xfbf6ea, 0xe4b84f][(k + i) % 3]), tissue, (k - 1) * 0.07, 0.04, 0, [0, k, (k - 1) * 0.3]); ts.userData.noInk = true; }
      let pop = 0;
      live((t, dt) => {
        pop = Math.max(0, pop - dt * 1.4);
        tissue.position.y = 0.29 + Math.sin(Math.min(1, pop) * Math.PI) * 0.08;
        tissue.scale.setScalar(1 + pop * 0.4);
        bag.rotation.z = Math.sin(t * 20) * 0.04 * pop;
      });
      tap(bag, 'shopping bag', (sfx) => { pop = 1; sfx(Array.from({ length: 6 }, (_, k) => [2400 + (k % 3) * 600, 0.025]), 'square', 0.012); });
    });
  }

  // ═════════════ 9. the nesting table of folded stacks, by the cutting table ═════════════
  {
    const X = -1.3, Z = -3.42;
    if (free(X, Z, 0.36)) {
      claim(X, Z, 0.36);
      for (const [w, h, d, dx, dz] of [[0.72, 0.62, 0.48, 0, 0], [0.5, 0.42, 0.38, 0.22, 0.24]]) {
        addBox(w, 0.04, d, woodLt, X + dx, h, Z + dz, 0.012);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) addBox(0.035, h, 0.035, woodDk, X + dx + sx * (w / 2 - 0.03), h / 2, Z + dz + sz * (d / 2 - 0.03), 0.008);
      }
      fold(S, X - 0.18, 0.64, Z - 0.05, 6, 1, 0.26, 0.24, 0.1);
      fold(S, X + 0.15, 0.64, Z - 0.08, 4, 6, 0.26, 0.24, -0.1);
      fold(S, X + 0.3, 0.44, Z + 0.28, 3, 10, 0.2, 0.2, 0.3);
      const tent = put(new THREE.PlaneGeometry(0.16, 0.1), texMat(96, 60, (c, w, h) => {
        c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.fillStyle = '#c0392b'; c.font = `700 32px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('new!', w / 2, h / 2);
      }), X + 0.13, 0.94, Z + 0.06, [-0.3, 0, 0]); tent.userData.noInk = true;
    }
  }

  // ═════════════ 10. cloth by the door: a barrel of bolts, a basket of scraps ═════════════
  {
    const X = -1.0, Z = 0.06;
    if (free(X, Z, 0.24)) {
      claim(X, Z, 0.22);
      add(lathe([[0.001, 0], [0.18, 0], [0.21, 0.2], [0.19, 0.42], [0.001, 0.42]], 18), wood, X, 0, Z);
      for (const y of [0.08, 0.34]) add(new THREE.TorusGeometry(0.2, 0.012, 5, 22), metal, X, y, Z, [Math.PI / 2, 0, 0]);
      [[0.07, 0.05, 0.5, 0.12, 0], [-0.08, 0.04, 0.46, -0.1, 5], [0.02, -0.09, 0.58, 0.05, 2], [-0.04, 0.1, 0.42, -0.18, 9], [0.1, -0.05, 0.44, 0.2, 3]].forEach(([dx, dz, h, tilt, c]) => {
        add(new THREE.CylinderGeometry(0.05, 0.05, h, 12), C(c), X + dx + tilt * h * 0.3, 0.2 + h / 2, Z + dz, [tilt * 0.4, 0, -tilt]);
      });
    }
    const BX = -0.8, BZ = -2.25;
    if (free(BX, BZ, 0.18)) {
      claim(BX, BZ, 0.17);
      add(lathe([[0.001, 0], [0.13, 0], [0.17, 0.28], [0.155, 0.28], [0.12, 0.02], [0.001, 0.02]], 16), paint(0xc9a26b, { side: THREE.DoubleSide, hatch: 1 }), BX, 0, BZ);
      for (let k = 0; k < 6; k++) add(new THREE.SphereGeometry(0.07, 8, 6), C(k * 3 + 2), BX + Math.cos(k * 1.1) * 0.07, 0.26 + (k % 2) * 0.04, BZ + Math.sin(k * 1.1) * 0.08, [k, k * 2, 0], [1.2, 0.6, 0.9]);
      scarf(S, [[BX + 0.12, 0.3, BZ + 0.08], [BX + 0.2, 0.25, BZ + 0.14], [BX + 0.23, 0.02, BZ + 0.2]], C(10), 0.025);
    }
  }

  // ═════════════ 11. upper walls: fabric-swatch bunting, a sign over the label ═════════════
  {
    const strings = [];
    for (const sx of [-1, 1]) {
      const x = sx * (EW - 0.12), z0 = -5.2, z1 = -0.4, Y = 2.55, SAG = 0.18;
      const sg = grp(x, Y, 0);                                                     // swings about the line of the string
      const BB = batch(sg);
      const pts = []; for (let k = 0; k <= 16; k++) { const u = k / 16; pts.push([0, -Math.sin(u * Math.PI) * SAG, z0 + (z1 - z0) * u]); }
      BB.add(tube(pts, 0.006, 32, 4), paint(0x2a2230, { hatch: 0 }));
      for (let k = 1; k < 14; k++) {
        const u = k / 14, y = -Math.sin(u * Math.PI) * SAG, z = z0 + (z1 - z0) * u;
        const tri = new THREE.BufferGeometry().setFromPoints([V3(0, 0, -0.08), V3(0, -0.2, 0), V3(0, 0, 0.08)]);
        tri.computeVertexNormals(); tri.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0.5, 0, 1, 1], 2));
        BB.add(tri, paint(COLS[(k * 5 + (sx > 0 ? 3 : 0)) % COLS.length], { side: THREE.DoubleSide, hatch: 0.6 }), 0, y, z);
      }
      for (const z of [z0, z1]) add(new THREE.SphereGeometry(0.02, 8, 6), brass, x + sx * 0.08, Y + 0.005, z);
      for (const z of [z0, z1]) addBox(0.12, 0.02, 0.02, brass, sx * (EW - 0.06), Y + 0.005, z, 0.005);
      BB.flush();
      sg.traverse(o => { if (o.isMesh) o.userData.noInk = true; });
      strings.push(sg);
    }
    live((t) => strings.forEach((sg, i) => { sg.rotation.z = Math.sin(t * 0.8 + i * 2) * 0.05 * (i ? -1 : 1); }));
    // "Made to Measure" over the label
    addBox(0.82, 0.32, 0.03, paint(0x8e2f3a), LBL_X, 2.12, BACK + 0.02, 0.01);
    put(new THREE.PlaneGeometry(0.76, 0.26), texMat(304, 104, (c, w, h) => {
      c.fillStyle = '#f6efdf'; c.fillRect(0, 0, w, h);
      c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = `700 40px ${SCRIPT}`; c.fillText('Made to Measure', w / 2, 42);
      c.strokeStyle = '#e4b84f'; c.lineWidth = 8; c.beginPath(); c.moveTo(20, 80); c.lineTo(w - 20, 80); c.stroke();
      c.fillStyle = INKC; for (let x = 24; x < w - 20; x += 12) c.fillRect(x, 76, 2, x % 60 === 0 ? 10 : 6);
    }), LBL_X, 2.12, BACK + 0.04).userData.noInk = true;
  }

  // ═════════════ 12. a rolling rail behind the cutting table ═════════════
  {
    const z = -3.78, x0 = -2.8, x1 = -1.97, RH = 1.55;
    let ok = true;
    for (let x = x0; x <= x1 + 1e-6; x += (x1 - x0) / 3) if (!free(x, z, 0.24)) ok = false;
    if (ok) {
      block(x0 - 0.08, x1 + 0.08, z - 0.24, z + 0.24);
      for (const x of [x0, x1]) {
        addBox(0.04, RH, 0.04, metal, x, RH / 2 + 0.06, z, 0.01);
        addBox(0.05, 0.04, 0.44, metal, x, 0.08, z, 0.01);
        for (const s of [-1, 1]) add(new THREE.SphereGeometry(0.03, 8, 6), paint(0x2a2230), x, 0.03, z + s * 0.19);
      }
      add(new THREE.CylinderGeometry(0.018, 0.018, x1 - x0 + 0.08, 8), metal, (x0 + x1) / 2, RH + 0.06, z, [0, 0, Math.PI / 2]);
      for (let i = 0; i < 8; i++) {
        const x = x0 + 0.1 + i * (x1 - x0 - 0.2) / 7;
        garment(S, KINDS[(i * 5 + 2) % KINDS.length], C(i * 4 + 2), M4(x, RH + 0.075, z, Math.PI / 2 + Math.sin(i * 3) * 0.08), C(i + 9));
      }
    }
  }

  // ═════════════ 13. the bargain bin by the door: tap it and something jumps out ═════════════
  {
    const X = 1.2, Z = -0.12;
    if (free(X, Z, 0.32)) {
      claim(X, Z, 0.3);
      add(lathe([[0.001, 0], [0.26, 0], [0.3, 0.36], [0.28, 0.36], [0.24, 0.03], [0.001, 0.03]], 22), paint(0xc9a26b, { side: THREE.DoubleSide, hatch: 1 }), X, 0, Z);
      add(new THREE.TorusGeometry(0.29, 0.02, 6, 24), woodDk, X, 0.36, Z, [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 9; k++) add(new THREE.SphereGeometry(0.09, 8, 6), C(k * 5 + 1), X + Math.cos(k * 0.75) * (0.06 + (k % 3) * 0.06), 0.3 + (k % 2) * 0.04, Z + Math.sin(k * 0.75) * (0.06 + (k % 3) * 0.06), [k, k * 2, 0], [1.3, 0.45, 0.9]);
      const sign = put(new THREE.PlaneGeometry(0.3, 0.14), texMat(150, 70, (c, w, h) => {
        c.fillStyle = '#e8604c'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `700 40px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('SALE', w / 2, h / 2 + 2);
      }), X, 0.2, Z + 0.292, [-0.11, 0, 0]); sign.userData.noInk = true;
      // the thing that jumps: a striped sock
      const jump = grp(X + 0.05, 0.34, Z);
      const sockM = paint(0xe4b84f);
      mesh(tube([[0, 0, 0], [0, 0.14, 0], [0.02, 0.2, 0], [0.09, 0.22, 0]], 0.03, 12, 8), sockM, jump);
      for (const y of [0.05, 0.1]) mesh(new THREE.TorusGeometry(0.031, 0.008, 5, 12).rotateX(Math.PI / 2), paint(0xe8604c), jump, 0, y, 0).userData.noInk = true;
      jump.visible = false;
      let jt = -1;
      live((t, dt) => {
        if (jt < 0) return;
        jt += dt;
        const k = jt / 1.1;
        jump.visible = k < 1;
        jump.position.y = 0.2 + Math.sin(Math.min(1, k) * Math.PI) * 0.55;
        jump.rotation.z = k * Math.PI * 2;
        if (k >= 1) jt = -1;
      });
      // an invisible hit-shape over the whole bin (the bin itself is merged into the room)
      const hit = grp(X, 0, Z);
      const hm = paint(0xffffff, { opacity: 0, hatch: 0, unique: true }); hm.depthWrite = false;
      mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.38, 12).translate(0, 0.19, 0), hm, hit).userData.noInk = true;
      tap(hit, 'bargain bin', (sfx) => {
        jt = 0; sfx([[330, 0.06], [660, 0.08], [990, 0.1], [495, 0.12]], 'square', 0.025);
      });
    }
  }

  // ═════════════ 14. THE SIGNATURE TRICK: the shop cuts a real citizen, and they walk out onto the street ═════════════
  // A client's order comes in; every clue points at something in this shop (the sofa, the bolt on
  // the cutting table, what the customers are wearing). Get it right and they're cut to measure;
  // either way the new citizen is sewn for real and strolls the town from then on.
  {
    const TOPS = [
      ['sea-green', 0x7fb3a8, 'a coat the colour of the sofa'],
      ['wine red', 0x8e2f3a, 'a coat the colour of the fitting-room curtain'],
      ['mustard', 0xe4b84f, 'a coat the colour of the ottoman by the sofa'],
      ['rose pink', 0xf2a7bd, 'a coat the colour of the big hat box on the top shelf'],
    ];
    const BOTTOMS = [
      ['navy', 0x3f5872, 'trousers in the cloth rolled out on the cutting table'],
      ['ink black', 0x2a2230, 'trousers as dark as the sewing machine'],
      ['conker brown', 0x5c4030, 'trousers the colour of the hat tree'],
      ['slate grey', 0x6f7d92, 'trousers the grey of the clothes rails'],
    ];
    const HATS = [
      ['a flat cap', 'flat', 'the same kind of hat as the customer admiring themselves in the long mirror'],
      ['a cycling helmet', 'helmet', 'the same kind of hat as the customer browsing the round rack'],
    ];
    const HAT_DECOYS = [['a peaked cap', 'cap'], ['a beanie', 'beanie'], ['no hat', null]];
    const CUTS = [['a long coat', 'coat'], ['a cardigan', 'cardigan'], ['a work apron', 'apron'], ['a hi-vis vest', 'vest'], ['a dress', 'dress'], ['just the shirt', null]];
    const BUILDS = [['slim', 0.92, 1.0, 0], ['athletic', 1.02, 1.01, 0], ['broad', 1.14, 1.0, 0.3], ['round', 1.1, 0.97, 0.8], ['lanky', 0.9, 1.06, 0], ['petite', 0.95, 0.94, 0]];
    const HABITS = ['walks the dog twice a day', 'reads the paper on the bench', 'always has a coffee', 'is never off the phone', 'sits by the fountain', 'hums the same four notes', 'counts the pigeons', 'is training for a marathon (slowly)', 'collects other people’s lost gloves'];
    const FIRST = ['Rosa', 'Otto', 'Pia', 'Rex', 'Vivi', 'Juno', 'Milo', 'Ines', 'Theo', 'Nell', 'Arlo', 'Sunny', 'Wren', 'Bea', 'Kofi', 'Lupe', 'Ada', 'Ravi', 'Mei', 'Tomas', 'Yara', 'Idris'];
    const SURN = ['Button', 'Hem', 'Stitchwell', 'Bobbin', 'Thimble', 'Pleat', 'Seam', 'Selvedge', 'Gusset', 'Dart', 'Tuck', 'Bias'];
    const SKIN = ['fair', 'rose', 'olive', 'tan', 'brown', 'deep'], HAIR = [0x2b1d1a, 0x1d1a1a, 0x7a4a2a, 0xc98a4a, 0x9a9490, 0xe0c080, 0x8e2f3a];
    const HAIRSTYLE = ['bob', 'bun', 'crop', 'bald', 'pony', 'curls'];
    const SHOES = [0x5a3d2c, 0x2a2230, 0xe9e2d0, 0x8e2f3a, 0x3f5872];
    const pick = kit.anyOf, shuffle = kit.shuffle;

    // ── the send-off: the finished outfit rises off the cutting table on its hanger and glides out of the door ──
    const send = grp(0, -5, 0); send.visible = false;
    const topM = paint(0xffffff, { unique: true }), botM = paint(0xffffff, { unique: true }), hatM = paint(0xffffff, { unique: true });
    mesh(new THREE.TorusGeometry(0.03, 0.006, 5, 10, Math.PI * 1.3), metal, send, 0, 0.0, 0, [0, 0, 0.2]);
    mesh(rb(0.34, 0.02, 0.025, 0.006), hangerM, send, 0, -0.045, 0);
    mesh(rb(0.3, 0.46, 0.06, 0.025), topM, send, 0, -0.29, 0);
    for (const s of [-1, 1]) mesh(rb(0.08, 0.38, 0.05, 0.02), topM, send, s * 0.18, -0.26, 0, [0, 0, s * 0.12]);
    for (const s of [-1, 1]) mesh(rb(0.12, 0.5, 0.045, 0.02), botM, send, s * 0.065, -0.72, 0);
    const sendHat = mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.012, 16), hatM, send, 0, 0.09, 0);
    mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.07, 14), hatM, sendHat, 0, 0.035, 0);
    let sendT = -1;
    const FROM = V3(-1.9, 1.0, -2.4), TO = V3(0, 1.6, 0.9);
    live((t, dt) => {
      if (sendT < 0) return;
      sendT += dt;
      const u = Math.min(1, sendT / 3.2), e = u * u * (3 - 2 * u);
      send.position.lerpVectors(FROM, TO, e); send.position.y += Math.sin(u * Math.PI) * 0.6 + (u < 0.2 ? (u / 0.2 - 1) * 0.6 : 0);
      send.rotation.y = Math.sin(sendT * 4) * 0.4; send.rotation.z = Math.sin(sendT * 6) * 0.08;
      send.scale.setScalar(1 - Math.max(0, u - 0.75) * 3);
      if (u >= 1) { sendT = -1; send.visible = false; }
    });

    // ── the corkboard: the citizens this shop has cut, read back from the street's own list ──
    const boardTex = canvasTex(360, 240, () => {});
    const drawBoard = () => {
      const c = boardTex.image.getContext('2d'), w = 360, h = 240;
      c.fillStyle = '#c69c6d'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 500; k++) { c.fillStyle = `rgba(90,60,30,${0.1 + (k % 5) * 0.03})`; c.fillRect((k * 97) % w, (k * 53) % h, 2, 2); }
      c.fillStyle = INKC; c.textAlign = 'center'; c.font = `700 28px ${SCRIPT}`; c.fillText('Freshly cut — now on the street', w / 2, 30);
      let list = [];
      try { list = JSON.parse(localStorage.getItem('street-citizens') || '[]').slice(-3).reverse(); } catch (e) { /* ok */ }
      if (!list.length) { c.font = `22px ${HAND}`; c.fillText('nobody yet. cut the first!', w / 2, 130); c.fillText('(★ at the cutting table)', w / 2, 158); }
      list.forEach(({ look, name }, i) => {
        const x0 = 14 + i * 114, y0 = 46, cw = 104, chh = 180;
        c.save(); c.translate(x0 + cw / 2, y0 + chh / 2); c.rotate((i - 1) * 0.05); c.translate(-cw / 2, -chh / 2);
        c.fillStyle = '#f6ecd0'; c.fillRect(0, 0, cw, chh);
        // the pattern: a coat and trousers, dashed, in the client's colours
        const hex = (v) => '#' + new THREE.Color(v ?? 0x888888).getHexString();
        c.fillStyle = hex(look.top); c.beginPath(); c.moveTo(30, 28); c.lineTo(74, 28); c.lineTo(86, 52); c.lineTo(78, 56); c.lineTo(74, 96); c.lineTo(30, 96); c.lineTo(26, 56); c.lineTo(18, 52); c.closePath(); c.fill();
        c.fillStyle = hex(look.bottom); c.fillRect(32, 98, 18, 46); c.fillRect(54, 98, 18, 46);
        c.strokeStyle = INKC; c.lineWidth = 2; c.setLineDash([4, 3]); c.strokeRect(6, 6, cw - 12, 144); c.setLineDash([]);
        c.fillStyle = INKC; c.font = `700 17px ${HAND}`; c.fillText(name.split(' ')[0], cw / 2, 166);
        c.font = `13px ${HAND}`; c.fillText(look.hat ? 'with a ' + look.hat : 'no hat', cw / 2, 178);
        c.fillStyle = '#e8604c'; c.beginPath(); c.arc(cw / 2, 8, 5, 0, 7); c.fill();       // the pin
        c.restore();
      });
      boardTex.needsUpdate = true;
    };
    drawBoard();
    addBox(0.04, 0.66, 0.98, paint(0x6b4a34), -EW + 0.02, 1.62, -0.5, 0.01);
    put(new THREE.PlaneGeometry(0.9, 0.6), paint(0xffffff, { map: boardTex, hatch: 0.2, unique: true }), -EW + 0.045, 1.62, -0.5, [0, Math.PI / 2, 0]).userData.noInk = true;

    // ── the game: read the client's order, find each clue in the shop, cut, send them out ──
    kit.games.replace('cut a new citizen', (m) => {
      const g = m.game;
      const begin = () => {
        const name = `${pick(FIRST)} ${pick(SURN)}`, build = pick(BUILDS), habit = pick(HABITS);
        const top = pick(TOPS), bot = pick(BOTTOMS), hat = pick(HATS), cut = pick(CUTS);
        const got = { top: null, bot: null, hat: null }; let right = 0;
        g.open('Cut to measure');
        const order = `ORDER for ${name} — ${build[0]} build, ${cut[0]}. ${top[2][0].toUpperCase() + top[2].slice(1)}; ${bot[2]}; and ${hat[2]}. (Habit: ${habit}.)`;
        g.text(order + '\n\nEverything on the order is somewhere in this shop. Have a look round, then cut.');
        g.score('');
        const step = (k) => {
          const S = [
            ['The coat: which fabric?', TOPS.map(q => q[0]), TOPS.indexOf(top), (i) => { got.top = TOPS[i]; }],
            ['The trousers: which cloth?', BOTTOMS.map(q => q[0]), BOTTOMS.indexOf(bot), (i) => { got.bot = BOTTOMS[i]; }],
            ['And the hat?', null, 0, null],
          ][k];
          if (k === 2) {
            const opts = shuffle([[hat[0], hat[1], true], ...HATS.filter(q => q !== hat).map(q => [q[0], q[1], false]), ...shuffle(HAT_DECOYS).slice(0, 1).map(q => [q[0], q[1], false])]);
            g.text(order); g.note(''); g.score(`snip ${k + 1} of 3`);
            g.choices(opts.map(o => o[0]), (i) => { got.hat = opts[i]; if (opts[i][2]) right++; finish(); });
            return;
          }
          g.text(order); g.note(''); g.score(`snip ${k + 1} of 3`);
          g.choices(S[1], (i) => { S[3](i); if (i === S[2]) right++; step(k + 1); });
        };
        const finish = () => {
          const look = {
            skin: pick(SKIN), hair: pick(HAIR), hairStyle: pick(HAIRSTYLE),
            top: got.top[1], bottom: got.bot[1], shoes: pick(SHOES), sleeve: Math.random() < 0.3 ? 'short' : 'long',
            outfit: cut[1], accent: pick([0xd6e04c, 0xf1e4c8, 0xe8604c, 0xd8c9a8]),
            hat: got.hat[1], hatColor: pick([0x3f5872, 0x5b4636, 0x8e2f3a, 0x2f5a52, 0xe0b445]),
            height: build[2], build: build[1], belly: build[3], glasses: Math.random() < 0.25, beard: Math.random() < 0.2,
          };
          if (look.outfit === 'dress') look.bottom = got.bot[1];
          const ok = right === 3;
          // the outfit leaves on its hanger…
          topM.color.setHex(look.top); botM.color.setHex(look.bottom); hatM.color.setHex(look.hatColor); sendHat.visible = !!look.hat;
          send.visible = true; sendT = 0; send.position.copy(FROM);
          kit.sfx([[1568, 0.12], [2093, 0.3]], 'sine', 0.05);
          // …and the citizen is made for real, out on the street
          try { kit.street.addCitizen(look, name); } catch (e) { console.warn('citizen not sent:', e); }
          setTimeout(drawBoard, 50);
          g.choices([], () => {}); g.score(`${right} of 3 to measure`);
          g.text(`${ok ? 'Cut to measure!' : right ? 'Near enough — they love it anyway (they are very polite).' : 'Bold choices. They asked for none of this, and they are wearing it with pride.'} ` +
            `Meet ${name}: ${build[0]}, in ${got.top[0]} and ${got.bot[0]}, ${got.hat[1] ? got.hat[0] : 'no hat'}. ${name.split(' ')[0]} ${habit}. ` +
            `They're out on the street now — look for them when you leave. (Citizen Maker makes people like this on demand, for games.)`);
          if (ok) { g.good('Every clue spotted. A tailor’s eye!'); g.cheer(); } else g.bad(`${3 - right} snip${right === 2 ? '' : 's'} off the order — the clues are all in the shop: look again.`);
          g.next('cut another', begin); g.next('done', () => g.close());
          kit.say(`${name} is out on the street now.`);
        };
        g.next('start cutting ✂', () => step(0));
      };
      begin();
    }, 'cut a citizen to order');
  }

  // ═════════════ 15. funny bits: a mirror that compliments, an alterations notice, the moth in fitting room 1 ═════════════
  {
    const hm = paint(0xffffff, { opacity: 0, hatch: 0, unique: true }); hm.depthWrite = false;
    const mir = grp(3.33, 0, -1.4);
    mesh(rb(0.12, 1.7, 0.72, 0.01).translate(0, 0.88, 0), hm, mir).userData.noInk = true;
    const PRAISE = ['Mirror: “Looking procedurally generated — in the best way.”', 'Mirror: “Is that a new texture? It really brings out your normals.”',
      'Mirror: “Ten out of ten. Would render again.”', 'Mirror: “Honestly? Main-character energy. Not an NPC at all.”',
      'Mirror: “I’m only a mirror, but… wow.”', 'Mirror: “You’ve got great topology. I’m not supposed to say that.”'];
    let pi = 0;
    tap(mir, 'long mirror', (sfx) => { kit.say(PRAISE[pi++ % PRAISE.length]); sfx([[1318, 0.06], [1760, 0.12]], 'sine', 0.04); });
    // a notice on the fitting room's outer wall
    put(new THREE.PlaneGeometry(0.42, 0.5), texMat(168, 200, (c, w, h) => {
      c.fillStyle = '#fffdf6'; c.fillRect(0, 0, w, h); c.strokeStyle = INKC; c.lineWidth = 4; c.strokeRect(3, 3, w - 6, h - 6);
      c.fillStyle = '#8e2f3a'; c.textAlign = 'center'; c.font = `700 26px ${SCRIPT}`; c.fillText('Alterations', w / 2, 34);
      c.fillStyle = INKC; c.font = `16px ${HAND}`;
      ['We take in.', 'We let out.', 'We talk you out of it.', '', 'Sleeves: shortened', 'Patience: lengthened', 'NPCs: given backstories'].forEach((l, i) => c.fillText(l, w / 2, 64 + i * 19));
    }), 3.17, 1.35, -5.1, [0, -Math.PI / 2, 0]).userData.noInk = true;
  }

  // ═════════════ 16. WALK-OVER FLOOR: a runner, chalk marks, pattern paper, a tape line, threads and buttons ═════════════
  {
    const decal = (w, d, x, z, ry, draw, { y = 0.008, ppm = 128, ro = 1 } = {}) => {
      const m = put(new THREE.PlaneGeometry(w, d), texMat(Math.round(w * ppm), Math.round(d * ppm), draw), x, y, z, [-Math.PI / 2, 0, ry]);
      m.userData.noInk = true; m.renderOrder = ro; return m;
    };
    // the long runner from the door to the rug
    decal(0.8, 2.1, 0, -0.73, 0, (c, w, h) => {
      c.fillStyle = '#8e2f3a'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#e4b84f'; c.lineWidth = 5; c.strokeRect(9, 9, w - 18, h - 18);
      c.fillStyle = 'rgba(228,184,79,0.55)';
      for (let y = 40; y < h - 30; y += 46) { c.save(); c.translate(w / 2, y); c.rotate(Math.PI / 4); c.fillRect(-9, -9, 18, 18); c.restore(); }
      c.fillStyle = '#f1e4c8'; for (let x = 6; x < w; x += 8) { c.fillRect(x, 0, 3, 7); c.fillRect(x, h - 7, 3, 7); }   // fringe
    });
    // pattern-paper pieces: tissue sheets with dashed cutting lines and their labels
    const piece = (label, shape) => (c, w, h) => {
      c.fillStyle = 'rgba(246,236,200,0.93)'; c.beginPath(); shape(c, w, h); c.fill();
      c.strokeStyle = INKC; c.lineWidth = 2; c.setLineDash([7, 5]); c.beginPath(); shape(c, w, h, 8); c.stroke(); c.setLineDash([]);
      c.strokeStyle = '#3f5872'; c.lineWidth = 2; c.beginPath(); c.moveTo(w * 0.5, h * 0.25); c.lineTo(w * 0.5, h * 0.7); c.stroke();      // the grain line
      c.fillStyle = '#3f5872'; c.beginPath(); c.moveTo(w * 0.5, h * 0.22); c.lineTo(w * 0.47, h * 0.29); c.lineTo(w * 0.53, h * 0.29); c.fill();
      c.fillStyle = INKC; c.font = `700 ${Math.round(w / 9)}px ${HAND}`; c.textAlign = 'center'; c.fillText(label, w / 2, h * 0.84);
    };
    const bodice = (c, w, h, i = 0) => { c.moveTo(w * 0.2 + i, h * 0.05 + i); c.lineTo(w * 0.8 - i, h * 0.05 + i); c.lineTo(w * 0.95 - i, h * 0.3); c.lineTo(w * 0.85 - i, h * 0.95 - i); c.lineTo(w * 0.15 + i, h * 0.95 - i); c.lineTo(w * 0.05 + i, h * 0.3); c.closePath(); };
    const sleeve = (c, w, h, i = 0) => { c.moveTo(w * 0.1 + i, h * 0.35); c.quadraticCurveTo(w * 0.5, h * 0.0 + i * 2, w * 0.9 - i, h * 0.35); c.lineTo(w * 0.75 - i, h * 0.95 - i); c.lineTo(w * 0.25 + i, h * 0.95 - i); c.closePath(); };
    const skirt = (c, w, h, i = 0) => { c.moveTo(w * 0.32 + i, h * 0.05 + i); c.lineTo(w * 0.68 - i, h * 0.05 + i); c.lineTo(w * 0.95 - i, h * 0.95 - i); c.lineTo(w * 0.05 + i, h * 0.95 - i); c.closePath(); };
    decal(1.1, 0.95, 0.1, -4.15, 0.12, piece('FRONT — cut 1 on fold', bodice), { y: 0.009, ppm: 110 });
    decal(0.6, 0.65, 1.05, -3.85, -0.5, piece('SLEEVE ×2', sleeve), { y: 0.01, ppm: 120 });
    decal(0.7, 0.75, -0.75, -4.0, 0.4, piece('SKIRT PANEL', skirt), { y: 0.011, ppm: 120 });
    decal(0.55, 0.6, 1.45, -1.55, 0.9, piece('BACK', bodice), { y: 0.01, ppm: 120 });
    decal(0.5, 0.55, -2.45, -1.08, -0.3, piece('COLLAR', sleeve), { y: 0.01, ppm: 120 });
    // tailor's chalk on the boards
    const chalk = (draw) => (c, w, h) => { c.strokeStyle = 'rgba(250,248,240,0.85)'; c.fillStyle = 'rgba(250,248,240,0.85)'; c.lineWidth = 3; c.lineCap = 'round'; draw(c, w, h); };
    decal(0.7, 0.5, -0.85, -1.05, 0.2, chalk((c, w, h) => {
      c.beginPath(); c.moveTo(10, h * 0.3); c.lineTo(w - 10, h * 0.3); c.stroke();
      for (let x = 20; x < w - 10; x += 22) { c.beginPath(); c.moveTo(x, h * 0.3 - 6); c.lineTo(x, h * 0.3 + 6); c.stroke(); }
      c.font = `24px ${SCRIPT}`; c.fillText('✂ cut here', 20, h * 0.75); c.beginPath(); c.moveTo(w - 40, h * 0.6); c.lineTo(w - 20, h * 0.8); c.moveTo(w - 20, h * 0.6); c.lineTo(w - 40, h * 0.8); c.stroke();
    }), { y: 0.006 });
    decal(0.6, 0.5, 1.45, -0.95, -0.3, chalk((c, w, h) => {
      c.font = `22px ${SCRIPT}`; c.fillText('chest 96', 10, 30); c.fillText('waist 81', 10, 58); c.fillText('inside leg: ??', 10, 86);
      c.beginPath(); c.arc(w - 30, 40, 14, 0, 7); c.stroke();
    }), { y: 0.006 });
    decal(0.5, 0.5, -0.8, -2.9, 0.6, chalk((c, w, h) => { c.setLineDash([8, 6]); c.beginPath(); c.arc(w / 2, h / 2, w * 0.35, 0, 7); c.stroke(); c.setLineDash([]); c.beginPath(); c.moveTo(w / 2 - 10, h / 2); c.lineTo(w / 2 + 10, h / 2); c.moveTo(w / 2, h / 2 - 10); c.lineTo(w / 2, h / 2 + 10); c.stroke(); }), { y: 0.021, ro: 2 });
    // threads, buttons and pins dropped round the cutting table and the rack
    const clutter = (seed) => (c, w, h) => {
      const Rr = kit.mkRng(seed);
      const cols = ['#e8604c', '#e4b84f', '#7fb3a8', '#8f7ae8', '#3f5872', '#f2a7bd'];
      for (let k = 0; k < 4; k++) { c.strokeStyle = cols[k]; c.lineWidth = 2; c.beginPath(); let x = Rr() * w, y = Rr() * h; c.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (Rr() - 0.5) * 60; y += (Rr() - 0.5) * 60; c.quadraticCurveTo(x + 20, y - 20, x, y); } c.stroke(); }
      for (let k = 0; k < 7; k++) { const x = Rr() * w, y = Rr() * h, r = 5 + Rr() * 5; c.fillStyle = cols[k % cols.length]; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); c.fillStyle = 'rgba(0,0,0,0.35)'; for (const [dx, dy] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) c.fillRect(x + dx - 1, y + dy - 1, 2, 2); }
      for (let k = 0; k < 5; k++) { const x = Rr() * w, y = Rr() * h, a = Rr() * 6; c.strokeStyle = '#9aa0aa'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); c.stroke(); c.fillStyle = cols[k % cols.length]; c.beginPath(); c.arc(x, y, 3, 0, 7); c.fill(); }
    };
    for (const [x, z, s, sd] of [[-1.15, -0.45, 0.6, 3], [0.55, -1.25, 0.55, 8], [1.6, -2.95, 0.6, 13], [-2.9, -2.0, 0.5, 21], [0.6, -0.15, 0.5, 34]]) decal(s, s, x, z, sd, clutter(sd), { y: 0.013, ppm: 120, ro: 2 });

    // the fun one: a tape measure laid right across the floor — tap its case and it zips home, then rolls out again
    const CX = 1.72, CZ = -0.48, AX = -1.55, AZ = -0.82;
    const L = Math.hypot(CX - AX, CZ - AZ), ang = Math.atan2(AZ - CZ, CX - AX);
    const tapeG = new THREE.PlaneGeometry(L, 0.04).translate(-L / 2, 0, 0);          // anchored at the case end
    const tape = new THREE.Mesh(tapeG);
    const tapeTex = canvasTex(Math.round(L * 120), 24, (c, w, h) => {
      c.fillStyle = '#f2d04a'; c.fillRect(0, 0, w, h); c.fillStyle = INKC; c.font = `700 11px ${HAND}`;
      for (let k = 0; k * 12 < w; k++) { const x = w - k * 12; c.fillRect(x, 0, 1, k % 10 === 0 ? 12 : k % 5 === 0 ? 8 : 4); if (k % 10 === 0 && k) c.fillText(String(k), x + 2, 21); }
    });
    tape.material = paint(0xffffff, { map: tapeTex, hatch: 0, unique: true });
    tape.rotation.set(-Math.PI / 2, 0, ang); tape.position.set(CX, 0.012, CZ); tape.userData.noInk = true; tape.renderOrder = 3; g.add(tape);
    const reel = grp(CX, 0, CZ); reel.rotation.y = ang;
    mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 18), paint(0xe8604c), reel, 0.02, 0.015, 0);
    mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.033, 10), paint(0xc9ccd6), reel, 0.02, 0.015, 0);
    const tip = mesh(rb(0.012, 0.012, 0.045, 0.002), paint(0xc9ccd6), g, AX, 0.012, AZ, [0, ang, 0]);
    let zip = -1;
    live((t, dt) => {
      if (zip < 0) return;
      zip += dt;
      const k = zip < 0.5 ? 1 - zip / 0.5 : zip < 1.5 ? 0 : Math.min(1, (zip - 1.5) / 1.4);
      tape.scale.x = Math.max(0.02, k);
      tip.position.set(CX + (AX - CX) * k, 0.012, CZ + (AZ - CZ) * k);
      reel.children[0].rotation.y = zip * 20;
      if (zip > 2.9) zip = -1;
    });
    tap(reel, 'tape measure', (sfx) => {
      if (zip >= 0) return;
      zip = 0; sfx(Array.from({ length: 12 }, (_, i) => [2000 - i * 90, 0.02]), 'square', 0.015);
      setTimeout(() => sfx([[400, 0.04], [300, 0.06]], 'square', 0.03), 500);
      setTimeout(() => kit.say(kit.anyOf(['The shop floor: 3.3 m. The queue for the fitting room: longer.', 'Measure twice, cut once, zip it back for fun.', 'Inside leg: still ??.'])), 900);
    });
  }

  S.flush();
  g.userData.shoppers = shoppers;
}
