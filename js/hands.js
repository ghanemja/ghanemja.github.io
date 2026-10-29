// ─── ANATOMICAL HANDS ────────────────────────────────────────────────────────
// One continuous surface grown from a real hand skeleton, not a palm with
// sausages stuck on. Each bone is a tapered capsule (a signed-distance round
// cone); the palm's bones and pads melt together with a smooth union, every
// finger melts into the palm (so the webs between them form on their own) but
// never into its neighbour, and the result is polygonized with marching cubes.
//
// Proportions are human, in units of hand length HL (wrist crease → middle
// fingertip): palm ≈ 0.5 HL to the middle knuckle, middle finger ≈ 0.5 HL in
// three phalanges of 0.5 / 0.29 / 0.21, index and ring ≈ 0.9 / 0.95 of it,
// pinky ≈ 0.75 with its knuckle set back, breadth at the knuckles ≈ 0.45 HL.
// The thumb is three bones too — the metacarpal is buried in the fleshy
// thenar pad at the base of the palm — and sits forward of the index, its pad
// turned toward the fingers, the way a relaxed hand hangs.
//
// Local frame while building: r = radial (thumb side), d = distal (toward the
// fingertips), p = palmar (the way the palm faces). In the hand group the wrist
// is the origin, the hand hangs down −y, the thumb points +z (forward) and the
// palm faces inward (−s·x), matching folk.js.
import * as THREE from 'three';
import { MarchingCubes } from 'three/addons/objects/MarchingCubes.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

// ── signed distance helpers (Inigo Quilez's formulas), all in HL units ──
function roundCone(px, py, pz, a, b, r1, r2) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const l2 = bx * bx + by * by + bz * bz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const ax = px - a[0], ay = py - a[1], az = pz - a[2];
  const y = ax * bx + ay * by + az * bz, z = y - l2;
  const qx = ax * l2 - bx * y, qy = ay * l2 - by * y, qz = az * l2 - bz * y;
  const x2 = qx * qx + qy * qy + qz * qz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}
function ellipsoid(px, py, pz, c, r) {
  const x = px - c[0], y = py - c[1], z = pz - c[2];
  const k0 = Math.hypot(x / r[0], y / r[1], z / r[2]);
  const k1 = Math.hypot(x / (r[0] * r[0]), y / (r[1] * r[1]), z / (r[2] * r[2]));
  return k1 > 1e-9 ? k0 * (k0 - 1) / k1 : -Math.min(...r);
}
const smin = (a, b, k) => { const h = Math.max(k - Math.abs(a - b), 0) / k; return Math.min(a, b) - h * h * k * 0.25; };
const add = (a, b, t = 1) => [a[0] + b[0] * t, a[1] + b[1] * t, a[2] + b[2] * t];
const D2R = Math.PI / 180;

// ── the skeleton ──
// [r, d of the knuckle, base radius, length, splay°, relaxed flex° at MCP/PIP/DIP]
const FINGERS = [
  { mcp: [0.17, 0.485], r0: 0.050, len: 0.45, splay: -4, flex: [16, 32, 18] },   // index
  { mcp: [0.055, 0.50], r0: 0.051, len: 0.50, splay: 0, flex: [20, 38, 20] },    // middle
  { mcp: [-0.06, 0.485], r0: 0.048, len: 0.475, splay: 5, flex: [24, 44, 22] },  // ring
  { mcp: [-0.165, 0.452], r0: 0.044, len: 0.41, splay: 10, flex: [26, 44, 22] }, // pinky: 0.82 of the middle, knuckle back ≈0.05 HL — at 0.75 with the deepest set-back and curl it read stunted
];
const PHAL = [0.5, 0.29, 0.21];                 // proximal / middle / distal share of a finger

