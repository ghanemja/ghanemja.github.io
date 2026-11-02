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
    $('#bar').innerHTML = 'tap to walk or play · drag <b>left side</b> to walk · drag <b>right</b> to look';
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
      const n = rm.interact.filter(i => i.act.type === 'mini').length;
      if (n) setTimeout(() => zone === act.id && !game.isOpen && mini.say(`${n === 1 ? 'A little game' : n + ' little games'} in here: walk onto a glowing ★ ring and press E.`), 700);
      $('#hud').classList.add('hide');
      $('#way').classList.add('hide');
    });
  } else if (act.type === 'exit') {
    const wasLib = zone === 'library';
    fadeDo(() => {
      zone = 'street';
      game.close(); mini.see(''); $('#say').classList.add('hide');
      player.setZone({ colliders: town.colliders, bounds: town.bounds });
      if (wasLib) player.teleport(lastDoor.x - 0.9, 0, Math.PI / 2);
      else player.teleport(lastDoor.x, lastDoor.z - Math.sign(lastDoor.z) * 1.15, -Math.PI / 2);
      if (!uiHidden) $('#hud').classList.remove('hide');
    });
  } else if (act.type === 'mini') {
    playing = act;
    act.played?.();
    act.run(mini);
  } else if (act.type === 'card') {
    openCard(act.place);
  } else if (act.type === 'visit') {
    window.open(act.url, '_blank', 'noopener');
  }
}

