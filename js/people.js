// ─── PEOPLE: an anatomical human, stylized, and ALWAYS DRESSED ───────────────
// makePerson(spec) is the only way to make a person from the parametric body:
//
//   body (js/anatomy.js) → style (js/stylize.js) → dress → hair & face → rig → pose → motion (js/motion.js)
//
// Dressed by construction: every triangle of the body is assigned to exactly one
// of face+neck, hands, top, bottoms or shoes. Only face, neck and hands become
// skin; everything else exists only as garment shells lifted off the body. A
// missing garment would show a hole, never a body (AGENTS.md: people are
// always clothed — that holds for debug renders too).
//
// Garments are smoothed so they drape over the body instead of shrink-wrapping
// it, then pushed back out wherever smoothing sank them inside.
import * as THREE from 'three';
import { loadAnatomy, loadAges, needsAges, statureFor, buildBody, buildSkeleton, regionWeight, rotateBone } from './anatomy.js';
import { applyRenderStyle, recolor } from './render-styles.js';
import { stylize, STYLES, smoothSurface, eyeCentres, headHeight } from './stylize.js';
import { paint, ink } from './style.js';
import { shoeGeo } from './folk.js';
import { relaxedPose, makeMotion, wp } from './motion.js';
import { makeHair } from './hair.js';

export const LOOK_JANELLE = {
  body: { sex: 0, muscle: 0.45, weight: 0.42, height: 0.5, proportions: 0.6 },
  // a warm, easy smile: the zygomaticus lifts the mouth corners, the cheeks lift the lower lids a touch
  expression: { 'mouth-corner-puller': 0.55, 'mouth-elevation': 0.15, 'eye-left-slit': 0.04, 'eye-right-slit': 0.04 },   // (more squints: small dark eyes at a distance)
  skin: 0xefc3a2, lips: 0xd98a7e, blush: 0xe79a8a, eyes: 0x4a3226, brows: 0x9a7448,
  hair: 0xc9a06a, hairStyle: 'bob', top: 0x2f2b33, bottom: 0x6f8db0, shoes: 0xf1ebdf, sole: 0xc98f5a,
};

const add3 = (a, i, x, y, z) => { a[i * 3] += x; a[i * 3 + 1] += y; a[i * 3 + 2] += z; };

function vertexNormals(pos, tris) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setIndex(new THREE.BufferAttribute(tris, 1));
  g.computeVertexNormals();
  return g.attributes.normal.array;
}

// blur a surface's skin weights over its own mesh where mask(i) > 0 (each pass moves halfway to
// the neighbours' average); four strongest bones kept
function smoothWeights(S, mask, passes) {
  const n = S.P.length / 3, nb = Array.from({ length: n }, () => new Set());
  for (let t = 0; t < S.T.length; t += 3) for (let e = 0; e < 3; e++) { const a = S.T[t + e], b = S.T[t + (e + 1) % 3]; nb[a].add(b); nb[b].add(a); }
  const used = [...new Set(S.T)].filter(i => mask(i) > 0.02), m = new Map(used.map(i => [i, mask(i)]));
  for (let p = 0; p < passes; p++) {
    const next = new Map();
    for (const i of used) {
      const acc = new Map(), ns = nb[i]; if (!ns.size) continue;
      for (const j of ns) for (const [b, w] of S.K[j]) acc.set(b, (acc.get(b) || 0) + w / ns.size);
      const k = 0.5 * m.get(i), out = new Map();
      for (const [b, w] of S.K[i]) out.set(b, w * (1 - k));
      for (const [b, w] of acc) out.set(b, (out.get(b) || 0) + w * k);
      const top = [...out].sort((x, y) => y[1] - x[1]).slice(0, 4), sum = top.reduce((a, x) => a + x[1], 0) || 1;
      next.set(i, new Map(top.map(([b, w]) => [b, w / sum])));
    }
    for (const [i, K] of next) S.K[i] = K;
  }
}

// ── a cuttable surface: positions, normals and skin per vertex, plus triangles ──
// A garment is the body surface cut along smooth fields (the rig's own weight
// falloffs, or a height), split exactly on the cut so hems are clean curves,
// not the stair-step of whole triangles.
function surface(body, N, tris = body.A.tris.body) {
  const { A } = body, S = { P: [], N: [], K: [], T: Array.from(tris), f: {} };
  for (let i = 0; i < A.n; i++) {
    S.P.push(body.pos[i * 3], body.pos[i * 3 + 1], body.pos[i * 3 + 2]);
    S.N.push(N[i * 3], N[i * 3 + 1], N[i * 3 + 2]);
    const m = new Map();
    for (let k = 0; k < 4; k++) if (A.skinW[i * 4 + k]) m.set(A.skinI[i * 4 + k], (m.get(A.skinI[i * 4 + k]) || 0) + A.skinW[i * 4 + k] / 255);
    S.K.push(m);
  }
  return S;
}
// keep the part of S where field(i) ≥ 0 (field is per vertex; new vertices interpolate)
function cut(S, field) {
  const n0 = S.P.length / 3, val = new Float32Array(n0);
  for (let i = 0; i < n0; i++) val[i] = field(i, S);
  const mid = new Map(), out = [];
  const vAt = (a, b) => {
    const key = a < b ? a + ',' + b : b + ',' + a;
    if (mid.has(key)) return mid.get(key);
    const t = val[a] / (val[a] - val[b]), i = S.P.length / 3;
    for (const arr of [S.P, S.N]) for (let c = 0; c < 3; c++) arr.push(arr[a * 3 + c] + (arr[b * 3 + c] - arr[a * 3 + c]) * t);
    const m = new Map();
    for (const [bi, w] of S.K[a]) m.set(bi, (m.get(bi) || 0) + w * (1 - t));
    for (const [bi, w] of S.K[b]) m.set(bi, (m.get(bi) || 0) + w * t);
    S.K.push(m);
    for (const f of Object.values(S.f)) f.push(f[a] + (f[b] - f[a]) * t);   // carry the fields along
    mid.set(key, i);
    return i;
  };
  for (let t = 0; t < S.T.length; t += 3) {
    const v = [S.T[t], S.T[t + 1], S.T[t + 2]], inside = v.map(i => val[i] >= 0), n = inside.filter(Boolean).length;
    if (n === 3) { out.push(...v); continue; }
    if (n === 0) continue;
    // rotate so the odd vertex out is first
    let r = 0; while ((n === 1) !== inside[r]) r++;
    const [a, b, c] = [v[r], v[(r + 1) % 3], v[(r + 2) % 3]], ab = vAt(a, b), ac = vAt(a, c);
    if (n === 1) out.push(a, ab, ac);                       // a is the only one inside
    else out.push(ab, b, c, ab, c, ac);                     // a is the only one outside
  }
  S.T = out;
  return S;
}
const copySurface = (S) => ({ P: S.P.slice(), N: S.N.slice(), K: S.K.slice(), T: S.T.slice(), f: Object.fromEntries(Object.entries(S.f).map(([k, v]) => [k, v.slice()])) });

