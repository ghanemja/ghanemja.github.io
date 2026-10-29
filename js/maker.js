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
import { PALETTE, FACES, STYLE_NAMES, DEFAULT, randomCitizen, generateCitizens, toPersonSpec, INSTANT, loadRoster, saveRoster, toJSON, fromJSON } from './citizens.js';

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
  const p = await makePerson(toPersonSpec(c));
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
  if (prop) { prop.parent?.remove(prop.group ?? prop); prop = null; }
  if (!current) return;
  if (action === 'bike') { prop = makeBike(current); current.group.add(prop.group); }
  if (action === 'sit') {
    const h = current.motion.M.knee.L.y * 0.97;
    const bench = new THREE.Mesh(new THREE.BoxGeometry(0.5, h, 0.42), paint(0x8a6a4e));
    bench.position.set(0, h / 2, current.motion.M.hipMid.z - 0.12); ink(bench, 'fine');
    current.group.add(bench); prop = bench;
  }
}

// ── a portrait for the roster card (rendered from the real model) ──
const rt = new THREE.WebGLRenderTarget(160, 160), pcam = new THREE.PerspectiveCamera(24, 1, 0.05, 20);
const pscene = new THREE.Scene(); pscene.background = new THREE.Color(0xefe4cc);       // portraits get their own little studio
{ const s2 = sun.clone(); pscene.add(new THREE.HemisphereLight(0xfff6e8, 0xd8c8b0, 1.35), s2); }
rt.texture.colorSpace = THREE.SRGBColorSpace;              // so the portrait is encoded like the screen
function portrait(p, c) {
  p.motion.pose('idle', 0.5);
  p.group.updateMatrixWorld(true);
  const parent = p.group.parent, pos = p.group.position.clone(), rot = p.group.rotation.y;
  p.group.position.set(0, 0, 0); p.group.rotation.y = 0; pscene.add(p.group); p.group.updateMatrixWorld(true);
  const head2 = p.sk.byName.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.07, 0));
  pcam.position.copy(head2).add(new THREE.Vector3(0.12, 0.02, 0.78)); pcam.lookAt(head2);
  renderer.setRenderTarget(rt); renderer.render(pscene, pcam); renderer.setRenderTarget(null);
  pscene.remove(p.group); if (parent) parent.add(p.group); p.group.position.copy(pos); p.group.rotation.y = rot;
  const px = new Uint8Array(160 * 160 * 4); renderer.readRenderTargetPixels(rt, 0, 0, 160, 160, px);
  const cv = document.createElement('canvas'); cv.width = cv.height = 160;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(160, 160);
  for (let y = 0; y < 160; y++) img.data.set(px.subarray((159 - y) * 640, (160 - y) * 640), y * 640);   // flip: GL rows run bottom-up
  ctx.putImageData(img, 0, 0);
  c.portrait = cv.toDataURL('image/jpeg', 0.85);
  saveRoster(roster); drawRoster();
}

