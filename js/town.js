// ─── MAIN STREET, FLAT EDITION ──────────────────────────────────────────────
// Two facing terraces of shops — one per app — a road between them, and the
// public library closing the vista at the east end. Every builder from
// buildings.js drops its origin at the middle of its street front, +Z toward
// the street, so a row is laid shop by shop along X.
import * as THREE from 'three';
import { PAL, paint, ink } from './style.js';
import { buildShop, library } from './buildings.js';
import { lamp, bench, tree, bush } from './props.js';
import { APPS } from './apps.js';

const ROW = 3.2;                 // each row's frontage line |z|
const PAVE = 1.42;               // the pavement depth shopUnit lays down

// exterior looks, keyed by app id (the engine's own shop language)
const FRONTS = {
  behaviors: { kind: 'lab', w: 2.0, wall: 0xc9d3da, front: 0x3f5872, trim: 0xf6eedb, roof: 'mansard', up: 'bay', blade: 'cube', door: 1, sign: { bg: '#2a2230', fg: '#f2d27a' } },
  yarnflow: { kind: 'yarn', w: 1.74, wall: 0xdc9e9a, front: 0x8f7ae8, trim: 0xfffaf0, roof: 'gable', roofCol: PAL.roofSlate, up: 'arch', blade: 'yarn', door: 1, sign: { bg: '#f6eedb', fg: '#6a55c4' } },
  'borrowed-eyes': { kind: 'frames', w: 1.9, wall: 0x7fb3a8, front: 0x2f5a52, trim: 0xf6eedb, roof: 'parapet', up: 'arch', blade: 'frame', door: -1, sign: { bg: '#2f5a52', fg: '#f6eedb' } },
  deckgpt: { kind: 'cinema', w: 2.3, wall: 0xf1e4c8, front: 0x7fb3a8, trim: 0xfffaf0, special: 'cinema', door: 0, sign: { bg: '#2a2230', fg: '#f2d27a' }, marquee: 'NOW SHOWING ★ DECKGPT', bladeText: 'DECK' },
  splatform: { kind: 'toys', w: 1.9, wall: 0xe1b95c, front: 0xd8573f, trim: 0xfffaf0, roof: 'gable', roofCol: PAL.roofRed, awning: [0xd8573f, 0xf6eedb], blade: 'balloon', door: -1, sign: { bg: '#fff4e0', fg: '#d8573f' } },
  qr: { kind: 'qr', w: 1.92, wall: 0xf1e4c8, front: 0x2a2230, trim: 0xfffaf0, roof: 'parapet', blade: 'qr', door: 0, sign: { bg: '#f6eedb', fg: '#2a2230' } },
  gallery: { kind: 'frames', w: 2.14, wall: 0xb7a3c6, front: 0x2a2230, trim: 0xf6eedb, roof: 'deco', up: 'arch', blade: 'frame', door: 1, sign: { gold: true, bg: '#2a2230' } },
};
// purely decorative neighbours, between the real shops
const DECO = {
  bakery: { kind: 'bakery', name: 'Rise & Shine Bakery', w: 1.75, wall: 0xf3d9a0, front: 0xdc9e9a, trim: 0xfffaf0, roof: 'gable', roofCol: PAL.roofRed, awning: [0xdc9e9a, 0xfffaf0], blade: 'croissant', door: -1, flowers: PAL.terracotta, sign: { bg: '#fff4e0', fg: '#b85a5a' } },
  cafe: { kind: 'cafe', name: 'Bean There Café', w: 1.9, wall: 0xf1e4c8, front: 0x4f8a7e, trim: 0xfffaf0, roof: 'dutch', awning: [0x4f8a7e, 0xf6eedb], blade: 'cup', door: -1, flowers: 0x4f8a7e, sign: { gold: true, bg: '#2f5a52' } },
  flowers: { kind: 'flowers', name: 'Petal & Stem', w: 1.6, wall: 0xa8b994, front: 0x3e6b52, trim: 0xf6eedb, roof: 'parapet', awning: [0x3e6b52, 0xf6eedb], blade: 'flower', door: 1, upN: 2, flowers: PAL.bark, sign: { bg: '#f6eedb', fg: '#3e6b52' } },
};

// the door's x inside a shop, from the spec's door side (see shopfront())
const doorX = (spec) => spec.door === 0 ? 0 : (spec.door ?? 1) * (spec.w / 2 - 0.41);

// lay a terrace: contiguous shops from x0 (west) eastward, on row `s`
// (−1 north, +1 south). A south shop is rotated π, so its local +x points
// west: door offsets and exposed end walls flip sign there.
function terrace(scene, shops, x0, s, out) {
  let x = x0;
  const z = s * ROW;
  for (let i = 0; i < shops.length; i++) {
    const spec = { ...shops[i] };
    // exposed side walls: the row's west end (i=0) and east end (last), in the shop's own frame
    const ends = [];
    if (i === 0) ends.push(s < 0 ? -1 : 1);
    if (i === shops.length - 1) ends.push(s < 0 ? 1 : -1);
    spec.ends = ends;
    const g = buildShop(spec);
    const cx = x + spec.w / 2;
    g.position.set(cx, 0, z);
    g.rotation.y = s < 0 ? 0 : Math.PI;
    scene.add(g);
    ink(g, 'mid');
    if (spec.app) out.doors[spec.app] = { x: cx + (s < 0 ? 1 : -1) * doorX(spec), z: z - s * 0.35, face: -s };
    x += spec.w;
  }
  // one box collider for the whole terrace (the body is 2.4 deep behind the front)
  out.colliders.push({ x0: x0 - 0.1, x1: x + 0.1, z0: s < 0 ? z - 2.6 : z - 0.12, z1: s < 0 ? z + 0.12 : z + 2.6 });
  return x;
}

