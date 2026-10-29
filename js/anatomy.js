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
// Parameters: age in years (1–90; children and older people need loadAges first), and
// (all 0..1, 0.5 = average adult) sex (0 female … 1 male), muscle,
// weight, height, proportions (>0.5 idealised, <0.5 uncommon), and ancestry
// { african, asian, caucasian } (any mix; normalised), `shape` (a body type from BODY_TYPES,
// with `shapeAmount` 0..1), the girths `bust`, `waist`, `hips`, `shoulders`, `belly`, `seat`
// (−1..1, 0 = as the rest of the body makes them), and `expression`: facial units
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
    for (const [k, v] of Object.entries(J.targets)) A.targets[k] = { q: v.q ?? J.q, idx: dec(v.idx, Uint16Array), d: dec(v.d, Int16Array) };
    A.boneIndex = new Map(J.bones.map((b, i) => [b.name, i]));
    A.children = J.bones.map(() => []);
    J.bones.forEach((b, i) => { if (b.parent >= 0) A.children[b.parent].push(i); });
    return A;
  });
  return _anat;
}

// baby / child / old shapes live in a second file, fetched the first time someone isn't a young adult
let _ages = null;
export function loadAges(A, url = new URL('../models/human/ages.json', import.meta.url)) {
  if (!_ages) _ages = fetch(url).then(r => r.json()).then((J) => {
    for (const [k, v] of Object.entries(J.targets)) A.targets[k] = { q: v.q, idx: dec(v.idx, Uint16Array), d: dec(v.d, Int16Array) };
    A.hasAges = true; return A;
  });
  return _ages;
}

// ── age ──
// MakeHuman's age axis runs 0..1: 1 year at 0, 11 at 0.1875, 25 at 0.5, 90 at 1, blending
// four measured shapes (baby, child, young, old). ageWeights(years) → their weights.
export function ageWeights(years) {
  const y = THREE.MathUtils.clamp(years, 1, 90);
  const v = y < 11 ? (y - 1) / 10 * 0.1875 : y < 25 ? 0.1875 + (y - 11) / 14 * 0.3125 : 0.5 + (y - 25) / 65 * 0.5;
  if (v < 0.1875) return { baby: 1 - v / 0.1875, child: v / 0.1875 };
  if (v < 0.5) return { child: 1 - (v - 0.1875) / 0.3125, young: (v - 0.1875) / 0.3125 };
  return { young: 1 - (v - 0.5) / 0.5, old: (v - 0.5) / 0.5 };
}
export const needsAges = (years) => { const w = ageWeights(years); return (w.baby || 0) + (w.child || 0) + (w.old || 0) > 1e-3; };
// stature by age and sex (metres; a growth curve through WHO / CDC medians), ± the height slider
const GROW = { female: [[2, 0.86], [4, 1.02], [6, 1.15], [8, 1.27], [10, 1.38], [12, 1.51], [14, 1.6], [16, 1.62], [18, 1.63], [45, 1.63], [65, 1.61], [85, 1.56]],
  male: [[2, 0.87], [4, 1.03], [6, 1.16], [8, 1.28], [10, 1.38], [12, 1.49], [14, 1.63], [16, 1.72], [18, 1.76], [45, 1.76], [65, 1.74], [85, 1.69]] };
export function statureFor(years, sex = 0, height = 0.5) {
  const at = (tab) => { let i = 1; while (i < tab.length - 1 && tab[i][0] < years) i++; const [a0, h0] = tab[i - 1], [a1, h1] = tab[i]; return h0 + (h1 - h0) * THREE.MathUtils.clamp((years - a0) / (a1 - a0), 0, 1); };
  const base = at(GROW.female) * (1 - sex) + at(GROW.male) * sex;
  return base * (1 + (height - 0.5) * 0.12);                          // ±6% across the slider
}

// body types: MakeHuman's measured silhouettes ("bodyshapes", sculpted separately for women
// and men). Where one set has no version of a type, the nearest one stands in.
// The measured silhouettes alone move a girth only 2–4 cm (they read as "everyone the same"),
// so each type also carries a girth recipe: where the body is wider or narrower.
export const BODY_TYPES = {
  rectangle: { label: 'Straight', fem: { rectangle: 1 }, man: { rectangle: 1 }, girth: { waist: 0.35, hips: -0.2 } },
  hourglass: { label: 'Hourglass', women: true, fem: { 'neat-hourglass': 1 }, man: { rectangle: 0.5 }, girth: { waist: -0.5, hips: 0.45, bust: 0.3, shoulders: 0.1 } },
  curvy: { label: 'Curvy', women: true, fem: { 'full-hourglass': 1 }, man: { triangle: 0.5, apple: 0.3 }, girth: { hips: 0.6, seat: 0.25, bust: 0.45, waist: -0.1 } },
  pear: { label: 'Pear', fem: { triangle: 1 }, man: { triangle: 1 }, girth: { hips: 0.75, seat: 0.15, shoulders: -0.4, bust: -0.15 } },
  apple: { label: 'Round', fem: { apple: 1 }, man: { apple: 1 }, girth: { belly: 0.45, waist: 0.6, hips: 0.1 } },
  diamond: { label: 'Diamond', fem: { diamond: 1 }, man: { apple: 0.6, rectangle: 0.4 }, girth: { waist: 0.45, belly: 0.25, hips: 0.25, shoulders: -0.35 } },
  wedge: { label: 'Broad shoulders', fem: { 'invert-triangle': 1 }, man: { 'invert-triangle': 1 }, girth: { shoulders: 0.75, hips: -0.4, waist: -0.15 } },
  trapezoid: { label: 'Athletic', fem: { 'invert-triangle': 0.5, rectangle: 0.5 }, man: { trapezoid: 1 }, girth: { shoulders: 0.5, waist: -0.35, seat: 0.2 } },
  column: { label: 'Lean', fem: { 'lean-column': 1 }, man: { 'lean-column': 1 }, girth: { waist: -0.3, hips: -0.45, bust: -0.35, seat: -0.3 } },
};
// (belly is MakeHuman's "pregnant" target, so it is kept to half: a tummy, not a pregnancy)
const GIRTH_MAX = { belly: 0.5 };
const GIRTHS = { bust: 'measure/bust-circ', waist: 'measure/waist-circ', hips: 'measure/hips-circ', shoulders: 'measure/shoulder-dist', belly: 'stomach/stomach-pregnant', seat: 'buttocks/buttocks-volume' };