// compact a surface into a skinned geometry (only the vertices its triangles use)
function geometryOf(S, pos = S.P) {
  const used = [...new Set(S.T)], map = new Map(used.map((v, i) => [v, i])), n = used.length;
  const P = new Float32Array(n * 3), I = new Uint16Array(n * 4), W = new Float32Array(n * 4);
  used.forEach((v, i) => {
    P.set([pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]], i * 3);
    const top = [...S.K[v]].sort((x, y) => y[1] - x[1]).slice(0, 4), s = top.reduce((a, t) => a + t[1], 0) || 1;
    top.forEach(([bi, w], k) => { I[i * 4 + k] = bi; W[i * 4 + k] = w / s; });
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(I, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(W, 4));
  g.setIndex(S.T.map(v => map.get(v)));
  g.computeVertexNormals();
  g.userData.used = used;
  return g;
}

// a garment shell: lifted off the body along its normals, smoothed so it drapes
// (the hems stay on their cut), then pushed back out wherever it sank inside
function drape(S, { thick, ease = () => 0, smooth = 10, smoothW = null, min = thick * 0.6, k = 1 }) {
  const P = S.P.slice(), used = new Set(S.T);
  for (const i of used) { const t = (thick + ease(i)) * k; add3(P, i, S.N[i * 3] * t, S.N[i * 3 + 1] * t, S.N[i * 3 + 2] * t); }
  const edges = new Map();
  for (let t = 0; t < S.T.length; t += 3) for (let e = 0; e < 3; e++) {
    const a = S.T[t + e], b = S.T[t + (e + 1) % 3], key = a < b ? a + ',' + b : b + ',' + a;
    edges.set(key, (edges.get(key) || 0) + 1);
  }
  const rim = new Set(); for (const [key, c] of edges) if (c === 1) key.split(',').forEach(x => rim.add(+x));
  const Pf = Float32Array.from(P), lo = min * k;
  for (let round = 0; round < 3; round++) {
    smoothSurface(Pf, S.T, Math.ceil(smooth / 3), { weight: smoothW, fixed: rim });
    for (const i of used) {                                  // never inside the body
      const d = (Pf[i * 3] - S.P[i * 3]) * S.N[i * 3] + (Pf[i * 3 + 1] - S.P[i * 3 + 1]) * S.N[i * 3 + 1] + (Pf[i * 3 + 2] - S.P[i * 3 + 2]) * S.N[i * 3 + 2];
      if (d < lo) add3(Pf, i, S.N[i * 3] * (lo - d), S.N[i * 3 + 1] * (lo - d), S.N[i * 3 + 2] * (lo - d));
    }
  }
  return Pf;
}

// ── soften the hidden torso the clothes are fitted to: smoothing by DISTANCE, not by mesh
// neighbour. MakeHuman's mesh is dense where the anatomy is detailed, so neighbour smoothing
// barely moves it (22 Laplacian passes moved the chest 7 mm). Each torso vertex looks at every
// torso point within ~2σ (a spatial hash finds them) and moves toward their Gaussian- and
// area-weighted average — but only along their averaged normal. Moving freely bunched dense patches into flat
// fans; moving along each vertex's own normal dug craters where those normals are noisy. Blended by w.
function spatialSmooth(pos, tris, w, { sigma = 0.05, rounds = 4, outOnly = false } = {}) {
  const ids = [...new Set(tris)].filter(i => w[i] > 0.01), R = sigma * 2, inv = 1 / (2 * sigma * sigma);
  for (let round = 0; round < rounds; round++) {
    const Nn = vertexNormals(Float32Array.from(pos), tris);
    // each point counts by the surface area it stands for (a third of its triangles), not once
    // per vertex — otherwise a densely meshed pit (the navel) outvotes the surface round it
    const area = new Float32Array(pos.length / 3), e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), p0 = new THREE.Vector3();
    for (let t = 0; t < tris.length; t += 3) {
      p0.fromArray(pos, tris[t] * 3); e1.fromArray(pos, tris[t + 1] * 3).sub(p0); e2.fromArray(pos, tris[t + 2] * 3).sub(p0);
      const a = e1.cross(e2).length() / 6; area[tris[t]] += a; area[tris[t + 1]] += a; area[tris[t + 2]] += a;
    }
    const grid = new Map(), key = (x, y, z) => `${Math.floor(x / R)},${Math.floor(y / R)},${Math.floor(z / R)}`;
    for (const i of ids) { const k = key(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); (grid.get(k) || grid.set(k, []).get(k)).push(i); }
    const out = new Float32Array(ids.length * 3);
    ids.forEach((i, n) => {
      const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], cx = Math.floor(x / R), cy = Math.floor(y / R), cz = Math.floor(z / R);
      let sx = 0, sy = 0, sz = 0, nx = 0, ny = 0, nz = 0, sw = 0;
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
        const cell = grid.get(`${cx + a},${cy + b},${cz + c}`); if (!cell) continue;
        for (const j of cell) {
          const dx = pos[j * 3] - x, dy = pos[j * 3 + 1] - y, dz = pos[j * 3 + 2] - z, d2 = dx * dx + dy * dy + dz * dz;
          if (d2 > R * R) continue;
          const g = Math.exp(-d2 * inv) * area[j];
          sx += pos[j * 3] * g; sy += pos[j * 3 + 1] * g; sz += pos[j * 3 + 2] * g;
          nx += Nn[j * 3] * g; ny += Nn[j * 3 + 1] * g; nz += Nn[j * 3 + 2] * g; sw += g;
        }
      }
      const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      let d = ((sx / sw - x) * nx + (sy / sw - y) * ny + (sz / sw - z) * nz) * w[i];
      if (outOnly && d < 0) d = 0;                                     // (filling pits only)
      out[n * 3] = x + nx * d; out[n * 3 + 1] = y + ny * d; out[n * 3 + 2] = z + nz * d;
    });
    ids.forEach((i, n) => pos.set(out.subarray(n * 3, n * 3 + 3), i * 3));
  }
}

// ── cloth hangs: it is carried down from the high points and bridges the hollows ──
// Around the torso (cylinder coordinates about its axis), the fabric's radius at each
// height is at least what it was above it, tapering gently (a top falls from the bust
// and shoulder blades instead of following the waist in), and at least its neighbours'
// round the torso (it spans hollows rather than dipping into them). Only ever pushed
// outward. w(i) = how much vertex i is torso (1) rather than sleeve (0).
function hang(P, S, w, { NT = 48, NY = 36, fall = 0.975, top = Infinity, band = 0.15, maxPush = 0.03, hem = -Infinity, hemBand = 0.06 } = {}) {
  // only below the armpits: above them the top follows the shoulders (hanging from the shoulder
  // ring pushed the whole sweater out to shoulder width)
  const ids = [...new Set(S.T)].filter(i => w(i) > 0.05 && P[i * 3 + 1] < top);
  if (!ids.length) return P;
  let y0 = 1e9, y1 = -1e9;
  for (const i of ids) { y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]); }
  // each row's axis is the middle of its extent, smoothed between rows — NOT the mean of its
  // vertices: a densely meshed spot (the navel) dragged the mean forward, and since the radii
  // falling from above were measured round a different centre, the front bulged out there
  const cx = new Float32Array(NY), cz = new Float32Array(NY), lo = new Float32Array(NY * 2).fill(1e9), hi = new Float32Array(NY * 2).fill(-1e9);
  const row = (y) => Math.min(NY - 1, Math.max(0, Math.floor((y - y0) / (y1 - y0 + 1e-6) * NY)));
  for (const i of ids) {
    if (w(i) < 0.7) continue; const r = row(P[i * 3 + 1]);
    lo[r * 2] = Math.min(lo[r * 2], P[i * 3]); hi[r * 2] = Math.max(hi[r * 2], P[i * 3]); lo[r * 2 + 1] = Math.min(lo[r * 2 + 1], P[i * 3 + 2]); hi[r * 2 + 1] = Math.max(hi[r * 2 + 1], P[i * 3 + 2]);
  }
  for (let r = 0; r < NY; r++) { if (hi[r * 2] > -1e9) { cx[r] = (lo[r * 2] + hi[r * 2]) / 2; cz[r] = (lo[r * 2 + 1] + hi[r * 2 + 1]) / 2; } else if (r) { cx[r] = cx[r - 1]; cz[r] = cz[r - 1]; } }
  for (let pass = 0; pass < 4; pass++) for (const C of [cx, cz]) { const s = C.slice(); for (let r = 1; r < NY - 1; r++) C[r] = (s[r - 1] + 2 * s[r] + s[r + 1]) / 4; }
  const col = (x, z, r) => ((Math.floor((Math.atan2(x - cx[r], z - cz[r]) / Math.PI + 1) / 2 * NT) % NT) + NT) % NT;
  const env = new Float32Array(NT * NY);
  for (const i of ids) {                                                                     // measured on the torso only (sleeves hang beside it)
    if (w(i) < 0.7) continue;
    const r = row(P[i * 3 + 1]), x = P[i * 3], z = P[i * 3 + 2], c = col(x, z, r);
    env[r * NT + c] = Math.max(env[r * NT + c], Math.hypot(x - cx[r], z - cz[r]));
  }
  for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++) if (!env[r * NT + c]) {          // fill gaps from neighbours round the ring
    for (let d = 1; d < NT / 2 && !env[r * NT + c]; d++) env[r * NT + c] = Math.max(env[r * NT + (c + d) % NT], env[r * NT + (c - d + NT) % NT]);
  }
  for (let r = NY - 2; r >= 0; r--) for (let c = 0; c < NT; c++) env[r * NT + c] = Math.max(env[r * NT + c], env[(r + 1) * NT + c] * fall);   // falls from above
  for (let pass = 0; pass < 3; pass++) {                                                     // spans hollows round the torso
    const src = env.slice();
    for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++) {
      let m = src[r * NT + c];
      for (const d of [-2, -1, 1, 2]) m = Math.max(m, src[r * NT + (c + d + NT) % NT] * (1 - 0.004 * Math.abs(d)));
      env[r * NT + c] = m;
    }
  }
  for (let pass = 0; pass < 8; pass++) {                                                     // then soften it, so the cloth is smooth
    const src = env.slice();
    for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++) {
      let a = 0, n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        const rr = r + dr; if (rr < 0 || rr >= NY) continue;
        a += src[rr * NT + (c + dc + NT) % NT]; n++;
      }
      env[r * NT + c] = a / n;
    }
  }
  // sampled smoothly between rows and columns (snapping to a cell made the cloth stepped and lumpy)
  const fr = (y) => THREE.MathUtils.clamp((y - y0) / (y1 - y0 + 1e-6) * NY - 0.5, 0, NY - 1);
  const lerpRow = (A, f) => { const r = Math.floor(f), t = f - r; return A[r] + ((A[Math.min(NY - 1, r + 1)] ?? A[r]) - A[r]) * t; };
  for (const i of ids) {
    const f = fr(P[i * 3 + 1]), x0 = lerpRow(cx, f), z0 = lerpRow(cz, f), x = P[i * 3], z = P[i * 3 + 2], dx = x - x0, dz = z - z0, cur = Math.hypot(dx, dz);
    const fc = ((Math.atan2(dx, dz) / Math.PI + 1) / 2 * NT - 0.5 + NT) % NT, c0 = Math.floor(fc), tc = fc - c0, r0 = Math.floor(f), tr = f - r0, r1 = Math.min(NY - 1, r0 + 1);
    const g = (r, c) => env[r * NT + ((c % NT) + NT) % NT];
    // fades in over a band below the armpits: switching on at a line left a crease (two points
    // and a shelf) right across the bust
    // (and fades out just above the hem, which stays put — pushed out above a fixed hem it flared)
    const fade = (1 - THREE.MathUtils.smoothstep(P[i * 3 + 1], top - band, top)) * THREE.MathUtils.smoothstep(P[i * 3 + 1], hem, hem + hemBand);
    const want = (g(r0, c0) * (1 - tc) + g(r0, c0 + 1) * tc) * (1 - tr) + (g(r1, c0) * (1 - tc) + g(r1, c0 + 1) * tc) * tr, k = w(i) * fade;
    if (want > cur && cur > 1e-6) { const s = 1 + (Math.min(want, cur + maxPush) / cur - 1) * k; P[i * 3] = x0 + dx * s; P[i * 3 + 2] = z0 + dz * s; }
  }
  smoothSurface(P, S.T, 4);
  return P;
}

