// ─── CITIZEN MAKER: make a roster of people for a game ───────────────────────
// The page (citizens.html) edits plain citizen descriptions (js/citizens.js); every
// preview is a real person from makePerson — anatomical, always dressed, rigged for
// idle / walk / run / sit / bike. Colour and hair changes restyle the person in place;
// body, face and style changes rebuild it (about half a second).
import * as THREE from 'three';
import { makePerson } from './people.js';
import { makeBike } from './motion.js';
import { paint, ink, styleTick, blobShadow } from './style.js';
import { HAIRSTYLES } from './hair.js';
import { RENDER_STYLES, applyRenderStyle, applySceneStyle } from './render-styles.js';
import { PALETTE, TOP_COLOURS, FACES, FEATURES, FACE_SHAPES, DEFAULT, TOPS, BOTTOMS, BODY_TYPES, AGE_MIN, AGE_MAX, AGE_RANGES, randomCitizen, generateCitizens, toPersonSpec, INSTANT, loadRoster, saveRoster, toJSON, fromJSON } from './citizens.js';

const $ = (s) => document.querySelector(s);
const stageEl = $('#stage');

// ── renderer & scene, under the town's own light ──
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
stageEl.prepend(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3ead7);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6); sun.position.set(14, 22, 10);
scene.add(new THREE.HemisphereLight(0xfff6e8, 0xd8c8b0, 1.35), sun);
const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 80);
const ground = new THREE.Mesh(new THREE.CircleGeometry(1.1, 64).rotateX(-Math.PI / 2), paint(0xe9dcc0, { hatch: 0.4 }));
ground.position.y = -0.002; scene.add(ground);
const ring = new THREE.Mesh(new THREE.RingGeometry(1.06, 1.1, 64).rotateX(-Math.PI / 2), paint(0x2a2230, { hatch: 0 }));
ring.position.y = 0.001; scene.add(ring);

// ── how everyone is drawn (one render style for the whole roster, as a game would have) ──
const RKEY = 'citizens.render';
let render = (() => { try { const r = localStorage.getItem(RKEY); return RENDER_STYLES[r] ? r : 'gouache'; } catch { return 'gouache'; } })();
const spec = (c) => toPersonSpec(c, { render });

function resize() {
  const r = stageEl.getBoundingClientRect();
  renderer.setSize(r.width, r.height, false);
  camera.aspect = r.width / Math.max(1, r.height); camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stageEl);

// ── state ──
let roster = loadRoster(), sel = 0, action = 'idle', zoom = 'full', mode = 'edit';
let current = null, turn = 0.35, dragging = null, buildId = 0, prop = null;
const cur = () => roster[sel];
const stage = new THREE.Group(); scene.add(stage);

// ── building people (latest request wins) ──
async function build(c) {
  const id = ++buildId; $('#busy').classList.add('on');
  const p = await makePerson(spec(c));
  if (id !== buildId) return null;
  $('#busy').classList.remove('on');
  return p;
}
async function show() {
  const p = await build(cur());
  if (!p) return;
  if (current) stage.remove(current.group);
  current = p; stage.add(p.group); p.group.add(blobShadow(0.3));
  setProp();
  portrait(p, cur());
}
function setProp() {
  if (prop) { const o = prop.group ?? prop; o.parent?.remove(o); prop = null; }   // (a bike is { group, … }, not itself in the scene)
  if (!current) return;
  if (action === 'bike') { prop = makeBike(current); current.group.add(prop.group); applyRenderStyle(prop.group, render); }
  if (action === 'sit') {
    const h = current.motion.M.knee.L.y * 0.97;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.42), paint(0x8a6a4e));
    bench.position.set(0, h / 2, current.motion.M.hipMid.z - 0.12); ink(bench, 'fine');
    const g = new THREE.Group(); g.add(bench); applyRenderStyle(g, render);
    current.group.add(g); prop = g;
  }
}
function setRender(name) {
  render = name; try { localStorage.setItem(RKEY, name); } catch {}
  applySceneStyle(renderer, scene, name); applySceneStyle(renderer, pscene, name); resize();
  for (const o of [ground, ring]) applyRenderStyle(o, name);
  if (plazaFolk.props) applyRenderStyle(plazaFolk.props, name);
  for (const f of plazaFolk) { f.p.setRender(name); if (f.bike) applyRenderStyle(f.bike.group, name); }
  if (current) { current.setRender(name); setProp(); }
  // portraits are redrawn in the new style, in the background
  for (const c of roster) delete c.portrait;
  if (current) portrait(current, cur()); fillPortraits();
}

