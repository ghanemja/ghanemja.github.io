// ─── EXPORT PACK: the roster as a .zip a game engine can open ────────────────
// citizens.zip = citizens.json (the editable roster) + models/<name>.glb (one rigged,
// dressed, skinned person each, in the relaxed rest pose) + portraits/<name>.png.
// The GLBs carry plain PBR materials: the town's gouache/ink shaders are a look of this
// site, not something glTF can hold, so ink outlines are left out and each part keeps its
// colour (skin and the face use vertex colours). Each mesh's `extras.role` says what it is
// (skin / cloth / hair / eye / brow / shoe / sole).
import * as THREE from 'three';

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
function forExport(person) {
  const inks = [], k = person.body.P.stature / 1.7;
  person.group.traverse((o) => {
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
  return person.group;
}

// ── viewer.html: the zip's own three.js page. glTF can hold the outline but not the town's
// cel / paper / watercolour shaders, so the exact style ships as source next to the models and
// is re-applied by role (every mesh's extras.role arrives as userData.role).
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
for (const [i, c] of manifest.people.entries()) {
  const root = (await loader.loadAsync(c.model)).scene;
  const lines = []; root.traverse(o => { if (o.isMesh && o.userData.role === 'outline') lines.push(o); });
  for (const l of lines) { l.userData.keep = [l.parent]; l.parent.remove(l); }      // (the style would restyle them as props)
  root.traverse(o => { if (o.isMesh) { o.userData.noInk = true; const h = o.geometry.getAttribute('_hairdir'); if (h && !o.geometry.getAttribute('hairDir')) o.geometry.setAttribute('hairDir', h); } });
  applyRenderStyle(root, STYLE);
  for (const l of lines) l.userData.keep[0].add(l);
  root.position.set((i % 6 - 2.5) * 0.9, 0, -Math.floor(i / 6) * 1.2); scene.add(root);
}
camera.position.set(0, 1.2, 7); const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0.9, 0);
const fit = () => { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); };
addEventListener('resize', fit); fit();
renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
</script>
`;
const README = (style, n) => `Citizens — ${n} rigged people, drawn in the "${style}" style.

models/*.glb    one person each: skinned to a skeleton, relaxed rest pose, always dressed.
                Each mesh's extras.role says what it is (skin, cloth, hair, eye, brow, shoe, sole, outline).
                The "outline" meshes are the ink line as geometry (an inverted hull, unlit), so any
                engine draws the line. glTF can't hold the town's cel / paper shaders, so the colours
                are plain PBR approximating them.
portraits/      the picture of each person.
citizens.json   the editable roster (import it back into the maker).
viewer.html     the exact look in three.js — serve this folder and open it:
                  python3 -m http.server   then   http://localhost:8000/viewer.html
three-style/    the town's style code that viewer.html uses; in your own three.js game:
                  applyRenderStyle(gltf.scene, '${style}')  (after setting userData.noInk = true on every mesh).
`;

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'citizen';

export async function exportPack({ roster, render, makePerson, spec, toJSON, onProgress = () => {} }) {
  const { GLTFExporter } = await import('three/addons/exporters/GLTFExporter.js');
  const exporter = new GLTFExporter(), used = new Set(), files = [];
  for (let i = 0; i < roster.length; i++) {
    const c = roster[i];
    onProgress(i, roster.length);
    let base = slug(c.name), n = 2;
    while (used.has(base)) base = slug(c.name) + '-' + n++;
    used.add(base);
    const person = await makePerson({ ...spec(c), render });
    const glb = await exporter.parseAsync(forExport(person), { binary: true });
    files.push({ name: `models/${base}.glb`, data: new Uint8Array(glb) });
    if (c.portrait) files.push({ name: `portraits/${base}.png`, data: new Uint8Array(await (await fetch(c.portrait)).arrayBuffer()) });
    await new Promise(r => setTimeout(r, 0));                          // let the page breathe
  }
  const text = (name, str) => ({ name, data: new TextEncoder().encode(str) });
  const models = files.filter(f => f.name.startsWith('models/')).map(f => f.name);
  const manifest = { render, people: roster.map((c, i) => ({ name: c.name, model: models[i] })) };
  const src = async (f) => (await (await fetch(new URL('./' + f, import.meta.url))).text());
  files.unshift(text('citizens.json', toJSON(roster, render)), text('manifest.json', JSON.stringify(manifest, null, 2)), text('viewer.html', VIEWER(render)),
    text('README.txt', README(render, roster.length)), text('three-style/render-styles.js', await src('render-styles.js')), text('three-style/style.js', await src('style.js')));
  return zip(files);
}
