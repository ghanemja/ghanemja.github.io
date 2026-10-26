# Rules for agents working in this repo

- **Work on `main` and push to `main`** unless Janelle says otherwise or there is
  a compelling reason not to (e.g. a risky/experimental change she should review
  before it goes live). This repo is served directly by GitHub Pages from `main`,
  so work parked on a side branch is invisible — a "finished" change isn't
  finished until it's on `main` and live at https://ghanemja.github.io.
  If a harness assigns you a session branch, still merge your work into `main`
  (fast-forward is fine) before calling the task done.
- Bump the cache token `js/main.js?cb=NN` in `index.html` whenever you edit `js/`.

## 3D characters & animation (learned the hard way — the broken-cat incident)

- **Pivot at the joint, never the center.** Before rotating any limb or part
  (a leg, a paw, a wing, a hand), translate its geometry so the origin sits at
  the attachment point (`geo.translate(...)` to put the hip/shoulder at 0),
  then position the mesh at that joint. Rotating a part about its own middle
  swings it out of its socket and it reads as torn off the body.
- **Connected parts, not jointed sticks.** A tail, rope, or strand made of
  separate angled boxes shows gaps and reads as broken debris — model it as
  one `TubeGeometry` along a curve.
- **A standing rig is not a sitting pose.** Don't reuse a walk-cycle body for
  a sitting/lying character by only moving one limb; pose the whole body
  (pitch the torso, tuck the hind legs) or build the pose separately.
- **Check the SIDE profile of everything — especially the extremities.**
  Review every character and creature side-on (and three-quarter), with
  particular attention to hands, feet, shoes, paws, ears, tails and hats.
  Front and back views hide the worst faults: side-on is where stub limbs,
  floating straps, pin-legs on a blob body, and gaps between masses show.
  A silhouette should read as one connected animal/person — if any part
  would fall off when traced in one outline, fix it. (The cat shipped with
  a broken side silhouette because it was only ever checked from behind.)
- **Build bodies as overlapping masses, not a box with sticks.** Give a
  creature a chest that blends into the head and a rump the tail grows
  from, and make limbs emerge from those masses, thick enough to read.
- **Verify what you shipped, up close, in motion.** Before pushing any change
  to an animated or posed object, take headless screenshots (a) zoomed close
  to THAT object, (b) at 3+ different animation phases, and (c) from an angle
  where the player character isn't blocking it. For anything with an opening
  or asymmetry (a hair shell, a hood, a partial lathe), verify all FOUR
  compass angles — a gap can look right from one side and be rotated wrong
  from another, and never trust a guessed angular convention (lathe phi
  starts at +z): place it, look, correct. A wide room shot that happens
  to contain the object does not count — that's how the broken cat got
  through. Check every object the change touched, not a sample.
- The 3D town is the main site (`index.html` + `js/`); `classic.html` is the
  plain card grid. `README.md` explains how to add a new shop/app.
