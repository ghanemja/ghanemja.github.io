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
  top: 0x4a4550, bottom: 0x7d9cc0, shoes: 0xe9e4d8, sole: 0xf6f1e6,
  height: 1.02, build: 0.95,
  face: { shape: { jaw: 0.2, chin: 0.5, cheeks: 0.45, long: 0.1, skull: 0.55, brow: 0.4 },
    nose: 'snub', noseSize: 0.72, mouth: 'grin', eyes: 'round', eyeSize: 1.05,
    brows: 'raised', lashes: true, hair: 'fringe', blush: 0.9 },
};

// the beret and the little mustard backpack, hung on the rig's own joints
function dressPlayer(g) {
  const J = g.userData.human.J;
  const felt = paint(0xd8584a);
  const beret = new THREE.Group();
  beret.add(new THREE.Mesh(lathe([[0.001, 0], [0.092, 0], [0.112, 0.02], [0.1, 0.048], [0.058, 0.075], [0.001, 0.083]], 24), felt));
  const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.009, 0.02, 8), felt);
  stalk.position.y = 0.088;
  beret.add(stalk);
  beret.position.set(0, 0.182, 0.008);
  beret.rotation.set(-0.08, 0, 0.13);           // the classic tilt
  ink(beret, 'fine');
  J.head.add(beret);

  const bp = new THREE.Group();
  const mustard = paint(0xe1b95c), flapM = paint(0xd8584a), brass = paint(0xe4b84f);
  bp.add(new THREE.Mesh(rbox(0.15, 0.19, 0.075, 0.028), mustard));
  const flap = new THREE.Mesh(rbox(0.145, 0.085, 0.082, 0.022), flapM);
  flap.position.set(0, 0.062, -0.002);
  bp.add(flap);
  const clasp = new THREE.Mesh(rbox(0.028, 0.026, 0.012, 0.005), brass);
  clasp.position.set(0, 0.012, -0.045);
  bp.add(clasp);
  const pocket = new THREE.Mesh(rbox(0.09, 0.07, 0.025, 0.012), mustard);
  pocket.position.set(0, -0.045, -0.05);
  bp.add(pocket);
  for (const s of [-1, 1]) {                    // straps hugging over the shoulders to the chest
    const strap = new THREE.Mesh(rbox(0.024, 0.17, 0.012, 0.005), flapM);
    strap.position.set(s * 0.055, 0.1, 0.055);
    strap.rotation.x = -0.28;
    bp.add(strap);
  }
  bp.position.set(0, 0.17, -0.148);             // riding her back (torso front is +z)
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
      // camera: orbit behind, eased
      const cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
      _t.set(g.position.x, 1.02, g.position.z);
      _c.set(
        _t.x + Math.sin(S.yaw) * cp * S.dist,
        _t.y + sp * S.dist,
        _t.z + Math.cos(S.yaw) * cp * S.dist,
      );
      if (_c.y < 0.25) _c.y = 0.25;
      if (camSnap) { camera.position.copy(_c); camSnap = false; }
      else camera.position.lerp(_c, 1 - Math.exp(-9 * dt));
      camera.lookAt(_t);
      return k;
    },
  };
}