// the little things you can do inside a shop: a caption, a way of seeing (Borrowed Eyes),
// and a little game panel — buttons you click (or press 1–9), a timing meter, a score
let sayTimer = 0;
let playing = null;                       // the station whose game is open
const game = (() => {
  const el = $('#game'), btns = $('#gBtns'), meterEl = $('#gMeter'), noteEl = $('#gNote');
  let open = false, onClose = null, timers = [], primary = null, keys = [], meterRun = null;
  // tiny paper-and-pencil sound effects
  let ac = null;
  const blip = (notes, type = 'triangle', vol = 0.07) => {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      let t = ac.currentTime;
      for (const [f, d] of notes) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type; o.frequency.value = f;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d); t += d * 0.7;
      }
    } catch (e) { /* no audio, no matter */ }
  };
  const stopMeter = () => { if (meterRun) cancelAnimationFrame(meterRun.raf); meterRun = null; meterEl.hidden = true; };
  const clear = () => { btns.innerHTML = ''; primary = null; keys = []; };
  const refreshKeys = () => {
    const n = keys.length;
    $('#gKeys').textContent = [n ? `1–${n} to pick` : '', primary ? 'Space for “' + primary.dataset.label + '”' : '', 'Esc to close'].filter(Boolean).join(' · ');
  };
  const button = (label, fn, cls) => {
    const b = document.createElement('button');
    b.className = 'sk' + (cls ? ' ' + cls : ''); b.dataset.label = label; b.textContent = label;
    b.onclick = (e) => { e.stopPropagation(); if (!b.disabled) fn(b); };
    btns.appendChild(b);
    return b;
  };
  const G = {
    get isOpen() { return open; },
    blip,
    open(title, opts = {}) {
      if (open) G.close();
      open = true; onClose = opts.onClose || null;
      $('#gTitle').textContent = title; $('#gScore').textContent = ''; $('#gText').textContent = '';
      noteEl.textContent = ''; noteEl.className = ''; clear(); stopMeter();
      el.classList.remove('hide'); $('#say').classList.add('hide'); $('#hint').classList.add('hide');
      player?.freeze(true); player?.gameView(true); refreshKeys();
      return G;
    },
    close() {
      if (!open) return;
      open = false; timers.forEach(clearTimeout); timers = []; stopMeter(); clear();
      el.classList.add('hide'); player?.freeze(false); player?.gameView(false);
      const f = onClose; onClose = null; f?.();
    },
    title(s) { $('#gTitle').textContent = s; },
    score(s) { $('#gScore').textContent = s; },
    text(s) { $('#gText').textContent = s; },
    note(s, kind = '') {
      noteEl.textContent = s; noteEl.className = '';
      void noteEl.offsetWidth; noteEl.className = kind;
      if (kind === 'good') blip([[660, 0.12], [990, 0.18]]);
      if (kind === 'bad') blip([[220, 0.16], [165, 0.2]], 'square', 0.035);
    },
    good(s) { G.note(s, 'good'); }, bad(s) { G.note(s, 'bad'); },
    // numbered choices; onPick(i, button). Call again to replace them.
    choices(labels, onPick) {
      clear(); stopMeter();
      labels.forEach((l, i) => {
        const b = button(l, () => onPick(i, b));
        b.innerHTML = `<i>${i + 1}</i>`; b.append(l);
        keys.push(b);
      });
      refreshKeys();
      return keys;
    },
    // mark the picked and the right answer, and stop more picks
    lock(picked, right) {
      keys.forEach((b, i) => { b.disabled = true; if (i === right) b.classList.add('right'); else if (i === picked) b.classList.add('wrong'); });
    },
    // the go-on button (Space / Enter / E). Several calls add several; the first is primary.
    next(label, fn) {
      const b = button(label, () => fn(), primary ? '' : 'next');
      if (!primary) primary = b;
      refreshKeys();
      return b;
    },
    // a needle sweeps the bar; stop it inside the gold zone. onStop(hit, pos)
    meter({ zone = [0.4, 0.6], speed = 0.6, label = 'stop!' } = {}, onStop) {
      clear(); stopMeter();
      meterEl.hidden = false;
      const z = meterEl.querySelector('.zone'), nd = meterEl.querySelector('.needle');
      z.style.left = zone[0] * 100 + '%'; z.style.width = (zone[1] - zone[0]) * 100 + '%';
      const t0 = performance.now() - Math.random() * 600;
      const run = { raf: 0, pos: 0 };
      const at = (now) => { const u = ((now - t0) / 1000) * speed; return 1 - Math.abs((u % 2) - 1); };
      const step = (now) => {
        run.pos = at(now);
        nd.style.left = run.pos * 100 + '%';
        run.raf = requestAnimationFrame(step);
      };
      run.raf = requestAnimationFrame(step);
      meterRun = run;
      const b = button(label, () => {
        if (meterRun !== run) return;
        cancelAnimationFrame(run.raf); meterRun = null;
        b.disabled = true; primary = null;
        // judge where the needle is now (not at the last frame), with a little leeway
        const pos = at(performance.now()), slack = 0.035;
        nd.style.left = pos * 100 + '%';
        onStop(pos >= zone[0] - slack && pos <= zone[1] + slack, pos);
      }, 'next');
      primary = b; refreshKeys();
    },
    later(ms, fn) { const id = setTimeout(() => { if (open) fn(); }, ms); timers.push(id); },
    cheer() {
      blip([[523, 0.1], [659, 0.1], [784, 0.1], [1046, 0.3]]);
      const r = el.getBoundingClientRect();
      const cols = ['#e8604c', '#e4b84f', '#7fb3a8', '#8f7ae8', '#5f8cc8'];
      for (let i = 0; i < 36; i++) {
        const c = document.createElement('div'); c.className = 'confetti';
        c.style.left = r.left + Math.random() * r.width + 'px'; c.style.top = r.top + 8 + 'px';
        c.style.background = cols[i % cols.length];
        c.style.setProperty('--dx', (Math.random() - 0.5) * 260 + 'px');
        c.style.setProperty('--dy', -(80 + Math.random() * 220) + 'px');
        c.style.setProperty('--r', (Math.random() - 0.5) * 900 + 'deg');
        document.body.appendChild(c); setTimeout(() => c.remove(), 1200);
      }
    },
    // keyboard while the panel is open; true if handled
    key(e) {
      if (!open) return false;
      if (e.code === 'Escape') { G.close(); return true; }
      const d = /^(Digit|Numpad)([1-9])$/.exec(e.code);
      if (d) { const b = keys[+d[2] - 1]; if (b && !b.disabled) b.click(); return true; }
      if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
        e.preventDefault();
        if (primary && !primary.disabled) primary.click();
        return true;
      }
      return false;
    },
  };
  $('#gX').onclick = () => G.close();
  return G;
})();
const mini = {
  say(text) {
    const el = $('#say'); el.textContent = text; el.classList.remove('hide');
    clearTimeout(sayTimer); sayTimer = setTimeout(() => el.classList.add('hide'), 5200);
  },
  see(filter) { renderer.domElement.style.filter = filter || ''; },
  game,
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
  if (game.key(e)) return;
  if (e.code === 'KeyE' || e.code === 'Enter') {
    if (!$('#card').classList.contains('hide')) return closeCard();
    if (!$('#title').classList.contains('hide')) return start();
    if (activeAct) doAct(activeAct);
  }
  if (e.code === 'Escape') closeCard();
  if (e.code === 'KeyH') toggleUi();
});
$('#prompt').onclick = () => activeAct && doAct(activeAct);