// MakeHuman's macro blend: which targets, how much, for a set of parameters
function macroWeights(P) {
  const w = {}, add = (k, v) => { if (v > 1e-4) w[k] = (w[k] || 0) + v; };
  const G = { female: 1 - P.sex, male: P.sex };
  const anc = { african: 1, asian: 1, caucasian: 1, ...P.ancestry }, at = anc.african + anc.asian + anc.caucasian || 1;
  const tri = (x, lo, mid, hi) => x < 0.5 ? { [lo]: 1 - x / 0.5, [mid]: x / 0.5 } : { [mid]: 1 - (x - 0.5) / 0.5, [hi]: (x - 0.5) / 0.5 };
  const M = tri(P.muscle, 'minmuscle', 'averagemuscle', 'maxmuscle'), W = tri(P.weight, 'minweight', 'averageweight', 'maxweight');
  const AG = ageWeights(P.age ?? 25);
  for (const [g, gw] of Object.entries(G)) {
    for (const [a, aw] of Object.entries(AG)) {
      const w0 = gw * aw;
      if (a === 'young') {
        for (const e of ['african', 'asian', 'caucasian']) add(`${e}-${g}-young`, w0 * anc[e] / at);
        for (const [m, mw] of Object.entries(M)) for (const [ww, wv] of Object.entries(W)) {
          if (m === 'averagemuscle' && ww === 'averageweight') continue;  // that combination is the base itself
          add(`universal-${g}-young-${m}-${ww}`, w0 * mw * wv);
        }
      } else {
        // other ages: the averaged face set for that age, plus the adult differences between the
        // three face sets (scaled down) so face shape still varies; muscle and weight on their axes
        add(`avg-${g}-${a}`, w0);
        for (const e of ['african', 'asian', 'caucasian']) {
          const d = (anc[e] / at - 1 / 3) * w0 * 0.7;
          if (Math.abs(d) > 1e-4) w[`${e}-${g}-young`] = (w[`${e}-${g}-young`] || 0) + d;
        }
        for (const [m, mw] of Object.entries(M)) if (m !== 'averagemuscle') add(`universal-${g}-${a}-${m}-averageweight`, w0 * mw);
        for (const [ww, wv] of Object.entries(W)) if (ww !== 'averageweight') add(`universal-${g}-${a}-averagemuscle-${ww}`, w0 * wv);
      }
    }
    add(`${g}-young-averagemuscle-averageweight-maxheight`, gw * Math.max(0, (P.height - 0.5) * 2));
    add(`${g}-young-averagemuscle-averageweight-minheight`, gw * Math.max(0, (0.5 - P.height) * 2));
    add(`${g}-young-averagemuscle-averageweight-idealproportions`, gw * Math.max(0, (P.proportions - 0.5) * 2));
    add(`${g}-young-averagemuscle-averageweight-uncommonproportions`, gw * Math.max(0, (0.5 - P.proportions) * 2));
  }
  // body type and girths: grown-up shapes, so they come in through the teens
  const grown = THREE.MathUtils.smoothstep(P.age ?? 25, 11, 18);
  const T = BODY_TYPES[P.shape], amt = (P.shapeAmount ?? 1) * grown, girth = { ...(T?.girth || {}) };
  if (T) for (const [set, gw] of [['fem', 1 - P.sex], ['man', P.sex]]) for (const [k, v] of Object.entries(T[set])) add(`shape/${set}-${k}`, gw * v * amt * 1.3);
  for (const g of Object.keys(GIRTHS)) girth[g] = (girth[g] || 0) * amt + (P[g] || 0) * Math.max(0.35, grown);
  if (girth.bust > 0) girth.bust *= 1 - P.sex;                     // (a fuller bust is a woman's)
  for (const [g, v] of Object.entries(girth)) if (v) add(`${GIRTHS[g]}-${v > 0 ? 'incr' : 'decr'}`, Math.min(GIRTH_MAX[g] ?? 1, Math.abs(v)));
  for (const [k, v] of Object.entries(P.expression || {})) add('expr/' + k, v);   // e.g. { 'mouth-corner-puller': 0.6 }
  return w;
}

export const DEFAULTS = { sex: 0, age: 25, muscle: 0.5, weight: 0.5, height: 0.5, proportions: 0.5, ancestry: {}, stature: 1.7 };

export function buildBody(A, params = {}) {
  const P = { ...DEFAULTS, ...params };
  const pos = Float32Array.from(A.base);
  for (const [k, wt] of Object.entries(macroWeights(P))) {
    const t = A.targets[k];
    if (!t) continue;
    const s = wt * t.q;
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
