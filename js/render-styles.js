// ─── RENDER STYLES: the same people, drawn six ways ──────────────────────────
// Shape style (js/stylize.js) changes the body on purpose; RENDER style only
// changes how it's drawn — materials, outlines, a little geometry (low-poly) and
// the scene around it (light, tone mapping, resolution). It is applied after a
// person (or any prop) is built, so anything can be switched at any time:
//
//   applyRenderStyle(root, 'anime')            materials + outlines for everything under root
//   applySceneStyle(renderer, scene, 'anime')   background, tone mapping, environment, pixel size
//
// Meshes carry userData.role (skin / cloth / hair / eye / glint / brow / shoe / sole / prop);
// anything untagged is treated as a prop. The first application records each mesh's
// own colour and gouache options (userData.base), so styles can be swapped back and forth.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { paint, ink } from './style.js';

const cache = new Map();
const once = (key, make) => { if (!cache.has(key)) cache.set(key, make()); return cache.get(key); };
const ramp = (vals) => { const t = new THREE.DataTexture(new Uint8Array(vals), vals.length, 1, THREE.RedFormat); t.minFilter = t.magFilter = THREE.NearestFilter; t.needsUpdate = true; return t; };
const CEL2 = ramp([150, 255]), CEL3 = ramp([95, 170, 255]);
const lift = (hex, t, to = 0xffffff) => new THREE.Color(hex).lerp(new THREE.Color(to), t).getHex();

export const RENDER_STYLES = {
  gouache: {
    label: 'Gouache', note: 'cel bands, paper grain, a hand-drawn wobbling line', ink: 'fine',
    mat: (b) => paint(b.color, b.opts),
  },
  anime: {
    label: 'Anime', note: 'two hard tones, crisp even outlines', ink: 'crisp',
    mat: (b) => once(`anime|${b.key}`, () => new THREE.MeshToonMaterial({ color: b.role === 'skin' || b.role === 'hair' ? b.color : lift(b.color, 0.06), vertexColors: b.vc, side: b.side, gradientMap: CEL2 })),
  },
  clay: {
    label: 'Clay', note: 'soft matte plasticine, no outlines', ink: null,
    mat: (b) => once(`clay|${b.key}`, () => new THREE.MeshStandardMaterial({ color: lift(b.color, 0.12), vertexColors: b.vc, side: b.side, roughness: b.role === 'eye' || b.role === 'glint' ? 0.25 : 0.88, metalness: 0 })),
  },
  lowpoly: {
    label: 'Low-poly', note: 'a simplified, faceted mesh', ink: null, cell: 0.028,
    mat: (b) => once(`low|${b.key}`, () => new THREE.MeshLambertMaterial({ color: b.color, vertexColors: b.vc, side: b.side, flatShading: true })),
  },
  pixel: {
    label: 'Pixel', note: 'drawn small and blown up, a few hard tones', ink: 'pixel', pixel: 0.3,
    mat: (b) => once(`pix|${b.key}`, () => new THREE.MeshToonMaterial({ color: b.color, vertexColors: b.vc, side: b.side, gradientMap: CEL3 })),
  },
  realistic: {
    label: 'Realistic', note: 'physically based skin, cloth and hair, soft shadows', ink: null, shadows: true,
    mat: (b) => once(`real|${b.key}`, () => {
      const o = { color: b.color, vertexColors: b.vc, side: b.side };
      switch (b.role) {
        case 'skin': return new THREE.MeshPhysicalMaterial({ ...o, roughness: 0.55, sheen: 0.35, sheenColor: 0xffc2a8, sheenRoughness: 0.6 });
        case 'cloth': return new THREE.MeshPhysicalMaterial({ ...o, roughness: 0.92, sheen: 0.8, sheenColor: lift(b.color, 0.35), sheenRoughness: 0.75 });
        case 'hair': return new THREE.MeshPhysicalMaterial({ ...o, roughness: 0.42, sheen: 1, sheenColor: lift(b.color, 0.45), sheenRoughness: 0.3 });
        case 'eye': case 'glint': return new THREE.MeshPhysicalMaterial({ ...o, roughness: 0.08, clearcoat: 1 });
        case 'shoe': return new THREE.MeshStandardMaterial({ ...o, roughness: 0.65 });
        case 'sole': return new THREE.MeshStandardMaterial({ ...o, roughness: 0.85 });
        default: return new THREE.MeshStandardMaterial({ ...o, roughness: 0.55, metalness: 0.05 });
      }
    }),
  },
};