// ── a portrait for the roster card (rendered from the real model) ──
const pcam = new THREE.PerspectiveCamera(24, 1, 0.05, 20);
const pscene = new THREE.Scene(); pscene.background = new THREE.Color(0xefe4cc);       // portraits get their own little studio
{ const s2 = sun.clone(); pscene.add(new THREE.HemisphereLight(0xfff6e8, 0xd8c8b0, 1.35), s2); }
// Portraits are drawn into a corner of the screen and read straight back, then the frame is
// redrawn before anyone sees it: three.js only tone-maps what goes to the screen, so a render
// target came out blown white in the lit styles (clay, realistic).
function portrait(p, c) {
  p.motion.pose('idle', 0.5);
  p.group.updateMatrixWorld(true);
  const parent = p.group.parent, pos = p.group.position.clone(), rot = p.group.rotation.y;
  p.group.position.set(0, 0, 0); p.group.rotation.y = 0; pscene.add(p.group); p.group.updateMatrixWorld(true);
  const head2 = p.sk.byName.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.07, 0));
  pcam.position.copy(head2).add(new THREE.Vector3(0.12, 0.02, 0.78)); pcam.lookAt(head2);
  const pr = renderer.getPixelRatio(), N = RENDER_STYLES[render].pixel ? 48 : 160, full = renderer.getSize(new THREE.Vector2());   // (pixel style: drawn small, blown up)
  renderer.setScissorTest(true); renderer.setViewport(0, 0, N / pr, N / pr); renderer.setScissor(0, 0, N / pr, N / pr);
  renderer.render(pscene, pcam);
  const gl = renderer.getContext(), px = new Uint8Array(N * N * 4); gl.readPixels(0, 0, N, N, gl.RGBA, gl.UNSIGNED_BYTE, px);
  renderer.setScissorTest(false); renderer.setViewport(0, 0, full.x, full.y);
  pscene.remove(p.group); if (parent) parent.add(p.group); p.group.position.copy(pos); p.group.rotation.y = rot;
  renderer.render(scene, camera);
  const small = document.createElement('canvas'); small.width = small.height = N;
  const sctx = small.getContext('2d'), img = sctx.createImageData(N, N);
  for (let y = 0; y < N; y++) img.data.set(px.subarray((N - 1 - y) * N * 4, (N - y) * N * 4), y * N * 4);   // flip: GL rows run bottom-up
  sctx.putImageData(img, 0, 0);
  const cv = document.createElement('canvas'); cv.width = cv.height = 160;
  const ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = N === 160; ctx.drawImage(small, 0, 0, 160, 160);
  c.portrait = cv.toDataURL('image/jpeg', 0.85);
  saveRoster(roster); drawRoster();
}

// ── editing ──
function change(key, value, rebuild = !INSTANT.includes(key)) {
  cur()[key] = value;
  if (key === 'bodyType' && BODY_TYPES[value]) Object.assign(cur(), { build: BODY_TYPES[value].build, muscle: BODY_TYPES[value].muscle });   // a type is a whole body
  saveRoster(roster);
  if (rebuild || !current) { queueRebuild(); return; }
  const s = toPersonSpec(cur());
  const map = { skin: { skin: s.skin, lips: s.lips, blush: s.blush }, hair: { hair: s.hair, brows: s.brows }, hairStyle: { hairStyle: s.hairStyle },
    eyes: { eyes: s.eyes }, top: { top: s.top }, bottom: { bottom: s.bottom }, shoes: { shoes: s.shoes, sole: s.sole } };
  current.restyle(map[key]);
  clearTimeout(change.t); change.t = setTimeout(() => portrait(current, cur()), 300);
}
let rebuildT = 0;
function queueRebuild() { clearTimeout(rebuildT); rebuildT = setTimeout(show, 120); }

