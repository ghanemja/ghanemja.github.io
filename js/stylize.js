// ─── STYLE: deliberate departures from the anatomical human ──────────────────
// The parametric body (js/anatomy.js) is physically accurate. A style changes
// it on purpose, in a few named, measurable ways, each one a smooth transform
// about a real joint, blended by the skin weights so it flows into the
// neighbouring body exactly the way the skin bends (no seams, no hinges):
//
//   head       head size relative to THIS person's natural head (1 = true to life),
//              scaled about the top of the neck. Relative, so it suits every age: a
//              4-year-old is naturally ≈5 heads tall and an adult ≈7.5, and a style
//              must not "correct" a child into adult proportions. For an adult,
//              1.15 ≈ 6.8 heads, 1.55 ≈ storybook 5.4, 2.6 ≈ chibi 3.6. Ordinary styles
//              are held to HUMAN_RANGE (below); only `exaggerated: true` may leave it.
//   hands      hand size about the wrist (1 = anatomical)
//   feet       foot size about the ankle
//   eyes       eyeball + socket size about each eye's centre
//   expression extra facial units the style adds (storybook eyes open wider)
//   soften     smoothing passes over the skin (rounds off small anatomical detail —
//              the look of gouache, not of a sculpt)
//
// Never stylize by moving joints out of their sockets or by changing what is
// connected to what: a style rescales real parts; it doesn't invent new ones.
import * as THREE from 'three';
import { regionWeight } from './anatomy.js';

// ── THE PROPORTION RULES ──
// A person is drawn with human proportions unless a style says, by name, that it is
// an exaggerated style. Every ordinary style is held inside the human range below;
// anything outside it is clamped (with a console warning) — a big-headed figure is
// never an accident of tuning.
export const HUMAN_RANGE = {
  head: [0.95, 1.2],         // ×natural; 1.2 is a gentle illustrator's head (an adult ≈6.6 heads), 0.95 heroic
  hands: [0.95, 1.08],
  feet: [0.95, 1.06],
  eyes: [0.95, 1.15],
};

export const STYLES = {
  real: { head: 1, hands: 1, feet: 1, eyes: 1, soften: 0, expression: {} },
  // the town: a person with human proportions, painted — the head only a touch
  // larger than life, small details softened for the gouache look
  town: { head: 1.08, hands: 1.02, feet: 1.0, eyes: 1.08, soften: 3, expression: {} },
  // exaggerated styles must say so (exaggerated: true), and are only used when asked for
  storybook: { exaggerated: true, head: 1.55, hands: 1.12, feet: 1.06, eyes: 1.35, soften: 3,
    expression: { 'eye-left-opened-up': 0.2, 'eye-right-opened-up': 0.2 } },   // open, bright eyes (more reads as startled)
  chibi: { exaggerated: true, head: 2.6, hands: 1.25, feet: 1.15, eyes: 1.6, soften: 4,
    expression: { 'eye-left-opened-up': 0.15, 'eye-right-opened-up': 0.15 } },
};

// enforce the rules: an ordinary style stays inside the human range
export function checkStyle(style) {
  const S = { ...STYLES.real, ...style };
  if (S.exaggerated) return S;
  for (const [k, [lo, hi]] of Object.entries(HUMAN_RANGE)) {
    const v = S[k];
    if (v == null) continue;
    if (v < lo || v > hi) {
      console.warn(`style: ${k}=${v} is outside human proportions [${lo}, ${hi}]; clamped. Mark the style exaggerated: true if this is deliberate.`);
      S[k] = THREE.MathUtils.clamp(v, lo, hi);
    }
  }
  return S;
}

const _v = new THREE.Vector3();
function scaleRegion(body, bone, pivot, s) {
  const { A, pos } = body, w = regionWeight(A, bone);
  for (let i = 0; i < A.n; i++) {
    const k = 1 + (s - 1) * w[i];
    if (k === 1) continue;
    _v.set(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]).sub(pivot).multiplyScalar(k).add(pivot);
    pos[i * 3] = _v.x; pos[i * 3 + 1] = _v.y; pos[i * 3 + 2] = _v.z;
  }
  // joints belonging to the region move with it (their helper vertices may not carry weights)
  const sub = new Set(); const mark = (i) => { sub.add(A.bones[i].name); A.children[i].forEach(mark); };
  mark(A.boneIndex.get(bone));
  for (const name of sub) for (const end of ['head', 'tail']) body.joints[name][end].sub(pivot).multiplyScalar(s).add(pivot);
}

