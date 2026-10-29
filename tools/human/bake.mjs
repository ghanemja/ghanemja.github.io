// Bakes the MakeHuman base human (CC0 1.0: base mesh, targets, rig, weights) into
// one compact file the browser loads: models/human/makehuman.json.
//
//   node tools/human/bake.mjs            # downloads the pinned sources once into tools/human/.cache
//
// What's kept: the body mesh, the scalp hair helper and the eye helpers (all
// triangulated), the joint helper vertices the rig is placed from, a reduced
// rig (face, eye, toe and breast bones merged into their parents, so ~70
// bones remain, every finger joint kept), the top-4 skin weights per vertex,
// and the shape targets for young adults: sex × three ancestries, muscle and
// weight, height and proportions. Target deltas are quantized to int16.
import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const COMMIT = 'a8bc2d54ff0ac92e78ff71431b1023eda42bf482';   // makehumancommunity/makehuman
const RAW = `https://raw.githubusercontent.com/makehumancommunity/makehuman/${COMMIT}/makehuman/data/`;
const here = dirname(fileURLToPath(import.meta.url));
const CACHE = join(here, '.cache');
const OUT = join(here, '../../models/human/makehuman.json'), OUT_AGES = join(here, '../../models/human/ages.json');

const MW = ['minmuscle-averageweight', 'maxmuscle-averageweight', 'averagemuscle-minweight', 'averagemuscle-maxweight',
  'minmuscle-minweight', 'minmuscle-maxweight', 'maxmuscle-minweight', 'maxmuscle-maxweight'];
// core (adults, loaded with the page) and ages (baby / child / old, loaded only when someone isn't an adult)
const TARGETS = [], AGES = [];
for (const g of ['female', 'male']) {
  for (const e of ['african', 'asian', 'caucasian']) TARGETS.push(`macrodetails/${e}-${g}-young`);
  for (const mw of MW) TARGETS.push(`macrodetails/universal-${g}-young-${mw}`);
  for (const h of ['minheight', 'maxheight']) TARGETS.push(`macrodetails/height/${g}-young-averagemuscle-averageweight-${h}`);
  for (const p of ['idealproportions', 'uncommonproportions']) TARGETS.push(`macrodetails/proportions/${g}-young-averagemuscle-averageweight-${p}`);
  for (const a of ['baby', 'child', 'old']) {
    AGES.push({ avg: `avg-${g}-${a}`, of: ['african', 'asian', 'caucasian'].map(e => `macrodetails/${e}-${g}-${a}`) });   // one averaged face set per age
    for (const mw of MW.slice(0, 4)) AGES.push(`macrodetails/universal-${g}-${a}-${mw}`);     // the four axes (no diagonals) keep the file small
    // (no per-age height or proportion targets: stature comes from a growth curve, and the adult
    //  height / proportion targets carry that variation — the per-age ones were 2 MB of the file)
  }
}
// facial expression units (caucasian set; small, local deltas)
for (const u of ['mouth-corner-puller', 'mouth-elevation', 'mouth-upward-retraction', 'mouth-compression',
  'eyebrows-left-up', 'eyebrows-right-up', 'eyebrows-left-inner-up', 'eyebrows-right-inner-up',
  'eye-left-slit', 'eye-right-slit', 'eye-left-opened-up', 'eye-right-opened-up']) TARGETS.push(`expression/units/caucasian/${u}`);
