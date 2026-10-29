// ─── THE PLAYER, ON FLAT GROUND ─────────────────────────────────────────────
// The critic herself (beret, backpack), walked with WASD relative to a
// drag-orbit camera. Collides with simple AABBs, clamped to the zone bounds.
import * as THREE from 'three';
import { person, pose } from './human.js';
import { paint, ink } from './style.js';
import { rbox, lathe } from './props.js';
import { headShapeFor, sculpt, HC } from './faces.js';
import { makeHandGeometry } from './hands.js';

const UP = new THREE.Vector3(0, 1, 0);

// the player, rebuilt procedurally (the old image-to-mesh critic.glb came out
// slightly melted): the folk rig from the heist engine, dressed as Janelle —
// blonde bob, red beret, charcoal sweater, jeans, white sneakers, her pack
const PLAYER_LOOK = {
  folk: true, skin: 'fair', hair: 0xc9a06a, hairStyle: 'bob',
  top: 0x4a4550, bottom: 0x7d9cc0,
  shoes: 0xf0ece2, sole: 0xc9a87c,                // white sneakers on a gum sole — the contrast makes the shoe shape read
  height: 1.02, build: 1.0,
  slope: 1,
  wideLeg: 1,
  flatTum: 1,                                     // a flat stomach under the sweater                                     // flowy wide-leg trousers to the shoe
  neck: 0.75,                                      // a shorter neck: with sloped shoulders the full one read giraffe-long                                       // soft sloped shoulders, not a square yoke
  cuff: 0.33,                                     // a sweater sleeve comes down to the hand, no bare wrist tube
  face: { shape: { profile: 1, jaw: 0.28, chin: 0.55, cheeks: 0.5, long: -0.25, skull: 0.55, brow: 0.4 },
    nose: 'cute', noseSize: 1.0, mouth: 'smile', eyes: 'round', eyeSize: 1.38, eyeTall: 0.8, mouthUp: 0.08, smileW: 0.24, pupilDot: 0.0034,
    brows: 'none', lids: true, lidLine: false, iris: 0x7a5032, blushFlush: true, blush: 0.9 },
};