// ── a skirt is the smooth outer envelope of the hips and legs, falling straight down ──
// Measured on the dense body mesh (arms left out: the hands hang at hip height), in
// cylinder coordinates round each row's axis: per height and angle, the furthest the body
// reaches, carried down from above (a skirt falls from the widest point of hips and seat),
// bridged across the cleft between the buttocks, blurred smooth. Every skirt vertex below
// the waistband is then put ON that envelope, a little off it. (Pushing the sparse skirt
// helper out toward an envelope it sampled itself left lumps, a shelf under the seat, and
// a bulge at the hem.)
function skirtShape(P, S, body, k) {
  const { A, pos, joints: J } = body, H = body.P.stature, NT = 64, NY = 40;
  const arms = regionWeight(A, 'shoulder01.L'), arms2 = regionWeight(A, 'shoulder01.R');
  const sIds = [...new Set(S.T)];
  let y0 = 1e9, y1 = -1e9; for (const i of sIds) { y0 = Math.min(y0, P[i * 3 + 1]); y1 = Math.max(y1, P[i * 3 + 1]); }
  const row = (y) => Math.min(NY - 1, Math.max(0, Math.floor((y1 - y) / (y1 - y0 + 1e-6) * NY)));     // 0 = top
  const bIds = [...new Set(A.tris.body)].filter(i => arms[i] + arms2[i] < 0.3 && pos[i * 3 + 1] >= y0 - 0.02 * H && pos[i * 3 + 1] <= y1 + 0.02 * H);
  // each row's axis: the middle of the body's extent there, smoothed between rows
  const lo = new Float32Array(NY * 2).fill(1e9), hi = new Float32Array(NY * 2).fill(-1e9), cx = new Float32Array(NY), cz = new Float32Array(NY);
  for (const i of bIds) { const r = row(pos[i * 3 + 1]); for (const [a, o] of [[0, 0], [1, 2]]) { lo[r * 2 + a] = Math.min(lo[r * 2 + a], pos[i * 3 + o]); hi[r * 2 + a] = Math.max(hi[r * 2 + a], pos[i * 3 + o]); } }
  for (let r = 0; r < NY; r++) { if (hi[r * 2] > -1e9) { cx[r] = (lo[r * 2] + hi[r * 2]) / 2; cz[r] = (lo[r * 2 + 1] + hi[r * 2 + 1]) / 2; } else if (r) { cx[r] = cx[r - 1]; cz[r] = cz[r - 1]; } }
  for (let pass = 0; pass < 6; pass++) for (const C of [cx, cz]) { const t = C.slice(); for (let r = 1; r < NY - 1; r++) C[r] = (t[r - 1] + 2 * t[r] + t[r + 1]) / 4; }
  const col = (x, z, r) => ((Math.floor((Math.atan2(x - cx[r], z - cz[r]) / Math.PI + 1) / 2 * NT) % NT) + NT) % NT;
  const env = new Float32Array(NT * NY);
  for (const i of bIds) { const r = row(pos[i * 3 + 1]), x = pos[i * 3], z = pos[i * 3 + 2], c = col(x, z, r); env[r * NT + c] = Math.max(env[r * NT + c], Math.hypot(x - cx[r], z - cz[r])); }
  for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++) if (!env[r * NT + c]) {                  // empty cells: the nearest filled ones round the ring
    for (let d = 1; d < NT / 2; d++) { const a = env[r * NT + (c + d) % NT], b = env[r * NT + (c - d + NT) % NT]; if (a || b) { env[r * NT + c] = a && b ? (a + b) / 2 : a || b; break; } }
  }
  { const t = env.slice(); for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++)                // bridged across the cleft (a small reach only)
    env[r * NT + c] = Math.max(t[r * NT + c], Math.min(t[r * NT + (c + 1) % NT], t[r * NT + (c + NT - 1) % NT])); }
  for (let r = 1; r < NY; r++) for (let c = 0; c < NT; c++) env[r * NT + c] = Math.max(env[r * NT + c], env[(r - 1) * NT + c] * 0.996);   // falls from above
  for (let pass = 0; pass < 6; pass++) {
    const t = env.slice();
    for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++) {
      let a = 0, n = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr; if (rr < 0 || rr >= NY) continue; a += t[rr * NT + (c + dc + NT) % NT]; n++; }
      env[r * NT + c] = Math.max(t[r * NT + c] * 0.985, a / n);                                    // (smoothing never pulls it far back in)
    }
  }
  const fr = (y) => THREE.MathUtils.clamp((y1 - y) / (y1 - y0 + 1e-6) * NY - 0.5, 0, NY - 1);
  const lerpRow = (C, f) => { const r = Math.floor(f), t = f - r; return C[r] + (C[Math.min(NY - 1, r + 1)] - C[r]) * t; };
  const band = J['upperleg01.L'].head.y + 0.02 * H, off = 0.014 * k;
  for (const i of sIds) {
    const y = P[i * 3 + 1], f = fr(y), x0 = lerpRow(cx, f), z0 = lerpRow(cz, f), dx = P[i * 3] - x0, dz = P[i * 3 + 2] - z0, cur = Math.hypot(dx, dz);
    if (cur < 1e-6) continue;
    const fc = ((Math.atan2(dx, dz) / Math.PI + 1) / 2 * NT - 0.5 + NT) % NT, c0 = Math.floor(fc), tc = fc - c0, r0 = Math.floor(f), tr = f - r0, r1 = Math.min(NY - 1, r0 + 1);
    const g = (r, c) => env[r * NT + ((c % NT) + NT) % NT];
    const want = (g(r0, c0) * (1 - tc) + g(r0, c0 + 1) * tc) * (1 - tr) + (g(r1, c0) * (1 - tc) + g(r1, c0 + 1) * tc) * tr + off;
    const t = 1 - THREE.MathUtils.smoothstep(y, band - 0.06 * H, band);                           // the waistband stays as fitted
    const s = 1 + (Math.max(want, cur) / cur - 1) * t;
    P[i * 3] = x0 + dx * s; P[i * 3 + 2] = z0 + dz * s;
  }
  smoothSurface(P, S.T, 6);
}

