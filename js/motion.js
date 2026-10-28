// ─── MOTION: every person comes rigged for idle, walk, run, sit and bike ─────
// Nothing here is tuned to one body. The motion rig measures the person it's
// given — leg, arm and torso lengths, hip width, ankle height — and drives the
// skeleton from those: feet follow a gait path scaled to the leg and are
// solved with two-bone IK (so they plant, whatever the proportions or style),
// hips ride on the legs, arms counter-swing, a seat or a bike is reached by IK
// from the measured limbs, and a bike is built to fit its rider.
//
//   const m = person.motion;               // made by makePerson
//   m.pose('walk', t)                      // t in seconds; returns the ground speed to move the person at
//   m.pose('run', t) · m.pose('idle', t) · m.pose('sit', t, { seatY }) · m.pose('bike', t, { bike })
//   const bike = makeBike(person); scene.add(bike.group)   // a bicycle sized to this rider
//
// Conventions: the person faces +z with +y up in its own (rig) frame. Bones keep
// world-aligned rest frames, so rotations are given about rig-frame axes.
import * as THREE from 'three';
import { rotateBone } from './anatomy.js';
import { paint, ink } from './style.js';

// ── bone helpers (world space) ──
const _wq = new THREE.Quaternion(), _pq = new THREE.Quaternion(), _lq = new THREE.Quaternion();
export function turnTo(bone, from, to) {                  // rotate a bone so world dir `from` points along `to`
  _wq.setFromUnitVectors(from.clone().normalize(), to.clone().normalize());
  bone.parent.getWorldQuaternion(_pq);
  _lq.copy(_pq).invert().multiply(_wq).multiply(_pq);
  bone.quaternion.premultiply(_lq);
  bone.updateMatrixWorld(true);
}
export const wp = (b) => b.getWorldPosition(new THREE.Vector3());
function setWorldQuat(bone, q) {                          // give a bone this world orientation
  bone.parent.getWorldQuaternion(_pq);
  bone.quaternion.copy(_pq.invert().multiply(q));
  bone.updateMatrixWorld(true);
}
const ss = THREE.MathUtils.smoothstep, TAU = Math.PI * 2;

// two-bone IK: A (upper bone, head at the root joint) → B (lower bone, head at the
// middle joint) → C (head at the end joint) so that C lands on `target`, bending
// toward `pole`. Out-of-reach targets are clamped just short of a locked limb.
export function ik2(A, B, C, target, pole) {
  const a = wp(A), b = wp(B), c = wp(C), l1 = a.distanceTo(b), l2 = b.distanceTo(c);
  const d = target.clone().sub(a), dist = THREE.MathUtils.clamp(d.length(), Math.abs(l1 - l2) + 1e-4, (l1 + l2) * 0.995);
  const dir = d.normalize(), x = (l1 * l1 - l2 * l2 + dist * dist) / (2 * dist), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  const p = pole.clone().sub(a); p.addScaledVector(dir, -p.dot(dir)).normalize();
  const mid = a.clone().addScaledVector(dir, x).addScaledVector(p, h);
  turnTo(A, b.clone().sub(a), mid.clone().sub(a));
  const b2 = wp(B), c2 = wp(C);
  turnTo(B, c2.clone().sub(b2), a.clone().addScaledVector(dir, dist).sub(b2));
}