const hexCss = (n) => '#' + n.toString(16).padStart(6, '0');
// little drawings for the tiles
const HEAD = '<circle cx="21" cy="23" r="11" fill="#efc3a2" stroke="#2a2230" stroke-width="2"/>';
const HAIR_ICON = {
  buzz: '<path d="M10 21a11 11 0 0 1 22 0c-3-3-7-4-11-4s-8 1-11 4z" fill="#6b4630"/>',
  crop: '<path d="M9 22c0-9 6-12 12-12s12 3 12 12c-2-4-6-6-9-6-4 0-6 1-9 2-3 1-5 2-6 4z" fill="#6b4630" stroke="#2a2230" stroke-width="1.5"/>',
  pixie: '<path d="M9 25c-1-11 5-15 12-15s13 4 12 14c-3-6-9-9-17-4-3 2-5 3-7 5z" fill="#c9a06a" stroke="#2a2230" stroke-width="1.5"/>',
  bob: '<path d="M8 32c-2-14 4-22 13-22s15 8 13 22h-4c0-6 0-11-3-14-5 2-11 2-15 0-1 4-1 9 0 14z" fill="#c9a06a" stroke="#2a2230" stroke-width="1.5"/>',
  lob: '<path d="M7 38c-2-17 4-28 14-28s16 11 14 28h-4c0-9 0-15-4-20-5 2-11 2-15 0-1 5-1 12 0 20z" fill="#9a6a3e" stroke="#2a2230" stroke-width="1.5"/>',
  ponytail: '<path d="M10 21c0-8 5-11 11-11s11 3 11 11c-3-3-7-4-11-4s-8 1-11 4z" fill="#3b2a22" stroke="#2a2230" stroke-width="1.5"/><path d="M31 16c6 2 7 10 4 20-2-6-4-10-6-13z" fill="#3b2a22" stroke="#2a2230" stroke-width="1.5"/>',
  bun: '<path d="M10 21c0-8 5-11 11-11s11 3 11 11c-3-3-7-4-11-4s-8 1-11 4z" fill="#1f1a1a" stroke="#2a2230" stroke-width="1.5"/><circle cx="21" cy="7" r="5" fill="#1f1a1a" stroke="#2a2230" stroke-width="1.5"/>',
  curly: '<g fill="#3b2a22" stroke="#2a2230" stroke-width="1.2"><circle cx="11" cy="15" r="5"/><circle cx="18" cy="10" r="5.5"/><circle cx="26" cy="10" r="5.5"/><circle cx="32" cy="16" r="5"/><circle cx="8" cy="23" r="4"/><circle cx="34" cy="24" r="4"/></g>',
};
const CL = (d, fill) => `<svg viewBox="0 0 42 42" aria-hidden="true"><path d="${d}" fill="${fill}" stroke="#2a2230" stroke-width="2" stroke-linejoin="round"/></svg>`;
const CLOTHES_ICON = {
  sweater: CL('M14 6l-9 6 3 26h5l1-16 1 16h14l1-16 1 16h5l3-26-9-6c-2 3-4 4-7 4s-5-1-7-4z', '#8e2f3a'),
  sweatshirt: CL('M14 5l-11 6 2 27h7l1-15 1 17h18l1-17 1 15h7l2-27-11-6c-2 3-4 4-7 4s-5-1-7-4z', '#9aa3a8'),
  tee: CL('M14 6l-10 7 4 6 5-3v20h16V16l5 3 4-6-10-7c-2 3-4 4-7 4s-5-1-7-4z', '#6f8db0'),
  turtleneck: CL('M16 3h10v5l9 4 3 26h-5l-1-16-1 16H11l-1-16-1 16H4l3-26 9-4z', '#3f8f88'),
  trousers: CL('M11 5h20l2 33h-7l-5-24-5 24H9z', '#3f5a7a'),
  baggy: CL('M11 5h20l4 33h-10l-4-22-4 22H7z', '#6f8a6a'),
  shorts: CL('M11 8h20l3 18h-9l-4-9-4 9H8z', '#b98a5e'),
  skirt: CL('M13 7h16l6 26H7z', '#c98fb5'),
};
// face outlines for the face-shape tiles
const FO = (d) => `<svg viewBox="0 0 42 42" aria-hidden="true"><path d="${d}" fill="#efc3a2" stroke="#2a2230" stroke-width="2" stroke-linejoin="round"/><circle cx="16.5" cy="20" r="1.6" fill="#2a2230"/><circle cx="25.5" cy="20" r="1.6" fill="#2a2230"/><path d="M17.5 28q3.5 2.5 7 0" fill="none" stroke="#2a2230" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const FACE_ICON = {
  oval: FO('M21 5c8 0 11 7 11 15s-4 17-11 17-11-9-11-17S13 5 21 5z'),
  round: FO('M21 6c9 0 13 6 13 15s-5 15-13 15S8 30 8 21 12 6 21 6z'),
  square: FO('M11 9c2-3 6-4 10-4s8 1 10 4c1 4 1 12 0 18-1 6-6 9-10 9s-9-3-10-9c-1-6-1-14 0-18z'),
  long: FO('M21 3c7 0 10 6 10 13v10c0 8-5 13-10 13s-10-5-10-13V16c0-7 3-13 10-13z'),
  heart: FO('M21 6c10 0 13 6 12 13-1 9-7 17-12 18-5-1-11-9-12-18C8 12 11 6 21 6z'),
  diamond: FO('M21 4c4 0 7 6 11 15-3 9-7 17-11 18-4-1-8-9-11-18C14 10 17 4 21 4z'),
  soft: FO('M21 6c7 0 10 5 11 12 1 8-2 18-11 18S9 26 10 18c1-7 4-12 11-12z'),
};
const icon = (inner, face = true) => `<svg viewBox="0 0 42 42" aria-hidden="true">${face ? HEAD : ''}${inner}</svg>`;
const BODY_ICON = (w, h) => `<svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="${10 + (1 - h) * 4}" r="5" fill="#efc3a2" stroke="#2a2230" stroke-width="1.5"/><rect x="${21 - w}" y="${16 + (1 - h) * 4}" width="${w * 2}" height="${24 - (1 - h) * 4}" rx="${w * 0.7}" fill="#6f8db0" stroke="#2a2230" stroke-width="1.5"/></svg>`;

// a body type's silhouette, drawn from its own girth recipe (shoulders, waist, hips, belly)
const SHAPE_ICON = (t) => {
  const g = BODY_TYPES[t].girth || {}, sh = 9 + 3 * (g.shoulders || 0), w = 6.2 + 3 * (g.waist || 0) + 2 * (g.belly || 0), h = 8 + 3.4 * (g.hips || 0) + 1.5 * (g.seat || 0);
  return `<svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="7" r="4.5" fill="#efc3a2" stroke="#2a2230" stroke-width="1.5"/><path d="M${21 - sh} 15 C${21 - sh} 13 ${21 + sh} 13 ${21 + sh} 15 C${21 + sh * 0.9} 20 ${21 + w} 22 ${21 + w} 25 C${21 + w} 28 ${21 + h} 29 ${21 + h} 33 L${21 + h * 0.8} 40 L${21 - h * 0.8} 40 L${21 - h} 33 C${21 - h} 29 ${21 - w} 28 ${21 - w} 25 C${21 - w} 22 ${21 - sh * 0.9} 20 ${21 - sh} 15 Z" fill="#6f8db0" stroke="#2a2230" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
};
const TABS = {
  Body: [
    { tiles: 'sex', label: 'Body', options: [[0, 'Woman', BODY_ICON(6, 0.85)], [1, 'Man', BODY_ICON(7.5, 1)]] },
    { slider: 'age', label: 'Age', min: AGE_MIN, max: AGE_MAX, step: 1, show: (v) => v + (v == 1 ? ' year' : ' years'), ends: ['child', 'elder'] },
    { tiles: 'bodyType', label: 'Body type', options: Object.entries(BODY_TYPES).map(([k, v]) => [k, v.label, SHAPE_ICON(k)]) },
    { slider: 'height', label: 'Height', ends: ['shorter', 'taller'], note: 'for their age' },
    { slider: 'build', label: 'Build', ends: ['slight', 'solid'] },
    { slider: 'muscle', label: 'Muscle', ends: ['soft', 'strong'] },
  ],
  Face: [
    { swatches: 'skin', label: 'Skin', colours: PALETTE.skin },
    { tiles: 'faceShape', label: 'Face shape', options: Object.entries(FACE_SHAPES).map(([k, v]) => [k, v.label, FACE_ICON[k]]) },
    ...Object.entries(FEATURES).map(([k, ends]) => ({ slider: k, label: { nose: 'Nose', noseWidth: 'Nose width', lips: 'Lips', jaw: 'Jaw', cheekbones: 'Cheekbones', eyeSize: 'Eyes' }[k], ends })),
    { swatches: 'eyes', label: 'Eyes', colours: PALETTE.eyes },
    { slider: 'smile', label: 'Smile', ends: ['calm', 'beaming'] },
  ],
  Hair: [
    { tiles: 'hairStyle', label: 'Style', options: Object.entries(HAIRSTYLES).map(([k, v]) => [k, v.label, icon(HAIR_ICON[k] ?? '')]) },
    { swatches: 'hair', label: 'Colour', colours: PALETTE.hair },
  ],
  Clothes: [
    { tiles: 'topType', label: 'Top', options: Object.entries(TOPS).map(([k, v]) => [k, v, CLOTHES_ICON[k]]) },
    { swatches: 'top', label: 'Top colour', colours: TOP_COLOURS },
    { tiles: 'bottomType', label: 'Bottoms', options: Object.entries(BOTTOMS).map(([k, v]) => [k, v, CLOTHES_ICON[k]]) },
    { swatches: 'bottom', label: 'Bottoms colour', colours: TOP_COLOURS },
    { swatches: 'shoes', label: 'Shoes', colours: [0xf1ebdf, 0x2f2b33, 0xd8584a, 0x8e2f3a, 0x5b4636, 0xe4b84f, 0x3f8f88, 0x6f8db0] },
  ],
  Style: [
    { render: true, label: 'Drawn as (everyone)', options: Object.entries(RENDER_STYLES).map(([k, v]) => [k, v.label, v.note]) },
  ],
};
let tab = 'Body';
function drawTabs() {
  $('#tabs').innerHTML = Object.keys(TABS).map(t => `<button role="tab" aria-selected="${t === tab}" class="${t === tab ? 'on' : ''}" data-tab="${t}">${t}</button>`).join('');
}
function drawControls() {
  const c = cur();
  $('#controls').innerHTML = TABS[tab].map((r, i) => {
    if (r.note) return `<p class="note">${r.note}</p>`;
    if (r.slider) return `<div class="row"><label for="s${i}">${r.label}${r.show ? ` <output id="o${i}">${r.show(c[r.slider])}</output>` : r.note ? ` <small>${r.note}</small>` : ''}</label><input id="s${i}" type="range" min="${r.min ?? 0}" max="${r.max ?? 1}" step="${r.step ?? 0.01}" value="${c[r.slider]}" data-slider="${r.slider}"${r.show ? ` data-out="o${i}"` : ''}><div class="ends"><span>${r.ends[0]}</span><span>${r.ends[1]}</span></div></div>`;
    if (r.render) return `<div class="row"><span class="lbl">${r.label}</span><div class="tiles wide">${r.options.map(([v, label, note]) => `<button class="tile ${render === v ? 'on' : ''}" data-render="${v}" title="${note}"><b>${label}</b><small>${note}</small></button>`).join('')}</div></div>`;
    if (r.swatches) return `<div class="row"><span class="lbl">${r.label}</span><div class="swatches">${r.colours.map(col => `<button class="sw ${c[r.swatches] === col ? 'on' : ''}" style="background:${hexCss(col)}" aria-label="${r.label} ${hexCss(col)}" data-key="${r.swatches}" data-val="${col}"></button>`).join('')}</div></div>`;
    if (r.tiles) return `<div class="row"><span class="lbl">${r.label}</span><div class="tiles">${r.options.map(([v, label, svg]) => `<button class="tile ${(typeof v === 'number' ? Math.round(c[r.tiles]) === v : c[r.tiles] === v) ? 'on' : ''}" data-key="${r.tiles}" data-val="${v}" data-num="${typeof v === 'number'}">${svg}<span>${label}</span></button>`).join('')}</div></div>`;
    return '';
  }).join('');
}
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  tab = b.dataset.tab; drawTabs(); drawControls();
  setZoom(tab === 'Face' || tab === 'Hair' ? 'face' : 'full');
});
$('#controls').addEventListener('click', (e) => {
  const rb = e.target.closest('[data-render]'); if (rb) { setRender(rb.dataset.render); drawControls(); return; }
  const b = e.target.closest('[data-key]'); if (!b) return;
  const v = b.classList.contains('sw') || b.dataset.num === 'true' ? +b.dataset.val : b.dataset.val;
  change(b.dataset.key, v); drawControls();
});
$('#controls').addEventListener('change', (e) => { if (e.target.dataset.slider) change(e.target.dataset.slider, +e.target.value); });
$('#controls').addEventListener('input', (e) => {                // the age reads out while dragging
  const o = e.target.dataset.out && document.getElementById(e.target.dataset.out), r = o && TABS[tab].find(x => x.slider === e.target.dataset.slider);
  if (r) o.textContent = r.show(+e.target.value);
});
$('#name').addEventListener('input', (e) => { cur().name = e.target.value || 'Citizen'; saveRoster(roster); drawRoster(); });

