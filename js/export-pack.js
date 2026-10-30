// ─── EXPORT PACK: the roster as a .zip a game engine can open ────────────────
// citizens.zip = citizens.json (the editable roster) + models/<name>.glb (one rigged,
// dressed, skinned person each, in the relaxed rest pose) + portraits/<name>.png.
// The GLBs carry plain PBR materials: the town's gouache/ink shaders are a look of this
// site, not something glTF can hold, so ink outlines are left out and each part keeps its
// colour (skin and the face use vertex colours). Each mesh's `extras.role` says what it is
// (skin / cloth / hair / eye / brow / shoe / sole).
import * as THREE from 'three';
import { makeBike } from './motion.js';
import { applyRenderStyle } from './render-styles.js';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = ~0; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return ~c >>> 0; };

// minimal "stored" (uncompressed) zip: GLB and PNG are already dense, so deflate would buy little
export function zip(files) {
  const enc = new TextEncoder(), now = new Date();
  const time = (now.getHours() << 11) | (now.getMinutes() << 5) | (now.getSeconds() >> 1);
  const date = ((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate();
  const parts = [], central = [];
  let offset = 0;
  for (const { name, data } of files) {
    const n = enc.encode(name), crc = crc32(data);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, time, true); lh.setUint16(12, date, true); lh.setUint32(14, crc, true);
    lh.setUint32(18, data.length, true); lh.setUint32(22, data.length, true); lh.setUint16(26, n.length, true); lh.setUint16(28, 0, true);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, time, true); ch.setUint16(14, date, true); ch.setUint32(16, crc, true);
    ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true); ch.setUint16(28, n.length, true);
    ch.setUint32(42, offset, true);
    parts.push(new Uint8Array(lh.buffer), n, data); central.push(new Uint8Array(ch.buffer), n);
    offset += 30 + n.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
  end.setUint32(12, cdSize, true); end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
}

// ── the outline, as geometry ──
// The town draws ink in a shader (constant pixel width, a little wobble); glTF can't carry that.
// What every engine can draw is the old inverted hull: the mesh again, pushed out along its
// normals, wound inside-out, in an unlit ink colour. It rides the same skeleton as the part it outlines.
const INK_M = 0.004;                                                   // metres of line at weight 1 on a 1.7 m person (≈ the maker's 1.7 px)
function outlineOf(o, k) {
  const g = o.geometry.clone();
  if (!g.index || !g.attributes.normal) return null;
  g.userData = {};
  const P = g.attributes.position, N = g.attributes.normal, W = g.attributes.inkW, w = o.material.uniforms.uWeight.value * INK_M * k;
  for (let i = 0; i < P.count; i++) { const s = w * (W ? W.getX(i) : 1); P.setXYZ(i, P.getX(i) + N.getX(i) * s, P.getY(i) + N.getY(i) * s, P.getZ(i) + N.getZ(i) * s); }
  g.deleteAttribute('inkW'); g.deleteAttribute('hairDir');
  const ix = g.index.array; for (let t = 0; t < ix.length; t += 3) { const x = ix[t + 1]; ix[t + 1] = ix[t + 2]; ix[t + 2] = x; }
  const mat = new THREE.MeshBasicMaterial({ color: o.material.uniforms.uColor.value.clone() });   // (exported as KHR_materials_unlit)
  const line = o.isSkinnedMesh ? new THREE.SkinnedMesh(g, mat) : new THREE.Mesh(g, mat);
  if (o.isSkinnedMesh) line.bind(o.skeleton, o.bindMatrix);
  if (o.isSkinnedMesh) { line.position.copy(o.position); line.quaternion.copy(o.quaternion); line.scale.copy(o.scale); }   // (a skinned hull is a sibling; a plain one is a child and shares the transform)
  line.userData = { role: 'outline' }; line.name = 'outline'; line.frustumCulled = false;
  return line;
}

