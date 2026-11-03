// ─── TOWNSFOLK IN THE SHOPS ──────────────────────────────────────────────────
// Two people in every shop, busy with something that fits it: one standing at
// a thing, one pottering between two spots. Walk up and press E (or tap them)
// and they turn to you, react and say something — one of them always knows a
// little about where that shop's page of Vivi's guest list went.
// Everyone is a folk model, built fully dressed (see AGENTS.md).
import * as THREE from 'three';
import { person, pose } from './human.js';

// look shorthands: [skin, hair hex, hairStyle, top, bottom, shoes, outfit, hat, hatColor, extra]
const L = (skin, hair, hairStyle, top, bottom, shoes, outfit = null, hat = null, hatColor = 0x2a2230, extra = {}) =>
  ({ folk: true, skin, hair, hairStyle, top, bottom, shoes, outfit, hat, hatColor, ...extra });

export const SHOP_FOLK = {
  behaviors: [
    { name: 'Dot', role: 'lab tech', stance: 'writing', look: L('tan', 0x2b1d1a, 'pony', 0xf6efdf, 0x3b4a5e, 0x2a2230, 'coat', null, 0, { accent: 0x7fb3a8, glasses: true }),
      lines: ['Trial 412: the crate did not move. Again. I respect it.', 'I log everything by how it MOVES. My sandwich slides, my mug tips.', 'Lost page? Something’s peeking out from under the blue tote bin. Tilt the lab and see what slides.', 'Please don’t pull the tilt lever. (Please pull the tilt lever.)'] },
    { name: 'Gus', role: 'crash-test enthusiast', pace: true, look: L('rose', 0x7a4a2a, 'crop', 0xe8604c, 0x262c3c, 0x1e1a1c, 'vest', 'helmet', 0xe4b84f, { accent: 0xd6e04c, build: 1.08 }),
      lines: ['Ball: rolls. Can: rolls. Me: also rolls, if you tilt me.', 'I’m here for the drop tests. Purely professional interest.', 'Did you know a bottle tips if you push it above its middle? I’ve tested it 300 times.'] },
  ],
  qr: [
    { name: 'Marisol', role: 'cartographer', stance: 'writing', look: L('olive', 0x1d1a1a, 'bun', 0x3f8f88, 0x2a2230, 0x6e2a2e, 'coat', null, 0, { accent: 0xe4b84f }),
      lines: ['Every company on this map has a code. Even the lemonade stand.', 'North is that way. (It’s always the screen. I don’t make the rules.)', 'I file loose papers under “misc.” in the map cabinet’s top drawer. Including one that isn’t mine.'] },
    { name: 'Theo', role: 'balloon pilot', pace: true, look: L('brown', 0x1d1a1a, 'curls', 0xd58b63, 0x3b4a5e, 0x5a3d2c, null, 'flat', 0x5b4636),
      lines: ['Fire a burner on one of the balloons. Go on. They love it.', 'I scanned my own sandwich once. It linked to a sandwich.', 'Seven regions, 500 companies, one very tired compass.'] },
  ],
  yarnflow: [
    { name: 'Marge', role: 'regular knitter', stance: 'coffee', look: L('fair', 0xd8d4cf, 'curls', 0xdc9e9a, 0x5a4e5e, 0x6e2a2e, 'cardigan', null, 0, { glasses: true, accent: 0xf3dfa8 }),
      lines: ['Forty years of crochet and I still count out loud.', 'That loose thread on the big rug? Pull it. Trust me. And look under where the rug was.', 'Frogging: ripping it all out. Rip it, rip it. Like a frog.'] },
    { name: 'Pip', role: 'yarn ball wrangler', pace: true, look: L('rose', 0xe8604c, 'bob', 0x8f7ae8, 0x3b4a5e, 0xe9e2d0, 'apron', 'beanie', 0x7fb3a8, { accent: 0xf6eedb }),
      lines: ['I am losing a war against two cats.', 'Every ball of yarn in here has been batted under something at least once.', 'YarnFlow plays a pattern stitch by stitch. I play “find the yarn” all day.'] },
  ],
  hookpath: [
    { name: 'Rosa', role: 'director', stance: 'crossed', look: L('olive', 0x2b1d1a, 'bob', 0x2a2230, 0x2a2230, 0x2a2230, null, 'beanie', 0xe8604c, { glasses: true }),
      lines: ['From the top! And this time the hook hits its mark.', 'The yarn-ball is our lead. It’s… difficult. It’s standing on something at its first mark — play the take and it’ll move.', 'Two clapperboards say different takes. Continuity is a myth.'] },
    { name: 'Benny', role: 'grip', pace: true, look: L('deep', 0x1d1a1a, 'crop', 0x6f8a6a, 0x262c3c, 0x1e1a1c, 'vest', 'cap', 0x24304a, { accent: 0xe4b84f, build: 1.12 }),
      lines: ['I move the lights. The lights move me, emotionally.', 'Scrub the dolly track. The whole room plays the take.', 'Quiet on set! (It is always quiet on set. It’s a room.)'] },
  ],
  deckgpt: [
    { name: 'Ruby', role: 'usher', stance: 'torch', look: L('brown', 0x1d1a1a, 'bun', 0xb03a30, 0x2a2230, 0x2a2230, 'uniform', 'cap', 0xb03a30),
      lines: ['Phones on silent, please. The deck is about to begin.', 'Click the big clicker on the podium: the room turns into the slides.', 'Lost property? We keep everything in the cans. It’s a wrap: in the top film can.'] },
    { name: 'Walt', role: 'film buff', pace: true, stance: 'coffee', look: L('fair', 0x9a9490, 'bald', 0x3a4a68, 0x4a3a2c, 0x3a2a20, 'coat', null, 0, { beard: true, glasses: true, accent: 0xf3ead7 }),
      lines: ['I’ve seen this deck six times. The bar chart scene gets me every time.', 'Scope, Story, Visuals, Deck. A classic in four acts.', 'The sequel’s called final_v2_FINAL. I have notes.'] },
  ],
  splatform: [
    { name: 'Inès', role: 'painter', stance: 'writing', look: L('tan', 0x2b1d1a, 'curls', 0xf6efdf, 0x3f5872, 0xe9e2d0, 'apron', null, 0, { accent: 0xe8604c }),
      lines: ['Same button, five media. I’ve painted it 300 times. It’s still a button.', 'Splat the big paint can and the whole room changes medium.', 'I swear the washing line had a page on it… only shows up in pencil, mind.'] },
    { name: 'Kit', role: 'art student', pace: true, look: L('rose', 0x7a4a2a, 'pony', 0xe4b84f, 0x5a4e5e, 0xdc6a9a, 'cardigan', 'beanie', 0x8f7ae8),
      lines: ['Is it art if it’s also a beanbag? (Yes.)', 'My portfolio is mostly paint on my shoes.', 'Charcoal is the card. Watercolour is my mood.'] },
  ],
  'borrowed-eyes': [
    { name: 'Ada', role: 'field biologist', stance: 'writing', look: L('olive', 0x1d1a1a, 'pony', 0x6f8a6a, 0x5a4e3c, 0x3a2a20, 'vest', 'flat', 0xa8b994, { accent: 0xd8c9a8, glasses: true }),
      lines: ['A bee sees ultraviolet. I see a deadline.', 'Borrow an owl’s eyes and check the darkest corner. Something’s there that wasn’t.', 'Field notes, day 41: the hedgehog in the log has not agreed to be interviewed.'] },
    { name: 'Sol', role: 'birdwatcher', pace: true, look: L('deep', 0x1d1a1a, 'crop', 0xe4b84f, 0x3b4a5e, 0x5a3d2c, null, 'cap', 0x55663f),
      lines: ['Shh. There’s an owl. Somewhere. Possibly in my head.', 'I tried bat vision. Now everything is an echo, echo.', 'Twelve eyes in that canopy. I counted. Twice.'] },
  ],
  gallery: [
    { name: 'Otto', role: 'night guard (off duty)', stance: 'coffee', look: L('rose', 0x9a9490, 'crop', 0x3a4a68, 0x262c3c, 0x1e1a1c, 'uniform', 'cap', 0x24304a, { build: 1.16, belly: 0.8 }),
      lines: ['I was NOT asleep at 3:07. I was resting my eyes. Loudly.', 'The thief had big muddy boots. Bigger than mine. Much bigger.', 'Solve it at the empty frame and the painting comes home. Something else is in that crate, too.'] },
    { name: 'Clementine', role: 'art critic', pace: true, stance: 'crossed', look: L('fair', 0xe8604c, 'bob', 0x8e2f3a, 0x2a2230, 0x6e2a2e, 'coat', null, 0, { glasses: true, accent: 0xf3ead7 }),
      lines: ['The empty frame is the strongest piece in the room.', 'I give the heist four stars. Docked one for the lens cap.', 'Please do not spin the sculpture. (Spin it five times.)'] },
  ],
  'doodle-libs': [
    { name: 'Wren', role: 'storyteller', stance: 'writing', look: L('tan', 0x2b1d1a, 'bob', 0x4f7fc4, 0xf6efdf, 0xe8604c, 'cardigan', null, 0, { glasses: true }),
      lines: ['The ___ began to DANCE! Fill it in at the sentence on the floor.', 'The robot says PICKLES every time. It is a problem.', 'That paper plane keeps looping with a page on a string. Whistle at it.'] },
    { name: 'Moe', role: 'doodler', pace: true, look: L('brown', 0x1d1a1a, 'curls', 0xe4b84f, 0x3b4a5e, 0xe9e2d0, null, 'beanie', 0xe8604c),
      lines: ['I drew a tree once. It started dancing. I don’t draw trees anymore.', 'Captain Wiggles is my hero.', 'Every crumpled page in that bin was a masterpiece, for about four seconds.'] },
  ],
  zen: [
    { name: 'Hana', role: 'tea master', stance: 'coffee', look: L('fair', 0x1d1a1a, 'bun', 0x55663f, 0x2a2230, 0x2a2230, 'coat', null, 0, { accent: 0xd2ad78 }),
      lines: ['Walk on the sand. Your footsteps are the rake.', 'The tea is ready when the tea is ready.', 'Something was buried at the back of the sand, on the right. Walk over it gently.'] },
    { name: 'Kenji', role: 'gardener', pace: true, stance: 'crossed', look: L('olive', 0x9a9490, 'crop', 0x8a6448, 0x4a3a2c, 0x3a2a20, 'apron', 'flat', 0x55663f, { accent: 0xd8c9a8 }),
      lines: ['I have raked this garden 10,000 times. You walked on it once. Beautiful.', 'Ring the singing bowl and the whole room slows down. Even the koi.', 'The deer-scarer goes “tock” every six seconds. I count my life in tocks.'] },
  ],
  citizens: [
    { name: 'Agnes', role: 'head tailor', stance: 'writing', look: L('rose', 0xd8d4cf, 'bun', 0xead8c0, 0x3f5872, 0x6e2a2e, 'apron', null, 0, { glasses: true, accent: 0x8e2f3a }),
      lines: ['Cut to order! Read the client’s clues: everything is somewhere in the shop.', 'Every citizen we make walks right out onto the street. Go and wave.', 'Check the pockets on the round rack. Spin it. People leave all sorts.'] },
    { name: 'Lou', role: 'delivery runner', pace: true, look: L('brown', 0x1d1a1a, 'pony', 0x3f8f88, 0x3b4a5e, 0xe9e2d0, 'vest', 'helmet', 0xe8604c, { accent: 0xd6e04c }),
      lines: ['Three hat boxes, two scarves and a very confused moth. Delivered.', 'The mirror said I had great normals. I don’t know what that means.', 'Twelve citizens a day. Each one needs exactly one hat.'] },
  ],
  library: [
    { name: 'Mr Penhaligon', role: 'librarian', stance: 'writing', look: L('fair', 0x9a9490, 'bald', 0x2f5ea8, 0x2a2230, 0x3a2a20, 'cardigan', null, 0, { glasses: true, beard: true }),
      lines: ['Shh. (That was a friendly shh.)', 'Pull a glowing book and it opens into the whole project.', 'Someone used a guest-list page as a bookmark. In the art-heist book, of all places.'] },
    { name: 'Juno', role: 'student', pace: true, stance: 'coffee', look: L('deep', 0x1d1a1a, 'curls', 0xe4b84f, 0x5a4e5e, 0xdc6a9a, 'cardigan', 'beanie', 0x7fb3a8),
      lines: ['I came for one book. That was three hours ago.', 'The README on the lectern says “works on my machine”. Relatable.', 'Have you pulled the cart-pole book? It balances. I can’t.'] },
  ],
};

