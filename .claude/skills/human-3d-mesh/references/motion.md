# Motion: every body comes rigged

`makePerson` returns `person.motion`, built by `makeMotion(person)` in js/motion.js.
Nothing in it is tuned to one body: it measures the person (thigh, shin, leg, arm,
hip width, ankle height, shoulder and hip positions) and drives the skeleton from
those numbers. A tall man, a short woman, a storybook figure and a chibi all walk,
sit and ride without adjustment.

```js
const m = person.motion;
const v = m.pose('walk', t);      // t in seconds; returns ground speed — move the person at v so feet don't slide
m.pose('run', t);  m.pose('idle', t);
m.pose('sit', t, { seatY, seatZ });                  // defaults: a seat at knee height under the hips
const bike = makeBike(person); person.group.add(bike.group);
m.pose('bike', t, { bike, speed });                  // the bike is built to fit this rider
m.cycle('walk')                                      // cycles per second (phase = t · cycle)
```

## How it works
- **Base pose.** The relaxed stand (relaxedPose) is snapshotted. Every frame resets to it,
  then the action layers on top, so nothing accumulates.
- **Legs and arms by two-bone IK** (`ik2(upper, lower, end, target, pole)`): the end joint
  lands on the target and the middle joint bends toward the pole (knees forward, elbows
  out and back). Targets out of reach are clamped just short of a locked limb.
- **Feet set their own world orientation** (flat in stance, heel-strike toe-up,
  toe-off toe-down), so they stay planted whatever the leg did.
- **Gaits are fractions of the leg:** stride (cycle distance) 1.55 legs walking, 2.6
  running; stance share 62% / 36% (running has a flight phase); hips drop so the knees
  never lock, bob twice per cycle and sway over the stance foot; the pelvis turns with
  the stride and the chest turns back; arms counter-swing (running: elbows ≈85°, loose
  fists, forward lean). Cadence scales with √(leg), like a pendulum.
- **Sitting:** the hips go onto the seat, thighs along it, feet on the floor under the
  knees, and hands rest on the thigh as far along it as the arm reaches at about 90%
  extension (never a target it can't reach).
- **The bike fits the rider.** Saddle height is solved so the leg is about 93% extended
  at the bottom of the stroke; crank ≈0.2 × leg; seat tube 73°; the bars are put where
  the hands fall with the arms a little bent and the torso leaning about 25°. Pedals are
  driven by the crank angle, feet follow them by IK, the hands grip, and the head lifts
  to look ahead.

## Rules
- **Rotations use the rig frame** (+z forward, +y up). Leaning the torso forward is a
  *positive* rotation about +x; swinging a hanging limb forward is a *negative* one.
- **Never pose by hand-placing vertices or by per-body magic numbers.** Add a new action
  by expressing its targets in terms of `M` (the measurements), as the existing ones do.
- **Verify every action in motion:** at least three phases, from the side and three-quarter
  views, both styles. Look for planted feet, knees and elbows bending the right way, hands
  actually on what they hold, hips on the seat, and clothes following the joints
  (`tools/human-lab.html?action=bike&phase=0.6&yaw=-90`).