const appSpec = (id) => {
  const a = APPS.find(a => a.id === id);
  return { ...FRONTS[id], name: a.title, app: id };
};

export function buildTown(scene) {
  const out = { colliders: [], doors: {}, lamps: [] };

  // ── the ground: warm paper, with a soft grass wash beyond the street ──
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 48).rotateX(-Math.PI / 2), paint(0xece0c4, { hatch: 0 }));
  ground.position.y = -0.02; ground.userData.noInk = true;
  scene.add(ground);
  for (const [gx, gz, r] of [[-4, -9, 7], [6, 8.5, 6], [-9, 7.5, 5.5], [12, -8, 6]]) {
    const patch = new THREE.Mesh(new THREE.CircleGeometry(r, 26).rotateX(-Math.PI / 2), paint(PAL.meadow, { hatch: 0 }));
    patch.position.set(gx, -0.01, gz); patch.userData.noInk = true;
    scene.add(patch);
  }

  // ── the road: a grey ribbon with hand-painted dashes, kerb to kerb ──
  const roadW = 2 * (ROW - PAVE);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(26, roadW).rotateX(-Math.PI / 2), paint(PAL.road, { hatch: 0 }));
  road.position.set(0.5, 0.004, 0); road.userData.noInk = true;
  scene.add(road);
  const dash = paint(PAL.dash, { hatch: 0 });
  for (let dx = -11; dx < 12.5; dx += 1.5) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.1).rotateX(-Math.PI / 2), dash);
    d.position.set(dx, 0.012, 0); d.userData.noInk = true;
    scene.add(d);
  }
  for (const s of [-1, 1]) {
    const kerb = new THREE.Mesh(new THREE.BoxGeometry(26, 0.07, 0.14), paint(PAL.kerb));
    kerb.position.set(0.5, 0.028, s * (roadW / 2 + 0.05));
    scene.add(kerb); ink(kerb, 'fine');
  }

  // ── north terraces (z < 0) ──
  let x = terrace(scene, [appSpec('behaviors'), DECO.bakery], -8.2, -1, out);
  terrace(scene, [appSpec('yarnflow'), DECO.cafe, appSpec('borrowed-eyes')], x + 1.3, -1, out);
  // ── south terraces (z > 0): specs listed west→east, laid mirrored ──
  terrace(scene, [appSpec('deckgpt'), appSpec('splatform')], -8.2, 1, out);
  terrace(scene, [appSpec('qr'), DECO.flowers, appSpec('gallery')], -2.7, 1, out);

  // ── the library closes the street at the east end, facing west ──
  const lib = library({ w: 3.5, pave: [0.4, 0.4] });
  lib.position.set(8.9, 0, 0); lib.rotation.y = -Math.PI / 2;
  scene.add(lib); ink(lib, 'mid');
  out.colliders.push({ x0: 8.3, x1: 11.6, z0: -1.9, z1: 1.9 });
  out.doors.library = { x: 7.55, z: 0, face: 0, west: true };

  // ── street furniture: lamps at the kerb, benches, trees in the gaps ──
  for (const [lx, s] of [[-7.4, 1], [-3.6, -1], [0.2, 1], [3.8, -1], [6.9, 1]]) {
    const L = lamp(); L.position.set(lx, 0, s * (roadW / 2 + 0.35));
    scene.add(L); out.lamps.push(L);
    out.colliders.push({ x0: lx - 0.14, x1: lx + 0.14, z0: L.position.z - 0.14, z1: L.position.z + 0.14 });
  }
  for (const [bx, bz, ry] of [[-5.6, -1.95, 0], [2.4, 1.95, Math.PI]]) {
    const b = bench(); b.position.set(bx, 0, bz); b.rotation.y = ry; scene.add(b);
    out.colliders.push({ x0: bx - 0.65, x1: bx + 0.65, z0: bz - 0.25, z1: bz + 0.25 });
  }
  for (const [tx, tz, s] of [[-10.3, -2.6, 1.05], [-10.6, 2.8, 0.9], [-5.9, 4.4, 0.8], [4.2, -4.6, 1.0], [9.6, -4.3, 0.85], [9.3, 4.5, 1.0]]) {
    const t = tree({ s }); t.position.set(tx, 0, tz); scene.add(t);
    out.colliders.push({ x0: tx - 0.2, x1: tx + 0.2, z0: tz - 0.2, z1: tz + 0.2 });
  }
  for (const [bx, bz] of [[-9.4, 4.1], [11.2, -2.9], [11.4, 2.7]]) {
    const b = bush(0.5 + Math.random() * 0.25); b.position.set(bx, 0, bz); scene.add(b);
  }

  // keep the player on the block
  out.bounds = { x0: -12.5, x1: 8.1, z0: -5.4, z1: 5.4 };
  return out;
}
