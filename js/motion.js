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
import { rotateBone, regionWeight } from './anatomy.js';
import { paint, ink } from './style.js';
import { applyRenderStyle } from './render-styles.js';

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
// a finger is a hinge: every joint bends about the knuckle axis (palm direction × palm
// normal). Bending each joint "toward the palm normal" instead stops working once the
// first joint has turned the finger to face it — the middle and end joints then barely bend.
const hingeOf = (B, k, N) => wp(B['finger3-1.' + k]).sub(wp(B['wrist.' + k])).normalize().cross(N).normalize();
// grip 0 = a relaxed hand, 1 = a closed grip (round a handlebar)
export function curlFingers(B, k, grip = 0) {
  const N = palmNormal(B, k), midDir = wp(B['finger3-2.' + k]).sub(wp(B['finger3-1.' + k])).normalize();
  if (grip < 0.5) {
    // (any hand short of a full grip: at grip 0.25 or 0.55 this was skipped, and the base mesh's
    // fingers stayed fanned out wide)
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
  // a relaxed hand rests only gently bent (knuckle, middle, tip joints, degrees; more toward the
  // pinky). At up to 90° in all it read as a claw
  [[2, [8, 15, 8]], [3, [10, 18, 9]], [4, [12, 21, 10]], [5, [15, 25, 12]]].forEach(([f, ang]) => {
    for (let j = 1; j <= 3; j++) {
      const b = B[`finger${f}-${j}.` + k], nx = B[`finger${f}-${j + 1}.` + k];
      // a relaxed hand's cascade, deepening toward a fist as grip rises
      const dir = nx ? wp(nx).sub(wp(b)) : wp(b).sub(wp(b.parent)), a = THREE.MathUtils.degToRad(grip >= 0.5 ? add[j - 1] : ang[j - 1] + (add[j - 1] / Math.max(grip, 1e-6) - ang[j - 1]) * grip * 0.6);
      turnTo(b, dir, dir.clone().applyAxisAngle(hingeOf(B, k, N), a));
    }
  });
  if (grip >= 0.5) {
    // gripping a bar: the thumb wraps UNDER it from the inner side, toward the fingers —
    // down past the palm, then across toward the pinky side and back toward the wrist
    const F = wp(B['finger3-1.' + k]).sub(wp(B['wrist.' + k])).normalize();
    const inward = wp(B['finger5-1.' + k]).sub(wp(B['finger2-1.' + k])).normalize();
    const aims = [N.clone().addScaledVector(inward, 0.35).addScaledVector(F, -0.1),
      N.clone().multiplyScalar(0.45).add(inward).addScaledVector(F, -0.35),
      inward.clone().addScaledVector(F, -0.6).addScaledVector(N, -0.15)];
    for (let j = 1; j <= 3; j++) {
      const b = B[`finger1-${j}.` + k], nx = B[`finger1-${j + 1}.` + k];
      turnTo(b, nx ? wp(nx).sub(wp(b)) : wp(b).sub(wp(b.parent)), aims[j - 1].normalize());
    }
    return;
  }
  for (let j = 1; j <= 3; j++) {
    const b = B[`finger1-${j}.` + k], nx = B[`finger1-${j + 1}.` + k];
    const dir = nx ? wp(nx).sub(wp(b)) : wp(b).sub(wp(b.parent));
    turnTo(b, dir, dir.clone().normalize().addScaledVector(N, 0.18 + 0.5 * grip));
  }
}

// fingers laid out flat (amount 1 undoes the relaxed cascade): a hand resting ON something
export function flattenFingers(B, k, amount = 0.8) {
  const N = palmNormal(B, k);
  [[2, [14, 26, 14]], [3, [18, 32, 16]], [4, [22, 38, 18]], [5, [28, 44, 20]]].forEach(([f, ang]) => {
    for (let j = 1; j <= 3; j++) {
      const b = B[`finger${f}-${j}.` + k], nx = B[`finger${f}-${j + 1}.` + k];
      const dir = nx ? wp(nx).sub(wp(b)) : wp(b).sub(wp(b.parent)), a = -THREE.MathUtils.degToRad(ang[j - 1]) * amount;
      turnTo(b, dir, dir.clone().applyAxisAngle(hingeOf(B, k, N), a));
    }
  });
}
// give the hand an exact world orientation: fingers along F (wrist → knuckles), palm facing N.
// The forearm takes the twist first (palmTo), so the wrist only bends, as a real one does.
const _basis = (f, n) => {
  const F = f.clone().normalize(), Nn = n.clone().addScaledVector(F, -n.dot(F)).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(F, Nn, F.clone().cross(Nn)));
};
export function orientHand(B, k, F, N) {
  palmTo(B, k, N);
  const wr = B['wrist.' + k], f0 = wp(B['finger3-1.' + k]).sub(wp(wr)), n0 = palmNormal(B, k);
  const q = _basis(F, N).multiply(_basis(f0, n0).invert());
  setWorldQuat(wr, q.multiply(wr.getWorldQuaternion(new THREE.Quaternion())));
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
    // a relaxed stand, as posing guides draw it: the upper arm hangs close to the body and a little
    // back, the elbow soft and pointing BACK, the forearm carrying the hand slightly forward and out,
    // the palm toward the thigh, fingers gently curled. (Arms angled out from the shoulder bowed the
    // elbows sideways, a gunslinger's stance, and flat fingers read as claws.)
    // Lowering the arm from the base mesh's A-pose is shared with the collarbone, as in a real
    // shoulder: turned at the upper arm alone, skinning bulged the top of the shoulder into a pad.
    { const ua = B['upperarm01.' + k], dir = wp(B['lowerarm01.' + k]).sub(wp(ua)).normalize();
      const drop = Math.acos(THREE.MathUtils.clamp(dir.dot(new THREE.Vector3(s * 0.07, -1, -0.05).normalize()), -1, 1));
      rotateBone(B['shoulder01.' + k], new THREE.Vector3(0, 0, 1), -s * drop * 0.5); B['shoulder01.' + k].updateMatrixWorld(true); }
    turnTo(B['upperarm01.' + k], wp(B['lowerarm01.' + k]).sub(wp(B['upperarm01.' + k])), new THREE.Vector3(s * 0.07, -1, -0.05));
    turnTo(B['lowerarm01.' + k], wp(B['wrist.' + k]).sub(wp(B['lowerarm01.' + k])), new THREE.Vector3(s * 0.12, -1, 0.2));
    palmTo(B, k, new THREE.Vector3(-s, 0, 0.2));                  // palm to the thigh
    curlFingers(B, k, 0);
  }
}