// ── placing them: floor that's really empty — off the furniture and game rings, and
// with nothing standing there: rays straight down at body width must reach bare floor
// (rugs are fine) or pass only things up above head height ──
const _ray = new THREE.Raycaster(), _down = new THREE.Vector3(0, -1, 0), _o = new THREE.Vector3();
_ray.camera = new THREE.PerspectiveCamera();            // (sprites need one to be tested at all)
function clearAt(room, x, z, r = 0.3) {
  if (!room.freeSoft(x, z, r)) return false;
  const ox = room.origin.x, oz = room.origin.z;
  for (const [dx, dz] of [[0, 0], [r, 0], [-r, 0], [0, r], [0, -r], [r * 0.7, r * 0.7], [-r * 0.7, -r * 0.7]]) {
    _ray.set(_o.set(ox + x + dx, 2.05, oz + z + dz), _down); _ray.far = 2.2;
    const hit = _ray.intersectObject(room.group, true).find(h => !h.object.userData.isInk && !h.object.isSprite && h.object.material?.blending !== THREE.AdditiveBlending);
    if (hit && hit.point.y > 0.06) return false;
  }
  return true;
}
function findSpots(room, n) {
  const out = [];
  let seed = Math.floor(Math.abs(room.origin.x) * 7 + 11);
  const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 500 && out.length < n; k++) {
    const x = -3.5 + R() * 7, z = -5.0 + R() * 4.9;
    if (Math.hypot(x, z + 0.9) < 1.0 || Math.abs(x) < 0.45 && z > -1.6) continue;      // not in the doorway
    if (out.some(s => Math.hypot(s.x - x, s.z - z) < 1.5)) continue;
    if (!clearAt(room, x, z)) continue;
    out.push({ x, z });
  }
  return out;
}
// a second spot to potter back and forth to, with clear floor all the way
function walkTo(room, a) {
  let seed = Math.floor((a.x + 9) * 1000 + (a.z + 9) * 77);
  const R = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let k = 0; k < 120; k++) {
    const ang = R() * Math.PI * 2, d = 1.1 + R() * 1.5;
    const b = { x: a.x + Math.cos(ang) * d, z: a.z + Math.sin(ang) * d };
    let ok = true;
    for (let i = 1; i <= 6 && ok; i++) ok = clearAt(room, a.x + (b.x - a.x) * i / 6, a.z + (b.z - a.z) * i / 6, 0.26);
    if (ok) return b;
  }
  return null;
}
// whatever they're busy with: the nearest piece of furniture
function faceThing(room, p) {
  let best = null, bd = 2.2;
  for (const c of room.cols || []) {
    const cx = (c.x0 + c.x1) / 2, cz = (c.z0 + c.z1) / 2, d = Math.hypot(cx - p.x, cz - p.z);
    if (d < bd && d > 0.3) { bd = d; best = { x: cx, z: cz }; }
  }
  return best ? Math.atan2(best.x - p.x, best.z - p.z) : 0;
}