// ── tap the world: walk to the floor; tap a thing to walk over and use it ──
const ray = new THREE.Raycaster(), _ndc = new THREE.Vector2();
ray.camera = camera;
function pickAt(cx, cy) {
  if (!player) return null;
  _ndc.set((cx / innerWidth) * 2 - 1, -(cy / innerHeight) * 2 + 1);
  ray.setFromCamera(_ndc, camera);
  ray.far = 40;
  const roots = zone === 'street' ? scene.children.filter(o => !roomGroups.has(o) && o !== player.group) : [rooms[zone].group];
  const hits = ray.intersectObjects(roots, true).filter(h => h.object.visible && !h.object.userData.isInk && !isPlayer(h.object));
  const h = hits[0];
  if (!h) return null;
  for (let o = h.object; o; o = o.parent) if (o.userData.toy) return { toy: o.userData.toy, point: h.point };
  const p = h.point;
  // what it belongs to: the nearest thing you can use, if you tapped an object (not the floor)
  const list = zone === 'street'
    ? [...APPS.filter(a => town.doors[a.id]).map(a => ({ x: town.doors[a.id].x, z: town.doors[a.id].z, r: 1.0, label: `enter ${a.title}`, act: { type: 'enter', id: a.id }, reach: 2.6 })),
       { x: town.doors.library.x, z: town.doors.library.z, r: 1.3, label: 'enter the Public Library', act: { type: 'enter', id: 'library' }, reach: 3.2 }]
    : rooms[zone].interact.map(it => ({ ...it, reach: it.act.type === 'exit' ? 1.0 : 1.6 }));
  let it = null, bd = 1e9;
  if (p.y > 0.04 || h.object.isSprite) {
    for (const c of list) {
      // a station's ring sits in front of its thing, so measure to the thing too
      let d = Math.hypot(p.x - c.x, p.z - c.z);
      if (c.act.type === 'mini') d = Math.min(d, Math.hypot(p.x - c.x, p.z - (c.z - 0.85)) * 0.9);
      if (d < c.reach && d < bd) { bd = d; it = c; }
    }
  }
  return { point: p, it };
}
const isPlayer = (o) => { for (; o; o = o.parent) if (o === player.group) return true; return false; };
let roomGroups = new Set();
const canWalk = () => player && $('#card').classList.contains('hide') && $('#title').classList.contains('hide') && !game.isOpen;
const cvs = renderer.domElement;
const tap = { x: 0, y: 0, t: 0, id: -1 };
cvs.addEventListener('pointerdown', (e) => { tap.x = e.clientX; tap.y = e.clientY; tap.t = performance.now(); tap.id = e.pointerId; });
cvs.addEventListener('pointerup', (e) => {
  if (e.pointerId !== tap.id || !canWalk()) return;
  if (Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > 8 || performance.now() - tap.t > 350) return;   // that was a drag
  if (!roomGroups.size) roomGroups = new Set(Object.values(rooms).map(r => r.group));
  const hit = pickAt(e.clientX, e.clientY);
  if (!hit) return;
  const { it, point, toy } = hit;
  if (toy) return toy.poke(game.blip);
  if (it) {
    // already standing there? just use it
    if (Math.hypot(player.pos.x - it.x, player.pos.z - it.z) < it.r) return it.act.type !== 'visit' && doAct(it);
    marker(it.x, it.z);
    player.walkTo(it.x, it.z, () => {
      // (opening another site needs a fresh tap, so that one just waits at its prompt)
      if (Math.hypot(player.pos.x - it.x, player.pos.z - it.z) < it.r && it.act.type !== 'visit' && canWalk()) doAct(it);
    });
  } else {
    marker(point.x, point.z);
    player.walkTo(point.x, point.z);
  }
});
// a little chalk ring where you tapped
const tapRing = new THREE.Mesh(new THREE.RingGeometry(0.12, 0.18, 28).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0xe8604c, transparent: true, opacity: 0, depthWrite: false }));
tapRing.renderOrder = 5; scene.add(tapRing);
let tapT = -9;
function marker(x, z) { tapRing.position.set(x, 0.03, z); tapT = clock.elapsedTime; }
// on a mouse, things you can use light up the cursor and say what they are
const hint = document.createElement('div');
hint.className = 'ui sk hide'; hint.id = 'hint';
document.body.appendChild(hint);
let hoverAt = 0;
cvs.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || e.buttons) return;
  const now = performance.now();
  if (now - hoverAt < 90) return;
  hoverAt = now;
  if (!roomGroups.size && rooms) roomGroups = new Set(Object.values(rooms).map(r => r.group));
  const hit = canWalk() ? pickAt(e.clientX, e.clientY) : null;
  const it = hit?.it, toy = hit?.toy;
  cvs.style.cursor = it || toy ? 'pointer' : '';
  if (it || toy) {
    hint.textContent = toy ? toy.label : (it.act.type === 'mini' ? '★ ' : '') + it.label;
    hint.style.left = e.clientX + 16 + 'px'; hint.style.top = e.clientY + 14 + 'px';
    hint.classList.remove('hide');
  } else hint.classList.add('hide');
});
cvs.addEventListener('pointerleave', () => hint.classList.add('hide'));

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
    const it = $('#card').classList.contains('hide') && $('#title').classList.contains('hide') && !game.isOpen ? nearestInteract() : null;
    activeAct = it;
    if (game.isOpen) playing?.focus?.(); else if (it?.act.type === 'mini') it.act.focus?.();
    const pr = $('#prompt');
    if (it) {
      pr.innerHTML = it.act.type === 'mini' ? '<kbd>E</kbd> <span class="play">★ play</span> · ' : '<kbd>E</kbd> ';
      pr.append(it.label); pr.classList.remove('hide');
    }
    else pr.classList.add('hide');
    tickWaypoint();
  }
  { const a = t - tapT; tapRing.material.opacity = a < 0.7 ? 0.8 * (1 - a / 0.7) : 0; tapRing.scale.setScalar(1 + a * 0.8); }
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