// ── low-poly: vertex clustering — every vertex snaps to the centre of its grid cell's members ──
function lowPoly(geo, cell) {
  const P = geo.attributes.position, n = P.count, keyOf = new Map(), rep = new Int32Array(n), sum = [];
  for (let i = 0; i < n; i++) {
    const k = `${Math.floor(P.getX(i) / cell)},${Math.floor(P.getY(i) / cell)},${Math.floor(P.getZ(i) / cell)}`;
    let r = keyOf.get(k); if (r == null) { r = i; keyOf.set(k, r); sum[r] = [0, 0, 0, 0]; }
    rep[i] = r; const s = sum[r]; s[0] += P.getX(i); s[1] += P.getY(i); s[2] += P.getZ(i); s[3]++;
  }
  const g = geo.clone(), Q = g.attributes.position;
  for (let i = 0; i < n; i++) { const s = sum[rep[i]]; Q.setXYZ(i, s[0] / s[3], s[1] / s[3], s[2] / s[3]); }
  const src = geo.index ? geo.index.array : Array.from({ length: n }, (_, i) => i), idx = [];
  for (let t = 0; t < src.length; t += 3) {
    const a = rep[src[t]], b = rep[src[t + 1]], c = rep[src[t + 2]];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);              // a collapsed triangle disappears
  }
  g.setIndex(idx);
  const flat = g.toNonIndexed(); flat.computeVertexNormals();
  return flat;
}

function baseOf(m) {
  if (m.userData.base) return m.userData.base;
  const mat = m.material, color = mat.color ? mat.color.getHex() : 0xffffff;
  const b = { role: m.userData.role ?? 'prop', color, vc: !!mat.vertexColors, side: mat.side ?? THREE.FrontSide,
    opts: { vertexColors: !!mat.vertexColors, side: mat.side, soft: !!mat.userData?.soft, hatch: mat.userData?.hatch ?? 1 } };
  b.key = `${b.role}|${b.color}|${b.vc}|${b.side}`;
  return (m.userData.base = b);
}
// change a mesh's base colour (a creator's colour pick) and redraw it in the current style
export function recolor(m, color, style) {
  const b = baseOf(m); b.color = color; b.key = `${b.role}|${b.color}|${b.vc}|${b.side}`;
  m.material = RENDER_STYLES[style].mat(b);
}

export function applyRenderStyle(root, name = 'gouache') {
  const R = RENDER_STYLES[name] ?? RENDER_STYLES.gouache, dead = [], meshes = [];
  root.traverse((o) => { if (o.userData.isInk) dead.push(o); else if (o.isMesh) meshes.push(o); });
  for (const o of dead) o.parent?.remove(o);
  for (const m of meshes) {
    const b = baseOf(m);
    m.material = R.mat(b);
    if (!m.userData.geo0) m.userData.geo0 = m.geometry;
    if (R.cell && b.role !== 'eye' && b.role !== 'glint') {
      // small features need a finer grid or they collapse: faces and hands at under half the size
      const part = m.userData.part, role = m.userData.base.role;
      const k = R.cell * (part === 'face' ? 0.4 : part === 'hands' ? 0.32 : role === 'hair' ? 0.8 : role === 'brow' ? 0.3 : 1);
      m.userData.geoLow ??= lowPoly(m.userData.geo0, k);
      m.geometry = m.userData.geoLow;
    } else m.geometry = m.userData.geo0;
    m.castShadow = m.receiveShadow = !!R.shadows;
  }
  if (R.ink) {
    // in pixel style the face's own outline (eyelids, nose, lips) smears into a dark blob at that
    // resolution: faces keep only their silhouette there
    if (R.pixel) for (const m of meshes) if (m.userData.part === 'face') { m.userData.inkGeometry0 ??= m.userData.inkGeometry; m.userData.noInk = true; }
    else for (const m of meshes) if (m.userData.part === 'face' && m.userData.inkGeometry0 !== undefined) m.userData.noInk = false;
    ink(root, R.ink);
  } else for (const m of meshes) if (m.userData.part === 'face' && m.userData.inkGeometry0 !== undefined) m.userData.noInk = false;
  root.userData.renderStyle = name;
  return root;
}

// ── the scene around them ──
let _env = null;
export function applySceneStyle(renderer, scene, name = 'gouache', { dpr = Math.min(devicePixelRatio, 2) } = {}) {
  const R = RENDER_STYLES[name] ?? RENDER_STYLES.gouache;
  const lit = name === 'clay' || name === 'realistic';
  if (lit && !_env) { const pm = new THREE.PMREMGenerator(renderer); _env = pm.fromScene(new RoomEnvironment(), 0.04).texture; }
  scene.environment = lit ? _env : null;
  scene.environmentIntensity = name === 'clay' ? 0.7 : 0.9;
  renderer.toneMapping = lit ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  renderer.toneMappingExposure = name === 'realistic' ? 0.95 : 1;
  scene.background = new THREE.Color({ gouache: 0xf3ead7, anime: 0xfbf7f0, clay: 0xe9e1d6, lowpoly: 0xdfe8ea, pixel: 0xe8dcc0, realistic: 0xcfc8bf }[name] ?? 0xf3ead7);
  renderer.shadowMap.enabled = !!R.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.traverse((o) => { if (o.isDirectionalLight) { o.castShadow = !!R.shadows; o.shadow.mapSize.set(1024, 1024); Object.assign(o.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 60 }); o.shadow.camera.updateProjectionMatrix(); o.shadow.bias = -0.0005; o.shadow.normalBias = 0.02; } });
  renderer.setPixelRatio(R.pixel ? R.pixel : dpr);
  renderer.domElement.style.imageRendering = R.pixel ? 'pixelated' : '';
}