// a person made for export: shader materials → plain PBR in the style's own colours; ink → outline hulls
function forExport(root, k) {
  const inks = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    if (o.material.isShaderMaterial) { inks.push(o); return; }
    const role = o.userData.role;                                      // (the rest of userData is rebuild recipes: not for a game)
    o.userData = role ? { role } : {}; o.geometry.userData = {}; o.name = role ?? o.name;
    const m = o.material;
    o.material = new THREE.MeshStandardMaterial({
      color: m.color.clone(), vertexColors: m.vertexColors, map: m.map, side: m.side,
      transparent: m.transparent, opacity: m.opacity, roughness: 0.85, metalness: 0,
    });
  });
  for (const o of inks) {
    const line = outlineOf(o, k), parent = o.parent;
    parent?.remove(o);
    if (line) parent.add(line);
  }
  return root;
}

// ── animation: the maker's motions, sampled into real clips ──
// The motions are procedural (two-bone IK on the skeleton, js/motion.js), so each one is baked
// by posing the person at 30 fps through one full cycle and recording every bone. Clips loop
// (last frame = first), play in place (no travel; the ground speed is in manifest.json), and
// only bones that move get a track.
const FPS = 30, TAU = Math.PI * 2;
// three's track names can't contain '.', and bones are called 'upperarm01.L': named with a
// placeholder while sampling, then put back in the finished GLB
const DOT = '_DOT_';
function restoreDots(glb) {
  const dv = new DataView(glb), jl = dv.getUint32(12, true);
  const json = new TextDecoder().decode(new Uint8Array(glb, 20, jl)).replaceAll(DOT, '.');
  const jb = new TextEncoder().encode(json + ' '.repeat((4 - json.length % 4) % 4)), rest = new Uint8Array(glb, 20 + jl);
  const out = new Uint8Array(20 + jb.length + rest.length), o = new DataView(out.buffer);
  out.set(new Uint8Array(glb, 0, 12)); o.setUint32(8, out.length, true); o.setUint32(12, jb.length, true); o.setUint32(16, 0x4e4f534a, true);
  out.set(jb, 20); out.set(rest, 20 + jb.length);
  return out.buffer;
}
// poses → AnimationClip: `nodes` are [{ obj, name }] to record (rotation always; position if it ever moves)
function bake(name, T, nodes, pose) {
  const n = Math.max(2, Math.round(T * FPS)), times = [], rec = nodes.map(() => ({ q: [], p: [] }));
  for (let i = 0; i <= n; i++) {
    pose(T * i / n); times.push(T * i / n);
    nodes.forEach(({ obj }, j) => { rec[j].q.push(...obj.quaternion.toArray()); rec[j].p.push(...obj.position.toArray()); });
  }
  const tracks = [], moved = (a, w, rest) => a.some((v, k) => Math.abs(v - rest[k % w]) > 1e-5);
  nodes.forEach(({ obj, name: nm, rest }, j) => {
    if (moved(rec[j].q, 4, rest.q)) tracks.push(new THREE.QuaternionKeyframeTrack(`${nm}.quaternion`, times, rec[j].q));
    if (moved(rec[j].p, 3, rest.p)) tracks.push(new THREE.VectorKeyframeTrack(`${nm}.position`, times, rec[j].p));
  });
  return new THREE.AnimationClip(name, T, tracks);
}
const nodeOf = (obj, name) => ({ obj, name, rest: { q: obj.quaternion.toArray(), p: obj.position.toArray() } });

// a person's five clips (idle, walk, run, sit, bike), plus a bike that fits them and its own ride clip
function bakeMotion(person, render) {
  const { sk, motion } = person, M = motion.M;
  for (const b of sk.bones) b.name = b.name.replaceAll('.', DOT);
  motion.pose('idle', 0);
  const nodes = sk.bones.map(b => nodeOf(b, b.name)), clips = [], info = {};
  const loop = (name, T, pose, extra = {}) => { clips.push(bake(name, T, nodes, pose)); info[name] = { duration: +T.toFixed(4), ...extra }; };
  loop('idle', 4, (t) => motion.pose('idle', t));
  for (const g of ['walk', 'run']) loop(g, 1 / motion.cycle(g), (t) => motion.pose(g, t), { speed: +motion.speed(g).toFixed(3) });
  loop('sit', 4, (t) => motion.pose('sit', t), { seatHeight: +(M.knee.L.y * 0.97).toFixed(3) });
  // the bike, built to this rider; one crank turn per cycle, and the wheels turn a whole number of times
  const bike = makeBike(person); applyRenderStyle(bike.group, render);
  const T = 1 / motion.cycle('bike'), r = 0.35 * M.s, turns = Math.max(1, Math.round(motion.speed('walk') * 2.2 * T / (TAU * r))), speed = turns * TAU * r / T;
  const [wf, wr, crank] = bike.group.children.filter(o => o.isGroup), arms = crank.children.filter(o => o.isGroup);
  const parts = [['wheel_front', wf], ['wheel_rear', wr], ['crank', crank], ['crank_arm_L', arms[0]], ['crank_arm_R', arms[1]], ['pedal_L', arms[0].userData.pedal], ['pedal_R', arms[1].userData.pedal]];
  for (const [nm, o] of parts) o.name = nm;
  bike.spin(0, 0);
  const bikeNodes = parts.map(([nm, o]) => nodeOf(o, nm));
  loop('bike', T, (t) => motion.pose('bike', t, { bike, speed }), { speed: +speed.toFixed(3) });
  const ride = bake('ride', T, bikeNodes, (t) => bike.spin(TAU * 1.1 * M.pendulum * t, speed * t));
  motion.pose('idle', 0); bike.spin(0, 0);
  return { clips, info, bike, ride };
}

