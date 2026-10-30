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
- Age
- Style knobs
- Rules for stylizing
- Dressing (always clothed)
- Fitting cloth to the body
- Render styles (how a person is drawn)
- Hair, eyes, brows, face
- Making many people (the Citizen Maker)
- Posing
- Bugs this pipeline already hit
- Cost

## The pipeline
```
tools/human/bake.mjs        MakeHuman (pinned commit) → models/human/makehuman.json (+ ages.json)
js/anatomy.js               loadAnatomy · loadAges · buildBody(params) · statureFor · regionWeight · buildSkeleton
js/stylize.js               STYLES.real / STYLES.town · stylize(body, style)   (proportions: the SHAPE)
js/people.js                makePerson(spec): body → style → dress → hair & face → rig → pose → motion
js/render-styles.js         applyRenderStyle(root, name) · applySceneStyle(renderer, scene, name)  (how it is DRAWN)
js/motion.js                person.motion.pose('walk'|'run'|'sit'|'bike'|'idle', t) · makeBike(person)
tools/human-lab.html        styles side by side: ?styles=real,town&yaw=&pitch=&focus=full|head|hands|feet&action=walk&phase=0.25
                            &age=7 &top=sweater|tee|turtleneck &bottom=trousers|shorts|skirt &render=gouache|anime|clay|lowpoly|pixel|realistic
```
`makePerson` is the only way to make a person. Never render `buildBody` output directly.

## Body parameters
All 0..1, 0.5 = average adult: `sex` (0 female … 1 male), `muscle`, `weight`, `height`,
`proportions` (>0.5 idealised), `ancestry` {african, asian, caucasian} (normalised mix),
`expression` (facial units by name: `mouth-corner-puller` is the smile muscle,
`eye-*-slit` lifts the lower lids, `eye-*-opened-up` widens). `stature` sets the
height in scene units; leave it out and it comes from `statureFor(age, sex, height)`.
Vary people with these, not by editing meshes.

## Body types
People are not one body scaled. `body.shape` picks a body type (`BODY_TYPES` in
js/anatomy.js): slim, average, athletic, broad, curvy, hourglass, pear, round, plus size.
**A type is a whole body: its own build and muscle as well as its shape.** With the
silhouette chosen separately from the Build and Muscle sliders, a "lean" type could be
heavy and an "athletic" one soft, which made no sense. Picking a type in the maker sets
both sliders, which still fine-tune; batches vary them a little round the type. Each is MakeHuman's measured silhouette for that type (`bodyshapes`,
separate female and male sculpts; a missing one borrows the nearest) **plus a girth
recipe**, because the silhouettes alone move a girth only 2–4 cm and every type read as
the same. Girths are their own parameters too, −1..1: `bust`, `waist`, `hips`,
`shoulders`, `belly` (MakeHuman's "pregnant" target, kept to half), `seat`. Body types
fade in through the teens; children don't have them.
- **Check the landmarks, not just the widths** (figure-drawing canon): chin at 1 head, wrists
  near the crotch, fingertips at mid-thigh, knees about 1.75–2 heads above the ankles,
  women's shoulders about level with the hips (1:1.03) and men's wider (1:1.18). The natural
  build meets them (7.6–7.8 heads). What read as "weird" was everything around it: a
  gunslinger arm pose, leggings-tight trousers making carrot legs, and +15% heads.
  Trousers are straight-leg (`legHang` with a gentle taper), and the town head is +8%.
- **Proportions are enforced** (`BODY_RANGE`, `bodyRatios()` in js/anatomy.js). Front-view
  waist÷hip and shoulder÷hip widths, hip width÷stature and belly depth÷stature must fall in
  a realistic range for the person's sex (a woman's waist ≈ 0.78 of her hip width, hips ≈ 22%
  of her height; a man's waist ≈ 0.9 of his hips). Out of range, `buildBody` scales the body
  type back a little and then CORRECTS the girths that are out (wider waist, narrower hips,
  broader shoulders, less belly) until it fits, about 7 ms a person. The first, looser
  limits (waist 0.6 of the hips, hips 26% of height) let unrealistic pears through, and
  MakeHuman's own base woman falls outside the real range, so scaling the type back alone
  can't fix her. Children are exempt. Type recipes stacked on a heavy build had
  reached hips 50 cm across and waists half the hip width. `enforce: false` turns it off,
  for the lab only.
- Batches deal body types from a deck (men from the types that occur in men) and spread
  `build` and `muscle` over almost the whole range, two-dice rather than three. With a
  three-dice bell everyone came out near average and the crowd looked cloned.
- Check a new type in the lab: `?shape=pear&weight=0.7&top=tee&bottom=skirt`, front AND side.

## Faces
`body.face = { shape, nose, noseWidth, lips, jaw, chin, cheekbones, cheeks, eyes, … }`
(−1..1). The shape is one of MakeHuman's head-shape targets (oval, round, square, long,
heart, diamond, soft; `FACE_SHAPES`) with a few features of its own, and the features
are MakeHuman's measured local targets (`FACE_FEATURES`). The three ancestry face sets
alone differ only subtly, mostly nose and lips, so on their own every citizen's face
looked the same.
- **Children have children's faces**, which fade out through the teens: bigger, wider-open
  eyes, a small button nose, fuller cheeks, a soft small chin, a high forehead, and fine,
  fair brows set a little higher. Without these they were adult faces on small bodies;
  proportions alone (heads tall, leg length) were already right. Keep the cheeks modest:
  more reads as puffy and jowly. Children also get a straight little tummy, not a waist.

