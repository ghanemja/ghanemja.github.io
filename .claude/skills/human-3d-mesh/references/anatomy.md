# Anatomy: building a figure that reads

Each rule names the bug that taught it. Numbers are this repo's units (a person ≈1.2 tall).

## Contents
- Proportions and placement
- Torso, shoulders, neck
- Arms and legs (skinned limbs)
- Hands
- Feet and shoes
- Head shape and side profile
- Face features
- Hair
- Hats and accessories
- Clothing
- Rigging and animation
- Animals
- Image-to-mesh and imported GLBs

## Proportions and placement
- ≈1.2 units tall, about four heads high; hips ≈0.565, shoulders ≈0.86 above the soles.
  Vary with `height` (±5%) and `build`. Check side by side with the player.
- Feet sit *exactly* on the drawn floor: sink 0. If people still sink, measure — in
  art-heist the people stood on the computed ground but the drawn surfaces sat 3–7 cm
  above it; the fix was standing on the highest drawn surface under the feet.
- Place people where they can stand: Vivi once stood inside a bench.

## Torso, shoulders, neck
- A belly pushes **forward**, never out to the sides where the arms hang — widening the
  waist sank Otto's arm into his body.
- Each body solves its own arm-hang angle from its waist width (`armOut`); stance `out`
  values are relative to it. Close-up check: no part of an arm or hand inside the torso.
- Shoulders grow out of the torso: the profile slopes from neck into shoulder and the
  arm joint sits *inside* that curve so the top of the arm forms the deltoid. No bolt-on
  shoulder balls or pads.
- Necks are a lathe that flares into the shoulders and tucks under the jaw, rising out
  of a collar. A straight cylinder looks "forced on".
- Anything on the shoulders (backpack straps) is traced over the measured shoulder and
  chest surface. Straps that poke above the shoulder line read as "wrong shoulders" or
  horns; straps that follow a collar loop over the neck.

## Arms and legs (skinned limbs)
- Each arm and leg is ONE skinned tube (`limb()`) whose weights blend across the
  knee/elbow, so bends curve. Stacked segments read as hinges with a step at the joint.
- Profiles go through `smooth()` (Catmull-Rom) so silhouettes are round, not faceted.
- Fade the ink where a limb grows out of the body (`inkW`, `limb(..., { inkFrom, inkTo })`)
  so no seam line rings the shoulder or hip.
- Hold arms a little off the sides so the outline draws between arm and body.
- Skin weights: cloth on the torso rides the spine; only the sleeve's *inner wall* blends
  to the arm. Smeared weights made the critic's sweater swing out like a bat wing, and
  a few long triangles from centre line to sleeve made the front "swipe up" after the
  hand — subdivide long triangles before blending. Measure the flare (it went
  0.21 → 0.01 at rest).
- Split welds that join unrelated parts (the critic's hands were welded to her hips in
  the jeans mesh) without opening a hole.

## Hands
Hands went through more rounds than anything else: balls → mittens → splayed paddles →
stubs → boxy robot hands → soft hands. What finally worked:
- A palm that is a squashed sphere, not a box.
- Four **separate** tapered fingers with round tips and gaps between them, fanned slightly,
  each inked on its own. Packed capsules ink as one mitten with a stub.
- Fingers start *inside* the palm so they grow out of it. Thumb tapers the same way, forward.
- Relaxed curl toward the thigh by default (never fully splayed, never a hard fist
  unless gripping). Wrists turned toward the thighs; no odd wrist twist.
- Size ≈ face length, matched to the wrist. Skin-coloured from exactly the cuff down.
- Holding something: fingers curl round the prop (`gripHand`), the prop goes in `hold`.
  Precise work (writing) uses two-bone IK (`ikArm`) so the hand lands on the target.
