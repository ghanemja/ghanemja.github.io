# Motion: every body comes rigged

`makePerson` returns `person.motion`, built by `makeMotion(person)` in js/motion.js.
Nothing in it is tuned to one body: it measures the person (thigh, shin, leg, arm,
hip width, ankle height, shoulder and hip positions) and drives the skeleton from
those numbers. A tall man, a short woman, a storybook figure and a chibi all walk,
sit and ride without adjustment, and so do a five-year-old and an eighty-year-old (the
bike is sized from the rider's own leg and reach).

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
  knees, and the palms rest flat on top of the thighs, fingers toward the knee, as far
  along as the arm reaches at about 92% extension (never a target it can't reach).
- **The bike fits the rider.** Saddle height is solved so the leg is about 93% extended
  at the bottom of the stroke; crank ≈0.2 × leg; seat tube 73°; the bars are put where
  the hands fall with the arms a little bent and the torso leaning about 25°. Pedals are
  driven by the crank angle, feet follow them by IK, the hands grip, and the head lifts
  to look ahead.

## Hands that touch things (place the palm, never the wrist)
The first version aimed the arm's IK at the wrist. Hands sank into the thighs when
seated and hung next to the handlebar instead of holding it. Now `hand(k, contact, F, N)`:
- **The palm is what touches.** Give the contact point, the finger direction F and the
  direction the palm faces N. The wrist target is worked back from them:
  `contact − F·along·palmLength − N·(palm thickness + gap)`. The arm solves to that wrist,
  then `orientHand` sets the hand exactly (the forearm takes the twist first; the wrist
  only bends).
- **Measure the surface you land on.** Seated hands rest on `M.thighFront(u)`, the thigh's
  front (its top, once seated) measured from the body mesh, plus the trousers. A guessed
  offset above the thigh bone went under the skin.
- **Fingers are hinges.** Every joint bends about the knuckle axis (palm direction × palm
  normal). Bending each joint "toward the palm" works for the first joint, then the finger
  already faces the palm and the middle and end joints barely move (they measured 15°).
- **Match the fingers to what's under them:** `flattenFingers` on a thigh or table,
  `curlFingers(grip ≈ 0.85)` round a bar (≈65° / 85° / 45°). Past ~1 is a clenched fist.
  On a bar the thumb wraps under from the inner side, toward the fingers; left to the
  ordinary curl it hangs straight down.
- **Put props where hands can reach.** The bike's bars come from the rider's real shoulder
  positions in the riding posture (`motion.shouldersFor`), reaching about 85% of the arm.
  Estimated shoulders put the bars out of reach, so the arm stopped short and the hand
  drooped past the bar.
- **Check hands in close-up for every action:** `tools/human-lab.html?action=bike&focus=handL&yaw=90`
  (`handL` / `handR` frame the posed hand). Also print the joint angles: a hand can look
  plausible in one view while the fingers are straight.

## Rules
- **Rotations use the rig frame** (+z forward, +y up). Leaning the torso forward is a
  *positive* rotation about +x; swinging a hanging limb forward is a *negative* one.
- **Never pose by hand-placing vertices or by per-body magic numbers.** Add a new action
  by expressing its targets in terms of `M` (the measurements), as the existing ones do.
- **Verify every action in motion:** at least three phases, from the side and three-quarter
  views, both styles. Look for planted feet, knees and elbows bending the right way, hands
  actually on what they hold, hips on the seat, and clothes following the joints
  (`tools/human-lab.html?action=bike&phase=0.6&yaw=-90`).

## Lessons
- **A run lands on the forefoot.** Each gait has its own `strike` (the foot's pitch at
  contact: − toe up for a walk's heel strike, + toe down for a run) and `heel` (how far the
  heel stays up through stance). Reusing the walk's heel strike made the runner look like
  she was running on her heels.
- **On the bike, the hand carries on the forearm's line.** Fingers aimed dead ahead while
  the forearm sloped down to the bars cocked every wrist upward. The grip direction blends
  70% toward shoulder → grip.
- In the Citizen Maker a bike is `{ group, spec, … }`, not an Object3D: remove its `group`.
  `prop.parent` was undefined, so the bike stayed on screen after switching actions.
- **A relaxed stand, as posing guides draw it:** the upper arm hangs close to the body and a
  little back, the elbow soft and pointing BACK, the forearm carrying the hand slightly
  forward and out, the palm to the thigh, fingers gently curled (0.25). Arms angled out from
  the shoulder bowed the elbows sideways, a gunslinger's stance. To clear wide hips or a
  skirt, `clearHips()` angles the whole arm out from the shoulder, nearly straight (80% at
  the shoulder, 20% at the elbow). All at the elbow made a V. Before that, `clearSides()` angles the upper arm by the person's own
  width so the elbow hangs just clear of the torso: at a fixed near-vertical angle, every
  wider body's arms pressed into its sides, elbows tucked in, forearms flared out.
- **Rig checks (from rigging tutorials):** every bend goes through two-bone IK with a pole
  target, so knees and elbows can't fold backwards; and look at the shoulders and armpits
  side-on in a lit style, where deformation breaks first.
- **The base mesh's fingers are splayed.** `curlFingers` must close that splay for every hand
  short of a full grip (`grip < 0.5`), not only at grip 0: a relaxed hand at 0.25 skipped the
  step, and every citizen's fingers fanned out wide. Then the relaxed cascade itself must be
  gentle: about 8–15° at the knuckle, 15–25° at the middle joint and 8–12° at the tip, more
  toward the pinky. Up to 90° in all read as a claw.

## Bystanders
`m.pose('coffee' | 'read' | 'phone', t)` (the list is `m.BYSTANDERS`): standing with a prop in
hand. The prop is made the first time, kept on the rig, shown only while in use, and drawn in
the person's render style. It's held by placing the palm on it (`hand()`) and letting the
arm's IK reach, while the other arm stays relaxed. Coffee sips every ~7 s, the paper sways,
and the head looks down at the paper or phone. Lessons:
- **Face the prop to the person.** A newspaper or phone made with its face toward +z shows
  the print or screen to the viewer. Turn it round (rotate π about y), then tip it back.
- **Aim a sip at the mouth, not the head joint.** The mouth sits about 4 cm below and 14 cm
  in front of the `head` bone. Aimed higher, the cup went above the head.
- **Sitting with hands on the thighs, the elbows point back** (pole about (±0.12, −0.35, −0.6)
  from the shoulder). Pointed out to the side, the arms flared.
- New activity: add a function to `BYSTANDERS` in js/motion.js; the maker's plaza deals
  them to standing citizens at random.
- **Gripping a sheet** (newspaper): put the hand just OUTSIDE the edge, with the fingers curled
  behind the page and the thumb aimed round the edge onto the reader's side. With the palm
  facing in at the edge, the resting thumb went straight through the paper. Reading: the
  head sweeps along a line, flicks back, and steps down the column.
- **A sip keeps the elbow down and in front** (pole about (−0.12, −0.55, 0.4) from the
  shoulder). Pointed out and back, the arm saluted and the hand covered the face.
- **Lay a small prop IN the posed hand, from the hand's own bones** (wrist, middle knuckle,
  `palmNormal`), rather than aiming prop and hand separately. They never agreed, and the
  phone ended up beside the hand. Turning a palm up needs the forearm (`palmTo`), not just
  the wrist.