// ── hands: palm direction, finger splay and curl ──
function palmNormal(B, k) {
  const s = k === 'L' ? 1 : -1, w = wp(B['wrist.' + k]);
  const along = wp(B['finger3-1.' + k]).sub(w), across = wp(B['finger2-1.' + k]).sub(wp(B['finger5-1.' + k]));
  return along.cross(across).multiplyScalar(s).normalize();
}
// turn the forearm about its own axis so the palm faces `want` (world)
export function palmTo(B, k, want) {
  const axis = wp(B['wrist.' + k]).sub(wp(B['lowerarm01.' + k])).normalize();
  const pr = (v) => v.clone().addScaledVector(axis, -v.dot(axis)).normalize();
  turnTo(B['lowerarm02.' + k], pr(palmNormal(B, k)), pr(want));
}
// grip 0 = a relaxed hand, 1 = a closed grip (round a handlebar)
export function curlFingers(B, k, grip = 0) {
  const N = palmNormal(B, k), midDir = wp(B['finger3-2.' + k]).sub(wp(B['finger3-1.' + k])).normalize();
  if (grip === 0) {
    // close the base mesh's splay: each finger turns (in the palm's plane) most of the way
    // toward the middle finger's line, leaving the small natural fan of a relaxed hand
    for (const [f, keep] of [[2, 0.12], [4, 0.15], [5, 0.25]]) {
      const b = B[`finger${f}-1.` + k], dir = wp(B[`finger${f}-2.` + k]).sub(wp(b)).normalize();
      const inPlane = (v) => v.clone().addScaledVector(N, -v.dot(N)).normalize();
      turnTo(b, inPlane(dir), inPlane(dir).lerp(inPlane(midDir), 1 - keep).normalize());
    }
    // the thumb rests alongside the index: swing it in toward the palm
    const b = B['finger1-1.' + k], dir = wp(B['finger1-2.' + k]).sub(wp(b)).normalize();
    turnTo(b, dir, dir.clone().lerp(midDir, 0.35).addScaledVector(N, 0.25).normalize());
  }
  // a cascade: each finger curls a little more than the last, toward the palm
  const add = [55, 60, 35].map(a => a * grip);
  [[2, [14, 26, 14]], [3, [18, 32, 16]], [4, [22, 38, 18]], [5, [28, 44, 20]]].forEach(([f, ang]) => {
    for (let j = 1; j <= 3; j++) {
      const b = B[`finger${f}-${j}.` + k], nx = B[`finger${f}-${j + 1}.` + k];
      const dir = nx ? wp(nx).sub(wp(b)) : wp(b).sub(wp(b.parent)), a = THREE.MathUtils.degToRad(grip ? add[j - 1] : ang[j - 1]);
      turnTo(b, dir, dir.clone().normalize().multiplyScalar(Math.cos(a)).addScaledVector(N, Math.sin(a)));
    }
  });
  for (let j = 1; j <= 3; j++) {
    const b = B[`finger1-${j}.` + k], nx = B[`finger1-${j + 1}.` + k];
    const dir = nx ? wp(nx).sub(wp(b)) : wp(b).sub(wp(b.parent));
    turnTo(b, dir, dir.clone().normalize().addScaledVector(N, 0.18 + 0.5 * grip));
  }
}

// ── the relaxed stand every person is built in (then snapshotted as the base pose) ──
export function relaxedPose(sk) {
  const B = sk.byName;
  sk.root.updateMatrixWorld(true);
  // feet under the hips (the base mesh stands in an A with them apart), soles flat
  const ankle0 = wp(B['foot.L']).y;
  for (const k of ['L', 'R']) {
    const s = k === 'L' ? 1 : -1;
    turnTo(B['upperleg01.' + k], wp(B['lowerleg01.' + k]).sub(wp(B['upperleg01.' + k])), new THREE.Vector3(s * 0.035, -1, 0.0));
    turnTo(B['lowerleg01.' + k], wp(B['foot.' + k]).sub(wp(B['lowerleg01.' + k])), new THREE.Vector3(s * 0.01, -1, -0.01));
    B['foot.' + k].parent.getWorldQuaternion(_pq); B['foot.' + k].quaternion.copy(_pq.invert()); B['foot.' + k].updateMatrixWorld(true);
  }
  sk.root.position.y += ankle0 - wp(B['foot.L']).y;
  sk.root.updateMatrixWorld(true);
  for (const k of ['L', 'R']) {
    const s = k === 'L' ? 1 : -1;
    // arms hang a touch off the body (hands clear of the thighs), elbows soft
    turnTo(B['upperarm01.' + k], wp(B['lowerarm01.' + k]).sub(wp(B['upperarm01.' + k])), new THREE.Vector3(s * 0.2, -1, 0.0));
    turnTo(B['lowerarm01.' + k], wp(B['wrist.' + k]).sub(wp(B['lowerarm01.' + k])), new THREE.Vector3(s * 0.1, -1, 0.1));
    palmTo(B, k, new THREE.Vector3(-s, 0, 0.15));                 // palm to the thigh
    curlFingers(B, k, 0);
  }
}

// ── gaits, as fractions of the leg so every body moves like itself ──
const GAITS = {
  //        stance share, stride (cycle distance ÷ leg), cycles/s for a 0.85 leg, foot lift, hip drop, bob, arm swing, elbow, lean, foot spacing
  walk: { duty: 0.62, stride: 1.55, cadence: 0.95, lift: 0.09, drop: 0.03, bob: 0.016, arm: 0.3, elbow: 0.25, lean: 0.04, footX: 0.8, curl: 0 },
  run: { duty: 0.36, stride: 2.6, cadence: 1.4, lift: 0.3, drop: 0.08, bob: 0.03, arm: 0.6, elbow: 1.45, lean: 0.17, footX: 0.55, curl: 0.55 },
};