## Age
`body.age` is in years, 1–90 (default 25). MakeHuman's age axis is not linear in years
(1 yr = 0, 11 = 0.1875, 25 = 0.5, 90 = 1); `ageWeights()` converts it and blends its
baby / child / young / old targets. Young adults use the full ancestry set (in
makehuman.json); every other age uses the averaged-ancestry targets in `ages.json`,
which `makePerson` loads on first use, with the young ancestry difference laid on top
at 70%. Stature follows a growth table (`statureFor`), and the height slider moves it
±6% for that age, so a "tall" seven-year-old is still a seven-year-old.
- **Size-dependent numbers scale with stature** (`k = stature / 1.7`): cloth thickness,
  ease, hang, shoe lift, and the fit smoothing's radius. One absolute 5 cm smoothing
  radius was a third of a toddler's torso and pinched their sweater to the width of the
  neck, with holes at the flanks.
- The style's `head` multiplier is relative to that person's own head, so a child's
  naturally big head stays a child's head, and isn't measured against an adult's.
- Check ages 3, 7, 12, 16, 30, 45 and 70 together in the lab, and children in sit and bike.

## Style knobs
| knob | what it does | real | town | storybook* | chibi* |
|---|---|---|---|---|---|
| `head` | × the person's natural head, scaled about the top of the neck | 1 | 1.15 | 1.55 | 2.6 |
| `hands` / `feet` | size about the wrist / ankle | 1 | 1.02 / 1 | 1.12 / 1.06 | 1.25 / 1.15 |
| `eyes` | eyeball + socket about each eye centre | 1 | 1.08 | 1.35 | 1.6 |
| `soften` | Taubin smoothing passes (rounds off small anatomical detail) | 0 | 3 | 3 | 4 |
| `expression` | facial units the style adds | none | none | eyes open a touch | eyes open a touch |
\* exaggerated styles: only used when someone asks for that look by name.

Every transform is blended by the skin weights (`regionWeight`), so it flows into the
neighbouring body exactly the way the skin bends. No seams and no hinges.

## The proportion rules (enforced in code)
- **People have human proportions unless a style is explicitly exaggerated.** The head
  must not be much bigger than the body just because a style was being tuned.
- Ordinary styles are held to `HUMAN_RANGE` in js/stylize.js: `head` 0.95–1.2 (× natural),
  `hands` 0.95–1.08, `feet` 0.95–1.06, `eyes` 0.95–1.15. `checkStyle()` clamps anything
  outside it and warns.
