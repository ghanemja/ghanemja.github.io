// ─── RENDER STYLES: the same people, drawn ten ways ──────────────────────────
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
const CEL2 = ramp([150, 255]), CEL3 = ramp([95, 170, 255]), CEL_SKIN = ramp([212, 255]);   // (a face in hard dark bands read as blotches)
const lift = (hex, t, to = 0xffffff) => new THREE.Color(hex).lerp(new THREE.Color(to), t).getHex();
const warm = (hex, k = 0.3) => { const c = new THREE.Color(hex), h = {}; c.getHSL(h); return c.setHSL(h.h, Math.min(1, h.s * (1 + k)), h.l * (1 - k * 0.3)).getHex(); };

// Cartoon looks that restyle the light itself: a Lambert material, then the fragment's own light
// level (lit ÷ base colour) is redrawn as pencil, wash, halftone or flat colour.
function restyled(b, tag, glsl) {
  return once(`${tag}|${b.key}`, () => {
    const m = new THREE.MeshLambertMaterial({ color: b.color, vertexColors: b.vc, side: b.side });
    m.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <dithering_fragment>', `
        {
          vec3 base = diffuseColor.rgb; vec2 fp = gl_FragCoord.xy;
          float lf = clamp(dot(gl_FragColor.rgb, vec3(0.299, 0.587, 0.114)) / max(dot(base, vec3(0.299, 0.587, 0.114)), 1e-3), 0.0, 1.6);
          float grain = fract(sin(dot(floor(fp), vec2(12.9898, 78.233))) * 43758.5453);
          vec3 col = base;
          ${glsl}
          gl_FragColor.rgb = col;
        }
        #include <dithering_fragment>`);
    };
    m.customProgramCacheKey = () => 'restyled-' + tag;
    return m;
  });
}
const SKETCH = `
  vec3 paper = vec3(0.965, 0.945, 0.9);
  float shade = smoothstep(0.25, 1.0, lf);
  col = mix(paper, base, 0.3) * (0.93 + 0.07 * shade);                  // a light colour wash on paper
  float h1 = step(0.62, fract((fp.x + fp.y) / 6.0)) * (1.0 - smoothstep(0.5, 0.8, shade));
  float h2 = step(0.66, fract((fp.x - fp.y) / 5.0)) * (1.0 - smoothstep(0.2, 0.5, shade));
  col = mix(col, vec3(0.24, 0.21, 0.19), max(h1, h2) * 0.5);            // pencil hatching in the shadows
  col *= 0.97 + 0.03 * grain;`;
const WASH = `
  vec3 pig = mix(base, vec3(1.0), 0.1);
  float b = smoothstep(0.3, 0.8, lf);
  col = mix(pig * vec3(0.64, 0.68, 0.88), pig * vec3(1.04, 1.0, 0.95), b);   // cool shadows, warm light
  col *= 1.0 - 0.09 * exp(-pow((b - 0.5) * 5.0, 2.0));                     // pigment pooling at the edge of the wash
  float blot = 0.5 + 0.5 * sin(fp.x * 0.045 + sin(fp.y * 0.03) * 2.0) * sin(fp.y * 0.05 + sin(fp.x * 0.02) * 2.0);
  col *= 0.95 + 0.05 * blot + 0.03 * grain;                                // uneven wash and paper`;
const COMIC = `
  float b = step(0.55, lf);
  col = mix(base * 0.45, base * 1.03, b);
  vec2 g = fract(fp / 5.0) - 0.5;
  col = mix(col, base * 0.28, step(length(g), 0.36 * (1.0 - lf)) * (1.0 - b));   // halftone dots in the shade
  col = mix(col, vec3(1.0), step(1.12, lf) * 0.35);`;
const FLAT = `
  col = base * mix(0.84, 1.0, smoothstep(0.42, 0.52, lf));`;