// people are placed the first time you walk into their shop (the floor checks cost a little)
const placed = new Set();
export function placeShopFolk(rooms, id, list) {
  const cast = SHOP_FOLK[id], room = rooms[id];
  if (!cast || !room || placed.has(id)) return;
  placed.add(id);
  room.group.updateMatrixWorld(true);
  const spots = findSpots(room, cast.length);
  cast.forEach((c, i) => {
    const s = spots[i];
    if (!s) return;
    const g = person({ ...c.look, stance: c.stance });
    g.position.set(s.x, 0, s.z);
    const npc = { ...c, id, g, home: s, away: c.pace ? walkTo(room, s) : null, t: Math.random() * 10, line: -1, talkUntil: -1, hopT: -9, yaw: 0 };
    npc.yaw = c.pace && npc.away ? Math.atan2(npc.away.x - s.x, npc.away.z - s.z) : faceThing(room, s);
    g.userData.turn.rotation.y = npc.yaw;
    g.userData.npc = npc;
    room.group.add(g);
    list.push(npc);
  });
}

// ── each frame: pottering, idling, turning to whoever's talking to them ──
const _p = new THREE.Vector3();
export function tickShopFolk(list, zone, playerPos, origin, dt, t) {
  for (const n of list) {
    if (n.id !== zone) continue;                       // only the room you're in
    const inst = n.g.userData.human, turn = n.g.userData.turn;
    let moving = 0, want = n.yaw;
    const talking = t < n.talkUntil;
    if (talking && playerPos) {
      want = Math.atan2(playerPos.x - origin.x - n.g.position.x, playerPos.z - origin.z - n.g.position.z);
    } else if (n.away) {
      // walk there, linger, walk back, linger
      n.t += dt;
      const leg = 2 * (Math.hypot(n.away.x - n.home.x, n.away.z - n.home.z) / 0.5), rest = 3.5, cyc = 2 * (leg / 2 + rest);
      const u = n.t % cyc, half = leg / 2;
      const [a, b, k] = u < half ? [n.home, n.away, u / half] : u < half + rest ? [n.away, n.away, 1] : u < 2 * half + rest ? [n.away, n.home, (u - half - rest) / half] : [n.home, n.home, 1];
      n.g.position.set(a.x + (b.x - a.x) * k, 0, a.z + (b.z - a.z) * k);
      if (a !== b) { moving = 0.75; want = Math.atan2(b.x - a.x, b.z - a.z); }
      else want = faceAt(n, a === n.home ? n.away : n.home);
    }
    // ease the body round
    let d = want - turn.rotation.y; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    turn.rotation.y += d * Math.min(1, dt * 6);
    // a little hop when you say hello
    const h = t - n.hopT;
    n.g.position.y = h < 0.45 ? Math.sin(h / 0.45 * Math.PI) * 0.12 : 0;
    if (inst) pose(inst, dt, moving, { talk: talking ? 1 : 0 });
  }
}
// at the far end of a walk, look back the way they came (a bit to the side, like browsing)
function faceAt(n, p) { return Math.atan2(p.x - n.g.position.x, p.z - n.g.position.z) + 0.9; }