// ── viewer.html: the zip's own three.js page. glTF can hold the outline but not the town's
// cel / paper / watercolour shaders, so the exact style ships as source next to the models and
// is re-applied by role (every mesh's extras.role arrives as userData.role). HANDOFF.md tells
// whoever (or whatever agent) picks the zip up how to use all of it.
const VIEWER = (style) => `<!doctype html>
<meta charset="utf-8"><title>Citizens</title>
<style>html,body{margin:0;height:100%}canvas{display:block}</style>
<script type="importmap">{ "imports": { "three": "https://unpkg.com/three@0.160.0/build/three.module.js", "three/addons/": "https://unpkg.com/three@0.160.0/examples/jsm/" } }</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { applyRenderStyle, applySceneStyle } from './three-style/render-styles.js';
const STYLE = ${JSON.stringify(style)};
const renderer = new THREE.WebGLRenderer({ antialias: true }); document.body.append(renderer.domElement);
const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(30, 1, 0.05, 100);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6); sun.position.set(14, 22, 10);
scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd8c8b0, 1.35), sun);
applySceneStyle(renderer, scene, STYLE);
const manifest = await (await fetch('./manifest.json')).json(), loader = new GLTFLoader();
const q = new URLSearchParams(location.search), CLIPS = ['idle', 'walk', 'run', 'sit', 'bike'];
let clip = q.get('clip') || 'idle'; const mixers = [], riders = [], bikes = [];
// the style is re-applied by role; the outlines (geometry) are set aside while it is
async function load(url) {
  const gltf = await loader.loadAsync(url), root = gltf.scene, lines = [];
  root.traverse(o => { if (o.isMesh && o.userData.role === 'outline') lines.push(o); });
  const homes = lines.map(l => l.parent); lines.forEach(l => l.parent.remove(l));
  root.traverse(o => { if (o.isMesh) { o.userData.noInk = true; const h = o.geometry.getAttribute('_hairdir'); if (h && !o.geometry.getAttribute('hairDir')) o.geometry.setAttribute('hairDir', h); } });
  applyRenderStyle(root, STYLE);
  lines.forEach((l, i) => homes[i].add(l));
  return { root, animations: gltf.animations };
}
for (const [i, c] of manifest.people.entries()) {
  const x = (i % 6 - 2.5) * 0.9, z = -Math.floor(i / 6) * 1.2;
  const p = await load(c.model); p.root.position.set(x, 0, z); scene.add(p.root);
  const m = new THREE.AnimationMixer(p.root); mixers.push(m);
  riders.push({ m, actions: Object.fromEntries(p.animations.map(a => [a.name, m.clipAction(a)])) });
  if (c.bike) {
    const b = await load(c.bike); b.root.position.set(x, 0, z); b.root.visible = false; scene.add(b.root);
    const bm = new THREE.AnimationMixer(b.root); mixers.push(bm); bm.clipAction(b.animations[0]).play(); bikes.push(b.root);
  }
}
function play(name) {
  clip = name;
  for (const r of riders) { for (const a of Object.values(r.actions)) a.stop(); r.actions[name]?.reset().play(); }
  for (const b of bikes) b.visible = name === 'bike';
  for (const btn of document.querySelectorAll('#bar button')) btn.style.fontWeight = btn.textContent === name ? '700' : '400';
}
const bar = document.body.appendChild(document.createElement('div')); bar.id = 'bar'; bar.style.cssText = 'position:fixed;top:8px;left:8px;display:flex;gap:6px';
for (const n of CLIPS) { const b = bar.appendChild(document.createElement('button')); b.textContent = n; b.onclick = () => play(n); }
play(clip); if (q.has('t')) for (const m of mixers) m.setTime(+q.get('t'));       // ?clip=walk&t=0.4 freezes a frame
camera.position.set(0, 1.2, 7); const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0.9, 0);
const fit = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', fit); fit();
const clock = new THREE.Clock();
renderer.setAnimationLoop(() => { const dt = clock.getDelta(); if (!q.has('t')) for (const m of mixers) m.update(dt); controls.update(); renderer.render(scene, camera); });
</script>
`;
const HANDOFF = (style, names, clips = {}) => `# Handoff: citizens.zip

For an agent (or person) putting these people into a game. Generated by the Citizen Maker
(https://ghanemja.github.io/citizens.html). The roster is drawn in the **${style}** style.

## What's here

| path | what |
|---|---|
| \`models/<name>.glb\` | one rigged, dressed person each (${names.length}: ${names.join(', ')}), **with baked animation clips** |
| \`models/<name>-bike.glb\` | a bicycle built to fit that person, with its own \`ride\` clip (wheels, crank, pedals) |
| \`portraits/<name>.png\` | the maker's portrait of each person |
| \`citizens.json\` | the editable roster: the recipe for every person (re-import it in the maker to change anyone) |
| \`manifest.json\` | \`{ render, fps, people: [{ name, model, bike, height, clips }] }\`: the style, files, and each clip's duration and ground speed |
| \`viewer.html\` | a working three.js page showing everyone **in the chosen style**; read it as the reference implementation |
| \`three-style/\` | the town's own style code (\`render-styles.js\`, \`style.js\`) that \`viewer.html\` imports |

## There are no texture images

Nothing in the zip is a texture map. Colour comes from two places only:

- **Vertex colours (\`COLOR_0\`)**: skin (face, hands), hair and eyes. The material's base colour is white (or a warm multiplier), so the engine MUST render vertex colours or these parts come out white.
- **Material base colour**: clothes (\`cloth\`), \`shoe\`, \`sole\`, \`brow\`.

So "combining the glb with the textures" means choosing one of the two routes below.

## Model facts

- glTF 2.0 binary, **Y-up, metres, facing +Z**; about 1.7 m for an adult (children and elders scale with age).
- One shared 76-bone MakeHuman-style skeleton, named \`root\`, \`spine01..05\`, \`neck01..03\`, \`head\`, \`clavicle.L/R\`, \`upperarm01/02.L/R\`, \`lowerarm01/02.L/R\`, \`wrist.L/R\`, \`finger1-1.L\` … \`finger5-3.R\`, \`upperleg01/02.L/R\`, \`lowerleg01/02.L/R\`, \`foot.L/R\`, \`toe1-1.L/R\`, \`pelvis.L/R\`. Left/right ends in \`.L\` / \`.R\`. Exported in a relaxed standing rest pose.
- **Animation clips are baked into every person's \`.glb\`**: \`idle\`, \`walk\`, \`run\`, \`sit\`, \`bike\` (see Animation below).
- Every mesh node has \`extras.role\`, which arrives as \`userData.role\` in three.js:

| role | meaning | skinned? | colour from |
|---|---|---|---|
| \`skin\` | face + neck, hands (two meshes; nothing else of the body exists, so everyone is always clothed) | yes | vertex colours |
| \`cloth\` | top, bottoms (and skirt if any) | yes | material colour |
| \`hair\` | hair shells / strands (may be several meshes) | no, rides the \`head\` bone | vertex colours |
| \`eye\`, \`brow\` | eyes, eyebrows | no, ride the \`head\` bone | vertex / material colour |
| \`shoe\`, \`sole\` | shoes | no, ride the \`foot\` bones | material colour |
| \`outline\` | the ink line as geometry (see below) | skinned if its part is | unlit ink colour |

- **Never delete the \`skin\`, \`cloth\` meshes**: the skin mesh covers only face, neck and hands, so removing a garment leaves a hole, not a body.
- Hair meshes may carry a custom \`_HAIRDIR\` attribute (strand direction, used by the hair highlight in the three.js style code). Ignore it elsewhere.

## Animation (the rigging, working)

Every \`models/<name>.glb\` carries these clips, sampled at ${30} fps from the maker's own motion code, keyed on the skeleton's bones (rotations, plus the \`root\` bone's position for the hip bob / seat height):

| clip | what | loop | extra |
|---|---|---|---|
| \`idle\` | standing, breathing | ${clips.idle?.duration ?? 4} s | |
| \`walk\` | one full stride cycle (left + right step) | ${clips.walk?.duration ?? '?'} s | ground speed ${clips.walk?.speed ?? '?'} m/s |
| \`run\` | one full cycle | ${clips.run?.duration ?? '?'} s | ground speed ${clips.run?.speed ?? '?'} m/s |
| \`sit\` | seated, hands on thighs, breathing | ${clips.sit?.duration ?? 4} s | hips lowered to a seat about ${clips.sit?.seatHeight ?? '0.44'} m high: put a bench/chair there |
| \`bike\` | riding, pedalling | ${clips.bike?.duration ?? '?'} s (one crank turn) | needs the bike below; ground speed ${clips.bike?.speed ?? '?'} m/s |

(The numbers above are for the first person; every person has their own, in \`manifest.json\` under \`people[].clips\`: longer legs swing slower.)

- All clips **play in place**: the body does not travel. Move the character yourself at the clip's ground speed (\`speed\` in \`manifest.json\`) and the feet will not slide.
- Every clip loops cleanly (last frame equals the first). Blend between clips (cross-fade ~0.2 s) to switch.
- **Bike:** load \`models/<name>-bike.glb\`, put it at the **same origin as the person** (same position and rotation, no offset; it was built in the rider's own space), and play the rider's \`bike\` clip together with the bike's \`ride\` clip. The two are the same length and start in step. Show the bike only while riding.
- Bone names in the clips are exactly the skeleton's (\`upperarm01.L\`, …). Note three.js's GLTFLoader strips dots from node names, so in three.js they read \`upperarm01L\`; Unity, Unreal, Godot and Blender keep them.
- To use them in three.js: \`const mixer = new THREE.AnimationMixer(root); mixer.clipAction(THREE.AnimationClip.findByName(gltf.animations, 'walk')).play();\` then \`mixer.update(dt)\` each frame (\`viewer.html\` has buttons for all five clips).
- To retarget onto another rig, map the bone names above; this skeleton is MakeHuman's "default" rig.

## Route A: any engine (Unity, Unreal, Godot, Blender, …)

1. Import the \`.glb\`. Keep the skeleton; skin and cloth meshes are bound to it.
2. Make sure the material uses **vertex colours** for \`skin\`, \`hair\`, \`eye\` (many default shaders ignore them: use a vertex-colour or unlit-vertex-colour shader, or in Blender wire the Color attribute into Base Color).
3. \`outline\` meshes are an **inverted hull**: the part pushed out along its normals, wound inside-out, with an unlit (\`KHR_materials_unlit\`) ink colour. Render them as-is, backface-culled, no lighting. They give the cartoon line. Hide them for the "no outline" styles.
4. For a cartoon shading look, give the other materials a toon/cel ramp: ${style === 'gouache' || style === 'anime' || style === 'pixel' ? 'two or three hard light bands' : 'the shading described in \\`three-style/render-styles.js\\`'}. glTF cannot carry the town's shaders, so this is yours to recreate; the plain PBR colours are only an approximation.

## Route B: three.js, with the exact style (what \`viewer.html\` does)

Serve the folder (ES modules do not load from \`file://\`): \`python3 -m http.server\`, open \`/viewer.html\`. To reuse in a game, copy \`three-style/\` and:

\`\`\`js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { applyRenderStyle, applySceneStyle } from './three-style/render-styles.js';

const root = (await new GLTFLoader().loadAsync('models/${names[0] ?? 'name'}.glb')).scene;
// 1. set the outlines aside: applyRenderStyle would restyle them as props
const lines = []; root.traverse(o => { if (o.isMesh && o.userData.role === 'outline') lines.push(o); });
const homes = lines.map(l => l.parent); lines.forEach(l => l.parent.remove(l));
// 2. no shader ink (the outlines are geometry here); restore the hair-direction attribute name
root.traverse(o => { if (!o.isMesh) return; o.userData.noInk = true;
  const h = o.geometry.getAttribute('_hairdir'); if (h && !o.geometry.getAttribute('hairDir')) o.geometry.setAttribute('hairDir', h); });
// 3. restyle every mesh by its role, then put the outlines back
applyRenderStyle(root, '${style}');
lines.forEach((l, i) => homes[i].add(l));
// once per renderer/scene: background, tone mapping, environment, pixel size for the style
applySceneStyle(renderer, scene, '${style}');
\`\`\`

Styles available: gouache, anime, clay, lowpoly, sketch, watercolor, comic, flat, pixel, realistic.
Pass another name to restyle live; \`recolor(mesh, 0xRRGGBB, style)\` changes a garment's colour. Use the same lights as \`viewer.html\` (a warm hemisphere light plus one directional sun); the cel bands read light direction.

## Changing a person

Edit \`citizens.json\` (or import it in the maker), re-export. Fields: name, sex, age (2–90), height, build, muscle (0–1), bodyType, face, faceShape, smile, hairStyle, hair, topType, top, bottomType, bottom, shoes, skin, eyes, plus the face-feature sliders (nose, lips, jaw …). Colours are \`#rrggbb\`.

## Known limits

- One render style per export (the roster's), shared by everyone.
- Outline width is fixed in the model (about 4 mm at weight 1); the town draws a constant on-screen width with a slight wobble, which \`viewer.html\` does not reproduce.
- Clips are baked from the maker's procedural motion, so they are one fixed style of walk/run/sit/bike each (scaled to the person), not mocap and not editable in the maker.
- Not viewed: the sketch, watercolor and comic styles in \`viewer.html\`; the glb has been inspected, not opened in Unity/Unreal/Godot.
`;

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'citizen';

