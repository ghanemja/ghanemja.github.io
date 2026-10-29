// ─── CITIZENS: the roster a game's people are made from ──────────────────────
// A citizen is a small, plain description (what a creator UI edits and a game
// saves); toPersonSpec() turns it into a makePerson() spec. Everything a citizen
// can be is anatomical and always dressed — the creator only chooses among real
// options, and the proportion rules still apply to every style but the
// explicitly exaggerated ones.
//
//   { name, style, sex, age, height, build, bodyType, muscle, face, skin, eyes, smile,
//     hairStyle, hair, topType, top, bottomType, bottom, shoes }
// Sliders are 0..1, age is in years (2–90), height is relative to the person's age
// and sex, and topType / bottomType are keys of TOPS / BOTTOMS (js/people.js).
import { HAIRSTYLES } from './hair.js';
import { TOPS, BOTTOMS } from './people.js';
import { BODY_TYPES, BODY_ALIASES, FACE_SHAPES } from './anatomy.js';
export { TOPS, BOTTOMS, BODY_TYPES, FACE_SHAPES };

export const PALETTE = {
  skin: [0xf7dcc8, 0xf0c8a8, 0xe3b08a, 0xcf9670, 0xb47a52, 0x93603e, 0x744a2f, 0x553422],
  hair: [0x1f1a1a, 0x3b2a22, 0x6b4630, 0x9a6a3e, 0xc9a06a, 0xe2c48e, 0xb8562e, 0xd6d0c6, 0xe7799f, 0x4f8fbf],
  eyes: [0x3a2416, 0x5a3b24, 0x7a5a2e, 0x5f7a3a, 0x4f7ea8, 0x6d7a84],
  clothes: [0x2f2b33, 0xf1ebdf, 0x6f8db0, 0x3f5a7a, 0x8e2f3a, 0xd8584a, 0xe4b84f, 0x6f8a6a, 0x3f8f88, 0xc98fb5, 0x7a5a8e, 0xb98a5e, 0x5b4636, 0x9aa3a8],
};
// clothes are never close to a skin tone: from across a plaza a skin-coloured top or pair of
// shorts reads as no clothes at all
const dist = (a, b) => Math.hypot(((a >> 16) & 255) - ((b >> 16) & 255), ((a >> 8) & 255) - ((b >> 8) & 255), (a & 255) - (b & 255));
// (tan and brown are always out; cream, charcoal or maroon are kept, but never on a skin they're close to)
export const skinLike = (c) => PALETTE.skin.some(s => dist(c, s) < 27);
export const TOP_COLOURS = PALETTE.clothes.filter(c => !skinLike(c));
export const BOTTOM_SWATCHES = TOP_COLOURS;
// a face: its shape (FACE_SHAPES) and feature sliders (0..1, 0.5 = as the shape has it),
// over a blend of MakeHuman's three measured face sets (`face`, dealt out for variety)
export const FEATURES = { nose: ['small', 'large'], noseWidth: ['narrow', 'wide'], lips: ['thin', 'full'], jaw: ['soft', 'strong'], cheekbones: ['soft', 'high'], eyeSize: ['smaller', 'bigger'] };
const faceOf = (c) => {
  const f = { shape: c.faceShape ?? 'oval' };
  for (const k of Object.keys(FEATURES)) f[k === 'eyeSize' ? 'eyes' : k] = ((c[k] ?? 0.5) - 0.5) * 1.6;
  return f;
};
// (the three face sets)
export const FACES = {
  mix: { african: 1, asian: 1, caucasian: 1 },
  one: { african: 1, asian: 0.15, caucasian: 0.15 },
  two: { african: 0.15, asian: 1, caucasian: 0.15 },
  three: { african: 0.15, asian: 0.15, caucasian: 1 },
};
// proportions (js/stylize.js): how the BODY is shaped. How it is drawn is the render style (js/render-styles.js)
export const STYLE_NAMES = { town: 'Town', real: 'Natural', storybook: 'Storybook', chibi: 'Chibi' };
export const AGE_MIN = 2, AGE_MAX = 90;
// age ranges for batches
export const AGE_RANGES = { all: [2, 90], kids: [2, 12], teens: [13, 19], young: [20, 35], adults: [20, 65], middle: [40, 60], seniors: [65, 90] };

