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
  buzz:     { label: 'Buzz', th: 0.05, vol: 0.0, fringe: [0.64, 0], face: 1.05, side: 0.1, back: -0.8, taper: true },
  crop:     { label: 'Crop', th: 0.08, vol: 0.12, fringe: [0.5, 0.08], face: 1.0, side: 0.05, back: -0.8, texture: 0.6, taper: true, locks: 32, lockW: 1.05, lockH: 0.03, tip: 0.04 },
  pixie:    { label: 'Pixie', th: 0.09, vol: 0.16, fringe: [0.3, 0.3], face: 0.95, side: -0.22, back: -0.82, texture: 0.8, taper: true, locks: 34, lockW: 1.05, lockH: 0.04, tip: 0.09 },
  bob:      { label: 'Bob', th: 0.08, vol: 0.14, fringe: [0.3, 0.3], face: 0.92, curtain: { cut: 1.0, aline: 0.2, bell: 0.1, tuck: 0.06 }, locks: 36, lockW: 1.05, tip: 0.05 },
  lob:      { label: 'Long bob', th: 0.08, vol: 0.14, fringe: [0.55, 0.15], face: 0.88, curtain: { cut: 1.45, aline: 0.1, bell: 0.08, tuck: 0.03 }, locks: 40, lockW: 1.05, tip: 0.07 },
  ponytail: { label: 'Ponytail', th: 0.06, vol: 0.06, fringe: [0.6, 0], face: 1.0, side: -0.3, back: -0.75, extra: 'ponytail', taper: true },
  bun:      { label: 'Bun', th: 0.06, vol: 0.06, fringe: [0.6, 0], face: 1.0, side: -0.3, back: -0.75, extra: 'bun', taper: true },
  curly:    { label: 'Curls', th: 0.24, vol: 0.2, fringe: [0.5, 0.06], face: 0.98, curtain: { cut: 0.5, aline: 0.12, bell: 0.2, tuck: 0.12 }, curl: 0.04 },
};

const ss = THREE.MathUtils.smoothstep;
const dirAt = (th, e) => { const c = Math.sqrt(Math.max(0, 1 - e * e)); return new THREE.Vector3(Math.sin(th) * c, e, Math.cos(th) * c); };

