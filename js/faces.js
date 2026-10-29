// ─── FACES: every person gets their own head, features, expression and hair ──
// The head is a sphere sculpted by a per-person shape (jaw, chin, cheeks, face
// length, skull, brow). Features are placed ON that surface: a nose drawn from
// its side silhouette (button / straight / roman / snub), eyes with lids and a
// highlight, brows and a mouth drawn as tapered ink strokes that follow the face
// (smile, grin with teeth, smirk, tired, worried). Hair and beards grow from the
// same surface inside a hairline mask (a parting, sideburns, a swept-back line),
// with volume on top — so they hug the skull instead of sitting on it like a cap.
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { paint } from './style.js';

export const HR = 0.118, HC = new THREE.Vector3(0, 0.12, 0.018);
const bump = (c, w, t) => Math.exp(-((t - c) * (t - c)) / (w * w));
const ss = THREE.MathUtils.smoothstep;
const MOUTH_V = -0.44;                                  // where the mouth sits (direction-space height)

// P: jaw 0 (narrow, pointed) … 1 (square) · chin 0…1 · cheeks 0…1 · long −1…1 · skull 0…1 · brow 0…1
export function headShapeFor(P = {}) {
  const jaw = P.jaw ?? 0.5, chin = P.chin ?? 0.5, cheeks = P.cheeks ?? 0.4, long = P.long ?? 0, skull = P.skull ?? 0.5, brow = P.brow ?? 0.5;
  const prof = P.profile ?? 0;            // 0…1: how strongly the centreline (bridge, lips, chin) steps out of a flat face in side view
  return function shape(v, out = new THREE.Vector3()) {
    let { x, y, z } = v;
    const lo = Math.max(0, -y), front = Math.max(0, z), ax = Math.abs(x);
    // (profile pass: a fuller cranium, a gentler forehead and less forward
    // swell low on the face — the old numbers read as a muzzle side-on)
    if (z < 0) z *= 1.1 + 0.18 * skull - 0.55 * lo;              // the skull swells back; the nape tucks in
    else z *= 0.84 + 0.12 * lo * lo;                                // a flatter face; the chin comes forward a little
    if (y > 0.25 && z > 0) z -= 0.09 * (y - 0.25);                  // forehead slopes back, gently
    z += front * ((0.015 + 0.035 * brow) * bump(0.3, 0.09, y) * bump(0.3, 0.3, ax)     // brow ridge
               - 0.04 * bump(0.12, 0.1, y) * bump(0.36, 0.14, ax)                   // eye sockets
               + 0.055 * bump(-0.42, 0.17, y) * bump(0, 0.4, ax)                    // lips sit forward
               - 0.028 * bump(-0.62, 0.09, y) * bump(0, 0.3, ax)                    // the crease under the lip
               + (0.05 + 0.1 * chin) * bump(-0.8, 0.12, y) * bump(0, 0.26, ax));    // the chin
    // full cheeks widen the face, they do NOT push forward: in side view the
    // silhouette must come from the centreline (brow→nose→lips→chin), and a
    // forward cheek swallows the whole profile into one ball
    if (prof) {                                                      // the profile line (centreline only, so the cheeks stay flat)
      const cl = bump(0, 0.22, ax) * front;
      z += prof * cl * (0.035 * bump(0.02, 0.13, y)                  // a bridge rising toward the nose
                      - 0.018 * bump(-0.25, 0.05, y)                 // the notch under the nose
                      + 0.03 * bump(-0.42, 0.08, y)                  // the lips
                      - 0.02 * bump(-0.6, 0.05, y)                   // the crease under the lip
                      + 0.045 * bump(-0.78, 0.09, y));               // the chin
    }
    const ch = cheeks * bump(-0.15, 0.25, y) * bump(0.55, 0.25, ax) * (z > -0.2 ? 1 : 0);
    x *= 1 + 0.11 * ch; z += 0.008 * ch * front;
    const narrow = (0.46 - 0.26 * jaw) * Math.pow(lo, 1.5 + 1.6 * jaw);
    x *= 1 - narrow - 0.05 * front;                                 // jaw narrows to the chin (a square jaw, late)
    if (y < -0.25 && z < 0.4) { const k = Math.min(1, (-0.25 - y) / 0.5); x *= 1 - (0.15 - 0.07 * jaw) * k; z = z * (1 - 0.18 * k) - 0.05 * k * (z < 0 ? 1 : 0.3); }
    if (y < -0.6) y = -0.6 + (y + 0.6) * 0.65;                      // a flatter underside to the jaw
    return out.set(x * (0.95 - 0.03 * long) * HR, y * (1.07 + 0.1 * long) * HR, z * HR).add(HC);
  };
}
export const dirOf = (u, v, zs = 1) => new THREE.Vector3(u, v, zs * Math.sqrt(Math.max(0, 1 - u * u - v * v))).normalize();