// ── the roster ──
function drawRoster() {
  $('#count').textContent = roster.length + (roster.length === 1 ? ' citizen' : ' citizens');
  $('#cards').innerHTML = roster.map((c, i) => `<button class="card ${i === sel ? 'on' : ''}" data-i="${i}" aria-label="Edit ${c.name}">${c.portrait ? `<img src="${c.portrait}" alt="">` : '<div class="ph"></div>'}<span>${c.name}</span></button>`).join('');
}
function select(i) {
  sel = Math.max(0, Math.min(roster.length - 1, i));
  $('#name').value = cur().name; drawRoster(); drawControls(); show();
}
$('#cards').addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) { if (mode === 'plaza') exitPlaza(); select(+b.dataset.i); } });
const add = (c) => { roster.push({ id: 'c' + Date.now(), ...c }); saveRoster(roster); select(roster.length - 1); };
$('#new').onclick = () => add({ ...DEFAULT, name: 'Citizen ' + (roster.length + 1) });
$('#rand').onclick = () => { const [ageMin, ageMax] = ageRange(); Object.assign(cur(), randomCitizen(Math.random, { ageMin, ageMax })); delete cur().portrait; saveRoster(roster); select(sel); };

// ── batches: make n citizens at once (seeded = reproducible), portraits drawn in the background ──
let portraitRun = 0;
async function fillPortraits() {
  const run = ++portraitRun, todo = roster.filter(c => !c.portrait);
  for (let i = 0; i < todo.length; i++) {
    if (run !== portraitRun) return;
    if (todo[i].portrait || todo[i] === cur()) continue;
    $('#count').textContent = `drawing portraits ${i + 1} of ${todo.length}…`;
    const p = await makePerson(spec(todo[i]));
    if (run !== portraitRun) return;
    portrait(p, todo[i]);
    await new Promise(r => setTimeout(r, 30));                         // let the page breathe between people
  }
  drawRoster();
}
// the batch's age range: a preset, or any two ages typed in
function ageRange() {
  let a = Math.round(+$('#ageMin').value), b = Math.round(+$('#ageMax').value);
  a = Math.max(AGE_MIN, Math.min(AGE_MAX, a || AGE_MIN)); b = Math.max(AGE_MIN, Math.min(AGE_MAX, b || AGE_MAX));
  return a <= b ? [a, b] : [b, a];
}
function setAges(a, b) {
  $('#ageMin').value = a; $('#ageMax').value = b;
  const k = Object.entries(AGE_RANGES).find(([, r]) => r[0] === +a && r[1] === +b)?.[0];
  $('#ages').value = k ?? 'custom';
}
$('#ages').innerHTML = Object.entries({ all: 'all ages', kids: 'kids', teens: 'teens', young: 'young adults', adults: 'adults', middle: 'middle-aged', seniors: 'seniors' })
  .map(([k, v]) => `<option value="${k}">${v} (${AGE_RANGES[k][0]}–${AGE_RANGES[k][1]})</option>`).join('') + '<option value="custom">custom</option>';