export function makeHair(H, { chin }, styleName, colour) {
  const S = HAIRSTYLES[styleName] ?? HAIRSTYLES.bob, { C, R } = H, g = new THREE.Group();
  const NT = 112, NR = 44, SAMPLES = 120;
  const base = new THREE.Color(colour), dark = base.clone().multiplyScalar(0.68), shine = base.clone().lerp(new THREE.Color(0xfff3dc), 0.4);
  // strand grooves round the head. Whole-number frequencies (so the seam at the back
  // meets) and well under the grid's limit (NT/2 waves): finer grooves alias into
  // zig-zag slivers whose flipped faces let the outline show through as black holes
  const strand = (th) => 0.6 * Math.sin(th * 14 + 1.5 * Math.sin(th * 5)) + 0.4 * Math.sin(th * 23 + 1.3);
  // curls: soft lumps a few centimetres across (again, coarse enough for the grid to carry)
  const curlN = (p) => S.curl ? S.curl * R * (Math.sin(p.x * 9 / R) * Math.sin(p.y * 8 / R + 1) * Math.sin(p.z * 7.5 / R + 2) * 0.7
    + 0.3 * Math.sin(p.x * 15 / R + p.z * 13 / R) * Math.sin(p.y * 14 / R)) : 0;
  // the hair's outer surface over the head at (θ, e): scalp + thickness + crown volume + strand grooves
  const onHead = (th, e) => {
    const d = dirAt(th, e), r = H.scalp(d) + R * (S.th + S.vol * Math.max(0, e) ** 2 + 0.012 * (S.texture ?? 1) * strand(th) * ss(e, -0.6, 0.2));
    const p = d.clone().multiplyScalar(r).add(C); return p.addScaledVector(d, curlN(p));   // (clone: multiplyScalar mutates d)
  };
  const faceW = (th) => 1 - ss(Math.abs(th), S.face, S.face + 0.32);                   // 1 across the face … 0 behind the temples
  const fringeE = (th) => S.fringe[0] + S.fringe[1] * Math.sin(th);                     // a side-swept fringe (a clean line: "choppy" read as messy)
  // where short hair ends, all the way round: across the forehead, a little higher at the
  // temples, straight DOWN in front of the ear as a sideburn, up and over the ear, then down
  // behind it to the nape. (Blending the fringe straight into the side length cut a diagonal
  // across the temple and left it bald.)
  const hairline = (th) => {
    const a = Math.abs(th), f = fringeE(th), ear = S.side, burn = S.burn ?? THREE.MathUtils.clamp(ear - 0.12, -0.14, -0.02);
    // (over the ear it arches round the top of it, not a flat ledge)
    const K = [[0, f], [0.62, f + 0.02], [0.86, f + 0.06], [1.06, burn], [1.2, burn], [1.4, ear + 0.04], [1.62, ear + 0.1], [1.9, ear + 0.03], [2.45, ear + (S.back - ear) * 0.65], [Math.PI, S.back]];
    let k = 1; while (k < K.length - 1 && K[k][0] < a) k++;
    const [a0, e0] = K[k - 1], [a1, e1] = K[k];
    return e0 + (e1 - e0) * ss(a, a0, a1);
  };
  const back = (th) => (1 - Math.cos(th)) / 2;                                          // 0 front … 1 back

  // one column: the path from the crown down, as points, and where it ends (index)
  const column = (th) => {
    const pts = [], hang = !!S.curtain;
    // on the head: from the crown down to ear level (curtains) or to this column's end
    const endE = hang ? -0.08 : hairline(th);
    for (let i = 0; i <= SAMPLES; i++) {
      const e = 1 - (1 - endE) * (i / SAMPLES);
      pts.push(onHead(th, Math.min(0.999, e)));
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
  const at = (col, s) => {                                                              // point at arclength s along a column
    const { pts, L } = col; let i = 1; while (i < L.length - 1 && L[i] < s) i++;
    return pts[i - 1].clone().lerp(pts[i], THREE.MathUtils.clamp((s - L[i - 1]) / ((L[i] - L[i - 1]) || 1), 0, 1));
  };

  // the grid (plus a lip row along the cut, turned in toward the head)
  const P = [], Cc = [], idx = [], c = new THREE.Color();
  const cols = [];
  for (let j = 0; j < NT; j++) cols.push(column(-Math.PI + (j / NT) * Math.PI * 2));
  for (let j = 0; j < NT; j++) {
    const th = -Math.PI + (j / NT) * Math.PI * 2, col = cols[j], len = col.end;
    for (let i = 0; i <= NR; i++) {
      const u = i / NR, p = at(col, len * u);
      if (S.taper) {                                                                    // short hair thins out to the hairline at the sides and nape
        // (to just OFF the skin: flush with it, the two z-fought into a ragged hairline)
        const d = p.clone().sub(C), r0 = H.scalp(d.clone().normalize()) + 0.025 * R, k = ss(u, 0.55, 1);
        p.copy(C).addScaledVector(d, THREE.MathUtils.lerp(d.length(), r0, k * 0.85) / d.length());
      }
      P.push(p.x, p.y, p.z);
      const e = (p.y - C.y) / R, r = strand(th);
      c.copy(base).lerp(dark, 0.32 * Math.max(0, -r) + 0.25 * (1 - ss(u, 0, 0.12)))     // grooves, darker at the roots
        .lerp(shine, 0.55 * Math.exp(-((e - 0.5) ** 2) / 0.02) * THREE.MathUtils.clamp(0.4 + 0.6 * r, 0, 1));
      Cc.push(c.r, c.g, c.b);
    }
    const last = at(col, len), prev = at(col, len * 0.97), inward = C.clone().sub(last).setY(0).normalize();
    const lip = last.clone().addScaledVector(inward, S.th * R * 0.9).add(prev.clone().sub(last).multiplyScalar(0.6));
    P.push(lip.x, lip.y, lip.z); c.copy(dark); Cc.push(c.r, c.g, c.b);
  }
  const row = NR + 2;
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
  const LP = [], LC = [], LI = [];
  // a lock along `pts` (root → tip): half-width w(t), thickness h(t), shade (×colour)
  const lock = (pts, w, h, shade) => {
    const n = pts.length, ring = 6, start = LP.length / 3, b = new THREE.Vector3(), nn = new THREE.Vector3(), tan = new THREE.Vector3(), col = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), p = pts[i], o = outOf(p);
      tan.copy(pts[Math.min(n - 1, i + 1)]).sub(pts[Math.max(0, i - 1)]).normalize();
      b.crossVectors(tan, o).normalize(); nn.crossVectors(b, tan).normalize();
      for (let k = 0; k < ring; k++) {
        const a = (k / ring) * Math.PI * 2, up = Math.sin(a), q = p.clone().addScaledVector(b, Math.cos(a) * w(t)).addScaledVector(nn, up * h(t) * (up > 0 ? 1 : 0.35));
        LP.push(q.x, q.y, q.z);
        col.copy(base).multiplyScalar(shade).lerp(dark, 0.55 * (1 - ss(t, 0, 0.3)) + 0.25 * Math.max(0, -up))   // dark at the root and underneath
          .lerp(shine, 0.45 * Math.max(0, up) * Math.exp(-((t - 0.38) ** 2) / 0.025));                           // a band of shine across the crown
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
  const NL = S.locks ?? 0;
  if (NL && !S.curl && !S.extra) for (const layer of [0, 1]) for (let j = 0; j < NL; j++) {
    const th = -Math.PI + ((j + 0.5 * layer + 0.3 * rnd(j * 7 + layer)) / NL) * Math.PI * 2, col = column(th), fw = faceW(th);
    const s0 = col.end * (layer ? 0.28 + 0.2 * rnd(j + 3) : 0.02 + 0.06 * rnd(j + 5));
    const s1 = col.end * (1 - 0.05 * rnd(j * 3 + layer)) + R * (S.tip ?? 0.05) * (0.5 + rnd(j * 11 + layer)) * (0.4 + 0.6 * fw);   // the fringe's points reach a little past the cut
    const pts = [], lift = R * (0.012 + 0.016 * layer + 0.006 * (j % 3));   // (each a little above its neighbour: at one height they z-fought into stripes)
    for (let i = 0; i <= 24; i++) { const p = along(col, s0 + (s1 - s0) * (i / 24)); pts.push(p.addScaledVector(outOf(p), lift * (1 - 0.5 * (i / 24)))); }
    const ring = (p) => Math.hypot(p.x - C.x, p.z - C.z);
    const spacing = (i) => (2 * Math.PI * ring(pts[i])) / NL;
    lock(pts, (t) => spacing(Math.round(t * 24)) * (S.lockW ?? 0.85) * (0.35 + 0.65 * ss(t, 0, 0.12)) * (1 - 0.85 * ss(t, 0.62, 1)),
      (t) => R * (S.lockH ?? 0.035) * (1 - 0.6 * t), 0.9 + 0.2 * rnd(j * 13 + layer));
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
    lock(pts, (t) => sp * 0.85 * (0.5 + 0.5 * ss(t, 0, 0.1)) * (1 - 0.55 * t), (t) => R * 0.022 * (1 - 0.5 * t), 0.92 + 0.16 * rnd(j));
  }
  // curls: a cloud of rounded curls over the whole mass, not a lumpy bob
  if (S.curl) {
    const ico = new THREE.IcosahedronGeometry(1, 2), IP = ico.attributes.position, v = new THREE.Vector3(), col = new THREE.Color();
    let n = 0;
    for (let j = 0; j < 40; j++) {
      const th = -Math.PI + ((j + 0.5) / 40) * Math.PI * 2, cl = column(th);
      for (let sIdx = 0, s1 = 0.03 * cl.end; s1 < cl.end * 1.02; sIdx++, s1 += R * (0.17 + 0.04 * rnd(j * 5 + sIdx))) {
        const p = along(cl, s1), o = outOf(p), rp = R * (0.15 + 0.05 * rnd(j * 17 + sIdx)) * (s1 < 0.15 * cl.end ? 0.8 : 1);
        const cen = p.clone().addScaledVector(o, R * 0.03 + rp * 0.2), shade = 0.88 + 0.24 * rnd(j * 31 + sIdx), start = LP.length / 3;
        for (let i = 0; i < IP.count; i++) {
          v.fromBufferAttribute(IP, i); const up = v.dot(o);
          const q = cen.clone().addScaledVector(v, rp * (1 + 0.08 * Math.sin(v.x * 9 + v.y * 7 + n)));
          LP.push(q.x, q.y, q.z);
          col.copy(base).multiplyScalar(shade).lerp(dark, 0.45 * Math.max(0, -up)).lerp(shine, 0.3 * Math.max(0, up) ** 3); LC.push(col.r, col.g, col.b);
        }
        const ix = ico.index ? ico.index.array : Array.from({ length: IP.count }, (_, i) => i);
        for (const i of ix) LI.push(start + i);
        n++;
      }
    }
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
    lg.setIndex(LI); lg.computeVertexNormals();
    g.add(new THREE.Mesh(lg, paint(0xffffff, { vertexColors: true, soft: true, hatch: 0.25 })));
    shell.geometry.attributes.color.array.forEach((x, i, a) => { a[i] = x * 0.82; });   // the mass beneath is in the locks' shade
  }
  return g;
}
