// ─── THE PLAYER, ON FLAT GROUND ─────────────────────────────────────────────
// The critic herself (beret, backpack), walked with WASD relative to a
// drag-orbit camera. Collides with simple AABBs, clamped to the zone bounds.
import * as THREE from 'three';
import { person, pose } from './human.js';
import { paint, ink } from './style.js';
import { rbox, lathe } from './props.js';

const UP = new THREE.Vector3(0, 1, 0);

// the player, rebuilt procedurally (the old image-to-mesh critic.glb came out
// slightly melted): the folk rig from the heist engine, dressed as Janelle —
// blonde bob, red beret, charcoal sweater, jeans, white sneakers, her pack
const PLAYER_LOOK = {
  folk: true, skin: 'fair', hair: 0xc9a06a, hairStyle: 'bob',
  top: 0x4a4550, bottom: 0x7d9cc0,
  shoes: 0xf0ece2, sole: 0xc9a87c,                // white sneakers on a gum sole — the contrast makes the shoe shape read
  height: 1.02, build: 0.95,
  face: { shape: { jaw: 0.28, chin: 0.62, cheeks: 0.45, long: 0.12, skull: 0.55, brow: 0.4 },
    nose: 'snub', noseSize: 1.0, mouth: 'grin', eyes: 'round', eyeSize: 1.05,
    brows: 'raised', lashes: true, hair: 'fringe', blush: 0.9 },
};

// the beret and the little mustard backpack, hung on the rig's own joints
function dressPlayer(g) {
  const J = g.userData.human.J;

  // chin-length bob: ONE lathe shell that HUGS the skull (centre ≈ (0, 0.12,
  // 0.018), radius ≈ 0.123) — closed at the crown so there is no open rim to
  // poke up beside the hat, following the skull's curve down past the ears,
  // flaring only below jaw level into the chin-length flick. Open across the
  // face; two short locks frame the cheeks.
  const hairM = paint(0xc9a06a, { side: THREE.DoubleSide });
  const hairG = new THREE.Group();
  const V = (x, y) => new THREE.Vector2(x, y);
  const shell = new THREE.Mesh(
    new THREE.LatheGeometry(
      [V(0.001, 0.252), V(0.05, 0.247), V(0.085, 0.233), V(0.108, 0.206), V(0.122, 0.165),
        V(0.128, 0.105), V(0.126, 0.04), V(0.132, -0.005), V(0.142, -0.028), V(0.112, -0.02)],
      28, 0, Math.PI * 2 * 0.555,                      // the gap clears her face past the ears
    ),
    hairM,
  );
  shell.rotation.y = Math.PI - (Math.PI * 2 * 0.555) / 2;      // lathe phi starts at +z: shell centred on the BACK, gap on her face
  shell.position.z = 0.018;
  hairG.add(shell);
  // solid bangs filling the shell's front gap between beret and brow — the
  // painted scalp strands alone read as a bald patch
  const bangs = new THREE.Mesh(new THREE.LatheGeometry(
    [V(0.102, 0.215), V(0.118, 0.188), V(0.124, 0.16), V(0.12, 0.142), V(0.106, 0.15)],
    18, 0, Math.PI * 2 * 0.445,
  ), hairM);
  bangs.rotation.y = -(Math.PI * 2 * 0.445) / 2;       // phi starts at +z: centre the band on her forehead
  bangs.position.z = 0.018;
  hairG.add(bangs);
  for (const s of [-1, 1]) {                           // the framing locks, from ear height to the chin
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(s * 0.095, 0.165, 0.05), new THREE.Vector3(s * 0.127, 0.09, 0.052),
      new THREE.Vector3(s * 0.13, 0.02, 0.046), new THREE.Vector3(s * 0.122, -0.028, 0.04),
    ]), 10, 0.021, 7), hairM);
    hairG.add(tube);
  }
  ink(hairG, 'fine');
  J.head.add(hairG);

  // the beret: bigger than the hair at its rim, so it wraps OVER the bob the
  // way felt actually drapes — never sunken into it with scalp showing round
  // the edge. Rim turned slightly down, a wide slouched bulge, the stalk.
  const felt = paint(0xd8584a);
  const beret = new THREE.Group();
  beret.add(new THREE.Mesh(lathe([[0.001, -0.012], [0.125, -0.008], [0.134, 0.004], [0.163, 0.036],
    [0.15, 0.064], [0.088, 0.092], [0.001, 0.1]], 26), felt));
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.022, 8), felt);
  stalk.position.y = 0.106;
  beret.add(stalk);
  beret.position.set(0, 0.19, 0.012);
  beret.rotation.set(-0.06, 0, 0.09);           // the classic tilt, gentler so it never digs in
  ink(beret, 'fine');
  J.head.add(beret);

  // relaxed hands: the rig's fingers ship fully splayed — curl them most of
  // the way to a loose fist (so from any angle they read as one hand, not
  // four separate nubs) and turn the wrists slightly in toward the thighs
  for (const s of ['L', 'R']) {
    const grip = J['grip' + s], hand = J['hand' + s];
    const u = grip?.userData;
    if (u?.fingers) {
      u.fingers.forEach((f, i) => { f.rotation.z = -u.s * 0.62 * (1.25 + i * 0.08); });
      u.fingers.forEach((f) => { f.rotation.x = 0.1; });
      u.thumb.rotation.z = -u.s * 0.72;
    }
    if (hand) { hand.rotation.y = (s === 'L' ? 1 : -1) * 0.25; hand.rotation.x = -0.08; }
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
    const strap = new THREE.Mesh(rbox(0.028, 0.19, 0.013, 0.005), flapM);
    strap.position.set(s * 0.062, 0.11, 0.075);
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