// the beret and the little mustard backpack, hung on the rig's own joints
function dressPlayer(g) {
  const J = g.userData.human.J;
  J.head.scale.set(0.9, 0.97, 0.96);          // human heads are upright: ~3/4 as wide as tall


  // ── her hair: a chin-length bob with a side part, sculpted ON her own skull
  // surface (the same shape the face is built from) and then lifted off it
  // for volume. Strand grooves and colour flow away from the part; the
  // fringe sweeps diagonally from the part across her forehead; below the
  // ears the bob hangs straight instead of following the jaw, and its ends
  // flick out at the chin.
  const ssm = THREE.MathUtils.smoothstep;
  const shape = headShapeFor(PLAYER_LOOK.face.shape);
  const PART_X = 0.3;                                  // the side part, on her right
  const flow = new THREE.Vector3(PART_X, 1, 0.12).normalize();
  const _pp = new THREE.Vector3(), _ax = new THREE.Vector3(), _bx = new THREE.Vector3();
  const strandAt = (d) => {
    _pp.copy(d).addScaledVector(flow, -d.dot(flow));
    _ax.set(1, 0, 0).addScaledVector(flow, -flow.x).normalize();
    _bx.crossVectors(flow, _ax);
    const a = Math.atan2(_pp.dot(_ax), _pp.dot(_bx));
    return Math.sin(a * 15) * 0.65 + Math.sin(a * 15 * 2.3 + 1.7) * 0.35;
  };
  const azi = (d) => Math.abs(Math.atan2(d.x, d.z)) / Math.PI;      // 0 face … 1 back
  // > 0 where hair grows: everything but the face; the fringe edge is high
  // at the part and sweeps down to just above the brow on the far side
  const hairMask = (d) => Math.max(d.y - (0.47 + 0.25 * d.x), (azi(d) - 0.36) * 3);
  const inflate = (d) => 1.1 + 0.03 * Math.max(0, -d.z) + 0.02 * strandAt(d);
  const chinY = HC.y - 0.12;
  // the bob's silhouette below the ears, by height above its cut line:
  // fullest at ear level, rounding in, the ends turned under — a bell, not a bucket
  const BOB = [[0, 0.108], [0.012, 0.122], [0.026, 0.134], [0.05, 0.143], [0.09, 0.146]];
  const bobR = (h) => {
    if (h <= 0) return BOB[0][1];
    for (let i = 1; i < BOB.length; i++) if (h <= BOB[i][0]) {
      const [h0, r0] = BOB[i - 1], [h1, r1] = BOB[i], t = (h - h0) / (h1 - h0);
      return r0 + (r1 - r0) * t * t * (3 - 2 * t);
    }
    return BOB[BOB.length - 1][1];
  };
  const hang = (o, d) => {
    const th = Math.atan2(d.x, d.z), side = ssm(Math.abs(th) / Math.PI, 0.35, 0.41);
    const back = Math.max(0, -Math.cos(th));
    const edgeY = chinY + 0.006 + 0.03 * back;                      // A-line: shorter at the nape
    const hx = o.x - HC.x, hz = o.z - HC.z, rh = Math.hypot(hx, hz) || 1e-4;
    let target, w;
    if (o.y < edgeY) {
      // below the cut, at every azimuth, the sculpt sphere goes to the centre
      // of the skull: the triangles from the cut edge inward read as the
      // underside of the bob, and everything else is hidden inside the head
      // (folding these vertices anywhere outside left a fan of slivers)
      o.copy(HC); return;
    } else {
      if (side <= 0) return;
      const h = o.y - edgeY;
      target = bobR(h) * (1 + 0.06 * back); w = side * (1 - ssm(h, 0.05, 0.13));
    }
    const k = 1 + (target / rh - 1) * w;
    o.x = HC.x + hx * k; o.z = HC.z + hz * k;
  };
  const base = new THREE.Color(0xc9a06a), root = base.clone().multiplyScalar(0.74),
    shine = base.clone().lerp(new THREE.Color(0xfff1d6), 0.45);
  const colour = (d, out) => {
    const r = strandAt(d);
    const band = Math.exp(-((d.dot(flow) - 0.5) ** 2) / 0.02) * THREE.MathUtils.clamp(0.5 + 0.6 * r, 0, 1);
    return out.copy(base).lerp(root, 0.45 * Math.max(0, -r)).lerp(shine, 0.6 * band);
  };
  const hairMesh = new THREE.Mesh(
    sculpt(shape, 96, 72, { mask: hairMask, inflate, color: colour, post: hang }),
    paint(0xffffff, { vertexColors: true, soft: true, hatch: 0.3 }),
  );
  const hairG = new THREE.Group();
  hairG.add(hairMesh);
  // three loose locks laid over the swept fringe, so the sweep from the part
  // reads as hair, not a cap edge
  const onHead = (u, v, out) => {
    const d = new THREE.Vector3(u, v, Math.sqrt(Math.max(0, 1 - u * u - v * v))).normalize();
    const pt = shape(d); return pt.sub(HC).multiplyScalar(out).add(HC);
  };
  const lockM = paint(0xc9a06a, { soft: true, hatch: 0.3 });
  for (const [x0, x1, y1] of [[0.26, -0.3, 0.42], [0.2, -0.58, 0.36], [0.32, 0.56, 0.4]]) {
    const pts = [0, 0.33, 0.66, 1].map(t => onHead(
      x0 + (x1 - x0) * t,
      0.66 + (y1 - 0.66) * t - 0.06 * Math.sin(Math.PI * t),
      1.105 + 0.018 * Math.sin(Math.PI * t)));
    // taper each lock to a point at both ends: an open tube end is inked as a black hexagon
    const curve = new THREE.CatmullRomCurve3(pts), T = 20, Rr = 8;
    const tg = new THREE.TubeGeometry(curve, T, 0.0095, Rr, false);
    const P = tg.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {
      const t = Math.floor(i / (Rr + 1)) / T;
      curve.getPointAt(Math.min(1, t), c);
      q.fromBufferAttribute(P, i).sub(c).multiplyScalar(Math.pow(Math.sin(Math.PI * t), 0.6));
      P.setXYZ(i, c.x + q.x, c.y + q.y, c.z + q.z);
    }
    tg.computeVertexNormals();
    hairG.add(new THREE.Mesh(tg, lockM));
  }
  // a few drawn strands riding the finished hair surface (same pipeline as the
  // sculpt, lifted a hair's breadth), sweeping down and away from the part
  const hairPt = (d) => {
    const o = shape(d);
    const k = THREE.MathUtils.lerp(0.9, inflate(d), ssm(hairMask(d), -0.07, 0.07));
    o.sub(HC).multiplyScalar(k).add(HC); hang(o, d);
    return o.sub(HC).multiplyScalar(1.004).add(HC);
  };
  const dirAt = (phi, el) => new THREE.Vector3(Math.sin(phi) * Math.cos(el), Math.sin(el), Math.cos(phi) * Math.cos(el));
  const strandM = paint(0xb68c58, { soft: true, hatch: 0 });
  for (const end of [0.56, 0.7, 0.84, 1.0, 1.16, 1.3, 1.44].map(f => f * Math.PI)) {
    const pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10;
      pts.push(hairPt(dirAt(end - 0.38 * Math.pow(1 - t, 1.5), 0.5 - 1.18 * t)));   // stops above the turned-under ends
    }
    hairG.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 30, 0.0045, 5), strandM));
  }
  ink(hairG, 'fine');
  J.head.add(hairG);

  // the beret: bigger than the hair at its rim, so it wraps OVER the bob the
  // way felt actually drapes — never sunken into it with scalp showing round
  // the edge. Rim turned slightly down, a wide slouched bulge, the stalk.
  const felt = paint(0xd8584a);
  const beret = new THREE.Group();
  beret.add(new THREE.Mesh(lathe([[0.001, -0.012], [0.108, -0.01], [0.126, -0.002], [0.142, 0.012],
    [0.154, 0.03], [0.156, 0.046], [0.146, 0.062], [0.122, 0.078], [0.088, 0.09], [0.048, 0.098], [0.001, 0.102]], 48), felt));
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.022, 8), felt);
  stalk.position.y = 0.106;
  beret.add(stalk);
  beret.position.set(0, 0.2, -0.004);
  beret.rotation.set(-0.2, 0, 0.1);             // tipped back off the forehead, raised over the part
  ink(beret, 'fine');
  J.head.add(beret);

  // her hands: anatomical (js/hands.js) — one continuous surface grown from a real
  // hand skeleton: a palm with its thenar and heel pads, three-boned fingers in
  // human proportion with the knuckle line arched and the pinky set back, each
  // finger melting into the palm but not into its neighbour, and an opposed thumb
  // that hangs forward of the index. Sized to her forearm (a hand is ≈0.74 of it).
  for (const k of ['L', 'R']) {
    const s = k === 'L' ? -1 : 1;
    const grip = J['grip' + k], hand = J['hand' + k];
    if (!grip || !hand) continue;
    // the soft skin ramp (as on her face): the hard 3-band body ramp turned each
    // knuckle bump into a pale hard-edged blotch on the back of the hand
    const skinHex = grip.children.find(c => c.isMesh)?.material?.color?.getHex() ?? 0xefc3a2;
    const skinM = paint(skinHex, { soft: true, hatch: 0.3 });
    grip.visible = false;
    const H = new THREE.Group();
    H.add(new THREE.Mesh(makeHandGeometry(s, { length: 0.117, young: 1, res: 104 }), skinM));
    ink(H, 'fine');
    hand.add(H);
    hand.rotation.x = -0.06;
  }

  // her sneakers ran a couple of sizes big: shrink them about the ankle
  // (the shoe geometry's origin is the ankle; re-seat the sole on the ground)
  for (const f of ['footL', 'footR']) {
    J[f]?.children.forEach((m) => { if (m.isMesh) { m.scale.setScalar(0.8); m.position.y -= 0.045 * 0.2; } });
  }

  // her pack: rounded and soft, not a stack of boxes — a barrelled body, a
  // domed flap wrapping the top, a bellows pocket, a carry handle
  const bp = new THREE.Group();
  const mustard = paint(0xe1b95c), flapM = paint(0xd8584a), brass = paint(0xe4b84f);
  const body = new THREE.Mesh(rbox(0.2, 0.26, 0.1, 0.048), mustard);
  body.scale.set(1, 1, 1.12);                   // a stuffed bulge front-to-back
  bp.add(body);
  const flap = new THREE.Mesh(rbox(0.205, 0.13, 0.118, 0.055), flapM);
  flap.position.set(0, 0.082, -0.004);
  flap.rotation.x = 0.08;                       // draped over the top, not stacked on it
  bp.add(flap);
  const clasp = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 12), brass);
  clasp.rotation.x = Math.PI / 2;
  clasp.position.set(0, 0.02, -0.066);
  bp.add(clasp);
  const pocket = new THREE.Mesh(rbox(0.12, 0.1, 0.045, 0.022), mustard);
  pocket.scale.set(1, 1, 0.85);
  pocket.position.set(0, -0.06, -0.062);
  bp.add(pocket);
  const pflap = new THREE.Mesh(rbox(0.124, 0.045, 0.05, 0.02), flapM);
  pflap.position.set(0, -0.028, -0.062);
  bp.add(pflap);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.009, 7, 14, Math.PI), flapM);
  handle.position.set(0, 0.148, -0.01);
  bp.add(handle);
  for (const s of [-1, 1]) {                    // straps hugging over the shoulders to the chest
    const strap = new THREE.Mesh(rbox(0.028, 0.16, 0.013, 0.005), flapM);
    strap.position.set(s * 0.057, 0.052, 0.068);   // seated on the sloped shoulder line
    strap.rotation.x = -0.3;
    bp.add(strap);
  }
  bp.position.set(0, 0.16, -0.165);             // riding her back (torso front is +z)
  bp.rotation.x = 0.1;                          // following the curve of her back
  ink(bp, 'fine');
  J.spine.add(bp);
}