function skeleton(curl, Y = 0) {
  const palm = [], fingers = [];
  // wrist: an oval, wider across than thick, running up inside the sleeve
  palm.push({ wrist: true, a: [0.0, -0.32, 0.02], b: [0.0, 0.05, 0.03], r1: 0.14, r2: 0.15 });
  // metacarpals fan from the carpus to the knuckles
  const bases = [[0.08, 0.07], [0.025, 0.07], [-0.03, 0.07], [-0.08, 0.08]];
  FINGERS.forEach((f, i) => palm.push({ a: [bases[i][0], bases[i][1], 0.0], b: [f.mcp[0], f.mcp[1], 0.0], r1: 0.058 + 0.01 * Y, r2: f.r0 * (1.02 - 0.2 * Y) }));   // young: knuckle heads don't stand proud
  // the palm's soft pads: thenar (thumb ball), hypothenar (heel under the pinky), centre, and the
  // ridge under the knuckles that the finger creases sit on
  palm.push({ e: [0.10, 0.19, 0.055], r: [0.095, 0.15, 0.072] });
  palm.push({ e: [-0.105, 0.24, 0.04], r: [0.07, 0.17, 0.06] });
  palm.push({ e: [0.0, 0.31, 0.035], r: [0.13, 0.13, 0.05] });
  palm.push({ e: [0.0, 0.44, 0.03], r: [0.18, 0.055, 0.045] });

  for (const f of FINGERS) {
    const ab = f.splay * D2R, d0 = [Math.sin(ab), Math.cos(ab), 0];
    const r0 = f.r0 * (1 - 0.1 * Y), len = f.len;   // young: a touch slimmer, so neighbours just touch and the ink draws the line between them
    let p = [f.mcp[0] * (1 + 0.05 * Y), f.mcp[1], 0.0], th = 0, r = r0;   // knuckles a little further apart, so fingers have room
    const segs = [];
    for (let j = 0; j < 3; j++) {
      th += (f.flex[j] * (1 - 0.1 * Y) + curl * [55, 60, 35][j]) * D2R;   // young: a looser, more open rest     // each joint bends further toward the palm
      const dir = [d0[0] * Math.cos(th), d0[1] * Math.cos(th), Math.sin(th)];
      const q = add(p, dir, len * PHAL[j]);
      const r2 = r0 * (Y ? [0.93, 0.87, 0.78] : [0.9, 0.82, 0.7])[j];   // young fingers barely taper
      segs.push({ a: p, b: q, r1: r, r2 });
      p = q; r = r2;
    }
    fingers.push(segs);
  }
  // thumb: CMC deep in the heel of the palm, then metacarpal (in the thenar pad), proximal, distal
  const cmc = [0.13, 0.08, 0.05];
  const tdirs = [[0.22, 0.88, 0.32], [0.0, 0.92, 0.22], [-0.25, 0.9, 0.2]], tlen = [0.23, 0.15, 0.13], trad = [0.068, 0.06, 0.054, 0.046];
  const thumb = [];
  let tp = cmc;
  tdirs.forEach((v, j) => {
    const n = Math.hypot(...v), dir = [v[0] / n, v[1] / n, v[2] / n];
    const bend = curl * [0.1, 0.35, 0.45][j];               // a grip folds the thumb across toward the fingers
    const bd = [dir[0] - bend, dir[1], dir[2] + bend * 0.6], bn = Math.hypot(...bd);
    const q = add(tp, bd.map(c => c / bn), tlen[j]);
    thumb.push({ a: tp, b: q, r1: trad[j], r2: trad[j + 1] });
    tp = q;
  });
  return { palm, fingers, thumb };
}

function sdHand(S, r, d, p, Y = 0) {
  let palm = 1e9;
  for (const o of S.palm) {
    const v = o.e ? ellipsoid(r, d, p, o.e, o.r)
      : o.wrist ? roundCone(r, d, p / 0.68, o.a, o.b, o.r1, o.r2) * 0.68      // oval section
      : roundCone(r, d, p, o.a, o.b, o.r1, o.r2);
    palm = smin(palm, v, 0.07 + 0.04 * Y);                  // young: the back of the hand is one smooth plane
  }
  let thumb = 1e9;
  for (const s of S.thumb) thumb = smin(thumb, roundCone(r, d, p, s.a, s.b, s.r1, s.r2), 0.02);
  let hand = smin(palm, thumb, 0.07);
  for (const segs of S.fingers) {
    let f = 1e9;
    // segments share their radius at each joint, so a plain union is already seamless; a smooth-
    // min blend ADDS material at the joint (that is what knobbed the young fingers)
    for (const s of segs) f = Y ? Math.min(f, roundCone(r, d, p, s.a, s.b, s.r1, s.r2)) : smin(f, roundCone(r, d, p, s.a, s.b, s.r1, s.r2), 0.015);
    hand = Math.min(hand, smin(palm, f, 0.045));            // melts into the palm, never into the next finger
  }
  return hand;
}

