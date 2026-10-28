// ─── THE PARAMETRIC HUMAN ────────────────────────────────────────────────────
// A physically accurate person, built from MakeHuman's CC0 base human (baked by
// tools/human/bake.mjs into models/human/makehuman.json): a sculpted body mesh,
// shape targets measured from real people, and a full rig (every finger joint)
// with skin weights. Anatomy is right by construction; style is a separate,
// deliberate layer on top (js/stylize.js).
//
//   const A = await loadAnatomy();
//   const body = buildBody(A, { sex: 0, muscle: 0.5, weight: 0.45, height: 0.5 });
//   body.pos      Float32Array, rest positions in metres-ish units, feet on y = 0, facing +z
//   body.joints   { boneName: { head: Vector3, tail: Vector3 } }
//   regionWeight(A, bone) → how much each vertex belongs to that bone's subtree
//
// Build people with makePerson (js/people.js), which dresses them by construction.
//
// Parameters (all 0..1, 0.5 = average adult): sex (0 female … 1 male), muscle,
// weight, height, proportions (>0.5 idealised, <0.5 uncommon), and ancestry
// { african, asian, caucasian } (any mix; normalised), and `expression`: facial units
// by name ('mouth-corner-puller' is the smile muscle). `stature` sets the final
// height in scene units; MakeHuman's own units are decimetres.
import * as THREE from 'three';

const dec = (s, T) => { const b = Uint8Array.from(atob(s), c => c.charCodeAt(0)); return new T(b.buffer); };

let _anat = null;
export function loadAnatomy(url = new URL('../models/human/makehuman.json', import.meta.url)) {
  if (!_anat) _anat = fetch(url).then(r => r.json()).then((J) => {
    const A = { n: J.n, base: dec(J.pos, Float32Array), bones: J.bones, joints: J.joints, q: J.q, tris: {}, targets: {} };
    for (const [k, v] of Object.entries(J.tris)) A.tris[k] = dec(v, Uint16Array);
    A.skinI = dec(J.skinI, Uint8Array); A.skinW = dec(J.skinW, Uint8Array);
    for (const [k, v] of Object.entries(J.targets)) A.targets[k] = { idx: dec(v.idx, Uint16Array), d: dec(v.d, Int16Array) };
    A.boneIndex = new Map(J.bones.map((b, i) => [b.name, i]));
    A.children = J.bones.map(() => []);
    J.bones.forEach((b, i) => { if (b.parent >= 0) A.children[b.parent].push(i); });
    return A;
  });
  return _anat;
}

// MakeHuman's macro blend: which targets, how much, for a set of parameters
function macroWeights(P) {
  const w = {}, add = (k, v) => { if (v > 1e-4) w[k] = (w[k] || 0) + v; };
  const G = { female: 1 - P.sex, male: P.sex };
  const anc = { african: 1, asian: 1, caucasian: 1, ...P.ancestry }, at = anc.african + anc.asian + anc.caucasian || 1;
  const tri = (x, lo, mid, hi) => x < 0.5 ? { [lo]: 1 - x / 0.5, [mid]: x / 0.5 } : { [mid]: 1 - (x - 0.5) / 0.5, [hi]: (x - 0.5) / 0.5 };
  const M = tri(P.muscle, 'minmuscle', 'averagemuscle', 'maxmuscle'), W = tri(P.weight, 'minweight', 'averageweight', 'maxweight');
  for (const [g, gw] of Object.entries(G)) {
    for (const e of ['african', 'asian', 'caucasian']) add(`${e}-${g}-young`, gw * anc[e] / at);
    for (const [m, mw] of Object.entries(M)) for (const [ww, wv] of Object.entries(W)) {
      if (m === 'averagemuscle' && ww === 'averageweight') continue;      // that combination is the base itself
      add(`universal-${g}-young-${m}-${ww}`, gw * mw * wv);
    }
    add(`${g}-young-averagemuscle-averageweight-maxheight`, gw * Math.max(0, (P.height - 0.5) * 2));
    add(`${g}-young-averagemuscle-averageweight-minheight`, gw * Math.max(0, (0.5 - P.height) * 2));
    add(`${g}-young-averagemuscle-averageweight-idealproportions`, gw * Math.max(0, (P.proportions - 0.5) * 2));
    add(`${g}-young-averagemuscle-averageweight-uncommonproportions`, gw * Math.max(0, (0.5 - P.proportions) * 2));
  }
  for (const [k, v] of Object.entries(P.expression || {})) add('expr/' + k, v);   // e.g. { 'mouth-corner-puller': 0.6 }
  return w;
}