// ── baggy trousers: each leg falls straight from the widest part of the thigh ──
// Per leg, per height and angle round that leg's own axis: the furthest the leg reaches,
// carried down (a wide leg doesn't follow the knee and calf back in), never narrower than
// a wide hem, blurred smooth; below the crotch every trouser vertex is put on it. The two
// legs never cross the middle.
function legHang(P, S, body, k, { minR: mR = 0.075, fall = 0.997, round = 0.88 } = {}) {
  const J = body.joints, H = body.P.stature, NT = 40, NY = 36;
  const ids = [...new Set(S.T)], crotch = J['upperleg01.L'].head.y - 0.045 * H;
  let y0 = 1e9; for (const i of ids) y0 = Math.min(y0, P[i * 3 + 1]);
  const y1 = crotch + 0.03 * H, minR = mR * k, off = 0.006 * k;
  for (const side of [1, -1]) {
    const mine = ids.filter(i => P[i * 3] * side > 0 && P[i * 3 + 1] < y1);
    const row = (y) => Math.min(NY - 1, Math.max(0, Math.floor((y1 - y) / (y1 - y0 + 1e-6) * NY)));
    const lo = new Float32Array(NY * 2).fill(1e9), hi = new Float32Array(NY * 2).fill(-1e9), cx = new Float32Array(NY), cz = new Float32Array(NY);
    for (const i of mine) { const r = row(P[i * 3 + 1]); for (const [a, o] of [[0, 0], [1, 2]]) { lo[r * 2 + a] = Math.min(lo[r * 2 + a], P[i * 3 + o]); hi[r * 2 + a] = Math.max(hi[r * 2 + a], P[i * 3 + o]); } }
    for (let r = 0; r < NY; r++) { if (hi[r * 2] > -1e9) { cx[r] = (lo[r * 2] + hi[r * 2]) / 2; cz[r] = (lo[r * 2 + 1] + hi[r * 2 + 1]) / 2; } else if (r) { cx[r] = cx[r - 1]; cz[r] = cz[r - 1]; } }
    // the leg's axis falls straight too (a wide leg hangs plumb from the hip, it doesn't follow the knee in)
    for (let r = 1; r < NY; r++) { cx[r] = cx[r] * 0.35 + cx[r - 1] * 0.65; cz[r] = cz[r] * 0.35 + cz[r - 1] * 0.65; }
    const col = (x, z, r) => ((Math.floor((Math.atan2(x - cx[r], z - cz[r]) / Math.PI + 1) / 2 * NT) % NT) + NT) % NT;
    const env = new Float32Array(NT * NY);
    for (const i of mine) { const r = row(P[i * 3 + 1]), c = col(P[i * 3], P[i * 3 + 2], r); env[r * NT + c] = Math.max(env[r * NT + c], Math.hypot(P[i * 3] - cx[r], P[i * 3 + 2] - cz[r])); }
    for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++) if (!env[r * NT + c])
      for (let d = 1; d < NT / 2; d++) { const a = env[r * NT + (c + d) % NT], b = env[r * NT + (c - d + NT) % NT]; if (a || b) { env[r * NT + c] = a && b ? (a + b) / 2 : a || b; break; } }
    for (let r = 0; r < NY; r++) { let m = 0; for (let c = 0; c < NT; c++) m = Math.max(m, env[r * NT + c]); for (let c = 0; c < NT; c++) env[r * NT + c] = Math.max(env[r * NT + c], m * round); }   // round, not the leg's own section
    for (let r = 1; r < NY; r++) for (let c = 0; c < NT; c++) env[r * NT + c] = Math.max(env[r * NT + c], env[(r - 1) * NT + c] * fall, minR);
    for (let pass = 0; pass < 6; pass++) {
      const t = env.slice();
      for (let r = 0; r < NY; r++) for (let c = 0; c < NT; c++) {
        let a = 0, n = 0;
        for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) { const rr = r + dr; if (rr < 0 || rr >= NY) continue; a += t[rr * NT + (c + dc + NT) % NT]; n++; }
        env[r * NT + c] = Math.max(t[r * NT + c] * 0.985, a / n);
      }
    }
    const fr = (y) => THREE.MathUtils.clamp((y1 - y) / (y1 - y0 + 1e-6) * NY - 0.5, 0, NY - 1);
    const lerpRow = (C, f) => { const r = Math.floor(f), t = f - r; return C[r] + (C[Math.min(NY - 1, r + 1)] - C[r]) * t; };
    for (const i of mine) {
      const y = P[i * 3 + 1], f = fr(y), x0 = lerpRow(cx, f), z0 = lerpRow(cz, f), dx = P[i * 3] - x0, dz = P[i * 3 + 2] - z0, cur = Math.hypot(dx, dz);
      if (cur < 1e-6) continue;
      const fc = ((Math.atan2(dx, dz) / Math.PI + 1) / 2 * NT - 0.5 + NT) % NT, c0 = Math.floor(fc), tc = fc - c0, r0 = Math.floor(f), tr = f - r0, r1 = Math.min(NY - 1, r0 + 1);
      const g = (r, c) => env[r * NT + ((c % NT) + NT) % NT];
      const want = (g(r0, c0) * (1 - tc) + g(r0, c0 + 1) * tc) * (1 - tr) + (g(r1, c0) * (1 - tc) + g(r1, c0 + 1) * tc) * tr + off;
      const t = 1 - THREE.MathUtils.smoothstep(y, crotch - 0.03 * H, y1);              // the seat and hips stay as fitted
      const sc = 1 + (Math.max(want, cur) / cur - 1) * t;
      let nx = x0 + dx * sc; if (nx * side < 0.006 * k) nx = side * 0.006 * k;           // never across the middle
      P[i * 3] = nx; P[i * 3 + 2] = z0 + dz * sc;
    }
  }
  smoothSurface(P, S.T, 4);
}