export function makeMotion(person) {
  const { sk, rig } = person, B = sk.byName;
  rig.updateMatrixWorld(true);
  const base = sk.bones.map(b => b.quaternion.clone()), root0 = sk.root.position.clone();
  const local = (b) => rig.worldToLocal(wp(b));
  // measurements, in the rig's frame, from the relaxed stand
  const M = { hip: {}, knee: {}, ankle: {}, shoulder: {}, elbow: {}, wrist: {} };
  for (const k of ['L', 'R']) {
    M.hip[k] = local(B['upperleg01.' + k]); M.knee[k] = local(B['lowerleg01.' + k]); M.ankle[k] = local(B['foot.' + k]);
    M.shoulder[k] = local(B['upperarm01.' + k]); M.elbow[k] = local(B['lowerarm01.' + k]); M.wrist[k] = local(B['wrist.' + k]);
  }
  M.thigh = M.hip.L.distanceTo(M.knee.L); M.shin = M.knee.L.distanceTo(M.ankle.L); M.leg = M.thigh + M.shin;
  M.arm = M.shoulder.L.distanceTo(M.elbow.L) + M.elbow.L.distanceTo(M.wrist.L);
  M.hipMid = M.hip.L.clone().add(M.hip.R).multiplyScalar(0.5);
  M.shoulderMid = M.shoulder.L.clone().add(M.shoulder.R).multiplyScalar(0.5);
  M.ankleH = M.ankle.L.y; M.s = M.leg / 0.85;               // 1 for an average 1.7 m adult
  M.pendulum = Math.sqrt(0.85 / M.leg) * Math.sqrt(M.s);      // longer legs swing slower (in body-relative time)

  const X = new THREE.Vector3(), Y = new THREE.Vector3(), Z = new THREE.Vector3(), rq = new THREE.Quaternion();
  const frame = () => { rig.getWorldQuaternion(rq); X.set(1, 0, 0).applyQuaternion(rq); Y.set(0, 1, 0).applyQuaternion(rq); Z.set(0, 0, 1).applyQuaternion(rq); };
  const W = (v) => rig.localToWorld(v.clone());
  const reset = () => { sk.bones.forEach((b, i) => b.quaternion.copy(base[i])); sk.root.position.copy(root0); sk.root.updateMatrixWorld(true); };
  const hipMidNow = () => rig.worldToLocal(wp(B['upperleg01.L']).add(wp(B['upperleg01.R'])).multiplyScalar(0.5));
  const placeHips = (target) => { sk.root.position.add(target.clone().sub(hipMidNow())); sk.root.updateMatrixWorld(true); };
  const footQ = (k, pitch) => { const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch); setWorldQuat(B['foot.' + k], rq.clone().multiply(q)); };
  const leg = (k, ankleLocal, pole = new THREE.Vector3(0, 0, 1), pitch = 0) => {
    ik2(B['upperleg01.' + k], B['lowerleg01.' + k], B['foot.' + k], W(ankleLocal), W(hipMidNow().add(pole.clone().multiplyScalar(M.leg))));
    footQ(k, pitch);
  };
  const arm = (k, wristLocal, pole) => ik2(B['upperarm01.' + k], B['lowerarm01.' + k], B['wrist.' + k], W(wristLocal), W(pole));
  const lean = (a) => { for (const n of ['spine04', 'spine03', 'spine02']) rotateBone(B[n], X, a / 3); };
  const twist = (a) => { rotateBone(B.spine03, Y, a * 0.6); rotateBone(B.spine01, Y, a * 0.4); };
  const look = (a) => { rotateBone(B.neck01, X, a * 0.6); rotateBone(B.head, X, a * 0.4); };
  const breathe = (t, k = 1) => { const b = Math.sin(t * TAU * 0.25) * 0.012 * k; rotateBone(B.spine02, X, -b); rotateBone(B.neck01, X, b); };

  function gait(G, t) {
    const f = G.cadence * M.pendulum, S = G.stride * M.leg, Lst = S * G.duty;
    const phL = ((t * f) % 1 + 1) % 1;
    // hips: a little lower than standing (knees never lock), bob twice a cycle, sway over the stance foot
    const hips = M.hipMid.clone();
    hips.y += -G.drop * M.leg + G.bob * M.leg * Math.cos(TAU * 2 * (phL - G.duty / 2));
    hips.x += 0.012 * M.leg * Math.cos(TAU * (phL - G.duty / 2)) * (G === GAITS.walk ? 1 : 0.4);
    rotateBone(sk.root, Y, -0.07 * Math.cos(TAU * phL));           // the pelvis turns with the stride…
    twist(0.09 * Math.cos(TAU * phL));                              // …the chest turns back against it
    placeHips(hips);
    lean(G.lean);
    look(-G.lean * 0.8);
    for (const [k, ph] of [['L', phL], ['R', (phL + 0.5) % 1]]) {
      const x = M.hip[k].x * G.footX, a = new THREE.Vector3(x, M.ankleH, 0);
      let pitch = 0;
      if (ph < G.duty) {                                            // stance: the foot stays put while the body passes over it
        const u = ph / G.duty;
        a.z = Lst * (0.5 - u) + 0.02 * M.leg;
        a.y += 0.06 * M.leg * ss(u, 0.7, 1);                        // heel rises for the push-off
        pitch = 0.5 * ss(u, 0.7, 1) - 0.22 * (1 - ss(u, 0, 0.15));  // heel strike (toe up) … toe-off (toe down)
      } else {                                                      // swing: lift, carry it forward, reach
        const u = (ph - G.duty) / (1 - G.duty);
        a.z = Lst * (ss(u, 0, 1) - 0.5) + 0.02 * M.leg;
        a.y += G.lift * M.leg * Math.sin(Math.PI * u) + (G === GAITS.run ? 0.22 * M.leg * Math.sin(Math.PI * Math.min(1, u * 1.5)) : 0);
        pitch = 0.5 * (1 - u) - 0.22 * ss(u, 0.75, 1);
      }
      leg(k, a, new THREE.Vector3(0, 0.1, 1), pitch);
    }
    for (const [k, sg] of [['L', -1], ['R', 1]]) {                  // arms counter-swing the legs
      const sw = sg * G.arm * Math.cos(TAU * phL);
      rotateBone(B['upperarm01.' + k], X, -sw);
      rotateBone(B['lowerarm01.' + k], X, -(G.elbow + 0.25 * Math.max(0, sw)));
      if (G.curl) curlFingers(B, k, G.curl);
    }
    return S * f;                                                   // ground speed for no foot slide
  }

  function sit(t, o = {}) {
    // a seat at knee height by default; the hips sit on it, thighs along it, feet on the floor under the knees
    const seatY = o.seatY ?? M.knee.L.y * 0.97, hips = new THREE.Vector3(0, seatY + 0.085 * M.s, o.seatZ ?? M.hipMid.z);
    rotateBone(sk.root, X, -0.06);                                  // the pelvis rolls back a little
    placeHips(hips);
    lean(0.08); breathe(t, 0.8);
    for (const k of ['L', 'R']) {
      const s = k === 'L' ? 1 : -1, hip = M.hip[k].clone().sub(M.hipMid).add(hips);
      const knee = hip.clone().add(new THREE.Vector3(s * 0.025 * M.s, 0.015 * M.s, M.thigh * 0.98));
      leg(k, new THREE.Vector3(knee.x + s * 0.01 * M.s, M.ankleH, knee.z + 0.05 * M.s), new THREE.Vector3(s * 0.05, 0.4, 1), 0);
      // hands rest on the thighs, palms down — as far along the thigh as the arm comfortably
      // reaches (≈90% extended), never a target the arm can't reach
      const sh = rig.worldToLocal(wp(B['upperarm01.' + k]));
      let onThigh = null;
      for (let u = 0.75; u >= 0.15; u -= 0.05) {
        onThigh = hip.clone().lerp(knee, u).add(new THREE.Vector3(s * 0.01 * M.s, 0.07 * M.s, 0));
        if (onThigh.distanceTo(sh) <= 0.9 * M.arm) break;
      }
      arm(k, onThigh, W(M.shoulder[k]).add(new THREE.Vector3(s * 0.6, -0.4, -0.6)));
      palmTo(B, k, new THREE.Vector3(0, -1, 0).applyQuaternion(rq));
    }
  }

  function bike(t, o = {}) {
    const bk = o.bike, spec = bk.spec, theta = TAU * (o.cadence ?? 1.1) * M.pendulum * t;
    rotateBone(sk.root, X, spec.pelvisTilt);
    placeHips(spec.hips);
    lean(spec.lean); look(-(spec.pelvisTilt + spec.lean) * 0.75);
    for (const [k, off] of [['L', 0], ['R', Math.PI]]) {
      const s = k === 'L' ? 1 : -1, c = theta + off;
      const pedal = spec.bb.clone().add(new THREE.Vector3(s * spec.pedalX, -Math.cos(c) * spec.crank, -Math.sin(c) * spec.crank));
      leg(k, pedal.add(new THREE.Vector3(0, 0.065 * M.s, -0.03 * M.s)), new THREE.Vector3(s * 0.08, 0.3, 1), 0.12 + 0.18 * Math.sin(c + Math.PI / 2));
      arm(k, spec.grip[k], W(M.shoulder[k]).add(new THREE.Vector3(s * 0.7, -0.6, -0.3)));
      palmTo(B, k, new THREE.Vector3(0, -1, 0.2).applyQuaternion(rq));
      curlFingers(B, k, 0.85);
    }
    bk.spin(theta, (o.speed ?? 0) * t);
  }

  return {
    M,
    pose(action, t = 0, o = {}) {
      frame(); reset();
      let v = 0;
      if (action === 'walk' || action === 'run') v = gait(GAITS[action], t);
      else if (action === 'sit') sit(t, o);
      else if (action === 'bike') bike(t, o);
      else breathe(t);                                              // idle
      rig.updateMatrixWorld(true);
      return v;
    },
    cycle: (action, o = {}) => (GAITS[action]?.cadence ?? o.cadence ?? 1.1) * M.pendulum,   // cycles (or crank turns) per second
    speed: (action) => GAITS[action] ? GAITS[action].stride * M.leg * GAITS[action].cadence * M.pendulum : 0,
  };
}