// ── editing ──
function change(key, value, rebuild = !INSTANT.includes(key)) {
  cur()[key] = value; saveRoster(roster);
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
const icon = (inner, face = true) => `<svg viewBox="0 0 42 42" aria-hidden="true">${face ? HEAD : ''}${inner}</svg>`;
const BODY_ICON = (w, h) => `<svg viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="${10 + (1 - h) * 4}" r="5" fill="#efc3a2" stroke="#2a2230" stroke-width="1.5"/><rect x="${21 - w}" y="${16 + (1 - h) * 4}" width="${w * 2}" height="${24 - (1 - h) * 4}" rx="${w * 0.7}" fill="#6f8db0" stroke="#2a2230" stroke-width="1.5"/></svg>`;

const TABS = {
  Body: [
    { tiles: 'sex', label: 'Body', options: [[0, 'Woman', BODY_ICON(6, 0.85)], [1, 'Man', BODY_ICON(7.5, 1)]] },
    { slider: 'height', label: 'Height', ends: ['shorter', 'taller'] },
    { slider: 'build', label: 'Build', ends: ['slight', 'solid'] },
    { slider: 'muscle', label: 'Muscle', ends: ['soft', 'strong'] },
  ],
  Face: [
    { swatches: 'skin', label: 'Skin', colours: PALETTE.skin },
    { tiles: 'face', label: 'Face shape', options: Object.keys(FACES).map((k, i) => [k, k === 'mix' ? 'Blend' : 'Shape ' + i, icon('', true)]) },
    { swatches: 'eyes', label: 'Eyes', colours: PALETTE.eyes },
    { slider: 'smile', label: 'Smile', ends: ['calm', 'beaming'] },
  ],
  Hair: [
    { tiles: 'hairStyle', label: 'Style', options: Object.entries(HAIRSTYLES).map(([k, v]) => [k, v.label, icon(HAIR_ICON[k] ?? '')]) },
    { swatches: 'hair', label: 'Colour', colours: PALETTE.hair },
  ],
  Clothes: [
    { swatches: 'top', label: 'Top', colours: PALETTE.clothes },
    { swatches: 'bottom', label: 'Trousers', colours: PALETTE.clothes },
    { swatches: 'shoes', label: 'Shoes', colours: [0xf1ebdf, 0x2f2b33, 0xd8584a, 0x8e2f3a, 0x5b4636, 0xe4b84f, 0x3f8f88, 0x6f8db0] },
  ],
  Style: [
    { tiles: 'style', label: 'Drawn as', options: Object.entries(STYLE_NAMES).map(([k, v]) => [k, v, '']) },
    { note: 'Painted and Natural keep real human proportions. Storybook and Chibi are deliberately exaggerated (bigger heads and eyes).' },
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
    if (r.slider) return `<div class="row"><label for="s${i}">${r.label}</label><input id="s${i}" type="range" min="0" max="1" step="0.01" value="${c[r.slider]}" data-slider="${r.slider}"><div class="ends"><span>${r.ends[0]}</span><span>${r.ends[1]}</span></div></div>`;
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
  const b = e.target.closest('[data-key]'); if (!b) return;
  const v = b.classList.contains('sw') || b.dataset.num === 'true' ? +b.dataset.val : b.dataset.val;
  change(b.dataset.key, v); drawControls();
});
$('#controls').addEventListener('change', (e) => { if (e.target.dataset.slider) change(e.target.dataset.slider, +e.target.value); });
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
$('#rand').onclick = () => { Object.assign(cur(), randomCitizen()); delete cur().portrait; saveRoster(roster); select(sel); };

// ── batches: make n citizens at once (seeded = reproducible), portraits drawn in the background ──
let portraitRun = 0;
async function fillPortraits() {
  const run = ++portraitRun, todo = roster.filter(c => !c.portrait);
  for (let i = 0; i < todo.length; i++) {
    if (run !== portraitRun) return;
    if (todo[i].portrait || todo[i] === cur()) continue;
    $('#count').textContent = `drawing portraits ${i + 1} of ${todo.length}…`;
    const p = await makePerson(toPersonSpec(todo[i]));
    if (run !== portraitRun) return;
    portrait(p, todo[i]);
    await new Promise(r => setTimeout(r, 30));                         // let the page breathe between people
  }
  drawRoster();
}
function makeBatch(n, seed, replace) {
  n = Math.max(1, Math.min(200, Math.round(n) || 1));
  const batch = generateCitizens(n, { seed: seed || null });
  roster = replace ? batch : roster.concat(batch);
  saveRoster(roster); select(replace ? 0 : roster.length - n); fillPortraits();
}
$('#batchF').addEventListener('submit', (e) => { e.preventDefault(); makeBatch(+$('#batchN').value, $('#seed').value.trim(), $('#replace').checked); });
$('#dup').onclick = () => { const { id, portrait, ...c } = cur(); add({ ...c, name: c.name + ' 2' }); };
$('#del').onclick = () => { if (roster.length > 1) { roster.splice(sel, 1); saveRoster(roster); select(sel); } };
$('#export').onclick = () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([toJSON(roster)], { type: 'application/json' }));
  a.download = 'citizens.json'; a.click(); URL.revokeObjectURL(a.href);
};
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
  const props = new THREE.Group(); props.add(bench); scene.add(props); plazaFolk.props = props;
  const crowd = roster.slice(0, PLAZA_MAX);                         // a big batch still strolls, a plaza-full at a time
  for (let i = 0; i < crowd.length && mode === 'plaza'; i++) {
    $('#busy').textContent = `sketching ${i + 1} of ${crowd.length}${roster.length > crowd.length ? ` (of ${roster.length})` : ''}…`; $('#busy').classList.add('on');
    const p = await makePerson(toPersonSpec(crowd[i]));
    if (mode !== 'plaza') return;
    const role = i === 1 ? 'sit' : i % 4 === 3 ? 'bike' : 'walk';
    // rings: everyone on a ring goes the same way, evenly spaced, so nobody walks through anybody
    const ringN = role === 'bike' ? 3 : i % 3, onRing = Math.ceil(crowd.length / 3);
    const f = { p, role, r: 1.5 + ringN * 0.8, a: (Math.floor(i / 3) / onRing) * Math.PI * 2 + ringN, dir: ringN % 2 ? 1 : -1, t: Math.random() * 10 };
    if (role === 'bike') { f.bike = makeBike(p); p.group.add(f.bike.group); }
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

drawTabs(); resize(); loop();
// ?batch=30&seed=harbour makes a batch straight away (the same seed always makes the same people)
const q = new URLSearchParams(location.search);
if (q.has('batch')) { $('#batchN').value = q.get('batch'); $('#seed').value = q.get('seed') ?? ''; makeBatch(+q.get('batch'), q.get('seed'), true); }
else { select(0); fillPortraits(); }
window.__maker = { get ready() { return !!current; }, enterPlaza, exitPlaza, change, select, makeBatch, get roster() { return roster; } };
