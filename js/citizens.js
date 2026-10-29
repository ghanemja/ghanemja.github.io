// ─── CITIZENS: the roster a game's people are made from ──────────────────────
// A citizen is a small, plain description (what a creator UI edits and a game
// saves); toPersonSpec() turns it into a makePerson() spec. Everything a citizen
// can be is anatomical and always dressed — the creator only chooses among real
// options, and the proportion rules still apply to every style but the
// explicitly exaggerated ones.
//
//   { name, style, sex, height, build, muscle, face, skin, eyes, smile,
//     hairStyle, hair, top, bottom, shoes }     (all sliders 0..1)
import { HAIRSTYLES } from './hair.js';

export const PALETTE = {
  skin: [0xf7dcc8, 0xf0c8a8, 0xe3b08a, 0xcf9670, 0xb47a52, 0x93603e, 0x744a2f, 0x553422],
  hair: [0x1f1a1a, 0x3b2a22, 0x6b4630, 0x9a6a3e, 0xc9a06a, 0xe2c48e, 0xb8562e, 0xd6d0c6, 0xe7799f, 0x4f8fbf],
  eyes: [0x3a2416, 0x5a3b24, 0x7a5a2e, 0x5f7a3a, 0x4f7ea8, 0x6d7a84],
  clothes: [0x2f2b33, 0xf1ebdf, 0x6f8db0, 0x3f5a7a, 0x8e2f3a, 0xd8584a, 0xe4b84f, 0x6f8a6a, 0x3f8f88, 0xc98fb5, 0x7a5a8e, 0xb98a5e, 0x5b4636, 0x9aa3a8],
};
// face shapes: blends of MakeHuman's three measured face sets (shown as shapes, not labels)
export const FACES = {
  mix: { african: 1, asian: 1, caucasian: 1 },
  one: { african: 1, asian: 0.15, caucasian: 0.15 },
  two: { african: 0.15, asian: 1, caucasian: 0.15 },
  three: { african: 0.15, asian: 0.15, caucasian: 1 },
};
export const STYLE_NAMES = { town: 'Painted', real: 'Natural', storybook: 'Storybook', chibi: 'Chibi' };

export const DEFAULT = {
  name: 'Janelle', style: 'town', sex: 0, height: 0.45, build: 0.42, muscle: 0.45, face: 'mix',
  skin: 0xefc3a2, eyes: 0x4a3226, smile: 0.7, hairStyle: 'bob', hair: 0xc9a06a,
  top: 0x2f2b33, bottom: 0x6f8db0, shoes: 0xf1ebdf,
};