export const DEFAULT = {
  name: 'Rosa', style: 'real', sex: 0, age: 30, height: 0.45, build: 0.42, bodyType: 'hourglass', muscle: 0.45, face: 'mix', faceShape: 'heart',
  skin: 0xefc3a2, eyes: 0x4a3226, smile: 0.7, hairStyle: 'bob', hair: 0xc9a06a,
  topType: 'sweater', top: 0x2f2b33, bottomType: 'trousers', bottom: 0x6f8db0, shoes: 0xf1ebdf,
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
const BOTTOM_COLOURS = [0x6f8db0, 0x3f5a7a, 0x2f2b33, 0x9aa3a8, 0x6f8a6a, 0x7a5a8e], SHOES = [0xf1ebdf, 0x2f2b33, 0xd8584a, 0x8e2f3a, 0x5b4636];

// (anyone can be given any type; a batch deals men the types that occur in men)
const clamp01 = (v) => Math.max(0.02, Math.min(0.98, v));
const typesFor = (sex) => Object.keys(BODY_TYPES).filter(k => sex < 0.5 || !BODY_TYPES[k].women);
// one citizen; `o` can pin anything (sex, skin, …) — the batch uses that to spread variety evenly
export function randomCitizen(rand = Math.random, o = {}) {
  const pick = (a) => a[Math.floor(rand() * a.length)], r = (lo, hi) => lo + rand() * (hi - lo);
  const bell = () => (rand() + rand()) / 2;                                   // more people near average, but the whole range is used
  const sex = o.sex ?? (rand() < 0.5 ? r(0, 0.12) : r(0.88, 1));
  const age = Math.round(o.age ?? r(o.ageMin ?? 18, o.ageMax ?? 65));
  // grey comes in from the mid forties; by eighty most people are grey or white
  const grey = rand() < Math.min(0.85, Math.max(0, (age - 45) / 38)), skin = o.skin ?? pick(PALETTE.skin);
  const bodyType = o.bodyType ?? pick(typesFor(sex)), BT = BODY_TYPES[bodyType];
  return {
    name: o.name ?? pick(NAMES), style: 'real', sex, age,
    height: o.height ?? 0.05 + 0.9 * bell(), bodyType,
    // build and muscle come from the body type, varied a little round it
    build: o.build ?? clamp01(BT.build + (rand() - 0.5) * 0.2), muscle: o.muscle ?? clamp01(BT.muscle + (rand() - 0.5) * 0.2),
    face: o.face ?? pick(Object.keys(FACES)), faceShape: o.faceShape ?? pick(Object.keys(FACE_SHAPES)),
    ...Object.fromEntries(Object.keys(FEATURES).map(k => [k, o[k] ?? 0.5 + (bell() - 0.5) * 0.9])),
    skin, eyes: o.eyes ?? pick(PALETTE.eyes), smile: o.smile ?? r(0.25, 0.95),
    hairStyle: o.hairStyle ?? pick(sex > 0.5 ? MAN_HAIR : WOMAN_HAIR),
    hair: o.hair ?? (grey ? pick([0xd6d0c6, 0xd6d0c6, 0xb9b3ab]) : rand() < 0.08 && age < 60 ? pick(PALETTE.hair.slice(8)) : pick(PALETTE.hair.slice(0, 7))),
    ...outfit(pick, o, rand, sex, skin),
  };
}
// top and trousers never match (a single colour head to toe reads as a onesie)
function outfit(pick, o, rand, sex, skin) {
  let bottom = o.bottom ?? pick(BOTTOM_COLOURS);
  for (let i = 0; i < 12 && skin != null && dist(bottom, skin) < 80; i++) bottom = pick(BOTTOM_COLOURS);
  let top = o.top ?? pick(TOP_COLOURS);
  for (let i = 0; i < 12 && (top === bottom || (skin != null && dist(top, skin) < 70)); i++) top = pick(TOP_COLOURS);
  const topType = o.topType ?? pick(['sweater', 'sweatshirt', 'sweatshirt', 'tee', 'tee', 'turtleneck']);
  const u = rand(), bottomType = o.bottomType ?? (u < 0.35 ? 'baggy' : u < 0.55 ? 'shorts' : 'trousers');
  return { topType, top, bottomType, bottom, shoes: o.shoes ?? pick(SHOES) };
}

// generateCitizens(n, { seed, style, women, ageMin, ageMax }): a batch for a game. Variety
// is spread, not left to chance: sexes alternate in the requested share, ages are spread
// evenly over the range (one per slice of it, shuffled), skin tones, face shapes and
// hair colours cycle through shuffled decks so every tone appears before any repeats,
// and names are unique until the list runs out.
export function generateCitizens(n, { seed = null, style = 'real', women = 0.5, ageMin = 18, ageMax = 65 } = {}) {
  ageMin = Math.max(AGE_MIN, Math.min(AGE_MAX, ageMin)); ageMax = Math.max(ageMin, Math.min(AGE_MAX, ageMax));
  const rand = rng(seed), deck = (a) => { const d = a.slice(); for (let i = d.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [d[i], d[j]] = [d[j], d[i]]; } return d; };
  const decks = { skin: [], face: [], hair: [], name: [], bodyW: [], bodyM: [], shape: [] }, src = { shape: Object.keys(FACE_SHAPES), bodyW: typesFor(0), bodyM: typesFor(1), skin: PALETTE.skin, face: Object.keys(FACES), hair: PALETTE.hair.slice(0, 7), name: NAMES };
  const draw = (k) => { if (!decks[k].length) decks[k] = deck(src[k]); return decks[k].pop(); };
  const out = [], used = new Map();
  const ages = deck(Array.from({ length: n }, (_, i) => ageMin + (i + rand()) / n * (ageMax - ageMin)));
  let w = 0;
  for (let i = 0; i < n; i++) {
    const woman = (w + 1) / (i + 1) <= women + 1e-9 ? (w++, true) : false;     // keep the running share on target
    let name = draw('name'); const k = used.get(name) || 0; used.set(name, k + 1); if (k) name += ' ' + (k + 1);
    out.push({ id: `c${seed ?? Date.now()}-${i}`, ...randomCitizen(rand, {
      name, style, sex: woman ? rand() * 0.12 : 0.88 + rand() * 0.12, age: ages[i], bodyType: draw(woman ? 'bodyW' : 'bodyM'), skin: draw('skin'), face: draw('face'), faceShape: draw('shape'),
      ...(rand() < 0.9 && ages[i] < 50 ? { hair: draw('hair') } : {}),
    }) });
  }
  return out;
}

const hex = (n) => n.toString(16).padStart(6, '0');
const mix = (a, b, t) => {                              // blend two 0xRRGGBB colours
  const ch = (c, s) => (c >> s) & 255, m = (s) => Math.round(ch(a, s) * (1 - t) + ch(b, s) * t);
  return (m(16) << 16) | (m(8) << 8) | m(0);
};

// a citizen → a makePerson spec (stature comes from age, sex and the height slider: statureFor in js/anatomy.js)
export function toPersonSpec(c, { render } = {}) {
  c = { ...DEFAULT, ...c };
  return {
    style: 'real', hairStyle: c.hairStyle,   // (natural proportions for everyone; saved stylised ones too) hair: c.hair, topType: c.topType, bottomType: BOTTOMS[c.bottomType] ? c.bottomType : 'trousers',   // (saved skirts: trousers for now) ...(render ? { render } : {}),
    body: { sex: c.sex, age: c.age, shape: BODY_ALIASES[c.bodyType] ?? c.bodyType, face: faceOf(c), muscle: c.muscle, weight: c.build, height: c.height, proportions: 0.55, ancestry: FACES[c.face] ?? FACES.mix },
    expression: { 'mouth-corner-puller': 0.1 + 0.6 * c.smile, 'mouth-elevation': 0.2 * c.smile, 'eye-left-slit': 0.05 * c.smile, 'eye-right-slit': 0.05 * c.smile, 'eye-left-opened-up': 0.08, 'eye-right-opened-up': 0.08 },
    skin: c.skin, lips: mix(c.skin, 0xc0606a, 0.6), blush: mix(c.skin, 0xe58a80, 0.55), eyes: c.eyes,
    brows: mix(c.hair, 0x1a1214, 0.35), top: c.top, bottom: c.bottom, shoes: c.shoes, sole: c.shoes === 0xf1ebdf ? 0xc98f5a : mix(c.shoes, 0xffffff, 0.55),
  };
}
// the parts of a citizen that restyle() can change in place (no rebuild)
export const INSTANT = ['skin', 'eyes', 'hairStyle', 'hair', 'top', 'bottom', 'shoes'];

// ── the roster, kept in this browser (and exported / imported as JSON for a game) ──
const KEY = 'citizens.v1';
export function loadRoster() {
  try {
    const r = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(r) && r.length) { for (const c of r) if (c.name === 'Janelle' && c.age == null) c.name = DEFAULT.name; return r; }   // (the old default's name)
  } catch {}
  return [{ id: 'c' + Date.now(), ...DEFAULT }];
}
export function saveRoster(r) { try { localStorage.setItem(KEY, JSON.stringify(r)); } catch {} }
export const toJSON = (r, render) => JSON.stringify({ format: 'citizens/1', ...(render ? { render } : {}), citizens: r.map(({ portrait, ...c }) => ({ ...c, ...Object.fromEntries(['skin', 'eyes', 'hair', 'top', 'bottom', 'shoes'].map(k => [k, '#' + hex(c[k])])) })) }, null, 2);
export function fromJSON(text) {
  const j = JSON.parse(text), list = Array.isArray(j) ? j : j.citizens;
  return list.map((c, i) => ({ id: 'c' + Date.now() + i, ...DEFAULT, ...c,
    ...Object.fromEntries(['skin', 'eyes', 'hair', 'top', 'bottom', 'shoes'].filter(k => typeof c[k] === 'string').map(k => [k, parseInt(c[k].replace('#', ''), 16)])) }));
}
