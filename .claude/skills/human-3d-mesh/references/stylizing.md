# Stylizing the parametric human

The person is built anatomically first and stylized second. The anatomy is real,
coming from MakeHuman's CC0 base human (a sculpted mesh, shape targets measured
from real people, a full rig with every finger joint, and skin weights). A style
is a short list of deliberate, measurable departures from it. That split is the
point: style can never quietly break anatomy, because the anatomy isn't
hand-made any more.

## Contents
- The pipeline
- Body parameters
- Style knobs
- Rules for stylizing
- Dressing (always clothed)
- Hair, eyes, brows, face
- Posing
- Bugs this pipeline already hit
- Cost

## The pipeline
```
tools/human/bake.mjs        MakeHuman (pinned commit) → models/human/makehuman.json
js/anatomy.js               loadAnatomy · buildBody(params) · regionWeight · buildSkeleton
js/stylize.js               STYLES.real / STYLES.town · stylize(body, style)
js/people.js                makePerson(spec): body → style → dress → hair & face → rig → pose
tools/human-lab.html        both styles side by side: ?styles=real,town&yaw=&pitch=&focus=full|head|hands|feet
```
`makePerson` is the only way to make a person. Never render `buildBody` output directly.

## Body parameters
All 0..1, 0.5 = average adult: `sex` (0 female … 1 male), `muscle`, `weight`, `height`,
`proportions` (>0.5 idealised), `ancestry` {african, asian, caucasian} (normalised mix),
`expression` (facial units by name: `mouth-corner-puller` is the smile muscle,
`eye-*-slit` lifts the lower lids, `eye-*-opened-up` widens). `stature` sets the
height in scene units. Vary people with these, not by editing meshes.

## Style knobs
| knob | what it does | real | town |
|---|---|---|---|
| `headsTall` | stature ÷ head height (vertex→chin); scales the head about the top of the neck | ≈7.3 (natural) | 5.4 |
| `hands` / `feet` | size about the wrist / ankle | 1 | 1.12 / 1.06 |
| `eyes` | eyeball + socket about each eye centre | 1 | 1.35 |
| `soften` | Taubin smoothing passes (rounds off small anatomical detail) | 0 | 3 |
| `expression` | facial units the style adds | none | eyes open a touch |
Every transform is blended by the skin weights (`regionWeight`), so it flows into the
neighbouring body exactly the way the skin bends. No seams and no hinges.

## Rules for stylizing
- **Rescale real parts; never invent or disconnect them.** A bigger head is the real head
  scaled about the real neck joint, not a new head on a stick.
- **Bigger head → slightly bigger hands and feet**, or they read as tiny at that scale.
- **Change one knob at a time and compare against `real`** side by side in the lab.
- **Expressions are subtle.** A smile at 0.55; eyes "opened-up" past ~0.25 reads as startled.
- **Real iris ≈29° from the eye's axis** (11.5 mm across a 24 mm eyeball), pupil ≈3–4 mm.
  An iris that fills the opening reads as black, empty eyes.

## Dressing (always clothed)
- Every body triangle is assigned to exactly one of: face and neck, hands, top, bottoms,
  shoes. Only face, neck and hands become skin. A missing garment is a hole, never a body.
- **Cut along smooth fields, never along triangle edges.** Cuffs and collar follow the
  rig's weight falloff (iso-lines of `regionWeight('wrist')` / `('neck01')`), and hems
  follow a height. Triangles are split exactly on the line (`cut()` in people.js), so
  hems are clean curves. Whole-triangle labelling gave stair-stepped hems.
- **Overlap every edge:** skin starts a little under the collar and cuffs, and the
  trousers start under the top's hem.
- **Drape, don't shrink-wrap:** lift the shell off the body (`thick` + `ease`), smooth it
  with the hem fixed, then push it back out wherever it sank inside. That smoothing is what
  turns anatomy into cloth.
- Shoes are the town's S-profile sneaker fitted to the real foot's measured length and
  width, riding the foot bone. The bare foot is never kept.

## Hair, eyes, brows, face
- Hair grows from a radius map of the head (`headMap`): `radius` is the real surface and
  `scalp` is a blurred copy, so hair doesn't follow the ears or nose. Keep **only the
  triangles where hair grows**. Hidden "sunk inside the head" geometry showed through the
  eye openings and made the eyes look black.
- Eyes are smooth spheres at the anatomical eyeball's centre and radius, painted
  sclera / iris / pupil, plus a catchlight placed low on the eye (not above the lid).
- The face's outline skips triangles inside the eye sockets (`userData.inkGeometry`), or
  the outline's back faces show through the eye openings as black.

## Posing
Bones keep world-aligned rest frames. Pose with world-space directions (`turnTo(bone,
from, to)` in people.js): arms hang about 0.2 out from vertical so the hands clear the
thighs; the forearm turns so the palm faces the thigh; fingers first close the base mesh's
splay toward the middle finger, then curl in a cascade (more toward the pinky); the thumb
swings in beside the index; feet sit under the hips with soles flat. Check the numbers
(palm normal, fingertip positions) when something looks off. A hand pressed against the
thigh with fingers wrapping round it reads as a claw, even when the pose is "correct".

## Bugs this pipeline already hit
- **A flag named like a field.** `spec.hair = true` (a debug switch) overrode the hair
  *colour*: `new THREE.Color(true)` is white. Debug switches get their own names (`showHair`).
- **Zero normals render white.** Vertices flattened onto a cut line had zero-length normals,
  and NaN in the toon shader. Point them outward.
- **Fields must read the surface being cut.** A field that read the original surface gave
  NaN on vertices created by an earlier cut.
- **A shrunken contact sheet lies.** 500 px tiles shown at 300 px made correct eyes look
  black. Judge eyes and hands at full size.
- **Paths relative to the page break in tools/ pages.** Load assets relative to the module
  (`new URL('../models/…', import.meta.url)`).

## Cost
About 90–100k triangles per person including ink (body ≈26k split across skin and
garments, hair ≈7k, both doubled by the outline). That's fine for a lab or a hero
character, but heavy for a crowd. Next steps: a CC0 MakeHuman low-poly proxy or
decimation for townsfolk, and gzip-friendly target packing (the model file is
≈2 MB gzipped).