// ── dressing ──
// Clothes are the body surface cut along smooth fields — the rig's own weight falloffs
// (neck, wrist, mid upper arm, knee, mid thigh, foot) and heights (hems) — so every
// edge is a clean curve, and skin is ONLY what the chosen clothes leave uncovered
// (face and neck, hands, plus forearms under short sleeves and lower legs under shorts
// or a skirt), overlapping a little under each edge. Every option covers the torso and
// hips: short sleeves end mid upper arm, shorts just above the knee, and a skirt always
// has shorts under it. People are always clothed.
export const TOPS = { sweater: 'Sweater', sweatshirt: 'Sweatshirt', tee: 'T-shirt', turtleneck: 'Turtleneck' };
// (a skirt still works as bottomType: 'skirt', but isn't offered while it can't move well)
export const BOTTOMS = { trousers: 'Trousers', baggy: 'Baggy trousers', shorts: 'Shorts' };
// how loose each top is: ease off the body (torso, sleeves), how far it hangs out from the
// chest, cloth thickness, and its hem (above the hip joint, × stature)
const TOP_FIT = {
  sweater: { ease: 0.02, sleeve: 0.005, push: 0.04, thick: 0.009, hem: 0.02 },
  sweatshirt: { ease: 0.034, sleeve: 0.012, push: 0.06, thick: 0.013, hem: -0.005 },
  tee: { ease: 0.018, sleeve: 0.005, push: 0.035, thick: 0.007, hem: 0.025 },
  turtleneck: { ease: 0.014, sleeve: 0.004, push: 0.03, thick: 0.008, hem: 0.02 },
};
function dress(body, N, look) {
  const { A } = body, R = (b) => regionWeight(A, b), J = body.joints, H = body.P.stature;
  const both = (b) => { const l = R(b + '.L'), r = R(b + '.R'); return l.map((v, i) => v + r[i]); };
  const S = surface(body, N);
  S.f = { neck: Array.from(R('neck01')), neck2: Array.from(R('neck02')), hands: Array.from(both('wrist')), feet: Array.from(both('foot')),
    arms: Array.from(both('shoulder01')), ua2: Array.from(both('upperarm02')), shin: Array.from(both('lowerleg01')), ul2: Array.from(both('upperleg02')) };
  const y = (i, s) => s.P[i * 3 + 1], top = look.topType ?? 'sweater', bottom = look.bottomType ?? 'trousers';
  const hemY = J['upperleg01.L'].head.y + (look.hem ?? TOP_FIT[top]?.hem ?? 0.02) * H, waistY = hemY + 0.08 * H, kneeY = J['lowerleg01.L'].head.y;
  // sleeves end on a plane across the arm (mid upper arm for a T-shirt, just short of the wrist for
  // long sleeves), not on a weight boundary, which wandered into a ragged hem
  const tee = top === 'tee', armPlane = {};
  for (const k of ['L', 'R']) {
    const a = J[(tee ? 'upperarm01.' : 'lowerarm01.') + k].head, b = J[(tee ? 'lowerarm01.' : 'wrist.') + k].head, d = b.clone().sub(a), len = d.length();
    armPlane[k] = { a, d: d.normalize(), at: tee ? len * 0.48 : len - 0.012 * H };
  }
  const sleeve = (i, s) => {                                    // > 0 past the sleeve's end (toward the hand), on the arms only
    if (s.f.arms[i] < 0.3) return -1;
    const pl = armPlane[s.P[i * 3] > 0 ? 'L' : 'R'], dx = s.P[i * 3] - pl.a.x, dy = s.P[i * 3 + 1] - pl.a.y, dz = s.P[i * 3 + 2] - pl.a.z;
    return dx * pl.d.x + dy * pl.d.y + dz * pl.d.z - pl.at;
  };
  const out = { top, bottom };
  // the neckline is a smooth tilted line round the neck (lower at the front, like a real collar),
  // not the neck bone's weight boundary: that zig-zags across the mesh at the base of the neck,
  // and both the collar and the skin under it came out sawtoothed, with dark gaps between
  const Jn = J.neck01.head, turtle = top === 'turtleneck';
  // (a crew neck dips only a little at the front: at a steeper 0.6 the bare skin ran down onto the chest and the
  // neck read as flaring into a wedge at its base, side-on)
  const lineY = (z) => Jn.y + (turtle ? 0.035 : 0.004) * H - (turtle ? 0.15 : 0.3) * Math.max(0, z - Jn.z);
  const near = (i, s) => s.f.neck[i] - 0.03;                            // only round the neck (the neck and head's own weight)
  const above = (i, s) => s.P[i * 3 + 1] - lineY(s.P[i * 3 + 2]);
  out.face = cut(copySurface(S), (i, s) => Math.min(above(i, s) + 0.012 * H, near(i, s)));
  out.neckline = lineY;
  out.hands = cut(copySurface(S), (i, s) => sleeve(i, s) + 0.015 * H);                   // hands — and forearms under short sleeves (tucked a little under the cuff)
  out.top = cut(cut(cut(copySurface(S), (i, s) => Math.max(-above(i, s), -near(i, s))), (i, s) => -sleeve(i, s)),
    (i, s) => s.f.arms[i] > 0.5 ? 1 : y(i, s) - hemY);
  const legEnd = bottom === 'trousers' || bottom === 'baggy' ? (i, s) => 0.45 - s.f.feet[i]   // to the ankle
    : bottom === 'shorts' ? (i, s) => y(i, s) - (kneeY + 0.045 * H)                      // to just above the knee (a level hem: the knee's weight field wandered)
    : (i, s) => 0.5 - s.f.ul2[i];                                                         // under a skirt: to mid thigh
  out.bottom = cut(cut(cut(copySurface(S), (i, s) => 0.5 - s.f.arms[i]), (i, s) => waistY - y(i, s)), legEnd);
  out.top.type = top; out.bottom.type = bottom;
  if (bottom !== 'trousers') {                                                            // bare legs below, never the feet (shoes)
    const from = bottom === 'shorts' ? (i, s) => kneeY + 0.06 * H - y(i, s) : (i, s) => s.f.ul2[i] - 0.3;
    out.legs = cut(cut(copySurface(S), from), (i, s) => 0.6 - s.f.feet[i]);
  }
  if (bottom === 'skirt') {                                                               // MakeHuman's fitted skirt surface, cut at the knee
    const tris = A.tris['helper-skirt'], Ns = vertexNormals(Float32Array.from(body.pos), tris), kneeY = J['lowerleg01.L'].head.y;
    // its waistband is tucked a little way up under the top's hem (worn over it, the top's hang poked through it)
    out.skirt = cut(cut(surface(body, Ns, tris), (i, s) => y(i, s) - (kneeY + 0.01 * H)), (i, s) => hemY + 0.025 * H - y(i, s));
  }
  return out;
}
// ── the head as a radius map around its centre, for hair and brows ──
function headMap(body) {
  const { A, pos } = body, w = regionWeight(A, 'head');
  const lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = lo.clone().negate(), p = new THREE.Vector3();
  const ids = [...new Set(A.tris.body)].filter(i => w[i] > 0.9);
  for (const i of ids) { p.fromArray(pos, i * 3); lo.min(p); hi.max(p); }
  const C = lo.clone().add(hi).multiplyScalar(0.5); C.y += (hi.y - lo.y) * 0.08;   // the cranium's centre sits above the bbox middle
  const NA = 72, NE = 48, grid = new Float32Array(NA * NE);
  const cell = (d) => {
    const a = Math.floor((Math.atan2(d.x, d.z) / Math.PI + 1) / 2 * NA) % NA;
    const e = Math.min(NE - 1, Math.floor((Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) / Math.PI + 0.5) * NE));
    return e * NA + a;
  };
  // the map covers the neck too: below the skull it had no data and was filled in from the back of
  // the skull, so short hair at the nape stood out at skull width over the neck (a bowl cut)
  const wn = regionWeight(A, 'neck01'), mapIds = [...new Set(A.tris.body)].filter(i => w[i] > 0.9 || (wn[i] > 0.6 && pos[i * 3 + 1] < C.y));
  for (const i of mapIds) { p.fromArray(pos, i * 3).sub(C); const r = p.length(); const c = cell(p.normalize()); grid[c] = Math.max(grid[c], r); }
  for (let pass = 0; pass < 12; pass++) for (let e = 0; e < NE; e++) for (let a = 0; a < NA; a++) {
    if (grid[e * NA + a]) continue;
    let s = 0, n = 0;
    for (const [de, da] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ee = e + de, aa = (a + da + NA) % NA; if (ee < 0 || ee >= NE) continue;
      if (grid[ee * NA + aa]) { s += grid[ee * NA + aa]; n++; }
    }
    if (n) grid[e * NA + a] = s / n;
  }
  const raw = Float32Array.from(grid);                // (before any smoothing: for the never-inside bound below)
  // near the top the map's cells shrink to slivers and their radii are noisy round the pole: hair
  // grown on them got ridges all running into the crown. The top rows are evened out round the head.
  for (let e = NE - 8; e < NE; e++) {
    let m = 0, c = 0; for (let a = 0; a < NA; a++) if (grid[e * NA + a]) { m += grid[e * NA + a]; c++; }
    if (!c) continue; m /= c; const k = THREE.MathUtils.smoothstep(e, NE - 8, NE - 2);
    for (let a = 0; a < NA; a++) grid[e * NA + a] = grid[e * NA + a] ? grid[e * NA + a] * (1 - k) + m * k : m;
  }
  for (let pass = 0; pass < 3; pass++) for (let e = NE - 10; e < NE; e++) {        // and smoothed round each row
    const row = grid.slice(e * NA, e * NA + NA);
    for (let a = 0; a < NA; a++) grid[e * NA + a] = (row[(a + NA - 1) % NA] + 2 * row[a] + row[(a + 1) % NA]) / 4;
  }
  // hair doesn't follow the ears or the nose: a blurred copy of the map for it to grow from
  const soft = Float32Array.from(grid);
  for (let pass = 0; pass < 3; pass++) {
    const src = Float32Array.from(soft);
    for (let e = 1; e < NE - 1; e++) for (let a = 0; a < NA; a++) {
      let m = src[e * NA + a];
      for (const [de, da] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]]) m = Math.max(m, src[(e + de) * NA + (a + da + NA) % NA] * 0.985);
      soft[e * NA + a] = 0.5 * src[e * NA + a] + 0.5 * m;
    }
  }
  const bilerp = (G, d) => {
    const fa = ((Math.atan2(d.x, d.z) / Math.PI + 1) / 2 * NA) - 0.5, fe = (Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) / Math.PI + 0.5) * NE - 0.5;
    const a0 = Math.floor(fa), e0 = THREE.MathUtils.clamp(Math.floor(fe), 0, NE - 2), ta = fa - a0, te = THREE.MathUtils.clamp(fe - e0, 0, 1);
    const g = (e, a) => G[e * NA + ((a % NA) + NA) % NA];
    return (g(e0, a0) * (1 - ta) + g(e0, a0 + 1) * ta) * (1 - te) + (g(e0 + 1, a0) * (1 - ta) + g(e0 + 1, a0 + 1) * ta) * te;
  };
  const radius = (d) => bilerp(grid, d), scalp = (d) => bilerp(soft, d);
  // the most the head reaches near a direction: the highest of the raw cells round it (blending
  // between cells passed under a bump of the skull, and the scalp poked through short hair)
  const reach = (d) => {
    const fa = ((Math.atan2(d.x, d.z) / Math.PI + 1) / 2 * NA) - 0.5, fe = (Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) / Math.PI + 0.5) * NE - 0.5;
    const a0 = Math.floor(fa), e0 = THREE.MathUtils.clamp(Math.floor(fe), 0, NE - 2); let m = 0;
    for (let de = -1; de <= 2; de++) for (let da = -1; da <= 2; da++) { const e = THREE.MathUtils.clamp(e0 + de, 0, NE - 1); m = Math.max(m, raw[e * NA + (((a0 + da) % NA) + NA) % NA]); }
    return m;
  };
  const Rside = (radius(new THREE.Vector3(1, 0, 0)) + radius(new THREE.Vector3(-1, 0, 0))) / 2;
  // where the hairline belongs, measured from the face: a quarter of the brow-to-chin height above
  // the brows. (Real average proportions, the face in thirds, put it near half, and on a drawn
  // character that read as a huge forehead; a fixed elevation per style ignored the face.)
  // Found as the elevation where the scalp at the front reaches that height.
  const [el, er] = eyeCentres(body), browY = (el.y + er.y) / 2 + 0.27 * el.distanceTo(er), { chin } = headHeight(body);
  const hairY = browY + 0.16 * (browY - chin);   // (a quarter read as a high, receding hairline)
  let lo2 = -0.2, hi2 = 0.999;
  for (let it = 0; it < 30; it++) { const e = (lo2 + hi2) / 2, d = new THREE.Vector3(0, e, Math.sqrt(1 - e * e)); if (C.y + d.y * scalp(d) < hairY) lo2 = e; else hi2 = e; }
  return { C, radius, scalp, reach, R: Rside, hairlineE: (lo2 + hi2) / 2 };
}