- Only a style that declares `exaggerated: true` (storybook, chibi) may leave the range.
  Don't add `exaggerated` to make a number "work". Use it only when the brief asks for
  that look.
- The town's default style is `town`: a real person, painted, with the head only a touch
  larger than life.

## Rules for stylizing
- **Rescale real parts; never invent or disconnect them.** A bigger head is the real head
  scaled about the real neck joint, not a new head on a stick.
- **In an exaggerated style, a bigger head needs slightly bigger hands and feet**, or they
  read as tiny at that scale.
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
- **Options:** `topType` sweater / sweatshirt / tee (sleeves end mid upper arm) /
  turtleneck, and `bottomType` trousers / baggy / shorts (just above the knee). How loose
  each top is lives in `TOP_FIT` (torso and sleeve ease, hang push, thickness, hem). Ease
  fades to nothing at the collar so it hugs the neck. Baggy trousers go through
  `legHang()`: per leg, the envelope falls plumb from the widest part of the thigh to a
  wide hem and never crosses the middle. The skirt (`bottomType: 'skirt'`) still builds
  but isn't offered: it can't yet move without a raised thigh poking through. Its skin
  weights are its own, the pelvis at the waist going to the thigh it lies over (only the
  cloth between the legs shares both), because skinned like trousers it split open
  between the legs. Saved skirts show as trousers.
- **No shoulder pads.** The pads were the posed body, not the cloth (the cloth stayed 1.2 cm
  off it). Lowering the arms from the A-pose at the upper arm alone made skinning bulge
  the shoulder top, so the collarbone takes half the drop (`relaxedPose`). Shoulders then
  slope from the neck. The top's weights are also blurred round the shoulder
  (`smoothWeights`), and its ease fades out onto the shoulder.
- **Sleeves end on a plane across the arm** (mid upper arm for a tee, at the wrist for long
  sleeves), like necklines: a weight boundary wanders into a ragged hem.
- **Necklines are a smooth tilted line round the neck** (lower at the front), not the
  neck bone's weight boundary, which zig-zags across the mesh at the base of the neck and
  sawtoothed both the collar and the skin under it. A skirt is
  Short options add only `legs` / forearm skin.
- **Arms clear the clothes.** After the relaxed pose, `clearHips()` swings each arm out
  just far enough that the hand hangs a finger's width off whatever is worn at the hips.
  At a fixed angle, the hands of a pear-shaped body went straight into her skirt.
- **A skirt falls from the hips.** `skirtShape()` measures the outer envelope of the hips
  and legs on the dense body mesh (arms left out), carries it down from the widest point,
  bridges the cleft between the buttocks, blurs it, and puts every skirt vertex below the
  waistband on it (the waistband stays fitted). History: cut from the body alone it
  ballooned and tucked in at the hem like a sack; pushed through the torso's `hang()` it
  got a shelf under the seat (the hips' side width spread round to the back, and the capped
  push stopped short of a 10 cm crease) and lumps (the sparse skirt mesh left empty cells).
  Printing one column (y, z) after each stage found it in one go.
- **Shorts are cut on a level plane above the knee**, not along the knee's weight field,
  whose iso-line wandered into a ragged hem.
- **No clothes in a skin colour.** From across the plaza a tan top on tan skin reads as no
  top, and tan shorts on brown legs read as bare legs all the way up. Tan and brown are out
  of the swatches (`TOP_COLOURS`, js/citizens.js), and a generated person never gets a top
  or bottoms close to their own skin (cream on the fairest skin, charcoal on the deepest).
- Shoes are the town's S-profile sneaker fitted to the real foot's measured length and
  width, riding the foot bone. The bare foot is never kept.

## Fitting cloth to the body
Cloth that hugs the real anatomy shows every rib, nipple and navel, and in clay or
realistic light that reads as a painted-on body. The fit goes in three steps:
1. **A smoothed, hidden copy of the torso** (`fitPos` in makePerson) is what clothes are
   cut from and pushed out of. It is never drawn. `spatialSmooth` averages each torso
   point with every point within 2σ (σ = 5 cm × k), Gaussian- and **area-weighted**
   (otherwise the densely meshed navel outvotes the surface round it), moving only along
   the averaged normal. Then a short `outOnly` pass fills remaining pits. The legs are
   faded out just above the crotch, so two legs stay two legs.