$('#ages').onchange = (e) => { const r = AGE_RANGES[e.target.value]; if (r) setAges(...r); };
for (const id of ['#ageMin', '#ageMax']) $(id).addEventListener('change', () => setAges(...ageRange()));
setAges(...AGE_RANGES.adults);
function makeBatch(n, seed, replace) {
  n = Math.max(1, Math.min(200, Math.round(n) || 1));
  const [ageMin, ageMax] = ageRange();
  const batch = generateCitizens(n, { seed: seed || null, ageMin, ageMax });
  roster = replace ? batch : roster.concat(batch);
  saveRoster(roster); select(replace ? 0 : roster.length - n); fillPortraits();
}
$('#batchF').addEventListener('submit', (e) => { e.preventDefault(); makeBatch(+$('#batchN').value, $('#seed').value.trim(), $('#replace').checked); });
$('#dup').onclick = () => { const { id, portrait, ...c } = cur(); add({ ...c, name: c.name + ' 2' }); };
$('#del').onclick = () => { if (roster.length > 1) { roster.splice(sel, 1); saveRoster(roster); select(sel); } };
const save = (blob, name) => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};
// export = a zip of rigged .glb people + portraits + the editable citizens.json
$('#export').onclick = async () => {
  const btn = $('#export'); btn.disabled = true;
  try {
    const { exportPack } = await import('./export-pack.js?cb=2');
    const blob = await exportPack({ roster, render, makePerson, spec, toJSON, onProgress: (i, n) => { $('#count').textContent = `exporting ${i + 1} of ${n}…`; } });
    save(blob, 'citizens.zip');
  } catch (err) { console.error(err); alert('Export failed: ' + err.message); }
  btn.disabled = false; drawRoster();
};
$('#exportJson').onclick = () => save(new Blob([toJSON(roster, render)], { type: 'application/json' }), 'citizens.json');
$('#import').onclick = () => $('#file').click();
$('#file').onchange = async (e) => {
  const f = e.target.files[0]; if (!f) return;
  try { const list = fromJSON(await f.text()); if (list.length) { roster = list; saveRoster(roster); select(0); } }
  catch { alert('That file isn’t a citizens list.'); }
  e.target.value = '';
};