// ── talking ──
const bubble = document.createElement('div');
bubble.className = 'ui sk hide'; bubble.id = 'npcSay';
document.body.appendChild(bubble);
let bubbleNpc = null;
export function talkTo(n, t, blip) {
  n.line = (n.line + 1) % n.lines.length;
  n.talkUntil = t + 5.5; n.hopT = t;
  bubble.innerHTML = '';
  const who = document.createElement('b'); who.textContent = `${n.name}, ${n.role}`;
  const what = document.createElement('span'); what.textContent = n.lines[n.line];
  bubble.append(who, what);
  bubble.classList.remove('hide'); bubbleNpc = n;
  // a little mumble in their voice
  const base = 300 + (n.name.length * 37) % 260;
  blip?.([0, 1, 2].map(i => [base * (1 + ((n.line + i) % 3) * 0.12), 0.07]), 'triangle', 0.035);
}
export function tickBubble(camera, t, zone) {
  if (!bubbleNpc) return;
  if (t > bubbleNpc.talkUntil || bubbleNpc.id !== zone) { bubble.classList.add('hide'); bubbleNpc = null; return; }
  bubbleNpc.g.getWorldPosition(_p); _p.y += 2.05;
  _p.project(camera);
  const x = (_p.x * 0.5 + 0.5) * innerWidth, y = (-_p.y * 0.5 + 0.5) * innerHeight;
  bubble.style.transform = `translate(${Math.max(130, Math.min(innerWidth - 130, x))}px, ${Math.max(70, y)}px) translate(-50%, -100%)`;
}