2. **Drape:** offset along the (neighbour-averaged) normals, Taubin-smoothed with the hem
   fixed, pushed back out wherever it sank in.
3. **Hang:** a top falls from the bust and shoulder blades instead of following the waist
   in. It works in cylinder coordinates about the torso's axis. It fades in below the
   armpits and out above the hem, because a hard start creased the bust and a push above
   a fixed hem flared it.
- **Bugs it hit:** (a) plain neighbour (Laplacian) smoothing barely moves a dense mesh: 22
  passes moved the chest 7 mm. (b) Free spatial averaging collapsed vertices into fans,
  and moving along each vertex's own normal dug craters. (c) The flattened navel became a
  knot of tiny folded triangles whose normals pointed anywhere, so normals are averaged
  over 8 rings of neighbours before anything is offset along them. (d) **The navel
  bulge:** the hang measured each row's axis as the mean of its vertices, the navel's
  dense vertices dragged it 2 cm forward, and radii falling from the row above (measured
  round the old centre) pushed the belly out in a lump. The axis is now the middle of each
  row's extent, smoothed between rows. When a dent or lump shows, print one column of
  vertices (y, z) through it after each stage (fit → drape → hang). The stage that
  changes it is the culprit. Looking at renders alone took several wrong guesses.

- **Cloth skims over anatomy, it never shows it.** After draping, the shirt's torso (hip to
  chest) and the bottoms' seat and crotch get their own spatial smoothing, followed by a
  pit-filling pass. The lit styles (clay, realistic) showed the navel and the crotch through
  a tee and shorts. That's too much, so always check clothing in clay, front and side.

## Render styles (how a person is drawn)
Proportions (`style`, js/stylize.js) shape the body. The render style (`render`,
js/render-styles.js) only changes how it's drawn, and can be swapped at any time with
`person.setRender(name)`, no rebuild:
| render | materials | outline | scene |
|---|---|---|---|
| gouache | cel bands, paper grain (style.js `paint`) | wobbling hand-drawn | flat |
| anime | MeshToon, two hard tones | crisp, even width | flat |
| clay | matte MeshStandard (skin and hair through a warm multiplier) | none | RoomEnvironment, ACES |
| lowpoly | flat-shaded Lambert on vertex-clustered geometry (finer cells for face, hands, brows) | none | flat |
| pixel | MeshToon, three tones | thin | drawn at 0.3 pixel ratio, `image-rendering: pixelated`; faces keep only their silhouette |
| sketch (Hand-drawn) | a light colour wash on paper, pencil hatching in the shadows | pencil, wobbling | paper |
| watercolor | cool shadows, warm light, pigment pooling at the wash's edge, uneven wash | thin brown, wobbling | paper |
| comic | two tones, halftone dots in the shade | bold, even | flat |
| flat | clean vector colour, one soft step | none | flat |
| realistic | MeshPhysical skin, cloth and hair sheen, clearcoat eyes | none | environment, ACES, soft shadows |
- **Filmic tone mapping greys skin out.** Skin and hair are vertex-coloured over a white
  material, so the lit styles give them a warm multiplier colour (warming the material
  colour of a vertex-coloured mesh does nothing). Anime faces get a softer ramp than
  clothes: two hard tones across a face read as blotches.
- Meshes are tagged with `userData.role` (skin / cloth / hair / eye / glint / brow / shoe
  / sole / prop) and keep their base colour in `userData.base`, so `recolor()` and style
  swaps work both ways. Props (bench, bike, ground) go through `applyRenderStyle` too.
- **three.js only tone-maps what is drawn to the screen.** A portrait rendered into a
  `WebGLRenderTarget` came out blown white in clay and realistic. The maker draws
  portraits into a corner of the screen, reads them back with `gl.readPixels`, then
  redraws the frame in the same task.