export async function exportPack({ roster, render, makePerson, spec, toJSON, onProgress = () => {} }) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter(), used = new Set(), files = [], people = [];
  const glbOf = async (root, k, animations) => new Uint8Array(restoreDots(await exporter.parseAsync(forExport(root, k), { binary: true, animations })));
  for (let i = 0; i < roster.length; i++) {
    const c = roster[i];
    onProgress(i, roster.length);
    let base = slug(c.name), n = 2;
    while (used.has(base)) base = slug(c.name) + '-' + n++;
    used.add(base);
    const person = await makePerson({ ...spec(c), render }), k = person.body.P.stature / 1.7;
    const { clips, info, bike, ride } = bakeMotion(person, render);     // (poses the person, so it comes before the model is dressed for export)
    const entry = { name: c.name, model: `models/${base}.glb`, bike: `models/${base}-bike.glb`, height: +person.body.P.stature.toFixed(3), clips: info };
    files.push({ name: entry.model, data: await glbOf(person.group, k, clips) });
    const bg = new THREE.Group(); bg.name = 'bike'; bg.add(bike.group);
    files.push({ name: entry.bike, data: await glbOf(bg, k, [ride]) });
    people.push(entry);
    if (c.portrait) files.push({ name: `portraits/${base}.png`, data: new Uint8Array(await (await fetch(c.portrait)).arrayBuffer()) });
    await new Promise(r => setTimeout(r, 0));                          // let the page breathe
  }
  const text = (name, str) => ({ name, data: new TextEncoder().encode(str) });
  const manifest = { render, fps: FPS, people };
  const src = async (f) => (await (await fetch(new URL('./' + f, import.meta.url))).text());
  files.unshift(text('citizens.json', toJSON(roster, render)), text('manifest.json', JSON.stringify(manifest, null, 2)), text('viewer.html', VIEWER(render)),
    text('HANDOFF.md', HANDOFF(render, people.map(p => p.model.slice(7, -4)), people[0]?.clips)), text('three-style/render-styles.js', await src('render-styles.js')), text('three-style/style.js', await src('style.js')));
  return zip(files);
}
