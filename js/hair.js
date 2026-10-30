// ─── HAIR: styles grown on the head's own shape, cut on clean lines ──────────
// The hair is ONE grid laid over the head: columns run round it (θ, from the face
// at 0), rows run from the crown down. Each column follows the scalp (lifted by the
// hair's volume), and — for longer styles — below the ears it stops following the
// head and hangs as a curtain. Each column ENDS exactly on its cut line: the fringe
// across the face, the chosen length at the sides and back. Rows are spread along
// each column's own length, so the edge is a smooth curve by construction — no
// triangles are thrown away (that left ragged, stair-stepped edges and hidden
// geometry that showed through the eyes). The cut edge gets a lip of thickness.
//
//   makeHair(H, { chin }, style, colour)  →  THREE.Group, in the head's rest frame
//   H: the head radius map from people.js — C (centre), R (radius at the ears),
//      scalp(dir) (a smoothed radius), radius(dir) (the true surface)
//
// Style numbers are in head radii (R) or in "elevation" e = sin(latitude) from C:
// e = 1 crown, 0 ear level, −1 under the chin.
import * as THREE from 'three';
import { paint } from './style.js';

export const HAIRSTYLES = {
  //          thickness, crown volume,  fringe line (e at the centre, side sweep), face window (half-angle, rad),
  //          end on the head at the side / back (e), curtain (cut: 1 = chin level, more = longer; A-line rise at the back; bell; tuck), extras
  buzz:     { label: 'Buzz', th: 0.05, vol: 0.0, fringe: [0.64, 0], face: 1.05, side: 0.1, back: -0.55, taper: true },
  crop:     { label: 'Crop', th: 0.08, vol: 0.12, fringe: [0.5, 0.08], face: 1.0, side: 0.05, back: -0.55, texture: 0.6, taper: true, locks: 32, lockW: 1.05, lockH: 0.03, tip: 0.04 },
  pixie:    { label: 'Pixie', th: 0.09, vol: 0.16, fringe: [0.3, 0.3], face: 0.95, side: -0.22, back: -0.6, texture: 0.8, taper: true, locks: 34, lockW: 1.05, lockH: 0.04, tip: 0.09 },
  bob:      { label: 'Bob', th: 0.08, vol: 0.14, fringe: [0.3, 0.3], face: 0.92, curtain: { cut: 1.0, aline: 0.2, bell: 0.1, tuck: 0.06 }, locks: 36, lockW: 1.05, tip: 0.05 },
  lob:      { label: 'Long bob', th: 0.08, vol: 0.14, fringe: [0.55, 0.15], face: 0.88, curtain: { cut: 1.45, aline: 0.1, bell: 0.08, tuck: 0.03 }, locks: 40, lockW: 1.05, tip: 0.07 },
  ponytail: { label: 'Ponytail', th: 0.06, vol: 0.06, fringe: [0.6, 0], face: 1.0, side: -0.3, back: -0.55, extra: 'ponytail', taper: true },
  bun:      { label: 'Bun', th: 0.06, vol: 0.06, fringe: [0.6, 0], face: 1.0, side: -0.3, back: -0.55, extra: 'bun', taper: true },
  curly:    { label: 'Curls', th: 0.26, vol: 0.24, cloud: true, fringe: [0.5, 0.06], face: 0.98, curtain: { cut: 0.6, aline: 0.05, bell: 0.35, tuck: 0.18 }, curl: 0.19 },
};

const ss = THREE.MathUtils.smoothstep;
// a smooth curve through knots [[x, y], …] (monotone cubic: no overshoot). Smoothstepping
// between knots put a flat spot at every one, and the hairline came out as little steps.
function spline(K, x) {
  const n = K.length; if (x <= K[0][0]) return K[0][1]; if (x >= K[n - 1][0]) return K[n - 1][1];
  let k = 1; while (K[k][0] < x) k++;
  const sl = (i) => (K[i + 1][1] - K[i][1]) / (K[i + 1][0] - K[i][0]);
  const tan = (i) => { if (i === 0) return sl(0); if (i === n - 1) return sl(n - 2); const a = sl(i - 1), b = sl(i); return a * b <= 0 ? 0 : 2 / (1 / a + 1 / b); };
  const [x0, y0] = K[k - 1], [x1, y1] = K[k], h = x1 - x0, t = (x - x0) / h, t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * h * tan(k - 1) + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * h * tan(k);
}
const dirAt = (th, e) => { const c = Math.sqrt(Math.max(0, 1 - e * e)); return new THREE.Vector3(Math.sin(th) * c, e, Math.cos(th) * c); };

