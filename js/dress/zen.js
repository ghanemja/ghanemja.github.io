// ─── dressing for the zen room ───
// A calm tatami tea room: a koi pond with a bamboo deer-scarer tipping into it, a cherry
// bonsai shedding petals, paper lanterns strung along both side walls, a tea corner with a
// steaming iron kettle, a stone basin that drips, a singing bowl, an incense shelf.
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default function dress(kit) {
  const { THREE, g, put, box, rb, paint, tap, free, claim, canvasTex, texMat, SCRIPT, HAND, D } = kit;
  // the room keeps its own clock so the singing bowl can slow everything down (the calm):
  // every animation here gets (T, dt·speed) instead of real time
  let speed = 1, T = 0;
  kit.live((t, dt) => { T += dt * speed; });
  const live = (fn) => kit.live((t, dt) => fn(T, dt * speed));
  const roomNow = () => T;
  const BACK = -D + 0.5, EW = 3.97;          // back wall face, east wall face (west is −EW)
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  // ── static pieces are merged per material so the room stays cheap ──
  const bins = new Map();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const add = (geo, mat, x = 0, y = 0, z = 0, rot = null, scl = null) => {
    _e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0);
    if (typeof scl === 'number') _s.set(scl, scl, scl); else if (scl) _s.set(scl[0], scl[1], scl[2]); else _s.set(1, 1, 1);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), _s);
    const gg = geo.index ? geo.toNonIndexed() : geo.clone();
    gg.applyMatrix4(_m);
    for (const k of Object.keys(gg.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') gg.deleteAttribute(k);
    if (!bins.has(mat)) bins.set(mat, []);
    bins.get(mat).push(gg);
  };
  const addBox = (w, h, d, mat, x, y, z, r = 0.02, rot) => add(rb(w, h, d, r), mat, x, y, z, rot);
  const noInkMats = new Set();
  const flush = () => {
    for (const [mat, list] of bins) {
      const m = new THREE.Mesh(mergeGeometries(list, false), mat);
      if (noInkMats.has(mat)) m.userData.noInk = true;
      g.add(m);
    }
    bins.clear();
  };
  const grp = (x = 0, y = 0, z = 0, parent = g) => { const o = new THREE.Group(); o.position.set(x, y, z); parent.add(o); return o; };
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0, rot = null) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z);
    if (rot) m.rotation.set(rot[0] || 0, rot[1] || 0, rot[2] || 0);
    parent.add(m); return m;
  };
  const lathe = (pts, seg = 18) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const tube = (pts, r, seg = 24, rs = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => V3(...p))), seg, r, rs);

  // ── shared materials ──
  const cane = paint(0x9cb35c), caneDk = paint(0x6f8a3a), wood = paint(0x7a5a40), woodLt = paint(0xc9a26b);
  const stoneM = paint(0x8f897f, { hatch: 0.6 }), stoneDk = paint(0x5e5a55, { hatch: 0.6 }), moss = paint(0x6f8f4a);
  const ironM = paint(0x3a3c40), cord = paint(0x2a2230, { hatch: 0 });
  const water = paint(0x7fb8c8, { opacity: 0.5, hatch: 0 }); noInkMats.add(water);

  // a pool of ripples: flat rings that spread and fade
  const ripples = [];
  for (let i = 0; i < 8; i++) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 28).rotateX(-Math.PI / 2), paint(0xffffff, { opacity: 0.7, hatch: 0, unique: true }));
    m.userData.noInk = true; m.visible = false; m.renderOrder = 3; g.add(m);
    ripples.push({ m, t: 1, r: 0.1 });
  }
  const ripple = (x, y, z, r = 0.12) => {
    const R = ripples.find(q => q.t >= 1) || ripples[0];
    R.t = 0; R.r = r; R.m.position.set(x, y, z); R.m.visible = true;
  };
  live((t, dt) => {
    for (const R of ripples) {
      if (R.t >= 1) continue;
      R.t = Math.min(1, R.t + dt / 1.4);
      const s = 0.02 + R.t * R.r;
      R.m.scale.set(s, 1, s); R.m.material.opacity = 0.7 * (1 - R.t);
      if (R.t >= 1) R.m.visible = false;
    }
  });
  // a pool of soft puffs (steam, incense smoke)
  const puffs = [];
  const puffer = (n, col, op) => {
    const list = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), paint(col, { opacity: op, hatch: 0, unique: true }));
      m.userData.noInk = true; g.add(m); list.push(m);
    }
    puffs.push(list); return list;
  };

  // ═════════════ 1. the koi pond (east front) ═════════════
  const PX = 2.3, PZ = -1.05, PRX = 0.85, PRZ = 0.6;
  if (free(PX, PZ, PRZ)) {
    claim(PX, PZ, 0.62);
    const bottom = put(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), paint(0x2f4a48, { hatch: 0.4 }), PX, 0.012, PZ);
    bottom.scale.set(PRX - 0.05, 1, PRZ - 0.05); bottom.userData.noInk = true;
    const surf = put(new THREE.CircleGeometry(1, 40).rotateX(-Math.PI / 2), water, PX, 0.1, PZ);
    surf.scale.set(PRX - 0.06, 1, PRZ - 0.06); surf.userData.noInk = true; surf.renderOrder = 2;
    // a ring of rounded river stones for the rim
    const rimR = kit.mkRng(77);
    for (let i = 0; i < 22; i++) {
      const a = i / 22 * Math.PI * 2, s = 0.09 + rimR() * 0.05;
      add(new THREE.DodecahedronGeometry(s, 1), rimR() < 0.3 ? stoneDk : stoneM, PX + Math.cos(a) * PRX, s * 0.45, PZ + Math.sin(a) * PRZ, [rimR(), rimR() * 3, 0], [1.2, 0.7, 1]);
    }
    // moss on a couple of rim stones and a little stone lantern-ish cairn on the far side
    for (const a of [0.6, 2.4, 4.3]) add(new THREE.SphereGeometry(0.07, 8, 6), moss, PX + Math.cos(a) * PRX, 0.11, PZ + Math.sin(a) * PRZ, null, [1.3, 0.45, 1.1]);
    // lily pads and a lotus
    const pad = paint(0x5f8f3e);
    for (const [u, v, r, a] of [[-0.45, 0.2, 0.09, 0.3], [-0.3, -0.25, 0.07, 2.1], [0.35, 0.28, 0.08, 4.2], [-0.58, -0.05, 0.06, 1]]) {
      add(new THREE.CylinderGeometry(r, r, 0.006, 16, 1, false, 0.3, Math.PI * 1.82), pad, PX + u, 0.104, PZ + v, [0, a, 0]);
    }
    const petal = paint(0xf2a7bd);
    for (let k = 0; k < 6; k++) {
      const a = k / 6 * Math.PI * 2;
      add(new THREE.SphereGeometry(0.028, 8, 6), petal, PX - 0.45 + Math.cos(a) * 0.025, 0.125, PZ + 0.2 + Math.sin(a) * 0.025, [0, -a, 0.6], [1.6, 0.6, 0.7]);
    }
    add(new THREE.SphereGeometry(0.018, 8, 6), paint(0xf2d27a), PX - 0.45, 0.135, PZ + 0.2);
    // stepping stones from the walkway to the pond (flat)
    for (const [x, z, s] of [[1.25, -0.55, 0.13], [1.45, -0.2, 0.11]]) add(new THREE.CylinderGeometry(s, s * 1.05, 0.03, 12), stoneM, x, 0.015, z, [0, s * 9, 0], [1.25, 1, 1]);

    // the koi: one swept body with a tail fin on a hinge at the body's end
    const KOI = [[0xf07a3a, 0xfaf3e6, 0.9, 0.35, 0], [0xfaf3e6, 0xe8503a, 0.68, -0.3, 2.1], [0xf2c14e, 0xf07a3a, 0.45, 0.45, 4.0]];
    KOI.forEach(([body, spot, k, spd, ph], i) => {
      const f = grp(0, 0.065, 0);
      const bodyGeo = new THREE.SphereGeometry(0.055, 14, 10); bodyGeo.scale(2.3, 0.65, 0.85);
      mesh(bodyGeo, paint(body), f);
      const sp = mesh(new THREE.SphereGeometry(0.03, 10, 8), paint(spot), f, 0.04, 0.02, 0); sp.scale.set(1.4, 0.5, 1); sp.userData.noInk = true;
      const tailGeo = new THREE.ConeGeometry(0.05, 0.1, 6); tailGeo.rotateZ(-Math.PI / 2).translate(-0.05, 0, 0).scale(1, 0.25, 1);   // narrow end at the joint
      const tailJoint = grp(-0.1, 0, 0, f);
      mesh(tailGeo, paint(body), tailJoint);
      for (const s of [-1, 1]) { const fin = mesh(new THREE.SphereGeometry(0.022, 8, 6), paint(body), f, 0.03, -0.01, s * 0.045); fin.scale.set(1, 0.25, 1.5); fin.userData.noInk = true; }
      const st = { a: ph, boost: 0, f, tailJoint, taps: [], leap: -1 };
      live((t, dt) => {
        st.boost = Math.max(0, st.boost - dt * 1.2);
        const w = spd * (1 + st.boost * 4);
        st.a += w * dt;
        const rr = k + Math.sin(t * 0.3 + i) * 0.05, AX = (PRX - 0.2) * rr, AZ = (PRZ - 0.16) * rr;
        const x = PX + Math.cos(st.a) * AX, z = PZ + Math.sin(st.a) * AZ;
        const dx = -Math.sin(st.a) * AX * Math.sign(w), dz = Math.cos(st.a) * AZ * Math.sign(w);
        f.position.x = x; f.position.z = z;
        f.rotation.y = Math.atan2(-dz, dx);
        tailJoint.rotation.y = Math.sin(t * (6 + st.boost * 14) + i) * 0.45;
        f.position.y = 0.065 + st.boost * Math.sin(st.boost * 12) * 0.01;
        if (st.leap >= 0) {                                               // the secret: a leap clean out of the pond
          st.leap += dt;
          const u = Math.min(1, st.leap / 1.1);
          f.position.y = 0.065 + Math.sin(u * Math.PI) * 0.55;
          f.rotation.z = (0.5 - u) * 2.2;
          if (u >= 1) { st.leap = -1; f.rotation.z = 0; ripple(x, 0.105, z, 0.3); ripple(x, 0.105, z, 0.18); }
        }
      });
      tap(f, 'koi', (sfx) => {
        const now = kit.now(); st.taps = st.taps.filter(q => now - q < 4); st.taps.push(now);
        if (st.taps.length >= 5 && st.leap < 0) {
          st.taps = []; st.leap = 0; ripple(f.position.x, 0.105, f.position.z, 0.3);
          sfx([[400, 0.1], [600, 0.1], [900, 0.1], [1300, 0.3]], 'sine', 0.07);
          kit.say(kit.anyOf(['That koi has been practising.', 'Koi, but make it competitive.', 'Five pokes and it’s off. Fair.', 'A personal best: 55 cm. The other koi are unimpressed.']));
          return;
        }
        st.boost = 1.5;
        ripple(f.position.x, 0.105, f.position.z, 0.22);
        sfx([[520 + i * 80, 0.06], [780 + i * 80, 0.12]], 'sine', 0.06);
      });
    });
    // now and then a koi rises and kisses the surface
    let nextRise = 3;
    live((t) => { if (t > nextRise) { nextRise = t + 3 + Math.random() * 3; ripple(PX + (Math.random() - 0.5) * 0.9, 0.105, PZ + (Math.random() - 0.5) * 0.5, 0.14); } });

    // ═════════════ 2. shishi-odoshi: the bamboo deer-scarer tipping into the pond ═════════════
    const SX = 3.45, SZ = -1.0, PIN = 0.4;
    for (const s of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.03, 0.033, PIN + 0.07, 8), cane, SX, (PIN + 0.07) / 2, SZ + s * 0.085);
      add(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 8), caneDk, SX, PIN * 0.5, SZ + s * 0.085);
    }
    add(new THREE.CylinderGeometry(0.01, 0.01, 0.21, 6), caneDk, SX, PIN, SZ, [Math.PI / 2, 0, 0]);   // the pin it rocks on
    add(new THREE.DodecahedronGeometry(0.13, 1), stoneDk, SX + 0.27, 0.17, SZ, [0.3, 0.5, 0], [1, 0.95, 1]);   // the stone it knocks
    const rocker = grp(SX, PIN, SZ);                                   // pivot = the pin
    const tubeGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.62, 12).rotateZ(Math.PI / 2).translate(-0.06, 0, 0);   // open end −x, closed end +x
    mesh(tubeGeo, cane, rocker);
    mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.025, 12).rotateZ(Math.PI / 2), caneDk, rocker, 0.1, 0, 0);
    mesh(new THREE.CylinderGeometry(0.049, 0.049, 0.025, 12).rotateZ(Math.PI / 2), caneDk, rocker, -0.22, 0, 0);
    const mouth = mesh(new THREE.CircleGeometry(0.038, 12).rotateY(-Math.PI / 2), paint(0x3d4a2a, { hatch: 0 }), rocker, -0.371, 0, 0); mouth.userData.noInk = true;
    // the feeder pipe: one bent cane from the east wall, ending above the open mouth
    const feedEnd = [SX - 0.37, 0.8, SZ];
    add(tube([[EW, 0.84, SZ + 0.32], [SX + 0.1, 0.83, SZ + 0.2], [SX - 0.2, 0.81, SZ + 0.04], feedEnd], 0.028, 20, 8), cane);
    add(new THREE.CylinderGeometry(0.02, 0.022, 0.82, 8), cane, SX + 0.22, 0.41, SZ + 0.27);   // a post under the bend
    add(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 8), caneDk, EW - 0.02, 0.84, SZ + 0.32, [0, 0, Math.PI / 2]);
    const stream = mesh(new THREE.CylinderGeometry(0.008, 0.006, 1, 6).translate(0, -0.5, 0), paint(0xbfe3ef, { opacity: 0.75, hatch: 0 }), g, feedEnd[0] - 0.02, 0.79, SZ);
    stream.userData.noInk = true;
    const REST = -0.24, TIPPED = 0.5;
    let fill = 0, tipT = -1;
    rocker.rotation.z = REST;
    live((t, dt) => {
      stream.scale.y = Math.max(0.05, 0.79 - (PIN - 0.37 * Math.sin(rocker.rotation.z)) - 0.01);   // down to the open mouth
      if (tipT < 0) {
        fill = Math.min(1, fill + dt / 6);
        rocker.rotation.z = REST + fill * fill * 0.3 + Math.sin(t * 9) * 0.004 * fill;
        if (fill >= 1) tipT = 0;
      } else {
        tipT += dt;
        if (tipT < 0.35) rocker.rotation.z = REST + 0.3 + (TIPPED - REST - 0.3) * Math.sin(tipT / 0.35 * Math.PI / 2);
        else if (tipT < 0.6) { rocker.rotation.z = TIPPED; if (tipT - dt < 0.35) ripple(SX - 0.42, 0.105, SZ, 0.25); }
        else if (tipT < 0.8) rocker.rotation.z = TIPPED + (REST - TIPPED) * ((tipT - 0.6) / 0.2) ** 2;
        else { rocker.rotation.z = REST - Math.sin((tipT - 0.8) * 30) * 0.03 * Math.max(0, 1 - (tipT - 0.8) * 4); if (tipT > 1.1) { tipT = -1; fill = 0; } }
      }
    });
    tap(rocker, 'shishi-odoshi', (sfx) => {
      if (tipT < 0) { tipT = 0; fill = 1; }
      setTimeout(() => sfx([[180, 0.08], [140, 0.25]], 'triangle', 0.12), 800);
      sfx([[900, 0.05], [700, 0.08]], 'sine', 0.04);
    });
  }

  // ═════════════ 3. the cherry bonsai on a low stand (back east corner) ═════════════
  {
    const BX = 3.4, BZ = -5.02;
    if (free(BX, BZ, 0.34)) claim(BX, BZ, 0.32);
    addBox(0.66, 0.06, 0.48, wood, BX, 0.27, BZ, 0.015);
    for (const [dx, dz] of [[-0.28, -0.19], [0.28, -0.19], [-0.28, 0.19], [0.28, 0.19]]) addBox(0.05, 0.25, 0.05, wood, BX + dx, 0.125, BZ + dz, 0.01);
    addBox(0.55, 0.03, 0.03, wood, BX, 0.08, BZ + 0.19, 0.008); addBox(0.55, 0.03, 0.03, wood, BX, 0.08, BZ - 0.19, 0.008);
    addBox(0.44, 0.12, 0.3, paint(0x3f5a7a), BX, 0.36, BZ, 0.02);           // a glazed blue pot
    addBox(0.4, 0.02, 0.26, paint(0x5c4632), BX, 0.425, BZ, 0.01);
    add(new THREE.SphereGeometry(0.06, 8, 6), moss, BX + 0.12, 0.43, BZ + 0.05, null, [1.4, 0.35, 1]);
    const tree = grp(BX - 0.05, 0.42, BZ);                                // sways from the soil
    const trunkPts = [[0, 0, 0], [0.08, 0.2, 0.02], [-0.05, 0.42, -0.02], [0.1, 0.62, 0.01], [0.18, 0.75, 0]];
    mesh(tube(trunkPts, 0.035, 20, 8), paint(0x5c4030), tree);
    mesh(tube([[-0.04, 0.42, -0.02], [-0.2, 0.55, 0.03], [-0.3, 0.6, 0.02]], 0.022, 10, 6), paint(0x5c4030), tree);
    mesh(tube([[0.06, 0.25, 0.02], [0.2, 0.33, 0], [0.32, 0.36, 0.02]], 0.018, 10, 6), paint(0x5c4030), tree);
    const blossom = paint(0xf4b6c8, { hatch: 0.5 }), blossomDk = paint(0xe68aa6, { hatch: 0.5 });
    const crowns = [[0.18, 0.82, 0, 0.17], [0.02, 0.72, 0.06, 0.13], [-0.3, 0.64, 0.03, 0.13], [0.33, 0.42, 0.02, 0.11], [0.28, 0.72, -0.05, 0.11], [-0.15, 0.62, -0.06, 0.1]];
    const cg = [];
    crowns.forEach(([x, y, z, r], i) => {
      const s = new THREE.SphereGeometry(r, 12, 9); s.scale(1.3, 0.75, 0.95); s.translate(x, y, z); cg.push(s.index ? s.toNonIndexed() : s);
      const d = new THREE.SphereGeometry(r * 0.55, 8, 6); d.translate(x + r * 0.5, y - r * 0.35, z + r * 0.5);
      mesh(d, blossomDk, tree).userData.noInk = true;
      void i;
    });
    mesh(mergeGeometries(cg.map(q => { for (const k of Object.keys(q.attributes)) if (!['position', 'normal', 'uv'].includes(k)) q.deleteAttribute(k); return q; })), blossom, tree);
    // drifting petals (instanced: no outline)
    const NP = 36, pet = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.035, 0.024), paint(0xf6c2d2, { side: THREE.DoubleSide, hatch: 0 }), NP);
    pet.userData.noInk = true; pet.frustumCulled = false; g.add(pet);
    const P = Array.from({ length: NP }, (_, i) => ({ x: 0, y: -1, z: 0, vx: 0, vz: 0, s: Math.random() * 6, life: i < 10 ? -i * 0.9 : -99 }));
    const spawn = (p) => {
      const c = crowns[Math.floor(Math.random() * crowns.length)];
      p.x = tree.position.x + c[0] + (Math.random() - 0.5) * 0.3; p.y = tree.position.y + c[1]; p.z = tree.position.z + c[2] + (Math.random() - 0.5) * 0.3;
      p.vx = -0.05 - Math.random() * 0.12; p.vz = 0.05 + Math.random() * 0.18; p.life = 0;
    };
    let shake = 0;
    const dummy = new THREE.Object3D();
    live((t, dt) => {
      shake = Math.max(0, shake - dt * 1.5);
      tree.rotation.z = Math.sin(t * 0.7) * 0.015 + Math.sin(t * 18) * shake * 0.06;
      tree.rotation.x = Math.sin(t * 0.5 + 1) * 0.01 + Math.cos(t * 15) * shake * 0.04;
      P.forEach((p, i) => {
        if (p.life === -99) { dummy.position.set(0, -5, 0); dummy.updateMatrix(); pet.setMatrixAt(i, dummy.matrix); return; }
        if (p.life < 0) { p.life += dt; if (p.life >= 0) spawn(p); else { dummy.position.set(0, -5, 0); dummy.updateMatrix(); pet.setMatrixAt(i, dummy.matrix); return; } }
        p.life += dt; p.s += dt * 2;
        if (p.y > 0.012) {
          p.y -= dt * 0.16; p.x += (p.vx + Math.sin(p.s) * 0.12) * dt; p.z += (p.vz + Math.cos(p.s * 0.8) * 0.08) * dt;
          p.x = Math.min(3.9, Math.max(-3.9, p.x));
          if (p.y <= 0.012) p.y = 0.012;
        } else if (p.life > 14) { if (i < 14) spawn(p); else p.life = -99; }
        dummy.position.set(p.x, p.y, p.z);
        if (p.y > 0.012) dummy.rotation.set(Math.sin(p.s) * 1.2, p.s, Math.cos(p.s * 1.3)); else dummy.rotation.set(-Math.PI / 2, 0, p.s);
        dummy.updateMatrix(); pet.setMatrixAt(i, dummy.matrix);
      });
      pet.instanceMatrix.needsUpdate = true;
    });
    tap(tree, 'cherry bonsai', (sfx) => {
      shake = 1;
      let n = 0; for (const p of P) if ((p.life === -99 || p.y <= 0.012) && n < 14) { spawn(p); p.vx *= 2; n++; }
      sfx([[1046, 0.08], [1318, 0.08], [1568, 0.08], [2093, 0.2]], 'sine', 0.035);
    });
  }

  // ═════════════ 4. paper lanterns strung along both side walls ═════════════
  const lanternTex = (red) => canvasTex(128, 128, (c, w, h) => {
    c.fillStyle = red ? '#e8503a' : '#fbf1dc'; c.fillRect(0, 0, w, h);
    c.strokeStyle = red ? 'rgba(120,30,20,0.55)' : 'rgba(150,110,60,0.5)'; c.lineWidth = 2;
    for (let y = 8; y < h; y += 10) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
    c.fillStyle = red ? '#2a2230' : '#c0392b'; c.font = `700 44px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(red ? '禅' : '和', w * 0.25, h / 2); c.fillText(red ? '禅' : '和', w * 0.75, h / 2);
  });
  const texRed = lanternTex(true), texWhite = lanternTex(false);
  const capGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.035, 12);
  const lanterns = [];
  for (const sx of [-1, 1]) {
    const x = sx * 3.6, z0 = -4.05, z1 = -1.25, Y = 2.62, SAG = 0.12;
    const yAt = (u) => Y - Math.sin(u * Math.PI) * SAG;
    for (const z of [z0, z1]) {
      addBox(Math.abs(EW - 3.6) + 0.04, 0.04, 0.04, wood, sx * (EW + 3.6) / 2, Y + 0.02, z, 0.01);
      add(new THREE.SphereGeometry(0.025, 8, 6), wood, x, Y + 0.02, z);
    }
    const pts = []; for (let k = 0; k <= 12; k++) { const u = k / 12; pts.push([x, yAt(u), z0 + (z1 - z0) * u]); }
    add(tube(pts, 0.006, 30, 4), cord); noInkMats.add(cord);
    const string = { list: [], kick: 0 };
    for (let k = 0; k < 4; k++) {
      const u = (k + 0.5) / 4, red = (k + (sx > 0 ? 1 : 0)) % 2 === 0;
      const L = grp(x, yAt(u), z0 + (z1 - z0) * u);
      const mat = paint(0xffffff, { map: red ? texRed : texWhite, hatch: 0.2, unique: true, emissive: 0xffffff });
      mat.emissiveMap = red ? texRed : texWhite; mat.emissiveIntensity = 0.45;
      mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.1, 4).translate(0, -0.05, 0), cord, L).userData.noInk = true;
      const len = 0.08 + (k % 2) * 0.05;
      const body = mesh(new THREE.SphereGeometry(0.12, 16, 12), mat, L, 0, -0.1 - len - 0.12, 0); body.scale.y = red ? 1.25 : 1.05;
      body.rotation.y = sx > 0 ? -Math.PI / 2 : Math.PI / 2;       // the lettering faces the room
      mesh(capGeo, ironM, L, 0, -0.1 - len - 0.12 + 0.12 * body.scale.y - 0.004, 0);
      mesh(capGeo, ironM, L, 0, -0.1 - len - 0.12 - 0.12 * body.scale.y + 0.004, 0);
      mesh(new THREE.CylinderGeometry(0.003, 0.003, len, 4).translate(0, -len / 2 - 0.1, 0), cord, L).userData.noInk = true;
      const tassel = mesh(new THREE.ConeGeometry(0.02, 0.075, 6), paint(0xe4b84f), L, 0, -0.1 - len - 0.12 - 0.12 * body.scale.y - 0.05, 0); tassel.rotation.x = Math.PI;   // hangs right off the bottom cap
      lanterns.push({ L, mat, sx, k, string, glow: 0 });
      string.list.push(lanterns[lanterns.length - 1]);
      tap(L, 'paper lantern', (sfx) => {
        string.kick = 1; string.t0 = roomNow(); string.from = k;
        sfx([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.25]].map(([f, d]) => [f * (sx > 0 ? 1 : 0.89), d]), 'triangle', 0.05);
      });
    }
  }
  live((t, dt) => {
    for (const l of lanterns) {
      const S = l.string;
      const since = S.t0 != null ? t - S.t0 - Math.abs(l.k - S.from) * 0.18 : -1;
      const kick = since > 0 ? Math.exp(-since * 1.4) * Math.sin(since * 6) * 0.35 : 0;
      l.glow = since > 0 ? Math.max(0, 1 - since / 2.5) : 0;
      l.L.rotation.x = Math.sin(t * 0.9 + l.k * 0.8 + l.sx) * 0.035 + kick;
      l.L.rotation.z = Math.cos(t * 0.7 + l.k) * 0.02;
      l.mat.emissiveIntensity = (0.45 + l.glow * 0.9 + Math.sin(t * 7 + l.k * 3) * 0.03) * (0.3 + 0.7 * speed);   // the calm dims them
    }
  });

  // ═════════════ 5. the tea corner (west front) ═════════════
  {
    const TX = -3.1, TZ = -0.45, TY = 0.3;
    if (free(TX, TZ, 0.5)) {
      claim(TX, TZ, 0.46);
      add(new THREE.CylinderGeometry(0.44, 0.44, 0.04, 28), paint(0x6b4a34), TX, TY - 0.02, TZ);
      add(new THREE.CylinderGeometry(0.42, 0.42, 0.006, 28), paint(0x8a6448), TX, TY + 0.001, TZ);
      for (let k = 0; k < 4; k++) { const a = k * Math.PI / 2 + Math.PI / 4; addBox(0.05, TY - 0.04, 0.05, paint(0x6b4a34), TX + Math.cos(a) * 0.3, (TY - 0.04) / 2, TZ + Math.sin(a) * 0.3, 0.01); }
      // zabuton cushions round it
      for (const [x, z, col] of [[TX, TZ + 0.62, 0x8e2f3a], [TX + 0.66, TZ, 0x3f5872]]) {
        addBox(0.48, 0.08, 0.48, paint(col), x, 0.04, z, 0.035);
        add(new THREE.SphereGeometry(0.025, 8, 6), paint(0xe4b84f), x, 0.085, z);
      }
      // cups with tea in, a tea caddy and a little tray of sweets
      const cupG = lathe([[0.001, 0], [0.032, 0], [0.04, 0.012], [0.042, 0.055], [0.036, 0.055], [0.034, 0.012], [0.001, 0.012]], 16);
      const cups = [[TX + 0.2, TZ + 0.12], [TX + 0.05, TZ + 0.24]];
      for (const [x, z] of cups) {
        add(cupG, paint(0xd8d2c4, { side: THREE.DoubleSide }), x, TY, z);
        add(new THREE.CircleGeometry(0.035, 12).rotateX(-Math.PI / 2), paint(0x8fae5a, { hatch: 0 }), x, TY + 0.045, z);
      }
      add(new THREE.CylinderGeometry(0.04, 0.04, 0.1, 14), paint(0x2f5a52), TX - 0.25, TY + 0.05, TZ - 0.15);
      add(new THREE.CylinderGeometry(0.042, 0.042, 0.02, 14), paint(0xc9a26b), TX - 0.25, TY + 0.105, TZ - 0.15);
      addBox(0.2, 0.02, 0.12, paint(0x2a2230, { hatch: 0 }), TX + 0.05, TY + 0.01, TZ - 0.25, 0.006, [0, 0.3, 0]);
      for (const [dx, col] of [[-0.05, 0xf2a7bd], [0.0, 0xfaf3e6], [0.05, 0x9cc070]]) add(new THREE.SphereGeometry(0.022, 10, 8), paint(col), TX + 0.05 + dx, TY + 0.035, TZ - 0.25 + dx * 0.3, null, [1, 0.7, 1]);
      // the iron kettle: it tips forward about the bottom of its front rim to pour
      const pot = grp(TX + 0.1, TY, TZ + 0.052); pot.rotation.y = -0.6;      // pivot = front foot, spout aimed at the near cup
      const potBody = grp(-0.07, 0, 0, pot);
      mesh(lathe([[0.001, 0], [0.06, 0.004], [0.088, 0.04], [0.09, 0.07], [0.07, 0.11], [0.03, 0.125], [0.001, 0.125]], 18), ironM, potBody);
      mesh(new THREE.SphereGeometry(0.016, 8, 6), ironM, potBody, 0, 0.135, 0);
      mesh(tube([[0.07, 0.04, 0], [0.11, 0.08, 0], [0.135, 0.12, 0]], 0.014, 8, 6), ironM, potBody);
      mesh(new THREE.TorusGeometry(0.075, 0.007, 6, 16, Math.PI), paint(0x2a2230), potBody, 0, 0.12, 0, [0, Math.PI / 2, 0]);
      const pourStream = mesh(new THREE.CylinderGeometry(0.006, 0.004, 1, 6).translate(0, -0.5, 0), paint(0xc9b46a, { opacity: 0.85, hatch: 0 }), g, 0, 0, 0);
      pourStream.visible = false; pourStream.userData.noInk = true;
      // steam from the kettle and the cups
      const steam = puffer(9, 0xffffff, 0.45);
      let pourT = -1;
      const spoutW = new THREE.Vector3();
      live((t, dt) => {
        steam.forEach((m, i) => {
          const src = i < 3 ? [pot.position.x + 0.054, TY + 0.14, pot.position.z + 0.037] : cups[i % 2];
          const ph = (t * 0.35 + i / 9 * 3) % 1;
          const y0 = i < 3 ? src[1] : TY + 0.05;
          m.position.set((i < 3 ? src[0] : src[0]) + Math.sin(t * 2 + i) * 0.015 * ph, y0 + ph * 0.3, (i < 3 ? src[2] : src[1]) + Math.cos(t * 1.7 + i) * 0.012 * ph);
          const s = 0.012 + ph * 0.03; m.scale.set(s, s, s);
          m.material.opacity = 0.3 * Math.sin(ph * Math.PI) * (i < 3 && pourT >= 0 ? 0.3 : 1);
        });
        if (pourT >= 0) {
          pourT += dt;
          const k = pourT < 0.5 ? pourT / 0.5 : pourT < 1.6 ? 1 : Math.max(0, 1 - (pourT - 1.6) / 0.5);
          pot.rotation.z = -0.5 * Math.sin(k * Math.PI / 2);
          pot.updateMatrixWorld(true);
          spoutW.set(0.135, 0.12, 0); potBody.localToWorld(spoutW); g.worldToLocal(spoutW);
          pourStream.visible = k > 0.7;
          pourStream.position.copy(spoutW);
          pourStream.scale.y = Math.max(0.02, spoutW.y - TY - 0.045);
          if (pourT > 2.2) { pourT = -1; pot.rotation.z = 0; pourStream.visible = false; }
        }
      });
      const FORTUNES = ['Your tea leaves say: the bug is in the line you were sure about.', 'Tea fortune: you will rake beautifully, then step in it.',
        'Tea fortune: a merge conflict approaches. Breathe.', 'Tea fortune: inbox zero is a state of mind, not of inbox.',
        'Tea fortune: the sand forgives. The linter does not.', 'Tea fortune: someone will ask “is it done yet?” — it is not, and that is fine.',
        'Tea fortune: you will close one tab today. Just one. Grow slowly.'];
      let fi = Math.floor(Math.random() * FORTUNES.length);
      tap(pot, 'iron kettle', (sfx) => {
        if (pourT < 0) { pourT = 0; setTimeout(() => kit.say(FORTUNES[fi++ % FORTUNES.length]), 1300); }
        sfx([[300, 0.4], [260, 0.5], [240, 0.6]], 'sine', 0.03);
      });
    }
  }

  // ═════════════ 6. an andon floor lamp, a stack of cushions, a stone basin (west wall) ═════════════
  {
    const AX = -3.6, AZ = -1.5;
    if (free(AX, AZ, 0.2)) {
      claim(AX, AZ, 0.18);
      const lamp = grp(AX, 0, AZ);
      const frame = paint(0x2a2230, { hatch: 0 });
      for (const [dx, dz] of [[-0.12, -0.12], [0.12, -0.12], [-0.12, 0.12], [0.12, 0.12]]) mesh(rb(0.025, 0.78, 0.025, 0.006), frame, lamp, dx, 0.39, dz);
      for (const y of [0.1, 0.76]) for (const s of [-1, 1]) { mesh(rb(0.27, 0.02, 0.02, 0.005), frame, lamp, 0, y, s * 0.12); mesh(rb(0.02, 0.02, 0.27, 0.005), frame, lamp, s * 0.12, y, 0); }
      const paper = paint(0xfff4d6, { emissive: 0xffc46a, hatch: 0 }); paper.emissiveIntensity = 0.7;
      const shade = mesh(rb(0.22, 0.62, 0.22, 0.01), paper, lamp, 0, 0.43, 0); shade.userData.noInk = true;
      let on = true, flick = 0;
      live((t, dt) => { flick = Math.max(0, flick - dt); paper.emissiveIntensity = on ? 0.75 + Math.sin(t * 11) * 0.03 + Math.sin(t * 23) * 0.02 + flick * Math.sin(t * 60) * 0.3 : 0.05; });
      tap(lamp, 'andon lamp', (sfx) => { on = !on; flick = on ? 0.5 : 0; sfx(on ? [[660, 0.05], [880, 0.1]] : [[440, 0.05], [330, 0.1]], 'square', 0.025); });
    }
    // a stack of floor cushions under the scroll
    const CX = -3.6, CZ = -2.55;
    if (free(CX, CZ, 0.27)) {
      claim(CX, CZ, 0.26);
      [0xb98a5e, 0x55663f, 0x8e2f3a, 0xe4b84f, 0x3f5872].forEach((col, i) => addBox(0.48, 0.075, 0.48, paint(col), CX + Math.sin(i * 2.3) * 0.02, 0.04 + i * 0.077, CZ + Math.cos(i * 1.7) * 0.02, 0.035, [0, Math.sin(i * 3.1) * 0.12, 0]));
    }
    // the stone basin with its bamboo spout dripping in
    const TX = -3.55, TZ = -3.95;
    if (free(TX, TZ, 0.3)) {
      claim(TX, TZ, 0.28);
      add(lathe([[0.001, 0], [0.24, 0], [0.26, 0.08], [0.25, 0.3], [0.2, 0.32], [0.19, 0.27], [0.001, 0.27]], 14), stoneM, TX, 0, TZ);
      add(new THREE.CircleGeometry(0.19, 18).rotateX(-Math.PI / 2), paint(0x4f7f8a, { hatch: 0 }), TX, 0.275, TZ);
      for (const [dx, dz, s] of [[0.28, 0.12, 0.09], [-0.12, 0.27, 0.07], [0.2, -0.25, 0.08]]) add(new THREE.DodecahedronGeometry(s, 1), stoneDk, TX + dx, s * 0.5, TZ + dz, [s * 30, s * 11, 0], [1.1, 0.8, 1]);
      add(new THREE.SphereGeometry(0.07, 8, 6), moss, TX - 0.18, 0.31, TZ - 0.05, null, [1.2, 0.4, 1]);
      // the ladle across the rim
      add(new THREE.CylinderGeometry(0.008, 0.008, 0.42, 6), woodLt, TX + 0.02, 0.33, TZ + 0.04, [0, 0.5, Math.PI / 2 - 0.08]);
      add(new THREE.CylinderGeometry(0.035, 0.03, 0.055, 10), cane, TX - 0.17, 0.35, TZ + 0.13);
      // a cane spout from the wall
      add(new THREE.CylinderGeometry(0.03, 0.034, 0.74, 8), cane, -3.86, 0.37, TZ - 0.22);          // a cane post behind the basin
      add(new THREE.CylinderGeometry(0.036, 0.036, 0.02, 8), caneDk, -3.86, 0.5, TZ - 0.22);
      add(tube([[-3.86, 0.7, TZ - 0.22], [-3.75, 0.68, TZ - 0.1], [-3.63, 0.62, TZ]], 0.022, 10, 8), cane);   // its spout, bent over the water
      const drop = mesh(new THREE.SphereGeometry(0.014, 8, 6), paint(0xbfe3ef, { hatch: 0 }), g, -3.62, 0.59, TZ); drop.userData.noInk = true;
      live((t) => {
        const ph = (t * 0.6) % 1;
        drop.position.y = 0.59 - ph * ph * 0.31; drop.visible = ph < 0.98;
        if (ph < 0.02 && drop.userData.last !== Math.floor(t * 0.6)) { drop.userData.last = Math.floor(t * 0.6); ripple(-3.62, 0.28, TZ, 0.12); }
      });
    }
  }

  // ═════════════ 7. the singing bowl on its cushion (front, by the walkway) ═════════════
  {
    const X = 1.1, Z = -0.15;
    if (free(X, Z, 0.24)) {
      claim(X, Z, 0.2);
      add(new THREE.CylinderGeometry(0.2, 0.21, 0.07, 18), paint(0x8e2f3a), X, 0.035, Z);
      add(new THREE.TorusGeometry(0.19, 0.02, 6, 20), paint(0xe4b84f), X, 0.07, Z, [Math.PI / 2, 0, 0]);
      const bowl = grp(X, 0.075, Z);
      mesh(lathe([[0.001, 0], [0.06, 0], [0.12, 0.04], [0.135, 0.1], [0.125, 0.1], [0.11, 0.045], [0.06, 0.012], [0.001, 0.012]], 24), paint(0xc99a4a, { side: THREE.DoubleSide, hatch: 0.3 }), bowl);
      const ring = mesh(new THREE.TorusGeometry(0.13, 0.006, 6, 24).rotateX(Math.PI / 2), paint(0xe8c070), bowl, 0, 0.1, 0); ring.userData.noInk = true;
      add(new THREE.CylinderGeometry(0.012, 0.012, 0.26, 8), paint(0x6b4a34), X + 0.05, 0.085, Z + 0.17, [0, 0.4, Math.PI / 2]);
      add(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 10), paint(0x3a3c40), X - 0.065, 0.085, Z + 0.22, [0, 0.4, Math.PI / 2]);
      let hum = 0;
      kit.live((t, dt) => {                                               // (real time: the bowl rings on through the calm)
        if (hum <= 0) return;
        hum = Math.max(0, hum - dt / 5);
        const w = Math.sin(t * 40) * 0.012 * hum;
        bowl.scale.set(1 + w, 1, 1 - w);
        if (Math.floor(t * 2.2) !== bowl.userData.beat && hum > 0.15) { bowl.userData.beat = Math.floor(t * 2.2); ripple(X, 0.18, Z, 0.45 * hum + 0.1); }
      });
      tap(bowl, 'singing bowl', (sfx) => {
        hum = 1; sfx([[216, 2.6]], 'sine', 0.09); setTimeout(() => sfx([[432, 2.0]], 'sine', 0.025), 30);
        calm.start();
      });
    }
  }

  // ═════════════ 8. the east wall: a staggered tea shelf with incense and a stone cairn ═════════════
  {
    const SX = EW - 0.14;
    for (const [y, z0, z1] of [[1.2, -4.25, -3.25], [1.58, -3.75, -2.85]]) {
      addBox(0.28, 0.045, z1 - z0, wood, SX, y, (z0 + z1) / 2, 0.012);
      for (const z of [z0 + 0.08, z1 - 0.08]) addBox(0.2, 0.12, 0.03, wood, EW - 0.1, y - 0.08, z, 0.008, [0, 0, 0]);
    }
    addBox(0.03, 0.42, 0.03, wood, SX - 0.1, 1.39, -3.5, 0.006);                                  // the little post joining the two shelves
    // lower shelf: tea caddies, a bowl, a sake bottle
    add(new THREE.CylinderGeometry(0.05, 0.05, 0.14, 14), paint(0x8e2f3a), SX, 1.29, -4.12);
    add(new THREE.CylinderGeometry(0.052, 0.052, 0.025, 14), paint(0xe4b84f), SX, 1.37, -4.12);
    add(new THREE.CylinderGeometry(0.045, 0.045, 0.11, 14), paint(0x2f5a52), SX, 1.277, -3.98);
    add(lathe([[0.001, 0], [0.035, 0], [0.07, 0.035], [0.075, 0.06], [0.068, 0.06], [0.062, 0.035], [0.03, 0.008], [0.001, 0.008]], 18), paint(0xd9c9a3, { side: THREE.DoubleSide }), SX, 1.222, -3.76);
    add(lathe([[0.001, 0], [0.04, 0], [0.05, 0.06], [0.045, 0.12], [0.015, 0.17], [0.013, 0.2], [0.02, 0.21], [0.001, 0.21]], 14), paint(0xf6efdf), SX, 1.222, -3.56);
    add(new THREE.CylinderGeometry(0.026, 0.026, 0.05, 10), paint(0xf6efdf), SX - 0.06, 1.247, -3.44);
    // upper shelf: incense dish and a moss ball in a dish
    add(new THREE.CylinderGeometry(0.06, 0.05, 0.03, 14), paint(0x3a3c40), SX, 1.617, -3.65);
    add(new THREE.CylinderGeometry(0.003, 0.003, 0.2, 4), paint(0x6b3a2a), SX, 1.71, -3.65, [0.25, 0, 0]);
    const ember = mesh(new THREE.SphereGeometry(0.008, 6, 4), paint(0xff7a3a, { emissive: 0xff5a1a, hatch: 0 }), g, SX, 1.805, -3.625); ember.userData.noInk = true;
    add(new THREE.CylinderGeometry(0.07, 0.055, 0.035, 14), paint(0x5a6f86), SX, 1.62, -2.98);
    add(new THREE.SphereGeometry(0.065, 12, 9), moss, SX, 1.68, -2.98);
    const smoke = puffer(8, 0xd8d4e0, 0.35);
    live((t) => {
      smoke.forEach((m, i) => {
        const ph = (t * 0.18 + i / 8) % 1;
        m.position.set(SX - ph * 0.12 + Math.sin(t * 1.3 + ph * 7) * 0.03 * ph, 1.81 + ph * 0.55, -3.625 + Math.sin(ph * 9 + t * 0.6) * 0.04 * ph);
        const s = 0.008 + ph * 0.03; m.scale.set(s, s * 1.4, s);
        m.material.opacity = 0.33 * Math.sin(ph * Math.PI);
      });
      ember.scale.setScalar(1 + Math.sin(t * 5) * 0.2);
    });
    // a balanced stone cairn: tap and the top stones hop and clack back down
    const cairn = grp(SX, 1.603, -3.3);
    const stones = [];
    let y = 0;
    [[0.085, 0x8f897f], [0.07, 0x5e5a55], [0.058, 0xa8a196], [0.045, 0x6e6a64], [0.034, 0x9a948a]].forEach(([r, col], i) => {
      const h = r * 1.1;                                                  // a squashed sphere: full height
      const s = grp(0, y + h / 2, 0, cairn);
      const m = mesh(new THREE.SphereGeometry(r, 12, 8), paint(col, { hatch: 0.6 }), s); m.scale.set(1.15, 0.55, 1);
      s.userData.base = y + h / 2; y += h * 0.85; stones.push(s);
      void i;
    });
    let hop = -1, fall = -1, ctaps = [];
    const FALL = stones.map((s, i) => [(i % 2 ? 1 : -1) * (0.05 + i * 0.035), (i % 3 - 1) * 0.06]);   // where each stone lands on the shelf
    live((t, dt) => {
      if (fall >= 0) {
        fall += dt;
        const down = Math.min(1, fall / 0.5), back = Math.min(1, Math.max(0, (fall - 3.2) / 1.2)), k = (down * down) * (1 - back * back * (3 - 2 * back));
        stones.forEach((s, i) => {
          if (i === 0) return;
          const r = s.children[0].geometry.parameters.radius * 0.55;
          s.position.y = s.userData.base + (r - s.userData.base) * k + Math.sin(Math.min(1, fall / 0.5) * Math.PI) * 0.03 * (1 - back);
          s.position.z = FALL[i][0] * k; s.position.x = FALL[i][1] * k;
          s.rotation.x = k * (i % 2 ? 0.4 : -0.3);
        });
        if (fall > 4.5) { fall = -1; stones.forEach(s => { s.position.set(0, s.userData.base, 0); s.rotation.set(0, 0, 0); }); }
        return;
      }
      if (hop < 0) return;
      hop += dt;
      stones.forEach((s, i) => {
        if (i === 0) return;
        const tt = hop - i * 0.06, k = Math.max(0, tt) < 0.5 ? Math.sin(Math.max(0, tt) / 0.5 * Math.PI) : 0;
        s.position.y = s.userData.base + k * 0.04 * i;
        s.rotation.y = k * (i % 2 ? 0.6 : -0.6);
        s.rotation.z = k * Math.sin(i) * 0.15;
      });
      if (hop > 1) { hop = -1; stones.forEach(s => { s.position.y = s.userData.base; s.rotation.set(0, 0, 0); }); }
    });
    tap(cairn, 'stone cairn', (sfx) => {
      if (fall >= 0) return;
      const now = kit.now(); ctaps = ctaps.filter(q => now - q < 4); ctaps.push(now);
      if (ctaps.length >= 5) {                                            // the secret: push your luck and it all comes down
        ctaps = []; fall = 0; hop = -1;
        sfx([[900, 0.04], [700, 0.04], [1100, 0.04], [500, 0.05], [800, 0.08]], 'square', 0.03);
        kit.say('Balance is a practice, not a state. (It will put itself back. Give it a moment.)');
        return;
      }
      hop = 0; setTimeout(() => sfx([[1200, 0.03], [1500, 0.03], [1100, 0.03], [1700, 0.05]], 'square', 0.02), 420);
    });
  }

  // ═════════════ 9. a folding fan on the west wall, and a wind chime ═════════════
  {
    const FX = -EW + 0.02, FY = 1.42, FZ = -1.55;
    const fan = grp(FX, FY, FZ); fan.rotation.y = Math.PI / 2;           // its face looks into the room (+x)
    const N = 9, SPAN = 2.4, R = 0.34;
    const ribs = [];
    const papers = [paint(0xf6efdf, { side: THREE.DoubleSide, hatch: 0.3 }), paint(0xe8503a, { side: THREE.DoubleSide, hatch: 0.3 })];
    for (let i = 0; i < N; i++) {
      const rib = grp(0, 0, 0.004 + i * 0.0015, fan);                    // every panel hinges at the rivet
      const w = new THREE.CircleGeometry(R, 4, -SPAN / N / 2, SPAN / N);
      const pane = mesh(w, papers[i % 2], rib); pane.userData.noInk = true;
      mesh(rb(R * 0.95, 0.012, 0.006, 0.003).translate(R * 0.47, 0, 0.002), wood, rib).userData.noInk = true;
      ribs.push(rib);
    }
    const rivet = mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10).rotateX(Math.PI / 2), paint(0x2a2230), fan, 0, 0, 0.02); rivet.userData.noInk = true;
    const tasselF = mesh(new THREE.ConeGeometry(0.016, 0.09, 6), paint(0xe4b84f), fan, 0, -0.06, 0.02); tasselF.rotation.x = Math.PI; tasselF.userData.noInk = true;
    let open = 1, target = 1, flutter = 0;
    // rotation.z = π/2 points a panel straight up; open spreads them over SPAN
    const layAt = (o) => ribs.forEach((r, i) => { r.rotation.z = Math.PI / 2 + (-SPAN / 2 + (i + 0.5) * SPAN / N) * o - SPAN / N / 2 * (1 - o); });
    layAt(1);
    live((t, dt) => {
      flutter = Math.max(0, flutter - dt);
      open += (target - open) * Math.min(1, dt * 7);
      if (Math.abs(target - open) < 0.01 && target === 0) target = 1;
      layAt(open);
      tasselF.rotation.z = Math.sin(t * 1.4) * 0.15 + flutter * Math.sin(t * 20) * 0.4;
    });
    tap(fan, 'folding fan', (sfx) => { target = 0; flutter = 1; sfx([[700, 0.05], [500, 0.06], [900, 0.08]], 'triangle', 0.04); });

    // the wind chime, on a cane bracket from the east wall over the deer-scarer
    const CX = 3.55, CY = 2.3, CZ = -0.55;
    addBox(EW - CX + 0.03, 0.035, 0.035, caneDk, (EW + CX) / 2, CY + 0.35, CZ, 0.01);
    const chime = grp(CX, CY + 0.35, CZ);                                 // hangs from the bracket tip
    mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.3, 4).translate(0, -0.15, 0), cord, chime).userData.noInk = true;
    mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.025, 16), paint(0x6b4a34), chime, 0, -0.3, 0);
    const tubes = [];
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * Math.PI * 2, len = 0.18 + i * 0.04;
      const tb = grp(Math.cos(a) * 0.07, -0.31, Math.sin(a) * 0.07, chime);
      mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.04, 4).translate(0, -0.02, 0), cord, tb).userData.noInk = true;
      mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 8).translate(0, -0.04 - len / 2, 0), paint(0xc9ccd6), tb);
      tubes.push(tb);
    }
    const clap = grp(0, -0.31, 0, chime);
    mesh(new THREE.CylinderGeometry(0.002, 0.002, 0.3, 4).translate(0, -0.15, 0), cord, clap).userData.noInk = true;
    mesh(new THREE.PlaneGeometry(0.06, 0.09).translate(0, -0.34, 0), paint(0xf6efdf, { side: THREE.DoubleSide }), clap).userData.noInk = true;
    let ring = 0;
    live((t, dt) => {
      ring = Math.max(0, ring - dt * 0.6);
      chime.rotation.y = Math.sin(t * 0.25) * 0.6;
      clap.rotation.x = Math.sin(t * 1.2) * 0.12 + Math.sin(t * 9) * ring * 0.35;
      tubes.forEach((tb, i) => { tb.rotation.x = Math.sin(t * 1.3 + i) * 0.06 + Math.sin(t * 11 + i * 2) * ring * 0.25; tb.rotation.z = Math.cos(t * 1.1 + i * 2) * 0.06 + Math.cos(t * 13 + i) * ring * 0.25; });
    });
    tap(chime, 'wind chime', (sfx) => { ring = 1; sfx([[1568, 0.4], [1318, 0.4], [1760, 0.4], [1175, 0.5], [2093, 0.7]], 'sine', 0.04); });
  }

  // ═════════════ 10. wall art: a moon window, a calligraphy board, a bamboo blind ═════════════
  {
    // a round moon window on the upper back wall, west of the screen, by the bamboo
    const mx = -2.8, my = 1.85, mz = BACK + 0.02;
    put(new THREE.CircleGeometry(0.36, 32), texMat(256, 256, (c, w, h) => {
      const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#f6d8b8'); gr.addColorStop(1, '#bcd2d6');
      c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.fillStyle = '#fbf3e0'; c.beginPath(); c.arc(w * 0.66, h * 0.3, 30, 0, 7); c.fill();
      c.fillStyle = '#8a9aa6'; c.beginPath(); c.moveTo(0, h * 0.8); c.lineTo(w * 0.3, h * 0.45); c.lineTo(w * 0.5, h * 0.68); c.lineTo(w * 0.72, h * 0.5); c.lineTo(w, h * 0.78); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.fillStyle = '#6a7a86'; c.beginPath(); c.moveTo(0, h * 0.92); c.lineTo(w * 0.4, h * 0.72); c.lineTo(w, h * 0.95); c.lineTo(w, h); c.lineTo(0, h); c.fill();
      c.strokeStyle = '#5c4030'; c.lineWidth = 5; c.beginPath(); c.moveTo(w, h * 0.15); c.quadraticCurveTo(w * 0.6, h * 0.12, w * 0.4, h * 0.25); c.stroke();
      c.fillStyle = '#f2a7bd'; for (const [px, py] of [[0.45, 0.22], [0.55, 0.15], [0.7, 0.17], [0.85, 0.12], [0.62, 0.24]]) { c.beginPath(); c.arc(px * w, py * h, 9, 0, 7); c.fill(); }
    }), mx, my, mz).userData.noInk = true;
    add(new THREE.TorusGeometry(0.37, 0.035, 8, 36), paint(0x6b4a34), mx, my, mz + 0.01);
    for (const k of [-1, 1]) addBox(0.014, 0.72 * Math.sqrt(1 - (k * 0.12 / 0.36) ** 2), 0.014, paint(0x6b4a34), mx + k * 0.12, my, mz + 0.02, 0.004);
    // a calligraphy board above the label: 静 "stillness"
    const LX = kit.LBL_X;
    addBox(0.78, 0.36, 0.035, paint(0x6b4a34), LX, 2.16, BACK + 0.02, 0.012);
    put(new THREE.PlaneGeometry(0.7, 0.28), texMat(280, 112, (c, w, h) => {
      c.fillStyle = '#f4ecd8'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2a2230'; c.font = `700 72px ${SCRIPT}`; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.fillText('静', w * 0.3, h * 0.52);
      c.font = `400 30px ${HAND}`; c.fillText('stillness', w * 0.66, h * 0.55);
      c.fillStyle = '#c0392b'; c.fillRect(w - 32, h - 34, 18, 18);
    }), LX, 2.16, BACK + 0.04).userData.noInk = true;
    // a rolled bamboo blind high on the east wall, by the back corner
    for (let k = 0; k < 14; k++) add(new THREE.CylinderGeometry(0.008, 0.008, 0.9, 5), k % 2 ? cane : caneDk, EW - 0.03, 2.42 - k * 0.028, -4.85, [Math.PI / 2, 0, 0]);
    add(new THREE.CylinderGeometry(0.04, 0.04, 0.95, 10), cane, EW - 0.05, 2.5, -4.85, [Math.PI / 2, 0, 0]);
    for (const dz of [-0.3, 0.3]) add(new THREE.CylinderGeometry(0.004, 0.004, 0.42, 4), cord, EW - 0.06, 2.3, -4.85 + dz);
    // a second, little scroll on the west wall: a single bamboo stalk
    const scx = -EW + 0.02, scz = -4.2 + 0.25;
    add(new THREE.CylinderGeometry(0.018, 0.018, 0.46, 8), paint(0x6b4a34), scx + 0.03, 1.92, scz, [Math.PI / 2, 0, 0]);
    put(new THREE.PlaneGeometry(0.38, 0.62), texMat(150, 250, (c, w, h) => {
      c.fillStyle = '#f2e8d0'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#55663f'; c.fillRect(0, 0, w, 16); c.fillRect(0, h - 16, w, 16);
      c.strokeStyle = '#3d5a2a'; c.lineWidth = 9; c.beginPath(); c.moveTo(w * 0.45, h - 30); c.lineTo(w * 0.52, 30); c.stroke();
      c.lineWidth = 3; for (let y = 60; y < h - 40; y += 45) { c.beginPath(); c.moveTo(w * 0.42, y); c.lineTo(w * 0.58, y - 2); c.stroke(); }
      c.fillStyle = '#4f7a3a'; for (const [x, y, a] of [[0.6, 70, -0.5], [0.7, 85, -0.2], [0.35, 120, 0.4], [0.68, 150, -0.6]]) { c.save(); c.translate(x * w, y); c.rotate(a); c.beginPath(); c.ellipse(12, 0, 18, 4, 0, 0, 7); c.fill(); c.restore(); }
    }), scx, 1.6, scz, [0, Math.PI / 2, 0]).userData.noInk = true;
    add(new THREE.CylinderGeometry(0.02, 0.02, 0.44, 8), paint(0x6b4a34), scx + 0.03, 1.28, scz, [Math.PI / 2, 0, 0]);
  }

  // ═════════════ 11. floor clutter round the edges: moss rocks, a bamboo planter, geta ═════════════
  {
    const R = kit.mkRng(311);
    for (const [x, z, s] of [[3.6, 0.05, 0.16], [3.75, -0.25, 0.1], [-0.95, 0.15, 0.09]]) {
      if (!free(x, z, s)) continue;
      add(new THREE.DodecahedronGeometry(s, 1), stoneM, x, s * 0.5, z, [R(), R() * 3, 0], [1.2, 0.85, 1]);
      add(new THREE.SphereGeometry(s * 0.7, 8, 6), moss, x, s * 0.9, z, null, [1.2, 0.35, 1.1]);
      claim(x, z, s * 0.9);
    }
    // a pair of geta sandals by the door (flat)
    for (const s of [-1, 1]) {
      addBox(0.1, 0.02, 0.24, woodLt, -1.55 + s * 0.07, 0.04, -0.2, 0.008, [0, s * 0.1, 0]);
      for (const dz of [-0.07, 0.07]) addBox(0.09, 0.03, 0.02, wood, -1.55 + s * 0.07, 0.015, -0.2 + dz, 0.004, [0, s * 0.1, 0]);
      add(new THREE.TorusGeometry(0.03, 0.006, 5, 10, Math.PI), paint(0x8e2f3a), -1.55 + s * 0.07, 0.05, -0.18, [0, s * 0.1, 0]);
    }
    // tall bamboo in a box planter by the east wall, between the lantern and the pond corner
    const BX = 3.66, BZ = -1.72;
    if (free(BX, BZ, 0.22)) {
      claim(BX, BZ, 0.2);
      addBox(0.4, 0.3, 0.4, paint(0x3a3d44), BX, 0.15, BZ, 0.03);
      add(new THREE.CylinderGeometry(0.17, 0.17, 0.02, 14), paint(0x5c4632), BX, 0.29, BZ);
      [[-0.06, 0.05, 1.05], [0.06, -0.05, 0.85], [0.02, 0.08, 0.7]].forEach(([dx, dz, h], i) => {
        add(new THREE.CylinderGeometry(0.025, 0.025, h, 8), cane, BX + dx, 0.3 + h / 2, BZ + dz);
        for (let y = 0.25; y < h; y += 0.25) add(new THREE.CylinderGeometry(0.029, 0.029, 0.02, 8), caneDk, BX + dx, 0.3 + y, BZ + dz);
        for (let k = 0; k < 3; k++) add(new THREE.SphereGeometry(0.12, 8, 5), paint(0x6a9a42), BX + dx + Math.cos(k * 2.1 + i) * 0.1, 0.3 + h - k * 0.14, BZ + dz + Math.sin(k * 2.1 + i) * 0.1, [0, k * 2.1 + i, 0.5], [1, 0.12, 0.3]);
      });
    }
  }

  // ═════════════ 12. a taiko drum on its stand, behind the sand table ═════════════
  {
    const X = -2.35, Z = -4.35;
    if (free(X, Z, 0.36)) {
      claim(X, Z, 0.32);
      const red = paint(0x8e2f3a), wd = paint(0x5c4030);
      // the stand: two A-legs either side, a cross bar low down
      for (const s of [-1, 1]) {
        for (const dz of [-0.14, 0.14]) addBox(0.05, 0.6, 0.05, wd, X + s * 0.2, 0.29, Z + dz, 0.012, [dz > 0 ? -0.28 : 0.28, 0, 0]);
        addBox(0.06, 0.06, 0.36, wd, X + s * 0.2, 0.56, Z, 0.015);
      }
      addBox(0.46, 0.05, 0.05, wd, X, 0.12, Z, 0.012);
      // the drum rests in the cradle, skins facing east and west, tilted a touch toward the room
      const drum = grp(X, 0.78, Z);
      mesh(lathe([[0.2, -0.25], [0.25, -0.12], [0.265, 0], [0.25, 0.12], [0.2, 0.25]], 22).rotateZ(Math.PI / 2), red, drum);
      const skins = [];
      for (const s of [-1, 1]) {
        const sk = mesh(new THREE.CircleGeometry(0.2, 22).rotateY(s * Math.PI / 2), paint(0xf1e4c8, { hatch: 0.3 }), drum, s * 0.251, 0, 0); sk.userData.noInk = true; skins.push(sk);
        mesh(new THREE.TorusGeometry(0.2, 0.012, 6, 22).rotateY(Math.PI / 2), paint(0x2a2230), drum, s * 0.25, 0, 0);
        for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; add(new THREE.SphereGeometry(0.01, 6, 4), paint(0xe4b84f), X + s * 0.23, 0.78 + Math.sin(a) * 0.215, Z + Math.cos(a) * 0.215); }
      }
      // a tomoe swirl painted on the barrel
      const tom = mesh(new THREE.CircleGeometry(0.09, 20), texMat(64, 64, (c, w, h) => {
        c.fillStyle = '#e4b84f'; c.beginPath(); c.arc(w / 2, h / 2, w / 2 - 2, 0, 7); c.fill();
        c.fillStyle = '#2a2230'; for (let k = 0; k < 3; k++) { const a = k * 2.094; c.beginPath(); c.arc(w / 2 + Math.cos(a) * 12, h / 2 + Math.sin(a) * 12, 8, 0, 7); c.fill(); }
      }), drum, 0, 0, 0.267); tom.userData.noInk = true;
      // the two bachi sticks
      for (const s of [-1, 1]) add(new THREE.CylinderGeometry(0.014, 0.018, 0.4, 8), paint(0xc9a26b), X + 0.02 * s, 0.018 + (s > 0 ? 0.03 : 0), Z + 0.3 + s * 0.04, [0, s * 0.25, Math.PI / 2]);   // the sticks, laid on the mat in front
      let hit = 0;
      live((t, dt) => {
        hit = Math.max(0, hit - dt * 2.5);
        const b = Math.sin(t * 50) * hit;
        drum.scale.set(1 + b * 0.02, 1 - b * 0.03, 1 - b * 0.03);
        drum.position.y = 0.78 + hit * hit * 0.02;
        for (const sk of skins) sk.scale.setScalar(1 + b * 0.03);
      });
      tap(drum, 'taiko drum', (sfx) => { hit = 1; sfx([[70, 0.5]], 'sine', 0.35); sfx([[110, 0.12]], 'triangle', 0.12); });
    }
  }

  // ═════════════ 13. THE CALM: strike the singing bowl and the whole room slows to a hush ═════════════
  // koi drift, the deer-scarer creeps, petals hang in the air, lanterns dim, steam barely rises
  const calm = (() => {
    let until = -1, on = false;
    kit.live((t, dt) => {
      const want = t < until ? 0.1 : 1;
      speed += (want - speed) * Math.min(1, dt * (want < speed ? 1.6 : 0.5));
      if (on && t >= until && speed > 0.95) { on = false; kit.fx.filter(''); }
    });
    kit.onExit(() => { until = -1; speed = 1; on = false; });
    return {
      start() {
        const first = !on;
        until = kit.now() + 14; on = true;
        kit.fx.filter('saturate(0.55) brightness(0.93) sepia(0.22)');
        if (first) kit.say(kit.anyOf(['Breathe in… and out. Everything in here just slowed down. (Even the koi.)',
          'The calm. The petals have decided there is no rush.', 'Shh. The deer-scarer will knock when it is ready.']));
      },
    };
  })();

  // ═════════════ 14. THE SIGNATURE TRICK: a sand garden you rake by walking on it ═════════════
  // The player IS the rake: every step drags five tines through the sand. The trails smooth
  // over by themselves; stones from the basket get raked rings that stay. And something's buried.
  {
    const X0 = -0.65, X1 = 1.35, Z0 = -4.25, Z1 = -0.75, PPM = 160;            // pixels per metre
    const cw = Math.round((X1 - X0) * PPM), ch = Math.round((Z1 - Z0) * PPM);
    const px = (x) => (x - X0) * PPM, pz = (z) => (z - Z0) * PPM;
    const clean = document.createElement('canvas'); clean.width = cw; clean.height = ch;
    const cc = clean.getContext('2d');
    const tex = canvasTex(cw, ch, () => {}), c = tex.image.getContext('2d');
    const GR = kit.mkRng(9), grains = Array.from({ length: 2400 }, () => [GR() * cw, GR() * ch, GR()]);
    const placed = [];                                                             // stones on the sand: { x, z, m }
    const groove = (ctx, draw, w = 2.4) => {                                       // a raked line: a shadow and a lit lip
      ctx.lineCap = 'round';
      ctx.strokeStyle = 'rgba(125,90,45,0.7)'; ctx.lineWidth = w; ctx.beginPath(); draw(0); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,250,235,0.85)'; ctx.lineWidth = w * 0.7; ctx.beginPath(); draw(1.6); ctx.stroke();
    };
    const drawClean = () => {
      cc.fillStyle = '#e3cb98'; cc.fillRect(0, 0, cw, ch);
      for (const [gx, gy, k] of grains) { cc.fillStyle = k < 0.5 ? 'rgba(150,115,60,0.32)' : 'rgba(255,248,230,0.55)'; cc.fillRect(gx, gy, 2, 2); }
      // calm straight lines, the way the garden is left at night
      for (let y = 10; y < ch; y += 11) groove(cc, (o) => { cc.moveTo(0, y + o); cc.lineTo(cw, y + o); }, 1.6);
      for (const s of placed) {                                                    // smooth round each stone, then rake rings
        cc.fillStyle = '#e3cb98'; cc.beginPath(); cc.arc(px(s.x), pz(s.z), 58, 0, 7); cc.fill();
        for (let k = 0; k < 4; k++) groove(cc, (o) => cc.arc(px(s.x) + o * 0.5, pz(s.z) + o * 0.5, 16 + k * 11, 0, 7), 2);
      }
    };
    drawClean(); c.drawImage(clean, 0, 0); tex.needsUpdate = true;
    const sandM = paint(0xffffff, { map: tex, hatch: 0, unique: true });
    const sand = put(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0), sandM, (X0 + X1) / 2, 0.006, (Z0 + Z1) / 2, [-Math.PI / 2, 0, 0]);
    sand.userData.noInk = true; sand.renderOrder = 1;
    // a low cedar edging all round (flat enough to step over)
    for (const [w, d, x, z] of [[X1 - X0 + 0.08, 0.04, (X0 + X1) / 2, Z0 - 0.02], [X1 - X0 + 0.08, 0.04, (X0 + X1) / 2, Z1 + 0.02], [0.04, Z1 - Z0, X0 - 0.02, (Z0 + Z1) / 2], [0.04, Z1 - Z0, X1 + 0.02, (Z0 + Z1) / 2]])
      addBox(w, 0.025, d, wood, x, 0.0125, z, 0.006);

    // ── raking: follow the player's feet ──
    let last = null, dirty = false, fadeAcc = 0, dug = false;
    const TINES = [-2, -1, 0, 1, 2].map(k => k * 0.034);
    kit.live((t, dt) => {
      const p = kit.player();
      if (p && p.x > X0 && p.x < X1 && p.z > Z0 && p.z < Z1) {
        if (last) {
          const dx = p.x - last.x, dz = p.z - last.z, L = Math.hypot(dx, dz);
          if (L > 0.025) {
            const nx = -dz / L, nz = dx / L;                                         // across the stroke
            for (const o of TINES) groove(c, (lip) => { c.moveTo(px(last.x + nx * o) + lip * 0.6, pz(last.z + nz * o) + lip * 0.6); c.lineTo(px(p.x + nx * o) + lip * 0.6, pz(p.z + nz * o) + lip * 0.6); }, 3);
            last = { x: p.x, z: p.z }; dirty = true;
            if (!dug && pg && !pg.collected && Math.hypot(p.x - PGX, p.z - PGZ) < 0.32) unearth();
          }
        } else last = { x: p.x, z: p.z };
      } else last = null;
      // the sand slowly settles back (slower still in the calm)
      fadeAcc += dt * speed;
      if (fadeAcc > 0.25) { fadeAcc = 0; c.globalAlpha = 0.018; c.drawImage(clean, 0, 0); c.globalAlpha = 1; dirty = true; }
      if (dirty) { tex.needsUpdate = true; dirty = false; }
    });
    let hinted = false;
    kit.onEnter(() => { last = null; if (!hinted) { hinted = true; setTimeout(() => kit.say('Psst: that patch of sand in the middle is a garden you rake with your feet. Go on, walk on it.'), 6500); } });

    // ── the stone basket: tap for a stone; it lands near you on the sand; tap a placed stone to take it back ──
    const BX = -0.85, BZ = -0.4;
    if (free(BX, BZ, 0.16)) {
      claim(BX, BZ, 0.15);
      add(lathe([[0.001, 0], [0.13, 0], [0.16, 0.12], [0.145, 0.12], [0.115, 0.015], [0.001, 0.015]], 16), paint(0xb98a5e, { side: THREE.DoubleSide }), BX, 0, BZ);
      for (let k = 0; k < 5; k++) add(new THREE.DodecahedronGeometry(0.05, 1), k % 2 ? stoneDk : stoneM, BX + Math.cos(k * 1.3) * 0.06, 0.1 + (k % 2) * 0.02, BZ + Math.sin(k * 1.3) * 0.06, [k, k * 2, 0], [1.2, 0.7, 1]);
      const basketHit = grp(BX, 0, BZ);
      const hm = paint(0xffffff, { opacity: 0, hatch: 0, unique: true }); hm.depthWrite = false;
      mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.2, 10).translate(0, 0.1, 0), hm, basketHit).userData.noInk = true;
      const pool = [0.11, 0.08, 0.095, 0.07, 0.085].map((r, i) => {
        const m = mesh(new THREE.DodecahedronGeometry(r, 1), i % 2 ? stoneDk : paint(0x3a3c40), g, 0, -1, 0, [i, i * 2, 0]); m.scale.set(1.15, 0.55, 1); m.visible = false;
        const st = { m, x: 0, z: 0, on: false, drop: -1 };
        tap(m, 'raked stone', (sfx) => {                                          // pick it back up
          if (!st.on) return;
          st.on = false; m.visible = false; placed.splice(placed.indexOf(st), 1); drawClean();
          sfx([[700, 0.05], [500, 0.08]], 'triangle', 0.04);
        });
        return st;
      });
      kit.live((t, dt) => { for (const st of pool) if (st.drop >= 0) { st.drop = Math.min(1, st.drop + dt * 3); st.m.position.y = 0.04 + (1 - st.drop * st.drop) * 0.6; if (st.drop >= 1) st.drop = -1; } });
      tap(basketHit, 'basket of river stones', (sfx) => {
        const st = pool.find(q => !q.on);
        if (!st) { kit.say('All five stones are out. A garden needs a little emptiness too.'); return; }
        const p = kit.player();
        // near you if you're on the sand, else a quiet spot of its own; never on top of another stone
        let best = null;
        for (let k = 0; k < 80 && !best; k++) {
          const cx = p && p.x > X0 && p.x < X1 && p.z > Z0 && p.z < Z1 && k < 40 ? p.x + (Math.random() - 0.5) * 0.9 : X0 + 0.25 + Math.random() * (X1 - X0 - 0.5);
          const cz = p && p.x > X0 && p.x < X1 && p.z > Z0 && p.z < Z1 && k < 40 ? p.z + (Math.random() - 0.5) * 0.9 : Z0 + 0.25 + Math.random() * (Z1 - Z0 - 0.5);
          if (cx < X0 + 0.15 || cx > X1 - 0.15 || cz < Z0 + 0.15 || cz > Z1 - 0.15) continue;
          if (placed.some(q => Math.hypot(q.x - cx, q.z - cz) < 0.42)) continue;
          if (p && Math.hypot(p.x - cx, p.z - cz) < 0.22) continue;
          best = [cx, cz];
        }
        if (!best) { kit.say('No room left for a stone there.'); return; }
        st.x = best[0]; st.z = best[1]; st.on = true; st.drop = 0;
        st.m.position.set(st.x, 0.6, st.z); st.m.visible = true; placed.push(st); drawClean();
        c.save(); c.beginPath(); c.arc(px(st.x), pz(st.z), 62, 0, 7); c.clip(); c.drawImage(clean, 0, 0); c.restore(); tex.needsUpdate = true;   // its rings, raked at once
        sfx([[260, 0.06], [180, 0.12]], 'triangle', 0.06);
        if (placed.length === 5) setTimeout(() => kit.say('Five stones, raked rings round every one. That is a garden.'), 600);
      });
    }
    // a sign stuck in the sand table's rim, facing the sand
    const sign = put(new THREE.PlaneGeometry(0.5, 0.3), texMat(250, 150, (cv, w, h) => {
      cv.fillStyle = '#f4ecd8'; cv.fillRect(0, 0, w, h); cv.strokeStyle = '#6b4a34'; cv.lineWidth = 8; cv.strokeRect(4, 4, w - 8, h - 8);
      cv.fillStyle = '#2a2230'; cv.textAlign = 'center'; cv.font = `700 26px ${HAND}`; cv.fillText('PLEASE DO NOT', w / 2, 40); cv.fillText('WALK ON THE SAND', w / 2, 70);
      cv.font = `24px ${SCRIPT}`; cv.fillStyle = '#c0392b'; cv.fillText('(please walk on the sand)', w / 2, 108);
      cv.font = `16px ${HAND}`; cv.fillStyle = '#6b4a34'; cv.fillText('— the management', w / 2, 134);
    }), -0.8, 0.82, -2.55, [0, Math.PI / 2, 0]);
    sign.userData.noInk = true;
    addBox(0.025, 0.36, 0.56, paint(0x6b4a34), -0.818, 0.82, -2.55, 0.006);
    add(new THREE.CylinderGeometry(0.015, 0.015, 0.66, 6), paint(0x6b4a34), -0.83, 0.33, -2.55);   // its stake, down to the floor
    claim(-0.83, -2.55, 0.05);

    // ── the lost page: buried in the sand, one corner peeking out; rake over it (or tap the corner) ──
    const PGX = 1.0, PGZ = -3.45;
    const pg = kit.page();
    let corner = null;
    const unearth = () => {
      if (dug) return;
      dug = true; corner.visible = false;
      let t0 = -1;
      kit.live((t) => {
        if (t0 < 0) t0 = t;
        const u = Math.min(1, (t - t0) / 0.7);
        pg.position.y = -0.16 + u * 0.16 + Math.sin(u * Math.PI) * 0.12;
        pg.rotation.z = (1 - u) * 0.6;
      });
      kit.sfx([[520, 0.06], [660, 0.06], [880, 0.14]], 'triangle', 0.05);
      kit.say('Something was buried in the sand… a folded page!');
    };
    if (!pg.collected) {
      pg.position.set(PGX, -0.16, PGZ); pg.rotation.y = 0.7; g.add(pg);
      corner = mesh(new THREE.ConeGeometry(0.035, 0.06, 3), paint(0xfffdf6, { hatch: 0 }), g, PGX + 0.02, 0.02, PGZ, [0.3, 0.7, 0.5]);
      corner.userData.noInk = true;
      tap(corner, 'something poking out of the sand', () => unearth());
      kit.live((t) => { if (!dug) corner.scale.setScalar(1 + Math.sin(t * 3) * 0.08); });
    }
  }

  // ═════════════ 15. THE SMARTER GAME: the garden's riddles (you have to have looked around) ═════════════
  {
    const st = kit.K.minis.find(q => q.label === 'rake the sand');
    const rakeTable = st?.run;
    const RIDDLES = [
      { q: 'How many koi swim in the pond?', choices: ['two', 'three', 'four', 'five'], answer: 1, why: 'Three: orange, white and gold. (Tap one five times. It has a secret.)' },
      { q: 'The board above the label says one word. Which?', choices: ['patience', 'harmony', 'stillness', 'breathe'], answer: 2, why: '静 — stillness.' },
      { q: 'How many stones are balanced in the cairn on the east shelf?', choices: ['three', 'four', 'five', 'six'], answer: 2, why: 'Five, smallest on top.' },
      { q: 'What can you see through the round window by the bamboo?', choices: ['a koi pond', 'mountains under the moon', 'a pagoda', 'the sea'], answer: 1, why: 'Mountains, a pale moon and a cherry branch.' },
      { q: 'How many paper lanterns hang in the room?', choices: ['six', 'eight', 'ten', 'twelve'], answer: 1, why: 'Eight: four on each side wall.' },
      { q: 'What does the bamboo pipe by the pond do?', choices: ['rings a bell', 'fills, tips and knocks on a stone', 'sprays mist', 'nothing, it’s decorative'], answer: 1, why: 'It’s a shishi-odoshi: it fills, tips into the pond and knocks on its stone.' },
      { q: 'What does the sign on the sand table ask you to do?', choices: ['take your shoes off', 'not walk on the sand (please walk on the sand)', 'rake slowly', 'keep quiet'], answer: 1, why: 'Do not walk on the sand. (Please walk on the sand.)' },
      { q: 'Which instrument slows the whole room down?', choices: ['the taiko drum', 'the wind chime', 'the singing bowl', 'the deer-scarer'], answer: 2, why: 'Strike the singing bowl by the door and everything takes its time.' },
    ];
    if (st) kit.games.replace('rake the sand', (m) => {
      const g = m.game;
      g.open('The garden’s riddles');
      g.text('A zen garden is about noticing. Answer four riddles about this room — then rake a pattern of your own.');
      g.next('begin', () => kit.quiz(g, 'The garden’s riddles', kit.shuffle(RIDDLES).slice(0, 4).map(r => {
        const order = kit.shuffle(r.choices.map((c, i) => i));
        return { q: r.q, choices: order.map(i => r.choices[i]), answer: order.indexOf(r.answer), why: r.why };
      }), { end: (s, n) => `${s} of ${n}. ${s === n ? 'You were paying attention. The sand approves.' : 'Walk round once more and look closely — everything here is an answer.'}` }));
      if (rakeTable) g.next('skip: just rake the table', () => rakeTable(m));
    }, 'garden riddles');
  }

  // ═════════════ 16. WALK-OVER FLOOR: mats, flush stepping stones, raked gravel, moss and petals ═════════════
  // all flat (≤ 2 cm): the walkways stay walkable, the tatami stops looking bare
  {
    const decal = (w, d, x, z, ry, draw, { y = 0.008, ppm = 128, ro = 1 } = {}) => {
      const m = put(new THREE.PlaneGeometry(w, d), texMat(Math.round(w * ppm), Math.round(d * ppm), draw), x, y, z, [-Math.PI / 2, 0, ry]);
      m.userData.noInk = true; m.renderOrder = ro; return m;
    };
    const goza = (border) => (c, w, h) => {                                        // a woven rush mat with a cloth border
      c.fillStyle = '#d8cf98'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(130,120,60,0.35)'; c.lineWidth = 1;
      for (let y = 2; y < h; y += 3) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
      c.strokeStyle = 'rgba(255,250,220,0.35)'; for (let x = 0; x < w; x += 18) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); }
      c.strokeStyle = border; c.lineWidth = 12; c.strokeRect(6, 6, w - 12, h - 12);
      c.strokeStyle = 'rgba(228,184,79,0.8)'; c.lineWidth = 2; c.strokeRect(13, 13, w - 26, h - 26);
    };
    // a woven runner from the door up to the sand, and a small mat in front of the tea corner
    decal(1.0, 1.05, 0.35, -0.2, 0, goza('#2f5a52'));
    decal(0.95, 0.6, -1.55, -0.05, 0.08, goza('#8e2f3a'));
    // raked gravel along the foot of the screen, with two flush stones in it
    decal(3.85, 0.95, 0.02, -4.85, 0, (c, w, h) => {
      c.fillStyle = '#d9d2c2'; c.fillRect(0, 0, w, h);
      for (let k = 0; k < 2600; k++) { c.fillStyle = k % 3 ? 'rgba(120,112,100,0.35)' : 'rgba(255,255,250,0.6)'; c.fillRect((k * 7919) % w, (k * 104729) % h, 2, 2); }
      const stones = [[w * 0.22, h * 0.5, 30], [w * 0.74, h * 0.45, 24]];
      c.strokeStyle = 'rgba(110,100,85,0.55)'; c.lineWidth = 2.5;
      for (let y = 8; y < h; y += 9) {
        c.beginPath(); let pen = false;
        for (let x = 0; x <= w; x += 4) { const inS = stones.some(([sx, sy, r]) => Math.hypot(x - sx, y - sy) < r + 26); if (inS) { pen = false; continue; } pen ? c.lineTo(x, y) : c.moveTo(x, y); pen = true; }
        c.stroke();
      }
      for (const [sx, sy, r] of stones) {
        for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(sx, sy, r + 6 + k * 8, 0, 7); c.stroke(); }
        c.fillStyle = '#7a756d'; c.beginPath(); c.ellipse(sx, sy, r, r * 0.8, 0.3, 0, 7); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.beginPath(); c.ellipse(sx - r * 0.3, sy - r * 0.3, r * 0.4, r * 0.25, 0.3, 0, 7); c.fill();
      }
      c.strokeStyle = '#6b4a34'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
    }, { ppm: 110 });
    // stepping stones set flush, from the pond side up to the label (rings of moss round each)
    const moss = (c, w, h) => { for (let k = 0; k < 70; k++) { const a = k * 2.4, r = (k % 9) / 9 * w * 0.45; c.fillStyle = k % 2 ? 'rgba(95,143,62,0.75)' : 'rgba(130,170,80,0.7)'; c.beginPath(); c.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r * 0.8, 6 + (k % 4) * 3, 0, 7); c.fill(); } };
    [[1.62, -1.75, 0.15], [1.78, -2.3, 0.13], [1.98, -2.85, 0.14], [2.12, -3.35, 0.12]].forEach(([x, z, r], i) => {
      add(new THREE.CylinderGeometry(r, r * 1.04, 0.014, 14), stoneM, x, 0.007, z, [0, i * 1.3, 0], [1.2, 1, 1]);
      decal(r * 3.2, r * 2.6, x + 0.04, z + 0.03, i, moss, { y: 0.004, ppm: 100, ro: 0 });
    });
    // moss patches and drifted petals round the edges
    for (const [x, z, s, r] of [[-3.3, -1.0, 0.7, 0.4], [-2.4, -4.0, 0.6, 1.1], [1.7, -0.35, 0.5, 2], [3.2, -0.6, 0.55, 0.3], [-0.2, 0.05, 0.4, 0.9]]) decal(s, s * 0.75, x, z, r, moss, { y: 0.005, ppm: 100, ro: 0 });
    const petals = (n, seed) => (c, w, h) => { const Rr = kit.mkRng(seed); for (let k = 0; k < n; k++) { c.save(); c.translate(Rr() * w, Rr() * h); c.rotate(Rr() * 6); c.fillStyle = Rr() < 0.5 ? '#f6c2d2' : '#f2a7bd'; c.beginPath(); c.ellipse(0, 0, 6, 3.5, 0, 0, 7); c.fill(); c.restore(); } };
    for (const [x, z, w, d, n, sd] of [[3.0, -4.55, 1.0, 0.7, 40, 3], [1.9, -1.15, 0.9, 0.6, 18, 7], [-0.15, -0.55, 0.6, 0.5, 10, 11], [2.3, -3.0, 0.7, 0.9, 16, 5]]) decal(w, d, x, z, 0, petals(n, sd), { y: 0.012, ppm: 100, ro: 2 });

    // the fun one: a drift of petals heaped by the east shelf — tap it and it bursts up and floats down
    const HX = 3.35, HZ = -3.45;
    const heap = decal(0.55, 0.45, HX, HZ, 0.4, petals(90, 21), { y: 0.014, ppm: 140, ro: 2 });
    const NB = 40, burst = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.03, 0.02), paint(0xf6c2d2, { side: THREE.DoubleSide, hatch: 0 }), NB);
    burst.userData.noInk = true; burst.frustumCulled = false; burst.visible = false; g.add(burst);
    const BP = Array.from({ length: NB }, () => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), s: 0 }));
    const dmy = new THREE.Object3D();
    let bt = -1;
    kit.live((t, dt) => {
      if (bt < 0) return;
      bt += dt;
      BP.forEach((q, i) => {
        q.v.y -= 1.6 * dt; q.v.multiplyScalar(0.97); q.v.y = Math.max(q.v.y, -0.25);
        q.p.addScaledVector(q.v, dt); q.s += dt * 4;
        if (q.p.y < 0.015) { q.p.y = 0.015; q.v.set(0, 0, 0); }
        dmy.position.copy(q.p); dmy.rotation.set(q.p.y > 0.02 ? Math.sin(q.s) : -Math.PI / 2, q.s, 0); dmy.updateMatrix(); burst.setMatrixAt(i, dmy.matrix);
      });
      burst.instanceMatrix.needsUpdate = true;
      if (bt > 4) { bt = -1; burst.visible = false; heap.visible = true; }
    });
    const heapHit = grp(HX, 0, HZ);
    const hm = paint(0xffffff, { opacity: 0, hatch: 0, unique: true }); hm.depthWrite = false;
    mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 10).translate(0, 0.025, 0), hm, heapHit).userData.noInk = true;
    tap(heapHit, 'a drift of petals', (sfx) => {
      if (bt >= 0) return;
      bt = 0; burst.visible = true; heap.visible = false;
      BP.forEach(q => { q.p.set(HX + (Math.random() - 0.5) * 0.4, 0.03, HZ + (Math.random() - 0.5) * 0.3); q.v.set((Math.random() - 0.5) * 0.9, 1.1 + Math.random() * 0.9, (Math.random() - 0.5) * 0.9); q.s = Math.random() * 6; });
      sfx([[1318, 0.06], [1568, 0.06], [2093, 0.06], [2637, 0.14]], 'sine', 0.04);
    });

    // and a couple more mossy rocks along the walls, wherever there's still room
    kit.scatter(2, 0.14, (x, z) => {
      add(new THREE.DodecahedronGeometry(0.12, 1), stoneDk, x, 0.06, z, [x, z, 0], [1.2, 0.8, 1]);
      add(new THREE.SphereGeometry(0.09, 8, 6), moss ? paint(0x6f8f4a) : stoneM, x, 0.12, z, null, [1.2, 0.35, 1.1]);
    }, { along: 'walls' });
  }

  flush();
}