// a sphere pushed onto the head shape. mask(d) → keep this vertex (hair/beard region);
// masked-out vertices sink inside the head, which leaves a clean, tapered hairline.
export function sculpt(shape, wSeg, hSeg, { mask = null, inflate = () => 1, color = null, post = null } = {}) {
  const g = new THREE.SphereGeometry(1, wSeg, hSeg);
  const p = g.attributes.position, v = new THREE.Vector3(), o = new THREE.Vector3();
  const col = color ? new Float32Array(p.count * 3) : null, c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    if (col) { v.fromBufferAttribute(p, i).normalize(); color(v, c); col.set([c.r, c.g, c.b], i * 3); }
    v.fromBufferAttribute(p, i).normalize();
    shape(v, o);
    // mask(d) is a signed field (> 0 inside the hair); blend across the edge so the
    // hairline is a smooth curve, not the sphere's grid stepping
    const k = mask ? THREE.MathUtils.lerp(0.9, inflate(v), ss(mask(v), -0.07, 0.07)) : inflate(v);
    o.sub(HC).multiplyScalar(k).add(HC);
    if (post) post(o, v);
    p.setXYZ(i, o.x, o.y, o.z);
  }
  if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  const w = mergeVertices(g, 1e-6); w.computeVertexNormals();
  return w;
}

// ── hair texture: combed strands that flow toward where the hair is gathered (the bun,
// the ponytail, the crown), cut as shallow grooves, with a shine streak across them and
// a touch darker at the roots — the way a cartoon painter draws hair, in the geometry
const _ax = new THREE.Vector3(), _bx = new THREE.Vector3(), _pp = new THREE.Vector3();
function strandAngle(d, flow) {
  _pp.copy(d).addScaledVector(flow, -d.dot(flow));
  _ax.set(1, 0, 0).addScaledVector(flow, -flow.x).normalize();
  _bx.crossVectors(flow, _ax);
  return Math.atan2(_pp.dot(_ax), _pp.dot(_bx));
}
function hairStrands(H) {
  const flow = new THREE.Vector3(...(H.flow || [0, 1, 0])).normalize(), n = H.strands ?? 30;
  const ridge = (d) => Math.sin(strandAngle(d, flow) * n) * 0.6 + Math.sin(strandAngle(d, flow) * n * 2.3 + 1.7) * 0.4;
  return { flow, ridge };
}
function hairColor(H, base, mask) {
  const { flow, ridge } = hairStrands(H);
  const b = new THREE.Color(base), hi = b.clone().lerp(new THREE.Color(H.sheen ?? 0xbfd2ff), 0.38).offsetHSL(0, 0, 0.1);
  const root = b.clone().multiplyScalar(0.72);
  return (d, out) => {
    const r = ridge(d), along = d.dot(flow);
    const shine = Math.exp(-((along - (H.shineAt ?? 0.45)) ** 2) / 0.012) * THREE.MathUtils.clamp(0.55 + 0.6 * r, 0, 1);
    const edge = mask ? 1 - ss(mask(d), 0.0, 0.16) : 0;                      // darker where it grows from the scalp
    out.copy(b).lerp(root, 0.55 * edge + 0.18 * Math.max(0, -r)).lerp(hi, shine);
    return out;
  };
}

// a stroke drawn on the face: a tube through surface points, thick in the middle,
// tapering to fine ends — the way a brush line looks
function stroke(shape, pts, r, mat, lift = 0.003) {
  const P = pts.map(([u, v]) => { const d = dirOf(u, v); const p = shape(d); return p.add(d.multiplyScalar(lift)); });
  const curve = new THREE.CatmullRomCurve3(P);
  const T = 16, Rr = 6;
  const g = new THREE.TubeGeometry(curve, T, r, Rr, false);
  const pos = g.attributes.position, c = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const ring = Math.floor(i / (Rr + 1)), t = ring / T;
    curve.getPointAt(Math.min(1, t), c);
    q.fromBufferAttribute(pos, i).sub(c).multiplyScalar(0.25 + 0.75 * Math.pow(Math.sin(Math.PI * t), 0.6));
    pos.setXYZ(i, c.x + q.x, c.y + q.y, c.z + q.z);
  }
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.userData.noInk = true;
  return m;
}