// Taubin smoothing (λ/μ): averages each vertex toward its neighbours, then pushes back
// out, so ripples go but the hand doesn't shrink. Needs an indexed geometry.
function taubin(g, iters = 6, lam = 0.5, mu = -0.53) {
  const P = g.attributes.position, n = P.count, idx = g.index.array;
  const nb = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < idx.length; i += 3) {
    const a = idx[i], b = idx[i + 1], c = idx[i + 2];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const A = P.array, T = new Float32Array(A.length);
  const pass = (f) => {
    for (let v = 0; v < n; v++) {
      let x = 0, y = 0, z = 0, k = 0;
      for (const u of nb[v]) { x += A[u * 3]; y += A[u * 3 + 1]; z += A[u * 3 + 2]; k++; }
      if (!k) { T[v * 3] = A[v * 3]; T[v * 3 + 1] = A[v * 3 + 1]; T[v * 3 + 2] = A[v * 3 + 2]; continue; }
      T[v * 3] = A[v * 3] + f * (x / k - A[v * 3]);
      T[v * 3 + 1] = A[v * 3 + 1] + f * (y / k - A[v * 3 + 1]);
      T[v * 3 + 2] = A[v * 3 + 2] + f * (z / k - A[v * 3 + 2]);
    }
    A.set(T);
  };
  for (let i = 0; i < iters; i++) { pass(lam); pass(mu); }
  P.needsUpdate = true;
  g.computeVertexNormals();
}

// makeHandGeometry(s, { length, curl, res }) → BufferGeometry in the hand group's frame
//   s: −1 left, +1 right · length: wrist crease → middle fingertip · curl: 0 relaxed … 1 a loose fist
const _cache = new Map();
//   young: 0 adult … 1 a young person's hand — smooth knuckles, plumper, shorter, barely tapered fingers
export function makeHandGeometry(s, { length = 0.105, curl = 0, res = 68, young = 0 } = {}) {
  const key = [s, length, curl, res, young].join('|');
  if (_cache.has(key)) return _cache.get(key);
  const S = skeleton(curl, young);
  // the grid: a cube around the hand (in HL units, centred on the hand's bulk)
  const C = [0.0, 0.36, 0.12], half = 0.72;               // r, d, p
  const mc = new MarchingCubes(res, new THREE.MeshBasicMaterial(), false, false, 60000);
  mc.isolation = 0;
  const N = res, F = mc.field;
  const toHL = (i) => (i - N / 2) / (N / 2) * half;
  for (let z = 0; z < N; z++) for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    // grid x → r, y → d, z → p; −distance so "inside" is high, as marching cubes expects
    const r = C[0] + toHL(x), d = C[1] + toHL(y), p = C[2] + toHL(z);
    // open where the wrist runs into the sleeve; skip the empty corners of the cube
    const out = d < -0.3 || d > 1.02 || r < -0.32 || r > 0.36 || p < -0.2 || p > 0.55;
    F[x + y * N + z * N * N] = out ? -1 : -sdHand(S, r, d, p, young);
  }
  mc.update();
  const n = mc.count, P = mc.positionArray, Nn = mc.normalArray;
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3);
  const k = half * length;
  for (let i = 0; i < n; i++) {
    const r = C[0] * length + P[i * 3] * k, d = C[1] * length + P[i * 3 + 1] * k, p = C[2] * length + P[i * 3 + 2] * k;
    // (r, d, p) → hand group (x, y, z): palm faces −s·x, fingers hang −y, thumb forward +z
    pos.set([-s * p, -d, r], i * 3);
    const nr = Nn[i * 3], nd = Nn[i * 3 + 1], np = Nn[i * 3 + 2], l = Math.hypot(nr, nd, np) || 1;
    nor.set([-s * np / l, -nd / l, nr / l], i * 3);
  }
  let g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  // the (r,d,p) → (x,y,z) map is a mirror for one side: flip that side's winding back
  if (s > 0) for (let i = 0; i < n; i += 3) for (const A of [pos, nor]) for (let c = 0; c < 3; c++) {
    const t = A[(i + 1) * 3 + c]; A[(i + 1) * 3 + c] = A[(i + 2) * 3 + c]; A[(i + 2) * 3 + c] = t;
  }
  g = mergeVertices(g, length * 1e-4);
  if (young) taubin(g, 8);               // iron out the marching-cubes stair-steps the ink would trace as bumps
  g.computeBoundingSphere();
  mc.geometry.dispose();
  _cache.set(key, g);
  return g;
}