// eye centres from the eye helper meshes
export function eyeCentres(body) {
  return ['helper-l-eye', 'helper-r-eye'].map((g) => {
    const t = body.A.tris[g], c = new THREE.Vector3(), seen = new Set();
    for (const i of t) if (!seen.has(i)) { seen.add(i); c.x += body.pos[i * 3]; c.y += body.pos[i * 3 + 1]; c.z += body.pos[i * 3 + 2]; }
    return c.multiplyScalar(1 / seen.size);
  });
}

// head height (vertex → chin): the top of the skull to the lowest point of the face
export function headHeight(body) {
  const { A, pos } = body, w = regionWeight(A, 'head');
  let top = -1e9, chin = 1e9;
  const cz = body.joints.head.head.z;
  for (const i of A.tris.body) {
    if (w[i] < 0.9) continue;
    const y = pos[i * 3 + 1];
    top = Math.max(top, y);
    if (pos[i * 3 + 2] > cz) chin = Math.min(chin, y);
  }
  return { top, chin, h: top - chin };
}

function ground(body, stature) {
  const { A, pos } = body;
  let lo = 1e9, hi = -1e9;
  for (const i of A.tris.body) { const y = pos[i * 3 + 1]; lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const k = stature / (hi - lo);
  for (let i = 0; i < pos.length; i += 3) { pos[i] *= k; pos[i + 1] = (pos[i + 1] - lo) * k; pos[i + 2] *= k; }
  for (const j of Object.values(body.joints)) for (const p of [j.head, j.tail]) { p.x *= k; p.y = (p.y - lo) * k; p.z *= k; }
}

// Taubin λ/μ smoothing over a set of triangles (shrink-free), in place on pos
export function smoothSurface(pos, tris, passes, { lambda = 0.5, mu = -0.53, weight = null, fixed = null } = {}) {
  const nb = new Map();
  for (let t = 0; t < tris.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = tris[t + e], b = tris[t + (e + 1) % 3];
    (nb.get(a) || nb.set(a, new Set()).get(a)).add(b);
    (nb.get(b) || nb.set(b, new Set()).get(b)).add(a);
  }
  const ids = [...nb.keys()].filter(i => !fixed?.has(i)), tmp = new Float32Array(ids.length * 3);
  const step = (f) => {
    ids.forEach((i, k) => {
      let x = 0, y = 0, z = 0; const n = nb.get(i);
      for (const j of n) { x += pos[j * 3]; y += pos[j * 3 + 1]; z += pos[j * 3 + 2]; }
      const s = f * (weight ? weight[i] : 1);
      tmp[k * 3] = pos[i * 3] + s * (x / n.size - pos[i * 3]);
      tmp[k * 3 + 1] = pos[i * 3 + 1] + s * (y / n.size - pos[i * 3 + 1]);
      tmp[k * 3 + 2] = pos[i * 3 + 2] + s * (z / n.size - pos[i * 3 + 2]);
    });
    ids.forEach((i, k) => pos.set(tmp.subarray(k * 3, k * 3 + 3), i * 3));
  };
  for (let p = 0; p < passes; p++) { step(lambda); step(mu); }
}

export function stylize(body, style = STYLES.real) {
  const S = checkStyle(style), J = body.joints, stature = body.P.stature;
  if (S.head && S.head !== 1) scaleRegion(body, 'head', J.head.head.clone(), S.head);   // (ground() then restores the stature)
  if (S.eyes !== 1) {
    const [l, r] = eyeCentres(body), R = l.distanceTo(r) * 0.42;
    for (const c of [l, r]) for (let i = 0; i < body.A.n; i++) {
      _v.set(body.pos[i * 3], body.pos[i * 3 + 1], body.pos[i * 3 + 2]);
      const d = _v.distanceTo(c); if (d > R) continue;
      const f = 1 + (S.eyes - 1) * (1 - THREE.MathUtils.smoothstep(d / R, 0.35, 1));
      _v.sub(c).multiplyScalar(f).add(c);
      body.pos.set([_v.x, _v.y, _v.z], i * 3);
    }
  }
  for (const k of ['L', 'R']) {
    if (S.hands !== 1) scaleRegion(body, 'wrist.' + k, J['wrist.' + k].head.clone(), S.hands);
    if (S.feet !== 1) scaleRegion(body, 'foot.' + k, J['foot.' + k].head.clone(), S.feet);
  }
  if (S.soften) smoothSurface(body.pos, body.A.tris.body, S.soften);
  ground(body, stature);
  body.style = S;
  return body;
}
