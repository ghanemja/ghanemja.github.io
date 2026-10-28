# Lighting, materials and texture

Two looks have been built: the **hand-drawn gouache** look (portfolio town, The
Vanishing Gallery) and a **photo-real fibre** look (crochet studio's yarn). Use the
first section for anything in this repo; the second when realism is the goal (or a
close-up "hero" render).

## Contents
- Hand-drawn look (this repo)
- Skin, hair and face colour
- Double-sided surfaces and back faces
- Ink outlines
- Photo-real fibres and cloth (from crochet)
- Lighting a close-up
- Performance

## Hand-drawn look (this repo)
From `js/style.js`: flat 3-band cel fills (shadow / mid / light) with hard edges, paper
grain plus pencil hatching that only bites in shadow, constant-on-screen-width ink with a
slow boil. **No environment maps, no specular, no shadow maps, no tone mapping**; a soft
`blobShadow` wash under each figure. Lights are a warm hemisphere (`0xfff6e8` /
`0xd8c8b0`, 1.35) and one warm sun (`0xfff2d8`, 1.6) at (14, 22, 10). Judge characters
under these lights — `tools/turntable.html` uses the same ones.
- Screen-space grain and hatch never swim on a moving surface; keep them screen space.
- Darks are lifted so shadows stay coloured, never black.
- Faceted low-poly is wrong for this world: smooth normals, enough segments that
  silhouettes and bevels stay round.

## Skin, hair and face colour
- **Use the soft ramp for skin, hair and the clothes next to them** (`paint(c, { soft: true })`
  → `RAMP_SOFT`). The default ramp's mid band darkened a light skin tone, lit from above,
  to exactly the tan of her hair — her chin "read as hair" and a pale bob blotched. Find
  this kind of bug by picking the exact pixel colours, not by eye.
- Near-white source skin (`#f9efe5`) reads as blank paper in gouache; use a warm light
  tone (`#efc3a2`) and match every repainted skin part (hands) to it. Skin palette:
  `SKINS` in folk.js.
- Lighter hatching on faces and hair; hatch blotches read as dirt on skin.
- Hair texture comes from geometry + vertex colour: strand grooves cut into the surface,
  a cool sheen streak across the strands, darker roots at the hairline.
- Eyes: dark pieces plus a small white catchlight each. Blush is a soft, low-contrast
  patch (`blushColor`) — ruddy for a jowly face, none for a hard one.

## Double-sided surfaces and back faces
- Skin drawn double-sided let you see the **inside of the face** through gaps in the hair.
  Draw skin front-only, with a hair-coloured back-face twin, so the inside of the head
  reads as hair; only the forward-facing face oval is skin.
- Hair locks and thin shells *do* need double-sided — single-sided ones render as solid
  black outline from behind.
- If a face piece is the whole skull, paint its back and top as hair so no bare scalp shows
  under a brim.

## Ink outlines
- Inverted hull pushed out in clip space (`ink(root, weight)`), so the stroke is a pen width
  in pixels near or far. `fine` weight for people.
- Fade the ink with a per-vertex `inkW` wherever one part grows out of another (shoulder,
  hip, neck) — otherwise a seam line is drawn round the joint.
- Features (eyes, brows, nose, mouth, cheeks) are `userData.noInk`; an inked nose was replaced by a
  soft one more than once.
- Inverted hulls on decimated or self-intersecting geometry scratch ("angry scratches" on
  the cars) — skip the hull there and keep flat fills plus inked edges.
- Things added after the outline pass has run must be registered (art-heist:
  `gpRegister(obj)`), or they show with no ink.

## Photo-real fibres and cloth (from crochet)
The yarn went from smooth pink pillars to a convincing plied wool. What mattered:
- **Structure beats texture.** Plies twisted round a core, fibres twisted round each ply,
  as real geometry half-embedded in a slightly thinner core — instead of a smooth tube with
  a texture. Scale fibre count to the scene budget (7 → 4 → 0 as stitch count rises).
- **Tube paths must be clean**: drop near-duplicate points; use a centripetal Catmull-Rom
  (no cusps or overshoot at hairpins); resample and smooth until no bend is tighter than
  the tube radius — a tube bending tighter than itself folds through into sliced sheets
  and blade-like slivers; shrink the radius where the curvature is tight. Use
  rotation-minimising (parallel-transport) frames so rings don't twist at inflections;
  segment count follows arc length.
- **Cap every tube end** — cut ends show a hollow interior where strands meet.
- **No translucent fuzz sleeves.** Blended or alpha-tested halos shattered into shards and
  speckles wherever strands crossed. Use `MeshPhysicalMaterial` sheen for softness instead;
  flyaway hairs as sparse line strands.
- **Fibre translucency**: wrapped diffuse plus a view-dependent rim, so back-lit edges glow
  instead of going black.
- **Variation per strand**: slight per-ply hue / per-fibre brightness offsets via vertex
  colours. A uniform colour reads as plastic.
- **Photo textures as neutral maps**: convert a colour photo (CC0, e.g. ambientCG) once into
  a neutral luminance map so any colour can tint it; use its normal and roughness maps along
  arc-length UVs. Keep the normal map gentle and colour contrast low. Keep a procedural
  fallback until the images load.
- Self-overlapping geometry gets shadow acne: raise the shadow `normalBias`.
- Same-colour repeated parts blend into one mass; a subtle alternating tint separates rows.

## Lighting a close-up
- Photo lighting: warm key, cool fill, a strong back/rim light, plus a soft environment
  (large soft key, window bounce). Rim light is what separates a figure from its backdrop.
- Make the subject readable before making it pretty: the first tutorial render framed a
  whole hand with the action a few pixels tall on a dark background, all one colour. Fix:
  camera close on the action, light backdrop, the moving part in a **contrasting accent
  colour** (yarn hue + 0.45), background detail reduced to what's needed.
- Longer lens (24–32° FOV; 85–135 mm equivalent for hero renders), shallow depth of field
  focused on the subject.
- Fit the shadow camera frustum to the subject each time it changes.
- Measure bounding boxes with the group's offset zeroed first — the studio seated every make
  after the first above or below the floor.
- Offline renders (Blender): Cycles on CPU, 64–96 samples with OpenImageDenoise; EEVEE needs
  a GPU/OpenGL context and won't run headless in the cloud container. Render one frame
  before committing to a batch.

## Performance
- Spend polygons on the silhouette, save them on interior detail. Person ≲6k tris;
  imported models: decimate, 512² WebP textures, Draco, ≲1.5 MB.
- If it looks faceted, add geometry; if it lags, cut texture size and triangles first,
  not smoothness.
- Merge static parts per material (art-heist cut draw calls ~42–55%).
- Set-dressing is cheap: background yarn balls became plain low-poly when they cost more
  than the subject.
- Measure GPU time with a sync (`gl.readPixels` after render), not `performance.now()`
  around `render()`. An adaptive detail budget probed from real frame rate and persisted
  per device (crochet's `yf_tri_budget`) keeps phones at ~30 fps.