// eyes: an eyeball the size and place of the anatomical one (a smooth sphere so the
// iris edge is crisp), painted: sclera, iris, pupil, a catchlight. A real iris is
// ≈11.5 mm across a 24 mm eye (≈29° from the axis), the pupil ≈3–4 mm; the
// storybook style opens the iris up.
function eyes(body, look) {
  const out = new THREE.Group(), cs = eyeCentres(body), big = !!body.style.exaggerated;
  const irisCos = big ? 0.83 : 0.875, pupilCos = big ? 0.95 : 0.97;
  const iris = new THREE.Color(look.eyes), dark = new THREE.Color(0x1d1416), white = new THREE.Color(0xf6f1ea);
  ['helper-l-eye', 'helper-r-eye'].forEach((gname, side) => {
    const c = cs[side], vs = [...new Set(body.A.tris[gname])], p = new THREE.Vector3();
    let rad = 0; for (const v of vs) rad += p.fromArray(body.pos, v * 3).distanceTo(c); rad /= vs.length;
    // its pole looks forward, so the iris and pupil are rings of the mesh: clean circles (with the
    // pole up, the iris edge crossed the rows and came out blocky)
    const g = new THREE.SphereGeometry(rad, 48, 40).rotateX(Math.PI / 2), P = g.attributes.position, col = new Float32Array(P.count * 3), k = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      const f = p.fromBufferAttribute(P, i).normalize().z;
      // iris: its own colour, a dark limbal ring at the rim (what makes an eye read as an eye), a little deeper by the pupil
      const t = (f - irisCos) / (pupilCos - irisCos);
      k.copy(f > pupilCos ? dark : f > irisCos ? iris.clone().lerp(dark, 0.55 * (1 - THREE.MathUtils.smoothstep(t, 0, 0.18)) + 0.2 * THREE.MathUtils.smoothstep(t, 0.7, 1)) : white);
      col.set([k.r, k.g, k.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, paint(0xffffff, { vertexColors: true, hatch: 0 })); m.position.copy(c); m.userData.noInk = true; out.add(m);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(rad * (big ? 0.2 : 0.13), 10, 8), paint(0xffffff, { hatch: 0 }));
    glint.position.copy(c).add(new THREE.Vector3(-rad * 0.17, rad * 0.17, rad * 0.98));   // inside the iris, upper left glint.userData.noInk = true; out.add(glint);
  });
  return out;
}

// brows: a tapered stroke laid on the brow ridge above each eye
function brows(body, H, look) {
  // a young child's brows are fine, fair and set a little higher (heavy ones low over the eyes made every child frown)
  const young = 1 - THREE.MathUtils.smoothstep(body.P.age ?? 25, 3, 14);
  const out = new THREE.Group(), [l, r] = eyeCentres(body), E = l.distanceTo(r), mat = paint(new THREE.Color(look.brows).lerp(new THREE.Color(look.skin), 0.45 * young).getHex(), { hatch: 0 });
  for (const c of [l, r]) {
    const s = Math.sign(c.x), pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, p = c.clone().add(new THREE.Vector3(s * E * (-0.28 + 0.62 * t), E * (0.27 + 0.05 * young + 0.07 * Math.sin(Math.PI * t * 0.9) - 0.05 * t), 0));   // on the brow ridge, not up on the forehead
      const d = p.clone().sub(H.C).normalize();
      pts.push(d.multiplyScalar(H.radius(d) * 1.012).add(H.C));
    }
    const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, 24, E * (0.036 - 0.012 * young), 6);
    const P = g.attributes.position, q = new THREE.Vector3(), cc = new THREE.Vector3();
    for (let i = 0; i < P.count; i++) {                    // taper: full at the inner end, fine at the tail
      const t = Math.floor(i / 7) / 24; curve.getPointAt(Math.min(1, t), cc);
      q.fromBufferAttribute(P, i).sub(cc).multiplyScalar(1 - 0.6 * t).add(cc); P.setXYZ(i, q.x, q.y, q.z);
    }
    const m = new THREE.Mesh(g, mat); m.userData.noInk = true; out.add(m);
  }
  return out;
}

// skin colour, with lips and (in the storybook style) a little blush
function skinColours(body, look) {
  const { A, pos } = body, col = new Float32Array(A.n * 3), base = new THREE.Color(look.skin);
  const [l, r] = eyeCentres(body), eyeY = (l.y + r.y) / 2, E = l.distanceTo(r), { chin } = headHeight(body);
  const mouth = new THREE.Vector3(0, chin + 0.36 * (eyeY - chin), Math.max(l.z, r.z));
  const lips = new THREE.Color(look.lips), blush = new THREE.Color(look.blush), c = new THREE.Color(), p = new THREE.Vector3();
  for (let i = 0; i < A.n; i++) {
    p.fromArray(pos, i * 3); c.copy(base);
    if (p.z > mouth.z - E * 0.5) {
      const m = Math.hypot((p.x - mouth.x) / (E * 0.42), (p.y - mouth.y) / (E * 0.13));
      c.lerp(lips, 0.7 * (1 - THREE.MathUtils.smoothstep(m, 0.6, 1)));
      if (body.style.soften) for (const e of [l, r]) {       // a painted style gets a little blush
        const b = Math.hypot((p.x - e.x * 1.15) / (E * 0.3), (p.y - (e.y - E * 0.55)) / (E * 0.2));
        c.lerp(blush, 0.4 * (1 - THREE.MathUtils.smoothstep(b, 0.3, 1)));
      }
    }
    col.set([c.r, c.g, c.b], i * 3);
  }
  return col;
}

// shoes: the town's S-profile sneaker, fitted to this foot and riding the foot bone
function shoes(body, look, sk) {
  const { A, pos, joints: J } = body, out = [];
  const { upper, sole } = shoeGeo();
  for (const k of ['L', 'R']) {
    const w = regionWeight(A, 'foot.' + k), lo = new THREE.Vector3(1e9, 1e9, 1e9), hi = lo.clone().negate(), p = new THREE.Vector3();
    for (let i = 0; i < A.n; i++) if (w[i] > 0.6) { p.fromArray(pos, i * 3); lo.min(p); hi.max(p); }
    upper.computeBoundingBox(); sole.computeBoundingBox();
    const bb = upper.boundingBox.clone().union(sole.boundingBox), size = bb.getSize(new THREE.Vector3());
    const footLen = hi.z - lo.z, footW = hi.x - lo.x, sL = footLen * 1.1 / size.z, sW = footW * 1.18 / size.x;
    const g = new THREE.Group();
    for (const [geo, c] of [[upper, look.shoes], [sole, look.sole]]) g.add(new THREE.Mesh(geo, paint(c)));
    g.scale.set(sW, sL, sL);
    // heel at the back of the foot, sole on the floor, centred under the foot
    g.position.set((lo.x + hi.x) / 2 - (bb.min.x + bb.max.x) / 2 * sW, lo.y - bb.min.y * sL, lo.z - footLen * 0.04 - bb.min.z * sL);
    const atFoot = new THREE.Group(); atFoot.position.copy(J['foot.' + k].head).negate(); atFoot.add(g);
    sk.byName['foot.' + k].add(atFoot);
    out.push(g);
  }
  return out;
}

// the upper arm hangs just clear of the torso, a small gap at the waist: angled by this person's own
// width (a fixed angle pressed the arms of every wider body into its sides, elbows tucked in)
function clearSides(sk, body, tops, k) {
  const B = sk.byName, Z = new THREE.Vector3(0, 0, 1), p = new THREE.Vector3();
  for (const key of ['L', 'R']) {
    const s = key === 'L' ? 1 : -1;
    for (let it = 0; it < 4; it++) {
      sk.root.updateMatrixWorld(true);
      const sh = wp(B['upperarm01.' + key]), el = wp(B['lowerarm01.' + key]);
      let side = 0;                                               // the torso's (shirt's) outer edge at elbow height, this side
      for (const m of tops) {
        const P = m.geometry.attributes.position, W = m.geometry.attributes.skinWeight, I = m.geometry.attributes.skinIndex;
        for (let i = 0; i < P.count; i++) {
          p.fromBufferAttribute(P, i);
          if (p.x * s <= 0 || Math.abs(p.y - el.y) > 0.03 * k || Math.abs(p.z - el.z) > 0.07 * k) continue;
          let arm = 0; for (let c = 0; c < 4; c++) { const n = sk.skeleton.bones[I.getComponent(i, c)].name; if (/arm|wrist|finger|shoulder/.test(n)) arm += W.getComponent(i, c); }
          if (arm < 0.2) side = Math.max(side, p.x * s);
        }
      }
      const want = side + 0.045 * k + 0.012 * k, have = el.x * s;          // the elbow joint: arm's half-thickness plus a small gap off the side
      if (!side || have >= want - 0.002 * k) break;
      rotateBone(B['upperarm01.' + key], Z, s * Math.atan2(want - have, sh.y - el.y));
    }
  }
  sk.root.updateMatrixWorld(true);
}

// the relaxed arms swing out just far enough that the hands hang clear of what's worn at the
// hips: on wide hips or a skirt, arms hanging at a fixed angle went straight into the cloth
function clearHips(sk, meshes, k) {
  const B = sk.byName, Z = new THREE.Vector3(0, 0, 1), p = new THREE.Vector3();
  for (const key of ['L', 'R']) {
    const s = key === 'L' ? 1 : -1;
    for (let it = 0; it < 4; it++) {
      sk.root.updateMatrixWorld(true);
      const w = wp(B['wrist.' + key]), tip = wp(B['finger3-3.' + key]), sh = wp(B['upperarm01.' + key]);
      let need = 0;
      for (const m of meshes) {
        const P = m.geometry.attributes.position;
        for (let i = 0; i < P.count; i++) {
          p.fromBufferAttribute(P, i);
          if (p.x * s <= 0 || p.y > w.y + 0.03 * k || p.y < tip.y - 0.02 * k) continue;
          const t = THREE.MathUtils.clamp((w.y - p.y) / ((w.y - tip.y) || 1), 0, 1), hx = (w.x + (tip.x - w.x) * t) * s, hz = w.z + (tip.z - w.z) * t;
          if (Math.abs(p.z - hz) > 0.05 * k) continue;
          need = Math.max(need, p.x * s + 0.028 * k - hx);                 // the hand's inner side, a finger's width off the cloth
        }
      }
      if (need <= 0.002 * k) break;
      // the whole arm angles out from the shoulder, nearly straight, as on a person with wide hips,
      // with only a little from the elbow (all at the elbow made a V; the upper arm can't tuck into
      // the side any more, clearSides saw to that)
      const el = wp(B['lowerarm01.' + key]);
      rotateBone(B['upperarm01.' + key], Z, s * Math.atan2(need * 0.8, sh.y - w.y) * 1.05);
      rotateBone(B['lowerarm01.' + key], Z, s * Math.atan2(need * 0.2, el.y - w.y) * 1.05);
    }
  }
  sk.root.updateMatrixWorld(true);
}