export const RENDER_STYLES = {
  gouache: {
    label: 'Gouache', note: 'cel bands, paper grain, a hand-drawn wobbling line', ink: 'fine',
    mat: (b) => paint(b.color, b.opts),
  },
  anime: {
    label: 'Anime', note: 'two hard tones, crisp even outlines', ink: 'crisp',
    mat: (b) => once(`anime|${b.key}`, () => new THREE.MeshToonMaterial({ color: b.role === 'skin' || b.role === 'hair' ? b.color : lift(b.color, 0.06), vertexColors: b.vc, side: b.side, gradientMap: b.role === 'skin' ? CEL_SKIN : CEL2 })),
  },
  clay: {
    label: 'Clay', note: 'soft matte plasticine, no outlines', ink: null,
    mat: (b) => once(`clay|${b.key}`, () => new THREE.MeshStandardMaterial({ color: b.vc && (b.role === 'skin' || b.role === 'hair') ? 0xf2d6c6 : lift(b.color, 0.12), vertexColors: b.vc, side: b.side, roughness: b.role === 'eye' || b.role === 'glint' ? 0.25 : 0.88, metalness: 0 })),
  },
  lowpoly: {
    label: 'Low-poly', note: 'a simplified, faceted mesh', ink: null, cell: 0.028,
    mat: (b) => once(`low|${b.key}`, () => new THREE.MeshLambertMaterial({ color: b.color, vertexColors: b.vc, side: b.side, flatShading: true })),
  },
  sketch: {
    label: 'Hand-drawn', note: 'pencil on paper: a light colour wash, hatched shadows', ink: 'pencil',
    mat: (b) => b.role === 'eye' || b.role === 'glint' ? paint(b.color, b.opts) : restyled(b, 'sketch', SKETCH),
  },
  watercolor: {
    label: 'Watercolour', note: 'soft painted washes, cool shadows, warm light', ink: 'wash',
    mat: (b) => b.role === 'eye' || b.role === 'glint' ? paint(b.color, b.opts) : restyled(b, 'wash', WASH),
  },
  comic: {
    label: 'Comic', note: 'hard shadows, halftone dots, bold lines', ink: 'comic',
    mat: (b) => b.role === 'eye' || b.role === 'glint' ? paint(b.color, b.opts) : restyled(b, 'comic', COMIC),
  },
  flat: {
    label: 'Flat', note: 'clean vector colour, no lines', ink: null,
    mat: (b) => b.role === 'eye' || b.role === 'glint' ? paint(b.color, b.opts) : restyled(b, 'flat', FLAT),
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
        // filmic tone mapping greys skin out: it is given back a little warmth and colour first
        // (skin and hair are vertex-coloured over white, so the material colour is a warm multiplier)
        case 'skin': return new THREE.MeshPhysicalMaterial({ ...o, color: b.vc ? 0xf0d0bc : warm(b.color), roughness: 0.6, sheen: 0.25, sheenColor: 0xff9f80, sheenRoughness: 0.6 });
        case 'hair': return new THREE.MeshPhysicalMaterial({ ...o, color: b.vc ? 0xe6d2c0 : warm(b.color, 0.15), roughness: 0.6, sheen: 0.35, sheenColor: lift(b.color, 0.3), sheenRoughness: 0.5 });   // (the strand highlight does the shine)
        case 'cloth': return new THREE.MeshPhysicalMaterial({ ...o, roughness: 0.92, sheen: 0.8, sheenColor: lift(b.color, 0.35), sheenRoughness: 0.75 });
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

// ── hair highlight: Kajiya–Kay, the strand model real-time hair shaders are built on (Scheuermann,
// "Practical Real-Time Hair Rendering and Shading", 2004). The highlight comes from the STRAND
// direction (attribute hairDir), so it lies across the strands and moves with the light and view —
// not a band painted into the colour. Two lobes, as there: a white one shifted toward the root and
// a softer one in the hair's colour toward the tip. Each style draws it its own way.
const SHEEN = {
  gouache: { a: 0.16, b: 0.06, e1: 70, e2: 18, band: 0.5 },   // (stronger read as metal)
  anime: { a: 0.3, b: 0, e1: 60, e2: 1, band: 1 },          // a crisp "angel ring"
  realistic: { a: 0.28, b: 0.18, e1: 160, e2: 30, band: 0 },
  pixel: { a: 0.35, b: 0, e1: 50, e2: 1, band: 1 },
  watercolor: { a: 0.12, b: 0.05, e1: 50, e2: 14, band: 0.3 },
  comic: { a: 0.35, b: 0, e1: 60, e2: 1, band: 1 },
  flat: { a: 0.15, b: 0, e1: 40, e2: 1, band: 1 },
  lowpoly: { a: 0.25, b: 0, e1: 40, e2: 1, band: 0.6 },
};
const sheenCache = new Map();
function withSheen(mat, style) {
  const S = SHEEN[style]; if (!S) return mat;
  const key = mat.uuid + style; if (sheenCache.has(key)) return sheenCache.get(key);
  const m = mat.clone(), prev = mat.onBeforeCompile, prevKey = mat.customProgramCacheKey?.bind(mat);
  m.userData = { ...mat.userData };
  m.onBeforeCompile = (sh, r) => {
    if (prev) prev.call(m, sh, r);
    sh.vertexShader = 'attribute vec3 hairDir;\nvarying vec3 vHairDir;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvHairDir = normalize((modelViewMatrix * vec4(hairDir, 0.0)).xyz);');
    sh.fragmentShader = 'varying vec3 vHairDir;\n' + sh.fragmentShader.replace('#include <dithering_fragment>', `
      {
        vec3 T = normalize(vHairDir), N = normalize(normal), V = normalize(vViewPosition);
        #if NUM_DIR_LIGHTS > 0
          vec3 L = normalize(directionalLights[0].direction);
        #else
          vec3 L = normalize(vec3(0.3, 0.8, 0.5));
        #endif
        vec3 Hh = normalize(L + V);
        float th1 = dot(normalize(T - 0.08 * N), Hh), th2 = dot(normalize(T + 0.12 * N), Hh);
        float s1 = pow(sqrt(max(0.0, 1.0 - th1 * th1)), ${S.e1.toFixed(1)}), s2 = pow(sqrt(max(0.0, 1.0 - th2 * th2)), ${S.e2.toFixed(1)});
        float lit = smoothstep(-0.1, 0.35, dot(N, L));
        s1 = mix(s1, smoothstep(0.35, 0.55, s1), ${S.band.toFixed(2)});            // banded for the drawn styles
        gl_FragColor.rgb += lit * (${S.a.toFixed(2)} * s1 * vec3(1.0, 0.97, 0.9) + ${S.b.toFixed(2)} * s2 * gl_FragColor.rgb);
      }
      #include <dithering_fragment>`);
  };
  m.customProgramCacheKey = () => (prevKey ? prevKey() : '') + 'sheen' + style;
  sheenCache.set(key, m); return m;
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
    if (b.role === 'hair' && m.geometry.attributes.hairDir) m.material = withSheen(m.material, name);
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
  scene.background = new THREE.Color({ gouache: 0xf3ead7, anime: 0xfbf7f0, clay: 0xe9e1d6, lowpoly: 0xdfe8ea, pixel: 0xe8dcc0, realistic: 0xcfc8bf,
    sketch: 0xf6f1e6, watercolor: 0xeef0e4, comic: 0xfff3d2, flat: 0xdcedf2 }[name] ?? 0xf3ead7);
  renderer.shadowMap.enabled = !!R.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  scene.traverse((o) => { if (o.isDirectionalLight) { o.castShadow = !!R.shadows; o.shadow.mapSize.set(1024, 1024); Object.assign(o.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 60 }); o.shadow.camera.updateProjectionMatrix(); o.shadow.bias = -0.0005; o.shadow.normalBias = 0.02; } });
  renderer.setPixelRatio(R.pixel ? R.pixel : dpr);
  renderer.domElement.style.imageRendering = R.pixel ? 'pixelated' : '';
}