// ── preview actions & camera ──
$('#actions').addEventListener('click', (e) => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  action = b.dataset.act;
  for (const x of $('#actions').children) x.classList.toggle('on', x === b);
  setProp();
});
function setZoom(z) { zoom = z; for (const x of $('#zoom').children) x.classList.toggle('on', x.dataset.zoom === z); }
$('#zoom').addEventListener('click', (e) => { const b = e.target.closest('[data-zoom]'); if (b) setZoom(b.dataset.zoom); });
setZoom('full');
renderer.domElement.addEventListener('pointerdown', (e) => { dragging = { x: e.clientX, t: turn }; renderer.domElement.setPointerCapture(e.pointerId); });
renderer.domElement.addEventListener('pointermove', (e) => { if (dragging) turn = dragging.t + (e.clientX - dragging.x) * 0.01; });
renderer.domElement.addEventListener('pointerup', () => { dragging = null; });
addEventListener('keydown', (e) => { if (e.target.tagName !== 'INPUT') { if (e.key === 'ArrowLeft') turn -= 0.2; if (e.key === 'ArrowRight') turn += 0.2; } });

// ── the plaza: everyone out for a stroll ──
let plazaFolk = [];
const PLAZA_MAX = 16;
$('#plaza').onclick = async () => { if (mode === 'plaza') return exitPlaza(); enterPlaza(); };
async function enterPlaza() {
  mode = 'plaza'; $('#plaza').classList.add('on'); document.body.classList.add('plaza');
  stage.visible = false; ground.scale.setScalar(5); ring.scale.setScalar(5);
  for (const f of plazaFolk) scene.remove(f.p.group);
  plazaFolk = [];
  const bench = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.44, 0.42), paint(0x8a6a4e)); bench.position.set(0, 0.22, -0.3); ink(bench, 'fine');
  const props = new THREE.Group(); props.add(bench); applyRenderStyle(props, render); scene.add(props); plazaFolk.props = props;
  const crowd = roster.slice(0, PLAZA_MAX);                         // a big batch still strolls, a plaza-full at a time
  for (let i = 0; i < crowd.length && mode === 'plaza'; i++) {
    $('#busy').textContent = `sketching ${i + 1} of ${crowd.length}${roster.length > crowd.length ? ` (of ${roster.length})` : ''}…`; $('#busy').classList.add('on');
    const p = await makePerson(spec(crowd[i]));
    if (mode !== 'plaza') return;
    const role = i === 1 ? 'sit' : i % 4 === 3 ? 'bike' : 'walk';
    // rings: everyone on a ring goes the same way, evenly spaced, so nobody walks through anybody
    const ringN = role === 'bike' ? 3 : i % 3, onRing = Math.ceil(crowd.length / 3);
    const f = { p, role, r: 1.5 + ringN * 0.8, a: (Math.floor(i / 3) / onRing) * Math.PI * 2 + ringN, dir: ringN % 2 ? 1 : -1, t: Math.random() * 10 };
    if (role === 'bike') { f.bike = makeBike(p); p.group.add(f.bike.group); applyRenderStyle(f.bike.group, render); }
    if (role === 'sit') p.group.position.set(0.3, 0, -0.25 - p.motion.M.hipMid.z);   // hips onto the bench (it spans z −0.51…−0.09)
    p.group.add(blobShadow(0.3)); scene.add(p.group); plazaFolk.push(f);
  }
  $('#busy').classList.remove('on'); $('#busy').textContent = 'sketching…';
}
function exitPlaza() {
  mode = 'edit'; $('#plaza').classList.remove('on'); document.body.classList.remove('plaza');
  for (const f of plazaFolk) scene.remove(f.p.group);
  if (plazaFolk.props) scene.remove(plazaFolk.props);
  plazaFolk = []; stage.visible = true; ground.scale.setScalar(1); ring.scale.setScalar(1);
}