// ── a bicycle built to fit its rider ──
// Saddle height from the leg (the knee keeps a slight bend at the bottom of the
// stroke), crank ≈ 0.2 of the leg, seat tube at 73°, the bars where the rider's
// hands fall with the arms a little bent and the torso leaning ~25°.
export function makeBike(person, { frame: frameCol = 0x3f8f88, saddle: saddleCol = 0x6e4a32 } = {}) {
  const M = person.motion.M, s = M.s;
  const r = 0.35 * s, crank = 0.2 * M.leg * 0.85, bb = new THREE.Vector3(0, r - 0.07 * s, 0);
  // hips along the seat tube, far enough that the leg is 93% extended at the bottom of the stroke
  const st = new THREE.Vector3(0, Math.sin(73 * Math.PI / 180), -Math.cos(73 * Math.PI / 180));
  const ankleLow = bb.clone().add(new THREE.Vector3(M.hip.L.x * 0.9, -crank + 0.065 * s, -0.03 * s));
  let D = M.leg;
  for (let i = 0; i < 30; i++) { const hip = bb.clone().addScaledVector(st, D); hip.x = M.hip.L.x; D += (0.93 * M.leg - hip.distanceTo(ankleLow)) * 0.8; }
  const hips = bb.clone().addScaledVector(st, D); hips.x = 0;
  // shift everything so the hips sit at the rider's own hip position (the bike comes to the rider)
  const shift = new THREE.Vector3(0, 0, M.hipMid.z - hips.z); hips.add(shift); bb.add(shift);
  const pelvisTilt = 0.18, leanA = 0.24, tilt = pelvisTilt + leanA;
  const sh = (k) => M.shoulder[k].clone().sub(M.hipMid).applyAxisAngle(new THREE.Vector3(1, 0, 0), tilt).add(hips);
  const reach = new THREE.Vector3(0, -0.5, 0.86).normalize().multiplyScalar(0.9 * M.arm);
  const grip = { L: sh('L').add(reach), R: sh('R').add(reach) };
  grip.L.x = Math.max(grip.L.x, 0.2 * s); grip.R.x = Math.min(grip.R.x, -0.2 * s);
  const bars = grip.L.clone().add(grip.R).multiplyScalar(0.5);
  const seatTop = hips.clone().add(new THREE.Vector3(0, -0.095 * s, -0.01 * s));
  const headTop = bars.clone().add(new THREE.Vector3(0, -0.06 * s, -0.08 * s)), htDir = new THREE.Vector3(0, -Math.cos(0.35), Math.sin(0.35));
  const headBot = headTop.clone().addScaledVector(htDir, 0.16 * s);
  const front = new THREE.Vector3(0, r, headBot.z + (headBot.y - r) * Math.tan(0.35) + 0.04 * s), rear = new THREE.Vector3(0, r, bb.z - 0.43 * s);
  const cluster = bb.clone().lerp(seatTop, 0.8);

  const g = new THREE.Group(), fm = paint(frameCol), dark = paint(0x2a2628), metal = paint(0xb9b2a6), leather = paint(saddleCol);
  const tube = (a, b, rad, mat, parent = g) => {
    const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, d.length(), 10), mat);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); parent.add(m); return m;
  };
  const tr = 0.017 * s;
  for (const x of [-0.05 * s, 0.05 * s]) {                        // chainstays and seatstays, a pair each
    tube(bb.clone().setX(x * 0.6), rear.clone().setX(x), tr * 0.6, fm);
    tube(cluster.clone().setX(x * 0.3), rear.clone().setX(x), tr * 0.55, fm);
  }
  tube(bb, cluster, tr, fm); tube(cluster, seatTop, tr * 0.6, metal);              // seat tube, seat post
  tube(cluster, headTop, tr, fm); tube(bb, headBot, tr * 1.1, fm);                // top tube, down tube
  tube(headTop, headBot, tr * 1.25, fm);                                          // head tube
  for (const x of [-0.05 * s, 0.05 * s]) tube(headBot.clone().setX(x * 0.5), front.clone().setX(x), tr * 0.6, fm);   // fork
  tube(headTop, bars, tr * 0.7, metal);                                           // stem
  tube(grip.L, grip.R, tr * 0.6, metal);                                          // bars
  for (const k of ['L', 'R']) tube(grip[k], grip[k].clone().add(new THREE.Vector3((k === 'L' ? 1 : -1) * 0.06 * s, 0, 0)), tr * 1.1, dark);   // grips
  const sad = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), leather);       // saddle: wide at the back, a nose forward
  sad.scale.set(0.085 * s, 0.025 * s, 0.13 * s); sad.position.copy(seatTop).add(new THREE.Vector3(0, 0.01 * s, 0.03 * s)); g.add(sad);
  const wheels = [];
  for (const c of [front, rear]) {
    const w = new THREE.Group(); w.position.copy(c); g.add(w); wheels.push(w);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(r - 0.02 * s, 0.022 * s, 10, 48), dark); tyre.rotation.y = Math.PI / 2; w.add(tyre);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(r - 0.045 * s, 0.008 * s, 6, 48), metal); rim.rotation.y = Math.PI / 2; w.add(rim);
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * TAU, p = new THREE.Vector3(0, Math.cos(a), Math.sin(a)).multiplyScalar(r - 0.05 * s);
      tube(new THREE.Vector3(0, 0, 0), p, 0.0018 * s, metal, w).userData.noInk = true;
    }
    w.add(new THREE.Mesh(new THREE.SphereGeometry(0.02 * s, 8, 6), metal));
  }
  const crankG = new THREE.Group(); crankG.position.copy(bb); g.add(crankG);
  crankG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.05 * s, 0.01 * s, 20).rotateZ(Math.PI / 2).translate(-0.045 * s, 0, 0), metal));  // chainring
  const pedalX = M.hip.L.x * 0.9;
  for (const [sg, off] of [[1, 0], [-1, Math.PI]]) {
    const arm = new THREE.Group(); crankG.add(arm); arm.rotation.x = off;
    tube(new THREE.Vector3(sg * 0.06 * s, 0, 0), new THREE.Vector3(sg * 0.06 * s, -crank, 0), 0.008 * s, metal, arm);
    const ped = new THREE.Mesh(new THREE.BoxGeometry(0.08 * s, 0.015 * s, 0.05 * s), dark);
    ped.position.set(sg * pedalX, -crank, 0); arm.add(ped); arm.userData.pedal = ped;
  }
  ink(g, 'fine');
  return {
    group: g,
    spec: { bb, crank, pedalX, hips, pelvisTilt, lean: leanA, grip },
    // crank angle θ (pedals stay level as the cranks turn), distance rolled → wheel spin
    spin(theta, dist = 0) {
      crankG.rotation.x = theta;
      for (const arm of crankG.children) if (arm.userData.pedal) arm.userData.pedal.rotation.x = -theta - arm.rotation.x;
      for (const w of wheels) w.rotation.x = dist / r;
    },
  };
}
