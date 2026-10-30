// ─── JANELLE'S MAIN STREET — bootstrap + loop ───────────────────────────────
// A walkable portfolio: every shop on the street is a real app; walk in,
// read the plaque, open the live site. Drawn with the Vanishing Gallery's
// gouache-and-ink engine on flat ground.
import * as THREE from 'three';
import { PAL, styleTick, paint, ink } from './style.js';
import { buildTown } from './town.js';
import { buildInteriors, tickInteriors } from './interiors.js';
import { createPlayer } from './player.js';
import { person, pose, LOOKS } from './human.js';
import { PLACES, APPS } from './apps.js';

const $ = (s) => document.querySelector(s);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;               // gouache: colours as painted
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf3ead7);
scene.fog = new THREE.Fog(0xf3ead7, 20, 46);
const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, 0.1, 300);

// warm day light, no shadow maps — shapes read from ink and cel bands
const hemi = new THREE.HemisphereLight(0xfff6e8, 0xd8c8b0, 1.35);
const sun = new THREE.DirectionalLight(0xfff2d8, 1.6);
sun.position.set(14, 22, 10);
scene.add(hemi, sun);

// ── build the world once the hand fonts are in (signs are painted with them) ──
let town, rooms, player;
const walkers = [];
const visited = new Set(JSON.parse(localStorage.getItem('street-visited') || '[]'));
let zone = 'street';                       // 'street' or a place id
let lastDoor = { x: -10.5, z: 0.6 };
let tracked = null;

const fontsReady = (document.fonts?.ready ?? Promise.resolve()).catch(() => {});
Promise.all([fontsReady]).then(() => {
  town = buildTown(scene);
  rooms = buildInteriors(scene);
  player = createPlayer(scene, camera, { x: -10.5, z: 0.6, yaw: -Math.PI / 2 });
  player.setZone({ colliders: town.colliders, bounds: town.bounds });
  player.freeze(true);                     // until "take a walk"

  // townsfolk out on the pavements
  const strolls = [
    { look: LOOKS.pia, a: [-7.0, -1.95], b: [6.3, -1.95], speed: 0.6 },
    { look: LOOKS.otto, a: [6.6, 1.95], b: [-7.6, 1.95], speed: 0.42 },
  ];
  for (const w of strolls) {
    const g = person(w.look);
    g.position.set(w.a[0], 0, w.a[1]);
    scene.add(g);
    walkers.push({ g, ...w, t: Math.random() });
  }
  const vivi = person(LOOKS.vivi);          // the director, checking on her gallery
  vivi.position.set(1.05, 0, 2.45);   // clear of the bench (she was standing in it)
  vivi.userData.turn.rotation.y = Math.PI * 0.8;
  scene.add(vivi);
  walkers.push({ g: vivi, still: true });

  buildHud();
  $('#loader').classList.add('hide');
  $('#title').classList.remove('hide');
  window.__street = { scene, camera, town, rooms, player, go: (x, z) => player.teleport(x, z) };
});

// ── HUD: the shop directory (click a line to follow it) ──
function buildHud() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  if (coarse) {
    $('#bar').innerHTML = 'drag <b>left side</b> to walk · drag <b>right</b> to look · tap the yellow prompts';
    $('#hud').classList.add('min');
  }
  $('#hud b').onclick = () => $('#hud').classList.toggle('min');
  const box = $('#shops');
  box.innerHTML = '';
  for (const p of PLACES) {
    const row = document.createElement('div');
    row.className = 'cr';
    row.dataset.id = p.id;
    row.innerHTML = `<i>${visited.has(p.id) ? '✓' : '›'}</i> ${p.title}<span class="ct"></span>`;
    row.onclick = () => { tracked = tracked === p.id ? null : p.id; refreshHud(); };
    box.appendChild(row);
  }
  refreshHud();
}
function refreshHud() {
  document.querySelectorAll('#shops .cr').forEach(row => {
    const id = row.dataset.id;
    row.classList.toggle('on', tracked === id);
    row.classList.toggle('done', visited.has(id));
    row.querySelector('i').textContent = visited.has(id) ? '✓' : '›';
  });
  $('#visitCt').textContent = `${visited.size}`;
}
function markVisited(id) {
  if (visited.has(id)) return;
  visited.add(id);
  localStorage.setItem('street-visited', JSON.stringify([...visited]));
  if (tracked === id) tracked = null;
  refreshHud();
}