- The lit styles show what the toon styles hide: dents and lumps in cloth. Check clothing
  in clay and realistic, front and side.

## Hair, eyes, brows, face
- **Hair is one grid over the head (js/hair.js), never a sphere with triangles thrown away.**
  Columns run round the head and rows from the crown down. Each column follows the
  smoothed scalp (`headMap().scalp`) lifted by the style's thickness and crown volume,
  and for longer styles hangs as a curtain below the ears. Each column **ends exactly
  on its cut line**: the fringe across the face, the style's length at the sides and
  back. Rows are spread along each column's own length, so the edge is a clean curve by
  construction, with a lip of thickness. Short styles taper to the skin at the nape and
  round the ears.
- **Locks over the shell.** One smooth shell, however well cut, reads as a plastic helmet.
  Over it go locks: tapered clumps, each following a column from the crown to its cut
  and on a little past it to a soft point, in two staggered layers, each lock slightly
  above its neighbour (at one height they z-fight into noisy stripes), dark at the root
  with a band of shine. The shell beneath, in the locks' shade, keeps coverage and the
  clean hairline. A ponytail or bun has locks pulled back from the hairline to the tie,
  and its tail is locks twisting round a core. Curls are ringlets: locks that coil round
  their own path from crown to ends, big and loose (about 21 per layer). A cloud of
  same-size balls, each outlined, read as bubble wrap, and tight little coils read as rope. Too many locks makes the outline busy: about
  32–40 per layer.
- **A hairline thins to nothing.** Every edge of short hair (except a fringe that hangs over
  the forehead) is a hairline: the shell and the locks ride the same tapered surface
  (`taper()`), the sides and back thinning all the way down from the crown and the front
  just at the forehead, with only a sliver of lip in the hair's own colour. Locks stop
  just short of a hairline and settle flat. Before this: full-thickness edges and a dark
  lip read as the rim of a wig, locks spilled past the edge onto temples and ears, and
  tapering only near the end bulged then tucked in, a bowl cut.
- **The head map must include the neck.** Built from head vertices only, the radius map had
  no data below the skull and filled it from the back of the skull, so the nape hair
  stood out at skull width over the neck. The nape hairline sits at e ≈ −0.55, nearly
  level across the back.
- **Interpolate a hairline with a spline, not a smoothstep per segment.** Smoothstep has
  zero slope at every knot, so the line came out as steps and plateaus. `spline()` is a
  monotone cubic, so it can't overshoot. The temple is a rounded corner. No strand ripples
  at the crown, where they all meet in a spike.
- **The hairline is placed from the face, not per style:** `headMap()` gives `hairlineE`,
  the elevation a quarter of the brow-to-chin height above the brows. Styles that show
  the forehead start there; a fringe comes down from it, never higher. Real average
  proportions (the face in thirds, the forehead near half the brow-to-chin height) read as
  a huge forehead on a drawn character, and so did fixed per-style elevations.
- **Built the way hair artists build cards** (80.lv, Games Artist breakdowns): the base mass
  hides the scalp; big clumps, then a top layer with air between, then thin breakup locks,
  with clump widths varied; short transition locks along hairlines so the edge is soft; a
  few flyaways last on longer hair; occlusion baked into the vertex colours (deep and
  underside darker).
- **Strand highlight, not painted shine:** every hair mesh carries `hairDir` (the strand
  direction), and `withSheen()` in js/render-styles.js adds a Kajiya-Kay highlight (two
  shifted lobes, after Scheuermann 2004) drawn per style: soft in gouache, an angel ring
  in anime, two-lobe in realistic, none in clay. Keep it subtle (stronger read as metal or
  plastic), and never give a vertex a zero `hairDir`: NaN rendered as white slivers.