export function createPlayer(scene, camera, start) {
  const g = person(PLAYER_LOOK);          // procedural: ready immediately
  dressPlayer(g);
  g.position.set(start.x, 0, start.z);
  scene.add(g);

  const S = {
    g, keys: {}, run: false,
    yaw: start.yaw ?? -Math.PI / 2, pitch: 0.34, dist: 3.4,
    zone: { colliders: [], bounds: null },
    face: start.yaw != null ? start.yaw + Math.PI : Math.PI / 2,
    joy: null, look: null, frozen: false,
  };

  // ── input: keyboard ──
  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    S.keys[e.code] = true;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') S.run = true;
  });
  addEventListener('keyup', (e) => {
    S.keys[e.code] = false;
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') S.run = false;
  });

  // ── input: drag to look, wheel to zoom; touch gets a joystick ──
  const cv = document.querySelector('canvas');
  const drag = { on: false, id: -1, x: 0, y: 0 };
  cv.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && e.clientX < innerWidth * 0.45 && e.clientY > innerHeight * 0.35) {
      S.joy = { id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, dy: 0 };
      return;
    }
    drag.on = true; drag.id = e.pointerId; drag.x = e.clientX; drag.y = e.clientY;
  });
  addEventListener('pointermove', (e) => {
    if (S.joy && e.pointerId === S.joy.id) {
      S.joy.dx = Math.max(-1, Math.min(1, (e.clientX - S.joy.x0) / 46));
      S.joy.dy = Math.max(-1, Math.min(1, (e.clientY - S.joy.y0) / 46));
      return;
    }
    if (!drag.on || e.pointerId !== drag.id) return;
    S.yaw -= (e.clientX - drag.x) * 0.0062;
    S.pitch = Math.max(0.06, Math.min(1.15, S.pitch + (e.clientY - drag.y) * 0.004));
    drag.x = e.clientX; drag.y = e.clientY;
  });
  addEventListener('pointerup', (e) => {
    if (S.joy && e.pointerId === S.joy.id) S.joy = null;
    if (e.pointerId === drag.id) drag.on = false;
  });
  addEventListener('wheel', (e) => {
    S.dist = Math.max(2.1, Math.min(6.5, S.dist + e.deltaY * 0.0035));
  }, { passive: true });

  // ── collision: a circle against boxes, then the zone's fence ──
  const R = 0.2;
  const free = (x, z) => !S.zone.colliders.some(c => x > c.x0 - R && x < c.x1 + R && z > c.z0 - R && z < c.z1 + R);
  function slide(px, pz, nx, nz) {
    if (free(nx, nz)) { px = nx; pz = nz; }
    else {                                   // slide along the wall, one axis at a time
      if (free(nx, pz)) px = nx;
      if (free(px, nz)) pz = nz;
    }
    const b = S.zone.bounds;
    if (b) { px = Math.max(b.x0, Math.min(b.x1, px)); pz = Math.max(b.z0, Math.min(b.z1, pz)); }
    return [px, pz];
  }

  const _t = new THREE.Vector3(), _c = new THREE.Vector3();
  let camSnap = true;

  return {
    group: g,
    get pos() { return g.position; },
    get human() { return g.userData.human; },
    setZone(zone) { S.zone = zone; },
    freeze(f) { S.frozen = f; },
    teleport(x, z, yaw) {
      g.position.set(x, 0, z);
      if (yaw != null) { S.yaw = yaw; S.face = yaw + Math.PI; }
      camSnap = true;
    },
    update(dt, t) {
      // movement intent
      let mx = 0, mz = 0;
      if (!S.frozen) {
        const f = (S.keys.KeyW || S.keys.ArrowUp ? 1 : 0) - (S.keys.KeyS || S.keys.ArrowDown ? 1 : 0);
        const r = (S.keys.KeyD || S.keys.ArrowRight ? 1 : 0) - (S.keys.KeyA || S.keys.ArrowLeft ? 1 : 0);
        const sy = Math.sin(S.yaw), cy = Math.cos(S.yaw);
        mx = (-sy) * f + cy * r;
        mz = (-cy) * f + (-sy) * r;
        if (S.joy) { mx += (-sy) * (-S.joy.dy) + cy * S.joy.dx; mz += (-cy) * (-S.joy.dy) + (-sy) * S.joy.dx; }
      }
      const len = Math.hypot(mx, mz);
      let k = 0;
      if (len > 0.05) {
        mx /= len; mz /= len;
        k = Math.min(1, len);
        const speed = (S.run ? 3.1 : 1.55) * k;
        const [px, pz] = slide(g.position.x, g.position.z, g.position.x + mx * speed * dt, g.position.z + mz * speed * dt);
        g.position.x = px; g.position.z = pz;
        S.face = Math.atan2(mx, mz);
      }
      // turn the body toward where she's going
      const turn = g.userData.turn;
      if (turn) {
        let d = S.face - turn.rotation.y;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        turn.rotation.y += d * Math.min(1, dt * 11);
      }
      // animate + bob
      const inst = g.userData.human;
      if (inst) {
        const bob = pose(inst, dt, k, { run: S.run && k > 0 ? 1 : 0 });
        if (turn) turn.position.y = -(bob || 0);
      }
      // camera: orbit behind, eased; never inside a building — walk the
      // head→camera segment and stop at the first collider footprint (the
      // awnings overhang the fronts, so pad generously)
      const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
      _t.set(g.position.x, 1.02, g.position.z);
      _c.set(
        _t.x + Math.sin(S.yaw) * cp * S.dist,
        _t.y + sp * S.dist,
        _t.z + Math.cos(S.yaw) * cp * S.dist,
      );
      {
        const P = 0.45, N = 24;
        let tc = 1;
        outer: for (let i = 3; i <= N; i++) {
          const f = i / N;
          const x = _t.x + (_c.x - _t.x) * f, z = _t.z + (_c.z - _t.z) * f;
          for (const c of S.zone.colliders) {
            if (x > c.x0 - P && x < c.x1 + P && z > c.z0 - P && z < c.z1 + P) { tc = Math.max(0.18, (i - 1) / N); break outer; }
          }
        }
        if (tc < 1) _c.lerpVectors(_t, _c, tc);
      }
      if (_c.y < 0.25) _c.y = 0.25;
      if (camSnap) { camera.position.copy(_c); camSnap = false; }
      else camera.position.lerp(_c, 1 - Math.exp(-9 * dt));
      camera.lookAt(_t);
      return k;
    },
  };
}