// ── gaits, as fractions of the leg so every body moves like itself ──
const GAITS = {
  //        stance share, stride (cycle distance ÷ leg), cycles/s for a 0.85 leg, foot lift, hip drop, bob, arm swing, elbow, lean, foot spacing
  // strike: the foot's pitch as it lands (− toe up: a walk lands on the heel; + toe down: a run lands on the ball of the foot)
  walk: { duty: 0.62, stride: 1.55, cadence: 0.95, lift: 0.09, drop: 0.03, bob: 0.016, arm: 0.3, elbow: 0.25, lean: 0.04, footX: 0.8, curl: 0, strike: -0.22, heel: 0 },
  run: { duty: 0.36, stride: 2.6, cadence: 1.4, lift: 0.3, drop: 0.08, bob: 0.03, arm: 0.6, elbow: 1.45, lean: 0.17, footX: 0.55, curl: 0.55, strike: 0.2, heel: 0.03 },
};

// a hand on a handlebar, in the rig frame: fingers forward and a little down, palm down onto the bar
const GRIP_F = new THREE.Vector3(0, -0.28, 0.96).normalize();
const GRIP_N = new THREE.Vector3(0, -1, -0.25).addScaledVector(GRIP_F, -new THREE.Vector3(0, -1, -0.25).dot(GRIP_F)).normalize();

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
  M.palm = M.wrist.L.distanceTo(local(B['finger3-1.L']));       // wrist → middle knuckle
  M.palmHalf = 0.13 * M.palm;                                    // joint line → palm skin
  M.ankleH = M.ankle.L.y; M.s = M.leg / 0.85;               // 1 for an average 1.7 m adult
  M.pendulum = Math.sqrt(0.85 / M.leg) * Math.sqrt(M.s);      // longer legs swing slower (in body-relative time)

  // the thigh's front surface (its top, once seated), by fraction along it, measured on the
  // body itself, plus the trousers over it — what a resting hand actually lands on
  M.thighFront = (() => {
    const { A, pos, joints } = person.body, w = regionWeight(A, 'upperleg01.L');
    const h = joints['upperleg01.L'].head, ax = joints['lowerleg01.L'].head.clone().sub(h), L = ax.length(), bins = new Float32Array(11), p = new THREE.Vector3();
    ax.normalize();
    for (let i = 0; i < A.n; i++) {
      if (w[i] < 0.5) continue;
      p.fromArray(pos, i * 3).sub(h); const u = p.dot(ax) / L; if (u < 0 || u > 1) continue;
      p.addScaledVector(ax, -p.dot(ax)); const b = Math.round(u * 10); bins[b] = Math.max(bins[b], p.z);
    }
    return (u) => bins[Math.round(THREE.MathUtils.clamp(u, 0, 1) * 10)] + 0.009 * M.s;
  })();

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
  // put a hand's palm on `contact` (world), fingers along F, palm facing N (into what it
  // touches), the palm's centre `along` of the way from wrist to knuckles, skin `gap` off
  // the contact. The arm's IK targets the wrist that placement needs, then the hand is
  // oriented — the wrist is never what touches.
  const hand = (k, contact, F, N, pole, { along = 0.55, gap = 0 } = {}) => {
    const f = F.clone().normalize(), n = N.clone().addScaledVector(f, -N.dot(f)).normalize();
    const wrist = contact.clone().addScaledVector(f, -along * M.palm).addScaledVector(n, -(M.palmHalf + gap));
    ik2(B['upperarm01.' + k], B['lowerarm01.' + k], B['wrist.' + k], wrist, pole);
    orientHand(B, k, f, n);
  };
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
        // a runner's heel barely touches: the foot lands toe-down and the heel stays a little up
        const land = 1 - ss(u, 0, G.heel ? 0.35 : 0.15);
        a.y += 0.06 * M.leg * ss(u, 0.7, 1) + G.heel * M.leg * (0.4 + 0.6 * land);   // heel rises for the push-off
        pitch = 0.5 * ss(u, 0.7, 1) + G.strike * land + (G.heel ? 0.08 : 0);       // strike … toe-off (toe down)
      } else {                                                      // swing: lift, carry it forward, reach
        const u = (ph - G.duty) / (1 - G.duty);
        a.z = Lst * (ss(u, 0, 1) - 0.5) + 0.02 * M.leg;
        a.y += G.lift * M.leg * Math.sin(Math.PI * u) + (G === GAITS.run ? 0.22 * M.leg * Math.sin(Math.PI * Math.min(1, u * 1.5)) : 0);
        pitch = 0.5 * (1 - u) + G.strike * ss(u, 0.75, 1);
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
      // hands rest ON the thighs: the palm on the measured top of the trousers, fingers
      // laid along the thigh toward the knee — as far along it as the arm comfortably reaches
      const hW = wp(B['upperleg01.' + k]), kW = wp(B['lowerleg01.' + k]), along = kW.clone().sub(hW).normalize();
      const up = Y.clone().addScaledVector(along, -Y.dot(along)).normalize(), shW = wp(B['upperarm01.' + k]);
      let contact = null;
      for (let u = 0.7; u >= 0.2; u -= 0.05) {
        contact = hW.clone().lerp(kW, u).addScaledVector(up, M.thighFront(u)).addScaledVector(X, s * 0.008 * M.s);
        if (contact.clone().addScaledVector(along, -0.55 * M.palm).distanceTo(shW) <= 0.92 * M.arm) break;
      }
      const F = along.clone().addScaledVector(X, -s * 0.06).addScaledVector(up, -0.04);  // fingers toward the knee, a touch inward
      // the elbow points back and only a little out (pointed out to the side, the arms flared)
      hand(k, contact, F, up.clone().negate(), W(M.shoulder[k].clone().add(new THREE.Vector3(s * 0.12, -0.35, -0.6))), { gap: 0.002 * M.s });
      flattenFingers(B, k, 0.75);
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
      // the grip lies across the palm just short of the knuckles; the fingers wrap round it
      const g = W(spec.grip[k].clone().add(new THREE.Vector3(s * spec.gripLen * 0.5, 0, 0)));
      // the hand carries on the forearm's line down to the bar (aimed straight ahead while the
      // forearm sloped down, the wrist cocked up), rolled so the palm comes down onto the grip
      const reach = g.clone().sub(wp(B['upperarm01.' + k])).normalize(), Fw = GRIP_F.clone().applyQuaternion(rq);
      const F = Fw.lerp(reach, 0.7).normalize(), N = GRIP_N.clone().applyQuaternion(rq).addScaledVector(F, -GRIP_N.clone().applyQuaternion(rq).dot(F)).normalize();
      hand(k, g, F, N, W(M.shoulder[k]).add(new THREE.Vector3(s * 0.7, -0.6, -0.3)), { along: 0.85, gap: spec.barR });
      curlFingers(B, k, 0.85);                                      // wrapped round the bar (≈65° / 85° / 45°)
    }
    bk.spin(theta, (o.speed ?? 0) * t);
  }

  // ── bystanders: standing about with something in hand ──
  // Each activity has a prop (made once, kept on the rig, shown only while in use), held by placing
  // the palm on it and letting the arm's IK reach; the other arm stays relaxed. In rig space: x to
  // the person's left, y up, z forward.
  const props = {}, headRest = local(B.head);
  const toW = (v) => v.clone().applyQuaternion(rq).normalize();
  const showProp = (name) => { for (const [n, p] of Object.entries(props)) p.visible = n === name; return props[name]; };
  const makeProp = (name, build) => { if (!props[name]) { const g = build(); g.traverse(o => { if (o.isMesh) o.userData.role = 'prop'; }); rig.add(g); props[name] = g; applyRenderStyle(g, person.render ?? 'gouache'); } return props[name]; };   // (in the person's own drawing style)
  const setProp = (p, posLocal, quatLocal) => { p.position.copy(posLocal); if (quatLocal) p.quaternion.copy(quatLocal); };
  const S = M.s, hold = (k, contactL, F, N, poleL, o) => hand(k, W(contactL), toW(F), toW(N), W(poleL), o);
  const BYSTANDERS = {
    coffee(t) {
      const r = 0.036 * S, h = 0.1 * S;
      const cup = makeProp('coffee', () => {
        const g = new THREE.Group(), body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.82, h, 24, 1, true), paint(0xf1ebdf, { side: THREE.DoubleSide }));
        const lid = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, h * 0.12, 24), paint(0x4a3a30));
        const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.02, r * 0.92, h * 0.4, 24, 1, true), paint(0xb98a5e, { side: THREE.DoubleSide }));
        lid.position.y = h * 0.5; sleeve.position.y = -h * 0.02; g.add(body, lid, sleeve); return g;
      });
      showProp('coffee'); breathe(t);
      // a sip every ~7 s: up to the mouth and back
      const ph = (t % 7) / 7, sip = ss(ph, 0.55, 0.65) * (1 - ss(ph, 0.8, 0.9));
      const rest = M.shoulder.R.clone().add(new THREE.Vector3(0.1 * S, -0.22 * S, 0.22 * S));
      // the cup's rim meets the lips: its centre a little below and in front of the mouth
      const mouth = headRest.clone().add(new THREE.Vector3(-0.02 * S, -0.075 * S, 0.17 * S));
      // the cup tips its rim back toward the lips (a +x turn tipped it away: the lid faced out and the hand ended up under it)
      const c = rest.lerp(mouth, sip), tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -0.9 * sip);
      setProp(cup, c, tilt);
      look(0.05 - 0.15 * sip);
      // the right hand round the cup's side, the wrist straight: the hand points the way the forearm
      // does (elbow → cup), so it is aimed from where the elbow actually lands and re-aimed as the IK
      // settles (aimed on its own, the hand cocked back at the wrist). The palm faces the cup's axis
      // and the thumb runs up toward the rim.
      // the elbow stays down and in front of the body, even mid-sip (pointed out and back, the arm went up
      // like a salute and the hand covered the face)
      const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(tilt), pole = M.shoulder.R.clone().add(new THREE.Vector3(-0.12, -0.7 + 0.15 * sip, 0.15 + 0.25 * sip));
      let elbow = M.elbow.R.clone();
      for (let it = 0; it < 4; it++) {
        const F = c.clone().sub(elbow).normalize(), N = new THREE.Vector3().crossVectors(axis, F).normalize();
        hold('R', c.clone().addScaledVector(N, -r * 1.05), F, N, pole, { along: 0.45 });
        rig.updateMatrixWorld(true); elbow = local(B['lowerarm01.R']);
      }
      curlFingers(B, 'R', 0.6);
    },
    read(t) {
      const w = 0.42 * S, hgt = 0.3 * S;
      const paper = makeProp('read', () => {
        const cv = document.createElement('canvas'); cv.width = 256; cv.height = 184; const x = cv.getContext('2d');
        x.fillStyle = '#ece6d8'; x.fillRect(0, 0, 256, 184); x.fillStyle = '#2a2230'; x.fillRect(12, 10, 232, 18);
        x.fillStyle = '#8a8478'; for (let col = 0; col < 3; col++) for (let ln = 0; ln < 14; ln++) x.fillRect(12 + col * 80, 38 + ln * 10, 64 - (ln % 5 === 4 ? 24 : 0), 4);
        x.fillStyle = '#b8b0a0'; x.fillRect(92, 40, 72, 50);
        const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
        const g = new THREE.Group(), geo = new THREE.PlaneGeometry(w, hgt, 8, 1), P = geo.attributes.position;
        for (let i = 0; i < P.count; i++) P.setZ(i, -0.035 * S * (1 - (P.getX(i) / (w / 2)) ** 2));   // a soft fold down the middle
        geo.computeVertexNormals();
        g.add(new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ map: tex, side: THREE.DoubleSide }))); return g;
      });
      showProp('read'); breathe(t, 0.7);
      const c = M.shoulderMid.clone().add(new THREE.Vector3(0, -0.15 * S + 0.004 * S * Math.sin(t * 0.7), 0.3 * S));
      // the printed side faces the reader (turned round), tipped back toward their eyes
      const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.5 + 0.03 * Math.sin(t * 0.4));
      const q = qx.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI));
      setProp(paper, c, q);
      look(0.35);
      // reading: the eyes (and so the head) run along a line, flick back to the next one, and
      // work down the column, then over to the next column
      { const line = 3.2, lt = (t % line) / line, li = Math.floor(t / line), colN = Math.floor(li / 6) % 2;
        const sweep = lt < 0.85 ? -0.16 + 0.32 * ss(lt / 0.85, 0, 1) : 0.16 - 0.32 * ss((lt - 0.85) / 0.15, 0, 1);
        const yaw = sweep * 0.6 + (colN ? -0.12 : 0.12);                // (to the person's right = −y turn… mirrored for the page)
        rotateBone(B.neck01, Y, yaw * 0.5); rotateBone(B.head, Y, yaw * 0.5);
        look((li % 6) * 0.025); }
      // a hand at each side edge, just outside it: the fingers curl round BEHIND the page and the thumb
      // wraps over the edge onto the reader's side (palm facing in, the thumb went through the paper)
      const nrm = new THREE.Vector3(0, 0, 1).applyQuaternion(q), up = new THREE.Vector3(0, 1, 0).applyQuaternion(qx);
      for (const [k, sg] of [['L', 1], ['R', -1]]) {
        const inward = new THREE.Vector3(-sg, 0, 0).applyQuaternion(qx);
        const edge = c.clone().add(new THREE.Vector3(sg * w * 0.5, -0.02 * S, 0).applyQuaternion(qx)).addScaledVector(inward, -0.012 * S).addScaledVector(nrm, -0.012 * S);
        hold(k, edge, up.clone().addScaledVector(inward, 0.35), inward, M.shoulder[k].clone().add(new THREE.Vector3(sg * 0.3, -0.55, -0.25)), { along: 0.55, gap: 0.002 * S });
        curlFingers(B, k, 0.55);
        // the thumb: forward round the edge onto the printed side, then along it
        const aims = [nrm.clone().multiplyScalar(0.9).addScaledVector(inward, 0.5).addScaledVector(up, 0.2), inward.clone().addScaledVector(nrm, 0.25).addScaledVector(up, 0.15), inward.clone().addScaledVector(nrm, -0.05).addScaledVector(up, 0.1)];
        for (let j = 1; j <= 3; j++) {
          const b = B[`finger1-${j}.` + k], nx = B[`finger1-${j + 1}.` + k];
          turnTo(b, nx ? wp(nx).sub(wp(b)) : wp(b).sub(wp(b.parent)), toW(aims[j - 1]));
        }
      }
    },
    phone(t) {
      const pw = 0.072 * S, ph = 0.15 * S;
      const phone = makeProp('phone', () => {
        const g = new THREE.Group(), body = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.009 * S), paint(0x2f2b33));
        const screen = new THREE.Mesh(new THREE.PlaneGeometry(pw * 0.88, ph * 0.9), new THREE.MeshBasicMaterial({ color: 0x8fb8d8 }));
        screen.position.z = 0.0047 * S; screen.userData.noInk = true; g.add(body, screen); return g;
      });
      showProp('phone'); breathe(t, 0.7);
      // the palm turned up toward the face at chest height, then the phone laid IN that palm, from the
      // hand's own bones (aimed separately, the two never agreed and the phone ended up beside the hand)
      const c = M.shoulder.R.clone().add(new THREE.Vector3(0.12 * S, -0.17 * S, 0.24 * S));
      const faceN = new THREE.Vector3(0, 0.62, -0.78), upF = new THREE.Vector3(0.12, 0.78, 0.62).normalize();
      hold('R', c, upF, faceN, M.shoulder.R.clone().add(new THREE.Vector3(-0.12, -0.7, 0.1)), { along: 0.5 });
      palmTo(B, 'R', toW(faceN));                                           // (the forearm turns palm-up: the wrist alone can't)
      orientHand(B, 'R', toW(upF), toW(faceN));
      curlFingers(B, 'R', 0);
      rig.updateMatrixWorld(true);
      { const w = wp(B['wrist.R']), kn = wp(B['finger3-1.R']), n = palmNormal(B, 'R'), f = kn.clone().sub(w).normalize();
        const at = w.clone().lerp(kn, 0.75).addScaledVector(n, M.palmHalf + 0.006 * S).addScaledVector(f, 0.02 * S);
        const xa = new THREE.Vector3().crossVectors(f, n).normalize(), m4 = new THREE.Matrix4().makeBasis(xa, f, n);
        const qw = new THREE.Quaternion().setFromRotationMatrix(m4), qr = rig.getWorldQuaternion(new THREE.Quaternion()).invert();
        setProp(phone, rig.worldToLocal(at), qr.multiply(qw)); }
      // the fingers lie lightly along its sides
      for (const f of [2, 3, 4, 5]) { const b = B[`finger${f}-2.R`]; rotateBone(b, hingeOf(B, 'R', palmNormal(B, 'R')), THREE.MathUtils.degToRad(12)); }
    },
  };

  return {
    M,
    BYSTANDERS: Object.keys(BYSTANDERS),
    pose(action, t = 0, o = {}) {
      frame(); reset();
      let v = 0;
      if (!BYSTANDERS[action]) showProp(null);
      if (action === 'walk' || action === 'run') v = gait(GAITS[action], t);
      else if (action === 'sit') sit(t, o);
      else if (action === 'bike') bike(t, o);
      else if (BYSTANDERS[action]) BYSTANDERS[action](t);
      else breathe(t);                                              // idle
      rig.updateMatrixWorld(true);
      return v;
    },
    // where the shoulders really are for a riding posture (rig frame), so a bike's bars can be
    // put where the hands will actually fall
    shouldersFor(o) {
      frame(); reset();
      rotateBone(sk.root, X, o.pelvisTilt); placeHips(o.hips); lean(o.lean);
      rig.updateMatrixWorld(true);
      const r = { L: local(B['upperarm01.L']), R: local(B['upperarm01.R']) };
      reset(); rig.updateMatrixWorld(true);
      return r;
    },
    gripFrame: () => ({ F: GRIP_F.clone(), N: GRIP_N.clone() }),
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
  // the bars: pose the torso, measure the shoulders, reach the wrists ~85% of the arm
  // forward and down, and put each grip where that hand's palm closes — across the palm,
  // just short of the knuckles, a bar's radius under the skin
  const sh = person.motion.shouldersFor({ pelvisTilt, lean: leanA, hips }), { F, N } = person.motion.gripFrame();
  const tr = 0.017 * s, barR = tr * 1.1, gripLen = 0.06 * s, reach = new THREE.Vector3(0, -0.36, 0.93).normalize();   // bars clear of the knees
  const grip = {};
  for (const k of ['L', 'R']) {
    const sg = k === 'L' ? 1 : -1, wrist = sh[k].clone().addScaledVector(reach, 0.85 * M.arm);
    wrist.x = sg * Math.max(Math.abs(wrist.x), 0.2 * s);
    const palmAt = wrist.addScaledVector(F, 0.85 * M.palm).addScaledVector(N, M.palmHalf + barR);
    grip[k] = palmAt.add(new THREE.Vector3(-sg * gripLen * 0.5, 0, 0));          // grip[k] is the grip's inner end
  }
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
    spec: { bb, crank, pedalX, hips, pelvisTilt, lean: leanA, grip, barR, gripLen },
    // crank angle θ (pedals stay level as the cranks turn), distance rolled → wheel spin
    spin(theta, dist = 0) {
      crankG.rotation.x = theta;
      for (const arm of crankG.children) if (arm.userData.pedal) arm.userData.pedal.rotation.x = -theta - arm.rotation.x;
      for (const w of wheels) w.rotation.x = dist / r;
    },
  };
}