- **Hair grows from a crown whorl**, a little behind the top of the head (`flow()` in
  js/hair.js): each lock follows the head from the whorl to its column's end. Rooted at the
  pole, every lock met in one point and the top of the head was a pinwheel of outlines.
  The base shell's columns start at exactly one point with one shared normal (nearly
  meeting, they drew a star), the head map's top rows are evened out round the head
  (noisy pole cells made ridges), and the base shell has no strand highlight (on a smooth
  cap it only drew a ring at the crown). Hair never goes inside the real head above the
  ears: `headMap().reach()` is the highest raw cell round a direction (blending passed
  under skull bumps and the scalp showed through short hair).
- Styles are data (`HAIRSTYLES`): buzz, crop, pixie, bob, long bob, ponytail, bun, curls.
  A new style means new numbers (fringe height and sweep, face window, side/back ends,
  curtain cut / A-line / bell / tuck), plus an extra mesh for a tail or bun.
- **Bugs the hair already hit, so check for them:**
  - *Wrong winding:* every normal pointed into the head. Double-sided shading hid it, but
    the outline (back faces pushed out along the normals) then sat on the hair and showed
    through as black holes. Check `normal · (vertex − centre) > 0`.
  - *Aliasing:* strand grooves at up to 97 waves round a 112-column grid zig-zagged into
    flipped slivers. Keep geometric detail under half the grid's resolution, and use
    whole-number frequencies so the seam at the back meets. Curls are lumps a few
    centimetres across, not noise.
  - *Vector aliasing:* `d.multiplyScalar(r)` mutates `d`. Using `d` again afterwards
    collapsed the hair onto a unit sphere. Clone first.
  - *Sphere-and-mask hair* (the old approach) left ragged edges, and its hidden inner
    shell showed through the eye openings.
- Eyes are smooth spheres at the anatomical eyeball's centre and radius, painted
  sclera / iris (with a dark limbal ring at its rim) / pupil, plus a catchlight inside the
  iris, upper left. **The sphere's pole looks forward**, so the iris and pupil are rings of
  the mesh: with the pole up, the iris edge crossed the rows and came out blocky and dark.
- **Don't squint them.** The smile's `eye-*-slit` above ~0.05 (plus the base lids) left
  narrow dark slots that read as a grimace at plaza distance. Brows sit on the brow ridge
  (≈0.27 × eye spacing above the eye centres), not up on the forehead.
- **Short hair ends on a real hairline** (`hairline()` in js/hair.js): across the forehead,
  a little higher at the temples, straight down in front of the ear as a sideburn, arched
  over the ear, then down to the nape. Blending the fringe line straight into the side
  length cut a diagonal across the temple and left it bald. Taper the edge to just off the
  scalp (+0.025 R), never flush: flush, it z-fights the skin into a ragged edge. No
  "choppy" noise on cut lines: it reads as messy, not textured.
- The face's outline skips triangles inside the eye sockets (`userData.inkGeometry`), or
  the outline's back faces show through the eye openings as black.

## Making many people (the Citizen Maker)
- `citizens.html` + `js/maker.js` is the creator UI. Citizens are plain data
  (`js/citizens.js`): `toPersonSpec()` turns one into a `makePerson` spec.
  `person.restyle({...})` changes colours and hair in place; body, age, face, clothing
  type and proportion changes rebuild the person. The render style is one choice for the
  whole roster (as in a game), kept in the browser and written into the export.
- **Batches:** `generateCitizens(n, { seed, style, women, ageMin, ageMax })` is seeded (the
  same seed always makes the same people) and spreads variety on purpose: sexes in the
  requested share, ages one per slice of the range (shuffled), and skin tones, face shapes,
  hair colours and names dealt from shuffled decks so all appear before any repeats. Grey
  hair comes in from the mid forties, never on children. Top and bottoms never match. The
  page takes `?batch=30&seed=harbour&ages=2-12&render=anime` (or `ages=kids|teens|young|adults|middle|seniors|all`);
  export gives `citizens.json` for a game.
- Each person is still ~90k triangles. The plaza shows at most 16 at once.

## Posing
Motion (walk, run, sit, bike, idle) is in [motion.md](motion.md). The relaxed stand:
bones keep world-aligned rest frames. Pose with world-space directions (`turnTo(bone,
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