// ── interactions ──
let activeAct = null;
function nearestInteract() {
  if (!player) return null;
  const p = player.pos;
  let best = null, bd = 1e9;
  const list = [];
  if (zone === 'street') {
    for (const a of APPS) {
      const d = town.doors[a.id];
      if (d) list.push({ x: d.x, z: d.z, r: 1.0, label: `enter ${a.title}`, act: { type: 'enter', id: a.id } });
    }
    const L = town.doors.library;
    list.push({ x: L.x, z: L.z, r: 1.3, label: 'enter the Public Library', act: { type: 'enter', id: 'library' } });
  } else {
    list.push(...rooms[zone].interact);
  }
  for (const it of list) {
    const d = Math.hypot(p.x - it.x, p.z - it.z);
    if (d < it.r && d < bd) { bd = d; best = it; }
  }
  return best;
}

const fadeEl = $('#fade');
function fadeDo(fn) {
  fadeEl.classList.add('on');
  setTimeout(() => { fn(); setTimeout(() => fadeEl.classList.remove('on'), 60); }, 380);
}

function doAct(it) {
  const act = it.act;
  if (act.type === 'enter') {
    lastDoor = { x: it.x, z: it.z };
    fadeDo(() => {
      zone = act.id;
      const rm = rooms[act.id];
      player.setZone({ colliders: rm.colliders, bounds: rm.bounds, lookY: 1.5 });
      player.teleport(rm.spawn.x, rm.spawn.z, 0);
      markVisited(act.id);
      $('#hud').classList.add('hide');
      $('#way').classList.add('hide');
    });
  } else if (act.type === 'exit') {
    const wasLib = zone === 'library';
    fadeDo(() => {
      zone = 'street';
      mini.see(''); $('#say').classList.add('hide');
      player.setZone({ colliders: town.colliders, bounds: town.bounds });
      if (wasLib) player.teleport(lastDoor.x - 0.9, 0, Math.PI / 2);
      else player.teleport(lastDoor.x, lastDoor.z - Math.sign(lastDoor.z) * 1.15, -Math.PI / 2);
      if (!uiHidden) $('#hud').classList.remove('hide');
    });
  } else if (act.type === 'mini') {
    act.run(mini);
  } else if (act.type === 'card') {
    openCard(act.place);
  } else if (act.type === 'visit') {
    window.open(act.url, '_blank', 'noopener');
  }
}

// the little things you can do inside a shop: a caption, and (Borrowed Eyes) a way of seeing
let sayTimer = 0;
const mini = {
  say(text) {
    const el = $('#say'); el.textContent = text; el.classList.remove('hide');
    clearTimeout(sayTimer); sayTimer = setTimeout(() => el.classList.add('hide'), 4200);
  },
  see(filter) { renderer.domElement.style.filter = filter || ''; },
};

function openCard(p) {
  $('#cardTitle').textContent = p.title;
  $('#cardTrade').textContent = p.trade;
  $('#cardDesc').textContent = p.desc;
  $('#cardHow').textContent = p.how;
  $('#cardNote').textContent = p.note;
  const img = $('#cardShot');
  if (p.shot) { img.src = p.shot; img.style.display = ''; } else img.style.display = 'none';
  $('#cardVisit').onclick = () => window.open(p.url, '_blank', 'noopener');
  $('#card').classList.remove('hide');
  player?.freeze(true);
}
function closeCard() {
  $('#card').classList.add('hide');
  player?.freeze(false);
}
$('#cardClose').onclick = closeCard;