// a flat filled shape on the face between two strokes (an open mouth, teeth)
function fill(shape, top, bot, mat, lift = 0.0025) {
  const P = (arr) => arr.map(([u, v]) => { const d = dirOf(u, v); return shape(d).add(d.multiplyScalar(lift)); });
  const a = P(top), b = P(bot), pos = [], idx = [];
  for (let i = 0; i < a.length; i++) pos.push(...a[i].toArray(), ...b[i].toArray());
  for (let i = 0; i < a.length - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, mat); m.userData.noInk = true;
  return m;
}
const arc = (u0, u1, v0, sag, n = 9, tilt = 0) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1), u = u0 + (u1 - u0) * t; return [u, v0 - sag * Math.sin(Math.PI * t) + tilt * (t - 0.5)]; });

// ── noses: side silhouettes (x = out of the face, y = up), extruded, narrow at the bridge ──
const NOSES = {
  straight: [[-0.01, 0.036], ['q', 0.004, 0.03, 0.012, 0.004], ['q', 0.017, -0.008, 0.022, -0.014], ['q', 0.027, -0.022, 0.018, -0.026], ['q', 0.008, -0.026, 0.002, -0.022]],
  roman:    [[-0.01, 0.04], ['q', 0.006, 0.036, 0.011, 0.024], ['q', 0.016, 0.014, 0.017, 0.004], ['q', 0.022, -0.008, 0.029, -0.016], ['q', 0.032, -0.026, 0.02, -0.03], ['q', 0.009, -0.03, 0.002, -0.025]],
  snub:     [[-0.01, 0.028], ['q', 0.003, 0.02, 0.01, 0.004], ['q', 0.015, -0.006, 0.022, -0.006], ['q', 0.027, -0.008, 0.023, -0.018], ['q', 0.014, -0.024, 0.002, -0.02]],
};
function noseGeo(type, k) {
  const sh = new THREE.Shape(), path = NOSES[type] || NOSES.straight;
  sh.moveTo(...path[0]);
  for (const s of path.slice(1)) sh.quadraticCurveTo(s[1], s[2], s[3], s[4]);
  const top = path[0][1], bottom = Math.min(...path.slice(1).map(s => s[4]));
  sh.lineTo(-0.01, bottom); sh.lineTo(...path[0]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.014, bevelEnabled: true, bevelThickness: 0.007, bevelSize: 0.006, bevelSegments: 4, curveSegments: 10 });
  g.translate(0, 0, -0.007).rotateY(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const t = THREE.MathUtils.clamp((top - p.getY(i)) / (top - bottom), 0, 1); p.setX(i, p.getX(i) * (0.5 + 0.9 * t)); }
  g.scale(k, k, k); g.deleteAttribute('uv');
  const w = mergeVertices(g, 1e-6); w.computeVertexNormals();
  return w;
}

// a line round the head by azimuth: front → side → back (for hat brims, hairlines)
export function lineAt(d, front, side, back) {
  const t = Math.abs(Math.atan2(d.x, d.z)) / Math.PI;
  return t < 0.5 ? THREE.MathUtils.lerp(front, side, ss(t, 0.1, 0.5)) : THREE.MathUtils.lerp(side, back, ss(t, 0.5, 0.92));
}