export const DEFAULTS = { sex: 0, muscle: 0.5, weight: 0.5, height: 0.5, proportions: 0.5, ancestry: {}, stature: 1.7 };

export function buildBody(A, params = {}) {
  const P = { ...DEFAULTS, ...params };
  const pos = Float32Array.from(A.base);
  for (const [k, wt] of Object.entries(macroWeights(P))) {
    const t = A.targets[k];
    if (!t) continue;
    const s = wt * A.q;
    for (let j = 0; j < t.idx.length; j++) {
      const i = t.idx[j] * 3;
      pos[i] += t.d[j * 3] * s; pos[i + 1] += t.d[j * 3 + 1] * s; pos[i + 2] += t.d[j * 3 + 2] * s;
    }
  }
  // stand on y = 0 and scale to the requested stature (top of the head ↔ soles)
  let lo = 1e9, hi = -1e9;
  const tr = A.tris.body;
  for (let j = 0; j < tr.length; j++) { const y = pos[tr[j] * 3 + 1]; if (y < lo) lo = y; if (y > hi) hi = y; }
  const k = P.stature / (hi - lo);
  for (let i = 0; i < pos.length; i += 3) { pos[i] *= k; pos[i + 1] = (pos[i + 1] - lo) * k; pos[i + 2] *= k; }
  return { A, P, pos, joints: placeJoints(A, pos), scale: k };
}

// each joint sits at the mean of its helper vertices, so the rig follows the shape
export function placeJoints(A, pos) {
  const at = (name) => {
    const ids = A.joints[name], v = new THREE.Vector3();
    for (const i of ids) v.add(new THREE.Vector3(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]));
    return v.multiplyScalar(1 / ids.length);
  };
  const J = {};
  for (const b of A.bones) J[b.name] = { head: at(b.head), tail: at(b.tail) };
  return J;
}

// how much a vertex belongs to a bone and everything below it (0..1): skin weights
// summed over the subtree. Regions blend exactly as the skin does.
export function regionWeight(A, rootName) {
  const inSub = new Uint8Array(A.bones.length);
  const mark = (i) => { inSub[i] = 1; A.children[i].forEach(mark); };
  mark(A.boneIndex.get(rootName));
  const w = new Float32Array(A.n);
  for (let v = 0; v < A.n; v++) {
    let s = 0;
    for (let k = 0; k < 4; k++) if (inSub[A.skinI[v * 4 + k]]) s += A.skinW[v * 4 + k];
    w[v] = s / 255;
  }
  return w;
}

// a skinned mesh for a set of triangles over the (possibly stylized) rest positions.
// Only js/people.js calls this, and only for the dressed parts: a person's skin mesh
// is never the whole body (see AGENTS.md — people are always clothed).
export function skinnedMesh(body, tris, material, pos = body.pos) {
  const { A } = body;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pos), 3));
  g.setIndex(new THREE.BufferAttribute(tris, 1));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(Uint16Array.from(A.skinI), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(Float32Array.from(A.skinW, x => x / 255), 4));
  g.computeVertexNormals();
  const m = new THREE.SkinnedMesh(g, material);
  m.frustumCulled = false;
  return m;
}

// the skeleton: one THREE.Bone per rig bone at its head joint, world-aligned axes
// (pose with rotateBone(), which takes world-space axes)
export function buildSkeleton(body) {
  const { A, joints } = body;
  const bones = A.bones.map(b => { const o = new THREE.Bone(); o.name = b.name; return o; });
  A.bones.forEach((b, i) => {
    const h = joints[b.name].head;
    if (b.parent >= 0) { bones[i].position.copy(h).sub(joints[A.bones[b.parent].name].head); bones[b.parent].add(bones[i]); }
    else bones[i].position.copy(h);
  });
  const root = bones[A.boneIndex.get('root')];
  root.updateMatrixWorld(true);
  return { root, bones, byName: Object.fromEntries(bones.map(b => [b.name, b])), skeleton: new THREE.Skeleton(bones) };
}

// rotate a bone about a WORLD-space axis (the bones keep world-aligned rest frames)
const _q = new THREE.Quaternion(), _pq = new THREE.Quaternion();
export function rotateBone(bone, axis, angle) {
  bone.parent.getWorldQuaternion(_pq);
  _q.setFromAxisAngle(axis.clone().applyQuaternion(_pq.clone().invert()).normalize(), angle);
  bone.quaternion.premultiply(_q);
}