// body types (MakeHuman's "bodyshapes": measured silhouettes, separate sets for women and men)
// and the measurement targets that move one girth at a time
export const SHAPES = {
  fem: ['apple', 'diamond', 'full-hourglass', 'invert-triangle', 'lean-column', 'neat-hourglass', 'rectangle', 'triangle'],
  man: ['apple', 'invert-triangle', 'lean-column', 'rectangle', 'trapezoid', 'triangle'],
};
for (const [g, list] of Object.entries(SHAPES)) for (const sh of list) TARGETS.push(`bodyshapes/bodyshapes-elvs-${g}-${sh}`);
for (const m of ['bust', 'underbust', 'waist', 'hips', 'thigh', 'upperarm']) for (const d of ['decr', 'incr']) TARGETS.push(`measure/measure-${m}-circ-${d}`);
for (const d of ['decr', 'incr']) TARGETS.push(`measure/measure-shoulder-dist-${d}`, `stomach/stomach-pregnant-${d}`, `buttocks/buttocks-volume-${d}`);
// face structure: head shapes, and the features that make faces differ (left + right summed into one)
for (const h of ['oval', 'round', 'square', 'rectangular', 'triangular', 'invertedtriangular', 'diamond']) TARGETS.push(`head/head-${h}`);
for (const d of ['decr', 'incr']) {
  for (const t of ['head/head-fat', 'chin/chin-width', 'chin/chin-prominent', 'chin/chin-height', 'nose/nose-scale-horiz', 'nose/nose-scale-vert', 'nose/nose-hump',
    'nose/nose-point-width', 'mouth/mouth-scale-horiz', 'mouth/mouth-upperlip-volume', 'mouth/mouth-lowerlip-volume', 'forehead/forehead-scale-vert']) TARGETS.push(`${t}-${d}`);
  for (const t of ['cheek/{s}-cheek-bones', 'cheek/{s}-cheek-volume', 'eyes/{s}-eye-scale']) TARGETS.push({ sum: t.replace('{s}-', '').replace(/^\w+\//, 'face/') + '-' + d, of: ['l', 'r'].map(sd => t.replace('{s}', sd) + '-' + d) });
}
for (const d of ['up', 'down']) TARGETS.push({ sum: `face/eye-corner2-${d}`, of: ['l', 'r'].map(sd => `eyes/${sd}-eye-corner2-${d}`) });
const KEEP_GROUPS = new Set(['body', 'helper-hair', 'helper-l-eye', 'helper-r-eye', 'helper-skirt']);

async function get(path) {
  const f = join(CACHE, path.replace(/\//g, '__'));
  try { await access(f); return await readFile(f, 'utf8'); } catch {}
  const r = await fetch(RAW + path);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  const t = await r.text();
  await mkdir(CACHE, { recursive: true });
  await writeFile(f, t);
  return t;
}
const b64 = (ta) => Buffer.from(ta.buffer, ta.byteOffset, ta.byteLength).toString('base64');

// ── the mesh ──
const obj = await get('3dobjs/base.obj');
const V = [];
const groups = {};
let g = null;
for (const line of obj.split('\n')) {
  if (line.startsWith('v ')) { const [, x, y, z] = line.split(/\s+/); V.push([+x, +y, +z]); }
  else if (line.startsWith('g ')) g = line.slice(2).trim();
  else if (line.startsWith('f ') && KEEP_GROUPS.has(g)) {
    (groups[g] ??= []).push(line.slice(2).trim().split(/\s+/).map(s => parseInt(s) - 1));
  }
}
const skel = JSON.parse(await get('rigs/default.mhskel'));
const wts = JSON.parse(await get('rigs/default_weights.mhw')).weights;

// keep every vertex a kept face or a joint uses; remap to a dense index
const used = new Set();
for (const fs of Object.values(groups)) for (const f of fs) f.forEach(i => used.add(i));
for (const idx of Object.values(skel.joints)) idx.forEach(i => used.add(i));
const keep = [...used].sort((a, b) => a - b), remap = new Map(keep.map((v, i) => [v, i]));
const N = keep.length;
const pos = new Float32Array(N * 3);
keep.forEach((v, i) => pos.set(V[v], i * 3));

const dist2 = (a, b) => (V[a][0] - V[b][0]) ** 2 + (V[a][1] - V[b][1]) ** 2 + (V[a][2] - V[b][2]) ** 2;
const tris = {};
for (const [name, fs] of Object.entries(groups)) {
  const out = [];
  for (const f of fs) {
    if (f.length === 3) out.push(f);
    else if (dist2(f[0], f[2]) <= dist2(f[1], f[3])) out.push([f[0], f[1], f[2]], [f[0], f[2], f[3]]);   // the shorter diagonal
    else out.push([f[0], f[1], f[3]], [f[1], f[2], f[3]]);
  }
  tris[name] = b64(Uint16Array.from(out.flat().map(i => remap.get(i))));
}

// ── the rig, reduced ──
const FACE = /^(special|oris|levator|temporalis|risorius|orbicularis|oculi|eye|tongue)/;
const merge = (n) => {
  if (n.startsWith('breast')) return 'spine02';
  if (/^toe[1-5]-/.test(n)) return 'toe1-1' + n.slice(n.lastIndexOf('.'));
  if (n === 'jaw' || FACE.test(n)) return 'head';
  return n;
};
const bones = [], bix = new Map();
const order = (n) => { const b = skel.bones[n]; return b.parent ? order(b.parent) + 1 : 0; };
for (const n of Object.keys(skel.bones).sort((a, b) => order(a) - order(b))) {
  if (merge(n) !== n) continue;
  const b = skel.bones[n];
  let p = b.parent; while (p && merge(p) !== p) p = skel.bones[p].parent;
  bix.set(n, bones.length);
  bones.push({ name: n, parent: p ? bix.get(p) : -1, head: b.head, tail: b.tail });
}
const joints = {};
for (const b of bones) for (const j of [b.head, b.tail]) joints[j] = skel.joints[j].map(i => remap.get(i));

// skin weights: merged bones sum, then the top four per vertex, quantized to bytes
const perV = Array.from({ length: N }, () => new Map());
for (const [bn, list] of Object.entries(wts)) {
  const bi = bix.get(merge(bn));
  if (bi == null) continue;
  for (const [v, w] of list) { const i = remap.get(v); if (i != null) perV[i].set(bi, (perV[i].get(bi) || 0) + w); }
}
const skinI = new Uint8Array(N * 4), skinW = new Uint8Array(N * 4);
perV.forEach((m, i) => {
  const top = [...m].sort((a, b) => b[1] - a[1]).slice(0, 4), s = top.reduce((a, t) => a + t[1], 0) || 1;
  let acc = 0;
  top.forEach(([bi, w], k) => { skinI[i * 4 + k] = bi; const q = k === top.length - 1 ? 255 - acc : Math.round(w / s * 255); skinW[i * 4 + k] = q; acc += q; });
  if (!top.length) { skinI[i * 4] = bix.get('root'); skinW[i * 4] = 255; }
});

// ── targets: each with its own quantization scale (so big child shapes don't cost the adults precision) ──
async function pack(list) {
  const out = {};
  const read = async (t) => {
    const m = new Map();
    for (const line of (await get(`targets/${t}.target`)).split('\n')) {
      if (!line || line[0] === '#') continue;
      const [v, dx, dy, dz] = line.trim().split(/\s+/).map(Number);
      const i = remap.get(v); if (i != null) m.set(i, [dx, dy, dz]);
    }
    return m;
  };
  for (const item of list) {
    let t = item, m;
    if (typeof item === 'object') {                                 // an average (avg) or a sum (sum) of several targets
      t = item.avg ?? item.sum; m = new Map(); const w = item.avg ? 1 / item.of.length : 1;
      for (const src of item.of) for (const [i, d] of await read(src)) { const a = m.get(i) || [0, 0, 0]; m.set(i, a.map((x, k) => x + d[k] * w)); }
    } else m = await read(t);
    const rows = []; let maxD = 1e-9;
    for (const [i, [dx, dy, dz]] of m) { rows.push([i, dx, dy, dz]); maxD = Math.max(maxD, Math.abs(dx), Math.abs(dy), Math.abs(dz)); }
    const q = maxD / 32767;
    out[t.replace(/^macrodetails\/(height\/|proportions\/)?/, '').replace(/^expression\/units\/caucasian\//, 'expr/').replace(/^bodyshapes\/bodyshapes-elvs-/, 'shape/').replace(/^measure\/measure-/, 'measure/').replace(/^(head|chin|nose|mouth|forehead)\//, 'face/')] = {
      q, idx: b64(Uint16Array.from(rows.map(r => r[0]))),
      d: b64(Int16Array.from(rows.flatMap(r => [r[1], r[2], r[3]].map(x => Math.round(x / q))))),
    };
  }
  return out;
}
const targets = await pack(TARGETS), ageTargets = await pack(AGES);
const skirtW = [...new Set(groups['helper-skirt'].flat())].filter(v => perV[remap.get(v)].size).length;
console.log(`skirt helper: ${skirtW} of ${new Set(groups['helper-skirt'].flat()).size} vertices carry skin weights`);

await mkdir(dirname(OUT), { recursive: true });
await writeFile(OUT, JSON.stringify({
  source: `MakeHuman ${COMMIT.slice(0, 7)} (makehumancommunity/makehuman) — base mesh, targets, rig and weights are CC0 1.0`,
  units: 'decimetres', n: N, pos: b64(pos), tris, bones, joints, skinI: b64(skinI), skinW: b64(skinW), targets,
}));
await writeFile(OUT_AGES, JSON.stringify({ source: 'MakeHuman ' + COMMIT.slice(0, 7) + ' age targets (CC0 1.0)', n: N, targets: ageTargets }));
console.log(`verts ${N}, tris ${Object.entries(groups).map(([k, f]) => k + ' ' + f.length).join(', ')} quads, bones ${bones.length}, targets ${Object.keys(targets).length} + ${Object.keys(ageTargets).length} age targets`);