export function makeHair(H, { chin }, styleName, colour) {
  const S = HAIRSTYLES[styleName] ?? HAIRSTYLES.bob, { C, R } = H, g = new THREE.Group();
  const NT = 112, NR = 44, SAMPLES = 120;
  const base = new THREE.Color(colour), dark = base.clone().multiplyScalar(0.68), shine = base.clone().lerp(new THREE.Color(0xfff3dc), 0.4);
  // strand grooves round the head. Whole-number frequencies (so the seam at the back
  // meets) and well under the grid's limit (NT/2 waves): finer grooves alias into
  // zig-zag slivers whose flipped faces let the outline show through as black holes
  const strand = (th) => 0.6 * Math.sin(th * 14 + 1.5 * Math.sin(th * 5)) + 0.4 * Math.sin(th * 23 + 1.3);
  // clumps: a few big soft ridges round the head (whole-number frequencies so the back seam meets),
  // drifting a little as they run down; none at the crown, where they would meet in a star
  const clump = (th, u) => (0.55 * Math.sin(th * 9 + 0.6 * u + 0.8 * Math.sin(th * 4)) + 0.3 * Math.sin(th * 13 + 2.1 - 0.4 * u) + 0.15 * Math.sin(th * 21 + 0.7)) * ss(u, 0.1, 0.35);
  // curls: soft lumps a few centimetres across (again, coarse enough for the grid to carry)
  // curly hair: a cloud of rounded curls IN the mass's surface: bumps everywhere outward (never pits),
  // cell-like, at two sizes. (Separate curl tubes looked like a powdered wig made of pasta.)
  const bump = (p, f, o) => Math.sqrt(Math.abs(Math.sin(p.x * f / R + o) * Math.sin(p.y * f * 0.93 / R + 1.7 * o) * Math.sin(p.z * f * 1.07 / R + 0.6 * o)));
  const curlF = (p) => 0.55 * bump(p, 10, 0.3) + 0.45 * bump(p.clone().applyAxisAngle(new THREE.Vector3(0.3, 1, 0.2).normalize(), 0.8), 17, 1.1);
  const curlN = (p) => S.curl ? S.curl * R * curlF(p) : 0;
  // the hair's outer surface over the head at (θ, e): scalp + thickness + crown volume + strand grooves
  const onHead = (th, e) => {
    // (on whichever is higher above the ears, the smoothed scalp or the real head: the smoothed one dipped
    // under a bump of the skull and the scalp showed through short hair)
    const d = dirAt(th, e), r = (d.y > 0.25 && H.reach ? Math.max(H.scalp(d), H.reach(d)) : H.scalp(d)) + R * (S.th + S.vol * Math.max(0, e) ** 2 + 0.012 * (S.texture ?? 1) * strand(th) * ss(e, -0.6, 0.2) * (1 - ss(e, 0.75, 0.98)));   // (none at the crown: all the ripples meet there in a spike)
    const p = d.clone().multiplyScalar(r).add(C); return p.addScaledVector(d, curlN(p));   // (clone: multiplyScalar mutates d)
  };
  const faceW = (th) => 1 - ss(Math.abs(th), S.face, S.face + 0.32);                   // 1 across the face … 0 behind the temples
  // a style that shows the forehead starts at the person's own hairline (H.hairlineE, the face in
  // thirds); one with a fringe brings it down over the forehead, never up past that line
  const front = S.fringe[0] >= 0.45 ? (H.hairlineE ?? S.fringe[0]) + (S.hairline ?? 0) : Math.min(S.fringe[0], (H.hairlineE ?? 1) - 0.2);   // (a fringe comes down close to the brows)
  const fringeE = (th) => front + S.fringe[1] * Math.sin(th);                     // a side-swept fringe (a clean line: "choppy" read as messy)
  // where short hair ends, all the way round: across the forehead, a little higher at the
  // temples, straight DOWN in front of the ear as a sideburn, up and over the ear, then down
  // behind it to the nape. (Blending the fringe straight into the side length cut a diagonal
  // across the temple and left it bald.)
  const hairline = (th) => {
    const a = Math.abs(th), f = fringeE(th), ear = S.side, burn = S.burn ?? THREE.MathUtils.clamp(ear - 0.12, -0.14, -0.02);
    // (over the ear it arches round the top of it, not a flat ledge)
    // (the temple is a rounded corner, not a right angle; the arch clears the top of the ear, which poked through)
    const K = [[0, f], [0.5, f + 0.015], [0.78, f + 0.05], [0.97, (f + 0.05 + burn) / 2 + 0.05], [1.12, burn], [1.22, burn], [1.4, ear + 0.07], [1.62, ear + 0.17], [1.9, ear + 0.06], [2.4, ear + (S.back - ear) * 0.85], [Math.PI, S.back]];   // (the nape nearly level, not a V)
    return spline(K, a);
  };
  const back = (th) => (1 - Math.cos(th)) / 2;                                          // 0 front … 1 back
  // the edge of a fringe that hangs over the forehead keeps its thickness and tips; every other
  // edge of short hair is a hairline, where the hair thins to nothing on the skin
  const fringeHang = S.fringe[0] < 0.45;
  const isHairline = (th) => !!S.taper && !(fringeHang && faceW(th) > 0.5);

  // one column: the path from the crown down, as points, and where it ends (index)
  const column = (th) => {
    const pts = [], hang = !!S.curtain;
    // on the head: from the crown down to ear level (curtains) or to this column's end
    const endE = hang ? -0.08 : hairline(th);
    for (let i = 0; i <= SAMPLES; i++) {
      const e = 1 - (1 - endE) * (i / SAMPLES);
      pts.push(onHead(th, i === 0 ? 1 : Math.min(0.999, e)));   // (every column starts at exactly one point: nearly meeting, they left slivers that drew a star)
    }
    if (hang) {                                                                         // below the ears the hair falls
      const cv = S.curtain, top = pts[pts.length - 1], hx = top.x - C.x, hz = top.z - C.z, r0 = Math.hypot(hx, hz);
      // cut: 1 = at the chin, 1.45 = below it, 0.55 = above it; rising toward the nape for an A-line
      const cutY = Math.min(top.y - 0.05 * R, chin - R * (cv.cut - 1) + R * (0.04 + cv.aline * back(th)));
      const n = 40;
      for (let i = 1; i <= n; i++) {
        const h = i / n, y = top.y + (cutY - top.y) * h;
        const k = 1 + cv.bell * Math.sin(Math.PI * Math.min(1, h * 1.1)) * 0.6 - cv.tuck * ss(h, 0.82, 1);
        const p = new THREE.Vector3(C.x + hx * k, y, C.z + hz * k);
        pts.push(p.addScaledVector(new THREE.Vector3(hx, 0, hz).normalize(), curlN(p) + 0.006 * R * strand(th)));
      }
    }
    // arclength, and where the fringe would end this column
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    const fe = fringeE(th), fi = Math.min(SAMPLES, Math.round((1 - fe) / (1 - (hang ? -0.08 : endE)) * SAMPLES));
    const end = hang ? THREE.MathUtils.lerp(L[L.length - 1], L[Math.max(1, fi)], faceW(th)) : L[L.length - 1];
    return { pts, L, end };
  };
  // short hair thins out to the hairline: the sides and back all the way down from the crown
  // (tapering only near the end, it bulged and tucked in, a bowl), the front just at the forehead;
  // to just OFF the skin (flush with it, the two z-fought into a ragged hairline). The locks ride
  // this same thinned surface.
  const taper = (p, th, u, extra = 0) => {
    if (!S.taper || !isHairline(th)) return p;
    // (to just off the TRUE head above the ears too: the smoothed scalp dips under it in places, and the head showed through)
    const d = p.clone().sub(C), dn = d.clone().normalize(), r0 = (dn.y > 0.15 && H.reach ? Math.max(H.scalp(dn), H.reach(dn)) : H.scalp(dn)) + 0.02 * R + extra, k = ss(u, THREE.MathUtils.lerp(0.15, 0.62, faceW(th)), 1);
    return p.copy(C).addScaledVector(d, THREE.MathUtils.lerp(d.length(), r0, k * 0.95) / d.length());
  };
  const at = (col, s) => {                                                              // point at arclength s along a column
    const { pts, L } = col; let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    return pts[i - 1].clone().lerp(pts[i], THREE.MathUtils.clamp((s - L[i - 1]) / ((L[i] - L[i - 1]) || 1), 0, 1));
  };

  // the grid (plus a lip row along the cut, turned in toward the head)
  const row = NR + 2;
  const P = [], Cc = [], idx = [], c = new THREE.Color();
  const cols = [];
  for (let j = 0; j < NT; j++) cols.push(column(-Math.PI + (j / NT) * Math.PI * 2));
  for (let j = 0; j < NT; j++) {
    const th = -Math.PI + (j / NT) * Math.PI * 2, col = cols[j];
    // the ends come to soft points, one per clump (a fringe, a bob's ends): a gentle scallop, not
    // a ruler-straight cut; none along a hairline, which thins out instead
    const tip = isHairline(th) ? 0 : Math.pow(Math.abs(Math.sin(th * 9 / 2 + 0.3 + 0.4 * Math.sin(th * 2))), 0.7);
    const len = col.end * (1 - (S.curtain || faceW(th) > 0.5 ? 0.06 : 0) * (1 - tip));
    for (let i = 0; i <= NR; i++) {
      const u = i / NR, p = at(col, len * u);
      taper(p, th, u);
      if (S.locks && !S.curl) { const d = p.clone().sub(C).normalize(); p.addScaledVector(d, R * 0.045 * clump(th, u) * (1 - ss(u, 0.92, 1))); }
      P.push(p.x, p.y, p.z);
      const e = (p.y - C.y) / R, r = (strand(th) * 0.5 + (S.locks ? clump(th, u) * 0.9 : 0)) * (1 - ss(u, 0, 0.25));   // (no stripes at the top: they met in a star)
      const crev = S.curl ? 0.85 * Math.pow(1 - curlF(p), 1.5) : 0;                                   // (curly: the crevices between curls in shadow)
      c.copy(base).lerp(dark, 0.5 * Math.max(0, -r) * (S.curl ? 0 : 1) + crev + 0.25 * (1 - ss(u, 0, 0.12)))     // grooves between clumps, darker at the roots
        .lerp(shine, 0.55 * Math.exp(-((e - 0.5) ** 2) / 0.02) * THREE.MathUtils.clamp(0.4 + 0.6 * r, 0, 1));
      Cc.push(c.r, c.g, c.b);
    }
    const last = P.slice(-3), lastV = new THREE.Vector3(...last), prev = at(col, len * 0.97), inward = C.clone().sub(lastV).normalize();
    // the cut edge's lip: a dark, thick one where hair is cut; at a hairline (already thinned
    // onto the skin) just a sliver tucked under, in the hair's own colour (a dark band read as a ledge)
    const hlE = S.taper && isHairline(th), lip = lastV.clone().addScaledVector(inward, hlE ? 0.012 * R : S.th * R * 0.9).add(prev.clone().sub(lastV).multiplyScalar(hlE ? 0.1 : 0.6));
    P.push(lip.x, lip.y, lip.z); c.copy(hlE ? base.clone().lerp(dark, 0.3) : dark); Cc.push(c.r, c.g, c.b);
  }
  for (let j = 0; j < NT; j++) {
    const a = j * row, b = ((j + 1) % NT) * row;
    // wound so the normals face OUT of the head: the outline is drawn from back faces pushed
    // out along the normals, so inward normals put it right on top of the hair (black holes)
    for (let i = 0; i < NR + 1; i++) idx.push(a + i, a + i + 1, b + i, b + i, a + i + 1, b + i + 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(Cc, 3));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  { // the columns' copies of the top point (and the rows next to it) share one normal: each with its
    // own, the outline and the shading creased round it into a star
    const Nm = geo.attributes.normal;
    for (let i = 0; i < 3; i++) {
      const a = new THREE.Vector3(); for (let j = 0; j < NT; j++) a.add(new THREE.Vector3().fromBufferAttribute(Nm, j * row + i));
      a.normalize();
      for (let j = 0; j < NT; j++) { const k = j * row + i, n = new THREE.Vector3().fromBufferAttribute(Nm, k).lerp(a, [1, 0.6, 0.3][i]).normalize(); Nm.setXYZ(k, n.x, n.y, n.z); }
    } }
  // (no strand highlight on the base mass: it's a smooth cap, and a highlight on it only drew the cap's
  // shape, a ring at the crown and blotches; the locks over it carry the strands and the highlight)
  const mat = paint(0xffffff, { vertexColors: true, soft: true, hatch: 0.3, side: THREE.DoubleSide });
  const shell = new THREE.Mesh(geo, mat);
  g.add(shell);

  // ── locks: tapered clumps laid over the base mass ──
  // One smooth shell reads as a plastic helmet. Real (and well-drawn) hair is clumps: each
  // lock flows from the crown along the head to its cut and ends in a soft point, so the
  // fringe and ends have tips, the surface has strands and the silhouette has texture.
  // The shell underneath guarantees coverage and the clean hairline.
  const rnd = (n) => { const v = Math.sin(n * 91.7 + 13.1) * 43758.5453; return v - Math.floor(v); };
  const outOf = (p) => { const d = p.clone().sub(C); if (p.y < C.y - 0.15 * R) d.y *= 0.25; return d.normalize(); };
  const LP = [], LC = [], LI = [], LT = [];
  // a lock along `pts` (root → tip): half-width w(t), thickness h(t), shade (×colour)
  const lock = (pts, w, h, shade) => {
    const n = pts.length, ring = 6, start = LP.length / 3, b = new THREE.Vector3(), nn = new THREE.Vector3(), tan = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), p = pts[i], o = outOf(p);
      tan.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
      b.crossVectors(tan, o).normalize(); nn.crossVectors(b, tan).normalize();
      for (let k = 0; k < ring; k++) {
        const a = (k / ring) * Math.PI * 2, up = Math.sin(a), q = p.clone().addScaledVector(b, Math.cos(a) * w(t)).addScaledVector(nn, up * h(t) * (up > 0 ? 1 : 0.35));
        LP.push(q.x, q.y, q.z); LT.push(tan.x, tan.y, tan.z);                         // (the strand direction: the highlight runs across it)
        // baked occlusion, as hair artists bake it into the vertices: hair deep in the mass (near the
        // scalp) is darker than hair on the outside, and so is the underside of each lock and its root
        const dq = q.clone().sub(C), depth = THREE.MathUtils.clamp((dq.length() - H.scalp(dq.normalize())) / (R * (S.th + S.vol * 0.5 + 0.08)), 0, 1);
        col.copy(base).multiplyScalar(shade * (0.68 + 0.32 * depth)).lerp(dark, 0.5 * (1 - ss(t, 0, 0.3)) + 0.25 * Math.max(0, -up))
          .lerp(shine, 0.3 * Math.max(0, up) * depth * Math.exp(-((t - 0.38) ** 2) / 0.025));                    // (a little painted shine for the flat styles)
        LC.push(col.r, col.g, col.b);
      }
    }
    for (let i = 0; i < n - 1; i++) for (let k = 0; k < ring; k++) {
      const a = start + i * ring + k, bb = start + i * ring + (k + 1) % ring;
      LI.push(a, a + ring, bb, bb, a + ring, bb + ring);                                // (wound to face out: inward, the outline covered them black)
    }
  };
  // a point along a column, carried on past its cut along the last direction (for tips)
  const along = (col, s) => {
    const Lend = col.L[col.L.length - 1];
    if (s <= Lend) return at(col, s);
    const e = at(col, Lend), d = e.clone().sub(at(col, Lend * 0.97)).normalize();
    return e.addScaledVector(d, s - Lend);
  };
  // hair grows from a crown whorl a little behind the top of the head, not from the very top: each
  // lock flows over the head from the whorl to where its column ends (front hair forward over the
  // top, back hair down), then on down the curtain. Rooted at the pole, every lock met in one point
  // and the top of the head was a pinwheel of outlines.
  // (on the centre line: set off to one side, the locks running down the back crossed in diagonals)
  const whorl = dirAt(Math.PI, S.whorl ?? 0.8);
  const surfAt = (d) => onHead(Math.atan2(d.x, d.z), THREE.MathUtils.clamp(d.y, -0.999, 0.999));
  const flow = (col) => {
    const Lhead = col.L[SAMPLES], onTop = col.end <= Lhead + 1e-6, target = onTop ? at(col, col.end) : col.pts[SAMPLES];
    const q = new THREE.Quaternion().setFromUnitVectors(whorl, target.clone().sub(C).normalize()), id = new THREE.Quaternion(), pts = [];
    for (let i = 0; i <= 60; i++) pts.push(surfAt(whorl.clone().applyQuaternion(id.clone().slerp(q, i / 60))));
    if (!onTop) for (let i = SAMPLES + 1; i < col.pts.length; i++) pts.push(col.pts[i]);
    const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + pts[i].distanceTo(pts[i - 1]));
    return { pts, L, end: onTop ? L[60] : L[60] + (col.end - Lhead) };
  };
  const NL = S.locks ?? 0;
  // Layered as hair artists build cards: the base mass hides the scalp; then big clumps (layer 0);
  // then a top layer over them with a little air between (1); then thin breakup locks (2) so it
  // isn't one width all over. Clumps vary in width; thick and thin together read as hair.
  // As stylized-hair tutorials build it: the silhouette from the base mass, then a FEW big chunky
  // tufts (about 15, each ~2 slots wide and thick), a layer of medium tufts over them, and only a
  // handful of small strands on top. Thirty-odd same-width thin locks a layer read as stripes, with
  // outlines everywhere. Each tuft is an S-curve, not a straight ribbon.
  const LAYER = [{ n: 0.42, w: 2.3, h: 1.6, lift: 0.014, s0: [0.02, 0.05], shade: 0.9, sway: 0.05 },
    { n: 0.3, w: 1.6, h: 1.3, lift: 0.04, s0: [0.1, 0.22], shade: 1, sway: 0.06 },
    { n: 0.22, w: 0.45, h: 0.6, lift: 0.06, s0: [0.22, 0.3], shade: 1.06, sway: 0.08 }];
  // (separate lock geometry is off for straight styles: however it was laid, flat ribbons over a shell
  // read as shards, crossed each other and burst from the crown. The shell itself carries the clumps)
  if (S.lockMesh && NL && !S.curl && !S.extra) for (let layer = 0; layer < 3; layer++) for (let j = 0, nl = Math.round(NL * LAYER[layer].n); j < nl; j++) {
    const Ly = LAYER[layer], th = -Math.PI + ((j + 0.5 * (layer % 2) + 0.35 * rnd(j * 7 + layer)) / nl) * Math.PI * 2, col = flow(column(th)), fw = faceW(th);
    // (no lock starts AT the whorl: all rooted in one point, they left a hole and spikes at the crown)
    const s0 = col.end * Math.max(0.14, Ly.s0[0] + Ly.s0[1] * rnd(j + 3 + layer * 5)), wv = 0.7 + 0.6 * rnd(j * 23 + layer);
    // at a hairline a lock stops just short of it and settles flat; a hanging fringe or the ends of
    // longer hair reach a little past the cut in soft points (locks spilling past a hairline onto
    // the temples and ears, at full thickness, made the edge a ragged ledge)
    const hl = isHairline(th);
    const s1 = hl ? col.end * (0.97 - 0.03 * rnd(j * 3 + layer)) : col.end * (1 - 0.05 * rnd(j * 3 + layer)) + R * (S.tip ?? 0.05) * (0.5 + rnd(j * 11 + layer)) * (0.4 + 0.6 * fw);
    const pts = [], lift = R * (Ly.lift + 0.006 * (j % 3));   // (each a little above its neighbour: at one height they z-fought into stripes)
    // (neighbours sway the same way: alternating, they crossed in Xs)
    const sg = Math.sin(th * 2 + layer) >= 0 ? 1 : -1, sway = R * Ly.sway * 0.7 * (0.6 + 0.8 * rnd(j * 29 + layer)), tn = new THREE.Vector3(), sd = new THREE.Vector3();
    for (let i = 0; i <= 24; i++) {
      const t = i / 24, sAt = s0 + (s1 - s0) * t, p = taper(along(col, sAt), th, Math.min(1, sAt / col.end)), o = outOf(p);
      tn.copy(along(col, sAt + 0.01 * R)).sub(along(col, sAt)).normalize(); sd.crossVectors(tn, o).normalize();
      // an S: out to one side through the middle, back across toward the tip (none at a hairline's end)
      const S2 = (Math.sin(Math.PI * t) * 0.75 + 0.25 * Math.sin(2 * Math.PI * t)) * (hl ? 1 - ss(t, 0.6, 1) : 1);
      pts.push(p.addScaledVector(o, lift * (hl ? 1 - ss(t, 0.45, 1) : 1 - 0.5 * t)).addScaledVector(sd, sg * sway * S2));
    }
    const ring = (p) => Math.hypot(p.x - C.x, p.z - C.z);
    const spacing = (i) => (2 * Math.PI * ring(pts[i])) / NL;
    lock(pts, (t) => spacing(Math.round(t * 24)) * (S.lockW ?? 0.85) * Ly.w * wv * ss(t, 0, 0.18) * (1 - 0.85 * ss(t, 0.62, 1)),
      (t) => R * (S.lockH ?? 0.035) * Ly.h * ss(t, 0, 0.18) * (1 - 0.6 * t) * (hl ? 1 - 0.9 * ss(t, 0.45, 1) : 1), Ly.shade * (0.93 + 0.14 * rnd(j * 13 + layer)));
  }
  // (no separate transition locks along hairlines: drawn short and thin they made a zigzag at the nape;
  // the shell's taper is the soft edge)
  // flyaways: a few single strands lifting off the mass, the last layer; they break the perfect
  // outline (none on very short hair)
  if (NL && (S.curtain || S.extra) && !S.curl) for (let j = 0; j < 9; j++) {
    const th = -Math.PI + rnd(j * 41 + 7) * Math.PI * 2, col = column(th), s0 = col.end * (0.15 + 0.4 * rnd(j * 43)), len = R * (0.35 + 0.35 * rnd(j * 47)), pts = [];
    const side = (rnd(j * 53) - 0.5) * 2;
    for (let i = 0; i <= 16; i++) {
      const t = i / 16, p = along(col, Math.min(col.end, s0 + len * t)), o = outOf(p);
      const sideways = new THREE.Vector3(Math.cos(th), 0, -Math.sin(th));
      pts.push(p.addScaledVector(o, R * (0.03 + 0.14 * t * t)).addScaledVector(sideways, R * 0.08 * side * t * t));
    }
    lock(pts, (t) => R * 0.007 * (1 - 0.7 * t), (t) => R * 0.006, 1.05);
  }
  // pulled back (ponytail, bun): locks from the hairline over the head to the tie
  const tieDir = S.extra === 'bun' ? dirAt(Math.PI, 0.5) : S.extra === 'ponytail' ? dirAt(Math.PI, 0.3) : null;
  if (tieDir) for (let j = 0; j < 36; j++) {
    const th = -Math.PI + ((j + 0.5) / 36) * Math.PI * 2, col = column(th), start = at(col, col.end), d0 = start.clone().sub(C).normalize();
    const pts = [], q = new THREE.Quaternion().setFromUnitVectors(d0, tieDir), id = new THREE.Quaternion();
    for (let i = 0; i <= 20; i++) {
      const t = i / 20, d = d0.clone().applyQuaternion(id.clone().slerp(q, t));
      pts.push(d.clone().multiplyScalar(H.scalp(d) + R * (S.th + 0.01)).add(C));
    }
    const sp = (2 * Math.PI * Math.hypot(start.x - C.x, start.z - C.z)) / 36;
    lock(pts, (t) => sp * 0.85 * (0.5 + 0.5 * ss(t, 0, 0.1)) * (1 - 0.55 * t), (t) => R * 0.022 * (1 - 0.5 * t) * ss(t, 0, 0.2), 0.92 + 0.16 * rnd(j));   // (rising out of the hairline, not a step)
  }
  // …and over the crown, from the top of the head back to the tie (the mass showed through there)
  if (tieDir) for (let j = 0; j < 18; j++) {
    const d0 = dirAt(-1.5 + 3.0 * (j / 17), 0.8 + 0.12 * rnd(j * 3)), q = new THREE.Quaternion().setFromUnitVectors(d0, tieDir), id = new THREE.Quaternion(), pts = [];
    for (let i = 0; i <= 16; i++) { const d = d0.clone().applyQuaternion(id.clone().slerp(q, i / 16)); pts.push(d.clone().multiplyScalar(H.scalp(d) + R * (S.th + 0.018)).add(C)); }
    lock(pts, (t) => R * 0.12 * (0.4 + 0.6 * ss(t, 0, 0.25)) * (1 - 0.5 * t), (t) => R * 0.018 * ss(t, 0, 0.25), 0.96 + 0.1 * rnd(j));
  }
  // curls: ringlets, locks that coil round their own path from the crown to the ends. (A
  // cloud of same-size balls, each outlined, read as bubble wrap on a bob.) Coils carry a
  // little further out than the mass, so the silhouette is springy, not a smooth helmet.
  // curls as a drawing guide draws them: C-shaped curls, each a chunky spiral of about one and a
  // quarter turns, in three sizes, laid over the mass in layers so the outline is a cloud of round
  // curls. (Many tight coils down every column read as rope.)
  if (S.curl && S.curlTubes) {
    const sizes = [{ n: 22, r: 0.36, th: 0.22, u: 0.78 }, { n: 26, r: 0.3, th: 0.19, u: 0.5 }, { n: 22, r: 0.25, th: 0.16, u: 0.22 }];   // (sized to the head: at a fifth of this they were beads)
    sizes.forEach((Z, layer) => { for (let j = 0; j < Z.n; j++) {
      const th = -Math.PI + ((j + 0.37 * layer + 0.3 * rnd(j * 7 + layer)) / Z.n) * Math.PI * 2, col = flow(column(th)), fw = faceW(th);
      // where along the hair this curl sits: the big ones low (the silhouette's bulk), small ones higher up
      const u = THREE.MathUtils.clamp(Z.u + (rnd(j * 3 + layer * 7) - 0.5) * 0.3, 0.06, 1.0);
      const sc = col.end * u + (fw > 0.3 ? 0.03 * R : 0), cen = along(col, sc), o = outOf(cen);
      const tan = along(col, sc + 0.01 * R).sub(cen).normalize(), side = new THREE.Vector3().crossVectors(tan, o).normalize();
      const rr = R * Z.r * (0.85 + 0.3 * rnd(j * 11 + layer)), turns = 1.25, dir = rnd(j * 17 + layer) > 0.5 ? 1 : -1, a0 = rnd(j * 13 + layer) * 6.28;
      const pts = [];
      for (let i = 0; i <= 40; i++) {
        const t = i / 40, a = a0 + dir * t * turns * Math.PI * 2, r = rr * (1 - 0.35 * t);   // spiralling in a little
        // the curl's ring stands out from the head (in the plane of the hair's flow and the outward
        // direction), drifting down the hair as it turns: a C seen from the side, a ring from outside
        pts.push(cen.clone().addScaledVector(o, R * (0.05 + 0.03 * layer) + r * (0.55 + 0.45 * Math.sin(a))).addScaledVector(tan, r * Math.cos(a) * 0.9 + rr * 0.5 * t).addScaledVector(side, r * 0.35 * Math.sin(a * 0.5)));
      }
      const thick = R * Z.th * (0.85 + 0.3 * rnd(j * 19 + layer));
      // (both ends closed to a point: an open tube end showed the outline inside it, black specks)
      const close = (t) => ss(t, 0, 0.08) * (1 - 0.96 * ss(t, 0.62, 1));
      lock(pts, (t) => thick * (0.25 + 0.75 * close(t)), (t) => thick * 0.85 * (0.2 + 0.8 * close(t)), 0.9 + 0.2 * rnd(j * 23 + layer));
    } });
  }



  // extras: a ponytail or a bun, gathered at the back of the head
  const tailMat = paint(base.getHex(), { soft: true, hatch: 0.3 });
  const tie = paint(0x2a2228, { hatch: 0 });
  if (S.extra === 'ponytail') {
    const at0 = onHead(Math.PI, 0.3), out = at0.clone().sub(C).setY(0).normalize();
    const curve = new THREE.CatmullRomCurve3([at0, at0.clone().addScaledVector(out, 0.35 * R).add(new THREE.Vector3(0, -0.15 * R, 0)),
      at0.clone().addScaledVector(out, 0.42 * R).add(new THREE.Vector3(0, -0.9 * R, 0)), at0.clone().addScaledVector(out, 0.3 * R).add(new THREE.Vector3(0, -1.7 * R, 0))]);
    const tg = new THREE.TubeGeometry(curve, 40, 1, 14, false), tp = tg.attributes.position, q = new THREE.Vector3(), cc = new THREE.Vector3();
    for (let i = 0; i < tp.count; i++) {                                                 // tapers from the tie to a soft point, with strand ridges
      const t = Math.floor(i / 15) / 40, a = (i % 15) / 14 * Math.PI * 2;
      curve.getPointAt(Math.min(1, t), cc);
      const rad = R * (0.2 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.17 * ss(t, 0.55, 1)) * (1 + 0.04 * Math.sin(a * 7));   // full, then a soft point
      q.fromBufferAttribute(tp, i).sub(cc).normalize().multiplyScalar(rad).add(cc); tp.setXYZ(i, q.x, q.y, q.z);
    }
    tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg, tailMat));
    // the tail is locks too, twisting a little round it and tapering to points
    for (let k = 0; k < 11; k++) {
      const a0 = (k / 11) * Math.PI * 2, pts = [], radAt = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, cc2 = curve.getPointAt(Math.min(1, t * (0.96 + 0.06 * rnd(k))));
        const tg2 = curve.getTangentAt(Math.min(1, t)), side = new THREE.Vector3().crossVectors(tg2, new THREE.Vector3(1, 0, 0)).normalize(), up2 = new THREE.Vector3().crossVectors(side, tg2).normalize();
        const rr = R * (0.2 + 0.1 * Math.sin(Math.PI * Math.min(1, t * 1.6)) - 0.17 * ss(t, 0.55, 1)), a = a0 + t * 0.8;
        pts.push(cc2.clone().addScaledVector(side, Math.cos(a) * rr * 0.75).addScaledVector(up2, Math.sin(a) * rr * 0.75)); radAt.push(rr);
      }
      lock(pts, (t) => radAt[Math.round(t * 24)] * 0.5 + 0.004 * R, (t) => radAt[Math.round(t * 24)] * 0.35, 0.9 + 0.2 * rnd(k * 3));
    }
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.17 * R, 0.035 * R, 8, 20), tie);
    band.position.copy(curve.getPointAt(0.03)); band.lookAt(curve.getPointAt(0.08)); g.add(band);
  }
  if (S.extra === 'bun') {
    const d = dirAt(Math.PI, 0.5), p = d.clone().multiplyScalar(H.scalp(d) + 0.3 * R).add(C);
    const bg = new THREE.SphereGeometry(0.4 * R, 24, 18), bp = bg.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < bp.count; i++) {                                                 // a twisted knot, not a ball
      v.fromBufferAttribute(bp, i); const a = Math.atan2(v.x, v.z) + v.y / R * 5;
      v.multiplyScalar(1 + 0.07 * Math.sin(a * 6)); v.y *= 0.8; bp.setXYZ(i, v.x, v.y, v.z);
    }
    bg.computeVertexNormals();
    const bun = new THREE.Mesh(bg, tailMat); bun.position.copy(p); bun.lookAt(C); g.add(bun);
  }
  if (LP.length) {
    const lg = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.Float32BufferAttribute(LP, 3));
    lg.setAttribute('color', new THREE.Float32BufferAttribute(LC, 3));
    lg.setAttribute('hairDir', new THREE.Float32BufferAttribute(LT, 3));
    lg.setIndex(LI); lg.computeVertexNormals();
    // the locks are drawn without outlines of their own: inked one by one, every lock edge became a
    // black line and the hair read as broken shards. The shell carries the silhouette's line; curls
    // keep theirs (each curl is a shape to read)
    const lm = new THREE.Mesh(lg, paint(0xffffff, { vertexColors: true, soft: true, hatch: 0.25 })); if (!S.curl) lm.userData.noInk = true; g.add(lm);
    shell.geometry.attributes.color.array.forEach((x, i, a) => { a[i] = x * 0.82; });   // the mass beneath is in the locks' shade
  }
  return g;
}