// ── hair: hairline by azimuth (front → side → back), a parting, sideburns, volume on top ──
function hairMask(H) {
  return (d) => {
    const az = Math.abs(Math.atan2(d.x, d.z)), t = az / Math.PI;           // 0 front … 1 back
    // a real hairline: arcs high over the forehead, dips at the temples, runs down in front
    // of the ear, round behind it and low at the nape
    let line = t < 0.17 ? THREE.MathUtils.lerp(H.centre, H.temple, ss(t, 0, 0.17))
      : t < 0.5 ? THREE.MathUtils.lerp(H.temple, H.side, ss(t, 0.17, 0.42))
      : THREE.MathUtils.lerp(H.side, H.back, ss(t, 0.5, 0.9));
    if (H.fringe) line -= H.fringe * (1 - ss(t, 0.1, 0.25)) * (0.75 + 0.25 * Math.sin(Math.atan2(d.x, d.z) * 22));
    if (H.burns) line -= H.burns * bump(0.4, 0.05, t);                     // sideburns in front of the ear
    return d.y - line;
  };
}
function hairInflate(H) {
  const strands = hairStrands(H);
  return (d) => {
    let k = H.base + H.vol * Math.pow(Math.max(0, d.y), 1.4) + (H.backVol || 0) * Math.max(0, -d.z) * Math.max(0, d.y + 0.3);
    if (H.part != null) k -= 0.032 * bump(H.part, 0.06, d.x) * ss(d.z, -0.4, 0.3) * ss(d.y, 0.3, 0.7);     // the parting groove
    k += 0.009 * strands.ridge(d);                                         // combed strands
    return k;
  };
}
const HAIR = {
  bun:   { centre: 0.62, temple: 0.5, side: 0.16, back: -0.42, base: 1.045, vol: 0.03, part: 0.0, flow: [0, 0.55, -0.83], strands: 34, shineAt: 0.55 },     // sleek, centre part, pulled back
  crop:  { centre: 0.58, temple: 0.47, side: 0.1, back: -0.36, base: 1.035, vol: 0.025, burns: 0.5, flow: [0, 1, 0.15], strands: 40, shineAt: 0.8, sheen: 0xffd9a8 },   // short, sideburns into the beard
  sides: { centre: 0.72, temple: 0.6, side: 0.04, back: -0.4, base: 1.04, vol: 0.0, burns: 0.22, flow: [0, 1, 0], strands: 44, shineAt: 0.3, sheen: 0xffffff },      // grey round the sides, under a cap
  pony:  { centre: 0.52, temple: 0.42, side: 0.14, back: -0.28, base: 1.05, vol: 0.02, part: 0.18, flow: [0, 0.3, -0.95], strands: 30, shineAt: 0.35 },    // side part, pulled back
  fringe:{ centre: 0.32, temple: 0.3, side: 0.1, back: -0.45, base: 1.05, vol: 0.05, fringe: 0.06, backVol: 0.03 },
};