export async function makePerson(spec = {}) {
  const look = { ...LOOK_JANELLE, ...spec };
  const A = await loadAnatomy(spec.url), age = spec.body?.age ?? 25;
  if (needsAges(age)) await loadAges(A);                 // children and older people: their shapes load on first use
  const style = STYLES[spec.style] ?? spec.style ?? STYLES.real;
  const expression = { ...look.expression }; for (const [k, v] of Object.entries(style.expression || {})) expression[k] = (expression[k] || 0) + v;
  const bodyP = { ...LOOK_JANELLE.body, ...spec.body, expression };
  const body = stylize(buildBody(A, { ...bodyP, stature: spec.stature ?? statureFor(age, bodyP.sex, bodyP.height ?? 0.5) }), style);
  // clothes are fitted to a SMOOTHED copy of the torso: that skin is never shown, and cloth
  // fitted to (and pushed back out to) the raw anatomy re-copied every small detail of it
  const fitPos = Float32Array.from(body.pos);
  { const R = (b) => regionWeight(A, b), arm = R('shoulder01.L'), arm2 = R('shoulder01.R'), nk = R('neck01');
    const ul = R('upperleg02.L'), ur = R('upperleg02.R'), ft = R('lowerleg01.L'), ft2 = R('lowerleg01.R');
    // the torso and hips (not arms, neck, lower thighs or legs) are softened before anything is fitted to them
    const wT = Float32Array.from(arm, (_, i) => Math.max(0, Math.min(1, (1 - arm[i] - arm2[i] - nk[i] - ul[i] - ur[i] - ft[i] - ft2[i]) * 1.4 - 0.2)));
    // the strong softening is for the torso only — at the hips the two legs must stay two legs
    const hipY = body.joints['upperleg01.L'].head.y, H0 = body.P.stature;
    const wUp = Float32Array.from(wT, (v, i) => v * THREE.MathUtils.smoothstep(fitPos[i * 3 + 1], hipY - 0.035 * H0, hipY + 0.005 * H0));   // down to just above the crotch
    const kS = H0 / 1.7;                                   // (sizes scale with the person: a child's torso is a third as wide)
    // …but never the bust: smoothing the chest away gave every woman a man's flat torso. The front of the
    // chest is left to the light pit-filling pass only (the top still hangs from it)
    const shY = body.joints['upperarm01.L'].head.y, cz0 = body.joints['spine03'].head.z;
    const bustW = new Float32Array(wUp.length);
    for (let i = 0; i < wUp.length; i++) {
      const y = fitPos[i * 3 + 1], z = fitPos[i * 3 + 2], x = Math.abs(fitPos[i * 3]);
      const band = THREE.MathUtils.smoothstep(y, shY - 0.17 * H0, shY - 0.13 * H0) * (1 - THREE.MathUtils.smoothstep(y, shY - 0.04 * H0, shY - 0.01 * H0));
      const front = THREE.MathUtils.smoothstep(z - cz0, 0.0, 0.04 * H0) * (1 - THREE.MathUtils.smoothstep(x, 0.1 * H0, 0.14 * H0));
      wUp[i] *= 1 - 0.9 * band * front * (1 - body.P.sex * 0.6);
      bustW[i] = band * front;
    }
    spatialSmooth(fitPos, A.tris.body, wUp, { sigma: 0.05 * kS });
    // small-scale smoothing over the bust: one soft rounded shape, never a nipple's point under the shirt
    spatialSmooth(fitPos, A.tris.body, bustW, { sigma: 0.022 * kS, rounds: 5 }); spatialSmooth(fitPos, A.tris.body, wUp, { sigma: 0.025 * kS, rounds: 6, outOnly: true });   // then fill what's left of any pit (the navel)
    smoothSurface(fitPos, A.tris.body, 8, { weight: wT }); }
  const fitBody = { ...body, pos: fitPos };
  // the smoothing flattens the navel into a knot of tiny folded triangles whose normals point
  // anywhere — and the cloth is lifted along those normals. Average them with their neighbours.
  const N = vertexNormals(Float32Array.from(fitPos), A.tris.body);
  { const T = A.tris.body, acc = new Float32Array(N.length);
    for (let pass = 0; pass < 8; pass++) {
      acc.set(N);
      for (let t = 0; t < T.length; t += 3) for (let e = 0; e < 3; e++) { const a = T[t + e], b = T[t + (e + 1) % 3]; for (let c = 0; c < 3; c++) { acc[a * 3 + c] += N[b * 3 + c]; acc[b * 3 + c] += N[a * 3 + c]; } }
      for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(acc[i], acc[i + 1], acc[i + 2]) || 1; for (let c = 0; c < 3; c++) N[i + c] = acc[i + c] / l; }
    } }
  const D = dress(fitBody, N, look), k = body.P.stature / 1.7;
  const [el, er] = eyeCentres(body), eyeR = el.distanceTo(er) * 0.3;

  const sk = buildSkeleton(body);
  const group = new THREE.Group(), rig = new THREE.Group();
  group.add(rig); rig.add(sk.root);
  const parts = [];
  const add = (geo, mat, role) => { const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; m.userData.role = role; parts.push(m); return m; };

  // skin: face & neck, and hands — nothing else of the body is ever drawn
  const skinCol = skinColours(body, look), skinParts = [];
  for (const key of ['face', 'hands', 'legs']) {
    if (!D[key]) continue;
    const geo = geometryOf(D[key]), used = geo.userData.used;
    const col = new Float32Array(used.length * 3), c = new THREE.Color(look.skin);
    used.forEach((v, i) => { if (v < A.n) col.set(skinCol.subarray(v * 3, v * 3 + 3), i * 3); else col.set([c.r, c.g, c.b], i * 3); });
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = add(geo, paint(0xffffff, { vertexColors: true, soft: true }), 'skin'); m.userData.part = key;
    skinParts.push({ m, used });
    if (key === 'face') {                                   // no outline from inside the eye sockets
      const P = geo.attributes.position, idx = geo.index.array, keep = [], p = new THREE.Vector3();
      for (let t = 0; t < idx.length; t += 3) {
        let near = false;
        for (let e = 0; e < 3; e++) { p.fromBufferAttribute(P, idx[t + e]); if (p.distanceTo(el) < eyeR || p.distanceTo(er) < eyeR) near = true; }
        if (!near) keep.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      const hull = geo.clone(); hull.setIndex(keep); m.userData.inkGeometry = hull;
    }
  }
  // garments
  const top = D.top, bot = D.bottom;
  const upperW = (i) => Math.max(0, 1 - top.f.arms[i] - top.f.neck[i]), F = TOP_FIT[D.top.type] ?? TOP_FIT.sweater;
  // the collar hugs the neck: the ease fades out over the last few centimetres (eased right up
  // to it, the collar stood off the neck with dark gaps at its corners)
  const atCollar = (i) => THREE.MathUtils.smoothstep(D.neckline(top.P[i * 3 + 2]) - top.P[i * 3 + 1], 0, 0.045 * body.P.stature);
  const sleeveW = (i) => Math.min(1, top.f.arms[i]) * (1 - THREE.MathUtils.smoothstep(top.f.hands[i], 0, 0.45));   // (not at the cuff)
  // a top hangs from the shoulders and chest rather than following every curve: generous ease and drape over the torso
  // the shirt is fitted with the arms out (the base mesh's A-pose) and skinned with the body's own
  // weights, whose shoulder falloff is sharp: as the arm came down, cloth over the joint folded into a
  // ridge and a peak at each shoulder (shoulder pads). Rigging guides smooth the weights round the
  // shoulder so the turn spreads across it; the cloth gets that, the body's skin keeps its own.
  smoothWeights(top, (i) => Math.exp(-(((top.f.arms[i] - 0.45) / 0.35) ** 2)), 14);
  // the ease is the torso's: it fades out onto the shoulder (a shirt's shoulder seam lies within a
  // centimetre of the shoulder; eased there, the sleeve cap ballooned like a shoulder pad)
  const offShoulder = (i) => 1 - THREE.MathUtils.smoothstep(top.f.arms[i], 0.04, 0.4);
  const topP = drape(top, { thick: F.thick, ease: (i) => (F.ease * upperW(i) * offShoulder(i) + F.sleeve * sleeveW(i) * (1 - offShoulder(i))) * atCollar(i), smooth: 40, k,
    smoothW: top.P.map((_, j) => j).filter(j => j % 3 === 0).map(j => 1 - 0.6 * Math.min(1, top.f.arms[j / 3])) });
  hang(topP, top, (i) => Math.min(1, Math.max(0, upperW(i) * 1.6 - 0.3)), { top: body.joints['upperarm01.L'].head.y - 0.05 * body.P.stature, band: 0.06 * body.P.stature, maxPush: F.push * k,
    hem: body.joints['upperleg01.L'].head.y + 0.02 * body.P.stature, hemBand: 0.07 * body.P.stature });
  { const Hs = body.P.stature, hipY = body.joints['upperleg01.L'].head.y, ay = body.joints['upperarm01.L'].head.y;
    const wT = Float32Array.from({ length: top.P.length / 3 }, (_, i) => upperW(i) * THREE.MathUtils.smoothstep(top.P[i * 3 + 1], hipY - 0.01 * Hs, hipY + 0.05 * Hs) * (1 - THREE.MathUtils.smoothstep(top.P[i * 3 + 1], ay - 0.12 * Hs, ay - 0.04 * Hs)));
    const Tt = Uint32Array.from(top.T);
    spatialSmooth(topP, Tt, wT, { sigma: 0.05 * k, rounds: 4 });
    spatialSmooth(topP, Tt, wT, { sigma: 0.03 * k, rounds: 6, outOnly: true }); }
  const topM = add(geometryOf(top, topP),
    paint(look.top, { soft: true, side: THREE.DoubleSide }), 'cloth');
  const botP = drape(bot, { thick: 0.007, ease: () => 0.007, smooth: 18, k });
  // the crotch: cloth bridges between the legs instead of following the body into a sharp V
  { const cy = body.joints['upperleg01.L'].head.y - 0.045 * body.P.stature, Hs = body.P.stature;
    const wC = bot.P.map((_, j) => j).filter(j => j % 3 === 0).map(j => { const x = bot.P[j], y = bot.P[j + 1];
      // the whole seat and front of the hips, from the waistband to below the crotch (cloth skims over
      // anatomy: following it, shorts and trousers showed the crotch in the lit styles)
      return THREE.MathUtils.smoothstep(y, cy - 0.07 * Hs, cy - 0.02 * Hs) * (1 - 0.6 * THREE.MathUtils.smoothstep(Math.abs(x), 0.09 * Hs, 0.14 * Hs)); });
    const Tb = Uint32Array.from(bot.T), Wb = Float32Array.from(wC);
    spatialSmooth(botP, Tb, Wb, { sigma: 0.035 * k, rounds: 5 });
    spatialSmooth(botP, Tb, Wb, { sigma: 0.03 * k, rounds: 6, outOnly: true }); }
  // trousers fall from the thigh too, just less than baggy ones: skin-tight, they swelled over the
  // thighs and pinched to thin ankles (carrot legs)
  if (D.bottom.type === 'baggy') legHang(botP, bot, body, k);
  else if (D.bottom.type === 'trousers') legHang(botP, bot, body, k, { minR: 0.046, fall: 0.984, round: 0.62 });
  const botM = add(geometryOf(bot, botP), paint(look.bottom, { side: THREE.DoubleSide }), 'cloth');
  const cloth = { top: [topM], bottom: [botM] };
  if (D.skirt) {                                        // the skirt: lifted a little off the fitted surface, the same colour as the bottoms
    const sk2 = D.skirt, P = Float32Array.from(sk2.P), used = new Set(sk2.T), c = body.joints.root?.head ?? new THREE.Vector3();
    for (const i of used) {                             // its normals may face in: lift away from the body's axis either way
      const nx = sk2.N[i * 3], nz = sk2.N[i * 3 + 2], ox = P[i * 3] - c.x, oz = P[i * 3 + 2] - c.z, sg = nx * ox + nz * oz >= 0 ? 1 : -1;
      add3(P, i, sg * nx * 0.012 * k, sg * sk2.N[i * 3 + 1] * 0.012 * k, sg * nz * 0.012 * k);
    }
    // and it falls from the widest point of the hips and seat rather than following the thighs back in (a sack)
    skirtShape(P, sk2, body, k);
    // and it moves as ONE piece of cloth. Skinned like trousers, each part of the hem followed
    // the thigh under it, so a step or sitting down split the skirt open between the legs.
    // From the waist down it goes from the pelvis to both thighs together, leaning only a
    // toward the leg it lies over (only the cloth between the legs is shared by both).
    { const bi = (n) => A.boneIndex.get(n), root = bi('root'), uL = bi('upperleg01.L'), uR = bi('upperleg01.R');
      const hipY = body.joints['upperleg01.L'].head.y, hipX = Math.abs(body.joints['upperleg01.L'].head.x) || 0.09 * k;
      for (const i of used) {
        const y = P[i * 3 + 1], legs = 1 - THREE.MathUtils.smoothstep(y, hipY - 0.07 * body.P.stature, hipY + 0.01 * body.P.stature);   // (a thigh that rises carries the cloth on it)
        const side = 0.5 * THREE.MathUtils.smoothstep(Math.abs(P[i * 3]) / hipX, 0.1, 0.75) * Math.sign(P[i * 3]);   // over a leg: that leg; between them: both
        sk2.K[i] = new Map([[root, 1 - legs], [uL, legs * (0.5 + side)], [uR, legs * (0.5 - side)]]);
      } }
    cloth.bottom.push(add(geometryOf(sk2, P), paint(look.bottom, { side: THREE.DoubleSide }), 'cloth'));
  }
  for (const m of parts) { rig.add(m); m.bind(sk.skeleton); }
  const shoeGroups = shoes(body, look, sk);

  // head pieces ride the head bone rigidly (the bones keep world-aligned rest frames)
  const H = headMap(body), atHead = new THREE.Group();
  atHead.position.copy(body.joints.head.head).negate();
  let eyeG = eyes(body, look), browG = brows(body, H, look), hairG = spec.showHair !== false ? makeHair(H, headHeight(body), look.hairStyle, look.hair) : null;
  atHead.add(eyeG, browG); if (hairG) atHead.add(hairG);                         // (showHair: false only for checking the face)
  sk.byName.head.add(atHead);

  relaxedPose(sk);
  clearSides(sk, body, cloth.top, k);
  clearHips(sk, cloth.bottom, k);
  const tag = (g, role) => g.traverse(o => { if (o.isMesh && !o.userData.role) o.userData.role = role; });
  for (const g of shoeGroups) { g.children[0].userData.role = 'shoe'; g.children[1].userData.role = 'sole'; }
  const tagHead = () => { eyeG.traverse(o => { if (o.isMesh) o.userData.role = o.geometry.attributes.color ? 'eye' : 'glint'; }); tag(browG, 'brow'); if (hairG) hairG.traverse(o => { if (o.isMesh) o.userData.role = o.geometry.type === 'TorusGeometry' ? 'prop' : 'hair'; }); };
  tagHead();
  let render = spec.render ?? 'gouache';
  applyRenderStyle(group, render);
  const person = { group, rig, sk, body, look, get render() { return render; } };
  person.setRender = (name) => { render = name; applyRenderStyle(group, name); };
  person.motion = makeMotion(person);     // every person comes rigged for idle, walk, run, sit and bike
  // restyle(changes): colours and hairstyle change in place, instantly (a creator UI calls
  // this on every click). Body shape, style and expression need a new makePerson.
  person.restyle = (ch = {}) => {
    Object.assign(look, ch);
    if (ch.top != null) for (const m of cloth.top) recolor(m, look.top, render);
    if (ch.bottom != null) for (const m of cloth.bottom) recolor(m, look.bottom, render);
    if (ch.shoes != null || ch.sole != null) for (const g of shoeGroups) { recolor(g.children[0], look.shoes, render); recolor(g.children[1], look.sole, render); }
    if (ch.skin != null || ch.lips != null || ch.blush != null) {
      const col = skinColours(body, look);
      for (const { m, used } of skinParts) {
        const a = m.geometry.attributes.color;
        used.forEach((v, i) => { if (v < A.n) a.array.set(col.subarray(v * 3, v * 3 + 3), i * 3); });
        a.needsUpdate = true;
        if (m.userData.geoLow) { delete m.userData.geoLow; if (render === 'lowpoly') applyRenderStyle(m, render); }
      }
    }
    const swap = (old, fresh) => { atHead.remove(old); atHead.add(fresh); return fresh; };
    if (ch.eyes != null) eyeG = swap(eyeG, eyes(body, look));
    if (ch.brows != null) browG = swap(browG, brows(body, H, look));
    if ((ch.hair != null || ch.hairStyle != null) && hairG) hairG = swap(hairG, makeHair(H, headHeight(body), look.hairStyle, look.hair));
    if (ch.eyes != null || ch.brows != null || ch.hair != null || ch.hairStyle != null) { tagHead(); for (const g of [eyeG, browG, hairG]) if (g) applyRenderStyle(g, render); }
  };
  return person;
}