- For an organic close-up hand (crochet's `tools/make_hand.mjs`): a marching-cubes
  isosurface over metaball capsules laid along a finger skeleton, with the grip baked
  in. Higher subdivision keeps fingers separate.

## Feet and shoes
- Every person has shoes: a rounded upper on a separate sole, contrasting with the
  trousers so the feet read. Toe wider than heel, ≈15% of body height long.
- From the side the topline is an **S**: dips at the ankle, rises over the tongue, dips
  across the vamp, swells over the toe; the sole springs up at the toe. A flat shoe
  "curving up at the ankle" looks wrong.
- Size to the trouser: oversized shoes under slim jeans looked clownish (shrunk 20%
  about the ankle, then re-seated). Hems end inside the collar of the shoe.

## Head shape and side profile
- An upright oval: the player's head was nearly as wide as tall until the head joint was
  scaled to 0.88 wide × 1.04 tall. Watch every multiplier for overshoot — a deeper
  back-of-skull plus a deep hair shell made "a lying-down oval".
- Skull swells back and tucks in at the nape; flatter face with a brow ridge and eye
  sockets; forehead slopes back gently; jaw narrows to a chin with a corner below the ear.
- The neck leans forward and joins the **back** of the skull, behind the jaw — not the
  middle of the head.
- Side profile = the centreline: forehead → brow → nose → lip → crease under lip → chin →
  jaw. If the cheek is the outermost line side-on, it swallows the nose and the head reads
  as a ball: cheeks widen the face in x, barely push forward in z.
- Avoid a muzzle: too much forward swell low on the face reads as a snout.
- A real chin that shows from the game camera (slightly above): collars rode up over the
  lower face more than once — turn the collar's front down under the chin.

## Face features
- Features sit *on* the head surface (`sculpt`, `dirOf`, `lineAt` in faces.js) and are
  small, soft, `userData.noInk`. No emoji anywhere; portraits are rendered from the model.
- Noses are extruded from a side silhouette (bridge, tip, turn under; nostril wings).
  Size so it breaks the profile as a wedge, but a big multiplier on a round nose makes a
  ball. Types: button, straight, Roman, snub, cute.
- Mouths are tapered brush strokes cast to the character (worried, tired, grin, smirk),
  with matching brows, lids, lashes, eye highlights; lips and the crease below them are
  two steps, not one mass.
- Every face differs: `face.shape` (jaw, chin, cheeks, long, skull, brow), nose, mouth,
  eyes, brows, hair, beard, blush — cast to a personality.

## Hair
History: painted scalp (read as bald) → an open bowl wider than the skull (rim poked up
like horns; from above you looked into it) → eleven tube locks → a 200° lathe shell with
the gap rotated sideways → finally a bob sculpted on the skull. Rules:
- Grow hair from the skull's own shape (`sculpt` the head shape), lifted off it, **closed
  at the crown**, inside a hairline mask with a smooth edge. Never a cap or ball on top.
- Give it flow: a parting, strand grooves and a sheen band flowing away from the part,
  darker roots, drawn strands down the back, a fringe that sweeps across the forehead
  with a few loose locks. Bangs lifted off the brow so the eyes stay clear.
- Shape the fall: a bob is fullest at ear level and rounds in, ends turned under.
  Framing locks start at ear height, not the crown, or they cross the cheek in ¾ view.
- Keep the side profile: open the hair enough that eye, nose, lip and chin still read.
- When cutting hair off below a line, collapse vertices to the skull centre — clamping
  them onto one ring made a fan of hatched slivers.
- Don't let the generated scalp texture show through (it read as a bald patch).
- Lathe phi starts at +z; never trust a guessed convention — place it, look from all
  four sides, correct.

## Hats and accessories
- Hats are made from the head they sit on: sculpt the wearer's head shape or fit a band to
  its measured width/depth. Cut the brim larger than the hair with a down-turned edge so it
  drapes over the hair like felt; clamp hair inside it so nothing pokes through.
- Enough profile points/segments for round things: an 11-point, 48-segment lathe made the
  beret round where fewer read as a faceted trapezoid.
- Don't flatten hair with a straight-sided tuck under a curved brim.
- Soft goods are soft: a backpack is a barrelled body with a domed flap, clasp, bellows
  pocket and handle — not a box — and sized to a real pack on a real back.

## Clothing
- Sleeves end in a crisp hem with a small lip, never a colour smear; if the sleeve covers
  the arm, run it to the hand (`spec.cuff` in folk.js) so there's no bare wrist tube.
- Paint boundaries where the geometry actually narrows (measure where the wrist leaves the
  sleeve) — the critic's cuffs were half skin-coloured for several rounds.
- Every outfit has a collar; clean edges on vests and aprons; apron ties aren't hoops.

## Rigging and animation
- Write poses in the model's own axes and convert per bone, so "swing forward" is forward
  however each bone is rolled. In folk: +Z forward, a negative X rotation swings a hanging
  limb forward. Bone-local guesses made legs swing sideways.
- Check signs: a wrong-signed arm-spread folded both hands together in front.
- The knee folds on the **forward** swing. Folding on the back swing made a moonwalk —
  verified by tracking the lowest foot against the hips through a cycle (planted foot moved
  forward in 70% of frames before the fix).
- Arms counter-swing, open slightly at the elbow while walking; the elbow carries the reach.
- Alive, not posed: breathing, weight shift, glances, turn to face the player, gesture with
  the free hand while talking; the stance's idle loop (a sip, writing) plays on its own,
  not only when the player moves.
- Stretch/squash along the creature's own length (Biscuit's sprint scaled sideways).
- Wheels and rotating parts that share a parent origin fly off when spun.

## Animals
- A chest mass blending into the head, a round rump the tail grows from, legs thick enough
  to read emerging from those masses. Pin legs on a bare box read as a table.
- Legs pivot at hip/shoulder; tails are one curved tube.
- Sitting cats are posed: torso pitched up on tucked haunches.

## Image-to-mesh and imported GLBs
- Image-to-mesh output came out "slightly melted" and with wrong material assignments
  (SKIN covering face, eyes, front hair and cuffs; HAIR only the back; JEANS holding the
  hands). Recolour by connected mesh piece, not by material — and in the end the
  procedural rig replaced it entirely (also dropping a download).
- Make a flat-colour part map (each piece a distinct colour) before touching colours.