addEventListener('keydown', (e) => {
  if (e.code === 'KeyE' || e.code === 'Enter') {
    if (!$('#card').classList.contains('hide')) return closeCard();
    if (!$('#title').classList.contains('hide')) return start();
    if (activeAct) doAct(activeAct);
  }
  if (e.code === 'Escape') closeCard();
  if (e.code === 'KeyH') toggleUi();
});
$('#prompt').onclick = () => activeAct && doAct(activeAct);

let uiHidden = false;
function toggleUi() {
  uiHidden = !uiHidden;
  for (const s of ['#hud', '#nbBtn', '#bar']) $(s).classList.toggle('hide', uiHidden);
  if (uiHidden) $('#way').classList.add('hide');
}

function start() {
  $('#title').classList.add('hide');
  player.freeze(false);
  if (!uiHidden) { $('#hud').classList.remove('hide'); $('#nbBtn').classList.remove('hide'); $('#bar').classList.remove('hide'); }
}
$('#startBtn').onclick = start;

// ── the waypoint arrow to the tracked shop ──
const _wp = new THREE.Vector3();
function tickWaypoint() {
  const way = $('#way');
  if (!tracked || zone !== 'street' || uiHidden) { way.classList.add('hide'); return; }
  const d = town.doors[tracked === 'library' ? 'library' : tracked];
  if (!d) { way.classList.add('hide'); return; }
  _wp.set(d.x, 1.6, d.z).project(camera);
  const behind = _wp.z > 1;
  let sx = (_wp.x * 0.5 + 0.5) * innerWidth, sy = (-_wp.y * 0.5 + 0.5) * innerHeight;
  if (behind) { sx = innerWidth - sx; sy = innerHeight - 40; }
  sx = Math.max(50, Math.min(innerWidth - 50, sx));
  sy = Math.max(60, Math.min(innerHeight - 90, sy));
  way.style.transform = `translate(${sx}px, ${sy}px)`;
  const place = PLACES.find(p => p.id === tracked);
  const dist = Math.hypot(player.pos.x - d.x, player.pos.z - d.z);
  way.querySelector('span').textContent = `${place.title} · ${Math.max(1, Math.round(dist * 8))} m`;
  way.classList.remove('hide');
}

// ── the loop ──
const clock = new THREE.Clock();
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  if (player) {
    player.update(dt, t);
    // townsfolk stroll their stretch of pavement
    for (const w of walkers) {
      const inst = w.g.userData.human;
      if (w.still) { if (inst) pose(inst, dt, 0); continue; }
      w.t += dt * w.speed / Math.hypot(w.b[0] - w.a[0], w.b[1] - w.a[1]);
      const ping = Math.abs(((w.t % 2) + 2) % 2 - 1);     // 0→1→0
      const k = 1 - ping;
      const x = w.a[0] + (w.b[0] - w.a[0]) * k, z = w.a[1] + (w.b[1] - w.a[1]) * k;
      const dir = (((w.t % 2) + 2) % 2) < 1 ? 1 : -1;
      w.g.position.set(x, 0, z);
      w.g.userData.turn.rotation.y = Math.atan2((w.b[0] - w.a[0]) * dir, (w.b[1] - w.a[1]) * dir);
      if (inst) pose(inst, dt, 0.8);
    }
    // the prompt
    const it = $('#card').classList.contains('hide') && $('#title').classList.contains('hide') ? nearestInteract() : null;
    activeAct = it;
    const pr = $('#prompt');
    if (it) { pr.innerHTML = `<kbd>E</kbd> ${it.label}`; pr.classList.remove('hide'); }
    else pr.classList.add('hide');
    tickWaypoint();
  }
  tickInteriors(t);
  styleTick(t, renderer.domElement.width, renderer.domElement.height);
  renderer.render(scene, camera);
}
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
loop();