// ── the whole head ───────────────────────────────────────────────────────────
// F: { shape:{…}, nose, noseSize, mouth, eyes, brows, lashes, blush, eyeSize, browW,
//      hair (HAIR key), beard, glasses }
export function buildHead(J, S, F, mats) {
  const { skin, hairM, dark } = mats;
  const shape = headShapeFor(F.shape);
  const pt = (u, v, zs = 1) => shape(dirOf(u, v, zs));
  const add = (o) => { J.head.add(o); return o; };
  const bits = [];
  add(new THREE.Mesh(sculpt(shape, 44, 32), skin));
  const lineM = paint(0x2f2028, { hatch: 0 });
  // eyes: dark, a highlight, lids for sleepy/narrow eyes, lashes
  const es = F.eyeSize ?? 1;
  for (const s of [-1, 1]) {
    const c = pt(s * 0.36, 0.12);
    // F.lids: a soft, flush eye with an upper-lid line instead of lash ticks (the ticks read
    // as antennae, and a deep dome popped out of the profile like a bead)
    const flush = !!F.lids;
    // F.iris (a hex colour): a white eye with a coloured iris and a darker pupil, instead of a solid dark dot
    const irisCol = F.iris;
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.016 * es * (irisCol ? 1.14 : 1), flush ? 28 : 12, flush ? 20 : 10),
      irisCol ? paint(0xfbf8f1, { hatch: 0, emissive: 0xa8a49c }) : dark);   // lifted so the cel shading can't grey half of it
    e.scale.set(0.8, F.eyes === 'narrow' ? 0.95 : (F.eyeTall ?? 1.15), flush ? 0.3 : 0.5);
    e.position.copy(c);
    const nrm = c.clone().sub(HC).normalize();
    if (flush) e.position.addScaledVector(nrm, -0.0022);
    bits.push(add(e));
    let hlAt = c.clone().add(new THREE.Vector3(-0.004, 0.006, 0.007));
    if (irisCol) {
      // the iris sits straight ahead on the white (the head-surface normal points it sideways: cross-eyed)
      const fwd = new THREE.Vector3(0, 0, 1), ic = e.position.clone().addScaledVector(fwd, 0.0045);
      const iris = new THREE.Mesh(new THREE.SphereGeometry(0.0078 * es, 20, 14), paint(irisCol, { hatch: 0 }));
      iris.scale.set(1, 1, 0.35); iris.position.copy(ic); iris.lookAt(ic.clone().add(fwd)); bits.push(add(iris));
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.0038 * es, 14, 10), paint(new THREE.Color(irisCol).multiplyScalar(0.45).getHex(), { hatch: 0 }));
      pupil.scale.set(1, 1, 0.3); pupil.position.copy(ic).addScaledVector(fwd, 0.0008); pupil.lookAt(pupil.position.clone().add(fwd));
      if (!F.pupilDot) bits.push(add(pupil));
      // a small black dot at the centre of the pupil
      const dot = new THREE.Mesh(new THREE.SphereGeometry((F.pupilDot ?? 0.0018) * es, 12, 8), paint(0x111014, { hatch: 0 }));
      dot.scale.set(1, 1, 0.3); dot.position.copy(pupil.position).addScaledVector(fwd, 0.0006); dot.lookAt(dot.position.clone().add(fwd)); dot.userData.noInk = true; bits.push(add(dot));
      iris.userData.noInk = pupil.userData.noInk = true;
      hlAt = ic.clone().addScaledVector(fwd, 0.0018).add(new THREE.Vector3(-0.0025, 0.0029, 0));
    }
    const hl = new THREE.Mesh(new THREE.SphereGeometry((irisCol ? 0.0024 : 0.0045) * es, 8, 6), paint(0xffffff, { hatch: 0 })); hl.position.copy(hlAt); hl.userData.noInk = !!irisCol; bits.push(add(hl));
    if (F.eyes === 'sleepy' || F.eyes === 'narrow') {
      const lidDrop = F.eyes === 'sleepy' ? 0.45 : 0.18;
      const lid = new THREE.Mesh(new THREE.SphereGeometry(0.0185 * es, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), skin);
      lid.scale.set(0.86, 1.2, 0.62); lid.position.copy(c).add(new THREE.Vector3(0, -0.012 * lidDrop * es, 0.001)); bits.push(add(lid));
      bits.push(add(stroke(shape, arc(s * 0.27, s * 0.45, 0.12 + 0.12 * (0.5 - lidDrop), -0.02), 0.0028, lineM, 0.0075)));
    }
    if (F.lids && F.lidLine !== false) {
      // an upper-lid line arching over the eye, thickest in the middle, with a small flick at the outer corner
      bits.push(add(stroke(shape, [[s * 0.27, 0.145], [s * 0.33, 0.175], [s * 0.4, 0.178], [s * 0.46, 0.158], [s * 0.5, 0.17]], 0.0034, lineM, 0.0045)));
    } else if (F.lashes) for (const k of [0, 1]) bits.push(add(stroke(shape, [[s * (0.45 + k * 0.025), 0.17 - k * 0.02], [s * (0.5 + k * 0.03), 0.2 - k * 0.02]], 0.0025, lineM, 0.006)));
  }
  // brows: tapered strokes, shaped by the expression
  const BROWS = {
    flat: [0.4, 0.43, 0.4], soft: [0.28, 0.33, 0.29], worried: [0.47, 0.44, 0.36], raised: [0.43, 0.51, 0.44], heavy: [0.37, 0.41, 0.37], frown: [0.35, 0.41, 0.42],
  };
  const browM = paint(F.browColor ?? S.hair ?? 0x3a2a24, { hatch: 0 });
  // brows: 'none' draws none
  if (F.brows !== 'none') for (const s of [-1, 1]) {
    const b = BROWS[(s < 0 ? F.browsL : F.browsR) || F.brows || 'flat'];
    bits.push(add(stroke(shape, [[s * 0.2, b[0]], [s * 0.35, b[1]], [s * 0.5, b[2]]], 0.0055 * (F.browW ?? 1), browM, 0.004)));
  }
  // nose (with nostril wings), or a round button
  const ns = F.noseSize ?? 1;
  if (F.nose === 'cute') {           // a small soft button, half sunk into the face so only the tip rounds out, slightly upturned
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.0118 * ns, 18, 14), skin);
    tip.scale.set(1.05, 0.8, 0.85); tip.rotation.x = -0.3;
    tip.position.copy(pt(0, -0.1)).add(new THREE.Vector3(0, 0.003, 0.007)); add(tip);   // proud enough to break the profile
    // nostril wings either side of the tip, a touch lower and further back: the base of the
    // nose reads as a soft three-lobed curve, not a single ball
    for (const sx of [-1, 1]) {
      const w = new THREE.Mesh(new THREE.SphereGeometry(0.0062 * ns, 14, 10), skin); w.scale.set(1.05, 0.85, 0.8);
      w.position.copy(pt(sx * 0.085, -0.118)).add(new THREE.Vector3(0, 0.001, 0.0012)); add(w);
    }
    // the bridge runs from between the eyes down into the tip, so the nose grows out of the face
    const top = pt(0, 0.1).add(new THREE.Vector3(0, 0, -0.003)), bot = pt(0, -0.1).add(new THREE.Vector3(0, 0.004, 0.004));
    const len = top.distanceTo(bot);
    const bridge = new THREE.Mesh(new THREE.CapsuleGeometry(0.0068 * ns, len, 4, 10), skin);
    bridge.position.copy(top).add(bot).multiplyScalar(0.5);
    bridge.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bot.clone().sub(top).normalize());
    bridge.scale.set(1, 1, 0.85); add(bridge);
  } else if (F.nose === 'button') {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.019 * ns, 16, 12), skin); b.scale.set(1.05, 0.95, 0.85);
    b.position.copy(pt(0, -0.1)).add(new THREE.Vector3(0, 0, 0.006)); add(b);
    const br = new THREE.Mesh(new THREE.CapsuleGeometry(0.009 * ns, 0.02, 4, 8), skin); br.position.copy(pt(0, 0.02)).add(new THREE.Vector3(0, 0, -0.001)); add(br);
  } else {
    const n = new THREE.Mesh(noseGeo(F.nose || 'straight', 1.45 * ns), skin); n.position.copy(pt(0, -0.07)).add(new THREE.Vector3(0, 0, -0.008)); add(n);
    for (const sx of [-1, 1]) { const a = new THREE.Mesh(new THREE.SphereGeometry(0.0105 * ns, 10, 8), skin); a.scale.set(1, 0.85, 0.9); a.position.copy(n.position).add(new THREE.Vector3(sx * 0.016 * ns, -0.026 * ns, 0.012 * ns)); add(a); }
  }
  // mouth: an expression, not a stamp
  const vm = MOUTH_V, mouthM = paint(0x4a2630, { hatch: 0 });
  switch (F.mouth) {
    case 'smile':             // a simple closed smile: one soft arc, slightly tucked at the corners
      // F.mouthUp raises the smile toward the nose
      bits.push(add(stroke(shape, arc(-(F.smileW ?? 0.17), F.smileW ?? 0.17, vm + 0.025 + (F.mouthUp ?? 0), 0.045 * (F.smileW ?? 0.17) / 0.17, 13), 0.0034, lineM, 0.0035)));
      break;
    case 'grin': {            // an open smile with teeth
      const top = arc(-0.2, 0.2, vm + 0.015, 0.02), bot = arc(-0.2, 0.2, vm + 0.015, 0.11);
      bits.push(add(fill(shape, top, bot, paint(0x5a2230, { hatch: 0, side: THREE.DoubleSide }))));
      const teethBot = arc(-0.17, 0.17, vm + 0.012, 0.045);
      bits.push(add(fill(shape, arc(-0.17, 0.17, vm + 0.015, 0.02), teethBot, paint(0xfbf7ee, { hatch: 0, side: THREE.DoubleSide }), 0.0032)));
      bits.push(add(stroke(shape, bot, 0.0032, lineM, 0.0035)));
      bits.push(add(stroke(shape, [[-0.24, vm + 0.04], [-0.2, vm + 0.015]], 0.003, lineM)));
      bits.push(add(stroke(shape, [[0.2, vm + 0.015], [0.24, vm + 0.04]], 0.003, lineM)));
      break;
    }
    case 'smirk': bits.push(add(stroke(shape, [[-0.17, vm - 0.005], [-0.05, vm - 0.018], [0.08, vm - 0.008], [0.19, vm + 0.04]], 0.0036, mouthM))); break;
    case 'flat': bits.push(add(stroke(shape, [[-0.14, vm - 0.004], [0, vm - 0.012], [0.14, vm - 0.004]], 0.0032, mouthM))); break;
    case 'worried': bits.push(add(stroke(shape, [[-0.12, vm - 0.016], [-0.04, vm + 0.004], [0.05, vm + 0.002], [0.12, vm - 0.02]], 0.0034, mouthM))); break;
    default: bits.push(add(stroke(shape, arc(-0.2, 0.2, vm + 0.03, 0.06), 0.0038, mouthM)));             // a warm smile
  }
  // blush
  if (F.blush !== 0) for (const s of [-1, 1]) {
    const ch = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), paint(F.blushColor ?? 0xe89a86, { hatch: 0 })); ch.scale.set(1.1 * (F.blush ?? 1), 0.6, 0.3);
    ch.position.copy(pt(s * 0.55, -0.2)).add(new THREE.Vector3(0, 0, -0.003));
    if (F.blushFlush) {
      // a decal: a patch of the face's own surface, lifted a hair's breadth, in one flat
      // unshaded colour — no lighting, no outline, so it reads painted on, not raised
      const N = 14, cu = s * 0.55, cv = -0.2, ru = 0.13 * (F.blush ?? 1), rv = 0.085, pos = [], idx = [];
      for (let i = 0; i <= N; i++) for (let j = 0; j <= N; j++) {
        const a = (i / N) * 2 - 1, b = (j / N) * 2 - 1, k = Math.min(1, 1 / Math.max(1e-6, Math.hypot(a, b))) * Math.hypot(a, b);
        const r = Math.hypot(a, b) > 1 ? 1 / Math.hypot(a, b) : 1;
        const p = pt(cu + a * r * ru, cv + b * r * rv);
        p.sub(HC).multiplyScalar(1.004).add(HC);
        pos.push(p.x, p.y, p.z);
      }
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
        const q = i * (N + 1) + j;
        idx.push(q, q + N + 1, q + 1, q + 1, q + N + 1, q + N + 2);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
      const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: F.blushColor ?? 0xe89a86, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2 }));
      m.userData.noInk = true;
      bits.push(add(m));
      continue;
    }
    bits.push(add(ch));
  }
  // ears
  for (const s of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 12, 10), skin); ear.scale.set(0.5, 1, 0.8); ear.position.copy(pt(s * 0.97, 0.03, -1)).add(new THREE.Vector3(0, 0, 0.012)); add(ear); }
  if (F.glasses) for (const s of [-1, 1]) { const g = new THREE.Mesh(new THREE.TorusGeometry(0.025, 0.0038, 6, 18), dark); g.position.copy(pt(s * 0.36, 0.12)).add(new THREE.Vector3(0, 0, 0.012)); bits.push(add(g)); }
  if (F.glasses) bits.push(add(stroke(shape, [[-0.15, 0.15], [0, 0.19], [0.15, 0.15]], 0.003, dark, 0.014)));
  // hair, grown from the scalp inside its hairline
  const H = HAIR[F.hair];
  if (H) { const mask = hairMask(H);
    add(new THREE.Mesh(sculpt(shape, 96, 72, { mask, inflate: hairInflate(H), color: hairColor(H, S.hair ?? 0x3a2a24, mask) }), paint(0xffffff, { vertexColors: true }))); }
  // a beard and moustache grown from the jaw, the mouth left clear
  if (F.beard) {
    const mask = (d) => {
      const ax = Math.abs(d.x), az = Math.abs(Math.atan2(d.x, d.z));
      const cheek = -0.26 + 0.24 * ss(ax, 0.3, 0.95);                                // the beard line on the cheek, rising to the sideburn
      const below = cheek - d.y;
      const mous = Math.min(0.27 - ax, d.y - (vm + 0.045), (vm + 0.14) - d.y);       // the moustache band
      const hole = (((d.x / 0.18) ** 2 + ((d.y - vm) / 0.055) ** 2) - 1) * 0.05;     // the mouth stays clear
      return Math.min(Math.max(below, mous), 1.75 - az, hole);
    };
    // a beard grows downward: strands run vertically, a little fuller and wavier at the chin
    const BH = { flow: [0, -1, 0.2], strands: 46, shineAt: -0.85, sheen: 0xffd9a8 }, bs = hairStrands(BH);
    add(new THREE.Mesh(sculpt(shape, 96, 72, { mask, inflate: (d) => 1.045 + 0.06 * Math.max(0, -d.y - 0.5) + 0.008 * bs.ridge(d),
      color: hairColor(BH, S.hair ?? 0x3a2a24, mask) }), paint(0xffffff, { vertexColors: true })));
  }
  for (const b of bits) b.userData.noInk = true;
  const top = shape(new THREE.Vector3(0, 1, 0)).y;
  return { shape, pt, top };
}
