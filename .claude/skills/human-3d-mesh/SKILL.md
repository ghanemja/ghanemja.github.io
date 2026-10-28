---
name: human-3d-mesh
description: Build, fix or review a procedural 3D human (or any character/creature) in three.js — body, head and face, hair, hands, shoes, hats, clothing, rigging and walk/idle animation, plus the lighting, materials and textures that make it read. Use whenever a task touches a person or animal model (js/folk.js, js/faces.js, js/human.js, js/player.js, cats in js/interiors.js), when a character "looks wrong", or before shipping any posed or animated figure. Distilled from the portfolio town, The Vanishing Gallery (art-heist) and the crochet studio's yarn and hand work.
---

# Human 3D mesh generation

People are what players look at most closely, and every fault below shipped at
least once before it became a rule. Most were invisible from the one angle the
author happened to check. So the workflow is: **build from overlapping masses →
check every angle up close → fix the cause, not the symptom → check again.**

## Workflow

1. **Read the existing rig first.** In this repo: `js/folk.js` (`makeFolk(spec)`,
   `limb()`, `makeHand`, `gripHand`, `STANCES`, `ikArm`, `poseFolk`), `js/faces.js`
   (`headShapeFor`, `sculpt`, `buildHead`, `NOSES`, `HAIR`), `js/human.js`
   (`LOOKS`, `person()`, `pose()`), `js/player.js` (`PLAYER_LOOK`, `dressPlayer`),
   `js/hands.js` (`makeHandGeometry`),
   `js/style.js` (`paint`, `ink`, `RAMP_SOFT`). Extend these; don't start a parallel rig.
2. **Build** following the rules in [references/anatomy.md](references/anatomy.md)
   (body, head/face, hair, hands, feet, clothes, hats, animals, rigging).
3. **Light and paint** following [references/lighting-and-materials.md](references/lighting-and-materials.md)
   (cel ramps, skin/hair colour, ink, double-sided faces, and the realistic-fibre
   lessons from crochet).
4. **Verify** with the turntable sheet — see [references/verification.md](references/verification.md):
   ```bash
   node tools/turntable.mjs player /tmp/tt     # or vivi | otto | pia | rex | critic
   ```
   Open the sheet image and actually look at all 22 tiles. Then check it in the town
   at game distance. Bump `js/main.js?cb=NN` in `index.html`, merge to `main`, push.

## The rules that matter most

- **Overlapping masses, not a box with sticks.** Torso, chest, rump and head blend
  into each other; limbs grow *out of* those masses, thick enough to read. Trace the
  silhouette in one outline — anything that would fall off is wrong.
- **The side profile is the test.** Front/back views hide stub limbs, ball noses,
  floating straps, flat faces and gaps. Side-on, a head must trace
  forehead → brow → nose → lip → crease → chin → jaw. The *centreline* features are
  the silhouette — never let a cheek bump become the outermost line.
- **Pivot at the joint.** Translate limb geometry so the origin is the hip, shoulder,
  knee or wrist before rotating it. Rotating about the middle tears it out of the socket.
- **One continuous surface per limb, strand, lock or tail.** A skinned tube blending
  across the knee/elbow, a `TubeGeometry` along a curve — never stacked segments or
  angled boxes (they show gaps and read as broken debris).
- **Pose the whole body.** A sitting/lying figure is its own pose (pitched torso,
  tucked legs), not a standing rig with one limb bent.
- **Hands are built from a hand skeleton in human proportion, as one surface.** Use
  `js/hands.js` (`makeHandGeometry`). Three bones per finger, an arched knuckle line,
  palm pads, an opposed thumb, a relaxed cascade curl; ≈0.74 × the forearm. A palm
  with sticks attached is never right, however it's tuned.
- **Real shoes.** An S profile on a sole with toe spring, sitting exactly on the floor.
- **Use real anatomy numbers, not eyeballed ones.** Look up the proportion (anatomy.md
  has the tables for hands) and check the result against it.
- **Heads are upright ovals, not balls.** Skull swells back and tucks at the nape,
  flat face, jaw narrowing to a chin, neck joining *behind* the jaw.
- **Hair and hats are fitted to the skull they sit on.** Sculpt from the head's own
  shape, closed at the crown; a hat wraps *over* the hair. Never a generic shell
  dropped on top — it pokes up like horns or leaves bald patches.
- **Every person is their own person** with a build, face, hair, outfit, stance and a
  small idle loop — never a recolour of the player, never arms dangling at random.
- **Same scale as the player.** ≈1.2 units, ~4 heads tall; vary `height` ±5% and
  `build`, never the whole-figure scale.
- **Fix the cause.** When something looks off, find out *why* (a ramp band, wrong
  material assignment, a skin weight, a sign) with a flat-colour part map, pixel picks
  or measurements before adding geometry to hide it. Patches on patches is how the
  critic's beret grew a lump.
- **Verify what you shipped, up close, in motion, from all four compass sides** plus
  three-quarter, high, low, and 3+ animation phases. A wide shot that contains the
  character does not count. Check every figure the change touched.

## Budget and style (this site)

Toon `paint()` materials + `ink(root, 'fine')`, no specular, no env maps, no shadow
maps (a `blobShadow` under the feet). Keep a person under ~6k tris; spend polygons
on the silhouette, not on interior detail. Smooth normals — faceted low-poly is wrong
for this world.
