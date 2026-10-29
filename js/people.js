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
import { loadAnatomy, buildBody, buildSkeleton, regionWeight } from './anatomy.js';
import { stylize, STYLES, smoothSurface, eyeCentres, headHeight } from './stylize.js';
import { paint, ink } from './style.js';
import { shoeGeo } from './folk.js';
import { relaxedPose, makeMotion } from './motion.js';
import { makeHair } from './hair.js';

export const LOOK_JANELLE = {
  body: { sex: 0, muscle: 0.45, weight: 0.42, height: 0.5, proportions: 0.6 },
  // a warm, easy smile: the zygomaticus lifts the mouth corners, the cheeks lift the lower lids a touch
  expression: { 'mouth-corner-puller': 0.55, 'mouth-elevation': 0.15, 'eye-left-slit': 0.12, 'eye-right-slit': 0.12 },
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

// ── a cuttable surface: positions, normals and skin per vertex, plus triangles ──
// A garment is the body surface cut along smooth fields (the rig's own weight
// falloffs, or a height), split exactly on the cut so hems are clean curves,
// not the stair-step of whole triangles.
function surface(body, N) {
  const { A } = body, S = { P: [], N: [], K: [], T: Array.from(A.tris.body), f: {} };
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

// ── dressing ──
// fields: neck (head+neck weight), hands, feet, arms, and height. The garments:
//   skin   face & neck above a line just under the collar; hands below a line just inside the cuff
//   top    below the collar line, above the cuffs, down to the hip hem (arms are never hemmed)
//   bottom from above the top's hem (tucked under it) down to the ankle
//   shoes  modelled separately on the foot bone; the bare foot is never kept
function dress(body, N, look) {
  const { A } = body, R = (b) => regionWeight(A, b), J = body.joints, H = body.P.stature;
  const both = (b) => { const l = R(b + '.L'), r = R(b + '.R'); return l.map((v, i) => v + r[i]); };
  const S = surface(body, N);
  S.f = { neck: Array.from(R('neck01')), hands: Array.from(both('wrist')), feet: Array.from(both('foot')), arms: Array.from(both('shoulder01')) };
  const y = (i, s) => s.P[i * 3 + 1];
  const hemY = J['upperleg01.L'].head.y + (look.hem ?? 0.02) * H, waistY = hemY + 0.08 * H;
  const cuff = look.cuff ?? 0.5, collar = look.collar ?? 0.5;
  const out = {};
  out.face = cut(copySurface(S), (i, s) => s.f.neck[i] - (collar - 0.18));
  out.hands = cut(copySurface(S), (i, s) => s.f.hands[i] - (cuff - 0.2));
  out.top = cut(cut(cut(copySurface(S), (i, s) => collar - s.f.neck[i]), (i, s) => cuff - s.f.hands[i]),
    (i, s) => s.f.arms[i] > 0.5 ? 1 : y(i, s) - hemY);
  out.bottom = cut(cut(cut(copySurface(S), (i, s) => 0.5 - s.f.arms[i]), (i, s) => waistY - y(i, s)), (i, s) => 0.45 - s.f.feet[i]);
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
  for (const i of ids) { p.fromArray(pos, i * 3).sub(C); const r = p.length(); const c = cell(p.normalize()); grid[c] = Math.max(grid[c], r); }
  for (let pass = 0; pass < 12; pass++) for (let e = 0; e < NE; e++) for (let a = 0; a < NA; a++) {
    if (grid[e * NA + a]) continue;
    let s = 0, n = 0;
    for (const [de, da] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const ee = e + de, aa = (a + da + NA) % NA; if (ee < 0 || ee >= NE) continue;
      if (grid[ee * NA + aa]) { s += grid[ee * NA + aa]; n++; }
    }
    if (n) grid[e * NA + a] = s / n;
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
  const Rside = (radius(new THREE.Vector3(1, 0, 0)) + radius(new THREE.Vector3(-1, 0, 0))) / 2;
  return { C, radius, scalp, R: Rside };
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
    const g = new THREE.SphereGeometry(rad, 40, 28), P = g.attributes.position, col = new Float32Array(P.count * 3), k = new THREE.Color();
    for (let i = 0; i < P.count; i++) {
      const f = p.fromBufferAttribute(P, i).normalize().z;
      k.copy(f > pupilCos ? dark : f > irisCos ? iris.clone().lerp(dark, 0.35 * (f - irisCos) / (pupilCos - irisCos)) : white);
      col.set([k.r, k.g, k.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Mesh(g, paint(0xffffff, { vertexColors: true, hatch: 0 })); m.position.copy(c); m.userData.noInk = true; out.add(m);
    const glint = new THREE.Mesh(new THREE.SphereGeometry(rad * (big ? 0.2 : 0.13), 10, 8), paint(0xffffff, { hatch: 0 }));
    glint.position.copy(c).add(new THREE.Vector3(rad * 0.28, rad * 0.12, rad * 0.96)); glint.userData.noInk = true; out.add(glint);
  });
  return out;
}

// brows: a tapered stroke laid on the brow ridge above each eye
function brows(body, H, look) {
  const out = new THREE.Group(), [l, r] = eyeCentres(body), E = l.distanceTo(r), mat = paint(look.brows, { hatch: 0 });
  for (const c of [l, r]) {
    const s = Math.sign(c.x), pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8, p = c.clone().add(new THREE.Vector3(s * E * (-0.28 + 0.62 * t), E * (0.34 + 0.08 * Math.sin(Math.PI * t * 0.9) - 0.05 * t), 0));
      const d = p.clone().sub(H.C).normalize();
      pts.push(d.multiplyScalar(H.radius(d) * 1.012).add(H.C));
    }
    const curve = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(curve, 24, E * 0.028, 6);
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
      c.lerp(lips, 0.55 * (1 - THREE.MathUtils.smoothstep(m, 0.6, 1)));
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

export async function makePerson(spec = {}) {
  const look = { ...LOOK_JANELLE, ...spec };
  const A = await loadAnatomy(spec.url);
  const style = STYLES[spec.style] ?? spec.style ?? STYLES.real;
  const expression = { ...look.expression }; for (const [k, v] of Object.entries(style.expression || {})) expression[k] = (expression[k] || 0) + v;
  const body = stylize(buildBody(A, { ...LOOK_JANELLE.body, ...spec.body, expression, stature: spec.stature ?? 1.7 }), style);
  const N = vertexNormals(Float32Array.from(body.pos), A.tris.body);
  const D = dress(body, N, look), k = body.P.stature / 1.7;
  const [el, er] = eyeCentres(body), eyeR = el.distanceTo(er) * 0.3;

  const sk = buildSkeleton(body);
  const group = new THREE.Group(), rig = new THREE.Group();
  group.add(rig); rig.add(sk.root);
  const parts = [];
  const add = (geo, mat) => { const m = new THREE.SkinnedMesh(geo, mat); m.frustumCulled = false; parts.push(m); return m; };

  // skin: face & neck, and hands — nothing else of the body is ever drawn
  const skinCol = skinColours(body, look), skinParts = [];
  for (const key of ['face', 'hands']) {
    const geo = geometryOf(D[key]), used = geo.userData.used;
    const col = new Float32Array(used.length * 3), c = new THREE.Color(look.skin);
    used.forEach((v, i) => { if (v < A.n) col.set(skinCol.subarray(v * 3, v * 3 + 3), i * 3); else col.set([c.r, c.g, c.b], i * 3); });
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = add(geo, paint(0xffffff, { vertexColors: true, soft: true }));
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
  const upperW = (i) => Math.max(0, 1 - top.f.arms[i] - top.f.neck[i]);
  const topM = add(geometryOf(top, drape(top, { thick: 0.008, ease: (i) => 0.012 * upperW(i), smooth: 30, k,
    smoothW: top.P.map((_, j) => j).filter(j => j % 3 === 0).map(j => 1 - 0.6 * Math.min(1, top.f.arms[j / 3])) })),
    paint(look.top, { soft: true, side: THREE.DoubleSide }));
  const botM = add(geometryOf(bot, drape(bot, { thick: 0.006, ease: () => 0.003, smooth: 18, k })), paint(look.bottom, { side: THREE.DoubleSide }));
  for (const m of parts) { rig.add(m); m.bind(sk.skeleton); }
  const shoeGroups = shoes(body, look, sk);

  // head pieces ride the head bone rigidly (the bones keep world-aligned rest frames)
  const H = headMap(body), atHead = new THREE.Group();
  atHead.position.copy(body.joints.head.head).negate();
  let eyeG = eyes(body, look), browG = brows(body, H, look), hairG = spec.showHair !== false ? makeHair(H, headHeight(body), look.hairStyle, look.hair) : null;
  atHead.add(eyeG, browG); if (hairG) atHead.add(hairG);                         // (showHair: false only for checking the face)
  sk.byName.head.add(atHead);

  relaxedPose(sk);
  ink(group, 'fine');
  const person = { group, rig, sk, body, look };
  person.motion = makeMotion(person);     // every person comes rigged for idle, walk, run, sit and bike
  // restyle(changes): colours and hairstyle change in place, instantly (a creator UI calls
  // this on every click). Body shape, style and expression need a new makePerson.
  person.restyle = (ch = {}) => {
    Object.assign(look, ch);
    if (ch.top != null) topM.material = paint(look.top, { soft: true, side: THREE.DoubleSide });
    if (ch.bottom != null) botM.material = paint(look.bottom, { side: THREE.DoubleSide });
    if (ch.shoes != null || ch.sole != null) for (const g of shoeGroups) { g.children[0].material = paint(look.shoes); g.children[1].material = paint(look.sole); }
    if (ch.skin != null || ch.lips != null || ch.blush != null) {
      const col = skinColours(body, look);
      for (const { m, used } of skinParts) {
        const a = m.geometry.attributes.color;
        used.forEach((v, i) => { if (v < A.n) a.array.set(col.subarray(v * 3, v * 3 + 3), i * 3); });
        a.needsUpdate = true;
      }
    }
    const swap = (old, fresh) => { atHead.remove(old); atHead.add(fresh); ink(fresh, 'fine'); return fresh; };
    if (ch.eyes != null) eyeG = swap(eyeG, eyes(body, look));
    if (ch.brows != null) browG = swap(browG, brows(body, H, look));
    if ((ch.hair != null || ch.hairStyle != null) && hairG) hairG = swap(hairG, makeHair(H, headHeight(body), look.hairStyle, look.hair));
  };
  return person;
}