// ── the loop ──
const clock = new THREE.Clock(); let t = 0, camT = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta()); t += dt;
  if (mode === 'edit') {
    if (!dragging) turn += dt * 0.12 * (action === 'idle' ? 1 : 0.4);
    stage.rotation.y = turn;
    if (current) current.motion.pose(action, t, prop?.spec ? { bike: prop, speed: current.motion.speed('walk') * 2.2 } : {});
    const H = current?.body.P.stature ?? 1.7;
    const near = zoom === 'face', bike = action === 'bike';
    const ty = near ? H * 0.9 : (action === 'sit' ? H * 0.38 : H * 0.5), span = near ? H * 0.26 : H * (bike ? 1.35 : 1.15);
    camT += (1 - camT) * 0.15;
    const dist = span / 2 / Math.tan(THREE.MathUtils.degToRad(15)) / Math.min(1, camera.aspect * 1.1);
    camera.position.lerp(new THREE.Vector3(0, ty + dist * 0.12, dist), 0.15); camera.lookAt(0, ty, 0);
  } else {
    for (const f of plazaFolk) {
      const m = f.p.motion;
      if (f.role === 'sit') { m.pose('sit', t + f.t, { seatY: 0.44 }); continue; }
      const v = f.role === 'bike' ? m.speed('walk') * 2.4 : m.speed('walk');
      f.a += f.dir * v / f.r * dt;
      f.p.group.position.set(Math.cos(f.a) * f.r, 0, Math.sin(f.a) * f.r);
      f.p.group.rotation.y = Math.atan2(-Math.sin(f.a) * f.dir, Math.cos(f.a) * f.dir);
      m.pose(f.role, t + f.t, f.bike ? { bike: f.bike, speed: v } : {});
    }
    const a = t * 0.06;
    camera.position.lerp(new THREE.Vector3(Math.sin(a) * 7.5, 3.2, Math.cos(a) * 7.5), 0.05); camera.lookAt(0, 0.7, 0);
  }
  styleTick(t, renderer.domElement.width, renderer.domElement.height);
  renderer.render(scene, camera);
}

// ?batch=30&seed=harbour&ages=2-12&render=anime makes a batch straight away (the same seed always makes the same people)
const q = new URLSearchParams(location.search);
if (RENDER_STYLES[q.get('render')]) render = q.get('render');
{ const m = /^(\d+)\s*[-–]\s*(\d+)$/.exec(q.get('ages') ?? ''); if (m) setAges(+m[1], +m[2]); else if (AGE_RANGES[q.get('ages')]) setAges(...AGE_RANGES[q.get('ages')]); }
applySceneStyle(renderer, scene, render); applySceneStyle(renderer, pscene, render);
for (const o of [ground, ring]) applyRenderStyle(o, render);
drawTabs(); resize(); loop();
if (q.has('batch')) { $('#batchN').value = q.get('batch'); $('#seed').value = q.get('seed') ?? ''; makeBatch(+q.get('batch'), q.get('seed'), true); }
else { select(0); fillPortraits(); }
window.__maker = { get ready() { return !!current; }, enterPlaza, exitPlaza, change, select, makeBatch, setRender, get render() { return render; }, get roster() { return roster; } };