// ── random citizens and batches ──
// A seeded generator (mulberry32), so a batch is reproducible: the same seed always
// makes the same town. Unseeded calls use Math.random.
export function rng(seed) {
  if (seed == null || seed === '') return Math.random;
  let h = 1779033703 ^ String(seed).length;
  for (const ch of String(seed)) { h = Math.imul(h ^ ch.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const NAMES = ['Ada', 'Bo', 'Cleo', 'Dev', 'Eli', 'Fen', 'Gus', 'Hana', 'Ivo', 'June', 'Kai', 'Lula', 'Milo', 'Nia', 'Otis', 'Pia', 'Quinn', 'Rex', 'Suki', 'Teo', 'Uma', 'Vivi', 'Wren', 'Yara', 'Zed',
  'Arlo', 'Bea', 'Cass', 'Dara', 'Esme', 'Finn', 'Gia', 'Hugo', 'Iris', 'Jude', 'Kit', 'Lev', 'Mae', 'Nico', 'Odile', 'Pax', 'Rosa', 'Sol', 'Tova', 'Ugo', 'Vera', 'Wes', 'Xan', 'Yuki', 'Zara'];
const MAN_HAIR = ['buzz', 'crop', 'crop', 'pixie', 'curly', 'bob'], WOMAN_HAIR = ['bob', 'lob', 'pixie', 'ponytail', 'bun', 'curly', 'crop'];
const BOTTOMS = [0x6f8db0, 0x3f5a7a, 0x2f2b33, 0x5b4636, 0x9aa3a8, 0xb98a5e], SHOES = [0xf1ebdf, 0x2f2b33, 0xd8584a, 0x8e2f3a, 0x5b4636];

// one citizen; `o` can pin anything (sex, skin, …) — the batch uses that to spread variety evenly
export function randomCitizen(rand = Math.random, o = {}) {
  const pick = (a) => a[Math.floor(rand() * a.length)], r = (lo, hi) => lo + rand() * (hi - lo);
  const bell = () => (rand() + rand() + rand()) / 3;                          // most people are near average
  const sex = o.sex ?? (rand() < 0.5 ? r(0, 0.12) : r(0.88, 1));
  return {
    name: o.name ?? pick(NAMES), style: o.style ?? 'town', sex,
    height: o.height ?? 0.1 + 0.8 * bell(), build: o.build ?? 0.15 + 0.7 * bell(), muscle: o.muscle ?? 0.2 + 0.6 * bell(),
    face: o.face ?? pick(Object.keys(FACES)), skin: o.skin ?? pick(PALETTE.skin), eyes: o.eyes ?? pick(PALETTE.eyes), smile: o.smile ?? r(0.25, 0.95),
    hairStyle: o.hairStyle ?? pick(sex > 0.5 ? MAN_HAIR : WOMAN_HAIR),
    hair: o.hair ?? (rand() < 0.08 ? pick(PALETTE.hair.slice(8)) : pick(PALETTE.hair.slice(0, 8))),
    ...outfit(pick, o),
  };
}
// top and trousers never match (a single colour head to toe reads as a onesie)
function outfit(pick, o) {
  const bottom = o.bottom ?? pick(BOTTOMS);
  let top = o.top ?? pick(PALETTE.clothes);
  for (let i = 0; i < 8 && top === bottom; i++) top = pick(PALETTE.clothes);
  return { top, bottom, shoes: o.shoes ?? pick(SHOES) };
}

// generateCitizens(n, { seed, style, women }): a batch for a game. Variety is spread, not
// left to chance: sexes alternate in the requested share, skin tones, face shapes and
// hair colours cycle through shuffled decks so every tone appears before any repeats,
// and names are unique until the list runs out.
export function generateCitizens(n, { seed = null, style = 'town', women = 0.5 } = {}) {
  const rand = rng(seed), deck = (a) => { const d = a.slice(); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; };
  const decks = { skin: [], face: [], hair: [], name: [] }, src = { skin: PALETTE.skin, face: Object.keys(FACES), hair: PALETTE.hair.slice(0, 8), name: NAMES };
  const draw = (k) => { if (!decks[k].length) decks[k] = deck(src[k]); return decks[k].pop(); };
  const out = [], used = new Map();
  let w = 0;
  for (let i = 0; i < n; i++) {
    const woman = (w + 1) / (i + 1) <= women + 1e-9 ? (w++, true) : false;     // keep the running share on target
    let name = draw('name'); const k = used.get(name) || 0; used.set(name, k + 1); if (k) name += ' ' + (k + 1);
    out.push({ id: `c${seed ?? Date.now()}-${i}`, ...randomCitizen(rand, {
      name, style, sex: woman ? rand() * 0.12 : 0.88 + rand() * 0.12, skin: draw('skin'), face: draw('face'),
      ...(rand() < 0.9 ? { hair: draw('hair') } : {}),
    }) });
  }
  return out;
}

const hex = (n) => n.toString(16).padStart(6, '0');
const mix = (a, b, t) => {                              // blend two 0xRRGGBB colours
  const ch = (c, s) => (c >> s) & 255, m = (s) => Math.round(ch(a, s) * (1 - t) + ch(b, s) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

// a citizen → a makePerson spec
export function toPersonSpec(c) {
  c = { ...DEFAULT, ...c };
  const stature = 1.6 + 0.13 * c.sex + (c.height - 0.5) * 0.3;
  return {
    style: c.style, stature, hairStyle: c.hairStyle, hair: c.hair,
    body: { sex: c.sex, muscle: c.muscle, weight: c.build, height: c.height, proportions: 0.55, ancestry: FACES[c.face] ?? FACES.mix },
    expression: { 'mouth-corner-puller': 0.1 + 0.6 * c.smile, 'mouth-elevation': 0.2 * c.smile, 'eye-left-slit': 0.18 * c.smile, 'eye-right-slit': 0.18 * c.smile },
    skin: c.skin, lips: mix(c.skin, 0xc8686a, 0.45), blush: mix(c.skin, 0xe58a80, 0.55), eyes: c.eyes,
    brows: mix(c.hair, 0x1a1214, 0.35), top: c.top, bottom: c.bottom, shoes: c.shoes, sole: c.shoes === 0xf1ebdf ? 0xc98f5a : mix(c.shoes, 0xffffff, 0.55),
  };
}
// the parts of a citizen that restyle() can change in place (no rebuild)
export const INSTANT = ['skin', 'eyes', 'hairStyle', 'hair', 'top', 'bottom', 'shoes'];

// ── the roster, kept in this browser (and exported / imported as JSON for a game) ──
const KEY = 'citizens.v1';
export function loadRoster() {
  try { const r = JSON.parse(localStorage.getItem(KEY) || 'null'); if (Array.isArray(r) && r.length) return r; } catch {}
  return [{ id: 'c' + Date.now(), ...DEFAULT }];
}
export function saveRoster(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {} }
export const toJSON = (r) => JSON.stringify({ format: 'citizens/1', citizens: r.map(({ portrait, ...c }) => ({ ...c, ...Object.fromEntries(['skin', 'eyes', 'hair', 'top', 'bottom', 'shoes'].map(k => [k, '#' + hex(c[k])])) })) }, null, 2);
export function fromJSON(text) {
  const j = JSON.parse(text), list = Array.isArray(j) ? j : j.citizens;
  return list.map((c, i) => ({ id: 'c' + Date.now() + i, ...DEFAULT, ...c,
    ...Object.fromEntries(['skin', 'eyes', 'hair', 'top', 'bottom', 'shoes'].filter(k => typeof c[k] === 'string').map(k => [k, parseInt(c[k].replace('#', ''), 16)])) }));
}
