// ─── dressing for the hookpath room: the blocking room ───
// default export: (kit) => void. See dressKit() in ../interiors.js for what the kit holds.
// A little film stage for crochet tutorials: lighting trusses with spotlights that pan the
// stage, softboxes, a boom mic, a keyframe timeline on the wall with a running playhead, a
// storyboard, a rack of hooks, a blocking board of pinned swatches, a giant hook leaning in
// the corner, a yarn basket whose strand runs to the hook's plinth, and a director's chair.
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export default function dress(kit) {
  const { THREE, put, paint, rb, tap, live, block, claim, texMat, canvasTex, HAND, SCRIPT, INKC, D, g: G, shadow } = kit;
  const sub = kit.kit;
  const BACK = -D + 0.5;
  const PI = Math.PI;

  // ── static pieces batched per material, merged into one mesh each ──
  const bag = new Map();
  const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();
  const S = (geo, mat, x = 0, y = 0, z = 0, rot, sc) => {
    const gg = geo.index ? geo.toNonIndexed() : geo.clone();
    _e.set(rot?.[0] || 0, rot?.[1] || 0, rot?.[2] || 0);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e), sc ? _s.set(sc[0], sc[1], sc[2]) : _s.set(1, 1, 1));
    gg.applyMatrix4(_m);
    for (const k of Object.keys(gg.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') gg.deleteAttribute(k);
    if (!bag.has(mat)) bag.set(mat, []);
    bag.get(mat).push(gg);
  };
  const SB = (w, h, d, mat, x, y, z, r = 0.015, rot) => S(rb(w, h, d, r), mat, x, y, z, rot);
  // a rod between two points
  const rod = (a, b, r, mat, seg = 8) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    const eu = new THREE.Euler().setFromQuaternion(q);
    S(new THREE.CylinderGeometry(r, r, len, seg), mat, (A.x + B.x) / 2, (A.y + B.y) / 2, (A.z + B.z) / 2, [eu.x, eu.y, eu.z]);
  };
  const bake = () => { for (const [mat, list] of bag) put(mergeGeometries(list), mat); bag.clear(); };

  const M = {
    dark: paint(0x2a2230, { hatch: 0 }), steel: paint(0x8a93a6), alu: paint(0xc9ced8), blue: paint(0x2f5ea8), blueL: paint(0x7ea6ec),
    orange: paint(0xf0862a), cream: paint(0xf6eedb), wood: paint(0x8a6448), woodL: paint(0xc8a47c), red: paint(0xe8604c),
    lilac: paint(0x8f7ae8), teal: paint(0x7fb3a8), gold: paint(0xe4b84f), pink: paint(0xef8fa8), canvas: paint(0x3f4a5c),
  };
  const font = (c, px, f = HAND, wt = 700) => { c.font = `${wt} ${px}px ${f}`; };
  const poster = (w, h, px, draw, x, y, z, face, { board = 0x2a2230, thick = 0.02 } = {}) => {
    const ry = face === 'left' ? PI / 2 : face === 'right' ? -PI / 2 : 0;
    const nx = face === 'left' ? 1 : face === 'right' ? -1 : 0, nz = face === 'back' ? 1 : 0;
    const pic = kit.flat(w, h, texMat(px, Math.round(px * h / w), draw), x + nx * (thick / 2 + 0.003), y, z + nz * (thick / 2 + 0.003), [0, ry, 0]);
    pic.renderOrder = 2;
    SB(face === 'back' ? w + 0.04 : thick, h + 0.04, face === 'back' ? thick : w + 0.04, paint(board, { hatch: 0 }), x, y, z, 0.006);
    return pic;
  };
  const toWorld = (v) => G.localToWorld(v);
  const ease = (x) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  // ── the room's big trick: scrub the take. u (0..1) is the playhead; six keyframes at u = i/5 ──
  const scrub = { u: 0, from: 0, to: 0, t0: -99, dur: 1, vis: 0, lastKey: 0 };
  const KEYN = ['Insert hook', 'Poke through', 'Yarn over', 'Pull up a loop', 'Yarn over', 'Pull through both'];
  const actorPos = new THREE.Vector3(-3.04, 0.16, -0.22);
  const REC = { on: true }, FX = {};

  // ════════ 1. lighting trusses along the tops of the side walls, spotlights panning the stage ════════
  const cans = [];
  let cue = -99;
  for (const s of [-1, 1]) {
    const x = s * 3.72, za = -5.25, zb = -0.7, y0 = 2.6, y1 = 2.44;
    for (const y of [y0, y1]) for (const dx of [-0.06, 0.06]) rod([x + dx, y, za], [x + dx, y, zb], 0.014, M.alu, 6);
    for (let k = 0, z = za; z < zb - 0.01; k++, z += 0.25) {
      const z2 = Math.min(zb, z + 0.25);
      for (const dx of [-0.06, 0.06]) rod([x + dx, k % 2 ? y0 : y1, z], [x + dx, k % 2 ? y1 : y0, z2], 0.007, M.alu, 4);
    }
    for (const z of [za + 0.1, zb - 0.1]) SB(0.28, 0.05, 0.05, M.dark, s * 3.86, 2.52, z, 0.01);       // wall brackets
    [-4.5, -3.0, -1.5].forEach((z, i) => {
      SB(0.04, 0.08, 0.04, M.dark, x, y1 - 0.05, z, 0.008);
      const yoke = new THREE.Group(); yoke.position.set(x, y1 - 0.14, z); G.add(yoke);       // swivels at its clamp
      const Y = sub(yoke);
      Y.put(new THREE.CylinderGeometry(0.075, 0.06, 0.22, 14), M.dark, 0, 0, 0, [PI / 2, 0, 0]);
      Y.put(new THREE.TorusGeometry(0.075, 0.012, 6, 16), M.dark, 0, 0, 0.11);
      const lens = Y.put(new THREE.CircleGeometry(0.065, 16), paint(0xfff2c0, { emissive: 0xffe08a, hatch: 0, unique: true }), 0, 0, 0.112);
      lens.userData.noInk = true;
      const beamM = new THREE.MeshBasicMaterial({ color: 0xfff0c0, transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const beam = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.4, 20, 1, true).translate(0, -1.2, 0).rotateX(-PI / 2), beamM);
      beam.position.z = 0.11; beam.userData.noInk = true; yoke.add(beam);
      cans.push({ yoke, beamM, lens, ph: i * 2.1 + (s > 0 ? 1 : 0), side: s, aim: new THREE.Vector3() });
    });
  }
  {
    const T = new THREE.Vector3(), stage = new THREE.Vector3(-2.2, 0.75, -2.5);
    live((t) => {
      const k = t - cue, f = k < 4 ? Math.min(1, k / 0.6) : Math.max(0, 1 - (k - 4) / 0.8);
      for (const c of cans) {
        T.set(c.side * 0.8 + Math.sin(t * 0.23 + c.ph) * 1.6, 0, -2.8 + Math.cos(t * 0.17 + c.ph * 1.3) * 1.4);
        c.aim.copy(T).lerp(stage, f * f * (3 - 2 * f)).lerp(actorPos, scrub.vis);     // during a take they follow the actor
        c.yoke.lookAt(toWorld(T.copy(c.aim)));
        c.beamM.opacity = 0.07 + f * 0.13;
      }
    });
    // tapping either truss cues every spot onto the hook
    for (const c of cans) tap(c.yoke, 'cue the spotlights', (sfx) => { cue = kit.now(); sfx([[392, 0.1], [523, 0.1], [659, 0.1], [784, 0.3]], 'triangle', 0.05); });
  }

  // ════════ 2. the keyframe timeline along the left wall, a playhead running over it ════════
  {
    const za = -4.85, zb = -1.0, L = zb - za, y = 1.22, keys = [0.02, 0.1, 0.21, 0.3, 0.42, 0.5, 0.58, 0.7, 0.82, 0.9, 0.98];
    poster(L, 0.36, 1024, (c, w, h) => {
      c.fillStyle = '#eef1f5'; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#c3ccd8'; c.lineWidth = 2; c.strokeRect(1, 1, w - 2, h - 2);
      font(c, 16, HAND, 400); c.fillStyle = '#5a6478';
      for (let s = 0; s <= 13; s++) { const x = 8 + s * (w - 16) / 13; c.fillRect(x, 0, 2, 16); c.fillText(s + 's', x + 4, 30); for (let k = 1; k < 4; k++) c.fillRect(x + k * (w - 16) / 52, 0, 1, 8); }
      c.fillStyle = '#dfe5ee'; c.fillRect(8, h * 0.45, w - 16, h * 0.3);
      font(c, 16, HAND, 400); c.fillStyle = INKC;
      [['Insert hook', 0.02], ['Yarn over', 0.21], ['Pull up a loop', 0.42], ['Yarn over', 0.58], ['Pull through both loops', 0.7], ['Done', 0.98]].forEach(([s, f]) => c.fillText(s, Math.min(w - 90, 8 + f * (w - 16)), h - 8));
    }, -3.99, y, (za + zb) / 2, 'left', { board: 0x2a2230 });
    const off = paint(0x2f5ea8, { hatch: 0 }), on = paint(0xf0862a, { hatch: 0, emissive: 0x7a3a00 });
    const dia = keys.map(f => { const m = put(new THREE.OctahedronGeometry(0.035), off, -3.955, y + 0.01, zb - 0.05 - f * (L - 0.1)); m.scale.set(0.5, 1, 1); return m; });   // (the wall reads front → back)
    const head = new THREE.Group(); head.position.set(-3.95, y, za); G.add(head);
    const H = sub(head);
    H.box(0.012, 0.42, 0.014, M.orange, 0, 0, 0, 0.004);
    H.put(new THREE.ConeGeometry(0.035, 0.05, 3).rotateX(PI), M.orange, 0.01, 0.23, 0);
    live((t) => {
      const f = scrub.vis > 0.01 ? scrub.u * 0.96 + 0.02 : (t / 13) % 1;           // scrubbing the room drives this playhead too
      head.position.z = zb - 0.05 - f * (L - 0.1);
      dia.forEach((d, i) => { const near = Math.abs(keys[i] - f) < 0.012; d.material = near ? on : off; d.scale.set(0.5, near ? 1.5 : 1, near ? 1.5 : 1); });
    });
  }

  // ════════ 3. storyboard panels above it ════════
  {
    const steps = [['Insert hook', 0], ['Poke through', 1], ['Yarn over', 2], ['Pull up a loop', 3], ['Yarn over', 2], ['Pull through', 4]];
    steps.forEach(([name, pose], i) => {
      const z = -1.55 - i * 0.6;                    // left to right as you face the wall
      poster(0.5, 0.38, 200, (c, w, h) => {
        c.fillStyle = '#fbf6ea'; c.fillRect(0, 0, w, h);
        c.strokeStyle = INKC; c.lineWidth = 3; c.strokeRect(8, 8, w - 16, h - 44);
        // the swatch: two rows of loops
        for (let r = 0; r < 2; r++) for (let k = 0; k < 6; k++) {
          c.fillStyle = r ? '#7ea6ec' : '#4f7fc4'; c.strokeStyle = INKC; c.lineWidth = 1.5;
          c.beginPath(); c.moveTo(26 + k * 26, 100 - r * 16); c.lineTo(38 + k * 26, 84 - r * 16); c.lineTo(50 + k * 26, 100 - r * 16); c.lineTo(44 + k * 26, 102 - r * 16); c.lineTo(38 + k * 26, 94 - r * 16); c.lineTo(32 + k * 26, 102 - r * 16); c.closePath(); c.fill(); c.stroke();
        }
        // the hook, posed for this step, and its path
        const hx = [80, 98, 112, 120, 134][pose], hy = [72, 82, 70, 54, 46][pose], a = [-0.7, -0.4, 0.2, 0.5, 0.8][pose];
        c.setLineDash([5, 5]); c.strokeStyle = '#f0862a'; c.lineWidth = 2; c.beginPath(); c.moveTo(60, 60); c.quadraticCurveTo(110, 100, 150, 40); c.stroke(); c.setLineDash([]);
        c.save(); c.translate(hx, hy); c.rotate(a);
        c.fillStyle = '#d5dae2'; c.fillRect(-3, -60, 6, 60); c.fillStyle = '#8f7ae8'; c.fillRect(-5, -60, 10, 22);
        c.strokeStyle = '#2a2230'; c.lineWidth = 2; c.strokeRect(-3, -60, 6, 60);
        c.restore();
        c.fillStyle = '#2f5ea8'; c.beginPath(); c.arc(hx, hy, 5, 0, 7); c.fill();
        font(c, 20); c.fillStyle = INKC; c.fillText(`${i + 1}. ${name}`, 10, h - 12);
      }, -3.99, 1.82, z, 'left', { board: 0xf6eedb, thick: 0.012 });
      S(new THREE.SphereGeometry(0.016, 8, 6), [M.red, M.orange, M.teal][i % 3], -3.97, 2.0, z);
    });
  }

  // ════════ 4. the giant crochet hook in the back left corner: it leans there until the take is scrubbed,
  //     then it's the star, posing through the keyframes with onion-skin ghosts of its last and next pose ════════
  const HOOK_POSES = [[-0.15, 0, 0.058], [0.25, 0, 0], [0.5, 0, 0], [0.45, PI, 0], [0.2, PI, -0.2], [-0.05, PI * 2, 0.03]];
  const makeHook = (mats) => {
    const hk = new THREE.Group(); hk.position.set(-3.72, 0, -5.12); G.add(hk);        // pivots on its butt end, on the floor
    const Hk = sub(hk), L = 2.09;
    const parts = [
      Hk.put(new THREE.CylinderGeometry(0.03, 0.04, L * 0.97, 14), mats.alu, 0, L * 0.5, 0),
      Hk.put(new THREE.CylinderGeometry(0.07, 0.07, 0.55, 14), mats.pink, 0, L * 0.32, 0),
      Hk.box(0.11, 0.18, 0.05, mats.pink, 0, L * 0.5, 0.03, 0.02),
      Hk.put(new THREE.SphereGeometry(0.04, 12, 8), mats.alu, 0, L * 0.985, 0),
      Hk.put(new THREE.TorusGeometry(0.05, 0.02, 8, 14, PI * 1.25), mats.alu, 0.02, L * 0.985 - 0.03, 0.03, [0, 0, 2.6]),
      Hk.put(new THREE.SphereGeometry(0.06, 12, 8), mats.pink, 0, 0.07, 0),
    ];
    return { hk, parts };
  };
  const HOOK = makeHook(M);
  const ghostM = (col) => new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.28, depthWrite: false });
  const GH = [makeHook({ alu: ghostM(0xe8604c), pink: ghostM(0xe8604c) }), makeHook({ alu: ghostM(0x3fae5f), pink: ghostM(0x3fae5f) })];
  for (const g of GH) { g.hk.visible = false; g.parts.forEach(p => { p.userData.noInk = true; }); }
  const poseHook = (obj, u) => {
    const n = HOOK_POSES.length - 1, seg = Math.min(n - 1, Math.floor(u * n)), f = ease(u * n - seg), A = HOOK_POSES[seg], B = HOOK_POSES[seg + 1];
    obj.rotation.set(A[0] + (B[0] - A[0]) * f, A[1] + (B[1] - A[1]) * f, A[2] + (B[2] - A[2]) * f);
  };
  poseHook(HOOK.hk, 0);
  claim(-3.72, -5.12, 0.12);

  // ════════ 5. the yarn basket, its strand running across the floor up to the hook's swatch ════════
  {
    const x = -3.4, z = -4.3;
    const bk = new THREE.Group(); bk.position.set(x, 0, z); G.add(bk);
    const Bk = sub(bk);
    const wall = Bk.put(new THREE.CylinderGeometry(0.3, 0.26, 0.28, 20, 1, true), paint(0xc8a47c, { side: THREE.DoubleSide }), 0, 0.14, 0);
    wall.userData.noInk = true;
    Bk.put(new THREE.TorusGeometry(0.3, 0.022, 6, 24), M.wood, 0, 0.28, 0, [PI / 2, 0, 0]);
    Bk.put(new THREE.TorusGeometry(0.28, 0.016, 6, 24), M.wood, 0, 0.1, 0, [PI / 2, 0, 0]);
    Bk.put(new THREE.CylinderGeometry(0.26, 0.26, 0.02, 20), M.wood, 0, 0.01, 0);
    const yarnTex = (col) => paint(0xffffff, { map: canvasTex(64, 64, (c) => { c.fillStyle = col; c.fillRect(0, 0, 64, 64); c.strokeStyle = 'rgba(42,34,48,0.35)'; c.lineWidth = 2; for (let k = -64; k < 128; k += 7) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 40, 64); c.stroke(); } }), hatch: 0.4 });
    const cols = ['#4f7fc4', '#f0862a', '#7ea6ec', '#ef8fa8', '#e4b84f', '#7fb3a8'];
    const balls = cols.map((col, i) => {
      const a = i * 1.05, r = i ? 0.15 : 0, y = i ? 0.2 : 0.3;
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), yarnTex(col)); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r); m.rotation.set(i, i * 2, 0); bk.add(m);
      return { m, y, d: i * 0.06 };
    });
    let t0 = -9;
    tap(bk, 'toss the yarn', (sfx) => { t0 = kit.now(); sfx([[440, 0.06], [554, 0.06], [659, 0.06], [880, 0.12]], 'sine', 0.05); });
    live((t) => { for (const b of balls) { const k = t - t0 - b.d; const up = k > 0 && k < 0.55 ? Math.sin(k / 0.55 * PI) * 0.3 : 0; b.m.position.y = b.y + up; if (up) b.m.rotation.x += 0.2; } });
    kit.g.add(shadow(0.36).translateX(x).translateZ(z));
    claim(x, z, 0.32);
    // the strand: out of the blue ball, over the rim, along the floor, up the plinth to the swatch
    const pts = [[x + 0.05, 0.32, z + 0.05], [x + 0.25, 0.3, z + 0.22], [x + 0.38, 0.01, z + 0.42], [-2.95, 0.008, -3.6], [-2.7, 0.008, -3.2], [-2.45, 0.008, -2.95], [-2.4, 0.05, -2.875], [-2.42, 0.4, -2.87], [-2.45, 0.74, -2.86], [-2.48, 0.755, -2.7]];
    const strand = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p))), 80, 0.009, 5), paint(0x4f7fc4));
    strand.userData.noInk = true; G.add(strand);
  }

  // ════════ 6. a softbox light on a stand in each back corner: tap for a flash ════════
  [[-2.55, -4.85, 0.6], [3.52, -4.98, -0.75]].forEach(([x, z, ry], i) => {
    for (let k = 0; k < 3; k++) { const a = k * 2.09 + 0.3; rod([x + Math.cos(a) * 0.25, 0, z + Math.sin(a) * 0.25], [x, 0.5, z], 0.012, M.dark, 5); }
    rod([x, 0.45, z], [x, 1.55, z], 0.016, M.dark, 8);
    const head = new THREE.Group(); head.position.set(x, 1.6, z); head.rotation.y = ry; G.add(head);     // tilts on its mount
    const Hk = sub(head);
    Hk.put(new THREE.CylinderGeometry(0.06, 0.38, 0.3, 4, 1, true, PI / 4).rotateX(-PI / 2), paint(0x2a2230, { side: THREE.DoubleSide, hatch: 0 }), 0, 0, 0.12).scale.set(1, 0.75, 1);
    const diff = Hk.put(new THREE.PlaneGeometry(0.52, 0.39), paint(0xfffaf0, { emissive: 0xfff4d8, hatch: 0, unique: true }), 0, 0, 0.272);
    diff.material.emissiveIntensity = 0.35; diff.userData.noInk = true;
    Hk.box(0.1, 0.1, 0.06, M.dark, 0, 0, -0.04, 0.01);
    head.rotation.x = 0.18;
    let t0 = -9;
    tap(head, 'flash the softbox', (sfx) => { t0 = kit.now(); sfx([[2400, 0.03], [1200, 0.15]], 'sine', 0.05); });
    live((t) => { const k = t - t0; diff.material.emissiveIntensity = k < 0.6 ? 1.6 - k * 2 : 0.35 + Math.sin(t * 0.8 + i) * 0.04; });
    claim(x, z, 0.24);
  });

  // ════════ 7. a boom mic, front left, dipping over the stage ════════
  {
    const x = -3.55, z = -0.75, py = 1.5;
    for (let k = 0; k < 3; k++) { const a = k * 2.09 + 0.8; rod([x + Math.cos(a) * 0.24, 0, z + Math.sin(a) * 0.24], [x, 0.45, z], 0.012, M.dark, 5); }
    rod([x, 0.4, z], [x, py, z], 0.018, M.dark, 8);
    const boom = new THREE.Group(); boom.position.set(x, py + 0.03, z); boom.rotation.y = 0.55; G.add(boom);   // swings on its pole clamp
    const tiltG = new THREE.Group(); boom.add(tiltG);
    const B = sub(tiltG);
    B.put(new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), M.dark, 0, 0, 0);
    B.put(new THREE.CylinderGeometry(0.012, 0.012, 1.35, 8), M.alu, 0.55, 0, 0, [0, 0, PI / 2]);
    B.put(new THREE.CylinderGeometry(0.03, 0.03, 0.12, 10), M.dark, -0.2, 0, 0, [0, 0, PI / 2]);
    B.put(new THREE.CylinderGeometry(0.004, 0.004, 0.1, 4), M.dark, 1.2, -0.05, 0).userData.noInk = true;
    const mic = B.put(new THREE.CapsuleGeometry(0.035, 0.18, 4, 10), paint(0x8a8392, { hatch: 0.8 }), 1.2, -0.12, 0, [0, 0, PI / 2]);
    let t0 = -9, taps = [], big = -99;
    tap(boom, 'dip the boom mic', (sfx) => {
      const now = kit.now(); taps = taps.filter(q => now - q < 5); taps.push(now);
      if (taps.length >= 5 && now - big > 6) {                    // the secret: dip it five times and it's in the shot
        big = now; taps = []; REC.on = false; FX.clap?.();
        sfx([[0, 0.3], [3000, 0.02], [1200, 0.06], [0, 0.3], [330, 0.2], [262, 0.4]], 'square', 0.05);
        kit.say('BOOM IN SHOT! Cut, cut, cut. …Okay everybody, take five.');
        setTimeout(() => { REC.on = true; }, 5000);
        return;
      }
      t0 = now; sfx([[220, 0.08], [0, 0.1], [880, 0.05], [660, 0.05]], 'sine', 0.05);
    });
    live((t) => {
      const kb = t - big, k = t - t0;
      const dip = kb < 3.5 ? Math.sin(Math.min(1, kb / 3.5) * PI) * 0.62 : k < 2.2 ? Math.sin(Math.min(1, k / 2.2) * PI) * 0.3 : 0;
      tiltG.rotation.z = 0.32 + Math.sin(t * 0.9) * 0.02 - dip;
      boom.rotation.y = 0.55 + Math.sin(t * 0.4) * 0.06;
    });
    claim(x, z, 0.22);
  }
  // reel cans stacked by the wall
  for (let k = 0; k < 4; k++) S(new THREE.CylinderGeometry(0.2, 0.2, 0.05, 20), [M.steel, M.alu, M.steel, M.alu][k], -3.65, 0.025 + k * 0.052, -2.2, [0, k * 0.3, 0]);
  {
    const reel = new THREE.Group(); reel.position.set(-3.68, 0.41, -2.2); G.add(reel);
    const Rk = sub(reel);
    Rk.put(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 20), M.dark, 0, 0, 0, [0, 0, PI / 2]);
    Rk.put(new THREE.CylinderGeometry(0.14, 0.14, 0.035, 20), M.canvas, 0, 0, 0, [0, 0, PI / 2]);
    for (let k = 0; k < 3; k++) Rk.put(new THREE.CylinderGeometry(0.035, 0.035, 0.04, 10), M.alu, 0, Math.cos(k * 2.09) * 0.1, Math.sin(k * 2.09) * 0.1, [0, 0, PI / 2]);
    S(new THREE.CylinderGeometry(0.02, 0.02, 0.06, 8), M.dark, -3.68, 0.23, -2.2);
    live((t) => { reel.rotation.x = t * 0.8; });
    claim(-3.65, -2.2, 0.22);
  }

  // ════════ 8. the rack of hooks on the right wall: tap and they swing ════════
  {
    const za = -4.6, zb = -3.25, y = 1.95;
    poster(zb - za + 0.2, 0.9, 256, (c, w, h) => {
      c.fillStyle = '#d5dde8'; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(47,94,168,0.35)'; for (let i = 8; i < w; i += 14) for (let j = 8; j < h; j += 14) { c.beginPath(); c.arc(i, j, 2, 0, 7); c.fill(); }
      font(c, 22, SCRIPT); c.fillStyle = INKC; c.fillText('hooks, by size', 10, h - 10);
    }, 3.99, 1.6, (za + zb) / 2, 'right', { board: 0x3f4a5c });
    const cols = [M.pink, M.lilac, M.teal, M.gold, M.orange, M.blueL, M.red, M.lilac, M.teal];
    const hooks = [];
    for (let i = 0; i < 9; i++) {
      const z = za + 0.08 + i * (zb - za - 0.16) / 8, s = 0.8 + i * 0.05;
      S(new THREE.CylinderGeometry(0.008, 0.008, 0.06, 6), M.dark, 3.95, y, z, [0, 0, PI / 2]);
      const pv = new THREE.Group(); pv.position.set(3.93, y, z); G.add(pv);       // hangs from its peg by the handle's hole
      const P = sub(pv);
      P.put(new THREE.TorusGeometry(0.016, 0.005, 5, 10), M.dark, 0, -0.012, 0, [0, PI / 2, 0]);
      P.put(new THREE.CylinderGeometry(0.018 * s, 0.016 * s, 0.17, 10), cols[i], 0, -0.11, 0);
      P.put(new THREE.CylinderGeometry(0.008 * s, 0.008 * s, 0.22, 8), M.alu, 0, -0.3, 0);
      P.put(new THREE.TorusGeometry(0.01 * s, 0.004 * s, 5, 10, PI * 1.2), M.alu, -0.006, -0.415, 0, [0, PI / 2, -0.4]);
      hooks.push(pv);
    }
    let t0 = -9;
    const hit = new THREE.Group(); hit.position.set(3.93, y, (za + zb) / 2); G.add(hit);
    for (const h of hooks) { hit.add(h); h.position.sub(hit.position); }
    tap(hit, 'swing the hooks', (sfx) => { t0 = kit.now(); sfx([[1568, 0.05], [1760, 0.05], [1976, 0.05], [2093, 0.05], [2349, 0.1]], 'triangle', 0.035); });
    live((t) => { const k = t - t0; hooks.forEach((h, i) => { const kk = k - i * 0.07; h.rotation.x = Math.sin(t * 1.3 + i) * 0.03 + (kk > 0 ? Math.sin(kk * 8) * 0.5 * Math.exp(-kk * 1.2) : 0); }); });
  }

  // ════════ 9. the blocking board: swatches pinned out to shape, right wall ════════
  {
    const z = -1.75;
    poster(1.5, 0.78, 512, (c, w, h) => {
      c.fillStyle = '#7ea6ec'; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 1.5;
      for (let i = 0; i < w; i += 20) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); }
      for (let j = 0; j < h; j += 20) { c.beginPath(); c.moveTo(0, j); c.lineTo(w, j); c.stroke(); }
      const sw = (x0, y0, ww, hh, cA, cB) => {
        for (let r = 0; r < hh / 14; r++) for (let k = 0; k < ww / 14; k++) {
          c.fillStyle = r % 4 < 2 ? cA : cB; c.beginPath(); c.ellipse(x0 + k * 14 + 7, y0 + r * 14 + 7, 7.5, 6.5, 0, 0, 7); c.fill();
          c.strokeStyle = 'rgba(42,34,48,0.35)'; c.lineWidth = 1; c.stroke();
        }
      };
      sw(30, 40, 126, 98, '#4f7fc4', '#f6eedb'); sw(190, 30, 140, 112, '#ef8fa8', '#f6eedb'); sw(370, 50, 112, 84, '#e4b84f', '#f0862a');
      font(c, 26, SCRIPT); c.fillStyle = INKC; c.fillText('blocked & pinned', 30, h - 20);
    }, 3.99, 1.85, z, 'right', { board: 0xf6eedb });
    // T-pins at the swatch corners
    const corners = [[30, 40, 126, 98], [190, 30, 140, 112], [370, 50, 112, 84]];
    for (const [x0, y0, ww, hh] of corners) for (const [px, py] of [[x0, y0], [x0 + ww, y0], [x0, y0 + hh], [x0 + ww, y0 + hh]]) {
      const zz = z + 0.75 - px / 512 * 1.5, yy = 1.85 + 0.39 - py / 266 * 0.78;
      S(new THREE.CylinderGeometry(0.003, 0.003, 0.04, 4), M.alu, 3.96, yy, zz, [0, 0, PI / 2]);
      SB(0.008, 0.008, 0.03, M.alu, 3.94, yy, zz, 0.002);
    }
  }

  // ════════ 10. the monitor cart with a gizmo, right side: tap to spin the gizmo ════════
  {
    const x = 3.45, z = -1.75;
    for (const [dx, dz] of [[-0.2, -0.28], [0.2, -0.28], [-0.2, 0.28], [0.2, 0.28]]) { SB(0.035, 0.82, 0.035, M.alu, x + dx, 0.47, z + dz, 0.008); S(new THREE.SphereGeometry(0.035, 8, 6), M.dark, x + dx, 0.035, z + dz); }
    SB(0.48, 0.03, 0.64, M.canvas, x, 0.88, z, 0.01);
    SB(0.48, 0.03, 0.64, M.canvas, x, 0.3, z, 0.01);
    SB(0.3, 0.2, 0.4, M.woodL, x, 0.415, z + 0.05, 0.015);
    SB(0.12, 0.05, 0.18, M.dark, x + 0.05, 0.92, z - 0.12, 0.01);
    S(new THREE.CylinderGeometry(0.015, 0.015, 0.14, 8), M.dark, x + 0.05, 1.0, z - 0.12);
    SB(0.04, 0.34, 0.5, M.dark, x + 0.06, 1.24, z - 0.12, 0.012);
    const scr = kit.flat(0.46, 0.3, texMat(256, 168, (c, w, h) => {
      c.fillStyle = '#f2eee6'; c.fillRect(0, 0, w, h);
      c.fillStyle = '#2a2230'; c.fillRect(8, 8, 60, 18); c.fillStyle = '#fff'; c.font = `700 12px ${HAND}`; c.fillText('Move W', 14, 21);
      c.fillStyle = '#e8e4dc'; c.fillRect(0, h - 26, w, 26);
      for (let k = 0; k < 9; k++) { c.save(); c.translate(20 + k * 27, h - 13); c.rotate(PI / 4); c.fillStyle = k === 3 ? '#f0862a' : '#2f5ea8'; c.fillRect(-4, -4, 8, 8); c.restore(); }
      c.strokeStyle = '#4f7fc4'; c.lineWidth = 8; for (let k = 0; k < 6; k++) { c.beginPath(); c.ellipse(70 + k * 26, 100, 12, 10, 0, 0, 7); c.stroke(); }
      c.strokeStyle = '#d5dae2'; c.lineWidth = 9; c.beginPath(); c.moveTo(120, 90); c.lineTo(220, 130); c.stroke();
      c.fillStyle = '#f0862a'; c.beginPath(); c.arc(120, 90, 9, 0, 7); c.fill();
    }), x + 0.035, 1.24, z - 0.12, [0, -PI / 2, 0]);
    scr.renderOrder = 2;
    // the move gizmo: three arrows on a pivot at their shared origin
    const gz = new THREE.Group(); gz.position.set(x - 0.05, 0.92, z + 0.18); G.add(gz);
    const Gk = sub(gz);
    Gk.put(new THREE.SphereGeometry(0.025, 10, 8), M.cream, 0, 0.02, 0);
    const arrow = (mat, rot) => {
      const a = new THREE.Group(); a.rotation.set(...rot); a.position.y = 0.02; gz.add(a);
      const A = sub(a);
      A.put(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), mat, 0, 0.08, 0);
      A.put(new THREE.ConeGeometry(0.022, 0.05, 10), mat, 0, 0.18, 0);
    };
    arrow(paint(0x3fae5f), [0, 0, 0]); arrow(paint(0xe8604c), [0, 0, -PI / 2]); arrow(paint(0x3f6ad8), [PI / 2, 0, 0]);
    let spin = 0;
    tap(gz, 'spin the gizmo', (sfx) => { spin = 12; sfx([[700, 0.05], [900, 0.05], [700, 0.05], [1100, 0.12]], 'square', 0.03); });
    live((t, dt) => { spin *= Math.exp(-dt * 1.2); gz.rotation.y += (0.5 + spin) * dt; });
    block(x - 0.25, x + 0.25, z - 0.33, z + 0.33);
  }

  // ════════ 11. the director's chair, front right, with a little clapper on the seat ════════
  {
    const x = 3.25, z = -0.4, sy = 0.55, wd = 0.5, dp = 0.4;
    const wood = M.wood;
    for (const s of [-1, 1]) {
      const sx = x + s * wd / 2;
      rod([sx, 0, z - dp / 2], [sx, sy, z + dp / 2], 0.018, wood, 6);
      rod([sx, 0, z + dp / 2], [sx, sy, z - dp / 2], 0.018, wood, 6);
      rod([sx, sy, z + dp / 2], [sx, 1.0, z + dp / 2 + 0.02], 0.02, wood, 6);    // back posts
      rod([sx, sy - 0.02, z - dp / 2], [sx, 0.78, z - dp / 2], 0.018, wood, 6);   // arm posts
      SB(0.06, 0.03, dp + 0.06, wood, sx, 0.79, z, 0.01);
    }
    SB(wd + 0.04, 0.03, dp, paint(0x2f5ea8), x, sy, z, 0.01);
    for (const zz of [z - dp / 2, z + dp / 2]) rod([x - wd / 2, 0.12, zz], [x + wd / 2, 0.12, zz], 0.012, wood, 6);
    const back = kit.flat(wd, 0.2, texMat(256, 102, (c, w, h) => {
      c.fillStyle = '#2f5ea8'; c.fillRect(0, 0, w, h);
      font(c, 52, SCRIPT); c.fillStyle = '#f6eedb'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('Hookpath', w / 2, h / 2 + 2);
    }), x, 0.88, z + dp / 2 + 0.035);
    back.material.side = THREE.DoubleSide; back.renderOrder = 2;
    SB(wd, 0.2, 0.012, paint(0x2f5ea8), x, 0.88, z + dp / 2 + 0.025, 0.004);
    // the clapper: the stick is hinged at its left end
    const cx = x, cy = sy + 0.015, cz = z - 0.02;
    SB(0.22, 0.015, 0.16, M.dark, cx, cy + 0.008, cz, 0.004);
    const slate = kit.flat(0.2, 0.14, texMat(128, 90, (c, w, h) => {
      c.fillStyle = '#2a2230'; c.fillRect(0, 0, w, h); c.strokeStyle = '#f6eedb'; c.lineWidth = 2; c.strokeRect(4, 4, w - 8, h - 8);
      c.fillStyle = '#f6eedb'; c.font = `700 18px ${HAND}`; c.fillText('TAKE 4', 12, 30); c.fillText('yarn over', 12, 62);
    }), cx, cy + 0.017, cz, [-PI / 2, 0, 0]);
    slate.renderOrder = 2;
    const hinge = new THREE.Group(); hinge.position.set(cx - 0.11, cy + 0.02, cz - 0.08); G.add(hinge);
    const stick = sub(hinge).box(0.22, 0.015, 0.035, M.cream, 0.11, 0.008, 0, 0.004);
    const stripes = sub(hinge).box(0.08, 0.016, 0.036, M.dark, 0.11, 0.008, 0, 0.004);
    const clap = new THREE.Group(); clap.position.set(cx, cy, cz); G.add(clap); clap.add(hinge); hinge.position.sub(clap.position);
    let t0 = -9;
    FX.clap = () => { t0 = kit.now(); };
    tap(clap, 'call action!', (sfx) => { t0 = kit.now(); sfx([[0, 0.35], [3000, 0.02], [1200, 0.06]], 'square', 0.06); });
    live((t) => { const k = t - t0; hinge.rotation.z = k < 0.35 ? Math.sin(k / 0.35 * PI / 2) * 0.7 : k < 0.45 ? 0.7 * (1 - (k - 0.35) / 0.1) : 0; });
    claim(x, z, 0.32);
  }

  // ════════ 12. back wall: the shot list and a blinking REC sign ════════
  poster(1.3, 0.86, 400, (c, w, h) => {
    c.fillStyle = '#2f3a3a'; c.fillRect(0, 0, w, h);
    c.fillStyle = 'rgba(255,255,255,0.05)'; for (let i = 0; i < 40; i++) c.fillRect(Math.random() * w, Math.random() * h, 40, 3);
    font(c, 38, SCRIPT); c.fillStyle = '#f6eedb'; c.fillText('shot list', 20, 46);
    font(c, 22, HAND, 400);
    ['1  wide: the swatch', '2  close: insert hook  ✓', '3  over the shoulder: yarn over  ✓', '4  close: pull through', '5  the hook’s good side (it has two)'].forEach((s, i) => c.fillText(s, 24, 90 + i * 32));
    c.strokeStyle = '#f0862a'; c.lineWidth = 3; c.beginPath(); c.ellipse(150, 214, 140, 16, 0, 0, 7); c.stroke();
  }, -2.88, 1.5, BACK + 0.012, 'back', { board: 0x8a6448, thick: 0.025 });
  SB(1.2, 0.03, 0.05, M.wood, -2.88, 1.045, BACK + 0.04, 0.008);
  S(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 6), M.cream, -2.6, 1.07, BACK + 0.05, [0, 0, PI / 2]);
  {
    const x = 3.3, y = 2.3, z = BACK + 0.03;
    SB(0.5, 0.2, 0.05, M.dark, x, y, z, 0.03);
    const lit = paint(0xff5a4a, { emissive: 0xff3020, hatch: 0, unique: true });
    const dot = put(new THREE.SphereGeometry(0.045, 12, 8), lit, x - 0.15, y, z + 0.03); dot.userData.noInk = true;
    const txt = kit.flat(0.3, 0.14, texMat(128, 60, (c, w, h) => { font(c, 44); c.fillStyle = '#ff6a5a'; c.textBaseline = 'middle'; c.fillText('REC', 8, h / 2 + 2); }), x + 0.07, y, z + 0.027);
    txt.renderOrder = 2;
    const rec = new THREE.Group(); rec.position.set(x, y, z); G.add(rec); rec.add(dot); dot.position.sub(rec.position);
    tap(rec, 'toggle recording', (sfx) => { REC.on = !REC.on; sfx(REC.on ? [[880, 0.08], [1320, 0.12]] : [[660, 0.08], [440, 0.12]], 'sine', 0.05); });
    live((t) => { const b = REC.on && Math.sin(t * PI) > -0.2; lit.emissiveIntensity = b ? 1 : 0; lit.color.setHex(b ? 0xff5a4a : 0x5a3a40); });
    // a "quiet on set" card under it
    poster(0.5, 0.2, 200, (c, w, h) => { c.fillStyle = '#f6eedb'; c.fillRect(0, 0, w, h); font(c, 34, SCRIPT); c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('quiet on set', w / 2, h / 2 + 2); }, x, 1.9, BACK + 0.012, 'back', { board: 0x2a2230, thick: 0.012 });
  }

  // ════════ 13. a road case by the hook rack, and a dolly track laid along the front ════════
  {
    const x = 3.55, z = -2.78;
    SB(0.5, 0.42, 0.62, M.dark, x, 0.23, z, 0.03);
    for (const y of [0.03, 0.43]) SB(0.52, 0.03, 0.64, M.alu, x, y, z, 0.008);
    for (const dz of [-0.31, 0.31]) SB(0.52, 0.42, 0.025, M.alu, x, 0.23, z + dz, 0.006);
    SB(0.08, 0.03, 0.2, M.alu, x - 0.26, 0.3, z, 0.008);
    const st = kit.flat(0.22, 0.14, texMat(128, 80, (c, w, h) => { c.fillStyle = '#f0862a'; c.beginPath(); c.roundRect(2, 2, w - 4, h - 4, 14); c.fill(); font(c, 30); c.fillStyle = INKC; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('TALENT ★', w / 2, h / 2 + 2); }), x - 0.252, 0.2, z + 0.1, [0, -PI / 2, 0]);
    st.renderOrder = 2;
    SB(0.3, 0.12, 0.24, M.blueL, x, 0.5, z - 0.12, 0.02, [0, 0.2, 0]);
    claim(x, z, 0.32);
  }
  {
    const za = 0.12, x0 = -2.95, x1 = -0.95;
    for (const dz of [-0.13, 0.13]) rod([x0, 0.035, za + dz], [x1, 0.035, za + dz], 0.016, M.alu, 8);
    for (let k = 0; k <= 8; k++) SB(0.06, 0.02, 0.38, M.wood, x0 + 0.05 + k * (x1 - x0 - 0.1) / 8, 0.01, za, 0.004);
  }

  // ════════ 14. THE TRICK: the dolly track is the timeline. Tap the playhead to play the take, or a
  //     keyframe diamond to scrub to it: the yarn-ball actor hits its marks, the giant hook poses,
  //     the spotlights follow, the wall playhead moves, and onion-skin ghosts show the last and next key. ════════
  {
    const KX = (i) => -2.85 + (i / 5) * 1.8, tz = 0.12;
    // the actor: a big ball of yarn, blocking its moves between six marks
    const marks = [[-3.04, -0.22], [-2.4, -1.5], [-0.8, -3.3], [1.76, -3.7], [1.2, -1.6], [0.4, -0.58]];
    const path = new THREE.CatmullRomCurve3(marks.map(([x, z]) => new THREE.Vector3(x, 0.16, z)), false, 'centripetal');
    const yarn = paint(0xffffff, { hatch: 0.4, map: canvasTex(128, 64, (c, w, h) => { c.fillStyle = '#f0862a'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(42,34,48,0.35)'; c.lineWidth = 2.5; for (let k = -64; k < 192; k += 8) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k + 50, h); c.stroke(); } c.strokeStyle = 'rgba(255,240,220,0.5)'; for (let k = 0; k < w; k += 16) { c.beginPath(); c.moveTo(k, 0); c.lineTo(k - 30, h); c.stroke(); } }) });
    const actor = new THREE.Group(); actor.position.copy(actorPos); G.add(actor);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 14), yarn); actor.add(ball);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, -0.08, 0.1), new THREE.Vector3(0.2, -0.15, 0.16), new THREE.Vector3(0.32, -0.155, 0.1)]), 12, 0.008, 4), paint(0xf0862a));
    tail.userData.noInk = true; actor.add(tail);
    kit.g.add(shadow(0.001));
    const ghostA = [0xe8604c, 0x3fae5f].map(col => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 10), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.3, depthWrite: false })); m.userData.noInk = true; m.visible = false; G.add(m); return m; });
    // the motion path, dotted on the floor while you scrub
    const dots = new THREE.InstancedMesh(new THREE.SphereGeometry(0.02, 6, 4), new THREE.MeshBasicMaterial({ color: 0xf0862a }), 60);
    dots.userData.noInk = true; dots.visible = false;
    { const M4 = new THREE.Matrix4(); for (let i = 0; i < 60; i++) { const p = path.getPoint(i / 59); M4.makeTranslation(p.x, 0.02, p.z); dots.setMatrixAt(i, M4); } }
    G.add(dots);
    for (let i = 0; i < 6; i++) { const [x, z] = marks[i]; const n = kit.flat(0.16, 0.08, texMat(64, 32, (c, w, h) => { c.fillStyle = '#2a2230'; c.fillRect(0, 0, w, h); c.font = `700 22px ${HAND}`; c.fillStyle = '#f6eedb'; c.textAlign = 'center'; c.fillText(`key ${i + 1}`, w / 2, 23); }), x, 0.012, z + 0.24, [-PI / 2, 0, 0]); n.renderOrder = 1; }
    // the playhead on the track, and a keyframe diamond on the sleepers for each key
    const ph = new THREE.Group(); ph.position.set(KX(0), 0, tz); G.add(ph);
    const P = sub(ph);
    P.box(0.16, 0.05, 0.34, M.dark, 0, 0.07, 0, 0.012);
    P.box(0.022, 0.62, 0.022, M.orange, 0, 0.4, 0, 0.006);
    P.put(new THREE.ConeGeometry(0.07, 0.1, 3).rotateX(PI), M.orange, 0, 0.75, 0);
    P.flat(0.24, 0.08, texMat(110, 36, (c, w, h) => { c.fillStyle = '#f0862a'; c.fillRect(0, 0, w, h); c.font = `700 22px ${HAND}`; c.fillStyle = '#2a2230'; c.textAlign = 'center'; c.fillText('▶ play take', w / 2, 25); }), 0, 0.55, 0.013).renderOrder = 2;
    const off = paint(0x2f5ea8, { hatch: 0 }), on = paint(0xf0862a, { hatch: 0, emissive: 0x7a3a00 });
    const dia = [];
    for (let i = 0; i < 6; i++) {
      const d = new THREE.Group(); d.position.set(KX(i), 0.09, tz + 0.27); G.add(d);
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.06), off); m.scale.set(1, 1, 0.5); d.add(m);
      dia.push(m);
      tap(d, `keyframe ${i + 1}: ${KEYN[i].toLowerCase()}`, (sfx) => { goTo(i / 5, 0.9); sfx([[523 + i * 60, 0.06], [784 + i * 60, 0.12]], 'triangle', 0.05); });
    }
    let firstTake = true;
    const goTo = (u, dur) => { scrub.from = scrub.u; scrub.to = u; scrub.dur = dur; scrub.t0 = kit.now(); };
    tap(ph, 'play the take', (sfx) => {
      const from = scrub.u > 0.98 ? 0 : scrub.u;
      scrub.u = from; goTo(1, 10 * (1 - from) + 0.01); scrub.lastKey = Math.round(from * 5) - 1;
      REC.on = true; FX.clap?.();
      sfx([[0, 0.3], [3000, 0.02], [1200, 0.06], [0, 0.2], [392, 0.1], [523, 0.15]], 'square', 0.05);
      if (firstTake) { firstTake = false; setTimeout(() => kit.say('Onion skin on: the red ghost is the last key, the green one is the next. The room is the timeline now.'), 1200); }
    });
    // Vivi's page: the actor has been standing on it all along, on its first mark
    const pg = kit.page();
    if (!pg.collected) { pg.position.set(-3.08, 0.004, -0.14); pg.rotation.set(-PI / 2, 0, 0.5); G.add(pg); }
    const prev = new THREE.Vector3(), ax = new THREE.Vector3(), q = new THREE.Quaternion();
    live((t) => {
      // drive u
      const k = (t - scrub.t0) / scrub.dur;
      if (k <= 1) scrub.u = scrub.from + (scrub.to - scrub.from) * Math.max(0, k);
      else if (scrub.u > 0 && t - scrub.t0 - scrub.dur > 12) goTo(0, 1.6);            // left alone, the take rewinds
      const moving = k <= 1;
      scrub.vis += ((moving || scrub.u > 0.001 ? 1 : 0) - scrub.vis) * 0.08;
      // keys crossed during a take get announced
      const key = Math.floor(scrub.u * 5 + 1e-4);
      if (moving && scrub.to === 1 && key !== scrub.lastKey && scrub.dur > 2) { scrub.lastKey = key; kit.say(`Key ${key + 1}: ${KEYN[key]}`); }
      // the actor, with per-key easing, rolling as it goes
      const n = 5, seg = Math.min(n - 1, Math.floor(scrub.u * n)), f = ease(scrub.u * n - seg), ue = (seg + f) / n;
      prev.copy(actor.position); path.getPoint(ue, actor.position); actorPos.copy(actor.position);
      ax.set(actor.position.z - prev.z, 0, prev.x - actor.position.x); const dist = ax.length();
      if (dist > 1e-5) { q.setFromAxisAngle(ax.normalize(), -dist / 0.16); ball.quaternion.premultiply(q); }
      // onion skin: the key behind and the key ahead
      const showG = scrub.vis > 0.05 && scrub.u > 0.001;
      ghostA[0].visible = ghostA[1].visible = GH[0].hk.visible = GH[1].hk.visible = dots.visible = showG;
      const kPrev = Math.min(4, Math.floor(scrub.u * n + 1e-4)), kNext = Math.min(5, kPrev + 1);
      path.getPoint(kPrev / n, ghostA[0].position); path.getPoint(kNext / n, ghostA[1].position);
      for (const g of ghostA) g.material.opacity = 0.3 * scrub.vis;
      poseHook(HOOK.hk, ue); poseHook(GH[0].hk, kPrev / n); poseHook(GH[1].hk, kNext / n);
      ph.position.x = KX(0) + scrub.u * 1.8;
      dia.forEach((d, i) => { const near = Math.abs(scrub.u - i / 5) < 0.02 && scrub.vis > 0.05; d.material = near ? on : off; d.rotation.y = near ? t * 3 : 0; });
    });
  }

  // ════════ 15. the continuity check: a game you win by looking hard at the set ════════
  kit.games.add(1.4, -0.95, 'continuity check', (m) => kit.quiz(m.game, 'Continuity check', [
    { q: 'The script supervisor needs the biggest hook on the hook rack (right wall). What colour is its handle?', choices: ['pink', 'purple', 'teal', 'gold'], answer: 2, why: 'Teal: the fat one on the far right of the rack.' },
    { q: 'There are two clapperboards on this set: one leaning by the back wall, one on the director’s chair. Which take is it?', choices: ['take 3', 'take 4', 'both: one says 3, one says 4'], answer: 2, why: 'One says TAKE 3 and the other TAKE 4. A continuity error! Somebody’s getting a note.' },
    { q: 'The storyboard on the left wall: what is step 2?', choices: ['Yarn over', 'Poke through', 'Pull through', 'Insert hook'], answer: 1, why: '“Poke through”. The wall timeline skips it, which is the other continuity error in here.' },
    { q: 'Follow the blue yarn strand out of the basket. Where does it end up?', choices: ['the hook’s swatch on its plinth', 'the camera', 'the boom mic', 'the director’s chair'], answer: 0, why: 'Up the plinth and onto the swatch: the hook’s working yarn.' },
    { q: 'Count the spotlights hanging on the two trusses.', choices: ['4', '6', '8', '12'], answer: 1, why: 'Six: three each side. Tap one and they all find the hook.' },
  ], { intro: 'A script supervisor’s job is noticing things. Every answer is somewhere on this set: go and look before you pick.', end: (s, n) => (s === n ? 'Nothing gets past you. That’s a wrap!' : `${s} of ${n}. Have another look around the set!`) }));

  bake();
}
