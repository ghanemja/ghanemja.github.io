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
  crop:     { label: 'Crop', th: 0.09, vol: 0.12, fringe: [0.5, 0.08], face: 1.0, side: 0.05, back: -0.8, texture: 0.6, taper: true },
  pixie:    { label: 'Pixie', th: 0.11, vol: 0.16, fringe: [0.3, 0.3], face: 0.95, side: -0.22, back: -0.82, texture: 0.8, taper: true },
  bob:      { label: 'Bob', th: 0.1, vol: 0.14, fringe: [0.3, 0.3], face: 0.92, curtain: { cut: 1.0, aline: 0.2, bell: 0.1, tuck: 0.06 } },
  lob:      { label: 'Long bob', th: 0.1, vol: 0.14, fringe: [0.55, 0.15], face: 0.88, curtain: { cut: 1.45, aline: 0.1, bell: 0.08, tuck: 0.03 } },
  ponytail: { label: 'Ponytail', th: 0.06, vol: 0.06, fringe: [0.6, 0], face: 1.0, side: -0.3, back: -0.75, extra: 'ponytail', taper: true },
  bun:      { label: 'Bun', th: 0.06, vol: 0.06, fringe: [0.6, 0], face: 1.0, side: -0.3, back: -0.75, extra: 'bun', taper: true },
  curly:    { label: 'Curls', th: 0.26, vol: 0.18, fringe: [0.45, 0.1], face: 0.95, curtain: { cut: 0.55, aline: 0.1, bell: 0.22, tuck: 0.1 }, curl: 0.07 },
};

const ss = THREE.MathUtils.smoothstep;
const dirAt = (th, e) => { const c = Math.sqrt(Math.max(0, 1 - e * e)); return new THREE.Vector3(Math.sin(th) * c, e, Math.cos(th) * c); };
const hash = (x) => { const s = Math.sin(x * 127.1) * 43758.5453; return s - Math.floor(s); };

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
  const fringeE = (th) => S.fringe[0] + S.fringe[1] * Math.sin(th) + 0.012 * Math.sin(th * 17);   // a side-swept fringe, a little choppy
  const back = (th) => (1 - Math.cos(th)) / 2;                                          // 0 front … 1 back

  // one column: the path from the crown down, as points, and where it ends (index)
  const column = (th) => {
    const pts = [], hang = !!S.curtain;
    // on the head: from the crown down to ear level (curtains) or to this column's end
    const endE = hang ? -0.08 : THREE.MathUtils.lerp(S.side, S.back, ss(back(th), 0.5, 1));
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
    const end = THREE.MathUtils.lerp(L[L.length - 1], L[Math.max(1, fi)], faceW(th));
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
    const th = -Math.PI + (j / NT) * Math.PI * 2, col = cols[j], len = col.end * (1 - 0.03 * hash(j) * (S.curtain ? 1 : 0));   // a slightly uneven cut
    for (let i = 0; i <= NR; i++) {
      const u = i / NR, p = at(col, len * u);
      if (S.taper) {                                                                    // short hair thins out to the hairline at the sides and nape
        const d = p.clone().sub(C), r0 = H.radius(d.clone().normalize()) * 1.004, k = (1 - faceW(th)) * ss(u, 0.6, 1);
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

  // extras: a ponytail or a bun, gathered at the back of the head
  const tailMat = paint(base.getHex(), { soft: true, hatch: 0.3 });
  const tie = paint(0x2a2228, { hatch: 0 });
  if (S.extra === 'ponytail') {
    const at0 = onHead(Math.PI, 0.12), out = at0.clone().sub(C).setY(0).normalize();
    const curve = new THREE.CatmullRomCurve3([at0, at0.clone().addScaledVector(out, 0.35 * R).add(new THREE.Vector3(0, -0.15 * R, 0)),
      at0.clone().addScaledVector(out, 0.42 * R).add(new THREE.Vector3(0, -0.9 * R, 0)), at0.clone().addScaledVector(out, 0.3 * R).add(new THREE.Vector3(0, -1.7 * R, 0))]);
    const tg = new THREE.TubeGeometry(curve, 40, 1, 14, false), tp = tg.attributes.position, q = new THREE.Vector3(), cc = new THREE.Vector3();
    for (let i = 0; i < tp.count; i++) {                                                 // tapers from the tie to a soft point, with strand ridges
      const t = Math.floor(i / 15) / 40, a = (i % 15) / 14 * Math.PI * 2;
      curve.getPointAt(Math.min(1, t), cc);
      const rad = R * (0.2 * (1 - t * 0.75) + 0.05 * Math.sin(Math.PI * Math.min(1, t * 3))) * (1 + 0.06 * Math.sin(a * 9));
      q.fromBufferAttribute(tp, i).sub(cc).normalize().multiplyScalar(rad).add(cc); tp.setXYZ(i, q.x, q.y, q.z);
    }
    tg.computeVertexNormals();
    g.add(new THREE.Mesh(tg, tailMat));
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
  return g;
}
